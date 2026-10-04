// The tiny character-level transformer from training/train_tinylm.py, run in the browser.
// Pure maths, no DOM, so Node can test it against PyTorch (tests/unit/tinylm-model.test.ts).
//
// Generation keeps a cache of each layer's keys and values, so each new character costs one pass
// through the network (about a million multiply-adds). The model has 128 positions; when the text
// gets longer, the window restarts on the last 64 characters.

export interface TinyConfig { n_layer: number; n_head: number; n_embd: number; block: number; vocab: number }

interface Layer {
  ln1w: Float32Array; ln1b: Float32Array; qkvW: Float32Array; qkvB: Float32Array; projW: Float32Array; projB: Float32Array;
  ln2w: Float32Array; ln2b: Float32Array; fc1W: Float32Array; fc1B: Float32Array; fc2W: Float32Array; fc2B: Float32Array;
}

export interface TinyModel {
  cfg: TinyConfig;
  chars: string;
  index: Map<string, number>;
  params: number;
  tok: Float32Array; pos: Float32Array; lnfW: Float32Array; lnfB: Float32Array;
  layers: Layer[];
}

/** One step's output: scores for every character, and attention weights [layer][head] over the window. */
export interface StepOut { logits: Float32Array; att: Float32Array[][]; windowStart: number }

// ------------------------------------------------------------------ loading
function f16ToF32(h: number): number {
  const s = h & 0x8000 ? -1 : 1;
  const e = (h >> 10) & 0x1f;
  const f = h & 0x3ff;
  if (e === 0) return s * 2 ** -14 * (f / 1024);
  if (e === 31) return f ? NaN : s * Infinity;
  return s * 2 ** (e - 15) * (1 + f / 1024);
}
function decode(b64: string): Float32Array {
  const bin = atob(b64);                   // atob exists in browsers and in Node 16+
  const n = bin.length / 2;
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = f16ToF32(bin.charCodeAt(2 * i) | (bin.charCodeAt(2 * i + 1) << 8));
  return out;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildModel(j: any): TinyModel {
  const layers: Layer[] = j.layers.map((l: Record<string, string>) => ({
    ln1w: decode(l['ln1.weight']), ln1b: decode(l['ln1.bias']), qkvW: decode(l['qkv.weight']), qkvB: decode(l['qkv.bias']),
    projW: decode(l['proj.weight']), projB: decode(l['proj.bias']), ln2w: decode(l['ln2.weight']), ln2b: decode(l['ln2.bias']),
    fc1W: decode(l['fc1.weight']), fc1B: decode(l['fc1.bias']), fc2W: decode(l['fc2.weight']), fc2B: decode(l['fc2.bias']),
  }));
  const chars: string = j.chars;
  return {
    cfg: j.config, chars, index: new Map([...chars].map((c, i) => [c, i])), params: j.params,
    tok: decode(j.tok), pos: decode(j.pos), lnfW: decode(j['ln_f.weight']), lnfB: decode(j['ln_f.bias']), layers,
  };
}

// ------------------------------------------------------------------ maths helpers
/** y = W x + b, with W stored [out, in] row-major (PyTorch layout). */
function linear(W: Float32Array, b: Float32Array, x: Float32Array, nOut: number, nIn: number, y = new Float32Array(nOut)) {
  for (let o = 0; o < nOut; o++) {
    let s = b[o];
    const row = o * nIn;
    for (let i = 0; i < nIn; i++) s += W[row + i] * x[i];
    y[o] = s;
  }
  return y;
}
function layerNorm(x: Float32Array, w: Float32Array, b: Float32Array) {
  const n = x.length;
  let mean = 0;
  for (let i = 0; i < n; i++) mean += x[i];
  mean /= n;
  let v = 0;
  for (let i = 0; i < n; i++) v += (x[i] - mean) ** 2;
  const inv = 1 / Math.sqrt(v / n + 1e-5);
  const y = new Float32Array(n);
  for (let i = 0; i < n; i++) y[i] = (x[i] - mean) * inv * w[i] + b[i];
  return y;
}
const gelu = (x: number) => 0.5 * x * (1 + Math.tanh(0.7978845608028654 * (x + 0.044715 * x * x * x)));

/** Probabilities from scores, at a temperature (T < 1 sharpens, T > 1 flattens). */
export function softmax(logits: Float32Array, temperature = 1): Float32Array {
  const t = Math.max(temperature, 1e-6);
  let m = -Infinity;
  for (const v of logits) m = Math.max(m, v / t);
  const p = new Float32Array(logits.length);
  let s = 0;
  for (let i = 0; i < logits.length; i++) { p[i] = Math.exp(logits[i] / t - m); s += p[i]; }
  for (let i = 0; i < p.length; i++) p[i] /= s;
  return p;
}

// ------------------------------------------------------------------ a generation session (keys/values cache)
export class Session {
  private keys: Float32Array[][] = [];     // [layer][position] -> n_embd
  private values: Float32Array[][] = [];
  /** Character ids currently in the window. */
  window: number[] = [];
  /** Absolute position (in the whole text) of window[0]. */
  windowStart = 0;
  readonly m: TinyModel;
  constructor(m: TinyModel) { this.m = m; this.reset(); }

  reset() {
    this.keys = this.m.layers.map(() => []);
    this.values = this.m.layers.map(() => []);
    this.window = [];
    this.windowStart = 0;
  }

  /** Feed one character id; returns the scores for the next character and this step's attention. */
  push(id: number): StepOut {
    const { block } = this.m.cfg;
    if (this.window.length === block) {
      // restart the window on the last half, so the positions stay within 0..block-1
      const keep = this.window.slice(block / 2);
      const start = this.windowStart + block / 2;
      this.reset();
      this.windowStart = start;
      for (const k of keep) this.step(k);
    }
    return this.step(id);
  }

  private step(id: number): StepOut {
    const { n_embd: C, n_head: H } = this.m.cfg;
    const hs = C / H;
    const p = this.window.length;
    this.window.push(id);
    let x = new Float32Array(C);
    for (let i = 0; i < C; i++) x[i] = this.m.tok[id * C + i] + this.m.pos[p * C + i];
    const att: Float32Array[][] = [];
    this.m.layers.forEach((L, li) => {
      const a = layerNorm(x, L.ln1w, L.ln1b);
      const qkv = linear(L.qkvW, L.qkvB, a, 3 * C, C);
      const q = qkv.subarray(0, C), k = qkv.slice(C, 2 * C), v = qkv.slice(2 * C, 3 * C);
      this.keys[li].push(k);
      this.values[li].push(v);
      const y = new Float32Array(C);
      const heads: Float32Array[] = [];
      const scale = 1 / Math.sqrt(hs);
      for (let h = 0; h < H; h++) {
        const w = new Float32Array(p + 1);
        let mx = -Infinity;
        for (let t = 0; t <= p; t++) {
          const kt = this.keys[li][t];
          let s = 0;
          for (let d = 0; d < hs; d++) s += q[h * hs + d] * kt[h * hs + d];
          w[t] = s * scale;
          mx = Math.max(mx, w[t]);
        }
        let sum = 0;
        for (let t = 0; t <= p; t++) { w[t] = Math.exp(w[t] - mx); sum += w[t]; }
        for (let t = 0; t <= p; t++) w[t] /= sum;
        for (let t = 0; t <= p; t++) {
          const vt = this.values[li][t];
          for (let d = 0; d < hs; d++) y[h * hs + d] += w[t] * vt[h * hs + d];
        }
        heads.push(w);
      }
      att.push(heads);
      const proj = linear(L.projW, L.projB, y, C, C);
      for (let i = 0; i < C; i++) x[i] += proj[i];
      const b = layerNorm(x, L.ln2w, L.ln2b);
      const hdn = linear(L.fc1W, L.fc1B, b, 4 * C, C);
      for (let i = 0; i < hdn.length; i++) hdn[i] = gelu(hdn[i]);
      const out = linear(L.fc2W, L.fc2B, hdn, C, 4 * C);
      for (let i = 0; i < C; i++) x[i] += out[i];
    });
    x = layerNorm(x, this.m.lnfW, this.m.lnfB);
    const V = this.m.cfg.vocab;
    const logits = new Float32Array(V);
    for (let c = 0; c < V; c++) {
      let s = 0;
      for (let i = 0; i < C; i++) s += this.m.tok[c * C + i] * x[i];
      logits[c] = s;
    }
    return { logits, att, windowStart: this.windowStart };
  }
}

/** Pick an index from probabilities, using a random number in [0, 1). */
export function sampleIndex(p: Float32Array, r: number): number {
  let acc = 0;
  for (let i = 0; i < p.length; i++) { acc += p[i]; if (r < acc) return i; }
  return p.length - 1;
}

/** The k most likely characters, biggest first. */
export function topK(p: Float32Array, k: number): { i: number; p: number }[] {
  return [...p].map((v, i) => ({ i, p: v })).sort((a, b) => b.p - a.p).slice(0, k);
}

/** A small seeded random number generator (so Show me always plays the same run). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

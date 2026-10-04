// Map of 3,000 training digits. Each dot is placed using the network's 64 layer-3 numbers.
// Your drawing is the bright dot.
//   t-SNE mode: the dot sits among the training digits whose 64 numbers are closest to yours.
//   PCA mode:   the dot is placed by one fixed matrix multiply (a straight projection).

export interface MapJson {
  count: number;
  labels: string;
  preds: string;
  pca: { xy: number[]; mean: number[]; comps: number[][]; mid: number[]; span: number };
  tsne: { xy: number[] };
  hidden: { max: number[]; data: string };
  sprite: { cols: number; tile: number };
}

export type MapMode = 'tsne' | 'pca';

// 10 hues for 10 digits, stepped for the dark map surface. Colour is a second cue only:
// every cluster also carries its digit as a text label, and hover names each dot.
export const DIGIT_COLOURS = [
  '#3987e5', '#e8743b', '#1fbf86', '#e0a100', '#e0679a',
  '#53b453', '#9085e9', '#e66767', '#3fc1d3', '#c9b98f',
];

function decodeU8(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export class DigitMap {
  readonly canvas: HTMLCanvasElement;
  readonly tip: HTMLDivElement;
  private ctx: CanvasRenderingContext2D;
  private base: HTMLCanvasElement;
  private tipCanvas: HTMLCanvasElement;
  private size = 480;
  private dpr = Math.min(window.devicePixelRatio || 1, 2);
  private n: number;
  private labels: Uint8Array;
  private preds: Uint8Array;
  private hidden: Float32Array; // n x 64
  mode: MapMode = 'tsne';
  private target: [number, number] | null = null;
  private dot: [number, number] | null = null;
  private trail: [number, number][] = [];
  private hover = -1;
  private hoverSelf = false;
  private t0 = performance.now();

  constructor(private wrap: HTMLElement, private data: MapJson, private sprite: HTMLImageElement) {
    this.n = data.count;
    this.labels = Uint8Array.from(data.labels, (c) => +c);
    this.preds = Uint8Array.from(data.preds, (c) => +c);
    const q = decodeU8(data.hidden.data);
    this.hidden = new Float32Array(q.length);
    for (let i = 0; i < q.length; i++) this.hidden[i] = (q[i] / 255) * data.hidden.max[i % 64];

    this.canvas = document.createElement('canvas');
    this.canvas.className = 'dg-map';
    this.canvas.setAttribute('role', 'img');
    this.canvas.setAttribute('aria-label', 'Map of 3,000 training digits, grouped by digit. Your drawing is the bright dot.');
    this.ctx = this.canvas.getContext('2d')!;
    this.base = document.createElement('canvas');
    this.tip = document.createElement('div');
    this.tip.className = 'dg-tip';
    this.tipCanvas = document.createElement('canvas');
    this.tipCanvas.width = 28;
    this.tipCanvas.height = 28;
    wrap.append(this.canvas, this.tip);

    new ResizeObserver(() => this.resize()).observe(wrap);
    this.canvas.addEventListener('pointermove', (e) => this.onHover(e));
    this.canvas.addEventListener('pointerleave', () => { this.hover = -1; this.hoverSelf = false; this.tip.style.display = 'none'; });
    this.resize();
    this.loop();
  }

  private xy(i: number): [number, number] {
    const a = this.mode === 'tsne' ? this.data.tsne.xy : this.data.pca.xy;
    return [a[2 * i] * this.size, a[2 * i + 1] * this.size];
  }

  setMode(m: MapMode) {
    this.mode = m;
    this.trail = [];
    this.renderBase();
    if (this.lastHidden) this.setHidden(this.lastHidden, true);
  }

  private resize() {
    const w = Math.floor(this.wrap.clientWidth);
    if (!w || w === this.size) return;
    this.size = w;
    for (const c of [this.canvas, this.base]) {
      c.width = Math.round(w * this.dpr);
      c.height = Math.round(w * this.dpr);
    }
    this.renderBase();
    if (this.lastHidden) this.setHidden(this.lastHidden, true);
  }

  /** Dots and cluster labels, drawn once per mode / size. */
  private renderBase() {
    const g = this.base.getContext('2d')!;
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    g.fillStyle = '#0a0b0f';
    g.fillRect(0, 0, this.size, this.size);
    const r = Math.max(1.6, this.size / 230);
    for (let i = 0; i < this.n; i++) {
      const [x, y] = this.xy(i);
      g.fillStyle = DIGIT_COLOURS[this.labels[i]];
      g.globalAlpha = 0.78;
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    }
    g.globalAlpha = 1;
    // label each cluster at its median point
    g.font = `800 ${Math.round(this.size / 17)}px Inter Variable, system-ui, sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    for (let d = 0; d < 10; d++) {
      const xs: number[] = [], ys: number[] = [];
      for (let i = 0; i < this.n; i++) if (this.labels[i] === d) { const [x, y] = this.xy(i); xs.push(x); ys.push(y); }
      xs.sort((a, b) => a - b); ys.sort((a, b) => a - b);
      const mx = xs[xs.length >> 1], my = ys[ys.length >> 1];
      g.lineWidth = 5;
      g.strokeStyle = 'rgba(10,11,15,.85)';
      g.strokeText(String(d), mx, my);
      g.fillStyle = '#ffffff';
      g.fillText(String(d), mx, my);
    }
  }

  private lastHidden: Float32Array | null = null;

  /** Place the live dot for a drawing's 64 layer-3 numbers (null = nothing drawn). */
  setHidden(h: Float32Array | null, jump = false) {
    this.lastHidden = h;
    if (!h) { this.target = null; this.dot = null; this.trail = []; return; }
    let x: number, y: number;
    if (this.mode === 'pca') {
      const { mean, comps, mid, span } = this.data.pca;
      let p0 = 0, p1 = 0;
      for (let k = 0; k < 64; k++) { const v = h[k] - mean[k]; p0 += v * comps[0][k]; p1 += v * comps[1][k]; }
      x = ((p0 - mid[0]) / span) * 0.92 + 0.5;
      y = ((p1 - mid[1]) / span) * 0.92 + 0.5;
    } else {
      // k nearest training digits in the 64-number space; average their map positions
      const K = 10;
      const best: [number, number][] = [];
      for (let i = 0; i < this.n; i++) {
        let d = 0;
        const o = i * 64;
        for (let k = 0; k < 64; k++) { const t = this.hidden[o + k] - h[k]; d += t * t; }
        if (best.length < K) { best.push([d, i]); best.sort((a, b) => a[0] - b[0]); }
        else if (d < best[K - 1][0]) { best[K - 1] = [d, i]; best.sort((a, b) => a[0] - b[0]); }
      }
      let sx = 0, sy = 0, sw = 0;
      for (const [d, i] of best) {
        const w = 1 / (d + 1e-3);
        sx += this.data.tsne.xy[2 * i] * w; sy += this.data.tsne.xy[2 * i + 1] * w; sw += w;
      }
      x = sx / sw; y = sy / sw;
    }
    x = Math.min(0.99, Math.max(0.01, x)) * this.size;
    y = Math.min(0.99, Math.max(0.01, y)) * this.size;
    this.target = [x, y];
    if (!this.dot || jump) this.dot = [x, y];
  }

  /** Where the live dot is now, in 0..1 map units (for tests). */
  dotPosition(): [number, number] | null {
    return this.dot ? [this.dot[0] / this.size, this.dot[1] / this.size] : null;
  }

  private onHover(e: PointerEvent) {
    const r = this.canvas.getBoundingClientRect();
    const mx = ((e.clientX - r.left) / r.width) * this.size;
    const my = ((e.clientY - r.top) / r.height) * this.size;
    if (this.dot && Math.hypot(this.dot[0] - mx, this.dot[1] - my) < 12) {
      this.hover = -1;
      this.hoverSelf = true;
      this.tip.innerHTML = '<b>Your drawing</b><br>It sits among the training digits whose 64 layer-3 numbers are closest to yours.';
      this.placeTip(e, r);
      return;
    }
    this.hoverSelf = false;
    let best = -1, bd = 14 * 14;
    for (let i = 0; i < this.n; i++) {
      const [x, y] = this.xy(i);
      const d = (x - mx) ** 2 + (y - my) ** 2;
      if (d < bd) { bd = d; best = i; }
    }
    this.hover = best;
    if (best < 0) { this.tip.style.display = 'none'; return; }
    const { cols, tile } = this.data.sprite;
    const tg = this.tipCanvas.getContext('2d')!;
    tg.clearRect(0, 0, 28, 28);
    tg.drawImage(this.sprite, (best % cols) * tile, Math.floor(best / cols) * tile, tile, tile, 0, 0, 28, 28);
    const lab = this.labels[best], pred = this.preds[best];
    this.tip.replaceChildren(this.tipCanvas);
    const p = document.createElement('div');
    p.innerHTML = `Training digit <b>#${best + 1}</b><br>Labelled <b>${lab}</b>` +
      (pred !== lab ? `<br><span style="color:#ff9b9b">The network reads it as ${pred}</span>` : '');
    this.tip.append(p);
    this.placeTip(e, r);
  }

  private placeTip(e: PointerEvent, r: DOMRect) {
    const wr = this.wrap.getBoundingClientRect();
    let x = e.clientX - wr.left + 14, y = e.clientY - wr.top + 14;
    if (x > wr.width - 150) x = e.clientX - wr.left - 150;
    if (y > wr.height - 150) y = e.clientY - wr.top - 150;
    this.tip.style.left = x + 'px';
    this.tip.style.top = y + 'px';
    this.tip.style.display = 'block';
    void r;
  }

  private loop = () => {
    requestAnimationFrame(this.loop);
    if (this.target && this.dot) {
      const k = 0.22;
      this.dot = [this.dot[0] + (this.target[0] - this.dot[0]) * k, this.dot[1] + (this.target[1] - this.dot[1]) * k];
      const last = this.trail[this.trail.length - 1];
      if (!last || Math.hypot(last[0] - this.dot[0], last[1] - this.dot[1]) > 1) {
        this.trail.push([this.dot[0], this.dot[1]]);
        if (this.trail.length > 60) this.trail.shift();
      }
    }
    this.paint();
  };

  private paint() {
    const g = this.ctx;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.drawImage(this.base, 0, 0);
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    if (this.hover >= 0) {
      const [x, y] = this.xy(this.hover);
      g.strokeStyle = '#fff';
      g.lineWidth = 2;
      g.beginPath(); g.arc(x, y, 6, 0, Math.PI * 2); g.stroke();
    }
    if (this.trail.length > 1) {
      g.lineCap = 'round';
      for (let i = 1; i < this.trail.length; i++) {
        g.strokeStyle = `rgba(255,210,63,${(i / this.trail.length) * 0.7})`;
        g.lineWidth = 2.5;
        g.beginPath();
        g.moveTo(this.trail[i - 1][0], this.trail[i - 1][1]);
        g.lineTo(this.trail[i][0], this.trail[i][1]);
        g.stroke();
      }
    }
    if (this.dot) {
      const [x, y] = this.dot;
      const t = (performance.now() - this.t0) / 1000;
      const pulse = 10 + 5 * (0.5 + 0.5 * Math.sin(t * 4));
      g.fillStyle = 'rgba(255,210,63,.18)';
      g.beginPath(); g.arc(x, y, pulse + 6, 0, Math.PI * 2); g.fill();
      g.shadowColor = 'rgba(255,210,63,.9)';
      g.shadowBlur = 18;
      g.fillStyle = '#ffffff';
      g.beginPath(); g.arc(x, y, 6.5, 0, Math.PI * 2); g.fill();
      g.shadowBlur = 0;
      g.strokeStyle = '#ffd23f';
      g.lineWidth = this.hoverSelf ? 4 : 2.5;
      g.beginPath(); g.arc(x, y, 9, 0, Math.PI * 2); g.stroke();
    } else {
      g.fillStyle = 'rgba(201,203,211,.75)';
      g.font = '13px Inter Variable, system-ui, sans-serif';
      g.textAlign = 'center';
      g.fillText('Draw something to place your dot', this.size / 2, this.size - 16);
    }
  }
}

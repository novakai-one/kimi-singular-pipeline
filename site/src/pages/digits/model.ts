// Forward pass of the digit network, in plain TypeScript (no libraries).
// Mirrors training/train_digits.py exactly. Pure functions: also runs in Node tests.
//
//   input 1x28x28
//   conv1 5x5 x8 (pad 2) -> ReLU -> 8x28x28 -> max-pool -> 8x14x14
//   conv2 3x3 x16 (pad 1) -> ReLU -> 16x14x14 -> max-pool -> 16x7x7
//   fc1 784 -> 64 -> ReLU
//   fc2 64 -> 10 -> softmax

export interface Tensor { shape: number[]; data: Float32Array }

export interface DigitModel {
  conv1w: Tensor; conv1b: Tensor;
  conv2w: Tensor; conv2b: Tensor;
  fc1w: Tensor; fc1b: Tensor;
  fc2w: Tensor; fc2b: Tensor;
  actScale: { c1: number; c2: number; hidden: number };
  meta: ModelJson;
}

export interface ModelJson {
  source: string;
  test_accuracy: number;
  test_count: number;
  confused_pairs: { a: number; b: number; count: number }[];
  act_scale: { c1: number; c2: number; hidden: number };
  layers: Record<string, { shape: number[]; data: string }>;
}

export interface Activations {
  input: Float32Array;   // 784
  c1: Float32Array;      // 8 x 28 x 28
  p1: Float32Array;      // 8 x 14 x 14
  c2: Float32Array;      // 16 x 14 x 14
  p2: Float32Array;      // 16 x 7 x 7
  hidden: Float32Array;  // 64
  logits: Float32Array;  // 10
  probs: Float32Array;   // 10
}

function decodeB64(b64: string): Float32Array {
  const bin = atob(b64); // atob exists in browsers and in Node 16+
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Float32Array(bytes.buffer);
}

export function parseModel(j: ModelJson): DigitModel {
  const t = (k: string): Tensor => ({ shape: j.layers[k].shape, data: decodeB64(j.layers[k].data) });
  return {
    conv1w: t('conv1.weight'), conv1b: t('conv1.bias'),
    conv2w: t('conv2.weight'), conv2b: t('conv2.bias'),
    fc1w: t('fc1.weight'), fc1b: t('fc1.bias'),
    fc2w: t('fc2.weight'), fc2b: t('fc2.bias'),
    actScale: j.act_scale,
    meta: j,
  };
}

/** Same-size 2-D convolution (stride 1), followed by ReLU. */
function conv2dRelu(x: Float32Array, C: number, H: number, W: number, w: Tensor, b: Tensor, out?: Float32Array): Float32Array {
  const [O, , K] = w.shape;
  const pad = (K - 1) >> 1;
  const y = out ?? new Float32Array(O * H * W);
  const wd = w.data;
  for (let o = 0; o < O; o++) {
    const bias = b.data[o];
    for (let i = 0; i < H; i++) {
      for (let j = 0; j < W; j++) {
        let s = bias;
        for (let c = 0; c < C; c++) {
          const xBase = c * H * W;
          const wBase = (o * C + c) * K * K;
          for (let ki = 0; ki < K; ki++) {
            const ii = i + ki - pad;
            if (ii < 0 || ii >= H) continue;
            const row = xBase + ii * W;
            const wRow = wBase + ki * K;
            for (let kj = 0; kj < K; kj++) {
              const jj = j + kj - pad;
              if (jj < 0 || jj >= W) continue;
              s += x[row + jj] * wd[wRow + kj];
            }
          }
        }
        y[(o * H + i) * W + j] = s > 0 ? s : 0;
      }
    }
  }
  return y;
}

/** 2x2 max-pool, stride 2. */
function maxPool2(x: Float32Array, C: number, H: number, W: number): Float32Array {
  const h2 = H >> 1, w2 = W >> 1;
  const y = new Float32Array(C * h2 * w2);
  for (let c = 0; c < C; c++) {
    for (let i = 0; i < h2; i++) {
      for (let j = 0; j < w2; j++) {
        const a = (c * H + 2 * i) * W + 2 * j;
        y[(c * h2 + i) * w2 + j] = Math.max(x[a], x[a + 1], x[a + W], x[a + W + 1]);
      }
    }
  }
  return y;
}

function dense(x: Float32Array, w: Tensor, b: Tensor, relu: boolean): Float32Array {
  const [O, N] = w.shape;
  const y = new Float32Array(O);
  for (let o = 0; o < O; o++) {
    let s = b.data[o];
    const base = o * N;
    for (let n = 0; n < N; n++) s += x[n] * w.data[base + n];
    y[o] = relu && s < 0 ? 0 : s;
  }
  return y;
}

export function softmax(z: Float32Array): Float32Array {
  let m = -Infinity;
  for (const v of z) m = Math.max(m, v);
  const e = new Float32Array(z.length);
  let sum = 0;
  for (let i = 0; i < z.length; i++) { e[i] = Math.exp(z[i] - m); sum += e[i]; }
  for (let i = 0; i < z.length; i++) e[i] /= sum;
  return e;
}

export function forward(m: DigitModel, input: Float32Array): Activations {
  const c1 = conv2dRelu(input, 1, 28, 28, m.conv1w, m.conv1b);
  const p1 = maxPool2(c1, 8, 28, 28);
  const c2 = conv2dRelu(p1, 8, 14, 14, m.conv2w, m.conv2b);
  const p2 = maxPool2(c2, 16, 14, 14);
  const hidden = dense(p2, m.fc1w, m.fc1b, true);
  const logits = dense(hidden, m.fc2w, m.fc2b, false);
  return { input, c1, p1, c2, p2, hidden, logits, probs: softmax(logits) };
}

/** Only the probabilities (used many times by the "Why this answer?" test). */
export function probsOnly(m: DigitModel, input: Float32Array): Float32Array {
  return forward(m, input).probs;
}

export function argmax(a: ArrayLike<number>): number {
  let best = 0;
  for (let i = 1; i < a.length; i++) if (a[i] > a[best]) best = i;
  return best;
}

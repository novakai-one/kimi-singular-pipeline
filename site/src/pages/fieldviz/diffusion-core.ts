// Field 10 — pure diffusion logic (no browser code), so tests can import it.
// Data: 400 points along a 2-D spiral. Forward process over T = 50 steps:
//   x_t = sqrt(abar_t) * x_0 + sqrt(1 - abar_t) * eps,   abar_t from a cosine schedule.
// Generation: DDIM-style deterministic steps with an exact denoiser,
//   xhat_0(x_t) = sum_i w_i d_i / sum_i w_i,   w_i = exp(-|x_t - sqrt(abar_t) d_i|^2 / (2 (1 - abar_t))),
// where d_i are 2,000 points spread evenly along the spiral curve (not the 400 shown points),
// so generated points land between the shown points instead of on top of them.

export const T = 50;
export const N_SHOWN = 400;
export const N_DENSE = 2000;
export const N_GEN = 300;
export const STEP_CHOICES = [2, 5, 10, 25, 50];

/** Spiral r = R0 + B * (theta - TH0) for theta in [TH0, TH0 + TURNS * 2 pi]. */
const TURNS = 1.6;
const R0 = 0.45;
const R1 = 2.45;
const TH0 = 0.5 * Math.PI;
const TH1 = TH0 + TURNS * 2 * Math.PI;
const B = (R1 - R0) / (TH1 - TH0);
/** Gap between neighbouring arms of the spiral. */
export const ARM_GAP = B * 2 * Math.PI;
/** Spread of the shown points across the curve (standard deviation). */
export const WIDTH = 0.05;

/** A generated point counts as "on the spiral" within this distance of the curve. */
export const ON_SPIRAL = 0.15;
/** Win: quality at least WIN_QUALITY using at most MAX_WIN_STEPS steps. */
export const WIN_QUALITY = 0.9;
export const MAX_WIN_STEPS = 10;
/** Show me picks this many steps. */
export const SHOW_ME_STEPS = 10;

/** Deterministic random numbers (same generator as kit.ts). */
export function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}
export function gauss(r: () => number) {
  const u = Math.max(1e-9, r()), v = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** Cosine noise schedule (Nichol & Dhariwal): abar falls from 1 at t = 0 to about 0 at t = T. t may be fractional. */
export function alphaBar(t: number): number {
  const s = 0.008;
  const f = (u: number) => Math.cos(((u / T + s) / (1 + s)) * (Math.PI / 2)) ** 2;
  return Math.min(1, Math.max(1e-4, f(t) / f(0)));
}

// ---------------------------------------------------------------- the spiral curve
const GRID = 20000;
const thetaGrid = new Float64Array(GRID + 1);
const lenGrid = new Float64Array(GRID + 1);
{
  let len = 0;
  for (let k = 0; k <= GRID; k++) {
    const th = TH0 + ((TH1 - TH0) * k) / GRID;
    thetaGrid[k] = th;
    if (k > 0) {
      const thm = th - (TH1 - TH0) / (2 * GRID);
      const r = R0 + B * (thm - TH0);
      len += Math.hypot(r, B) * ((TH1 - TH0) / GRID);
    }
    lenGrid[k] = len;
  }
}
/** Length of the spiral curve. */
export const CURVE_LENGTH = lenGrid[GRID];

function thetaAt(u: number): number {
  const target = Math.min(1, Math.max(0, u)) * CURVE_LENGTH;
  let lo = 0, hi = GRID;
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1;
    if (lenGrid[m] < target) lo = m; else hi = m;
  }
  const f = (target - lenGrid[lo]) / Math.max(1e-12, lenGrid[hi] - lenGrid[lo]);
  return thetaGrid[lo] + f * (thetaGrid[hi] - thetaGrid[lo]);
}

/** Point on the curve at fraction u of its length (0 = inner end, 1 = outer end), and the unit normal there. */
export function curveAt(u: number) {
  const th = thetaAt(u);
  const r = R0 + B * (th - TH0);
  const x = r * Math.cos(th), y = r * Math.sin(th);
  // tangent = dr/dth (cos, sin) + r (-sin, cos)
  const tx = B * Math.cos(th) - r * Math.sin(th), ty = B * Math.sin(th) + r * Math.cos(th);
  const tl = Math.hypot(tx, ty);
  return { x, y, nx: -ty / tl, ny: tx / tl };
}

/** 2,000 points spread evenly along the curve: what the exact denoiser uses. Interleaved x, y. */
export const DENSE = (() => {
  const out = new Float64Array(N_DENSE * 2);
  for (let i = 0; i < N_DENSE; i++) {
    const p = curveAt((i + 0.5) / N_DENSE);
    out[2 * i] = p.x; out[2 * i + 1] = p.y;
  }
  return out;
})();

/** The 400 training points shown on screen: along the curve with a slight random width. Interleaved x, y. */
export const SHOWN = (() => {
  const r = rng(20240610);
  const out = new Float64Array(N_SHOWN * 2);
  for (let i = 0; i < N_SHOWN; i++) {
    const p = curveAt((i + r()) / N_SHOWN);
    const off = gauss(r) * WIDTH;
    out[2 * i] = p.x + p.nx * off; out[2 * i + 1] = p.y + p.ny * off;
  }
  return out;
})();

/** n points along the curve from end to end, for drawing it. Interleaved x, y. */
export function curvePoints(n: number): Float64Array {
  const out = new Float64Array(n * 2);
  for (let i = 0; i < n; i++) { const p = curveAt(i / (n - 1)); out[2 * i] = p.x; out[2 * i + 1] = p.y; }
  return out;
}

/** Distance from (x, y) to the spiral curve (polyline through 4,000 points). */
const POLY_N = 4000;
const POLY = curvePoints(POLY_N);
export function distToCurve(x: number, y: number): number {
  let best = Infinity;
  for (let i = 0; i < POLY_N - 1; i++) {
    const ax = POLY[2 * i], ay = POLY[2 * i + 1], bx = POLY[2 * i + 2], by = POLY[2 * i + 3];
    const ex = bx - ax, ey = by - ay;
    const l2 = ex * ex + ey * ey;
    let f = ((x - ax) * ex + (y - ay) * ey) / l2;
    f = f < 0 ? 0 : f > 1 ? 1 : f;
    const dx = x - ax - f * ex, dy = y - ay - f * ey;
    const d2 = dx * dx + dy * dy;
    if (d2 < best) best = d2;
  }
  return Math.sqrt(best);
}

/** Share of points (interleaved x, y) within ON_SPIRAL of the curve. */
export function quality(pts: Float64Array, within = ON_SPIRAL): number {
  const n = pts.length / 2;
  let ok = 0;
  for (let i = 0; i < n; i++) if (distToCurve(pts[2 * i], pts[2 * i + 1]) <= within) ok++;
  return ok / n;
}

// ---------------------------------------------------------------- forward process
/** Fresh Gaussian noise for n points. Interleaved x, y. */
export function noise(n: number, seed: number): Float64Array {
  const r = rng(seed);
  const out = new Float64Array(n * 2);
  for (let i = 0; i < n * 2; i++) out[i] = gauss(r);
  return out;
}

/** x_t = sqrt(abar_t) x_0 + sqrt(1 - abar_t) eps, for every point. */
export function addNoise(x0: Float64Array, eps: Float64Array, t: number): Float64Array {
  const a = alphaBar(t), sa = Math.sqrt(a), sn = Math.sqrt(1 - a);
  const out = new Float64Array(x0.length);
  for (let i = 0; i < x0.length; i++) out[i] = sa * x0[i] + sn * eps[i];
  return out;
}

// ---------------------------------------------------------------- generation
/** Best guess of the clean point for a point at noise step t: weighted average of the dense curve points. */
export function denoise(x: number, y: number, t: number): [number, number] {
  const a = alphaBar(t), sa = Math.sqrt(a), v = 1 - a;
  let maxL = -Infinity;
  const logw = denoiseBuf;
  for (let i = 0; i < N_DENSE; i++) {
    const dx = x - sa * DENSE[2 * i], dy = y - sa * DENSE[2 * i + 1];
    const l = -(dx * dx + dy * dy) / (2 * v);
    logw[i] = l;
    if (l > maxL) maxL = l;
  }
  let sw = 0, sx = 0, sy = 0;
  for (let i = 0; i < N_DENSE; i++) {
    const w = Math.exp(logw[i] - maxL);
    sw += w; sx += w * DENSE[2 * i]; sy += w * DENSE[2 * i + 1];
  }
  return [sx / sw, sy / sw];
}
const denoiseBuf = new Float64Array(N_DENSE);

/** The noise steps visited when generating with k steps: T, ..., 0 (k + 1 values). */
export function timesFor(k: number): number[] {
  const out: number[] = [];
  for (let j = k; j >= 0; j--) out.push(Math.round((T * j) / k));
  return out;
}

/** One deterministic (DDIM) step for every point, from noise step t down to noise step s. */
export function ddimStep(pts: Float64Array, t: number, s: number): Float64Array {
  const at = alphaBar(t), as = s <= 0 ? 1 : alphaBar(s);
  const out = new Float64Array(pts.length);
  for (let i = 0; i < pts.length; i += 2) {
    const [hx, hy] = denoise(pts[i], pts[i + 1], t);
    const ex = (pts[i] - Math.sqrt(at) * hx) / Math.sqrt(1 - at);
    const ey = (pts[i + 1] - Math.sqrt(at) * hy) / Math.sqrt(1 - at);
    out[i] = Math.sqrt(as) * hx + Math.sqrt(1 - as) * ex;
    out[i + 1] = Math.sqrt(as) * hy + Math.sqrt(1 - as) * ey;
  }
  return out;
}

/** Generate from fresh noise with k steps. Returns every intermediate frame (k + 1 of them). */
export function generate(k: number, seed: number, n = N_GEN): Float64Array[] {
  const times = timesFor(k);
  const frames = [noise(n, seed)];
  for (let j = 0; j < k; j++) frames.push(ddimStep(frames[j], times[j], times[j + 1]));
  return frames;
}

/** Median distance from each point to the nearest of the 400 shown points. */
export function medianDistToShown(pts: Float64Array): number {
  const n = pts.length / 2;
  const d: number[] = [];
  for (let i = 0; i < n; i++) {
    let best = Infinity;
    for (let j = 0; j < N_SHOWN; j++) {
      const dx = pts[2 * i] - SHOWN[2 * j], dy = pts[2 * i + 1] - SHOWN[2 * j + 1];
      best = Math.min(best, dx * dx + dy * dy);
    }
    d.push(Math.sqrt(best));
  }
  d.sort((a, b) => a - b);
  return d[n >> 1];
}

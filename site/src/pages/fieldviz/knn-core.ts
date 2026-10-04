// Field 2 — pure k-nearest-neighbours logic (no browser code), so tests can import it.
// Data: two interleaved half-moons with noise. Class 0 = blue (outer moon), class 1 = orange (inner moon).

export interface Pt { x: number; y: number; label: 0 | 1 }

/** Deterministic random numbers (same generator as kit.ts, copied so Node can import this file). */
export function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}
function gauss(r: () => number) {
  const u = Math.max(1e-9, r()), v = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** n points per moon. Outer moon: (cos t, sin t). Inner moon: (1 - cos t, 0.5 - sin t). */
export function makeMoons(nPerClass: number, noise: number, r: () => number): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < nPerClass; i++) {
    const t = Math.PI * r();
    out.push({ x: Math.cos(t) + noise * gauss(r), y: Math.sin(t) + noise * gauss(r), label: 0 });
    const u = Math.PI * r();
    out.push({ x: 1 - Math.cos(u) + noise * gauss(r), y: 0.5 - Math.sin(u) + noise * gauss(r), label: 1 });
  }
  return out;
}

export const SEED = 1918;
export const NOISE = 0.3;
const R = rng(SEED);
/** 80 training points (40 per colour) and 40 test points (20 per colour). */
export const TRAIN = makeMoons(40, NOISE, R);
export const TEST = makeMoons(20, NOISE, R);

/** The k values the learner can pick. */
export const KS = [1, 3, 5, 9, 15, 31];

/** Indices of the k training points closest to (x, y), closest first. */
export function nearest(train: Pt[], x: number, y: number, k: number): number[] {
  const d = train.map((p, i) => [(p.x - x) ** 2 + (p.y - y) ** 2, i] as [number, number]);
  d.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  return d.slice(0, k).map((e) => e[1]);
}

/** Votes for each colour among the k nearest training points. */
export function votes(train: Pt[], x: number, y: number, k: number): [number, number] {
  const v: [number, number] = [0, 0];
  for (const i of nearest(train, x, y, k)) v[train[i].label]++;
  return v;
}

/** The most common colour among the k nearest training points (k is odd, so no ties). */
export function predict(train: Pt[], x: number, y: number, k: number): 0 | 1 {
  const v = votes(train, x, y, k);
  return v[1] > v[0] ? 1 : 0;
}

/** Number of points in pts that get their own colour. */
export function correct(train: Pt[], pts: Pt[], k: number): number {
  return pts.reduce((s, p) => s + (predict(train, p.x, p.y, k) === p.label ? 1 : 0), 0);
}

export interface Score { k: number; train: number; test: number; trainPct: number; testPct: number }
/** Training and test scores for every k choice. */
export const SCORES: Score[] = KS.map((k) => {
  const tr = correct(TRAIN, TRAIN, k), te = correct(TRAIN, TEST, k);
  return { k, train: tr, test: te, trainPct: Math.round((100 * tr) / TRAIN.length), testPct: Math.round((100 * te) / TEST.length) };
});
const BEST_TEST = Math.max(...SCORES.map((s) => s.test));
/** Every k that ties for the best test score. */
export const BEST_KS = SCORES.filter((s) => s.test === BEST_TEST).map((s) => s.k);
export const scoreFor = (k: number) => SCORES.find((s) => s.k === k)!;

/** The part of the plane drawn (chosen so every point fits with a margin). */
export const DOMAIN = { x0: -1.45, x1: 2.55, y0: -1.03, y1: 1.57 };
/** Grid of the shaded background: square cells (4.0 wide / 2.6 tall = 60 / 39). */
export const GRID = { cols: 60, rows: 39 };

/** Predicted colour for the centre of every grid cell, row by row from the top. */
export function gridPredictions(k: number, train: Pt[] = TRAIN): Uint8Array {
  const { cols, rows } = GRID, { x0, x1, y0, y1 } = DOMAIN;
  const out = new Uint8Array(cols * rows);
  for (let r = 0; r < rows; r++) {
    const y = y1 - ((r + 0.5) / rows) * (y1 - y0);
    for (let c = 0; c < cols; c++) {
      const x = x0 + ((c + 0.5) / cols) * (x1 - x0);
      out[r * cols + c] = predict(train, x, y, k);
    }
  }
  return out;
}

/** Number of separate same-colour patches in a grid (4-neighbour connectivity). */
export function patches(grid: Uint8Array): number {
  const { cols, rows } = GRID;
  const seen = new Uint8Array(grid.length);
  let n = 0;
  for (let s = 0; s < grid.length; s++) {
    if (seen[s]) continue;
    n++;
    const stack = [s];
    seen[s] = 1;
    while (stack.length) {
      const i = stack.pop()!;
      const c = i % cols, r = (i - c) / cols;
      for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nc = c + dc, nr = r + dr;
        if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) continue;
        const j = nr * cols + nc;
        if (!seen[j] && grid[j] === grid[i]) { seen[j] = 1; stack.push(j); }
      }
    }
  }
  return n;
}

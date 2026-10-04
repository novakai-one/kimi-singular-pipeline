// Field 9 — pure round-trip logic (no browser code), so tests can import it.
// Brute force over every distinct round trip, and simulated annealing with
// "reverse one section of the trip" moves (2-opt).

export type XY = [number, number];

/** Size of the map, in the same units as the trip lengths. */
export const MAP = { w: 560, h: 340 };

/** The 8 stops (fixed, so every visit shows the same map). */
export const STOPS: XY[] = [
  [301, 256], [246, 140], [99, 202], [452, 287], [63, 43], [386, 156], [502, 44], [181, 299],
];

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

export const dist = (a: XY, b: XY) => Math.hypot(a[0] - b[0], a[1] - b[1]);

/** Length of the closed trip: visit the stops in this order, then return to the first. */
export function tripLength(order: number[], pts: XY[] = STOPS): number {
  let s = 0;
  for (let i = 0; i < order.length; i++) s += dist(pts[order[i]], pts[order[(i + 1) % order.length]]);
  return s;
}

/** Length of the open path (no return leg). */
export function pathLength(order: number[], pts: XY[] = STOPS): number {
  let s = 0;
  for (let i = 1; i < order.length; i++) s += dist(pts[order[i - 1]], pts[order[i]]);
  return s;
}

export function factorial(n: number): bigint {
  let f = 1n;
  for (let i = 2; i <= n; i++) f *= BigInt(i);
  return f;
}

/** Distinct round trips through n stops: fix the start, (n - 1)! orders, halve for direction. */
export function countTrips(n: number): bigint {
  return n < 3 ? 1n : factorial(n - 1) / 2n;
}

/** Every distinct round trip through stops 0..n-1: start at 0, and keep one of each trip and its reverse. */
export function allTrips(n: number): number[][] {
  const out: number[][] = [];
  const rest = Array.from({ length: n - 1 }, (_, i) => i + 1);
  const used = new Array(n).fill(false);
  const cur: number[] = [];
  const rec = () => {
    if (cur.length === rest.length) {
      if (cur[0] < cur[cur.length - 1]) out.push([0, ...cur]);
      return;
    }
    for (const s of rest) {
      if (used[s]) continue;
      used[s] = true; cur.push(s);
      rec();
      used[s] = false; cur.pop();
    }
  };
  rec();
  return out;
}

/** The shortest round trip, found by checking every distinct trip. */
export function shortest(pts: XY[] = STOPS): { order: number[]; length: number; checked: number } {
  let best: number[] = [], bestLen = Infinity, checked = 0;
  for (const t of allTrips(pts.length)) {
    checked++;
    const l = tripLength(t, pts);
    if (l < bestLen - 1e-9) { bestLen = l; best = t; }
  }
  return { order: best, length: bestLen, checked };
}

export const BEST = shortest(STOPS);
/** A trip wins the challenge when it is at most 5% longer than the shortest. */
export const WIN_RATIO = 1.05;
export const isWin = (length: number) => length <= WIN_RATIO * BEST.length + 1e-9;

/** How much longer than the shortest, in percent. */
export const percentOver = (length: number) => (length / BEST.length - 1) * 100;

/** Do segments p1-p2 and p3-p4 cross (touching at a shared stop does not count)? */
function segmentsCross(p1: XY, p2: XY, p3: XY, p4: XY): boolean {
  const o = (a: XY, b: XY, c: XY) => Math.sign((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]));
  return o(p1, p2, p3) * o(p1, p2, p4) < 0 && o(p3, p4, p1) * o(p3, p4, p2) < 0;
}

/** Number of places where the closed trip crosses itself. */
export function crossings(order: number[], pts: XY[] = STOPS): number {
  const n = order.length;
  let c = 0;
  for (let i = 0; i < n; i++) {
    for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue; // these two legs share the first stop
      if (segmentsCross(pts[order[i]], pts[order[i + 1]], pts[order[j]], pts[order[(j + 1) % n]])) c++;
    }
  }
  return c;
}

/** Chance of keeping a change that makes the trip delta longer, at temperature T. */
export const acceptChance = (delta: number, T: number) => (delta <= 0 ? 1 : Math.exp(-delta / T));

export interface AnnealOptions {
  /** Moves tried in total. */
  steps: number;
  /** Starting and final temperature (same units as length). */
  T0: number;
  T1: number;
  /** A random start trip must cross itself at least this often. */
  minCrossings: number;
}
export const ANNEAL_DEFAULTS: AnnealOptions = { steps: 300, T0: 120, T1: 2, minCrossings: 4 };

export interface Annealer {
  /** Current trip (starts at stop 0). */
  order: number[];
  length: number;
  /** Temperature for the next move. */
  T: number;
  /** Moves tried so far. */
  tried: number;
  /** Longer trips that were kept. */
  keptWorse: number;
  /** Trip length after every move (history[0] = start). */
  history: number[];
  /** The section reversed by the last kept move: positions i..j in order. */
  last: [number, number] | null;
  done: boolean;
  /** Try one move: reverse the section between two positions. Returns true if it was kept. */
  step(): boolean;
}

/** A random trip that crosses itself at least minCrossings times. */
export function tangledTrip(r: () => number, n: number, minCrossings: number, pts: XY[] = STOPS): number[] {
  let best: number[] = [], bestC = -1;
  for (let tries = 0; tries < 500; tries++) {
    const t = Array.from({ length: n }, (_, i) => i);
    for (let i = n - 1; i > 1; i--) {
      const j = 1 + Math.floor(r() * i);
      [t[i], t[j]] = [t[j], t[i]];
    }
    const c = crossings(t, pts);
    if (c > bestC) { best = t; bestC = c; }
    if (c >= minCrossings) break;
  }
  return best;
}

/** Simulated annealing from a random, tangled trip. */
export function makeAnnealer(seed: number, opts: Partial<AnnealOptions> = {}, pts: XY[] = STOPS): Annealer {
  const o = { ...ANNEAL_DEFAULTS, ...opts };
  const r = rng(seed);
  const n = pts.length;
  const order = tangledTrip(r, n, o.minCrossings, pts);
  const temp = (k: number) => o.T0 * (o.T1 / o.T0) ** Math.min(1, k / Math.max(1, o.steps - 1));
  // every pair (i, j) with 1 <= i < j <= n - 1, except reversing everything after the start (same trip backwards)
  const moves: [number, number][] = [];
  for (let i = 1; i < n - 1; i++) for (let j = i + 1; j < n; j++) if (!(i === 1 && j === n - 1)) moves.push([i, j]);
  const A: Annealer = {
    order, length: tripLength(order, pts), T: temp(0), tried: 0, keptWorse: 0,
    history: [tripLength(order, pts)], last: null, done: false,
    step() {
      if (A.done) return false;
      const [i, j] = moves[Math.floor(r() * moves.length)];
      const t = A.order;
      const a = pts[t[i - 1]], b = pts[t[i]], c = pts[t[j]], d = pts[t[(j + 1) % n]];
      const delta = dist(a, c) + dist(b, d) - dist(a, b) - dist(c, d);
      const keep = delta <= 0 || r() < acceptChance(delta, A.T);
      if (keep) {
        for (let lo = i, hi = j; lo < hi; lo++, hi--) [t[lo], t[hi]] = [t[hi], t[lo]];
        if (delta > 1e-9) A.keptWorse++;
        A.length = tripLength(t, pts);
        A.last = [i, j];
      }
      A.tried++;
      A.history.push(A.length);
      A.T = temp(A.tried);
      if (A.tried >= o.steps) A.done = true;
      return keep;
    },
  };
  return A;
}

/** Show me cycles through seeds 1..DEMO_SEEDS; the unit test checks every one ends on the shortest trip. */
export const DEMO_SEEDS = 2000;

/** Run an annealer to the end (for tests). */
export function runAnneal(seed: number, opts: Partial<AnnealOptions> = {}, pts: XY[] = STOPS): Annealer {
  const A = makeAnnealer(seed, opts, pts);
  while (!A.done) A.step();
  return A;
}

/** Number formatting used on screen: 1240 -> "1,240". */
export const fmt = (x: number) => Math.round(x).toLocaleString('en-US');

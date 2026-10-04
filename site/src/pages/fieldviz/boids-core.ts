// Field 7 — pure flocking logic (no browser code), so tests can import it.
// Each bird sees only the birds within RADIUS and steers with three rules:
//   separation (move away from birds that are too close),
//   alignment  (turn toward the neighbours' average direction),
//   cohesion   (steer toward the neighbours' centre).
// Units: pixels and simulation ticks (TICK_HZ ticks per second).

export const W = 560, H = 360;
export const N = 70;
/** Each bird only sees birds closer than this (pixels). */
export const RADIUS = 50;
/** Separation pushes away from birds closer than this (pixels). */
export const SEP_DIST = 14;
/** Speed limits (pixels per tick). */
export const MIN_SPEED = 1.2, MAX_SPEED = 2.2;
export const TICK_HZ = 60;

/** Each tick every bird also turns by a random angle up to this size (radians). */
export const WOBBLE = 0.18;
/** Largest change alignment or cohesion can make to a velocity in one tick, at weight 1. */
export const MAX_FORCE = 0.1;
/** Largest change separation can make in one tick, at weight 1. */
export const SEP_FORCE = 0.2;

/** Win condition: order score at or above WIN_SCORE for WIN_HOLD seconds. */
export const WIN_SCORE = 0.9;
export const WIN_HOLD = 2;

export interface Weights { sep: number; align: number; coh: number }
export const DEFAULTS: Weights = { sep: 1, align: 0, coh: 1 };
/** What Show me moves the sliders to. */
export const SHOW_ME: Weights = { sep: 1, align: 1.5, coh: 1 };

export interface Flock {
  n: number; x: Float64Array; y: Float64Array; vx: Float64Array; vy: Float64Array;
  /** Seeded random numbers for the small random turn each tick. */
  rand: () => number;
}

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

/** Random positions and random directions, every bird at a speed between the limits. */
export function scatter(seed: number, n = N): Flock {
  const r = rng(seed);
  const f: Flock = { n, x: new Float64Array(n), y: new Float64Array(n), vx: new Float64Array(n), vy: new Float64Array(n), rand: r };
  for (let i = 0; i < n; i++) {
    f.x[i] = r() * W;
    f.y[i] = r() * H;
    const a = r() * Math.PI * 2;
    const sp = MIN_SPEED + r() * (MAX_SPEED - MIN_SPEED);
    f.vx[i] = Math.cos(a) * sp;
    f.vy[i] = Math.sin(a) * sp;
  }
  return f;
}

/** Shortest signed difference on a wrap-around axis of length size. */
export function wrapDelta(d: number, size: number) {
  if (d > size / 2) return d - size;
  if (d < -size / 2) return d + size;
  return d;
}

/** Indices of the birds that bird i can see. */
export function neighbours(f: Flock, i: number): number[] {
  const out: number[] = [];
  for (let j = 0; j < f.n; j++) {
    if (j === i) continue;
    const dx = wrapDelta(f.x[j] - f.x[i], W), dy = wrapDelta(f.y[j] - f.y[i], H);
    if (dx * dx + dy * dy < RADIUS * RADIUS) out.push(j);
  }
  return out;
}

const ax = new Float64Array(512), ay = new Float64Array(512);

/**
 * Steering toward a wanted direction (Reynolds): wanted velocity minus current velocity,
 * capped at cap. Writes the result into out.
 */
function steer(dx: number, dy: number, vx: number, vy: number, out: [number, number], cap = MAX_FORCE) {
  const l = Math.hypot(dx, dy);
  if (l < 1e-9) { out[0] = 0; out[1] = 0; return; }
  let fx = (dx / l) * MAX_SPEED - vx, fy = (dy / l) * MAX_SPEED - vy;
  const fl = Math.hypot(fx, fy);
  if (fl > cap) { fx *= cap / fl; fy *= cap / fl; }
  out[0] = fx; out[1] = fy;
}

/** Advance the flock by one tick. Every bird reacts to the same snapshot. */
export function step(f: Flock, w: Weights) {
  const R2 = RADIUS * RADIUS, S2 = SEP_DIST * SEP_DIST;
  const tmp: [number, number] = [0, 0];
  for (let i = 0; i < f.n; i++) {
    let sx = 0, sy = 0, ns = 0, avx = 0, avy = 0, cx = 0, cy = 0, n = 0;
    for (let j = 0; j < f.n; j++) {
      if (j === i) continue;
      const dx = wrapDelta(f.x[j] - f.x[i], W), dy = wrapDelta(f.y[j] - f.y[i], H);
      const d2 = dx * dx + dy * dy;
      if (d2 >= R2) continue;
      n++;
      const l = Math.hypot(f.vx[j], f.vy[j]) || 1;
      avx += f.vx[j] / l; avy += f.vy[j] / l;
      cx += dx; cy += dy;
      if (d2 < S2 && d2 > 1e-9) {
        // away from the close bird, more strongly the closer it is
        sx -= dx / d2; sy -= dy / d2; ns++;
      }
    }
    let fx = 0, fy = 0;
    const vx = f.vx[i], vy = f.vy[i];
    if (ns > 0) { steer(sx, sy, vx, vy, tmp, SEP_FORCE); fx += w.sep * tmp[0]; fy += w.sep * tmp[1]; }
    if (n > 0) {
      steer(avx, avy, vx, vy, tmp); fx += w.align * tmp[0]; fy += w.align * tmp[1];
      steer(cx, cy, vx, vy, tmp); fx += w.coh * tmp[0]; fy += w.coh * tmp[1];
    }
    ax[i] = fx; ay[i] = fy;
  }
  for (let i = 0; i < f.n; i++) {
    let vx = f.vx[i] + ax[i], vy = f.vy[i] + ay[i];
    const turn = (f.rand() * 2 - 1) * WOBBLE, co = Math.cos(turn), si = Math.sin(turn);
    [vx, vy] = [vx * co - vy * si, vx * si + vy * co];
    const sp = Math.hypot(vx, vy);
    if (sp < 1e-9) { vx = MIN_SPEED; vy = 0; }
    else if (sp > MAX_SPEED) { vx *= MAX_SPEED / sp; vy *= MAX_SPEED / sp; }
    else if (sp < MIN_SPEED) { vx *= MIN_SPEED / sp; vy *= MIN_SPEED / sp; }
    f.vx[i] = vx; f.vy[i] = vy;
    f.x[i] = (f.x[i] + vx + W) % W;
    f.y[i] = (f.y[i] + vy + H) % H;
  }
}

/** Length of the average of a set of direction arrows, each scaled to length 1. */
export function orderOf(dirs: [number, number][]): number {
  let sx = 0, sy = 0;
  for (const [x, y] of dirs) {
    const l = Math.hypot(x, y) || 1;
    sx += x / l; sy += y / l;
  }
  return Math.hypot(sx / dirs.length, sy / dirs.length);
}

/** Order score of the flock: 1 = every bird points the same way, near 0 = no shared direction. */
export function orderScore(f: Flock): number {
  return averageDirection(f).len;
}

/** The average of all birds' length-1 direction arrows. */
export function averageDirection(f: Flock) {
  let sx = 0, sy = 0;
  for (let i = 0; i < f.n; i++) {
    const l = Math.hypot(f.vx[i], f.vy[i]) || 1;
    sx += f.vx[i] / l; sy += f.vy[i] / l;
  }
  const x = sx / f.n, y = sy / f.n;
  return { x, y, len: Math.hypot(x, y) };
}

/** Mean distance from each bird to its k nearest birds (wrap-around). Small = bunched. */
export function meanNearest(f: Flock, k = 3): number {
  let total = 0;
  const d = new Float64Array(f.n);
  for (let i = 0; i < f.n; i++) {
    for (let j = 0; j < f.n; j++) {
      const dx = wrapDelta(f.x[j] - f.x[i], W), dy = wrapDelta(f.y[j] - f.y[i], H);
      d[j] = j === i ? Infinity : Math.hypot(dx, dy);
    }
    const s = Array.from(d).sort((a, b) => a - b);
    for (let m = 0; m < k; m++) total += s[m];
  }
  return total / (f.n * k);
}

/** Counts how long the order score has stayed at or above WIN_SCORE without a break. */
export function holdTimer() {
  let held = 0;
  return {
    /** Add dt seconds at this score; returns the seconds held so far. */
    add(score: number, dt: number) {
      held = score >= WIN_SCORE ? held + dt : 0;
      return held;
    },
    reset() { held = 0; },
    get held() { return held; },
    get won() { return held >= WIN_HOLD; },
  };
}

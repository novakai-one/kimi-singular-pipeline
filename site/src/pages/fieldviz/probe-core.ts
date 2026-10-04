// Field 4 — pure probe logic (no browser code), so tests can import it.
// Each point is a test digit's 64 inside numbers, projected to 2-D.
// A point's "shadow" on the arrow is its dot product with the arrow's unit vector.

export interface ProbeData {
  xy: [number, number][];
  digit: number[];
  round: number[];
  straight: number[];
  best_accuracy: number;
  best_angle_deg: number;
}

/** The arrow starts pointing straight up, where the score is poor. */
export const START_DEG = 90;
/** One press of a turn button. */
export const STEP_DEG = 15;
/** The challenge's target score. */
export const TARGET = 0.9;

export const unit = (deg: number): [number, number] => {
  const t = (deg * Math.PI) / 180;
  return [Math.cos(t), Math.sin(t)];
};

/** Normalise an angle to [0, 360). */
export const norm360 = (deg: number) => ((deg % 360) + 360) % 360;

/** Every point's shadow on the arrow's line: h · w for the unit arrow w. */
export function shadows(xy: [number, number][], deg: number): number[] {
  const [ux, uy] = unit(deg);
  return xy.map(([x, y]) => x * ux + y * uy);
}

export interface Cut {
  /** Share of points on the correct side of the cut (0..1). */
  accuracy: number;
  correct: number;
  n: number;
  /** Where the strip is cut (a shadow value). */
  cut: number;
  /** true: shadows above the cut are called round. */
  roundHigh: boolean;
}

/** Try every cut along the strip, both ways round, and keep the best. */
export function bestCut(values: number[], isRound: boolean[]): Cut {
  const n = values.length;
  const idx = values.map((_, i) => i).sort((a, b) => values[a] - values[b]);
  const totalRound = isRound.filter(Boolean).length;
  let best: Cut = { accuracy: -1, correct: 0, n, cut: 0, roundHigh: true };
  let roundBelow = 0;
  for (let k = 0; k <= n; k++) {
    if (k > 0 && isRound[idx[k - 1]]) roundBelow++;
    // a cut can only sit between two different values
    if (k > 0 && k < n && values[idx[k]] === values[idx[k - 1]]) continue;
    const straightBelow = k - roundBelow;
    const roundAbove = totalRound - roundBelow;
    const straightAbove = n - totalRound - straightBelow;
    const lo = k === 0 ? values[idx[0]] - 0.02 : values[idx[k - 1]];
    const hi = k === n ? values[idx[n - 1]] + 0.02 : values[idx[k]];
    const cut = (lo + hi) / 2;
    const highRound = straightBelow + roundAbove;
    const highStraight = roundBelow + straightAbove;
    if (highRound > best.correct || best.accuracy < 0) best = { accuracy: highRound / n, correct: highRound, n, cut, roundHigh: true };
    if (highStraight > best.correct) best = { accuracy: highStraight / n, correct: highStraight, n, cut, roundHigh: false };
  }
  return best;
}

export function labels(data: ProbeData): boolean[] {
  const r = new Set(data.round);
  return data.digit.map((d) => r.has(d));
}

/** The score for an arrow at this angle: the best cut's accuracy. */
export function scoreAt(data: ProbeData, deg: number, isRound = labels(data)): Cut {
  return bestCut(shadows(data.xy, deg), isRound);
}

/** The arc of angles around `centre` where the score stays at or above `target`. */
export function goodRange(data: ProbeData, centre = data.best_angle_deg, target = TARGET, step = 0.25) {
  const isRound = labels(data);
  const ok = (d: number) => scoreAt(data, d, isRound).accuracy >= target;
  if (!ok(centre)) return { from: centre, to: centre, width: 0 };
  let lo = centre, hi = centre;
  while (ok(lo - step) && centre - lo < 180) lo -= step;
  while (ok(hi + step) && hi - centre < 180) hi += step;
  return { from: lo, to: hi, width: hi - lo };
}

/** Turn from one angle to another the short way round: the signed change in degrees. */
export function shortTurn(from: number, to: number): number {
  let d = norm360(to - from);
  if (d > 180) d -= 360;
  return d;
}

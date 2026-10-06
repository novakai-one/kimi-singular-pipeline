// Chapter 8 pure logic: the puzzle numbers, win checks, Doubt predicates and the Law.
// No DOM, no three (unit-tested in tests/unit/game-c08.test.ts).
import type { LawDef } from '../../../game/types.ts';
import {
  add, cross, dist, dot, len, near, onAll, randInt, randNZ, residuals, scale, solutionCount, sub, kindOf,
  type Aug,
} from './act3.ts';

// ------------------------------------------------------------------ puzzle numbers (GDD §6.5, Ch 8)

/** c08-p1: x + y = 5, x − y = 1. Row picture: two lines meeting at (3, 2). Column picture: 3(1, 1) + 2(1, −1) = (5, 1). */
export const P1 = { rows: [[1, 1, 5], [1, -1, 1]] as Aug, cols: [[1, 1], [1, -1]], b: [5, 1], answer: [3, 2] };
/** The column view's tip for weights (x, y). */
export const p1Tip = (x: number, y: number): number[] => add(scale(P1.cols[0], x), scale(P1.cols[1], y));
/** The weights that reach a tip q: solve x(1, 1) + y(1, −1) = q. */
export const p1Weights = (q: number[]): number[] => [(q[0] + q[1]) / 2, (q[0] - q[1]) / 2];
export const p1Won = (xy: number[], tol: number): boolean => near(xy, P1.answer, tol) && near(p1Tip(xy[0], xy[1]), P1.b, tol * 2);

/** c08-p2: the three fan-beam planes and Teo's pod. */
export const P2 = { rows: [[1, 1, 1, 6], [0, 2, 5, -4], [2, 5, -1, 27]] as Aug, pod: [5, 3, -2], start: [4, 2, -4] };
export const p2Won = (x: number[], tol: number): boolean => onAll(P2.rows, x, tol);

/** c08-p3: three planes that share a line, (0, −1, 4) + t(1, 1, −2). Wren's "exactly two spots". */
export const P3 = { rows: [[1, 1, 1, 3], [1, -1, 0, 1], [2, 0, 1, 4]] as Aug, base: [0, -1, 4], dir: [1, 1, -2], startA: [2, -1, 0], startB: [0, 1, 2] };
/** A and B both solve and are different points. */
export const p3Pair = (a: number[], b: number[], tol: number): boolean => onAll(P3.rows, a, tol) && onAll(P3.rows, b, tol) && dist(a, b) > 0.5;
/** Where the third marker sits for slider value t: A + t(B − A). */
export const p3C = (a: number[], b: number[], t: number): number[] => add(a, scale(sub(b, a), t));
/** Which parts of the line the third marker has visited: before A (t < 0), between (0 < t < 1), beyond B (t > 1). */
export function p3Region(t: number): 'before' | 'between' | 'beyond' | null {
  if (t < -0.15) return 'before';
  if (t > 0.15 && t < 0.85) return 'between';
  if (t > 1.15) return 'beyond';
  return null;
}
/** The sweep is done once the marker has been between A and B and outside them (either side), always on every plane. */
export const p3SweepDone = (seen: Set<string>): boolean => seen.has('between') && (seen.has('before') || seen.has('beyond'));

/** c08-p4: change the last right side to 5. The three lines where pairs of planes meet run side by side along (1, 1, −2). */
export const P4 = { rows: [[1, 1, 1, 3], [1, -1, 0, 1], [2, 0, 1, 5]] as Aug, dir: [1, 1, -2] };
/** The angle in degrees between the viewing direction and the lines (either way along them). */
export function viewAngle(camDir: number[], lineDir: number[]): number {
  const c = Math.abs(dot(camDir, lineDir)) / (len(camDir) * len(lineDir));
  return (Math.acos(Math.min(1, c)) * 180) / Math.PI;
}
export const lookingDown = (camDir: number[], tolDeg = 9): boolean => viewAngle(camDir, P4.dir) <= tolDeg;

/** c08-p5: the ark's three ballast tanks (tonnes in tanks A, B, C). */
export const P5 = {
  rows: [[1, 1, 1, 13], [-1, 1, 0, 1], [0, -1, 1, 2]] as Aug,
  answer: [3, 4, 6],
  cols: [[1, -1, 0], [1, 1, -1], [1, 0, 1]],
  b: [13, 1, 2],
};

// ------------------------------------------------------------------ the Doubts (by construction)

/**
 * Doubt 1 (false): "More unknowns than equations means infinitely many solutions."
 * The scene is two planes in three unknowns. The claim holds for the scene when it has infinitely many.
 */
export const d1Holds = (rows: Aug): boolean => rows.length < rows[0].length - 1 ? solutionCount(rows) === Infinity : true;
/** The counterexample: two parallel planes. */
export const D1_COUNTER: Aug = [[1, 1, 1, 1], [1, 1, 1, 3]];
export const D1_START: Aug = [[1, 1, 1, 3], [1, -1, 2, 2]];
/** The Shake: random pairs of planes; edge 0 makes them parallel. */
export function d1Random(rng: () => number, edge = -1): Aug {
  const a = [randInt(rng, -3, 3), randInt(rng, -3, 3), randNZ(rng, 3)];
  if (edge >= 0) { const k = randNZ(rng, 2); return [[...a, randInt(rng, -3, 3)], [...scale(a, k), k * 9 + 1]]; }
  let b: number[];
  do { b = [randInt(rng, -3, 3), randInt(rng, -3, 3), randInt(rng, -3, 3)]; } while (len(cross(a, b)) < 1e-9);
  return [[...a, randInt(rng, -4, 4)], [...b, randInt(rng, -4, 4)]];
}

/**
 * Doubt 2 (true): "If the column arrows can reach the right-hand side, the planes meet."
 * The scene: a system and weights w on its columns. If the weighted columns reach b, the point w is on every line.
 */
export function d2Holds(rows: Aug, w: number[], tol = 1e-6): boolean {
  const n = rows[0].length - 1;
  const tip = rows.map((r) => dot(r.slice(0, n), w));
  const reaches = tip.every((v, i) => Math.abs(v - rows[i][n]) <= tol);
  return !reaches || onAll(rows, w, tol);
}
/** A 2-D case with weights that reach b (random), or (edge 0) two parallel columns with b on their line. */
export function d2Random(rng: () => number, edge = -1): { rows: Aug; w: number[] } {
  if (edge === 0) {
    const a = [randNZ(rng, 3), randNZ(rng, 3)], k = randNZ(rng, 2);
    const w = [randInt(rng, -3, 3), randInt(rng, -3, 3)];
    // columns (a₁, a₂) and k(a₁, a₂): rows [a₁, k a₁ | …], [a₂, k a₂ | …]
    const rows: Aug = [[a[0], k * a[0], 0], [a[1], k * a[1], 0]];
    rows.forEach((r) => { r[2] = r[0] * w[0] + r[1] * w[1]; });
    return { rows, w };
  }
  let rows: Aug;
  do { rows = [[randInt(rng, -3, 3), randInt(rng, -3, 3), 0], [randInt(rng, -3, 3), randInt(rng, -3, 3), 0]]; } while (Math.abs(rows[0][0] * rows[1][1] - rows[0][1] * rows[1][0]) < 1);
  const w = [randInt(rng, -3, 3), randInt(rng, -3, 3)];
  rows.forEach((r) => { r[2] = r[0] * w[0] + r[1] * w[1]; });
  return { rows, w };
}
export const D2_START = { rows: [[2, 1, 4], [1, -1, -1]] as Aug, w: [0, 0] };
export const D2_SHOW = { rows: [[2, 1, 4], [1, -1, -1]] as Aug, w: [1, 2] };

// ------------------------------------------------------------------ the Law

/**
 * One case for the Proving Ground: a system whose solutions include two different points p and q,
 * and a test point r. `on` says whether r was built on the line through p and q.
 */
export interface C08Case { rows: Aug; p: number[]; q: number[]; r: number[]; note: string }

const onLine = (c: C08Case) => len(cross(sub(c.r, c.p), sub(c.q, c.p))) <= 1e-6 * Math.max(1, len(sub(c.q, c.p)) * len(sub(c.r, c.p)));
const solves = (c: C08Case) => onAll(c.rows, c.r, 1e-6);
const between = (c: C08Case) => {
  if (!onLine(c)) return false;
  const d = sub(c.q, c.p), t = dot(sub(c.r, c.p), d) / dot(d, d);
  return t >= -1e-9 && t <= 1 + 1e-9;
};
const samePt = (a: number[], b: number[]) => dist(a, b) <= 1e-9;
/** On the plane through the origin, p and q. */
const onOPQ = (c: C08Case) => {
  const nrm = cross(c.p, c.q);
  if (len(nrm) < 1e-9) return onLine(c);
  return Math.abs(dot(nrm, c.r)) <= 1e-6 * len(nrm) * Math.max(1, len(c.r));
};

/** Build a case: a line p0 + t d of solutions, cut out by m planes whose normals are at right angles to d. */
export function lawCase(rng: () => number, kind: 'line' | 'beyond' | 'between' | 'off' | 'opq' | 'random' = 'random', m = randInt(rng, 1, 3)): C08Case {
  let d: number[];
  do { d = [randInt(rng, -2, 2), randInt(rng, -2, 2), randInt(rng, -2, 2)]; } while (len(d) < 1e-9);
  const p0 = [randInt(rng, -3, 3), randInt(rng, -3, 3), randInt(rng, -3, 3)];
  const rows: Aug = [];
  // the first normal is any arrow at a right angle to d; for 2 or 3 rows add a second, different one
  const normals: number[][] = [];
  while (normals.length < Math.min(m, 2)) {
    let u: number[];
    do { u = [randInt(rng, -2, 2), randInt(rng, -2, 2), randInt(rng, -2, 2)]; } while (len(cross(u, d)) < 1e-9);
    const nrm = cross(d, u);
    if (normals.length && len(cross(normals[0], nrm)) < 1e-9) continue;
    normals.push(nrm);
  }
  if (m === 3) normals.push(add(scale(normals[0], randNZ(rng, 2)), scale(normals[1], randNZ(rng, 2))));
  for (const nrm of normals) rows.push([...nrm, dot(nrm, p0)]);
  const t1 = randInt(rng, -2, 0), t2 = t1 + randInt(rng, 1, 3);
  const p = add(p0, scale(d, t1)), q = add(p0, scale(d, t2));
  const pick = kind === 'random' ? (['line', 'beyond', 'between', 'off', 'opq'] as const)[randInt(rng, 0, 4)] : kind;
  let r: number[];
  let note: string;
  if (pick === 'between') { r = add(p, scale(sub(q, p), 0.5)); note = 'the point halfway between them'; }
  else if (pick === 'beyond') { r = add(q, scale(sub(q, p), randInt(rng, 1, 3))); note = 'a point on the line, beyond both'; }
  else if (pick === 'line') { const t = randInt(rng, -6, 6) / 2; r = add(p, scale(sub(q, p), t)); note = 'a point on the line through them'; }
  else if (pick === 'opq') { r = add(scale(p, 2), scale(q, -0.5)); note = 'a point on the flat plane through the origin and both points'; }
  else {
    // off the line: step at a right angle to d
    let e: number[];
    do { e = cross(d, [randInt(rng, -2, 2), randInt(rng, -2, 2), randInt(rng, -2, 2)]); } while (len(e) < 1e-9);
    r = add(add(p0, scale(d, randInt(rng, -2, 2))), e);
    note = 'a point off the line';
  }
  return { rows, p, q, r, note };
}

/** The Law frame: IF two points solve the system THEN [which] solve it. */
export const LAW_C08: Omit<LawDef<C08Case>, 'draw'> = {
  id: 'c08-law',
  frame: ['If two different points both solve a system of linear equations, then ', { slot: 'which' }, ' solves it.'],
  slots: {
    which: {
      options: [
        { id: 'line', text: 'every point on the line through them' },
        { id: 'two', text: 'no point except those two' },
        { id: 'between', text: 'exactly the points between them' },
        { id: 'plane', text: 'every point on the plane through them and the origin' },
      ],
    },
  },
  answer: { which: 'line' },
  cadetSlots: ['which'],
  gen: (rng) => lawCase(rng),
  edgeCases: [],
  holds(f, c) {
    switch (f.which) {
      case 'line': return !onLine(c) || solves(c);
      case 'two': return !solves(c) || samePt(c.r, c.p) || samePt(c.r, c.q);
      case 'between': return between(c) === solves(c);
      case 'plane': return !onOPQ(c) || solves(c);
      default: return false;
    }
  },
  describe: (c) => `the test point is ${c.note}: ${c.r.map((x) => Math.round(x * 100) / 100).join(', ')}`,
  reason: {
    ask: 'Why does every point on the line through two solutions also solve the system?',
    options: [
      { id: 'flat', right: true, text: 'Each plane is flat. A flat plane that holds two points holds the whole line through them. Every plane holds both points, so every plane holds the line.', why: 'Yes. In numbers: each equation reads b at both points, and along the line its reading changes by a fixed amount per step, here b − b = 0.' },
      { id: 'count', right: false, text: 'Three equations always have infinitely many solutions.', why: 'Not always: the pod puzzle had exactly one point, and the prism had none. The line appears only once two solutions exist.' },
      { id: 'two', right: false, text: 'Any two points lie on a line, so there must be more points.', why: 'Two points do lie on a line, but that alone says nothing about the planes. The reason is that each plane is flat: it holds every point of that line.' },
    ],
  },
};
/** Curated edge cases: beyond both points, halfway, off the line, on the origin plane, one plane only. */
export function lawEdges(): C08Case[] {
  const fixed: C08Case[] = [];
  const rows: Aug = [[1, 1, 1, 3], [1, -1, 0, 1]];
  const p = [0, -1, 4], q = [1, 0, 2];
  fixed.push({ rows, p, q, r: [3, 2, -2], note: 'a point on the line, beyond both' });
  fixed.push({ rows, p, q, r: [0.5, -0.5, 3], note: 'the point halfway between them' });
  fixed.push({ rows, p, q, r: [2, 0, 0], note: 'a point off the line' });
  fixed.push({ rows, p, q, r: add(scale(p, 2), scale(q, -0.5)), note: 'a point on the flat plane through the origin and both points' });
  fixed.push({ rows: [[1, 1, 1, 3]], p, q, r: [3, 0, 0], note: 'a point off the line, on the only plane' });
  return fixed;
}
LAW_C08.edgeCases.push(...lawEdges());

/** For tests: is the statement that fills the frame with `which` broken by any of these cases? */
export const lawBroken = (which: string, cases: C08Case[]): C08Case | undefined => cases.find((c) => !LAW_C08.holds({ which }, c));

// ------------------------------------------------------------------ build: check(rows, x)

/** The crew version of check(rows, x). */
export const checkCrew = (rows: Aug, x: number[]): number[] => residuals(rows, x);

export { residuals, kindOf };

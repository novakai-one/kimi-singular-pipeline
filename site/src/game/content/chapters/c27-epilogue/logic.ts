// Epilogue: pure rules (no DOM, no three) for the last setting, Ilse's six questions and the layer.
import { det, eigSym, matMul, inverse, svd, type Mat, type Vec } from '../../../math/la.ts';

export const near = (a: number, b: number, tol = 1e-9): boolean => Math.abs(a - b) <= tol;
export const isIdentity = (M: Mat, tol = 1e-9): boolean => M.every((r, i) => r.every((x, j) => near(x, i === j ? 1 : 0, tol)));

/** P M P⁻¹ (the same move written in another grid). */
export function inGrid(P: Mat, M: Mat): Mat { return matMul(matMul(P, M), inverse(P)!); }

// ------------------------------------------------------------------ Q1 (F) a zero-determinant move can be undone

/** A non-zero start that a singular 2×2 move sends to the origin (null if the move is not singular). */
export function lostStart(M: Mat): Vec | null {
  if (Math.abs(det(M)) > 1e-9) return null;
  const rows = M.filter((r) => Math.hypot(r[0], r[1]) > 1e-12);
  if (!rows.length) return [1, 0];          // the zero move loses everything
  return [rows[0][1], -rows[0][0]];          // at right angles to a non-zero row
}

/** The claim "a determinant-zero move can still be undone" survives a case unless the case is singular. */
export const q1Holds = (M: Mat): boolean => lostStart(M) === null;

// ------------------------------------------------------------------ Q2 (T) symmetric → perpendicular eigenvectors

export function symEigenDirs(a: number, b: number, d: number): { values: number[]; dirs: Vec[] } {
  const e = eigSym([[a, b], [b, d]]);
  return { values: e.values, dirs: e.vectors };
}
export const q2Holds = (a: number, b: number, d: number): boolean => {
  const { dirs } = symEigenDirs(a, b, d);
  return Math.abs(dirs[0][0] * dirs[1][0] + dirs[0][1] * dirs[1][1]) < 1e-6;
};

// ------------------------------------------------------------------ Q3 (T) least squares error ⟂ the column

export function bestFit(a: Vec, b: Vec): { x: number; p: Vec; e: Vec } {
  const aa = a[0] * a[0] + a[1] * a[1];
  const x = aa < 1e-12 ? 0 : (a[0] * b[0] + a[1] * b[1]) / aa;
  const p: Vec = [x * a[0], x * a[1]];
  return { x, p, e: [b[0] - p[0], b[1] - p[1]] };
}
export const q3Holds = (a: Vec, b: Vec): boolean => { const { e } = bestFit(a, b); return Math.abs(a[0] * e[0] + a[1] * e[1]) < 1e-9 * (1 + Math.hypot(...a) * Math.hypot(...b)); };

// ------------------------------------------------------------------ Q4 (T) A v1 ⟂ A v2

export function svdArrows(A: Mat): { v: Vec[]; Av: Vec[]; s: number[] } {
  const { V, S } = svd(A);
  const v: Vec[] = [[V[0][0], V[1][0]], [V[0][1], V[1][1]]];
  const Av = v.map((x) => [A[0][0] * x[0] + A[0][1] * x[1], A[1][0] * x[0] + A[1][1] * x[1]] as Vec);
  return { v, Av, s: S };
}
export const q4Holds = (A: Mat): boolean => { const { Av } = svdArrows(A); return Math.abs(Av[0][0] * Av[1][0] + Av[0][1] * Av[1][1]) < 1e-6; };

// ------------------------------------------------------------------ Q5 (T) a transition matrix has eigenvalue 1

/** Columns sum to 1: from state 1, stay with chance p; from state 2, stay with chance q. */
export const transition = (p: number, q: number): Mat => [[p, 1 - q], [1 - p, q]];
export const q5Holds = (p: number, q: number): boolean => Math.abs(det(transition(p, q).map((r, i) => r.map((x, j) => x - (i === j ? 1 : 0))))) < 1e-9;
/** The steady state (a direction the transition does not move), scaled to sum 1. */
export function steady(p: number, q: number): Vec {
  const s = (1 - q) + (1 - p);
  return s < 1e-12 ? [0.5, 0.5] : [(1 - q) / s, (1 - p) / s];
}

// ------------------------------------------------------------------ Q6 (F) two solutions and no more

/** A line through two points, as n · x = c. */
export function lineThrough(P: Vec, Q: Vec): { n: Vec; c: number } {
  const n: Vec = [Q[1] - P[1], P[0] - Q[0]];
  return { n, c: n[0] * P[0] + n[1] * P[1] };
}

export type Count = 'none' | 'one' | 'many' | 'undefined';

/** How many points solve both equations (each given by two points on its line). */
export function solutions(l1: [Vec, Vec], l2: [Vec, Vec]): { count: Count; point?: Vec; a?: Vec; b?: Vec } {
  const A = lineThrough(...l1), B = lineThrough(...l2);
  if (Math.hypot(...A.n) < 1e-12 || Math.hypot(...B.n) < 1e-12) return { count: 'undefined' };
  const D = A.n[0] * B.n[1] - A.n[1] * B.n[0];
  if (Math.abs(D) > 1e-9) return { count: 'one', point: [(A.c * B.n[1] - A.n[1] * B.c) / D, (A.n[0] * B.c - A.c * B.n[0]) / D] };
  // parallel: the same line exactly when a point of line 2 satisfies line 1
  const on = Math.abs(A.n[0] * l2[0][0] + A.n[1] * l2[0][1] - A.c) < 1e-9 * (1 + Math.hypot(...A.n));
  return on ? { count: 'many', a: l1[0], b: l1[1] } : { count: 'none' };
}

/** "If two different points solve the system, no other point does." Broken exactly when the lines coincide. */
export const q6Holds = (l1: [Vec, Vec], l2: [Vec, Vec]): boolean => solutions(l1, l2).count !== 'many';

// ------------------------------------------------------------------ the layer (AI bridge)

export const W: Mat = [[1, 0], [-1, 0], [0, 1], [0, -1]];
export const relu = (v: number[]): number[] => v.map((x) => Math.max(0, x));
/** The layer's score: the four outputs of W x, clipped at zero (or not), added up. */
export function score(x: Vec, clip: boolean): number {
  const out = W.map((r) => r[0] * x[0] + r[1] * x[1]);
  return (clip ? relu(out) : out).reduce((s, v) => s + v, 0);
}

/** Seeded points: a blob of radius at most 1 and a ring of radius 2 to 3. */
export function layerPoints(seed = 7): { blob: Vec[]; ring: Vec[] } {
  let s = seed >>> 0;
  const r = () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const blob: Vec[] = [], ring: Vec[] = [];
  for (let i = 0; i < 70; i++) { const a = r() * 2 * Math.PI, rad = Math.sqrt(r()) * 0.98; blob.push([rad * Math.cos(a), rad * Math.sin(a)]); }
  for (let i = 0; i < 110; i++) { const a = r() * 2 * Math.PI, rad = 2.02 + r() * 0.96; ring.push([rad * Math.cos(a), rad * Math.sin(a)]); }
  return { blob, ring };
}

/** Does the cut `score > t` put every ring point outside and every blob point inside? */
export function separates(t: number, clip: boolean, pts = layerPoints()): boolean {
  return pts.blob.every((x) => score(x, clip) <= t) && pts.ring.every((x) => score(x, clip) > t);
}

import { rint, type LawCore } from '../../../game/lawcheck.ts';

export type Pair = [number, number];
export interface DotCase { v: Pair; w: Pair }
export const dot = (v: readonly number[], w: readonly number[]) => v[0] * w[0] + v[1] * w[1];
const zero = (v: Pair) => v[0] === 0 && v[1] === 0;
export const p2Won = (answer: number) => Number.isFinite(answer) && Math.abs(answer - 15) <= 0.01 + 1e-12;
export const snapDegrees = (difficulty: string) => difficulty === 'cadet' ? 15 : difficulty === 'navigator' ? 5 : 1;
export function sensorTip(x: number, y: number, step: number): Pair {
  const angle = Math.round(Math.atan2(y, x) * 180 / Math.PI / step) * step * Math.PI / 180;
  return [3 * Math.cos(angle), 3 * Math.sin(angle)];
}
export interface Bands {
  biggest: boolean; perpendicular: boolean;
  maxSince: number | null; zeroSince: number | null; negativeSince: number | null; warned: boolean;
}
export const newBands = (): Bands => ({
  biggest: false, perpendicular: false, maxSince: null, zeroSince: null, negativeSince: null, warned: false,
});
export function holdReading(state: Bands, reading: number, now: number): { won: boolean; bark: boolean } {
  const max = Math.abs(reading - 12) <= 0.05 + 1e-12;
  const perpendicular = Math.abs(reading) <= 0.05 + 1e-12;
  const negative = reading <= -11.95;
  state.maxSince = max ? state.maxSince ?? now : null;
  state.zeroSince = perpendicular ? state.zeroSince ?? now : null;
  state.negativeSince = negative ? state.negativeSince ?? now : null;
  if (!negative) state.warned = false;
  if (state.maxSince !== null && now - state.maxSince >= 1000) state.biggest = true;
  if (state.zeroSince !== null && now - state.zeroSince >= 1000) state.perpendicular = true;
  const bark = !state.warned && state.negativeSince !== null && now - state.negativeSince >= 1000;
  if (bark) state.warned = true;
  return { won: state.biggest && state.perpendicular, bark };
}
export const doubtHolds = (v: Pair, w: Pair) => dot(v, w) !== 0 || zero(v) || zero(w);
const fmt = (v: Pair) => `(${v[0].toFixed(2)}, ${v[1].toFixed(2)})`;
export const describeCase = (c: DotCase) => `${fmt(c.v)}·${fmt(c.w)} = ${dot(c.v, c.w).toFixed(2)}`;
export const lawCore: LawCore<DotCase> & { answer: Record<string, string> } = {
  id: 'd01-dot-law', answer: { cond: 'perp' },
  gen: (r) => ({ v: [rint(r, -4, 4), rint(r, -4, 4)], w: [rint(r, -4, 4), rint(r, -4, 4)] }),
  edgeCases: [{ v: [0, 0], w: [1, 2] }, { v: [3, 4], w: [-4, 3] }],
  holds(f, c) {
    const isZero = zero(c.v) || zero(c.w);
    const cross = c.v[0] * c.w[1] - c.v[1] * c.w[0];
    const condition = f.cond === 'perp' ? dot(c.v, c.w) === 0
      : f.cond === 'parallel' ? cross === 0
      : f.cond === 'opposite' ? cross === 0 && dot(c.v, c.w) < 0
      : f.cond === 'equal' ? Math.hypot(...c.v) === Math.hypot(...c.w) : false;
    return (dot(c.v, c.w) === 0) === (condition || isZero);
  },
  describe: describeCase,
};
export const buildCases = (r: () => number) => Array.from({ length: 200 }, () => {
  const v: Pair = [rint(r, -9, 9), rint(r, -9, 9)];
  const w: Pair = [rint(r, -9, 9), rint(r, -9, 9)];
  return { name: 'dot', args: [v, w], expect: dot(v, w), tol: 1e-9 };
});
export function mismatch(template: string, args: unknown[], result: string, expected: string): string {
  const values: Record<string, string> = { a: JSON.stringify(args[0]), b: JSON.stringify(args[1]), r: expected, y: result };
  return template.replace(/\{([abry])\}/g, (_, key: string) => values[key]);
}

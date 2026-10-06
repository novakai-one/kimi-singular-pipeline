// Chapter 1 pure logic (no DOM, no three): win checks, doubt predicates, the Law core. Unit-tested.
import { rint, type LawCore } from '../../../game/lawcheck.ts';

const fmt = (v: number[]) => `(${v[0]}, ${v[1]})`;

/** p1: whole pulses a of v = (2, 1) and b of w = (1, 2) reach (7, 8). */
export const p1Won = (a: number, b: number) => 2 * a + b === 7 && a + 2 * b === 8;

/** (F) "East then north lands somewhere different from north then east." */
export const ordersDiffer = (a: number[], b: number[]) => Math.hypot(a[0] + b[0] - (b[0] + a[0]), a[1] + b[1] - (b[1] + a[1])) > 1e-9;

/** (T) "A negative amount flips the arrow but keeps it on the same line." (Vacuous for k ≥ 0.) */
export const negFlipHolds = (v: number[], k: number) => {
  if (k >= 0) return true;
  const kv = [k * v[0], k * v[1]];
  return Math.abs(v[0] * kv[1] - v[1] * kv[0]) < 1e-9 && v[0] * kv[0] + v[1] * kv[1] <= 0;
};

export interface OrderCase { v: number[]; w: number[] }
const parallel = (c: OrderCase) => Math.abs(c.v[0] * c.w[1] - c.v[1] * c.w[0]) < 1e-9;

/** The Law: "Doing v then w lands [same/different] doing w then v, [always / exactly when …]." */
export const lawCore: LawCore<OrderCase> & { answer: Record<string, string> } = {
  id: 'c01-law',
  answer: { where: 'same', when: 'always' },
  gen: (r) => ({ v: [rint(r, -6, 6), rint(r, -6, 6)], w: [rint(r, -6, 6), rint(r, -6, 6)] }),
  edgeCases: [{ v: [0, 0], w: [2, 1] }, { v: [2, 1], w: [4, 2] }, { v: [3, -1], w: [-3, 1] }, { v: [5, 4], w: [3, 6] }, { v: [1, 1], w: [1, 2] }],
  holds(f, c) {
    const same = !ordersDiffer(c.v, c.w);
    const lands = f.where === 'same' ? same : !same;
    const cond = f.when === 'always' ? true
      : f.when === 'parallel' ? parallel(c)
      : f.when === 'positive' ? [...c.v, ...c.w].every((x) => x > 0)
      : Math.hypot(c.v[0], c.v[1]) < 3 && Math.hypot(c.w[0], c.w[1]) < 3;
    return f.when === 'always' ? lands : lands === cond;
  },
  describe: (c) => `v = ${fmt(c.v)}, w = ${fmt(c.w)}: both orders end at ${fmt([c.v[0] + c.w[0], c.v[1] + c.w[1]])}`,
};

// Chapter 1: puzzle numbers, doubt predicates and the Law.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { p1Won, ordersDiffer, negFlipHolds, lawCore } from '../../site/src/game/content/chapters/c01-vectors/logic.ts';
import { checkLaw } from '../../site/src/game/game/lawcheck.ts';
import { norm, vsub, vadd, vscale } from '../../site/src/game/math/la.ts';

test('p1: 2 of (2, 1) and 3 of (1, 2) reach (7, 8); the swapped counts do not', () => {
  assert.ok(p1Won(2, 3));
  assert.ok(!p1Won(3, 2));
  let n = 0;
  for (let a = 0; a <= 6; a++) for (let b = 0; b <= 6; b++) if (p1Won(a, b)) n++;
  assert.equal(n, 1, 'exactly one answer in whole pulses');
});

test('p2, p3, p4, p5, p6 numbers', () => {
  assert.deepEqual(vadd([4, -1], [-1, 3]), [3, 2]);
  assert.deepEqual(vscale([2, 1], 3), [6, 3]);
  assert.deepEqual(vscale([2, 1], -2), [-4, -2]);
  const PQ = vsub([6, 1], [1, 4]);
  assert.deepEqual(PQ, [5, -3]);
  assert.ok(Math.abs(norm(PQ) - Math.sqrt(34)) < 1e-12);
  assert.deepEqual(vadd([1, 4], vscale(PQ, 0.5)), [3.5, 2.5]);
  assert.deepEqual(vadd([1, 4], vscale(PQ, 0.25)), [2.25, 3.25]);
  const knocks = [[2, 5], [-3, 1], [4, -2]].reduce((s, v) => vadd(s, v), [0, 0]);
  assert.deepEqual(knocks, [3, 4]);
  assert.equal(norm([-3, -4]), 5);
  assert.equal(norm([2, 3, 6]), 7);
});

test('doubts: the order claim is false for every case; the flip claim holds for every case', () => {
  for (const [a, b] of [[[3, 0], [0, 2]], [[4, -1], [-1, 3]], [[0, 0], [1, 1]]]) assert.equal(ordersDiffer(a, b), false);
  for (const v of [[2, 1], [0, 3], [-4, 2], [0, 0]]) for (const k of [-3, -1, -0.5, 0, 2]) assert.ok(negFlipHolds(v, k));
});

test('Law: the target survives 500 cases; every near-miss is broken', () => {
  assert.equal(checkLaw(lawCore, lawCore.answer).survived, true);
  for (const where of ['same', 'diff']) for (const when of ['always', 'parallel', 'positive', 'short']) {
    if (where === 'same' && when === 'always') continue;
    const r = checkLaw(lawCore, { where, when });
    assert.equal(r.survived, false, `${where}/${when} should break`);
  }
});

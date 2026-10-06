import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as L from '../../site/src/game/content/chapters/c27-epilogue/logic.ts';
import { P, FINAL } from '../../site/src/game/content/truth.ts';
import { rng } from '../../site/src/game/game/lawcheck.ts';

test('the final setting is the identity, and it reads the same in the Anchor grid', () => {
  assert.ok(L.isIdentity(FINAL));
  assert.ok(L.isIdentity(L.inGrid(P, FINAL)));
  assert.ok(!L.isIdentity(L.inGrid(P, [[0, -1, 0], [1, 0, 0], [0, 0, 1]])));
});

test('Q1 (false): every singular move loses a start; invertible moves are not counterexamples', () => {
  assert.equal(L.q1Holds([[1, 2], [2, 4]]), false);
  const n = L.lostStart([[1, 2], [2, 4]])!;
  assert.ok(Math.abs(1 * n[0] + 2 * n[1]) < 1e-12 && Math.abs(2 * n[0] + 4 * n[1]) < 1e-12 && Math.hypot(...n) > 0);
  assert.equal(L.q1Holds([[0, 0], [0, 0]]), false);
  assert.equal(L.q1Holds([[2, 1], [1, 1]]), true);
});

test('Q2–Q5 (true) hold on 500 seeded cases and their edge cases', () => {
  const r = rng(27);
  const ri = (lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1));
  for (let i = 0; i < 500; i++) {
    assert.ok(L.q2Holds(ri(-4, 4), ri(-4, 4), ri(-4, 4)));
    assert.ok(L.q3Holds([ri(-4, 4) || 1, ri(-4, 4)], [ri(-4, 4), ri(-4, 4)]));
    assert.ok(L.q4Holds([[ri(-4, 4), ri(-4, 4)], [ri(-4, 4), ri(-4, 4)]]));
    assert.ok(L.q5Holds(ri(0, 10) / 10, ri(0, 10) / 10));
  }
  assert.ok(L.q2Holds(2, 0, 2));          // repeated eigenvalue
  assert.ok(L.q5Holds(1, 1) && L.q5Holds(0, 0));
  const s = L.steady(0.9, 0.6);
  const T = L.transition(0.9, 0.6);
  assert.ok(Math.abs(T[0][0] * s[0] + T[0][1] * s[1] - s[0]) < 1e-12);
});

test('Q6 (false): only coinciding lines break it, and then there are many solutions', () => {
  assert.equal(L.solutions([[0, 2], [2, 0]], [[0, 0], [1, 1]]).count, 'one');
  assert.equal(L.solutions([[0, 2], [2, 0]], [[0, 3], [3, 0]]).count, 'none');
  assert.equal(L.solutions([[0, 2], [2, 0]], [[1, 1], [3, -1]]).count, 'many');
  assert.equal(L.q6Holds([[0, 2], [2, 0]], [[1, 1], [3, -1]]), false);
  assert.equal(L.q6Holds([[0, 2], [2, 0]], [[0, 0], [1, 1]]), true);
  const p = L.solutions([[0, 2], [2, 0]], [[0, 0], [1, 1]]).point!;
  assert.ok(Math.abs(p[0] - 1) < 1e-12 && Math.abs(p[1] - 1) < 1e-12);
});

test('the layer: without the clip every score is 0; with it, a cut at 1.7 separates blob from ring', () => {
  const pts = L.layerPoints();
  assert.ok(pts.blob.every((x) => Math.abs(L.score(x, false)) < 1e-12));
  assert.ok(L.separates(1.7, true, pts));
  assert.ok(!L.separates(1.7, false, pts));
  assert.ok(!L.separates(1.2, true, pts) && !L.separates(2.6, true, pts));
  assert.ok(Math.max(...pts.blob.map((x) => L.score(x, true))) <= Math.SQRT2);
  assert.ok(Math.min(...pts.ring.map((x) => L.score(x, true))) >= 2);
});

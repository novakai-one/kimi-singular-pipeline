// Field 2 (classic-ml): the k challenge can be won, Show me lands on the best k,
// and every claim in the field text that depends on this data is true.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BEST_KS, DOMAIN, GRID, KS, SCORES, TEST, TRAIN, gridPredictions, patches, predict, scoreFor, votes, type Pt,
} from '../../site/src/pages/fieldviz/knn-core.ts';

test('knn: data is 80 training and 40 test points, half of each colour, all inside the plot', () => {
  assert.equal(TRAIN.length, 80);
  assert.equal(TEST.length, 40);
  assert.equal(TRAIN.filter((p) => p.label === 0).length, 40);
  assert.equal(TEST.filter((p) => p.label === 0).length, 20);
  for (const p of [...TRAIN, ...TEST]) {
    assert.ok(p.x > DOMAIN.x0 && p.x < DOMAIN.x1 && p.y > DOMAIN.y0 && p.y < DOMAIN.y1, 'point inside the plot');
  }
  // square cells, so distances on screen match distances in the data
  assert.ok(Math.abs((DOMAIN.x1 - DOMAIN.x0) / GRID.cols - (DOMAIN.y1 - DOMAIN.y0) / GRID.rows) < 1e-9);
});

test('knn: scores match the text (k = 1 perfect on training, worse on test; a middle k wins)', () => {
  for (const s of SCORES) console.log(`  k = ${s.k}: training ${s.trainPct}% (${s.train}/80), test ${s.testPct}% (${s.test}/40)`);
  const one = scoreFor(1);
  // prediction prompt: "That scores 100% on the training points."
  assert.equal(one.train, TRAIN.length);
  assert.equal(one.trainPct, 100);
  // reveal: "A middle value of k scores better on the held-back test points."
  assert.ok(BEST_KS.length >= 1);
  for (const k of BEST_KS) assert.ok([5, 9, 15].includes(k), `best k ${k} is a middle value`);
  const best = scoreFor(BEST_KS[0]);
  assert.ok(best.test > one.test, 'best k beats k = 1 on test points');
  assert.ok(best.testPct - one.testPct >= 5, `k = 1 is clearly lower on test (${one.testPct}% vs ${best.testPct}%)`);
  // large k averages too much: k = 31 is worse than the best k on both training and test points
  const big = scoreFor(31);
  assert.ok(big.test < best.test, 'k = 31 scores lower on test points than the best k');
  assert.ok(big.train < best.train, 'k = 31 also misses more training points (underfitting)');
  // the on-screen percentages never show two different counts as the same number
  for (const a of SCORES) for (const b of SCORES) {
    if (a.testPct === b.testPct) assert.equal(a.test, b.test);
    if (a.trainPct === b.trainPct) assert.equal(a.train, b.train);
  }
});

test('knn: shading claims ("patchy with islands" at k = 1, smooth at large k)', () => {
  const counts = KS.map((k) => patches(gridPredictions(k)));
  console.log(`  separate shaded patches per k: ${KS.map((k, i) => `k=${k}: ${counts[i]}`).join(', ')}`);
  const at = (k: number) => counts[KS.indexOf(k)];
  assert.ok(at(1) > 2, 'k = 1 has islands (more than the two main regions)');
  assert.equal(at(BEST_KS[0]), 2, 'the best k shows two clean regions');
  assert.equal(at(31), 2, 'k = 31 is smooth');
  // "it starts to ignore real bends": k = 31 gives some orange training points the blue colour at the moon tips
  const big = gridPredictions(31), mid = gridPredictions(BEST_KS[0]);
  let differ = 0;
  for (let i = 0; i < big.length; i++) if (big[i] !== mid[i]) differ++;
  assert.ok(differ > 20, `k = 31 shading differs from the best k in ${differ} cells`);
});

test('knn: the challenge is winnable and Show me ends on a winning k', () => {
  // the learner wins by choosing any k in BEST_KS; Show me steps through KS and settles on BEST_KS[0]
  const demoEnd = BEST_KS[0];
  assert.ok(KS.includes(demoEnd));
  const bestTest = Math.max(...SCORES.map((s) => s.test));
  assert.equal(scoreFor(demoEnd).test, bestTest);
  console.log(`  win: k in [${BEST_KS.join(', ')}]; Show me ends on k = ${demoEnd}`);
});

test('knn: the by-hand problem in the field text', () => {
  // A(1,1) red, B(2,1) red, E(3,3) blue, C(4,4) blue, D(5,4) blue; P(2,2). Label 0 = red here, 1 = blue.
  const pts: Pt[] = [
    { x: 1, y: 1, label: 0 }, { x: 2, y: 1, label: 0 }, { x: 3, y: 3, label: 1 }, { x: 4, y: 4, label: 1 }, { x: 5, y: 4, label: 1 },
  ];
  const d = pts.map((p) => Math.hypot(p.x - 2, p.y - 2).toFixed(2));
  assert.deepEqual(d, ['1.41', '1.00', '1.41', '2.83', '3.61']);
  assert.equal(predict(pts, 2, 2, 1), 0, 'closest one: red');
  assert.deepEqual(votes(pts, 2, 2, 3), [2, 1], 'closest three: two red, one blue');
  assert.equal(predict(pts, 2, 2, 5), 1, 'all five: blue');
});

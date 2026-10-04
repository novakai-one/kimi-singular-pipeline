// Field 5 (computer vision): the edge-detector challenge can be won, Show me wins,
// and every number or claim in the field text that depends on the convolution is true.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  convolve, convolveRow, edgeScores, IMAGE, isWin, nextCell, patch, SHOW_ME_FILTER, SHOW_ME_ORDER, SIZE,
  SQ_HI, SQ_LO, workedSum, ZERO_FILTER,
} from '../../site/src/pages/fieldviz/conv-core.ts';

const at = (out: number[], i: number, j: number) => out[i * SIZE + j];
const ALL_ONES = [1, 1, 1, 1, 1, 1, 1, 1, 1];

test('conv: the input is a 16 x 16 dark image with a light square on rows/cols 4 to 11', () => {
  assert.equal(IMAGE.length, 256);
  assert.equal(IMAGE.filter((v) => v === 1).length, 64);
  assert.equal(at(IMAGE, 4, 4), 1);
  assert.equal(at(IMAGE, 11, 11), 1);
  assert.equal(at(IMAGE, 3, 4), 0);
  assert.equal(at(IMAGE, 4, 12), 0);
});

test('conv: clicks cycle 0 → +1 → −1 → 0, and the filter starts at all zeros', () => {
  assert.equal(nextCell(0), 1);
  assert.equal(nextCell(1), -1);
  assert.equal(nextCell(-1), 0);
  assert.deepEqual(ZERO_FILTER, [0, 0, 0, 0, 0, 0, 0, 0, 0]);
  assert.equal(isWin(edgeScores(convolve(IMAGE, ZERO_FILTER))), false, 'the starting filter does not win');
});

test('conv: Show me fills −1 0 +1 in every row, cell by cell, and that filter wins', () => {
  const f = ZERO_FILTER.slice();
  for (const k of SHOW_ME_ORDER) f[k] = SHOW_ME_FILTER[k];
  assert.deepEqual(f, [-1, 0, 1, -1, 0, 1, -1, 0, 1]);
  const s = edgeScores(convolve(IMAGE, f));
  console.log(`  Show me filter: left/right ${s.vertical.toFixed(1)}, top/bottom ${s.horizontal.toFixed(1)}`);
  assert.equal(s.vertical, 3);
  assert.equal(s.horizontal, 0);
  assert.ok(isWin(s));
});

test('conv: a student can win by clicking cells (and a forward-difference filter also counts)', () => {
  const f = ZERO_FILTER.slice();
  const click = (k: number, times: number) => { for (let t = 0; t < times; t++) f[k] = nextCell(f[k]); };
  for (const r of [0, 1, 2]) { click(r * 3, 2); click(r * 3 + 2, 1); }   // −1 needs two clicks, +1 one
  assert.ok(isWin(edgeScores(convolve(IMAGE, f))));
  // −1 +1 0 in every row: one bright column at each vertical edge. Still a vertical edge detector.
  const fwd = [-1, 1, 0, -1, 1, 0, -1, 1, 0];
  const s = edgeScores(convolve(IMAGE, fwd));
  assert.equal(s.vertical, 3);
  assert.ok(isWin(s));
});

test('conv: wrong filters do not win (copy, blur, horizontal edges, a single row)', () => {
  const lose = (f: number[]) => assert.equal(isWin(edgeScores(convolve(IMAGE, f))), false, f.join(' '));
  lose([0, 0, 0, 0, 1, 0, 0, 0, 0]);       // copy
  lose(ALL_ONES);                          // blur
  lose([-1, -1, -1, 0, 0, 0, 1, 1, 1]);    // finds top/bottom edges instead
  lose([-1, 0, 1, 0, 0, 0, 0, 0, 0]);      // too faint: 1 per edge pixel
  // Transposed filter lights the top and bottom edges, not left and right.
  const s = edgeScores(convolve(IMAGE, [-1, -1, -1, 0, 0, 0, 1, 1, 1]));
  assert.equal(s.horizontal, 3);
  assert.equal(s.vertical, 0);
});

test('conv: prediction reveal — all +1 gives a blurred copy; no all-positive filter finds edges', () => {
  const out = convolve(IMAGE, ALL_ONES);
  // Each output pixel is the sum of its 3 x 3 patch.
  for (let i = 0; i < SIZE; i++) for (let j = 0; j < SIZE; j++) {
    assert.equal(at(out, i, j), patch(IMAGE, ALL_ONES, i, j).reduce((s, t) => s + t.x, 0));
  }
  const mid = 7;
  // The input jumps 0 → 1 in one pixel. The output climbs 0 → 3 → 6 → 9 over three: the edge spreads out.
  assert.deepEqual([2, 3, 4, 5, 6].map((j) => at(IMAGE, mid, j)), [0, 0, 1, 1, 1]);
  assert.deepEqual([2, 3, 4, 5, 6].map((j) => at(out, mid, j)), [0, 3, 6, 9, 9]);
  // A copy: bright exactly where the square is, dark far from it.
  assert.equal(at(out, 7, 7), 9);
  assert.equal(at(out, 0, 0), 0);
  for (let i = SQ_LO; i <= SQ_HI; i++) for (let j = SQ_LO; j <= SQ_HI; j++) assert.ok(at(out, i, j) >= 4);
  // "To find an edge, a filter needs negative cells too": no filter of only 0s and +1s wins.
  for (let code = 0; code < 512; code++) {
    const f = [...Array(9)].map((_, k) => (code >> k) & 1);
    assert.equal(isWin(edgeScores(convolve(IMAGE, f))), false, f.join(' '));
  }
});

test('conv: "What it means" — flat patches cancel to 0; both edges light up with opposite signs', () => {
  const out = convolve(IMAGE, SHOW_ME_FILTER);
  assert.equal(at(out, 7, 7), 0, 'inside the square (flat light)');
  assert.equal(at(out, 7, 0), 0, 'background (flat dark)');
  assert.equal(at(out, 7, SQ_LO - 1), 3, 'left edge: dark on the left, light on the right');
  assert.equal(at(out, 7, SQ_HI + 1), -3, 'right edge has the opposite sign, so brightness uses the size');
});

test('conv: the worked sum next to the picture matches the output pixel', () => {
  const w = workedSum(IMAGE, SHOW_ME_FILTER, 7, 3);
  assert.deepEqual(w.lines, ['(−1×0) + (0×0) + (+1×1)', '(−1×0) + (0×0) + (+1×1)', '(−1×0) + (0×0) + (+1×1)']);
  assert.equal(w.total, 3);
  assert.equal(w.total, at(convolve(IMAGE, SHOW_ME_FILTER), 7, 3));
  // Zero padding at the corner: pixels outside the image count as 0.
  assert.deepEqual(patch(IMAGE, ALL_ONES, 0, 0).map((t) => t.x), [0, 0, 0, 0, 0, 0, 0, 0, 0]);
});

test('conv: practice — row 0 0 0 1 1 1 with filter −1 0 +1 gives 0 1 1 0', () => {
  assert.deepEqual(convolveRow([0, 0, 0, 1, 1, 1], [-1, 0, 1]), [0, 1, 1, 0]);
});

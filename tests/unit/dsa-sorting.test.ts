// DSA 5 (sorting and binary search): frames end sorted, the challenge numbers in dsa.ts are true,
// and the practice answers match the algorithms.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { binarySearchFrames, mergeSortFrames, parseInput, quickSortFrames, quickWorst } from '../../site/src/pages/dsa/viz/sorting-core.ts';

const last = <T>(a: T[]) => a[a.length - 1];
const sorted = (a: number[]) => a.slice().sort((x, y) => x - y);
function shuffle(a: number[], seed: number) {
  const r = a.slice();
  let s = seed;
  for (let i = r.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) % 2147483648;
    const j = s % (i + 1);
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

test('sorting: both sorts end with the list sorted', () => {
  for (let seed = 1; seed < 200; seed++) {
    const a = shuffle([5, 12, 23, 38, 41, 56, 67, 71, 90, 3, 3], seed).slice(0, 2 + (seed % 10));
    assert.deepEqual(last(mergeSortFrames(a)).arr, sorted(a));
    assert.deepEqual(last(quickSortFrames(a)).arr, sorted(a));
  }
});

test('sorting: challenge — first-pivot quicksort on sorted 9 numbers needs 36 comparisons', () => {
  assert.equal(quickWorst(9), 36);
  assert.equal(last(quickSortFrames([1, 2, 3, 4, 5, 6, 7, 8, 9])).comps, 36);
  assert.equal(last(quickSortFrames([9, 8, 7, 6, 5, 4, 3, 2, 1])).comps, 36);
  // the default input is not a worst case, so the challenge is not won by doing nothing
  assert.ok(last(quickSortFrames(parseInput('38 12 71 5 56 23 90 41 67').nums)).comps < 36);
  // a non-sorted worst case exists (pivot always the min or max of its part)
  assert.equal(last(quickSortFrames([9, 1, 2, 3, 4, 5, 6, 7, 8])).comps, 36);
});

test('sorting: "merge sort never needs more than 21 for 9 numbers"', () => {
  // all 9! orders would be slow; the worst case is reached by some order, so check many and the bound
  let max = 0;
  for (let seed = 1; seed < 4000; seed++) max = Math.max(max, last(mergeSortFrames(shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9], seed))).comps);
  assert.ok(max <= 21, `max ${max}`);
  assert.equal(max, 21, 'some order reaches 21');
});

test('sorting: practice — merging [2, 5, 9] and [1, 6, 7] takes 5 comparisons', () => {
  // the last merge of mergesort on [2, 5, 9, 1, 6, 7] is exactly that merge
  const frames = mergeSortFrames([2, 5, 9, 1, 6, 7]);
  const before = frames.findIndex((f) => f.buffer && f.range?.[0] === 0 && f.range?.[1] === 5);
  const total = last(frames).comps;
  assert.equal(total - frames[before].comps + 1, 5);
});

test('binary search: at most 10 checks for 1,000 items; finds and misses correctly', () => {
  const big = Array.from({ length: 12 }, (_, i) => i * 7 + 1);
  for (const t of [...big, 0, 50, 99]) {
    const fr = binarySearchFrames(big, t);
    const f = last(fr) as { found?: number; comps: number };
    if (big.includes(t)) assert.equal(big[f.found!], t);
    else assert.equal(f.found, -1);
    assert.ok(f.comps <= Math.ceil(Math.log2(big.length + 1)));
  }
  assert.ok(2 ** 10 >= 1000 && 2 ** 9 < 1000);
});

test('sorting: input checks', () => {
  assert.throws(() => parseInput('5'), /at least/);
  assert.throws(() => parseInput('1 2 3 4 5 6 7 8 9 10 11 12 13'), /at most/);
  assert.throws(() => parseInput('5 x 7'), /whole numbers/);
  assert.throws(() => parseInput('5 100'), /1 to 99/);
  assert.deepEqual(parseInput('5, 2 9; 9'), { nums: [5, 2, 9], target: 9 });
});

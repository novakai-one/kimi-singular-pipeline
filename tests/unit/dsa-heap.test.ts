// DSA 7 (heaps): the heap stays a heap after every operation, the challenge is reachable (and Show me reaches it),
// the default input does not, and every number in the heaps entry of dsa.ts is true.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  GOAL_SWAPS, MAX_SIZE, bestInsert, childrenOf, heapFrames, isHeap, levelsFor, parentOf, parseOps, pop, push, randomOps,
  type HeapFrame,
} from '../../site/src/pages/dsa/viz/heap-core.ts';

const DEFAULT = '5 3 8 1 x 6 2';
const SHOW_ME = '10 20 30 40 50 60 70 5';
const last = <T>(a: T[]) => a[a.length - 1];
const opEnds = (frames: HeapFrame[]) => frames.filter((f) => f.opEnd);

/** Deterministic random numbers for the property tests. */
function lcg(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}
/** A random valid input: up to 16 operations, never more than MAX_SIZE items. */
function randomInput(r: () => number) {
  const tokens: string[] = [];
  let size = 0;
  const n = 1 + Math.floor(r() * 16);
  for (let k = 0; k < n; k++) {
    if (size >= MAX_SIZE || r() < 0.3) { tokens.push('x'); size = Math.max(0, size - 1); }
    else { tokens.push(String(1 + Math.floor(r() * 99))); size++; }
  }
  return tokens.join(' ');
}

test('heap: the heap property holds after every operation, and removals come out smallest first', () => {
  const r = lcg(7);
  for (let t = 0; t < 2000; t++) {
    const input = randomInput(r);
    const ops = parseOps(input);
    const frames = heapFrames(ops);
    const ends = opEnds(frames);
    assert.equal(ends.length, ops.length, input);
    // a plain model: a sorted list
    const model: number[] = [];
    const removed: number[] = [];
    ops.forEach((o, k) => {
      if (o.kind === 'insert') { model.push(o.value); model.sort((a, b) => a - b); }
      else if (model.length) removed.push(model.shift()!);
      const f = ends[k];
      assert.ok(isHeap(f.heap), `not a heap after operation ${k + 1} of "${input}": ${f.heap}`);
      assert.deepEqual(f.heap.slice().sort((a, b) => a - b), model, input);
      if (model.length) assert.equal(f.heap[0], model[0], 'the smallest is at the top');
    });
    assert.deepEqual(last(frames).out, removed, input);
  }
});

test('heap: frames agree with the plain push and pop, and counters are right', () => {
  const r = lcg(11);
  for (let t = 0; t < 500; t++) {
    const ops = parseOps(randomInput(r));
    const frames = heapFrames(ops);
    const ends = opEnds(frames);
    const heap: number[] = [];
    let most = 0;
    ops.forEach((o, k) => {
      const sw = o.kind === 'insert' ? push(heap, o.value) : pop(heap).swaps;
      if (o.kind === 'insert') most = Math.max(most, sw);
      assert.deepEqual(ends[k].heap, heap);
      assert.equal(ends[k].swaps, sw, 'swaps for this operation');
      assert.equal(ends[k].maxInsert, most, 'most swaps in one insertion so far');
    });
    // a swap frame differs from the frame before it in exactly the two linked positions, a parent and its child
    frames.forEach((f, k) => {
      const sw = f.links.filter((l) => l.kind === 'swap');
      if (!sw.length) return;
      const { a, b } = sw[0];
      assert.equal(parentOf(b), a);
      const prev = frames[k - 1].heap;
      assert.deepEqual(f.heap.map((v, i) => (v !== prev[i] ? i : -1)).filter((i) => i >= 0), [a, b]);
      assert.equal(f.heap[a], prev[b]);
      assert.equal(f.heap[b], prev[a]);
    });
  }
});

test('heap: practice 1 — insert 5, 3, 8, 1 gives [5] → [3, 5] → [3, 5, 8] → [1, 3, 8, 5]', () => {
  const ends = opEnds(heapFrames(parseOps('5 3 8 1')));
  assert.deepEqual(ends.map((f) => f.heap), [[5], [3, 5], [3, 5, 8], [1, 3, 8, 5]]);
});

test('heap: practice 2 — children of position 4 are 9 and 10; its parent is 1', () => {
  assert.deepEqual(childrenOf(4), [9, 10]);
  assert.equal(parentOf(4), 1);
  assert.equal(Math.floor(3 / 2), 1);
  for (const c of childrenOf(4)) assert.equal(parentOf(c), 4);
});

test('heap: practice 3 — a min-heap of size 3 keeps the 3 largest of a stream', () => {
  const r = lcg(3);
  const stream = Array.from({ length: 100_000 }, () => Math.floor(r() * 1e9));
  const h: number[] = [];
  for (const v of stream) {
    if (h.length < 3) push(h, v);
    else if (v > h[0]) { pop(h); push(h, v); }
  }
  assert.deepEqual(h.slice().sort((a, b) => b - a), stream.slice().sort((a, b) => b - a).slice(0, 3));
});

test('heap: practice 4 — add everything, then remove the smallest n times: sorted', () => {
  const r = lcg(5);
  const xs = Array.from({ length: 1000 }, () => Math.floor(r() * 1000));
  const h: number[] = [];
  for (const v of xs) push(h, v);
  const out: number[] = [];
  while (h.length) out.push(pop(h).value!);
  assert.deepEqual(out, xs.slice().sort((a, b) => a - b));
});

test('heap: predict — 1,000,000 items make about 20 levels, so one insertion needs at most about 20 swaps', () => {
  const n = 1_000_000;
  assert.equal(levelsFor(n), 20);
  assert.ok(Math.abs(Math.log2(n) - 20) < 0.1);
  // worst case: each new item is the smallest so far, so it climbs all the way to the top
  const h: number[] = [];
  let most = 0;
  for (let k = n; k >= 1; k--) most = Math.max(most, push(h, k));
  assert.equal(h.length, n);
  assert.ok(isHeap(h));
  assert.equal(most, levelsFor(n) - 1, 'the deepest spot is 19 levels below the top');
  assert.ok(most <= 20);
});

test('heap: challenge — Show me reaches 3 swaps in one insertion; the default input does not', () => {
  const show = heapFrames(parseOps(SHOW_ME));
  assert.equal(last(show).maxInsert, GOAL_SWAPS);
  assert.deepEqual(bestInsert(parseOps(SHOW_ME)), { op: 7, value: 5, from: 7, swaps: 3 });
  assert.ok(show.length < 150);
  const def = heapFrames(parseOps(DEFAULT));
  assert.ok(last(def).maxInsert < GOAL_SWAPS, `default reaches ${last(def).maxInsert}`);
  assert.ok(def.length < 150, `default has ${def.length} frames`);
  // with at most 15 items (4 levels), 3 swaps is the most any insertion can need
  assert.equal(levelsFor(MAX_SIZE), 4);
});

test('heap: Random never wins (at most 7 items, 3 levels)', () => {
  const r = lcg(42);
  for (let t = 0; t < 2000; t++) {
    const input = randomOps(r);
    const frames = heapFrames(parseOps(input));
    assert.ok(last(frames).cap <= 7, input);
    assert.ok(last(frames).maxInsert < GOAL_SWAPS, input);
  }
});

test('heap: frame counts stay small for any allowed input', () => {
  // worst case: 15 inserts, each climbing to the top, then a removal
  const worst = Array.from({ length: 15 }, (_, k) => 99 - k).join(' ') + ' x';
  assert.ok(heapFrames(parseOps(worst)).length < 600);
  const r = lcg(9);
  for (let t = 0; t < 500; t++) assert.ok(heapFrames(parseOps(randomInput(r))).length < 600);
});

test('heap: input checks', () => {
  assert.throws(() => parseOps(''), /Type numbers/);
  assert.throws(() => parseOps('5 y 7'), /not a whole number or x/);
  assert.throws(() => parseOps('5 2.5'), /not a whole number or x/);
  assert.throws(() => parseOps('5 100'), /1 to 99/);
  assert.throws(() => parseOps('0'), /1 to 99/);
  assert.throws(() => parseOps(Array.from({ length: 16 }, (_, k) => k + 1).join(' ')), /at most 15 numbers at once/);
  assert.throws(() => parseOps('1 x '.repeat(9)), /at most 16 operations/);
  assert.deepEqual(parseOps('5, 3 X'), [{ kind: 'insert', value: 5 }, { kind: 'insert', value: 3 }, { kind: 'remove' }]);
  // removing from an empty heap is allowed and says so
  const f = heapFrames(parseOps('x 4'));
  assert.match(f[1].note, /empty/);
  assert.deepEqual(last(f).heap, [4]);
});

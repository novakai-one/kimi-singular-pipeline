// DSA 6 (trees and binary search trees): the tree is a valid search tree, the frames match it,
// the challenge is reachable but not won by the default input, and every number in dsa.ts is true.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildTree, geometry, inorder, insertFrames, levelsOf, middleFirst, minLevels, parseInput, rankOf, searchFrames,
  searchPath, smallest, MAX_N, type Tree,
} from '../../site/src/pages/dsa/viz/bst-core.ts';

const last = <T>(a: T[]) => a[a.length - 1];
const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
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
/** Every node: everything in its left part is smaller, everything in its right part is bigger. */
function isSearchTree(t: Tree): boolean {
  const ok = (v: number | null, lo: number, hi: number): boolean => {
    if (v === null) return true;
    if (!(lo < v && v < hi)) return false;
    const n = t.nodes.get(v)!;
    return ok(n.left, lo, v) && ok(n.right, v, hi);
  };
  return ok(t.root, -Infinity, Infinity);
}

const DEFAULT = '8 3 10 1 6 14 4';
const SHOW_ME = '40 20 60 10 30 50 70';
const wins = (text: string) => {
  const f = last(insertFrames(parseInput(text).nums));
  return f.count === 7 && f.height === 3;
};

test('bst: random inputs give a valid search tree whose frames end with every value in it', () => {
  for (let seed = 1; seed < 300; seed++) {
    const nums = shuffle(range(1, 99), seed).slice(0, 1 + (seed % MAX_N));
    if (seed % 5 === 0) nums.push(nums[0]); // a repeat
    const t = buildTree(nums.slice(0, MAX_N));
    assert.ok(isSearchTree(t));
    const fin = last(insertFrames(nums.slice(0, MAX_N)));
    assert.deepEqual(fin.nodes.map((n) => n.v).sort((a, b) => a - b), [...new Set(nums.slice(0, MAX_N))].sort((a, b) => a - b));
    assert.equal(fin.height, levelsOf(t));
    // the frames count one comparison per node visited on the way down
    const expected = nums.slice(0, MAX_N).reduce((sum, v, k) => {
      const before = buildTree(nums.slice(0, k));
      return sum + (before.root === null ? 0 : searchPath(before, v).path.length);
    }, 0);
    assert.equal(fin.comps, expected);
  }
});

test('bst: search finds every value in the tree and misses every other value', () => {
  const nums = [50, 27, 81, 12, 39, 66, 93, 5, 33];
  const t = buildTree(nums);
  for (let v = 0; v <= 100; v++) {
    const fr = searchFrames(nums, v);
    const f = last(fr);
    const { path, found } = searchPath(t, v);
    assert.equal(found, nums.includes(v));
    assert.equal(f.comps, path.length);
    assert.equal(f.line, found ? 2 : 5);
    if (!found) assert.equal(f.spot!.parent, last(path));
    assert.ok(path.length <= levelsOf(t));
  }
});

test('bst: predict — inserting 1..7 in order makes a chain of 7 levels', () => {
  const t = buildTree(range(1, 7));
  assert.equal(levelsOf(t), 7);
  for (let v = 1; v <= 6; v++) {
    assert.equal(t.nodes.get(v)!.right, v + 1); // each value goes right
    assert.equal(t.nodes.get(v)!.left, null);
  }
  // "Searching that chain is as slow as searching a list": finding 7 visits all 7 nodes
  assert.equal(searchPath(t, 7).path.length, 7);
});

test('bst: practice 1 — 8 3 10 1 6 14 4 has 4 levels; a search for 4 visits 8, 3, 6, 4', () => {
  const t = buildTree([8, 3, 10, 1, 6, 14, 4]);
  assert.equal(levelsOf(t), 4);
  assert.deepEqual(searchPath(t, 4), { path: [8, 3, 6, 4], found: true });
  // the Search mode default (no "; n") searches for the last number typed: 4
  const fr = searchFrames([8, 3, 10, 1, 6, 14, 4], null);
  assert.deepEqual(last(fr).path, [8, 3, 6, 4]);
  assert.equal(last(fr).comps, 4);
});

test('bst: practice 2 and 4 — in-order gives increasing order; the smallest value is all the way left', () => {
  for (let seed = 1; seed < 100; seed++) {
    const nums = shuffle(range(1, 99), seed).slice(0, 2 + (seed % 14));
    const t = buildTree(nums);
    assert.deepEqual(inorder(t), nums.slice().sort((a, b) => a - b));
    assert.equal(smallest(t), Math.min(...nums));
  }
});

test('bst: practice 3 — 15 nodes need between 4 and 15 levels', () => {
  const vals = range(1, 15);
  assert.equal(levelsOf(buildTree(middleFirst(vals))), 4);
  assert.equal(levelsOf(buildTree(vals)), 15);
  assert.equal(minLevels(15), 4);
  for (let seed = 1; seed < 500; seed++) {
    const lv = levelsOf(buildTree(shuffle(vals, seed)));
    assert.ok(lv >= 4 && lv <= 15, `levels ${lv}`);
  }
});

test('bst: formula — a full tree with h levels holds 2^h − 1 nodes; n nodes need at least log2(n + 1) levels', () => {
  for (let hgt = 1; hgt <= 4; hgt++) {
    const n = 2 ** hgt - 1;
    const t = buildTree(middleFirst(range(1, n)));
    assert.equal(t.nodes.size, n);
    assert.equal(levelsOf(t), hgt);
    // every level is full: level d holds 2^(d-1) nodes
    for (let d = 0; d < hgt; d++) assert.equal([...t.nodes.values()].filter((x) => x.depth === d).length, 2 ** d);
  }
  for (let n = 1; n <= MAX_N; n++) {
    assert.equal(levelsOf(buildTree(middleFirst(range(1, n)))), minLevels(n), `middle-first reaches the minimum for n=${n}`);
    for (let seed = 1; seed < 60; seed++) assert.ok(levelsOf(buildTree(shuffle(range(1, n), seed))) >= Math.log2(n + 1));
  }
});

test('bst: challenge — Show me wins, the default does not, and the feedback numbers are right', () => {
  assert.ok(wins(SHOW_ME));
  assert.ok(wins('40 60 20 70 50 30 10'), 'another order of the same numbers also works');
  assert.ok(!wins(DEFAULT));
  const d = last(insertFrames(parseInput(DEFAULT).nums));
  assert.equal(d.count, 7);
  assert.equal(d.height, 4); // "7 nodes, 4 levels. A tree with 7 nodes can have as few as 3."
  assert.equal(minLevels(7), 3);
  assert.ok(!wins('1 2 3 4 5 6 7'));
  assert.ok(!wins('40 20 60 10 30 50')); // 6 nodes on 3 levels: not 7 different numbers
  assert.ok(wins('40 20 60 10 30 50 70 40'), 'a repeat is skipped, leaving 7 different numbers');
  // 3 levels for 7 nodes happens for only 80 of the 5,040 orders, so Random rarely wins by accident
  const perms = (a: number[]): number[][] => a.length <= 1 ? [a] : a.flatMap((x, i) => perms([...a.slice(0, i), ...a.slice(i + 1)]).map((p) => [x, ...p]));
  const all = perms(range(1, 7));
  assert.equal(all.length, 5040);
  assert.equal(all.filter((p) => levelsOf(buildTree(p)) === 3).length, 80);
});

test('bst: the waiting values shrink one at a time, in input order', () => {
  const nums = [8, 3, 10, 1, 6, 14, 4];
  const fr = insertFrames(nums);
  assert.deepEqual(fr[0].queue, nums);
  for (const f of fr.slice(1, -1)) assert.deepEqual(f.queue, nums.slice(nums.indexOf(f.value!) + 1));
  assert.deepEqual(last(fr).queue, []);
});

test('bst: repeats are skipped', () => {
  const fr = insertFrames([5, 3, 5, 3]);
  assert.equal(last(fr).count, 2);
  assert.ok(fr.some((f) => f.line === 4 && /already in the tree/.test(f.note)));
  assert.match(last(fr).note, /2 repeats were skipped/);
});

test('bst: frame budget — default under 150 frames, any allowed input under 600', () => {
  assert.ok(insertFrames(parseInput(DEFAULT).nums).length < 150);
  const worst = insertFrames(range(1, MAX_N));
  assert.ok(worst.length < 600, `${worst.length}`);
  assert.ok(searchFrames(range(1, MAX_N), 99).length < 600);
});

test('bst: layout — nodes never overlap and every frame of a run uses the same picture size', () => {
  const inputs = [range(1, 15), range(1, 15).reverse(), middleFirst(range(1, 15)), [8, 3, 10, 1, 6, 14, 4], [50], ...range(1, 40).map((s) => shuffle(range(1, 99), s).slice(0, 15))];
  for (const nums of inputs) {
    for (const fr of [insertFrames(nums), searchFrames(nums, 0), searchFrames(nums, 100), searchFrames(nums, 52)]) {
      const sizes = new Set(fr.map((f) => `${f.order.length}/${f.levels}`));
      assert.equal(sizes.size, 1);
      for (const f of fr) {
        const g = geometry(f.order.length, f.levels);
        const pts = f.nodes.map((n) => [g.x(rankOf(f.order, n.v)), g.y(n.depth)]);
        if (f.spot) pts.push([g.x(rankOf(f.order, f.value!)), g.y(f.spot.depth)]);
        for (const [x, y] of pts) assert.ok(x - g.r >= 40 && x + g.r <= g.W && y + g.r <= g.H, 'inside the picture');
        for (let a = 0; a < pts.length; a++) for (let b = a + 1; b < pts.length; b++) {
          assert.ok(Math.hypot(pts[a][0] - pts[b][0], pts[a][1] - pts[b][1]) >= 2 * g.r + 2, `overlap in ${nums.join(' ')}`);
        }
      }
    }
  }
});

test('bst: input checks', () => {
  assert.throws(() => parseInput(''), /Type the numbers/);
  assert.throws(() => parseInput(range(1, 16).join(' ')), /at most 15/);
  assert.throws(() => parseInput('5 x 7'), /whole numbers/);
  assert.throws(() => parseInput('5 100'), /1 to 99/);
  assert.throws(() => parseInput('5 6; x'), /one whole number/);
  assert.throws(() => parseInput('5; 6; 7'), /one semicolon/);
  assert.deepEqual(parseInput('8, 3 10; 3'), { nums: [8, 3, 10], target: 3 });
  assert.deepEqual(parseInput('8 3 10;'), { nums: [8, 3, 10], target: null });
});

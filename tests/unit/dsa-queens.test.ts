// DSA 4 (recursion and backtracking): the queens frames are a correct row-by-row search, the challenge
// numbers are true, and every number in the topic's dsa.ts text checks out.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  LINE, QUEENS_CODE, attacked, backtracksBySize, firstSolution, judge, parseSize, queensFrames, type QueenFrame,
} from '../../site/src/pages/dsa/viz/queens-core.ts';
import { DSA } from '../../site/src/data/dsa.ts';

const last = <T>(a: T[]) => a[a.length - 1];
const topic = DSA.find((d) => d.slug === 'recursion-backtracking')!;
const DEFAULT_INPUT = '6';
const SHOW_ME = 8;

/** Brute force over one queen per row: every valid board, to check the search against. */
function allSolutions(n: number): number[][] {
  const out: number[][] = [];
  const cols: number[] = [];
  const rec = (r: number) => {
    if (r === n) { out.push(cols.slice()); return; }
    for (let c = 0; c < n; c++) {
      cols.push(c);
      if (!attacked(cols, r, c)) rec(r + 1);
      cols.pop();
    }
  };
  rec(0);
  return out;
}
const valid = (cols: number[]) => cols.every((c, r) => !attacked(cols, r, c));

test('queens: sizes 2 and 3 have no solution; 1 and 4 to 8 have one', () => {
  for (const n of [2, 3]) {
    assert.equal(firstSolution(n).cols, null);
    assert.equal(allSolutions(n).length, 0);
    const end = last(queensFrames(n));
    assert.equal(end.status, 'none');
    assert.match(end.note, /No solution/);
  }
  for (const n of [1, 4, 5, 6, 7, 8]) {
    const sol = firstSolution(n).cols!;
    assert.equal(sol.length, n);
    assert.ok(valid(sol), `size ${n}`);
    const end = last(queensFrames(n));
    assert.equal(end.status, 'solved');
    assert.deepEqual(end.queens, sol);
    // the first solution in left-to-right order is the smallest valid board
    assert.deepEqual(sol, allSolutions(n)[0]);
  }
  // "Every size from 4 upwards has at least one" (checked further than the board allows)
  for (let n = 9; n <= 12; n++) assert.ok(firstSolution(n).cols, `size ${n}`);
});

test('queens: one frame per placement or lift; each queen goes in the first safe square', () => {
  for (let n = 1; n <= 8; n++) {
    const fr = queensFrames(n);
    const { backtracks, placed } = firstSolution(n);
    assert.equal(fr.length, placed + backtracks + 2, `size ${n}`);
    assert.equal(last(fr).backtracks, backtracks);
    assert.equal(last(fr).placed, placed);
    let lastCol = new Map<number, number>();   // last column tried in each row
    for (let k = 1; k < fr.length - 1; k++) {
      const f: QueenFrame = fr[k], prev = fr[k - 1];
      assert.ok(valid(f.queens), 'no two queens attack each other');
      if (f.line === LINE.place) {
        // placement: one more queen, in row f.row, every skipped square to its left was attacked
        assert.equal(f.queens.length, prev.queens.length + 1);
        assert.equal(f.row, f.queens.length - 1);
        const c = f.queens[f.row];
        const from = (lastCol.get(f.row) ?? -1) + 1;
        for (let s = from; s < c; s++) assert.ok(attacked(f.queens, f.row, s), `size ${n} frame ${k}: square ${s} was safe`);
        assert.ok(!attacked(f.queens, f.row, c));
        lastCol.set(f.row, c);
        // a new row starts from column 1
        for (const r of [...lastCol.keys()]) if (r > f.row) lastCol.delete(r);
      } else {
        assert.equal(f.line, LINE.lift);
        assert.equal(f.backtracks, prev.backtracks + 1);
        assert.equal(f.queens.length, prev.queens.length - 1);
        assert.deepEqual(f.lifted, { row: f.row, col: prev.queens[f.row] });
        assert.equal(f.deadRow, f.row + 1);
      }
      // the panel lists one unfinished call per row, top row first
      const calls = f.stack.filter((l) => l.state !== 'ended');
      assert.deepEqual(calls.map((l) => l.row), Array.from({ length: f.row + 1 }, (_, r) => r));
      assert.equal(last(calls).state, 'current');
    }
    lastCol = new Map();
    assert.equal(fr[0].line, LINE.start);
    assert.equal(last(fr).line, last(fr).status === 'solved' ? LINE.base : LINE.none);
  }
  assert.match(QUEENS_CODE[LINE.place], /put a queen/);
  assert.match(QUEENS_CODE[LINE.lift], /lift the queen/);
  assert.match(QUEENS_CODE[LINE.base], /row > n/);
});

test('queens: frame counts stay small (default under 150, any size under 600)', () => {
  assert.ok(queensFrames(parseSize(DEFAULT_INPUT)).length < 150);
  for (let n = 1; n <= 8; n++) assert.ok(queensFrames(n).length < 600, `size ${n}`);
  assert.equal(queensFrames(8).length, 220);
});

test('queens: challenge — size 8 needs the most backtracks from 4 to 8', () => {
  const { counts, best } = backtracksBySize();
  assert.deepEqual([...counts.entries()], [[4, 4], [5, 0], [6, 25], [7, 2], [8, 105]]);
  assert.equal(best, SHOW_ME);
  // the default run alone does not win
  const tried = new Map<number, number>([[6, last(queensFrames(parseSize(DEFAULT_INPUT))).backtracks]]);
  assert.equal(judge(tried).won, false);
  // Show me's size alone does not win either; it needs a second size
  assert.equal(judge(new Map([[8, 105]])).won, false);
  // two sizes without the best one do not win
  assert.equal(judge(new Map([[4, 4], [6, 25], [7, 2], [5, 0]])).won, false);
  // the best size plus any other wins, and the message names the counts
  const w = judge(new Map([[6, 25], [8, 105]]));
  assert.equal(w.won, true);
  assert.match(w.message, /105/);
  assert.match(w.message, /size 6: 25/);
  // sizes outside 4 to 8 do not count
  assert.equal(judge(new Map([[3, 5], [8, 105]])).won, false);
});

test('queens: dsa.ts numbers — about 1.9 million boards, n^n, base case', () => {
  const choose = (n: number, k: number) => { let r = 1; for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i; return r; };
  assert.equal(choose(36, 6), 1_947_792);
  assert.match(topic.problem, /about 1\.9 million ways to place 6 queens on 36 squares/);
  assert.equal(Math.round(choose(36, 6) / 1e5) / 10, 1.9);
  // "One queen per row gives up to n^n boards. Backtracking builds far fewer."
  for (let n = 4; n <= 8; n++) assert.ok(firstSolution(n).placed * 10 < n ** n, `size ${n}`);
  assert.equal(firstSolution(8).placed, 113);
  // predict: 2 × 2 and 3 × 3 have none, every size from 4 has one
  assert.match(topic.predict.reveal, /2 × 2 and a 3 × 3 board have none/);
  assert.equal(topic.viz.goal, 'Find the board size from 4 to 8 whose first solution needs the most backtracks.');
});

test('queens: practice answers', () => {
  // n! = n × (n − 1)!, 0! = 1
  const fact = (n: number): number => (n === 0 ? 1 : n * fact(n - 1));
  assert.equal(fact(0), 1);
  assert.equal(fact(5), 120);

  // every subset of {a, b, c}: 2^3 = 8
  const subsets = (xs: string[]): string[][] => {
    if (!xs.length) return [[]];
    const rest = subsets(xs.slice(1));
    return [...rest, ...rest.map((s) => [xs[0], ...s])];
  };
  const subs = subsets(['a', 'b', 'c']);
  assert.equal(subs.length, 8);
  assert.equal(new Set(subs.map((s) => s.sort().join(''))).size, 8);

  // calls at depth 0 to 9 make two more; depth 10 makes none: 2,047 calls
  const calls = (d: number): number => (d === 10 ? 1 : 1 + 2 * calls(d + 1));
  assert.equal(calls(0), 2047);
  assert.equal(2 ** 11 - 1, 2047);
  assert.match(topic.practice[2].a, /2\{,\}047/);

  // ways to make 5 from coins 1 and 2, order ignored: 3
  const ways = (amount: number, coins: number[]): number => {
    if (amount === 0) return 1;
    if (amount < 0 || !coins.length) return 0;
    return ways(amount - coins[0], coins) + ways(amount, coins.slice(1));
  };
  assert.equal(ways(5, [1, 2]), 3);
  assert.match(topic.practice[3].a, /Three/);
});

test('queens: input checks', () => {
  assert.equal(parseSize(' 6 '), 6);
  assert.throws(() => parseSize(''), /whole number/);
  assert.throws(() => parseSize('six'), /whole number/);
  assert.throws(() => parseSize('4.5'), /whole number/);
  assert.throws(() => parseSize('0'), /1 to 8/);
  assert.throws(() => parseSize('9'), /1 to 8/);
});

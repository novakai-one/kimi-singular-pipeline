// DSA 9 (greedy): biggest-first and the table are correct, the challenge is reachable (and Show me reaches it),
// the default input doesn't win, and every number in the greedy entry of dsa.ts is true.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CHANGE_CODE, MAX_AMOUNT, changeFrames, compareChange, cutToFit, earliestFinish, fewestChange, fewestTable,
  greedyChange, isPredictionExample, mostMeetingsBrute, parseChange, sumText, wholeBest, wholeByRatio,
} from '../../site/src/pages/dsa/viz/greedy-core.ts';

const last = <T>(a: T[]) => a[a.length - 1];
const total = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

/** Fewest coins by trying every way (breadth-first over amounts), independent of the table code. */
function fewestBrute(coins: number[], amount: number): number {
  let level = new Set([0]);
  const seen = new Set([0]);
  for (let k = 0; k <= amount; k++) {
    if (level.has(amount)) return k;
    const next = new Set<number>();
    for (const a of level) for (const c of coins) if (a + c <= amount && !seen.has(a + c)) { seen.add(a + c); next.add(a + c); }
    level = next;
  }
  return -1;
}

function* coinSets(maxCoin: number, size: number, start = 1): Generator<number[]> {
  if (size === 0) { yield []; return; }
  for (let c = start; c <= maxCoin; c++) for (const rest of coinSets(maxCoin, size - 1, c + 1)) yield [c, ...rest];
}

test('greedy: biggest-first takes the largest coin that fits, and reports when it gets stuck', () => {
  assert.deepEqual(greedyChange([1, 5, 10, 25], 30), { stack: [25, 5], left: 0 });
  assert.deepEqual(greedyChange([4, 5], 8), { stack: [5], left: 3 });
  assert.deepEqual(greedyChange([7], 3), { stack: [], left: 3 });
  for (const coins of coinSets(9, 3)) for (let a = 1; a <= 30; a++) {
    const g = greedyChange(coins, a);
    assert.equal(total(g.stack) + g.left, a);
    for (let k = 1; k < g.stack.length; k++) assert.ok(g.stack[k] <= g.stack[k - 1], 'never takes a bigger coin later');
    if (g.left > 0) assert.ok(coins.every((c) => c > g.left), 'stuck only when no coin fits');
  }
});

test('greedy: the table gives the true fewest coins, and the trace back adds up', () => {
  for (const size of [1, 2, 3]) for (const coins of coinSets(12, size)) {
    const { best } = fewestTable(coins, 40);
    for (let a = 0; a <= 40; a++) {
      assert.equal(best[a], fewestBrute(coins, a), `coins ${coins} amount ${a}`);
      const f = fewestChange(coins, a);
      if (best[a] < 0) assert.equal(f, null);
      else { assert.equal(f!.length, best[a]); assert.equal(total(f!), a); assert.ok(f!.every((c) => coins.includes(c))); }
    }
  }
});

test('greedy: "when the two stacks differ, biggest-first was wrong" (the stacks match whenever it was right)', () => {
  for (const size of [1, 2, 3, 4]) for (const coins of coinSets(11, size)) for (let a = 1; a <= 40; a++) {
    const r = compareChange(coins, a);
    const same = !r.stuck && r.fewest !== null && r.greedy.join() === r.fewest.join();
    assert.equal(same, !r.greedyWrong && r.fewest !== null, `coins ${coins} amount ${a}`);
  }
});

test('greedy: the problem — coins 1, 2, 5, 10, 20 and 50 always give the fewest biggest-first', () => {
  // If a coin set has any failing amount, the smallest one is below the sum of the two largest coins (70 here),
  // so checking up to 200 covers every amount.
  const coins = [1, 2, 5, 10, 20, 50];
  const { best } = fewestTable(coins, 200);
  for (let a = 1; a <= 200; a++) assert.equal(greedyChange(coins, a).stack.length, best[a], `amount ${a}`);
});

test('greedy: the prediction — coins 1, 3, 4 and amount 6: biggest-first 3 coins, fewest 2', () => {
  const r = compareChange([1, 3, 4], 6);
  assert.deepEqual(r.greedy, [4, 1, 1]);
  assert.equal(r.greedy.length, 3);
  assert.deepEqual(r.fewest, [3, 3]);
  assert.ok(r.greedyWrong);
  // "taking 4 first rules out the best answer, 3 + 3": after a 4, the 2 left needs 2 more coins
  assert.equal(fewestTable([1, 3, 4], 2).best[2], 2);
});

test('greedy: practice answers in dsa.ts', () => {
  // 1. meetings 1–4, 2–3, 3–5, 6–7: earliest finish picks 2–3, 3–5, 6–7, and 3 is the most possible
  const meetings: [number, number][] = [[1, 4], [2, 3], [3, 5], [6, 7]];
  assert.deepEqual(earliestFinish(meetings), [[2, 3], [3, 5], [6, 7]]);
  assert.equal(mostMeetingsBrute(meetings), 3);
  // 2. coins 1, 5, 10, 25 and 30: 25 + 5, two coins both ways
  const r2 = compareChange([1, 5, 10, 25], 30);
  assert.deepEqual(r2.greedy, [25, 5]);
  assert.equal(r2.fewest!.length, 2);
  assert.ok(!r2.greedyWrong);
  // 3. items you can cut (10 kg): best value per kg first is best; uncut, a heavy high-value item blocks two lighter ones
  const items = [{ kg: 6, value: 30 }, { kg: 5, value: 20 }, { kg: 5, value: 20 }];
  assert.equal(wholeByRatio(items, 10), 30);
  assert.equal(wholeBest(items, 10), 40);
  assert.equal(cutToFit(items, 10), 46);
  // 4. coins 1, 5, 6, 9 and 11: biggest-first 9 + 1 + 1 (three), fewest 5 + 6 (two)
  const r4 = compareChange([1, 5, 6, 9], 11);
  assert.deepEqual(r4.greedy, [9, 1, 1]);
  assert.deepEqual(r4.fewest!.slice().sort((a, b) => a - b), [5, 6]);
  assert.ok(r4.win);
});

test('greedy: earliest finish is never beaten on small meeting sets', () => {
  const all: [number, number][] = [];
  for (let s = 0; s < 6; s++) for (let e = s + 1; e <= 6; e++) all.push([s, e]);
  let checked = 0;
  for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) for (let k = j + 1; k < all.length; k++) {
    const ms = [all[i], all[j], all[k]];
    assert.equal(earliestFinish(ms).length, mostMeetingsBrute(ms));
    checked++;
  }
  assert.ok(checked > 1000);
});

test('greedy: value per kilogram is best when items can be cut', () => {
  // compare with a fine-grained search over how much of each item to take (in tenths of a kg)
  const items = [{ kg: 4, value: 12 }, { kg: 3, value: 12 }, { kg: 5, value: 10 }];
  let bestValue = 0;
  for (let a = 0; a <= 40; a++) for (let b = 0; b <= 30; b++) {
    const c = Math.min(50, 100 - a - b);
    if (c < 0) continue;
    bestValue = Math.max(bestValue, (a / 40) * 12 + (b / 30) * 12 + (c / 50) * 10);
  }
  assert.ok(Math.abs(cutToFit(items, 10) - bestValue) < 1e-9, `${cutToFit(items, 10)} vs ${bestValue}`);
});

test('greedy: challenge — Show me wins, the default and the presets do not', () => {
  // Show me: 1 7 10; 14 → biggest-first 10 + 1 + 1 + 1 + 1 (5 coins), best 7 + 7 (2)
  const show = parseChange('1 7 10; 14');
  const r = compareChange(show.coins, show.amount);
  assert.deepEqual(r.greedy, [10, 1, 1, 1, 1]);
  assert.deepEqual(r.fewest, [7, 7]);
  assert.ok(r.win);
  // the default does not win
  const d = parseChange('1 5 10 25; 30');
  assert.ok(!compareChange(d.coins, d.amount).win);
  for (const p of ['1 3 4; 6', '1 2 5 10 20 50; 48', '3 5; 7']) {
    const q = parseChange(p);
    assert.ok(!compareChange(q.coins, q.amount).win, p);
  }
  // the prediction's example never counts, in any order or with repeats
  for (const p of ['1 3 4; 6', '4 3 1; 6', '3, 1, 4; 6', '1 3 3 4; 6']) {
    const q = parseChange(p);
    assert.ok(isPredictionExample(q.coins, q.amount));
    assert.ok(compareChange(q.coins, q.amount).greedyWrong && !compareChange(q.coins, q.amount).win, p);
  }
  // same coins, another amount does count; getting stuck when an exact answer exists counts
  assert.ok(compareChange([1, 3, 4], 10).win);
  assert.ok(compareChange([4, 5], 8).win);
  assert.ok(!compareChange([3, 5], 7).win, 'stuck, but no exact answer exists either');
});

test('greedy: frames — sizes, lines, and the final picture', () => {
  const def = changeFrames([1, 5, 10, 25], 30);
  assert.ok(def.length <= 150, `default has ${def.length} frames`);
  let maxFrames = 0;
  for (const coins of [[1], [1, 2], [2, 3], [1, 59, 60]]) maxFrames = Math.max(maxFrames, changeFrames(coins, MAX_AMOUNT).length);
  assert.ok(maxFrames <= 600, `largest run has ${maxFrames} frames`);
  for (const [coins, a] of [[[1, 5, 10, 25], 30], [[1, 3, 4], 6], [[4, 5], 8], [[3, 5], 7], [[7], 3]] as [number[], number][]) {
    const fr = changeFrames(coins, a);
    for (const f of fr) {
      assert.ok(f.note.length > 0);
      assert.ok(f.line >= 0 && f.line < CHANGE_CODE.length);
    }
    const end = last(fr);
    const r = compareChange(coins, a);
    assert.deepEqual(end.gStack, r.greedy);
    assert.deepEqual(end.bStack, r.fewest ?? []);
    assert.equal(end.filled, a);
    assert.equal(end.gState, r.stuck ? 'stuck' : 'done');
  }
  // the end note compares the counts
  assert.match(last(changeFrames([1, 7, 10], 14)).note, /5 coins.*2 coins.*3 more/);
  assert.match(last(changeFrames([1, 5, 10, 25], 30)).note, /same \*\*2 coins\*\*/);
  assert.equal(sumText([1, 1, 1, 1, 1, 1, 1, 10]), '10 + 7 × 1');
});

test('greedy: input checks', () => {
  assert.deepEqual(parseChange('1 5 10 25; 30'), { coins: [25, 10, 5, 1], amount: 30 });
  assert.throws(() => parseChange('1 5 10 25'), /semicolon/);
  assert.throws(() => parseChange('; 30'), /at least one coin/);
  assert.throws(() => parseChange('1 x; 30'), /whole numbers/);
  assert.throws(() => parseChange('0 5; 30'), /1 to 100/);
  assert.throws(() => parseChange('1 101; 30'), /1 to 100/);
  assert.throws(() => parseChange('1 2 3 4 5 6 7; 30'), /at most 6/);
  assert.throws(() => parseChange('1 5; 61'), /1 to 60/);
  assert.throws(() => parseChange('1 5; 0'), /1 to 60/);
  assert.throws(() => parseChange('1 5; '), /1 to 60/);
  assert.throws(() => parseChange('1 5; 2.5'), /1 to 60/);
});

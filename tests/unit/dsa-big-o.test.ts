// DSA 1 (Big-O): the three programs are correct, the timer is fair (fake clock and real clock),
// the challenge is reachable with Show me's guess, and every number in the big-o text of dsa.ts is true.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_SIZES, MAX_SIZES, PRESETS, PROGRAMS, TIME_OPTS, everyPair, everyPairSteps, fmtMs, guessResult, halvingSteps,
  makeData, makeFrames, measureAllSync, nestedLoopSteps, noteFor, onePass, onePassSteps, parseSizes,
  patternGuess, randomSizes, ratioAt, sortedCopy, type ProgKey, type Program,
} from '../../site/src/pages/dsa/viz/big-o-core.ts';

const near = (x: number, y: number, tol: number) => Math.abs(x - y) <= tol;

// A fake clock: each program call moves it forward by a cost that depends only on n
// (times slow(), which lets a test make the computer slower as time goes on).
function fakeClock(slow: (t: number) => number = () => 1) {
  let t = 0;
  const now = () => t;
  const programs = (cost: Record<ProgKey, (n: number) => number>): Program[] =>
    PROGRAMS.map((p) => ({ ...p, run: (a: Float64Array) => { t += cost[p.key](a.length) * slow(t); return 0; } }));
  return { now, programs, jump: (ms: number) => { t += ms; } };
}
const COST: Record<ProgKey, (n: number) => number> = {
  one: (n) => 1e-6 * n, sort: (n) => 2e-5 * n * Math.log2(n), pair: (n) => 2e-6 * n * n,
};

test('big-o: the three programs give the right answers', () => {
  const a = makeData(500, 7);
  assert.ok(near(onePass(a), a.reduce((p, q) => p + q, 0), 1e-9));
  const sorted = Array.from(sortedCopy(a));
  assert.deepEqual(sorted, Array.from(a).sort((p, q) => p - q));
  let brute = 0;
  for (let i = 0; i < a.length; i++) for (let j = i + 1; j < a.length; j++) if (Math.abs(a[i] - a[j]) < 0.001) brute++;
  assert.equal(everyPair(a), brute);
  // a small case by hand: 0.1 and 0.1005 are close, 0.5 and 0.5009 are close, nothing else is
  assert.equal(everyPair(new Float64Array([0.1, 0.1005, 0.5, 0.5009, 0.9])), 2);
  // the data is in [0, 1) and repeatable
  assert.ok(a.every((x) => x >= 0 && x < 1));
  assert.deepEqual(makeData(50, 3), makeData(50, 3));
});

test('big-o: the timer warms up, fills each block, and keeps the fastest block', () => {
  const c = fakeClock();
  const sizes = parseSizes(DEFAULT_SIZES);
  const res = measureAllSync(sizes, 1, c.now, c.programs(COST));
  sizes.forEach((n, k) => {
    for (const key of ['one', 'sort', 'pair'] as ProgKey[]) {
      const cost = COST[key](n);
      assert.ok(near(res.times[k][key], cost, 1e-9 * cost), `${key} at ${n}`);
      const big = cost >= TIME_OPTS[key].bigCallMs;
      assert.equal(res.samples[k][key].length, big ? 3 : TIME_OPTS[key].blocks);
      if (!big) assert.ok(res.reps[k][key] * cost >= TIME_OPTS[key].minBlockMs * 0.99, `${key} at ${n}: block too short`);
    }
  });
  // every pair at 16,000 costs 512 ms here: timed 3 times, one call per block
  assert.equal(res.reps[4].pair, 1);
});

test('big-o: a busy or slowing computer barely moves the every-pair ratio (rounds + fastest block)', () => {
  // bursts: for 40 ms out of every 300 ms, something else runs and everything is 2 times slower
  const b = fakeClock((t) => (t % 300 < 40 ? 2 : 1));
  const rb = measureAllSync([1000, 2000, 4000], 3, b.now, b.programs(COST));
  for (const k of [1, 2]) {
    const q = rb.times[k].pair / rb.times[k - 1].pair;
    assert.ok(q > 3.6 && q < 4.4, `bursty ratio ${q}`);
  }
  // drift: the computer gets steadily slower, 2 times slower after 20 seconds
  // (the whole timing takes about 13 fake seconds here, so it ends 1.67 times slower than it began)
  const d = fakeClock((t) => 1 + t / 20000);
  const rd = measureAllSync(parseSizes(DEFAULT_SIZES), 4, d.now, d.programs(COST));
  for (let k = 1; k < 6; k++) {
    const q = rd.times[k].pair / rd.times[k - 1].pair;
    assert.ok(q > 3.6 && q < 4.4, `drift ratio ${q} at step ${k}`);
  }
});

test('big-o: with cost c·n², doubling n gives 4 times the time, and Show me\'s guess wins', () => {
  const c = fakeClock();
  const sizes = parseSizes(DEFAULT_SIZES);
  const [frame0] = makeFrames(sizes, 1);
  const run = frame0.run;
  measureAllSync(sizes, 1, c.now, c.programs(COST)).times.forEach((t, k) => { run.times[k] = t; });
  for (let k = 1; k < sizes.length; k++) {
    assert.ok(near(ratioAt(run, k, 'pair')!, 4, 1e-9));
    assert.ok(near(ratioAt(run, k, 'one')!, 2, 1e-9));
    const sortR = ratioAt(run, k, 'sort')!;
    assert.ok(sortR > 2 && sortR < 2.25, `sorting ratio ${sortR}`);
    // Show me types 4 × the previous every-pair time
    const g = patternGuess(run.times[k - 1]!.pair, sizes[k - 1], sizes[k]);
    assert.ok(near(g, 4 * run.times[k - 1]!.pair, 0.05 * g));
    assert.equal(guessResult(g, run.times[k]!.pair).win, true);
  }
  // the default run starts with no guesses, so it does not meet the goal by itself
  assert.ok(makeFrames(sizes, 2)[0].run.guesses.every((g) => g === null));
  // notes use the numbers of the run
  assert.equal(noteFor(run, 1), 'At n = 2,000 (2 times n = 1,000), every pair took **8.0 ms**, 4.0 times as long; sorting took 2.2 times as long, and one pass 2.0 times.');
});

test('big-o: the goal\'s 30% window', () => {
  assert.equal(guessResult(10, 13).win, true);
  assert.equal(guessResult(10, 7).win, true);
  assert.equal(guessResult(10, 13.1).win, false);
  assert.equal(guessResult(10, 6.9).win, false);
  // guessing 2 times (the one-pass pattern) for every pair loses
  assert.equal(guessResult(2 * 8, 4 * 8).win, false);
  assert.equal(patternGuess(1.85, 1000, 2000), 7.4);
  assert.equal(patternGuess(2, 500, 1500), 18);
});

test('big-o: real timing in this JavaScript engine: every pair takes about 4 times as long when n doubles', () => {
  // Timing on a shared computer can wobble, so allow 3 tries. Each try must land inside the 30% window.
  let ratios: number[] = [];
  const inside = () => ratios.every((q) => q > 2.8 && q < 5.2);
  for (let attempt = 0; attempt < 3 && !(ratios.length && inside()); attempt++) {
    const { times } = measureAllSync([1000, 2000, 4000], 11 + attempt, () => performance.now());
    ratios = [times[1].pair / times[0].pair, times[2].pair / times[1].pair];
  }
  assert.ok(inside(), `every-pair ratios ${ratios}`);
});

test('big-o: dsa.ts numbers (problem, predict, means, formula)', () => {
  // problem: 1,000 → 1,000,000 items. One pass: 1,000 times the work. Every pair: about 1,000,000 times.
  assert.equal(onePassSteps(1_000_000) / onePassSteps(1_000), 1000);
  assert.ok(near(everyPairSteps(1_000_000) / everyPairSteps(1_000), 1_000_000, 0.002 * 1_000_000));
  // predict: doubling the input makes every pair about 4 times longer (2 × 2)
  assert.ok(near(everyPairSteps(2000) / everyPairSteps(1000), 4, 0.01));
  assert.equal(2 * 2, 4);
  // means: one pass about 2, sorting a little more than 2, every pair about 4 (counting steps)
  assert.equal(onePassSteps(2000) / onePassSteps(1000), 2);
  const sortComparisons = (n: number) => {
    let c = 0;
    Array.from(makeData(n, n)).sort((p, q) => { c++; return p - q; });
    return c;
  };
  const sortR = sortComparisons(2000) / sortComparisons(1000);
  assert.ok(sortR > 2.05 && sortR < 2.4, `sorting comparisons ratio ${sortR}`);
  // formula: time c·n^k; doubling n multiplies it by 2^k
  const time = (n: number, k: number) => 3 * n ** k;
  assert.equal(time(2000, 1) / time(1000, 1), 2);
  assert.equal(time(2000, 2) / time(1000, 2), 4);
  // see: the sizes are 1,000, 2,000, 4,000 and so on
  assert.deepEqual(parseSizes(DEFAULT_SIZES).slice(0, 3), [1000, 2000, 4000]);
});

test('big-o: dsa.ts practice answers', () => {
  // 1. a loop inside a loop over n items: 1,000,000 steps for 1,000 and 4,000,000 for 2,000
  assert.equal(nestedLoopSteps(1000), 1_000_000);
  assert.equal(nestedLoopSteps(2000), 4_000_000);
  // 2. 2 s at 10,000 and 8 s at 20,000 is time c·n²; at 80,000 it is 128 s
  const c = 2 / 10_000 ** 2;
  assert.ok(near(c * 20_000 ** 2, 8, 1e-9));
  assert.ok(near(c * 80_000 ** 2, 128, 1e-9));
  assert.equal(8 * 4 * 4, 128);
  // 3. halving 1,000,000 until one is left: about 20 steps; 2^20 = 1,048,576
  assert.equal(halvingSteps(1_000_000), 19);
  assert.equal(Math.ceil(Math.log2(1_000_000)), 20);
  assert.equal(2 ** 20, 1_048_576);
  // 4. n² > 100n exactly when n > 100
  let first = 1;
  while (!(first * first > 100 * first)) first++;
  assert.equal(first, 101);
});

test('big-o: input checks, presets and random inputs', () => {
  assert.deepEqual(parseSizes(DEFAULT_SIZES), [1000, 2000, 4000, 8000, 16000, 32000]);
  assert.deepEqual(parseSizes('1,000, 2,000, 4,000'), [1000, 2000, 4000]);
  assert.deepEqual(parseSizes('1000,2000,4000'), [1000, 2000, 4000]);
  assert.throws(() => parseSizes('1000'), /at least 2/);
  assert.throws(() => parseSizes('100 200'), /from 200/);
  assert.throws(() => parseSizes('1000 64000'), /from 200 to 32,000/);
  assert.throws(() => parseSizes('1000 1200'), /1\.5 times/);
  assert.throws(() => parseSizes('4000 2000'), /1\.5 times/);
  assert.throws(() => parseSizes('1000 two'), /whole numbers/);
  assert.throws(() => parseSizes('200 300 450 700 1100 1700 2600 4000'), /at most 7/);
  for (const p of PRESETS) assert.ok(parseSizes(p.value).length >= 4);
  for (let s = 0; s < 200; s++) {
    let x = s * 0.618 % 1;
    const sizes = parseSizes(randomSizes(() => (x = (x + 0.37) % 1)));
    assert.ok(sizes.length >= 5 && sizes.length <= MAX_SIZES);
    assert.ok(makeFrames(sizes, s).length <= MAX_SIZES, 'one frame per size, well under 150');
  }
});

test('big-o: frames and notes', () => {
  const frames = makeFrames([1000, 2000, 4000], 5);
  assert.equal(frames.length, 3);
  assert.ok(frames.every((f) => f.run === frames[0].run));
  assert.match(frames[1].note, /^Timing the three programs at all 3 sizes first \(0% done\)/);
  frames[0].run.times[0] = { one: 0.0007, sort: 0.054, pair: 1.85 };
  assert.equal(frames[0].note, 'n = 1,000: every pair took **1.9 ms**, sorting 0.054 ms, and one pass 0.00070 ms.');
  assert.equal(fmtMs(576.3), '576');
  assert.equal(fmtMs(35.5), '35.5');
  assert.equal(fmtMs(1845), '1,845');
});

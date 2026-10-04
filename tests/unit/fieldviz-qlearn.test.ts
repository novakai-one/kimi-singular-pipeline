// Field 6 (reinforcement learning): the maze challenge can be won, Show me reaches the shortest route,
// and the claims in the field text (prediction reveal, practice values) are true.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ALPHA, bestRoute, COLS, EXPLORATION, GAMMA, GOAL, isShortest, land, makeRng, MAX_STEPS, N, newQ, PAGE_SEED,
  routeLength, ROWS, runEpisode, S0, SG, SHORTEST, SHOW_ME, showMeBatches, START, value, WALLS,
} from '../../site/src/pages/fieldviz/qlearn-core.ts';

/** Steps from each square to the goal (breadth-first search backwards). */
function distToGoal(): Int32Array {
  const d = new Int32Array(N).fill(-1);
  d[SG] = 0;
  let changed = true;
  while (changed) {
    changed = false;
    for (let s = 0; s < N; s++) {
      if (WALLS[s] || s === SG) continue;
      for (let a = 0; a < 4; a++) {
        const t = land(s, a);
        if (t !== s && d[t] >= 0 && (d[s] < 0 || d[t] + 1 < d[s])) { d[s] = d[t] + 1; changed = true; }
      }
    }
  }
  return d;
}
const DIST = distToGoal();
const valued = (Q: Float64Array) => [...Array(N).keys()].filter((s) => value(Q, s) > 0);

test('qlearn: the maze — 7 x 6, start bottom-left, goal top-right, settings as in the text', () => {
  assert.equal(COLS, 7);
  assert.equal(ROWS, 6);
  assert.deepEqual(START, [0, ROWS - 1]);
  assert.deepEqual(GOAL, [COLS - 1, 0]);
  assert.equal(WALLS[S0], 0);
  assert.equal(WALLS[SG], 0);
  assert.equal(GAMMA, 0.9);
  assert.equal(ALPHA, 0.5);
  assert.equal(MAX_STEPS, 100);
  assert.deepEqual(EXPLORATION, [0, 0.1, 0.3]);
  assert.equal(SHORTEST, DIST[S0]);
  console.log(`  shortest route: ${SHORTEST} steps`);
});

test('qlearn: prediction reveal — after the first completed episode only the square next to the goal has a value', () => {
  for (const explore of EXPLORATION) {
    for (let seed = 1; seed <= 200; seed++) {
      const Q = newQ();
      const rand = makeRng(seed);
      let ep = runEpisode(Q, explore, rand);
      while (!ep.reached) {
        assert.equal(valued(Q).length, 0, 'an episode that never reaches the goal changes nothing');
        ep = runEpisode(Q, explore, rand);
      }
      const v = valued(Q);
      assert.equal(v.length, 1, `seed ${seed}, exploration ${explore}`);
      assert.equal(DIST[v[0]], 1, 'next to the goal');
      assert.equal(value(Q, v[0]), ALPHA * 1);
    }
  }
});

test('qlearn: reveal — on each trip, value spreads back by about one square', () => {
  const T = 300, K = 4;
  const counts = new Array(K + 1).fill(0);
  for (let seed = 1; seed <= T; seed++) {
    const Q = newQ();
    const rand = makeRng(seed);
    for (let k = 1; k <= K;) {
      if (runEpisode(Q, 0.1, rand).reached) { counts[k] += valued(Q).length; k++; }
    }
  }
  const mean = counts.slice(1).map((c) => c / T);
  console.log(`  squares with a value after 1..${K} completed episodes (mean): ${mean.map((m) => m.toFixed(2)).join(', ')}`);
  mean.forEach((m, k) => assert.ok(Math.abs(m - (k + 1)) < 0.5));
});

test('qlearn: Show me reaches the shortest route (seeded), and does so for almost every seed', () => {
  const Q = newQ();
  const batches = [...showMeBatches(Q, makeRng(SHOW_ME.seed))];
  const lastB = batches[batches.length - 1];
  console.log(`  Show me: ${batches.map((b) => b.len ?? '-').join(' ')} → shortest after ${lastB.episodes} episodes`);
  assert.equal(lastB.len, SHORTEST);
  assert.ok(lastB.episodes <= SHOW_ME.cap);
  assert.ok(isShortest(Q));
  let ok = 0;
  for (let seed = 1; seed <= 200; seed++) {
    const q = newQ();
    const b = [...showMeBatches(q, makeRng(seed))];
    if (b[b.length - 1].len === SHORTEST) ok++;
  }
  console.log(`  other seeds: ${ok}/200 reach the shortest route within ${SHOW_ME.cap} episodes`);
  assert.ok(ok >= 198);
});

test('qlearn: a student can win — the page\'s own runs reach the shortest route with every exploration setting', () => {
  for (const explore of EXPLORATION) {
    const Q = newQ();
    const rand = makeRng(PAGE_SEED);
    let clicks = 0;
    while (!isShortest(Q) && clicks < 20) { for (let k = 0; k < 50; k++) runEpisode(Q, explore, rand); clicks++; }
    console.log(`  exploration ${explore}: shortest route after ${clicks} press(es) of "Run 50 episodes"`);
    assert.ok(isShortest(Q));
  }
});

test('qlearn: the best route always reaches the goal once Start has a value (no loops)', () => {
  for (let seed = 1; seed <= 100; seed++) {
    const Q = newQ();
    const rand = makeRng(seed);
    for (let e = 0; e < 60; e++) {
      runEpisode(Q, 0.3, rand);
      const r = bestRoute(Q);
      assert.equal(r !== null, value(Q, S0) > 0);
      if (r) assert.equal(r[r.length - 1], SG);
    }
  }
});

test('qlearn: practice — after training, values on the best route are 1, 0.9, 0.81, …', () => {
  const Q = newQ();
  const rand = makeRng(5);
  for (let e = 0; e < 3000; e++) runEpisode(Q, 0.3, rand);
  assert.equal(routeLength(Q), SHORTEST);
  const route = bestRoute(Q)!;
  const vals = route.slice(0, -1).reverse().map((s) => value(Q, s));   // from the goal backwards
  console.log(`  values from the goal back: ${vals.map((v) => v.toFixed(2)).join(', ')}`);
  vals.forEach((v, k) => assert.ok(Math.abs(v - GAMMA ** k) < 1e-3, `step ${k + 1}: ${v}`));
  assert.ok(Math.abs(vals[0] - 1) < 1e-3 && Math.abs(vals[1] - 0.9) < 1e-3 && Math.abs(vals[2] - 0.81) < 1e-3);
});

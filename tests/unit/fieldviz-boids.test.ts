// Field 7 "Make them flock": checks the challenge can be won and the field text is true.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULTS, holdTimer, meanNearest, N, neighbours, orderOf, orderScore, scatter, SHOW_ME, step, TICK_HZ,
  WIN_HOLD, WIN_SCORE, type Flock, type Weights,
} from '../../site/src/pages/fieldviz/boids-core.ts';

const run = (f: Flock, w: Weights, seconds: number) => { for (let t = 0; t < seconds * TICK_HZ; t++) step(f, w); };
const meanNeighbours = (f: Flock) => { let s = 0; for (let i = 0; i < f.n; i++) s += neighbours(f, i).length; return s / f.n; };

/** Seconds until the order score has stayed at or above WIN_SCORE for WIN_HOLD seconds (Infinity if never). */
function timeToWin(f: Flock, w: Weights, limit: number) {
  const hold = holdTimer();
  for (let t = 0; t < limit * TICK_HZ; t++) {
    step(f, w);
    hold.add(orderScore(f), 1 / TICK_HZ);
    if (hold.won) return (t + 1) / TICK_HZ;
  }
  return Infinity;
}

test('boids: practice answer — directions (1,0), (0,1), (-1,0) give order score 1/3', () => {
  assert.ok(Math.abs(orderOf([[1, 0], [0, 1], [-1, 0]]) - 1 / 3) < 1e-12);
  assert.ok(Math.abs(orderOf([[2, 0], [5, 0], [0.1, 0]]) - 1) < 1e-12, 'all the same way gives exactly 1');
  assert.ok(orderOf([[1, 0], [-1, 0]]) < 1e-12, 'opposite ways give 0');
});

test('boids: the hold timer needs 2 unbroken seconds at or above 0.9', () => {
  const h = holdTimer();
  for (let k = 0; k < 1.5 * TICK_HZ; k++) h.add(0.95, 1 / TICK_HZ);
  assert.ok(!h.won);
  h.add(0.85, 1 / TICK_HZ);
  assert.equal(h.held, 0, 'a dip below 0.9 starts the count again');
  for (let k = 0; k < WIN_HOLD * TICK_HZ + 1; k++) h.add(WIN_SCORE, 1 / TICK_HZ);
  assert.ok(h.won);
});

test('boids: defaults (alignment 0) bunch together but point every way (prediction reveal)', () => {
  assert.deepEqual(DEFAULTS, { sep: 1, align: 0, coh: 1 });
  const seeds = Array.from({ length: 12 }, (_, i) => i + 1);
  let randNb = 0, randNear = 0, nb = 0, near = 0, worstMean = 0, peak = 0, all = 0;
  for (const s of seeds) {
    const r = scatter(s + 100);
    randNb += meanNeighbours(r); randNear += meanNearest(r, 3);
    const f = scatter(s);
    run(f, DEFAULTS, 10);
    let sum = 0, cnt = 0;
    for (let t = 0; t < 30 * TICK_HZ; t++) {
      step(f, DEFAULTS);
      const o = orderScore(f);
      sum += o; cnt++; peak = Math.max(peak, o);
      if (t % TICK_HZ === 0) { nb += meanNeighbours(f) / 30; near += meanNearest(f, 3) / 30; }
    }
    worstMean = Math.max(worstMean, sum / cnt);
    all += sum / cnt;
  }
  const k = seeds.length;
  console.log(`  defaults, seconds 10-40, ${k} seeds: order score mean ${(all / k).toFixed(2)}, worst seed ${worstMean.toFixed(2)}, highest moment ${peak.toFixed(2)}`);
  console.log(`  birds within ${'50'} px: ${(nb / k).toFixed(1)} at defaults vs ${(randNb / k).toFixed(1)} for a random spread; mean distance to 3 nearest: ${(near / k).toFixed(1)} vs ${(randNear / k).toFixed(1)} px`);
  assert.ok(worstMean < 0.5, 'low order: no shared direction');
  assert.ok(peak < WIN_SCORE, 'the defaults never reach 0.9, so the challenge needs a change');
  assert.ok(nb / k > 3 * (randNb / k), 'bunched: at least 3 times as many neighbours as a random spread');
  assert.ok(near / k < 0.75 * (randNear / k), 'bunched: nearest birds much closer than in a random spread');
});

test('boids: cohesion is what pulls them in (prediction reveal)', () => {
  let withCoh = 0, without = 0, rand = 0;
  for (let s = 1; s <= 8; s++) {
    rand += meanNeighbours(scatter(s + 100));
    const a = scatter(s); run(a, DEFAULTS, 30); withCoh += meanNeighbours(a);
    const b = scatter(s); run(b, { sep: 1, align: 0, coh: 0 }, 30); without += meanNeighbours(b);
  }
  console.log(`  birds within 50 px after 30 s: cohesion 1 → ${(withCoh / 8).toFixed(1)}, cohesion 0 → ${(without / 8).toFixed(1)}, random spread ${(rand / 8).toFixed(1)}`);
  assert.ok(without / 8 < 1.5 * (rand / 8), 'without cohesion they stay spread out');
  assert.ok(withCoh > 2.5 * without);
});

test('boids: Show me settings reach 0.9 for 2 seconds, and they are slider values a student can set', () => {
  for (const v of Object.values(SHOW_ME)) {
    assert.ok(v >= 0 && v <= 2 && Math.abs(v * 10 - Math.round(v * 10)) < 1e-9, 'on the 0 to 2 slider, step 0.1');
  }
  assert.equal(SHOW_ME.sep, DEFAULTS.sep);
  assert.equal(SHOW_ME.coh, DEFAULTS.coh);
  const fromDefaults: number[] = [], fromScatter: number[] = [];
  for (let s = 1; s <= 20; s++) {
    const f = scatter(s);
    run(f, DEFAULTS, 15);
    fromDefaults.push(timeToWin(f, SHOW_ME, 40));
    fromScatter.push(timeToWin(scatter(s + 500), SHOW_ME, 40));
  }
  const med = (a: number[]) => a.slice().sort((x, y) => x - y)[a.length >> 1];
  console.log(`  alignment ${SHOW_ME.align}: wins after ${med(fromDefaults).toFixed(1)} s median, ${Math.max(...fromDefaults).toFixed(1)} s worst (from the default bunch); ${med(fromScatter).toFixed(1)} s / ${Math.max(...fromScatter).toFixed(1)} s from a fresh scatter`);
  assert.ok(Math.max(...fromDefaults, ...fromScatter) <= 30, 'every seed wins within 30 seconds');
});

test('boids: the page\'s own first flock (seed 1) can be won by raising alignment', () => {
  const f = scatter(1);
  assert.equal(f.n, N);
  run(f, DEFAULTS, 5);
  const t = timeToWin(f, { sep: 1, align: 1.5, coh: 1 }, 30);
  assert.ok(t < 30);
  const g = scatter(1);
  run(g, DEFAULTS, 5);
  const t2 = timeToWin(g, { sep: 1, align: 1, coh: 1 }, 40);
  console.log(`  seed 1: alignment 1.5 wins after ${t.toFixed(1)} s; alignment 1.0 after ${t2.toFixed(1)} s`);
});

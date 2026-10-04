// Field 9 (optimisation): the round-trip challenge can be won, Show me's annealing ends on the
// shortest trip, and every number in the field text is true.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ANNEAL_DEFAULTS, BEST, DEMO_SEEDS, MAP, STOPS, WIN_RATIO, acceptChance, allTrips, countTrips, crossings, dist,
  factorial, fmt, isWin, makeAnnealer, percentOver, runAnneal, tripLength,
} from '../../site/src/pages/fieldviz/tsp-core.ts';

test('tsp: counting round trips (problem, prediction and by-hand text)', () => {
  // "With 8 stops there are 2,520 different round trips."
  assert.equal(allTrips(8).length, 2520);
  assert.equal(countTrips(8), 2520n);
  assert.equal(BEST.checked, 2520, 'brute force checks every distinct trip');
  // reveal: "7 x 6 x 5 x 4 x 3 x 2 x 1 = 5,040 orders", halved = 2,520
  assert.equal(factorial(7), 5040n);
  // by hand: 5 stops -> 4 x 3 x 2 x 1 = 24 orders, halved = 12
  assert.equal(factorial(4), 24n);
  assert.equal(allTrips(5).length, 12);
  assert.equal(countTrips(5), 12n);
  // "With 20 stops there are more than 6 x 10^16."
  assert.ok(countTrips(20) > 6n * 10n ** 16n);
  console.log(`  20 stops: ${countTrips(20)} round trips`);
  // each enumerated trip is distinct, even allowing for direction
  const seen = new Set<string>();
  for (const t of allTrips(8)) {
    const fwd = t.join(','), back = [t[0], ...t.slice(1).reverse()].join(',');
    assert.ok(!seen.has(fwd) && !seen.has(back));
    seen.add(fwd);
  }
});

test('tsp: acceptance chances in the by-hand problem', () => {
  // delta = 5. T = 10: e^-0.5 = 0.61 (about 61%). T = 1: e^-5 = 0.007 (under 1%).
  assert.equal(acceptChance(5, 10).toFixed(2), '0.61');
  assert.equal(acceptChance(5, 1).toFixed(3), '0.007');
  assert.ok(acceptChance(5, 1) < 0.01);
  // "Shorter trips are always kept."
  assert.equal(acceptChance(-3, 0.5), 1);
  assert.equal(acceptChance(0, 0.5), 1);
});

test('tsp: the map is usable (well spread, big targets, inside the canvas)', () => {
  let md = Infinity;
  for (let i = 0; i < STOPS.length; i++) for (let j = i + 1; j < STOPS.length; j++) md = Math.min(md, dist(STOPS[i], STOPS[j]));
  // 48 CSS-pixel targets on a 326 px wide phone canvas need about 83 map units between stops
  assert.ok(md >= 100, `closest two stops are ${md.toFixed(0)} apart`);
  for (const [x, y] of STOPS) assert.ok(x >= 20 && y >= 20 && x <= MAP.w - 20 && y <= MAP.h - 20);
});

test('tsp: the challenge is winnable, from any starting stop and in either direction', () => {
  console.log(`  shortest: ${fmt(BEST.length)} via ${BEST.order.join('-')}`);
  const lens = allTrips(8).map((t) => tripLength(t)).sort((a, b) => a - b);
  const winners = lens.filter((l) => isWin(l)).length;
  console.log(`  trips within 5%: ${winners} of 2,520 (next: ${percentOver(lens[1]).toFixed(1)}%, ${percentOver(lens[2]).toFixed(1)}%)`);
  assert.ok(winners >= 1 && winners <= 4, 'a real challenge: only a few trips win');
  assert.ok(percentOver(lens[1]) > 1, 'the shortest trip is clearly the shortest');
  // no trip sits right at the 5% line, so "5% longer" never shows for a trip that fails
  assert.ok(!lens.some((l) => l / BEST.length > 1.04 && l / BEST.length < 1.06));
  const o = BEST.order;
  for (let r = 0; r < o.length; r++) {
    const rot = [...o.slice(r), ...o.slice(0, r)];
    assert.ok(isWin(tripLength(rot)));
    assert.ok(isWin(tripLength([...rot].reverse())));
  }
  assert.ok(isWin(BEST.length * WIN_RATIO));
  assert.ok(!isWin(BEST.length * WIN_RATIO + 0.5));
  // always heading to the closest unvisited stop does not win from any start: the learner has to look ahead
  for (let s = 0; s < STOPS.length; s++) {
    const t = [s];
    while (t.length < STOPS.length) {
      const cur = STOPS[t[t.length - 1]];
      let bj = -1;
      for (let j = 0; j < STOPS.length; j++) if (!t.includes(j) && (bj < 0 || dist(cur, STOPS[j]) < dist(cur, STOPS[bj]))) bj = j;
      t.push(bj);
    }
    assert.ok(!isWin(tripLength(t)), `closest-stop-next from stop ${s} is ${percentOver(tripLength(t)).toFixed(0)}% longer`);
  }
});

test('tsp: Show me (simulated annealing) ends on the shortest trip for every seed it uses', () => {
  // about 5 s at one move per frame (60 frames a second): within the 4-6 s target
  assert.ok(ANNEAL_DEFAULTS.steps >= 240 && ANNEAL_DEFAULTS.steps <= 360);
  let keptTotal = 0, earlyTotal = 0;
  for (let seed = 1; seed <= DEMO_SEEDS; seed++) {
    const start = makeAnnealer(seed);
    // "starts from a random, tangled trip"
    assert.ok(crossings(start.order) >= 4, `seed ${seed}: start trip crosses itself`);
    const A = runAnneal(seed);
    assert.ok(Math.abs(A.length - BEST.length) < 1e-6, `seed ${seed}: ended at ${A.length.toFixed(1)}, shortest ${BEST.length.toFixed(1)}`);
    // "Watch the crossings untangle"
    assert.equal(crossings(A.order), 0);
    // "Longer ones are sometimes kept too: often at first, rarely later."
    let early = 0, late = 0;
    for (let i = 1; i < A.history.length; i++) {
      if (A.history[i] > A.history[i - 1] + 1e-9) { if (i <= ANNEAL_DEFAULTS.steps / 2) early++; else late++; }
    }
    assert.equal(early + late, A.keptWorse);
    assert.ok(A.keptWorse > 0 && early > late, `seed ${seed}: kept ${early} longer trips early, ${late} late`);
    keptTotal += A.keptWorse; earlyTotal += early;
    assert.ok(A.T < start.T, 'temperature falls');
  }
  console.log(`  ${DEMO_SEEDS} seeds all reach ${fmt(BEST.length)}; on average ${(keptTotal / DEMO_SEEDS).toFixed(1)} longer trips kept, ${(100 * earlyTotal / keptTotal).toFixed(0)}% in the first half`);
  const s1 = runAnneal(1);
  console.log(`  seed 1: ${fmt(s1.history[0])} -> ${fmt(s1.length)}, ${crossings(makeAnnealer(1).order)} crossings at the start`);
});

test('tsp: keeping only shorter trips can get stuck on this map; annealing does not', () => {
  // "Accepting some worse trips early stops the search getting stuck on a trip that no single small change can improve."
  let stuck = 0;
  for (let seed = 1; seed <= 400; seed++) {
    const G = runAnneal(seed, { T0: 1e-9, T1: 1e-9, steps: 600 }); // never keeps a longer trip
    if (G.length > BEST.length + 1e-6) {
      stuck++;
      // no single reversal of a section makes this trip shorter
      const t = G.order, n = t.length;
      for (let i = 1; i < n - 1; i++) for (let j = i + 1; j < n; j++) {
        const u = [...t.slice(0, i), ...t.slice(i, j + 1).reverse(), ...t.slice(j + 1)];
        assert.ok(tripLength(u) >= G.length - 1e-9);
      }
      assert.ok(Math.abs(runAnneal(seed).length - BEST.length) < 1e-6, 'annealing from the same start reaches the shortest');
    }
  }
  console.log(`  only-shorter search stuck above the shortest in ${stuck} of 400 runs`);
  assert.ok(stuck > 0);
});

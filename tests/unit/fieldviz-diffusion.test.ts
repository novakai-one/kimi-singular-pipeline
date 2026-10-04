// Field 10 "Turn noise into a spiral": checks the challenge can be won and the field text is true.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  addNoise, alphaBar, ARM_GAP, denoise, generate, MAX_WIN_STEPS, medianDistToShown, N_GEN, N_SHOWN, noise, quality,
  SHOW_ME_STEPS, SHOWN, STEP_CHOICES, T, timesFor, WIN_QUALITY,
} from '../../site/src/pages/fieldviz/diffusion-core.ts';

const SEEDS = [1001, 1002, 1003, 1004, 1005, 1006];
const final = (k: number, seed: number) => { const f = generate(k, seed); return f[f.length - 1]; };

test('diffusion: practice answer — x0 = (2, 0), abar = 0.25, eps = (1, -1) gives (1.87, -0.87)', () => {
  const a = 0.25, x = Math.sqrt(a) * 2 + Math.sqrt(1 - a) * 1, y = Math.sqrt(a) * 0 + Math.sqrt(1 - a) * -1;
  assert.equal(x.toFixed(2), '1.87');
  assert.equal(y.toFixed(2), '-0.87');
  // addNoise uses the same formula
  const t = 17, at = alphaBar(t);
  const out = addNoise(new Float64Array([2, 0]), new Float64Array([1, -1]), t);
  assert.ok(Math.abs(out[0] - (Math.sqrt(at) * 2 + Math.sqrt(1 - at))) < 1e-12);
  assert.ok(Math.abs(out[1] + Math.sqrt(1 - at)) < 1e-12);
});

test('diffusion: the schedule falls from 1 (no noise) to near 0 (all noise) over 50 steps', () => {
  assert.equal(T, 50);
  assert.equal(alphaBar(0), 1);
  for (let t = 1; t <= T; t++) assert.ok(alphaBar(t) < alphaBar(t - 1));
  assert.ok(alphaBar(T) < 0.001);
  assert.equal(N_SHOWN, 400);
  assert.deepEqual(timesFor(10), [50, 45, 40, 35, 30, 25, 20, 15, 10, 5, 0]);
});

test('diffusion: quality by number of steps — 2 steps stays below 90%, 10 steps reaches it (also Show me)', () => {
  const rows: string[] = [];
  const worst: Record<number, number> = {}, best: Record<number, number> = {};
  for (const k of STEP_CHOICES) {
    const qs = SEEDS.map((s) => quality(final(k, s)));
    worst[k] = Math.min(...qs); best[k] = Math.max(...qs);
    rows.push(`${k} steps: ${qs.map((q) => Math.round(q * 100) + '%').join(' ')}`);
  }
  console.log('  ' + rows.join('\n  '));
  assert.ok(best[2] < WIN_QUALITY, '2 steps never reaches 90%');
  assert.ok(worst[10] >= WIN_QUALITY, '10 steps always reaches 90%');
  assert.ok(worst[25] >= WIN_QUALITY && worst[50] >= WIN_QUALITY);
  assert.ok(SHOW_ME_STEPS <= MAX_WIN_STEPS, 'Show me uses an allowed step count');
  assert.ok(best[2] < worst[5] && best[5] < worst[10], 'more steps, better quality');
});

test('diffusion: with very few steps the jumps are large (What you see)', () => {
  const meanJump = (k: number) => {
    const f = generate(k, 1001);
    let s = 0;
    for (let j = 1; j < f.length; j++) for (let i = 0; i < N_GEN; i++) s += Math.hypot(f[j][2 * i] - f[j - 1][2 * i], f[j][2 * i + 1] - f[j - 1][2 * i + 1]);
    return s / (N_GEN * (f.length - 1));
  };
  const j2 = meanJump(2), j10 = meanJump(10);
  console.log(`  mean jump per step: 2 steps ${j2.toFixed(2)}, 10 steps ${j10.toFixed(2)}`);
  assert.ok(j2 > 3 * j10);
});

test('diffusion: early steps make rough guesses, late steps fine ones (What it means)', () => {
  const k = 10, f = generate(k, 1002), times = timesFor(k), end = f[k];
  const errs: number[] = [];
  for (let j = 0; j < k; j++) {
    let s = 0;
    for (let i = 0; i < N_GEN; i++) {
      const [gx, gy] = denoise(f[j][2 * i], f[j][2 * i + 1], times[j]);
      s += Math.hypot(gx - end[2 * i], gy - end[2 * i + 1]);
    }
    errs.push(s / N_GEN);
  }
  console.log(`  distance from each step's best guess to where the point ends: ${errs.map((e) => e.toFixed(2)).join(', ')}`);
  for (let j = 1; j < k; j++) assert.ok(errs[j] < errs[j - 1]);
});

test('diffusion: new points land between the training points, not on them (What it means)', () => {
  // spacing of the training points themselves: median distance to their nearest other training point
  const nn: number[] = [];
  for (let i = 0; i < N_SHOWN; i++) {
    let b = Infinity;
    for (let j = 0; j < N_SHOWN; j++) if (j !== i) b = Math.min(b, Math.hypot(SHOWN[2 * i] - SHOWN[2 * j], SHOWN[2 * i + 1] - SHOWN[2 * j + 1]));
    nn.push(b);
  }
  nn.sort((a, b) => a - b);
  const spacing = nn[N_SHOWN >> 1];
  for (const k of [10, 50]) {
    const pts = final(k, 1003);
    const med = medianDistToShown(pts);
    let copies = 0;
    for (let i = 0; i < N_GEN; i++) {
      let b = Infinity;
      for (let j = 0; j < N_SHOWN; j++) b = Math.min(b, Math.hypot(pts[2 * i] - SHOWN[2 * j], pts[2 * i + 1] - SHOWN[2 * j + 1]));
      if (b < 0.002) copies++;
    }
    console.log(`  ${k} steps: median distance to the nearest training point ${med.toFixed(3)} (training points' own spacing ${spacing.toFixed(3)}); near-copies (< 0.002): ${copies} of ${N_GEN}`);
    assert.ok(med > 0.5 * spacing, 'new points sit about as far from the training points as those sit from each other');
    assert.ok(copies <= 3, 'almost no new point sits on a training point');
  }
});

test('diffusion: when does the spiral stop being recognisable? (prediction)', () => {
  // Share of noisy points within a quarter arm-gap of the spiral (shrunk by sqrt(abar), as the formula shrinks it),
  // minus the same share for the spiral turned half a turn (which puts its arms exactly between the real arms).
  // 100% = sharp arms, 0% = no arm pattern left.
  const band = (pts: Float64Array, t: number, half: boolean) => {
    const sa = Math.sqrt(alphaBar(t));
    return quality(pts.map((v) => (half ? -v : v) / sa) as Float64Array, ARM_GAP / 4);
  };
  const left: number[] = [];
  let base = 0;
  for (let t = 0; t <= T; t++) {
    let d = 0;
    for (const s of [7, 8]) { const x = addNoise(SHOWN, noise(N_SHOWN, s), t); d += band(x, t, false) - band(x, t, true); }
    if (t === 0) base = d;
    left.push(d / base);
  }
  const below = left.findIndex((v) => v < 0.5);
  console.log(`  arm pattern left: ${[3, 5, 8, 10, 12, 15, 20, 30, 50].map((t) => `step ${t} ${Math.round(left[t] * 100)}%`).join(', ')}`);
  console.log(`  less than half the arm pattern is left from step ${below}`);
  assert.ok(left[3] > 0.9, 'step 3: still a sharp spiral');
  assert.ok(below >= 7 && below <= 13, 'the pattern drops below half around step 10');
  assert.ok(left[20] < 0.15, 'by step 20 almost nothing is left');
  assert.ok(Math.abs(left[T]) < 0.05, 'step 50: pure noise');
});

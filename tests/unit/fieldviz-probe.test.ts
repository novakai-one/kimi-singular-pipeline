// Field 4 'Find the "round" direction': the challenge can be won by dragging or with the turn buttons,
// Show me reaches the goal, and every data-dependent claim in the field text is true for probe.json.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  bestCut, goodRange, labels, norm360, scoreAt, shadows, shortTurn, START_DEG, STEP_DEG, TARGET, type ProbeData,
} from '../../site/src/pages/fieldviz/probe-core.ts';

const data: ProbeData = JSON.parse(readFileSync(new URL('../../site/public/models/fields/probe.json', import.meta.url), 'utf8'));
const pct = (a: number) => `${(a * 100).toFixed(1)}%`;

test('probe: data matches the field text (round 0 6 8 9, straight 1 4 7)', () => {
  assert.deepEqual(data.round, [0, 6, 8, 9]);
  assert.deepEqual(data.straight, [1, 4, 7]);
  assert.equal(data.xy.length, data.digit.length);
  const allowed = new Set([...data.round, ...data.straight]);
  for (const d of data.digit) assert.ok(allowed.has(d));
  for (const [x, y] of data.xy) assert.ok(Math.hypot(x, y) < 1, 'every dot fits inside the plot circle');
  console.log(`  ${data.xy.length} test digits`);
});

test('probe: the best angle scores at least 90% ("yes, almost perfectly")', () => {
  const s = scoreAt(data, data.best_angle_deg);
  console.log(`  best angle ${data.best_angle_deg} deg: ${pct(s.accuracy)}`);
  assert.ok(s.accuracy >= TARGET);
  assert.ok(s.accuracy >= 0.95, 'almost perfectly');
  assert.ok(Math.abs(s.accuracy - data.best_accuracy) < 1e-9, 'matches best_accuracy in the JSON');
  // round shadows at one end, straight at the other: the cut splits them
  const sh = shadows(data.xy, data.best_angle_deg);
  const isRound = labels(data);
  const wrong = sh.filter((v, i) => (v > s.cut) !== (isRound[i] === s.roundHigh)).length;
  assert.equal(wrong, s.n - s.correct);
});

test('probe: the starting angle (pointing up) scores under 80%', () => {
  const s = scoreAt(data, START_DEG);
  console.log(`  start ${START_DEG} deg: ${pct(s.accuracy)}`);
  assert.ok(s.accuracy < 0.8);
});

test('probe: a wide range of angles reaches 90%, so dragging can find it', () => {
  const a = goodRange(data, data.best_angle_deg);
  const b = goodRange(data, data.best_angle_deg + 180);
  console.log(`  >= 90% from ${a.from} to ${a.to} deg (${a.width} deg wide), and again from ${b.from} to ${b.to}`);
  assert.ok(a.width >= 30, 'at least 30 degrees wide');
  assert.ok(Math.abs(a.width - b.width) < 1e-9, 'the arrow pointing the other way scores the same');
  // print the score every 15 degrees (what the turn buttons visit)
  const row: string[] = [];
  for (let d = 0; d < 180; d += 15) row.push(`${d}:${Math.round(scoreAt(data, d).accuracy * 100)}`);
  console.log(`  every 15 deg: ${row.join(' ')}`);
});

test('probe: the turn buttons win both ways round, in a few presses', () => {
  for (const dir of [1, -1]) {
    let deg = START_DEG, presses = 0;
    while (scoreAt(data, deg).accuracy < TARGET && presses < 24) { deg += dir * STEP_DEG; presses++; }
    console.log(`  ${dir > 0 ? 'Turn ◀ (anticlockwise)' : 'Turn ▶ (clockwise)'}: ${presses} presses, ${norm360(deg)} deg, ${pct(scoreAt(data, deg).accuracy)}`);
    assert.ok(presses <= 6);
  }
});

test('probe: Show me turns to the best angle the short way and reaches the goal', () => {
  const end = START_DEG + shortTurn(START_DEG, data.best_angle_deg);
  assert.equal(Math.abs(shortTurn(START_DEG, data.best_angle_deg)) <= 180, true);
  assert.equal(norm360(end), norm360(data.best_angle_deg));
  assert.ok(scoreAt(data, end).accuracy >= TARGET);
});

test('probe: shadows are dot products (checks the practice answer)', () => {
  const deg = (Math.atan2(0.8, 0.6) * 180) / Math.PI; // arrow (0.6, 0.8)
  const [a, b, c] = shadows([[3, 1], [1, 2], [2, 1]], deg);
  assert.ok(Math.abs(a - 2.6) < 1e-9);
  assert.ok(Math.abs(b - 2.2) < 1e-9);
  assert.ok(Math.abs(c - 2.0) < 1e-9);
});

test('probe: best cut tries every cut, both ways round', () => {
  assert.deepEqual(bestCut([1, 2, 3, 4], [false, false, true, true]).accuracy, 1);
  assert.equal(bestCut([1, 2, 3, 4], [true, true, false, false]).roundHigh, false);
  assert.equal(bestCut([1, 2, 3, 4], [true, false, true, false]).accuracy, 0.75);
  assert.equal(bestCut([1, 1, 1, 1], [true, false, true, false]).accuracy, 0.5, 'no cut between equal shadows');
});

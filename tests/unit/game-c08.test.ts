// Chapter 8: puzzle numbers, pure win checks, Doubt predicates, the Law and the build.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  P1, P2, P3, P4, P5, D1_COUNTER, D1_START, D2_SHOW, LAW_C08, d1Holds, d1Random, d2Holds, d2Random, lawBroken, lawCase,
  lookingDown, p1Tip, p1Weights, p1Won, p2Won, p3C, p3Pair, p3Region, p3SweepDone, viewAngle, checkCrew,
} from '../../site/src/game/content/chapters/c08-systems/logic.ts';
import { kindOf, onAll, residuals, sameSolutions, seeded, solutionCount, somePoint } from '../../site/src/game/content/chapters/c08-systems/act3.ts';
import { checkLaw } from '../../site/src/game/game/lawcheck.ts';
import { buildCheck } from '../../site/src/game/content/chapters/c08-systems/build.ts';
import { fillAnswers } from '../../site/src/game/game/codehelp.ts';
import { solve } from '../../site/src/game/math/la.ts';

test('p1: (3, 2) is on both lines and 3, 2 weights reach (5, 1); the two pictures agree', () => {
  assert.deepEqual(residuals(P1.rows, [3, 2]), [0, 0]);
  assert.deepEqual(p1Tip(3, 2), [5, 1]);
  assert.deepEqual(p1Weights([5, 1]), [3, 2]);
  assert.ok(p1Won([3, 2], 0.05));
  for (const bad of [[5, 1], [2, 3], [1, 0], [3, 2.2]]) assert.ok(!p1Won(bad, 0.05), String(bad));
  // linked views: any weights → tip → weights
  for (const w of [[1, 0], [-2, 3.5], [4, -1]]) assert.deepEqual(p1Weights(p1Tip(w[0], w[1])), w);
});

test('p2: the pod (5, 3, −2) is the one point on all three fan-beam planes', () => {
  assert.equal(kindOf(P2.rows), 'one');
  assert.deepEqual(somePoint(P2.rows), P2.pod);
  assert.ok(p2Won(P2.pod, 0.01));
  assert.ok(!p2Won([5, 3, 0], 0.05), 'on no plane but the first');
  assert.ok(!p2Won(P2.start, 0.05));
  assert.ok(!p2Won([3, 1, 0], 0.05), 'the marker\'s start');
});

test('p3 [D]: the planes share the line (0, −1, 4) + t(1, 1, −2); two solutions bring the whole line', () => {
  assert.equal(kindOf(P3.rows), 'many');
  for (let t = -3; t <= 3; t += 0.5) assert.ok(onAll(P3.rows, [0 + t, -1 + t, 4 - 2 * t], 1e-12));
  const A = [1, 0, 2], B = [2, 1, 0];
  assert.ok(p3Pair(A, B, 0.05));
  assert.ok(!p3Pair(A, A, 0.05), 'the same point twice is not two');
  assert.ok(!p3Pair(P3.startA, P3.startB, 0.05), 'the starting markers are off the planes');
  for (const t of [-1.2, -0.5, 0.3, 0.7, 1.6, 2.4]) assert.ok(onAll(P3.rows, p3C(A, B, t), 1e-9), `t = ${t}`);
  assert.equal(p3Region(-0.5), 'before');
  assert.equal(p3Region(0.5), 'between');
  assert.equal(p3Region(2), 'beyond');
  assert.equal(p3Region(1), null, 'B itself is not a new point');
  assert.ok(p3SweepDone(new Set(['between', 'beyond'])));
  assert.ok(!p3SweepDone(new Set(['between'])));
  assert.ok(!p3SweepDone(new Set(['beyond', 'before'])), 'between is required');
  assert.equal(solutionCount(P3.rows), Infinity);
});

test('p4: right side 5 makes a prism: no solution, pair lines all along (1, 1, −2)', () => {
  assert.equal(kindOf(P4.rows), 'none');
  assert.ok(lookingDown([-1, -1, 2]));
  assert.ok(lookingDown([1, 1, -2]));
  assert.ok(viewAngle([-1, -1, 2.3], P4.dir) < 9);
  assert.ok(!lookingDown([0, -1, 1]), 'a slanted view is not along the lines');
  assert.ok(!lookingDown([1, 0, 0]));
});

test('p5 [H]: the tanks hold 3, 4 and 6 tonnes; the column form reaches b', () => {
  assert.equal(kindOf(P5.rows), 'one');
  assert.deepEqual(somePoint(P5.rows), P5.answer);
  const [x, y, z] = P5.answer;
  const lhs = [0, 1, 2].map((i) => x * P5.cols[0][i] + y * P5.cols[1][i] + z * P5.cols[2][i]);
  assert.deepEqual(lhs, P5.b);
  // the rows and the columns are the same numbers
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) assert.equal(P5.rows[i][j], P5.cols[j][i]);
  // the sign-flipped rows are not accepted forms (the right sides are fixed): they describe other planes
  assert.ok(!sameSolutions([[1, 1, 1, 13], [1, -1, 0, 1], [0, -1, 1, 2]], P5.rows));
});

test('Doubt 1 (false): parallel planes break "more unknowns means infinitely many"; the Shake finds them', () => {
  assert.equal(d1Holds(D1_START), true, 'the starting planes do share a line');
  assert.equal(d1Holds(D1_COUNTER), false, 'the counterexample: parallel planes, no solution');
  const r = seeded(7);
  let randomHeld = 0;
  for (let i = 0; i < 50; i++) if (d1Holds(d1Random(r))) randomHeld++;
  assert.equal(randomHeld, 50, 'random non-parallel pairs always share a line');
  for (let i = 0; i < 20; i++) assert.equal(d1Holds(d1Random(r, 0)), false, 'the curated edge case breaks it');
});

test('Doubt 2 (true): weights that reach b put the point on every line, every time', () => {
  assert.ok(d2Holds(D2_SHOW.rows, D2_SHOW.w));
  assert.deepEqual(residuals(D2_SHOW.rows, D2_SHOW.w), [0, 0]);
  const r = seeded(11);
  for (let i = 0; i < 200; i++) { const c = d2Random(r, i % 5 === 0 ? 0 : -1); assert.ok(d2Holds(c.rows, c.w)); assert.ok(onAll(c.rows, c.w, 1e-9)); }
});

test('Law: "every point on the line through them" survives 500 cases; each near-miss breaks', () => {
  assert.equal(checkLaw(LAW_C08, LAW_C08.answer).survived, true);
  for (const which of ['two', 'between', 'plane']) {
    const res = checkLaw(LAW_C08, { which });
    assert.equal(res.survived, false, `${which} should break`);
    assert.ok(lawBroken(which, LAW_C08.edgeCases), `${which} broken by a curated edge case`);
  }
  // every generated case really has two solutions p and q
  const r = seeded(3);
  for (let i = 0; i < 300; i++) { const c = lawCase(r); assert.ok(onAll(c.rows, c.p, 1e-9) && onAll(c.rows, c.q, 1e-9)); }
});

test('build: check(rows, x) — crew version matches the tests; reference passes in CPython', () => {
  for (const t of buildCheck.tests) assert.deepEqual(checkCrew(t.args[0] as number[][], t.args[1] as number[]), t.expect, t.name);
  const r = seeded(5);
  const cases = Array.from({ length: 100 }, () => buildCheck.swarm!.gen(r, 'navigator'));
  const py = spawnSync('python3', ['-c', `${buildCheck.solution}\nimport json,sys\nfor a in json.loads(sys.stdin.read()):\n    print(json.dumps(check(*a)))`], { input: JSON.stringify([...buildCheck.tests.map((t) => t.args), ...cases]), encoding: 'utf8' });
  if (py.error) return; // no CPython here: the browser swarm covers it
  assert.equal(py.status, 0, py.stderr);
  const out = py.stdout.trim().split('\n').map((l) => JSON.parse(l));
  buildCheck.tests.forEach((t, i) => assert.deepEqual(out[i], t.expect, t.name));
  cases.forEach((c, i) => assert.deepEqual(out[buildCheck.tests.length + i], buildCheck.swarm!.crew(...c)));
  assert.deepEqual(fillAnswers(buildCheck.fill!, buildCheck.solution), ['row[:-1]', 'row[-1]']);
  const asm = spawnSync('python3', ['-c', `${buildCheck.assemble!.lines.join('\n')}\nimport json\nprint(json.dumps(check([[1, 1, 1, 6], [0, 2, 5, -4]], [5, 3, -2])))`], { encoding: 'utf8' });
  assert.deepEqual(JSON.parse(asm.stdout), [0, 0], 'the Assemble lines in order pass');
  // a decoy (adding the right side) fails a test
  const decoy = buildCheck.solution.replace('left - row[-1]', 'left + row[-1]');
  const py2 = spawnSync('python3', ['-c', `${decoy}\nimport json\nprint(json.dumps(check([[1, 1, 1, 6]], [5, 3, -2])))`], { encoding: 'utf8' });
  assert.notDeepEqual(JSON.parse(py2.stdout), [0]);
});

test('the maths library agrees with the chapter on every system', () => {
  const s = solve(P2.rows.map((r) => r.slice(0, 3)), P2.rows.map((r) => r[3]));
  assert.equal(s.kind, 'unique');
  assert.equal(solve(P4.rows.map((r) => r.slice(0, 3)), P4.rows.map((r) => r[3])).kind, 'none');
  assert.equal(solve(P3.rows.map((r) => r.slice(0, 3)), P3.rows.map((r) => r[3])).kind, 'infinite');
});

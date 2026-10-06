// Chapter 22: every puzzle's numbers and win check, the Drift frame, classical against modified Gram–Schmidt,
// the Doubts (canonical construction right, the Shake's cases break the false claims), the Law (target survives,
// near-misses break), LANTERN's procedure (the reference order succeeds, dropping or misplacing each key step
// fails as listed), Teo's message T4 (the same), and the two builds (references pass their tests and a swarm in
// CPython; decoys fail).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import * as L from '../../site/src/game/content/chapters/c22-gram-schmidt/logic.ts';
import { GRAM_SCHMIDT, GS_TESTS, QR, QR_TESTS, buildGramSchmidt, buildQr } from '../../site/src/game/content/chapters/c22-gram-schmidt/build.ts';
import { checkLaw, rng, rint } from '../../site/src/game/game/lawcheck.ts';
import { det, dot, identity, matMul, meq, norm, transpose, veq, type Mat } from '../../site/src/game/math/la.ts';

const close = (a: number, b: number, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol, `${a} ≉ ${b}`);

test('p1: q₁ = (0.6, 0.8); the shadow amount is 2; q₂ = (0.8, −0.6), already one unit long', () => {
  close(L.P1_K, 0.2);
  assert.ok(veq(L.P1_Q1, [0.6, 0.8]));
  close(L.P1_C, 2);
  assert.ok(veq(L.P1_V2, [0.8, -0.6]));
  close(norm(L.P1_V2), 1);
  assert.ok(veq(L.P1_Q2, [0.8, -0.6]));
  close(dot(L.P1_Q1, L.P1_Q2), 0);
  assert.ok(L.p1Q1Ok([0.6, 0.8]) && !L.p1Q1Ok([3, 4]) && !L.p1Q1Ok([1.2, 1.6]));
  assert.ok(L.p1Q2Ok([0.8, -0.6]) && !L.p1Q2Ok([-0.6, 0.8]));
  // the snap (k in steps of 0.05) reaches k = 0.2 exactly
  close(Math.round(0.2 / 0.05) * 0.05, 0.2, 1e-12);
});

test('p2 [H]: amounts 1/2, 1/2, 1/3; v₂ = (1/2, −1/2, 1), v₃ = (−2/3, 2/3, 2/3); q’s orthonormal to 10⁻⁹', () => {
  close(L.P2_C21, 1 / 2); close(L.P2_C31, 1 / 2); close(L.P2_C32, 1 / 3);
  assert.ok(veq(L.P2_V2, [1 / 2, -1 / 2, 1]));
  assert.ok(veq(L.P2_V3, [-2 / 3, 2 / 3, 2 / 3]));
  assert.ok(veq(L.P2_LEN2, [2, 3 / 2, 4 / 3]));
  const s2 = Math.SQRT2, s3 = Math.sqrt(3), s6 = Math.sqrt(6);
  assert.ok(veq(L.P2_Q[0], [1 / s2, 1 / s2, 0]));
  assert.ok(veq(L.P2_Q[1], [1 / s6, -1 / s6, 2 / s6]));
  assert.ok(veq(L.P2_Q[2], [-1 / s3, 1 / s3, 1 / s3]));
  assert.ok(L.maxOffDot(L.P2_Q) < 1e-9);
  // the misconception: shadow on the original x₂ instead of the finished v₂
  const wrong = [0, 1, 1].map((x, i) => x - 0.5 * L.P2_V1[i] - 0.5 * L.P2_X[1][i]);
  assert.ok(Math.abs(dot(wrong, L.P2_V2)) > 0.1);
});

test('p3 [D]: (5, 5) is (7, −1) in Ilse’s grid; QᵀQ = I; Q⁻¹ = Qᵀ', () => {
  assert.ok(veq(L.P3_C, [7, -1]));
  assert.ok(meq(matMul(transpose(L.P3_Q), L.P3_Q), identity(2)));
  assert.ok(veq([7 * L.P3_Q1[0] - L.P3_Q2[0], 7 * L.P3_Q1[1] - L.P3_Q2[1]], [5, 5]));
  assert.ok(L.p3Won([7, -1]) && !L.p3Won([5, 5]) && !L.p3Won([-1, 7]));
});

test('p4: the safe moves are the turn, the flip and the swap; squash keeps area; grow has square columns 1.41 long', () => {
  assert.deepEqual(L.SAFE, ['turn', 'flip', 'swap']);
  const by = (id: string) => L.MOVES.find((m) => m.id === id)!.M;
  close(det(by('squash')), 1);
  close(det(by('shear')), 1);
  close(dot([1, -1], [1, 1]), 0);
  close(norm([1, -1]), Math.SQRT2);
  assert.ok(L.p4Won(['turn', 'flip', 'swap']) && L.p4Won(['swap', 'turn', 'flip']));
  assert.ok(!L.p4Won(['turn', 'flip', 'swap', 'squash']) && !L.p4Won(['turn', 'flip']) && !L.p4Won(['turn', 'squash', 'swap']));
});

test('p5: the Drift frame (1.03, 0.98, 1.01; up and forward 88.6° apart) squares up, in order, to a level frame', () => {
  L.DRIFT.forEach((v, i) => close(norm(v), L.DRIFT_LENGTHS[i], 1e-12));
  close(L.angleDeg(L.DRIFT[0], L.DRIFT[1]), 88.6, 1e-9);
  close(L.angleDeg(L.DRIFT[0], L.DRIFT[2]), 90); close(L.angleDeg(L.DRIFT[1], L.DRIFT[2]), 90);
  close(L.horizonLean(L.DRIFT[1]), 1.4, 1e-9);
  assert.ok(L.starRatio(L.DRIFT[0], L.DRIFT[1]) > 1.02, 'the star looks egg-shaped');
  assert.ok(veq(L.DRIFT_FIXED[0], [0, 0, 1]) && veq(L.DRIFT_FIXED[1], [1, 0, 0]) && veq(L.DRIFT_FIXED[2], [0, 1, 0]));
  assert.ok(L.driftFixed(L.DRIFT_FIXED));
  close(L.starRatio(L.DRIFT_FIXED[0], L.DRIFT_FIXED[1]), 1);
  assert.ok(!L.driftFixed(L.DRIFT));
  // squaring forward first keeps the lean: square and unit, but not level
  const fwdFirst = [L.DRIFT[1], L.DRIFT[0], L.DRIFT[2]];
  const qs = L.modifiedGS(fwdFirst);
  const frame = [qs[1], qs[0], qs[2]];
  assert.ok(Math.abs(L.horizonLean(frame[1]) - 1.4) < 1e-9 && !L.driftFixed(frame));
});

test('p6 [H]: R = QᵀA = [[√2, 1/√2], [0, 3/√6]]; QR = A', () => {
  assert.ok(meq(L.P6_R, [[Math.SQRT2, 1 / Math.SQRT2], [0, 3 / Math.sqrt(6)]]));
  assert.ok(meq(matMul(L.P6_QR.Q, L.P6_R), L.P6_A));
  close(L.P6_R[1][0], 0, 1e-12);
});

test('p7 [S]: classical Gram–Schmidt ends 45° apart on nearly parallel arrows; modified stays at 90°', () => {
  const c = L.classicalGS(L.P7_X), m = L.modifiedGS(L.P7_X);
  close(L.angleDeg(c[1], c[2]), 45, 1e-6);
  close(L.angleDeg(m[1], m[2]), 90, 1e-6);
  // on paper both are the same: with well-separated arrows they agree
  const xs = [[1, 1, 0], [1, 0, 1], [0, 1, 1]];
  L.classicalGS(xs).forEach((q, i) => assert.ok(veq(q, L.modifiedGS(xs)[i])));
});

test('Doubt (F) determinant 1: the shear breaks it; every Shake case breaks it; the identity agrees', () => {
  assert.ok(L.det1Holds(identity(2)));
  assert.ok(!L.det1Holds([[1, 1], [0, 1]]) && !L.det1Holds([[2, 0], [0, 0.5]]));
  for (const M of [[[1, 1], [0, 1]], [[1, 0], [1, 1]], [[2, 1], [1, 1]], [[1, 2], [0, 1]], [[1, -1], [1, 0]], [[2, 3], [1, 2]], [[1, 0], [-2, 1]], [[3, 2], [1, 1]]]) {
    close(det(M), 1); assert.ok(!L.det1Holds(M));
  }
  assert.ok(L.det1Holds([[0.6, -0.8], [0.8, 0.6]]), 'a turn has determinant 1 and is safe');
});

test('Doubt (F) perpendicular columns: stretched square columns break it; every Shake case breaks it', () => {
  assert.ok(L.perpHolds(identity(2)));
  for (const M of [[[2, 0], [0, 2]], [[1, -1], [1, 1]], [[2, 0], [0, 1]], [[1, 2], [2, -1]], [[0, -2], [1, 0]], [[3, 0], [0, 0.5]], [[1, 1], [-1, 1]], [[2, -1], [1, 2]]]) {
    assert.ok(!L.perpHolds(M), JSON.stringify(M));
  }
});

test('Doubt (T) Gram–Schmidt keeps the plane: holds for 300 random pairs and the edge cases', () => {
  const r = rng(22);
  for (let i = 0; i < 300; i++) {
    let a: number[], b: number[];
    do { a = [rint(r, -2, 2), rint(r, -2, 2), rint(r, -2, 2)]; b = [rint(r, -2, 2), rint(r, -2, 2), rint(r, -2, 2)]; } while (norm([a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]) < 1);
    assert.ok(L.gsPlaneHolds(a, b));
  }
  for (const [a, b] of [[[1, 0, 0], [1, 0.1, 0]], [[1, 0, 0], [0, 2, 0]], [[3, 1, 1], [1, 1, 2]]]) assert.ok(L.gsPlaneHolds(a, b));
});

test('Law: QᵀQ = I exactly when the columns are orthonormal survives; rows / at right angles / one unit long break', () => {
  assert.equal(checkLaw(L.lawCore, L.lawCore.answer).survived, true);
  for (const f of [{ part: 'rows', prop: 'both' }, { part: 'cols', prop: 'perp' }, { part: 'cols', prop: 'unit' }, { part: 'rows', prop: 'perp' }, { part: 'rows', prop: 'unit' }]) {
    assert.equal(checkLaw(L.lawCore, f).survived, false, `${f.part} ${f.prop}`);
  }
});

test('Procedure: the reference order squares (2, 0, 0), (1, 2, 0), (1, 1, 2); each missing or misplaced key step fails as listed', () => {
  const ok = L.runProcedure(L.PROC_REF);
  assert.equal(ok.fault, 'ok');
  assert.ok(veq(ok.out[0], [1, 0, 0]) && veq(ok.out[1], [0, 1, 0]) && veq(ok.out[2], [0, 0, 1]));
  // K1 FOR EACH missing: only the first arrow is done
  assert.equal(L.runProcedure(['sub', 'scale']).fault, 'noloop');
  // K2 "each earlier" missing (the decoy: first only): the third arrow leans against the second
  const first = L.runProcedure(['each', 'subfirst', 'scale']);
  assert.equal(first.fault, 'first');
  assert.ok(Math.abs(dot(first.out[2], first.out[1])) > 0.5);
  // subtracting on the original arrows: still leans
  assert.equal(L.runProcedure(['each', 'suborig', 'scale']).fault, 'orig');
  // no subtraction at all
  assert.equal(L.runProcedure(['each', 'scale']).fault, 'nosub');
  // K3 scale missing: square but stretched (lengths 2, 2, 2)
  const noscale = L.runProcedure(['each', 'sub']);
  assert.equal(noscale.fault, 'noscale');
  assert.ok(noscale.lengths.every((l) => Math.abs(l - 2) < 1e-9));
  // scale before subtracting: square but not unit
  assert.equal(L.runProcedure(['each', 'scale', 'sub']).fault, 'noscale');
  // FOR EACH placed last: the loop does nothing
  assert.notEqual(L.runProcedure(['sub', 'scale', 'each']).fault, 'ok');
});

test('Teach Teo T4: the reference aims at the Lantern; missing K1, K2 or K3 (or the decoys) miss visibly', () => {
  const ok = L.runTeo(L.TEO_REF);
  assert.equal(ok.fault, 'ok');
  assert.ok(ok.off < 1e-6);
  close(ok.readings![0], 3); close(ok.readings![1], 7 / Math.SQRT2); close(ok.readings![2], 4);
  assert.deepEqual(ok.pair, [0, 2]);
  // K3 missing: the readings come out scaled (6 instead of 3)
  const scaled = L.runTeo(['check', 'read', 'aim']);
  assert.equal(scaled.fault, 'scaled');
  assert.equal(scaled.readings![0], 6);
  assert.ok(scaled.off > 30);
  // K3 misplaced: read before making the headings one unit long
  assert.equal(L.runTeo(['read', 'unit', 'check', 'aim']).fault, 'readfirst');
  // K2 missing: the first two headings overlap
  const nocheck = L.runTeo(['unit', 'read', 'aim']);
  assert.equal(nocheck.fault, 'nocheck');
  assert.ok(nocheck.off > 20);
  // K1 missing: nothing to aim with
  assert.equal(L.runTeo(['unit', 'check', 'aim']).fault, 'noread');
  // no aim
  assert.equal(L.runTeo(['unit', 'check', 'read']).fault, 'noaim');
  // decoys
  assert.equal(L.runTeo(['unit', 'check', 'read', 'max']).fault, 'max');
  assert.equal(L.runTeo(['unit', 'check', 'half']).fault, 'half');
  // reading = shadow length × heading length
  close(dot(L.TEO_SIGNAL, L.TEO_HEADINGS[0]), 3 * 2);
});

test('the Anchor’s arms (TT1) square up to our own grid', () => {
  assert.ok(veq(L.ANCHOR_SQUARED[0], [1, 0, 0]) && veq(L.ANCHOR_SQUARED[1], [0, 1, 0]) && veq(L.ANCHOR_SQUARED[2], [0, 0, 1]));
});

const LIB = `
def add(v, w):
    return [a + b for a, b in zip(v, w)]
def scale(c, v):
    return [c * x for x in v]
def dot(v, w):
    total = 0
    for i in range(len(v)):
        total += v[i] * w[i]
    return total
def length(v):
    return math.sqrt(dot(v, v))
def lincomb(cs, vs):
    total = scale(0, vs[0])
    for c, v in zip(cs, vs):
        total = add(total, scale(c, v))
    return total
def matvec(A, x):
    columns = [[row[j] for row in A] for j in range(len(x))]
    return lincomb(x, columns)
def matmul(A, B):
    columns = [matvec(A, [row[j] for row in B]) for j in range(len(B[0]))]
    return [[c[i] for c in columns] for i in range(len(A))]
def transpose(A):
    return [[row[j] for row in A] for j in range(len(A[0]))]
`;

function runPy(fn: string, code: string, cases: { args: unknown[]; expect: unknown }[], lib = LIB): boolean[] {
  const prog = `import json, math\n${lib}\n${code}\ndef close(a, b):\n    if a is None or b is None:\n        return a is None and b is None\n    if isinstance(a, (list, tuple)):\n        return isinstance(b, (list, tuple)) and len(a) == len(b) and all(close(x, y) for x, y in zip(a, b))\n    return abs(a - b) < 1e-6\nres = []\nfor a, e in json.loads(${JSON.stringify(JSON.stringify(cases.map((t) => [t.args, t.expect])))}):\n    try:\n        res.append(close(${fn}(*a), e))\n    except Exception:\n        res.append(False)\nprint(json.dumps(res))\n`;
  return JSON.parse(execFileSync('python3', ['-I', '-c', prog], { encoding: 'utf8' }));
}

const decoysFail = (b: typeof buildGramSchmidt, tests: { args: unknown[]; expect: unknown }[], lib: string) => {
  for (const decoy of b.assemble!.decoys ?? []) {
    const lines = b.assemble!.lines.slice();
    const key = (l: string) => `${l.match(/^ */)![0].length}:${l.trim().split(/[ =(]/)[0]}`;
    let at = -1;
    lines.forEach((l, i) => { if (i >= 2 && key(l) === key(decoy)) at = i; });
    assert.ok(at >= 0, `decoy has a line to replace: ${decoy}`);
    lines[at] = decoy;
    assert.ok(runPy(b.fn, `${lines.join('\n')}\n`, tests, lib).some((x) => !x), `decoy fails: ${decoy}`);
  }
};

test('build: gram_schmidt passes its tests and a swarm (with a wasted arrow); each decoy fails', () => {
  assert.ok(runPy('gram_schmidt', GRAM_SCHMIDT, GS_TESTS).every(Boolean), 'tests');
  const r = rng(22);
  const cases = Array.from({ length: 150 }, (_, i) => { const args = L.gsCase(r, ['cadet', 'navigator', 'commander'][i % 3]); return { args, expect: buildGramSchmidt.swarm!.crew(...args) }; });
  assert.ok(cases.some((c) => (c.args[0] as number[][]).length > (c.expect as number[][]).length), 'the swarm includes a wasted arrow');
  assert.ok(runPy('gram_schmidt', GRAM_SCHMIDT, cases).every(Boolean), 'swarm');
  for (const t of GS_TESTS) { const got = buildGramSchmidt.swarm!.crew(...t.args) as number[][]; assert.ok(got.length === (t.expect as number[][]).length && got.every((q, i) => veq(q, (t.expect as number[][])[i])), `crew agrees: ${t.name}`); }
  decoysFail(buildGramSchmidt, GS_TESTS, LIB);
});

test('build: qr passes its tests and a swarm (positive diagonal, so one right answer); each decoy fails', () => {
  const lib = `${LIB}\n${GRAM_SCHMIDT}`;
  assert.ok(runPy('qr', QR, QR_TESTS, lib).every(Boolean), 'tests');
  const r = rng(23);
  const cases = Array.from({ length: 150 }, (_, i) => { const args = L.qrCase(r, ['cadet', 'navigator', 'commander'][i % 3]); return { args, expect: buildQr.swarm!.crew(...args) }; });
  for (const c of cases) { const [Q, R] = c.expect as [Mat, Mat]; assert.ok(R.every((row, i) => row[i] > 0)); assert.ok(meq(matMul(Q, R), c.args[0] as Mat)); }
  assert.ok(runPy('qr', QR, cases, lib).every(Boolean), 'swarm');
  for (const t of QR_TESTS) { const [Q, R] = buildQr.swarm!.crew(...t.args) as [Mat, Mat]; const [eQ, eR] = t.expect as [Mat, Mat]; assert.ok(meq(Q, eQ) && meq(R, eR), `crew agrees: ${t.name}`); }
  decoysFail(buildQr as typeof buildGramSchmidt, QR_TESTS, lib);
});

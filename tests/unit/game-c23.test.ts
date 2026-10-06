// Chapter 23: every puzzle's numbers and win check, the Collapse fit data (TT17: the fit returns C exactly,
// the third column rounds to 2.004, the leftover holds the knock and nothing else stands out), the Doubts
// and the Act VIII Review (canonical construction right, the Shake's cases break the false claims), the Law
// (target survives 500 fits, each near-miss breaks) and the build (reference passes its tests and a swarm
// in CPython; decoys fail).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import * as L from '../../site/src/game/content/chapters/c23-least-squares/logic.ts';
import { LEAST_SQUARES, LS_TESTS, buildLeastSquares } from '../../site/src/game/content/chapters/c23-least-squares/build.ts';
import { checkLaw, rng } from '../../site/src/game/game/lawcheck.ts';
import { col, dot, matVec, meq, norm, transpose, veq } from '../../site/src/game/math/la.ts';
import { C, C2 } from '../../site/src/game/content/truth.ts';

const close = (a: number, b: number, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol, `${a} ≉ ${b}`);

test('p1: readings 1, 2, 2, 4: best line y = 0.9 + 0.9t, area 0.7, through none of them', () => {
  assert.ok(veq(L.P1_FIT, [0.9, 0.9]));
  close(L.P1_BEST, 0.7);
  assert.equal(L.throughCount(L.P1_PTS, 0.9, 0.9), 0);
  assert.ok(L.p1Won(0.9, 0.9));
  assert.ok(!L.p1Won(1, 1), 'a line through two readings (0, 1) and (1, 2)');
  assert.ok(L.area(L.P1_PTS, 1, 1) > L.P1_BEST * 1.01);
  assert.ok(!L.p1Won(2.25, 0), 'the level line at the mean');
});

test('p2 [D]: b = (1, 2, 4); AᵀA = [[3, 3], [3, 5]], Aᵀb = (7, 10), x̂ = (5/6, 3/2), p = (5/6, 7/3, 23/6), leftover (1/6, −1/3, 1/6)', () => {
  assert.ok(meq(L.P2_ATA, [[3, 3], [3, 5]]));
  assert.ok(veq(L.P2_ATB, [7, 10]));
  assert.ok(veq(L.P2_X, [5 / 6, 3 / 2]));
  assert.ok(veq(L.P2_P, [5 / 6, 7 / 3, 23 / 6]));
  assert.ok(veq(L.P2_R, [1 / 6, -1 / 3, 1 / 6]));
  close(dot(L.P2_R, L.P2_ONES), 0); close(dot(L.P2_R, L.P2_T), 0);
  // the total square area on the board is the squared length of the leftover in data space
  close(L.area(L.P2_TS.map((t, i) => [t, L.P2_B[i]]), 5 / 6, 3 / 2), dot(L.P2_R, L.P2_R));
  assert.ok(L.p2Won([5 / 6, 3 / 2]) && !L.p2Won([1, 1.5]) && !L.p2Won([2, 0]));
  // the drag snaps weights to sixths: 5/6 and 9/6
  close(Math.round((5 / 6) * 6) / 6, 5 / 6); close(Math.round(1.5 * 6) / 6, 1.5);
});

test('p3 [H]: AᵀA = [[5, 10], [10, 30]], Aᵀb = (15, 38), y = 1.4 + 0.8t, area 3.6', () => {
  assert.ok(meq(L.P3_ATA, [[5, 10], [10, 30]]));
  assert.ok(veq(L.P3_ATB, [15, 38]));
  assert.ok(veq(L.P3_FIT, [1.4, 0.8]));
  close(L.P3_AREA, 3.6);
});

test('p4: best line 411.98 − 1.006t reaches 380 at hour 31.8; the degree-5 curve through all six says −316 at hour 10', () => {
  close(L.P4_FIT[0], 411.981, 1e-3);
  close(L.P4_FIT[1], -1.006, 1e-3);
  assert.equal(L.P4_HOUR.toFixed(1), '31.8');
  L.P4_TS.forEach((t, i) => close(L.curve5(t), L.P4_YS[i], 1e-6));
  assert.equal(Math.round(L.P4_CURVE10), -316);
  assert.ok(L.p4Won(L.P4_FIT[0], L.P4_FIT[1], 31.8, 0.1));
  assert.ok(!L.p4Won(L.P4_FIT[0], L.P4_FIT[1], 10, 0.5), 'the wrong hour');
  assert.ok(!L.p4Won(412, -0.5, 64, 0.5), 'a line that is not the best fit');
  close(L.hourAt(L.P4_FIT[0], L.P4_FIT[1]), L.P4_HOUR);
});

test('TT17 / p5 [SP]: the least-squares fit of the twenty pairs returns C exactly; third column (1, 1, 2.004)', () => {
  assert.equal(L.FIT.X.length, 20);
  assert.ok(meq(L.FITTED, C, 1e-9));
  assert.ok(veq(L.THIRD(L.FITTED).map((x) => Math.round(x * 1000) / 1000), [1, 1, 2.004]));
  assert.ok(veq(col(C2, 2), [1, 1, 2]));
  assert.equal(L.THIRD(L.FITTED)[2].toFixed(2), '2.00', 'to two decimals it looks like the two-decimal model');
  // each column of the leftover is perpendicular to the column space of the before-positions
  const Xt = transpose(L.FIT.X);
  for (let j = 0; j < 3; j++) assert.ok(norm(matVec(Xt, col(L.FIT.E, j))) < 1e-9);
  // the leftover of the fit is exactly E
  assert.ok(veq(L.LEFTOVER, L.FIT.E.flat(), 1e-9));
  // QR gives the same pulse
  for (let i = 0; i < 3; i++) assert.ok(veq(L.qrSolve(L.FIT.X, col(L.FIT.Y, i)), C[i], 1e-9));
  assert.ok(L.p5ReadOk([1, 1, 2.004]) && !L.p5ReadOk([1, 1, 2]));
  // the drones' starting positions stay near the stern (within 4 buoy units)
  assert.ok(L.FIT.X.flat().every((x) => Math.abs(x) < 4));
});

test('p6: the knock (3 short, 3 long, 3 short) stands out; noise elsewhere is about 0.002', () => {
  const s = L.LEFTOVER;
  assert.equal(s.length, 60);
  const inKnock = (i: number) => i >= L.KNOCK_START && i < L.KNOCK_END;
  const taps = s.map((_, i) => inKnock(i) && L.KNOCK[i - L.KNOCK_START] !== '.');
  const tapMin = Math.min(...s.filter((_, i) => taps[i]));
  const restMax = Math.max(...s.map((v, i) => (taps[i] ? 0 : Math.abs(v))));
  assert.ok(tapMin > 0.009, `taps ${tapMin}`);
  assert.ok(restMax < 0.005, `rest ${restMax}`);
  assert.ok(tapMin > 2 * restMax);
  // the pattern: groups of single and triple taps
  assert.equal(L.KNOCK.replace(/\./g, ' ').trim().split(/ +/).map((g) => g.length).join(','), '1,1,1,3,3,3,1,1,1');
  assert.ok(L.p6Won(L.KNOCK_START, L.KNOCK_END, 0));
  assert.ok(L.p6Won(L.KNOCK_START - 1, L.KNOCK_END + 1, 1) && !L.p6Won(L.KNOCK_START - 1, L.KNOCK_END, 0));
  assert.ok(!L.p6Won(5, 55, 1));
  // the noise is about 0.002 per reading
  const rest = s.filter((_, i) => !inKnock(i));
  const rms = Math.sqrt(rest.reduce((a, x) => a + x * x, 0) / rest.length);
  assert.ok(rms > 0.001 && rms < 0.003, `rms ${rms}`);
});

test('p7 [S]: the parabola; at hours 300–304 the normal equations keep about 6 digits, QR about 14', () => {
  assert.ok(veq(L.P7_FIT0, [39 / 35, 48 / 35, -1 / 7], 1e-9));
  assert.ok(L.errOf(L.P7_NE) > 1e-7 && L.errOf(L.P7_NE) < 1e-4);
  assert.ok(L.errOf(L.P7_QR) < 1e-11);
});

test('Doubt (F) through as many points: collinear readings agree; the Shake’s cases and edges break it', () => {
  assert.ok(L.throughHolds([[0, 1], [1, 2], [2, 3], [3, 4]]));
  assert.ok(!L.throughHolds(L.P1_PTS) && !L.throughHolds([[0, 1], [1, 3], [2, 2], [3, 5]]));
  const r = rng(23);
  let broke = 0;
  for (let i = 0; i < 20; i++) if (!L.throughHolds(L.randPts(r, 4, 1))) broke++;
  assert.ok(broke >= 10);
});

test('Doubt (F) perpendicular distances: the two lines differ for the edges and most Shake cases', () => {
  assert.ok(L.perpHolds([[0, 1], [1, 2], [2, 3], [3, 4]]));
  assert.ok(!L.perpHolds(L.P1_PTS) && !L.perpHolds([[0, 0], [1, 3], [2, 1], [3, 4]]));
  const r = rng(29);
  let broke = 0;
  for (let i = 0; i < 20; i++) if (!L.perpHolds(L.randPts(r, 4, 2))) broke++;
  assert.ok(broke >= 10);
});

test('Doubt (T) exact readings: least squares returns the exact line for every line', () => {
  for (const [c0, c1] of [[1, 0.5], [2, 0], [4, -1.5], [-1, 2]]) assert.ok(L.exactHolds(c0, c1, [0, 1, 2, 3]));
  const r = rng(31);
  for (let i = 0; i < 200; i++) assert.ok(L.exactHolds(Math.floor(r() * 13 - 4) / 2, Math.floor(r() * 9 - 4) / 2, [0, 1, 2, 3]));
});

test('Review: curve through every reading (F) breaks on its edges; residual ⊥ columns (T) always holds', () => {
  const NOISY = [[0, 1.3], [1, 1.3], [2, 2.25], [3, 2.2], [4, 3.1]];
  assert.ok(!L.curveHolds(NOISY, [5, 3.5]));
  assert.ok(!L.curveHolds([[0, 1], [1, 2.5], [2, 2], [3, 3.5], [4, 3]], [5, 3.5]));
  const m = L.curveFits(NOISY, [5, 3.5]);
  assert.ok(m.curve > 3 * m.line);
  const r = rng(37);
  for (let i = 0; i < 200; i++) assert.ok(L.residualHolds(L.randPts(r, 4, 2)));
  for (const pts of [[[0, 1], [1, 2], [2, 3], [3, 4]], [[0, 5], [1, -1], [2, 4], [3, 0]], [[0, 0], [1, 0], [2, 0], [3, 6]]]) assert.ok(L.residualHolds(pts));
});

test('Law: the residual is perpendicular to every column survives 500 fits; each near-miss breaks', () => {
  assert.equal(checkLaw(L.lawCore, L.lawCore.answer).survived, true);
  for (const f of [{ rel: 'perp', to: 'line' }, { rel: 'perp', to: 'b' }, { rel: 'par', to: 'cols' }, { rel: 'par', to: 'line' }, { rel: 'par', to: 'b' }]) {
    assert.equal(checkLaw(L.lawCore, f).survived, false, `${f.rel} ${f.to}`);
  }
  // the level-line edge case agrees with "perpendicular to the line", and still the near-miss breaks elsewhere
  assert.ok(L.lawCore.holds({ rel: 'perp', to: 'line' }, { pts: [[0, 2], [1, 3], [2, 3], [3, 2]] }));
});

const LIB = `
def add(v, w):
    return [a + b for a, b in zip(v, w)]
def scale(c, v):
    return [c * x for x in v]
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
def rref(M):
    M = [row[:] for row in M]
    rows, cols = len(M), len(M[0])
    r = 0
    for c in range(cols):
        p = next((i for i in range(r, rows) if abs(M[i][c]) > 1e-9), None)
        if p is None:
            continue
        M[r], M[p] = M[p], M[r]
        pivot = M[r][c]
        M[r] = [x / pivot for x in M[r]]
        for i in range(rows):
            if i != r and abs(M[i][c]) > 1e-12:
                f = M[i][c]
                M[i] = [a - f * b for a, b in zip(M[i], M[r])]
        r += 1
        if r == rows:
            break
    return [[0 if abs(x) < 1e-9 else x for x in row] for row in M]
def solve(M):
    n = len(M[0]) - 1
    R = rref(M)
    pivots = []
    for row in R:
        lead = next((c for c, x in enumerate(row) if x != 0), None)
        if lead is not None:
            pivots.append(lead)
    if n in pivots:
        return {'kind': 'none', 'point': None, 'directions': []}
    point = [0] * n
    for i, pc in enumerate(pivots):
        point[pc] = R[i][n]
    free = [c for c in range(n) if c not in pivots]
    directions = []
    for f in free:
        d = [0] * n
        d[f] = 1
        for i, pc in enumerate(pivots):
            d[pc] = -R[i][f]
        directions.append(d)
    return {'kind': 'many' if free else 'one', 'point': point, 'directions': directions}
`;

function runPy(fn: string, code: string, cases: { args: unknown[]; expect: unknown }[]): boolean[] {
  const prog = `import json, math\n${LIB}\n${code}\ndef close(a, b):\n    if a is None or b is None:\n        return a is None and b is None\n    if isinstance(a, (list, tuple)):\n        return isinstance(b, (list, tuple)) and len(a) == len(b) and all(close(x, y) for x, y in zip(a, b))\n    return abs(a - b) < 1e-6\nres = []\nfor a, e in json.loads(${JSON.stringify(JSON.stringify(cases.map((t) => [t.args, t.expect])))}):\n    try:\n        res.append(close(${fn}(*a), e))\n    except Exception:\n        res.append(False)\nprint(json.dumps(res))\n`;
  return JSON.parse(execFileSync('python3', ['-I', '-c', prog], { encoding: 'utf8' }));
}

test('build: least_squares passes its tests and a swarm; each decoy fails; it fits the Collapse pulse (the install)', () => {
  assert.ok(runPy('least_squares', LEAST_SQUARES, LS_TESTS).every(Boolean), 'tests');
  const r = rng(23);
  const cases = Array.from({ length: 150 }, (_, i) => { const args = L.lsCase(r, ['cadet', 'navigator', 'commander'][i % 3]); return { args, expect: buildLeastSquares.swarm!.crew(...args) }; });
  assert.ok(runPy('least_squares', LEAST_SQUARES, cases).every(Boolean), 'swarm');
  for (const t of LS_TESTS) assert.ok(veq(buildLeastSquares.swarm!.crew(...t.args) as number[], t.expect as number[]), `crew agrees: ${t.name}`);
  for (const decoy of buildLeastSquares.assemble!.decoys ?? []) {
    const lines = buildLeastSquares.assemble!.lines.slice();
    const key = (l: string) => `${l.match(/^ */)![0].length}:${l.trim().split(/[ =(]/)[0]}`;
    let at = -1;
    lines.forEach((l, i) => { if (i >= 2 && key(l) === key(decoy)) at = i; });
    assert.ok(at >= 0, `decoy has a line to replace: ${decoy}`);
    lines[at] = decoy;
    assert.ok(runPy('least_squares', `${lines.join('\n')}\n`, LS_TESTS).some((x) => !x), `decoy fails: ${decoy}`);
  }
  // the install: the player's reference routine fits all three rows of the pulse to the backup within 1e-6
  const rows = [0, 1, 2].map((i) => ({ args: [L.FIT.X, col(L.FIT.Y, i)], expect: L.FITTED[i] }));
  assert.ok(runPy('least_squares', LEAST_SQUARES, rows).every(Boolean), 'the Collapse fit');
});

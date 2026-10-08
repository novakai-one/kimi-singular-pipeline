import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkLaw, rng } from '../../site/src/game/game/lawcheck.ts';
import { COPY } from '../../site/src/game/content/chapters/d01-dot/copy.ts';
import { dot, newBands, holdReading, p2Won, sensorTip, snapDegrees, doubtHolds, lawCore, buildCases, mismatch } from '../../site/src/game/content/chapters/d01-dot/logic.ts';

test('p1 holds each band for a full second, in either order', () => {
  for (const readings of [[12, 0], [0, 12]]) {
    const state = newBands();
    assert.equal(holdReading(state, readings[0], 0).won, false);
    assert.equal(holdReading(state, readings[0], 999).won, false);
    assert.equal(holdReading(state, readings[0], 1000).won, false);
    assert.equal(holdReading(state, readings[1], 1100).won, false);
    assert.equal(holdReading(state, readings[1], 2099).won, false);
    assert.equal(holdReading(state, readings[1], 2100).won, true);
  }
});
test('p1 leaving a band resets its timer; negative readings bark without winning', () => {
  const state = newBands();
  holdReading(state, 12, 0); holdReading(state, 6, 999);
  holdReading(state, 12, 1000);
  assert.equal(holdReading(state, 12, 1999).won, false);
  assert.equal(state.biggest, false);
  holdReading(state, -12, 2000);
  assert.equal(holdReading(state, -12, 2999).bark, false);
  const result = holdReading(state, -12, 3000);
  assert.equal(result.bark, true); assert.equal(result.won, false);
  assert.equal(holdReading(state, -12, 4000).bark, false);
  assert.equal(newBands().biggest, false);
});
test('sensor radius stays 3 with the authored angular steps; bands include their tolerance boundaries', () => {
  for (const difficulty of ['cadet', 'navigator', 'commander']) {
    const step = snapDegrees(difficulty);
    for (let angle = -180; angle <= 180; angle += 0.7) {
      const tip = sensorTip(Math.cos(angle * Math.PI / 180), Math.sin(angle * Math.PI / 180), step);
      assert.ok(Math.abs(Math.hypot(...tip) - 3) < 1e-12);
      const degrees = Math.atan2(tip[1], tip[0]) * 180 / Math.PI;
      assert.ok(Math.abs(degrees / step - Math.round(degrees / step)) < 1e-10);
    }
  }
  for (const reading of [11.95, 12.05]) {
    const state = newBands(); holdReading(state, reading, 0); holdReading(state, reading, 1000);
    assert.equal(state.biggest, true);
  }
  for (const reading of [-0.05, 0.05]) {
    const state = newBands(); holdReading(state, reading, 0); holdReading(state, reading, 1000);
    assert.equal(state.perpendicular, true);
  }
});
test('p2 accepts 15 within ±0.01, rejects the three specified misconceptions', () => {
  assert.equal(dot([3, 4], [5, 0]), 15);
  for (const value of [14.99, 15, 15.01]) assert.ok(p2Won(value));
  for (const value of [7, 25, 35, 14.989, 15.011, NaN, Infinity]) assert.ok(!p2Won(value));
});
test('doubt: non-zero perpendicular arrows refute the claim; a zero arrow satisfies it', () => {
  assert.equal(doubtHolds([3, 4], [-4, 3]), false);
  assert.equal(doubtHolds([0, 0], [1, 2]), true);
  assert.equal(doubtHolds([3, 4], [5, 0]), true);
});
test('law: target survives 500 seeded cases; every near-miss breaks', () => {
  assert.equal(checkLaw(lawCore, lawCore.answer).survived, true);
  for (const cond of ['parallel', 'opposite', 'equal']) assert.equal(checkLaw(lawCore, { cond }).survived, false, cond);
});
test('build: 200 integer pairs in the authored range; reference passes and decoy fails with the authored format', () => {
  const cases = buildCases(rng(0xd01));
  assert.equal(cases.length, 200);
  for (const c of cases) {
    for (const v of c.args) for (const x of v) assert.ok(Number.isInteger(x) && x >= -9 && x <= 9);
    assert.equal(dot(c.args[0], c.args[1]), c.expect);
  }
  const c = cases.find((c) => c.args[0].reduce((a, x) => a + x, 0) + c.args[1].reduce((a, x) => a + x, 0) !== c.expect)!;
  const wrong = c.args.flat().reduce((a, x) => a + x, 0);
  const message = mismatch(COPY.build.feedback, c.args, String(wrong), String(c.expect));
  assert.equal(message, COPY.build.feedback.replace('{a}', JSON.stringify(c.args[0])).replace('{b}', JSON.stringify(c.args[1])).replace('{r}', String(c.expect)).replace('{y}', String(wrong)));
});

import { PuzzleLifecycle, puzzleLifecycle, beginPuzzleBeat, bindNumericAnswer, BuildGate, ReadingChannel, restoreTestsLine } from '../../site/src/game/content/chapters/d01-dot/lifecycle.ts';
import { compactBeatChrome, TransientSlot } from '../../site/src/game/ui/beat-chrome.ts';

test('Commander typing previews complete and partial answers; only Enter submits the current field value', () => {
  const input = Object.assign(new EventTarget(), { value: '' });
  const submitted: number[] = [];
  const previews: (number | null)[] = [];
  let wins = 0;
  bindNumericAnswer(input as unknown as HTMLInputElement, (value) => previews.push(value), (value) => {
    submitted.push(value);
    if (p2Won(value)) wins++;
  });
  const type = (value: string) => { input.value = value; input.dispatchEvent(new Event('input')); };
  const enter = () => {
    const event = Object.assign(new Event('keydown', { cancelable: true }), { key: 'Enter' });
    input.dispatchEvent(event);
    assert.equal(event.defaultPrevented, true, 'confirmation must not trigger the next control too');
  };
  for (const prefix of ['1', '15', '15.', '15.1']) {
    type(prefix);
    assert.deepEqual(submitted, [], `typing ${prefix} must not submit a correct prefix`);
    assert.equal(wins, 0);
  }
  assert.deepEqual(previews, [1, 15, 15, 15.1]);
  enter();
  assert.deepEqual(submitted, [15.1]);
  assert.equal(wins, 0, 'the complete confirmed value is outside tolerance');
  for (const value of ['7', '25', '35']) {
    type(value);
    assert.equal(previews.at(-1), Number(value), 'authored misconception feedback remains available during preview');
    enter();
  }
  assert.deepEqual(submitted, [15.1, 7, 25, 35]);
  assert.equal(wins, 0);
  type(''); enter();
  assert.equal(previews.at(-1), null);
  assert.deepEqual(submitted, [15.1, 7, 25, 35], 'an empty field clears preview without submitting zero');
  type('15');
  assert.equal(wins, 0, 'even a complete correct answer still needs confirmation');
  enter();
  assert.deepEqual(submitted, [15.1, 7, 25, 35, 15]);
  assert.equal(wins, 1);
});

test('prediction dismissal survives Reset-style remounts; a goal only reopens on a deliberate toggle', () => {
  for (const event of ['drag', 'submitPrediction'] as const) {
    const scope = {};
    const session = puzzleLifecycle(scope, 'p1');
    assert.equal(session.predictionVisible, true);
    session[event]();
    // Reset reuses the session rather than constructing fresh interaction state.
    const remounted = puzzleLifecycle(scope, 'p1');
    assert.equal(remounted.predictionVisible, false);
    if (event === 'drag') {
      assert.equal(remounted.goalExpanded, false);
      remounted.attempt();
      assert.equal(remounted.goalExpanded, false);
      remounted.toggleGoal();
      assert.equal(remounted.goalExpanded, true);
    } else assert.equal(remounted.goalExpanded, true);
    beginPuzzleBeat(scope);
    assert.equal(puzzleLifecycle(scope, 'p1').goalExpanded, true, 'a new beat starts with its full goal');
    assert.equal(puzzleLifecycle(scope, 'p1').predictionVisible, false, 'a new beat still cannot resurrect the session prediction');
  }
  const answer = new PuzzleLifecycle();
  answer.attempt();
  assert.equal(answer.goalExpanded, false);
});

test('only the licensed d01 interactive beats receive compact chrome', () => {
  for (const beat of ['puzzle', 'doubt', 'law', 'procedure', 'build']) {
    assert.equal(compactBeatChrome('d01-dot', beat), true, beat);
    for (const chapter of ['c00-prologue', 'c01-vectors', 'c21-projection', '']) assert.equal(compactBeatChrome(chapter, beat), false);
  }
  for (const beat of ['scene', 'card', 'cinematic', 'name', 'sayit', 'compare', '']) assert.equal(compactBeatChrome('d01-dot', beat), false, beat);
});

test('a new transient replaces the old one; its old timeout cannot remove the replacement', () => {
  const slot = new TransientSlot();
  const removed: string[] = [];
  const dismissPrediction = slot.replace(() => removed.push('prediction'));
  const dismissBark = slot.replace(() => removed.push('bark'));
  assert.deepEqual(removed, ['prediction']);
  dismissPrediction();
  assert.deepEqual(removed, ['prediction']);
  dismissBark(); // four-second expiry or next drag, whichever happens first
  slot.clear(); // beat teardown is safe after an expiry
  assert.deepEqual(removed, ['prediction', 'bark']);
  slot.replace(() => removed.push('toast'));
  slot.clear();
  assert.deepEqual(removed, ['prediction', 'bark', 'toast']);
});

test('Continue needs 200 passing cases and finite adopted output; editing invalidates a pending adoption', () => {
  const gate = new BuildGate();
  const first = gate.invalidate();
  assert.equal(gate.ready, false);
  assert.equal(gate.adopt(first, Array(199).fill(true), 15), false);
  assert.equal(gate.adopt(first, [...Array(199).fill(true), false], 15), false);
  assert.equal(gate.adopt(first, Array(200).fill(true), NaN), false);
  assert.equal(gate.adopt(first, Array(200).fill(true), 15), true);
  const next = gate.invalidate();
  assert.equal(gate.ready, false);
  assert.equal(gate.adopt(first, Array(200).fill(true), 15), false);
  assert.equal(gate.adopt(next, Array(200).fill(true), 15), true);
});

test('the saved player function supplies the instrument; stale results and teardown cannot overwrite it', async () => {
  const calls: unknown[] = [];
  const pending: ((n: number) => void)[] = [];
  const channel = new ReadingChannel((source, v, w) => {
    calls.push({ source, v, w });
    return new Promise<number>((resolve) => pending.push(resolve));
  });
  const shown: number[] = [];
  const show = (n: number) => shown.push(n);
  await channel.request(null, [3, 4], [5, 0], show);
  assert.deepEqual(shown, [15]);
  const ownSource = 'def dot(v, w):\n    return 321';
  const first = channel.request(ownSource, [3, 4], [5, 0], show);
  const second = channel.request(ownSource, [4, 0], [3, 0], show);
  pending[1](321); await second;
  pending[0](111); await first;
  assert.deepEqual(shown, [15, 321]);
  assert.deepEqual(calls[0], { source: ownSource, v: [3, 4], w: [5, 0] });
  await channel.request(ownSource, [4, 0], [3, 0], show);
  assert.equal(calls.length, 2, 'unchanged frames do not flood Python');
  const late = channel.request(ownSource, [0, 4], [0, 3], show);
  channel.dispose(); pending[2](222); await late;
  assert.deepEqual(shown, [15, 321, 321]);
});

import { isolateBuildStorage, localDot, adoptedDot, type DotSave } from '../../site/src/game/content/chapters/d01-dot/storage.ts';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

test('an old adoption rejection cannot invalidate a newer pass or touch a later beat', async () => {
  const gate = new BuildGate();
  let renders = 0;
  const old = gate.invalidate();
  const oldCall = deferred<number>();
  const rejected = oldCall.promise.catch(() => { if (gate.reject(old)) renders++; });
  const current = gate.invalidate();
  assert.equal(gate.adopt(current, Array(200).fill(true), 15), true);
  oldCall.reject(new Error('old failure')); await rejected;
  assert.equal(gate.ready, true); assert.equal(renders, 0);
  const late = deferred<number>();
  const lateRejected = late.promise.catch(() => { if (gate.reject(current)) renders++; });
  gate.dispose();
  late.reject(new Error('after teardown')); await lateRejected;
  assert.equal(renders, 0);
  assert.equal(gate.adopt(current, Array(200).fill(true), 15), false);
});

test('instrument rejection obeys epochs, recovers after a current failure, and is inert after teardown', async () => {
  const requests: ReturnType<typeof deferred<number>>[] = [];
  const channel = new ReadingChannel(() => { const request = deferred<number>(); requests.push(request); return request.promise; });
  let visible = true, value = 0, errors = 0;
  const show = (n: number) => { value = n; visible = true; };
  const failed = () => { errors++; visible = false; };
  const a = channel.request('player', [1, 1], [1, 0], show, failed);
  const b = channel.request('player', [2, 2], [1, 0], show, failed);
  requests[1].resolve(2); await b;
  requests[0].reject(new Error('stale')); await a;
  assert.deepEqual({ visible, value, errors }, { visible: true, value: 2, errors: 0 });
  const c = channel.request('player', [0.5, 1], [1, 0], show, failed);
  requests[2].reject(new Error('current noninteger')); await c;
  assert.deepEqual({ visible, errors }, { visible: false, errors: 1 });
  const d = channel.request('player', [3, 4], [5, 0], show, failed);
  requests[3].resolve(15); await d;
  assert.deepEqual({ visible, value, errors }, { visible: true, value: 15, errors: 1 });
  const e = channel.request('player', [0.25, 1], [1, 0], show, failed);
  channel.dispose(); requests[4].reject(new Error('late')); await e;
  assert.deepEqual({ visible, value, errors }, { visible: true, value: 15, errors: 1 });
});

test('holding a heading refreshes confirmation presentation without executing Python again', async () => {
  let calls = 0, confirmed = false, displayedConfirmed = false;
  const channel = new ReadingChannel(async () => { calls++; return 12; });
  const show = () => { displayedConfirmed = confirmed; };
  const bands = newBands();
  holdReading(bands, 12, 0);
  await channel.request('player', [4, 0], [3, 0], show);
  assert.equal(displayedConfirmed, false);
  holdReading(bands, 12, 1000); confirmed = bands.biggest;
  await channel.request('player', [4, 0], [3, 0], show);
  assert.equal(displayedConfirmed, true); assert.equal(calls, 1);
});

test('Start over status clearing restores one authored tests line without replacing a result', () => {
  const status = { textContent: COPY.build.success.text };
  // This is the shared Start over handler's actual mutation.
  status.textContent = '';
  restoreTestsLine(status, COPY.build.tests);
  assert.equal(status.textContent, COPY.build.tests);
  restoreTestsLine(status, COPY.build.tests);
  assert.equal(status.textContent, COPY.build.tests);
  status.textContent = COPY.build.success.text;
  restoreTestsLine(status, COPY.build.tests);
  assert.equal(status.textContent, COPY.build.success.text);
});

const storySource = 'def dot(v, w):\n    return sum(a*b for a, b in zip(v, w))';
function storySave(): DotSave {
  return { code: { dot: storySource, length: 'story length' }, flags: {
    buildPassing: { dot: true, length: true }, buildDraft: { dot: { fill: ['story draft'] } },
  } };
}
function writeSharedResult(store: DotSave, source: string, passed: boolean) {
  store.code.dot = source;
  (store.flags.buildPassing as Record<string, boolean>).dot = passed;
}

test('d01 mounting, passing, failing and serializing never replace story source/flags/drafts', () => {
  const store = storySave();
  const originalCode = store.code, originalPassing = store.flags.buildPassing, originalDraft = store.flags.buildDraft;
  Object.assign(localDot(store), { source: COPY.build.solution, passed: true, draft: { fill: ['local draft'] } });
  let ownsResult = false;
  const lease = isolateBuildStorage(store, () => { if (!ownsResult) return false; ownsResult = false; return 'result'; });
  const local = lease.local;
  assert.equal(store.code.dot, COPY.build.solution, 'renderer mounts its own saved code');
  assert.deepEqual((store.flags.buildDraft as Record<string, unknown>).dot, { fill: ['local draft'] });
  const duringMount = JSON.parse(JSON.stringify(store));
  assert.equal(duringMount.code.dot, storySource, 'even a save during temporary mounting is isolated');
  assert.deepEqual(duringMount.flags.buildDraft.dot, { fill: ['story draft'] });
  lease.mounted();
  assert.equal(store.code.dot, storySource, 'normal library reads stay story-owned');
  ownsResult = true; writeSharedResult(store, COPY.build.solution, true);
  local.adoptedSource = local.source;
  assert.equal(adoptedDot(store), COPY.build.solution);
  ownsResult = true; writeSharedResult(store, COPY.build.decoy, false);
  assert.equal(local.source, COPY.build.decoy); assert.equal(local.passed, false);
  const saved = JSON.parse(JSON.stringify(store));
  assert.equal(saved.code.dot, storySource);
  assert.deepEqual(saved.flags.buildPassing, { dot: true, length: true });
  assert.equal(saved.flags['d01-dot-build'].source, COPY.build.decoy);
  lease.release();
  assert.equal(store.code, originalCode);
  assert.equal(store.flags.buildPassing, originalPassing);
  assert.equal(store.flags.buildDraft, originalDraft);
  assert.equal(store.code.dot, storySource);
});

test('an aborted renderer isolates late writes while preserving a newer story save', () => {
  const store = storySave();
  let lateResult = false, finalizing = false;
  const lease = isolateBuildStorage(store, () => {
    if (lateResult) { lateResult = false; return 'result'; }
    return finalizing ? 'draft' : false;
  });
  lease.mounted();
  finalizing = true; store.code.dot = 'unfinished d01 draft'; finalizing = false;
  assert.equal(localDot(store).source, 'unfinished d01 draft');
  writeSharedResult(store, 'newer story implementation', true);
  assert.equal(store.code.dot, 'newer story implementation');
  lateResult = true; writeSharedResult(store, COPY.build.solution, true);
  assert.equal(localDot(store).source, COPY.build.solution);
  assert.equal(store.code.dot, 'newer story implementation');
  lease.release();
  assert.equal(store.code.dot, 'newer story implementation', 'cleanup does not restore a stale snapshot over later story work');
  assert.equal((store.flags.buildPassing as Record<string, boolean>).dot, true);
});

test('overlapping build lifetimes route each result to its owner and restore absent flags on setup failure', () => {
  const store: DotSave = { code: {}, flags: {} };
  let oldOwns = false, newOwns = false;
  const old = isolateBuildStorage(store, () => { if (!oldOwns) return false; oldOwns = false; return 'result'; });
  old.mounted();
  const newer = isolateBuildStorage(store, () => { if (!newOwns) return false; newOwns = false; return 'result'; });
  newer.mounted();
  newOwns = true; writeSharedResult(store, COPY.build.solution, true);
  oldOwns = true; writeSharedResult(store, 'old result', true);
  assert.equal(old.local.source, 'old result');
  assert.equal(newer.local.source, COPY.build.solution);
  assert.equal(localDot(store).source, COPY.build.solution, 'late old result cannot overwrite the newer chapter save');
  old.release();
  try { throw new Error('mount failure'); } catch { newer.release(); }
  assert.deepEqual(store.code, {});
  assert.equal(Object.hasOwn(store.flags, 'buildPassing'), false);
  assert.equal(Object.hasOwn(store.flags, 'buildDraft'), false);
});

// DSA 3 (stacks and queues): the bracket checker is correct, the challenge is reachable but not met by the
// default input, and every claim in the topic's dsa.ts text (problem, predict, practice answers) is true.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BRACKET_PRESETS, DEFAULT_BRACKETS, DEFAULT_ITEMS, GOAL_DEPTH, MAX_BRACKETS, SHOW_ME_BRACKETS,
  bracketFrames, checkBrackets, evalPostfix, meetsGoal, orderFrames, parseBrackets, parseItems, randomBrackets, randomItems,
  type BracketFrame,
} from '../../site/src/pages/dsa/viz/stacks-core.ts';

const last = <T>(a: T[]) => a[a.length - 1];
const ALL = '()[]{}';

/** Every string of length 0..maxLen over the six bracket characters. */
function* allStrings(maxLen: number): Generator<string> {
  let cur = [''];
  for (let len = 0; len <= maxLen; len++) {
    yield* cur;
    cur = cur.flatMap((s) => ALL.split('').map((c) => s + c));
  }
}
/** A slow, independent answer: keep deleting "()", "[]" and "{}" until nothing changes. */
function naiveMatched(s: string): boolean {
  let prev = '';
  while (prev !== s) { prev = s; s = s.replace(/\(\)|\[\]|\{\}/g, ''); }
  return s === '';
}
/** For a matched string, the deepest the pile gets is the largest count of opens minus closes in any prefix. */
function naiveDepth(s: string): number {
  let d = 0, m = 0;
  for (const c of s) { d += '([{'.includes(c) ? 1 : -1; m = Math.max(m, d); }
  return m;
}
function seeded(seed: number) {
  let s = seed;
  return () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };
}

test('brackets: the checker agrees with a slow independent check on every string up to 7 brackets', () => {
  let count = 0, matched = 0;
  for (const s of allStrings(7)) {
    if (!s) continue;
    const r = checkBrackets(s.split(''));
    assert.equal(r.ok, naiveMatched(s), s);
    if (r.ok) { matched++; assert.equal(r.maxDepth, naiveDepth(s), s); }
    count++;
  }
  assert.ok(count > 300_000 && matched > 0);
});

test('brackets: the frames end the same way as the checker, and every pop matches a pair', () => {
  for (const s of allStrings(6)) {
    if (!s) continue;
    const chars = s.split('');
    const r = checkBrackets(chars);
    const fr = bracketFrames(chars);
    const end = last(fr);
    assert.equal(end.status, r.ok ? 'ok' : 'bad', s);
    assert.equal(end.maxDepth, r.maxDepth, s);
    assert.ok(end.verdict && end.verdict.length === 2, s);
    for (const [a, b] of end.pairs) assert.equal(chars[a] + chars[b], { '(': '()', '[': '[]', '{': '{}' }[chars[a]], s);
    for (const f of fr) {
      assert.equal(f.depth, f.pile.length);
      assert.ok(f.depth <= f.maxDepth && f.maxDepth <= f.slots);
      assert.equal(f.charState.length, chars.length);
      assert.equal(f.pileState.length, f.pile.length);
    }
    if (r.ok) {
      // the formula: one push or one pop per bracket, so n pushes and pops in all
      const pushes = fr.filter((f) => f.line === 2).length;
      const pops = fr.filter((f, k) => k > 0 && f.pile.length === fr[k - 1].pile.length - 1).length;
      assert.equal(pushes + pops, chars.length, s);
      assert.equal(end.pairs.length * 2, chars.length, s);
    }
  }
});

test('brackets: the problem — in { [ ( ] } the wrong bracket is the ] at position 3', () => {
  const r = checkBrackets(parseBrackets('{ [ ( ] }'));
  assert.equal(r.ok, false);
  assert.deepEqual(r.error, { kind: 'mismatch', at: 3, ch: ']', top: { ch: '(', at: 2 } });
  const end = last(bracketFrames(parseBrackets('{ [ ( ] }')));
  assert.equal(end.status, 'bad');
  assert.equal(end.charState[3], 'red');
  assert.match(end.note, /`\]` at position 3 is the wrong bracket/);
});

test('brackets: the predict — in ( [ ] ) the ] matches the [ right before it', () => {
  const fr = bracketFrames(parseBrackets('( [ ] )'));
  const afterFirstClose = fr.find((f) => f.pairs.length === 1)!;
  assert.deepEqual(afterFirstClose.pairs[0], [1, 2]);          // [ at 1 with ] at 2, not ( at 0
  assert.equal(last(fr).status, 'ok');
  assert.deepEqual(last(fr).pairs, [[1, 2], [0, 3]]);
});

test('brackets: practice 1 — ( [ ) ] is not matched: the ) arrives while [ is on top', () => {
  const r = checkBrackets(parseBrackets('( [ ) ]'));
  assert.equal(r.ok, false);
  assert.deepEqual(r.error, { kind: 'mismatch', at: 2, ch: ')', top: { ch: '[', at: 1 } });
});

test('postfix: practice 2 — 3 4 + 2 * is 14, with the pile 3 / 3 4 / 7 / 7 2 / 14', () => {
  const r = evalPostfix('3 4 + 2 *');
  assert.equal(r.value, 14);
  assert.deepEqual(r.piles, [[3], [3, 4], [7], [7, 2], [14]]);
  assert.equal(evalPostfix('5 1 2 + 4 * + 3 -').value, 14);
  assert.throws(() => evalPostfix('3 +'), /two numbers/);
});

test('challenge: Show me reaches 4 deep and is matched; the default input does not meet the goal', () => {
  assert.equal(GOAL_DEPTH, 4);
  assert.ok(meetsGoal(SHOW_ME_BRACKETS));
  const end = last(bracketFrames(parseBrackets(SHOW_ME_BRACKETS)));
  assert.equal(end.status, 'ok');
  assert.equal(end.maxDepth, 4);
  assert.equal(DEFAULT_BRACKETS, '{ [ ( ] }');
  assert.equal(meetsGoal(DEFAULT_BRACKETS), false);
  for (const p of BRACKET_PRESETS) assert.equal(meetsGoal(p.value), false, p.value);
  // depth alone is not enough: four deep but not matched
  assert.equal(meetsGoal('( ( ( ( ) ) )'), false);
  assert.equal(checkBrackets(parseBrackets('( ( ( ( ) ) )')).maxDepth, 4);
  // matched alone is not enough
  assert.equal(meetsGoal('( ) [ ] { } ( [ { } ] )'), false);
});

test('presets: each shows a different ending', () => {
  const ends = BRACKET_PRESETS.map((p) => checkBrackets(parseBrackets(p.value)));
  assert.equal(ends[1].ok, true);                                 // ( [ ] )
  assert.equal(ends[2].error?.kind, 'mismatch');                  // ( [ ) ]
  assert.equal(ends[3].error?.kind, 'leftover');                  // ( { [ ] }
  assert.equal(checkBrackets(parseBrackets(') (')).error?.kind, 'empty');
});

test('random: always valid input, never meets the challenge, and shows every kind of ending', () => {
  const kinds = new Set<string>();
  for (let seed = 1; seed < 3000; seed++) {
    const t = randomBrackets(seeded(seed));
    const chars = parseBrackets(t);
    assert.equal(meetsGoal(t), false, t);
    const r = checkBrackets(chars);
    kinds.add(r.ok ? 'ok' : r.error!.kind);
    assert.ok(chars.length <= MAX_BRACKETS);
    const items = parseItems(randomItems(seeded(seed)));
    assert.ok(items.length >= 4 && items.length <= 7);
  }
  assert.deepEqual([...kinds].sort(), ['empty', 'leftover', 'mismatch', 'ok']);
});

test('frame counts: the default run is short and the longest allowed input stays under 600', () => {
  assert.ok(bracketFrames(parseBrackets(DEFAULT_BRACKETS)).length < 150);
  const longest = Math.max(...['('.repeat(6) + ')'.repeat(6), '()'.repeat(6), '(['.repeat(3) + '])'.repeat(3), '('.repeat(12)]
    .map((s) => bracketFrames(parseBrackets(s)).length));
  assert.ok(longest < 600, String(longest));
  assert.ok(orderFrames(parseItems('A B C D E F G H')).length < 600);
});

test('stack vs queue: the stack gives the newest first, the queue the oldest first', () => {
  const fr = orderFrames(parseItems(DEFAULT_ITEMS));
  const end = last(fr);
  assert.deepEqual(end.stackOut, ['D', 'C', 'B', 'A']);
  assert.deepEqual(end.queueOut, ['A', 'B', 'C', 'D']);
  assert.deepEqual(end.stack, []);
  assert.deepEqual(end.queue, []);
  // every frame keeps all items somewhere: inside, or already out
  for (const f of fr) assert.ok(f.stack.length + f.stackOut.length <= 4 && f.queue.length + f.queueOut.length <= 4);
  assert.match(end.note, /D C B A/);
  assert.match(end.note, /A B C D/);
});

test('input checks', () => {
  assert.throws(() => parseBrackets('( a )'), /not a bracket/);
  assert.throws(() => parseBrackets('   '), /at least one/);
  assert.throws(() => parseBrackets('()'.repeat(7)), /at most 12/);
  assert.deepEqual(parseBrackets('{[(]}'), ['{', '[', '(', ']', '}']);
  assert.deepEqual(parseItems('A B C D'), ['A', 'B', 'C', 'D']);
  assert.deepEqual(parseItems('ABCD'), ['A', 'B', 'C', 'D']);
  assert.deepEqual(parseItems('1, 2, 3'), ['1', '2', '3']);
  assert.throws(() => parseItems('A'), /2 to 8/);
  assert.throws(() => parseItems('A B C D E F G H I'), /2 to 8/);
  assert.throws(() => parseItems('( [ ] )'), /letters or digits/);
});

test('every frame has a line and a note', () => {
  for (const f of [...bracketFrames(parseBrackets(SHOW_ME_BRACKETS)), ...orderFrames(parseItems(DEFAULT_ITEMS))]) {
    assert.ok(typeof f.line === 'number' && f.note.length > 10);
    assert.ok(!/\b(simply|just|obviously|clearly)\b/i.test(f.note), f.note);
  }
  const b = bracketFrames(parseBrackets('( ( )')) as BracketFrame[];
  assert.match(last(b).note, /never closed/);
});

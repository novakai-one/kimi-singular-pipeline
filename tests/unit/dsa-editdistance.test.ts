// DSA 10 (dynamic programming): the edit-distance table is right, the walk back lists the right edits,
// the challenge is reachable but not won by the default, and every number in the topic's dsa.ts text is true.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  editDistance, editFrames, editList, editTable, meetsGoal, parseInput, randomPair, traceBack, wordChain,
} from '../../site/src/pages/dsa/viz/editdistance-core.ts';
import { dsaContent } from '../../site/src/data/dsa.ts';

const c = dsaContent('dynamic-programming');
const last = <T>(a: T[]) => a[a.length - 1];
const plain = (t: string) => t.replace(/\*\*/g, '');

/** The definition, with no table: try all three moves every time (slow, fine for short words). */
function naive(a: string, b: string): number {
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const cost = a[a.length - 1] === b[b.length - 1] ? 0 : 1;
  return Math.min(naive(a.slice(0, -1), b) + 1, naive(a, b.slice(0, -1)) + 1, naive(a.slice(0, -1), b.slice(0, -1)) + cost);
}

function lcg(seed: number) {
  let s = seed;
  return () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };
}
const randWord = (r: () => number, max: number, letters = 'abc') =>
  Array.from({ length: Math.floor(r() * (max + 1)) }, () => letters[Math.floor(r() * letters.length)]).join('');

test('edit distance: the table matches the slow definition on many short words', () => {
  const r = lcg(7);
  for (let k = 0; k < 400; k++) {
    const a = randWord(r, 6), b = randWord(r, 6);
    assert.equal(editDistance(a, b), naive(a, b), `${a} / ${b}`);
  }
});

test('edit distance: the walk back gives exactly that many edits, and they turn the first word into the second', () => {
  const r = lcg(11);
  for (let k = 0; k < 400; k++) {
    const a = randWord(r, 8, 'abcd'), b = randWord(r, 8, 'abcd');
    const d = editDistance(a, b);
    assert.equal(editList(a, b).length, d);
    const chain = wordChain(a, b);
    assert.equal(chain.length, d + 1);
    assert.equal(chain[0], a);
    assert.equal(last(chain), b);
    // consecutive words differ by one edit
    for (let t = 1; t < chain.length; t++) assert.equal(editDistance(chain[t - 1], chain[t]), 1);
    // the walk ends at (0, 0) and every step lowers the cell by the op's cost
    const D = editTable(a, b);
    const steps = traceBack(a, b, D);
    assert.deepEqual([last(steps)?.pi ?? 0, last(steps)?.pj ?? 0], [0, 0]);
    for (const s of steps) assert.equal(D[s.i][s.j] - D[s.pi][s.pj], s.op === 'keep' ? 0 : 1);
  }
});

test('the formula: every cell is min(above + 1, left + 1, diagonal + c); first row and column count up', () => {
  for (const [a, b] of [['kitten', 'sitting'], ['recieve', 'receive'], ['sunday', 'saturday'], ['abc', ''], ['', 'xy']]) {
    const D = editTable(a, b);
    D[0].forEach((v, j) => assert.equal(v, j));
    D.forEach((row, i) => assert.equal(row[0], i));
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        const cc = a[i - 1] === b[j - 1] ? 0 : 1;
        assert.equal(D[i][j], Math.min(D[i - 1][j] + 1, D[i][j - 1] + 1, D[i - 1][j - 1] + cc));
      }
    }
  }
  assert.match(c.explain.formula!, /D\[i-1\]\[j\] \+ 1/);
  assert.match(c.explain.formula!, /D\[i\]\[j-1\] \+ 1/);
  assert.match(c.explain.formula!, /D\[i-1\]\[j-1\] \+ c/);
});

test('frames: one frame per cell, reading three filled cells, with the arithmetic in the note', () => {
  const a = 'kitten', b = 'sitting';
  const D = editTable(a, b);
  const frames = editFrames(a, b);
  const cells = frames.filter((f) => f.reads);
  assert.equal(cells.length, a.length * b.length, 'n × m cell frames');
  for (const f of cells) {
    const [i, j] = f.cur!;
    for (const r of f.reads!) assert.notEqual(f.table[r.i][r.j], null, 'reads only filled cells');
    const cc = a[i - 1] === b[j - 1] ? 0 : 1;
    assert.ok(f.note.includes(`min(${D[i - 1][j]}+1, ${D[i][j - 1]}+1, ${D[i - 1][j - 1]}+${cc}) = **${D[i][j]}**`), f.note);
    assert.ok(f.note.includes(cc ? 'adds 1' : 'letters match'));
  }
  // a matching cell: "ki" → "si" reads 2, 2, 1 and the letters match
  assert.ok(cells.some((f) => f.note.startsWith('"ki" → "si": min(2+1, 2+1, 1+0) = **1**. The letters match')));
  // the last frame is the answer, with the edits listed
  assert.equal(last(frames).dist, 3);
  assert.ok(last(frames).done);
  // filling is row by row, left to right
  const order = cells.map((f) => f.cur!.join(','));
  const want: string[] = [];
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) want.push(`${i},${j}`);
  assert.deepEqual(order, want);
});

test('predict: kitten → sitting is 3 edits: change k to s, change e to i, insert g', () => {
  assert.equal(editDistance('kitten', 'sitting'), 3);
  assert.deepEqual(editList('kitten', 'sitting'), ['change k to s', 'change e to i', 'insert g']);
  assert.deepEqual(wordChain('kitten', 'sitting'), ['kitten', 'sitten', 'sittin', 'sitting']);
  assert.deepEqual(last(editFrames('kitten', 'sitting')).edits, ['change k to s', 'change e to i', 'insert g']);
  assert.ok(c.predict.choices!.includes('3'));
  const reveal = plain(c.predict.reveal);
  assert.ok(reveal.startsWith('3'));
  const at = ['change k to s', 'change e to i', 'g at the end'].map((t) => reveal.indexOf(t));
  assert.ok(at.every((p) => p >= 0) && at[0] < at[1] && at[1] < at[2], reveal);
});

test('problem: recieve → receive', () => {
  assert.ok(c.problem.includes('"recieve"') && c.problem.includes('"receive"'));
  assert.equal(editDistance('recieve', 'receive'), 2);
  assert.deepEqual(editList('recieve', 'receive'), ['change i to e', 'change e to i']);
});

test('practice: climbing 5 stairs 1 or 2 at a time: 8 ways', () => {
  const ways = [1, 1];
  for (let k = 2; k <= 5; k++) ways.push(ways[k - 1] + ways[k - 2]);
  assert.deepEqual(ways, [1, 1, 2, 3, 5, 8]);
  // brute force: count step sequences that add up to 5
  const count = (n: number): number => (n < 0 ? 0 : n === 0 ? 1 : count(n - 1) + count(n - 2));
  assert.equal(count(5), 8);
  assert.ok(plain(c.practice[0].a).includes('starting 1, 1: then 2, 3, 5, 8'));
});

test('practice: coins 1, 3, 4: fewest coins for 0 to 6', () => {
  const coins = [1, 3, 4];
  const best = [0];
  for (let x = 1; x <= 6; x++) best.push(1 + Math.min(...coins.filter((k) => k <= x).map((k) => best[x - k])));
  assert.deepEqual(best, [0, 1, 2, 1, 1, 2, 2]);
  const text = best.map((v, x) => `${x}:${v}`).join(', ');
  assert.ok(plain(c.practice[1].a).startsWith(text), `${text} / ${c.practice[1].a}`);
  assert.ok(c.practice[1].a.includes('(3 + 3)'));
});

test('practice: cat → cut and cat → cast are each 1 edit', () => {
  assert.equal(editDistance('cat', 'cut'), 1);
  assert.deepEqual(editList('cat', 'cut'), ['change a to u']);
  assert.equal(editDistance('cat', 'cast'), 1);
  assert.deepEqual(editList('cat', 'cast'), ['insert s']);
  assert.equal(c.practice[2].a, '1 (change a to u) and 1 (insert s).');
});

test('practice: longest increasing run in 3 1 4 1 5 9 2 6 has length 4', () => {
  const xs = [3, 1, 4, 1, 5, 9, 2, 6];
  const best = xs.map(() => 1);
  for (let i = 0; i < xs.length; i++) for (let j = 0; j < i; j++) if (xs[j] < xs[i]) best[i] = Math.max(best[i], best[j] + 1);
  assert.equal(Math.max(...best), 4);
  // brute force over all 2^8 picks
  let top = 0;
  for (let mask = 0; mask < 1 << xs.length; mask++) {
    const pick = xs.filter((_, i) => mask & (1 << i));
    if (pick.every((v, i) => i === 0 || v > pick[i - 1])) top = Math.max(top, pick.length);
  }
  assert.equal(top, 4);
  // both examples in the answer are real picks, in order and increasing
  const isPick = (p: number[]) => { let k = 0; for (const v of xs) if (v === p[k]) k++; return k === p.length && p.every((v, i) => i === 0 || v > p[i - 1]); };
  assert.ok(isPick([1, 4, 5, 9]) && isPick([3, 4, 5, 6]));
  assert.ok(plain(c.practice[3].a).includes('Length 4, for example 1, 4, 5, 9 or 3, 4, 5, 6'));
});

test('challenge: reachable, Show me reaches it, the default does not', () => {
  assert.match(c.viz.goal, /two different words, each at least 5 letters long, with an edit distance of exactly 1/);
  const def = parseInput('kitten, sitting');
  assert.equal(meetsGoal(def.a, def.b), false, 'default input must not win');
  const show = parseInput('house, horse');
  assert.equal(meetsGoal(show.a, show.b), true, 'Show me wins');
  assert.deepEqual(editList('house', 'horse'), ['change u to r']);
  assert.equal(meetsGoal('house', 'house'), false, 'same word');
  assert.equal(meetsGoal('cat', 'cut'), false, 'too short');
  assert.equal(meetsGoal('plane', 'planet'), true, 'an insert also counts');
  const r = lcg(3);
  for (let k = 0; k < 300; k++) { const p = parseInput(randomPair(r)); assert.ok(!meetsGoal(p.a, p.b) && p.a !== p.b); }
});

test('frame counts: the default stays well under 150, and so does the biggest table', () => {
  assert.ok(editFrames('kitten', 'sitting').length < 150);
  let max = 0;
  const r = lcg(5);
  for (let k = 0; k < 200; k++) {
    const a = randWord(r, 10, 'ab').padEnd(10, 'a'), b = randWord(r, 10, 'cd').padEnd(10, 'c');
    max = Math.max(max, editFrames(a, b).length);
  }
  max = Math.max(max, editFrames('abcdefghij', 'klmnopqrst').length, editFrames('aaaaaaaaaa', 'bbbbbbbbbb').length);
  assert.ok(max <= 3 + 100 + 1 + 20 + 1 && max < 150, `max ${max}`);
});

test('input checks', () => {
  assert.throws(() => parseInput('kitten'), /two words/);
  assert.throws(() => parseInput('a, b, c'), /two words/);
  assert.throws(() => parseInput('kit3en, sitting'), /letters a to z/);
  assert.throws(() => parseInput('abcdefghijk, cat'), /at most 10/);
  assert.deepEqual(parseInput('  Kitten,sitting '), { a: 'kitten', b: 'sitting' });
  assert.deepEqual(parseInput('cat cast'), { a: 'cat', b: 'cast' });
});

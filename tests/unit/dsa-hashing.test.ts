// DSA 2 (arrays, hash maps and sets): the bucket rule, the frames, the challenge,
// and every number in the topic's dsa.ts text (problem, predict, practice answers).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_INPUT, GOAL, MAX_LEN, MAX_WORDS, N_BUCKETS, PRESETS, SHOW_ME_INPUT, WORD_BANK, bucketChecks, bucketOf, buildBuckets,
  codeSum, codes, fullest, insertFrames, listChecks, meetsGoal, parseInput, randomInput, searchFrames,
} from '../../site/src/pages/dsa/viz/hashing-core.ts';

const last = <T>(a: T[]) => a[a.length - 1];
/** Deterministic random numbers in [0, 1) (xorshift). */
function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}
const randomWord = (r: () => number, min = 1, max = MAX_LEN) =>
  Array.from({ length: min + Math.floor(r() * (max - min + 1)) }, () => String.fromCharCode(97 + Math.floor(r() * 26))).join('');

test('hashing: bucket = (sum of character codes) mod 8', () => {
  assert.deepEqual(codes('cat'), [99, 97, 116]);
  assert.equal(codeSum('cat'), 312);
  assert.equal(bucketOf('cat'), 312 % 8);
  assert.equal(N_BUCKETS, 8);
  for (let seed = 1; seed < 300; seed++) {
    const w = randomWord(rng(seed));
    const sum = [...w].reduce((a, ch) => a + ch.charCodeAt(0), 0);
    assert.equal(bucketOf(w), sum % 8);
    assert.ok(bucketOf(w) >= 0 && bucketOf(w) < 8);
  }
});

test('hashing: practice answer — "ab" goes in bucket 3 ("a" is 97, "b" is 98, 97 + 98 = 195, 195 mod 8 = 3)', () => {
  assert.equal('a'.charCodeAt(0), 97);
  assert.equal('b'.charCodeAt(0), 98);
  assert.equal(codeSum('ab'), 195);
  assert.equal(195 % 8, 3);
  assert.equal(bucketOf('ab'), 3);
  // and the visualiser puts it there
  assert.deepEqual(last(insertFrames(['ab'])).buckets[3], ['ab']);
  // the help text: z is 122
  assert.equal('z'.charCodeAt(0), 122);
});

test('hashing: insert frames end with every word in its bucket, each word once', () => {
  for (let seed = 1; seed < 300; seed++) {
    const r = rng(seed);
    const words = Array.from({ length: 1 + Math.floor(r() * MAX_WORDS) }, () => randomWord(r, 1, 4));
    if (seed % 5 === 0) words.push(words[0]); // a repeat
    const fr = insertFrames(words.slice(0, MAX_WORDS));
    const end = last(fr);
    assert.deepEqual(end.buckets, buildBuckets(words.slice(0, MAX_WORDS)));
    for (const w of words.slice(0, MAX_WORDS)) assert.ok(end.buckets[bucketOf(w)].includes(w));
    const all = end.buckets.flat();
    assert.equal(new Set(all).size, all.length, 'no word twice');
    for (const f of fr) assert.equal(f.buckets.length, 8);
  }
});

test('hashing: search counts match a direct count, and the bucket never needs more checks than the list', () => {
  for (let seed = 1; seed < 400; seed++) {
    const r = rng(seed);
    const words = Array.from({ length: 1 + Math.floor(r() * MAX_WORDS) }, () => randomWord(r, 1, 3));
    const target = r() < 0.6 ? words[Math.floor(r() * words.length)] : randomWord(r, 1, 3);
    const end = last(searchFrames(words, target));
    assert.equal(end.listChecks, listChecks(words, target));
    assert.equal(end.bucketChecks, bucketChecks(buildBuckets(words), target));
    assert.ok(end.bucketChecks <= end.listChecks);
    if (words.includes(target)) assert.ok(end.bucketChecks >= 1);
  }
  // no target: search for the last word typed
  const d = parseInput(DEFAULT_INPUT);
  const end = last(searchFrames(d.words, d.target));
  assert.equal(end.target, 'pen');
  assert.equal(end.listChecks, 7);
  assert.equal(end.bucketChecks, 1);
});

test('hashing: challenge — Show me reaches 4 in one bucket, the default does not', () => {
  const show = parseInput(SHOW_ME_INPUT).words;
  assert.deepEqual(show, ['stop', 'pots', 'tops', 'spot']);
  // four anagrams: same letters, so the same sum, so the same bucket
  const sorted = show.map((w) => [...w].sort().join(''));
  assert.equal(new Set(sorted).size, 1);
  assert.ok(show.every((w) => codeSum(w) === 454));
  assert.equal(454 % 8, 6);
  assert.deepEqual(fullest(buildBuckets(show)), { bucket: 6, count: 4, words: show });
  assert.ok(meetsGoal(show));
  assert.equal(GOAL, 4);
  // the Show me notes say why they collide
  const notes = insertFrames(show).map((f) => f.note).join(' ');
  assert.match(notes, /Same letters as stop give the same sum, 454/);
  assert.match(notes, /collision/);

  assert.ok(!meetsGoal(parseInput(DEFAULT_INPUT).words));
  assert.equal(fullest(buildBuckets(parseInput(DEFAULT_INPUT).words)).count, 2);
  for (const p of PRESETS) assert.ok(!meetsGoal(parseInput(p.value).words), `preset ${p.label} must not win by itself`);
  for (let seed = 1; seed < 200; seed++) {
    const t = randomInput(rng(seed));
    const words = parseInput(t).words;
    assert.ok(!meetsGoal(words));
    assert.ok(words.length >= 6 && words.length <= 9);
  }
  // repeats are stored once, so typing one word 4 times is not a pile-up
  assert.ok(!meetsGoal(['cat', 'cat', 'cat', 'cat']));
  // anagrams of any word always share a bucket
  assert.equal(bucketOf('listen'), bucketOf('silent'));
});

test('hashing: frame counts stay small', () => {
  const d = parseInput(DEFAULT_INPUT);
  assert.ok(insertFrames(d.words).length <= 150);
  assert.ok(searchFrames(d.words, null).length <= 150);
  const worst = Array.from({ length: MAX_WORDS }, (_, i) => 'abcdefgh'.slice(0, MAX_LEN - (i % 2)));
  assert.ok(insertFrames(worst).length < 600);
  assert.ok(searchFrames(worst, 'zzzzzzzz').length < 600);
  for (const w of WORD_BANK) { assert.match(w, /^[a-z]+$/); assert.ok(w.length <= MAX_LEN); }
});

test('hashing: predict — about 500,000 checks on average in a list of 1,000,000; all of them if missing', () => {
  // A list walk finds the item at position i after i + 1 checks. Averaged over every position: (n + 1) / 2.
  const n = 2_000;
  const words = Array.from({ length: n }, (_, i) => 'w' + i.toString(36));
  let total = 0;
  for (const w of words) total += listChecks(words, w);
  assert.equal(total / n, (n + 1) / 2);
  assert.equal(listChecks(words, 'missing'), n);
  const big = 1_000_000;
  assert.equal(Math.round((big + 1) / 2 / 1000) * 1000, 500_000);
  // problem: "checking one name at a time could take a million comparisons" (a name that is not there)
  assert.equal(big, 1_000_000);
});

test('hashing: predict — with a good rule and enough buckets, a lookup takes about one check either way', () => {
  // A stronger rule than the sum of codes: mix each code into the running value (Python's hash does more of this).
  const good = (w: string, m: number) => { let h = 0; for (const ch of w) h = (Math.imul(h, 31) + ch.charCodeAt(0)) >>> 0; return h % m; };
  const r = rng(7);
  const n = 100_000;
  const names = new Set<string>();
  while (names.size < n) names.add(randomWord(r, 6, 10) + Math.floor(r() * 100));
  const m = 100_003; // about one bucket per name
  const buckets: string[][] = Array.from({ length: m }, () => []);
  for (const w of names) buckets[good(w, m)].push(w);
  let found = 0;
  for (const w of names) found += buckets[good(w, m)].indexOf(w) + 1;
  let missing = 0;
  const tries = 20_000;
  for (let i = 0; i < tries; i++) missing += buckets[good('zz' + randomWord(r, 6, 10), m)].length;
  const avgFound = found / n, avgMissing = missing / tries;
  assert.ok(avgFound >= 1 && avgFound < 1.7, `found: ${avgFound}`);
  assert.ok(avgMissing < 1.3, `missing: ${avgMissing}`);
  // the weak rule with only 8 buckets piles up instead: about n / 8 per bucket
  const weak = buildBuckets([...names].slice(0, 8_000));
  assert.ok(fullest(weak).count > 900);
});

test('hashing: practice answers — one-pass pair, first repeat, same letters', () => {
  // 1: one pass with a set of the numbers seen so far
  const pair = (xs: number[], target: number) => {
    const seen = new Set<number>();
    for (const x of xs) { if (seen.has(target - x)) return [target - x, x]; seen.add(x); }
    return null;
  };
  assert.deepEqual(pair([8, 3, 11, 5, 2], 7), [5, 2]);
  assert.deepEqual(pair([4, 4], 8), [4, 4]);
  assert.equal(pair([1, 2, 3], 100), null);
  // 2: the first word already in the set
  const firstRepeat = (s: string) => { const seen = new Set<string>(); for (const w of s.split(' ')) { if (seen.has(w)) return w; seen.add(w); } return null; };
  assert.equal(firstRepeat('the sun and the moon and the sky'), 'the');
  assert.equal(firstRepeat('one two three'), null);
  // 3: "listen" and "silent" use the same letters the same number of times
  const counts = (w: string) => { const m = new Map<string, number>(); for (const ch of w) m.set(ch, (m.get(ch) ?? 0) + 1); return [...m].sort().join(); };
  assert.equal(counts('listen'), counts('silent'));
  assert.notEqual(counts('listen'), counts('lisen'));
  assert.equal([...'listen'].sort().join(''), [...'silent'].sort().join(''));
});

test('hashing: input checks', () => {
  assert.deepEqual(parseInput('cat dog; dog'), { words: ['cat', 'dog'], target: 'dog' });
  assert.deepEqual(parseInput('cat, dog  sun'), { words: ['cat', 'dog', 'sun'], target: null });
  assert.deepEqual(parseInput('cat dog; '), { words: ['cat', 'dog'], target: null });
  assert.throws(() => parseInput(''), /lowercase words/);
  assert.throws(() => parseInput('Cat dog'), /a to z/);
  assert.throws(() => parseInput('cat d0g'), /a to z/);
  assert.throws(() => parseInput('elephants'), /at most 8 letters/);
  assert.throws(() => parseInput('a b c d e f g h i j k'), /at most 10 words/);
  assert.throws(() => parseInput('cat; dog sun'), /one word/);
  assert.throws(() => parseInput('cat; Dog'), /a to z/);
  assert.throws(() => parseInput('cat; dog; sun'), /one semicolon/);
});

// Field 3 "Guess the next letter": the challenge can be won, Show me reaches the goal,
// and every data-dependent claim in the field text (site/src/data/fields.ts) is true for bigram.json.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  ALPHABET, checkWord, clean, currentChar, DEMO_WORD, lastWord, makeModel, MIN_LETTERS, prob, rank, sample, seeded,
  TOP, topK, topOneChain, type BigramData,
} from '../../site/src/pages/fieldviz/bigram-core.ts';

const data: BigramData = JSON.parse(readFileSync(new URL('../../site/public/models/fields/bigram.json', import.meta.url), 'utf8'));
const m = makeModel(data);

test('bigram: data has the shape the viz expects', () => {
  assert.equal(data.alphabet, ALPHABET);
  assert.equal(data.counts.length, 27);
  for (const row of data.counts) assert.equal(row.length, 27);
  assert.match(data.source ?? '', /Shakespeare/, 'the field text says the training text is Shakespeare');
  for (const t of m.totals) assert.ok(t > 0, 'every row has counts, so every row has guesses');
});

test('bigram: "there" (and the other example words) win the challenge', () => {
  for (const w of ['there', 'where', 'father', 'within', 'store', 'rouse']) {
    const c = checkWord(m, w);
    assert.ok(c.wins, `${w} should win`);
    console.log(`  ${w}: ${c.letters.slice(1).map((l) => `${l.ch} ${(l.p! * 100).toFixed(1)}% (#${l.rank! + 1})`).join(', ')}`);
  }
  // a word with a letter outside the top 3 does not win
  const thing = checkWord(m, 'thing');
  assert.equal(thing.wins, false);
  assert.equal(thing.firstBad, 4, '"g" is not in the top 3 after "n"');
  // four good letters is not enough
  assert.equal(checkWord(m, 'ther').wins, false);
  assert.equal(checkWord(m, 'ther').okSoFar, true);
});

test('bigram: Show me types a word that reaches the goal only on its last letter', () => {
  assert.ok(DEMO_WORD.length >= MIN_LETTERS);
  let text = '';
  for (const ch of DEMO_WORD) {
    text += ch;
    const { word } = lastWord(text);
    const c = checkWord(m, word);
    assert.ok(c.okSoFar, `each letter Show me types is in the top 3 (${word})`);
    assert.equal(c.wins, text.length === DEMO_WORD.length);
  }
});

test('bigram: following only the top-1 guess never reaches 4 letters (why the goal uses the top 3)', () => {
  let longest = '';
  for (const ch of ALPHABET.slice(1)) {
    const w = topOneChain(m, ch);
    if (w.length > longest.length) longest = w;
    assert.ok(w.length <= 3, `${w} is longer than 3`);
  }
  console.log(`  longest top-1 word: "${longest}" (${longest.length} letters)`);
  // the same check from the other side: no 4-letter word has every letter as the top guess
  for (const a of ALPHABET.slice(1)) {
    const b = topK(m, a, 1)[0].ch;
    if (b === ' ') continue;
    const c = topK(m, b, 1)[0].ch;
    if (c === ' ') continue;
    assert.equal(topK(m, c, 1)[0].ch, ' ', `${a}${b}${c} continues with a letter`);
  }
});

test('bigram: q is followed by u (the field text uses a made-up 49 out of 50)', () => {
  const qu = prob(m, 'q', 'u');
  const qi = ALPHABET.indexOf('q'), ui = ALPHABET.indexOf('u');
  console.log(`  q -> u: ${data.counts[qi][ui]} of ${m.totals[qi]} = ${(qu * 100).toFixed(1)}%`);
  assert.ok(qu > 0.95);
  assert.equal(rank(m, 'q', 'u'), 0);
});

test('bigram: pairs the text names ("th", "he", "in", and "th" -> "the") are top guesses', () => {
  assert.equal(topK(m, 't', 1)[0].ch, 'h');
  assert.equal(topK(m, 'h', 1)[0].ch, 'e', 'after "th" the top guess is "e", so "the"');
  assert.equal(topK(m, 'i', 1)[0].ch, 'n');
  assert.equal(topK(m, ' ', 1)[0].ch, 't', 'words most often start with t');
});

test('bigram: writing 80 letters gives word-like gibberish', () => {
  for (let seed = 1; seed <= 25; seed++) {
    const out = sample(m, ' ', 80, seeded(seed));
    assert.equal(out.length, 80);
    assert.match(out, /^[ a-z]+$/);
    const words = out.split(' ').filter(Boolean);
    assert.ok(words.length >= 8, `has spaces between words (seed ${seed}: ${words.length} words)`);
    const mean = words.reduce((s, w) => s + w.length, 0) / words.length;
    assert.ok(mean > 1.5 && mean < 8, `word lengths look like words (seed ${seed}: mean ${mean.toFixed(1)})`);
    const pairs = ['th', 'he', 'in', 'an', 'er', 're', 'ou', 'ha', 'en', 'nd'].filter((p) => out.includes(p));
    assert.ok(pairs.length >= 2, `contains common pairs (seed ${seed}: ${pairs.join(',')})`);
    if (seed <= 2) console.log(`  seed ${seed}: "${out}"`);
  }
  // starting from a typed letter uses that letter's row
  const fromQ = sample(m, 'q', 1, seeded(7));
  assert.equal(fromQ, 'u');
});

test('bigram: the practice answer for "banana" is what a bigram model does', () => {
  const counts = Array.from({ length: 27 }, () => new Array(27).fill(0));
  const word = 'banana';
  for (let k = 1; k < word.length; k++) counts[ALPHABET.indexOf(word[k - 1])][ALPHABET.indexOf(word[k])]++;
  const bm = makeModel({ alphabet: ALPHABET, counts });
  assert.equal('b' + sample(bm, 'b', 11, seeded(3)), 'bananananana');
});

test('bigram: the text box keeps lowercase letters and spaces, at most 24', () => {
  assert.equal(clean('The Q-u!ck 42 fox'), 'the quck  fox');
  assert.equal(clean('a'.repeat(40)).length, 24);
  assert.equal(currentChar(''), ' ');
  assert.equal(currentChar('the '), ' ');
  assert.deepEqual(lastWord('so there  '), { word: 'there', start: 3 });
  assert.equal(TOP, 3);
});

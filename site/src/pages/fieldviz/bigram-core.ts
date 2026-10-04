// Field 3 — pure bigram logic (no browser code), so tests can import it.
// counts[a][b] = how often character b follows character a in the training text.
// Index 0 of the alphabet is the space.

export const ALPHABET = ' abcdefghijklmnopqrstuvwxyz';
/** How many guesses the bars show. */
export const TOP = 3;
/** A letter is "surprising" when the model gives it less than this chance. */
export const SURPRISE = 0.01;
/** The challenge needs a word with at least this many letters. */
export const MIN_LETTERS = 3;
/** Longest text the box accepts. */
export const MAX_CHARS = 24;
/** The word Show me types. */
export const DEMO_WORD = 'people';

export interface BigramData { alphabet: string; counts: number[][]; source?: string }

export interface Model {
  alphabet: string;
  counts: number[][];
  totals: number[];
  /** probs[a][b] = counts[a][b] / totals[a] */
  probs: number[][];
  /** For each row, the column indexes sorted by count (largest first; ties by index). */
  order: number[][];
}

export function makeModel(data: BigramData): Model {
  const { alphabet, counts } = data;
  const totals = counts.map((row) => row.reduce((s, v) => s + v, 0));
  const probs = counts.map((row, a) => row.map((v) => (totals[a] ? v / totals[a] : 0)));
  const order = counts.map((row) => row.map((_, j) => j).sort((x, y) => row[y] - row[x] || x - y));
  return { alphabet, counts, totals, probs, order };
}

export const indexOf = (m: Model, ch: string) => m.alphabet.indexOf(ch);

/** Lowercase, drop anything that isn't a letter or a space, cap the length. */
export function clean(text: string, max = MAX_CHARS): string {
  return text.toLowerCase().replace(/[^a-z ]/g, '').slice(0, max);
}

/** The character whose row the model reads next: the last one typed, or a space. */
export function currentChar(text: string): string {
  return text.length ? text[text.length - 1] : ' ';
}

/** Chance that b comes next, given the current character a. */
export function prob(m: Model, a: string, b: string): number {
  const i = indexOf(m, a), j = indexOf(m, b);
  return i < 0 || j < 0 ? 0 : m.probs[i][j];
}

/** 0 = the model's top guess after a, 1 = second, ... */
export function rank(m: Model, a: string, b: string): number {
  const i = indexOf(m, a), j = indexOf(m, b);
  return i < 0 || j < 0 ? Infinity : m.order[i].indexOf(j);
}

/** The model's k most likely next characters after a. */
export function topK(m: Model, a: string, k = TOP): { ch: string; p: number }[] {
  const i = Math.max(0, indexOf(m, a));
  return m.order[i].slice(0, k).map((j) => ({ ch: m.alphabet[j], p: m.probs[i][j] }));
}

/** The last run of letters in the text (ignores trailing spaces). */
export function lastWord(text: string): { word: string; start: number } {
  const re = /[a-z]+/g;
  let word = '', start = -1;
  for (let mm = re.exec(text); mm; mm = re.exec(text)) { word = mm[0]; start = mm.index; }
  return { word, start };
}

export interface LetterMark { ch: string; p: number | null; rank: number | null; surprising: boolean }
export interface WordCheck {
  word: string;
  letters: LetterMark[];
  /** Index of the letter with the smallest chance (-1 for a one-letter word). */
  rarest: number;
  minP: number;
  /** In the list of words from the training text. */
  isReal: boolean;
  /** A real word with at least one letter under the SURPRISE chance. */
  wins: boolean;
}

/** Give each letter after the first its chance after the letter before; find the rarest one. */
export function checkWord(m: Model, word: string, real?: Set<string>): WordCheck {
  const letters: LetterMark[] = [...word].map((ch, k) => {
    if (k === 0) return { ch, p: null, rank: null, surprising: false };
    const p = prob(m, word[k - 1], ch);
    return { ch, p, rank: rank(m, word[k - 1], ch), surprising: p < SURPRISE };
  });
  let rarest = -1, minP = Infinity;
  letters.forEach((l, k) => { if (l.p !== null && l.p < minP) { minP = l.p; rarest = k; } });
  const isReal = real ? real.has(word) : false;
  return { word, letters, rarest, minP, isReal, wins: isReal && word.length >= MIN_LETTERS && minP < SURPRISE };
}

/** Pick one next character at random, in proportion to the row's chances. */
export function pick(m: Model, a: string, rand: () => number): string {
  const i = Math.max(0, indexOf(m, a));
  const row = m.counts[i], total = m.totals[i];
  if (!total) return ' ';
  let r = rand() * total;
  for (let j = 0; j < row.length; j++) {
    r -= row[j];
    if (r < 0) return m.alphabet[j];
  }
  return m.alphabet[row.length - 1];
}

/** Write n characters: look up the row, pick, move to that character's row, repeat. */
export function sample(m: Model, start: string, n: number, rand: () => number): string {
  let cur = start || ' ', out = '';
  for (let k = 0; k < n; k++) { cur = pick(m, cur, rand); out += cur; }
  return out;
}

/** Follow only the single top guess from a starting letter, until that guess is a space. */
export function topOneChain(m: Model, first: string): string {
  let word = first;
  while (word.length < 30) {
    const next = topK(m, word[word.length - 1], 1)[0].ch;
    if (next === ' ') break;
    word += next;
  }
  return word;
}

/** Deterministic random numbers for tests (xorshift32). */
export function seeded(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

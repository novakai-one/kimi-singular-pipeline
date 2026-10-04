// Pure logic for "Put words in buckets" (DSA 2): input → frames. No DOM, so Node can test it.
// Bucket rule: (sum of the character codes of the word) mod 8. A bucket holds each word at most once.

export const N_BUCKETS = 8;
export const MAX_WORDS = 10;
export const MAX_LEN = 8;
/** The challenge: one bucket holds this many words or more. */
export const GOAL = 4;

/** Per-cell state. '' plain, cmp = being checked (blue), moved = dropped in this step (red),
 *  hi = current word (yellow), done = finished / found (green), dim = ruled out. */
export type CellState = '' | 'cmp' | 'moved' | 'hi' | 'done' | 'dim';

export interface Calc {
  word: string;
  codes: number[];
  sum: number;
  /** Show the division line (sum ÷ 8 = q remainder r). */
  showMod: boolean;
  bucket: number;
}

export interface HashFrame {
  note: string;
  line: number;
  mode: 'insert' | 'search';
  /** The words in the order typed (the list). */
  words: string[];
  listState: CellState[];
  /** Bucket contents at this step. */
  buckets: string[][];
  bucketState: CellState[][];
  /** The bucket being looked at, and how: cmp (checked, blue) or hi (the search result, yellow). */
  focus: { bucket: number; kind: 'cmp' | 'hi' } | null;
  /** Buckets the search ignores are drawn faded. */
  dimOthers: boolean;
  calc: Calc | null;
  target: string | null;
  /** Checks so far (search only). */
  listChecks: number;
  bucketChecks: number;
  /** The bucket cell that was dropped in this step (for the drop animation). */
  dropped: { bucket: number; index: number } | null;
  /** Rows to draw in each bucket: the same for the whole run, so the picture does not jump. */
  slots: number;
  [key: string]: unknown;
}

export const INSERT_CODE = [
  'for each word w in the list:',
  '  total = sum of the character codes of w',
  '  b = total mod 8',
  '  if w is already in bucket b: skip it',
  '  else: put w in bucket b',
];

export const SEARCH_CODE = [
  'for each word in the list, left to right:',
  '  if word == target: found',
  'not in the list',
  'b = (sum of character codes of target) mod 8',
  'for each word in bucket b:',
  '  if word == target: found',
  'not in the buckets',
];

export const codes = (w: string) => [...w].map((c) => c.charCodeAt(0));
export const codeSum = (w: string) => codes(w).reduce((a, b) => a + b, 0);
export const bucketOf = (w: string, n = N_BUCKETS) => codeSum(w) % n;

const WORD = /^[a-z]+$/;
const EXAMPLE = 'for example: cat dog sun';

function checkWord(w: string) {
  if (!WORD.test(w)) throw new Error(`"${w}" has a character outside a to z. Use lowercase letters a to z only, ${EXAMPLE}`);
  if (w.length > MAX_LEN) throw new Error(`"${w}" has ${w.length} letters. Use words of at most ${MAX_LEN} letters, so they fit in the boxes.`);
}

/** Parse "cat dog sun; sun" into words and an optional word to search for. Throws a readable Error. */
export function parseInput(text: string): { words: string[]; target: string | null } {
  const parts = text.split(';');
  if (parts.length > 2) throw new Error('Use one semicolon at most, before the word to search for, like: cat dog sun; sun');
  const words = parts[0].split(/[\s,]+/).filter(Boolean);
  if (!words.length) throw new Error(`Type some lowercase words separated by spaces, ${EXAMPLE}`);
  if (words.length > MAX_WORDS) throw new Error(`Enter at most ${MAX_WORDS} words, so every box stays readable.`);
  words.forEach(checkWord);
  let target: string | null = null;
  if (parts.length === 2 && parts[1].trim() !== '') {
    const t = parts[1].split(/[\s,]+/).filter(Boolean);
    if (t.length !== 1) throw new Error('After the semicolon, put one word to search for, like: cat dog sun; sun');
    checkWord(t[0]);
    target = t[0];
  }
  return { words, target };
}

/** Put every word in its bucket, in typed order. A word already in its bucket is not added again. */
export function buildBuckets(words: string[], n = N_BUCKETS): string[][] {
  const buckets: string[][] = Array.from({ length: n }, () => []);
  for (const w of words) {
    const b = bucketOf(w, n);
    if (!buckets[b].includes(w)) buckets[b].push(w);
  }
  return buckets;
}

/** The fullest bucket (lowest number on a tie). */
export function fullest(buckets: string[][]) {
  let bucket = 0;
  buckets.forEach((b, i) => { if (b.length > buckets[bucket].length) bucket = i; });
  return { bucket, count: buckets[bucket].length, words: buckets[bucket].slice() };
}

/** Does this input meet the challenge goal (one bucket holds GOAL words or more)? */
export const meetsGoal = (words: string[]) => fullest(buildBuckets(words)).count >= GOAL;

/** Checks a left-to-right list search makes: position + 1 if found, else every word. */
export function listChecks(words: string[], target: string) {
  const i = words.indexOf(target);
  return i < 0 ? words.length : i + 1;
}

/** Checks inside the target's bucket: position + 1 if found, else every word in that bucket. */
export function bucketChecks(buckets: string[][], target: string) {
  const b = buckets[bucketOf(target, buckets.length)];
  const i = b.indexOf(target);
  return i < 0 ? b.length : i + 1;
}

export const plural = (n: number, one: string, many = one + 's') => `${n} ${n === 1 ? one : many}`;
export const listOf = (xs: string[]) => xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`;
const sortLetters = (w: string) => [...w].sort().join('');

function calcOf(word: string, showMod: boolean): Calc {
  return { word, codes: codes(word), sum: codeSum(word), showMod, bucket: bucketOf(word) };
}

function sumSentence(w: string) {
  const c = codes(w);
  return c.length === 1
    ? `**${w}** has one letter, with character code **${c[0]}**.`
    : `**${w}**: add up the character codes: ${c.join(' + ')} = **${codeSum(w)}**.`;
}

function modSentence(w: string) {
  const sum = codeSum(w);
  return `${sum} ÷ 8 = ${Math.floor(sum / 8)}, remainder **${sum % 8}**. So ${w} belongs in bucket **${sum % 8}**.`;
}

/** Why a new word lands in a bucket that already holds others. */
function collisionReason(w: string, others: string[]) {
  const same = others.find((o) => sortLetters(o) === sortLetters(w));
  if (same) return `Same letters as ${same} give the same sum, ${codeSum(w)}, so they land in the same bucket: a **collision**.`;
  const sameSum = others.find((o) => codeSum(o) === codeSum(w));
  if (sameSum) return `Different letters from ${sameSum}, but the same sum, ${codeSum(w)}, so the same bucket: a **collision**.`;
  const o = others[0];
  return `Its sum, ${codeSum(w)}, differs from ${o}'s ${codeSum(o)}, but both leave remainder ${bucketOf(w)}: a **collision**.`;
}

const slotsFor = (words: string[]) => Math.max(3, fullest(buildBuckets(words)).count);
const emptyStates = (buckets: string[][], s: CellState = ''): CellState[][] => buckets.map((b) => b.map(() => s));
const copy = (buckets: string[][]) => buckets.map((b) => b.slice());

// ------------------------------------------------------------------ insert
export function insertFrames(words: string[], target: string | null = null): HashFrame[] {
  const n = words.length;
  const buckets: string[][] = Array.from({ length: N_BUCKETS }, () => []);
  const frames: HashFrame[] = [];
  const slots = slotsFor(words);
  const listFor = (cur: number): CellState[] => words.map((_, k) => (k < cur ? 'done' : k === cur ? 'hi' : ''));
  const push = (f: Partial<HashFrame> & { note: string; line: number }) => frames.push({
    mode: 'insert', words: words.slice(), listState: words.map(() => '' as CellState), buckets: copy(buckets),
    bucketState: emptyStates(buckets), focus: null, dimOthers: false, calc: null, target, listChecks: 0, bucketChecks: 0,
    dropped: null, slots, ...f,
  });

  push({ note: `Start: ${plural(n, 'word')} in a list, in the order you typed them, and 8 empty buckets.`, line: 0 });
  words.forEach((w, i) => {
    const b = bucketOf(w);
    push({ note: sumSentence(w), line: 1, listState: listFor(i), calc: calcOf(w, false) });
    push({ note: modSentence(w), line: 2, listState: listFor(i), calc: calcOf(w, true), focus: { bucket: b, kind: 'cmp' } });
    const before = buckets[b].slice();
    if (before.includes(w)) {
      const st = emptyStates(buckets);
      st[b][before.indexOf(w)] = 'hi';
      push({ note: `${w} is already in bucket ${b}, so it is not added again. A bucket holds each word once.`, line: 3,
        listState: listFor(i), calc: calcOf(w, true), focus: { bucket: b, kind: 'cmp' }, bucketState: st });
      return;
    }
    buckets[b].push(w);
    const st = emptyStates(buckets);
    st[b][buckets[b].length - 1] = 'moved';
    push({
      note: before.length
        ? `${w} drops into bucket ${b}, next to ${listOf(before)}. ${collisionReason(w, before)}`
        : `${w} drops into bucket ${b}.`,
      line: 4, listState: listFor(i), calc: calcOf(w, true), focus: { bucket: b, kind: 'cmp' }, bucketState: st,
      dropped: { bucket: b, index: buckets[b].length - 1 },
    });
  });
  const f = fullest(buckets);
  const stored = buckets.reduce((a, b) => a + b.length, 0);
  push({
    note: `Done: ${plural(stored, 'different word')} in 8 buckets. The fullest is bucket ${f.bucket}, with ${plural(f.count, 'word')}.`
      + (target ? ` Switch to **Search** to look for ${target}.` : ''),
    line: -1, listState: words.map(() => 'done'), bucketState: emptyStates(buckets, 'done'),
  });
  return frames;
}

// ------------------------------------------------------------------ search
export function searchFrames(words: string[], target: string | null): HashFrame[] {
  const t = target ?? words[words.length - 1];
  const buckets = buildBuckets(words);
  const b = bucketOf(t);
  const frames: HashFrame[] = [];
  let lc = 0, bc = 0;
  let listState: CellState[] = words.map(() => '');
  const push = (f: Partial<HashFrame> & { note: string; line: number }) => frames.push({
    mode: 'search', words: words.slice(), listState: listState.slice(), buckets: copy(buckets), bucketState: emptyStates(buckets),
    focus: null, dimOthers: false, calc: null, target: t, listChecks: lc, bucketChecks: bc, dropped: null,
    slots: slotsFor(words), ...f,
  });

  push({
    note: `${plural(words.length, 'word')} ${words.length === 1 ? 'is' : 'are'} in the list and in the buckets. Search for **${t}**`
      + (target === null ? ' (the last word you typed; add "; word" to choose another).' : '.') + ' First, walk the list.',
    line: 0,
  });

  // the list, left to right
  let foundAt = -1;
  for (let i = 0; i < words.length; i++) {
    lc++;
    listState = words.map((_, k) => (k < i ? 'dim' : ''));
    if (words[i] === t) {
      listState[i] = 'done';
      foundAt = i;
      push({ note: `List check ${lc}: ${words[i]} is ${t}. Found at position ${i}, after **${plural(lc, 'check')}**.`, line: 1 });
      break;
    }
    listState[i] = 'cmp';
    push({ note: `List check ${lc}: is ${words[i]} the word ${t}? No.`, line: 1 });
  }
  if (foundAt < 0) {
    listState = words.map(() => 'dim');
    push({ note: `${t} is not in the list. Every word was checked: **${plural(lc, 'check')}**.`, line: 2 });
  }

  // one bucket
  const calc = calcOf(t, true);
  const sum = codeSum(t);
  push({
    note: `Now the buckets. ${t}: ${codes(t).join(' + ')} = ${sum}, and ${sum} ÷ 8 leaves remainder **${b}**. Jump straight to bucket ${b}.`,
    line: 3, calc, focus: { bucket: b, kind: 'hi' }, dimOthers: true,
  });
  const inB = buckets[b];
  let found = false;
  for (let j = 0; j < inB.length; j++) {
    bc++;
    const st = emptyStates(buckets);
    for (let k = 0; k < j; k++) st[b][k] = 'dim';
    if (inB[j] === t) {
      st[b][j] = 'done';
      found = true;
      push({ note: `Bucket check ${bc}: ${inB[j]} is ${t}. Found, after **${plural(bc, 'check')}**.`, line: 5, calc,
        focus: { bucket: b, kind: 'hi' }, dimOthers: true, bucketState: st });
      break;
    }
    st[b][j] = 'cmp';
    push({ note: `Bucket check ${bc}: is ${inB[j]} the word ${t}? No.`, line: 5, calc, focus: { bucket: b, kind: 'hi' }, dimOthers: true, bucketState: st });
  }
  const finalSt = emptyStates(buckets);
  if (!found) {
    finalSt[b] = inB.map(() => 'dim');
    push({
      note: inB.length
        ? `${t} is not in bucket ${b}, so it is not in the buckets at all: **${plural(bc, 'check')}**.`
        : `Bucket ${b} is empty, so ${t} is not in the buckets: **0 checks**.`,
      line: 6, calc, focus: { bucket: b, kind: 'hi' }, dimOthers: true, bucketState: finalSt,
    });
  } else {
    inB.forEach((w, k) => { finalSt[b][k] = w === t ? 'done' : k < bc ? 'dim' : ''; });
  }

  // compare
  let verdict: string;
  if (bc < lc) verdict = `The bucket search needed ${plural(lc - bc, 'check')} fewer.`;
  else if (foundAt === 0) verdict = `The same: ${t} is the first word in the list.`;
  else verdict = `The same: every word the list walk checked is in bucket ${b}.`;
  push({
    note: `List: **${plural(lc, 'check')}**. Bucket: **${plural(bc, 'check')}**. ${verdict}`,
    line: -1, calc, focus: { bucket: b, kind: 'hi' }, dimOthers: true, bucketState: finalSt,
  });
  return frames;
}

// ------------------------------------------------------------------ inputs
export const DEFAULT_INPUT = 'cat dog sun map key box pen';
export const SHOW_ME_INPUT = 'stop pots tops spot';

export const PRESETS = [
  { label: 'Short words', value: DEFAULT_INPUT },
  { label: 'Same letters', value: 'arc car cat act lamp palm' },
  { label: 'Search for sun', value: `${DEFAULT_INPUT}; sun` },
  { label: 'Search for owl', value: `${DEFAULT_INPUT}; owl` },
];

/** Words for the Random button. */
export const WORD_BANK = (
  'cat dog sun map key box pen cup owl fox bee ant yak elk hat pig cow hen bat jar ink oak sky ice gem hut kit log mud '
  + 'net pot rug tin van web zip bird fish frog lion wolf bear moon rain snow wind leaf tree rock sand gold ruby blue pink '
  + 'teal navy jade mint rose lamp ship'
).split(' ');

/** A random list of 6 to 9 different words that does not already meet the goal. */
export function randomInput(rand: () => number = Math.random): string {
  for (;;) {
    const n = 6 + Math.floor(rand() * 4);
    const pool = WORD_BANK.slice();
    const words: string[] = [];
    while (words.length < n) words.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]);
    if (!meetsGoal(words)) return words.join(' ');
  }
}

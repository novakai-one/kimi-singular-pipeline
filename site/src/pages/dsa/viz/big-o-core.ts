// Pure logic for the Big-O visualiser: the three programs, a fair timer, input checks and frames.
// No DOM, so Node can test it. The timer takes a clock function, so tests can use a fake clock.

export type ProgKey = 'one' | 'sort' | 'pair';

/** Two numbers closer than this count as a close pair. */
export const CLOSE = 0.001;

/** One pass: add up every number. */
export function onePass(a: Float64Array): number {
  let total = 0;
  for (let i = 0; i < a.length; i++) total += a[i];
  return total;
}

let sortBuf = new Float64Array(0);
/** Sorting: copy the numbers and sort the copy (the built-in numeric sort). Returns the sorted copy. */
export function sortedCopy(a: Float64Array): Float64Array {
  if (sortBuf.length !== a.length) sortBuf = new Float64Array(a.length);
  sortBuf.set(a);
  sortBuf.sort();
  return sortBuf;
}
const sortProgram = (a: Float64Array) => {
  const s = sortedCopy(a);
  return s[0] + s[s.length - 1];
};

/** Every pair: count the pairs of numbers that are closer than CLOSE. */
export function everyPair(a: Float64Array): number {
  const n = a.length;
  let count = 0;
  for (let i = 0; i < n; i++) {
    const x = a[i];
    for (let j = i + 1; j < n; j++) {
      if (Math.abs(x - a[j]) < CLOSE) count++;
    }
  }
  return count;
}

export interface Program {
  key: ProgKey;
  /** Name used in notes, labels and the legend. */
  name: string;
  run: (a: Float64Array) => number;
  /** Pseudocode line that times this program. */
  line: number;
}

export const PROGRAMS: Program[] = [
  { key: 'one', name: 'one pass', run: onePass, line: 2 },
  { key: 'sort', name: 'sorting', run: sortProgram, line: 3 },
  { key: 'pair', name: 'every pair', run: everyPair, line: 4 },
];

export const CODE = [
  'for each size n:',
  '  a = n random numbers',
  '  time one_pass(a)',
  '  time sort(a)',
  '  time every_pair(a)',
  '  ratio = time ÷ time at last n',
  'one_pass(a):  # add them up',
  '  total = 0',
  '  for x in a: total += x',
  'sort(a):  # built-in sort',
  '  sort a copy of a',
  'every_pair(a):  # close pairs',
  '  count = 0',
  '  for i in 0 … n−1:',
  '    for j in i+1 … n−1:',
  '      if |a[i] − a[j]| < 0.001:',
  '        count += 1',
];
export const LINE_PAIR = 4;
export const LINE_RATIO = 5;

// ------------------------------------------------------------------ step counts (exact, for checking the text)

/** Additions made by one pass over n numbers. */
export const onePassSteps = (n: number) => n;
/** Comparisons made by every pair over n numbers: n(n − 1)/2. */
export const everyPairSteps = (n: number) => (n * (n - 1)) / 2;
/** Steps of a loop inside a loop, both over all n items (one step per inner turn). */
export function nestedLoopSteps(n: number): number {
  let steps = 0;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) steps++;
  return steps;
}
/** Halve (whole-number division) until one item is left; returns the number of halvings. */
export function halvingSteps(n: number): number {
  let steps = 0;
  while (n > 1) { n = Math.floor(n / 2); steps++; }
  return steps;
}

// ------------------------------------------------------------------ random data

/** n random numbers from 0 to 1, the same ones for the same seed. */
export function makeData(n: number, seed: number): Float64Array {
  let s = (seed >>> 0) || 1;
  const a = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5; s >>>= 0;
    a[i] = s / 4294967296;
  }
  return a;
}

// ------------------------------------------------------------------ fair timing

export interface TimeOpts {
  /** Each timed block repeats the call until it lasts at least this long. */
  minBlockMs: number;
  /** Timed blocks per size (the fastest is kept). */
  blocks: number;
  /** A call this slow is timed only 3 times. */
  bigCallMs: number;
}
/** Every pair is the program you guess, so it gets longer blocks. */
export const TIME_OPTS: Record<ProgKey, TimeOpts> = {
  one: { minBlockMs: 15, blocks: 5, bigCallMs: 100 },
  sort: { minBlockMs: 15, blocks: 5, bigCallMs: 100 },
  pair: { minBlockMs: 30, blocks: 5, bigCallMs: 100 },
};

let sink = 0;
/** Results are added here so the browser can't skip the work. */
export const sinkValue = () => sink;

function block(run: (a: Float64Array) => number, a: Float64Array, reps: number, now: () => number): number {
  const t0 = now();
  for (let k = 0; k < reps; k++) sink += run(a);
  return now() - t0;
}

export interface Progress {
  phase: 'warm' | 'time';
  /** Timed blocks done so far, and in all (phase 'time'). */
  done: number;
  total: number;
}
export interface MeasureResult {
  times: Times[];
  /** Time of one call in each timed block, per size and program. */
  samples: Record<ProgKey, number[]>[];
  reps: Record<ProgKey, number>[];
}

/**
 * Time every program at every size, fairly.
 * 1. Warm up, smallest size first: run each program in growing blocks until a block lasts minBlockMs.
 *    This lets the browser compile the code, and sets how many calls make one block.
 * 2. Time in rounds. Each round times one block of every program at every size (the order flips each round),
 *    so a slow spell on the computer hits every size alike.
 * 3. Keep the fastest block. Other programs on the computer can only make a block slower, never faster,
 *    so the fastest block is the closest to the program's own time. (Python's timeit uses the same rule.)
 * It yields after every block, so the page can redraw in between.
 */
export function* measureAll(
  sizes: number[], seed: number, now: () => number,
  programs: Program[] = PROGRAMS, opts: Record<ProgKey, TimeOpts> = TIME_OPTS,
): Generator<Progress, MeasureResult, void> {
  const data = sizes.map((n, k) => makeData(n, seed + k));
  const reps = sizes.map(() => ({} as Record<ProgKey, number>));
  const need = sizes.map(() => ({} as Record<ProgKey, number>));
  let total = 0;
  for (const p of programs) {
    const o = opts[p.key];
    let perCall = 0;
    for (let k = 0; k < sizes.length; k++) {
      // a guess from the size before; if one call is already long, the code is warm and needs no warm-up here
      const est = k > 0 ? perCall * (sizes[k] / sizes[k - 1]) ** (p.key === 'pair' ? 2 : 1) : 0;
      let r = 1;
      if (est >= o.minBlockMs) {
        perCall = est;
      } else {
        for (let tries = 0; ; tries++) {
          const t = block(p.run, data[k], r, now);
          yield { phase: 'warm', done: 0, total: 0 };
          perCall = t / r;
          if (t >= o.minBlockMs || tries > 40) break;
          r = Math.max(r * 2, Math.ceil((r * o.minBlockMs * 1.2) / Math.max(t, o.minBlockMs / 50)));
        }
      }
      reps[k][p.key] = r;
      need[k][p.key] = perCall >= o.bigCallMs ? 3 : o.blocks;
      total += need[k][p.key];
    }
  }
  const samples = sizes.map(() => ({} as Record<ProgKey, number[]>));
  for (const sm of samples) for (const p of programs) sm[p.key] = [];
  const rounds = Math.max(...need.flatMap((x) => Object.values(x)));
  const forward = sizes.map((_, k) => k);
  let done = 0;
  for (let round = 0; round < rounds; round++) {
    for (const k of round % 2 ? forward.slice().reverse() : forward) {
      for (const p of programs) {
        // a program timed fewer times is timed in rounds spread out evenly (3 of 5: rounds 0, 2 and 4)
        const m = need[k][p.key];
        const due = m >= rounds || (m < 2 ? round === 0 : Array.from({ length: m }, (_, i) => Math.round((i * (rounds - 1)) / (m - 1))).includes(round));
        if (!due || samples[k][p.key].length >= m) continue;
        samples[k][p.key].push(block(p.run, data[k], reps[k][p.key], now) / reps[k][p.key]);
        done++;
        yield { phase: 'time', done, total };
      }
    }
  }
  const times = samples.map((sm) => {
    const t = {} as Times;
    for (const p of programs) t[p.key] = Math.min(...sm[p.key]);
    return t;
  });
  return { times, samples, reps };
}

/** Run measureAll to the end without pauses (for tests). */
export function measureAllSync(sizes: number[], seed: number, now: () => number, programs?: Program[], opts?: Record<ProgKey, TimeOpts>): MeasureResult {
  const g = measureAll(sizes, seed, now, programs, opts);
  let step = g.next();
  while (!step.done) step = g.next();
  return step.value;
}

// ------------------------------------------------------------------ the challenge

/** Win when the measured time is within 30% of the guess. */
export const TOLERANCE = 0.3;
export function guessResult(guessMs: number, measuredMs: number): { off: number; win: boolean } {
  const off = (measuredMs - guessMs) / guessMs;
  return { off, win: Math.abs(off) <= TOLERANCE + 1e-12 };
}
/** The guess that follows the pattern: the last time × (size ratio)², rounded to 2 significant figures. */
export function patternGuess(prevMs: number, prevN: number, nextN: number): number {
  return Number(((prevMs * (nextN / prevN) ** 2)).toPrecision(2));
}

// ------------------------------------------------------------------ input

export const MIN_SIZE = 200;
export const MAX_SIZE = 32000;
export const MAX_SIZES = 7;
export const MIN_STEP = 1.5;
export const DEFAULT_SIZES = '1000 2000 4000 8000 16000 32000';
export const PRESETS = [
  { label: 'Double from 1,000', value: DEFAULT_SIZES },
  { label: 'Double from 500', value: '500 1000 2000 4000 8000 16000' },
  { label: 'Triple from 1,000', value: '1000 3000 9000 27000' },
];
/** A random start from 300 to 2,000, doubled while it stays at most MAX_SIZE (5 to 7 sizes). */
export function randomSizes(rand: () => number): string {
  const start = 300 + 100 * Math.floor(rand() * 18);
  const sizes: number[] = [];
  for (let n = start; n <= MAX_SIZE && sizes.length < MAX_SIZES; n *= 2) sizes.push(n);
  return sizes.join(' ');
}

/** Parse "1000 2000 4000" (or "1,000, 2,000") into sizes. Throws an Error with a plain message. */
export function parseSizes(text: string): number[] {
  const cleaned = text.replace(/(\d),(?=\d{3}(?!\d))/g, '$1');
  const parts = cleaned.split(/[\s,;]+/).filter(Boolean);
  const sizes = parts.map(Number);
  if (sizes.some((n) => !Number.isInteger(n))) throw new Error('Type whole numbers separated by spaces, for example: 1000 2000 4000 8000');
  if (sizes.length < 2) throw new Error('Type at least 2 sizes, so there is a ratio to see. For example: 1000 2000 4000');
  if (sizes.length > MAX_SIZES) throw new Error(`Type at most ${MAX_SIZES} sizes.`);
  if (sizes.some((n) => n < MIN_SIZE || n > MAX_SIZE)) throw new Error(`Use sizes from ${MIN_SIZE} to ${fmtN(MAX_SIZE)}. Bigger sizes make every pair take seconds.`);
  for (let k = 1; k < sizes.length; k++) {
    if (sizes[k] < sizes[k - 1] * MIN_STEP) throw new Error('Make each size at least 1.5 times the one before, for example: 1000 2000 4000 8000');
  }
  return sizes;
}

// ------------------------------------------------------------------ formatting

export const fmtN = (n: number) => n.toLocaleString('en-US');
/** Milliseconds, 2 significant figures below 10, then 1 decimal, then whole numbers. */
export function fmtMs(ms: number): string {
  if (ms >= 100) return Math.round(ms).toLocaleString('en-US');
  if (ms >= 10) return ms.toFixed(1);
  return ms.toPrecision(2);
}
export const fmtRatio = (r: number) => r.toFixed(1);
/** "2", "1.5", "3.33": a size ratio with no trailing zeros. */
export const fmtTimes = (r: number) => String(Number(r.toFixed(2)));

// ------------------------------------------------------------------ frames

export type Times = Record<ProgKey, number>;

export interface RunState {
  sizes: number[];
  seed: number;
  /** Measured times per size (null until measured). */
  times: (Times | null)[];
  /** The guess for each size (ms), fixed when that size is revealed. */
  guesses: (number | null)[];
  /** True when Show me typed that guess. */
  shown: boolean[];
  /** True while the sizes are being timed. */
  measuring: boolean;
  /** How much of the timing is done, from 0 to 1. */
  progress: number;
}

export interface BigOFrame {
  note: string;
  line: number;
  /** This frame reveals sizes 0..k. */
  k: number;
  run: RunState;
  [key: string]: unknown;
}

export function newRun(sizes: number[], seed: number): RunState {
  return {
    sizes, seed,
    times: sizes.map(() => null),
    guesses: sizes.map(() => null),
    shown: sizes.map(() => false),
    measuring: false,
    progress: 0,
  };
}

/** Ratio of a program's time at size k to its time at size k − 1 (null if not both measured). */
export function ratioAt(run: RunState, k: number, key: ProgKey): number | null {
  if (k < 1) return null;
  const a = run.times[k - 1], b = run.times[k];
  return a && b ? b[key] / a[key] : null;
}

/** One sentence about size k, with the numbers from this run. */
export function noteFor(run: RunState, k: number): string {
  const n = fmtN(run.sizes[k]);
  const t = run.times[k];
  if (!t) {
    return `Timing the three programs at all ${run.sizes.length} sizes first (${Math.round(run.progress * 100)}% done); each size stays hidden until you step to it.`;
  }
  if (k === 0) {
    return `n = ${n}: every pair took **${fmtMs(t.pair)} ms**, sorting ${fmtMs(t.sort)} ms, and one pass ${fmtMs(t.one)} ms.`;
  }
  const grow = fmtTimes(run.sizes[k] / run.sizes[k - 1]);
  const r = (key: ProgKey) => fmtRatio(ratioAt(run, k, key)!);
  return `n = ${n} is ${grow} times n = ${fmtN(run.sizes[k - 1])}. Every pair took **${fmtMs(t.pair)} ms**, ${r('pair')} times as long. Sorting took ${r('sort')} times as long, one pass ${r('one')} times.`;
}

/** One frame per size. Each note reads the shared run, so it shows the times once they are measured. */
export function makeFrames(sizes: number[], seed: number): BigOFrame[] {
  const run = newRun(sizes, seed);
  return sizes.map((_, k) => ({
    k, run,
    line: k === 0 ? LINE_PAIR : LINE_RATIO,
    get note() { return noteFor(run, k); },
  }));
}

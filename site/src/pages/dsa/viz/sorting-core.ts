// Pure logic for the sorting and binary search visualiser: input → frames. No DOM, so Node can test it.

/** Per-bar state, drawn with the shared .dv-bar classes. */
export type BarState = '' | 'cmp' | 'swap' | 'done' | 'pivot' | 'dim';

export interface SortFrame {
  note: string;
  line: number;
  arr: number[];
  state: BarState[];
  /** Comparisons made so far. */
  comps: number;
  /** Labels under bars, e.g. "lo", "mid". */
  marks?: { i: number; label: string }[];
  /** Merge sort: the merged output so far, drawn under positions start.. */
  buffer?: { start: number; values: number[] };
  /** The part of the list being worked on: first and last position (inclusive). */
  range?: [number, number];
  [key: string]: unknown;
}

export const MERGE_CODE = [
  'mergesort(part):',
  '  if the part has 1 item: done',
  '  split it into a left and a right half',
  '  mergesort(left); mergesort(right)',
  '  while both halves have items:',
  '    compare the two front items',
  '    move the smaller to the output',
  '  copy the rest, then copy the output back',
];

export const QUICK_CODE = [
  'quicksort(lo, hi):',
  '  if lo ≥ hi: done',
  '  pivot = the first item',
  '  for each other item:',
  '    compare it with the pivot',
  '    if smaller: swap it into the left part',
  '  swap the pivot between the two parts',
  '  quicksort(left part); quicksort(right part)',
];

export const BINARY_CODE = [
  'lo = 0, hi = n − 1',
  'while lo ≤ hi:',
  '  mid = (lo + hi) // 2',
  '  if list[mid] == target: found',
  '  if list[mid] < target: lo = mid + 1',
  '  else: hi = mid − 1',
  'not found',
];

export const MIN_N = 2;
export const MAX_N = 12;

/** Parse "5 2 9; 7" into numbers and an optional target. Throws a readable Error. */
export function parseInput(text: string): { nums: number[]; target: number | null } {
  const [listPart, targetPart] = text.split(';');
  const parts = listPart.split(/[\s,]+/).filter(Boolean);
  const nums = parts.map(Number);
  if (nums.some((n) => !Number.isInteger(n))) throw new Error('Use whole numbers separated by spaces or commas, for example: 5 2 9 1 7');
  if (nums.length < MIN_N) throw new Error(`Enter at least ${MIN_N} numbers.`);
  if (nums.length > MAX_N) throw new Error(`Enter at most ${MAX_N} numbers, so every bar stays readable.`);
  if (nums.some((n) => n < 1 || n > 99)) throw new Error('Use numbers from 1 to 99.');
  let target: number | null = null;
  if (targetPart !== undefined && targetPart.trim() !== '') {
    target = Number(targetPart.trim());
    if (!Number.isInteger(target)) throw new Error('After the semicolon, put one whole number to search for.');
  }
  return { nums, target };
}

const fill = (n: number, s: BarState = ''): BarState[] => Array.from({ length: n }, () => s);

// ------------------------------------------------------------------ merge sort
export function mergeSortFrames(input: number[]): SortFrame[] {
  const arr = input.slice();
  const n = arr.length;
  const frames: SortFrame[] = [];
  let comps = 0;
  const sortedRanges: [number, number][] = [];
  const base = (): BarState[] => {
    const s = fill(n, 'dim');
    return s;
  };
  const push = (f: Omit<SortFrame, 'arr' | 'comps'> & { arr?: number[] }) =>
    frames.push({ ...f, arr: (f.arr ?? arr).slice(), comps } as SortFrame);

  push({ note: `Start: ${n} numbers in no order.`, line: 0, state: fill(n) });

  function rec(lo: number, hi: number) {
    if (hi - lo <= 1) return;
    const mid = (lo + hi) >> 1;
    const st = base();
    for (let k = lo; k < hi; k++) st[k] = '';
    push({ note: `Split positions ${lo}–${hi - 1} into two halves: ${lo}–${mid - 1} and ${mid}–${hi - 1}.`, line: 2, state: st, range: [lo, hi - 1],
      marks: [{ i: lo, label: 'lo' }, { i: mid, label: 'mid' }] });
    rec(lo, mid);
    rec(mid, hi);
    merge(lo, mid, hi);
  }

  function merge(lo: number, mid: number, hi: number) {
    const out: number[] = [];
    let i = lo, j = mid;
    const stateFor = (a: number, b: number, moved?: number): BarState[] => {
      const st = base();
      for (let k = lo; k < hi; k++) st[k] = '';
      for (let k = lo; k < i; k++) st[k] = 'dim';
      for (let k = mid; k < j; k++) st[k] = 'dim';
      if (a >= 0 && a < mid) st[a] = 'cmp';
      if (b >= 0 && b < hi) st[b] = 'cmp';
      if (moved !== undefined) st[moved] = 'swap';
      return st;
    };
    while (i < mid && j < hi) {
      comps++;
      push({ note: `Compare the two front items: **${arr[i]}** (left half) and **${arr[j]}** (right half).`, line: 5, state: stateFor(i, j), range: [lo, hi - 1],
        buffer: { start: lo, values: out.slice() }, marks: [{ i, label: 'L' }, { i: j, label: 'R' }] });
      if (arr[i] <= arr[j]) {
        out.push(arr[i]);
        push({ note: `${arr[i]} is smaller (or equal): it moves to the output.`, line: 6, state: stateFor(-1, -1, i), range: [lo, hi - 1], buffer: { start: lo, values: out.slice() } });
        i++;
      } else {
        out.push(arr[j]);
        push({ note: `${arr[j]} is smaller: it moves to the output.`, line: 6, state: stateFor(-1, -1, j), range: [lo, hi - 1], buffer: { start: lo, values: out.slice() } });
        j++;
      }
    }
    const rest = i < mid ? arr.slice(i, mid) : arr.slice(j, hi);
    out.push(...rest);
    for (let k = 0; k < out.length; k++) arr[lo + k] = out[k];
    sortedRanges.push([lo, hi]);
    const st = base();
    for (let k = lo; k < hi; k++) st[k] = hi - lo === n ? 'done' : 'pivot';
    push({ note: rest.length
      ? `One half is empty, so ${rest.join(', ')} ${rest.length > 1 ? 'are' : 'is'} copied without comparing. Positions ${lo}–${hi - 1} are now sorted.`
      : `Positions ${lo}–${hi - 1} are now sorted.`, line: 7, state: st, range: [lo, hi - 1] });
  }

  rec(0, n);
  push({ note: `Sorted, with **${comps} comparisons**.`, line: -1, state: fill(n, 'done') });
  return frames;
}

// ------------------------------------------------------------------ quicksort (first item as pivot)
export function quickSortFrames(input: number[]): SortFrame[] {
  const arr = input.slice();
  const n = arr.length;
  const frames: SortFrame[] = [];
  const done = new Set<number>();
  let comps = 0;
  const push = (f: Omit<SortFrame, 'arr' | 'comps'>) => frames.push({ ...f, arr: arr.slice(), comps } as SortFrame);
  const stateIn = (lo: number, hi: number): BarState[] => {
    const st = fill(n, 'dim');
    for (let k = lo; k <= hi; k++) st[k] = '';
    for (const k of done) st[k] = 'done';
    return st;
  };

  push({ note: `Start: ${n} numbers in no order.`, line: 0, state: fill(n) });

  function rec(lo: number, hi: number) {
    if (lo > hi) return;
    if (lo === hi) {
      done.add(lo);
      push({ note: `Positions ${lo}–${hi}: one item, already in place.`, line: 1, state: stateIn(lo, hi), range: [lo, hi] });
      return;
    }
    const pivot = arr[lo];
    let store = lo;
    let st = stateIn(lo, hi); st[lo] = 'pivot';
    push({ note: `Work on positions ${lo}–${hi}. The pivot is the first item: **${pivot}**.`, line: 2, state: st, range: [lo, hi], marks: [{ i: lo, label: 'pivot' }] });
    for (let i = lo + 1; i <= hi; i++) {
      comps++;
      st = stateIn(lo, hi); st[lo] = 'pivot'; st[i] = 'cmp';
      push({ note: `Compare ${arr[i]} with the pivot ${pivot}.`, line: 4, state: st, range: [lo, hi], marks: [{ i: lo, label: 'pivot' }, { i, label: 'i' }] });
      if (arr[i] < pivot) {
        store++;
        [arr[store], arr[i]] = [arr[i], arr[store]];
        st = stateIn(lo, hi); st[lo] = 'pivot'; st[store] = 'swap'; if (i !== store) st[i] = 'swap';
        push({ note: store === i ? `${arr[store]} < ${pivot}: it is already in the left part.` : `${arr[store]} < ${pivot}: swap it into the left part.`, line: 5, state: st, range: [lo, hi] });
      }
    }
    [arr[lo], arr[store]] = [arr[store], arr[lo]];
    done.add(store);
    st = stateIn(lo, hi);
    const left = store - lo, right = hi - store;
    push({ note: `Put the pivot ${pivot} between the parts, at position ${store}: its final place. Left part: ${left} item${left === 1 ? '' : 's'}, right part: ${right}.`
      + (left === 0 || right === 0 ? ' **One part is empty: this split removed only the pivot.**' : ''), line: 6, state: st, range: [lo, hi] });
    rec(lo, store - 1);
    rec(store + 1, hi);
  }

  rec(0, n - 1);
  push({ note: `Sorted, with **${comps} comparisons**.`, line: -1, state: fill(n, 'done') });
  return frames;
}

// ------------------------------------------------------------------ binary search
export function binarySearchFrames(input: number[], target: number | null): SortFrame[] {
  const arr = input.slice().sort((a, b) => a - b);
  const n = arr.length;
  const t = target ?? input[0];
  const frames: SortFrame[] = [];
  let comps = 0;
  const push = (f: Omit<SortFrame, 'arr' | 'comps'>) => frames.push({ ...f, arr: arr.slice(), comps } as SortFrame);
  const stateIn = (lo: number, hi: number): BarState[] => {
    const st = fill(n, 'dim');
    for (let k = lo; k <= hi; k++) st[k] = '';
    return st;
  };
  let lo = 0, hi = n - 1;
  push({ note: `The list, sorted first. Search for **${t}**${target === null ? ' (the first number you typed; add "; n" to choose another)' : ''}.`, line: 0, state: stateIn(lo, hi),
    marks: [{ i: lo, label: 'lo' }, { i: hi, label: 'hi' }] });
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    comps++;
    let st = stateIn(lo, hi); st[mid] = 'cmp';
    push({ note: `Check the middle of positions ${lo}–${hi}: position ${mid} holds ${arr[mid]}.`, line: 2, state: st,
      marks: [{ i: lo, label: 'lo' }, { i: mid, label: 'mid' }, { i: hi, label: 'hi' }] });
    if (arr[mid] === t) {
      st = stateIn(lo, hi); st[mid] = 'done';
      push({ note: `Found ${t} at position ${mid}, after **${comps} check${comps > 1 ? 's' : ''}**.`, line: 3, state: st, found: mid });
      return frames;
    }
    if (arr[mid] < t) {
      lo = mid + 1;
      push({ note: `${arr[mid]} < ${t}, so ${t} can only be to the right. Keep positions ${lo}–${hi}.`, line: 4, state: stateIn(lo, hi),
        marks: lo <= hi ? [{ i: lo, label: 'lo' }, { i: hi, label: 'hi' }] : [] });
    } else {
      hi = mid - 1;
      push({ note: `${arr[mid]} > ${t}, so ${t} can only be to the left. Keep positions ${lo}–${hi}.`, line: 5, state: stateIn(lo, hi),
        marks: lo <= hi ? [{ i: lo, label: 'lo' }, { i: hi, label: 'hi' }] : [] });
    }
  }
  push({ note: `The range is empty: ${t} is not in the list. That took **${comps} check${comps > 1 ? 's' : ''}**.`, line: 6, state: fill(n, 'dim'), found: -1 });
  return frames;
}

/** Worst case of first-pivot quicksort on n items: (n − 1) + (n − 2) + … + 1. */
export const quickWorst = (n: number) => (n * (n - 1)) / 2;

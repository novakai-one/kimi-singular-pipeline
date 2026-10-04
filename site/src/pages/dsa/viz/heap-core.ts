// Pure logic for the heap visualiser: a list of operations → frames. No DOM, so Node can test it.
// Operations: a number (1 to 99) inserts it; "x" removes the smallest.

/** Per-position state. The same colour is used for the tree node and the array cell. */
export type CellState = '' | 'cur' | 'cmp' | 'swap' | 'done';

export interface Link {
  /** Parent position. */
  a: number;
  /** Child position. */
  b: number;
  kind: 'cmp' | 'swap';
}

export interface HeapFrame {
  note: string;
  line: number;
  /** The heap's array at this step. */
  heap: number[];
  state: CellState[];
  /** Parent–child pairs to draw as links (in the tree and under the array). */
  links: Link[];
  /** A position that has been emptied in this step (the last item moved to the top). */
  hole?: { i: number; value: number };
  /** Items taken out so far, in the order they came out. */
  out: number[];
  /** Index of the current operation (0-based), or -1 at the start and end. */
  op: number;
  /** The current operation in words ("insert 5", "remove the smallest"), or ''. */
  opText: string;
  /** How many operations the run has. */
  nOps: number;
  /** Swaps made by the current operation so far. */
  swaps: number;
  /** Most swaps needed by any single insertion so far (including the current one). */
  maxInsert: number;
  /** True on the last frame of each operation. */
  opEnd?: boolean;
  /** Largest size the heap reaches in this run (the same on every frame, so the drawing keeps its layout). */
  cap: number;
  [key: string]: unknown;
}

export type Op = { kind: 'insert'; value: number } | { kind: 'remove' };

export const HEAP_CODE = [
  'insert(v):',
  '  put v in the first free spot',
  '  while v is not at the top:',
  '    compare v with its parent',
  '    if v < parent: swap them',
  '    else: stop',
  'remove smallest:',
  '  take out the top item',
  '  move the last item to the top',
  '  while it has a child:',
  '    compare with smaller child',
  '    if child < item: swap them',
  '    else: stop',
];

export const MAX_OPS = 16;
/** 15 items fill 4 levels of the tree exactly. */
export const MAX_SIZE = 15;
export const GOAL_SWAPS = 3;

export const parentOf = (i: number) => Math.floor((i - 1) / 2);
export const childrenOf = (i: number): [number, number] => [2 * i + 1, 2 * i + 2];
/** Number of levels in a heap of n items (0 for an empty heap). */
export const levelsFor = (n: number) => (n <= 0 ? 0 : Math.floor(Math.log2(n)) + 1);

/** Parse "5 3 8 x 1" into operations. Throws a readable Error. */
export function parseOps(text: string): Op[] {
  const parts = text.split(/[\s,]+/).filter(Boolean);
  if (!parts.length) throw new Error('Type numbers to insert, and x to remove the smallest. For example: 5 3 8 1 x');
  const ops: Op[] = [];
  let size = 0;
  for (const p of parts) {
    if (p.toLowerCase() === 'x') {
      ops.push({ kind: 'remove' });
      size = Math.max(0, size - 1);
      continue;
    }
    const v = Number(p);
    if (!Number.isInteger(v)) throw new Error(`"${p}" is not a whole number or x. Type numbers from 1 to 99 to insert, and x to remove the smallest.`);
    if (v < 1 || v > 99) throw new Error('Use numbers from 1 to 99.');
    ops.push({ kind: 'insert', value: v });
    size++;
    if (size > MAX_SIZE) throw new Error(`The heap holds at most ${MAX_SIZE} numbers at once (4 full levels). Add an x to take one out first.`);
  }
  if (ops.length > MAX_OPS) throw new Error(`Use at most ${MAX_OPS} operations, so the animation stays short.`);
  return ops;
}

// ------------------------------------------------------------------ plain heap (no frames), used by tests and readouts
/** Add v to the heap array; returns the number of swaps. */
export function push(heap: number[], v: number): number {
  heap.push(v);
  let i = heap.length - 1, swaps = 0;
  while (i > 0) {
    const p = parentOf(i);
    if (heap[i] >= heap[p]) break;
    [heap[i], heap[p]] = [heap[p], heap[i]];
    i = p;
    swaps++;
  }
  return swaps;
}

/** Remove and return the smallest item, with the number of swaps. Undefined value on an empty heap. */
export function pop(heap: number[]): { value: number | undefined; swaps: number } {
  if (!heap.length) return { value: undefined, swaps: 0 };
  const top = heap[0];
  const last = heap.pop()!;
  let swaps = 0;
  if (heap.length) {
    heap[0] = last;
    let i = 0;
    for (;;) {
      const [l, r] = childrenOf(i);
      if (l >= heap.length) break;
      const c = r < heap.length && heap[r] < heap[l] ? r : l;
      if (heap[c] >= heap[i]) break;
      [heap[i], heap[c]] = [heap[c], heap[i]];
      i = c;
      swaps++;
    }
  }
  return { value: top, swaps };
}

/** Every parent is no bigger than its children. */
export function isHeap(heap: number[]): boolean {
  for (let i = 1; i < heap.length; i++) if (heap[parentOf(i)] > heap[i]) return false;
  return true;
}

// ------------------------------------------------------------------ frames
const fill = (n: number): CellState[] => Array.from({ length: n }, () => '' as CellState);
const s = (k: number) => (k === 1 ? '' : 's');
export const opWords = (o: Op) => (o.kind === 'insert' ? `insert ${o.value}` : 'remove the smallest');

export function heapFrames(ops: Op[]): HeapFrame[] {
  const heap: number[] = [];
  const out: number[] = [];
  const frames: HeapFrame[] = [];
  let maxInsert = 0;
  let swaps = 0;
  let op = -1;

  const push1 = (f: { note: string; line: number; state?: CellState[]; links?: Link[]; hole?: HeapFrame['hole']; opEnd?: boolean }) =>
    frames.push({
      note: f.note, line: f.line, heap: heap.slice(), state: f.state ?? fill(heap.length), links: f.links ?? [],
      hole: f.hole, out: out.slice(), op, swaps, maxInsert, opEnd: f.opEnd, cap: 0,
      opText: op < 0 ? '' : opWords(ops[op]), nOps: ops.length,
    });
  const st = (marks: [number, CellState][]) => {
    const a = fill(heap.length);
    for (const [i, c] of marks) if (i >= 0 && i < a.length) a[i] = c;
    return a;
  };

  const n0 = ops.filter((o) => o.kind === 'insert').length;
  push1({ note: `Start with an empty heap. ${ops.length} operation${s(ops.length)} to run: ${n0} insert${s(n0)} and ${ops.length - n0} removal${s(ops.length - n0)}.`, line: -1 });

  ops.forEach((o, k) => {
    op = k;
    swaps = 0;
    if (o.kind === 'insert') {
      const v = o.value;
      heap.push(v);
      let i = heap.length - 1;
      push1({
        note: i === 0
          ? `Insert {y|${v}}. The heap is empty, so it goes at the top: position 0.`
          : `Insert {y|${v}}. It goes in the first free spot at the bottom: position ${i}.`,
        line: 1, state: st([[i, 'cur']]),
      });
      for (;;) {
        if (i === 0) {
          push1({ note: `${v} is at the top, so it stops. This insertion took **${swaps} swap${s(swaps)}**.`, line: 2, state: st([[0, 'done']]), opEnd: true });
          break;
        }
        const p = parentOf(i);
        push1({
          note: `Compare {y|${v}} with its parent {b|${heap[p]}}. The parent of position ${i} is position ${p}: (${i} − 1) ÷ 2, rounded down.`,
          line: 3, state: st([[i, 'cur'], [p, 'cmp']]), links: [{ a: p, b: i, kind: 'cmp' }],
        });
        if (v < heap[p]) {
          const up = heap[p];
          [heap[i], heap[p]] = [heap[p], heap[i]];
          swaps++;
          maxInsert = Math.max(maxInsert, swaps);
          push1({ note: `${v} < ${up}, so swap them. {r|${v}} moves up to position ${p}, and {r|${up}} moves down to ${i}.`, line: 4,
            state: st([[i, 'swap'], [p, 'swap']]), links: [{ a: p, b: i, kind: 'swap' }] });
          i = p;
        } else {
          push1({ note: `${v} ≥ ${heap[p]}, so ${v} stays at position ${i}. This insertion took **${swaps} swap${s(swaps)}**.`, line: 5,
            state: st([[i, 'done']]), opEnd: true });
          break;
        }
      }
    } else {
      if (!heap.length) {
        push1({ note: 'Remove the smallest: the heap is empty, so there is nothing to take out.', line: 6, opEnd: true });
        return;
      }
      const top = heap[0];
      push1({ note: `Remove the smallest. It is always at the top: {r|${top}}, at position 0.`, line: 7, state: st([[0, 'swap']]) });
      const lastPos = heap.length - 1;
      const last = heap.pop()!;
      out.push(top);
      if (!heap.length) {
        push1({ note: `Take out ${top}. It was the only item, so the heap is now empty. **0 swaps.**`, line: 7, opEnd: true });
        return;
      }
      heap[0] = last;
      push1({
        note: `Take out ${top}. Move the last item, {y|${last}}, from position ${lastPos} to the top.`,
        line: 8, state: st([[0, 'cur']]), hole: { i: lastPos, value: last },
      });
      let i = 0;
      for (;;) {
        const [l, r] = childrenOf(i);
        if (l >= heap.length) {
          push1({ note: `${last} has no children at position ${i}, so it stops. This removal took **${swaps} swap${s(swaps)}**.`, line: 9, state: st([[i, 'done']]), opEnd: true });
          break;
        }
        const hasR = r < heap.length;
        const c = hasR && heap[r] < heap[l] ? r : l;
        const childText = hasR
          ? `its children {b|${heap[l]}} and {b|${heap[r]}}, at positions ${l} and ${r} (2 × ${i} + 1 and 2 × ${i} + 2). ` +
            (heap[l] === heap[r] ? `They are equal, so take the left one.` : `The smaller is ${heap[c]}.`)
          : `its only child {b|${heap[l]}}, at position ${l} (2 × ${i} + 1).`;
        push1({ note: `Compare {y|${last}} with ${childText}`, line: 10,
          state: st([[i, 'cur'], [l, 'cmp'], [hasR ? r : -1, 'cmp']]),
          links: hasR ? [{ a: i, b: l, kind: 'cmp' }, { a: i, b: r, kind: 'cmp' }] : [{ a: i, b: l, kind: 'cmp' }] });
        if (heap[c] < last) {
          const up = heap[c];
          [heap[i], heap[c]] = [heap[c], heap[i]];
          swaps++;
          push1({ note: `${up} < ${last}, so swap them. {r|${up}} moves up to position ${i}, and {r|${last}} moves down to ${c}.`, line: 11,
            state: st([[i, 'swap'], [c, 'swap']]), links: [{ a: i, b: c, kind: 'swap' }] });
          i = c;
        } else {
          push1({ note: `${heap[c]} ≥ ${last}, so ${last} stays at position ${i}. This removal took **${swaps} swap${s(swaps)}**.`, line: 12,
            state: st([[i, 'done']]), opEnd: true });
          break;
        }
      }
    }
  });

  op = -1;
  swaps = 0;
  push1({
    note: heap.length
      ? `Done. Every parent is smaller than (or equal to) its children, so the smallest, ${heap[0]}, is at the top. The most swaps in one insertion: **${maxInsert}**.`
      : `Done. The heap is empty. The most swaps in one insertion: **${maxInsert}**.`,
    line: -1, state: Array.from({ length: heap.length }, () => 'done' as CellState),
  });
  const cap = Math.max(...frames.map((f) => f.heap.length));
  for (const f of frames) f.cap = cap;
  return frames;
}

/** The insertion with the most swaps: its operation index, value, starting position and swap count. */
export function bestInsert(ops: Op[]): { op: number; value: number; from: number; swaps: number } | null {
  const heap: number[] = [];
  let best: { op: number; value: number; from: number; swaps: number } | null = null;
  for (let k = 0; k < ops.length; k++) {
    const o = ops[k];
    if (o.kind === 'insert') {
      const from = heap.length;
      const sw = push(heap, o.value);
      if (!best || sw > best.swaps) best = { op: k, value: o.value, from, swaps: sw };
    } else pop(heap);
  }
  return best;
}

/** A random list of operations that never holds more than 7 items (3 levels), so it cannot need 3 swaps. */
export function randomOps(rand: () => number = Math.random): string {
  const tokens: string[] = [];
  let size = 0;
  const n = 7 + Math.floor(rand() * 4);
  for (let k = 0; k < n; k++) {
    if (size >= 7 || (size >= 3 && rand() < 0.25)) { tokens.push('x'); size--; }
    else { tokens.push(String(1 + Math.floor(rand() * 99))); size++; }
  }
  return tokens.join(' ');
}

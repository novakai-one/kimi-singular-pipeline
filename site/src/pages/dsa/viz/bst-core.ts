// Pure logic for the binary search tree visualiser: input → frames. No DOM, so Node can test it.
// Nodes are identified by their value (repeats are skipped, so values are unique).

export interface TNode { v: number; left: number | null; right: number | null; parent: number | null; depth: number }
export interface Tree { root: number | null; nodes: Map<number, TNode> }

/** How a node is drawn: being compared (blue), on the path so far (yellow), just added (red), found or finished (green). */
export type NodeState = '' | 'cmp' | 'path' | 'new' | 'found' | 'done';

export interface BstFrame {
  note: string;
  line: number;
  mode: 'insert' | 'search';
  /** Every node in the tree at this step, in insertion order. */
  nodes: { v: number; depth: number; parent: number | null; state: NodeState }[];
  /** Values visited by the current insert or search, top to bottom (edges between them are highlighted). */
  path: number[];
  /** The value being inserted or searched for, or null. */
  value: number | null;
  /** Insert mode: the values still waiting to go in after this one, in order. */
  queue: number[];
  /** Search miss: the empty place where the value would have been. Depth 0 is the top level. */
  spot?: { depth: number; parent: number } | null;
  /** Nodes and levels in the tree at this step. */
  count: number;
  height: number;
  /** Comparisons made so far in this run. */
  comps: number;
  /** Every distinct value of the finished tree, sorted: a node's x position is its place in this list. */
  order: number[];
  /** Levels to leave room for (the same for every frame of a run, so the picture does not jump). */
  levels: number;
  [key: string]: unknown;
}

export const INSERT_CODE = [
  'for each value v, in order:',
  '  if the tree is empty: v is the root',
  '  node = the root',
  '  repeat:',
  '    if v == node: skip v (a repeat)',
  '    if v < node: go left, else go right',
  '    if that spot is empty: put v there, stop',
  '    node = the node in that spot',
];

export const SEARCH_CODE = [
  'node = the root',
  'while there is a node:',
  '  if target == node: found, stop',
  '  if target < node: node = its left child',
  '  else: node = its right child',
  'not found',
];

export const MAX_N = 15;

/** Parse "8 3 10; 4" into the numbers to insert and an optional value to search for. Throws a readable Error. */
export function parseInput(text: string): { nums: number[]; target: number | null } {
  const pieces = text.split(';');
  if (pieces.length > 2) throw new Error('Use one semicolon at most, before the number to search for, like: 8 3 10; 3');
  const parts = pieces[0].split(/[\s,]+/).filter(Boolean);
  if (!parts.length) throw new Error('Type the numbers to insert, separated by spaces, for example: 8 3 10 1 6 14 4');
  const nums = parts.map(Number);
  if (nums.some((n) => !Number.isInteger(n))) throw new Error('Use whole numbers separated by spaces or commas, for example: 8 3 10 1 6 14 4');
  if (nums.length > MAX_N) throw new Error(`Enter at most ${MAX_N} numbers, so every node stays readable.`);
  if (nums.some((n) => n < 1 || n > 99)) throw new Error('Use numbers from 1 to 99.');
  let target: number | null = null;
  if (pieces.length === 2 && pieces[1].trim() !== '') {
    target = Number(pieces[1].trim());
    if (!Number.isInteger(target)) throw new Error('After the semicolon, put one whole number to search for.');
  }
  return { nums, target };
}

// ------------------------------------------------------------------ the tree itself
export const emptyTree = (): Tree => ({ root: null, nodes: new Map() });

/** Insert v. Returns the values compared on the way down, and whether v was a repeat (and so skipped). */
export function insert(t: Tree, v: number): { path: number[]; dup: boolean } {
  const path: number[] = [];
  if (t.root === null) {
    t.root = v;
    t.nodes.set(v, { v, left: null, right: null, parent: null, depth: 0 });
    return { path, dup: false };
  }
  let node = t.nodes.get(t.root)!;
  for (;;) {
    path.push(node.v);
    if (v === node.v) return { path, dup: true };
    const side = v < node.v ? 'left' : 'right';
    const next = node[side];
    if (next === null) {
      node[side] = v;
      t.nodes.set(v, { v, left: null, right: null, parent: node.v, depth: node.depth + 1 });
      return { path, dup: false };
    }
    node = t.nodes.get(next)!;
  }
}

export function buildTree(nums: number[]): Tree {
  const t = emptyTree();
  for (const v of nums) insert(t, v);
  return t;
}

/** The values a search for target compares with, top to bottom, and whether it was found. */
export function searchPath(t: Tree, target: number): { path: number[]; found: boolean } {
  const path: number[] = [];
  let cur = t.root;
  while (cur !== null) {
    path.push(cur);
    if (target === cur) return { path, found: true };
    const node = t.nodes.get(cur)!;
    cur = target < cur ? node.left : node.right;
  }
  return { path, found: false };
}

/** Number of levels (0 for an empty tree). */
export function levelsOf(t: Tree): number {
  let h = 0;
  for (const n of t.nodes.values()) h = Math.max(h, n.depth + 1);
  return h;
}

/** Left part, the node, right part: gives the values in increasing order. */
export function inorder(t: Tree): number[] {
  const out: number[] = [];
  const walk = (v: number | null) => {
    if (v === null) return;
    const n = t.nodes.get(v)!;
    walk(n.left);
    out.push(v);
    walk(n.right);
  };
  walk(t.root);
  return out;
}

/** Keep going left from the root. */
export function smallest(t: Tree): number | null {
  let cur = t.root;
  if (cur === null) return null;
  while (t.nodes.get(cur)!.left !== null) cur = t.nodes.get(cur)!.left!;
  return cur;
}

/** An insertion order that gives the shortest tree: the middle value first, then the middle of each half. */
export function middleFirst(sortedVals: number[]): number[] {
  const out: number[] = [];
  const queue: [number, number][] = [[0, sortedVals.length - 1]];
  while (queue.length) {
    const [lo, hi] = queue.shift()!;
    if (lo > hi) continue;
    const mid = (lo + hi) >> 1;
    out.push(sortedVals[mid]);
    queue.push([lo, mid - 1], [mid + 1, hi]);
  }
  return out;
}

/** Fewest levels that can hold n nodes: a full tree with h levels holds 2^h − 1. */
export const minLevels = (n: number) => Math.ceil(Math.log2(n + 1));

// ------------------------------------------------------------------ frames
const plural = (n: number, one: string, many = one + 's') => `${n} ${n === 1 ? one : many}`;

function snapshot(t: Tree, states: Map<number, NodeState>): BstFrame['nodes'] {
  return [...t.nodes.values()].map((n) => ({ v: n.v, depth: n.depth, parent: n.parent, state: states.get(n.v) ?? '' }));
}

function pathStates(path: number[], last: NodeState): Map<number, NodeState> {
  const m = new Map<number, NodeState>();
  path.forEach((v, k) => m.set(v, k === path.length - 1 ? last : 'path'));
  return m;
}

/** Grow the tree one value at a time. Each comparison is one frame; each new node gets one more. */
export function insertFrames(nums: number[], target: number | null = null): BstFrame[] {
  const order = [...new Set(nums)].sort((a, b) => a - b);
  const levels = levelsOf(buildTree(nums));
  const t = emptyTree();
  const frames: BstFrame[] = [];
  let comps = 0;
  let next = 0;                                   // index of the next value waiting to go in
  const push = (f: Pick<BstFrame, 'note' | 'line' | 'path' | 'value'> & { states: Map<number, NodeState> }) =>
    frames.push({ note: f.note, line: f.line, mode: 'insert', nodes: snapshot(t, f.states), path: f.path, value: f.value,
      queue: nums.slice(next), count: t.nodes.size, height: levelsOf(t), comps, order, levels });

  push({ note: `Start with an empty tree. Insert ${plural(nums.length, 'number')}, in this order: ${nums.join(', ')}.`, line: 0, path: [], value: null, states: new Map() });

  for (const v of nums) {
    next++;
    if (t.root === null) {
      insert(t, v);
      push({ note: `The tree is empty, so **${v}** becomes the root, on level 1.`, line: 1, path: [v], value: v, states: new Map([[v, 'new']]) });
      continue;
    }
    // walk down without changing the tree, one frame per comparison
    let cur: number | null = t.root;
    const path: number[] = [];
    let dup = false;
    let parent = t.root;
    let side: 'left' | 'right' = 'left';
    while (cur !== null) {
      path.push(cur);
      comps++;
      const first = path.length === 1;
      if (v === cur) {
        push({ note: `${first ? `Insert **${v}**, starting at the root. ` : ''}${v} equals ${cur}: ${v} is already in the tree, so this repeat is skipped.`,
          line: 4, path: path.slice(), value: v, states: pathStates(path, 'cmp') });
        dup = true;
        break;
      }
      side = v < cur ? 'left' : 'right';
      const test = `${v} ${v < cur ? '<' : '>'} ${cur}, so go ${side}.`;
      push({ note: first ? `Insert **${v}**, starting at the root. ${test}` : `Compare ${v} with ${cur}: ${test}`,
        line: 5, path: path.slice(), value: v, states: pathStates(path, 'cmp') });
      parent = cur;
      cur = t.nodes.get(cur)![side];
    }
    if (dup) continue;
    insert(t, v);
    const depth = t.nodes.get(v)!.depth;
    push({ note: `The spot ${side} of ${parent} is empty. **${v}** goes there, on level ${depth + 1}, after ${plural(path.length, 'comparison')}.`,
      line: 6, path: [...path, v], value: v, states: new Map([...pathStates(path, 'path'), [v, 'new']]) });
  }

  const n = t.nodes.size, h = levelsOf(t);
  const skipped = nums.length - n;
  const all = new Map([...t.nodes.keys()].map((v) => [v, 'done' as NodeState]));
  push({ note: `Done: **${plural(n, 'node')} on ${plural(h, 'level')}**, after ${plural(comps, 'comparison')} in all.`
    + (skipped ? ` ${plural(skipped, 'repeat was', 'repeats were')} skipped.` : '')
    + (target !== null ? ` Choose Search to look up ${target}.` : ''),
  line: -1, path: [], value: null, states: all });
  return frames;
}

/** Build the tree at once, then look up one value. Each node visited is one comparison. */
export function searchFrames(nums: number[], target: number | null): BstFrame[] {
  const t = buildTree(nums);
  const order = [...new Set(nums)].sort((a, b) => a - b);
  const want = target ?? nums[nums.length - 1];
  const { path, found } = searchPath(t, want);
  const levels = Math.max(levelsOf(t), found ? 0 : path.length + 1);
  const frames: BstFrame[] = [];
  let comps = 0;
  const push = (f: Pick<BstFrame, 'note' | 'line' | 'path'> & { states: Map<number, NodeState>; spot?: BstFrame['spot'] }) =>
    frames.push({ note: f.note, line: f.line, mode: 'search', nodes: snapshot(t, f.states), path: f.path, value: want, spot: f.spot ?? null,
      queue: [], count: t.nodes.size, height: levelsOf(t), comps, order, levels });

  push({ note: `The tree built from your numbers: ${plural(t.nodes.size, 'node')} on ${plural(levelsOf(t), 'level')}. Search for **${want}**`
    + (target === null ? ' (the last number you typed; add "; n" to choose another)' : '') + ', starting at the root.',
  line: 0, path: [], states: new Map() });

  for (let k = 0; k < path.length; k++) {
    const cur = path[k];
    comps++;
    const sofar = path.slice(0, k + 1);
    if (want === cur) {
      push({ note: `${want} equals ${cur}: **found**, after ${plural(comps, 'comparison')}.`, line: 2, path: sofar, states: pathStates(sofar, 'found') });
      return frames;
    }
    const side = want < cur ? 'left' : 'right';
    push({ note: `Compare ${want} with ${cur}: ${want} ${want < cur ? '<' : '>'} ${cur}, so go ${side}.`, line: want < cur ? 3 : 4, path: sofar, states: pathStates(sofar, 'cmp') });
  }
  const last = path[path.length - 1];
  const side = want < last ? 'left' : 'right';
  push({ note: `There is no node ${side} of ${last}, so ${want} is **not in the tree**. That took ${plural(comps, 'comparison')}.`,
    line: 5, path: path.slice(), states: pathStates(path, 'path'), spot: { depth: path.length, parent: last } });
  return frames;
}

// ------------------------------------------------------------------ layout
/**
 * Where to draw things. x comes from a value's place in sorted order (its in-order rank), so two nodes never share
 * an x and never overlap; y comes from the level. A missing value sits between its sorted neighbours.
 */
export function geometry(count: number, levels: number) {
  const left = 46, right = 12, top = 92, bottom = 22;
  // a fixed slot per value; few values give a narrower picture, so it scales up more on a phone
  const slot = Math.min(64, (640 - left - right) / Math.max(count, 1));
  const W = left + right + Math.max(count, 6) * slot;
  const r = Math.min(22, slot * 0.42);
  const offset = left + (W - left - right - slot * count) / 2;
  const gap = levels <= 1 ? 0 : Math.max(40, Math.min(72, 470 / (levels - 1)));
  const H = top + Math.max(levels - 1, 0) * gap + r + bottom;
  const x = (rank: number) => offset + (Math.max(-0.15, Math.min(count - 0.85, rank)) + 0.5) * slot;
  const y = (depth: number) => top + depth * gap;
  return { W, H, r, slot, gap, top, x, y };
}

/** A value's place in sorted order; a value not in the list gets a half-way place between its neighbours. */
export function rankOf(order: number[], v: number): number {
  const k = order.indexOf(v);
  if (k >= 0) return k;
  return order.filter((u) => u < v).length - 0.5;
}

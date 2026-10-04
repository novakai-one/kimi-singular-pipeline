// Field 8 — pure search logic (no browser code), so tests can import it.
// Search 1 = breadth-first search (queue). Search 2 = A* (priority queue, Manhattan heuristic).

export const COLS = 24, ROWS = 14;
export const START: [number, number] = [3, 7];
export const GOAL: [number, number] = [20, 7];
export const idx = (x: number, y: number) => y * COLS + x;

export interface SearchResult { order: number[]; path: number[] }

function neighbours(i: number, walls: Uint8Array): number[] {
  const x = i % COLS, y = Math.floor(i / COLS);
  const out: number[] = [];
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const nx = x + dx, ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) continue;
    const j = idx(nx, ny);
    if (!walls[j]) out.push(j);
  }
  return out;
}

function rebuild(prev: Int32Array, goal: number): number[] {
  if (prev[goal] === -1) return [];
  const path: number[] = [];
  for (let c = goal; c !== -2; c = prev[c]) path.push(c);
  return path.reverse();
}

/** Breadth-first search: check squares in order of steps from the start. */
export function bfs(walls: Uint8Array): SearchResult {
  const s = idx(...START), g = idx(...GOAL);
  const prev = new Int32Array(COLS * ROWS).fill(-1);
  prev[s] = -2;
  const queue = [s];
  const order: number[] = [];
  for (let head = 0; head < queue.length; head++) {
    const cur = queue[head];
    order.push(cur);
    if (cur === g) break;
    for (const n of neighbours(cur, walls)) {
      if (prev[n] !== -1) continue;
      prev[n] = cur;
      queue.push(n);
    }
  }
  return { order, path: rebuild(prev, g) };
}

/** A*: check squares in order of steps so far + Manhattan distance left. */
export function astar(walls: Uint8Array): SearchResult {
  const s = idx(...START), g = idx(...GOAL);
  const hh = (i: number) => Math.abs((i % COLS) - GOAL[0]) + Math.abs(Math.floor(i / COLS) - GOAL[1]);
  const gScore = new Float64Array(COLS * ROWS).fill(Infinity);
  const prev = new Int32Array(COLS * ROWS).fill(-1);
  const closed = new Uint8Array(COLS * ROWS);
  gScore[s] = 0; prev[s] = -2;
  // binary heap of [f, -g (prefer deeper on ties), node]
  const heap: [number, number, number][] = [];
  const less = (a: [number, number, number], b: [number, number, number]) => a[0] < b[0] || (a[0] === b[0] && a[1] < b[1]);
  const push = (e: [number, number, number]) => {
    heap.push(e);
    for (let k = heap.length - 1; k > 0;) {
      const p = (k - 1) >> 1;
      if (!less(heap[k], heap[p])) break;
      [heap[k], heap[p]] = [heap[p], heap[k]]; k = p;
    }
  };
  const pop = () => {
    const top = heap[0], last = heap.pop()!;
    if (heap.length) {
      heap[0] = last;
      for (let k = 0; ;) {
        const l = 2 * k + 1, r = l + 1;
        let m = k;
        if (l < heap.length && less(heap[l], heap[m])) m = l;
        if (r < heap.length && less(heap[r], heap[m])) m = r;
        if (m === k) break;
        [heap[k], heap[m]] = [heap[m], heap[k]]; k = m;
      }
    }
    return top;
  };
  push([hh(s), 0, s]);
  const order: number[] = [];
  while (heap.length) {
    const [, , cur] = pop();
    if (closed[cur]) continue;
    closed[cur] = 1;
    order.push(cur);
    if (cur === g) break;
    for (const n of neighbours(cur, walls)) {
      const ng = gScore[cur] + 1;
      if (ng < gScore[n]) { gScore[n] = ng; prev[n] = cur; push([ng + hh(n), -ng, n]); }
    }
  }
  return { order, path: rebuild(prev, g) };
}

/** A U-shaped trap that opens toward the start: the goal-seeking search walks into it. */
export function trapWalls(): Uint8Array {
  const w = new Uint8Array(COLS * ROWS);
  for (let y = 2; y <= 12; y++) w[idx(13, y)] = 1;
  for (let x = 7; x <= 13; x++) { w[idx(x, 2)] = 1; w[idx(x, 12)] = 1; }
  return w;
}

const EMPTY_A = astar(new Uint8Array(COLS * ROWS)).order.length;
const EMPTY_B = bfs(new Uint8Array(COLS * ROWS)).order.length;
export const EMPTY_COUNTS = { bfs: EMPTY_B, astar: EMPTY_A };


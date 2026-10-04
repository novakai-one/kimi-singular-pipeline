// Field 6 — pure Q-learning logic (no browser code), so tests can import it.
// A small maze: start bottom-left, goal top-right. Reaching the goal gives +1 and ends the episode.
// Every other step gives 0. Bumping a wall or the edge leaves the agent where it is.

export const COLS = 7, ROWS = 6;
export const START: [number, number] = [0, 5];
export const GOAL: [number, number] = [6, 0];
export const GAMMA = 0.9;
export const ALPHA = 0.5;
export const MAX_STEPS = 100;
/** Exploration settings offered on the page (chance of a random move). */
export const EXPLORATION = [0, 0.1, 0.3];
export const DEFAULT_EXPLORATION = 0.1;
/** Show me: exploration, episodes per batch, most episodes before it stops. */
export const SHOW_ME = { exploration: 0.1, batch: 10, cap: 500, seed: 33 };
/** Seed for the random moves of the student's own runs (same on every visit). */
export const PAGE_SEED = 20261004;

/** Wall squares as [x, y]. */
export const WALL_LIST: [number, number][] = [
  [1, 1], [2, 1], [3, 1],
  [5, 1], [5, 2],
  [3, 3], [4, 3],
  [1, 3], [1, 4],
];

export const N = COLS * ROWS;
export const idx = (x: number, y: number) => y * COLS + x;
export const xy = (i: number): [number, number] => [i % COLS, Math.floor(i / COLS)];
export const WALLS = new Uint8Array(N);
for (const [x, y] of WALL_LIST) WALLS[idx(x, y)] = 1;
export const S0 = idx(...START);
export const SG = idx(...GOAL);

/** Moves in a fixed order: up, right, down, left. */
export const MOVES: [number, number][] = [[0, -1], [1, 0], [0, 1], [-1, 0]];
export const MOVE_NAMES = ['up', 'right', 'down', 'left'];

/** Where a move from square s lands (same square if it hits a wall or the edge). */
export function land(s: number, a: number): number {
  const [x, y] = xy(s);
  const nx = x + MOVES[a][0], ny = y + MOVES[a][1];
  if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) return s;
  const j = idx(nx, ny);
  return WALLS[j] ? s : j;
}

/** A fresh score table: 4 scores per square, all 0. */
export const newQ = () => new Float64Array(N * 4);

/** A square's value: the highest of its four scores. */
export function value(Q: Float64Array, s: number): number {
  return Math.max(Q[s * 4], Q[s * 4 + 1], Q[s * 4 + 2], Q[s * 4 + 3]);
}

/** The best-rated move, ties broken by the fixed order (for drawing arrows and the route). */
export function bestMove(Q: Float64Array, s: number): number {
  let b = 0;
  for (let a = 1; a < 4; a++) if (Q[s * 4 + a] > Q[s * 4 + b]) b = a;
  return b;
}

/** Deterministic random numbers in [0, 1). */
export function makeRng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

/** Pick a move: random with chance `explore`, else the best-rated one (ties broken at random). */
export function chooseMove(Q: Float64Array, s: number, explore: number, rand: () => number): number {
  if (explore > 0 && rand() < explore) return Math.floor(rand() * 4);
  const v = value(Q, s);
  const best: number[] = [];
  for (let a = 0; a < 4; a++) if (Q[s * 4 + a] === v) best.push(a);
  return best.length === 1 ? best[0] : best[Math.floor(rand() * best.length)];
}

export interface Step { s: number; a: number; s2: number; r: number; q: number }

/** One move plus the Q-learning update. Returns what happened (q = the move's new score). */
export function step(Q: Float64Array, s: number, explore: number, rand: () => number): Step {
  const a = chooseMove(Q, s, explore, rand);
  const s2 = land(s, a);
  const done = s2 === SG;
  const r = done ? 1 : 0;
  const target = r + (done ? 0 : GAMMA * value(Q, s2));
  const k = s * 4 + a;
  Q[k] += ALPHA * (target - Q[k]);
  return { s, a, s2, r, q: Q[k] };
}

export interface Episode { trace: Step[]; reached: boolean }

/** Run one episode from the start: until the goal or MAX_STEPS moves. Updates Q. */
export function runEpisode(Q: Float64Array, explore: number, rand: () => number): Episode {
  const trace: Step[] = [];
  let s = S0;
  while (trace.length < MAX_STEPS) {
    const st = step(Q, s, explore, rand);
    trace.push(st);
    s = st.s2;
    if (s === SG) return { trace, reached: true };
  }
  return { trace, reached: false };
}

/** Follow the best-rated move from the start. Returns the squares visited, or null if it doesn't reach the goal. */
export function bestRoute(Q: Float64Array): number[] | null {
  const route = [S0];
  const seen = new Set([S0]);
  let s = S0;
  while (s !== SG) {
    if (value(Q, s) <= 0) return null;
    s = land(s, bestMove(Q, s));
    if (seen.has(s)) return null;
    seen.add(s);
    route.push(s);
  }
  return route;
}

/** Number of moves on the best route, or null. */
export function routeLength(Q: Float64Array): number | null {
  const r = bestRoute(Q);
  return r ? r.length - 1 : null;
}

/** Fewest moves from start to goal (breadth-first search). */
export function shortestSteps(): number {
  const dist = new Int32Array(N).fill(-1);
  dist[S0] = 0;
  const queue = [S0];
  for (let head = 0; head < queue.length; head++) {
    const s = queue[head];
    for (let a = 0; a < 4; a++) {
      const t = land(s, a);
      if (dist[t] !== -1) continue;
      dist[t] = dist[s] + 1;
      queue.push(t);
    }
  }
  return dist[SG];
}
export const SHORTEST = shortestSteps();

/** The challenge's win condition: the best route reaches the goal in the fewest possible moves. */
export const isShortest = (Q: Float64Array) => routeLength(Q) === SHORTEST;

/**
 * Show me's procedure: run batches of episodes until the best route is the shortest (or the cap).
 * Yields after each batch so the page can redraw.
 */
export function* showMeBatches(Q: Float64Array, rand: () => number, o = SHOW_ME) {
  let episodes = 0;
  while (episodes < o.cap) {
    let last: Episode | null = null;
    for (let k = 0; k < o.batch; k++) last = runEpisode(Q, o.exploration, rand);
    episodes += o.batch;
    const len = routeLength(Q);
    yield { episodes, len, lastSteps: last!.trace.length, lastReached: last!.reached };
    if (len === SHORTEST) return;
  }
}

// Pure logic for the graphs visualiser: read the student's edges, lay the graph out, and turn each of the five
// algorithms (BFS, DFS, Dijkstra, topological sort, union-find) into frames. No DOM, so Node can test it.

export interface Edge {
  u: string;
  v: string;
  /** Cost (1 when none is typed). */
  w: number;
  /** true for A>B (one way, A before B), false for A-B (both ways). */
  directed: boolean;
}

export interface Graph {
  /** Node letters, in the order they are first named. The first one is the start. */
  nodes: string[];
  edges: Edge[];
  /** true when any edge has a typed cost, like A-B:4. Costs are drawn only then. */
  weighted: boolean;
}

/** wait = blue (waiting), cur = yellow (current), done = green (finished). */
export type NodeState = '' | 'wait' | 'cur' | 'done';
/** follow = red (being followed), tree = thick (used to reach a node), off = dashed (crossed off / skipped), route = yellow (the answer). */
export type EdgeState = '' | 'follow' | 'tree' | 'off' | 'route';

export interface Chip { text: string; state?: NodeState }
export interface CostRow { node: string; cost: string; via: string; state: NodeState }
export interface PanelSection {
  title: string;
  chips?: Chip[];
  rows?: CostRow[];
  /** Text shown when chips is empty. */
  empty?: string;
}

export interface EdgePath {
  /** SVG path data. */
  d: string;
  /** Where to write the cost. */
  label: [number, number];
  /** Arrowhead triangle for a one-way edge. */
  arrow: [number, number][] | null;
  /** Closest any other node's circle comes to this edge (for tests). */
  clearance: number;
}

export interface Layout {
  W: number;
  H: number;
  R: number;
  pos: Record<string, [number, number]>;
  paths: EdgePath[];
  kind: 'layers' | 'ring';
}

export interface GraphResult {
  order?: string[];
  dist?: Record<string, number>;
  prev?: Record<string, string | null>;
  route?: string[];
  leftover?: string[];
  loop?: string[];
  groups?: string[][];
}

export interface GraphFrame {
  note: string;
  line: number;
  g: Graph;
  lay: Layout;
  nodes: Record<string, NodeState>;
  edges: EdgeState[];
  /** Small number next to a node: steps (BFS), cost so far (Dijkstra), prerequisites left (topological sort). */
  badges: Record<string, string>;
  /** One short line under the panel saying what the badges mean. */
  badgeHint: string;
  panel: PanelSection[];
  result?: GraphResult;
  [key: string]: unknown;
}

export const MAX_NODES = 10;
export const MAX_EDGES = 24;
export const MAX_COST = 99;

export const PRESETS = {
  course: 'A>B A>C B>D C>D D>E',
  road: 'A-B:5 A-C:1 B-D:5 C-E:1 D-E:1 D-F:2 E-F:6',
  friends: 'A-B C-D E-F B-C G-E A-D H',
};
export const DEFAULT_INPUT = PRESETS.course;
/** Show me: the course plan plus one prerequisite that closes a loop. */
export const SHOW_ME_INPUT = 'A>B A>C B>D C>D D>E E>B';

// ------------------------------------------------------------------ pseudocode
export const BFS_CODE = [
  'queue = [start]; start is found, 0 steps',
  'while the queue is not empty:',
  '  node = take from the front',
  '  for each neighbour of node:',
  '    if already found: skip it',
  '    else: found, steps + 1, add to the back',
  '  node is finished',
];
export const DFS_CODE = [
  'visit(start)',
  'visit(node):',
  '  mark node visited; push it on the stack',
  '  for each neighbour of node:',
  '    if not visited: visit(neighbour)',
  '  pop node off the stack: finished',
];
export const DIJKSTRA_CODE = [
  'cost[start] = 0; every other cost = ∞',
  'while some node is waiting:',
  '  node = the waiting node with the lowest cost',
  '  for each edge to an unfinished neighbour:',
  '    if cost[node] + edge cost ≥ its cost: keep it',
  '    else: lower its cost; it waits',
  '  node is finished: its cost is final',
];
export const TOPO_CODE = [
  'left[n] = number of edges into n',
  'ready = every node with left = 0',
  'while ready is not empty:',
  '  take the first ready node; add it to the order',
  '  for each edge node→m: cross it off, left[m] − 1',
  '    if left[m] = 0: add m to ready',
  'nodes not in the order: a loop blocks them',
];
export const UF_CODE = [
  'every node starts in a group of its own',
  'for each edge u–v, in the order typed:',
  '  a = leader of u\'s group, b = leader of v\'s',
  '  if a = b: already connected, skip the edge',
  '  else: join the smaller group into the larger',
  'the groups left are the connected parts',
];

// ------------------------------------------------------------------ input
const FORMAT = 'Write edges like A>B (A before B), A-B (a two-way link) or A-B:4 (a link that costs 4).';

/** Parse "A>B, A-C:4 D" into a graph. Throws an Error with a plain message. */
export function parseGraph(text: string): Graph {
  const norm = text.toUpperCase()
    .replace(/[–—]/g, '-')
    .replace(/->/g, '>')
    .replace(/\s*([>:-])\s*/g, '$1');
  const toks = norm.split(/[\s,;]+/).filter(Boolean);
  if (!toks.length) throw new Error(`Type at least one edge. ${FORMAT}`);
  const nodes: string[] = [];
  const edges: Edge[] = [];
  let weighted = false;
  const add = (n: string) => { if (!nodes.includes(n)) nodes.push(n); };
  for (const t of toks) {
    const m = /^([A-Z])(?:([>-])([A-Z])(?::(\d+))?)?$/.exec(t);
    if (!m) {
      if (/\d/.test(t.split(':')[0])) throw new Error(`"${t}": name each node with one capital letter, like A or B.`);
      throw new Error(`"${t}" is not an edge. ${FORMAT}`);
    }
    const [, u, op, v, wTxt] = m;
    add(u);
    if (!op) continue;
    if (u === v) throw new Error(`"${t}" joins ${u} to itself. An edge must join two different letters.`);
    const w = wTxt === undefined ? 1 : Number(wTxt);
    if (w > MAX_COST) throw new Error(`Costs must be whole numbers from 0 to ${MAX_COST}.`);
    if (wTxt !== undefined) weighted = true;
    const directed = op === '>';
    const clash = edges.find((e) => (e.u === u && e.v === v) || (e.u === v && e.v === u && (!directed || !e.directed)));
    if (clash) throw new Error(`${u} and ${v} are joined twice. Write each edge once.`);
    add(v);
    edges.push({ u, v, w, directed });
  }
  if (!edges.length) throw new Error(`Type at least one edge. ${FORMAT}`);
  if (nodes.length > MAX_NODES) throw new Error(`Use at most ${MAX_NODES} different letters, so the picture stays readable.`);
  if (edges.length > MAX_EDGES) throw new Error(`Use at most ${MAX_EDGES} edges, so the picture stays readable.`);
  return { nodes, edges, weighted };
}

/** Edges you can follow out of x: one-way edges forwards only, two-way edges both ways. Sorted A to Z. */
export function neighbours(g: Graph, x: string): { to: string; i: number; w: number }[] {
  const out: { to: string; i: number; w: number }[] = [];
  g.edges.forEach((e, i) => {
    if (e.u === x) out.push({ to: e.v, i, w: e.w });
    else if (e.v === x && !e.directed) out.push({ to: e.u, i, w: e.w });
  });
  return out.sort((a, b) => (a.to < b.to ? -1 : a.to > b.to ? 1 : a.i - b.i));
}

const edgeName = (e: Edge, from: string) => (e.directed ? `${e.u}→${e.v}` : `${from}–${from === e.u ? e.v : e.u}`);
const plural = (n: number, one: string, many = one + 's') => `${n} ${n === 1 ? one : many}`;
const list = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
const isAre = (xs: string[]) => (xs.length === 1 ? 'is' : 'are');
const wasWere = (xs: string[]) => (xs.length === 1 ? 'was' : 'were');

// ------------------------------------------------------------------ layout
const RING_W = 640;
const RING_H = 300;
const R = 22;
const COMP_GAP = 0.6;

type P = [number, number];
const sub = (a: P, b: P): P => [a[0] - b[0], a[1] - b[1]];
const add2 = (a: P, b: P, k = 1): P => [a[0] + b[0] * k, a[1] + b[1] * k];
const len = (a: P) => Math.hypot(a[0], a[1]);
const unit = (a: P): P => { const l = len(a) || 1; return [a[0] / l, a[1] / l]; };
const r1 = (x: number) => Math.round(x * 10) / 10;

/** Nodes joined by any edge (direction ignored), in first-named order. */
function components(g: Graph): string[][] {
  const idx = new Map(g.nodes.map((n, i) => [n, i]));
  const adj = new Map(g.nodes.map((n) => [n, [] as string[]]));
  for (const e of g.edges) { adj.get(e.u)!.push(e.v); adj.get(e.v)!.push(e.u); }
  const seen = new Set<string>();
  const out: string[][] = [];
  for (const n of g.nodes) {
    if (seen.has(n)) continue;
    const comp: string[] = [];
    const stack = [n];
    seen.add(n);
    while (stack.length) {
      const x = stack.pop()!;
      comp.push(x);
      for (const y of adj.get(x)!) if (!seen.has(y)) { seen.add(y); stack.push(y); }
    }
    out.push(comp.sort((a, b) => idx.get(a)! - idx.get(b)!));
  }
  return out;
}

/** Columns for one component: by "before" for one-way graphs, by steps from its first node otherwise. */
function columnsFor(g: Graph, comp: string[]): string[][] {
  const set = new Set(comp);
  const es = g.edges.map((e, i) => ({ e, i })).filter(({ e }) => set.has(e.u));
  const layer: Record<string, number> = {};
  if (es.length && es.every(({ e }) => e.directed)) {
    // Drop the edges that close loops (found by depth-first search), then place each node one column after
    // its latest prerequisite. A loop-closing edge is drawn backwards, so adding it does not move any node.
    const out = new Map(comp.map((n) => [n, es.filter(({ e }) => e.u === n).sort((a, b) => (a.e.v < b.e.v ? -1 : 1))]));
    const st: Record<string, number> = {};
    const back = new Set<number>();
    const visit = (x: string) => {
      st[x] = 1;
      for (const { e, i } of out.get(x)!) {
        if (st[e.v] === 1) back.add(i);
        else if (!st[e.v]) visit(e.v);
      }
      st[x] = 2;
    };
    for (const n of comp) if (!st[n]) visit(n);
    const fwd = es.filter(({ i }) => !back.has(i)).map(({ e }) => e);
    const indeg: Record<string, number> = Object.fromEntries(comp.map((n) => [n, 0]));
    for (const e of fwd) indeg[e.v]++;
    const q = comp.filter((n) => indeg[n] === 0);
    for (const n of comp) layer[n] = 0;
    while (q.length) {
      const x = q.shift()!;
      for (const e of fwd) if (e.u === x) {
        layer[e.v] = Math.max(layer[e.v], layer[x] + 1);
        if (--indeg[e.v] === 0) q.push(e.v);
      }
    }
  } else {
    const adj = new Map(comp.map((n) => [n, [] as string[]]));
    for (const { e } of es) { adj.get(e.u)!.push(e.v); adj.get(e.v)!.push(e.u); }
    layer[comp[0]] = 0;
    const q = [comp[0]];
    while (q.length) {
      const x = q.shift()!;
      for (const y of [...adj.get(x)!].sort()) if (layer[y] === undefined) { layer[y] = layer[x] + 1; q.push(y); }
    }
  }
  const k = Math.max(...comp.map((n) => layer[n])) + 1;
  const cols: string[][] = Array.from({ length: k }, () => []);
  for (const n of comp) cols[layer[n]].push(n);
  return cols;
}

/** Order nodes inside each column so edges cross less: move each node towards the mean height of its neighbours. */
function orderColumns(g: Graph, cols: string[][], gap: number) {
  const adj = new Map<string, string[]>();
  for (const e of g.edges) {
    adj.set(e.u, [...(adj.get(e.u) ?? []), e.v]);
    adj.set(e.v, [...(adj.get(e.v) ?? []), e.u]);
  }
  const y = new Map<string, number>();
  const refresh = () => cols.forEach((c) => c.forEach((n, i) => y.set(n, (i - (c.length - 1) / 2) * gap)));
  refresh();
  const sweep = (k: number, ref: number) => {
    if (ref < 0 || ref >= cols.length) return;
    const inRef = new Set(cols[ref]);
    const bary = new Map(cols[k].map((n) => {
      const ns = (adj.get(n) ?? []).filter((m) => inRef.has(m));
      return [n, ns.length ? ns.reduce((s, m) => s + y.get(m)!, 0) / ns.length : y.get(n)!];
    }));
    cols[k].sort((a, b) => bary.get(a)! - bary.get(b)!);   // a stable sort keeps ties in their current order
    refresh();
  };
  for (let k = 1; k < cols.length; k++) sweep(k, k - 1);
  for (let k = cols.length - 2; k >= 0; k--) sweep(k, k + 1);
  for (let k = 1; k < cols.length; k++) sweep(k, k - 1);
}

function quadPoint(a: P, c: P, b: P, t: number): P {
  const u = 1 - t;
  return [u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]];
}

interface Route { s0: P; c: P | null; end: P; tip: P; ub: P; label: P; clearance: number; directed: boolean }

/** Draw an edge from a to b, bending it when a straight line would pass through another node.
 *  A bend that stays inside the picture is preferred; otherwise the picture grows to fit it. */
function route(a: P, b: P, others: P[], directed: boolean, twin: boolean, W: number, H: number): Route {
  const d = unit(sub(b, a));
  const n: P = [-d[1], d[0]];
  const mid: P = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const tries = twin ? [22, 40, 60, 85] : [0, 28, -28, 50, -50, 75, -75, 105, -105, 140, -140, 15, -15, 40, -40, 62, -62, 90, -90, 120, -120, 175, -175];
  const scored = tries.map((bulge) => {
    const c = add2(mid, n, 2 * bulge);
    let clear = Infinity, top = Infinity, bottom = -Infinity, inX = true;
    for (let t = 0.04; t <= 0.961; t += 0.02) {
      const p = quadPoint(a, c, b, t);
      if (p[0] < 8 || p[0] > W - 8) inX = false;
      top = Math.min(top, p[1]); bottom = Math.max(bottom, p[1]);
      for (const o of others) clear = Math.min(clear, len(sub(p, o)) - R);
    }
    return { bulge, clear: inX ? clear : -1, inside: top >= 8 && bottom <= H - 8, near: top >= -70 && bottom <= H + 70 };
  });
  const best = scored.find((x) => x.clear >= 7 && x.inside) ?? scored.find((x) => x.clear >= 7 && x.near)
    ?? scored.filter((x) => x.near).reduce((p, x) => (x.clear > p.clear ? x : p), scored[0]);
  const c = add2(mid, n, 2 * best.bulge);
  const ua = unit(sub(c, a)), ub = unit(sub(c, b));
  return {
    s0: add2(a, ua, R + 1), c: best.bulge === 0 ? null : c,
    end: directed ? add2(b, ub, R + 11) : add2(b, ub, R + 1), tip: add2(b, ub, R + 1), ub,
    label: add2(mid, n, best.bulge), clearance: best.clear, directed,
  };
}

function edgePath(rt: Route, b: P, dy: number): EdgePath {
  const f = (p: P) => `${r1(p[0])} ${r1(p[1] + dy)}`;
  const d = rt.c ? `M${f(rt.s0)}Q${f(rt.c)} ${f(rt.end)}` : `M${f(rt.s0)}L${f(rt.end)}`;
  let arrow: [number, number][] | null = null;
  if (rt.directed) {
    const base = add2(b, rt.ub, R + 14);
    const p: P = [-rt.ub[1], rt.ub[0]];
    arrow = [rt.tip, add2(base, p, 6.5), add2(base, p, -6.5)].map(([x, y]) => [r1(x), r1(y + dy)] as [number, number]);
  }
  return { d, label: [r1(rt.label[0]), r1(rt.label[1] + dy)], arrow, clearance: rt.clearance };
}

/** Place every node: in columns when that fits, otherwise around an oval. Same input, same picture. */
export function layoutGraph(g: Graph): Layout {
  const comps = components(g);
  const compCols = comps.map((c) => columnsFor(g, c));
  const units = compCols.reduce((s, c) => s + c.length, 0) + COMP_GAP * (comps.length - 1);
  const maxCol = Math.max(...compCols.flat().map((c) => c.length));
  const pos: Record<string, [number, number]> = {};
  let kind: Layout['kind'] = 'layers';
  let H = RING_H;
  let W = RING_W;
  if (maxCol <= 5 && units <= 10) {
    // The picture is as tall as the tallest column needs, so a short graph is not drawn small.
    const gapY = maxCol > 1 ? Math.min(85, Math.max(64, 220 / (maxCol - 1))) : 0;
    H = Math.max(200, (maxCol - 1) * gapY + 110);
    W = Math.round(Math.min(RING_W, Math.max(420, units * 110 + 80)));   // narrow graphs get a narrow picture, so they scale up on phones
    const unitW = (W - 80) / units;
    let u = 0;
    for (const cols of compCols) {
      orderColumns(g, cols, gapY);
      cols.forEach((col, k) => col.forEach((n, i) => {
        pos[n] = [r1(40 + (u + k + 0.5) * unitW), r1(H / 2 + (i - (col.length - 1) / 2) * gapY)];
      }));
      u += cols.length + COMP_GAP;
    }
  } else {
    // Around an oval, in depth-first order so that joined nodes tend to sit side by side.
    kind = 'ring';
    const order: string[] = [];
    const seen = new Set<string>();
    const visit = (x: string) => {
      seen.add(x); order.push(x);
      const ns = g.edges.flatMap((e) => (e.u === x ? [e.v] : e.v === x ? [e.u] : [])).sort();
      for (const y of ns) if (!seen.has(y)) visit(y);
    };
    for (const n of g.nodes) if (!seen.has(n)) visit(n);
    order.forEach((n, i) => {
      const t = (2 * Math.PI * i) / order.length;
      pos[n] = [r1(W / 2 - 260 * Math.cos(t)), r1(H / 2 - 110 * Math.sin(t))];
    });
  }
  const routes = g.edges.map((e) => {
    const twin = e.directed && g.edges.some((f) => f.directed && f.u === e.v && f.v === e.u);
    const others = g.nodes.filter((n) => n !== e.u && n !== e.v).map((n) => pos[n]);
    return route(pos[e.u], pos[e.v], others, e.directed, twin, W, H);
  });
  // Grow the picture if a bent edge leaves it.
  let top = 8, bottom = H - 8;
  routes.forEach((rt, i) => {
    if (!rt.c) return;
    const e = g.edges[i];
    for (let t = 0; t <= 1; t += 0.05) {
      const y = quadPoint(pos[e.u], rt.c, pos[e.v], t)[1];
      top = Math.min(top, y - 4); bottom = Math.max(bottom, y + 4);
    }
  });
  const dy = Math.ceil(8 - top);
  H = Math.ceil(bottom + 8 + dy);
  for (const n of g.nodes) pos[n] = [pos[n][0], r1(pos[n][1] + dy)];
  const paths = routes.map((rt, i) => edgePath(rt, sub(pos[g.edges[i].v], [0, dy]), dy));
  return { W, H, R, pos, paths, kind };
}

// ------------------------------------------------------------------ shared frame helpers
function recorder(g: Graph) {
  const lay = layoutGraph(g);
  const frames: GraphFrame[] = [];
  const nodes: Record<string, NodeState> = Object.fromEntries(g.nodes.map((n) => [n, '' as NodeState]));
  const edges: EdgeState[] = g.edges.map(() => '');
  const badges: Record<string, string> = {};
  const push = (note: string, line: number, panel: PanelSection[], badgeHint: string, result?: GraphResult) => {
    frames.push({ note, line, g, lay, nodes: { ...nodes }, edges: edges.slice(), badges: { ...badges }, panel, badgeHint, result });
  };
  return { frames, nodes, edges, badges, push };
}

const chips = (xs: string[], state: NodeState): Chip[] => xs.map((text) => ({ text, state }));

// ------------------------------------------------------------------ BFS
export function bfsFrames(g: Graph): GraphFrame[] {
  const { frames, nodes, edges, badges, push } = recorder(g);
  const s = g.nodes[0];
  const dist: Record<string, number> = { [s]: 0 };
  const prev: Record<string, string | null> = { [s]: null };
  const queue: string[] = [s];
  const order: string[] = [];
  const hint = `Numbers by the nodes: steps from ${s}.`;
  const panel = (): PanelSection[] => [
    { title: 'Queue (front → back)', chips: chips(queue, 'wait'), empty: 'empty' },
    { title: 'Visit order', chips: order.map((n) => ({ text: n, state: nodes[n] })), empty: 'none yet' },
  ];
  nodes[s] = 'wait'; badges[s] = '0';
  push(`Start at ${s}. Put ${s} in the queue and mark it found: 0 steps from ${s}.`, 0, panel(), hint);
  while (queue.length) {
    const x = queue.shift()!;
    order.push(x);
    nodes[x] = 'cur';
    push(`Take ${x} from the front of the queue. It is ${plural(dist[x], 'step')} from ${s}.`, 2, panel(), hint);
    const ns = neighbours(g, x);
    for (const { to, i } of ns) {
      const prevState = edges[i];
      edges[i] = 'follow';
      if (dist[to] !== undefined) {
        push(`Follow ${edgeName(g.edges[i], x)}: ${to} is already found. Skip it.`, 4, panel(), hint);
        edges[i] = prevState;
      } else {
        dist[to] = dist[x] + 1; prev[to] = x;
        queue.push(to); nodes[to] = 'wait'; badges[to] = String(dist[to]);
        push(`Follow ${edgeName(g.edges[i], x)}: ${to} is new. Mark it found (${plural(dist[to], 'step')} from ${s}) and add it to the back of the queue.`, 5, panel(), hint);
        edges[i] = 'tree';
      }
    }
    nodes[x] = 'done';
    push(ns.length ? `${x} is finished: all its neighbours are checked.` : `${x} has no edges to follow. It is finished.`, 6, panel(), hint);
  }
  const maxD = Math.max(...Object.values(dist));
  const rings = Array.from({ length: maxD + 1 }, (_, d) => `${plural(d, 'step')}: ${order.filter((n) => dist[n] === d).join(', ')}`);
  const unreached = g.nodes.filter((n) => dist[n] === undefined);
  push(`The queue is empty. Visit order: ${order.join(', ')}. In rings: ${rings.join('; ')}.`
    + (unreached.length ? ` ${list(unreached)} ${wasWere(unreached)} never reached from ${s}.` : ''), 1, panel(), hint, { order, dist, prev });
  return frames;
}

// ------------------------------------------------------------------ DFS (recursive; the panel shows its stack)
export function dfsFrames(g: Graph): GraphFrame[] {
  const { frames, nodes, edges, push } = recorder(g);
  const s = g.nodes[0];
  const stack: string[] = [];
  const order: string[] = [];
  const seen = new Set<string>();
  const hint = 'The node on top of the stack is the one being explored.';
  const panel = (): PanelSection[] => [
    { title: 'Stack (bottom → top)', chips: stack.map((n, k) => ({ text: n, state: k === stack.length - 1 ? 'cur' : 'wait' })), empty: 'empty' },
    { title: 'Visit order', chips: order.map((n) => ({ text: n, state: nodes[n] })), empty: 'none yet' },
  ];
  const enter = (x: string) => {
    if (stack.length) nodes[stack[stack.length - 1]] = 'wait';
    seen.add(x); order.push(x); stack.push(x); nodes[x] = 'cur';
  };
  const visit = (x: string) => {
    for (const { to, i } of neighbours(g, x)) {
      const before = edges[i];
      edges[i] = 'follow';
      if (seen.has(to)) {
        push(`From ${x}, check ${edgeName(g.edges[i], x)}: ${to} is already visited. Skip it.`, 4, panel(), hint);
        edges[i] = before;
      } else {
        enter(to);
        push(`From ${x}, follow ${edgeName(g.edges[i], x)}: ${to} is not visited yet. Go deeper: push ${to} on the stack.`, 4, panel(), hint);
        edges[i] = 'tree';
        visit(to);
        nodes[x] = 'cur';
      }
    }
    stack.pop();
    nodes[x] = 'done';
    const back = stack[stack.length - 1];
    push(`${x} has no unvisited neighbours left. Pop ${x} off the stack: it is finished.` + (back ? ` Back up to ${back}.` : ''), 5, panel(), hint);
  };
  enter(s);
  push(`Start at ${s}: mark it visited and push it on the stack.`, 2, panel(), hint);
  visit(s);
  const unreached = g.nodes.filter((n) => !seen.has(n));
  push(`The stack is empty. Visit order: ${order.join(', ')}.` + (unreached.length ? ` ${list(unreached)} ${wasWere(unreached)} never reached from ${s}.` : ''), 0, panel(), hint, { order });
  return frames;
}

// ------------------------------------------------------------------ Dijkstra
/** Fewest edges from s to t, and the lowest cost among routes with that many edges (for the closing note). */
function fewestEdges(g: Graph, s: string, t: string): { edges: number; cost: number } | null {
  const steps: Record<string, number> = { [s]: 0 };
  const best: Record<string, number> = { [s]: 0 };
  const q = [s];
  while (q.length) {
    const x = q.shift()!;
    for (const { to, w } of neighbours(g, x)) {
      if (steps[to] === undefined) { steps[to] = steps[x] + 1; best[to] = best[x] + w; q.push(to); }
      else if (steps[to] === steps[x] + 1) best[to] = Math.min(best[to], best[x] + w);
    }
  }
  return steps[t] === undefined ? null : { edges: steps[t], cost: best[t] };
}

export function dijkstraFrames(g: Graph): GraphFrame[] {
  const { frames, nodes, edges, badges, push } = recorder(g);
  const s = g.nodes[0];
  const target = g.nodes[g.nodes.length - 1];
  const cost: Record<string, number> = Object.fromEntries(g.nodes.map((n) => [n, Infinity]));
  const prev: Record<string, string | null> = { [s]: null };
  const viaEdge: Record<string, number> = {};
  const finished = new Set<string>();
  const show = (c: number) => (c === Infinity ? '∞' : String(c));
  const hint = 'Numbers by the nodes: the cheapest cost found so far.';
  const waiting = () => g.nodes.filter((n) => !finished.has(n) && cost[n] < Infinity)
    .sort((a, b) => cost[a] - cost[b] || (a < b ? -1 : 1));
  const panel = (): PanelSection[] => [
    { title: 'Cheapest cost so far', rows: g.nodes.map((n) => ({ node: n, cost: show(cost[n]), via: prev[n] ?? '', state: nodes[n] })) },
    { title: 'Waiting, cheapest first', chips: waiting().map((n) => ({ text: `${n} ${cost[n]}`, state: nodes[n] })), empty: 'none' },
  ];
  cost[s] = 0;
  for (const n of g.nodes) badges[n] = show(cost[n]);
  nodes[s] = 'wait';
  push(`Start at ${s}: its cost is 0. Every other cost is ∞, because no route to it is known yet.`, 0, panel(), hint);
  for (;;) {
    const w = waiting();
    if (!w.length) break;
    const x = w[0];
    nodes[x] = 'cur';
    push(`Take ${x}: cost ${cost[x]}, the lowest of the waiting nodes.`, 2, panel(), hint);
    const ns = neighbours(g, x).filter(({ to }) => !finished.has(to) && to !== x);
    for (const { to, i, w: ew } of ns) {
      const before = edges[i];
      edges[i] = 'follow';
      const nc = cost[x] + ew;
      const old = cost[to];
      const name = `${edgeName(g.edges[i], x)} (cost ${ew})`;
      if (nc < old) {
        cost[to] = nc; prev[to] = x; badges[to] = String(nc); nodes[to] = 'wait';
        push(`Follow ${name}: ${cost[x]} + ${ew} = ${nc}, less than ${show(old)}. ${to}'s cost becomes ${nc}, via ${x}.`, 5, panel(), hint);
        if (viaEdge[to] !== undefined) edges[viaEdge[to]] = '';
        viaEdge[to] = i;
        edges[i] = 'tree';
      } else {
        push(`Follow ${name}: ${cost[x]} + ${ew} = ${nc}, not less than ${old}. ${to} keeps ${old}.`, 4, panel(), hint);
        edges[i] = before;
      }
    }
    finished.add(x);
    nodes[x] = 'done';
    push(ns.length ? `${x} is finished: its cost, ${cost[x]}, is final.` : `${x} has no unfinished neighbours. It is finished: its cost, ${cost[x]}, is final.`, 6, panel(), hint);
  }
  const reached = g.nodes.filter((n) => n !== s && cost[n] < Infinity);
  const unreached = g.nodes.filter((n) => cost[n] === Infinity);
  let note = `No node is waiting. Cheapest costs from ${s}: ${reached.map((n) => `${n} ${cost[n]}`).join(', ') || 'none'}.`;
  let routeNodes: string[] | undefined;
  if (target !== s && cost[target] < Infinity) {
    routeNodes = [target];
    while (prev[routeNodes[0]]) routeNodes.unshift(prev[routeNodes[0]]!);
    for (let k = 1; k < routeNodes.length; k++) {
      const i = viaEdge[routeNodes[k]];
      edges[i] = 'route';
    }
    for (const n of routeNodes) nodes[n] = 'cur';
    const hops = routeNodes.length - 1;
    note += ` Cheapest route to ${target}: ${routeNodes.join(' → ')}, cost ${cost[target]}, using ${plural(hops, 'edge')}.`;
    const few = fewestEdges(g, s, target);
    if (few && few.edges < hops && few.cost > cost[target]) note += ` The best route with only ${plural(few.edges, 'edge')} costs ${few.cost}.`;
  }
  if (unreached.length) note += ` ${list(unreached)} cannot be reached from ${s}.`;
  push(note, 1, panel(), hint, { dist: Object.fromEntries(Object.entries(cost).filter(([, c]) => c < Infinity)), prev, route: routeNodes });
  return frames;
}

// ------------------------------------------------------------------ topological sort (Kahn)
export function topoFrames(g: Graph): GraphFrame[] {
  const two = g.edges.find((e) => !e.directed);
  if (two) {
    throw new Error(`Topological sort needs one-way edges, like A>B ("A before B"). ${two.u}-${two.v} has no direction: write ${two.u}>${two.v} or ${two.v}>${two.u}.`);
  }
  const { frames, nodes, edges, badges, push } = recorder(g);
  const left: Record<string, number> = Object.fromEntries(g.nodes.map((n) => [n, 0]));
  for (const e of g.edges) left[e.v]++;
  const ready: string[] = [];
  const order: string[] = [];
  const hint = 'Numbers by the nodes: prerequisites not yet crossed off.';
  const panel = (): PanelSection[] => [
    { title: 'Ready: no prerequisites left', chips: chips(ready, 'wait'), empty: 'none' },
    { title: 'Order so far', chips: order.map((n) => ({ text: n, state: nodes[n] })), empty: 'none yet' },
  ];
  for (const n of g.nodes) badges[n] = String(left[n]);
  push(`Count each node's prerequisites (edges in): ${g.nodes.map((n) => `${n} ${left[n]}`).join(', ')}.`, 0, panel(), hint);
  ready.push(...g.nodes.filter((n) => left[n] === 0).sort());
  for (const n of ready) nodes[n] = 'wait';
  push(ready.length ? `Ready, with 0 prerequisites: ${list(ready)}.` : 'No node has 0 prerequisites, so no node can go first.', 1, panel(), hint);
  while (ready.length) {
    const x = ready.shift()!;
    order.push(x);
    nodes[x] = 'cur';
    delete badges[x];
    push(`Take ${x} from ready and add it to the order: ${order.join(', ')}.`, 3, panel(), hint);
    const outs = g.edges.map((e, i) => ({ e, i })).filter(({ e }) => e.u === x).sort((a, b) => (a.e.v < b.e.v ? -1 : 1));
    for (const { e, i } of outs) {
      left[e.v]--;
      badges[e.v] = String(left[e.v]);
      edges[i] = 'follow';
      if (left[e.v] === 0) {
        ready.push(e.v);
        nodes[e.v] = 'wait';
        push(`Cross off ${x}→${e.v}: ${e.v} has 0 prerequisites left, so ${e.v} is ready.`, 5, panel(), hint);
      } else {
        push(`Cross off ${x}→${e.v}: ${e.v} still has ${left[e.v]} left.`, 4, panel(), hint);
      }
      edges[i] = 'off';
    }
    nodes[x] = 'done';
  }
  const leftover = g.nodes.filter((n) => !order.includes(n));
  if (!leftover.length) {
    push(`Every node is in the order: ${order.join(', ')}. Every edge points forward in this order, so it is valid.`, 2, panel(), hint, { order });
    return frames;
  }
  // Every node left over still has an edge in from another node left over. Walk those edges backwards
  // until a node repeats: that walk has gone round a loop.
  const set = new Set(leftover);
  const walk = [leftover[0]];
  for (;;) {
    const cur = walk[walk.length - 1];
    const p = g.edges.filter((e) => e.v === cur && set.has(e.u)).map((e) => e.u).sort()[0];
    const at = walk.indexOf(p);
    if (at >= 0) { walk.push(p); walk.splice(0, at); break; }
    walk.push(p);
  }
  const loop = walk.slice(0, -1).reverse();
  const k0 = loop.indexOf([...loop].sort()[0]);
  const loopFromSmallest = [...loop.slice(k0), ...loop.slice(0, k0)];
  for (let k = 0; k < loopFromSmallest.length; k++) {
    const a = loopFromSmallest[k], b = loopFromSmallest[(k + 1) % loopFromSmallest.length];
    edges[g.edges.findIndex((e) => e.u === a && e.v === b)] = 'follow';
  }
  const loopText = [...loopFromSmallest, loopFromSmallest[0]].join(' → ');
  const after = leftover.filter((n) => !loop.includes(n));
  push(`Stuck: nothing is ready, but ${list(leftover)} ${isAre(leftover)} left. ${loopText} is a loop: each one waits on the one before it.`
    + (after.length ? ` ${list(after)} ${after.length === 1 ? 'waits' : 'wait'} on that loop.` : '')
    + ' **No valid order exists.**', 6, panel(), hint, { order, leftover, loop: loopFromSmallest });
  return frames;
}

// ------------------------------------------------------------------ union-find
export function unionFindFrames(g: Graph): GraphFrame[] {
  const { frames, nodes, edges, push } = recorder(g);
  const parent: Record<string, string> = Object.fromEntries(g.nodes.map((n) => [n, n]));
  const size: Record<string, number> = Object.fromEntries(g.nodes.map((n) => [n, 1]));
  const find = (x: string): string => {
    let r = x;
    while (parent[r] !== r) r = parent[r];
    while (parent[x] !== r) { const nx = parent[x]; parent[x] = r; x = nx; }   // path compression
    return r;
  };
  const groups = () => {
    const by = new Map<string, string[]>();
    for (const n of g.nodes) { const r = find(n); by.set(r, [...(by.get(r) ?? []), n]); }
    return [...by.values()];
  };
  let hot = new Set<string>();
  const hint = 'Edges are taken one at a time, in the order you typed them.';
  const panel = (): PanelSection[] => {
    const gs = groups();
    return [{ title: `Groups (${gs.length})`, chips: gs.map((m) => ({ text: `{${m.join(', ')}}`, state: m.some((n) => hot.has(n)) ? 'cur' as NodeState : '' as NodeState })) }];
  };
  const mark = (u: string, v: string) => {
    for (const n of g.nodes) nodes[n] = '';
    const a = find(u), b = find(v);
    for (const n of g.nodes) if (find(n) === a || find(n) === b) nodes[n] = 'wait';
    nodes[u] = 'cur'; nodes[v] = 'cur';
    hot = new Set([u, v]);
  };
  const oneWay = g.edges.find((e) => e.directed);
  push(`Each of the ${g.nodes.length} nodes starts in a group of its own.`
    + (oneWay ? ` Groups ignore direction: ${oneWay.u}→${oneWay.v} joins ${oneWay.u} and ${oneWay.v}.` : ''), 0, panel(), hint);
  g.edges.forEach((e, i) => {
    const a = find(e.u), b = find(e.v);
    mark(e.u, e.v);
    edges[i] = 'follow';
    push(`Edge ${e.u}–${e.v}: ${e.u}'s leader is ${a}, ${e.v}'s leader is ${b}.`, 2, panel(), hint);
    if (a === b) {
      edges[i] = 'off';
      push(`Same leader, so ${e.u} and ${e.v} are already connected. Skip this edge.`, 3, panel(), hint);
    } else {
      const [big, small] = size[a] >= size[b] ? [a, b] : [b, a];
      parent[small] = big;
      size[big] += size[small];
      mark(e.u, e.v);
      edges[i] = 'tree';
      const members = groups().find((m) => m.includes(e.u))!;
      push(`Different leaders: join the groups. ${list(members)} are now one group, led by ${big}.`, 4, panel(), hint);
    }
  });
  hot = new Set();
  for (const n of g.nodes) nodes[n] = 'done';
  const gs = groups();
  push(`All ${plural(g.edges.length, 'edge')} done: ${plural(gs.length, 'group')}, ${gs.map((m) => `{${m.join(', ')}}`).join(' ')}.`, 5, panel(), hint, { groups: gs });
  return frames;
}

// ------------------------------------------------------------------ random input
/** A random graph: either one-way edges with no loop (always earlier letter → later letter) or two-way roads with costs. */
export function randomGraph(rand: () => number = Math.random): string {
  const n = 5 + Math.floor(rand() * 3);
  const L = 'ABCDEFGHIJ'.slice(0, n).split('');
  const pairs = new Set<string>();
  const out: string[] = [];
  const directed = rand() < 0.5;
  const addEdge = (i: number, j: number) => {
    const [a, b] = i < j ? [i, j] : [j, i];
    const key = `${a},${b}`;
    if (a === b || pairs.has(key)) return;
    pairs.add(key);
    out.push(directed ? `${L[a]}>${L[b]}` : `${L[a]}-${L[b]}:${1 + Math.floor(rand() * 9)}`);
  };
  for (let j = 1; j < n; j++) addEdge(Math.floor(rand() * j), j);
  const extra = 1 + Math.floor(rand() * 3);
  for (let k = 0; k < extra * 3 && out.length < n - 1 + extra; k++) addEdge(Math.floor(rand() * n), Math.floor(rand() * n));
  return out.join(' ');
}

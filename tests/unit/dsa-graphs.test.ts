// DSA 8 (graphs): every algorithm is correct against a brute-force check on many small graphs, the challenge is
// reachable (and the default input does not reach it), and the numbers in dsa.ts are true.
// The visualiser only accepts capital letters as node names, so the practice towns 1–6 are written A–F here.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_INPUT, MAX_EDGES, MAX_NODES, PRESETS, SHOW_ME_INPUT,
  bfsFrames, dfsFrames, dijkstraFrames, layoutGraph, neighbours, parseGraph, randomGraph, topoFrames, unionFindFrames,
  type Graph, type GraphFrame,
} from '../../site/src/pages/dsa/viz/graphs-core.ts';

const last = <T>(a: T[]) => a[a.length - 1];
const result = (fs: GraphFrame[]) => last(fs).result!;

function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}
/** A random graph as text: n letters, m edges, one-way / two-way / mixed, with or without costs. */
function randomText(r: () => number, n: number, m: number, mode: 'dir' | 'und' | 'mix', costs: boolean, dag = false) {
  const L = 'ABCDEFGHIJ'.slice(0, n).split('');
  const seen = new Set<string>();
  const out: string[] = [];
  for (let guard = 0; out.length < m && guard < 2000; guard++) {
    let a = Math.floor(r() * n), b = Math.floor(r() * n);
    if (a === b) continue;
    if (dag && a > b) [a, b] = [b, a];
    const key = [a, b].sort().join();
    if (seen.has(key)) continue;
    seen.add(key);
    const d = mode === 'dir' || (mode === 'mix' && r() < 0.5);
    out.push(`${L[a]}${d ? '>' : '-'}${L[b]}${costs ? ':' + Math.floor(r() * 10) : ''}`);
  }
  return out.join(' ');
}
const MODES = ['dir', 'und', 'mix'] as const;

/** Every simple path from s, by brute force: the cheapest cost and the fewest edges to each node. */
function bruteForce(g: Graph, s: string) {
  const cheapest: Record<string, number> = {};
  const fewest: Record<string, number> = {};
  const walk = (x: string, cost: number, hops: number, seen: Set<string>) => {
    cheapest[x] = Math.min(cheapest[x] ?? Infinity, cost);
    fewest[x] = Math.min(fewest[x] ?? Infinity, hops);
    for (const { to, w } of neighbours(g, x)) {
      if (seen.has(to)) continue;
      seen.add(to); walk(to, cost + w, hops + 1, seen); seen.delete(to);
    }
  };
  walk(s, 0, 0, new Set([s]));
  return { cheapest, fewest };
}
const validOrder = (g: Graph, order: string[]) =>
  order.length === g.nodes.length && g.edges.every((e) => order.indexOf(e.u) < order.indexOf(e.v));
function permutations<T>(xs: T[]): T[][] {
  if (xs.length <= 1) return [xs];
  return xs.flatMap((x, i) => permutations([...xs.slice(0, i), ...xs.slice(i + 1)]).map((p) => [x, ...p]));
}
/** Connected groups, direction ignored, found by a plain search from each node. */
function componentsBySearch(g: Graph): string[][] {
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
      for (const e of g.edges) {
        const y = e.u === x ? e.v : e.v === x ? e.u : null;
        if (y && !seen.has(y)) { seen.add(y); stack.push(y); }
      }
    }
    out.push(comp.sort());
  }
  return out;
}
const norm = (gs: string[][]) => gs.map((x) => [...x].sort().join('')).sort();

// ------------------------------------------------------------------ input
test('graphs: input is read as edges, and bad input gets a plain message', () => {
  const g = parseGraph('a>b, A-C:4  D');
  assert.deepEqual(g.nodes, ['A', 'B', 'C', 'D']);
  assert.deepEqual(g.edges, [{ u: 'A', v: 'B', w: 1, directed: true }, { u: 'A', v: 'C', w: 4, directed: false }]);
  assert.equal(g.weighted, true);
  assert.equal(parseGraph('A -> B').edges[0].directed, true);
  assert.equal(parseGraph(PRESETS.course).weighted, false);
  assert.equal(parseGraph('A>B B>A').edges.length, 2, 'one edge each way is allowed');
  assert.throws(() => parseGraph(''), /at least one edge/);
  assert.throws(() => parseGraph('A'), /at least one edge/);
  assert.throws(() => parseGraph('A=B'), /not an edge/);
  assert.throws(() => parseGraph('1-2'), /capital letter/);
  assert.throws(() => parseGraph('A>A'), /itself/);
  assert.throws(() => parseGraph('A-B B-A'), /twice/);
  assert.throws(() => parseGraph('A>B A-B'), /twice/);
  assert.throws(() => parseGraph('A-B:100'), /0 to 99/);
  assert.throws(() => parseGraph('A-B C-D E-F G-H I-J K-L'), /at most 10/);
  const many = randomText(rng(3), 10, 30, 'und', false);
  assert.ok(many.split(' ').length > MAX_EDGES);
  assert.throws(() => parseGraph(many), /at most 24 edges/);
  assert.throws(() => topoFrames(parseGraph('A>B B-C')), /one-way edges/);
});

// ------------------------------------------------------------------ BFS
test('graphs: BFS visits nodes in rings (predict) — course plan A; B, C; D; E', () => {
  const r = result(bfsFrames(parseGraph(PRESETS.course)));
  assert.deepEqual(r.order, ['A', 'B', 'C', 'D', 'E']);
  assert.deepEqual(r.dist, { A: 0, B: 1, C: 1, D: 2, E: 3 });
});

test('graphs: BFS finds the fewest edges (brute force), and its visit order never steps back a ring', () => {
  const r = rng(11);
  for (let t = 0; t < 400; t++) {
    const n = 2 + Math.floor(r() * 6);
    const g = parseGraph(randomText(r, n, 1 + Math.floor(r() * n * 1.5), MODES[t % 3], false));
    const res = result(bfsFrames(g));
    const bf = bruteForce(g, g.nodes[0]).fewest;
    assert.deepEqual(res.dist, bf);
    for (let k = 1; k < res.order!.length; k++) assert.ok(res.dist![res.order![k]] >= res.dist![res.order![k - 1]], 'rings in order');
  }
});

test('graphs: BFS and DFS look at each edge once per direction it can be followed: O(V + E)', () => {
  for (const txt of Object.values(PRESETS)) {
    const g = parseGraph(txt);
    const looks = g.edges.reduce((s, e) => s + (e.directed ? 1 : 2), 0);
    const reach = new Set(result(bfsFrames(g)).order);
    const reachable = g.edges.reduce((s, e) => s + (reach.has(e.u) ? 1 : 0) + (!e.directed && reach.has(e.v) ? 1 : 0), 0);
    assert.ok(reachable <= looks);
    assert.equal(bfsFrames(g).filter((f) => f.line === 4 || f.line === 5).length, reachable);
    assert.equal(dfsFrames(g).filter((f) => f.line === 4).length, reachable);
  }
});

// ------------------------------------------------------------------ DFS
test('graphs: DFS goes deep first and reaches exactly the reachable nodes', () => {
  assert.deepEqual(result(dfsFrames(parseGraph(PRESETS.course))).order, ['A', 'B', 'D', 'E', 'C']);
  const r = rng(5);
  for (let t = 0; t < 300; t++) {
    const n = 2 + Math.floor(r() * 7);
    const g = parseGraph(randomText(r, n, 1 + Math.floor(r() * n * 1.5), MODES[t % 3], false));
    // reference: the same recursion, written plainly
    const ref: string[] = [];
    const seen = new Set<string>();
    const visit = (x: string) => { seen.add(x); ref.push(x); for (const { to } of neighbours(g, x)) if (!seen.has(to)) visit(to); };
    visit(g.nodes[0]);
    const fs = dfsFrames(g);
    assert.deepEqual(result(fs).order, ref);
    assert.deepEqual(new Set(ref), new Set(Object.keys(bruteForce(g, g.nodes[0]).fewest)));
    // the stack panel never holds more nodes than exist, and is empty at the end
    assert.deepEqual(last(fs).panel[0].chips, []);
  }
});

// ------------------------------------------------------------------ Dijkstra
test('graphs: Dijkstra matches the cheapest of all routes (brute force) on small graphs', () => {
  const r = rng(42);
  for (let t = 0; t < 500; t++) {
    const n = 2 + Math.floor(r() * 6);
    const g = parseGraph(randomText(r, n, 1 + Math.floor(r() * n * 1.6), MODES[t % 3], true));
    const res = result(dijkstraFrames(g));
    assert.deepEqual(res.dist, bruteForce(g, g.nodes[0]).cheapest);
    if (res.route) {
      // the route really exists and costs what it says
      let c = 0;
      for (let k = 1; k < res.route.length; k++) {
        const step = neighbours(g, res.route[k - 1]).filter((x) => x.to === res.route![k]);
        assert.ok(step.length);
        c += step[0].w;
      }
      assert.equal(c, res.dist![last(res.route)]);
    }
  }
});

test('graphs: road map — the fewest-edges route is not the cheapest', () => {
  const g = parseGraph(PRESETS.road);
  const bf = bruteForce(g, 'A');
  assert.equal(bf.fewest.F, 3);
  const res = result(dijkstraFrames(g));
  assert.deepEqual(res.route, ['A', 'C', 'E', 'D', 'F']);
  assert.equal(res.dist!.F, 5);
  // routes with 3 edges: A-B-D-F costs 12, A-C-E-F costs 8; both cost more than 5
  assert.match(last(dijkstraFrames(g)).note, /best route with only 3 edges costs 8/);
});

// ------------------------------------------------------------------ topological sort
test('graphs: practice 1 — courses A>B A>C B>D C>D give A, B, C, D (A, C, B, D also works)', () => {
  const g = parseGraph('A>B A>C B>D C>D');
  assert.deepEqual(result(topoFrames(g)).order, ['A', 'B', 'C', 'D']);
  assert.ok(validOrder(g, ['A', 'B', 'C', 'D']));
  assert.ok(validOrder(g, ['A', 'C', 'B', 'D']));
  const all = permutations(g.nodes).filter((p) => validOrder(g, p)).map((p) => p.join(''));
  assert.deepEqual(all.sort(), ['ABCD', 'ACBD']);
});

test('graphs: topological sort finds a valid order exactly when one exists (brute force over all orders)', () => {
  const r = rng(9);
  for (let t = 0; t < 400; t++) {
    const n = 2 + Math.floor(r() * 5);
    const g = parseGraph(randomText(r, n, 1 + Math.floor(r() * n * 1.4), 'dir', false, t % 2 === 0));
    const res = result(topoFrames(g));
    const exists = permutations(g.nodes).some((p) => validOrder(g, p));
    if (exists) {
      assert.ok(validOrder(g, res.order!));
      assert.equal(res.leftover, undefined);
    } else {
      assert.ok(res.leftover!.length >= 2);
      // the named loop is real: each edge exists, and every loop node is left over
      const loop = res.loop!;
      for (let k = 0; k < loop.length; k++) {
        const a = loop[k], b = loop[(k + 1) % loop.length];
        assert.ok(g.edges.some((e) => e.u === a && e.v === b), `${a}>${b} in ${g.edges.map((e) => e.u + e.v)}`);
        assert.ok(res.leftover!.includes(a));
      }
    }
  }
});

// ------------------------------------------------------------------ union-find
test('graphs: practice 3 — roads 1–2, 2–3, 4–5, 5–6 (as A–F) make two groups', () => {
  const res = result(unionFindFrames(parseGraph('A-B B-C D-E E-F')));
  assert.deepEqual(res.groups, [['A', 'B', 'C'], ['D', 'E', 'F']]);
});

test('graphs: union-find groups match a plain search, on random graphs', () => {
  assert.deepEqual(norm(result(unionFindFrames(parseGraph(PRESETS.friends))).groups!), ['ABCD', 'EFG', 'H']);
  const r = rng(77);
  for (let t = 0; t < 300; t++) {
    const n = 2 + Math.floor(r() * 9);
    const g = parseGraph(randomText(r, n, 1 + Math.floor(r() * n), MODES[t % 3], false));
    assert.deepEqual(norm(result(unionFindFrames(g)).groups!), norm(componentsBySearch(g)));
  }
});

// ------------------------------------------------------------------ challenge
test('graphs: challenge — Show me adds E>B and topological sort finds no valid order; the default input has one', () => {
  const show = result(topoFrames(parseGraph(SHOW_ME_INPUT)));
  assert.deepEqual(show.leftover, ['B', 'D', 'E']);
  assert.deepEqual(show.loop, ['B', 'D', 'E']);
  assert.match(last(topoFrames(parseGraph(SHOW_ME_INPUT))).note, /B → D → E → B is a loop.*No valid order exists/);
  assert.equal(SHOW_ME_INPUT, `${DEFAULT_INPUT} E>B`, 'Show me is the course plan plus one edge');
  const def = result(topoFrames(parseGraph(DEFAULT_INPUT)));
  assert.deepEqual(def.order, ['A', 'B', 'C', 'D', 'E']);
  assert.equal(def.loop, undefined);
  // other one-edge loops work too
  for (const extra of ['D>A', 'E>A', 'D>B', 'C>A']) assert.ok(result(topoFrames(parseGraph(`${DEFAULT_INPUT} ${extra}`))).loop);
});

// ------------------------------------------------------------------ frame counts and layout
const ALL = [bfsFrames, dfsFrames, dijkstraFrames, unionFindFrames];

test('graphs: frame counts stay small', () => {
  for (const fn of [...ALL, topoFrames]) assert.ok(fn(parseGraph(DEFAULT_INPUT)).length < 150);
  const r = rng(1);
  let most = 0;
  for (let t = 0; t < 60; t++) {
    const und = parseGraph(randomText(r, MAX_NODES, MAX_EDGES, 'und', true));
    const dir = parseGraph(randomText(r, MAX_NODES, MAX_EDGES, 'dir', true));
    for (const fn of ALL) most = Math.max(most, fn(und).length, fn(dir).length);
    most = Math.max(most, topoFrames(dir).length);
  }
  assert.ok(most < 600, `most frames: ${most}`);
});

test('graphs: layout — nodes never overlap, stay in view, and edges miss other nodes', () => {
  const check = (txt: string, minClear: number) => {
    const g = parseGraph(txt);
    const lay = layoutGraph(g);
    for (const n of g.nodes) {
      const [x, y] = lay.pos[n];
      assert.ok(x >= lay.R && x <= lay.W - lay.R && y >= lay.R && y <= lay.H - lay.R, `${n} in view`);
      for (const m of g.nodes) if (n < m) assert.ok(Math.hypot(x - lay.pos[m][0], y - lay.pos[m][1]) >= 2 * lay.R + 8, `${n}, ${m} apart in ${txt}`);
    }
    for (const p of lay.paths) assert.ok(p.clearance >= minClear, `edge clears nodes in ${txt}`);
    assert.equal(lay.paths.filter((p) => p.arrow).length, g.edges.filter((e) => e.directed).length, 'every one-way edge has an arrow');
    return lay;
  };
  for (const txt of [...Object.values(PRESETS), SHOW_ME_INPUT, 'A>B B>A', 'A-B C D E F G H I J']) check(txt, 6);
  // the picture does not move when the loop-closing edge is added
  assert.deepEqual(layoutGraph(parseGraph(SHOW_ME_INPUT)).pos, layoutGraph(parseGraph(DEFAULT_INPUT)).pos);
  const r = rng(21);
  for (let t = 0; t < 400; t++) check(randomGraph(r), 6);
  // dense graphs of up to 10 nodes: almost always clear (a few very dense one-way graphs come close)
  let close = 0;
  for (let t = 0; t < 600; t++) {
    const n = 2 + Math.floor(r() * 9);
    const g = parseGraph(randomText(r, n, 1 + Math.floor(r() * Math.min(MAX_EDGES, (n * (n - 1)) / 2)), MODES[t % 3], false));
    if (Math.min(...layoutGraph(g).paths.map((p) => p.clearance)) < 4) close++;
  }
  assert.ok(close <= 6, `${close} of 600 dense graphs have an edge passing close to a node`);
});

test('graphs: Random gives valid input with no loop of one-way edges', () => {
  const r = rng(8);
  for (let t = 0; t < 200; t++) {
    const g = parseGraph(randomGraph(r));
    assert.ok(g.nodes.length >= 5 && g.nodes.length <= 7);
    if (g.edges[0].directed) assert.equal(result(topoFrames(g)).loop, undefined);
  }
});

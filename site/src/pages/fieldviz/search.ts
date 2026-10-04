// Field 8 — Planning and search: race two searches on a grid you can wall off.
// Search 1 = breadth-first search (queue). Search 2 = A* (priority queue, Manhattan heuristic).
// Pure search functions live in search-core.ts (tested in Node).
import { h } from '../../lib/dom';
import { button, colours, makeCanvas, onTheme, readout, sleep, type Viz } from './kit';
import { astar, bfs, COLS, EMPTY_COUNTS, GOAL, idx, ROWS, START, trapWalls, type SearchResult } from './search-core';

const EMPTY_A = EMPTY_COUNTS.astar;

const viz: Viz = (el, api) => {
  const CELL = 23;
  const W = COLS * CELL, H = ROWS * CELL;
  const cv = makeCanvas(W, H, 'A grid with a start square, a goal square and walls you can draw.');
  let walls: Uint8Array = new Uint8Array(COLS * ROWS);
  let shown: { kind: 'bfs' | 'astar'; res: SearchResult; upto: number; pathUpto: number } | null = null;
  let token = 0;

  function draw() {
    const c = colours();
    const g = cv.g;
    cv.clear();
    g.fillStyle = c.surface2;
    g.fillRect(0, 0, W, H);
    const explored = new Set<number>();
    const pathSet = new Set<number>();
    if (shown) {
      for (let k = 0; k < shown.upto && k < shown.res.order.length; k++) explored.add(shown.res.order[k]);
      for (let k = 0; k < shown.pathUpto && k < shown.res.path.length; k++) pathSet.add(shown.res.path[k]);
    }
    const searchCol = shown?.kind === 'astar' ? c.learn : c.search;
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const i = idx(x, y);
        const px = x * CELL, py = y * CELL;
        if (walls[i]) { g.fillStyle = c.text; g.fillRect(px + 1, py + 1, CELL - 2, CELL - 2); continue; }
        if (pathSet.has(i)) { g.fillStyle = c.yellow; g.fillRect(px + 1, py + 1, CELL - 2, CELL - 2); continue; }
        if (explored.has(i)) { g.fillStyle = searchCol; g.globalAlpha = 0.35; g.fillRect(px + 1, py + 1, CELL - 2, CELL - 2); g.globalAlpha = 1; continue; }
        g.fillStyle = c.surface; g.fillRect(px + 1, py + 1, CELL - 2, CELL - 2);
      }
    }
    const mark = (p: [number, number], col: string, label: string) => {
      g.fillStyle = col;
      g.beginPath(); g.arc(p[0] * CELL + CELL / 2, p[1] * CELL + CELL / 2, CELL * 0.42, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#fff'; g.font = '700 11px Inter Variable, system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(label, p[0] * CELL + CELL / 2, p[1] * CELL + CELL / 2 + 0.5);
    };
    mark(START, c.green, 'S');
    mark(GOAL, c.red, 'G');
    g.textBaseline = 'alphabetic';
  }

  const r1 = readout('Search 1 checked');
  const r2 = readout('Search 2 checked');
  const r0 = readout('Search 2, empty grid', String(EMPTY_A));
  const rp = readout('Path length');

  function evaluate(demo = false) {
    const a = astar(walls), b = bfs(walls);
    if (!a.path.length) {
      api.feedback('No path to the goal. Open a gap in the walls.');
      return { a, b };
    }
    const ratio = a.order.length / EMPTY_A;
    api.feedback(`Search 2 now checks **${a.order.length}** squares: ${ratio.toFixed(1)} times the empty grid (${EMPTY_A}). Target: 3 times.`);
    if (ratio >= 3 && !demo) api.win(`Done: Search 2 checks ${a.order.length} squares, ${ratio.toFixed(1)} times as many as on the empty grid. The walls hide the goal from its guess.`);
    return { a, b };
  }

  async function run(kind: 'bfs' | 'astar') {
    const my = ++token;
    const res = kind === 'bfs' ? bfs(walls) : astar(walls);
    shown = { kind, res, upto: 0, pathUpto: 0 };
    (kind === 'bfs' ? r1 : r2).set(String(res.order.length));
    rp.set(res.path.length ? String(res.path.length - 1) : 'no path');
    const per = Math.max(1, Math.ceil(res.order.length / 90));
    while (shown.upto < res.order.length) {
      if (my !== token) return;
      shown.upto += per;
      draw();
      await new Promise(requestAnimationFrame);
    }
    while (shown.pathUpto < res.path.length) {
      if (my !== token) return;
      shown.pathUpto += 1;
      draw();
      await new Promise(requestAnimationFrame);
    }
  }

  // wall painting
  let painting: 0 | 1 | null = null;
  const cellAt = (e: PointerEvent) => {
    const [x, y] = cv.pos(e);
    const cx = Math.floor(x / CELL), cy = Math.floor(y / CELL);
    if (cx < 0 || cy < 0 || cx >= COLS || cy >= ROWS) return -1;
    if ((cx === START[0] && cy === START[1]) || (cx === GOAL[0] && cy === GOAL[1])) return -1;
    return idx(cx, cy);
  };
  cv.c.addEventListener('pointerdown', (e) => {
    const i = cellAt(e);
    if (i < 0) return;
    cv.c.setPointerCapture(e.pointerId);
    painting = walls[i] ? 0 : 1;
    walls[i] = painting;
    token++; shown = null;
    draw();
  });
  cv.c.addEventListener('pointermove', (e) => {
    if (painting === null) return;
    const i = cellAt(e);
    if (i >= 0 && walls[i] !== painting) { walls[i] = painting; draw(); }
  });
  const endPaint = () => {
    if (painting === null) return;
    painting = null;
    const { a, b } = evaluate();
    r1.set(String(b.order.length)); r2.set(String(a.order.length));
    rp.set(a.path.length ? String(a.path.length - 1) : 'no path');
  };
  cv.c.addEventListener('pointerup', endPaint);
  cv.c.addEventListener('pointercancel', endPaint);

  el.append(
    cv.c,
    h('div', { class: 'viz-controls' },
      h('div', { class: 'btn-row' },
        button('Run search 1: spread evenly', () => run('bfs'), 'btn small'),
        button('Run search 2: head for the goal', () => run('astar'), 'btn small'),
        button('Clear walls', () => { walls = new Uint8Array(COLS * ROWS); token++; shown = null; draw(); evaluate(); r1.set('–'); r2.set('–'); rp.set('–'); }, 'btn small ghost'))),
    h('div', { class: 'viz-readouts' }, r1.el, r2.el, r0.el, rp.el),
    h('div', { class: 'viz-caption' }, 'Click or drag on the grid to draw walls. S = start, G = goal. Blue: squares Search 1 checked. Purple: Search 2. Yellow: the path found.'),
  );
  draw();
  onTheme(draw);

  return {
    async showMe() {
      walls = trapWalls();
      token++; shown = null;
      draw();
      evaluate(true);
      await sleep(300);
      await run('astar');
    },
  };
};

export default viz;

// DSA 6 — Trees and binary search trees. Values go in one at a time; each comparison on the way down is a step.
// Challenge: insert 7 different numbers so the tree has 3 levels (the fewest 7 nodes can have).
import { h, s } from '../../../lib/dom';
import { readout, sleep, type Viz } from '../../fieldviz/kit';
import { makePlayer, type Algorithm } from '../player';
import {
  INSERT_CODE, SEARCH_CODE, geometry, insertFrames, parseInput, rankOf, searchFrames,
  type BstFrame, type NodeState,
} from './bst-core';
import './bst.css';

const GOAL_N = 7;
const GOAL_LEVELS = 3;
const SHOW_ME = '40 20 60 10 30 50 70';

const NODE_CLASS: Record<NodeState, string> = {
  '': 'dv-node', cmp: 'dv-node front', path: 'dv-node hi', new: 'dv-node bst-new', found: 'dv-node done', done: 'dv-node done',
};

const plural = (n: number, one: string, many = one + 's') => `${n} ${n === 1 ? one : many}`;

function render(stage: HTMLElement, f: BstFrame) {
  const g = geometry(f.order.length, f.levels);
  const svg = s('svg', { viewBox: `0 0 ${g.W} ${g.H}`, class: 'bst-svg', 'data-wide': 'true', role: 'img',
    'aria-label': `A binary search tree with ${plural(f.count, 'node')} on ${plural(f.height, 'level')}` });

  // levels: a number at the left of each row, and a faint guide line
  svg.append(s('text', { x: 4, y: g.top - 30, class: 'bst-level-h' }, 'level'));
  for (let d = 0; d < f.levels; d++) {
    const y = g.y(d);
    svg.append(
      s('line', { x1: 40, y1: y, x2: g.W - 6, y2: y, class: 'bst-guide' }),
      s('text', { x: 18, y: y + 6, 'text-anchor': 'middle', class: 'bst-level' + (d < f.height ? '' : ' off') }, String(d + 1)));
  }

  const pos = new Map<number, [number, number]>(f.nodes.map((n) => [n.v, [g.x(rankOf(f.order, n.v)), g.y(n.depth)]]));
  const onPath = new Set(f.path.slice(1).map((v, k) => `${f.path[k]}>${v}`));
  const edge = (a: [number, number], b: [number, number], cls: string) => {
    const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
    const ux = dx / len, uy = dy / len;
    return s('line', { x1: a[0] + ux * g.r, y1: a[1] + uy * g.r, x2: b[0] - ux * g.r, y2: b[1] - uy * g.r, class: cls });
  };

  for (const n of f.nodes) {
    if (n.parent === null) continue;
    svg.append(edge(pos.get(n.parent)!, pos.get(n.v)!, 'dv-edge' + (onPath.has(`${n.parent}>${n.v}`) ? ' hi' : '')));
  }
  if (f.spot && f.value !== null) {
    const at: [number, number] = [g.x(rankOf(f.order, f.value)), g.y(f.spot.depth)];
    svg.append(
      edge(pos.get(f.spot.parent)!, at, 'bst-spot-edge'),
      s('circle', { cx: at[0], cy: at[1], r: g.r, class: 'bst-spot' }),
      s('text', { x: at[0], y: at[1] + 6, 'text-anchor': 'middle', class: 'bst-q' }, '?'));
  }
  for (const n of f.nodes) {
    const [x, y] = pos.get(n.v)!;
    svg.append(
      s('circle', { cx: x, cy: y, r: g.r, class: NODE_CLASS[n.state] }),
      s('text', { x, y: y + 6, 'text-anchor': 'middle', class: 'bst-val' }, String(n.v)));
  }

  // values still waiting to go in, top left
  if (f.queue.length) {
    const fit = Math.max(1, Math.floor((g.W - 180) / 26));
    const shown = f.queue.slice(0, fit).join('  ') + (f.queue.length > fit ? '  …' : '');
    svg.append(s('text', { x: 4, y: 30, class: 'bst-queue' }, s('tspan', { class: 'bst-queue-l' }, 'Next: '), shown));
  }

  // the value being placed or looked for, top right
  if (f.value !== null && f.line !== -1) {
    const cr = 19, cx = g.W - 8 - cr, cy = 30;
    svg.append(
      s('text', { x: cx - cr - 8, y: cy + 6, 'text-anchor': 'end', class: 'bst-chip-l' }, f.mode === 'insert' ? 'Insert' : 'Search for'),
      s('circle', { cx, cy, r: cr, class: 'bst-chip' }),
      s('text', { x: cx, y: cy + 6, 'text-anchor': 'middle', class: 'bst-val' }, String(f.value)));
  }
  stage.append(svg);
}

const viz: Viz = (el, api) => {
  let showing = false;
  const nodesR = readout('Nodes');
  const levelsR = readout('Levels (height)');
  const compsR = readout('Comparisons so far');
  const legend = h('div', { class: 'legend' });
  const LEGENDS: Record<string, [string, string][]> = {
    Insert: [['var(--search)', 'being compared'], ['var(--yellow)', 'the path so far'], ['var(--red)', 'the node added in this step'], ['var(--green)', 'the finished tree']],
    Search: [['var(--search)', 'being compared'], ['var(--yellow)', 'the path so far'], ['var(--green)', 'found']],
  };
  const setLegend = (name: string) => legend.replaceChildren(...LEGENDS[name].map(([c, t]) => h('span', null, h('span', { class: 'sw', style: `background:${c}` }), t)));

  const algorithms: Algorithm<BstFrame>[] = [
    { name: 'Insert', code: INSERT_CODE, run: (t) => { const p = parseInput(t); return insertFrames(p.nums, p.target); } },
    { name: 'Search', code: SEARCH_CODE, run: (t) => { const p = parseInput(t); return searchFrames(p.nums, p.target); } },
  ];

  const player = makePlayer<BstFrame>({
    algorithms,
    inputs: {
      label: 'Numbers to insert, in order (1 to 99, up to 15 of them)',
      value: '8 3 10 1 6 14 4',
      help: 'For Search, add the number to find after a semicolon, like: 8 3 10 1 6 14 4; 6',
      presets: [
        { label: 'Practice tree', value: '8 3 10 1 6 14 4' },
        { label: 'Sorted 1 to 7', value: '1 2 3 4 5 6 7' },
        { label: '12 numbers', value: '42 17 88 9 23 61 95 30 54 70 12 66' },
        { label: 'Look for a missing 5', value: '8 3 10 1 6 14 4; 5' },
      ],
      random: () => {
        const pool = Array.from({ length: 99 }, (_, i) => i + 1);
        for (let i = pool.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [pool[i], pool[j]] = [pool[j], pool[i]];
        }
        return pool.slice(0, GOAL_N).join(' ');
      },
    },
    render: (stage, f) => render(stage, f),
    onFrame: (f) => {
      nodesR.set(String(f.count));
      levelsR.set(String(f.height));
      compsR.set(String(f.comps));
    },
    onRun: (frames, _input, algo) => {
      setLegend(algo.name);
      const last = frames[frames.length - 1];
      const n = last.count, lv = last.height;
      if (n === GOAL_N && lv === GOAL_LEVELS) {
        if (showing) {
          api.feedback(`Middle value first: 40 splits the rest into 10–30 and 50–70. Then 20 and 60 split those halves. **7 nodes, 3 levels.** Now find a different order that also works.`);
        } else {
          api.win(`7 nodes on 3 levels: 1, then 2, then 4 nodes. No tree with 7 nodes is shorter, so every search here takes at most 3 comparisons.`);
        }
      } else if (n === GOAL_N) {
        api.feedback(`7 nodes, ${plural(lv, 'level')}. A tree with 7 nodes can have as few as 3.`);
      } else {
        api.feedback(`${plural(n, 'node')}, ${plural(lv, 'level')}. The challenge needs exactly 7 different numbers.`);
      }
      showing = false;
    },
  });

  el.append(
    player.el,
    legend,
    h('div', { class: 'viz-readouts' }, nodesR.el, levelsR.el, compsR.el),
  );

  return {
    async showMe() {
      showing = true;
      player.setInput(SHOW_ME, 0);
      await sleep(400);
      player.play();
    },
  };
};

export default viz;

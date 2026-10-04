// DSA 7 — Heaps and priority queues. The same min-heap drawn twice: as a tree (top) and as an array (bottom).
// A position has the same colour in both, so the student sees that position i's children sit at 2i + 1 and 2i + 2.
// Challenge: make a single insertion need 3 swaps.
import { h, s } from '../../../lib/dom';
import { readout, sleep, type Viz } from '../../fieldviz/kit';
import { makePlayer, type Algorithm } from '../player';
import {
  GOAL_SWAPS, HEAP_CODE, MAX_OPS, MAX_SIZE, bestInsert, heapFrames, levelsFor, parentOf, parseOps, randomOps,
  type HeapFrame,
} from './heap-core';
import './heap.css';

const W = 640;
const PAD = 20;
const R = 20;
const TOP = 52;
const DY = 62;
const SHOW_ME = '10 20 30 40 50 60 70 5';
const DEFAULT = '5 3 8 1 x 6 2';

/** Centre of position i in the tree. */
function treeXY(i: number): [number, number] {
  const d = levelsFor(i + 1) - 1;
  const j = i - (2 ** d - 1);
  const slot = (W - 2 * PAD) / 2 ** d;
  return [PAD + (j + 0.5) * slot, TOP + d * DY];
}

function render(stage: HTMLElement, f: HeapFrame) {
  const levels = Math.max(3, levelsFor(f.cap));
  const treeBottom = TOP + (levels - 1) * DY + R + 16;
  const slots = Math.max(f.cap, 7);
  const cw = Math.min(54, (W - 2 * PAD) / slots);
  const ax0 = (W - cw * slots) / 2;
  const ay = treeBottom + 40;
  const ch = 40;
  const cellX = (i: number) => ax0 + i * cw;
  const arcTop = ay + ch + 24;
  const H = arcTop + 52;
  const n = f.heap.length;

  const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': n ? `Min-heap holding ${f.heap.join(', ')}` : 'An empty heap' });
  const cls = (i: number) => `heap-shape${f.state[i] ? ' ' + f.state[i] : ''}`;
  const linkKind = (a: number, b: number) => f.links.find((l) => l.a === a && l.b === b)?.kind ?? '';

  // ---------- tree
  svg.append(s('text', { x: 12, y: 22, class: 'heap-label' }, 'As a tree'));
  // an edge from a parent to a child, stopping at the two circles' borders
  const edge = (p: number, i: number, cls: string, extra: Record<string, string> = {}) => {
    const [px, py] = treeXY(p), [cx, cy] = treeXY(i);
    const len = Math.hypot(cx - px, cy - py), ux = (cx - px) / len, uy = (cy - py) / len;
    return s('line', { x1: px + ux * R, y1: py + uy * R, x2: cx - ux * R, y2: cy - uy * R, class: cls, ...extra });
  };
  for (let i = 1; i < n; i++) {
    const k = linkKind(parentOf(i), i);
    svg.append(edge(parentOf(i), i, 'heap-edge' + (k ? ' ' + k : '')));
  }
  if (f.hole && f.hole.i >= n) {
    const [x2, y2] = treeXY(f.hole.i);
    if (f.hole.i > 0) svg.append(edge(parentOf(f.hole.i), f.hole.i, 'heap-edge', { 'stroke-dasharray': '4 4' }));
    svg.append(
      s('circle', { cx: x2, cy: y2, r: R, class: 'heap-shape hole' }),
      s('text', { x: x2, y: y2 + 6, 'text-anchor': 'middle', class: 'heap-num ghost' }, String(f.hole.value)),
      s('text', { x: x2, y: y2 + R + 15, 'text-anchor': 'middle', class: 'heap-pos' }, String(f.hole.i)),
    );
  }
  for (let i = 0; i < n; i++) {
    const [x, y] = treeXY(i);
    svg.append(
      s('circle', { cx: x, cy: y, r: R, class: cls(i) }),
      s('text', { x, y: y + 6, 'text-anchor': 'middle', class: 'heap-num' }, String(f.heap[i])),
      s('text', { x, y: y + R + 15, 'text-anchor': 'middle', class: 'heap-pos' }, String(i)),
    );
  }
  if (!n && !f.hole) svg.append(s('text', { x: W / 2, y: TOP + 5, 'text-anchor': 'middle', class: 'heap-pos' }, '(empty)'));

  // ---------- taken out so far (top right)
  if (f.out.length) {
    const cwOut = 30;
    const x0 = W - 12 - f.out.length * (cwOut + 4) + 4;
    svg.append(s('text', { x: x0 - 8, y: 22, 'text-anchor': 'end', class: 'heap-label' }, 'Taken out:'));
    f.out.forEach((v, k) => {
      const x = x0 + k * (cwOut + 4);
      svg.append(
        s('rect', { x, y: 6, width: cwOut, height: 24, rx: 5, class: 'heap-out' }),
        s('text', { x: x + cwOut / 2, y: 23, 'text-anchor': 'middle', class: 'heap-num', style: 'font-size:14px' }, String(v)),
      );
    });
  }

  // ---------- array
  svg.append(s('text', { x: 12, y: ay - 12, class: 'heap-label' }, 'As an array (position under each cell)'));
  for (let i = 0; i < slots; i++) {
    const x = cellX(i);
    const filled = i < n;
    const isHole = f.hole && f.hole.i === i && !filled;
    svg.append(s('rect', { x: x + 2, y: ay, width: cw - 4, height: ch, rx: 6, class: filled ? cls(i) : isHole ? 'heap-shape hole' : 'heap-shape free' }));
    if (filled) svg.append(s('text', { x: x + cw / 2, y: ay + ch / 2 + 6, 'text-anchor': 'middle', class: 'heap-num' }, String(f.heap[i])));
    else if (isHole) svg.append(s('text', { x: x + cw / 2, y: ay + ch / 2 + 6, 'text-anchor': 'middle', class: 'heap-num ghost' }, String(f.hole!.value)));
    svg.append(s('text', { x: x + cw / 2, y: ay + ch + 16, 'text-anchor': 'middle', class: 'heap-pos' }, String(i)));
  }
  // parent–child links under the array: the jump from position i to 2i + 1 or 2i + 2
  for (const l of f.links) {
    const xa = cellX(l.a) + cw / 2, xb = cellX(l.b) + cw / 2;
    const depth = Math.min(46, 16 + Math.abs(xb - xa) * 0.18);
    svg.append(s('path', { d: `M ${xa} ${arcTop} Q ${(xa + xb) / 2} ${arcTop + depth * 2 - 16} ${xb} ${arcTop}`, class: `heap-arc ${l.kind}` }));
  }
  stage.append(svg);
}

const viz: Viz = (el, api) => {
  let showing = false;
  const opR = readout('Operation');
  const swapsR = readout('Swaps in this operation');
  const maxR = readout('Most swaps in one insertion so far');
  const sw = (c: string, t: string) => h('span', null, h('span', { class: 'sw', style: `background:${c}` }), t);
  const legend = h('div', { class: 'legend' },
    sw('var(--yellow)', 'the item being placed'),
    sw('var(--search)', 'compared with it'),
    sw('var(--red)', 'swapped in this step'),
    sw('var(--green)', 'in its place, or taken out'),
    h('span', null, 'Small grey numbers: positions in the array'));

  const algorithms: Algorithm<HeapFrame>[] = [
    { name: 'Min-heap', code: HEAP_CODE, run: (t) => heapFrames(parseOps(t)) },
  ];

  const player = makePlayer<HeapFrame>({
    algorithms,
    inputs: {
      label: `Operations: a number from 1 to 99 inserts it, x removes the smallest (at most ${MAX_OPS})`,
      value: DEFAULT,
      help: `For example: 5 3 8 1 x 6 2. The heap holds at most ${MAX_SIZE} numbers at once.`,
      presets: [
        { label: 'Insert 5, 3, 8, 1', value: '5 3 8 1' },
        { label: 'Insert and remove', value: DEFAULT },
        { label: 'Already in order', value: '1 2 3 4 5 6 7' },
        { label: 'Take them all out', value: '7 3 9 1 5 x x x x x' },
      ],
      random: () => randomOps(),
    },
    render: (stage, f) => render(stage, f),
    onFrame: (f) => {
      opR.set(f.op < 0 ? '–' : `${f.op + 1} of ${f.nOps}: ${f.opText}`);
      swapsR.set(f.op < 0 ? '–' : String(f.swaps));
      maxR.set(String(f.maxInsert));
    },
    onRun: (frames, input) => {
      const ops = parseOps(input);
      const best = bestInsert(ops);
      const most = frames[frames.length - 1].maxInsert;
      const levels = levelsFor(frames[0].cap);
      if (showing) {
        api.feedback(best
          ? `Show me: inserting ${best.value} needs ${best.swaps} swaps. It starts at position ${best.from}, on the 4th level, and is smaller than every item above it. Now try your own numbers.`
          : 'Show me needs at least one insertion.');
      } else if (best && most >= GOAL_SWAPS) {
        api.win(`Inserting ${best.value} needed ${best.swaps} swaps. It started at position ${best.from}, on the 4th level, and climbed one level per swap to the top.`);
      } else {
        api.feedback(`The most swaps in one insertion: **${most}**. The goal is ${GOAL_SWAPS}.`
          + (levels < 4 ? ` Your heap reached ${levels} level${levels === 1 ? '' : 's'}. Each swap moves an item up one level.` : ' Your heap is tall enough. Which new number would climb all the way up?'));
      }
      showing = false;
    },
  });

  el.append(h('div', { class: 'heap-viz' },
    player.el,
    legend,
    h('div', { class: 'viz-readouts' }, opR.el, swapsR.el, maxR.el)));

  return {
    async showMe() {
      showing = true;
      player.setInput(SHOW_ME);
      await sleep(400);
      player.play();
    },
  };
};

export default viz;

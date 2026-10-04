// DSA 5 — Sorting and binary search. Bars are numbers; the step player walks through each comparison.
// Challenge: make first-pivot quicksort hit its worst case (36 comparisons on 9 numbers).
import { h, s } from '../../../lib/dom';
import { readout, sleep, type Viz } from '../../fieldviz/kit';
import { makePlayer, type Algorithm } from '../player';
import {
  BINARY_CODE, MERGE_CODE, QUICK_CODE, binarySearchFrames, mergeSortFrames, parseInput, quickSortFrames, quickWorst,
  type SortFrame,
} from './sorting-core';

const W = 640;
const GOAL_N = 9;

function render(stage: HTMLElement, f: SortFrame) {
  const n = f.arr.length;
  const hasBuf = !!f.buffer;
  const H = hasBuf ? 290 : 230;
  const pad = 24;
  const slot = (W - 2 * pad) / n;
  const bw = Math.min(46, slot - 8);
  const x = (i: number) => pad + i * slot + (slot - bw) / 2;
  const maxV = Math.max(...f.arr, 1);
  const base = 170;
  const bh = (v: number) => 16 + (v / maxV) * 130;
  const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'data-wide': 'true', 'aria-label': `Bars for the numbers ${f.arr.join(', ')}` });

  if (f.range) {
    const [lo, hi] = f.range;
    svg.append(s('rect', { x: x(lo) - 6, y: 8, width: x(hi) + bw - x(lo) + 12, height: base - 2, rx: 8, class: 'dv-range' }));
  }
  f.arr.forEach((v, i) => {
    const cls = f.state[i] ? `dv-bar ${f.state[i]}` : 'dv-bar';
    svg.append(
      s('rect', { x: x(i), y: base - bh(v), width: bw, height: bh(v), rx: 4, class: cls }),
      s('text', { x: x(i) + bw / 2, y: base - bh(v) - 6, 'text-anchor': 'middle', class: 'dv-text' + (f.state[i] === 'dim' ? ' dv-faded' : '') }, String(v)),
      s('text', { x: x(i) + bw / 2, y: base + 16, 'text-anchor': 'middle', class: 'dv-small' }, String(i)),
    );
  });
  for (const m of f.marks ?? []) {
    if (m.i < 0 || m.i >= n) continue;
    svg.append(s('text', { x: x(m.i) + bw / 2, y: base + 34, 'text-anchor': 'middle', class: 'dv-mark' }, `↑ ${m.label}`));
  }
  if (f.buffer) {
    const y0 = base + 52;
    svg.append(s('text', { x: pad, y: y0 - 6, class: 'dv-small' }, 'Output (merged so far):'));
    f.buffer.values.forEach((v, k) => {
      const i = f.buffer!.start + k;
      svg.append(
        s('rect', { x: x(i), y: y0, width: bw, height: 34, rx: 6, class: 'dv-cell hi' }),
        s('text', { x: x(i) + bw / 2, y: y0 + 22, 'text-anchor': 'middle', class: 'dv-text' }, String(v)),
      );
    });
    if (!f.buffer.values.length) svg.append(s('rect', { x: x(f.buffer.start), y: y0, width: bw, height: 34, rx: 6, class: 'dv-cell' }));
  }
  stage.append(svg);
}

const viz: Viz = (el, api) => {
  let showing = false;
  const compsR = readout('Comparisons so far');
  const totalR = readout('Total for this run');
  const legend = h('div', { class: 'legend' });
  const LEGENDS: Record<string, [string, string][]> = {
    'Merge sort': [['var(--search)', 'being compared'], ['var(--red)', 'moving to the output'], ['var(--yellow)', 'a sorted part'], ['var(--green)', 'all sorted']],
    'Quicksort': [['var(--yellow)', 'pivot'], ['var(--search)', 'being compared'], ['var(--red)', 'swapped'], ['var(--green)', 'in its final place']],
    'Binary search': [['var(--search)', 'the middle item, being checked'], ['var(--green)', 'found'], ['var(--faint)', 'still possible (others are ruled out)']],
  };
  const setLegend = (name: string) => legend.replaceChildren(...LEGENDS[name].map(([c, t]) => h('span', null, h('span', { class: 'sw', style: `background:${c}` }), t)));

  const algorithms: Algorithm<SortFrame>[] = [
    { name: 'Merge sort', code: MERGE_CODE, run: (t) => mergeSortFrames(parseInput(t).nums) },
    { name: 'Quicksort', code: QUICK_CODE, run: (t) => quickSortFrames(parseInput(t).nums) },
    { name: 'Binary search', code: BINARY_CODE, run: (t) => { const p = parseInput(t); return binarySearchFrames(p.nums, p.target); } },
  ];

  const player = makePlayer<SortFrame>({
    algorithms,
    inputs: {
      label: 'Numbers (1 to 99, between 2 and 12 of them)',
      value: '38 12 71 5 56 23 90 41 67',
      help: 'For binary search, add the number to find after a semicolon, like: 5 12 23; 23',
      presets: [
        { label: 'Mixed', value: '38 12 71 5 56 23 90 41 67' },
        { label: 'Nearly sorted', value: '5 12 23 38 41 56 90 67 71' },
        { label: 'Search for 56', value: '38 12 71 5 56 23 90 41 67; 56' },
        { label: 'Search for 50', value: '38 12 71 5 56 23 90 41 67; 50' },
      ],
      random: () => {
        const n = 6 + Math.floor(Math.random() * 5);
        return Array.from({ length: n }, () => 1 + Math.floor(Math.random() * 99)).join(' ');
      },
    },
    render: (stage, f) => render(stage, f),
    onFrame: (f) => compsR.set(String(f.comps)),
    onRun: (frames, input, algo) => {
      setLegend(algo.name);
      const total = frames[frames.length - 1].comps;
      totalR.set(`${total} ${algo.name === 'Binary search' ? 'checks' : 'comparisons'}`);
      const n = frames[0].arr.length;
      if (algo.name === 'Quicksort') {
        if (n === GOAL_N && total === quickWorst(GOAL_N)) {
          if (showing) api.feedback(`Sorted input is a worst case: ${total} comparisons on ${n} numbers. Now find a different list of 9 that does it.`);
          else api.win(`${total} comparisons on ${n} numbers: every pivot was the smallest or largest item left, so each split removed only the pivot.`);
        } else {
          api.feedback(`Quicksort: ${total} comparisons on ${n} numbers.${n === GOAL_N ? ` The worst case for 9 is ${quickWorst(GOAL_N)}.` : ' The challenge needs exactly 9 numbers.'}`);
        }
      } else if (algo.name === 'Merge sort') {
        api.feedback(`Merge sort: ${total} comparisons on ${n} numbers. Switch to Quicksort for the challenge.`);
      }
      showing = false;
    },
    stageHeight: 250,
  });

  el.append(
    player.el,
    legend,
    h('div', { class: 'viz-readouts' }, compsR.el, totalR.el),
  );

  return {
    async showMe() {
      showing = true;
      player.setInput('5 12 23 38 41 56 67 71 90', 1);
      await sleep(400);
      player.play();
    },
  };
};

export default viz;

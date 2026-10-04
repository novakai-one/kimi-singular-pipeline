// DSA 10, dynamic programming: fill the edit-distance table cell by cell, then walk back along the arrows.
// Challenge: two different words, each at least 5 letters, exactly 1 edit apart.
import { h, s } from '../../../lib/dom';
import { readout, sleep, type Viz } from '../../fieldviz/kit';
import { makePlayer, type Algorithm } from '../player';
import { CODE, GOAL_LEN, editFrames, meetsGoal, parseInput, randomPair, type EdFrame, differingPositions } from './editdistance-core';
import './editdistance.css';

const W = 640;
const PAD = 8;
const IDX = 22;

const pfx = (w: string, k: number) => (k ? `"${w.slice(0, k)}"` : '(no letters)');

function render(stage: HTMLElement, f: EdFrame) {
  const { a, b } = f;
  const n = a.length, m = b.length;
  const cols = m + 2, rows = n + 2;
  const c = Math.min(64, Math.floor((W - 2 * PAD - IDX) / cols));
  const fs = Math.round(Math.max(18, Math.min(24, c * 0.4)));
  const x0 = (W - IDX - cols * c) / 2 + IDX;  // left edge of the row-letter column
  const y0 = PAD + IDX;                       // top edge of the column-letter row
  const H = y0 + rows * c + PAD;
  const cx = (j: number) => x0 + (j + 1) * c; // left edge of table column j
  const cy = (i: number) => y0 + (i + 1) * c; // top edge of table row i
  const base = (y: number) => y + c / 2 + fs * 0.36;

  const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'editdistance-svg', role: 'img',
    'aria-label': `Edit distance table: "${a}" down the side, "${b}" along the top` });
  svg.append(s('defs', null,
    s('marker', { id: 'editdistance-arrow', viewBox: '0 0 10 10', refX: 7, refY: 5, markerWidth: 3.6, markerHeight: 3.6, orient: 'auto' },
      s('path', { d: 'M0,0 L10,5 L0,10 z', class: 'editdistance-arrowhead' }))));

  const filling = !!f.reads;
  const [ci, cj] = f.cur ?? [-1, -1];

  // the two beginnings this cell is about: shaded behind the letters
  if (filling) {
    svg.append(
      s('rect', { x: x0 + 3, y: cy(1) + 3, width: c - 6, height: ci * c - 6, rx: 6, class: 'editdistance-band' }),
      s('rect', { x: cx(1) + 3, y: y0 + 3, width: cj * c - 6, height: c - 6, rx: 6, class: 'editdistance-band' }));
  }

  // index numbers and letters
  for (let j = 0; j <= m; j++) {
    svg.append(s('text', { x: cx(j) + c / 2, y: y0 - 6, 'text-anchor': 'middle', class: 'editdistance-idx' }, String(j)));
    if (j > 0) {
      const on = filling && j === cj;
      if (on) svg.append(s('rect', { x: cx(j) + 5, y: y0 + 5, width: c - 10, height: c - 10, rx: 6, class: 'dv-cell cmp' }));
      svg.append(s('text', { x: cx(j) + c / 2, y: base(y0), 'text-anchor': 'middle', 'font-size': fs + 1, class: 'editdistance-head' + (on ? ' cmp' : '') }, b[j - 1]));
    }
  }
  for (let i = 0; i <= n; i++) {
    svg.append(s('text', { x: x0 - 6, y: cy(i) + c / 2 + 4.5, 'text-anchor': 'end', class: 'editdistance-idx' }, String(i)));
    if (i > 0) {
      const on = filling && i === ci;
      if (on) svg.append(s('rect', { x: x0 + 5, y: cy(i) + 5, width: c - 10, height: c - 10, rx: 6, class: 'dv-cell cmp' }));
      svg.append(s('text', { x: x0 + c / 2, y: base(cy(i)), 'text-anchor': 'middle', 'font-size': fs + 1, class: 'editdistance-head' + (on ? ' cmp' : '') }, a[i - 1]));
    }
  }

  // cell classes for this frame
  const key = (i: number, j: number) => i * 100 + j;
  const cls = new Map<number, string>();
  for (const [i, j] of f.fresh ?? []) cls.set(key(i, j), 'dv-cell hi');
  for (const r of f.reads ?? []) cls.set(key(r.i, r.j), 'dv-cell cmp');
  for (const st of f.path ?? []) cls.set(key(st.i, st.j), st.op === 'keep' ? 'dv-cell editdistance-keep' : 'dv-cell editdistance-edit');
  if (f.path && f.done) cls.set(key(0, 0), 'dv-cell editdistance-keep');
  if (f.cur) cls.set(key(ci, cj), 'dv-cell hi');
  if (f.done) cls.set(key(n, m), 'dv-cell done');

  for (let i = 0; i <= n; i++) {
    for (let j = 0; j <= m; j++) {
      const v = f.table[i][j];
      svg.append(s('rect', { x: cx(j) + 2, y: cy(i) + 2, width: c - 4, height: c - 4, rx: 5,
        class: cls.get(key(i, j)) ?? (v === null ? 'dv-cell dim' : 'dv-cell') }));
    }
  }

  // the walk back: one red arrow per step, pointing to the cell the value came from
  for (const st of f.path ?? []) {
    const fx = cx(st.j) + c / 2, fy = cy(st.i) + c / 2;
    const dx = st.pj - st.j, dy = st.pi - st.i;   // each −1 or 0
    const k = 0.29 * c;
    svg.append(s('line', { x1: fx + dx * k, y1: fy + dy * k, x2: fx + dx * (c - k), y2: fy + dy * (c - k),
      class: 'editdistance-path', 'marker-end': 'url(#editdistance-arrow)' }));
  }

  for (let i = 0; i <= n; i++) {
    for (let j = 0; j <= m; j++) {
      const v = f.table[i][j];
      if (v !== null) svg.append(s('text', { x: cx(j) + c / 2, y: base(cy(i)), 'text-anchor': 'middle', 'font-size': fs, class: 'editdistance-num' }, String(v)));
    }
  }
  // what each read cell adds
  for (const r of f.reads ?? []) {
    svg.append(s('text', { x: cx(r.j) + c - 6, y: cy(r.i) + c - 7, 'text-anchor': 'end', class: 'editdistance-add' }, `+${r.add}`));
  }
  // each edit on the walk back, in the free top-right corner of its cell: k→s (change), +g (insert), −x (delete)
  for (const st of f.path ?? []) {
    const t = st.op === 'change' ? `${a[st.i - 1]}→${b[st.j - 1]}` : st.op === 'insert' ? `+${b[st.j - 1]}` : st.op === 'delete' ? `−${a[st.i - 1]}` : '';
    if (t) svg.append(s('text', { x: cx(st.j) + c - 6, y: cy(st.i) + 17, 'text-anchor': 'end', class: 'editdistance-label' }, t));
  }
  stage.append(svg);
}

const viz: Viz = (el, api) => {
  let showing = false;
  const cellR = readout('This cell turns');
  const filledR = readout('Cells filled');
  const editsR = readout('Edits found');
  const legend = h('div', { class: 'legend' },
    ([
      ['var(--search)', 'the three cells being read (+1 or +0 is what each adds)'],
      ['var(--yellow)', 'the cell being filled'],
      ['var(--red)', 'the walk back; filled red = an edit (k→s change, +g insert, −x delete)'],
      ['var(--green)', 'the answer'],
    ] as const).map(([col, t]) => h('span', null, h('span', { class: 'sw', style: `background:${col}` }), t)));

  const algorithms: Algorithm<EdFrame>[] = [
    { name: 'Edit distance', code: CODE, run: (t) => { const p = parseInput(t); return editFrames(p.a, p.b); } },
  ];

  const player = makePlayer<EdFrame>({
    algorithms,
    inputs: {
      label: 'Two words (letters a to z, up to 10 letters each)',
      value: 'kitten, sitting',
      help: 'The first word goes down the side, the second along the top.',
      presets: [
        { label: 'kitten → sitting', value: 'kitten, sitting' },
        { label: 'recieve → receive', value: 'recieve, receive' },
        { label: 'sunday → saturday', value: 'sunday, saturday' },
        { label: 'cat → cast', value: 'cat, cast' },
      ],
      random: () => randomPair(),
    },
    render: (stage, f) => render(stage, f),
    onFrame: (f) => {
      const n = f.a.length, m = f.b.length;
      cellR.set(f.cur ? `${pfx(f.a, f.cur[0])} → ${pfx(f.b, f.cur[1])}` : f.done ? `"${f.a}" → "${f.b}"` : '–');
      filledR.set(`${f.filled} of ${n * m}`);
      editsR.set(f.path ? (f.edits.length ? f.edits.join(', ') : 'none yet') : '–');
    },
    onRun: (frames) => {
      const f = frames[frames.length - 1];
      const { a, b, dist } = f;
      if (meetsGoal(a, b)) {
        const diff = differingPositions(a, b);
        const msg = `"${a}" and "${b}": ${diff} positions have different letters, but ${dist} edits are enough (${f.edits.join(', ')}). `
          + 'Deleting and inserting shift the letters along, so comparing column by column overcounts.';
        if (showing) api.feedback(msg + ' Now find a pair of your own.');
        else api.win(msg);
      } else if (a === b) {
        api.feedback('The two words are the same, so the distance is 0. The goal needs two different words.');
      } else if (a.length !== b.length) {
        api.feedback(`"${a}" → "${b}": distance ${dist}. The goal needs two words of the same length.`);
      } else if (a.length < GOAL_LEN) {
        api.feedback(`The goal needs words of at least ${GOAL_LEN} letters.`);
      } else {
        api.feedback(`"${a}" → "${b}": ${differingPositions(a, b)} positions differ and ${dist} edits are needed. The goal is fewer edits than differing positions.`);
      }
      showing = false;
    },
    stageHeight: 300,
  });

  el.append(
    player.el,
    legend,
    h('div', { class: 'viz-readouts' }, cellR.el, filledR.el, editsR.el),
  );

  return {
    async showMe() {
      showing = true;
      player.setInput('stone, tones');
      await sleep(400);
      player.play();
    },
  };
};

export default viz;

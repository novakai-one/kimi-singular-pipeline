// Field 5 — Computer vision: build a 3 x 3 filter that finds the left and right edges of a square.
// Left: the input image (green = data). Right: the output (yellow = result), brightness = |sum|.
// Below: the filter (red +1, blue −1) and the worked sum for the outlined patch.
// Pure maths lives in conv-core.ts (tested in Node).
import { h } from '../../lib/dom';
import { button, colours, makeCanvas, onTheme, readout, sleep, type Viz } from './kit';
import {
  convolve, edgeScores, IMAGE, isWin, maxAbs, nextCell, patch, signed, SHOW_ME_FILTER, SHOW_ME_ORDER,
  SIZE, ZERO_FILTER, type Filter,
} from './conv-core';
import './conv.css';

const CELL = 14;
const G = SIZE * CELL;          // grid size in px
const PAD = 16;                 // room around each grid for the zero padding
const W = 540, H = G + 2 * PAD;
const XI = PAD, XO = W - PAD - G, Y0 = PAD;
// Titles and legends are HTML (readable on phones), placed at the grids' share of the canvas width.
const pct = (x: number) => `${(100 * x / W).toFixed(2)}%`;
// The image is drawn like a photo (dark background) in both themes.
const DARK = '#14161b', LIGHT = '#c4f2d6', HOT = '#ffd23f';

function hexRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const D = hexRgb(DARK), Y = hexRgb(HOT);
const ramp = (t: number) => `rgb(${D.map((d, k) => Math.round(d + (Y[k] - d) * t)).join(',')})`;

const viz: Viz = (el, api) => {
  el.classList.add('conv');
  const cv = makeCanvas(W, H, 'Left: a 16 by 16 input image, dark with a light square. Right: the output after sliding the filter over it.');
  let filter: Filter = ZERO_FILTER.slice();
  let out = convolve(IMAGE, filter);
  let sel = { i: 7, j: 3 };     // centre of the outlined patch
  let token = 0;

  // ---------------------------------------------------------------- canvas
  function draw() {
    const c = colours();
    const g = cv.g;
    cv.clear();
    const max = maxAbs(out);
    maxL.textContent = String(max);
    for (let i = 0; i < SIZE; i++) {
      for (let j = 0; j < SIZE; j++) {
        g.fillStyle = IMAGE[i * SIZE + j] ? LIGHT : DARK;
        g.fillRect(XI + j * CELL, Y0 + i * CELL, CELL, CELL);
        g.fillStyle = ramp(Math.abs(out[i * SIZE + j]) / max);
        g.fillRect(XO + j * CELL, Y0 + i * CELL, CELL, CELL);
      }
    }
    g.strokeStyle = c.border; g.lineWidth = 1;
    g.strokeRect(XI - 0.5, Y0 - 0.5, G + 1, G + 1);
    g.strokeRect(XO - 0.5, Y0 - 0.5, G + 1, G + 1);

    // arrow between the grids
    const ax = (XI + G + XO) / 2, ay = Y0 + G / 2;
    g.strokeStyle = c.muted; g.fillStyle = c.muted; g.lineWidth = 2;
    g.beginPath(); g.moveTo(ax - 10, ay); g.lineTo(ax + 6, ay); g.stroke();
    g.beginPath(); g.moveTo(ax + 11, ay); g.lineTo(ax + 3, ay - 6); g.lineTo(ax + 3, ay + 6); g.closePath(); g.fill();

    // the filter sitting on the outlined patch
    const p = patch(IMAGE, filter, sel.i, sel.j);
    for (let a = -1; a <= 1; a++) {
      for (let b = -1; b <= 1; b++) {
        const i = sel.i + a, j = sel.j + b;
        const x = XI + j * CELL, y = Y0 + i * CELL;
        const outside = i < 0 || j < 0 || i >= SIZE || j >= SIZE;
        if (outside) {
          g.fillStyle = DARK; g.fillRect(x, y, CELL, CELL);
          g.strokeStyle = c.faint; g.lineWidth = 1; g.setLineDash([2, 2]);
          g.strokeRect(x + 0.5, y + 0.5, CELL - 1, CELL - 1); g.setLineDash([]);
        }
        const w = p[(a + 1) * 3 + (b + 1)].w;
        if (w) {
          g.globalAlpha = 0.55;
          g.fillStyle = w > 0 ? c.red : c.search;
          g.fillRect(x, y, CELL, CELL);
          g.globalAlpha = 1;
        }
      }
    }
    const box = (x: number, y: number, s: number) => {
      g.lineWidth = 3.5; g.strokeStyle = 'rgba(0,0,0,.55)'; g.strokeRect(x, y, s, s);
      g.lineWidth = 2; g.strokeStyle = '#ffffff'; g.strokeRect(x, y, s, s);
    };
    box(XI + (sel.j - 1) * CELL, Y0 + (sel.i - 1) * CELL, 3 * CELL);
    g.lineWidth = 1; g.strokeStyle = '#ffffff';
    g.strokeRect(XI + sel.j * CELL + 2.5, Y0 + sel.i * CELL + 2.5, CELL - 5, CELL - 5);
    box(XO + sel.j * CELL, Y0 + sel.i * CELL, CELL);

  }

  // ---------------------------------------------------------------- filter editor
  const cells = filter.map((_, k) => h('button', {
    class: 'conv-cell', type: 'button',
    onclick: () => { token++; filter[k] = nextCell(filter[k]); update(false); },
  }));
  function paintCells() {
    cells.forEach((b, k) => {
      const v = filter[k];
      b.dataset.v = String(v);
      b.textContent = signed(v);
      b.setAttribute('aria-label', `Filter row ${Math.floor(k / 3) + 1}, column ${(k % 3) + 1}: ${signed(v)}. Click to change.`);
    });
  }

  // ---------------------------------------------------------------- worked sum
  const sumLines = h('div', { class: 'conv-sum-lines' });
  const sumTotal = h('div', { class: 'conv-total' });
  function paintSum() {
    const p = patch(IMAGE, filter, sel.i, sel.j);
    const rows = [0, 1, 2].map((r) => h('div', null, p.slice(r * 3, r * 3 + 3).flatMap((t, k) => [
      k ? ' + ' : '',
      '(', h('span', { class: t.w > 0 ? 'conv-w-pos' : t.w < 0 ? 'conv-w-neg' : 'conv-w-zero' }, signed(t.w)),
      '×', h('span', { class: 'conv-x' }, String(t.x)), ')',
    ])));
    sumLines.replaceChildren(...rows);
    const total = out[sel.i * SIZE + sel.j];
    sumTotal.replaceChildren('= ', h('b', null, signed(total, false)));
  }

  // ---------------------------------------------------------------- readouts + feedback
  const vR = readout('Left/right edges');
  const hR = readout('Top/bottom edges');
  function update(demo: boolean) {
    out = convolve(IMAGE, filter);
    paintCells(); paintSum(); draw();
    const s = edgeScores(out);
    vR.set(s.vertical.toFixed(1)); hR.set(s.horizontal.toFixed(1));
    const msg = `Left/right edges: **${s.vertical.toFixed(1)}**. Top/bottom edges: **${s.horizontal.toFixed(1)}**.`;
    if (demo) return s;
    if (isWin(s)) api.win(`Done. ${msg} Your filter lights up the left and right edges and leaves the top and bottom dark.`);
    else api.feedback(`${msg} Target: left/right at least 2, top/bottom at most a quarter of that.`);
    return s;
  }

  // ---------------------------------------------------------------- pointer: move the patch
  function pick(e: PointerEvent) {
    const [x, y] = cv.pos(e);
    const i = Math.floor((y - Y0) / CELL);
    let j = -1;
    if (x >= XI && x < XI + G) j = Math.floor((x - XI) / CELL);
    else if (x >= XO && x < XO + G) j = Math.floor((x - XO) / CELL);
    if (i < 0 || i >= SIZE || j < 0 || j >= SIZE) return;
    if (i === sel.i && j === sel.j) return;
    sel = { i, j };
    paintSum(); draw();
  }
  cv.c.addEventListener('pointermove', pick);
  cv.c.addEventListener('pointerdown', (e) => { cv.c.setPointerCapture(e.pointerId); pick(e); });

  const maxL = h('span', null, '1');
  const sw = (bg: string) => h('span', { class: 'conv-sw', style: `background:${bg}` });
  el.append(
    h('div', { class: 'conv-pic' },
      h('div', { class: 'conv-heads' },
        h('span', { class: 'c-green', style: `left:${pct(XI)}` }, 'Input image'),
        h('span', { class: 'c-yellow', style: `left:${pct(XO)}` }, 'Output')),
      cv.c,
      h('div', { class: 'conv-legends' },
        h('span', { style: `left:${pct(XI)}` }, sw(DARK), 'dark = 0', sw(LIGHT), 'light = 1'),
        h('span', { style: `left:${pct(XO)}` }, 'size of sum: 0', h('span', { class: 'conv-bar', style: `background:linear-gradient(90deg, ${DARK}, ${HOT})` }), maxL))),
    h('div', { class: 'conv-row' },
      h('div', null,
        h('div', { class: 'conv-label' }, 'Filter (click a cell)'),
        h('div', { class: 'conv-filter', role: 'group', 'aria-label': 'Filter, 3 by 3' }, cells),
        h('div', { class: 'btn-row conv-filter-btns' },
          button('Clear filter', () => { token++; filter = ZERO_FILTER.slice(); update(false); }, 'btn small ghost'))),
      h('div', { class: 'conv-sum', 'aria-live': 'polite' },
        h('div', { class: 'conv-label' }, 'Outlined patch: filter cell × pixel, added up'),
        sumLines, sumTotal)),
    h('div', { class: 'viz-readouts' }, vR.el, hR.el),
    h('div', { class: 'viz-caption' },
      'Hover over or tap the image to move the outlined patch. Pixels outside the image count as 0. ' +
      'Each output pixel is the sum for the patch centred on the same spot. ' +
      'Output brightness shows the size of that sum and ignores its sign, so −3 and +3 look the same.'),
  );
  update(true);
  onTheme(draw);

  return {
    async showMe() {
      const my = ++token;
      filter = ZERO_FILTER.slice();
      sel = { i: 7, j: 3 };
      update(true);
      api.feedback('Show me: −1 down the left column of the filter, +1 down the right.');
      for (const k of SHOW_ME_ORDER) {
        await sleep(420);
        if (my !== token) return;
        filter[k] = SHOW_ME_FILTER[k];
        cells[k].classList.add('conv-flash');
        setTimeout(() => cells[k].classList.remove('conv-flash'), 380);
        update(true);
      }
      const s = edgeScores(out);
      api.feedback(`Show me's filter: −1 0 +1 in every row. Left/right edges: **${s.vertical.toFixed(1)}**. Top/bottom edges: **${s.horizontal.toFixed(1)}**. Press Clear filter and build an edge filter yourself.`);
    },
  };
};

export default viz;

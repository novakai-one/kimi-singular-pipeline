// Field 2 — Classic machine learning: which k should you trust?
// Filled dots = training points, hollow dots = test points (held back),
// shading = the colour k-nearest neighbours gives a new point at that spot.
// Pure logic and data live in knn-core.ts (tested in Node).
import { h, s } from '../../lib/dom';
import { colours, makeCanvas, onTheme, readout, segmented, sleep, type Colours, type Viz } from './kit';
import { BEST_KS, DOMAIN, GRID, KS, TEST, TRAIN, gridPredictions, nearest, predict, scoreFor, votes } from './knn-core';
import './knn.css';

const CELL = 9;
const W = GRID.cols * CELL, H = GRID.rows * CELL; // 540 x 351, square cells
const px = (x: number) => ((x - DOMAIN.x0) / (DOMAIN.x1 - DOMAIN.x0)) * W;
const py = (y: number) => ((DOMAIN.y1 - y) / (DOMAIN.y1 - DOMAIN.y0)) * H;
const toData = (X: number, Y: number): [number, number] =>
  [DOMAIN.x0 + (X / W) * (DOMAIN.x1 - DOMAIN.x0), DOMAIN.y1 - (Y / H) * (DOMAIN.y1 - DOMAIN.y0)];

/** True when a colour like "#0d0e12" or "rgb(13, 14, 18)" is dark. */
function isDark(col: string): boolean {
  let r = 255, g = 255, b = 255;
  const hex = col.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    const v = hex[1].length === 3 ? hex[1].split('').map((c) => c + c).join('') : hex[1];
    [r, g, b] = [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16));
  } else {
    const m = col.match(/\d+(\.\d+)?/g);
    if (m && m.length >= 3) [r, g, b] = m.slice(0, 3).map(Number);
  }
  return 0.299 * r + 0.587 * g + 0.114 * b < 128;
}
/** Colour for each class: 0 = blue, 1 = orange. */
const classCols = (c: Colours): [string, string] => [c.search, isDark(c.bg) ? '#d95926' : '#e8743b'];
const NAMES = ['blue', 'orange'];

const viz: Viz = (el, api) => {
  const cv = makeCanvas(W, H, 'Blue and orange points in two interleaved half-moons. The background is shaded with the colour a new point at each spot would get.');
  const grids = new Map<number, Uint8Array>();
  const gridFor = (k: number) => {
    let g = grids.get(k);
    if (!g) { g = gridPredictions(k); grids.set(k, g); }
    return g;
  };
  const wrongs = new Map<number, Set<number>>();
  /** Test points that k-nearest neighbours gives the wrong colour. */
  const wrongFor = (kk: number) => {
    let w = wrongs.get(kk);
    if (!w) { w = new Set(TEST.flatMap((p, i) => (predict(TRAIN, p.x, p.y, kk) !== p.label ? [i] : []))); wrongs.set(kk, w); }
    return w;
  };
  let k = 1;
  let probe: [number, number] | null = null; // a new point placed by the learner (data units)
  let token = 0;
  /** On a narrow screen the canvas shrinks: draw dots bigger so they stay visible (1 on desktop). */
  const boost = () => Math.min(1.4, Math.max(1, W / (cv.c.clientWidth || W)));

  function draw() {
    const c = colours();
    const b = boost();
    const cols = classCols(c);
    const dark = isDark(c.bg);
    const g = cv.g;
    cv.clear();
    const grid = gridFor(k);
    const wrong = wrongFor(k);

    // shading: predicted colour of every cell
    g.globalAlpha = dark ? 0.15 : 0.17;
    for (let r = 0; r < GRID.rows; r++) {
      for (let q = 0; q < GRID.cols; q++) {
        g.fillStyle = cols[grid[r * GRID.cols + q]];
        g.fillRect(q * CELL, r * CELL, CELL, CELL);
      }
    }
    g.globalAlpha = 1;

    // boundary between the two shaded colours
    g.strokeStyle = c.muted; g.globalAlpha = 0.55; g.lineWidth = 1;
    g.beginPath();
    for (let r = 0; r < GRID.rows; r++) {
      for (let q = 0; q < GRID.cols; q++) {
        const i = r * GRID.cols + q;
        if (q + 1 < GRID.cols && grid[i] !== grid[i + 1]) { g.moveTo((q + 1) * CELL, r * CELL); g.lineTo((q + 1) * CELL, (r + 1) * CELL); }
        if (r + 1 < GRID.rows && grid[i] !== grid[i + GRID.cols]) { g.moveTo(q * CELL, (r + 1) * CELL); g.lineTo((q + 1) * CELL, (r + 1) * CELL); }
      }
    }
    g.stroke();
    g.globalAlpha = 1;

    // the learner's new point: lines to its k nearest training points
    let near: number[] = [];
    if (probe) {
      near = nearest(TRAIN, probe[0], probe[1], k);
      const far = TRAIN[near[near.length - 1]];
      const rad = Math.hypot(px(far.x) - px(probe[0]), py(far.y) - py(probe[1]));
      g.strokeStyle = c.text; g.lineWidth = 1;
      g.setLineDash([4, 4]); g.globalAlpha = 0.5;
      g.beginPath(); g.arc(px(probe[0]), py(probe[1]), rad + 6, 0, Math.PI * 2); g.stroke();
      g.setLineDash([]); g.globalAlpha = 0.7; g.lineWidth = 1.4;
      g.beginPath();
      for (const i of near) { g.moveTo(px(probe[0]), py(probe[1])); g.lineTo(px(TRAIN[i].x), py(TRAIN[i].y)); }
      g.stroke();
      g.globalAlpha = 1;
    }

    // training points: filled dots
    for (const p of TRAIN) {
      g.fillStyle = cols[p.label];
      g.beginPath(); g.arc(px(p.x), py(p.y), 4.5 * b, 0, Math.PI * 2); g.fill();
      g.strokeStyle = c.surface; g.lineWidth = 1.2; g.stroke();
    }

    // test points: hollow dots; a cross marks a test point given the wrong colour
    TEST.forEach((p, i) => {
      const X = px(p.x), Y = py(p.y);
      g.fillStyle = c.surface;
      g.beginPath(); g.arc(X, Y, 5.5 * b, 0, Math.PI * 2); g.fill();
      g.strokeStyle = cols[p.label]; g.lineWidth = 2.4 * b; g.stroke();
      if (wrong.has(i)) {
        const d = 3 * b;
        g.strokeStyle = c.text; g.lineWidth = 1.8 * b;
        g.beginPath();
        g.moveTo(X - d, Y - d); g.lineTo(X + d, Y + d);
        g.moveTo(X + d, Y - d); g.lineTo(X - d, Y + d);
        g.stroke();
      }
    });

    // the new point itself: its predicted colour, with a yellow ring (the result)
    if (probe) {
      const X = px(probe[0]), Y = py(probe[1]);
      g.fillStyle = cols[predict(TRAIN, probe[0], probe[1], k)];
      g.beginPath(); g.arc(X, Y, 7.5 * b, 0, Math.PI * 2); g.fill();
      g.strokeStyle = c.yellow; g.lineWidth = 3 * b; g.stroke();
    }

    g.fillStyle = c.text; g.font = `600 ${Math.round(14 * b)}px Inter Variable, system-ui, sans-serif`;
    g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    g.fillText(`k = ${k}`, 10, 10 + 14 * b);
    paintLegend(c);
  }

  // ------------------------------------------------------------------ legend (HTML, coloured at draw time)
  const swBlue = s('circle', { cx: 8, cy: 8, r: 5 });
  const swOrange = s('circle', { cx: 8, cy: 8, r: 5 });
  const swRing = s('circle', { cx: 8, cy: 8, r: 5, 'stroke-width': 2.2 });
  const swCross = s('path', { d: 'M5.2 5.2 L10.8 10.8 M10.8 5.2 L5.2 10.8', 'stroke-width': 1.7, fill: 'none' });
  const swNew = s('circle', { cx: 8, cy: 8, r: 5.5, 'stroke-width': 2.5 });
  const sw = (...kids: SVGElement[]) => s('svg', { width: 16, height: 16, viewBox: '0 0 16 16', 'aria-hidden': 'true' }, ...kids);
  function paintLegend(c: Colours) {
    const cols = classCols(c);
    swBlue.setAttribute('fill', cols[0]);
    swOrange.setAttribute('fill', cols[1]);
    swRing.setAttribute('fill', c.surface); swRing.setAttribute('stroke', cols[0]);
    swCross.setAttribute('stroke', c.text);
    swNew.setAttribute('fill', cols[0]); swNew.setAttribute('stroke', c.yellow);
  }
  const legend = h('div', { class: 'knn-legend' },
    h('span', { class: 'knn-key' }, sw(swBlue), 'Blue'),
    h('span', { class: 'knn-key' }, sw(swOrange), 'Orange'),
    h('span', { class: 'knn-key' }, sw(swRing, swCross), 'Test point given the wrong colour'),
    h('span', { class: 'knn-key' }, sw(swNew), 'New point: click the plot to place one'));

  // ------------------------------------------------------------------ readouts and feedback
  const trR = readout('Training score');
  const teR = readout('Test score');
  const newR = readout('New point');
  const line = (kk: number) => {
    const sc = scoreFor(kk);
    return `k = ${kk}: training ${sc.trainPct}%, test ${sc.testPct}%.`;
  };
  function readouts() {
    const sc = scoreFor(k);
    trR.set(`${sc.trainPct}% (${sc.train} of ${TRAIN.length})`);
    teR.set(`${sc.testPct}% (${sc.test} of ${TEST.length})`);
    if (probe) {
      const v = votes(TRAIN, probe[0], probe[1], k);
      newR.set(`${v[0]} blue, ${v[1]} orange → ${NAMES[v[1] > v[0] ? 1 : 0]}`);
    }
  }

  function choose(kk: number, demo: boolean) {
    k = kk;
    seg.set(kk);
    readouts();
    draw();
    if (demo) { api.feedback(line(kk)); return; }
    if (BEST_KS.includes(kk)) api.win(`${line(kk)} **That is the best test score of the six choices.**`);
    else api.feedback(line(kk));
  }

  const seg = segmented('Neighbours k', KS.map((v) => ({ label: String(v), value: v })), k, (v) => { token++; choose(v, false); });

  // ------------------------------------------------------------------ placing a new point (mouse and touch)
  let dragging = false;
  const place = (e: PointerEvent) => {
    const [X, Y] = cv.pos(e);
    probe = toData(Math.max(0, Math.min(W, X)), Math.max(0, Math.min(H, Y)));
    readouts();
    draw();
  };
  cv.c.addEventListener('pointerdown', (e) => { dragging = true; cv.c.setPointerCapture(e.pointerId); place(e); });
  cv.c.addEventListener('pointermove', (e) => { if (dragging) place(e); });
  const stop = () => { dragging = false; };
  cv.c.addEventListener('pointerup', stop);
  cv.c.addEventListener('pointercancel', stop);
  cv.c.style.cursor = 'crosshair';

  el.append(
    cv.c,
    legend,
    h('div', { class: 'viz-controls' }, seg.el),
    h('div', { class: 'viz-readouts' }, trR.el, teR.el, newR.el),
    h('div', { class: 'viz-caption' }, 'Filled dots: training points. Hollow dots: test points, held back. Shading: the colour a new point at that spot would get.'),
  );
  readouts();
  draw();
  onTheme(draw);
  new ResizeObserver(() => draw()).observe(cv.c);

  return {
    async showMe() {
      const my = ++token;
      for (const kk of KS) {
        choose(kk, true);
        await sleep(700);
        if (my !== token) return;
      }
      const best = BEST_KS[0];
      choose(best, true);
      const one = scoreFor(1);
      api.feedback(`${line(best)} **That is the best test score.** k = 1 scores ${one.trainPct}% on the training points but only ${one.testPct}% on the test points. Now try it yourself.`);
    },
  };
};

export default viz;

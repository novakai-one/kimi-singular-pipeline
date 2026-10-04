// Field 1 — How models learn: one weight, one valley, gradient descent.
// Left: data (green) and the line y = w x (red), with the gaps drawn.
// Right: error E(w) for every w; the yellow ball is the current w.
import { h } from '../../lib/dom';
import { button, colours, makeCanvas, onTheme, readout, segmented, sleep, type Viz } from './kit';

const XS = [0.5, 1, 1.5, 2, 2.5, 3];
const NOISE = [0.12, -0.16, 0.1, 0.14, -0.12, 0.06];
const YS = XS.map((x, i) => 2 * x + NOISE[i]);
const N = XS.length;
const err = (w: number) => XS.reduce((s, x, i) => s + (w * x - YS[i]) ** 2, 0) / N;
const slope = (w: number) => XS.reduce((s, x, i) => s + 2 * x * (w * x - YS[i]), 0) / N;
const START = -1;
const TARGET = 0.05;
const MAX_STEPS = 5;

const viz: Viz = (el, api) => {
  const W = 600, H = 300;
  const cv = makeCanvas(W, H, 'Left: six data points and the model line. Right: the error valley with a ball at the current weight.');
  let w = START, shown = START, steps = 0, eta = 0.05;
  let trail: number[] = [START];
  let animating = false;
  let showValley = false;

  // plot areas
  const L = { x: 40, y: 20, w: 230, h: 240 };      // data plot
  const R = { x: 340, y: 20, w: 240, h: 240 };     // error plot
  const wMin = -1.6, wMax = 4.6, eMax = err(wMin);
  const yLo = -4, yHi = 8;                                    // room below 0, so a negative w still shows its line
  const dx = (x: number) => L.x + (x / 3.5) * L.w;
  const dy = (y: number) => L.y + L.h - ((y - yLo) / (yHi - yLo)) * L.h;
  const ex = (ww: number) => R.x + ((ww - wMin) / (wMax - wMin)) * R.w;
  // square-root scale, so small errors near the bottom are still visible
  const ey = (e: number) => R.y + R.h - Math.sqrt(Math.min(Math.max(e, 0), eMax) / eMax) * R.h;
  // the stretch of w where the error is below the target
  const wStar = XS.reduce((a, x, i) => a + x * YS[i], 0) / XS.reduce((a, x) => a + x * x, 0);
  const curv = XS.reduce((a, x) => a + x * x, 0) / N;
  const half = Math.sqrt(Math.max(0, TARGET - err(wStar)) / curv);

  function draw() {
    const c = colours();
    const g = cv.g;
    cv.clear();
    g.font = '12px Inter Variable, system-ui, sans-serif';
    g.lineWidth = 1;
    // axes
    for (const P of [L, R]) {
      g.strokeStyle = c.border;
      g.beginPath(); g.moveTo(P.x, P.y); g.lineTo(P.x, P.y + P.h); g.lineTo(P.x + P.w, P.y + P.h); g.stroke();
    }
    g.fillStyle = c.muted;
    g.textAlign = 'center';
    g.fillText('x', L.x + L.w / 2, L.y + L.h + 28);
    g.fillText('weight w', R.x + R.w / 2, R.y + R.h + 28);
    g.save(); g.translate(L.x - 26, L.y + L.h / 2); g.rotate(-Math.PI / 2); g.fillText('y', 0, 0); g.restore();
    g.save(); g.translate(R.x - 26, R.y + R.h / 2); g.rotate(-Math.PI / 2); g.fillText('error', 0, 0); g.restore();
    for (const t of [-1, 0, 1, 2, 3, 4]) { g.fillText(String(t), ex(t), R.y + R.h + 14); }
    for (const t of [0, 1, 2, 3]) { g.fillText(String(t), dx(t), L.y + L.h + 14); }
    g.textAlign = 'right';
    for (const t of [-4, 0, 4, 8]) g.fillText(String(t), L.x - 6, dy(t) + 4);
    for (const t of [0, 1, 5, 15, 30]) g.fillText(String(t), R.x - 6, ey(t) + 4);
    g.textAlign = 'center';
    g.strokeStyle = c.border; g.setLineDash([2, 3]);
    g.beginPath(); g.moveTo(L.x, dy(0)); g.lineTo(L.x + L.w, dy(0)); g.stroke();
    g.setLineDash([]);

    // left: gaps, line, points
    g.save();
    g.beginPath(); g.rect(L.x, L.y, L.w, L.h); g.clip();
    g.strokeStyle = c.red; g.globalAlpha = 0.35; g.setLineDash([3, 3]);
    XS.forEach((x, i) => { g.beginPath(); g.moveTo(dx(x), dy(YS[i])); g.lineTo(dx(x), dy(shown * x)); g.stroke(); });
    g.setLineDash([]); g.globalAlpha = 1;
    g.strokeStyle = c.red; g.lineWidth = 2.5;
    g.beginPath(); g.moveTo(dx(0), dy(0)); g.lineTo(dx(3.5), dy(shown * 3.5)); g.stroke();
    g.restore();
    g.fillStyle = c.green;
    XS.forEach((x, i) => { g.beginPath(); g.arc(dx(x), dy(YS[i]), 5, 0, Math.PI * 2); g.fill(); });
    g.fillStyle = c.red; g.textAlign = 'left';
    g.fillText(`y = ${shown.toFixed(2)} x`, L.x + 8, L.y + 14);

    // right: the error. Hidden valley by default: only what gradient descent can know.
    g.fillStyle = c.green; g.globalAlpha = 0.14;
    g.fillRect(R.x, ey(TARGET), R.w, ey(0) - ey(TARGET));          // the goal: error below 0.05
    g.globalAlpha = 1;
    if (showValley) {
      g.strokeStyle = c.muted; g.lineWidth = 2;
      g.beginPath();
      for (let k = 0; k <= 200; k++) {
        const ww = wMin + ((wMax - wMin) * k) / 200;
        const X = ex(ww), Y = ey(err(ww));
        if (k === 0) g.moveTo(X, Y); else g.lineTo(X, Y);
      }
      g.stroke();
      g.fillStyle = c.green; g.globalAlpha = 0.18;
      g.fillRect(ex(wStar - half), R.y, ex(wStar + half) - ex(wStar - half), R.h);
      g.globalAlpha = 1;
    } else {
      g.fillStyle = c.faint; g.textAlign = 'center';
      g.fillText('The valley is hidden: you only know', R.x + R.w / 2 + 20, R.y + R.h * 0.5);
      g.fillText('the error and the slope where you are.', R.x + R.w / 2 + 20, R.y + R.h * 0.5 + 15);
    }
    // trail of past steps (the points you have measured)
    g.fillStyle = c.yellow; g.globalAlpha = 0.5;
    trail.forEach((tw) => { const cw = Math.max(wMin, Math.min(wMax, tw)); g.beginPath(); g.arc(ex(cw), ey(err(cw)), 3.5, 0, Math.PI * 2); g.fill(); });
    g.strokeStyle = c.yellow; g.lineWidth = 1.5; g.globalAlpha = 0.6;
    g.beginPath();
    trail.forEach((tw, k) => {
      const cw = Math.max(wMin, Math.min(wMax, tw));
      if (k === 0) g.moveTo(ex(cw), ey(err(cw))); else g.lineTo(ex(cw), ey(err(cw)));
    });
    g.stroke(); g.globalAlpha = 1;
    // tangent at the ball
    const sw = Math.max(wMin, Math.min(wMax, shown));
    const sl = slope(sw);
    // the slope at the ball, drawn as an arrow pointing downhill (in the direction the next step will move)
    const dirDown = sl > 0 ? -1 : 1;
    const bx = ex(sw), by = ey(err(sw));
    const len = 42;
    g.strokeStyle = c.red; g.fillStyle = c.red; g.lineWidth = 3;
    g.beginPath(); g.moveTo(bx, by); g.lineTo(bx + dirDown * len, by); g.stroke();
    g.beginPath(); g.moveTo(bx + dirDown * (len + 8), by); g.lineTo(bx + dirDown * len, by - 5); g.lineTo(bx + dirDown * len, by + 5); g.fill();
    g.font = '12px Inter Variable, system-ui, sans-serif'; g.textAlign = dirDown > 0 ? 'left' : 'right';
    g.fillText(`slope ${sl.toFixed(1)}`, bx + dirDown * 6, by - 10);
    g.textAlign = 'center';
    // ball
    g.fillStyle = c.yellow;
    g.beginPath(); g.arc(ex(sw), ey(err(sw)), 8, 0, Math.PI * 2); g.fill();
    g.strokeStyle = c.surface; g.lineWidth = 2; g.stroke();
    if (shown < wMin || shown > wMax) {
      g.fillStyle = c.red; g.textAlign = 'center';
      g.fillText('off the chart', ex(sw), R.y + 12);
    }
  }

  const stepsR = readout('Steps taken');
  const wR = readout('w');
  const eR = readout('Error');
  const sR = readout('Slope');
  function readouts() {
    stepsR.set(`${steps} (goal: ${MAX_STEPS} or fewer)`);
    wR.set(w.toFixed(3));
    const e = err(w);
    eR.set(e > 999 ? 'huge' : e.toFixed(3));
    sR.set(slope(w).toFixed(2));
  }

  async function animateTo(nw: number) {
    animating = true;
    const from = shown, t0 = performance.now(), dur = 380;
    await new Promise<void>((res) => {
      const tick = () => {
        const t = Math.min(1, (performance.now() - t0) / dur);
        const e = 1 - (1 - t) ** 3;
        shown = from + (nw - from) * e;
        draw();
        if (t < 1) requestAnimationFrame(tick); else res();
      };
      requestAnimationFrame(tick);
    });
    animating = false;
  }

  async function step(fromShowMe = false) {
    if (animating) return;
    const nw = w - eta * slope(w);
    w = nw; steps++; trail.push(nw);
    readouts();
    await animateTo(nw);
    const e = err(w);
    if (e < TARGET && steps <= MAX_STEPS) {
      if (!fromShowMe) api.win(`Done in ${steps} step${steps > 1 ? 's' : ''} with step size ${eta}: error ${e.toFixed(3)}.`);
      else api.feedback(`Step size ${eta} reaches error ${e.toFixed(3)} in ${steps} steps. Now try it yourself.`);
    } else if (steps >= MAX_STEPS && !fromShowMe) {
      api.feedback(`${steps} steps used and the error is ${e > 999 ? 'huge' : e.toFixed(3)}. Press Reset and try another step size.`);
    } else if (!fromShowMe) {
      api.feedback(`Step ${steps}: error ${e > 999 ? 'huge' : e.toFixed(3)}.`);
    }
  }

  function reset() {
    w = START; shown = START; steps = 0; trail = [START];
    readouts(); draw();
  }

  const seg = segmented('Step size', [0.01, 0.05, 0.1, 0.2, 0.3].map((v) => ({ label: String(v), value: v })), eta, (v) => { eta = v; });
  el.append(
    cv.c,
    h('div', { class: 'viz-controls' },
      seg.el,
      h('div', { class: 'btn-row' }, button('Take a step', () => step(), 'btn small primary'), button('Reset', reset),
        (() => { const b = button('Show the whole valley', () => { showValley = !showValley; b.textContent = showValley ? 'Hide the valley' : 'Show the whole valley'; draw(); }, 'btn small ghost'); return b; })())),
    h('div', { class: 'viz-readouts' }, stepsR.el, wR.el, eR.el, sR.el),
    h('div', { class: 'viz-caption' }, 'Green band: error below 0.05 (the goal). Red arrow: the downhill direction at the ball, and its slope. Error is on a square-root scale so small values show.'),
  );
  readouts();
  draw();
  onTheme(draw);

  return {
    async showMe() {
      reset();
      eta = 0.1; seg.set(0.1);
      for (let k = 0; k < 3; k++) { await sleep(250); await step(true); }
    },
  };
};

export default viz;

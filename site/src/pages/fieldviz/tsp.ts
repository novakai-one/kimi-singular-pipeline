// Field 9 — Optimisation: find a short round trip through 8 stops.
// The learner clicks stops in order; the trip closes itself after the 8th.
// Show me runs simulated annealing (reverse one section of the trip per move) from a tangled trip.
// Pure logic lives in tsp-core.ts (tested in Node).
import { h } from '../../lib/dom';
import { button, colours, makeCanvas, onTheme, readout, type Viz } from './kit';
import { ANNEAL_DEFAULTS, BEST, DEMO_SEEDS, MAP, STOPS, fmt, isWin, makeAnnealer, pathLength, percentOver, tripLength, type Annealer } from './tsp-core';

const R_STOP = 13;
/** Show me lasts about this long: one move per frame at 60 frames a second. */
const DURATION = 5000;
const CH = 112; // chart height

const pct = (p: number) => (p < 10 ? p.toFixed(1) : String(Math.round(p))) + '%';

const viz: Viz = (el, api) => {
  const map = makeCanvas(MAP.w, MAP.h, 'A map with 8 stops. Click them in order to build a round trip.');
  const chart = makeCanvas(MAP.w, CH, 'Line chart: the trip length after each move Show me tries.');
  let trip: number[] = [];
  let A: Annealer | null = null; // the Show me run on screen
  let hover = -1;
  let token = 0;
  let runs = 0;
  const N = STOPS.length;
  const complete = () => trip.length === N;
  /** On a narrow screen the canvases shrink: draw stops, lines and labels bigger (1 on desktop). */
  const boost = (max: number) => Math.min(max, Math.max(1, MAP.w / (map.c.clientWidth || MAP.w)));

  // ------------------------------------------------------------------ map
  function draw() {
    const c = colours();
    const g = map.g;
    const b = boost(1.6), R = R_STOP * b;
    map.clear();
    const order = A ? A.order : trip;
    const closed = A ? true : complete();
    const finished = A ? A.done : complete();

    // the trip: red while it is being built or changed, yellow once it is a finished result
    if (order.length > 1) {
      g.strokeStyle = finished ? c.yellow : c.red;
      g.lineWidth = 3.5 * b; g.lineJoin = 'round'; g.lineCap = 'round';
      g.beginPath();
      order.forEach((i, k) => (k === 0 ? g.moveTo(...STOPS[i]) : g.lineTo(...STOPS[i])));
      if (closed) g.closePath();
      g.stroke();
    }
    // while building: the leg that will close the trip, and a preview to the stop under the pointer
    if (!A && !closed && trip.length > 1) {
      g.strokeStyle = c.muted; g.lineWidth = 1.5 * b; g.setLineDash([5 * b, 5 * b]);
      g.beginPath(); g.moveTo(...STOPS[trip[trip.length - 1]]); g.lineTo(...STOPS[trip[0]]); g.stroke();
      g.setLineDash([]);
    }
    if (!A && !closed && trip.length > 0 && hover >= 0 && !trip.includes(hover)) {
      g.strokeStyle = c.red; g.globalAlpha = 0.45; g.lineWidth = 3 * b; g.setLineDash([6 * b, 5 * b]);
      g.beginPath(); g.moveTo(...STOPS[trip[trip.length - 1]]); g.lineTo(...STOPS[hover]); g.stroke();
      g.setLineDash([]); g.globalAlpha = 1;
    }

    // stops (green = the data). Visited stops show their place in the trip.
    g.font = `700 ${Math.round(13 * b)}px Inter Variable, system-ui, sans-serif`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    STOPS.forEach((p, i) => {
      if (!A && (i === hover || (trip[0] === i))) {
        g.strokeStyle = i === trip[0] ? c.text : c.muted; g.lineWidth = 2 * b;
        g.beginPath(); g.arc(p[0], p[1], R + 5 * b, 0, Math.PI * 2); g.stroke();
      }
      g.fillStyle = c.green;
      g.beginPath(); g.arc(p[0], p[1], R, 0, Math.PI * 2); g.fill();
      g.strokeStyle = c.surface; g.lineWidth = 2 * b; g.stroke();
      const at = A ? -1 : trip.indexOf(i);
      if (at >= 0) { g.fillStyle = c.surface; g.fillText(String(at + 1), p[0], p[1] + 0.5); }
    });
    g.textBaseline = 'alphabetic';
  }

  // ------------------------------------------------------------------ chart: length after each move
  function drawChart() {
    const c = colours();
    const g = chart.g;
    const b = boost(1.4), fs = Math.round(12 * b);
    chart.clear();
    const L = 8, R = MAP.w - 8, T = 8 + fs, B = CH - 10 - fs;
    g.strokeStyle = c.border; g.lineWidth = 1;
    g.beginPath(); g.moveTo(L, T - 6); g.lineTo(L, B); g.lineTo(R, B); g.stroke();
    g.font = `${fs}px Inter Variable, system-ui, sans-serif`;
    g.fillStyle = c.muted; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    g.fillText('Trip length', L + 6, fs + 1);
    g.textAlign = 'right';
    g.fillText('moves tried →', R, CH - 5);
    if (!A) {
      g.fillStyle = c.faint; g.textAlign = 'center';
      g.font = `${Math.round(13 * b)}px Inter Variable, system-ui, sans-serif`;
      g.fillText('Show me draws the trip length here, move by move.', (L + R) / 2, (T + B) / 2 + 4);
      return;
    }
    const hist = A.history;
    const top = Math.max(...hist) * 1.02, bot = BEST.length * 0.94;
    const X = (i: number) => L + 2 + ((R - L - 2) * i) / ANNEAL_DEFAULTS.steps;
    const Y = (v: number) => B - ((v - bot) / (top - bot)) * (B - T);
    // the shortest possible length
    g.strokeStyle = c.muted; g.setLineDash([4, 4]); g.lineWidth = 1;
    g.beginPath(); g.moveTo(L, Y(BEST.length)); g.lineTo(R, Y(BEST.length)); g.stroke();
    g.setLineDash([]);
    g.fillStyle = c.muted; g.textAlign = 'right';
    g.fillText(`shortest ${fmt(BEST.length)}`, R, Y(BEST.length) - 5);
    // length so far (yellow = the result)
    g.strokeStyle = c.yellow; g.lineWidth = 2 * b; g.lineJoin = 'round';
    g.beginPath();
    hist.forEach((v, i) => (i === 0 ? g.moveTo(X(i), Y(v)) : g.lineTo(X(i), Y(v))));
    g.stroke();
    g.fillStyle = c.yellow;
    g.beginPath(); g.arc(X(hist.length - 1), Y(hist[hist.length - 1]), 3.5 * b, 0, Math.PI * 2); g.fill();
  }

  // ------------------------------------------------------------------ readouts
  const lenR = readout('Trip length');
  const bestR = readout('Shortest possible', fmt(BEST.length));
  const tR = readout('Temperature');
  const keptR = readout('Longer trips kept');
  function readouts() {
    if (A) {
      lenR.set(fmt(A.length));
      tR.set(A.T < 10 ? A.T.toFixed(1) : A.T.toFixed(0));
      keptR.set(String(A.keptWorse));
      return;
    }
    lenR.set(trip.length < 2 ? '–' : fmt(complete() ? tripLength(trip) : pathLength(trip)));
    tR.set('–');
    keptR.set('–');
  }

  function judge() {
    const len = tripLength(trip);
    const p = percentOver(len);
    const msg = p < 0.05
      ? `Your trip: ${fmt(len)}. **That is the shortest possible.**`
      : `Your trip: ${fmt(len)} (${pct(p)} longer than the shortest).`;
    if (isWin(len)) api.win(p < 0.05 ? msg : `${msg} **Within 5%.**`);
    else api.feedback(`${msg} Press Undo to change the last few stops, or Clear to start again.`);
  }

  function update() {
    readouts();
    draw();
    if (complete() && !A) judge();
  }

  /** Stop the Show me run (if any) and go back to the learner's own trip. */
  function stopDemo() {
    if (!A) return;
    token++;
    A = null;
    trip = [];
    drawChart();
  }

  // ------------------------------------------------------------------ clicking stops (mouse and touch)
  /** The stop under the pointer. The target is at least 48 CSS pixels wide on any screen. */
  const stopAt = (e: PointerEvent) => {
    const [x, y] = map.pos(e);
    const r = map.c.getBoundingClientRect();
    const reach = Math.max(R_STOP * boost(1.6) + 6, 24 * (MAP.w / r.width));
    let best = -1, bd = Infinity;
    STOPS.forEach((p, i) => {
      const d = Math.hypot(p[0] - x, p[1] - y);
      if (d < reach && d < bd) { bd = d; best = i; }
    });
    return best;
  };
  map.c.addEventListener('pointerdown', (e) => {
    const i = stopAt(e);
    if (i < 0) return;
    stopDemo();
    if (complete()) {
      api.feedback('Your trip already visits every stop. Press Undo to change the last few stops, or Clear to start again.');
      return;
    }
    if (trip.includes(i)) {
      api.feedback('That stop is already in your trip. Pick a stop without a number.');
      return;
    }
    trip.push(i);
    if (!complete()) api.feedback(`${trip.length} of ${N} stops.`);
    update();
  });
  map.c.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    const i = stopAt(e);
    map.c.style.cursor = i >= 0 ? 'pointer' : 'default';
    if (i !== hover) { hover = i; draw(); }
  });
  map.c.addEventListener('pointerleave', () => { if (hover !== -1) { hover = -1; draw(); } });

  const undo = () => {
    if (A) { stopDemo(); api.feedback(''); update(); return; }
    trip.pop();
    api.feedback(trip.length ? `${trip.length} of ${N} stops.` : '');
    update();
  };
  const clearTrip = () => {
    stopDemo();
    trip = [];
    api.feedback('');
    update();
  };

  el.append(
    map.c,
    h('div', { style: 'margin-top:10px' }, chart.c),
    h('div', { class: 'viz-controls' },
      h('div', { class: 'btn-row' }, button('Undo', undo), button('Clear', clearTrip, 'btn small ghost'))),
    h('div', { class: 'viz-readouts' }, lenR.el, bestR.el, tR.el, keptR.el),
    h('div', { class: 'viz-caption' }, 'Click the stops in the order you would visit them. After the 8th stop the trip returns to the first. The ringed stop is where your trip starts.'),
  );
  readouts();
  draw();
  drawChart();
  onTheme(() => { draw(); drawChart(); });
  new ResizeObserver(() => { draw(); drawChart(); }).observe(map.c);

  return {
    async showMe() {
      const my = ++token;
      trip = []; hover = -1;
      const run = makeAnnealer(1 + (runs++ % DEMO_SEEDS));
      A = run;
      api.feedback('Starting from a random, tangled trip.');
      const per = DURATION / ANNEAL_DEFAULTS.steps;
      const t0 = performance.now();
      await new Promise<void>((res) => {
        const tick = () => {
          if (my !== token) return res();
          const due = Math.min(ANNEAL_DEFAULTS.steps, Math.floor((performance.now() - t0) / per) + 1);
          while (run.tried < due && !run.done) run.step();
          readouts(); draw(); drawChart();
          if (run.done) res(); else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
      if (my !== token) return;
      const half = Math.floor(ANNEAL_DEFAULTS.steps / 2);
      let early = 0;
      for (let i = 1; i <= half; i++) if (run.history[i] > run.history[i - 1] + 1e-9) early++;
      const p = percentOver(run.length);
      const reached = p < 0.05 ? `${fmt(run.length)}, **the shortest possible**` : `${fmt(run.length)} (${pct(p)} longer than the shortest)`;
      const kept = run.keptWorse === 1 ? '1 longer trip' : `${run.keptWorse} longer trips`;
      api.feedback(`Show me reached ${reached}. On the way it kept ${kept}, ${early} of them in the first half. Now build a trip yourself.`);
    },
  };
};

export default viz;

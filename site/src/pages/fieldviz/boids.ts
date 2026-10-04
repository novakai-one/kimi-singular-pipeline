// Field 7 — Swarms and many agents: make the birds flock.
// 70 birds in a 560 x 360 box that wraps at the edges. Each bird sees only the birds within RADIUS px.
// Three sliders weight the rules (separation, alignment, cohesion).
// The order score (yellow arrow, number and graph) is the length of the birds' average direction arrow.
// Pure simulation lives in boids-core.ts (tested in Node).
import { h } from '../../lib/dom';
import { button, colours, makeCanvas, onTheme, type Viz } from './kit';
import {
  averageDirection, DEFAULTS, H, holdTimer, neighbours, RADIUS, scatter, SHOW_ME, step, TICK_HZ, W,
  WIN_HOLD, WIN_SCORE, type Weights,
} from './boids-core';
import './boids.css';

/** Order-score history: one sample every 6 ticks, 6 seconds kept. */
const SAMPLE_EVERY = 6;
const HISTORY = (6 * TICK_HZ) / SAMPLE_EVERY;
/** The bird whose view is drawn. */
const WATCHED = 0;

const viz: Viz = (el, api) => {
  const cv = makeCanvas(W, H, 'Seventy birds drawn as small triangles in a box. One teal bird shows the circle of birds it can see.');
  const compass = makeCanvas(56, 56, 'The birds\' average direction as a yellow arrow. Its length is the order score.');
  compass.c.classList.add('boids-compass');
  const spark = makeCanvas(340, 56, 'Graph of the order score over the last 6 seconds.');

  let seed = 1;
  let flock = scatter(seed);
  const w: Weights = { ...DEFAULTS };
  /** True while the sliders hold Show me's settings (a win then does not count). */
  let demo = false;
  let won = false;
  let paused = false, visible = true;
  let ticks = 0;
  const hold = holdTimer();
  let history: number[] = [];
  let avg = averageDirection(flock);

  // ---------------------------------------------------------------- drawing
  function bird(g: CanvasRenderingContext2D, x: number, y: number, vx: number, vy: number, size: number) {
    const l = Math.hypot(vx, vy) || 1, ux = vx / l, uy = vy / l;
    g.beginPath();
    g.moveTo(x + ux * 7.5 * size, y + uy * 7.5 * size);
    g.lineTo(x - ux * 5 * size - uy * 4 * size, y - uy * 5 * size + ux * 4 * size);
    g.lineTo(x - ux * 5 * size + uy * 4 * size, y - uy * 5 * size - ux * 4 * size);
    g.closePath();
    g.fill();
  }

  function draw() {
    const c = colours();
    const g = cv.g;
    cv.clear();
    g.fillStyle = c.surface2;
    g.fillRect(0, 0, W, H);

    // the watched bird's view: circle (drawn on both sides of an edge) and lines to the birds it sees
    const wx = flock.x[WATCHED], wy = flock.y[WATCHED];
    const seen = neighbours(flock, WATCHED);
    g.strokeStyle = c.act; g.lineWidth = 1.2;
    for (const ox of [-W, 0, W]) {
      for (const oy of [-H, 0, H]) {
        const cx = wx + ox, cy = wy + oy;
        if (cx < -RADIUS || cx > W + RADIUS || cy < -RADIUS || cy > H + RADIUS) continue;
        g.globalAlpha = 0.08; g.fillStyle = c.act;
        g.beginPath(); g.arc(cx, cy, RADIUS, 0, Math.PI * 2); g.fill();
        g.globalAlpha = 0.7; g.setLineDash([4, 4]);
        g.stroke();
        g.setLineDash([]);
      }
    }
    g.globalAlpha = 0.45;
    for (const j of seen) {
      let dx = flock.x[j] - wx, dy = flock.y[j] - wy;
      if (dx > W / 2) dx -= W; else if (dx < -W / 2) dx += W;
      if (dy > H / 2) dy -= H; else if (dy < -H / 2) dy += H;
      g.beginPath(); g.moveTo(wx, wy); g.lineTo(wx + dx, wy + dy); g.stroke();
    }
    g.globalAlpha = 1;

    // every bird
    g.fillStyle = c.text;
    g.globalAlpha = 0.8;
    for (let i = 0; i < flock.n; i++) {
      if (i === WATCHED) continue;
      bird(g, flock.x[i], flock.y[i], flock.vx[i], flock.vy[i], 1);
    }
    g.globalAlpha = 1;
    g.fillStyle = c.act;
    bird(g, wx, wy, flock.vx[WATCHED], flock.vy[WATCHED], 1.35);

    drawCompass(c);
    drawSpark(c);
  }

  function drawCompass(c: ReturnType<typeof colours>) {
    const g = compass.g, R = 24, cx = 28, cy = 28;
    compass.clear();
    g.strokeStyle = c.border; g.lineWidth = 1.5;
    g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.stroke();
    const len = avg.len * R;
    g.fillStyle = c.yellow; g.strokeStyle = c.yellow; g.lineWidth = 3; g.lineCap = 'round';
    if (len > 3) {
      const ux = avg.x / avg.len, uy = avg.y / avg.len;
      const tx = cx + ux * len, ty = cy + uy * len;
      g.beginPath(); g.moveTo(cx, cy); g.lineTo(tx - ux * 4, ty - uy * 4); g.stroke();
      g.beginPath();
      g.moveTo(tx, ty);
      g.lineTo(tx - ux * 8 - uy * 5, ty - uy * 8 + ux * 5);
      g.lineTo(tx - ux * 8 + uy * 5, ty - uy * 8 - ux * 5);
      g.closePath(); g.fill();
    }
    g.beginPath(); g.arc(cx, cy, 2.5, 0, Math.PI * 2); g.fill();
  }

  function drawSpark(c: ReturnType<typeof colours>) {
    const g = spark.g, SW = spark.w, SH = spark.h, top = 4, bot = SH - 4;
    const y = (v: number) => bot - v * (bot - top);
    spark.clear();
    g.fillStyle = c.green; g.globalAlpha = 0.14;
    g.fillRect(0, y(1), SW, y(WIN_SCORE) - y(1));
    g.globalAlpha = 1;
    g.strokeStyle = c.green; g.lineWidth = 1; g.setLineDash([4, 3]);
    g.beginPath(); g.moveTo(0, y(WIN_SCORE)); g.lineTo(SW, y(WIN_SCORE)); g.stroke();
    g.setLineDash([]);
    g.strokeStyle = c.border;
    g.beginPath(); g.moveTo(0, y(0)); g.lineTo(SW, y(0)); g.stroke();
    if (history.length > 1) {
      g.strokeStyle = c.yellow; g.lineWidth = 2.2; g.lineJoin = 'round';
      g.beginPath();
      history.forEach((v, k) => {
        const x = SW - ((history.length - 1 - k) / (HISTORY - 1)) * SW;
        if (k === 0) g.moveTo(x, y(v)); else g.lineTo(x, y(v));
      });
      g.stroke();
    }
  }

  // ---------------------------------------------------------------- readouts and feedback
  const scoreV = h('div', { class: 'boids-score-v' }, '0.00');
  const heldV = h('div', { class: 'boids-score-held' }, '');
  function readouts() {
    scoreV.textContent = avg.len.toFixed(2);
    heldV.textContent = hold.held > 0 ? `above ${WIN_SCORE} for ${Math.min(hold.held, WIN_HOLD).toFixed(1)} s` : `below ${WIN_SCORE}`;
  }

  function feedback() {
    const s = avg.len.toFixed(2);
    if (demo) {
      if (hold.won) api.feedback(`Show me held the order score above ${WIN_SCORE} for ${WIN_HOLD} seconds with alignment ${SHOW_ME.align}. Now set the sliders yourself.`);
      else api.feedback(`Show me: alignment ${SHOW_ME.align}, separation and cohesion ${SHOW_ME.sep}. Order score **${s}**.`);
      return;
    }
    if (won) return;
    if (hold.held > 0) api.feedback(`Order score **${s}**. Held above ${WIN_SCORE} for ${hold.held.toFixed(1)} of ${WIN_HOLD} seconds.`);
    else api.feedback(`Order score **${s}**. Hold it above ${WIN_SCORE} for ${WIN_HOLD} seconds.`);
  }

  // ---------------------------------------------------------------- simulation loop
  function tick() {
    step(flock, w);
    ticks++;
    avg = averageDirection(flock);
    hold.add(avg.len, 1 / TICK_HZ);
    if (ticks % SAMPLE_EVERY === 0) {
      history.push(avg.len);
      if (history.length > HISTORY) history.shift();
    }
    if (hold.won && !demo && !won) {
      won = true;
      api.win(`Done: the order score stayed above ${WIN_SCORE} for ${WIN_HOLD} seconds with separation ${w.sep.toFixed(1)}, alignment ${w.align.toFixed(1)}, cohesion ${w.coh.toFixed(1)}.`);
    }
    if (ticks % 15 === 0) { feedback(); readouts(); }
  }

  let raf = 0, last = 0, acc = 0;
  const running = () => visible && !paused;
  function frame(now: number) {
    raf = 0;
    if (!running()) return;
    acc += Math.min(0.1, (now - last) / 1000);
    last = now;
    let n = 0;
    while (acc >= 1 / TICK_HZ && n < 6) { tick(); acc -= 1 / TICK_HZ; n++; }
    if (n === 6) acc = 0;
    draw();
    raf = requestAnimationFrame(frame);
  }
  function start() {
    if (raf || !running()) return;
    last = performance.now(); acc = 0;
    raf = requestAnimationFrame(frame);
  }
  new IntersectionObserver((entries) => {
    visible = entries.some((e) => e.isIntersecting);
    start();
  }).observe(cv.c);

  // ---------------------------------------------------------------- controls
  let showToken = 0;
  function slider(label: string, key: keyof Weights) {
    const input = h('input', { type: 'range', min: '0', max: '2', step: '0.1', value: String(w[key]) });
    const out = h('output', null, w[key].toFixed(1));
    input.addEventListener('input', () => {
      showToken++;
      demo = false;
      w[key] = Number(input.value);
      out.textContent = w[key].toFixed(1);
      feedback();
    });
    const row = h('label', { class: 'field-row' }, h('span', null, label), input, out);
    return {
      row,
      set(v: number) { w[key] = v; input.value = String(v); out.textContent = v.toFixed(1); },
    };
  }
  const sSep = slider('Separation', 'sep');
  const sAlign = slider('Alignment', 'align');
  const sCoh = slider('Cohesion', 'coh');

  const pauseBtn = button('Pause', () => {
    paused = !paused;
    pauseBtn.textContent = paused ? 'Play' : 'Pause';
    start();
  });
  function doScatter() {
    seed++;
    flock = scatter(seed);
    hold.reset();
    history = [];
    avg = averageDirection(flock);
    readouts(); feedback(); draw();
  }

  el.append(
    cv.c,
    h('div', { class: 'boids-order' },
      compass.c,
      h('div', { class: 'boids-score' }, h('div', { class: 'boids-score-l' }, 'Order score'), scoreV, heldV),
      h('div', { class: 'boids-spark' }, spark.c, h('div', { class: 'boids-spark-hint' }, 'Last 6 seconds. Shaded: 0.9 and above.'))),
    h('div', { class: 'viz-controls' },
      h('div', { class: 'boids-sliders' }, sSep.row, sAlign.row, sCoh.row),
      h('div', { class: 'btn-row' }, button('Scatter', doScatter), pauseBtn)),
    h('div', { class: 'viz-caption' },
      `The teal bird sees only the birds inside its circle (${RADIUS} px). Every bird works the same way. ` +
      'Each bird also turns a little at random. Birds that leave one edge come back on the opposite edge. ' +
      'Yellow arrow: the birds\' average direction. Its length is the order score.'),
  );
  readouts();
  draw();
  feedback();
  onTheme(draw);
  start();

  return {
    async showMe() {
      const my = ++showToken;
      demo = true;
      hold.reset();
      if (paused) { paused = false; pauseBtn.textContent = 'Pause'; start(); }
      feedback();
      const from = { ...w }, t0 = performance.now(), dur = 1200;
      await new Promise<void>((res) => {
        const anim = () => {
          if (my !== showToken) return res();
          const t = Math.min(1, (performance.now() - t0) / dur);
          const e = t < 0.5 ? 2 * t * t : 1 - (2 - 2 * t) ** 2 / 2;
          sSep.set(from.sep + (SHOW_ME.sep - from.sep) * e);
          sAlign.set(from.align + (SHOW_ME.align - from.align) * e);
          sCoh.set(from.coh + (SHOW_ME.coh - from.coh) * e);
          if (t < 1) requestAnimationFrame(anim); else res();
        };
        requestAnimationFrame(anim);
      });
    },
  };
};

export default viz;

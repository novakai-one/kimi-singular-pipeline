// Field 10 — Generative models: turn noise into a spiral.
// Green: the 400 original points. "Add noise" runs the forward process over 50 steps.
// Yellow: 300 new points that start as Gaussian noise and are denoised in 2 to 50 steps.
// The denoiser is exact (a weighted average of 2,000 points along the spiral curve).
// Pure maths lives in diffusion-core.ts (tested in Node).
import { h } from '../../lib/dom';
import { button, colours, makeCanvas, onTheme, readout, segmented, sleep, type Viz } from './kit';
import {
  addNoise, curvePoints, ddimStep, distToCurve, MAX_WIN_STEPS, N_GEN, N_SHOWN, noise, ON_SPIRAL, SHOW_ME_STEPS,
  SHOWN, STEP_CHOICES, T, timesFor, WIN_QUALITY,
} from './diffusion-core';
import './diffusion.css';

type Mode = 'data' | 'noise' | 'gen';

const viz: Viz = (el, api) => {
  const W = 560, H = 420, S = 74;
  const cx = W / 2, cy = H / 2;
  const cv = makeCanvas(W, H, 'A spiral of green points. New yellow points move from a random cloud onto the spiral.');
  const X = (x: number) => cx + x * S;
  const Y = (y: number) => cy - y * S;
  const CURVE = curvePoints(500);

  let mode: Mode = 'data';
  let dataPts: Float64Array = SHOWN;
  let genPts: Float64Array | null = null;
  let offSpiral: Uint8Array | null = null;
  let steps = 2;
  let seed = 1;
  let token = 0;
  let won = false;

  const stepLabel = h('div', { class: 'diffusion-step' }, '');

  function dot(g: CanvasRenderingContext2D, x: number, y: number, r: number) {
    g.beginPath(); g.arc(X(x), Y(y), r, 0, Math.PI * 2); g.fill();
  }

  function draw() {
    const c = colours();
    const g = cv.g;
    cv.clear();
    if (mode === 'gen') {
      // the band that counts as "on the spiral"
      g.strokeStyle = c.green; g.globalAlpha = 0.13;
      g.lineWidth = 2 * ON_SPIRAL * S; g.lineCap = 'round'; g.lineJoin = 'round';
      g.beginPath();
      for (let i = 0; i < CURVE.length; i += 2) {
        if (i === 0) g.moveTo(X(CURVE[i]), Y(CURVE[i + 1])); else g.lineTo(X(CURVE[i]), Y(CURVE[i + 1]));
      }
      g.stroke();
      g.globalAlpha = 0.6; g.fillStyle = c.green;
      for (let i = 0; i < SHOWN.length; i += 2) dot(g, SHOWN[i], SHOWN[i + 1], 2);
      g.globalAlpha = 1;
      if (genPts) {
        g.fillStyle = c.yellow; g.strokeStyle = c.yellow; g.lineWidth = 1.5;
        for (let i = 0; i < genPts.length; i += 2) {
          if (offSpiral && offSpiral[i / 2]) {
            g.beginPath(); g.arc(X(genPts[i]), Y(genPts[i + 1]), 3.2, 0, Math.PI * 2); g.stroke();
          } else dot(g, genPts[i], genPts[i + 1], 2.4);
        }
      }
    } else {
      g.fillStyle = c.green;
      for (let i = 0; i < dataPts.length; i += 2) dot(g, dataPts[i], dataPts[i + 1], 2.6);
    }
  }

  const usedR = readout('Steps used');
  const qualR = readout('Quality');

  // ---------------------------------------------------------------- forward process
  async function runNoise() {
    const my = ++token;
    mode = 'noise';
    usedR.set('–'); qualR.set('–');
    const eps = noise(N_SHOWN, 500 + seed++);
    const per = 110;
    const t0 = performance.now();
    await new Promise<void>((res) => {
      const tick = () => {
        if (my !== token) return res();
        const t = Math.min(T, (performance.now() - t0) / per);
        dataPts = addNoise(SHOWN, eps, t);
        stepLabel.textContent = `step ${Math.floor(t)} of ${T}`;
        draw();
        if (t < T) requestAnimationFrame(tick); else res();
      };
      requestAnimationFrame(tick);
    });
  }

  // ---------------------------------------------------------------- generation
  async function runGenerate(k: number, demo: boolean) {
    const my = ++token;
    mode = 'gen';
    offSpiral = null;
    let cur = noise(N_GEN, 1000 + seed++);
    genPts = cur;
    usedR.set(String(k));
    qualR.set('…');
    stepLabel.textContent = `denoising step 0 of ${k}`;
    draw();
    await sleep(400);
    const times = timesFor(k);
    const per = k <= 5 ? 250 : k <= 10 ? 200 : k <= 25 ? 100 : 60;
    for (let j = 0; j < k; j++) {
      if (my !== token) return;
      const next = ddimStep(cur, times[j], times[j + 1]);
      const from = cur, t0 = performance.now();
      stepLabel.textContent = `denoising step ${j + 1} of ${k}`;
      await new Promise<void>((res) => {
        const tick = () => {
          if (my !== token) return res();
          const t = Math.min(1, (performance.now() - t0) / per);
          const e = t < 0.5 ? 2 * t * t : 1 - (2 - 2 * t) ** 2 / 2;
          const p = new Float64Array(from.length);
          for (let i = 0; i < p.length; i++) p[i] = from[i] + (next[i] - from[i]) * e;
          genPts = p;
          draw();
          if (t < 1) requestAnimationFrame(tick); else res();
        };
        requestAnimationFrame(tick);
      });
      cur = next;
    }
    if (my !== token) return;
    genPts = cur;
    offSpiral = new Uint8Array(N_GEN);
    let on = 0;
    for (let i = 0; i < N_GEN; i++) {
      const off = distToCurve(cur[2 * i], cur[2 * i + 1]) > ON_SPIRAL;
      offSpiral[i] = off ? 1 : 0;
      if (!off) on++;
    }
    const q = on / N_GEN;
    const pct = Math.round(q * 100);
    qualR.set(`${pct}%`);
    draw();
    const s = `${k} step${k > 1 ? 's' : ''}`;
    if (demo) {
      api.feedback(`Show me: ${s}, quality ${pct}%. Now pick a number of steps and press **Generate** yourself.`);
    } else if (q >= WIN_QUALITY && k <= MAX_WIN_STEPS) {
      won = true;
      api.win(`Done: ${s} gave quality ${pct}%. The new points sit on the spiral, between the green original points.`);
    } else if (won) {
      api.feedback(`${s}: quality ${pct}%.`);
    } else if (k > MAX_WIN_STEPS) {
      api.feedback(`${s}: quality ${pct}%. Now reach 90% with ${MAX_WIN_STEPS} steps or fewer.`);
    } else {
      api.feedback(`${s}: quality ${pct}%. The jumps are large, so ${q < 0.5 ? 'most' : 'some'} points land off the spiral. Try more steps.`);
    }
  }

  const seg = segmented('Denoising steps', STEP_CHOICES.map((v) => ({ label: String(v), value: v })), steps, (v) => { steps = v; });
  const stage = h('div', { class: 'diffusion-stage' }, cv.c, stepLabel);
  el.append(
    stage,
    h('div', { class: 'viz-controls' },
      seg.el,
      h('div', { class: 'btn-row' },
        button('Generate', () => runGenerate(steps, false), 'btn small primary'),
        button('Add noise', () => runNoise()))),
    h('div', { class: 'viz-readouts' }, usedR.el, qualR.el),
    h('div', { class: 'viz-caption' },
      `Green: the ${N_SHOWN} original points. Yellow: ${N_GEN} new points. ` +
      'Shaded band: counts as on the spiral. A hollow yellow point landed off it.'),
  );
  stepLabel.textContent = `${N_SHOWN} original points`;
  draw();
  onTheme(draw);

  return {
    showMe() {
      steps = SHOW_ME_STEPS;
      seg.set(SHOW_ME_STEPS);
      runGenerate(SHOW_ME_STEPS, true);
    },
  };
};

export default viz;

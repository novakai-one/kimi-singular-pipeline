// Field 4 — Looking inside models: find the "round" direction.
// Top: each test digit as a dot (its 64 inside numbers projected to 2-D) and a red arrow you turn.
// Bottom: the strip, the arrow's line laid flat; each dot's shadow (dot product with the unit arrow) lands on it.
// Pure logic lives in probe-core.ts (tested in Node).
import { h } from '../../lib/dom';
import { url } from '../../lib/config';
import { button, colours, makeCanvas, onTheme, readout, type Colours, type Viz } from './kit';
import { labels, norm360, scoreAt, shadows, shortTurn, START_DEG, STEP_DEG, TARGET, unit, type ProbeData } from './probe-core';

// geometry (logical px)
const W = 520, R = 180, CX = W / 2, CY = 12 + R;      // plot: data radius 1 = R px
const ARROW = 0.7;                                    // arrow length, in data units
const SY = CY + R + 52;                               // the strip's line
const H = SY + 30;
const HIT = 28;                                       // tip grab radius (56 logical px across)

const isDark = (c: Colours) => {
  const m = c.bg.replace('#', '');
  const n = parseInt(m.length === 3 ? m.split('').map((x) => x + x).join('') : m.slice(0, 6), 16);
  return !Number.isNaN(n) && ((n >> 16) & 255) + ((n >> 8) & 255) + (n & 255) < 330;
};
const roundCol = (c: Colours) => (isDark(c) ? '#f5b631' : '#d99400');

const viz: Viz = (el, api) => {
  const root = h('div', { class: 'probe' });
  el.append(root);
  root.append(h('div', { class: 'c-muted', style: 'padding:40px;text-align:center' }, 'Loading the digit points…'));
  let handle: { showMe(): Promise<void> } | null = null;
  const ready = fetch(url('models/fields/probe.json'))
    .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json() as Promise<ProbeData>; })
    .then((data) => { handle = build(data); })
    .catch(() => {
      root.replaceChildren(h('div', { class: 'note-building' }, 'The digit points did not load. Reload the page to try again.'));
    });

  function build(data: ProbeData) {
    const cv = makeCanvas(W, H, 'Dots for test digits, round ones and straight ones, with a red arrow you can turn. Below, a strip with each dot dropped onto the arrow\'s line. Left and right arrow keys turn the arrow.');
    cv.c.tabIndex = 0;
    const isRound = labels(data);
    const n = data.xy.length;
    // one sample point per digit, for the faint drop-lines
    const samples = [...new Set(data.digit)].map((d) => {
      const all = data.digit.map((v, i) => (v === d ? i : -1)).filter((i) => i >= 0);
      return all[Math.floor(all.length / 2)];
    });
    let angle = START_DEG;     // degrees, anticlockwise from pointing right
    let goal = START_DEG;
    let tok = 0;
    let dragging = false;
    let hover = -1;
    /** After Show me, the score must drop below the target before a win counts. */
    let demoHold = false;

    const px = (x: number) => CX + x * R;
    const py = (y: number) => CY - y * R;
    const sx = (s: number) => CX + s * R;

    function draw() {
      const c = colours();
      const g = cv.g;
      const rc = roundCol(c), sc = c.search;
      cv.clear();
      const [ux, uy] = unit(angle);
      const sh = shadows(data.xy, angle);
      const cut = scoreAt(data, angle, isRound);

      // plot frame: the circle the arrow turns in
      g.strokeStyle = c.border; g.lineWidth = 1;
      g.beginPath(); g.arc(CX, CY, R, 0, Math.PI * 2); g.stroke();
      g.setLineDash([2, 4]);
      g.beginPath(); g.arc(CX, CY, ARROW * R, 0, Math.PI * 2); g.stroke();
      g.setLineDash([]);
      // the arrow's whole line (shadows can land behind the arrow too)
      g.strokeStyle = c.red; g.globalAlpha = 0.3; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(px(-ux), py(-uy)); g.lineTo(px(ux), py(uy)); g.stroke();
      g.globalAlpha = 1;

      // faint drop-lines for one sample of each digit, and the hovered one
      const drop = (i: number, strong: boolean) => {
        const [x, y] = data.xy[i];
        const fx = sh[i] * ux, fy = sh[i] * uy;
        g.strokeStyle = strong ? c.text : c.muted;
        g.globalAlpha = strong ? 0.9 : 0.55;
        g.lineWidth = strong ? 1.5 : 1;
        g.setLineDash(strong ? [] : [3, 3]);
        g.beginPath(); g.moveTo(px(x), py(y)); g.lineTo(px(fx), py(fy)); g.stroke();
        g.setLineDash([]); g.globalAlpha = 1;
        g.fillStyle = isRound[i] ? rc : sc;
        g.beginPath(); g.arc(px(fx), py(fy), strong ? 4 : 3, 0, Math.PI * 2); g.fill();
        g.strokeStyle = c.surface; g.lineWidth = 1; g.stroke();
      };
      for (const i of samples) if (i !== hover) drop(i, false);

      // the dots
      for (let i = 0; i < n; i++) {
        const [x, y] = data.xy[i];
        g.fillStyle = isRound[i] ? rc : sc;
        g.globalAlpha = 0.85;
        g.beginPath(); g.arc(px(x), py(y), 3.4, 0, Math.PI * 2); g.fill();
      }
      g.globalAlpha = 1;
      if (hover >= 0) drop(hover, true);

      // the red arrow (the thing you adjust)
      const tx = px(ARROW * ux), ty = py(ARROW * uy);
      arrow(g, CX, CY, tx, ty, c.red, 3.5, 13);
      g.fillStyle = c.red;
      g.beginPath(); g.arc(CX, CY, 4, 0, Math.PI * 2); g.fill();
      // tip handle
      g.beginPath(); g.arc(tx, ty, 10, 0, Math.PI * 2);
      g.fillStyle = c.surface; g.globalAlpha = 0.6; g.fill(); g.globalAlpha = 1;
      g.strokeStyle = c.red; g.lineWidth = 2; g.stroke();
      if (!dragging && hover < 0 && angle === START_DEG) {
        g.font = '600 12.5px Inter Variable, system-ui, sans-serif';
        const t = 'drag the tip', tw = g.measureText(t).width;
        g.fillStyle = c.surface; g.globalAlpha = 0.9;
        g.fillRect(tx - 18 - tw - 4, ty - 10, tw + 8, 20);
        g.globalAlpha = 1;
        g.fillStyle = c.red; g.textAlign = 'right'; g.textBaseline = 'middle';
        g.fillText(t, tx - 18, ty);
        g.textBaseline = 'alphabetic';
      }
      // hovered digit label
      if (hover >= 0) {
        const [x, y] = data.xy[hover];
        g.font = '700 13px Inter Variable, system-ui, sans-serif';
        g.textAlign = 'left'; g.textBaseline = 'middle';
        const label = `digit ${data.digit[hover]}`;
        const lx = Math.min(px(x) + 9, W - g.measureText(label).width - 4);
        g.fillStyle = c.surface; g.globalAlpha = 0.85;
        g.fillRect(lx - 3, py(y) - 18, g.measureText(label).width + 6, 16);
        g.globalAlpha = 1;
        g.fillStyle = c.text;
        g.fillText(label, lx, py(y) - 10);
      }

      // ---- the strip: the arrow's line laid flat
      const x0 = sx(-1), x1 = sx(1);
      g.strokeStyle = c.border; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(x0, SY); g.lineTo(x1, SY); g.stroke();
      // the arrow itself, laid flat on the strip
      arrow(g, sx(0), SY, sx(ARROW), SY, c.red, 2, 9);
      // ticks: round above the line, straight below
      g.lineWidth = 1.5;
      for (let i = 0; i < n; i++) {
        const x = sx(sh[i]);
        g.strokeStyle = isRound[i] ? rc : sc;
        g.globalAlpha = 0.5;
        g.beginPath();
        if (isRound[i]) { g.moveTo(x, SY - 3); g.lineTo(x, SY - 17); } else { g.moveTo(x, SY + 3); g.lineTo(x, SY + 17); }
        g.stroke();
      }
      g.globalAlpha = 1;
      if (hover >= 0) {
        const x = sx(sh[hover]);
        g.strokeStyle = c.text; g.lineWidth = 2.5;
        g.beginPath();
        if (isRound[hover]) { g.moveTo(x, SY - 2); g.lineTo(x, SY - 24); } else { g.moveTo(x, SY + 2); g.lineTo(x, SY + 24); }
        g.stroke();
      }
      // the best cut
      const cx = sx(cut.cut);
      g.strokeStyle = c.text; g.lineWidth = 1.5; g.setLineDash([4, 3]);
      g.beginPath(); g.moveTo(cx, SY - 28); g.lineTo(cx, SY + 26); g.stroke();
      g.setLineDash([]);
      g.font = '700 12.5px Inter Variable, system-ui, sans-serif';
      g.textBaseline = 'alphabetic';
      const leftName = cut.roundHigh ? 'straight' : 'round';
      const rightName = cut.roundHigh ? 'round' : 'straight';
      const minS = Math.min(...sh), maxS = Math.max(...sh);
      if (cut.cut > minS) {
        const t = `← ${leftName}`;
        g.fillStyle = leftName === 'round' ? rc : sc; g.textAlign = 'right';
        g.fillText(t, Math.max(cx - 6, 4 + g.measureText(t).width), SY - 31);
      }
      if (cut.cut < maxS) {
        const t = `${rightName} →`;
        g.fillStyle = rightName === 'round' ? rc : sc; g.textAlign = 'left';
        g.fillText(t, Math.min(cx + 6, W - 4 - g.measureText(t).width), SY - 31);
      }
      g.textBaseline = 'alphabetic';
      // legend swatches follow the theme
      swRound.style.background = rc; swStraight.style.background = sc; swArrow.style.background = c.red;
      // readouts
      scoreR.set(`${Math.floor(cut.accuracy * 100)}%`);
      angleR.set(`${Math.round(norm360(angle)) % 360}°`);
      wrongR.set(`${cut.n - cut.correct} of ${cut.n}`);
    }

    function arrow(g: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, col: string, wd: number, head: number) {
      const a = Math.atan2(y1 - y0, x1 - x0);
      g.strokeStyle = col; g.fillStyle = col; g.lineWidth = wd; g.lineCap = 'round';
      g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1 - Math.cos(a) * head * 0.6, y1 - Math.sin(a) * head * 0.6); g.stroke();
      g.beginPath();
      g.moveTo(x1, y1);
      g.lineTo(x1 - head * Math.cos(a - 0.42), y1 - head * Math.sin(a - 0.42));
      g.lineTo(x1 - head * Math.cos(a + 0.42), y1 - head * Math.sin(a + 0.42));
      g.closePath(); g.fill();
      g.lineCap = 'butt';
    }

    /** Say how the arrow is doing. Show me ('demo') never wins. */
    function report(mode: 'student' | 'demo') {
      const cut = scoreAt(data, angle, isRound);
      const pct = Math.floor(cut.accuracy * 100);
      const deg = Math.round(norm360(angle)) % 360;
      if (mode === 'demo') {
        demoHold = true;
        api.feedback(`Show me turned the arrow to ${deg}°. Score: **${pct}%**. Round shadows sit at one end of the strip, straight ones at the other. Now turn the arrow away and find a good angle yourself.`);
        return;
      }
      if (cut.accuracy >= TARGET) {
        if (demoHold) {
          api.feedback(`Score: **${pct}%**. Show me found this angle. Turn the arrow until the score drops below 90%, then find a good angle again.`);
        } else {
          api.win(`Score: **${pct}%** with the arrow at ${deg}°. Round shadows sit at one end of the strip, straight ones at the other.`);
        }
      } else {
        demoHold = false;
        api.feedback(`Score: **${pct}%**. Target: 90%. Turn the arrow and watch the strip.`);
      }
    }

    function animateTo(to: number, ms: number, mode: 'student' | 'demo') {
      const my = ++tok;
      const from = angle, t0 = performance.now();
      return new Promise<void>((res) => {
        const tick = () => {
          if (my !== tok) return res();
          const t = Math.min(1, (performance.now() - t0) / ms);
          const e = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
          angle = from + (to - from) * e;
          draw();
          if (t < 1) requestAnimationFrame(tick);
          else { angle = to; draw(); report(mode); res(); }
        };
        requestAnimationFrame(tick);
      });
    }

    function turn(dir: 1 | -1) {
      goal = goal + dir * STEP_DEG;
      void animateTo(goal, 200, 'student');
    }

    function reset() {
      tok++;
      angle = goal = START_DEG;
      demoHold = false;
      hover = -1;
      draw();
      api.feedback(`Score: **${Math.floor(scoreAt(data, angle, isRound).accuracy * 100)}%**. The arrow points up again.`);
    }

    // ---- pointer: drag the tip (or the shaft) to turn; hover/tap a dot to read it
    const tip = () => { const [ux, uy] = unit(angle); return [px(ARROW * ux), py(ARROW * uy)]; };
    const onArrow = (x: number, y: number) => {
      const [tx, ty] = tip();
      // keep the grab area at least 48 screen px across, even when the canvas is scaled down
      const scale = cv.c.getBoundingClientRect().width / W || 1;
      if (Math.hypot(x - tx, y - ty) <= Math.max(HIT, 24 / scale)) return true;
      // near the shaft, away from the centre
      const [ux, uy] = unit(angle);
      const along = ((x - CX) * ux - (y - CY) * uy) / R;
      const across = Math.abs((x - CX) * -uy - (y - CY) * ux);
      return along > 0.25 && along < ARROW && across < 16;
    };
    const nearest = (x: number, y: number) => {
      let best = -1, bd = 14;
      for (let i = 0; i < n; i++) {
        const d = Math.hypot(px(data.xy[i][0]) - x, py(data.xy[i][1]) - y);
        if (d < bd) { bd = d; best = i; }
      }
      return best;
    };
    const setFromPointer = (x: number, y: number) => {
      if (Math.hypot(x - CX, y - CY) < 6) return;
      tok++;
      const a = (Math.atan2(CY - y, x - CX) * 180) / Math.PI;
      angle = goal = angle + shortTurn(angle, a); // keep it continuous
      draw();
      report('student');
    };
    cv.c.addEventListener('pointerdown', (e) => {
      const [x, y] = cv.pos(e);
      if (onArrow(x, y)) {
        dragging = true; hover = -1;
        cv.c.setPointerCapture(e.pointerId);
        cv.c.style.cursor = 'grabbing';
        draw();
        e.preventDefault();
      } else {
        hover = nearest(x, y);
        draw();
      }
    });
    cv.c.addEventListener('pointermove', (e) => {
      const [x, y] = cv.pos(e);
      if (dragging) { setFromPointer(x, y); return; }
      const hv = nearest(x, y);
      cv.c.style.cursor = onArrow(x, y) ? 'grab' : 'default';
      if (hv !== hover) { hover = hv; draw(); }
    });
    const endDrag = () => {
      if (!dragging) return;
      dragging = false;
      cv.c.style.cursor = 'grab';
      draw();
    };
    cv.c.addEventListener('pointerup', endDrag);
    cv.c.addEventListener('pointercancel', endDrag);
    cv.c.addEventListener('pointerleave', () => { if (!dragging && hover >= 0) { hover = -1; draw(); } });
    cv.c.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') { turn(1); e.preventDefault(); }
      if (e.key === 'ArrowRight') { turn(-1); e.preventDefault(); }
    });

    const sw = () => h('span', { class: 'sw', style: 'border-radius:50%' });
    const swRound = sw(), swStraight = sw();
    const swArrow = h('span', { class: 'sw', style: 'height:4px;width:16px;border-radius:2px;vertical-align:3px' });
    const scoreR = readout('Score');
    const angleR = readout('Angle');
    const wrongR = readout('On the wrong side');

    root.replaceChildren(
      cv.c,
      h('div', { class: 'legend', style: 'margin-top:6px' },
        h('span', null, swRound, 'round: 0 6 8 9'),
        h('span', null, swStraight, 'straight: 1 4 7'),
        h('span', null, swArrow, 'the arrow you turn')),
      h('div', { class: 'viz-controls' },
        h('div', { class: 'btn-row' },
          button('Turn ◀', () => turn(1), 'btn small'),
          button('Turn ▶', () => turn(-1), 'btn small'),
          button('Reset', reset, 'btn small ghost'))),
      h('div', { class: 'viz-readouts' }, scoreR.el, angleR.el, wrongR.el),
      h('div', { class: 'viz-caption' }, 'Strip: each dot\'s shadow on the arrow\'s line, round above and straight below. Dashed line: the best place to cut the strip. Score: the share of digits on the correct side of it.'),
    );
    draw();
    onTheme(draw);

    return {
      async showMe() {
        hover = -1;
        goal = angle + shortTurn(angle, data.best_angle_deg);
        await animateTo(goal, 1400, 'demo');
      },
    };
  }

  return {
    async showMe() {
      await ready;
      await handle?.showMe();
    },
  };
};

export default viz;

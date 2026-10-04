// Field 6 — Learning by trial and error: Q-learning in a small maze.
// Each square's brightness (yellow = value) is the best of its four move scores.
// Arrows show the best-rated move; the teal line is the route those arrows give from the start.
// Pure logic lives in qlearn-core.ts (tested in Node).
import { h } from '../../lib/dom';
import { button, colours, makeCanvas, onTheme, readout, segmented, sleep, type Viz } from './kit';
import {
  bestMove, bestRoute, COLS, DEFAULT_EXPLORATION, EXPLORATION, GOAL, makeRng, MAX_STEPS, MOVES, newQ, PAGE_SEED, ROWS,
  runEpisode, S0, SG, SHORTEST, SHOW_ME, showMeBatches, value, WALLS, xy, type Episode,
} from './qlearn-core';
import './qlearn.css';

const CELL = 72;
const W = COLS * CELL, H = ROWS * CELL;
const FILL_LIGHT = '#ffc61a';

function hexRgb(hex: string): [number, number, number] {
  const m = hex.trim().match(/^#([0-9a-f]{6})$/i);
  if (!m) return [128, 128, 128];
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const mix = (a: [number, number, number], b: [number, number, number], t: number): [number, number, number] =>
  [0, 1, 2].map((k) => Math.round(a[k] + (b[k] - a[k]) * t)) as [number, number, number];
const lum = ([r, g, b]: [number, number, number]) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
const css = ([r, g, b]: [number, number, number]) => `rgb(${r},${g},${b})`;
const fmt = (v: number) => (v <= 0 ? '0' : v.toFixed(2));

const viz: Viz = (el, api) => {
  el.classList.add('ql');
  const cv = makeCanvas(W, H, 'A maze of 7 by 6 squares. Start at the bottom left, goal at the top right. Brighter yellow squares have higher values.');
  let Q = newQ();
  let explore = DEFAULT_EXPLORATION;
  let episodes = 0;
  let last: Episode | null = null;
  let agent: number | null = null;   // square the agent is on while an episode is animated
  let busy = false;
  let demo = false;                  // true after Show me, until Reset
  let token = 0;
  const rand = makeRng(PAGE_SEED);

  // ---------------------------------------------------------------- drawing
  function draw() {
    const c = colours();
    const g = cv.g;
    cv.clear();
    const bg = hexRgb(c.bg);
    const darkTheme = lum(bg) < 0.5;
    // squares get brighter yellow as their value grows (the light theme's text yellow is too dark for a fill)
    const base = hexRgb(c.surface2), yel = darkTheme ? hexRgb(c.yellow) : hexRgb(FILL_LIGHT);
    const wall = darkTheme ? '#050608' : '#2b2d35';

    for (let s = 0; s < COLS * ROWS; s++) {
      const [x, y] = xy(s);
      const px = x * CELL, py = y * CELL;
      if (WALLS[s]) {
        g.fillStyle = wall; g.fillRect(px, py, CELL, CELL);
        g.save(); g.beginPath(); g.rect(px, py, CELL, CELL); g.clip();
        g.strokeStyle = darkTheme ? '#262a33' : '#4a4d57'; g.lineWidth = 2;
        for (let k = -CELL; k < CELL; k += 12) { g.beginPath(); g.moveTo(px + k, py + CELL); g.lineTo(px + k + CELL, py); g.stroke(); }
        g.restore();
        continue;
      }
      const v = s === SG ? 0 : value(Q, s);
      const fill = v > 0 ? mix(base, yel, 0.12 + 0.88 * Math.min(1, v)) : base;
      g.fillStyle = css(fill); g.fillRect(px, py, CELL, CELL);
    }
    // grid lines
    g.strokeStyle = c.border; g.lineWidth = 1;
    for (let x = 0; x <= COLS; x++) { g.beginPath(); g.moveTo(x * CELL + 0.5, 0); g.lineTo(x * CELL + 0.5, H); g.stroke(); }
    for (let y = 0; y <= ROWS; y++) { g.beginPath(); g.moveTo(0, y * CELL + 0.5); g.lineTo(W, y * CELL + 0.5); g.stroke(); }

    // best route (teal line through the cell centres) when not animating
    const route = agent === null ? bestRoute(Q) : null;
    if (route) {
      const pts = route.map((s) => { const [x, y] = xy(s); return [x * CELL + CELL / 2, y * CELL + CELL / 2]; });
      // stop at the edge of the goal square
      const [gx, gy] = pts[pts.length - 1], [px, py] = pts[pts.length - 2];
      pts[pts.length - 1] = [gx - Math.sign(gx - px) * (CELL / 2 - 4), gy - Math.sign(gy - py) * (CELL / 2 - 4)];
      g.save();
      g.strokeStyle = c.act; g.globalAlpha = 0.9; g.lineWidth = 6; g.lineCap = 'round'; g.lineJoin = 'round';
      g.beginPath();
      pts.forEach(([x, y], k) => (k === 0 ? g.moveTo(x, y) : g.lineTo(x, y)));
      g.stroke();
      g.restore();
    }

    // values, arrows, labels
    g.textAlign = 'center'; g.textBaseline = 'middle';
    for (let s = 0; s < COLS * ROWS; s++) {
      if (WALLS[s] || s === SG) continue;
      const [x, y] = xy(s);
      const cx = x * CELL + CELL / 2, cy = y * CELL + CELL / 2;
      const v = value(Q, s);
      const fill = v > 0 ? mix(base, yel, 0.12 + 0.88 * Math.min(1, v)) : base;
      const ink = lum(fill) > 0.55 ? '#17171c' : '#f2f2f5';
      g.font = '13px Inter Variable, system-ui, sans-serif';
      g.textAlign = 'right';
      g.fillStyle = v > 0 ? ink : c.faint;
      g.fillText(fmt(v), x * CELL + CELL - 5, y * CELL + CELL - 11);
      g.textAlign = 'left';
      if (v > 0) {
        const [dx, dy] = MOVES[bestMove(Q, s)];
        const ay = cy, L = 15;
        const tx = cx + dx * L, ty = ay + dy * L;
        g.strokeStyle = ink; g.fillStyle = ink; g.lineWidth = 2.5; g.lineCap = 'round';
        g.beginPath(); g.moveTo(cx - dx * L * 0.7, ay - dy * L * 0.7); g.lineTo(tx - dx * 5, ty - dy * 5); g.stroke();
        g.beginPath();
        g.moveTo(tx, ty);
        g.lineTo(tx - dx * 8 - dy * 6, ty - dy * 8 - dx * 6);
        g.lineTo(tx - dx * 8 + dy * 6, ty - dy * 8 + dx * 6);
        g.closePath(); g.fill();
      }
      if (s === S0) {
        g.font = '600 12px Inter Variable, system-ui, sans-serif';
        g.fillStyle = v > 0 ? ink : c.green;
        g.fillText('Start', x * CELL + 5, y * CELL + CELL - 11);   // bottom-left: the route never passes here
      }
    }
    // goal
    {
      const [x, y] = GOAL;
      const px = x * CELL, py = y * CELL;
      g.strokeStyle = c.yellow; g.lineWidth = 4;
      g.strokeRect(px + 3, py + 3, CELL - 6, CELL - 6);
      g.fillStyle = c.yellow;
      g.font = '700 20px Inter Variable, system-ui, sans-serif';
      g.textAlign = 'center';
      g.fillText('+1', px + CELL / 2, py + CELL / 2 + 2);
      g.font = '600 13px Inter Variable, system-ui, sans-serif';
      g.fillStyle = c.text; g.textAlign = 'left';
      g.fillText('Goal', px + 9, py + 17);
    }
    // agent
    if (agent !== null) {
      const [x, y] = xy(agent);
      g.fillStyle = c.act; g.strokeStyle = c.surface; g.lineWidth = 3;
      g.beginPath(); g.arc(x * CELL + CELL / 2, y * CELL + CELL / 2, 13, 0, Math.PI * 2); g.fill(); g.stroke();
    }
    g.textBaseline = 'alphabetic';
  }

  // ---------------------------------------------------------------- readouts + feedback
  const epR = readout('Episodes run', '0');
  const stR = readout('Steps in last episode');
  const brR = readout('Best route now');
  const shR = readout('Shortest possible', `${SHORTEST} steps`);
  function readouts() {
    epR.set(String(episodes));
    stR.set(last ? (last.reached ? String(last.trace.length) : `${MAX_STEPS}, goal not reached`) : '–');
    const r = bestRoute(Q);
    brR.set(r ? `${r.length - 1} steps` : 'doesn\'t reach the goal yet');
  }
  function evaluate() {
    if (demo) {
      api.feedback('This route came from Show me. Press Reset to train the agent yourself.');
      return;
    }
    const r = bestRoute(Q);
    const len = r ? r.length - 1 : null;
    if (len === SHORTEST) {
      api.win(`Done after ${episodes} episode${episodes === 1 ? '' : 's'}: the arrows lead from Start to Goal in **${SHORTEST} steps**, the fewest possible.`);
    } else if (len !== null) {
      api.feedback(`Best route now: **${len} steps**. Shortest possible: **${SHORTEST}**. Keep training.`);
    } else if (Q.every((q) => q === 0)) {
      api.feedback('Every score is still 0, because the agent has not reached the goal yet. With all scores equal, each move is picked at random. Run another episode.');
    } else {
      api.feedback('The arrows don\'t lead from Start to Goal yet. Keep running episodes.');
    }
  }

  // ---------------------------------------------------------------- actions
  const run1 = button('Run 1 episode', () => runOne(), 'btn small primary');
  const run50 = button('Run 50 episodes', () => runMany(50), 'btn small');
  const resetB = button('Reset', () => reset(), 'btn small ghost');
  function setBusy(b: boolean) {
    busy = b;
    run1.disabled = b; run50.disabled = b;
  }

  async function runOne() {
    if (busy) return;
    const my = ++token;
    setBusy(true);
    const before = Q.slice();
    const ep = runEpisode(Q, explore, rand);
    const after = Q;
    Q = before;                       // show the old scores, then apply each update as the agent moves
    const per = Math.max(22, Math.min(90, 2400 / ep.trace.length));
    agent = S0; draw();
    for (const st of ep.trace) {
      await sleep(per);
      if (my !== token) return;
      Q[st.s * 4 + st.a] = st.q;
      agent = st.s2;
      draw();
    }
    await sleep(per);
    if (my !== token) return;
    Q = after; agent = null;
    episodes++; last = ep;
    setBusy(false);
    draw(); readouts(); evaluate();
  }

  function runMany(n: number) {
    if (busy) return;
    token++;
    for (let k = 0; k < n; k++) last = runEpisode(Q, explore, rand);
    episodes += n;
    draw(); readouts(); evaluate();
  }

  function reset() {
    token++;
    Q = newQ(); episodes = 0; last = null; agent = null; demo = false;
    setBusy(false);
    draw(); readouts();
    api.feedback('');
  }

  const seg = segmented('Exploration', EXPLORATION.map((v) => ({ label: String(v), value: v })), explore, (v) => { explore = v; });

  el.append(
    cv.c,
    h('div', { class: 'viz-controls' },
      h('div', { class: 'btn-row' }, run1, run50, resetB),
      seg.el),
    h('div', { class: 'viz-readouts' }, epR.el, stR.el, brR.el, shR.el),
    h('div', { class: 'viz-caption' },
      `An episode is one trip from Start until the agent reaches the goal or has made ${MAX_STEPS} moves. ` +
      'The number in each square is the best of its four move scores. Arrows: the best-rated move. ' +
      'Teal line: the route the arrows give from Start. Exploration: the chance that each move is random instead of the best-rated one.'),
  );
  readouts();
  draw();
  onTheme(draw);

  return {
    async showMe() {
      const my = ++token;
      Q = newQ(); episodes = 0; last = null; agent = null; demo = true;
      explore = SHOW_ME.exploration; seg.set(explore);
      setBusy(true);
      draw(); readouts();
      api.feedback(`Show me: running episodes in batches of ${SHOW_ME.batch} with exploration ${SHOW_ME.exploration}.`);
      const r = makeRng(SHOW_ME.seed);
      const q = Q;
      for (const b of showMeBatches(q, r)) {
        await sleep(450);
        if (my !== token) return;
        episodes = b.episodes;
        last = { trace: new Array(b.lastSteps), reached: b.lastReached };
        draw(); readouts();
        api.feedback(`Show me: ${b.episodes} episodes. Best route: ${b.len === null ? 'doesn\'t reach the goal yet' : `**${b.len} steps**`}.`);
      }
      if (my !== token) return;
      setBusy(false);
      const len = bestRoute(Q);
      api.feedback(len && len.length - 1 === SHORTEST
        ? `Show me reached the shortest route (${SHORTEST} steps) after ${episodes} episodes. Press Reset to train the agent yourself.`
        : `Show me stopped after ${episodes} episodes. Press Reset to train the agent yourself.`);
    },
  };
};

export default viz;

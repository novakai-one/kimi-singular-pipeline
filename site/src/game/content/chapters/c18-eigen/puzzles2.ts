// Chapter 18 puzzles 5–7: a 3 × 3 by hand (p5 [H] [X8]), the lines of Vell's pulse (p6), and what
// row reducing first does to the stretches (p7 [S]).
import type { PuzzleDef, V3 } from '../../../game/types';
import { Arrow } from '../../../gfx/arrow';
import { InfLine, Lattice3D } from '../../../gfx/shapes';
import { StepWorksheet } from '../../../kit/steps';
import { VectorInput, parseNum } from '../../../ui/widgets';
import { h, button, inline } from '../../../ui/ui';
import { C } from '../../../core/theme';
import { animate, ease, wait } from '../../../core/tween';
import { sfx } from '../../../audio/sfx';
import { matVec, mlerp, norm, normalize, type Mat, type Vec } from '../../../math/la';
import { LineHunt, niceDir, ptag, v3, sg } from './parts';
import {
  P3_A, P5_A, P5_BLOCK_C, P5_TRI, P5_TRI_VALUES, P5_VALUES, P5_VECS, P6_CANDIDATES, P6_LINES, P6_V, P7_U, eigenLines, fmt2, fmtN, fmtV,
  lineAngleDeg, p6Won, texM, trace, turnDeg, type Lock,
} from './logic';
import { S } from './script';
import { hideLandingLine } from './puzzles';

const det3 = (M: Mat) => M[0][0] * (M[1][1] * M[2][2] - M[1][2] * M[2][1]) - M[0][1] * (M[1][0] * M[2][2] - M[1][2] * M[2][0]) + M[0][2] * (M[1][0] * M[2][1] - M[1][1] * M[2][0]);

// ------------------------------------------------------------------ p5 [H] [X8] · a 3 × 3 by hand

export const p5: PuzzleDef = {
  id: 'c18-p5',
  title: 'What are the stretches of a 3 × 3, by hand?',
  goal: 'By hand: the characteristic equation of $A$ (in the readout), its eigenvalues and eigenvectors, the two checks, and a triangular matrix read off its diagonal.',
  subgoals: ['The characteristic equation', 'Eigenvalues and eigenvectors', 'Check: the trace and the determinant', 'A triangular matrix'],
  hints: [
    'Expand $\\det(A - \\lambda I)$ along the first row: only the $2 - \\lambda$ survives, times the 2 × 2 block $\\begin{bmatrix} 3 - \\lambda & 4 \\\\ 4 & -3 - \\lambda \\end{bmatrix}$.',
    'The block’s determinant is $(3 - \\lambda)(-3 - \\lambda) - 16 = \\lambda^2 - 9 - 16 = \\lambda^2 - 25$, so the eigenvalues are 2, 5 and −5.',
    'For λ = 5: $-2y + 4z = 0$, so $(0, 2, 1)$. For λ = −5: $8y + 4z = 0$, so $(0, 1, -2)$. Sum $2 + 5 - 5 = 2$, product $-50$. Triangular: 3, −1, 2.',
  ],
  par: 7,
  view: '3d',
  onWin: S.p5Win,
  setup(p) {
    void p.g.stage.view3D({ target: [0, 0, 0], distance: 15, azimuth: -52, elevation: 24 });
    const lat = new Lattice3D(p.g.stage, { extent: 2, opacity: 0.1 });
    p.add(lat);
    // the three lines that hold, each with a unit arrow v and its image Av (revealed as the steps are solved)
    const parts = P5_VECS.map((v, i) => {
      const u = normalize(v);
      const line = new InfLine(p.g.stage, [0, 0, 0], u as V3, { color: C.violet, width: 2.2, opacity: 0.7, length: 7 });
      const a = new Arrow([0, 0, 0], v3(u.map((x) => x * 1.2)), { color: [C.v, C.w, C.u][i], width: 0.05 });
      const img = new Arrow([0, 0, 0], v3(u.map((x) => x * 1.2 * P5_VALUES[i])), { color: C.result, width: 0.035, opacity: 0.85 });
      const tg = ptag(p, `λ = ${fmtN(P5_VALUES[i])} · ${fmtV(v)}`, v3(u.map((x) => x * 1.2 * P5_VALUES[i] + (P5_VALUES[i] < 0 ? -0.4 : 0.4) * x)), 'vi', [0, -16]);
      p.add(line.object, a, img); p.onDispose(() => line.dispose());
      for (const o of [line.object, a.group, img.group]) o.visible = false;
      tg.show(false);
      return { line, a, img, tg, shown: false };
    });
    const reveal = async (i: number) => {
      const q = parts[i];
      if (q.shown) return;
      q.shown = true;
      for (const o of [q.line.object, q.a.group, q.img.group]) o.visible = true;
      q.tg.show(true);
      const tip = P5_VECS[i].map((x) => x / norm(P5_VECS[i]) * 1.2);
      await animate(p.g.headless ? 1 : 700, (k) => q.img.setTo(v3(tip.map((x) => x * (1 + (P5_VALUES[i] - 1) * k)))), ease.out);
      sfx.snap();
    };
    const r = p.readout('By hand');
    r.row('A', '$A$', `$${texM(P5_A)}$`);
    r.row('U', 'the triangular one', `$${texM(P5_TRI)}$`);
    const paint = (k: number) => {
      r.row('tr', 'trace of $A$ (sum down the diagonal)', fmtN(trace(P5_A)));
      r.row('det', '$\\det A$', fmtN(det3(P5_A)));
      r.row('sum', 'sum of the eigenvalues', k >= 2 ? fmtN(P5_VALUES.reduce((a, b) => a + b, 0)) : '?', C.result);
      r.row('prod', 'product of the eigenvalues', k >= 2 ? fmtN(P5_VALUES.reduce((a, b) => a * b, 1)) : '?', C.result);
    };
    paint(0);
    const done = [false, false, false, false];
    const tick = (i: number) => { if (!done[i]) { done[i] = true; sg(p, i); } };
    const steps = [
      { prompt: '$\\det(A - \\lambda I) = (2 - \\lambda)\\,[(3 - \\lambda)(-3 - \\lambda) - 16]$. The bracket is $\\lambda^2 + c$: $c =$', answer: P5_BLOCK_C, mistakes: [[-9, 'Take away $4 \\cdot 4 = 16$ as well: $-9 - 16$.'], [7, 'The product of the diagonal is $(3)(-3) = -9$, then take away 16.']] as [number, string][] },
      { prompt: 'The eigenvalues, largest first', answer: P5_VALUES, mistakes: [[[5, 2, 5], '$\\lambda^2 = 25$ has two roots: 5 and −5.'], [[2, 5, -5], 'Largest first: 5, 2, −5.']] as [number[], string][] },
      { prompt: 'An eigenvector for $\\lambda = 5$ is $(0, 2, z)$: $z =$', answer: P5_VECS[0][2], mistakes: [[-4, 'That one solves for λ = −5. For λ = 5: $-2y + 4z = 0$.']] as [number, string][] },
      { prompt: 'An eigenvector for $\\lambda = -5$ is $(0, 1, z)$: $z =$', answer: P5_VECS[2][2], mistakes: [[2, '$A + 5I$ has the row $(0, 8, 4)$: $8 + 4z = 0$.']] as [number, string][] },
      { prompt: 'Check: $\\lambda_1 + \\lambda_2 + \\lambda_3$ (the trace)', answer: P5_VALUES.reduce((a, b) => a + b, 0) },
      { prompt: 'Check: $\\lambda_1\\lambda_2\\lambda_3$ ($\\det A$)', answer: P5_VALUES.reduce((a, b) => a * b, 1), mistakes: [[50, 'One of the three is negative.']] as [number, string][] },
      { prompt: 'The triangular one (readout): its eigenvalues, top to bottom', answer: P5_TRI_VALUES },
    ];
    const watch = () => {
      const n = ws.el.querySelectorAll('.ws-row.ok').length;
      if (n >= 1) tick(0);
      if (n >= 2) { void reveal(1); paint(2); }
      if (n >= 3) void reveal(0);
      if (n >= 4) { void reveal(2); tick(1); }
      if (n >= 6) tick(2);
    };
    const ws = new StepWorksheet(p, {
      steps,
      onDone: () => {
        void (async () => { for (const i of [1, 0, 2]) await reveal(i); })();
        paint(2);
        tick(0); tick(1); tick(2); tick(3);
        r.note('A triangular matrix: $\\det(A - \\lambda I)$ is the product down the diagonal, so its eigenvalues are its diagonal entries.');
        p.win();
      },
    });
    ws.el.addEventListener('change', watch);
    ws.el.addEventListener('keyup', watch);
    ws.el.addEventListener('click', () => window.setTimeout(watch, 30));
    return {
      async showMe() { await ws.showMe(420); watch(); },
      solve() { ws.solve(); },
      wrong() { ws.wrong(); },
    };
  },
};

// ------------------------------------------------------------------ p6 · Vell's lines

export const p6: PuzzleDef = {
  id: 'c18-p6',
  title: 'Which lines does Vell’s pulse keep?',
  goal: 'Test arrows through the Anchor under Vell’s pulse $V$. **Lock** every line $V$ keeps (the yellow image stays on the white arrow’s line), and give its stretch.',
  subgoals: ['Lock the line with stretch 1', 'Lock the line with stretch 0.5', 'Lock the line with stretch 0.2'],
  hints: [
    'A line holds when $V\\mathbf x$ is a multiple of $\\mathbf x$. Divide each entry of $V\\mathbf x$ by the matching entry of $\\mathbf x$: they must agree.',
    '$V(1, 1, 1) = (1, 1, 1)$: stretch 1. Try $(1, -1, 0)$ and $(1, 1, -2)$ as well.',
    'Lock $(1, 1, 1)$ × 1, $(1, -1, 0)$ × 0.5 and $(1, 1, -2)$ × 0.2.',
  ],
  par: 6,
  view: '3d',
  onWin: S.p6Win,
  setup(p) {
    const d = p.difficulty;
    void p.g.stage.view3D({ target: [0, 0, 0], distance: 13, azimuth: -38, elevation: 22 });
    const lat = new Lattice3D(p.g.stage, { extent: 2, opacity: 0.1 });
    const latV = new Lattice3D(p.g.stage, { extent: 2, opacity: 0.16, color: '#9b7bff' });
    latV.set(P6_V);
    p.add(lat, latV);
    const L = 2.6;
    const probe = new Arrow([0, 0, 0], [L, 0, 0], { color: C.white, width: 0.05, label: '$\\mathbf x$' });
    const img = new Arrow([0, 0, 0], v3(matVec(P6_V, [1, 0, 0]).map((t) => t * L)), { color: C.result, width: 0.045, label: '$V\\mathbf x$' });
    p.add(probe, img);
    const shown: InfLine[] = [];
    let x: Vec = [1, 0, 0];
    const r = p.readout('Vell’s pulse');
    r.row('V', '$V$', '$\\tfrac{1}{60}\\left[\\begin{smallmatrix} 37 & 7 & 16 \\\\ 7 & 37 & 16 \\\\ 16 & 16 & 28 \\end{smallmatrix}\\right]$');
    const paint = () => {
      const y = matVec(P6_V, x);
      r.row('x', '$\\mathbf x$', fmtV(x), C.white);
      r.row('y', '$V\\mathbf x$', `(${y.map((t) => fmt2(t)).join(', ')})`, C.result);
      r.row('t', 'turned off the line of $\\mathbf x$', `${Math.round(turnDeg(P6_V, x))}°`, turnDeg(P6_V, x) < 1 ? C.violet : C.white);
    };
    const locks: (Lock & { ok: boolean; line: number })[] = [];
    const inputs = new Map<number, HTMLInputElement>();
    const list = h('div', { class: 'a7-locks' });
    const msgEl = h('div', { class: 'a7-msg' });
    const msg = (t: string, k: '' | 'good' | 'bad' = '') => { msgEl.className = `a7-msg ${k}`; msgEl.innerHTML = inline(t); };
    let won = false;
    const winCheck = () => {
      P6_LINES.forEach(([dir, val], i) => sg(p, i, locks.some((k) => k.ok && lineAngleDeg(k.dir, dir) < 0.5 && Math.abs(k.stretch - val) < 0.02)));
      if (!won && p6Won(locks.filter((k) => k.ok))) { won = true; sfx.success(); msg('Three lines hold. Every other arrow is turned towards (1, 1, 1).', 'good'); p.win(); }
    };
    const test = async (dir: Vec, fast = false) => {
      if (norm(dir) < 1e-9) { msg('The zero arrow has no line. Try an arrow that is not zero.', 'bad'); sfx.miss(); return; }
      p.move();
      x = dir.slice();
      const u = normalize(dir);
      const y = matVec(P6_V, u);
      probe.set([0, 0, 0], v3(u.map((t) => t * L)));
      await animate(fast ? 1 : 800, (k) => img.set([0, 0, 0], v3(u.map((t, i) => (t + (y[i] - t) * k) * L))), ease.inOut);
      paint();
      const lines = eigenLines(P6_V);
      const hit = lines.findIndex((l) => lineAngleDeg(l.dir, dir) < 0.5);
      if (hit < 0) { sfx.miss(); msg(`$V\\mathbf x$ is turned ${Math.round(turnDeg(P6_V, dir))}° off the line of ${fmtV(dir)}. That line does not hold.`, 'bad'); p.bark('lantern', `Turned ${Math.round(turnDeg(P6_V, dir))} degrees. Not a line that holds.`); return; }
      if (locks.some((k) => k.line === hit)) { msg('That line is locked already.'); return; }
      const val = lines[hit].value;
      const lock = { dir: lines[hit].dir, stretch: d === 'cadet' ? val : NaN, ok: d === 'cadet', line: hit };
      locks.push(lock);
      const line = new InfLine(p.g.stage, [0, 0, 0], v3(lines[hit].dir), { color: C.violet, width: 2.2, opacity: 0.7, length: 6 });
      p.add(line.object); p.onDispose(() => line.dispose()); shown.push(line);
      const nd = niceDir(lines[hit].dir);
      const row = h('div', { class: `a7-lock ${lock.ok ? 'ok' : ''}` }, h('span', { class: 'd', html: inline(`line ${fmtV(nd)}`) }));
      const st = h('span', { class: 'st' }, lock.ok ? '✓' : '');
      if (d === 'cadet') row.append(h('span', { class: 's', html: inline(`stretch $\\lambda = ${fmtN(val)}$`) }), st);
      else {
        const inp = h('input', { class: 'cell', inputmode: 'decimal', 'aria-label': `stretch along ${fmtV(nd)}`, placeholder: '?' }) as HTMLInputElement;
        const chk = () => {
          const v = parseNum(inp.value);
          if (v === null) return;
          p.move();
          lock.stretch = v; lock.ok = Math.abs(v - val) < (d === 'commander' ? 0.005 : 0.02);
          row.classList.toggle('ok', lock.ok); st.textContent = lock.ok ? '✓' : 'not this one';
          if (lock.ok) sfx.snap(); else sfx.miss();
          winCheck();
        };
        inp.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') chk(); });
        inp.addEventListener('change', chk);
        row.append(h('span', { class: 's', html: inline('stretch $\\lambda =$') }), inp, st);
        inputs.set(hit, inp);
        if (!fast) window.setTimeout(() => inp.focus(), 30);
      }
      list.append(row);
      sfx.snap();
      msg(`Locked: $V$ keeps the line of ${fmtV(nd)}.`, 'good');
      winCheck();
    };
    const pick = h('div', { class: 'a7-btns' });
    let typed: VectorInput | null = null;
    if (d === 'commander') {
      typed = new VectorInput({ dim: 3, values: [1, 0, 0], label: '\\mathbf x =', step: 1, onSubmit: (v) => void test(v) });
      typed.el.classList.add('a7-in');
      pick.append(typed.el, button('Test this arrow', () => void test(typed!.get()), { cls: 'primary small' }));
    } else {
      pick.append(h('span', { class: 'k' }, 'Test:'), ...P6_CANDIDATES.map((c) => button(fmtV(c), () => void test(c), { cls: 'small' })));
    }
    p.dock().append(h('div', { class: 'a7-kick' }, d === 'commander' ? 'Find the lines yourself: type an arrow' : 'Candidate lines through the Anchor'), pick, list, msgEl);
    paint();
    const fill = () => {
      for (const k of locks) {
        const inp = inputs.get(k.line);
        if (!inp || k.ok) continue;
        inp.value = fmtN(Math.round(eigenLines(P6_V)[k.line].value * 100) / 100);
        inp.dispatchEvent(new Event('change'));
      }
    };
    return {
      async showMe() {
        for (const [dir] of P6_LINES) { typed?.set(dir); await test(dir); await wait(p.g.headless ? 1 : 400); }
        fill();
      },
      async solve() { for (const [dir] of P6_LINES) await test(dir, true); fill(); },
      async wrong() { await test([1, 0, 0], true); await test([1, 1, 0], true); },
    };
  },
};

// ------------------------------------------------------------------ p7 [S] · row reduce first?

export const p7: PuzzleDef = {
  id: 'c18-p7',
  title: 'What happens to the stretches if you row reduce first?',
  goal: '$A = \\begin{bmatrix} 4 & 1 \\\\ 2 & 3 \\end{bmatrix}$ has stretches 5 and 2. **Row reduce** it to $U$, then sweep $U$ and lock its lines. Are they $A$’s?',
  subgoals: ['Row reduce: $R_2 \\to R_2 - \\tfrac12 R_1$', 'Lock both lines of $U$'],
  hints: [
    'Press the row operation. It clears the 2 under the first pivot.',
    'Then sweep: $U$ is triangular, so its stretches are its diagonal, 4 and 2.5.',
    'Its lines are $(1, 0)$ and $(2, -3)$, not $A$’s $(1, 1)$ and $(1, -2)$.',
  ],
  par: 3,
  onWin: S.p7Win,
  setup(p) {
    void p.g.stage.view2D({ center: [0.6, 0], height: 9.4, ms: 0 });
    const grid = p.grid({ main: 0.4, base: 0.1, axis: 0.6 });
    hideLandingLine(grid);
    grid.set(P3_A);
    // A's own lines, dashed, for comparison
    for (const l of eigenLines(P3_A)) {
      const L = new InfLine(p.g.stage, [0, 0, 0.002], v3(l.dir), { color: C.violet, width: 1.6, opacity: 0.35, dashed: true });
      p.add(L.object); p.onDispose(() => L.dispose());
      const nd = niceDir(l.dir);
      ptag(p, `A: ${fmtV(nd)} × ${fmtN(l.value)}`, v3(l.dir.map((t) => t * 3.4)), 'vi dim', [0, -14]);
    }
    const r = p.readout('Row reduced or not');
    r.row('a', 'stretches of $A$', '5 and 2', C.violet);
    r.row('u', 'stretches of $U$', '?', C.result);
    let hunt: LineHunt | null = null;
    let reduced = false, won = false;
    const box = h('div', { style: 'display:flex;flex-direction:column;gap:8px' });
    const reduce = async (fast = false) => {
      if (reduced) return;
      reduced = true;
      p.move();
      sfx.whoosh(1);
      await animate(fast ? 1 : 1200, (k) => grid.set(mlerp(P3_A, P7_U, k)), ease.inOut);
      grid.set(P7_U);
      sg(p, 0);
      r.row('m', '$U$, row-reduced', `$${texM(P7_U)}$`);
      hunt = new LineHunt(p, { M: P7_U, radius: 1.2, autoLock: true, typedStretch: false, tolDeg: 3, mount: box, title: 'Sweep U', onChange: () => check() });
      btn.disabled = true;
    };
    const check = () => {
      if (!hunt) return;
      if (hunt.rows.length) r.row('u', 'stretches of $U$', hunt.rows.map((x) => fmtN(x.line.value)).join(' and '), C.result);
      if (hunt.done && !won) { won = true; sg(p, 1); sfx.success(); hunt.say('Different lines, different stretches. Row operations change the move.', 'good'); p.win(); }
    };
    const btn = button('Row reduce: R₂ → R₂ − ½ R₁', () => void reduce(), { cls: 'primary small' });
    p.dock().append(h('div', { class: 'a7-row' }, btn), box);
    return {
      async showMe() { await reduce(); await wait(300); await hunt!.showMe(); },
      async solve() { await reduce(true); await hunt!.showMe(10); },
    };
  },
};

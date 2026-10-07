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
  P3_A, P5_A, P5_BLOCK_C, P5_TRI, P5_TRI_VALUES, P5_VALUES, P5_VECS, P6_CANDIDATES, P6_LINES, P6_V, P7_U, eigenLines, fmtN, fmtV, texSmall,
  lineAngleDeg, p6Won, texM, trace, turnDeg, type Lock,
} from './logic';
import { S } from './script';
import { hideLandingLine } from './puzzles';

const det3 = (M: Mat) => M[0][0] * (M[1][1] * M[2][2] - M[1][2] * M[2][1]) - M[0][1] * (M[1][0] * M[2][2] - M[1][2] * M[2][0]) + M[0][2] * (M[1][0] * M[2][1] - M[1][1] * M[2][0]);

// ------------------------------------------------------------------ p5 [H] [X8] · a 3 × 3 by hand

export const p5: PuzzleDef = {
  id: 'c18-p5',
  title: 'What are the stretches of a 3 × 3, by hand?',
  goal: 'No dial or sweep this time: find the stretches of a 3 × 3 matrix $A$ (in the readout) on paper. As with the dial, the stretches (the eigenvalues) are the λ where $\\det(A - \\lambda I) = 0$. Fill in the sheet: that equation, its roots, two checks, then an arrow on each line (an eigenvector). Each line appears in the picture once your answers are right. Last, a triangular matrix.',
  subgoals: ['The equation $\\det(A - \\lambda I) = 0$', 'Eigenvalues and eigenvectors', 'Check: sum (the trace) and product (the determinant)', 'A triangular matrix'],
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
    const BASE = 0.6;
    const parts = P5_VECS.map((v, i) => {
      const u = normalize(v);
      const line = new InfLine(p.g.stage, [0, 0, 0], u as V3, { color: C.violet, width: 2.2, opacity: 0.7, length: 7 });
      // green: an arrow on the line; yellow: where A sends it (λ times as long)
      const a = new Arrow([0, 0, 0], v3(u.map((x) => x * BASE)), { color: C.v, width: 0.05 });
      const img = new Arrow([0, 0, 0], v3(u.map((x) => x * BASE * P5_VALUES[i])), { color: C.result, width: 0.035, opacity: 0.85 });
      const tg = ptag(p, `λ = ${fmtN(P5_VALUES[i])} · ${fmtV(v)}`, v3(u.map((x) => x * BASE * P5_VALUES[i] + (P5_VALUES[i] < 0 ? -0.4 : 0.4) * x)), 'vi', [0, -16]);
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
      const tip = P5_VECS[i].map((x) => x / norm(P5_VECS[i]) * BASE);
      await animate(p.g.headless ? 1 : 700, (k) => q.img.setTo(v3(tip.map((x) => x * (1 + (P5_VALUES[i] - 1) * k)))), ease.out);
      sfx.snap();
    };
    const r = p.readout('By hand');
    r.row('A', '$A$', `$${texM(P5_A)}$`);
    // the triangular one waits until its own step opens
    r.row('U', 'the triangular one', `$${texM(P5_TRI)}$`);
    r.hideRow('U');
    // Cadet: LANTERN shows the trace and det A from the start, and the sum and product once the eigenvalues
    // are in. Navigator and Commander work the checks by hand: each pair shows only once its check is right.
    const cadet = p.difficulty === 'cadet';
    const shown = { tr: cadet, det: cadet, sum: false, prod: false };
    const SUM = P5_VALUES.reduce((a, b) => a + b, 0), PROD = P5_VALUES.reduce((a, b) => a * b, 1);
    const paint = () => {
      r.row('tr', 'trace of $A$ (sum down the diagonal)', shown.tr ? fmtN(trace(P5_A)) : '?');
      r.row('det', '$\\det A$', shown.det ? fmtN(det3(P5_A)) : '?');
      r.row('sum', 'sum of the eigenvalues', shown.sum ? fmtN(SUM) : '?', C.result);
      r.row('prod', 'product of the eigenvalues', shown.prod ? fmtN(PROD) : '?', C.result);
    };
    const showAll = () => { shown.tr = shown.det = shown.sum = shown.prod = true; paint(); };
    paint();
    const done = [false, false, false, false];
    const tick = (i: number) => { if (!done[i]) { done[i] = true; sg(p, i); } };
    // Two worksheets, so Commander's one check (a worksheet's last step) falls on the 3 × 3 itself, and the
    // triangular read-off is checked on its own. The first ends on the last eigenvector; the second opens
    // once it is right.
    const STEP = { c: 0, values: 1, tr: 2, det: 3, v5: 4, vm5: 5 };
    const steps = [
      { prompt: '$\\det(A - \\lambda I) = (2 - \\lambda)(\\lambda^2 + c)$: $c =$', answer: P5_BLOCK_C, mistakes: [[-9, 'Take away $4 \\cdot 4 = 16$ as well: $-9 - 16$.'], [7, 'The product of the diagonal is $(3)(-3) = -9$, then take away 16.']] as [number, string][] },
      { prompt: 'The eigenvalues, largest first', answer: P5_VALUES, mistakes: [[[5, 2, 5], '$\\lambda^2 = 25$ has two roots: 5 and −5.'], [[2, 5, -5], 'Largest first: 5, 2, −5.']] as [number[], string][] },
      { prompt: 'Check: $\\lambda_1 + \\lambda_2 + \\lambda_3$ (the trace)', answer: SUM },
      { prompt: 'Check: $\\lambda_1\\lambda_2\\lambda_3$ ($\\det A$)', answer: PROD, mistakes: [[50, 'One of the three is negative.']] as [number, string][] },
      { prompt: 'An eigenvector for $\\lambda = 5$ is $(0, 2, z)$: $z =$', answer: P5_VECS[0][2], mistakes: [[-4, 'That one solves for λ = −5. For λ = 5: $-2y + 4z = 0$.']] as [number, string][] },
      { prompt: 'An eigenvector for $\\lambda = -5$ is $(0, 1, z)$: $z =$', answer: P5_VECS[2][2], mistakes: [[2, '$A + 5I$ has the row $(0, 8, 4)$: $8 + 4z = 0$.']] as [number, string][] },
    ];
    let tri: StepWorksheet | null = null;
    const openTri = () => {
      if (tri) return tri;
      r.hideRow('U', false);
      p.setGoal('The 3 × 3 is done: its lines are in the picture. **Last:** the triangular matrix in the readout (zeros below the diagonal). Find its eigenvalues.');
      // the finished sheet folds to one line, so the new step has the dock (its answers live on in the readout and the picture)
      const summary = h('div', { class: 'a7-msg good', html: inline(`The 3 × 3: λ = ${P5_VALUES.map(fmtN).join(', ')}, each with its line. ✓`) });
      summary.style.display = 'none';
      p.dock().append(summary);
      if (!p.g.headless) window.setTimeout(() => { ws.el.style.display = 'none'; summary.style.display = ''; }, 1500);
      tri = new StepWorksheet(p, {
        steps: [{ prompt: 'The triangular one (readout): its eigenvalues, top to bottom', answer: P5_TRI_VALUES }],
        onDone: () => {
          tick(3);
          r.note('A triangular matrix: $\\det(A - \\lambda I)$ is the product down the diagonal, so its eigenvalues are its diagonal entries.');
          p.win();
        },
      });
      return tri;
    };
    const ws = new StepWorksheet(p, {
      steps,
      onDone: () => {
        void (async () => { for (const i of [1, 0, 2]) await reveal(i); })();
        showAll();
        tick(0); tick(1); tick(2);
        openTri();
      },
    });
    // keyed on each step's own row, not on how many rows are right (the steps can be done in any order)
    const watch = () => {
      const rows = ws.el.querySelectorAll('.ws-row');
      const ok = (i: number) => !!rows[i]?.classList.contains('ok');
      if (ok(STEP.c)) tick(0);
      if (ok(STEP.values)) { void reveal(1); if (cadet) { shown.sum = shown.prod = true; } }
      if (ok(STEP.tr)) shown.tr = shown.sum = true;
      if (ok(STEP.det)) shown.det = shown.prod = true;
      if (ok(STEP.tr) && ok(STEP.det)) tick(2);
      if (ok(STEP.v5)) void reveal(0);
      if (ok(STEP.vm5)) void reveal(2);
      if (ok(STEP.v5) && ok(STEP.vm5)) tick(1);
      paint();
    };
    ws.el.addEventListener('change', watch);
    ws.el.addEventListener('keyup', watch);
    ws.el.addEventListener('click', () => window.setTimeout(watch, 30));
    return {
      async showMe() {
        await ws.showMe(420); watch(); await openTri().showMe(420);
        if (!p.g.headless) {
          const why = h('div', { class: 'a7-msg good', html: inline('Why: $\\det(A - \\lambda I) = (2 - \\lambda)\\big((3 - \\lambda)(-3 - \\lambda) - 16\\big) = (2 - \\lambda)(\\lambda^2 - 25)$, so λ = 2, 5 or −5. Each λ’s line is where $A - \\lambda I$ sends arrows to zero.') });
          p.dock().append(why);
        }
      },
      solve() { ws.solve(); openTri().solve(); },
      wrong() { ws.wrong(); tri?.wrong(); },
    };
  },
};

// ------------------------------------------------------------------ p6 · Vell's lines

const P6_GOAL_PICK = 'Vell’s pulse is a 3 × 3 matrix, $V$. **Green** is your test arrow $\\mathbf x$; **yellow** is where $V$ sends it. Press an arrow under **Test** to try it. Most arrows come out **turned**. Find the arrows whose yellow lands **on the dashed line through green**, so yellow is λ times green. There are three such lines. For each, type λ.';
const P6_GOAL_TYPED = 'Vell’s pulse is a 3 × 3 matrix, $V$. **Type an arrow** $\\mathbf x$ (green) and press **Test**: yellow is where $V$ sends it. Most arrows come out **turned**. Find the arrows whose yellow lands **on the dashed line through green**, so yellow is λ times green. There are three such lines. For each, type λ.';

export const p6: PuzzleDef = {
  id: 'c18-p6',
  title: 'Which lines does Vell’s pulse keep?',
  goal: P6_GOAL_PICK,
  subgoals: ['Find the first line, and its λ', 'Find the second line, and its λ', 'Find the third line, and its λ'],
  hints: [
    'Yellow is on the dashed line when $V\\mathbf x$ is a number times $\\mathbf x$. Where $\\mathbf x$ has a 0, $V\\mathbf x$ must have a 0 too. Elsewhere, divide each entry of $V\\mathbf x$ by the matching entry of $\\mathbf x$: the ratios must agree, and that ratio is λ.',
    'Each row of $V$ adds up to 1: try $(1, 1, 1)$. Swapping the first two entries of $\\mathbf x$ swaps the first two of $V\\mathbf x$: try $(1, -1, 0)$. Then try $(1, 1, -2)$.',
    '$(1, 1, 1)$ with λ = 1, $(1, -1, 0)$ with λ = 0.5, and $(1, 1, -2)$ with λ = 0.2.',
  ],
  par: 10, // testing arrows is how this is solved: exploring must not cost stars
  view: '3d',
  onWin: S.p6Win,
  setup(p) {
    const d = p.difficulty;
    const typedMode = d === 'commander';
    if (typedMode) p.setGoal(P6_GOAL_TYPED);
    if (d === 'cadet') p.setGoal(P6_GOAL_PICK.replace('For each, type λ.', 'LANTERN reads off λ for each.'));
    const VIEW = { distance: 10, azimuth: -38, elevation: 22 };
    void p.g.stage.view3D({ target: [0, 0, 0], ...VIEW });
    const lat = new Lattice3D(p.g.stage, { extent: 2, opacity: 0.12 });
    p.add(lat);
    // green: the test arrow at its true length; yellow: V x; the dashed line through green is where yellow must land
    let x: Vec = [1, 0, 0];
    // yellow is thinner and labelled mid-shaft, so green still shows when the two coincide (λ = 1)
    const probe = new Arrow([0, 0, 0], v3(x), { color: C.v, width: 0.05, label: '$\\mathbf x$' });
    const img = new Arrow([0, 0, 0], v3(matVec(P6_V, x)), { color: C.result, width: 0.03, label: '$V\\mathbf x$', labelAt: 'mid' });
    const xLine = new InfLine(p.g.stage, [0, 0, 0], v3(x), { color: C.v, width: 1.4, opacity: 0.55, dashed: true });
    p.add(xLine.object, img, probe); p.onDispose(() => xLine.dispose());
    const shown: InfLine[] = [];
    const num = (t: number) => (Math.abs(t - Math.round(t)) < 1e-9 ? String(Math.round(t)) : t.toFixed(2)).replace(/^-/, '−');
    const texN = (t: number) => num(t).replace('−', '-');
    const texV = (v: readonly number[]) => `(${v.map(texN).join(',\\ ')})`;
    const r = p.readout('Green and yellow');
    r.row('V', '$V$', '$\\tfrac{1}{60}\\left[\\begin{smallmatrix} 37 & 7 & 16 \\\\ 7 & 37 & 16 \\\\ 16 & 16 & 28 \\end{smallmatrix}\\right]$');
    const locks: (Lock & { ok: boolean; line: number })[] = [];
    const paint = () => {
      const y = matVec(P6_V, x);
      const deg = turnDeg(P6_V, x);
      r.row('x', 'green: your arrow $\\mathbf x$', `(${x.map(num).join(', ')})`, C.v);
      r.row('y', 'yellow: $V\\mathbf x$', `(${y.map(num).join(', ')})`, C.result);
      // the link: 60 V has whole numbers, so V x is a whole-number arrow over 60
      r.eq(`V\\mathbf x = \\tfrac{1}{60}\\,(${y.map((t) => texN(t * 60)).join(',\\ ')})`);
      r.row('t', 'angle between green and yellow', `${Math.round(deg)}°`, deg < 0.5 ? C.violet : C.white);
      r.row('n', 'lines found', String(locks.filter((k) => k.ok).length));
    };
    const list = h('div', { class: 'a7-locks' });
    const log = h('div', { class: 'a7-log' });
    const msgEl = h('div', { class: 'a7-msg' });
    const msg = (t: string, k: '' | 'good' | 'bad' = '') => { msgEl.className = `a7-msg ${k}`; msgEl.innerHTML = inline(t); };
    let won = false;
    const winCheck = () => {
      const n = locks.filter((k) => k.ok).length;
      [0, 1, 2].forEach((i) => sg(p, i, n > i));
      paint();
      if (!won && p6Won(locks.filter((k) => k.ok))) { won = true; sfx.success(); msg('Three lines hold. Every other arrow with a part along (1, 1, 1) is turned towards that line. Arrows in the plane $x + y + z = 0$ stay in it.', 'good'); p.win(); }
    };
    /** Zoom out so a long typed arrow stays on screen (keeping the player's angle); back in when it fits. */
    const fit = (v: Vec) => {
      if (p.g.headless) return;
      const need = Math.max(VIEW.distance, 4.6 * Math.max(...v.map(Math.abs)));
      const cam = p.g.stage.camera.position;
      const dist = cam.length();
      if (Math.abs(need - dist) / dist < 0.08) return;
      void p.g.stage.view3D({ target: [0, 0, 0], distance: need, azimuth: (Math.atan2(cam.y, cam.x) * 180) / Math.PI, elevation: (Math.asin(cam.z / dist) * 180) / Math.PI, ms: 500 });
    };
    const test = async (dir: Vec, fast = false) => {
      if (norm(dir) < 1e-9) { msg('The zero arrow has no line. Try an arrow that is not zero.', 'bad'); sfx.miss(); return; }
      p.move();
      typed?.set(dir.slice());
      const x0 = x.slice(), y0 = matVec(P6_V, x0);
      x = dir.slice();
      const y = matVec(P6_V, x);
      xLine.set([0, 0, 0], v3(x));
      fit(x);
      await animate(fast ? 1 : 800, (k) => {
        probe.set([0, 0, 0], v3(x0.map((t, i) => t + (x[i] - t) * k)));
        img.set([0, 0, 0], v3(y0.map((t, i) => t + (y[i] - t) * k)));
      }, ease.inOut);
      paint();
      const lines = eigenLines(P6_V);
      const hit = lines.findIndex((l) => lineAngleDeg(l.dir, dir) < 0.5);
      const deg = turnDeg(P6_V, dir);
      // the log: every test, hit or miss, with its numbers
      log.prepend(h('div', { class: `a7-logrow ${hit >= 0 ? 'hit' : ''}`, html: inline(`$\\mathbf x = ${texV(x)}$ → $V\\mathbf x = ${texV(y.map((t) => Math.round(t * 100) / 100))}$ · ${hit >= 0 ? '**on the dashed line**' : `turned ${Math.round(deg)}°`}`) }));
      while (log.children.length > 4) log.lastElementChild?.remove();
      if (hit < 0) { sfx.miss(); msg(`Yellow is turned ${Math.round(deg)}° off the dashed line through green. $V$ turns this arrow, so its line does not hold.`, 'bad'); return; }
      if (locks.some((k) => k.line === hit)) { msg('That line is found already. Look for another.'); return; }
      const val = lines[hit].value;
      const lock = { dir: lines[hit].dir, stretch: d === 'cadet' ? val : NaN, ok: d === 'cadet', line: hit };
      locks.push(lock);
      const line = new InfLine(p.g.stage, [0, 0, 0], v3(lines[hit].dir), { color: C.violet, width: 2.2, opacity: 0.7, length: 6 });
      p.add(line.object); p.onDispose(() => line.dispose()); shown.push(line);
      const nd = niceDir(lines[hit].dir);
      const row = h('div', { class: `a7-lock ${lock.ok ? 'ok' : ''}` }, h('span', { class: 'd', html: inline(`line ${fmtV(nd)}`) }));
      const st = h('span', { class: 'st' }, lock.ok ? '✓' : '');
      if (d === 'cadet') row.append(h('span', { class: 's', html: inline(`$\\lambda = ${fmtN(val)}$`) }), st);
      else {
        const inp = h('input', { class: 'cell', inputmode: 'decimal', 'aria-label': `lambda along ${fmtV(nd)}`, placeholder: '?' }) as HTMLInputElement;
        const chk = () => {
          const v = parseNum(inp.value);
          if (v === null) return;
          p.move();
          lock.stretch = v; lock.ok = Math.abs(v - val) < (d === 'commander' ? 0.005 : 0.02);
          row.classList.toggle('ok', lock.ok); st.textContent = lock.ok ? '✓' : 'not this one';
          if (lock.ok) sfx.snap(); else sfx.miss();
          const left = 3 - locks.filter((k) => k.ok).length;
          if (lock.ok && left > 0) msg(`Right: along ${fmtV(nd)}, yellow is ${fmtN(v)} × green. ${left === 1 ? 'One line left.' : 'Two lines left.'}`, 'good');
          winCheck();
        };
        inp.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') chk(); });
        inp.addEventListener('change', chk);
        row.append(h('span', { class: 's', html: inline('yellow = $\\lambda$ × green, $\\lambda =$') }), inp, st);
        inputs.set(hit, inp);
        if (!fast) window.setTimeout(() => inp.focus(), 30);
      }
      list.append(row);
      sfx.snap();
      msg(d === 'cadet'
        ? `Yellow lands on the dashed line: $V$ leaves the line through ${fmtV(nd)} on itself, with λ = ${fmtN(val)}.`
        : 'Yellow lands on the dashed line: $V\\mathbf x$ is a number times $\\mathbf x$. Which number? Type it.', 'good');
      winCheck();
    };
    const inputs = new Map<number, HTMLInputElement>();
    const pick = h('div', { class: 'a7-btns' });
    let typed: VectorInput | null = null;
    if (typedMode) {
      typed = new VectorInput({ dim: 3, values: [1, 0, 0], label: '\\mathbf x =', step: 1, onSubmit: (v) => void test(v) });
      typed.el.classList.add('a7-in');
      pick.append(typed.el, button('Test this arrow', () => void test(typed!.get()), { cls: 'primary small' }));
    } else {
      pick.append(h('span', { class: 'k' }, 'Test:'), ...P6_CANDIDATES.map((c) => button(fmtV(c), () => void test(c), { cls: 'small' })));
    }
    p.dock().append(h('div', { class: 'a7-kick' }, 'Lines that hold'), pick, log, list, msgEl);
    paint();
    msg(typedMode
      ? 'Green is $(1, 0, 0)$; $V$ sends it off the dashed line. Type another arrow and press **Test**. Drag the picture to turn it.'
      : 'Green is $(1, 0, 0)$; $V$ sends it off the dashed line. Try the arrows under **Test**. Drag the picture to turn it.');
    const fill = () => {
      for (const k of locks) {
        const inp = inputs.get(k.line);
        if (!inp || k.ok) continue;
        inp.value = fmtN(Math.round(eigenLines(P6_V)[k.line].value * 100) / 100);
        inp.dispatchEvent(new Event('change'));
      }
    };
    // Show me runs the search a person would: two misses, the three hits, then the reason
    const reason = 'Why these three: each row of $V$ adds up to 1, so $V(1, 1, 1) = (1, 1, 1)$. Swapping the first two entries of $\\mathbf x$ swaps the first two of $V\\mathbf x$, so $V(1, -1, 0) = (0.5, -0.5, 0)$. And $V(1, 1, -2) = (0.2, 0.2, -0.4)$.';
    return {
      async showMe() {
        const ms = p.g.headless ? 1 : 1100;
        for (const dir of [[1, 0, 0], [1, 1, 0]]) { await test(dir); await wait(ms); }
        for (const [dir] of P6_LINES) { await test(dir); await wait(ms); }
        fill();
        if (!p.g.headless) msg(reason, 'good');
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
  goal: `A shortcut people try: row reduce first, then find the stretches. Does it work? The grid shows $A = ${texSmall(P3_A)}$, which keeps the two faint violet lines (stretches 5 and 2). **1.** Press **Row reduce**: $A$ becomes $U$. **2.** Turn green (your arrow) round; yellow is where $U$ sends it. A line of $U$ locks when yellow lands on the dashed line through green. Are they $A$’s lines?`,
  subgoals: ['Row reduce: $R_2 \\to R_2 - \\tfrac12 R_1$', 'Lock both lines of $U$'],
  hints: [
    'Press the row operation. It clears the 2 under the first pivot.',
    'Then turn green round: $U$ is triangular, so its stretches are its diagonal, 4 and 2.5.',
    'Its lines are $(1, 0)$ and $(2, -3)$, not $A$’s $(1, 1)$ and $(1, -2)$.',
  ],
  par: 6,
  onWin: S.p7Win,
  setup(p) {
    void p.g.stage.view2D({ center: [0.6, 0], height: 9.4, ms: 0 });
    const grid = p.grid({ main: 0.4, base: 0.1, axis: 0.6 });
    hideLandingLine(grid);
    grid.set(P3_A);
    // A's own lines, faint and dashed, for comparison
    for (const l of eigenLines(P3_A)) {
      const L = new InfLine(p.g.stage, [0, 0, 0.002], v3(l.dir), { color: C.violet, width: 1.6, opacity: 0.35, dashed: true });
      p.add(L.object); p.onDispose(() => L.dispose());
      const nd = niceDir(l.dir);
      // on the upper half of each line, between the goal card and the readout, clear of where U x lands
      const s = l.dir[1] >= 0 ? 2.4 : -2.4;
      ptag(p, `A keeps ${fmtV(nd)} × ${fmtN(l.value)}`, v3(l.dir.map((t) => t * s)), 'vi dim', [0, -14]);
    }
    const r = p.readout('Row reduced or not');
    r.row('a', 'stretches of $A$', '5 and 2', C.violet);
    r.row('u', 'stretches of $U$', '?', C.result);
    const num = (t: number) => (Math.abs(t - Math.round(t)) < 1e-9 ? String(Math.round(t)) : t.toFixed(2)).replace(/^-/, '−');
    let hunt: LineHunt | null = null;
    let reduced = false, won = false;
    const box = h('div', { style: 'display:flex;flex-direction:column;gap:8px' });
    const paint = () => {
      if (!hunt) return;
      // green, yellow, and the angle between them, as in the first puzzles
      r.row('x', 'green: your arrow $\\mathbf x$', `(${hunt.x.map(num).join(', ')})`, C.v);
      r.row('y', 'yellow: where $U$ sends it', `(${hunt.image.map(num).join(', ')})`, C.result);
      r.row('t', 'angle between green and yellow', `${Math.round(hunt.turn)}°`, hunt.turn <= 3 ? C.violet : C.white);
    };
    const reduce = async (fast = false) => {
      if (reduced) return;
      reduced = true;
      p.move();
      sfx.whoosh(1);
      await animate(fast ? 1 : 1200, (k) => grid.set(mlerp(P3_A, P7_U, k)), ease.inOut);
      grid.set(P7_U);
      sg(p, 0);
      r.row('m', '$U$, row reduced', `$${texM(P7_U)}$`);
      hunt = new LineHunt(p, { M: P7_U, radius: 1.2, autoLock: true, typedStretch: false, tolDeg: 3, mount: box, title: 'Lines of U', labels: { x: '$\\mathbf x$', mx: '$U\\mathbf x$' }, onChange: () => check() });
      btn.disabled = true;
      hunt.say('The grid now shows $U$. Drag green round and watch yellow.');
      paint();
    };
    const check = () => {
      if (!hunt) return;
      paint();
      if (hunt.rows.length) r.row('u', 'stretches of $U$', hunt.rows.map((x) => fmtN(x.line.value)).join(' and '), C.result);
      if (hunt.done && !won) { won = true; sg(p, 1); sfx.success(); hunt.say('Different lines, different stretches. Row operations change the matrix, so they change its stretches.', 'good'); p.win(); }
    };
    const btn = button('Row reduce: R₂ → R₂ − ½ R₁', () => void reduce(), { cls: 'primary small' });
    p.dock().append(h('div', { class: 'a7-row' }, btn), box);
    return {
      async showMe() {
        await reduce();
        await wait(500);
        // first, A's line (1, 1) under U: yellow is turned off it
        await hunt!.sweep.turnTo(Math.PI / 4, 900);
        hunt!.say(`Try $A$’s line $(1, 1)$: $U(1, 1) = (5, 2.5)$, not a multiple of $(1, 1)$. Yellow is turned ${Math.round(hunt!.turn)}° off the dashed line, so $U$ does not keep it.`, 'bad');
        await wait(2200);
        await hunt!.showMe();
        if (!p.g.headless) hunt!.say('Why: row reducing changed the matrix. $U$ is triangular, so its stretches are its diagonal, 4 and 2.5, along $(1, 0)$ and $(2, -3)$. $A$’s are 5 and 2.', 'good');
      },
      async solve() { await reduce(true); await hunt!.showMe(10); },
    };
  },
};

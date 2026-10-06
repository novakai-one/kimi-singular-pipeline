// Chapter 18 puzzles 1–4: the sweep finds the lines a stretch keeps (p1), the one line a shear keeps (p2),
// the λ dial flattens A − λI at each stretch (p3 [D]), and the routine pulse keeps no real line at all (p4).
import type { PuzzleCtx, PuzzleDef } from '../../../game/types';
import type { Grid2D } from '../../../gfx/grid';
import { Arrow } from '../../../gfx/arrow';
import { Parallelogram, InfLine, Outline2D } from '../../../gfx/shapes';
import { Sweep, rad } from '../../../kit/geom';
import { StepWorksheet, TileOrder } from '../../../kit/steps';
import { Slider, parseNum } from '../../../ui/widgets';
import { h, button, inline } from '../../../ui/ui';
import { C } from '../../../core/theme';
import { animate, ease, wait } from '../../../core/tween';
import { sfx } from '../../../audio/sfx';
import { answer } from '../../../game/caseboard';
import { Tpartial } from '../../truth';
import { det, identity, matMul, meq, type Mat } from '../../../math/la';
import { CardRail, LineHunt, PolyPlot, niceDir, ptag, v3, type RailCard, sg } from './parts';
import {
  P1_A, P2_A, P3_A, P3_ROOTS, P4_ANGLE, P4_CARDS, P4_D, P4_PRODUCT, P4_STRETCH, P4_SUM, P4_T, SWEEP_FULL, charAt, fmt2, fmtN,
  fmtV, nullLine, railProduct, rootsWon, shift, texSmall,
} from './logic';
import { S } from './script';

const tolDeg = (p: PuzzleCtx) => (p.difficulty === 'cadet' ? 3 : p.difficulty === 'navigator' ? 2 : 1);
const hunt = (p: PuzzleCtx, M: Mat, o: { radius?: number; title?: string; onChange?: () => void } = {}) => new LineHunt(p, {
  M, radius: o.radius ?? 1.25, tolDeg: tolDeg(p), mode: p.difficulty === 'commander' ? 'typed' : 'drag', autoLock: p.difficulty === 'cadet',
  typedStretch: p.difficulty !== 'cadet', stretchTol: p.difficulty === 'commander' ? 0.01 : 0.05, title: o.title, onChange: o.onChange,
});

/** The plain grid for the line hunts (the test arrow and its image do the talking). */
const quietGrid = (p: PuzzleCtx) => p.grid({ main: 0.32, base: 0, axis: 0.5 });

/** Grid2D draws a violet line where a flattened grid lands; here violet means "sent to the origin", so hide it. */
export function hideLandingLine(g: Grid2D): void {
  const set0 = g.set.bind(g);
  g.set = (M: Mat, T?: [number, number]) => { set0(M, T); g.mesh.children.forEach((c) => { c.visible = false; }); };
  g.mesh.children.forEach((c) => { c.visible = false; });
}

/** Readout rows shared by the hunts: how far the test arrow is turned, and the length ratio. */
function huntReadout(p: PuzzleCtx, hu: () => LineHunt, title: string, extra?: (r: ReturnType<PuzzleCtx['readout']>) => void) {
  const r = p.readout(title);
  const paint = () => {
    const x = hu();
    r.row('turn', 'turn from $\\mathbf x$ to $A\\mathbf x$', `${Math.round(x.turn)}°`, x.turn <= tolDeg(p) ? C.violet : C.white);
    if (p.difficulty !== 'commander') r.row('ratio', 'along the line of $\\mathbf x$: $A\\mathbf x$ is', `${fmt2(x.ratio)} × $\\mathbf x$`, C.result);
    r.row('locked', 'lines locked', String(x.rows.filter((k) => k.ok).length));
    extra?.(r);
  };
  return { r, paint };
}

// ------------------------------------------------------------------ p1 · an old friend

export const p1: PuzzleDef = {
  id: 'c18-p1',
  title: 'Which arrows does this move leave on their own line?',
  goal: 'Turn the green test arrow $\\mathbf x$ round the circle; its image $A\\mathbf x$ is yellow. **Lock** each line where $A\\mathbf x$ lands on the line of $\\mathbf x$, and give its stretch: how many times $\\mathbf x$ fits into $A\\mathbf x$.',
  subgoals: ['Lock the first line and its stretch', 'Lock the second line and its stretch'],
  predict: {
    prompt: 'The move stretches the grid: its arrows land at $(2, 1)$ and $(1, 2)$. How many lines through the origin does it leave on themselves?',
    choices: [{ id: 'none', text: 'None: every line turns' }, { id: 'one', text: 'One' }, { id: 'two', text: 'Two' }, { id: 'all', text: 'Every line' }],
    answer: 'two',
    reveal: 'Two lines hold. Every other arrow is turned towards the more stretched line. Find both: turn $\\mathbf x$ until $A\\mathbf x$ stays on the line of $\\mathbf x$.',
  },
  hints: [
    'Watch the small arc between $\\mathbf x$ and $A\\mathbf x$. It closes when $A\\mathbf x$ lands on the line of $\\mathbf x$.',
    'One line is a diagonal. Try $\\mathbf x$ pointing up and to the right at 45°: $A(1, 1) = (3, 3)$.',
    'Lock $(1, 1)$ with stretch 3 and $(1, -1)$ with stretch 1: $A(1, -1) = (1, -1)$.',
  ],
  par: 4,
  onWin: S.p1Win,
  setup(p) {
    void p.g.stage.view2D({ center: [0.6, 1.2], height: 11, ms: 0 });
    quietGrid(p);
    let won = false;
    const check = () => {
      paint();
      const n = h1.rows.filter((r) => r.ok).length;
      sg(p, 0, n >= 1);
      sg(p, 1, n >= 2);
      if (h1.done && !won) { won = true; sfx.success(); h1.say('Both lines locked. Every other arrow turns.', 'good'); p.win(); }
    };
    const h1: LineHunt = hunt(p, P1_A, { radius: 1.05, title: 'Lines that hold', onChange: () => check() });
    const { paint } = huntReadout(p, () => h1, 'The test arrow');
    paint();
    if (p.difficulty === 'commander') h1.say('Type an arrow and test it. The circle shows where it goes.');
    return {
      async showMe() { await h1.showMe(); },
      async solve() { await h1.showMe(10); },
      wrong() { h1.lock([1, 0]); },
    };
  },
};

// ------------------------------------------------------------------ p2 · a shear

export const p2: PuzzleDef = {
  id: 'c18-p2',
  title: 'How many lines does a shear keep?',
  goal: 'Sweep the test arrow **all the way round** (the faint yellow trace records every image). Lock every line the shear keeps, with its stretch.',
  subgoals: ['Sweep the whole circle', 'Lock every line that holds, with its stretch'],
  predict: {
    prompt: 'The stretch kept two lines. How many will the shear $\\begin{bmatrix} 1 & 1 \\\\ 0 & 1 \\end{bmatrix}$ keep?',
    choices: [{ id: 'none', text: 'None' }, { id: 'one', text: 'One' }, { id: 'two', text: 'Two' }],
    answer: 'one',
    reveal: 'One. The shear slides every row of the grid sideways, so only the first axis stays on itself. The full sweep is the evidence that there is no second line.',
  },
  hints: [
    '**Sweep once** turns the arrow round the whole circle for you.',
    'The first grid axis does not move under a shear: $A(1, 0) = (1, 0)$.',
    'Lock $(1, 0)$ with stretch 1, and sweep the whole circle to show there is no other line.',
  ],
  par: 3,
  onWin: S.p2Win,
  setup(p) {
    void p.g.stage.view2D({ center: [0.5, 0.9], height: 8.8, ms: 0 });
    quietGrid(p);
    let won = false;
    const check = () => {
      paint();
      const swept = h2.sweep.coverage >= SWEEP_FULL;
      sg(p, 0, swept);
      sg(p, 1, h2.done);
      if (swept && h2.done && !won) { won = true; sfx.success(); h2.say('One line, and the whole circle swept. There is no second line.', 'good'); p.win(); }
    };
    const h2: LineHunt = hunt(p, P2_A, { radius: 1.3, title: 'Lines that hold', onChange: () => check() });
    const { paint } = huntReadout(p, () => h2, 'The test arrow', (r) => r.row('cov', 'circle swept', `${Math.round(h2.sweep.coverage * 100)}%`, h2.sweep.coverage >= SWEEP_FULL ? C.good : C.white));
    paint();
    p.tick(() => { if (!won) paint(); });
    if (p.difficulty === 'commander') {
      // typed arrows do not sweep; give the full turn its own button
      h2.el.querySelector('.a7-row')?.append(button('Sweep once', () => { p.move(); void h2.sweep.animateSweep(6000).then(check); }, { cls: 'small ghost' }));
    }
    return {
      async showMe() { await h2.sweep.animateSweep(p.g.headless ? 40 : 5000); await h2.showMe(); check(); },
      async solve() { await h2.sweep.animateSweep(40); await h2.showMe(10); check(); },
      wrong() { h2.lock([1, 1]); },
    };
  },
};

// ------------------------------------------------------------------ p3 [D] · the λ dial

/** The commander's derivation tiles (the reason, in order). */
export const P3_TILES = [
  { id: 'a', text: '$A\\mathbf v = \\lambda\\mathbf v$ for an arrow $\\mathbf v \\neq \\mathbf 0$' },
  { id: 'b', text: '$A\\mathbf v - \\lambda I\\mathbf v = \\mathbf 0$, so $(A - \\lambda I)\\mathbf v = \\mathbf 0$' },
  { id: 'c', text: '$A - \\lambda I$ sends a non-zero arrow to the origin, so it flattens space' },
  { id: 'd', text: 'A move that flattens space has determinant 0: $\\det(A - \\lambda I) = 0$' },
];
export const P3_DECOYS = [{ id: 'x', text: '$\\det A = \\lambda$' }];
export const P3_ORDER = ['a', 'b', 'c', 'd'];

export const p3: PuzzleDef = {
  id: 'c18-p3',
  title: 'For which stretches does A − λI flatten the grid?',
  goal: 'The grid shows $A - \\lambda I$ for the λ on the dial. Stop the dial where the grid goes **flat**, and lock each one: its violet line is the arrows that $A$ only stretches by λ.',
  subgoals: ['Stop where the grid goes flat', 'Stop where it goes flat again', 'Where the formula comes from'],
  predict: {
    prompt: '$A = \\begin{bmatrix} 4 & 1 \\\\ 2 & 3 \\end{bmatrix}$. Its stretches add up to the numbers down the diagonal. What do they add up to?',
    choices: [{ id: '7', text: '7' }, { id: '10', text: '10' }, { id: '5', text: '5' }],
    answer: '7',
    reveal: '$4 + 3 = 7$, and the stretches are 5 and 2. The dial finds them as the places where $A - \\lambda I$ flattens.',
  },
  hints: [
    'Watch the yellow square: it is what $A - \\lambda I$ does to one grid square. When it has no area, the grid is flat.',
    'The plot under the dial is $\\det(A - \\lambda I) = (4 - \\lambda)(3 - \\lambda) - 2 = \\lambda^2 - 7\\lambda + 10$. It crosses zero twice.',
    'Stop at $\\lambda = 5$ (line $(1, 1)$) and at $\\lambda = 2$ (line $(1, -2)$).',
  ],
  par: 4,
  onWin: S.p3Win,
  setup(p) {
    const d = p.difficulty;
    void p.g.stage.view2D({ center: [-1.9, 0.2], height: 9.4, ms: 0 });
    const grid = p.grid({ main: 0.55, base: 0.14, axis: 0.7 });
    hideLandingLine(grid);
    let l = 3.5;
    const sq = new Parallelogram(p.g.stage, [1, 0, 0], [0, 1, 0], { color: C.result, opacity: 0.2 });
    const c1 = new Arrow([0, 0, 0.01], [1, 0, 0.01], { color: C.v, width: 0.045 });
    const c2 = new Arrow([0, 0, 0.01], [0, 1, 0.01], { color: C.w, width: 0.045 });
    p.add(sq, c1, c2);
    const lines: InfLine[] = [];
    const lockTags: ReturnType<typeof ptag>[] = [];
    const live = new InfLine(p.g.stage, [0, 0, 0.004], [1, 1, 0], { color: C.violet, width: 3, opacity: 0 });
    p.add(live.object); p.onDispose(() => live.dispose());
    const r = p.readout('The dial');
    const plot = new PolyPlot({ lo: -1, hi: 8, ymin: -4, ymax: 14, fn: (x) => charAt(P3_A, x), label: 'det(A − λI)', ticks: [0, 2, 4, 6, 8] });
    const stops: number[] = [];
    const tol = 1e-6;
    let derived = d === 'cadet';
    const done = [false, false, false];
    const tick = (i: number) => { if (!done[i]) { done[i] = true; sg(p, i); } };
    let won = false;
    const winCheck = () => {
      if (stops.length >= 1) tick(0);
      if (stops.length >= 2) tick(1);
      if (derived) tick(2);
      if (!won && rootsWon(stops) && derived) { won = true; sfx.success(); msg('Flat at λ = 5 and at λ = 2: the stretches. Their violet lines are the lines that hold.', 'good'); p.win(); }
    };
    const msgEl = h('div', { class: 'a7-msg' });
    const msg = (t: string, k: '' | 'good' | 'bad' = '') => { msgEl.className = `a7-msg ${k}`; msgEl.innerHTML = inline(t); };
    const paint = () => {
      const S0 = shift(P3_A, l);
      grid.set(S0);
      sq.set([S0[0][0], S0[1][0], 0], [S0[0][1], S0[1][1], 0]);
      c1.setTo([S0[0][0], S0[1][0], 0.01]); c2.setTo([S0[0][1], S0[1][1], 0.01]);
      const dt = det(S0);
      const flat = Math.abs(dt) <= tol;
      const nl = flat ? nullLine(P3_A, l) : null;
      live.line.setOpacity(nl ? 0.95 : 0);
      if (nl) live.set([0, 0, 0.004], v3(nl));
      plot.at(l);
      r.row('l', 'λ', fmtN(l), C.accent);
      r.row('m', '$A - \\lambda I$', `$${texSmall(S0.map((row) => row.map((x) => Math.round(x * 100) / 100)))}$`);
      r.row('d', 'area scale $\\det(A - \\lambda I)$', fmt2(dt), flat ? C.violet : C.result);
    };
    const lockAt = (x: number, quiet = false) => {
      if (Math.abs(charAt(P3_A, x)) > tol) {
        if (!quiet) { sfx.miss(); msg(`At λ = ${fmtN(x)} the yellow square still has area ${fmt2(charAt(P3_A, x))}. The grid is not flat.`, 'bad'); p.bark('lantern', `Area scale ${fmt2(charAt(P3_A, x))} at λ = ${fmtN(x)}. Not flat.`); }
        return;
      }
      if (stops.some((s) => Math.abs(s - x) < 1e-9)) return;
      stops.push(x);
      plot.mark(x);
      const nl = nullLine(P3_A, x)!;
      const L = new InfLine(p.g.stage, [0, 0, 0.003], v3(nl), { color: C.violet, width: 2.2, opacity: 0.55, dashed: true });
      p.add(L.object); p.onDispose(() => L.dispose()); lines.push(L);
      const nd = niceDir(nl);
      const tg = ptag(p, `λ = ${fmtN(x)} · ${fmtV(nd)}`, v3([nd[0] * 2.6 / Math.hypot(nd[0], nd[1]), nd[1] * 2.6 / Math.hypot(nd[0], nd[1])]), 'vi', [0, -18]);
      lockTags.push(tg);
      sfx.collapse();
      p.g.stage.nudge(0.06);
      msg(`Flat at λ = ${fmtN(x)}. $A$ stretches every arrow on the line ${fmtV(nd)} by ${fmtN(x)}.`, 'good');
      if (d === 'cadet' && stops.length === 2) r.note('$A\\mathbf v = \\lambda\\mathbf v$ means $(A - \\lambda I)\\mathbf v = \\mathbf 0$: a non-zero arrow lands on the origin, so $A - \\lambda I$ flattens and $\\det(A - \\lambda I) = 0$.');
      winCheck();
    };
    const step = d === 'cadet' ? 0.5 : d === 'navigator' ? 0.25 : 0.05;
    const slider = new Slider({ label: 'dial $\\lambda$', min: -1, max: 8, step, value: l, format: (x) => fmtN(x), onInput: (x) => { l = x; paint(); if (d === 'cadet') lockAt(l, true); } });
    const lockBtn = button('Lock λ', () => { p.move(); lockAt(l); }, { cls: 'primary small' });
    r.el.append(plot.el);
    p.dock().append(h('div', { class: 'a7-row' }, slider.el, d === 'cadet' ? null : lockBtn), msgEl);
    slider.el.addEventListener('change', () => p.move());
    // the derivation, by level (GDD §7.1): cadet watches, navigator types the steps, commander orders the reason first
    let ws: StepWorksheet | null = null, tiles: TileOrder | null = null, last: StepWorksheet | null = null;
    const submitTiles = (o: string[]) => {
      p.move();
      if (o.join() !== P3_ORDER.join()) { sfx.miss(); msg('Not in that order. Start from what a line that holds means: $A\\mathbf v = \\lambda\\mathbf v$.', 'bad'); return; }
      sfx.snap();
      msg('Right. Now the last line: solve $\\det(A - \\lambda I) = 0$.', 'good');
      if (!last) last = new StepWorksheet(p, { title: 'The last line · only the answer is checked', steps: [{ prompt: 'Solve $\\lambda^2 - 7\\lambda + 10 = 0$: the roots, larger first', answer: P3_ROOTS }], mount: box, onDone: () => { derived = true; winCheck(); } });
    };
    const steps = [
      { prompt: '$(4 - \\lambda)(3 - \\lambda) - 2 = \\lambda^2 + b\\lambda + c$: $b =$', answer: -7, mistakes: [[7, 'Multiply out: the λ terms are $-4\\lambda - 3\\lambda$.']] as [number, string][] },
      { prompt: '$c =$', answer: 10, mistakes: [[12, 'Take away the off-diagonal product $1 \\cdot 2 = 2$.']] as [number, string][] },
      { prompt: 'The larger root', answer: P3_ROOTS[0] },
      { prompt: 'The smaller root', answer: P3_ROOTS[1] },
      { prompt: '$A - 5I$ sends $(1, y)$ to the origin: $y =$', answer: 1 },
      { prompt: '$A - 2I$ sends $(1, y)$ to the origin: $y =$', answer: -2, mistakes: [[2, '$A - 2I = \\begin{bmatrix} 2 & 1 \\\\ 2 & 1 \\end{bmatrix}$: $2 + y = 0$.']] as [number, string][] },
    ];
    const box = h('div', { class: 'a7-deriv', style: 'display:flex;flex-direction:column;gap:8px' });
    if (d === 'navigator') {
      ws = new StepWorksheet(p, { title: 'Where the formula comes from · each step is checked', steps, mount: box, onDone: () => { derived = true; winCheck(); } });
    } else if (d === 'commander') {
      tiles = new TileOrder(p, { tiles: P3_TILES, decoys: P3_DECOYS, mount: box, title: 'Why the stretches make A − λI flatten: put the reason in order', submitLabel: 'Check the order', onSubmit: (o) => submitTiles(o) });
    }
    if (ws || tiles) p.dock().append(box);
    paint();
    const goTo = async (x: number, ms: number) => {
      const x0 = l;
      await animate(ms, (k) => { l = x0 + (x - x0) * k; slider.set(Math.round(l / step) * step, false); paint(); }, ease.inOut);
      l = x; slider.set(x, false); paint();
    };
    const finishDerivation = async (fast: boolean) => {
      if (ws) { if (fast) ws.solve(); else await ws.showMe(350); }
      if (tiles) {
        tiles.set(P3_ORDER);
        submitTiles(P3_ORDER);
        const lw = last as StepWorksheet | null;
        if (lw) { if (fast) lw.solve(); else await lw.showMe(300); }
      }
    };
    return {
      async showMe() {
        for (const x of P3_ROOTS) { await goTo(x, 1300); lockAt(x); await wait(400); }
        await finishDerivation(false);
      },
      async solve() { for (const x of P3_ROOTS) { l = x; slider.set(x, false); paint(); lockAt(x); } await finishDerivation(true); },
      wrong() { l = 4; slider.set(4, false); paint(); lockAt(4); },
    };
  },
};

// ------------------------------------------------------------------ p4 · no line at all

const PLATE: [number, number][] = [[0, 0], [1, 0], [1, 0.4], [0.4, 0.4], [0.4, 1], [0, 1]];
const T_CARD: RailCard = { id: 'T', name: 'routine pulse', M: P4_T };

export const p4: PuzzleDef = {
  id: 'c18-p4',
  title: 'Which lines does the routine pulse keep?',
  goal: '**1.** Sweep the routine pulse all the way round and watch for a line that holds.',
  subgoals: ['Sweep the routine pulse: no line holds', 'Build $D$ as a turn and a stretch', 'Check the sum and the product of its λ', 'Four routine pulses on the rail'],
  hints: [
    'Press **Sweep once**. Nothing lights up: $A\\mathbf x$ is never on the line of $\\mathbf x$. The plot $\\lambda^2 + 1$ never reaches zero either.',
    '$D = \\begin{bmatrix} 1 & -1 \\\\ 1 & 1 \\end{bmatrix}$ sends $(1, 0)$ to $(1, 1)$: turned 45° and 1.41 long. Put **turn 45°** and **stretch × 1.41** on the rail.',
    'For $\\lambda = 1 \\pm i$: the sum is 2 and the product is $(1 + i)(1 - i) = 1 + 1 = 2$. Then put the routine pulse on the rail four times.',
  ],
  par: 8,
  onWin: S.p4Win,
  setup(p) {
    const d = p.difficulty;
    void p.g.stage.view2D({ center: [0.4, 0.2], height: 8.4, ms: 0 });
    const grid = p.grid({ main: 0.22, base: 0, axis: 0.45 });
    const done = [false, false, false, false];
    const tick = (i: number) => { if (!done[i]) { done[i] = true; sg(p, i); } };
    const r = p.readout('The routine pulse');
    const msgEl = h('div', { class: 'a7-msg' });
    const msg = (t: string, k: '' | 'good' | 'bad' = '') => { msgEl.className = `a7-msg ${k}`; msgEl.innerHTML = inline(t); };
    const stageEl = h('div', { style: 'display:flex;flex-direction:column;gap:8px' });
    p.dock().append(stageEl, msgEl);
    let won = false;
    let stage: 'A' | 'B' | 'C' = 'A';

    // ---- stage A: the sweep finds nothing, the plot never touches zero
    const sw = new Sweep(p, { M: P4_T, radius: 1.1, start: rad(30), labels: { x: '$\\mathbf x$', mx: '$T\\mathbf x$' } });
    const plot = new PolyPlot({ lo: -3, hi: 3, ymin: -1, ymax: 10, fn: (x) => charAt(P4_T, x), label: 'det(T − λI) = λ² + 1', ticks: [-2, -1, 0, 1, 2] });
    plot.at(0);
    const paintA = () => {
      r.row('m', '$T$', `$${texSmall(P4_T)}$`);
      r.row('cov', 'circle swept', `${Math.round(sw.coverage * 100)}%`, sw.coverage >= SWEEP_FULL ? C.good : C.white);
      r.row('found', 'lines that hold', sw.coverage >= SWEEP_FULL ? 'none' : sw.found.size ? String(sw.found.size) : '·', sw.coverage >= SWEEP_FULL ? C.orange : C.white);
    };
    const doneA = () => {
      if (done[0]) return;
      tick(0);
      r.note('$\\det(T - \\lambda I) = \\lambda^2 + 1$ is never 0 for a real λ, so no real stretch flattens $T - \\lambda I$. Its roots are $\\lambda = \\pm i$, with $i^2 = -1$.');
      msg('No line holds, and the plot never touches zero. The roots of $\\lambda^2 + 1 = 0$ are $\\pm i$: not on the real dial.', 'good');
      window.setTimeout(() => void startB(), p.g.headless ? 0 : 900);
    };
    p.tick(() => { if (!done[0]) { paintA(); if (sw.coverage >= SWEEP_FULL) doneA(); } });
    stageEl.append(plot.el, h('div', { class: 'a7-row' }, button('Sweep once', () => { p.move(); void sw.animateSweep(5600); }, { cls: 'primary small' }), h('span', { class: 'k' }, 'or drag the green arrow round')));
    paintA();

    // ---- stage B: D = turn 45° then stretch 1.41; check the sum and product of its λ
    const sq = new Parallelogram(p.g.stage, [1, 0, 0], [0, 1, 0], { color: C.result, opacity: 0.16 });
    const e1 = new Arrow([0, 0, 0.01], [1, 0, 0.01], { color: C.v, width: 0.045, label: '$D\\mathbf e_1$' });
    const e2 = new Arrow([0, 0, 0.01], [0, 1, 0.01], { color: C.w, width: 0.045, label: '$D\\mathbf e_2$' });
    const plate = new Outline2D(p.g.stage, PLATE, { color: C.white, opacity: 0.12 });
    const home = new Outline2D(p.g.stage, PLATE, { color: '#7d8aa5', opacity: 0.05 });
    p.add(home, plate, sq, e1, e2);
    for (const o of [sq.group, e1.group, e2.group, plate.group, home.group]) o.visible = false;
    const showM = (M: Mat) => {
      grid.set(M);
      sq.set([M[0][0], M[1][0], 0], [M[0][1], M[1][1], 0]);
      e1.setTo([M[0][0], M[1][0], 0.01]); e2.setTo([M[0][1], M[1][1], 0.01]);
      plate.set(M);
    };
    let rail: CardRail | null = null;
    let sumIn: HTMLInputElement | null = null, prodIn: HTMLInputElement | null = null, rIn: HTMLInputElement | null = null, aIn: HTMLInputElement | null = null;
    const checksBox = h('div', { class: 'a7-checks' });
    const num = (label: string, aria: string) => {
      const inp = h('input', { class: 'cell a7-num', inputmode: 'decimal', 'aria-label': aria, placeholder: '?' }) as HTMLInputElement;
      inp.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') checkC(); });
      inp.addEventListener('change', () => checkC());
      checksBox.append(h('label', { class: 'a7-row' }, h('span', { html: inline(label) }), inp));
      return inp;
    };
    const near = (inp: HTMLInputElement | null, v: number, t: number) => { const x = inp ? parseNum(inp.value) : null; return x !== null && Math.abs(x - v) <= t; };
    const checkC = () => {
      if (done[2] || !done[1]) return;
      const ok = near(sumIn, P4_SUM, 1e-6) && near(prodIn, P4_PRODUCT, 1e-6) && (d !== 'commander' || (near(rIn, P4_STRETCH, 0.01) && near(aIn, P4_ANGLE, 0.5)));
      const filled = [sumIn, prodIn, rIn, aIn].filter(Boolean).every((x) => x!.value.trim() !== '');
      if (!filled) return;
      p.move();
      if (!ok) { sfx.miss(); msg('Not yet. For $\\lambda = 1 \\pm i$: add the two (the $i$ parts cancel), and multiply them using $i^2 = -1$.', 'bad'); return; }
      tick(2);
      sfx.snap();
      msg('Sum 2: the numbers down the diagonal, $1 + 1$. Product 2: the determinant, $1 \\cdot 1 - (-1) \\cdot 1$.', 'good');
      window.setTimeout(() => startC(), p.g.headless ? 0 : 700);
    };
    const startB = async () => {
      if (stage !== 'A') return;
      stage = 'B';
      sw.show(false);
      for (const o of [sq.group, e1.group, e2.group, plate.group, home.group]) o.visible = true;
      showM(identity(2));
      grid.setLook({ main: 0.5, base: 0.12 });
      p.setGoal('**2.** A move whose λ are $1 \\pm i$: $D = \\begin{bmatrix} 1 & -1 \\\\ 1 & 1 \\end{bmatrix}$. Build it on the rail from a turn and a stretch. **3.** Check what its two λ add and multiply to.');
      r.row('m', '$D$', `$${texSmall(P4_D)}$`);
      r.row('cov', 'its λ', '$1 + i$ and $1 - i$', C.violet);
      r.row('found', 'the rail makes', `$${texSmall(identity(2))}$`);
      r.note(null);
      rail = new CardRail({
        palette: P4_CARDS, max: 4, title: 'Cards: click one to put it on the rail',
        onChange: (cs) => {
          const M = railProduct(cs.slice().reverse().map((c) => c.M));
          showM(M);
          r.row('found', 'the rail makes', `$${texSmall(M.map((row) => row.map((x) => Math.round(x * 100) / 100)))}$`, meq(M, P4_D, 1e-9) ? C.good : C.white);
          if (meq(M, P4_D, 1e-9) && !done[1]) {
            tick(1); sfx.success();
            msg('$D$ is a turn of 45° and a stretch by 1.41 = $\\sqrt 2$: the angle and the size of $1 + i$.', 'good');
            if (d === 'cadet') { sumIn!.value = String(P4_SUM); prodIn!.value = String(P4_PRODUCT); window.setTimeout(checkC, p.g.headless ? 0 : 600); }
          }
        },
      });
      sumIn = num('$\\lambda_1 + \\lambda_2 =$', 'sum of the two lambdas');
      prodIn = num('$\\lambda_1 \\lambda_2 =$', 'product of the two lambdas');
      if (d === 'commander') { rIn = num('size of $1 + i$: $|\\lambda| =$', 'size of lambda'); aIn = num('its angle in degrees:', 'angle of lambda'); }
      stageEl.replaceChildren(rail.el, h('div', { class: 'a7-kick' }, 'Check, for $\\lambda = 1 \\pm i$'), checksBox);
      msg('');
    };

    // ---- stage C: four routine pulses fuse to I
    let railC: CardRail | null = null;
    const playFour = async (fast = false) => {
      if (!railC) return;
      const cards = railC.acting;
      if (!cards.length) return;
      p.move();
      railC.locked = true;
      let M = identity(2);
      for (let i = 0; i < cards.length; i++) {
        railC.playing(i);
        const M0 = M;
        if (!fast) sfx.whoosh(0.9);
        await animate(fast ? 1 : 900, (k) => showM(matMul(Tpartial((k * Math.PI) / 2), M0)), ease.inOut);
        M = matMul(cards[i].M, M0);
        showM(M);
        if (!fast) await wait(150);
      }
      railC.playing(-1);
      railC.locked = false;
      const home4 = cards.length === 4 && meq(M, identity(2), 1e-9);
      r.row('found', 'the rail makes', `$${texSmall(M.map((row) => row.map((x) => Math.round(x * 100) / 100)))}$`, home4 ? C.good : C.white);
      if (home4 && !won) {
        tick(3); won = true;
        sfx.success();
        msg('Four routine pulses make $I$: every point is home. In the slanted grid each pulse is a quarter turn, and $i^4 = 1$.', 'good');
        answer('fourth', 'The routine pulse keeps no real line: $\\lambda^2 + 1 = 0$ gives $\\lambda = \\pm i$. In its own slanted grid it is a quarter turn, and four quarter turns are a full turn: $T^4 = I$, because $i^4 = 1$.', 'c18');
        p.g.toast('Why does every fourth pulse bring the ground layer home?', 'Case board · answered');
        p.win();
      } else if (!home4) {
        sfx.miss();
        msg(`${cards.length} routine pulse${cards.length === 1 ? '' : 's'}: the plate is not home. Each pulse is a quarter turn in its own grid.`, 'bad');
      }
    };
    const startC = () => {
      if (stage !== 'B') return;
      stage = 'C';
      p.setGoal('**4.** Put the routine pulse on the rail until it brings the plate home, then **Play**.');
      r.row('m', '$T$', `$${texSmall(P4_T)}$`);
      r.row('cov', 'its λ', '$i$ and $-i$', C.violet);
      e1.setLabel('$\\mathbf e_1$ lands'); e2.setLabel('$\\mathbf e_2$ lands');
      showM(identity(2));
      railC = new CardRail({ palette: [T_CARD], max: 6, title: 'The routine pulse: click it to add one more', onChange: () => { if (!railC?.locked) showM(identity(2)); } });
      stageEl.replaceChildren(railC.el, h('div', { class: 'a7-row' }, button('Play the rail', () => void playFour(), { cls: 'primary small' })));
      msg('');
    };
    return {
      async showMe() {
        if (!done[0]) await sw.animateSweep(p.g.headless ? 40 : 4000);
        doneA();
        await startB();
        await wait(p.g.headless ? 5 : 600);
        if (!done[1]) rail!.set([P4_CARDS[2], P4_CARDS[0]]);
        await wait(p.g.headless ? 5 : 700);
        if (!done[2]) { sumIn!.value = String(P4_SUM); prodIn!.value = String(P4_PRODUCT); if (rIn) rIn.value = '1.41'; if (aIn) aIn.value = '45'; checkC(); }
        startC();
        railC!.set([T_CARD, T_CARD, T_CARD, T_CARD]);
        await playFour(p.g.headless);
      },
      async solve() {
        await sw.animateSweep(40);
        doneA();
        await startB();
        rail!.set([P4_CARDS[2], P4_CARDS[0]]);
        sumIn!.value = String(P4_SUM); prodIn!.value = String(P4_PRODUCT); if (rIn) rIn.value = '1.41'; if (aIn) aIn.value = '45';
        checkC();
        startC();
        railC!.set([T_CARD, T_CARD, T_CARD, T_CARD]);
        await playFour(true);
      },
      async wrong() {
        await sw.animateSweep(40);
        doneA();
        await startB();
        rail!.set([P4_CARDS[2], P4_CARDS[0]]);
        sumIn!.value = String(P4_SUM); prodIn!.value = String(P4_PRODUCT); if (rIn) rIn.value = '1.41'; if (aIn) aIn.value = '45';
        checkC();
        startC();
        railC!.set([T_CARD, T_CARD]);
        await playFour(true);
      },
    };
  },
};

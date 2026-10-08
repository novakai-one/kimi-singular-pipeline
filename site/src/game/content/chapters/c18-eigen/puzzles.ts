// Chapter 18 puzzles 2–4 (p1 is the trajectory problem, traj-puzzles.ts): the one line a shear keeps (p2),
// the λ dial flattens A − λI at each stretch (p3 [D]), and the routine pulse keeps no real line at all (p4).
import type { PuzzleCtx, PuzzleDef } from '../../../game/types';
import type { Grid2D } from '../../../gfx/grid';
import { Parallelogram, InfLine, Outline2D } from '../../../gfx/shapes';
import { Sweep } from '../../../kit/geom';
import { StepWorksheet, TileOrder } from '../../../kit/steps';
import { parseNum } from '../../../ui/widgets';
import { h, button, inline } from '../../../ui/ui';
import { C } from '../../../core/theme';
import { animate, ease, wait } from '../../../core/tween';
import { sfx } from '../../../audio/sfx';
import { answer } from '../../../game/caseboard';
import { Tpartial } from '../../truth';
import { det, identity, matMul, matVec, meq, type Mat } from '../../../math/la';
import { CardRail, LineHunt, PolyPlot, niceDir, ptag, v3, type RailCard, sg, fslider } from './parts';
import {
  P2_A, P3_A, P3_ROOTS, P4_ANGLE, P4_CARDS, P4_D, P4_PRODUCT, P4_STRETCH, P4_SUM, P4_T, SWEEP_FULL, charAt, fmt2, fmtN,
  fmtV, nullLine, railProduct, rootsWon, shift, texSmall, turnDeg,
} from './logic';
import { S } from './script';

const tolDeg = (p: PuzzleCtx) => (p.difficulty === 'cadet' ? 3 : p.difficulty === 'navigator' ? 2 : 1);
const hunt = (p: PuzzleCtx, M: Mat, o: { radius?: number; title?: string; view?: { center: [number, number]; height: number }; onChange?: () => void } = {}) => new LineHunt(p, {
  M, radius: o.radius ?? 1.25, tolDeg: tolDeg(p), mode: p.difficulty === 'commander' ? 'typed' : 'drag', autoLock: p.difficulty === 'cadet',
  typedStretch: p.difficulty !== 'cadet', stretchTol: p.difficulty === 'commander' ? 0.01 : 0.05, title: o.title, view: o.view, onChange: o.onChange,
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
function huntReadout(p: PuzzleCtx, hu: () => LineHunt, title: string, extra?: (r: ReturnType<PuzzleCtx['readout']>) => void, M?: Mat) {
  const r = p.readout(title);
  const num = (v: number) => (Math.abs(v - Math.round(v)) < 1e-9 ? String(Math.round(v)) : v.toFixed(2));
  const paint = () => {
    const x = hu();
    const xv = x.x, yv = x.image;
    // green, yellow, and the multiplication that turns one into the other
    if (M) {
      r.row('x', 'green: your arrow $\\mathbf x$', `(${xv.map(num).join(', ')})`, C.v);
      r.row('ax', 'yellow: where $A$ sends it', `(${yv.map(num).join(', ')})`, C.result);
      r.eq(`A\\mathbf x = ${texSmall(M)}\\begin{bmatrix} ${num(xv[0])} \\\\ ${num(xv[1])} \\end{bmatrix} = \\begin{bmatrix} ${num(yv[0])} \\\\ ${num(yv[1])} \\end{bmatrix}`);
    }
    r.row('turn', 'angle between green and yellow', `${Math.round(x.turn)}°`, x.turn <= tolDeg(p) ? C.violet : C.white);
    if (p.difficulty !== 'commander') r.row('ratio', 'yellow along the dashed line', `${fmt2(x.ratio)} × green`, C.result);
    r.row('locked', 'lines found', String(x.rows.filter((k) => k.ok).length));
    extra?.(r);
  };
  return { r, paint };
}

// p1 (the opening encounter) is the trajectory problem: traj-puzzles.ts.

// ------------------------------------------------------------------ p2 · a shear

export const p2: PuzzleDef = {
  id: 'c18-p2',
  title: 'How many lines does a shear keep?',
  goal: 'Same search, new matrix: a **shear**. Green is your arrow; yellow is where the shear sends it. Turn green **all the way round** (the faint yellow trail shows everywhere yellow has been). **Lock** every line where yellow lands on the dashed line through green, and say how many times longer it is. A full turn is the proof that there are no others.',
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
    const view2 = { center: [0.5, 0.9] as [number, number], height: 8.8 };
    if (p.difficulty === 'commander') p.setGoal('Same search, new matrix: a **shear**. **Type arrows** and press **Test**: yellow is where the shear sends green. Find every line where yellow lands on the dashed line through green, and type how many times longer it is. Then press **Sweep once**: a full turn of green is the proof that there are no others.');
    const h2: LineHunt = hunt(p, P2_A, { radius: 1.3, title: 'Lines that hold', view: view2, onChange: () => check() });
    const { paint } = huntReadout(p, () => h2, 'Green and yellow', (r) => r.row('cov', 'circle swept', `${Math.round(h2.sweep.coverage * 100)}%`, h2.sweep.coverage >= SWEEP_FULL ? C.good : C.white), P2_A);
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
  title: 'For which λ does A − λI flatten the grid?',
  goal: 'A line holds when $A\\mathbf x = \\lambda\\mathbf x$ for an arrow $\\mathbf x \\neq \\mathbf 0$. Rewrite that as $(A - \\lambda I)\\mathbf x = \\mathbf 0$ ($I$ is the identity matrix): the matrix $A - \\lambda I$ sends $\\mathbf x$ to zero. A matrix can do that only if it **flattens the grid**. **Turn the dial** to pick λ: the grid shows $A - \\lambda I$, and yellow is where it sends one grid square. **Lock** each λ where the yellow area is **0**. There are two.',
  subgoals: ['Lock the first λ where the yellow area is 0', 'Lock the second one', 'Then: why it works (opens once both are locked)'],
  predict: {
    prompt: '$A = \\begin{bmatrix} 4 & 1 \\\\ 2 & 3 \\end{bmatrix}$ sends $(1, 1)$ to $(5, 5)$. Where does $A - 5I$ send $(1, 1)$?',
    choices: [{ id: 'zero', text: '$(0, 0)$' }, { id: 'same', text: '$(5, 5)$' }, { id: 'one', text: '$(1, 1)$' }, { id: 'four', text: '$(4, 4)$' }],
    answer: 'zero',
    reveal: '$(0, 0)$: $(5, 5) - 5 \\cdot (1, 1) = (0, 0)$. $A - 5I$ sends a non-zero arrow to zero, so it flattens the grid: λ = 5 is one of the two.',
  },
  hints: [
    'Yellow is where $A - \\lambda I$ sends one grid square, and its area is $\\det(A - \\lambda I)$ (negative when the square is flipped). When the area changes sign, it passed 0 on the way.',
    '$A - \\lambda I = \\begin{bmatrix} 4 - \\lambda & 1 \\\\ 2 & 3 - \\lambda \\end{bmatrix}$, so the yellow area is $(4 - \\lambda)(3 - \\lambda) - 2$. Find the two λ where that is 0.',
    'Lock $\\lambda = 5$ (the line $(1, 1)$) and $\\lambda = 2$ (the line $(1, -2)$).',
  ],
  par: 14, // trying the dial (and, on Navigator, six checked steps) is how this is solved: exploring must not cost stars
  onWin: S.p3Win,
  setup(p) {
    const d = p.difficulty;
    // cadet: the dial locks by itself where the area is 0
    if (d === 'cadet') p.setGoal(p3.goal.replace('**Lock** each λ where the yellow area is **0**.', 'Stop the dial where the yellow area is **0**: it locks there by itself.'));
    // the origin sits low and left of centre: at λ = 0 the yellow square reaches (5, 5)
    void p.g.stage.view2D({ center: [0.3, 2], height: 12, ms: 0 });
    const grid = p.grid({ main: 0.55, base: 0.14, axis: 0.7 });
    hideLandingLine(grid);
    let l = 0; // λ = 0: the grid shows A itself
    // yellow: where A − λI sends one grid square; its area is det(A − λI)
    const sq = new Parallelogram(p.g.stage, [1, 0, 0], [0, 1, 0], { color: C.result, opacity: 0.26 });
    p.add(sq);
    const lines: InfLine[] = [];
    const lockTags: ReturnType<typeof ptag>[] = [];
    const live = new InfLine(p.g.stage, [0, 0, 0.004], [1, 1, 0], { color: C.violet, width: 3, opacity: 0 });
    p.add(live.object); p.onDispose(() => live.dispose());
    const r = p.readout('The dial');
    const plot = new PolyPlot({ lo: -1, hi: 8.6, ymin: -4, ymax: 14, fn: (x) => charAt(P3_A, x), label: 'yellow area against λ', ticks: [0, 2, 4, 6, 8] });
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
    const n2 = (x: number) => fmtN(Math.round(x * 100) / 100).replace('−', '-');
    const paint = () => {
      const S0 = shift(P3_A, l);
      grid.set(S0);
      sq.set([S0[0][0], S0[1][0], 0], [S0[0][1], S0[1][1], 0]);
      const dt = det(S0);
      const flat = Math.abs(dt) <= tol;
      const nl = flat ? nullLine(P3_A, l) : null;
      live.line.setOpacity(nl ? 0.95 : 0);
      if (nl) live.set([0, 0, 0.004], v3(nl));
      plot.at(l);
      r.row('l', 'dial λ', fmtN(l), C.accent);
      r.row('d', 'yellow area', fmt2(dt), flat ? C.violet : C.result);
      // the link: the matrix on the grid, and its area worked out
      const [[a, b], [c, e]] = S0;
      r.eq(`\\begin{gathered} \\det\\begin{bmatrix} ${n2(a)} & ${n2(b)} \\\\ ${n2(c)} & ${n2(e)} \\end{bmatrix} \\\\ = (${n2(a)})(${n2(e)}) - (${n2(b)})(${n2(c)}) = ${n2(dt)} \\end{gathered}`);
    };
    const lockAt = (x: number, quiet = false) => {
      if (Math.abs(charAt(P3_A, x)) > tol) {
        if (!quiet) { sfx.miss(); msg(`At λ = ${fmtN(x)} the yellow area is ${fmt2(charAt(P3_A, x))}, not 0. The grid is not flat.`, 'bad'); p.bark('lantern', `Area ${fmt2(charAt(P3_A, x))} at λ = ${fmtN(x)}. Not flat.`); }
        return;
      }
      if (stops.some((s) => Math.abs(s - x) < 1e-9)) return;
      stops.push(x);
      plot.mark(x);
      const nl = nullLine(P3_A, x)!;
      const L = new InfLine(p.g.stage, [0, 0, 0.003], v3(nl), { color: C.violet, width: 2.2, opacity: 0.55, dashed: true });
      p.add(L.object); p.onDispose(() => L.dispose()); lines.push(L);
      const nd = niceDir(nl);
      // tag on the upper half of the line (the origin sits low): clear of the dock and the goal card
      const sgn = nd[1] > 0 ? 2.6 : -2.6;
      const tg = ptag(p, `λ = ${fmtN(x)} · ${fmtV(nd)}`, v3([nd[0] * sgn / Math.hypot(nd[0], nd[1]), nd[1] * sgn / Math.hypot(nd[0], nd[1])]), 'vi', [0, -18]);
      lockTags.push(tg);
      sfx.collapse();
      p.g.stage.nudge(0.06);
      msg(`Flat at λ = ${fmtN(x)}: the grid square is squashed onto a line, so the yellow area is 0. The violet line holds the arrows $A - ${fmtN(x)}I$ sends to zero, so $A$ stretches each of them by ${fmtN(x)}: $A\\mathbf x = ${fmtN(x)}\\mathbf x$ along ${fmtV(nd)}.`, 'good');
      if (d === 'cadet' && stops.length === 2) r.note('$A\\mathbf v = \\lambda\\mathbf v$ means $(A - \\lambda I)\\mathbf v = \\mathbf 0$: a non-zero arrow lands on the origin, so $A - \\lambda I$ flattens and $\\det(A - \\lambda I) = 0$.');
      if (stops.length === 2) openDerivation();
      winCheck();
    };
    const step = d === 'cadet' ? 0.5 : d === 'navigator' ? 0.25 : 0.05;
    const slider = fslider({ label: 'dial $\\lambda$', min: -1, max: 8, step, value: l, format: (x) => fmtN(x), onInput: (x) => { l = x; paint(); if (d === 'cadet') lockAt(l, true); } });
    const lockBtn = button('Lock λ', () => { p.move(); lockAt(l); }, { cls: 'primary small' });
    r.el.append(plot.el);
    const dialRow = h('div', { class: 'a7-row' }, slider.el, d === 'cadet' ? null : lockBtn);
    p.dock().append(dialRow, msgEl);
    slider.el.addEventListener('change', () => p.move());
    // the derivation, by level (GDD §7.1): cadet watches, navigator types the steps, commander orders the
    // reason first. It stays out of sight until both λ are locked, so the dial has the dock to itself.
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
    const box = h('div', { class: 'a7-deriv', style: 'display:none;flex-direction:column;gap:8px' });
    if (d === 'navigator') {
      ws = new StepWorksheet(p, { title: 'Where the two λ come from · each step is checked', steps, mount: box, onDone: () => { derived = true; winCheck(); } });
    } else if (d === 'commander') {
      tiles = new TileOrder(p, { tiles: P3_TILES, decoys: P3_DECOYS, mount: box, title: 'Why a stretch makes A − λI flatten: put the reason in order', submitLabel: 'Check the order', onSubmit: (o) => submitTiles(o) });
    }
    if (ws || tiles) p.dock().append(box);
    function openDerivation() {
      if (box.style.display !== 'none' || (!ws && !tiles)) return;
      box.style.display = 'flex';
      // the dial has done its job: give the dock to the derivation, and the goal to what is left
      dialRow.style.display = 'none';
      p.setGoal(d === 'commander'
        ? 'Both λ found: the yellow area is 0 at λ = 5 and at λ = 2. **Now the reason.** Put the steps in order, from $A\\mathbf v = \\lambda\\mathbf v$ to the equation for λ, then solve that equation.'
        : 'Both λ found: the yellow area is 0 at λ = 5 and at λ = 2. **Now work out where they come from**: multiply out $\\det(A - \\lambda I)$, solve it, and find each line.');
      if (!p.g.headless) window.setTimeout(() => msg(d === 'commander' ? 'Both found. Now the reason: put the steps below in order.' : 'Both found. Now work out where the two λ come from, below.', 'good'), 1600);
    }
    paint();
    msg('At λ = 0 the grid shows $A$ itself, and the yellow area is 10. Turn the dial.');
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
    const reason = 'Why these two: the yellow area is $(4 - \\lambda)(3 - \\lambda) - 2 = \\lambda^2 - 7\\lambda + 10 = (\\lambda - 5)(\\lambda - 2)$. It is 0 only at λ = 5 and λ = 2.';
    return {
      async showMe() {
        // a search a person would run: two tries that miss, the sign change, then the two hits and the reason
        p.move();
        await goTo(1, 900);
        msg(`λ = 1: the yellow area is ${fmtN(charAt(P3_A, 1))}. Not flat.`); await wait(1100);
        await goTo(4, 1100);
        msg(`λ = 4: the area is ${fmtN(charAt(P3_A, 4))}. It changed sign, so it passed 0 between 1 and 4.`); await wait(1500);
        for (const x of [2, 5]) { await goTo(x, 1100); lockAt(x); await wait(1300); }
        await finishDerivation(false);
        if (!p.g.headless) msg(reason, 'good');
      },
      async solve() { for (const x of P3_ROOTS) { l = x; slider.set(x, false); paint(); lockAt(x); } await finishDerivation(true); },
      wrong() { l = 4; slider.set(4, false); paint(); lockAt(4); },
    };
  },
};

// ------------------------------------------------------------------ p4 · no line at all

const PLATE: [number, number][] = [[0, 0], [1, 0], [1, 0.4], [0.4, 0.4], [0.4, 1], [0, 1]];
const T_CARD: RailCard = { id: 'T', name: 'T', M: P4_T };
const texT = texSmall(P4_T);

export const p4: PuzzleDef = {
  id: 'c18-p4',
  title: 'Which lines does the routine pulse T keep?',
  goal: `The routine pulse is a matrix, $T = ${texT}$. **Green** is your arrow $\\mathbf x$; **yellow** is where $T$ sends it. **1.** Turn green all the way round (drag it, or press **Sweep once**). Does yellow ever land on the dashed line through green?`,
  subgoals: ['Turn green all the way round: does any line hold?', 'Build $D$ from a turn and a stretch', 'Add and multiply the two λ of $D$', 'Bring the L home using only $T$'],
  hints: [
    'Press **Sweep once**. Yellow never lands on the dashed line through green: $T$ turns every arrow. The λ test agrees: $\\det(T - \\lambda I) = \\lambda^2 + 1$ is never 0 for a real λ.',
    '$D$ sends $(1, 0)$ to $(1, 1)$: turned 45° and 1.41 times as long. Put **turn 45°** and **stretch × 1.41** on the rail.',
    'For $\\lambda = 1 \\pm i$: the sum is 2, and the product is $(1 + i)(1 - i) = 1 - i^2 = 2$. Then put $T$ on the rail four times: its λ are $\\pm i$, and $i^4 = 1$.',
  ],
  par: 12, // sweeping and trying the rail is how this is solved: exploring must not cost stars
  onWin: S.p4Win,
  setup(p) {
    const d = p.difficulty;
    void p.g.stage.view2D({ center: [0.4, 0.2], height: 8.4, ms: 0 });
    const grid = p.grid({ main: 0.22, base: 0, axis: 0.45 });
    const done = [false, false, false, false];
    const tick = (i: number) => { if (!done[i]) { done[i] = true; sg(p, i); } };
    const r = p.readout('Green and yellow, under $T$');
    const msgEl = h('div', { class: 'a7-msg' });
    const msg = (t: string, k: '' | 'good' | 'bad' = '') => { msgEl.className = `a7-msg ${k}`; msgEl.innerHTML = inline(t); };
    const stageEl = h('div', { style: 'display:flex;flex-direction:column;gap:8px' });
    p.dock().append(stageEl, msgEl);
    let won = false;
    let stage: 'A' | 'B' | 'C' = 'A';
    const num = (v: number) => (Math.abs(v - Math.round(v)) < 1e-9 ? String(Math.round(v)) : v.toFixed(2)).replace(/^-/, '−');
    const numT = (v: number) => num(v).replace('−', '-');

    // ---- stage A: green goes all the way round; yellow never lands on the dashed line
    // green starts at (1, 1), off the grid axes, so its dashed line shows; T sends it to (−1, 0)
    const sw = new Sweep(p, { M: P4_T, radius: Math.SQRT2, start: Math.PI / 4, xLine: true, labels: { x: '$\\mathbf x$', mx: '$T\\mathbf x$' } });
    const plot = new PolyPlot({ lo: -3, hi: 3, ymin: -1, ymax: 10, fn: (x) => charAt(P4_T, x), label: 'det(T − λI) = λ² + 1 against λ', ticks: [-2, -1, 0, 1, 2] });
    plot.at(0);
    const paintA = () => {
      const x = sw.xVec.slice(0, 2), y = matVec(P4_T, x);
      r.row('x', 'green: your arrow $\\mathbf x$', `(${x.map(num).join(', ')})`, C.v);
      r.row('y', 'yellow: where $T$ sends it', `(${y.map(num).join(', ')})`, C.result);
      r.eq(`T\\mathbf x = ${texT}\\begin{bmatrix} ${numT(x[0])} \\\\ ${numT(x[1])} \\end{bmatrix} = \\begin{bmatrix} ${numT(y[0])} \\\\ ${numT(y[1])} \\end{bmatrix}`);
      // T can send an arrow more than 90° round, so measure against the line, not the arrow
      r.row('t', 'angle between yellow and the dashed line', `${Math.round(turnDeg(P4_T, x))}°`);
      r.row('cov', 'circle swept', `${Math.round(sw.coverage * 100)}%`, sw.coverage >= SWEEP_FULL ? C.good : C.white);
      r.row('found', 'lines that hold', sw.coverage >= SWEEP_FULL ? 'none' : 'none yet (keep turning)', sw.coverage >= SWEEP_FULL ? C.orange : C.white);
    };
    const nextBtn = button('Next', () => void startB(), { cls: 'primary small' });
    const doneA = () => {
      if (done[0]) return;
      tick(0);
      paintA();
      msg('No line holds: yellow never lands on the dashed line, so $T$ turns every arrow. The λ test agrees: $\\det(T - \\lambda I) = \\lambda^2 + 1$ is never 0 for a real λ. Its roots are $\\lambda = \\pm i$, where $i^2 = -1$.', 'good');
      stageEl.replaceChildren(plot.el, h('div', { class: 'a7-row' }, nextBtn, h('span', { class: 'k', html: inline('what a λ like $i$ means') })));
    };
    p.tick(() => { if (!done[0]) { paintA(); if (sw.coverage >= SWEEP_FULL) doneA(); } });
    stageEl.append(h('div', { class: 'a7-row' }, button('Sweep once', () => { p.move(); void sw.animateSweep(5600); }, { cls: 'primary small' }), h('span', { class: 'k' }, 'or drag the green arrow round')));
    paintA();
    msg('Green is $(1, 1)$; $T$ sends it to $(-1, 0)$, off the dashed line.');

    // ---- stage B: D = turn 45° then stretch 1.41; add and multiply its λ
    const plate = new Outline2D(p.g.stage, PLATE, { color: C.white, opacity: 0.12 });
    const home = new Outline2D(p.g.stage, PLATE, { color: '#7d8aa5', opacity: 0.05 });
    p.add(home, plate);
    for (const o of [plate.group, home.group]) o.visible = false;
    const showM = (M: Mat) => { grid.set(M); plate.set(M); };
    let rail: CardRail | null = null;
    let sumIn: HTMLInputElement | null = null, prodIn: HTMLInputElement | null = null, rIn: HTMLInputElement | null = null, aIn: HTMLInputElement | null = null;
    const checksBox = h('div', { class: 'a7-checks' });
    const numIn = (label: string, aria: string) => {
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
      msg('Sum 2: the numbers down the diagonal of $D$, $1 + 1$. Product 2: its determinant, $1 \\cdot 1 - (-1) \\cdot 1$.', 'good');
      window.setTimeout(() => startC(), p.g.headless ? 0 : 1400);
    };
    const startB = async () => {
      if (stage !== 'A') return;
      stage = 'B';
      sw.show(false);
      for (const o of [plate.group, home.group]) o.visible = true;
      showM(identity(2));
      grid.setLook({ main: 0.5, base: 0.12 });
      p.setGoal(`**2.** $T$’s λ are not real numbers. To see what a λ like that means, take a simpler matrix with the same kind of λ: $D = ${texSmall(P4_D)}$, whose λ are $1 + i$ and $1 - i$. **Build $D$** on the rail from a turn and a stretch; the white L shows what the rail does. **3.** Then type what its two λ add up to and multiply to${d === 'commander' ? ', and the size and angle of $1 + i$' : ''}.`);
      r.setTitle('The rail');
      for (const k of ['x', 'y', 't']) r.hideRow(k);
      r.eq(null);
      r.row('cov', 'its λ', '$1 + i$ and $1 - i$', C.violet);
      r.row('found', 'the rail makes', `$${texSmall(identity(2))}$`);
      r.row('m', 'target $D$', `$${texSmall(P4_D)}$`);
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
      sumIn = numIn('$\\lambda_1 + \\lambda_2 =$', 'sum of the two lambdas');
      prodIn = numIn('$\\lambda_1 \\lambda_2 =$', 'product of the two lambdas');
      if (d === 'commander') { rIn = numIn('size of $1 + i$: $|\\lambda| =$', 'size of lambda'); aIn = numIn('its angle in degrees:', 'angle of lambda'); }
      stageEl.replaceChildren(rail.el, h('div', { class: 'a7-kick' }, 'Then, for D’s λ = 1 ± i'), checksBox);
      msg('');
    };

    // ---- stage C: T four times is the identity
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
        msg('Four $T$s make $I$, the identity: every point is home. In its own slanted grid, $T$ is a quarter turn, and $i^4 = 1$.', 'good');
        answer('fourth', 'The routine pulse keeps no real line: $\\lambda^2 + 1 = 0$ gives $\\lambda = \\pm i$. In its own slanted grid it is a quarter turn, and four quarter turns are a full turn: $T^4 = I$, because $i^4 = 1$.', 'c18');
        p.g.toast('Why does every fourth pulse bring the ground layer home?', 'Case board · answered');
        p.win();
      } else if (!home4) {
        sfx.miss();
        msg(`${cards.length} × $T$: the L is not home. ${cards.length === 2 ? 'Two $T$s flip every arrow ($T^2 = -I$, as $i^2 = -1$).' : 'Each $T$ is a quarter turn in its own slanted grid.'}`, 'bad');
      }
    };
    const startC = () => {
      if (stage !== 'B') return;
      stage = 'C';
      p.setGoal(`**4.** Back to $T = ${texT}$. Put $T$ on the rail as many times as it takes to bring the white L **home** (onto the faint outline where it started), then press **Play the rail**.`);
      r.setTitle('The rail');
      r.row('m', '$T$', `$${texT}$`);
      r.row('cov', 'its λ', '$i$ and $-i$', C.violet);
      showM(identity(2));
      r.row('found', 'the rail makes', `$${texSmall(identity(2))}$`);
      railC = new CardRail({ palette: [T_CARD], max: 6, title: 'Click T to add one more to the rail', onChange: () => { if (!railC?.locked) showM(identity(2)); } });
      stageEl.replaceChildren(railC.el, h('div', { class: 'a7-row' }, button('Play the rail', () => void playFour(), { cls: 'primary small' })));
      msg('');
    };
    return {
      async showMe() {
        if (!done[0]) await sw.animateSweep(p.g.headless ? 40 : 4000);
        doneA();
        await wait(p.g.headless ? 5 : 2200);
        await startB();
        await wait(p.g.headless ? 5 : 600);
        if (!done[1]) rail!.set([P4_CARDS[2], P4_CARDS[0]]);
        await wait(p.g.headless ? 5 : 900);
        if (!done[2]) { sumIn!.value = String(P4_SUM); prodIn!.value = String(P4_PRODUCT); if (rIn) rIn.value = '1.41'; if (aIn) aIn.value = '45'; checkC(); }
        await wait(p.g.headless ? 5 : 1600);
        startC();
        // a person would try fewer first: two Ts flip every arrow, four bring it home
        if (!p.g.headless) { railC!.set([T_CARD, T_CARD]); await playFour(); await wait(1400); }
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

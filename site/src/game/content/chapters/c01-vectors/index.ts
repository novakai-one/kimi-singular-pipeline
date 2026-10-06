// Chapter 1: "Where is the beacon from here?" → vector, adding vectors, scalar multiple, length.
// Every move the ship makes is an arrow the player draws; Fire flies it.
import { Vector3 } from 'three';
import type { ChapterDef, PuzzleDef, V3 } from '../../../game/types';
import { BurnChain } from '../../../kit/flight';
import { near } from '../../../kit/handle';
import { Pad, Dot } from '../../../gfx/markers';
import { Arrow } from '../../../gfx/arrow';
import { Parallelogram, InfLine } from '../../../gfx/shapes';
import { FatLine } from '../../../gfx/lines';
import { Label } from '../../../gfx/label';
import { Slider, parseNum } from '../../../ui/widgets';
import { h } from '../../../ui/ui';
import { C } from '../../../core/theme';
import { nice } from '../../../math/frac';
import { animate, ease, wait } from '../../../core/tween';
import { sfx } from '../../../audio/sfx';
import { S } from './script';

const fmt = (v: V3) => `(${nice(v[0])}, ${nice(v[1])})`;

/** Dashed guides that show a vector's two parts (cadet / navigator). */
function partGuides(p: Parameters<PuzzleDef['setup']>[0], from: V3) {
  const across = new FatLine(p.g.stage, [from, from], { color: '#9fb6d8', width: 1.5, dashed: true, opacity: 0.7 });
  const up = new FatLine(p.g.stage, [from, from], { color: '#9fb6d8', width: 1.5, dashed: true, opacity: 0.7 });
  const la = new Label('', from, { className: 'coord' });
  const lu = new Label('', from, { className: 'coord' });
  p.add(across.object, up.object, la.object, lu.object);
  p.onDispose(() => { across.dispose(); up.dispose(); la.dispose(); lu.dispose(); });
  const show = p.difficulty !== 'commander';
  return (tail: V3, tip: V3) => {
    if (!show) return;
    const corner: V3 = [tip[0], tail[1], 0.01];
    across.setPoints([[tail[0], tail[1], 0.01], corner]);
    up.setPoints([corner, [tip[0], tip[1], 0.01]]);
    la.at([(tail[0] + tip[0]) / 2, tail[1] - 0.32, 0]);
    la.set(nice(tip[0] - tail[0]));
    lu.at([tip[0] + 0.35, (tail[1] + tip[1]) / 2, 0]);
    lu.set(nice(tip[1] - tail[1]));
  };
}

// ------------------------------------------------------------------ 1. straight there

const straight: PuzzleDef = {
  id: 'c01-straight',
  title: 'Where is the beacon from here?',
  goal: 'Drag the tip of the **green** arrow to the beacon, then press **Fire**.',
  hints: ['The beacon is 3 steps across and 2 steps up from the ship.', 'Put the arrow tip on the beacon ring, then Fire.'],
  par: 1,
  onWin: S.straightWin,
  setup(p) {
    p.grid();
    const pad = new Pad(p.g.stage, [3, 2, 0], { label: 'beacon' });
    p.add(pad);
    const r = p.readout('Burn');
    const guides = partGuides(p, [0, 0, 0]);
    const chain = new BurnChain(p, {
      free: [[1, 0, 0]], labels: ['$\\mathbf v$'],
      onChange: (end) => { r.row('v', 'burn', fmt(end), C.v); guides([0, 0, 0], end); },
      onArrive: (end) => { if (near(end, [3, 2, 0])) { void pad.hit(); p.win(); return 'win'; } return 'miss'; },
    });
    return { async showMe() { await chain.moveBurn(0, [3, 2, 0]); await chain.fire(); } };
  },
};

// ------------------------------------------------------------------ 2. around the debris

const debris: PuzzleDef = {
  id: 'c01-debris',
  title: 'Can two burns get around the debris?',
  goal: 'The grey burn already happened. Drag the **green** burn so the ship ends on the beacon, then **Fire**.',
  predict: {
    prompt: 'Afterwards, LANTERN will replay the two burns in the other order. Where will the ship end up?',
    choices: [{ id: 'same', text: 'On the same beacon' }, { id: 'else', text: 'Somewhere else' }, { id: 'debris', text: 'In the debris' }],
    answer: 'same',
    reveal: 'Both orders end on the beacon. Across: $4 + (-1) = (-1) + 4 = 3$. Up: $-1 + 3 = 3 + (-1) = 2$.',
  },
  hints: ['The autopilot left the ship at (4, −1). The beacon is at (3, 2).', 'From (4, −1) to (3, 2) is 1 back and 3 up.', 'The green burn is (−1, 3).'],
  par: 1,
  onWin: S.debrisWin,
  setup(p) {
    p.grid();
    p.g.stage.view2D({ center: [1.5, 1], height: 9, ms: 0 });
    const pad = new Pad(p.g.stage, [3, 2, 0], { label: 'beacon' });
    p.add(pad);
    // debris on the straight route
    const rocks: Dot[] = [];
    for (const [x, y, s] of [[1.4, 0.95, 0.16], [1.75, 1.25, 0.11], [1.15, 0.6, 0.09], [2.0, 1.0, 0.08], [1.55, 1.55, 0.07]]) {
      const d = new Dot([x, y, 0.05], { color: '#6b7488', size: s, glow: 0.2 });
      rocks.push(d);
    }
    p.add(...rocks);
    const r = p.readout('Burns');
    let won = false;
    let replay: Promise<void> | null = null;
    const chain = new BurnChain(p, {
      fixed: [[4, -1, 0]], free: [[0, 1, 0]], labels: ['$\\mathbf w$'], fixedFlown: true,
      onChange: (end, burns) => {
        r.row('a', 'autopilot', fmt(burns[0]), '#9aa7bd');
        r.row('w', 'your burn', fmt(burns[1]), C.v);
        r.row('e', 'ship ends at', fmt(end), C.result);
      },
      onArrive: (end) => {
        if (!near(end, [3, 2, 0]) || won) return 'miss';
        won = true;
        void pad.hit();
        replay = (async () => {
          // replay in the other order: the parallelogram appears
          const w = chain.free[0].vec;
          const g1 = new Arrow([0, 0, 0], [0, 0, 0], { color: C.v, opacity: 0.6, width: 0.035 });
          const g2 = new Arrow([w[0], w[1], 0], [w[0], w[1], 0], { color: '#9aa7bd', opacity: 0.6, width: 0.035 });
          const par = new Parallelogram(p.g.stage, [4, -1, 0], [w[0], w[1], 0], { color: C.result, opacity: 0 });
          p.add(g1, g2, par);
          await g1.moveTo([w[0], w[1], 0], 700);
          await g2.moveTo([w[0] + 4, w[1] - 1, 0], 700);
          await animate(600, (k) => par.setOpacity(0.16 * k, 0.8 * k), ease.out);
          p.win();
        })();
        return 'win';
      },
    });
    return {
      async showMe() { await chain.moveBurn(0, [-1, 3, 0]); await chain.fire(); await replay; },
    };
  },
};

// ------------------------------------------------------------------ 3. one thruster, any amount

const scale: PuzzleDef = {
  id: 'c01-scale',
  title: 'How far can one thruster take you?',
  goal: 'Thruster three only pushes along **(2, 1)**. Set the amount, then **Fire**. Reach each marker buoy from the start.',
  subgoals: ['Reach the buoy at (6, 3)', 'Reach the buoy at (−4, −2)'],
  predict: {
    prompt: 'The thruster pushes along (2, 1). Can one burn reach the buoy at (−4, −2)?',
    choices: [{ id: 'yes', text: 'Yes, fire it backwards' }, { id: 'no', text: 'No, it only pushes forwards' }, { id: 'two', text: 'Only with two burns' }],
    answer: 'yes',
    reveal: 'A negative amount flips the arrow: $-2 \\times (2, 1) = (-4, -2)$. One thruster reaches **every point on its own line**, forwards and backwards.',
  },
  hints: ['(6, 3) is three times (2, 1).', '(−4, −2) points the other way. Try a negative amount.', 'Amounts 3 and −2.'],
  par: 2,
  onWin: S.scaleWin,
  setup(p) {
    p.grid();
    p.g.stage.view2D({ center: [1, 0.5], height: 11, ms: 0 });
    const d: V3 = [2, 1, 0];
    const line = new InfLine(p.g.stage, [0, 0, 0], d, { color: '#7d8aa5', width: 1.2, opacity: 0.45, dashed: true });
    p.add(line.object);
    p.onDispose(() => line.dispose());
    const targets: V3[] = [[6, 3, 0], [-4, -2, 0]];
    const pads = targets.map((t, i) => new Pad(p.g.stage, t, { label: i === 0 ? 'buoy A' : 'buoy B', color: '#9fd8ff' }));
    p.add(...pads);
    const done = [false, false];
    const step = p.difficulty === 'cadet' ? 1 : p.difficulty === 'navigator' ? 0.5 : 0.25;
    const r = p.readout('Thruster three');
    let k = 1;
    const show = () => {
      r.row('k', 'amount $k$', nice(k));
      r.row('b', 'burn $k(2, 1)$', fmt([2 * k, k, 0]), C.v);
    };
    const chain = new BurnChain(p, {
      free: [[2, 1, 0]], labels: ['$k\\mathbf d$'], snap: null,
      constrain: (_i, q) => {
        const t = Math.round(((q.x * 2 + q.y * 1) / 5) / step) * step;
        k = Math.max(-4, Math.min(4, t));
        slider.set(k, false);
        show();
        return new Vector3(2 * k, k, 0);
      },
      onArrive: (end) => {
        const i = targets.findIndex((t) => near(end, t));
        if (i < 0) return 'miss';
        if (!done[i]) { done[i] = true; void pads[i].hit(); p.subgoal(i); }
        if (done[0] && done[1]) { p.win(); return 'win'; }
        return 'ok';
      },
    });
    const slider = new Slider({
      label: 'amount $k$', min: -4, max: 4, step, value: 1,
      onInput: (v) => { k = v; chain.setBurn(0, [2 * k, k, 0]); show(); },
    });
    p.dock().prepend(slider.el);
    show();
    return {
      async showMe() {
        for (const [i, kk] of [[0, 3], [1, -2]] as const) {
          if (done[i]) continue;
          k = kk; slider.set(kk, false); show();
          await chain.moveBurn(0, [2 * kk, kk, 0], 700);
          await chain.fire();
        }
      },
    };
  },
};

// ------------------------------------------------------------------ 4. three knocks: how far is home?

const home: PuzzleDef = {
  id: 'c01-home',
  title: 'How far is home?',
  goal: 'Three pulses knocked the ship off course (grey). Plot **one** burn straight home and **Fire**. Then type how far home was.',
  subgoals: ['Fly home in one burn', 'Type the distance home'],
  hints: ['Add the three knocks: across 2 − 3 + 4, up 5 + 1 − 2.', 'The ship is at (3, 4). Home is 3 back and 4 down.', 'The distance is the long side of a right-angled triangle with sides 3 and 4.'],
  par: 1,
  onWin: S.homeWin,
  setup(p) {
    p.grid();
    p.g.stage.view2D({ center: [1.5, 2.5], height: 10, ms: 0 });
    const pad = new Pad(p.g.stage, [0, 0, 0], { label: 'home', color: '#9fd8ff' });
    p.add(pad);
    const r = p.readout('Burn home');
    const flags = [false, false];
    const check = () => { if (flags[0] && flags[1]) p.win(); };
    const guides = partGuides(p, [3, 4, 0]);
    const chain = new BurnChain(p, {
      fixed: [[2, 5, 0], [-3, 1, 0], [4, -2, 0]], free: [[-1, 0, 0]], labels: ['$\\mathbf v$'], fixedFlown: true,
      onChange: (_e, burns) => { const v = burns[3]; r.row('v', 'your burn', fmt(v), C.v); guides([3, 4, 0], [3 + v[0], 4 + v[1], 0]); },
      onArrive: (end) => {
        if (!near(end, [0, 0, 0])) return 'miss';
        if (!flags[0]) { flags[0] = true; void pad.hit(); p.subgoal(0); }
        check();
        return flags[1] ? 'win' : 'ok';
      },
    });
    const input = h('input', { class: 'cell', style: 'width:90px', inputmode: 'decimal', 'aria-label': 'distance home in grid steps', placeholder: '?' }) as HTMLInputElement;
    const msg = h('span', { class: 'c-muted', style: 'font-size:13px' });
    const tryAnswer = () => {
      const v = parseNum(input.value);
      if (v === null) return;
      p.move();
      if (Math.abs(v - 5) < 0.01) { flags[1] = true; input.classList.remove('bad'); input.style.borderColor = C.good; msg.textContent = '√(3² + 4²) = 5'; p.subgoal(1); check(); }
      else { input.classList.add('bad'); sfx.miss(); msg.textContent = Math.abs(v - 7) < 0.01 ? '3 + 4 is the zig-zag route. The arrow cuts the corner.' : 'Not quite. Think of the right-angled triangle.'; }
    };
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') tryAnswer(); e.stopPropagation(); });
    input.addEventListener('change', tryAnswer);
    p.dock().append(h('label', { style: 'display:flex;gap:10px;align-items:center;font-size:14px' }, 'Distance home:', input, 'grid steps'), msg);
    return {
      async showMe() {
        await chain.moveBurn(0, [-3, -4, 0]);
        await chain.fire();
        input.value = '5';
        tryAnswer();
      },
    };
  },
};

// ------------------------------------------------------------------ Bram's doubt

const doubt: PuzzleDef = {
  id: 'c01-doubt',
  title: 'Does the order of two burns matter?',
  style: 'doubt',
  claim: { who: 'bram', text: 'East then north has to land somewhere different from north then east.' },
  goal: 'Set any two burns, then press **Fly both orders**. Then let Bram shake them.',
  hints: ['Any two burns will do. Make them point different ways so the routes look different.'],
  onWin: S.doubtWin,
  setup(p) {
    p.grid();
    p.g.stage.view2D({ center: [1.5, 1.5], height: 9, ms: 0 });
    const a = new Arrow([0, 0, 0], [3, 0, 0], { color: C.v, handle: true, label: '$\\mathbf a$' });
    const b = new Arrow([0, 0, 0], [0, 2, 0], { color: C.w, handle: true, label: '$\\mathbf b$' });
    const a2 = new Arrow([0, 0, 0], [0, 0, 0], { color: C.v, opacity: 0.55, width: 0.035 });
    const b2 = new Arrow([0, 0, 0], [0, 0, 0], { color: C.w, opacity: 0.55, width: 0.035 });
    const par = new Parallelogram(p.g.stage, [3, 0, 0], [0, 2, 0], { color: C.result, opacity: 0 });
    par.setOpacity(0, 0);
    const meet = new Dot([3, 2, 0], { color: C.result, size: 0.12 });
    meet.setOpacity(0);
    p.add(par, a2, b2, a, b, meet);
    const vec = (x: Arrow): V3 => [x.to.x - x.from.x, x.to.y - x.from.y, 0];
    const layout = () => { const av = vec(a), bv = vec(b); a.set([0, 0, 0], av); b.set([0, 0, 0], bv); };
    for (const x of [a, b]) {
      p.g.drag.add({ target: x.grab, getPos: () => x.to.clone(), snap: () => p.snap(), onMove: (q) => { x.setTo([q.x, q.y, 0]); }, onEnd: () => p.move() });
    }
    let flying = false;
    const flyBoth = async (av: V3, bv: V3, ms: number) => {
      // route 1: a then b (solid), route 2: b then a (faint), meeting at a + b
      a.set([0, 0, 0], av); b.set([0, 0, 0], bv);
      b2.set(av, av); a2.set(bv, bv);
      meet.setOpacity(0);
      par.set(av, bv);
      par.setOpacity(0, 0);
      await Promise.all([b2.moveTo([av[0] + bv[0], av[1] + bv[1], 0], ms, av), a2.moveTo([av[0] + bv[0], av[1] + bv[1], 0], ms, bv)]);
      meet.at([av[0] + bv[0], av[1] + bv[1], 0.05]);
      meet.setOpacity(1);
      sfx.snap();
      await animate(ms * 0.6, (k) => par.setOpacity(0.15 * k, 0.7 * k), ease.out);
    };
    const shake = async () => {
      p.bark('bram', 'Let me shake it.');
      for (let i = 0; i < 4; i++) {
        const rv = (): V3 => [Math.round((Math.random() * 8 - 4) * 2) / 2, Math.round((Math.random() * 8 - 4) * 2) / 2, 0];
        let av = rv(), bv = rv();
        while (Math.abs(av[0] * bv[1] - av[1] * bv[0]) < 2) { av = rv(); bv = rv(); }
        await flyBoth(av, bv, 520);
        await wait(250);
      }
    };
    const go = async () => {
      if (flying || p.won) return;
      const av = vec(a), bv = vec(b);
      if (Math.hypot(av[0], av[1]) < 0.5 || Math.hypot(bv[0], bv[1]) < 0.5) { p.bark('bram', 'Two real burns, please. Not zero.'); return; }
      flying = true;
      p.move();
      await flyBoth(av, bv, 900);
      await wait(400);
      await shake();
      flying = false;
      p.win();
    };
    p.dock().appendChild(h('div', null, h('button', { class: 'btn primary', type: 'button', onclick: () => void go() }, 'Fly both orders')));
    layout();
    return { async showMe() { a.setTo([3, 1, 0]); b.setTo([-1, 2, 0]); await go(); } };
  },
};

// ------------------------------------------------------------------ the chapter

const ch: ChapterDef = {
  id: 'c01',
  act: 1,
  num: 1,
  title: 'Where is the beacon from here?',
  subtitle: 'Vectors',
  nodes: ['N01', 'N02'],
  palette: 'default',
  music: 'explore',
  script: S,
  beats: [
    { kind: 'scene', id: 'open', lines: S.open, view: '2d' },
    { kind: 'puzzle', id: 'straight', puzzle: straight },
    { kind: 'scene', id: 'debris', lines: S.debris },
    { kind: 'puzzle', id: 'debris-p', puzzle: debris },
    {
      kind: 'name', id: 'name-vector', entry: {
        id: 'vector', term: 'vector', question: 'Where is it, and how do I get there?', nodes: ['N01', 'N02'],
        saw: 'Every burn was an arrow: **so far across, so far up**. The ship ended where the last arrow ended, tip to tail. Both orders of the two burns ended on the same beacon.',
        means: 'An arrow is a move. The same two numbers move you the same way from anywhere, so the arrow does not depend on where it starts.',
        name: 'A **vector** is an arrow given by how far it moves along each axis. We write its numbers in a column. Doing one move after another is **adding vectors**: add the across numbers, add the up numbers.',
        formula: '\\cg{\\begin{bmatrix} 4 \\\\ -1 \\end{bmatrix}} + \\cr{\\begin{bmatrix} -1 \\\\ 3 \\end{bmatrix}} = \\cy{\\begin{bmatrix} 3 \\\\ 2 \\end{bmatrix}}',
        why: 'Each part adds on its own: $4 + (-1) = 3$ across and $-1 + 3 = 2$ up. Adding numbers does not care about order, so neither does adding vectors.',
        cue: 'When you see **“how far in each direction”**, think **vector**.',
        use: 'Every data point a model reads is a vector: a list of numbers that places it in space. A 28×28 image is a vector with 784 numbers.',
      },
    },
    { kind: 'scene', id: 'thruster', lines: S.thruster },
    { kind: 'puzzle', id: 'scale-p', puzzle: scale },
    {
      kind: 'name', id: 'name-scalar', entry: {
        id: 'scalar-multiple', term: 'scalar multiple', question: 'What happens when I use more or less of one arrow?', nodes: ['N02'],
        saw: 'With one thruster, every burn lay on one line through the start. Bigger amounts went further along it. Negative amounts went the other way.',
        means: 'Multiplying a vector by a number stretches it along its own line. A negative number also flips it.',
        name: 'A **scalar** is a plain number. The **scalar multiple** $k\\mathbf v$ multiplies every part of $\\mathbf v$ by $k$.',
        formula: '3\\,\\cg{\\begin{bmatrix} 2 \\\\ 1 \\end{bmatrix}} = \\cy{\\begin{bmatrix} 6 \\\\ 3 \\end{bmatrix}} \\qquad -2\\,\\cg{\\begin{bmatrix} 2 \\\\ 1 \\end{bmatrix}} = \\cy{\\begin{bmatrix} -4 \\\\ -2 \\end{bmatrix}}',
        why: 'Every part is multiplied by the same number, so the ratio across : up stays 2 : 1. The arrow stays on its line.',
        cue: 'When you see **“the same direction, more or less of it”**, think **scalar multiple**.',
        use: 'Turning up an image\'s brightness multiplies its pixel vector by a scalar.',
      },
    },
    { kind: 'scene', id: 'knocks', lines: S.knocks },
    { kind: 'puzzle', id: 'home-p', puzzle: home },
    {
      kind: 'name', id: 'name-length', entry: {
        id: 'length', term: 'length', question: 'How far is it?', nodes: ['N01'],
        saw: 'The burn home was 3 back and 4 down. Its two parts are the two short sides of a right-angled triangle, and the arrow is the long side.',
        means: 'Pythagoras gives the long side: $\\sqrt{3^2 + 4^2} = 5$. Adding the parts (3 + 4 = 7) gives the zig-zag route, which is longer.',
        name: 'The **length** of a vector, written $\\|\\mathbf v\\|$, is the distance from its tail to its tip.',
        formula: '\\|\\cg{\\mathbf v}\\| = \\sqrt{v_1^2 + v_2^2} \\qquad \\left\\|\\begin{bmatrix} -3 \\\\ -4 \\end{bmatrix}\\right\\| = \\sqrt{9 + 16} = 5',
        why: 'Square each part, add, take the square root. In 3-D there is one more square: $\\sqrt{v_1^2 + v_2^2 + v_3^2}$.',
        cue: 'When you see **“how far”** or **“distance”**, think **length**.',
        use: 'Nearest-neighbour search finds similar items by the length of the difference between two vectors.',
      },
    },
    { kind: 'scene', id: 'doubt-intro', lines: S.doubt },
    { kind: 'puzzle', id: 'doubt-p', puzzle: doubt },
    {
      kind: 'explain', id: 'explain', explain: {
        id: 'c01-explain', who: 'bram',
        intro: 'Before I bolt this into the autopilot, explain it to me. Three questions.',
        steps: [
          {
            ask: 'The burns $(4, -1)$ and $(-1, 3)$ end at the same place in either order. **Why?**',
            options: [
              { id: 'a', text: 'Across, the numbers add to the same total either way: $4 + (-1) = (-1) + 4$. The same goes for up.', right: true, why: 'Yes. Each part of a vector adds on its own, and adding numbers does not care about order.' },
              { id: 'b', text: 'Because the ship always flies in straight lines.', right: false, why: 'The two routes are different paths. They end together because the totals match, not because of the shape of the path.' },
              { id: 'c', text: 'Because both burns are short.', right: false, why: 'Bram shook the burns to every size. The two routes always met. Size has nothing to do with it.' },
            ],
          },
          {
            ask: 'What does multiplying a burn by $-2$ do to its arrow?',
            options: [
              { id: 'a', text: 'It turns the arrow a little.', right: false, why: 'Multiplying every part by the same number keeps the ratio of the parts, so the arrow stays on its own line. It cannot turn.' },
              { id: 'b', text: 'It flips the arrow to point the other way and makes it twice as long.', right: true, why: 'Yes. The minus sign flips it. The 2 doubles it. It stays on the same line.' },
              { id: 'c', text: 'It makes the arrow shorter.', right: false, why: 'Its length doubles. Only a number between −1 and 1 makes an arrow shorter.' },
            ],
          },
          {
            ask: 'How far does a burn of $(6, 8)$ take the ship?',
            options: [
              { id: 'a', text: '14, because $6 + 8 = 14$.', right: false, why: '14 is the zig-zag route: across, then up. The arrow cuts the corner, so it is shorter.' },
              { id: 'b', text: '48, because $6 \\times 8 = 48$.', right: false, why: '48 is the area of a 6 by 8 rectangle, not a distance.' },
              { id: 'c', text: '10, because $\\sqrt{6^2 + 8^2} = \\sqrt{100}$.', right: true, why: 'Yes. The parts are the short sides of a right-angled triangle. The arrow is the long side.' },
            ],
          },
        ],
        summary: 'A **vector** is a move: so far along each axis. **Adding vectors** adds their parts, so the order does not matter. **A scalar multiple** stretches or flips an arrow along its own line. **The length** is Pythagoras on the parts.',
        ownWords: 'Explain to someone who missed the lecture why east-then-north and north-then-east end in the same place.',
      },
    },
    {
      kind: 'build', id: 'build-add', build: {
        id: 'c01-add', fn: 'add', title: 'Add two moves',
        brief: 'Write `add(v, w)`. It returns the vector you get by doing move `v`, then move `w`.\n\n`v` and `w` are lists of numbers of the same length, such as `[4, -1]` and `[-1, 3]`. Add matching parts.',
        starter: 'def add(v, w):\n    """Return the vector for move v followed by move w."""\n    # v and w are lists like [4, -1] and [-1, 3]\n    return []\n',
        solution: 'def add(v, w):\n    """Return the vector for move v followed by move w."""\n    return [a + b for a, b in zip(v, w)]\n',
        tests: [
          { name: '`add([4, -1], [-1, 3])` is `[3, 2]`', args: [[4, -1], [-1, 3]], expect: [3, 2] },
          { name: 'the other order gives the same', args: [[-1, 3], [4, -1]], expect: [3, 2] },
          { name: 'three numbers: `add([1, 2, 3], [4, 5, 6])`', args: [[1, 2, 3], [4, 5, 6]], expect: [5, 7, 9] },
          { name: 'adding zero changes nothing', args: [[2, 5], [0, 0]], expect: [2, 5] },
        ],
        payoff: 'LANTERN adds burns with your `add` from now on.',
      },
    },
    {
      kind: 'build', id: 'build-length', build: {
        id: 'c01-length', fn: 'length', title: 'How far is a move?',
        brief: 'Write `length(v)`. It returns the length of vector `v`: square each part, add them, take the square root. `math.sqrt` is available.',
        starter: 'def length(v):\n    """Return the length of vector v."""\n    total = 0\n    # add up the square of each part\n    return math.sqrt(total)\n',
        solution: 'def length(v):\n    """Return the length of vector v."""\n    return math.sqrt(sum(x * x for x in v))\n',
        tests: [
          { name: '`length([3, 4])` is 5', args: [[3, 4]], expect: 5 },
          { name: 'negative parts: `length([-3, -4])` is 5', args: [[-3, -4]], expect: 5 },
          { name: 'three parts: `length([1, 2, 2])` is 3', args: [[1, 2, 2]], expect: 3 },
          { name: 'the zero vector has length 0', args: [[0, 0]], expect: 0 },
        ],
        payoff: 'The distance readouts use your `length` from now on.',
      },
    },
    { kind: 'scene', id: 'close', lines: S.close },
  ],
};

export default ch;

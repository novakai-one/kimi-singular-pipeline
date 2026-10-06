// Epilogue puzzles: the last setting (p1) and the optional layer (p2, the bridge to neural networks).
import type { PuzzleDef } from '../../../game/types';
import { MatrixView3 } from '../../../kit/matrixview3';
import { PointCloud } from '../../../kit/data';
import { FatLine } from '../../../gfx/lines';
import { Slider } from '../../../ui/widgets';
import { h } from '../../../ui/ui';
import { C } from '../../../core/theme';
import { sfx } from '../../../audio/sfx';
import { nice } from '../../../math/frac';
import { identity, matMul, inverse, type Mat } from '../../../math/la';
import { P, R } from '../../truth';
import * as L from './logic';
import { S } from './script';

const show3 = (M: Mat) => M.map((r) => `[${r.map((x) => nice(+x.toFixed(3))).join(', ')}]`).join(' ');

// ------------------------------------------------------------------ p1 The last setting

export const p1: PuzzleDef = {
  id: 'c27-p1',
  title: 'Which setting leaves every point where it is?',
  goal: 'Ilse reads her setting: **first spire (1, 0, 0), second (0, 1, 0), third (0, 0, 1)**. Set the three spires on the bench (drag the tips or type the numbers) and check that no point moves.',
  subgoals: ['Set the three spires to Ilse’s numbers', 'Check the setting in the Anchor’s own grid'],
  predict: {
    prompt: 'Each spire points straight along its own axis. What will the final pulse do to the ark?',
    choices: [{ id: 'none', text: 'Nothing: every point stays put' }, { id: 'turn', text: 'Turn everything a quarter' }, { id: 'flat', text: 'Flatten the stern' }],
    answer: 'none',
    reveal: 'Each column says where one axis arrow lands. If every axis arrow lands on itself, every combination of them does too: nothing moves.',
  },
  hints: [
    'Each spire is one column: where that axis arrow lands.',
    'For nothing to move, the first axis arrow must land on (1, 0, 0), the second on (0, 1, 0), the third on (0, 0, 1).',
    'Columns (1, 0, 0), (0, 1, 0), (0, 0, 1): the identity.',
  ],
  par: 3,
  view: '3d',
  onWin: S.p1Win,
  setup(p) {
    void p.g.stage.view3D({ target: [0.5, 0.5, 0.5], distance: 13, azimuth: -50, elevation: 24, ms: 0 });
    const r = p.readout('Spire bench');
    let checked = false;
    const mv = new MatrixView3(p, {
      M: R, draggable: true, input: true, snap: p.snap() ?? 0.5,
      onChange: (M) => {
        for (let j = 0; j < 3; j++) r.row(`s${j}`, `spire ${j + 1}`, `(${[0, 1, 2].map((i) => nice(+M[i][j].toFixed(3))).join(', ')})`, [C.v, C.w, C.u][j]);
        const g = matMul(matMul(inverse(P)!, M), P);
        r.row('g', 'in the Anchor’s grid', L.isIdentity(g, 1e-6) ? 'the same: nothing moves' : show3(g), L.isIdentity(M, 1e-6) ? C.result : undefined);
      },
      onCommit: (M) => {
        p.move();
        if (!L.isIdentity(M, 1e-6)) { p.bark('lantern', 'Some buoys still move with that setting. Each spire must point along its own axis, length one.'); return; }
        p.subgoal(0);
        if (!checked) {
          checked = true;
          // the same move written in the Anchor's grid: P⁻¹ I P = P⁻¹ P = I
          p.subgoal(1);
          sfx.discover();
          p.bark('lantern', 'In the Anchor’s grid: P⁻¹ I P = P⁻¹ P = I. The same in every grid.');
          p.win();
        }
      },
    });
    return {
      async showMe() { await mv.showMe(identity(3), 1400); },
      async wrong() { await mv.showMe([[1, 0, 0], [0, 1, 0], [0, 0, 0]], 800); },
    };
  },
};

// ------------------------------------------------------------------ p2 [S] The layer

export const p2: PuzzleDef = {
  id: 'c27-p2',
  title: 'Can a few steps sort what one matrix cannot? (optional)',
  goal: 'Sort the record’s stars: the **cluster** inside, the **ring** outside. One matrix and a straight cut cannot. Turn on the four outputs, then the clip, then set the cut so every star lands on its own side.',
  subgoals: ['See that one move and one straight cut fail', 'Clip negative outputs to zero', 'Set the cut between the two groups'],
  hints: [
    'With the clip off, the four outputs x, −x, y, −y always add to zero: every star scores the same.',
    'With the clip on, the score is |x| + |y|. The cut |x| + |y| = t is a diamond.',
    'Any cut between 1.4 and 2 works. Try 1.7.',
  ],
  par: 4,
  setup(p) {
    p.grid();
    p.g.stage.view2D({ center: [0, 0], height: 8.5, ms: 0 });
    const pts = L.layerPoints();
    const all = [...pts.blob, ...pts.ring];
    const base = all.map((_, i) => (i < pts.blob.length ? C.u : C.orange));
    const cloud = new PointCloud(p, { points: all.map((q) => [q[0], q[1], 0]), colors: base, size: 0.06 });
    void cloud;
    const diamond = new FatLine(p.g.stage, [[1, 0, 0], [0, 1, 0], [-1, 0, 0], [0, -1, 0], [1, 0, 0]], { color: C.result, width: 2.4, intensity: 1.3 });
    diamond.object.visible = false;
    p.add(diamond.object);
    p.onDispose(() => diamond.dispose());
    let clip = false, t = 1, tried = false;
    const r = p.readout('The layer');
    const flags = [false, false, false];
    const tick = (i: number) => { if (!flags[i]) { flags[i] = true; p.subgoal(i); } };
    const upd = () => {
      const sc = all.map((q) => L.score(q, clip));
      let wrong = 0;
      sc.forEach((s, i) => { const inside = s <= t; const ok = i < pts.blob.length ? inside : !inside; if (!ok) wrong++; cloud.setColorAt(i, ok ? base[i] : C.bad); });
      diamond.object.visible = clip;
      if (clip) diamond.setPoints([[t, 0, 0], [0, t, 0], [-t, 0, 0], [0, -t, 0], [t, 0, 0]]);
      r.row('w', 'four outputs', 'x, −x, y, −y');
      r.row('c', 'clip negatives (ReLU)', clip ? 'on' : 'off', clip ? C.result : undefined);
      r.row('s', 'score of each star', clip ? '|x| + |y|' : 'always 0');
      r.row('x', 'stars on the wrong side', String(wrong), wrong ? C.bad : C.good);
      if (clip && L.separates(t, true, pts)) { tick(2); p.win(); }
    };
    const tryBtn = h('button', { class: 'btn small', type: 'button' }, 'Try one move and a straight cut');
    tryBtn.addEventListener('click', async () => {
      p.move();
      sfx.whoosh(0.8);
      tryBtn.disabled = true;
      // the honest reason: a move keeps the origin fixed and the ring around the cluster; a line cannot fence it in
      p.bark('lantern', 'Two hundred moves and cuts tried. Every move keeps the cluster inside the ring, and a straight line cannot fence in a middle.');
      tried = true; tick(0);
      tryBtn.disabled = false;
    });
    const clipBtn = h('button', { class: 'btn small', type: 'button', 'aria-pressed': 'false' }, 'Clip negatives');
    clipBtn.addEventListener('click', () => { p.move(); clip = !clip; clipBtn.setAttribute('aria-pressed', String(clip)); if (clip && tried) tick(1); sfx.click(); upd(); });
    const cut = new Slider({ label: 'cut level', min: 0, max: 3, step: 0.1, value: t, onInput: (x) => { t = x; upd(); } });
    p.dock().append(tryBtn, clipBtn, cut.el);
    upd();
    return {
      async showMe() { tried = true; tick(0); clip = true; clipBtn.setAttribute('aria-pressed', 'true'); tick(1); t = 1.7; cut.set(1.7, false); upd(); },
      wrong() { clip = false; t = 1.7; cut.set(1.7, false); upd(); },
    };
  },
};


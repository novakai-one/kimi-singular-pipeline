// Chapter 18, the trajectory problem (game-design/ch18-trajectory-spec.md):
//   p1   Scenes 1–3: a failed launch, a kept direction and its multiplier (typed before it is shown),
//        a second direction, multiples rejected as "another vector, not another direction".
//   m1   Scene 4: two pulses to the waypoint at (9, 9).
//   solo Scene 6: an unseen pulse, a two-pulse mission, help recorded; "another challenge" on demand.
// Testing arrows is exploring and never costs anything; only committed answers (a multiplier, a mission
// launch) count as moves. Hints and Show me work stage by stage and mark that stage as assisted.
import type { PuzzleCtx, PuzzleDef, PuzzleRuntime } from '../../../game/types';
import { h, button, inline } from '../../../ui/ui';
import { sfx } from '../../../audio/sfx';
import { wait } from '../../../core/tween';
import { matVec, type Vec } from '../../../math/la';
import { S as SAVE, save } from '../../../core/save';
import {
  PULSE_A, M1, SOLO, checkMult, cleanV, genMission, isZero, keeps, keptLines, launchFor, lineTurnDeg, multipleOf, multiplierOf,
  onLineOf, path, reaches, type Attempt, type Mission,
} from './traj-logic';
import { M1T, P1, SOLOT, UNREAD, UNREAD_M, ZERO, LOG_NAMES, fv, tn, tnp, tv, wrongMult, type Seen } from './traj-text';
import { NumCell, TrajView, VecField, hideHint, pips, record, records, resultLine, trajDock, type TrajDock } from './traj';
import { sg } from './parts';
import { S } from './script';

const fresh = (): Attempt => ({ help: 0, wrong: 0 });
const fmt = (m: number) => tn(m).replace(/-/g, '−');

/** Stage hints: the next one for the stage in play, counted as help. */
function hinter(list: () => string[], onGive: () => void): () => { text: string; left: number } | null {
  let key = '', n = 0;
  return () => {
    const hs = list();
    const k = hs.join('|');
    if (k !== key) { key = k; n = 0; }
    if (!hs.length) return null;
    const i = Math.min(n, hs.length - 1);
    if (n < hs.length) { n++; onGive(); }
    return { text: hs[i], left: hs.length - n };
  };
}

/** Reset the objective card after a Reset (the runner keeps the old ticks and goal). */
function freshObjective(p: PuzzleCtx, goal: string, subgoals: number): void {
  p.setGoal(goal);
  for (let i = 0; i < subgoals; i++) p.subgoal(i, false);
}

/** The flight log: every stage recorded so far, with how it was passed. */
export function flightLog(): HTMLElement {
  const rs = records();
  const row = (k: string) => (rs[k] ? [h('span', { class: 'n' }, LOG_NAMES[k]), h('span', { class: rs[k] }, rs[k])] : []);
  // the ten rounds as one line of counts, so the log fits on a phone
  const drill = Object.keys(LOG_NAMES).filter((k) => k.startsWith('drill-') && rs[k]).map((k) => rs[k]);
  const count = (o: string) => drill.filter((x) => x === o).length;
  const rounds = drill.length
    ? [h('span', { class: 'n' }, `Practice rounds (${drill.length})`), h('span', {},
      h('span', { class: 'independent' }, `${count('independent')} independent`), ' · ',
      h('span', { class: 'corrected' }, `${count('corrected')} corrected`), ' · ',
      h('span', { class: 'assisted' }, `${count('assisted')} assisted`))]
    : [];
  return h('div', { class: 'tj-log' }, ...row('p1-line1'), ...row('p1-line2'), ...row('m1'), ...rounds, ...row('solo'));
}

// ------------------------------------------------------------------ Scenes 1–3

export const p1: PuzzleDef = {
  id: 'c18-p1',
  title: P1.title,
  goal: P1.goal,
  subgoals: P1.subgoals,
  hints: P1.hints.find1,
  par: 3, // testing arrows is free; only multiplier answers are moves, so one wrong answer still gets 3 stars
  onWin: S.p1Win,
  setup(p) {
    freshObjective(p, P1.goal, 3);
    const A = PULSE_A;
    const view = new TrajView(p, A);
    const d = trajDock(p, A);
    const field = new VecField({ value: [1, 0], onEnter: () => void test() });
    const go = button('Test this arrow', () => void test(), { cls: 'primary small' });
    const res = h('div', { class: 'tj-res' });
    const q = h('div', { class: 'tj-q' });
    q.hidden = true;
    const chips = h('div', { class: 'tj-lines' });
    d.body.append(h('div', { class: 'tj-row' }, field.el, go), res, q, chips);
    d.msg(P1.start);
    // Scene 1: the intended route for the prefilled (1, 0) is lit, and the first launch is that one, so every
    // player sees a failure before anything holds. The numbers unlock after it.
    view.preview([1, 0]);
    field.enable(false);
    void view.frame([[1, 0], [2, 1]], { ms: 0, min: 3.2 });
    // what the name card (beat 4) will quote back
    const seen: Seen = { lines: [] };
    SAVE().flags['c18-seen'] = seen;

    const found: { dir: Vec; m: number }[] = [];
    const queue: { v: Vec; idx: number }[] = []; // kept lines waiting for their multiplier
    let att = fresh();
    let misses = 0, busy = false, done = false;
    let cell: NumCell | null = null;
    const stage = (): 'find1' | 'ask' | 'find2' | 'done' => (done ? 'done' : queue.length ? 'ask' : found.length ? 'find2' : 'find1');

    const ask = () => {
      const cur = queue[0];
      const w = matVec(A, cur.v);
      cell = new NumCell({ aria: 'multiplier', onEnter: () => check(), cls: 'm', placeholder: '?' });
      q.className = 'tj-q';
      // "changed its length" is only true when it did
      const sameLength = Math.abs(Math.hypot(w[0], w[1]) - Math.hypot(cur.v[0], cur.v[1])) < 1e-9 * (1 + Math.hypot(cur.v[0], cur.v[1]));
      q.replaceChildren(
        h('div', { class: 't', html: inline(`${sameLength ? P1.keptSame : P1.kept} ${P1.ask(cur.v)}`) }),
        h('div', { class: 'tj-row' }, h('span', { class: 'k', html: inline(`$${tv(w)} =$`) }), cell.el, h('span', { class: 'k', html: inline(`$\\times\\ ${tv(cur.v)}$`) }), button('Check', () => check(), { cls: 'primary small' })),
      );
      q.hidden = false;
      d.msg(P1.askShort);
      if (!p.g.headless) window.setTimeout(() => cell?.focus(), 40);
    };

    const check = () => {
      if (!cell || !queue.length || done) return;
      const m = cell.value();
      if (m === null) { d.msg(UNREAD_M, 'warn'); return; }
      p.move();
      const cur = queue[0];
      const vd = checkMult(A, cur.v, m);
      if (!vd.ok) {
        att.wrong++;
        sfx.miss();
        view.ghost(vd.scaled, `$${tnp(m)}${tv(cur.v)}$`);
        d.msg(wrongMult(cur.v, vd), 'bad');
        return;
      }
      // right: lock the line and only now show its multiplier
      view.ghost(null);
      queue.shift();
      view.setLockValue(cur.idx, m);
      void view.flashLock(cur.idx, 900);
      sfx.success();
      found.push({ dir: cur.v, m });
      seen.lines.push([cur.v.slice(), cleanV(vd.image), m]);
      save();
      record(`p1-line${found.length}`, att);
      att = fresh();
      hideHint(p);
      chips.append(h('span', { class: 'tj-chip' }, `${fv(cur.v)} ×${fmt(m)}`));
      sg(p, found.length === 1 ? 1 : 2, true);
      if (queue.length) { ask(); d.msg(P1.right(cur.v, vd.image, m), 'good'); return; }
      q.hidden = true;
      if (found.length < 2) { d.msg(`${P1.right(cur.v, vd.image, m)} ${P1.another}`, 'good'); return; }
      void finish();
    };

    const test = async (vIn?: Vec) => {
      if (busy || done) return;
      if (vIn) field.set(vIn);
      const v = field.get();
      if (!v) { d.msg(UNREAD, 'warn'); return; }
      busy = true;
      go.disabled = true;
      try {
        if (isZero(v)) { view.clear(); res.textContent = ''; sfx.miss(); d.msg(ZERO, 'warn'); return; }
        const w = cleanV(matVec(A, v));
        await view.frame([v, w], { min: 3.2 });
        view.clear();
        await view.launch(v);
        await wait(140);
        await view.pulse();
        const kept = keeps(A, v);
        const deg = lineTurnDeg(A, v);
        res.innerHTML = inline(resultLine(v, w, kept, deg));
        if (!kept) {
          await view.showTurned(v, w);
          misses++;
          if (misses === 1) {
            seen.miss = [v.slice(), w.slice()];
            save();
            field.enable(true);
            d.msg(`${P1.firstMiss(v, w)} ${P1.edit}`, 'warn');
            if (!p.g.headless) window.setTimeout(() => field.focus(), 60);
          } else d.msg(P1.miss(v, w, deg), 'warn');
          return;
        }
        const li = view.lockOf(v);
        const lockedLine = found.findIndex((f) => onLineOf(f.dir, v));
        if (lockedLine >= 0) {
          // another vector on a line already locked: same direction, not a new one
          await view.showKept(v, w, { quiet: true, ruler: true });
          void view.flashLock(li, 900);
          const base = found[lockedLine].dir, k = multipleOf(v, base);
          if (Math.abs(k - 1) < 1e-9) { d.msg(P1.again(v), ''); return; }
          if (!seen.dupe) { seen.dupe = [v.slice(), base.slice(), k]; save(); }
          d.msg(P1.dupe(v, base, k), '');
          return;
        }
        const pending = queue.findIndex((x) => onLineOf(x.v, v));
        if (pending >= 0) {
          await view.showKept(v, w, { quiet: true, ruler: true });
          void view.flashLock(li, 900);
          d.msg(Math.abs(multipleOf(v, queue[pending].v) - 1) < 1e-9 ? P1.againPending(v) : P1.dupePending(v, queue[pending].v), '');
          return;
        }
        // a new kept direction
        await view.showKept(v, w, { ruler: true });
        sg(p, 0, true);
        const idx = view.lock(v, null);
        queue.push({ v: v.slice(), idx });
        if (queue.length === 1) { hideHint(p); ask(); } else d.msg(P1.queued);
      } finally {
        busy = false;
        go.disabled = done;
      }
    };

    /** The kept line of A not yet found or waiting: what Scene 3 is looking for. */
    const nextLine = (): Vec | null => keptLines(A).map((l) => l.dir).find((dir) => !found.some((f) => onLineOf(f.dir, dir)) && !queue.some((x) => onLineOf(x.v, dir))) ?? null;

    const finish = async () => {
      done = true;
      field.enable(false);
      go.disabled = true;
      d.msg(P1.done, 'good');
      view.clear();
      await view.frame([[2, 2], [-2, -2], [2, -2], [-2, 2]], { min: 3 });
      await view.showcase(p.g.headless ? 200 : 1900);
      p.win();
    };

    const step = async () => {
      while (busy) await wait(20);
      if (done) return;
      att.help++;
      const s = stage();
      // the first launch is always the prefilled (1, 0): Show me plays it before anything else
      if (!misses) await test([1, 0]);
      else if (s === 'find1') await test([1, 1]);
      else if (s === 'find2') { const n = nextLine(); if (n) await test(n); }
      else if (s === 'ask' && cell) { cell.set(multiplierOf(A, queue[0].v) ?? 0); check(); }
    };
    const hint = hinter(() => {
      const s = stage();
      if (!misses) return [P1.hints.first];
      if (s === 'find1') return P1.hints.find1;
      if (s === 'find2') return P1.hints.find2(found[0].dir);
      if (s === 'ask') return P1.hints.ask(queue[0].v, matVec(A, queue[0].v));
      return [];
    }, () => { att.help++; });

    const all = async () => { for (let i = 0; i < 10 && !done; i++) await step(); while (!p.won) await wait(20); };
    const rt: PuzzleRuntime = {
      hint,
      showStep: step,
      async showMe() { await all(); },
      async solve() { await all(); },
      async wrong() { await test([1, 0]); },
    };
    return rt;
  },
};


// ------------------------------------------------------------------ Scene 4

/** A waypoint mission: launch, then the pulse fires `pulses` times. Shared by Scene 4, round 10 and Scene 6. */
export interface MissionRun {
  launch(v?: Vec): Promise<void>;
  probe?(v?: Vec): Promise<void>;
  done: boolean;
  busy: boolean;
  att: Attempt;
  field: VecField;
}

export function missionPanel(p: PuzzleCtx, view: TrajView, d: TrajDock, ms: Mission, o: {
  start: string; hit: (pts: Vec[]) => string; miss: (v: Vec, end: Vec, t: Vec) => string; missOnLine?: (end: Vec) => string;
  probes?: boolean; onHit: (pts: Vec[]) => void | Promise<void>; label?: string; value?: Vec;
}): MissionRun {
  const pad = view.waypoint(ms.target, o.label ?? `waypoint ${fv(ms.target)}`);
  const pipBox = h('span', { class: 'tj-pipbox' }, pips(ms.pulses));
  d.head.append(h('span', { class: 'tj-row tj-pulses' }, h('span', { class: 'k' }, 'pulses'), pipBox));
  const res = h('div', { class: 'tj-res' });
  const field = new VecField({ value: o.value ?? [1, 0], onEnter: () => void run.launch() });
  const run: MissionRun = { done: false, busy: false, att: fresh(), field, launch: async () => {} };
  const goL = button('Launch', () => void run.launch(), { cls: 'primary small' });
  const row = h('div', { class: 'tj-row' }, field.el, goL);
  let goP: HTMLButtonElement | null = null;
  if (o.probes) { goP = button('Probe', () => void run.probe?.(), { cls: 'small' }); row.append(goP); }
  d.body.append(row, res);
  d.msg(o.start);
  const lock = (on: boolean) => { goL.disabled = on || run.done; if (goP) goP.disabled = on || run.done; };
  // a missed flight must still end on screen, so the player sees where the pulses took it: no cap on the path
  const cap = Infinity;

  run.launch = async (vIn?: Vec) => {
    if (run.busy || run.done) return;
    if (vIn) field.set(vIn);
    const v = field.get();
    if (!v) { d.msg(UNREAD, 'warn'); return; }
    if (isZero(v)) { sfx.miss(); d.msg(ZERO, 'warn'); return; }
    run.busy = true; lock(true);
    try {
      p.move();
      const pts = path(ms.M, v, ms.pulses);
      await view.frame([...pts, ms.target], { min: 3, cap });
      view.clear(true);
      pipBox.replaceChildren(pips(ms.pulses));
      await view.launch(v);
      for (let k = 1; k <= ms.pulses; k++) {
        await (k > 1 ? view.settled() : wait(150));
        if (k > 1) view.mark(pts[k - 1], `after pulse ${k - 1} · ${fv(pts[k - 1])}`, undefined, k % 2 === 1);
        await view.pulse();
        pipBox.replaceChildren(pips(ms.pulses, k));
      }
      const end = pts[ms.pulses];
      res.innerHTML = inline(`$${pts.map(tv).join(' \\to ')}$`);
      if (reaches(ms, v)) {
        run.done = true;
        await view.arrive(pad, ms.target);
        d.msg(o.hit(pts), 'good');
        await o.onHit(pts);
        return;
      }
      run.att.wrong++;
      sfx.offcourse();
      view.showMiss(end, ms.target);
      view.mark(end, '', '#ffb347'); // the yellow tag already gives the end point
      const line = keeps(ms.M, v) && onLineOf(ms.target, v);
      d.msg(`${o.miss(v, end, ms.target)}${line && o.missOnLine ? ` ${o.missOnLine(end)}` : ''}`, 'bad');
    } finally { run.busy = false; lock(false); }
  };

  if (o.probes) {
    run.probe = async (vIn?: Vec) => {
      if (run.busy || run.done) return;
      if (vIn) field.set(vIn);
      const v = field.get();
      if (!v) { d.msg(UNREAD, 'warn'); return; }
      if (isZero(v)) { sfx.miss(); d.msg(ZERO, 'warn'); return; }
      run.busy = true; lock(true);
      try {
        const w = cleanV(matVec(ms.M, v));
        await view.frame([v, w, ms.target], { min: 3, cap });
        view.clear();
        await view.launch(v);
        await wait(120);
        await view.pulse();
        const kept = keeps(ms.M, v), deg = lineTurnDeg(ms.M, v);
        res.innerHTML = inline(resultLine(v, w, kept, deg));
        if (kept) await view.showKept(v, w, { quiet: true }); else await view.showTurned(v, w);
        d.msg(SOLOT.probe(v, w, kept, deg));
      } finally { run.busy = false; lock(false); }
    };
  }
  return run;
}

export const m1: PuzzleDef = {
  id: 'c18-m1',
  title: M1T.title,
  goal: M1T.goal,
  subgoals: M1T.subgoals,
  hints: M1T.hints,
  par: 2, // each launch is a commit; one miss still earns the second star
  setup(p) {
    freshObjective(p, M1T.goal, 1);
    const view = new TrajView(p, M1.M);
    // the chart: the two lines found in Scenes 2–3, with their multipliers
    for (const l of [{ dir: [1, 1], m: 3 }, { dir: [1, -1], m: 1 }]) view.lock(l.dir, l.m);
    const d = trajDock(p, M1.M);
    const run = missionPanel(p, view, d, M1, {
      start: M1T.start, hit: M1T.hit, miss: M1T.miss, missOnLine: M1T.missOnLine,
      onHit: async () => { record('m1', run.att); sg(p, 0, true); await wait(p.g.headless ? 50 : 900); p.win(); },
    });
    void view.frame([M1.target, [-2, 2], [1, -1]], { ms: 0, min: 3 });
    const hint = hinter(() => (run.done ? [] : M1T.hints), () => { run.att.help++; });
    const step = async () => { while (run.busy) await wait(20); if (run.done) return; run.att.help++; await run.launch(launchFor(M1)!); };
    return {
      hint, showStep: step,
      async showMe() { await step(); while (!p.won) await wait(20); },
      async solve() { await step(); while (!p.won) await wait(20); },
      async wrong() { await run.launch([3, 3]); },
    };
  },
};

// ------------------------------------------------------------------ Scene 6

export const solo: PuzzleDef = {
  id: 'c18-solo',
  title: SOLOT.title,
  goal: SOLOT.goal,
  subgoals: SOLOT.subgoals,
  hints: SOLOT.hints,
  par: 2, // probes are free; mission launches are commits
  setup(p) {
    freshObjective(p, SOLOT.goal, 1);
    let ms: Mission = SOLO;
    let round = 0;
    const view = new TrajView(p, ms.M);
    const d = trajDock(p, ms.M, undefined, 'B');
    const summary = h('div', { class: 'tj-sum' });
    summary.hidden = true;
    let run: MissionRun;
    let finished = false;

    const start = () => {
      view.clear();
      view.clearWaypoints();
      d.body.replaceChildren();
      d.head.querySelectorAll('.tj-pipbox').forEach((x) => x.parentElement?.remove());
      summary.hidden = true;
      d.body.append(summary);
      run = missionPanel(p, view, d, ms, {
        start: round ? SOLOT.more : SOLOT.start, hit: (pts) => `Waypoint reached: $${pts.map(tv).join(' \\to ')}$.`, miss: SOLOT.miss, probes: true,
        onHit: (pts) => done(pts),
      });
      d.body.append(summary);
      void view.frame([ms.target], { ms: 0, min: 3 });
    };

    const done = (pts: Vec[]) => {
      const id = round === 0 ? 'solo' : 'solo-more';
      const out = record(id, run.att);
      if (round === 0) sg(p, 0, true);
      const v = pts[0];
      const m = keptLines(ms.M).find((l) => onLineOf(l.dir, v))?.m ?? multiplierOf(ms.M, v) ?? 0;
      const wrong = run.att.wrong;
      const how = out === 'independent' ? '**Independent:** no help, no missed launches.'
        : out === 'corrected' ? `**Corrected:** ${wrong} missed launch${wrong === 1 ? '' : 'es'} before the right one, no help.`
          : '**Assisted:** a hint or Show me was used, so this one does not count as independent.';
      d.msg(`Waypoint reached: $${pts.map(tv).join(' \\to ')}$.`, 'good');
      summary.replaceChildren(
        h('div', { html: inline(how) }),
        h('div', { html: inline(SOLOT.summary(v, m, ms.pulses, ms.target)) }),
        h('div', { class: 'tj-kick' }, 'Flight log'),
        flightLog(),
        h('div', { class: 'tj-row' },
          button('Another challenge', () => { round++; ms = genMission(1000 + round * 37 + Math.floor(Math.random() * 1000), [ms.M]); view.M = ms.M; d.setMatrix(ms.M); start(); }, { cls: 'small' }),
          button('Finish', () => { if (!finished) { finished = true; p.win(); } }, { cls: 'primary small' })),
      );
      summary.hidden = false;
      void wait(30).then(() => summary.scrollIntoView({ block: 'nearest' }));
    };
    start();

    const hint = hinter(() => (run.done || round > 0 ? [] : SOLOT.hints), () => { run.att.help++; });
    const step = async () => {
      while (run.busy) await wait(20);
      if (run.done) return;
      run.att.help++;
      await run.launch(launchFor(ms)!);
    };
    const all = async () => {
      await step();
      while (!run.done) await wait(20);
      const fin = Array.from(d.body.querySelectorAll('button')).find((b) => b.textContent === 'Finish');
      fin?.click();
      while (!p.won) await wait(20);
    };
    return {
      hint, showStep: step,
      async showMe() { await all(); },
      async solve() { await all(); },
      async wrong() { await run.launch([8, 4]); },
    };
  },
};


// Prologue: "Where did everything go?" The first pulse moves every buoy at once. The player checks
// three things with their own hands: straight lines stay straight, even spacing stays even, and one
// point does not move. Nothing is named yet (linearity is answered in the transformations act).
import { Vector3 } from 'three';
import type { ChapterDef, Game, PuzzleDef, V3 } from '../../../game/types';
import { BuoyField } from '../../../gfx/buoys';
import { Arrow } from '../../../gfx/arrow';
import { Dot } from '../../../gfx/markers';
import { FatLine, FatSegments } from '../../../gfx/lines';
import { C } from '../../../core/theme';
import { animate, ease, wait } from '../../../core/tween';
import { sfx } from '../../../audio/sfx';
import { music } from '../../../audio/music';
import { fadeBlack, letterbox, NumberBoard, stamp, titleCard } from '../../../kit/cine';
import { makeAnchor, makeLantern } from '../../common/set';
import { near } from '../../../kit/handle';
import { S, PULSE0 } from './script';
import type { Ship } from '../../../gfx/models';

const CYAN = '#59e1ff';
const ORANGE = C.orange;
/** Reference buoys (positions before the pulse). */
const LINE3: V3[] = [[1, -1, 0], [2, 1, 0], [3, 3, 0]];
const EVEN4: V3[] = [[-3, -1, 0], [-2, 0, 0], [-1, 1, 0], [0, 2, 0]];
const SHIP0: V3 = [-4, -3, 0];
const apply = (M: number[][], p: V3): V3 => [M[0][0] * p[0] + M[0][1] * p[1], M[1][0] * p[0] + M[1][1] * p[1], p[2]];

// ------------------------------------------------------------------ the set (shared by the cinematic beats)

interface Set0 { buoys: BuoyField; ship: Ship; anchor: Promise<unknown> }
let set: Set0 | null = null;

function ensureSet(g: Game, pulsed: boolean): Set0 {
  if (set && set.buoys.object.parent === g.stage.world) return set;
  const buoys = new BuoyField(g.stage, { extent: 8 });
  g.stage.world.add(buoys.object);
  const ship = makeLantern(g.stage, 0.16);
  g.stage.world.add(ship.object);
  ship.object.position.set(...(pulsed ? apply(PULSE0, SHIP0) : SHIP0));
  ship.object.position.z = 0.3;
  ship.face([1, 0.75, 0]);
  const anchor = makeAnchor(g.stage, 0.45);
  if (pulsed) buoys.set(PULSE0);
  markRefs(buoys);
  set = { buoys, ship, anchor };
  return set;
}

function markRefs(b: BuoyField): void {
  b.highlight(LINE3.map((p) => b.indexOf(p)), CYAN);
  b.highlight(EVEN4.map((p) => b.indexOf(p)), ORANGE);
}

// ------------------------------------------------------------------ puzzles

const linePuzzle: PuzzleDef = {
  id: 'c00-line',
  title: 'Are the three still in a line?',
  goal: 'Lay the straight ruler through all three **cyan** buoys. Drag its two ends; they snap to buoys.',
  predict: {
    prompt: 'The pulse moved every buoy. Are the three cyan buoys still on one straight line?',
    choices: [{ id: 'yes', text: 'Yes, still in a line' }, { id: 'bent', text: 'No, the line bent' }, { id: 'depends', text: 'Only if the pulse was small' }],
    answer: 'yes',
    reveal: 'They are still on one line. The pulse moved every buoy, but **in a way that keeps straight lines straight**.',
  },
  hints: ['A ruler through two of them is easy. The question is whether the third one is on it too.', 'Put the ends of the ruler on the two outer cyan buoys.'],
  par: 2,
  onWin: S.lineWin,
  setup(p) {
    p.g.stage.view2D({ center: [2, 0], height: 9, ms: 0 });
    const grid = p.grid({ main: 0, base: 0.12, axis: 0 });
    void grid;
    const b = new BuoyField(p.g.stage, { extent: 8 });
    b.set(PULSE0);
    markRefs(b);
    b.highlight(EVEN4.map((q) => b.indexOf(q)), null);
    p.add(b);
    const targets = LINE3.map((q) => apply(PULSE0, q));
    // the ruler: two draggable ends that snap to the nearest buoy
    const ends: V3[] = [[-1, -3, 0], [-2, 2, 0]].map((q) => apply(PULSE0, q as V3));
    const ruler = new FatLine(p.g.stage, [[0, 0, 0], [1, 0, 0]], { color: '#e8f1ff', width: 2.5, intensity: 1.4, opacity: 0.9 });
    const dots = ends.map((e) => new Dot(e, { color: '#e8f1ff', size: 0.11 }));
    p.add(ruler.object, ...dots);
    p.onDispose(() => ruler.dispose());
    const draw = () => {
      const a = new Vector3(...ends[0]), c = new Vector3(...ends[1]);
      const d = c.clone().sub(a).normalize().multiplyScalar(30);
      ruler.setPoints([[a.x - d.x, a.y - d.y, 0.02], [c.x + d.x, c.y + d.y, 0.02]]);
    };
    const check = () => {
      const a = new Vector3(...ends[0]), c = new Vector3(...ends[1]);
      if (a.distanceTo(c) < 0.5) return false;
      const dir = c.clone().sub(a).normalize();
      return targets.every((t) => {
        const v = new Vector3(...t).sub(a);
        return Math.abs(v.x * dir.y - v.y * dir.x) < 0.08;
      });
    };
    draw();
    dots.forEach((dot, k) => {
      p.g.drag.add({
        target: dot.mesh, getPos: () => new Vector3(...ends[k]),
        constrain: (q) => {
          const i = b.pick(...screenOf(p.g, q), 40);
          return i >= 0 ? new Vector3(...b.pos(i)) : q;
        },
        onMove: (q) => { ends[k] = [q.x, q.y, 0]; dot.at(ends[k]); draw(); },
        onEnd: () => { p.move(); sfx.snap(); if (check()) { ruler.setColor(CYAN, 1.8); p.win(); } },
      });
    });
    return {
      async showMe() {
        const from = ends.map((e) => [...e] as V3);
        await animate(900, (k) => {
          for (let j = 0; j < 2; j++) {
            const to = targets[j === 0 ? 0 : 2];
            ends[j] = [from[j][0] + (to[0] - from[j][0]) * k, from[j][1] + (to[1] - from[j][1]) * k, 0];
            dots[j].at(ends[j]);
          }
          draw();
        }, ease.inOut);
        ruler.setColor(CYAN, 1.8);
        p.win();
      },
    };
  },
};

/** Client coordinates of a world point (for buoy picking during a drag). */
function screenOf(g: Game, q: Vector3): [number, number] {
  const s = g.stage.toScreen(q);
  const r = g.stage.renderer.domElement.getBoundingClientRect();
  return [s.x + r.left, s.y + r.top];
}

const evenPuzzle: PuzzleDef = {
  id: 'c00-even',
  title: 'Are the four still evenly spaced?',
  goal: 'Drag the tip of the step arrow from the first **orange** buoy to the second. The game repeats your step twice.',
  hints: ['The step arrow starts on the first orange buoy. Put its tip on the next orange buoy along.', 'Watch where the two copies of your step land.'],
  par: 1,
  onWin: S.evenWin,
  setup(p) {
    p.g.stage.view2D({ center: [-1.5, 1], height: 8, ms: 0 });
    p.grid({ main: 0, base: 0.12, axis: 0 });
    const b = new BuoyField(p.g.stage, { extent: 8 });
    b.set(PULSE0);
    b.highlight(EVEN4.map((q) => b.indexOf(q)), ORANGE);
    p.add(b);
    const pts = EVEN4.map((q) => apply(PULSE0, q));
    const step = new Arrow(pts[0], [pts[0][0] + 0.6, pts[0][1] - 0.8, 0], { color: '#e8f1ff', handle: true, label: 'step' });
    const copies = [new Arrow(pts[0], pts[0], { color: ORANGE, opacity: 0.75, width: 0.035 }), new Arrow(pts[0], pts[0], { color: ORANGE, opacity: 0.75, width: 0.035 })];
    p.add(step, ...copies);
    const relay = () => {
      const v = new Vector3().subVectors(step.to, step.from);
      let at = step.to.clone();
      for (const c of copies) { const nx = at.clone().add(v); c.set(at, nx); at = nx; }
    };
    relay();
    const done = () => near([step.to.x, step.to.y, 0], pts[1], 0.12);
    p.g.drag.add({
      target: step.grab, getPos: () => step.to.clone(),
      constrain: (q) => { const i = b.pick(...screenOf(p.g, q), 40); return i >= 0 ? new Vector3(...b.pos(i)) : q; },
      onMove: (q) => { step.setTo([q.x, q.y, 0]); relay(); sfx.tick(q.y); },
      onEnd: () => { p.move(); if (done()) { copies.forEach((c) => void c.pulse()); p.win(); } },
    });
    return {
      async showMe() { await step.moveTo(pts[1], 900); relay(); copies.forEach((c) => void c.pulse()); p.win(); },
    };
  },
};

const stillPuzzle: PuzzleDef = {
  id: 'c00-still',
  title: 'What did not move?',
  goal: 'The faint rings show where each buoy was before the pulse. Click the one buoy that is **still exactly where it was**.',
  hints: ['Each thin line joins a buoy to where it was. Look for a buoy with no line at all.', 'Look at the middle, under the Anchor.'],
  par: 1,
  onWin: S.stillWin,
  setup(p) {
    p.g.stage.view2D({ center: [0, 0], height: 9, ms: 0 });
    p.grid({ main: 0, base: 0.1, axis: 0 });
    const b = new BuoyField(p.g.stage, { extent: 6 });
    b.set(PULSE0);
    p.add(b);
    const ghosts = new BuoyField(p.g.stage, { extent: 6, color: '#3a5a86', size: 0.035 });
    p.add(ghosts);
    const segs: [V3, V3][] = b.base.map((q, i) => [[q[0], q[1], -0.01], [...b.pos(i).slice(0, 2), -0.01] as V3]);
    const lines = new FatSegments(p.g.stage, segs, { color: '#6f8fbf', width: 1, opacity: 0.45 });
    p.add(lines.object);
    p.onDispose(() => lines.dispose());
    const origin = b.indexOf([0, 0, 0]);
    let wrong = 0;
    const onClick = (e: PointerEvent) => {
      const i = b.pick(e.clientX, e.clientY, 22);
      if (i < 0 || p.won) return;
      p.move();
      if (i === origin) { b.highlight([i], CYAN); sfx.success(); p.win(); }
      else {
        wrong++;
        b.highlight([i], C.orange, 0.6);
        sfx.miss();
        const was = b.base[i];
        p.bark('lantern', `That buoy moved from (${was[0]}, ${was[1]}).`);
        if (wrong === 3) p.bark('bram', 'Look for the one with no line from where it was.');
      }
    };
    p.g.stage.renderer.domElement.addEventListener('pointerdown', onClick);
    p.onDispose(() => p.g.stage.renderer.domElement.removeEventListener('pointerdown', onClick));
    return {
      async showMe() { await wait(300); b.highlight([origin], CYAN); sfx.success(); p.win(); },
    };
  },
};

// ------------------------------------------------------------------ cinematics

async function coldOpen(g: Game): Promise<void> {
  await fadeBlack(g, true, 10);
  g.mood('void');
  void stamp(g, 'Survey tug LANTERN · edge of the region called the Fold', 4200);
  await wait(1200);
  const board = new NumberBoard(g, 3, 3, { caption: 'Distress call · colony ark Meridian' });
  const nums = ['1', '½', '0', '−½', '1', '0', '0', '0', '1'];
  await g.say(S.call, {
    onLine: (_l, i) => {
      if (i === 3) nums.forEach((n, k) => window.setTimeout(() => { board.set(k, n); sfx.tick(k % 3); }, 500 + k * 620));
    },
  });
  await board.hide();
}

async function arrive(g: Game): Promise<void> {
  g.mood('explore');
  const s = ensureSet(g, false);
  s.buoys.object.visible = false;
  s.ship.object.position.set(-11, -8, 0.3);
  s.ship.face([7, 5, 0]);
  await s.ship.ready;
  s.ship.setThrust(1);
  void g.stage.view3D({ target: [-6, -4.5, 0], distance: 9, azimuth: -150, elevation: 14, orbit: false, ms: 0 });
  await fadeBlack(g, false, 1600);
  await letterbox(g, true, 600);
  void titleCard(g, 'Prologue', 'Where did everything go?', 3600);
  const fly = s.ship.flyTo(SHIP0.map((x, i) => (i === 2 ? 0.3 : x)) as V3, 7000);
  void g.stage.view3D({ target: [-2, -1.5, 0.5], distance: 13, azimuth: -125, elevation: 20, orbit: false, ms: 7000 });
  await g.say(S.arrive);
  await fly;
  s.ship.face([1, 0.75, 0]);
  await letterbox(g, false, 500);
}

async function seed(g: Game): Promise<void> {
  const s = ensureSet(g, false);
  s.buoys.set([[1, 0], [0, 1]]);
  s.buoys.object.visible = true;
  s.buoys.object.scale.setScalar(0.001);
  s.buoys.clearHighlights();
  await g.say([S.seed[0]], {
    onLine: async () => {
      sfx.warp();
      void g.stage.shockwave([SHIP0[0], SHIP0[1], 0], 1800, 0.5);
      await animate(1800, (k) => s.buoys.object.scale.setScalar(Math.max(0.001, k)), ease.out);
    },
  });
  await g.stage.view2D({ center: [0, 0], height: 15, ms: 2200 });
  await g.say(S.seed.slice(1, 2));
  markRefs(s.buoys);
  sfx.discover();
  await g.say(S.seed.slice(2));
}

async function pulse(g: Game): Promise<void> {
  const s = ensureSet(g, false);
  s.buoys.set([[1, 0], [0, 1]]);
  s.ship.object.position.set(SHIP0[0], SHIP0[1], 0.3);
  music.stop(0.6);
  await g.say(S.pulse, { noSkip: true });
  await wait(400);
  sfx.collapse();
  g.stage.flash(0.25, 500);
  g.stage.nudge(0.35);
  void g.stage.shockwave([0, 0, 0], 2200, 1.1);
  const shipTo = apply(PULSE0, SHIP0);
  const a = s.ship.object.position.clone();
  await Promise.all([
    s.buoys.to(PULSE0, 1900, 'linear'),
    animate(1900, (k) => {
      s.ship.object.position.set(a.x + (shipTo[0] - a.x) * k, a.y + (shipTo[1] - a.y) * k, 0.3);
      s.ship.object.rotation.z += 0.02 * (1 - k);
    }, ease.inOut),
  ]);
  sfx.alarm();
  s.ship.setThrust(0.05);
  await wait(900);
  g.mood('tension');
}

async function closing(g: Game): Promise<void> {
  const s = ensureSet(g, true);
  void g.stage.view2D({ center: [0, 0], height: 15, ms: 1200 });
  s.buoys.set(PULSE0);
  await g.say(S.close.slice(0, 4));
  sfx.discover();
  g.toast('Why did everything move except the point under the Anchor?', 'Case board');
  await g.say(S.close.slice(4));
}

const ch: ChapterDef = {
  id: 'c00',
  act: 0,
  num: 0,
  title: 'Where did everything go?',
  subtitle: 'The first pulse',
  nodes: ['N12'],
  palette: 'void',
  music: 'void',
  beats: [
    { kind: 'cinematic', id: 'call', run: coldOpen },
    { kind: 'cinematic', id: 'arrive', run: arrive },
    { kind: 'cinematic', id: 'seed', run: seed },
    { kind: 'cinematic', id: 'pulse', run: pulse },
    { kind: 'scene', id: 'after', lines: S.after, view: '2d', setup: (g) => { ensureSet(g, true); } },
    { kind: 'puzzle', id: 'line', puzzle: linePuzzle },
    { kind: 'puzzle', id: 'even', puzzle: evenPuzzle },
    { kind: 'puzzle', id: 'still', puzzle: stillPuzzle },
    { kind: 'scene', id: 'close', lines: [], setup: closing },
  ],
  script: S,
};

export default ch;

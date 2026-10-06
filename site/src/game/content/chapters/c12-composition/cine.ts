// Chapter 12 cinematics: the routine pulse followed by the ark's stabiliser turn, played on the
// lattice and on the real hull (stage by stage, right-hand first), and the fused-forecast install
// that runs the player's matmul.
import { Group } from 'three';
import type { Game, V3 } from '../../../game/types';
import { BuoyField } from '../../../gfx/buoys';
import { loadModel } from '../../../gfx/models';
import { C } from '../../../core/theme';
import { animate, ease, wait } from '../../../core/tween';
import { sfx } from '../../../audio/sfx';
import { fadeBlack, letterbox, stamp, titleCard } from '../../../kit/cine';
import { makeAnchor } from '../../common/set';
import { isPlayerFn, pylib } from '../../../game/build';
import { matMul, matVec, meq, type Mat } from '../../../math/la';
import { embed, T2partial } from '../c11-transformations/honest';
import { T } from '../../truth';
import { TURN } from './logic';
import { S } from './script';

const rot = (t: number): Mat => [[Math.cos(t), -Math.sin(t)], [Math.sin(t), Math.cos(t)]];
const setM = (g: Group, W: Mat) => {
  const m = embed(W);
  g.matrix.set(m[0][0], m[0][1], 0, 0, m[1][0], m[1][1], 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);
  g.matrixWorldNeedsUpdate = true;
};

/** Pulse (honest, P R(θ) P⁻¹), then the stabiliser's quarter turn (by angle). Calls set(W) every frame. */
async function pulseThenTurn(g: Game, set: (W: Mat) => void, ms = 2200): Promise<void> {
  sfx.collapse();
  g.stage.flash(0.14, 400);
  void g.stage.shockwave([0, 0, 0], ms, 0.8);
  await animate(ms, (k) => set(T2partial(k)), ease.inOut);
  await wait(450);
  sfx.whoosh(ms / 1000);
  await animate(ms, (k) => set(matMul(rot((k * Math.PI) / 2), T)), ease.inOut);
}

async function arkHull(g: Game): Promise<Group> {
  const holder = new Group();
  holder.matrixAutoUpdate = false;
  g.stage.world.add(holder);
  const m = await loadModel('meridian');
  if (m) {
    m.rotation.x = Math.PI / 2;
    m.scale.setScalar(0.035);
    m.position.set(2.6, 1.4, 1.1);
    holder.add(m);
  }
  return holder;
}

export async function coldOpen(g: Game): Promise<void> {
  await fadeBlack(g, true, 10);
  g.mood('tension');
  const b = new BuoyField(g.stage, { extent: 6, size: 0.045 });
  g.stage.world.add(b.object);
  const anchor = await makeAnchor(g.stage, 0.35);
  anchor.position.z = 0.05;
  const ark = await arkHull(g);
  await g.stage.view3D({ target: [0.8, 0.8, 0.4], distance: 16, azimuth: -100, elevation: 50, orbit: false, ms: 0 });
  await fadeBlack(g, false, 1200);
  await letterbox(g, true, 500);
  void titleCard(g, 'Chapter 12', 'What do two moves in a row do?', 3200);
  void stamp(g, 'The *Meridian* · a routine pulse, then the stabiliser', 4000);
  await g.say([S.open[0]], {
    onLine: () => { void pulseThenTurn(g, (W) => { b.set(W); setM(ark, W); }); },
  });
  await wait(3600);
  await letterbox(g, false, 400);
  await g.say(S.open.slice(1));
}

// ------------------------------------------------------------------ install: the fused forecast

async function fused(): Promise<{ F: Mat; who: 'mine' | 'crew' | 'mismatch' }> {
  const crew = matMul(TURN, T);
  if (!isPlayerFn('matmul')) return { F: crew, who: 'crew' };
  try {
    const timeout = new Promise<null>((r) => window.setTimeout(() => r(null), 8000));
    const res = await Promise.race([pylib.map<Mat>('matmul', [[TURN, T]]), timeout]);
    const mine = res && res.who === 'yours' ? res.values[0] : null;
    if (!mine || !Array.isArray(mine) || mine.length !== 2 || !meq(mine, crew, 1e-6)) return { F: crew, who: 'mismatch' };
    return { F: mine, who: 'mine' };
  } catch {
    return { F: crew, who: 'mismatch' };
  }
}

export async function installFused(g: Game): Promise<void> {
  g.stage.clearWorld();
  g.mood('puzzle');
  const b = new BuoyField(g.stage, { extent: 5, size: 0.055 });
  g.stage.world.add(b.object);
  const anchor = await makeAnchor(g.stage, 0.3);
  anchor.position.z = 0.02;
  void g.stage.view3D({ target: [0, 0, 0], distance: 15.5, azimuth: -90, elevation: 70, orbit: false, ms: 900 });
  await g.say(S.install);
  const { F, who } = await fused();
  const ghosts = new BuoyField(g.stage, { points: b.base.map((q) => { const r = matVec(F, [q[0], q[1]]); return [r[0], r[1], 0] as V3; }), color: C.result, size: 0.085 });
  ghosts.object.scale.setScalar(0.001);
  g.stage.world.add(ghosts.object);
  sfx.discover();
  await animate(700, (k) => ghosts.object.scale.setScalar(Math.max(0.001, k)), ease.out);
  await g.say(who === 'mine' ? S.installMine : who === 'crew' ? S.installCrew : S.installMismatch);
  await pulseThenTurn(g, (W) => b.set(W), 2000);
  b.highlight([...b.base.keys()], C.result, 0.9);
  sfx.success();
  await g.say(S.landed);
}

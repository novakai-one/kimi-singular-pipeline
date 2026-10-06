// Chapter 7 staging: the cold open (debris streams crossing the approach to the hangar door), the
// install (door picking: the player's line of sight meets the door's plane through ray_plane), and
// the act close (docked, the ark dark, Ilse's oldest log).
import { Group, Raycaster, Vector2 } from 'three';
import type { Game, PuzzleCtx, V3 } from '../../../game/types';
import { animate, ease, wait } from '../../../core/tween';
import { sfx } from '../../../audio/sfx';
import { fadeBlack, letterbox, stamp, titleCard } from '../../../kit/cine';
import { h, inline } from '../../../ui/ui';
import { Dot, glowSprite } from '../../../gfx/markers';
import { FatLine } from '../../../gfx/lines';
import { Label } from '../../../gfx/label';
import { burst } from '../../../gfx/fx';
import { isPlayerFn, pylib } from '../../../game/build';
import { CamRig, Gone, check, hullSet, hullShot } from '../c06-volume/stage';
import { DoorWall, FlatRing, v3 } from './parts';
import { makeLantern } from '../../common/set';
import { DOOR_CENTRE, DOOR_K, DOOR_N, crew, fmt, insideDoor } from './logic';
import { S } from './script';

export const shot = (variant: number) => async (g: Game): Promise<void> => { await hullShot(g, variant, { lantern: { at: [12, -18, 2], face: [0.3, 1, 0.02], scale: 1.1, thrust: 0.15 } }); };

/** Where the starboard hangar door sits on the ark model (ark frame: x along the spine). */
const DOOR_ON_ARK: V3 = [20.65, -2.95, 0];

// ------------------------------------------------------------------ cold open

export async function coldOpen(g: Game): Promise<void> {
  try {
    await fadeBlack(g, true, 10);
    g.stage.clearWorld();
    g.mood('explore');
    const set = await hullSet(g, { spine: [1, 0, 0], shear: 0.12, debris: 6, starLight: 2.6, lantern: { at: [8, -26, 2], face: [0.45, 1, 0.02], scale: 1.2, thrust: 0.25 } });
    check(set);
    // the door, outlined on the bow's flank
    const tri = new FatLine(g.stage, [[18.9, -3.05, -0.95], [22.4, -3.05, -0.95], [20.65, -3.05, 1.15], [18.9, -3.05, -0.95]], { color: '#ffd9a0', width: 2.6, intensity: 2, opacity: 0 });
    set.frame.add(tri.object);
    const doorGlow = glowSprite('#ffd9a0', 6, 0);
    doorGlow.position.set(...DOOR_ON_ARK);
    set.frame.add(doorGlow);
    // debris streams: pieces in straight lines at steady speeds
    const streams: { p: V3; d: V3; n: number }[] = [
      { p: [4, -14, 4], d: [1, 0.25, -0.12], n: 7 },
      { p: [14, -12, -3], d: [-0.4, 0.2, 0.3], n: 6 },
      { p: [24, -20, 1], d: [-0.6, -0.15, 0.05], n: 6 },
    ];
    const pieces: { dot: Dot; s: number; k: number }[] = [];
    for (const [si, st] of streams.entries()) {
      const trail = new FatLine(g.stage, [[st.p[0] - st.d[0] * 30, st.p[1] - st.d[1] * 30, st.p[2] - st.d[2] * 30], [st.p[0] + st.d[0] * 30, st.p[1] + st.d[1] * 30, st.p[2] + st.d[2] * 30]], { color: '#c9b08f', width: 1.2, opacity: 0.18, dashed: true, dashSize: 0.8, gapSize: 0.6 });
      set.root.add(trail.object);
      for (let i = 0; i < st.n; i++) {
        const d = new Dot([0, 0, 0], { color: '#c9b08f', size: 0.25 + 0.1 * ((i + si) % 3), glow: 0.35 });
        set.root.add(d.object);
        pieces.push({ dot: d, s: si, k: i / st.n });
      }
    }
    let clock = 0;
    set.tick((dt) => {
      clock += dt;
      for (const pc of pieces) {
        const st = streams[pc.s];
        const t = (((clock * 0.025 + pc.k) % 1) - 0.5) * 50;
        pc.dot.at([st.p[0] + st.d[0] * t, st.p[1] + st.d[1] * t, st.p[2] + st.d[2] * t]);
      }
    });
    const cam = new CamRig(g, set, [-4, -48, 10], [14, -6, 0]);
    cam.drift(0.35);
    void fadeBlack(g, false, 1600);
    await letterbox(g, true, 600);
    check(set);
    void titleCard(g, 'Chapter 7', 'Where does our path meet the door?', 3400);
    void stamp(g, 'Approach to the *Meridian*\'s bow · starboard hangar', 4000);
    await cam.to([4, -40, 7], [16, -6, 0], 5500, ease.inOut);
    check(set);
    void cam.to([12, -24, 4], [20, -3, 0], 26000, ease.linear);
    await g.say(S.open, {
      onLine: (_l, i) => {
        if (!set.alive()) return;
        if (i === 4) { sfx.discover(); void animate(1200, (k) => { tri.setOpacity(k); doorGlow.material.opacity = 0.6 * k; }, ease.out); }
      },
    });
    check(set);
    await letterbox(g, false, 500);
  } catch (e) { if (!(e instanceof Gone)) throw e; }
}

// ------------------------------------------------------------------ install: door picking

/** A context for kit pictures inside a cinematic (cleaned up when the world is cleared). */
function cineCtx(g: Game, root: Group): { p: PuzzleCtx; done: () => void } {
  const offs: (() => void)[] = [];
  const p = {
    g, difficulty: g.settings.difficulty,
    add: (...objs: ({ object: unknown } | unknown)[]) => { for (const o of objs) root.add(((o as { object?: Group }).object ?? o) as Group); },
    onDispose: (f: () => void) => { offs.push(f); },
  } as unknown as PuzzleCtx;
  return { p, done: () => offs.splice(0).forEach((f) => { try { f(); } catch { /* already gone */ } }) };
}

/** t along the line of sight, from the player's ray_plane when it is theirs and agrees. */
async function pick(origin: V3, dir: V3): Promise<{ t: number | null; mine: boolean }> {
  const want = crew.rayPlane(origin, dir, DOOR_N, DOOR_K);
  if (!isPlayerFn('ray_plane')) return { t: want, mine: false };
  try {
    const t = await pylib.call<number | null>('ray_plane', origin, dir, DOOR_N, DOOR_K);
    const agree = (t === null && want === null) || (t !== null && want !== null && Math.abs(t - want) < 1e-6);
    return agree ? { t, mine: true } : { t: want, mine: false };
  } catch { return { t: want, mine: false }; }
}

export async function install(g: Game): Promise<void> {
  g.stage.clearWorld();
  g.mood('explore');
  const root = new Group();
  g.stage.world.add(root);
  const { p, done } = cineCtx(g, root);
  root.userData.dispose = done;
  void g.stage.view3D({ target: [0.4, 0.8, 1.1], distance: 11.5, azimuth: 30, elevation: 22, ms: 0, orbit: false });
  new DoorWall(p, { wall: 0.55 });
  const panel = h('div', { class: 'glass', style: 'position:absolute;right:24px;top:24px;width:min(320px,34vw);padding:14px 16px;display:flex;flex-direction:column;gap:6px;pointer-events:none' });
  const runOn = h('div', { style: 'font-size:13px;color:var(--ink-2)' }, 'Door picking');
  const out = h('div', { style: 'font-family:var(--mono);font-size:13.5px' });
  panel.append(h('div', { class: 'kicker' }, 'Door picking'), runOn, out);
  g.ui.scene.appendChild(panel);
  await g.say(S.install);
  if (!root.parent) { panel.remove(); return; }
  const prompt = h('div', { class: 'cine-prompt' }, 'Click the hangar door to place the docking marker');
  g.ui.scene.appendChild(prompt);
  const canvas = g.stage.renderer.domElement;
  const ray = new Raycaster();
  const rayAt = (x: number, y: number): { o: V3; d: V3 } => {
    const r = canvas.getBoundingClientRect();
    ray.setFromCamera(new Vector2(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1), g.stage.camera);
    const o = ray.ray.origin, d = ray.ray.direction;
    return { o: [o.x, o.y, o.z], d: [d.x, d.y, d.z] };
  };
  const sight = await new Promise<{ o: V3; d: V3 }>((resolve) => {
    const onDown = (e: PointerEvent) => { if (e.button !== 0) return; finish(rayAt(e.clientX, e.clientY)); };
    const auto = () => { const c = g.stage.camera.position; const o: V3 = [c.x, c.y, c.z]; finish({ o, d: [DOOR_CENTRE[0] - o[0], DOOR_CENTRE[1] - o[1], DOOR_CENTRE[2] - o[2]] }); };
    const timer = window.setTimeout(auto, g.headless ? 60 : 12000);
    const finish = (s: { o: V3; d: V3 }) => { window.clearTimeout(timer); canvas.removeEventListener('pointerdown', onDown); resolve(s); };
    canvas.addEventListener('pointerdown', onDown);
  });
  prompt.remove();
  if (!root.parent) { panel.remove(); return; }
  const { t, mine } = await pick(sight.o, sight.d);
  runOn.innerHTML = inline(mine ? 'Running on: **your** `ray_plane`' : 'Running on: LANTERN backup');
  void g.say(mine ? S.installMine : S.installBackup);
  let at: V3 = v3(DOOR_CENTRE);
  let inside = false;
  if (t !== null && t > 0) {
    const hit: V3 = [sight.o[0] + t * sight.d[0], sight.o[1] + t * sight.d[1], sight.o[2] + t * sight.d[2]];
    inside = insideDoor(hit, 0.01);
    if (inside) at = hit;
    out.innerHTML = inline(`t = ${(Math.round(t * 1000) / 1000).toFixed(3)}<br>hit ${fmt(hit.map((x) => Math.round(x * 100) / 100))}<br>${inside ? 'on the door' : 'outside the door'}`);
  } else out.innerHTML = inline('no single hit');
  // the line of sight, drawn to the hit, and the marker
  const from: V3 = [sight.o[0] + sight.d[0] * 2, sight.o[1] + sight.d[1] * 2, sight.o[2] + sight.d[2] * 2];
  const beam = new FatLine(g.stage, [from, from], { color: '#59e1ff', width: 2, intensity: 1.6 });
  root.add(beam.object);
  await animate(700, (k) => beam.setPoints([from, [from[0] + (at[0] - from[0]) * k, from[1] + (at[1] - from[1]) * k, from[2] + (at[2] - from[2]) * k]]), ease.out);
  const ring = new FlatRing(p, at, v3(DOOR_N), { r: 0.2, color: '#3ddc84' });
  const mark = new Dot(at, { color: '#3ddc84', size: 0.08 });
  const tag = new Label('docking marker', [at[0] + 0.3, at[1] + 0.3, at[2] + 0.35], { className: 'small', color: '#3ddc84' });
  root.add(mark.object, tag.object);
  sfx.success();
  void ring.pulse();
  void burst(g.stage, at, '#3ddc84', 50, 1.6, false);
  await g.say(inside ? S.installHit : S.installMiss);
  await wait(400);
  panel.remove();
}

// ------------------------------------------------------------------ act close

export async function close(g: Game): Promise<void> {
  try {
    g.stage.clearWorld();
    g.mood('void');
    const set = await hullSet(g, { spine: [1, 0, 0], shear: 0.12, debris: 4, starLight: 1.1, lantern: null });
    check(set);
    // the Lantern sits in the starboard hangar door
    const ship = makeLantern(g.stage, 0.9);
    ship.object.position.set(20.65, -4.3, 0);
    ship.face([0, 1, 0]);
    ship.setThrust(0);
    set.root.add(ship.object);
    const cam = new CamRig(g, set, [6, -30, 6], [18, -3, 0]);
    cam.drift(0.25);
    await letterbox(g, true, 600);
    void cam.to([14, -14, 3], [20, -3, 0], 22000, ease.linear);
    await g.say(S.close.slice(0, 2));
    check(set);
    await fadeBlack(g, true, 1200);
    await g.say(S.close.slice(2, 4));
    await titleCard(g, 'End of Act II', 'Signal', 2600);
    await g.say(S.close.slice(4));
    await fadeBlack(g, false, 900);
    await letterbox(g, false, 500);
  } catch (e) { if (!(e instanceof Gone)) throw e; }
}

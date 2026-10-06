// Reusable camera shots for dialogue scenes. Each builds what it needs in the world and drifts the
// camera slowly. A scene beat without its own setup gets shipExterior() (see the runner).
import { AmbientLight, Group, PointLight } from 'three';
import type { Game } from '../../game/types';
import { loadModel } from '../../gfx/models';
import { Lattice3D } from '../../gfx/shapes';
import { makeAnchor, makeLantern } from './set';

/** The Lantern drifting in space, the Anchor far behind it, camera slowly orbiting. */
export async function shipExterior(g: Game, o: { anchor?: boolean; ark?: boolean } = {}): Promise<void> {
  const ship = makeLantern(g.stage, 0.55);
  g.stage.world.add(ship.object);
  ship.object.position.set(0, 0, 0);
  ship.face([1, 0.3, 0.05]);
  ship.setThrust(0.15);
  if (o.anchor !== false) {
    const a = await makeAnchor(g.stage, 4.5);
    a.position.set(70, 34, -6);
  }
  if (o.ark) {
    const ark = await loadModel('meridian');
    if (ark) { ark.rotation.x = Math.PI / 2; ark.position.set(-30, 40, 6); ark.scale.setScalar(1.2); g.stage.world.add(ark); }
  }
  let az = -150;
  const off = g.stage.tick((dt) => {
    if (g.stage.controls) return;
    az += dt * 2.2;
    const r = 7.5, el = 0.28, a = (az * Math.PI) / 180;
    g.stage.camera.position.set(r * Math.cos(el) * Math.cos(a), r * Math.cos(el) * Math.sin(a), r * Math.sin(el) + 0.4);
    g.stage.camera.up.set(0, 0, 1);
    g.stage.camera.lookAt(0.4, 0, 0);
    ship.object.position.z = 0.08 * Math.sin(performance.now() / 1400);
  });
  ship.object.userData.dispose = (() => { const d = ship.object.userData.dispose as () => void; return () => { off(); d?.(); }; })();
  g.stage.mode = '3d';
  g.stage.disposeControls();
}

/** The bridge: the holotable with a small lattice hologram, camera drifting around it. */
export async function bridgeShot(g: Game): Promise<void> {
  const root = new Group();
  g.stage.world.add(root);
  const m = await loadModel('bridge');
  if (m) { m.rotation.x = Math.PI / 2; root.add(m); }
  const holo = new Lattice3D(g.stage, { extent: 1, color: '#59e1ff', opacity: 0.9 });
  holo.object.scale.setScalar(0.35);
  holo.object.position.set(0, 0, 1.5);
  root.add(holo.object);
  const lamp = new PointLight('#59e1ff', 6, 6);
  lamp.position.set(0, 0, 1.6);
  root.add(lamp, new AmbientLight('#223355', 0.4));
  let t0 = 0;
  const off = g.stage.tick((dt) => {
    t0 += dt;
    holo.object.rotation.z += dt * 0.3;
    if (g.stage.controls) return;
    const a = -2.2 + Math.sin(t0 * 0.05) * 0.5;
    g.stage.camera.position.set(4.2 * Math.cos(a), 4.2 * Math.sin(a), 2.3);
    g.stage.camera.up.set(0, 0, 1);
    g.stage.camera.lookAt(0, 0, 1.3);
  });
  root.userData.dispose = () => { off(); holo.dispose(); };
  g.stage.mode = '3d';
  g.stage.disposeControls();
}

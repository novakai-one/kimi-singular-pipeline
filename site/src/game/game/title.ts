// Title screen: a slowly orbiting 3-D lattice that keeps moving between transformations,
// with the game's name and the main menu over it.
import { h, button } from '../ui/ui';
import { Lattice3D } from '../gfx/shapes';
import { Arrow } from '../gfx/arrow';
import { C } from '../core/theme';
import { wait } from '../core/tween';
import { audio } from '../audio/audio';
import { GAME_TITLE, GAME_TAGLINE } from '../content/meta';
import type { App } from './app';

export type TitleChoice = 'new' | 'continue' | 'chapters' | 'codex' | 'settings';

const POSES: number[][][] = [
  [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
  [[1, 0.6, 0], [0, 1, 0], [0, 0.4, 1]],
  [[0.8, -0.5, 0.2], [0.5, 0.9, 0], [0, 0.3, 1.2]],
  [[1.4, 0, 0], [0, 0.6, 0], [0.3, 0, 1]],
  [[0, -1, 0], [1, 0, 0.3], [0, 0, 1]],
];

export class TitleScene {
  private lattice: Lattice3D;
  private arrows: Arrow[];
  private el: HTMLElement | null = null;
  private alive = true;
  private offTick: () => void;

  constructor(private readonly app: App) {
    const st = app.stage;
    this.lattice = new Lattice3D(st, { extent: 4, opacity: 0.5 });
    this.arrows = [
      new Arrow([0, 0, 0], [1, 0, 0], { color: C.v, width: 0.06 }),
      new Arrow([0, 0, 0], [0, 1, 0], { color: C.w, width: 0.06 }),
      new Arrow([0, 0, 0], [0, 0, 1], { color: C.u, width: 0.06 }),
    ];
    st.world.add(this.lattice.object, ...this.arrows.map((a) => a.object));
    void st.view3D({ distance: 17, azimuth: -55, elevation: 22, orbit: false });
    let az = -55;
    this.offTick = st.tick((dt) => {
      az += dt * 3;
      const r = 17, el = (22 * Math.PI) / 180, a = (az * Math.PI) / 180;
      st.camera.position.set(r * Math.cos(el) * Math.cos(a), r * Math.cos(el) * Math.sin(a), r * Math.sin(el) + 0.6);
      st.camera.up.set(0, 0, 1);
      st.camera.lookAt(0, 0, 0.6);
    });
    void this.loop();
  }

  private async loop(): Promise<void> {
    let i = 0;
    while (this.alive) {
      await wait(2600);
      if (!this.alive) return;
      i = (i + 1) % POSES.length;
      const M = POSES[i];
      const cols = [0, 1, 2].map((j) => M.map((r) => r[j]) as [number, number, number]);
      await Promise.all([this.lattice.to(M, 2400), ...this.arrows.map((a, k) => a.moveTo(cols[k], 2400))]);
    }
  }

  menu(o: { canContinue: boolean; continueLabel: string }): Promise<TitleChoice> {
    return new Promise((resolve) => {
      const pick = (c: TitleChoice) => { audio.unlock(); resolve(c); };
      this.el = h('div', { class: 'title-screen' },
        h('div', { class: 'title-block' },
          h('div', { class: 'kicker' }, 'A linear algebra game'),
          h('h1', { class: 'game-title' }, GAME_TITLE),
          h('p', { class: 'tagline' }, GAME_TAGLINE),
          h('div', { class: 'title-menu' },
            o.canContinue ? button(o.continueLabel, () => pick('continue'), { cls: 'primary' }) : null,
            button(o.canContinue ? 'New game' : 'Begin', () => pick('new'), { cls: o.canContinue ? '' : 'primary' }),
            button('Chapter map', () => pick('chapters')),
            button('Codex', () => pick('codex'), { cls: 'ghost' }),
            button('Settings', () => pick('settings'), { cls: 'ghost' }))),
        h('div', { class: 'title-foot c-muted' }, 'Headphones recommended · Mouse and keyboard'));
      this.el.style.pointerEvents = 'auto';
      this.app.ui.modal.appendChild(this.el);
      document.addEventListener('pointerdown', () => audio.unlock(), { once: true });
    });
  }

  dispose(): void {
    this.alive = false;
    this.offTick();
    this.el?.remove();
    this.lattice.dispose();
    this.arrows.forEach((a) => a.dispose());
  }
}

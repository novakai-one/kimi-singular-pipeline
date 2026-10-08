// Heads-up display: where you are, what to do, and the puzzle controls.
import { h, inline, md, button, type UI } from '../ui/ui';
import { compactBeatChrome } from '../ui/beat-chrome';

export interface PuzzleControls {
  onHint: () => void;
  onShowMe: () => void;
  onSkip: () => void;
  onReset: () => void;
}

export class Hud {
  private readonly tl: HTMLElement;
  private readonly tr: HTMLElement;
  private readonly br: HTMLElement;
  private readonly chapterEl: HTMLElement;
  private readonly objEl: HTMLElement;
  private goalEl: HTMLElement | null = null;
  private subs: HTMLElement[] = [];
  private starsEl: HTMLElement | null = null;
  private hintBtn: HTMLButtonElement | null = null;
  private compactActions: HTMLElement | null = null;

  constructor(private readonly ui: UI, menu: { onMenu: () => void; onCodex: () => void; onSettings: () => void; onLog: () => void; onCase: () => void }) {
    this.chapterEl = h('div', { class: 'hud-chapter' });
    this.objEl = h('div', { class: 'objective glass' });
    this.objEl.hidden = true;
    this.tl = h('div', { class: 'hud-tl' }, this.chapterEl, this.objEl);
    this.tr = h('div', { class: 'hud-tr' },
      button('Log', menu.onLog, { cls: 'ghost small', title: 'Dialogue log' }),
      button('Case board', menu.onCase, { cls: 'ghost small', title: 'Open questions' }),
      button('Codex', menu.onCodex, { cls: 'ghost small', title: 'Codex (C)' }),
      button('⚙', menu.onSettings, { cls: 'ghost small icon', title: 'Settings' }),
      button('☰', menu.onMenu, { cls: 'ghost small icon', title: 'Menu (Esc)' }));
    this.br = h('div', { class: 'hud-br' });
    this.tr.lastElementChild!.setAttribute('data-chrome-menu', '');
    ui.hud.append(this.tl, this.tr, this.br);
    for (const el of [this.tl, this.tr, this.br]) el.style.pointerEvents = 'auto';
  }

  /** CH1–CH2: only this licensed chapter collapses navigation and removes its banner. */
  setBeatChrome(chapter: string, beat: string): void {
    if (compactBeatChrome(chapter, beat)) {
      this.chapterEl.remove();
      if (!this.compactActions) {
        this.compactActions = h('div', { class: 'd01-actions', 'data-attention': 'actions' });
        this.compactActions.append(this.br, this.tr);
        this.ui.hud.append(this.compactActions);
      }
    } else {
      this.tl.prepend(this.chapterEl);
      if (this.compactActions) {
        this.ui.hud.append(this.tr, this.br);
        this.compactActions.remove();
        this.compactActions = null;
      }
    }
    this.ui.setBeatChrome(chapter, beat);
  }

  setChapter(kicker: string, title: string): void {
    this.chapterEl.replaceChildren(h('span', { class: 'kicker' }, kicker), h('span', { class: 't', html: inline(title) }));
  }

  setObjective(title: string, goal: string, subgoals: string[] = []): void {
    this.objEl.hidden = false;
    this.goalEl = h('div', { class: 'goal', html: md(goal) });
    this.subs = subgoals.map((s) => h('div', { class: 'sub' }, h('span', { html: inline(s) })));
    this.starsEl = h('span', { class: 'stars', 'aria-label': 'stars' });
    this.objEl.replaceChildren(
      h('div', { style: 'display:flex;justify-content:space-between;gap:10px;align-items:center' }, h('span', { class: 'kicker' }, title), this.starsEl),
      this.goalEl,
      ...(subgoals.length ? [h('div', { class: 'subgoals' }, ...this.subs)] : []),
    );
  }

  setGoal(goal: string): void { if (this.goalEl) this.goalEl.innerHTML = md(goal); }
  subgoal(i: number, done = true): void { this.subs[i]?.classList.toggle('done', done); }
  setStars(n: number, max = 3): void {
    if (!this.starsEl) return;
    this.starsEl.replaceChildren(...Array.from({ length: max }, (_, i) => h('span', { class: i < n ? 'on' : '' }, '★')));
  }
  hideObjective(): void { this.objEl.hidden = true; }

  showControls(c: PuzzleControls, hintsLeft: number): void {
    this.hintBtn = button(`Hint${hintsLeft ? ` (${hintsLeft})` : ''}`, c.onHint, { cls: 'small', kbd: 'H' });
    this.br.replaceChildren(
      button('Reset', c.onReset, { cls: 'ghost small', kbd: 'R' }),
      this.hintBtn,
      button('Show me', c.onShowMe, { cls: 'small' }),
      button('Skip', c.onSkip, { cls: 'ghost small' }),
    );
  }

  setHintsLeft(n: number): void { if (this.hintBtn) this.hintBtn.firstChild!.textContent = `Hint${n ? ` (${n})` : ''}`; }

  /** Replace the controls with one primary action (e.g. Continue). Resolves when pressed. */
  primary(label: string, kbd = 'Enter'): Promise<void> {
    return new Promise((resolve) => {
      const done = () => { document.removeEventListener('keydown', onKey); this.br.replaceChildren(); resolve(); };
      const b = button(label, done, { cls: 'primary', kbd });
      const onKey = (e: KeyboardEvent) => {
        if ((e.key === 'Enter' || e.key === ' ') && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) { e.preventDefault(); done(); }
      };
      document.addEventListener('keydown', onKey);
      this.br.replaceChildren(b);
      b.focus();
    });
  }

  clearControls(): void { this.br.replaceChildren(); }
  setVisible(v: boolean): void { this.ui.hud.style.visibility = v ? '' : 'hidden'; }
}

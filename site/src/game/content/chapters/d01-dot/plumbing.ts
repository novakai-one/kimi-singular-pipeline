import { buildTest } from '../../../game/build';
import { Readout } from '../../../ui/widgets';
import type { UI } from '../../../ui/ui';
import { S } from '../../../core/save';
import { COPY } from './copy';
import { build } from './build';
import { mismatch } from './logic.ts';
import { BuildGate, PuzzleLifecycle, beginPuzzleBeat } from './lifecycle.ts';
import { playerReading } from './instrument';
import { stageGoal } from './staging';
import './style.css';

// CH1–CH3 expose an explicit beat event. Only the d01 scene/HUD is observed,
// only for the duration of that beat: the shared build/Briefing APIs have no
// content/lifecycle hooks, and their modification is outside the Pack's license.
export function installPlumbing(): void {
  let cleanup = () => {};
  document.addEventListener('game:beat-chrome', ((event: CustomEvent<{ ui: UI; chapter: string; beat: string }>) => {
    cleanup();
    cleanup = () => {};
    const { ui, chapter, beat } = event.detail;
    if (chapter !== 'd01-dot') return;
    const objective = ui.hud.querySelector<HTMLElement>('.objective')!;
    delete objective.dataset.expanded;
    delete objective.dataset.attention;
    objective.querySelector('.d01-goal-toggle')?.remove();
    if (beat === 'puzzle') beginPuzzleBeat(ui);
    if (beat === 'build') cleanup = stageBuild(ui);
    if (beat === 'doubt' || beat === 'law' || beat === 'procedure') cleanup = stageBriefing(ui, beat);
  }) as EventListener);
}

function stageBuild(ui: UI): () => void {
  const gate = new BuildGate();
  let epoch = gate.invalidate();
  let alive = true;
  let mounted: HTMLElement | null = null;
  let handledResults: Element | null = null;
  let instrument: Readout | null = null;
  let running = false;
  const actions = ui.hud.querySelector<HTMLElement>('.d01-actions')!;
  const continueButton = () => ui.hud.querySelector<HTMLButtonElement>('.hud-br .primary');
  const renderGate = () => {
    const button = continueButton();
    if (button) { button.hidden = !gate.ready; button.disabled = !gate.ready; }
    if (mounted) mounted.dataset.ready = String(gate.ready);
  };
  const invalidate = () => {
    epoch = gate.invalidate();
    instrument?.el.remove(); instrument = null;
    renderGate();
  };
  // The shared primary handler listens on document. Capture prevents keyboard
  // advance as well as clicking a stale/synthetic Continue before adoption.
  const blockAdvance = (event: Event) => {
    if (gate.ready) return;
    const target = event.target as HTMLElement | null;
    const key = event as KeyboardEvent;
    if (event.type === 'click' ? !!target?.closest('.hud-br .primary')
      : ['Enter', ' '].includes(key.key) && !target?.closest('input, textarea, [contenteditable=true]')) {
      if (event.type === 'click' || !target?.closest('button')) event.preventDefault();
      event.stopImmediatePropagation();
    }
  };
  document.addEventListener('keydown', blockAdvance, true);
  ui.hud.addEventListener('click', blockAdvance, true);
  const changed = () => invalidate();
  const reconcile = () => {
    const box = ui.scene.querySelector<HTMLElement>('.build');
    const current = buildTest.current;
    if (!box || !current) return;
    if (mounted !== box) {
      mounted = box;
      box.dataset.attention = 'editor';
      const left = box.querySelector<HTMLElement>('.build-left')!;
      left.dataset.attention = 'goal';
      const status = box.querySelector<HTMLElement>('.build-status')!;
      left.append(status);
      if (!status.textContent) status.textContent = COPY.build.tests;
      const controls = box.querySelector<HTMLElement>('.build-actions')!;
      actions.prepend(controls);
      box.addEventListener('input', changed);
      box.addEventListener('click', changed, true);
      controls.addEventListener('click', changed, true);
      current.setMode(S().settings.difficulty === 'cadet' ? 'assemble' : S().settings.difficulty === 'navigator' ? 'fill' : 'write');
    }
    renderGate();
    const status = box.querySelector<HTMLElement>('.build-status')!;
    const raw = status.textContent ?? '';
    if (raw.startsWith('Running') || raw.startsWith('Starting Python')) {
      if (!running) { running = true; invalidate(); }
      return;
    }
    const rows = [...box.querySelectorAll('.test-results .test')];
    if (rows.length !== 200 || !rows.every((row) => row.classList.contains('ok') || row.classList.contains('fail'))) return;
    if (handledResults === rows[0]) return;
    handledResults = rows[0]; running = false;
    const passed = rows.map((row) => row.classList.contains('ok'));
    const bad = passed.indexOf(false);
    if (bad >= 0) {
      invalidate();
      const difference = rows[bad].querySelector('.tdiff')?.textContent?.match(/^got (.*), want (.*)$/);
      if (difference) status.textContent = mismatch(COPY.build.feedback, build.tests[bad].args, difference[1], difference[2]);
      return;
    }
    if (!current.passed()) return;
    const source = S().code.dot;
    const testedEpoch = epoch;
    void playerReading(source, [3, 4], [5, 0]).then((value) => {
      if (!alive || !box.isConnected || source !== S().code.dot || !gate.adopt(testedEpoch, passed, value)) return;
      status.textContent = COPY.build.success.text;
      instrument = new Readout();
      instrument.el.classList.add('d01-player-reading');
      instrument.el.dataset.attention = 'readout';
      instrument.el.dataset.source = 'player';
      instrument.row('reading', COPY.p1.labels.reading, value.toFixed(2));
      ui.scene.append(instrument.el);
      renderGate();
    }).catch(() => { invalidate(); });
  };
  const observer = new MutationObserver(reconcile);
  observer.observe(ui.scene, { subtree: true, childList: true, characterData: true });
  observer.observe(ui.hud, { subtree: true, childList: true });
  return () => {
    alive = false; observer.disconnect(); invalidate();
    document.removeEventListener('keydown', blockAdvance, true);
    ui.hud.removeEventListener('click', blockAdvance, true);
    mounted?.removeEventListener('input', changed);
    mounted?.removeEventListener('click', changed, true);
    const controls = actions.querySelector('.build-actions');
    controls?.removeEventListener('click', changed, true);
    controls?.remove();
  };
}

function stageBriefing(ui: UI, beat: string): () => void {
  let mounted: HTMLElement | null = null;
  let detachedActions: HTMLElement | null = null;
  let lastVerdict = '';
  const actions = ui.hud.querySelector<HTMLElement>('.d01-actions')!;
  const state = new PuzzleLifecycle();
  state.attempt();
  const reconcile = () => {
    const card = ui.scene.querySelector<HTMLElement>(`.brief.${beat}`);
    if (!card) return;
    if (mounted !== card) {
      mounted = card;
      stageGoal(ui, state);
      detachedActions = card.querySelector<HTMLElement>('.doubt-actions');
      if (detachedActions) actions.prepend(detachedActions);
      if (beat === 'doubt') {
        const statementEl = card.querySelector('.doubt-claim');
        if (statementEl) ui.hud.querySelector('.objective .goal')?.prepend(statementEl);
        card.hidden = true;
      } else card.dataset.attention = 'readout';
    }
    if (beat === 'doubt') {
      const verdict = card.querySelector<HTMLElement>('.doubt-verdict');
      const text = verdict?.innerHTML ?? '';
      if (text && text !== lastVerdict) {
        lastVerdict = text;
        const output = document.createElement('div');
        output.className = 'd01-feedback glass'; output.dataset.attention = 'transient';
        output.innerHTML = text;
        ui.showTransient(output);
      }
    }
    // Once a primary Continue is present, the interaction actions have exited.
    if (detachedActions) detachedActions.hidden = !!ui.hud.querySelector('.hud-br .primary');
  };
  const observer = new MutationObserver(reconcile);
  observer.observe(ui.scene, { subtree: true, childList: true, characterData: true });
  observer.observe(ui.hud, { subtree: true, childList: true });
  return () => { observer.disconnect(); detachedActions?.remove(); };
}

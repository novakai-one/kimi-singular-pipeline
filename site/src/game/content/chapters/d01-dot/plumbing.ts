import { buildTest } from '../../../game/build';
import { Readout } from '../../../ui/widgets';
import type { UI } from '../../../ui/ui';
import { S, save } from '../../../core/save';
import { COPY } from './copy';
import { build } from './build';
import { mismatch } from './logic.ts';
import { BuildGate, PuzzleLifecycle, beginPuzzleBeat, restoreTestsLine } from './lifecycle.ts';
import { playerReading } from './instrument';
import { isolateBuildStorage } from './storage.ts';
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
  let savedResults: Element | null = null;
  let instrument: Readout | null = null;
  let running = false;
  let finishing = false;
  let continueEl: HTMLButtonElement | null = null;
  const actions = ui.hud.querySelector<HTMLElement>('.d01-actions')!;
  const storage = isolateBuildStorage(S(), () => {
    const rows = [...(mounted?.querySelectorAll('.test-results .test') ?? [])];
    if (rows.length === 200 && rows[0] !== savedResults && rows.every((row) => row.matches('.ok, .fail'))) {
      savedResults = rows[0];
      return 'result';
    }
    return finishing ? 'draft' : false;
  });
  const renderGate = () => {
    if (!alive || !mounted?.isConnected) return;
    continueEl ??= ui.hud.querySelector<HTMLButtonElement>('.hud-br .primary');
    if (continueEl) { continueEl.hidden = !gate.ready; continueEl.disabled = !gate.ready; }
    mounted.dataset.ready = String(gate.ready);
  };
  const removeInstrument = () => { instrument?.el.remove(); instrument = null; };
  const invalidate = () => {
    if (!alive) return;
    epoch = gate.invalidate();
    removeInstrument();
    renderGate();
  };
  const releaseStorage = () => {
    if (alive || running || finishing) return;
    settlement.disconnect(); storage.release(); save();
  };
  const finishRenderer = () => {
    finishing = true;
    // The primary promise's finally runs in a microtask. Keep its draft write
    // isolated through that turn, then restore the original record identities.
    queueMicrotask(() => queueMicrotask(() => { finishing = false; releaseStorage(); }));
  };
  const blockAdvance = (event: Event) => {
    const target = event.target as HTMLElement | null;
    if (gate.ready) {
      if (event.type === 'click' && target?.closest('.hud-br .primary') === continueEl) finishRenderer();
      return;
    }
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
  const isRunning = (raw: string) => raw.startsWith('Running') || raw.startsWith('Starting Python (');
  const reconcile = () => {
    if (!alive) return;
    const box = ui.scene.querySelector<HTMLElement>('.build');
    const current = buildTest.current;
    if (!box || !current) return;
    if (mounted !== box) {
      mounted = box;
      storage.mounted();
      settlement.observe(box, { subtree: true, childList: true, characterData: true });
      box.dataset.attention = 'editor';
      const left = box.querySelector<HTMLElement>('.build-left')!;
      left.dataset.attention = 'goal';
      const status = box.querySelector<HTMLElement>('.build-status')!;
      left.append(status);
      const controls = box.querySelector<HTMLElement>('.build-actions')!;
      actions.prepend(controls);
      box.addEventListener('input', changed);
      box.addEventListener('click', changed, true);
      controls.addEventListener('click', changed, true);
      current.setMode(S().settings.difficulty === 'cadet' ? 'assemble' : S().settings.difficulty === 'navigator' ? 'fill' : 'write');
    }
    renderGate();
    const status = box.querySelector<HTMLElement>('.build-status')!;
    restoreTestsLine(status, COPY.build.tests);
    const raw = status.textContent ?? '';
    if (isRunning(raw)) {
      if (!running) { running = true; invalidate(); }
      return;
    }
    running = false;
    const rows = [...box.querySelectorAll('.test-results .test')];
    if (rows.length !== 200 || !rows.every((row) => row.matches('.ok, .fail'))) return;
    if (handledResults === rows[0]) return;
    handledResults = rows[0];
    const passed = rows.map((row) => row.classList.contains('ok'));
    const bad = passed.indexOf(false);
    if (bad >= 0) {
      invalidate();
      const difference = rows[bad].querySelector('.tdiff')?.textContent?.match(/^got (.*), want (.*)$/);
      if (difference) status.textContent = mismatch(COPY.build.feedback, build.tests[bad].args, difference[1], difference[2]);
      return;
    }
    const source = storage.local.source;
    if (!source || !current.passed()) return;
    const testedEpoch = epoch;
    const ownsAdoption = () => alive && box.isConnected && mounted === box && source === storage.local.source;
    void playerReading(source, [3, 4], [5, 0]).then((value) => {
      if (!ownsAdoption() || !gate.adopt(testedEpoch, passed, value)) return;
      storage.local.adoptedSource = source;
      save();
      status.textContent = COPY.build.success.text;
      instrument = new Readout();
      instrument.el.classList.add('d01-player-reading');
      instrument.el.dataset.attention = 'readout';
      instrument.el.dataset.source = 'player';
      instrument.row('reading', COPY.p1.labels.reading, value.toFixed(2));
      ui.scene.append(instrument.el);
      renderGate();
    }).catch(() => {
      if (!ownsAdoption() || !gate.reject(testedEpoch)) return;
      removeInstrument(); renderGate();
    });
  };
  // Observe the actual builder even after removal until an outstanding run
  // settles. Its storage writes are identified by its own new result rows.
  const settlement = new MutationObserver(() => {
    if (alive) { reconcile(); return; }
    running = isRunning(mounted?.querySelector('.build-status')?.textContent ?? '');
    releaseStorage();
  });
  const observer = new MutationObserver(reconcile);
  observer.observe(ui.scene, { subtree: true, childList: true, characterData: true });
  observer.observe(ui.hud, { subtree: true, childList: true });
  return () => {
    running = isRunning(mounted?.querySelector('.build-status')?.textContent ?? '');
    alive = false; gate.dispose(); observer.disconnect(); removeInstrument();
    document.removeEventListener('keydown', blockAdvance, true);
    ui.hud.removeEventListener('click', blockAdvance, true);
    mounted?.removeEventListener('input', changed);
    mounted?.removeEventListener('click', changed, true);
    const controls = actions.querySelector('.build-actions');
    controls?.removeEventListener('click', changed, true); controls?.remove();
    storage.mounted();
    // Resolve the old shared primary now, while it still owns the action row;
    // its finalizer must not linger and react to a later beat's Enter key.
    finishRenderer();
    if (continueEl) { continueEl.disabled = false; continueEl.click(); }
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

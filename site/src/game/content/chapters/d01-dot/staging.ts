import type { PuzzleCtx } from '../../../game/types';
import type { UI } from '../../../ui/ui';
import { COPY } from './copy';
import { PuzzleLifecycle, puzzleLifecycle } from './lifecycle.ts';

export function stageGoal(ui: UI, state: PuzzleLifecycle): () => void {
  const objective = ui.hud.querySelector<HTMLElement>('.objective')!;
  objective.dataset.attention = 'goal';
  objective.querySelector('.d01-goal-toggle')?.remove();
  const toggle = document.createElement('button');
  toggle.type = 'button'; toggle.className = 'btn ghost small d01-goal-toggle';
  toggle.textContent = COPY.goalPill;
  const render = () => {
    objective.dataset.expanded = String(state.goalExpanded);
    toggle.setAttribute('aria-expanded', String(state.goalExpanded));
    // The inherited title row has inline display:flex. Use the native hidden
    // state so collapsing removes the entire card body, including that row.
    for (const child of objective.children) if (child !== toggle) (child as HTMLElement).hidden = !state.goalExpanded;
  };
  toggle.addEventListener('click', () => { state.toggleGoal(); render(); });
  objective.prepend(toggle);
  render();
  return render;
}

export function stagePuzzle(p: PuzzleCtx, id: string) {
  const state = puzzleLifecycle(p.g.ui, id);
  const renderGoal = stageGoal(p.g.ui, state);
  return {
    state,
    drag: () => { state.drag(); renderGoal(); p.g.ui.clearTransient(); },
    attempt: () => { state.attempt(); renderGoal(); },
  };
}

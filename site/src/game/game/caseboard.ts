// The case board: open questions the story raises, answered later by the maths.
// pin() when a scene raises a question; answer() when a chapter resolves it.
import { S, save } from '../core/save';
import { h, inline, md, openModal, type UI } from '../ui/ui';

export interface CaseItem { id: string; q: string; a?: string; pinnedIn?: string; answeredIn?: string }

function items(): CaseItem[] { return ((S().flags.caseboard as CaseItem[]) ??= []); }

export function pin(id: string, question: string, chapter?: string): boolean {
  const list = items();
  if (list.some((c) => c.id === id)) return false;
  list.push({ id, q: question, pinnedIn: chapter });
  save();
  return true;
}

export function answer(id: string, text: string, chapter?: string): void {
  const c = items().find((x) => x.id === id);
  if (c) { c.a = text; c.answeredIn = chapter; } else items().push({ id, q: '', a: text, answeredIn: chapter });
  save();
}

export function caseItems(): CaseItem[] { return items().slice(); }

export async function caseBoardScreen(ui: UI): Promise<void> {
  const list = items();
  await openModal(ui, () => [
    h('div', { class: 'kicker' }, 'Case board'),
    h('h2', null, 'What we still need to explain'),
    list.length ? h('div', { class: 'case-list' }, ...list.map((c) => h('div', { class: `case-item ${c.a ? 'done' : ''}` },
      h('div', { class: 'case-q', html: inline(c.q) }),
      c.a ? h('div', { class: 'case-a', html: md(c.a) }) : h('div', { class: 'case-open c-muted' }, 'Open')))) : h('p', { class: 'c-muted' }, 'Nothing pinned yet.'),
  ]);
}

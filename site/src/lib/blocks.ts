// Lesson building blocks. Every page uses these, so every page reads the same way.
// Nothing here ever locks content: predictions and challenges always offer Show me / Skip.
import { h, type Child } from './dom';
import { inline, md, mdEl } from './md';

/** "In short" box: the question the topic answers, and the one-sentence answer. */
export function inShort(question: string, answer: string): HTMLElement {
  return h('aside', { class: 'in-short', 'aria-label': 'In short' },
    h('span', { class: 'label' }, 'In short'),
    h('p', { html: `<strong>${inline(question)}</strong>` }),
    h('p', { html: inline(answer) }));
}

/** The concrete problem the lesson opens with. */
export function problem(text: string, label = 'The problem'): HTMLElement {
  return h('div', { class: 'problem' }, h('span', { class: 'block-label' }, label), mdEl(text, ''));
}

export interface PredictOpts {
  prompt: string;
  choices?: string[];
  /** Markdown shown on reveal. Receives the chosen option (or null). */
  reveal: string | ((choice: string | null) => string);
  /** Optional side effect on reveal (e.g. run an animation). */
  onReveal?: (choice: string | null) => void;
  label?: string;
}

/** A prediction invitation. Guessing is optional; "Show me" and "Skip" are always there. */
export function predict(o: PredictOpts): HTMLElement {
  let choice: string | null = null;
  const revealBox = h('div', { class: 'reveal', hidden: true, 'aria-live': 'polite' });
  const skipped = h('div', { class: 'skipped', hidden: true }, 'Skipped. Press Show me any time.');
  const choiceBtns = (o.choices ?? []).map((c) => {
    const b = h('button', { class: 'btn small choice', type: 'button', 'aria-pressed': 'false', html: inline(c) });
    b.addEventListener('click', () => {
      choice = c;
      choiceBtns.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    });
    return b;
  });
  const show = () => {
    const text = typeof o.reveal === 'function' ? o.reveal(choice) : o.reveal;
    const guessLine = choice && o.choices?.length ? `<p class="c-muted">Your guess: <strong>${inline(choice)}</strong></p>` : '';
    revealBox.innerHTML = guessLine + md(text);
    revealBox.hidden = false;
    skipped.hidden = true;
    o.onReveal?.(choice);
  };
  const showBtn = h('button', { class: 'btn small primary', type: 'button', onclick: show }, 'Show me');
  const skipBtn = h('button', { class: 'btn small ghost', type: 'button', onclick: () => { skipped.hidden = false; } }, 'Skip');
  return h('div', { class: 'predict' },
    h('span', { class: 'block-label' }, o.label ?? 'Predict first'),
    mdEl(o.prompt, ''),
    choiceBtns.length ? h('div', { class: 'choices' }, choiceBtns) : null,
    h('div', { class: 'btn-row' }, showBtn, skipBtn),
    skipped,
    revealBox);
}

export interface ChallengeHandle {
  el: HTMLElement;
  /** Mark as won (idempotent). */
  win(message?: string): void;
  /** Show live feedback without winning. */
  feedback(message: string): void;
  isWon(): boolean;
}

export interface ChallengeOpts {
  goal: string;
  detail?: string;
  /** Demonstrates a solution. */
  showMe?: () => void;
  showMeLabel?: string;
  label?: string;
}

/** A goal with a win condition. Optional to complete. Never blocks anything. */
export function challenge(o: ChallengeOpts): ChallengeHandle {
  let won = false;
  const pill = h('span', { class: 'status-pill' }, 'Not yet');
  const fb = h('div', { class: 'feedback', 'aria-live': 'polite' });
  const body = h('div', null,
    h('div', { class: 'goal', html: inline(o.goal) }),
    o.detail ? mdEl(o.detail, '') : null,
    fb);
  const skipNote = h('div', { class: 'skipped', hidden: true }, 'Skipped. It stays here if you want it later.');
  const btns: Child[] = [];
  if (o.showMe) {
    btns.push(h('button', { class: 'btn small', type: 'button', onclick: () => { skipNote.hidden = true; o.showMe!(); } }, o.showMeLabel ?? 'Show me'));
  }
  btns.push(h('button', { class: 'btn small ghost', type: 'button', onclick: () => { skipNote.hidden = false; } }, 'Skip'));
  const el = h('div', { class: 'challenge' },
    h('span', { class: 'block-label' }, o.label ?? 'Challenge', pill),
    body,
    h('div', { class: 'btn-row', style: 'margin-top:8px' }, btns),
    skipNote);
  return {
    el,
    win(message) {
      if (message) fb.innerHTML = inline(message);
      if (won) return;
      won = true;
      el.classList.add('done');
      pill.textContent = 'Done ✓';
      pill.classList.add('done');
    },
    feedback(message) { fb.innerHTML = inline(message); },
    isWon: () => won,
  };
}

/** A worked solution, one click away. */
export function solution(content: string, summary = 'Show worked solution'): HTMLDetailsElement {
  return h('details', { class: 'solution' },
    h('summary', null, summary),
    h('div', { class: 'body', html: md(content) }));
}

/** "When you see ___ in a problem, think ___." */
export function cue(pairs: [string, string][]): HTMLElement {
  return h('div', { class: 'cue' },
    h('span', { class: 'block-label' }, 'Recognition cues'),
    pairs.map(([see, think]) => h('p', { html: `When you see <strong>${inline(see)}</strong> in a problem, think <strong>${inline(think)}</strong>.` })));
}

/** One real use in AI or competitive programming. */
export function why(text: string, label = 'Why it matters'): HTMLElement {
  return h('div', { class: 'why' }, h('span', { class: 'block-label' }, label), mdEl(text, ''));
}

/** Page heading block. */
export function pageHead(eyebrow: string, title: string, lede?: string, extra?: Child): HTMLElement {
  return h('header', { class: 'page-head' },
    h('div', { class: 'eyebrow' }, eyebrow),
    h('h1', null, title),
    lede ? h('p', { class: 'lede', html: inline(lede) }) : null,
    extra ?? null);
}

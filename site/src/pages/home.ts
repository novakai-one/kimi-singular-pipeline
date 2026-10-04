import { mountLayout } from '../lib/layout';
import { inShort, predict, problem, cue } from '../lib/blocks';
import { h } from '../lib/dom';
import { inline, mdEl } from '../lib/md';
import { url } from '../lib/config';
import reg from '../data/registry.json';

const page = mountLayout();
const ideas = reg.ideas as Record<string, { label: string; question: string }>;

page.append(
  h('header', { class: 'page-head' },
    h('div', { class: 'eyebrow' }, 'AI Field Explorer'),
    h('h1', null, 'Which part of AI would you want to research?'),
    h('p', { class: 'lede' }, 'Ten fields. One weekend project each. A log to compare how each one felt.')),

  inShort(
    'How do you find the field of AI you would enjoy working in for a year?',
    'Build one small thing in each field, then compare what excited you. This site gives you ten tours, two showpieces and a log.'),

  problem(`
    Next year you will choose a thesis direction.
    AI has at least ten big fields.
    Reading a description of each one will not tell you which one you would enjoy.
    **Building a small thing in each one will.**
  `),
);

// ---- Where to start -------------------------------------------------------
const steps: [string, string, string, string][] = [
  ['1', 'Start with the showpiece', 'Draw a digit. Watch a trained network read it, layer by layer.', 'demo/digits.html'],
  ['2', 'Look at the Path Map', 'All ten fields on one page, and which ones build on which.', 'path-map.html'],
  ['3', 'Pick any field', 'Each card has a small interactive and a weekend notebook for Colab.', 'fields/how-models-learn.html'],
  ['4', 'Write in your Spark Log', 'Note what surprised you. Score it 1 to 10. Compare later.', 'spark-log.html'],
];
page.append(
  h('h2', null, 'Where to start'),
  h('div', { class: 'grid-4' },
    steps.map(([n, title, text, href]) =>
      h('a', { class: 'card', href: url(href), style: 'text-decoration:none;color:inherit;display:block' },
        h('div', { style: 'font-size:13px;font-weight:700;color:var(--accent);margin-bottom:6px' }, `Step ${n}`),
        h('div', { style: 'font-weight:650;font-size:17px;margin-bottom:6px' }, title),
        h('div', { style: 'color:var(--muted);font-size:15px' }, text)))),
  h('p', { class: 'c-muted', style: 'margin-top:12px;font-size:15px' }, 'The order is a suggestion. Every page is open, in any order, from the menu on the left.'),
);

// ---- Three big ideas ------------------------------------------------------
page.append(
  h('h2', null, 'Most of AI is three ideas'),
  predict({
    prompt: 'Each field below mainly uses one of three ideas. **Which idea do you think most of the ten fields use?**',
    choices: ['Search', 'Learning from data', 'Acting over time'],
    reveal: () => {
      const count = (k: string) => reg.fields.filter((f) => f.idea === k).length;
      return `**Learning from data**: ${count('learn')} of the 10 fields. Search: ${count('search')}. Acting over time: ${count('act')}.

Most fields share the same core: adjust numbers until predictions get better. That is why the deep learning field is a good first stop.`;
    },
  }),
  h('div', { class: 'grid-3' },
    (['search', 'learn', 'act'] as const).map((k) =>
      h('div', { class: 'card', style: `border-top:4px solid var(--${k})` },
        h('div', { class: `c-${k}`, style: 'font-size:18px;margin-bottom:4px' }, ideas[k].label),
        h('div', { style: 'color:var(--muted);margin-bottom:10px' }, ideas[k].question),
        h('div', { class: 'chips' },
          reg.fields.filter((f) => f.idea === k).map((f) =>
            h('a', { class: 'chip', href: url(`fields/${f.slug}.html`), style: 'text-decoration:none' }, `${f.num}. ${f.title}`)))))),
);

// ---- All ten fields -------------------------------------------------------
page.append(
  h('h2', null, 'The ten fields'),
  h('div', { class: 'grid-2' },
    reg.fields.map((f) =>
      h('a', { class: 'card', href: url(`fields/${f.slug}.html`), style: 'text-decoration:none;color:inherit;display:flex;gap:14px;align-items:flex-start' },
        h('div', { style: `flex:none;width:34px;height:34px;border-radius:9px;display:grid;place-items:center;font-weight:750;background:var(--${f.idea}-soft);color:var(--${f.idea})` }, String(f.num)),
        h('div', null,
          h('div', { style: 'font-weight:650' }, f.title),
          h('div', { style: 'color:var(--muted);font-size:15px', html: inline(f.question) }))))),
);

// ---- Showpieces + DSA -----------------------------------------------------
page.append(
  h('h2', null, 'Also here'),
  h('div', { class: 'grid-3' },
    h('a', { class: 'card', href: url('demo/digits.html'), style: 'text-decoration:none;color:inherit' },
      h('div', { style: 'font-weight:650;margin-bottom:4px' }, 'Showpiece: draw a digit, look inside'),
      h('div', { style: 'color:var(--muted);font-size:15px' }, 'A real trained network, running in your browser. See every layer react as you draw.')),
    h('a', { class: 'card', href: url('demo/tiny-lm.html'), style: 'text-decoration:none;color:inherit' },
      h('div', { style: 'font-weight:650;margin-bottom:4px' }, 'Showpiece: a tiny language model'),
      h('div', { style: 'color:var(--muted);font-size:15px' }, 'Watch a small model write text one character at a time, and see what it looks at.')),
    h('a', { class: 'card', href: url('dsa/index.html'), style: 'text-decoration:none;color:inherit' },
      h('div', { style: 'font-weight:650;margin-bottom:4px' }, 'DSA track'),
      h('div', { style: 'color:var(--muted);font-size:15px' }, 'Ten data structure and algorithm topics, each with an animation you can step through.'))),
);

page.append(
  h('h2', null, 'The maths that keeps coming back'),
  mdEl(`
    - **Linear algebra.** Data and model weights are lists and grids of numbers. One layer of a network moves points to new places.
    - **Calculus.** A derivative says which way to nudge a number to make the error smaller.
    - **Probability and statistics.** Models output probabilities. We measure how sure they are, and how wrong.
    - **Discrete maths.** Graphs, logic, counting, and proofs about algorithms.
  `),
  cue([
    ['"adjust numbers until the predictions improve"', 'learning from data'],
    ['"choose the best option from a huge set"', 'search'],
    ['"the reward only arrives later"', 'acting over time'],
  ]),
);

import { mountLayout } from '../lib/layout';
import { inShort, predict, problem, cue } from '../lib/blocks';
import { h } from '../lib/dom';
import { inline } from '../lib/md';
import { url } from '../lib/config';
import reg from '../data/registry.json';

const page = mountLayout();
const ideas = reg.ideas as Record<string, { label: string; question: string }>;
const count = (k: string) => reg.fields.filter((f) => f.idea === k).length;

page.append(
  h('header', { class: 'page-head' },
    h('div', { class: 'eyebrow' }, 'AI Field Explorer'),
    h('h1', null, 'Which part of AI would you want to research?'),
    h('p', { class: 'lede' }, 'Ten fields. One weekend project each. A log to compare how each one felt.')),

  inShort(
    'How do you find the AI field you would enjoy researching?',
    'Spend a weekend on a small project in each field, and log what excited you. This site gives you ten projects, two demos and the log.'),
  problem(`
    Next year you pick a thesis topic, and then spend a year on it.
    On paper, every field of AI sounds interesting.
    **The way to find out is to build something small in each field and notice which one you keep thinking about.**
  `),
);

// ---- Suggested route ------------------------------------------------------
const steps: [string, string, string][] = [
  ['Start with the digit demo', 'Draw a digit. Watch a trained network read it, layer by layer.', 'demo/digits.html'],
  ['Look at the Path Map', 'One page with all ten fields, which ones build on which, and the maths each needs.', 'path-map.html'],
  ['Pick any field', 'Each field card has a small interactive and a weekend notebook that runs in Google Colab.', 'fields/how-models-learn.html'],
  ['Write in your Spark Log', 'Note what surprised you. Rate how much you would enjoy a year on it, 1 to 10.', 'spark-log.html'],
];
page.append(
  h('h2', null, 'A suggested route'),
  h('p', { class: 'c-muted', style: 'margin-top:-4px' }, 'Every page is open from the menu on the left, in any order. This is one good order.'),
  h('div', { class: 'grid-4' },
    steps.map(([title, text, href], i) =>
      h('a', { class: 'card', href: url(href), style: 'text-decoration:none;color:inherit;display:block' },
        h('div', { style: 'font-size:13px;font-weight:700;color:var(--accent);margin-bottom:6px' }, `${i + 1}`),
        h('div', { style: 'font-weight:650;font-size:17px;margin-bottom:6px' }, title),
        h('div', { style: 'color:var(--muted);font-size:15px' }, text)))),
);

// ---- Three big ideas ------------------------------------------------------
const ideaText: Record<string, string> = {
  search: 'Try options, compare them, keep the best. Games, planning, schedules and routes.',
  learn: 'Show a model examples, measure its error, nudge its numbers. Repeat until it predicts well.',
  act: 'An agent acts, sees what happens, and adjusts. Rewards may come many steps later, or from what a whole group does.',
};
page.append(
  h('h2', null, 'Most of AI is three ideas'),
  h('div', { class: 'grid-3' },
    (['search', 'learn', 'act'] as const).map((k) =>
      h('div', { class: 'card', style: `border-top:4px solid var(--${k})` },
        h('div', { class: `c-${k}`, style: 'font-size:18px;margin-bottom:4px' }, ideas[k].label),
        h('div', { style: 'font-weight:600;margin-bottom:6px' }, ideas[k].question),
        h('div', { style: 'color:var(--muted);font-size:15px' }, ideaText[k])))),
  predict({
    prompt: 'Each of the ten fields below mainly uses one of these three ideas. **Which idea do you think most of the ten fields use?**',
    choices: ['Search', 'Learning from data', 'Acting over time'],
    reveal: `**Learning from data**: ${count('learn')} of the 10 fields. Search: ${count('search')}. Acting over time: ${count('act')}.

So most fields share one core skill: adjusting numbers until predictions get better. That makes field 1, *How models learn*, a good first stop.`,
  }),
);

// ---- All ten fields -------------------------------------------------------
page.append(
  h('h2', null, 'The ten fields'),
  h('div', { class: 'legend', style: 'margin:-6px 0 14px' },
    (['search', 'learn', 'act'] as const).map((k) => h('span', null, h('span', { class: 'sw', style: `background:var(--${k})` }), ideas[k].label))),
  h('div', { class: 'grid-2' },
    reg.fields.map((f) =>
      h('a', { class: 'card', href: url(`fields/${f.slug}.html`), style: 'text-decoration:none;color:inherit;display:flex;gap:14px;align-items:flex-start' },
        h('div', { style: `flex:none;width:34px;height:34px;border-radius:9px;display:grid;place-items:center;font-weight:750;background:var(--${f.idea}-soft);color:var(--${f.idea})` }, String(f.num)),
        h('div', null,
          h('div', { style: 'font-weight:650' }, f.title),
          h('div', { style: 'color:var(--muted);font-size:15px', html: inline(f.question) }),
          h('div', { class: `c-${f.idea}`, style: 'font-size:13px;margin-top:4px;font-weight:600' }, ideas[f.idea].label))))),
);

// ---- Showpieces -----------------------------------------------------------
page.append(
  h('h2', null, 'Two showpieces'),
  h('p', { class: 'c-muted', style: 'margin-top:-4px' }, 'Polished demos of things this study path lets you build. Both run in your browser.'),
  h('div', { class: 'grid-2' },
    h('a', { class: 'card', href: url('demo/digits.html'), style: 'text-decoration:none;color:inherit' },
      h('div', { style: 'font-weight:650;margin-bottom:4px' }, 'Draw a digit, look inside'),
      h('div', { style: 'color:var(--muted);font-size:15px' }, 'A trained network reads your drawing. See every layer react as you draw.')),
    h('a', { class: 'card', href: url('demo/tiny-lm.html'), style: 'text-decoration:none;color:inherit' },
      h('div', { style: 'font-weight:650;margin-bottom:4px' }, 'A tiny language model'),
      h('div', { style: 'color:var(--muted);font-size:15px' }, 'A small model writes text one character at a time. See its top guesses, and which earlier characters it looks at.'))),
);

// ---- The linear algebra game ----------------------------------------------
page.append(
  h('h2', null, 'Linear algebra, as a game'),
  h('a', { class: 'card', href: url('game/index.html'), style: 'text-decoration:none;color:inherit;display:block;max-width:760px' },
    h('div', { style: 'font-weight:650;margin-bottom:4px' }, 'SINGULAR'),
    h('div', { style: 'color:var(--muted);font-size:15px' }, 'A voiced story game from vectors to the singular value decomposition. You move space yourself, find out why each idea works, and explain it back in your own words.')),
);

// ---- DSA ------------------------------------------------------------------
page.append(
  h('h2', null, 'Data structures and algorithms (DSA)'),
  h('a', { class: 'card', href: url('dsa/index.html'), style: 'text-decoration:none;color:inherit;display:block;max-width:760px' },
    h('div', { style: 'font-weight:650;margin-bottom:4px' }, 'The DSA track: ten topics'),
    h('div', { style: 'color:var(--muted);font-size:15px' }, 'From "how does cost grow?" to dynamic programming. Each topic has an animation you can step through with your own input, practice problems, and a note on where it shows up in AI.')),
);

// ---- Maths ----------------------------------------------------------------
page.append(
  h('h2', null, 'The maths that keeps coming back'),
  h('table', { class: 'simple', style: 'max-width:900px' },
    h('thead', null, h('tr', null, h('th', null, 'Maths'), h('th', null, 'What it does in AI'), h('th', null, 'Used most in'))),
    h('tbody', null,
      [
        ['Linear algebra', 'Data and weights are lists and grids of numbers. One layer of a network moves points to new places.', 'How models learn, Looking inside models, Computer vision'],
        ['Calculus', 'A derivative says which way to nudge a number to make the error smaller.', 'Every field that trains a network'],
        ['Probability and statistics', 'Models output probabilities. We measure how sure they are, and how wrong.', 'Language models, Generative models, Reinforcement learning'],
        ['Discrete maths', 'Graphs, logic and counting. They let you prove an algorithm is right, and count how many steps it takes.', 'Planning and search, Optimisation, the DSA track'],
      ].map(([m, what, where]) => h('tr', null, h('td', { style: 'font-weight:600;white-space:nowrap' }, m), h('td', null, what), h('td', { class: 'c-muted' }, where))))),
  cue([
    ['"adjust numbers until the predictions improve"', 'learning from data'],
    ['"choose the best option from a huge set"', 'search'],
    ['"the reward only arrives later"', 'acting over time'],
  ]),
);

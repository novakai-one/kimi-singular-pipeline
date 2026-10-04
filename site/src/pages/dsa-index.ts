// DSA track overview: why it matters for AI, the ten topics in order, where each shows up in AI,
// how a topic page works, and the three practice sites (linked, not copied).
import { mountLayout } from '../lib/layout';
import { cue, inShort, predict, problem } from '../lib/blocks';
import { h } from '../lib/dom';
import { inline } from '../lib/md';
import { url } from '../lib/config';
import reg from '../data/registry.json';
import '../styles/dsa.css';

const page = mountLayout({ crumbs: [{ label: 'DSA track' }] });
const field = (slug: string) => reg.fields.find((f) => f.slug === slug)!;

page.append(
  h('header', { class: 'page-head' },
    h('div', { class: 'eyebrow' }, 'Data structures and algorithms'),
    h('h1', null, 'DSA track'),
    h('p', { class: 'lede' }, 'Ten topics. Each one animated step by step, with your own input, a challenge and practice problems.')),
  inShort(
    'Why learn data structures and algorithms for AI?',
    'AI programs are programs. The same ten ideas decide whether code finishes in a second or never, and each one appears inside the AI fields.'),
  problem(`
    A search finds the way out of a 10 × 10 maze in a blink. On a map with a million squares it never finishes.
    **Is the idea wrong, or the way it keeps track of the squares still to visit?**
    Usually the second. Choosing the right structure is the difference.
  `),
  predict({
    prompt: 'A program checks whether each of 100,000 new names is already in a list of 100,000 names. **Which change speeds it up most?**',
    choices: ['A faster computer', 'Keep the names in a set instead of a list', 'Sort the new names first'],
    reveal: '**A set.** A list lookup checks names one by one: up to 100,000 checks per name, 10 billion in total. A set lookup takes about one step: about 100,000 in total. A faster computer gives a few times; the right structure gives about 100,000 times. Topic 2 shows why.',
  }),
);

// ---------------------------------------------------------------- the ten topics
const USED_IN: Record<string, string[]> = {
  'big-o': ['language-models', 'multi-agent', 'planning-search'],
  'arrays-hashing': ['language-models', 'computer-vision', 'multi-agent'],
  'stacks-queues': ['planning-search'],
  'recursion-backtracking': ['optimisation', 'planning-search'],
  'sorting-searching': ['classic-ml'],
  'trees-bst': ['classic-ml', 'planning-search'],
  'heaps': ['planning-search', 'language-models'],
  'graphs': ['how-models-learn', 'planning-search'],
  'greedy': ['language-models', 'classic-ml'],
  'dynamic-programming': ['reinforcement-learning'],
};

page.append(
  h('h2', null, 'Which order should you take them in?'),
  h('p', { class: 'c-muted', style: 'margin-top:-4px' }, 'This order: each topic uses the ones before it. Every page is open, so skip ahead whenever you like.'),
  h('ol', { class: 'di-list' },
    reg.dsa.map((d) =>
      h('li', null,
        h('a', { class: 'card di-card', href: url(`dsa/${d.slug}.html`) },
          h('span', { class: 'di-num' }, String(d.num)),
          h('span', { class: 'di-body' },
            h('strong', null, d.title),
            h('span', { class: 'c-muted' }, d.sub),
            h('span', { class: 'di-used' }, 'In AI: ',
              USED_IN[d.slug].map((s) => {
                const f = field(s);
                return h('span', { class: `chip di-chip ${f.idea}` }, `${f.num} ${f.title}`);
              }))))))),
);

// ---------------------------------------------------------------- how a topic page works
const parts: [string, string][] = [
  ['Watch it run', 'A step-by-step animation of the algorithm on your own input. Step forward and back, play or pause, and see which line of pseudocode is running.'],
  ['Meet a challenge', 'Each animation has a goal, like "make quicksort do its worst". Finding an input that does it shows you how the algorithm behaves.'],
  ['Name it, then use it', 'What you saw, what it means, what it\'s called and its cost in big-O. Then where it appears in AI.'],
  ['Practise', 'Four problems on the page, answers one tap away. A Colab notebook with five more, checks you can run, and solutions in collapsed cells.'],
];
page.append(
  h('h2', null, 'What is on each topic page?'),
  h('div', { class: 'grid-4' },
    parts.map(([t, d], i) =>
      h('div', { class: 'card' },
        h('div', { style: 'font-size:13px;font-weight:700;color:var(--accent);margin-bottom:6px' }, String(i + 1)),
        h('div', { style: 'font-weight:650;margin-bottom:4px' }, t),
        h('div', { class: 'c-muted', style: 'font-size:15px' }, d)))),
);

// ---------------------------------------------------------------- practice sites
const SITES = [
  { label: 'CSES Problem Set', url: 'https://cses.fi/problemset/', text: 'Several hundred short problems, grouped by topic. A judge runs your code against hidden tests. Start with *Introductory Problems* and *Sorting and Searching*.' },
  { label: 'USACO Guide', url: 'https://usaco.guide/', text: 'Free modules from Bronze to Platinum, each with an explanation and practice problems in order of difficulty. Bronze and Silver cover this whole track.' },
  { label: 'LeetCode', url: 'https://leetcode.com/problemset/', text: 'Thousands of problems you can filter by topic tag (*Hash Table*, *Heap*, *Graph* …). The style of many job interviews.' },
];
page.append(
  h('h2', null, 'Where do you practise after the notebook?'),
  h('p', { class: 'c-muted', style: 'margin-top:-4px' }, 'Three free sites. The topic pages link to the right section of each. Their problems stay on their sites.'),
  h('div', { class: 'grid-3' },
    SITES.map((s) =>
      h('div', { class: 'card' },
        h('a', { href: s.url, target: '_blank', rel: 'noopener', style: 'font-weight:650;font-size:17px' }, s.label),
        h('p', { class: 'c-muted', style: 'font-size:15px;margin:6px 0 0', html: inline(s.text) })))),
  h('div', { class: 'card', style: 'margin-top:18px' },
    h('div', { style: 'font-weight:650;margin-bottom:4px' }, 'A weekly routine'),
    h('ol', { style: 'margin:0;padding-left:20px' },
      h('li', null, 'Monday: the topic page. Play the animation and win its challenge.'),
      h('li', null, 'Midweek: the notebook. Solve its five problems before opening the solutions.'),
      h('li', null, 'Weekend: three problems on one of the sites, from the section the topic page names.'))),
  cue([
    ['"how big can the input be?"', 'work out the big-O you can afford before choosing an algorithm'],
    ['an algorithm that works on small inputs but not large ones', 'look at the data structure first'],
  ]),
);

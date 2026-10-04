// DSA topic template. Content: site/src/data/dsa.ts. Visualisers: ./dsa/viz.
// Order follows the teaching rules: problem → guess → see it (step player) → what it means → name → formula
// → where it shows up in AI → by hand → practise more (notebook + linked problem sites).
import { mountLayout } from '../lib/layout';
import { challenge, cue, inShort, predict, problem, solution } from '../lib/blocks';
import { append, h } from '../lib/dom';
import { mdEl } from '../lib/md';
import { colabUrl, githubUrl, url } from '../lib/config';
import reg from '../data/registry.json';
import { dsaContent } from '../data/dsa';
import { DVIZ } from './dsa/viz';
import type { VizHandle } from './fieldviz/kit';
import '../styles/field.css';
import '../styles/dsa.css';

const slug = document.body.dataset.slug!;
const i = reg.dsa.findIndex((x) => x.slug === slug);
const d = reg.dsa[i];
const c = dsaContent(slug);

const page = mountLayout({ crumbs: [{ label: 'DSA track', href: 'dsa/index.html' }, { label: d.title }] });
page.classList.add('fc', 'dt');

// ------------------------------------------------------------------ head
page.append(
  h('header', { class: 'page-head fc-head' },
    h('div', { class: 'eyebrow' }, `DSA topic ${d.num} of 10 · ${d.sub}`),
    h('h1', null, d.title)),
  inShort(c.inShort[0], c.inShort[1]),
  problem(c.problem),
  predict(c.predict),
);

// ------------------------------------------------------------------ visualiser + explanation
const vizBox = h('div', { class: 'dt-viz' });
let handle: VizHandle | null = null;
const ch = challenge({ goal: c.viz.goal, detail: c.viz.detail, showMe: () => handle?.showMe() });

const stepBox = (n: number, label: string, text: string) =>
  h('section', { class: 'fc-step' },
    h('div', { class: 'fc-step-label' }, h('span', { class: 'fc-step-n' }, String(n)), label),
    mdEl(text, 'fc-step-body'));

append(page, [
  h('h2', null, c.viz.title),
  ch.el,
  h('div', { class: 'viz dt-viz-card' }, vizBox),
  h('div', { class: 'grid-3 dt-steps' },
    stepBox(1, 'What you see', c.explain.see),
    stepBox(2, 'What it means', c.explain.means),
    stepBox(3, 'What it\'s called', c.explain.called)),
  c.explain.formula
    ? h('div', { class: 'dt-formula' }, stepBox(4, 'The formula', c.explain.formula.replace(/(^|[^$])\$([^$]{40,}?)\$(?!\$)/g, (_, pre, m) => `${pre}$$${m}$$`)))
    : null,
  h('div', { class: 'why dt-ai' }, h('span', { class: 'block-label' }, 'Where does this show up in AI?'), mdEl(c.inAI, '')),
]);

const load = DVIZ[slug];
if (load) {
  vizBox.append(h('div', { class: 'c-muted', style: 'padding:40px;text-align:center' }, 'Loading the visualiser…'));
  load().then((m) => {
    vizBox.replaceChildren();
    handle = m.default(vizBox, { win: (msg) => ch.win(msg), feedback: (msg) => ch.feedback(msg) });
  });
} else {
  vizBox.append(h('div', { class: 'note-building' }, 'This visualiser is being built.'));
}

// ------------------------------------------------------------------ by hand
page.append(
  h('h2', null, 'Can you do these?'),
  h('p', { class: 'c-muted', style: 'margin-top:-6px' }, 'Pen and paper first. Each answer is one tap away.'),
  h('ol', { class: 'problem-list' },
    c.practice.map((p) => h('li', null, mdEl(p.q, ''), solution(p.a, 'Show the answer')))),
);

// ------------------------------------------------------------------ practise more
const SITES = [
  { label: 'CSES Problem Set', url: 'https://cses.fi/problemset/', note: 'several hundred short problems, grouped by topic, with an online judge' },
  { label: 'USACO Guide', url: 'https://usaco.guide/', note: 'free modules from Bronze to Platinum, each with practice problems' },
  { label: 'LeetCode', url: 'https://leetcode.com/problemset/', note: 'filter by topic tag; the style of many job interviews' },
];
page.append(
  h('h2', null, 'Where can you practise more?'),
  h('div', { class: 'card fc-taste' },
    h('div', null,
      h('p', { style: 'margin-top:0' }, h('strong', null, 'Practice notebook. '), 'More problems like the ones above, in Python. Each starts with a test you can run, and its solution sits in a collapsed cell.'),
      h('p', { class: 'c-muted', style: 'font-size:15px;margin:8px 0 0' }, 'Runs on Google Colab\'s free CPU, no install.')),
    h('div', { class: 'fc-taste-btns' },
      h('a', { class: 'btn primary', href: colabUrl(d.notebook), target: '_blank', rel: 'noopener' }, 'Open in Colab'),
      h('a', { class: 'btn', href: githubUrl(d.notebook), target: '_blank', rel: 'noopener' }, 'View on GitHub'))),
  h('div', { class: 'grid-2 dt-more' },
    h('div', null,
      h('h3', null, 'For this topic'),
      mdEl(c.more, '')),
    h('div', null,
      h('h3', null, 'The three sites'),
      h('ul', { class: 'dt-practice-links' },
        SITES.map((s) => h('li', null,
          h('a', { href: s.url, target: '_blank', rel: 'noopener' }, s.label),
          h('span', { class: 'c-muted' }, ` · ${s.note}`)))))),
  cue(c.cues),
);

// ------------------------------------------------------------------ prev/next
const prev = reg.dsa[(i + 9) % 10], next = reg.dsa[(i + 1) % 10];
page.append(
  h('nav', { class: 'fc-pn', 'aria-label': 'Other topics' },
    h('a', { class: 'card', href: url(`dsa/${prev.slug}.html`) }, h('span', { class: 'c-muted' }, '← Topic ' + prev.num), h('strong', null, prev.title)),
    h('a', { class: 'card', href: url(`dsa/${next.slug}.html`), style: 'text-align:right' }, h('span', { class: 'c-muted' }, 'Topic ' + next.num + ' →'), h('strong', null, next.title))),
);

// Field Card template. Content: site/src/data/fields.ts (from BUILD_BRIEF Section 4).
// Order on the page follows the teaching rules:
//   problem → see it (interactive) → what it means → what it's called → formula → by hand → in code (notebook)
import { mountLayout } from '../lib/layout';
import { challenge, cue, inShort, predict, problem, solution, why } from '../lib/blocks';
import { h } from '../lib/dom';
import { inline, md, mdEl } from '../lib/md';
import { colabUrl, githubUrl, url } from '../lib/config';
import reg from '../data/registry.json';
import { fieldContent } from '../data/fields';
import { VIZ } from './fieldviz';
import type { VizHandle } from './fieldviz/kit';
import '../styles/field.css';

const slug = document.body.dataset.slug!;
const i = reg.fields.findIndex((x) => x.slug === slug);
const f = reg.fields[i];
const c = fieldContent(slug);
const ideas = reg.ideas as Record<string, { label: string; question: string }>;
const idea = ideas[f.idea];

const page = mountLayout({ crumbs: [{ label: 'Path Map', href: 'path-map.html' }, { label: f.title }] });
page.classList.add('fc');

// ------------------------------------------------------------------ head
page.append(
  h('header', { class: 'page-head fc-head' },
    h('div', { class: 'eyebrow' }, `Field ${f.num} of 10 · ${f.sub}`),
    h('h1', null, f.title)),
  h('div', { class: 'fc-top' },
    inShort(c.inShort[0], c.inShort[1]),
    h('aside', { class: `fc-idea ${f.idea}` },
      h('span', { class: 'block-label' }, 'Main idea'),
      h('div', { class: 'fc-idea-name' }, idea.label),
      h('div', { class: 'fc-idea-q' }, idea.question),
      h('a', { href: url('path-map.html') }, 'See all three ideas on the Path Map →'))),
  problem(c.problem),
);

// ------------------------------------------------------------------ interactive + explanation
const vizBox = h('div', { class: 'fc-viz' });
let handle: VizHandle | null = null;
const ch = challenge({ goal: c.viz.goal, detail: c.viz.detail, showMe: () => handle?.showMe() });

const stepBox = (n: number, label: string, text: string) =>
  h('section', { class: 'fc-step' },
    h('div', { class: 'fc-step-label' }, h('span', { class: 'fc-step-n' }, String(n)), label),
    mdEl(text, 'fc-step-body'));

page.append(
  h('h2', null, c.viz.title),
  h('div', { class: 'split fc-split' },
    // left: the picture, what you see in it, and the formula next to it
    h('div', { class: 'fc-left' },
      h('div', { class: 'viz fc-viz-card' }, vizBox),
      h('div', { class: 'fc-steps' },
        stepBox(1, 'What you see', c.explain.see),
        // long maths gets its own line (display style), so it never breaks mid-expression
        c.explain.formula ? stepBox(4, 'The formula', c.explain.formula.replace(/(^|[^$])\$([^$]{28,}?)\$(?!\$)/g, (_, pre, m) => `${pre}$$${m}$$`)) : null)),
    // right: guess first, the goal, then what it means and what it's called
    h('div', null,
      predict(c.predict),
      ch.el,
      h('div', { class: 'fc-steps' },
        stepBox(2, 'What it means', c.explain.means),
        stepBox(3, 'What it\'s called', c.explain.called)))),
  why(c.why),
);

const load = VIZ[slug];
if (load) {
  vizBox.append(h('div', { class: 'c-muted', style: 'padding:40px;text-align:center' }, 'Loading the interactive…'));
  load().then((m) => {
    vizBox.replaceChildren();
    handle = m.default(vizBox, { win: (msg) => ch.win(msg), feedback: (msg) => ch.feedback(msg) });
  });
} else {
  vizBox.append(h('div', { class: 'note-building' }, 'This interactive is being built.'));
}

// ------------------------------------------------------------------ what you'd learn
const groups: [string, string[]][] = [
  ['AI', c.learn.ai], ['Maths', c.learn.maths], ['CS / DSA', c.learn.cs], ['Programming', c.learn.prog],
];
page.append(
  h('h2', null, 'What would you learn?'),
  h('p', { class: 'c-muted', style: 'margin-top:-6px' }, 'The names you will meet in this field. You don\'t need to know them yet.'),
  h('div', { class: 'grid-4 fc-learn' },
    groups.map(([g, items]) =>
      h('div', { class: 'card' },
        h('div', { class: 'fc-learn-h' }, g),
        h('div', { class: 'chips' }, items.map((t) => h('span', { class: 'chip', html: inline(t) })))))),
  ...(c.learn.note ? [h('p', { class: 'fc-note', html: inline(`**${c.learn.note}**`) })] : []),
);

// ------------------------------------------------------------------ weekend project
page.append(
  h('h2', null, 'Want to build it? The weekend project'),
  h('div', { class: 'card fc-taste' },
    h('div', null,
      mdEl(c.taste, ''),
      h('p', { class: 'c-muted', style: 'font-size:15px;margin:8px 0 0' }, 'About one weekend. Runs on Google Colab\'s free CPU, no install. Teaches the Python it uses as it goes. Solutions sit in collapsed cells, one click away.')),
    h('div', { class: 'fc-taste-btns' },
      h('a', { class: 'btn primary', href: colabUrl(f.notebook), target: '_blank', rel: 'noopener' }, 'Open in Colab'),
      h('a', { class: 'btn', href: githubUrl(f.notebook), target: '_blank', rel: 'noopener' }, 'View on GitHub'))),
);

// ------------------------------------------------------------------ by hand
page.append(
  h('h2', null, 'Can you do it by hand?'),
  h('ol', { class: 'problem-list' },
    c.practice.map((p) => h('li', null, mdEl(p.q, ''), solution(p.a, 'Show the answer')))),
);

// ------------------------------------------------------------------ research, Monash, deeper
page.append(
  h('div', { class: 'grid-2 fc-bottom' },
    h('div', null,
      h('h2', null, 'What are people still trying to find out?'),
      h('ul', { class: 'fc-questions' }, c.questions.map((q) => h('li', null, q))),
      h('p', { class: 'c-muted', style: 'font-size:15px' }, 'Open research questions. Any of them could grow into a thesis topic.'),
      h('h2', null, 'Where is it taught at Monash?'),
      h('p', null, c.monash)),
    h('div', null,
      h('h2', null, 'Where can you go deeper?'),
      h('ul', { class: 'fc-deeper' },
        c.deeper.map((d) => h('li', null,
          h('a', { href: d.url, target: '_blank', rel: 'noopener' }, d.label),
          d.note ? h('span', { class: 'c-muted' }, ` · ${d.note}`) : null))))),
  cue(c.cues),
);

// ------------------------------------------------------------------ spark log + prev/next
const prev = reg.fields[(i + 9) % 10], next = reg.fields[(i + 1) % 10];
page.append(
  h('div', { class: 'card fc-spark' },
    h('div', null,
      h('div', { style: 'font-weight:650;font-size:17px' }, 'How did this field feel?'),
      h('div', { class: 'c-muted', html: md('Write it down while it\'s fresh: what surprised you, what you\'d want to know next, and how much you\'d enjoy a year of it (1 to 10).') })),
    h('a', { class: 'btn primary', href: url(`spark-log.html#${slug}`) }, 'Open my Spark Log')),
  h('nav', { class: 'fc-pn', 'aria-label': 'Other fields' },
    h('a', { class: 'card', href: url(`fields/${prev.slug}.html`) }, h('span', { class: 'c-muted' }, '← Field ' + prev.num), h('strong', null, prev.title)),
    h('a', { class: 'card', href: url(`fields/${next.slug}.html`), style: 'text-align:right' }, h('span', { class: 'c-muted' }, 'Field ' + next.num + ' →'), h('strong', null, next.title))),
);

// Path Map: all ten fields, grouped by the three big ideas, with "builds on" arrows
// and the maths/CS each field needs. Facts come from BUILD_BRIEF Sections 3 and 4.
import { mountLayout } from '../lib/layout';
import { challenge, cue, inShort, predict, problem } from '../lib/blocks';
import { append, h, s, clear } from '../lib/dom';
import { inline, mdEl } from '../lib/md';
import { url } from '../lib/config';
import reg from '../data/registry.json';
import { FIELDS, fieldContent } from '../data/fields';
import '../styles/path-map.css';

type Idea = 'search' | 'learn' | 'act';
const ideas = reg.ideas as Record<Idea, { label: string; question: string }>;
const MATHS = [
  { key: 'la', label: 'Linear algebra', short: 'LA' },
  { key: 'calc', label: 'Calculus', short: 'Calc' },
  { key: 'prob', label: 'Probability and statistics', short: 'Prob' },
  { key: 'disc', label: 'Discrete maths', short: 'Disc' },
] as const;

const page = mountLayout({ crumbs: [{ label: 'Path Map' }], wide: true });

page.append(
  h('header', { class: 'page-head' },
    h('div', { class: 'eyebrow' }, 'Path Map'),
    h('h1', null, 'How do the ten fields fit together?'),
    h('p', { class: 'lede' }, 'Every field on one page: which big idea it uses, which fields it builds on, and the maths each one needs.')),
  h('div', { class: 'pm-intro' },
    problem(`
      You have a year of courses ahead and a thesis to choose.
      **Which field should you try first, and which ones will make the others easier?**
      An arrow on the map means "builds on": the field at the arrow's tail makes the one at its head easier.
    `),
    inShort(
      'How do the ten fields fit together?',
      'They group into three big ideas. A few fields are foundations that others build on, and four areas of maths run through all of them.')),
);

// ------------------------------------------------------------------ layout of the map
const NODE_W = 210, NODE_H = 74;
const COLX = [200, 450, 700, 950];
const LANES: { idea: Idea; y: number; h: number }[] = [
  { idea: 'search', y: 0, h: 140 },
  { idea: 'learn', y: 150, h: 280 },
  { idea: 'act', y: 440, h: 140 },
];
const POS: Record<string, [number, number]> = {
  'planning-search': [COLX[1], 33],
  'optimisation': [COLX[2], 33],
  'classic-ml': [COLX[0], 183],
  'how-models-learn': [COLX[1], 183],
  'language-models': [COLX[2], 183],
  'interpretability': [COLX[3], 183],
  'computer-vision': [COLX[2], 323],
  'generative-models': [COLX[3], 323],
  'reinforcement-learning': [COLX[2], 473],
  'multi-agent': [COLX[3], 473],
};
const VB_W = 1180, VB_H = 590;

const edges: [string, string][] = [];
for (const fc of FIELDS) for (const b of fc.buildsOn) edges.push([b, fc.slug]);
const regOf = (slug: string) => reg.fields.find((f) => f.slug === slug)!;

// ------------------------------------------------------------------ route challenge
let route: string[] = [];
const ch = challenge({
  goal: 'Plan a route: click three fields in a row, where each one builds on the one before.',
  detail: 'Follow the arrows. For example, start at a field with no arrows coming in.',
  showMe: () => showRoute(['classic-ml', 'how-models-learn', 'language-models'], true),
});

// ------------------------------------------------------------------ svg
const svg = s('svg', { viewBox: `0 0 ${VB_W} ${VB_H}`, class: 'pm-svg', role: 'img', 'aria-label': 'Map of the ten fields in three lanes, with arrows showing which fields build on which.' });
const defs = s('defs', null,
  s('marker', { id: 'pm-arrow', viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' },
    s('path', { d: 'M0,0 L10,5 L0,10 z', class: 'pm-arrowhead' })),
  s('marker', { id: 'pm-arrow-hi', viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' },
    s('path', { d: 'M0,0 L10,5 L0,10 z', class: 'pm-arrowhead hi' })));
svg.append(defs);

for (const L of LANES) {
  // lane label and its question, wrapped into the left gutter
  const words = ideas[L.idea].question.split(' ');
  const qLines: string[] = [''];
  for (const w of words) {
    if ((qLines[qLines.length - 1] + ' ' + w).trim().length > 22) qLines.push(w);
    else qLines[qLines.length - 1] = (qLines[qLines.length - 1] + ' ' + w).trim();
  }
  svg.append(
    s('rect', { x: 0, y: L.y, width: VB_W, height: L.h, rx: 14, class: `pm-lane ${L.idea}` }),
    s('text', { x: 18, y: L.y + 30, class: `pm-lane-label ${L.idea}` }, ideas[L.idea].label),
    ...qLines.map((ln, k) => s('text', { x: 18, y: L.y + 52 + k * 17, class: 'pm-lane-q' }, ln)));
}

const edgeEls: { from: string; to: string; el: SVGPathElement }[] = [];
const edgeLayer = s('g', null);
svg.append(edgeLayer);
for (const [a, b] of edges) {
  const [ax, ay] = POS[a], [bx, by] = POS[b];
  // connect right side of a to left side of b (or top/bottom when stacked)
  let x1 = ax + NODE_W, y1 = ay + NODE_H / 2, x2 = bx, y2 = by + NODE_H / 2;
  let d: string;
  if (bx === ax) { // same column: vertical
    x1 = ax + NODE_W / 2; x2 = bx + NODE_W / 2;
    y1 = ay < by ? ay + NODE_H : ay; y2 = ay < by ? by : by + NODE_H;
    d = `M${x1},${y1} L${x2},${y2}`;
  } else if (bx - ax > COLX[2] - COLX[0] - 10) { // skips a column: curve around
    const lift = by >= ay ? 1 : -1;
    const midY = (by === ay ? ay - 30 : Math.max(ay, by) + NODE_H + 22);
    d = `M${x1},${y1} C${x1 + 60},${y1} ${x1 + 40},${midY} ${(x1 + x2) / 2},${midY} S${x2 - 60},${y2} ${x2},${y2}`;
    void lift;
  } else {
    const mx = (x1 + x2) / 2;
    d = `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`;
  }
  const el = s('path', { d, class: 'pm-edge', 'marker-end': 'url(#pm-arrow)' });
  edgeLayer.append(el);
  edgeEls.push({ from: a, to: b, el });
}

const nodeEls: Record<string, SVGGElement> = {};
for (const f of reg.fields) {
  const [x, y] = POS[f.slug];
  const fc = fieldContent(f.slug);
  const words = f.title.split(' ');
  const lines: string[] = [''];
  for (const w of words) {
    if ((lines[lines.length - 1] + ' ' + w).trim().length > 21) lines.push(w);
    else lines[lines.length - 1] = (lines[lines.length - 1] + ' ' + w).trim();
  }
  const g = s('g', { class: `pm-node ${f.idea}`, tabindex: 0, role: 'button', 'aria-label': `Field ${f.num}: ${f.title}` },
    s('rect', { x, y, width: NODE_W, height: NODE_H, rx: 10, class: 'pm-node-bg' }),
    s('rect', { x, y, width: 5, height: NODE_H, rx: 2, class: 'pm-node-bar' }),
    s('circle', { cx: x + 24, cy: y + 24, r: 13, class: 'pm-node-num-bg' }),
    s('text', { x: x + 24, y: y + 28.5, class: 'pm-node-num', 'text-anchor': 'middle' }, String(f.num)),
    lines.slice(0, 2).map((ln, k) => s('text', { x: x + 46, y: y + 24 + k * 17, class: 'pm-node-title' }, ln)),
    MATHS.filter((m) => fc.maths.includes(m.key)).map((m, k) =>
      s('g', null,
        s('rect', { x: x + 46 + k * 42, y: y + NODE_H - 24, width: 38, height: 16, rx: 8, class: `pm-tag ${m.key}` }),
        s('text', { x: x + 46 + k * 42 + 19, y: y + NODE_H - 12.5, class: 'pm-tag-t', 'text-anchor': 'middle' }, m.short))),
    s('text', { x: x + NODE_W - 10, y: y + 20, class: 'pm-step', 'text-anchor': 'end' }, ''));
  g.addEventListener('mouseenter', () => focusField(f.slug));
  g.addEventListener('focus', () => focusField(f.slug));
  g.addEventListener('click', () => pick(f.slug));
  g.addEventListener('keydown', (e) => { if ((e as KeyboardEvent).key === 'Enter' || (e as KeyboardEvent).key === ' ') { e.preventDefault(); pick(f.slug); } });
  svg.append(g);
  nodeEls[f.slug] = g;
}

// ------------------------------------------------------------------ details panel
const panel = h('aside', { class: 'pm-panel card', 'aria-live': 'polite' });
function focusField(slug: string) {
  for (const e of edgeEls) {
    const on = e.from === slug || e.to === slug;
    e.el.classList.toggle('hi', on);
    e.el.setAttribute('marker-end', on ? 'url(#pm-arrow-hi)' : 'url(#pm-arrow)');
  }
  for (const [k, g] of Object.entries(nodeEls)) g.classList.toggle('focus', k === slug);
  const f = regOf(slug), fc = fieldContent(slug);
  const into = fc.buildsOn.map((b) => regOf(b).title);
  const outOf = FIELDS.filter((x) => x.buildsOn.includes(slug)).map((x) => regOf(x.slug).title);
  clear(panel);
  panel.append(
    h('div', { class: 'eyebrow', style: 'margin-bottom:4px' }, `Field ${f.num} · ${ideas[f.idea as Idea].label}`),
    h('h3', { style: 'margin:0 0 4px' }, f.title),
    h('p', { class: 'c-muted', style: 'margin:0 0 10px', html: inline(f.question) }),
    h('div', { class: 'pm-panel-row' }, h('strong', null, 'Builds on: '), into.length ? into.join(', ') : 'nothing on this map (a starting point)'),
    h('div', { class: 'pm-panel-row' }, h('strong', null, 'Leads to: '), outOf.length ? outOf.join(', ') : '–'),
    h('div', { class: 'pm-panel-h' }, 'Maths'),
    h('div', { class: 'chips' }, fc.learn.maths.map((m) => h('span', { class: 'chip' }, m))),
    h('div', { class: 'pm-panel-h' }, 'CS / DSA'),
    h('div', { class: 'chips' }, fc.learn.cs.map((m) => h('span', { class: 'chip' }, m))),
    h('div', { class: 'pm-panel-h' }, 'At Monash'),
    h('div', { style: 'font-size:14.5px' }, fc.monash),
    h('a', { class: 'btn primary small', href: url(`fields/${slug}.html`), style: 'margin-top:12px' }, 'Open the field card →'));
}

// ------------------------------------------------------------------ route picking
const routeBox = h('div', { class: 'pm-route' });
function paintRoute() {
  for (const [k, g] of Object.entries(nodeEls)) {
    const i = route.indexOf(k);
    g.classList.toggle('picked', i >= 0);
    (g.querySelector('.pm-step') as SVGTextElement).textContent = i >= 0 ? `#${i + 1}` : '';
  }
  for (const e of edgeEls) {
    const a = route.indexOf(e.from), b = route.indexOf(e.to);
    e.el.classList.toggle('route', a >= 0 && b === a + 1);
  }
  clear(routeBox);
  append(routeBox, [
    h('span', { class: 'c-muted' }, 'Your route: '),
    route.length ? route.map((r, i) => [i ? ' → ' : '', h('strong', null, regOf(r).title)]) : h('span', null, 'click fields on the map'),
    route.length ? h('button', { class: 'btn small ghost', type: 'button', onclick: () => { route = []; paintRoute(); ch.feedback(''); }, style: 'margin-left:10px' }, 'Clear') : null]);
}
function pick(slug: string) {
  focusField(slug);
  if (route.includes(slug)) { route = route.slice(0, route.indexOf(slug)); paintRoute(); return; }
  const last = route[route.length - 1];
  if (last && !fieldContent(slug).buildsOn.includes(last)) {
    ch.feedback(`**${regOf(slug).title}** doesn't build on **${regOf(last).title}**: no arrow joins them. Pick a field the arrow from ${regOf(last).title} points to, or start again.`);
    route = [slug];
  } else {
    route = [...route, slug].slice(-3);
    if (route.length === 3) ch.win(`Done: ${route.map((r) => regOf(r).title).join(' → ')}. Each field makes the next one easier.`);
    else ch.feedback(route.length === 1 ? 'Now pick a field that an arrow from it points to.' : 'One more.');
  }
  paintRoute();
}
async function showRoute(r: string[], demo: boolean) {
  route = [];
  paintRoute();
  for (const slug of r) {
    await new Promise((res) => setTimeout(res, 550));
    focusField(slug);
    route.push(slug);
    paintRoute();
  }
  if (demo) ch.feedback('That is one route. Try your own: pick three fields joined by arrows.');
}

// ------------------------------------------------------------------ list view (phones)
const listView = h('div', { class: 'pm-list' },
  (['search', 'learn', 'act'] as Idea[]).map((k) =>
    h('section', { class: `pm-list-lane ${k}` },
      h('div', { class: `pm-list-head c-${k}` }, ideas[k].label),
      h('div', { class: 'c-muted', style: 'font-size:14px;margin-bottom:8px' }, ideas[k].question),
      reg.fields.filter((f) => f.idea === k).map((f) => {
        const fc = fieldContent(f.slug);
        return h('a', { class: 'card pm-list-card', href: url(`fields/${f.slug}.html`) },
          h('div', { style: 'font-weight:650' }, `${f.num}. ${f.title}`),
          h('div', { class: 'c-muted', style: 'font-size:14px' }, 'Builds on: ' + (fc.buildsOn.length ? fc.buildsOn.map((b) => regOf(b).title).join(', ') : 'a starting point')),
          h('div', { class: 'chips', style: 'margin-top:6px' }, MATHS.filter((m) => fc.maths.includes(m.key)).map((m) => h('span', { class: `chip pm-chip ${m.key}` }, m.label))));
      }))));

// ------------------------------------------------------------------ assemble
const counts = MATHS.map((m) => ({ ...m, n: FIELDS.filter((f) => f.maths.includes(m.key)).length }));
page.append(
  h('h2', null, 'Which fields build on which?'),
  predict({
    prompt: 'Four areas of maths run through AI: linear algebra, calculus, probability and statistics, discrete maths. **Which one do you think the most fields name in their maths list?**',
    choices: MATHS.map((m) => m.label),
    reveal: `**${counts.slice().sort((a, b) => b.n - a.n).map((c) => `${c.label}: ${c.n} of 10`).join('. ')}.**

Linear algebra comes first: data, weights and layers are all vectors and matrices. Calculus appears in only two maths lists, but every field that trains a network uses it, through gradients.`,
  }),
  h('div', { class: 'pm-wrap' },
    h('div', { class: 'pm-map' }, svg, routeBox),
    h('div', { class: 'pm-side' }, ch.el, panel)),
  listView,
  h('p', { class: 'c-muted pm-legend' },
    'Tags on each field: ', MATHS.map((m) => h('span', { class: `chip pm-chip ${m.key}` }, `${m.short} = ${m.label}`)),
    ' · Taken from each field\'s maths list. Hover a field for the details; click to add it to your route.'),
);
paintRoute();
focusField('how-models-learn');

// ------------------------------------------------------------------ maths & CS table
page.append(
  h('h2', null, 'What maths and CS does each field need?'),
  h('p', { class: 'c-muted', style: 'margin-top:-6px' }, 'A dot means the area is named in that field\'s maths list. The CS column lists the data structures and algorithms the field uses most.'),
  h('div', { class: 'pm-table-wrap' },
    h('table', { class: 'simple pm-table' },
      h('thead', null, h('tr', null, h('th', null, 'Field'), h('th', null, 'Main idea'), MATHS.map((m) => h('th', { class: 'pm-dot-col' }, m.label)), h('th', null, 'CS / DSA'))),
      h('tbody', null,
        reg.fields.map((f) => {
          const fc = fieldContent(f.slug);
          return h('tr', null,
            h('td', null, h('a', { href: url(`fields/${f.slug}.html`) }, `${f.num}. ${f.title}`)),
            h('td', { class: `c-${f.idea}` }, ideas[f.idea as Idea].label),
            MATHS.map((m) => h('td', { class: 'pm-dot-col' }, fc.maths.includes(m.key) ? h('span', { class: `pm-dot ${m.key}`, 'aria-label': 'yes' }, '●') : '')),
            h('td', { style: 'font-size:14px' }, fc.learn.cs.join('; ')));
        })))),
  mdEl(`
    **Every field also uses the same CS core:** data structures (arrays, hash maps, heaps, graphs, trees), algorithm design (search, dynamic programming, greedy) and complexity (how cost grows as the problem gets bigger). The [DSA track](@/dsa/index.html) covers all three.
  `, 'prose'),
  cue([
    ['a field you like, but its card looks hard', 'look at what it builds on on this map, and try that first'],
    ['"vectors", "matrices" or "directions" in a field description', 'your linear algebra course is the prerequisite'],
    ['"probability", "noise" or "expected value"', 'statistics is the prerequisite'],
  ]),
);

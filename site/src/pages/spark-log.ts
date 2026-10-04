// Spark Log: per field, what surprised me, what I'd want to know next, excitement 1–10.
// Saved in this browser's localStorage (wrapped in try/catch by lib/storage). Export as Markdown.
// The ranking at the bottom orders fields by excitement.
import { mountLayout } from '../lib/layout';
import { inShort, problem } from '../lib/blocks';
import { append, clear, h } from '../lib/dom';
import { load, save } from '../lib/storage';
import { url } from '../lib/config';
import reg from '../data/registry.json';
import '../styles/spark-log.css';

const KEY = 'afe-spark-log';
interface Entry { surprised: string; next: string; score: number | null; updated: string }
type Log = Record<string, Entry>;

const empty = (): Entry => ({ surprised: '', next: '', score: null, updated: '' });
const log: Log = load<Log>(KEY, {});
for (const f of reg.fields) log[f.slug] = { ...empty(), ...(log[f.slug] ?? {}) };

const ideas = reg.ideas as Record<string, { label: string; question: string }>;
const page = mountLayout({ crumbs: [{ label: 'Spark Log' }] });

// ---------------------------------------------------------------- saving
const status = h('span', { class: 'sl-status', 'aria-live': 'polite' });
const dirty = new Set<string>();                    // fields edited in this tab since the last save
const refreshers = new Map<string, () => void>();  // redraw one card from `log`
let storageOk = save(KEY, log);
/** Take entries edited in another tab (they are in storage), keep this tab's own edits. */
function mergeFromStorage() {
  const stored = load<Log>(KEY, {});
  for (const f of reg.fields) {
    const other = stored[f.slug];
    if (!other || dirty.has(f.slug)) continue;
    const mine = log[f.slug];
    if (other.surprised !== mine.surprised || other.next !== mine.next || other.score !== mine.score) {
      log[f.slug] = { ...empty(), ...other };
      refreshers.get(f.slug)?.();
    }
  }
}
let pending: number | undefined;
function persistSoon() { window.clearTimeout(pending); pending = window.setTimeout(persist, 300); }
function persist() {
  window.clearTimeout(pending);
  mergeFromStorage();
  storageOk = save(KEY, log);
  if (storageOk) dirty.clear();
  status.textContent = storageOk
    ? 'Saved in this browser.'
    : 'This browser is not saving (a private window, or storage is blocked). Export before you close the page.';
  status.classList.toggle('warn', !storageOk);
  renderRanking();
  renderCount();
}
function touch(slug: string) {
  log[slug].updated = new Date().toISOString().slice(0, 10);
  dirty.add(slug);
}
// save at once when the tab is hidden or closed, so the last keystrokes are kept
window.addEventListener('pagehide', () => { if (dirty.size) persist(); });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && dirty.size) persist(); });
// another tab saved: show its changes here (this tab's unsaved edits win)
window.addEventListener('storage', (e) => { if (e.key === KEY) { mergeFromStorage(); renderRanking(); renderCount(); } });

// ---------------------------------------------------------------- export
function toMarkdown(): string {
  const date = new Date().toISOString().slice(0, 10);
  const lines = [`# My Spark Log`, '', `Exported ${date} from AI Field Explorer.`, '', '## Ranking by excitement', ''];
  const ranked = ranking();
  ranked.rated.forEach((f, i) => lines.push(`${i + 1}. ${f.title}: ${log[f.slug].score}/10`));
  if (ranked.unrated.length) lines.push('', `Not rated yet: ${ranked.unrated.map((f) => f.title).join(', ')}.`);
  for (const f of reg.fields) {
    const e = log[f.slug];
    lines.push('', `## Field ${f.num}: ${f.title}`, '');
    lines.push(`- **Excitement:** ${e.score ?? 'not rated'}${e.score ? '/10' : ''}`);
    const block = (t: string) => t.trim().split(/\r?\n/).join('\n  ') || '(empty)';     // keep later lines inside the bullet
    lines.push(`- **What surprised me:** ${block(e.surprised)}`);
    lines.push(`- **What I'd want to know next:** ${block(e.next)}`);
    if (e.updated) lines.push(`- *Last edited ${e.updated}*`);
  }
  return lines.join('\n') + '\n';
}
function download() {
  const blob = new Blob([toMarkdown()], { type: 'text/markdown' });
  const a = h('a', { href: URL.createObjectURL(blob), download: `spark-log-${new Date().toISOString().slice(0, 10)}.md` });
  document.body.append(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}
const copyBtn = h('button', { class: 'btn', type: 'button' }, 'Copy as Markdown');
copyBtn.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(toMarkdown());
    copyBtn.textContent = 'Copied';
  } catch {
    copyBtn.textContent = 'Copy failed: use Export instead';
  }
  setTimeout(() => { copyBtn.textContent = 'Copy as Markdown'; }, 2000);
});

// ---------------------------------------------------------------- head
const countEl = h('span', { class: 'sl-count' });
function renderCount() {
  const n = reg.fields.filter((f) => log[f.slug].score !== null || log[f.slug].surprised.trim() || log[f.slug].next.trim()).length;
  countEl.textContent = `${n} of 10 fields logged`;
}
page.append(
  h('header', { class: 'page-head' },
    h('div', { class: 'eyebrow' }, 'Your notes'),
    h('h1', null, 'Spark Log')),
  inShort(
    'Which fields excite you most?',
    'After each field, write what surprised you, what you would want to know next, and a score from 1 to 10. The ranking at the bottom compares them.'),
  problem(`
    After ten fields, the early ones blur together.
    **A note written right after each field keeps an honest record.**
  `),
  h('div', { class: 'card sl-bar' },
    h('div', null, countEl, ' · ', status),
    h('div', { class: 'btn-row' },
      h('button', { class: 'btn primary', type: 'button', onclick: download }, 'Export as Markdown'),
      copyBtn,
      h('a', { class: 'btn ghost', href: '#ranking' }, 'See the ranking'))),
  h('p', { class: 'c-muted sl-privacy' }, 'Your notes stay in this browser on this device. Nothing is sent anywhere. Export them to keep a copy. (The site can\'t read an export back in.)'),
);

// ---------------------------------------------------------------- one card per field
const QUESTIONS: [keyof Pick<Entry, 'surprised' | 'next'>, string, string][] = [
  ['surprised', 'What surprised me?', 'Something that worked differently from what you expected.'],
  ['next', 'What would I want to know next?', 'A question you would follow if you had a free week.'],
];
const cards = h('div', { class: 'sl-cards' });
for (const f of reg.fields) {
  const e = log[f.slug];
  const scoreBtns = Array.from({ length: 10 }, (_, k) => {
    const v = k + 1;
    const b = h('button', { class: 'sl-score-btn', type: 'button', 'aria-pressed': String(e.score === v), 'aria-label': `Excitement ${v} out of 10` }, String(v));
    b.addEventListener('click', () => {
      const cur = log[f.slug];
      cur.score = cur.score === v ? null : v;                 // a second click clears it
      scoreBtns.forEach((bb, kk) => bb.setAttribute('aria-pressed', String(cur.score === kk + 1)));
      touch(f.slug); persist();
    });
    return b;
  });
  const fields = QUESTIONS.map(([key, label, hint]) => {
    const id = `sl-${f.slug}-${key}`;
    const ta = h('textarea', { id, rows: 3, placeholder: hint });
    ta.value = e[key];
    ta.addEventListener('input', () => {
      log[f.slug][key] = ta.value; touch(f.slug);
      persistSoon();
    });
    return h('div', { class: 'sl-q' }, h('label', { for: id }, label), ta);
  });
  refreshers.set(f.slug, () => {
    const cur = log[f.slug];
    QUESTIONS.forEach(([key], k) => { (fields[k].querySelector('textarea') as HTMLTextAreaElement).value = cur[key]; });
    scoreBtns.forEach((bb, kk) => bb.setAttribute('aria-pressed', String(cur.score === kk + 1)));
  });
  cards.append(
    h('section', { class: `card sl-card ${f.idea}`, id: f.slug },
      h('div', { class: 'sl-card-head' },
        h('div', null,
          h('div', { class: 'sl-card-eyebrow' }, `Field ${f.num} · ${ideas[f.idea].label}`),
          h('h2', null, f.title)),
        h('a', { href: url(`fields/${f.slug}.html`), class: 'sl-card-link' }, 'Open the field card →')),
      fields,
      h('div', { class: 'sl-q' },
        h('span', { class: 'sl-label' }, 'Excitement, 1 to 10: how much would you enjoy a year of this?'),
        h('div', { class: 'sl-scores', role: 'group', 'aria-label': `Excitement for ${f.title}` }, scoreBtns))));
}
page.append(h('h2', null, 'One entry per field'), cards);

// ---------------------------------------------------------------- ranking
function ranking() {
  const rated = reg.fields.filter((f) => log[f.slug].score !== null)
    .sort((a, b) => (log[b.slug].score! - log[a.slug].score!) || a.num - b.num);
  const unrated = reg.fields.filter((f) => log[f.slug].score === null);
  return { rated, unrated };
}
const rankBox = h('div', { class: 'card sl-rank' });
function renderRanking() {
  clear(rankBox);
  const { rated, unrated } = ranking();
  if (!rated.length) {
    rankBox.append(h('p', { class: 'c-muted', style: 'margin:0' }, 'No scores yet. Give a field a score from 1 to 10 and it appears here.'));
    return;
  }
  append(rankBox, [
    h('ol', { class: 'sl-rank-list' },
      rated.map((f, i) => {
        const s = log[f.slug].score!;
        return h('li', null,
          h('a', { href: `#${f.slug}`, class: 'sl-rank-name' }, h('span', { class: 'sl-rank-n' }, `${i + 1}.`), f.title),
          h('span', { class: 'sl-rank-track', 'aria-hidden': 'true' }, h('span', { class: `sl-rank-bar ${f.idea}`, style: `width:${s * 10}%` })),
          h('span', { class: 'sl-rank-score' }, `${s}/10`));
      })),
    h('div', { class: 'legend' },
      (['search', 'learn', 'act'] as const).map((k) => h('span', null, h('span', { class: 'sw', style: `background:var(--${k})` }), ideas[k].label))),
    unrated.length ? h('p', { class: 'c-muted', style: 'margin:10px 0 0;font-size:15px' }, `Not rated yet: ${unrated.map((f) => f.title).join(', ')}.`) : null,
  ]);
}
page.append(
  h('h2', { id: 'ranking' }, 'Which fields scored highest?'),
  h('p', { class: 'c-muted', style: 'margin-top:-4px' }, 'Highest first. Bar colour shows the field\'s main idea. Ties keep the Path Map order.'),
  rankBox,
);

// ---------------------------------------------------------------- start
renderRanking();
renderCount();
status.textContent = storageOk ? 'Saved in this browser.' : 'This browser is not saving (a private window, or storage is blocked). Export before you close the page.';
status.classList.toggle('warn', !storageOk);

// arriving from a field card: spark-log.html#slug scrolls to that entry and puts the cursor in it
function focusHash() {
  const slug = decodeURIComponent(location.hash.slice(1));
  const card = slug && document.getElementById(slug);
  if (!card || !card.classList.contains('sl-card')) return;
  card.scrollIntoView({ block: 'start' });
  card.classList.add('sl-flash');
  setTimeout(() => card.classList.remove('sl-flash'), 1600);
  (card.querySelector('textarea') as HTMLTextAreaElement | null)?.focus({ preventScroll: true });
}
window.addEventListener('hashchange', focusHash);
setTimeout(focusHash, 50);

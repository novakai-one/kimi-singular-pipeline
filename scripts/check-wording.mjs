// Wording check (Section 2a of BUILD_BRIEF.md).
// Scans the rendered text of every site page (needs `npm run build` first)
// and the prose of every notebook (markdown cells + code comments + strings).
//
//   node scripts/check-wording.mjs            # site + notebooks
//   node scripts/check-wording.mjs --nb-only  # notebooks only (no browser)
//
// Allowed exceptions live in scripts/wording-allow.json, each with a reason.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '..');

const RULES = [
  // banned words (2a "Words to avoid")
  ['banned word', /\b(simply|just|obviously|clearly|trivially|trivial)\b/gi],
  ['banned phrase', /\b(it'?s easy to see|it is easy to see|easy to see|recall that|note that|it turns out|as you know)\b/gi],
  ['recall', /\brecall\b/gi],
  ['filler opening', /\b(in this (lesson|notebook|page) we'?ll|we'?ll explore|fascinating world|let'?s dive|dive into|deep dive)\b/gi],
  ['hype', /\b(amazing|incredible|magic|magical|awesome|mind-?blowing|revolutionary|super ?powerful)\b/gi],
  // banned analogies
  ['analogy: fruit', /\b(fruit|fruits|apples?|pears?|bananas?|grapes?|lemons?|cherr(y|ies))\b/gi],
  ['analogy: shopping/cooking', /\b(shopping|shop|recipes?|cooking|cook|chef|kitchen|ingredients?|bake|baking)\b/gi],
  ['analogy: factory/machine', /\b(factory|factories|eats?|eating|spits?( out)?|digests?|machine that)\b/gi],
  ['analogy: sport', /\b(sports?|football|soccer|basketball|tennis|cricket|goalkeeper)\b/gi],
  ['personification', /\b(favou?rite|wants|is happy|happy|likes to|loves|hates|feels|thinks|believes|knows)\b/gi],
  ['exclamation', /[A-Za-z0-9)\]'"]![ \n"')]|[A-Za-z0-9)\]'"]!$/gm],
];

const allow = existsSync(join(here, 'wording-allow.json'))
  ? JSON.parse(readFileSync(join(here, 'wording-allow.json'), 'utf8'))
  : [];
const isAllowed = (where, text) =>
  allow.some((a) => (!a.where || where.includes(a.where)) && text.toLowerCase().includes(a.text.toLowerCase()));

const hits = [];
function scan(where, text) {
  for (const [name, re] of RULES) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(text))) {
      const s = Math.max(0, m.index - 50), e = Math.min(text.length, m.index + m[0].length + 50);
      const ctx = text.slice(s, e).replace(/\s+/g, ' ');
      if (!isAllowed(where, ctx)) hits.push({ where, rule: name, match: m[0], ctx });
    }
  }
}

// ---------------- notebooks ----------------
function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const n of readdirSync(dir)) {
    const f = join(dir, n);
    if (n.startsWith('.')) continue;
    if (statSync(f).isDirectory()) walk(f, out);
    else if (n.endsWith('.ipynb')) out.push(f);
  }
  return out;
}
function notebookProse(cell) {
  const src = Array.isArray(cell.source) ? cell.source.join('') : cell.source;
  if (cell.cell_type === 'markdown') return src.replace(/```[\s\S]*?```/g, ' ').replace(/`[^`]*`/g, ' ').replace(/<[^>]+>/g, ' ');
  if (cell.cell_type !== 'code') return '';
  const parts = [];
  for (const line of src.split('\n')) {
    const c = line.match(/#(?!\s*@)(.*)$/); // comments (skip Colab #@title markers)
    if (c) parts.push(c[1]);
    for (const m of line.matchAll(/f?(["'])((?:(?!\1).)*)\1/g)) parts.push(m[2]); // string literals
    const t = line.match(/#@title (.*)$/);
    if (t) parts.push(t[1]);
  }
  return parts.join('\n');
}
for (const nb of walk(join(repo, 'notebooks'))) {
  const j = JSON.parse(readFileSync(nb, 'utf8'));
  j.cells.forEach((c, i) => scan(`${relative(repo, nb)} [cell ${i}]`, notebookProse(c)));
}

// ---------------- site ----------------
if (!process.argv.includes('--nb-only')) {
  const dist = join(repo, 'dist');
  if (!existsSync(dist)) {
    console.error('dist/ missing: run `npm run build` first (or pass --nb-only).');
    process.exit(2);
  }
  const { chromium } = await import('playwright');
  const { serve } = await import('../tests/serve.mjs');
  const server = await serve(dist, 4322);
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const pages = [];
  (function find(d) {
    for (const n of readdirSync(d)) {
      const f = join(d, n);
      if (statSync(f).isDirectory()) { if (n !== 'assets' && n !== 'models') find(f); }
      else if (n.endsWith('.html')) pages.push(relative(dist, f));
    }
  })(dist);
  for (const p of pages) {
    await page.goto(`http://localhost:4322/${p}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);
    // open every <details> and reveal every hidden block, so hidden text is checked too
    const text = await page.evaluate(() => {
      document.querySelectorAll('details').forEach((d) => (d.open = true));
      document.querySelectorAll('.predict .btn.primary').forEach((b) => b.click());
      const root = document.querySelector('.page')?.cloneNode(true);
      if (!root) return '';
      root.querySelectorAll('code, pre, .katex, script, style, [data-wording-skip]').forEach((n) => n.remove());
      return root.textContent ?? '';
    });
    scan(p, text);
  }
  await browser.close();
  server.close();
}

const byRule = {};
for (const hh of hits) (byRule[hh.rule] ??= []).push(hh);
for (const [rule, list] of Object.entries(byRule)) {
  console.log(`\n== ${rule} (${list.length})`);
  for (const hh of list) console.log(`  ${hh.where}: "${hh.match}"  …${hh.ctx}…`);
}
console.log(`\n${hits.length} wording hit(s).`);
process.exit(hits.length ? 1 : 0);

// Spark Log: entries persist across reloads, the ranking orders by score, Markdown export works,
// #slug focuses an entry, and the page still works when localStorage throws.
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from './serve.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const distArg = process.argv.find((a) => a.startsWith('--dist='))?.split('=')[1];
const dist = distArg ? resolve(distArg) : resolve(here, '..', 'dist');
const PORT = 4330;
const server = await serve(dist, PORT);
const browser = await chromium.launch();
let fails = 0;
const ok = (cond, msg) => { console.log(`${cond ? '✓' : '✗'} ${msg}`); if (!cond) fails++; };

const ctx = await browser.newContext({ acceptDownloads: true, viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(`http://localhost:${PORT}/spark-log.html`);
await page.fill('#sl-planning-search-surprised', 'A* checked far fewer squares than BFS.');
await page.click('#planning-search .sl-score-btn:nth-child(9)');
await page.click('#how-models-learn .sl-score-btn:nth-child(7)');
await page.click('#optimisation .sl-score-btn:nth-child(9)');
await page.waitForTimeout(400);
await page.reload();
ok((await page.inputValue('#sl-planning-search-surprised')).includes('A*'), 'text survives a reload');
ok((await page.getAttribute('#planning-search .sl-score-btn:nth-child(9)', 'aria-pressed')) === 'true', 'score survives a reload');
const names = await page.$$eval('.sl-rank-list .sl-rank-name', (els) => els.map((e) => e.textContent.replace(/^\d+\./, '')));
ok(JSON.stringify(names) === JSON.stringify(['Planning and search', 'Optimisation', 'How models learn']), `ranking order (ties keep map order): ${names.join(', ')}`);
ok((await page.textContent('.sl-count')).startsWith('3 of 10'), 'count shows 3 of 10');
const [dl] = await Promise.all([page.waitForEvent('download'), page.click('text=Export as Markdown')]);
const md = readFileSync(await dl.path(), 'utf8');
ok(md.includes('1. Planning and search: 9/10') && md.includes('A* checked far fewer squares'), 'export has the ranking and the notes');
// clicking the same score again clears it
await page.click('#how-models-learn .sl-score-btn:nth-child(7)');
ok((await page.$$('.sl-rank-list li')).length === 2, 'second click clears a score');
// arriving from a field card
await page.goto(`http://localhost:${PORT}/spark-log.html#reinforcement-learning`);
await page.waitForTimeout(300);
ok(await page.evaluate(() => document.activeElement?.id === 'sl-reinforcement-learning-surprised'), '#slug focuses that field\'s first box');
await page.screenshot({ path: resolve(here, '..', 'shots', 'spark-log-filled.png'), fullPage: true });
// typing then reloading at once keeps the text (saved on pagehide)
await page.fill('#sl-classic-ml-next', 'Why do random forests work so well?');
await page.reload();
ok((await page.inputValue('#sl-classic-ml-next')).startsWith('Why do random'), 'text typed just before a reload is kept');
// a note with line breaks stays inside its field in the export
await page.fill('#sl-classic-ml-surprised', 'line one\n- a list line\n# not a heading');
await page.waitForTimeout(400);
const [dl2] = await Promise.all([page.waitForEvent('download'), page.click('text=Export as Markdown')]);
const md2 = readFileSync(await dl2.path(), 'utf8');
ok(md2.includes('line one\n  - a list line\n  # not a heading'), 'multi-line notes are indented inside their bullet');
// two tabs: an edit in tab B shows up in tab A, and A's own later edit doesn't wipe it
const pageB = await ctx.newPage();
await pageB.goto(`http://localhost:${PORT}/spark-log.html`);
await pageB.fill('#sl-generative-models-surprised', 'written in tab B');
await pageB.waitForTimeout(400);
await page.fill('#sl-computer-vision-surprised', 'written in tab A');
await page.waitForTimeout(400);
await page.reload();
ok((await page.inputValue('#sl-generative-models-surprised')) === 'written in tab B', 'a note from another tab survives this tab saving');
ok((await page.inputValue('#sl-computer-vision-surprised')) === 'written in tab A', 'this tab\'s note is saved too');
await pageB.close();
ok(errors.length === 0, `no page errors ${errors.join(' | ')}`);

// storage blocked: the page must still render and say so
const ctx2 = await browser.newContext();
await ctx2.addInitScript(() => {
  Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); } });
});
const p2 = await ctx2.newPage();
const errs2 = [];
p2.on('pageerror', (e) => errs2.push(e.message));
await p2.goto(`http://localhost:${PORT}/spark-log.html`);
await p2.waitForTimeout(300);
ok((await p2.textContent('.sl-status')).includes('not saving'), 'blocked storage: warning shown');
ok((await p2.$$('.sl-card')).length === 10, 'blocked storage: all 10 cards render');
ok(errs2.length === 0, `blocked storage: no page errors ${errs2.join(' | ')}`);

await browser.close();
server.close();
console.log(fails ? `${fails} check(s) failed` : 'all spark log checks passed');
process.exit(fails ? 1 : 0);

// Showpiece B in a real browser: the model loads, writes, the bars and attention view respond,
// and both temperature challenges can be won (repeat at 0.1, ramble at 2).
import { chromium } from 'playwright';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';
import { serve } from './serve.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const distArg = process.argv.find((a) => a.startsWith('--dist='))?.split('=')[1];
const dist = distArg ? resolve(distArg) : resolve(here, '..', 'dist');
const PORT = 4340;
const out = resolve(here, '..', 'shots', 'tinylm');
mkdirSync(out, { recursive: true });
const server = await serve(dist, PORT);
const browser = await chromium.launch();
let fails = 0;
const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) fails++; };

for (const width of [1440, 390]) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(`http://localhost:${PORT}/demo/tiny-lm.html`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__tinylm, null, { timeout: 30000 });
  const t0 = Date.now();
  await page.evaluate(() => { window.__tinylm.setT(0.8); return window.__tinylm.write(300); });
  const ms = Date.now() - t0;
  const g = await page.evaluate(() => window.__tinylm.generated());
  ok(g.length === 300, `${width}px: wrote 300 characters in ${ms} ms`);
  ok((await page.$$('.tl-bar-row')).length >= 5, `${width}px: top-5 bars shown`);
  // click a written character: attention lights up earlier characters
  const pl = await page.evaluate(() => window.__tinylm.promptLen());
  await page.evaluate((i) => window.__tinylm.select(i), pl + 40);
  const lit = await page.$$eval('.tl-c', (els) => els.filter((e) => e.style.getPropertyValue('--att')).length);
  ok(lit > 10, `${width}px: attention view lights ${lit} characters`);
  ok((await page.textContent('.tl-bars-title')).includes('as it was chosen'), `${width}px: bars show the clicked step`);
  await page.screenshot({ path: `${out}/tinylm-${width}-written.png`, fullPage: width > 800 });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  ok(overflow <= 1, `${width}px: no horizontal overflow (${overflow})`);
  if (width === 1440) {
    const done = (k) => page.evaluate((k) => [...document.querySelectorAll('.challenge')][k].classList.contains('done'), k);
    // repeat, at the lowest allowed temperature, with a run known to repeat (seed 1)
    await page.evaluate(async () => { window.__tinylm.setT(0.2); window.__tinylm.seedNext(1); await window.__tinylm.write(300); });
    ok(await done(0), 'repeat challenge won at temperature 0.2');
    // below the allowed range it repeats but does not count
    await page.evaluate(async () => { window.__tinylm.setT(0.05); await window.__tinylm.write(300); });
    // ramble at 1.6 with a run known to ramble (seed 6)
    await page.evaluate(async () => { window.__tinylm.setT(1.6); window.__tinylm.seedNext(6); await window.__tinylm.write(300); });
    ok(await done(1), 'ramble challenge won at temperature 1.6');
    // attention: the sharpest head on this text gives over half its attention to one character
    const best = await page.evaluate(() => window.__tinylm.sharpest());
    await page.evaluate((b) => { window.__tinylm.select(b.j); window.__tinylm.setAttention(b.layer, b.head); }, best);
    ok(best.v > 0.5 && await done(2), `attention challenge won (layer ${best.layer + 1}, head ${best.head + 1}: ${(best.v * 100).toFixed(0)}%)`);
    // Show me buttons play and never win on their own (fresh page)
    const p2 = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await p2.goto(`http://localhost:${PORT}/demo/tiny-lm.html`, { waitUntil: 'networkidle' });
    await p2.waitForFunction(() => window.__tinylm);
    const showBtns = await p2.$$('.tl-challenges .challenge button:has-text("Show me")');
    await showBtns[0].click();
    await p2.waitForFunction(() => window.__tinylm.generated().length === 300, null, { timeout: 30000 });
    await p2.waitForTimeout(300);
    const fb = await p2.textContent('.tl-challenges .challenge:nth-child(1)');
    ok(fb.includes('appears') && !(await p2.evaluate(() => document.querySelector('.tl-challenges .challenge').classList.contains('done'))), 'repeat Show me reaches the goal and reports it without winning');
    await p2.close();
    await page.screenshot({ path: `${out}/tinylm-1440-ramble.png` });
  }
  ok(errors.length === 0, `${width}px: no page errors ${errors.slice(0, 3).join(' | ')}`);
  await page.close();
}
await browser.close();
server.close();
console.log(fails ? `${fails} check(s) failed` : 'all tiny LM checks passed');
process.exit(fails ? 1 : 0);

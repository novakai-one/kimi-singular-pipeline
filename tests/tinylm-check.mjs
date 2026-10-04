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
    // challenge 1: repeat at low temperature (the student's own run, not Show me)
    let won = false;
    for (let k = 0; k < 4 && !won; k++) {
      await page.evaluate(async () => { window.__tinylm.setT(0.1); window.__tinylm.restart(); await window.__tinylm.write(300); });
      won = await page.evaluate(() => [...document.querySelectorAll('.challenge')][0].classList.contains('done'));
    }
    ok(won, 'repeat challenge won at temperature 0.1');
    won = false;
    for (let k = 0; k < 4 && !won; k++) {
      await page.evaluate(async () => { window.__tinylm.setT(2); window.__tinylm.restart(); await window.__tinylm.write(300); });
      won = await page.evaluate(() => [...document.querySelectorAll('.challenge')][1].classList.contains('done'));
    }
    ok(won, 'ramble challenge won at temperature 2');
    await page.screenshot({ path: `${out}/tinylm-1440-ramble.png` });
  }
  ok(errors.length === 0, `${width}px: no page errors ${errors.slice(0, 3).join(' | ')}`);
  await page.close();
}
await browser.close();
server.close();
console.log(fails ? `${fails} check(s) failed` : 'all tiny LM checks passed');
process.exit(fails ? 1 : 0);

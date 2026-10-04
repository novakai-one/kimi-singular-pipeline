// Screenshot every page at 1440px and 390px. Usage:
//   node tests/screenshots.mjs [filter] [--widths=1440,390] [--full]
// Writes shots/<width>/<page>.png and reports console errors.
import { chromium } from 'playwright';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from './serve.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const dist = resolve(here, '..', 'dist');
const reg = JSON.parse(readFileSync(join(here, '..', 'site/src/data/registry.json'), 'utf8'));
const args = process.argv.slice(2);
const filter = args.find((a) => !a.startsWith('--')) ?? '';
const widths = (args.find((a) => a.startsWith('--widths='))?.split('=')[1] ?? '1440,390').split(',').map(Number);
const full = !args.includes('--viewport');
const theme = args.find((a) => a.startsWith('--theme='))?.split('=')[1];

const pages = [
  'index.html', 'demo/digits.html', 'demo/tiny-lm.html', 'path-map.html', 'spark-log.html', 'dsa/index.html',
  ...reg.fields.map((f) => `fields/${f.slug}.html`),
  ...reg.dsa.map((d) => `dsa/${d.slug}.html`),
].filter((p) => p.includes(filter));

const server = await serve(dist, 4321);
const browser = await chromium.launch();
let errors = 0;
for (const w of widths) {
  const ctx = await browser.newContext({
    viewport: { width: w, height: w > 800 ? 900 : 844 },
    deviceScaleFactor: 1,
    colorScheme: theme === 'light' ? 'light' : theme === 'dark' ? 'dark' : 'light',
  });
  const page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error') { errors++; console.log(`  [console.error] ${page.url()}: ${m.text()}`); } });
  page.on('pageerror', (e) => { errors++; console.log(`  [pageerror] ${page.url()}: ${e.message}`); });
  for (const p of pages) {
    await page.goto(`http://localhost:4321/${p}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(p.startsWith('demo/') ? 2500 : 600);
    const out = join(here, '..', 'shots', String(w) + (theme ? '-' + theme : ''), p.replace(/\//g, '__').replace('.html', '.png'));
    mkdirSync(dirname(out), { recursive: true });
    await page.screenshot({ path: out, fullPage: full });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    console.log(`${w}px ${p}${overflow > 1 ? `  ⚠ horizontal overflow ${overflow}px` : ''}`);
  }
  await ctx.close();
}
await browser.close();
server.close();
console.log(errors ? `${errors} console errors` : 'no console errors');

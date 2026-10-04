// Dump the rendered text of pages (all <details> opened, predictions revealed) for reviewers.
//   node tests/dump-text.mjs index.html demo/digits.html ...
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from './serve.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const server = await serve(resolve(here, '..', 'dist'), 4324);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const outDir = resolve(here, '..', 'shots', 'text');
mkdirSync(outDir, { recursive: true });
for (const p of process.argv.slice(2)) {
  await page.goto(`http://localhost:4324/${p}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  const text = await page.evaluate(() => {
    document.querySelectorAll('details').forEach((d) => (d.open = true));
    document.querySelectorAll('.predict .btn.primary').forEach((b) => b.click());
    document.querySelectorAll('.katex').forEach((k) => {
      const tex = k.querySelector('annotation')?.textContent ?? '';
      k.replaceWith(document.createTextNode(`$${tex}$`));
    });
    return document.querySelector('.page').innerText;
  });
  const f = resolve(outDir, p.replace(/\//g, '__').replace('.html', '.txt'));
  writeFileSync(f, text);
  console.log(f);
}
await browser.close();
server.close();

// Showpiece check (BUILD_BRIEF Section 10): draw digits with real mouse events,
// confirm sensible predictions and smooth updates. Needs `npm run build` first.
import { chromium } from 'playwright';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';
import { serve } from './serve.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const server = await serve(resolve(here, '..', 'dist'), 4323);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.goto('http://localhost:4323/demo/digits.html', { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__digits);
await page.waitForTimeout(2500); // let the opening animation finish

const pad = await page.locator('canvas.dg-pad').boundingBox();
const samples = await page.evaluate(() => window.__digits.samples);

// Draw a stroke list (0..1 box) onto the pad at a given size and offset, with real mouse moves.
async function draw(strokes, scale, ox, oy) {
  for (const s of strokes) {
    const pts = s.map(([x, y]) => [pad.x + (ox + x * scale) * pad.width, pad.y + (oy + y * scale) * pad.height]);
    await page.mouse.move(pts[0][0], pts[0][1]);
    await page.mouse.down();
    for (const [x, y] of pts.slice(1)) await page.mouse.move(x, y, { steps: 2 });
    await page.mouse.up();
  }
  await page.waitForTimeout(120);
}
const clear = () => page.getByRole('button', { name: 'Clear' }).click();

// Each digit drawn at a different size and place, to test the size/position normalising.
const placements = [[0.7, 0.15, 0.15], [0.45, 0.05, 0.1], [0.55, 0.4, 0.35], [0.8, 0.1, 0.1], [0.35, 0.5, 0.5]];
let right = 0;
let window_torn;
const rows = [];
for (let d = 0; d <= 9; d++) {
  await clear();
  const [sc, ox, oy] = placements[d % placements.length];
  await draw(samples[String(d)], sc, ox, oy);
  const r = await page.evaluate(() => ({ top: window.__digits.top(), p: Math.max(...window.__digits.probs()), dot: window.__digits.map.dotPosition() }));
  rows.push(`  drew ${d} (size ${sc})  →  read ${r.top} at ${(r.p * 100).toFixed(1)}%   map dot ${r.dot ? r.dot.map((v) => v.toFixed(2)).join(',') : 'none'}`);
  if (r.top === d) right++;
}
console.log(rows.join('\n'));
console.log(`correct: ${right}/10`);

// Smoothness: frames during a long stroke
await clear();
const fps = await page.evaluate(() => new Promise((res) => {
  let frames = 0; const t0 = performance.now();
  const tick = () => { frames++; if (performance.now() - t0 < 1500) requestAnimationFrame(tick); else res(frames / ((performance.now() - t0) / 1000)); };
  requestAnimationFrame(tick);
}).then((f) => f));
const drawWhile = draw([Array.from({ length: 120 }, (_, i) => [0.2 + 0.6 * (i / 119), 0.5 + 0.3 * Math.sin(i / 8)])], 1, 0, 0);
await drawWhile;
const stats = await page.evaluate(() => window.__digits.stats);
console.log(`idle frame rate ~${fps.toFixed(0)} fps; update (prepare + network + drawing): avg ${(stats.totalMs / stats.updates).toFixed(2)} ms, worst ${stats.maxMs.toFixed(1)} ms over ${stats.updates} updates`);

// "Why this answer?" produces an overlay
await clear();
await draw(window_torn = await page.evaluate(() => window.__digits.torn), 0.7, 0.15, 0.15);
await page.getByRole('button', { name: 'Why this answer?' }).click();
await page.waitForTimeout(1500);
const overlayInk = await page.evaluate(() => {
  const c = document.querySelector('canvas.dg-overlay');
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 20) n++;
  return n;
});
console.log(`why-overlay painted pixels: ${overlayInk}`);
mkdirSync(resolve(here, '..', 'shots'), { recursive: true });
await page.screenshot({ path: resolve(here, '..', 'shots', 'digits-why.png') });
await page.getByRole('button', { name: 'Why this answer?' }).click();

// Show me buttons (torn)
await page.getByRole('button', { name: 'Show me' }).nth(0).click();
await page.waitForTimeout(2500);
const torn = await page.evaluate(() => window.__digits.probs().map((v, i) => [v, i]).sort((a, b) => b[0] - a[0]).slice(0, 2));
console.log(`torn demo: ${torn.map(([v, i]) => `${i}:${(v * 100).toFixed(0)}%`).join(' ')}`);

await browser.close();
server.close();
const ok = right >= 9 && errors.length === 0 && overlayInk > 500 && stats.totalMs / stats.updates < 16;
console.log(errors.length ? `errors: ${errors.join(' | ')}` : 'no page errors');
console.log(ok ? 'SHOWPIECE CHECK PASSED' : 'SHOWPIECE CHECK FAILED');
process.exit(ok ? 0 : 1);

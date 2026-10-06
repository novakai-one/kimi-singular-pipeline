// Drive the game in a real browser: title → a chapter's beats → screenshots of each.
//   node tests/game-flow.mjs <chapterId> <outDir> [beat]
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const [, , chId = 'c00', out = 'shots/game', beatArg] = process.argv;
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
p.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
await p.goto(`http://localhost:5173/game/index.html`, { waitUntil: 'load' });
await p.waitForTimeout(2500);
await p.screenshot({ path: `${out}/00-title.png` });
const chs = await p.evaluate(() => [...window.__game.chapters(), ...window.__game.chapters(true)]);
const ch = chs.find((c) => c.id === chId);
const beats = beatArg !== undefined ? [Number(beatArg)] : ch.beats.map((_, i) => i);
for (const i of beats) {
  await p.evaluate(([id, i]) => window.__game.goto(id, i), [chId, i]);
  await p.waitForTimeout(2200);
  await p.screenshot({ path: `${out}/${chId}-${String(i).padStart(2, '0')}-${ch.beats[i].kind}.png` });
  if (ch.beats[i].kind === 'puzzle') {
    const ok = await p.evaluate(() => window.__game.solve());
    await p.waitForTimeout(1200);
    await p.screenshot({ path: `${out}/${chId}-${String(i).padStart(2, '0')}-solved.png` });
    console.log(`beat ${i} puzzle ${ch.beats[i].puzzle}: solve → ${ok}`);
  }
}
console.log(errors.length ? `ERRORS:\n${errors.join('\n')}` : 'no console errors');
await b.close();

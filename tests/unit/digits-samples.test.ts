// The hand-made sample strokes must be read correctly, through the same
// preprocessing the page uses. Also checks the "torn" and "1 to 7" demos.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseModel, forward, argmax } from '../../site/src/pages/digits/model.ts';
import { prepare } from '../../site/src/pages/digits/preprocess.ts';
import { SAMPLES, TORN, ONE_TO_SEVEN, toCanvas } from '../../site/src/pages/digits/samples.ts';

const root = new URL('../../', import.meta.url);
const model = parseModel(JSON.parse(readFileSync(new URL('site/public/models/digits/model.json', root), 'utf8')));
const predict = (strokes: any) => forward(model, prepare(toCanvas(strokes, 300))!.input).probs;
const fmt = (p: Float32Array) => Array.from(p).map((v, i) => `${i}:${(v * 100).toFixed(0)}`).filter((s) => !s.endsWith(':0')).join(' ');

test('each sample digit is read correctly', () => {
  for (const [d, strokes] of Object.entries(SAMPLES)) {
    const p = predict(strokes);
    const ink = prepare(toCanvas(strokes, 300))!.input.reduce((a, b) => a + b, 0);
    console.log(`  sample ${d}: ${fmt(p)}   ink ${ink.toFixed(0)}`);
    assert.equal(String(argmax(p)), d, `sample ${d} read as ${argmax(p)}`);
  }
});

test('torn sample is close between two digits', () => {
  const p = Array.from(predict(TORN)).map((v, i) => [v, i]).sort((a, b) => b[0] - a[0]);
  console.log(`  torn: ${p.slice(0, 3).map(([v, i]) => `${i}:${(v * 100).toFixed(1)}%`).join(' ')}`);
  assert.ok(p[0][0] - p[1][0] <= 0.10, 'top two within 10 points');
});

test('one becomes seven', () => {
  assert.equal(argmax(predict(ONE_TO_SEVEN.one)), 1);
  assert.equal(argmax(predict([...ONE_TO_SEVEN.one, ONE_TO_SEVEN.extra])), 7);
});

test('robust to messy drawing: rotated, slanted, wobbly versions', () => {
  let seed = 1;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  let right = 0, total = 0;
  const misses: Record<string, number> = {};
  for (const [d, strokes] of Object.entries(SAMPLES)) {
    for (let k = 0; k < 40; k++) {
      const ang = (rnd() - 0.5) * 0.5, shear = (rnd() - 0.5) * 0.5, sx = 0.8 + rnd() * 0.4;
      const wob = 0.012;
      const t = strokes.map((s) => s.map(([x, y]) => {
        const cx = x - 0.5, cy = y - 0.5;
        const xr = (cx * Math.cos(ang) - cy * Math.sin(ang) + shear * cy) * sx;
        const yr = cx * Math.sin(ang) + cy * Math.cos(ang);
        return [0.5 + xr + (rnd() - 0.5) * wob * 2, 0.5 + yr + (rnd() - 0.5) * wob * 2];
      }));
      total++;
      if (String(argmax(predict(t))) === d) right++; else misses[d] = (misses[d] ?? 0) + 1;
    }
  }
  console.log(`  messy variants: ${right}/${total} right; misses by digit: ${JSON.stringify(misses)}`);
  assert.ok(right / total > 0.9);
});

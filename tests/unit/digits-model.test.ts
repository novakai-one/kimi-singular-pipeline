// Checks the browser forward pass against PyTorch's outputs on the same inputs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseModel, forward, argmax } from '../../site/src/pages/digits/model.ts';

const root = new URL('../../', import.meta.url);
const model = parseModel(JSON.parse(readFileSync(new URL('site/public/models/digits/model.json', root), 'utf8')));
const vecs = JSON.parse(readFileSync(new URL('tests/unit/digits_vectors.json', root), 'utf8'));

test('TS forward pass matches PyTorch', () => {
  for (const v of vecs) {
    const a = forward(model, new Float32Array(v.input));
    for (let i = 0; i < 10; i++) assert.ok(Math.abs(a.logits[i] - v.logits[i]) < 1e-3, `logit ${i}: ${a.logits[i]} vs ${v.logits[i]}`);
    for (let i = 0; i < 64; i++) assert.ok(Math.abs(a.hidden[i] - v.hidden[i]) < 1e-3);
    const c1 = a.c1.reduce((s, x) => s + x, 0);
    assert.ok(Math.abs(c1 - v.c1_sum) / Math.max(1, Math.abs(v.c1_sum)) < 1e-4, `c1 sum ${c1} vs ${v.c1_sum}`);
    assert.equal(argmax(a.probs), v.label);
  }
});

test('forward pass is fast enough for 60fps', () => {
  const x = new Float32Array(vecs[0].input);
  const n = 200;
  const t0 = performance.now();
  for (let i = 0; i < n; i++) forward(model, x);
  const ms = (performance.now() - t0) / n;
  console.log(`  forward pass: ${ms.toFixed(2)} ms`);
  assert.ok(ms < 8, `forward pass took ${ms} ms`);
});

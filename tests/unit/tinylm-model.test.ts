// Showpiece B: the browser forward pass matches PyTorch (reference vectors written by training/train_tinylm.py),
// and the sliding window keeps working past 128 characters.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Session, buildModel, softmax, topK } from '../../site/src/pages/tinylm/model.ts';

const model = buildModel(JSON.parse(readFileSync(new URL('../../site/public/models/tinylm/model.json', import.meta.url), 'utf8')));
const vec = JSON.parse(readFileSync(new URL('./tinylm_vectors.json', import.meta.url), 'utf8'));

test('tinylm: about a million weights', () => {
  assert.ok(model.params > 900_000 && model.params < 1_100_000, String(model.params));
});

test('tinylm: last-step scores and attention match PyTorch', () => {
  const s = new Session(model);
  let out;
  for (const ch of vec.prompt) out = s.push(model.index.get(ch)!);
  const got = [...out!.logits];
  const maxDiff = Math.max(...got.map((v, i) => Math.abs(v - vec.last_logits[i])));
  assert.ok(maxDiff < 2e-3, `max logit difference ${maxDiff}`);
  const best = topK(softmax(out!.logits), 1)[0].i;
  assert.equal(model.chars[best], vec.argmax_next);
  const att = [...out!.att[0][0]];
  const attDiff = Math.max(...att.map((v, i) => Math.abs(v - vec.att_last_layer0_head0[i])));
  assert.ok(attDiff < 1e-3, `max attention difference ${attDiff}`);
  const sum = att.reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(sum - 1) < 1e-5);
});

test('tinylm: the window restarts past 128 characters and scores stay finite', () => {
  const s = new Session(model);
  const text = 'ROMEO:\nBut soft, what light through yonder window breaks? '.repeat(5);
  let out;
  for (const ch of text) out = s.push(model.index.get(ch)!);
  assert.ok(s.window.length <= model.cfg.block);
  assert.ok(s.windowStart > 0);
  assert.ok([...out!.logits].every(Number.isFinite));
});

test('tinylm: temperature sharpens and flattens', () => {
  const l = new Float32Array([2, 1, 0]);
  assert.ok(softmax(l, 0.2)[0] > softmax(l, 1)[0]);
  assert.ok(softmax(l, 3)[0] < softmax(l, 1)[0]);
});

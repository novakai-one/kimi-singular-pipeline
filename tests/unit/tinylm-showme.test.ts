// Showpiece B: each Show me (fixed temperature and seed from "ROMEO:") reaches its goal, so it never fails on screen.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Session, buildModel, mulberry32, sampleIndex, softmax } from '../../site/src/pages/tinylm/model.ts';
import { CHALLENGE, DEMO, isRambling, isRepetitive } from '../../site/src/pages/tinylm/metrics.ts';

const model = buildModel(JSON.parse(readFileSync(new URL('../../site/public/models/tinylm/model.json', import.meta.url), 'utf8')));
const known = new Set<string>(JSON.parse(readFileSync(new URL('../../site/public/models/tinylm/words.json', import.meta.url), 'utf8')));

function write(prompt: string, T: number, seed: number, n = CHALLENGE.minChars) {
  const s = new Session(model);
  const r = mulberry32(seed);
  let out = s.push(model.index.get(prompt[0])!);
  for (const c of prompt.slice(1)) out = s.push(model.index.get(c)!);
  let g = '';
  for (let k = 0; k < n; k++) {
    const id = sampleIndex(softmax(out.logits, T), r());
    g += model.chars[id];
    out = s.push(id);
  }
  return g;
}

test('Show me "repeat" wins at its temperature (inside the goal range)', () => {
  assert.ok(DEMO.repeat.T >= CHALLENGE.repeat.minT);
  assert.equal(isRepetitive(write('ROMEO:\n', DEMO.repeat.T, DEMO.repeat.seed)).win, true);
});

test('Show me "ramble" wins at its temperature (inside the goal range)', () => {
  assert.ok(DEMO.ramble.T <= CHALLENGE.ramble.maxT);
  assert.equal(isRambling(write('ROMEO:\n', DEMO.ramble.T, DEMO.ramble.seed), known).win, true);
});

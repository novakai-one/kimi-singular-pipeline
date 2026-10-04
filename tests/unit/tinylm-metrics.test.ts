// Showpiece B challenge measures: repeated pieces and made-up words.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isRambling, isRepetitive, longestRepeat, madeUp, words } from '../../site/src/pages/tinylm/metrics.ts';

test('longestRepeat finds the longest piece seen 3 times', () => {
  const t = 'of the world of the world of the world, and so on';
  const r = longestRepeat(t, 3, 8);
  assert.ok(r.piece.length >= 12 && t.split(r.piece).length - 1 >= 3, JSON.stringify(r));
  assert.equal(longestRepeat('abcdefghijklmnop', 3, 8).piece, '');
});

test('words and made-up words', () => {
  assert.deepEqual(words("What, 'tis the KING'S ear?"), ['what', 'tis', 'the', "king's", 'ear']);
  const m = madeUp('the king gorbled the queen', new Set(['the', 'king', 'queen']));
  assert.equal(m.unknown, 1);
  assert.deepEqual(m.examples, ['gorbled']);
});

test('challenges need 300 written characters', () => {
  const loop = 'of the world '.repeat(30);
  assert.equal(isRepetitive(loop.slice(0, 200)).win, false);
  assert.equal(isRepetitive(loop).win, true);
  const known = new Set(['the']);
  const ram = 'the zork blib frum '.repeat(20);
  assert.equal(isRambling(ram, known).win, true);
  assert.equal(isRambling('the the the '.repeat(30), known).win, false);
});

// Chapter 18, the trajectory problem: every string in traj-text.ts follows the wording rules (BUILD_BRIEF.md §2a),
// and nothing the player reads before the name card says "eigenvector", "eigenvalue" or λ.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as X from '../../site/src/game/content/chapters/c18-eigen/traj-text.ts';
import { checkMult, PULSE_A } from '../../site/src/game/content/chapters/c18-eigen/traj-logic.ts';

const RULES: [string, RegExp][] = [
  ['banned word', /\b(simply|just|obviously|clearly|trivially|trivial)\b/i],
  ['banned phrase', /\b(it'?s easy to see|easy to see|recall that|note that|it turns out|as you know)\b/i],
  ['hype', /\b(amazing|incredible|magic|magical|awesome|mind-?blowing)\b/i],
  ['personification', /\b(matrix|vectors?|pulse|grid|arrows?|directions?)\s+(wants?|likes?|loves?|hates?|feels?|thinks?|knows?|cares?|prefers?|decides?)\b/i],
  ['exclamation', /[A-Za-z0-9)\]'"]!(\s|$)/],
  ['unrendered value', /\b(NaN|undefined|null|Infinity)\b|\[object/],
];
const EARLY = /eigen|λ|\\lambda/i;

/** Sample arguments: a vector, a number, a flight path. */
const KINDS = [() => [1, 1], () => 3, () => [[1, 1], [3, 3], [9, 9]]];
/** Call a text function with the first argument mix that gives a clean string. */
function render(fn: (...a: unknown[]) => unknown): string[] {
  const n = fn.length;
  for (let mask = 0; mask < KINDS.length ** n; mask++) {
    const args = Array.from({ length: n }, (_, i) => KINDS[Math.floor(mask / KINDS.length ** i) % KINDS.length]());
    try {
      const out = fn(...args);
      const list = (Array.isArray(out) ? out : [out]).filter((s): s is string => typeof s === 'string');
      if (list.length && !list.some((s) => /NaN|undefined/.test(s))) return list;
    } catch { /* wrong mix, try the next */ }
  }
  throw new Error(`could not render ${fn.toString().slice(0, 80)}`);
}

/** Every string under a value, with its path. */
function walk(x: unknown, at: string, out: { at: string; s: string }[]): void {
  if (typeof x === 'string') out.push({ at, s: x });
  else if (typeof x === 'function') render(x as (...a: unknown[]) => unknown).forEach((s, i) => out.push({ at: `${at}()[${i}]`, s }));
  else if (Array.isArray(x)) x.forEach((y, i) => walk(y, `${at}[${i}]`, out));
  else if (x && typeof x === 'object') for (const [k, y] of Object.entries(x)) walk(y, `${at}.${k}`, out);
}

function strings(): { at: string; s: string }[] {
  const out: { at: string; s: string }[] = [];
  for (const k of ['P1', 'M1T', 'SOLOT', 'DRILL', 'LOG_NAMES', 'OUTCOME_NAMES', 'ZERO', 'UNREAD', 'UNREAD_M'] as const) walk(X[k], k, out);
  // the part-by-part multiplier messages, each kind of wrong answer
  for (const [v, m] of [[[1, 1], 2], [[1, 1], -3], [[1, -1], 2], [[2, 1], 3]] as [number[], number][]) {
    const vd = checkMult(PULSE_A, v, m);
    if (!vd.ok) out.push({ at: `wrongMult(${v}, ${m})`, s: X.wrongMult(v, vd) });
  }
  return out;
}

test('every trajectory string follows the wording rules', () => {
  const all = strings();
  assert.ok(all.length > 120, `only ${all.length} strings found`);
  const hits: string[] = [];
  for (const { at, s } of all) {
    const prose = s.replace(/\$[^$]*\$/g, ' ');
    for (const [rule, re] of RULES) if (re.test(prose)) hits.push(`${at} · ${rule} · ${s}`);
  }
  assert.deepEqual(hits, []);
});

test('nothing before the name card says eigenvector, eigenvalue or λ', () => {
  const early = strings().filter(({ at }) => /^(P1|ZERO|UNREAD|wrongMult)/.test(at));
  assert.ok(early.length > 20);
  assert.deepEqual(early.filter(({ s }) => EARLY.test(s)).map(({ at, s }) => `${at} · ${s}`), []);
});

test('the wrong-multiplier messages name the part that is off, or the sign', () => {
  assert.match(X.wrongMult([1, 1], checkMult(PULSE_A, [1, 1], -3)), /wrong sign/);
  assert.match(X.wrongMult([1, 1], checkMult(PULSE_A, [1, 1], 2)), /Neither part/);
  assert.match(X.wrongMult([1, 0], checkMult([[2, 0], [1, 2]], [1, 0], 2)), /second part is off/);
});

test('the spec\'s own sentences are used where it gives them', () => {
  assert.equal(X.P1.goal, 'Each pulse transforms your trajectory. Find a launch direction that stays on its original line.');
  assert.equal(X.P1.firstMiss([1, 0], [2, 1]), 'Your launch direction changed. The pulse moved $(1, 0)$ to $(2, 1)$. Find a direction that the pulse doesn\'t turn.');
  assert.equal(X.P1.another, 'One safe direction found. Is there another?');
  assert.match(X.P1.dupe([2, 2], [1, 1], 2), /another vector, not another direction/);
});

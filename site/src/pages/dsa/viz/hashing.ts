// DSA 2 — Arrays, hash maps and sets. Words go into a list (top) and into 8 buckets (bottom).
// Each word's bucket is (sum of its character codes) mod 8. Search walks the list, then checks one bucket.
// Challenge: make one bucket hold 4 or more words.
import { h, s } from '../../../lib/dom';
import { readout, sleep, type Viz } from '../../fieldviz/kit';
import { makePlayer, type Algorithm } from '../player';
import {
  DEFAULT_INPUT, GOAL, INSERT_CODE, MAX_LEN, MAX_WORDS, PRESETS, SEARCH_CODE, SHOW_ME_INPUT,
  bucketOf, buildBuckets, codeSum, fullest, insertFrames, listOf, parseInput, plural, randomInput, searchFrames,
  type CellState, type HashFrame,
} from './hashing-core';
import './hashing.css';

const PAD = 16;
const LIST_Y = 26;
const LIST_H = 38;
const LIST_PITCH = LIST_H + 22;
const GAP = 4;
const B_GAP = 6;
const ROW = 30;
/** Below this stage width (px) the picture switches to a narrower layout: 4 buckets per row, list in two rows. */
const NARROW_PX = 520;

const cellClass = (st: CellState) =>
  st === 'moved' ? 'dv-cell hashing-cell moved' : st ? `dv-cell ${st}` : 'dv-cell';

/** A word in a box; long words are squeezed to fit instead of overflowing. */
function wordText(x: number, y: number, word: string, width: number, cls: string, perChar: number) {
  const attrs: Record<string, unknown> = { x, y, 'text-anchor': 'middle', class: cls };
  if (word.length * perChar > width) { attrs.textLength = width; attrs.lengthAdjust = 'spacingAndGlyphs'; }
  return s('text', attrs, word);
}

/** Where everything goes. Wide: 640 units, one list row, 8 buckets in a row.
 *  Narrow (phones): 420 units, so the same text is drawn about 1.5 times larger on screen. */
function layout(f: HashFrame, narrow: boolean) {
  const W = narrow ? 420 : 640;
  const n = f.words.length;
  const perRow = narrow && n > 5 ? Math.ceil(n / 2) : n;
  const listRows = Math.ceil(n / perRow);
  const cw = Math.min(76, (W - 2 * PAD - (perRow - 1) * GAP) / perRow);
  const listX = (i: number) => {
    const row = Math.floor(i / perRow);
    const inRow = Math.min(perRow, n - row * perRow);
    return (W - (inRow * cw + (inRow - 1) * GAP)) / 2 + (i % perRow) * (cw + GAP);
  };
  const listY = (i: number) => LIST_Y + Math.floor(i / perRow) * LIST_PITCH;
  const calcY = LIST_Y + listRows * LIST_PITCH + 8;
  const bPerRow = narrow ? 4 : 8;
  const BW = (W - 2 * PAD - (bPerRow - 1) * B_GAP) / bPerRow;
  const bTop = calcY + (narrow ? 92 : 112);
  const bh = 34 + f.slots * ROW;
  const bucketX = (b: number) => PAD + (b % bPerRow) * (BW + B_GAP);
  const bucketY = (b: number) => bTop + Math.floor(b / bPerRow) * (bh + 10);
  const bottom = bucketY(7) + bh;
  return { W, narrow, cw, listX, listY, calcY, BW, bh, bucketX, bucketY, bottom, H: bottom + 30 };
}

function render(stage: HTMLElement, f: HashFrame) {
  const L = layout(f, stage.clientWidth > 0 && stage.clientWidth < NARROW_PX);
  const { W } = L;
  const svg = s('svg', { viewBox: `0 0 ${W} ${L.H}`, role: 'img', 'aria-label': `A list of ${f.words.length} words, and 8 buckets` });
  const search = f.mode === 'search';

  // ---------------- the list
  svg.append(s('text', { x: PAD, y: 16, class: 'hashing-label' }, 'The list, in typed order'));
  if (search) svg.append(s('text', { x: W - PAD, y: 16, 'text-anchor': 'end', class: 'hashing-count' }, `List: ${plural(f.listChecks, 'check')}`));
  f.words.forEach((w, i) => {
    const x = L.listX(i), y = L.listY(i);
    const st = f.listState[i];
    svg.append(
      s('rect', { x, y, width: L.cw, height: LIST_H, rx: 6, class: cellClass(st) }),
      wordText(x + L.cw / 2, y + 25, w, L.cw - 8, 'dv-text' + (st === 'dim' ? ' dv-faded' : ''), 8.6),
      s('text', { x: x + L.cw / 2, y: y + LIST_H + 15, 'text-anchor': 'middle', class: 'hashing-pos' }, String(i)),
    );
  });

  // ---------------- the bucket rule
  const c = f.calc;
  const cy = L.calcY;
  const focusKind = f.focus?.kind ?? 'cmp';
  if (c) {
    const k = c.codes.length;
    const eqW = 74;
    let boxW = 36, opW = 20;
    if (k * boxW + (k - 1) * opW + eqW > W - 2 * PAD) { boxW = 28; opW = 12; }
    const rowW = k * boxW + (k - 1) * opW + eqW;
    let x = (W - rowW) / 2;
    [...c.word].forEach((ch, j) => {
      svg.append(
        s('rect', { x, y: cy, width: boxW, height: 46, rx: 6, class: 'dv-cell' }),
        s('text', { x: x + boxW / 2, y: cy + 19, 'text-anchor': 'middle', class: 'hashing-letter' }, ch),
        s('text', { x: x + boxW / 2, y: cy + 38, 'text-anchor': 'middle', class: 'hashing-code' }, String(c.codes[j])),
      );
      x += boxW;
      if (j < k - 1) {
        svg.append(s('text', { x: x + opW / 2, y: cy + 38, 'text-anchor': 'middle', class: 'hashing-op' }, '+'));
        x += opW;
      }
    });
    svg.append(s('text', { x: x + 8, y: cy + 39, class: 'hashing-sum' }, `= ${c.sum}`));
    if (c.showMod) {
      const my = cy + 70;
      const mid = W / 2 + 50;
      svg.append(
        s('text', { x: mid, y: my, 'text-anchor': 'end', class: 'hashing-mod' }, `${c.sum} ÷ 8 = ${Math.floor(c.sum / 8)} remainder ${c.sum % 8}`),
        s('text', { x: mid + 12, y: my, class: 'hashing-result' }, `→ bucket ${c.bucket}`),
      );
      // an arrow from the result down to the bucket (wide layout only: on phones some buckets sit under others)
      if (!L.narrow) {
        const sx = mid + 52, sy = my + 7;
        const ex = L.bucketX(c.bucket) + L.BW / 2, ey = L.bucketY(c.bucket) - 3;
        const hiCls = focusKind === 'hi' ? ' hi' : '';
        svg.append(s('path', { d: `M${sx} ${sy} C ${sx} ${sy + 20}, ${ex} ${ey - 22}, ${ex} ${ey - 6}`, class: 'hashing-arrow' + hiCls }));
        svg.append(s('path', { d: `M${ex - 5} ${ey - 8} L${ex + 5} ${ey - 8} L${ex} ${ey} Z`, class: 'hashing-head' + hiCls }));
      }
    }
  } else if (search && f.target) {
    const t = f.target;
    const tw = Math.max(70, t.length * 10 + 20);
    const lx = W / 2 - 60;
    svg.append(
      s('text', { x: lx, y: cy + 28, 'text-anchor': 'end', class: 'hashing-label' }, 'Looking for'),
      s('rect', { x: lx + 10, y: cy + 6, width: tw, height: 34, rx: 6, class: 'dv-cell hi' }),
      s('text', { x: lx + 10 + tw / 2, y: cy + 29, 'text-anchor': 'middle', class: 'dv-text' }, t),
    );
  } else {
    svg.append(s('text', { x: W / 2, y: cy + 32, 'text-anchor': 'middle', class: 'hashing-hint' },
      'bucket = (sum of the character codes) mod 8'));
  }

  // ---------------- the buckets (labels below them, so the arrow from the bucket rule never crosses text)
  svg.append(s('text', { x: PAD, y: L.bottom + 22, class: 'hashing-label' }, '8 buckets, numbered by remainder'));
  if (search && f.focus?.kind === 'hi') {
    svg.append(s('text', { x: W - PAD, y: L.bottom + 22, 'text-anchor': 'end', class: 'hashing-count' }, `Bucket: ${plural(f.bucketChecks, 'check')}`));
  }
  f.buckets.forEach((items, b) => {
    const x = L.bucketX(b), top = L.bucketY(b);
    const on = f.focus?.bucket === b;
    const g = s('g', { class: f.dimOthers && !on ? 'hashing-faded' : '' });
    g.append(
      s('rect', { x, y: top, width: L.BW, height: L.bh, rx: 8, class: 'hashing-bucket' + (on ? ` ${f.focus!.kind}` : '') }),
      s('text', { x: x + L.BW / 2, y: top + 22, 'text-anchor': 'middle', class: 'hashing-num' + (on ? ' on' : '') }, String(b)),
    );
    items.forEach((w, k) => {
      const st = f.bucketState[b]?.[k] ?? '';
      const y = top + 34 + k * ROW;
      const cell = s('g', { class: f.dropped && f.dropped.bucket === b && f.dropped.index === k ? 'hashing-drop' : '' },
        s('rect', { x: x + 4, y, width: L.BW - 8, height: ROW - 4, rx: 5, class: cellClass(st) }),
        wordText(x + L.BW / 2, y + 18, w, L.BW - 14, 'hashing-word' + (st === 'dim' ? ' dv-faded' : ''), 8));
      g.append(cell);
    });
    svg.append(g);
  });
  stage.append(svg);
}

const viz: Viz = (el, api) => {
  let showing = false;
  // the player draws on each step; this redraws the current step if the width crosses the narrow/wide line
  let last: { stage: HTMLElement; frame: HashFrame; narrow: boolean } | null = null;
  const isNarrow = (stage: HTMLElement) => stage.clientWidth > 0 && stage.clientWidth < NARROW_PX;
  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      if (!last || !last.stage.isConnected || isNarrow(last.stage) === last.narrow) return;
      last.stage.replaceChildren();
      render(last.stage, last.frame);
      last.narrow = isNarrow(last.stage);
    }, 150);
  });
  const fullR = readout('Fullest bucket');
  const listR = readout('List checks');
  const bucketR = readout('Bucket checks');
  const legend = h('div', { class: 'legend' });
  const LEGENDS: Record<string, [string, string][]> = {
    Insert: [['var(--yellow)', 'the word being placed'], ['var(--search)', 'its bucket'], ['var(--red)', 'dropped in this step'], ['var(--green)', 'placed']],
    Search: [['var(--search)', 'being checked'], ['var(--green)', 'found'], ['var(--yellow)', 'the bucket the rule picks'], ['var(--faint)', 'checked or skipped']],
  };
  const setLegend = (name: string) => legend.replaceChildren(...LEGENDS[name].map(([col, t]) => h('span', null, h('span', { class: 'sw', style: `background:${col}` }), t)));

  const algorithms: Algorithm<HashFrame>[] = [
    { name: 'Insert', code: INSERT_CODE, run: (t) => { const p = parseInput(t); return insertFrames(p.words, p.target); } },
    { name: 'Search', code: SEARCH_CODE, run: (t) => { const p = parseInput(t); return searchFrames(p.words, p.target); } },
  ];

  const player = makePlayer<HashFrame>({
    algorithms,
    inputs: {
      label: `Words (lowercase a to z, up to ${MAX_LEN} letters each, at most ${MAX_WORDS} words)`,
      value: DEFAULT_INPUT,
      help: 'For Search, add the word to find after a semicolon, like: cat dog sun; sun. Character codes: a is 97, b is 98, and so on up to z, 122.',
      presets: PRESETS,
      random: () => randomInput(),
    },
    render: (stage, f) => { render(stage, f); last = { stage, frame: f, narrow: isNarrow(stage) }; },
    onFrame: (f) => {
      const top = fullest(f.buckets);
      fullR.set(top.count ? `bucket ${top.bucket}: ${plural(top.count, 'word')}` : 'all empty');
      listR.set(f.mode === 'search' ? String(f.listChecks) : '–');
      bucketR.set(f.mode === 'search' && f.focus?.kind === 'hi' ? String(f.bucketChecks) : '–');
    },
    onRun: (frames, input, algo) => {
      setLegend(algo.name);
      const { words } = parseInput(input);
      const top = fullest(buildBuckets(words));
      const end = frames[frames.length - 1];
      const names = top.count ? ` (${listOf(top.words)})` : '';
      const searched = algo.name === 'Search'
        ? ` Search for ${end.target}: ${plural(end.listChecks, 'list check')}, ${plural(end.bucketChecks, 'bucket check')}.`
        : '';
      if (showing) {
        const sw = parseInput(SHOW_ME_INPUT).words;
        api.feedback(`Show me: ${listOf(sw)} use the same four letters. Same letters give the same sum, ${codeSum(sw[0])}, `
          + `so all four land in bucket ${bucketOf(sw[0])}. Now find 4 words of your own.`);
      } else if (top.count >= GOAL) {
        api.win(`Pile-up: bucket ${top.bucket} holds ${top.count} words${names}. A search there may check all ${top.count}.`
          + (searched || ' Now run **Search** for one of them and count the checks.'));
      } else {
        api.feedback(`The fullest bucket is bucket ${top.bucket}, with ${plural(top.count, 'word')}${names}. The goal is ${GOAL} in one bucket.${searched}`);
      }
      showing = false;
    },
    stageHeight: 200,
  });

  el.append(
    player.el,
    legend,
    h('div', { class: 'viz-readouts' }, fullR.el, listR.el, bucketR.el),
  );

  return {
    async showMe() {
      showing = true;
      player.setInput(SHOW_ME_INPUT, 0);
      await sleep(400);
      player.play();
    },
  };
};

export default viz;

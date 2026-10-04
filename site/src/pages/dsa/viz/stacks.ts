// DSA 3 — Stacks and queues. Mode 1 checks brackets with a pile (a stack); mode 2 puts the same letters
// through a pile and a line (a queue) and shows the two orders they come out in.
// Challenge: a matched bracket string whose pile gets 4 deep.
import { h, s } from '../../../lib/dom';
import { sleep, type Viz } from '../../fieldviz/kit';
import { makePlayer, type Algorithm } from '../player';
import {
  BRACKET_CODE, BRACKET_PRESETS, DEFAULT_BRACKETS, DEFAULT_ITEMS, GOAL_DEPTH, MAX_BRACKETS, MAX_ITEMS, MIN_ITEMS, ORDER_CODE,
  SHOW_ME_BRACKETS, bracketFrames, checkBrackets, describeError, orderFrames, parseBrackets, parseItems, randomBrackets,
  randomItems, type BracketFrame, type Cell, type OrderFrame, type SQFrame,
} from './stacks-core';
import './stacks.css';

/** Wide pictures use a 640-wide viewBox. On a phone the stage is narrow, so the parts are stacked
 *  in a 400-wide viewBox instead, which keeps the text about 1.6 times larger on screen. */
const WIDE = 640, NARROW = 400;
const isNarrow = (stage: HTMLElement) => stage.clientWidth > 0 && stage.clientWidth < 560;

const CELL: Record<Cell, string> = {
  '': 'dv-cell', look: 'dv-cell cmp', open: 'dv-cell hi', out: 'dv-cell hi', done: 'dv-cell done', red: 'dv-cell stacks-red', dim: 'dv-cell dim',
};
const CLOSE_OF: Record<string, string> = { '(': ')', '[': ']', '{': '}' };

/** A box with one character in it. */
function cell(x: number, y: number, w: number, hgt: number, ch: string, state: Cell, size = '') {
  return [
    s('rect', { x, y, width: w, height: hgt, rx: 6, class: CELL[state] }),
    s('text', { x: x + w / 2, y: y + hgt / 2 + 7, 'text-anchor': 'middle', class: 'stacks-ch' + (size ? ' ' + size : '') }, ch),
  ];
}

/** A pile drawn bottom-up inside a U-shaped wall. Returns the elements and the bottom y. */
function drawPile(cx: number, top: number, slots: number, items: string[], states: Cell[], bad = false, pw = 84) {
  const cellH = slots <= 8 ? 30 : 240 / slots;
  const bottom = top + slots * cellH;
  const out: SVGElement[] = [
    s('path', { d: `M${cx - pw / 2 - 6},${top - 8} V${bottom + 4} H${cx + pw / 2 + 6} V${top - 8}`, class: 'stacks-wall' + (bad ? ' bad' : '') }),
  ];
  items.forEach((ch, k) => {
    const y = bottom - (k + 1) * cellH + 2;
    out.push(...cell(cx - pw / 2, y, pw, cellH - 4, ch, states[k], cellH < 24 ? 'xs' : 'sm'));
  });
  if (items.length) {
    const y = bottom - items.length * cellH + cellH / 2 + 5;
    out.push(s('text', { x: cx - pw / 2 - 12, y, 'text-anchor': 'end', class: 'stacks-label' }, 'top →'));
  }
  return { els: out, bottom };
}

/** One line of text, with every bracket drawn bold in the code font so it stands out. */
function rich(x: number, y: number, cls: string, text: string) {
  const t = s('text', { x, y, class: cls });
  for (const part of text.split(/([()[\]{}])/)) {
    if (!part) continue;
    t.append(/^[()[\]{}]$/.test(part) ? s('tspan', { class: 'stacks-b' }, part) : s('tspan', null, part));
  }
  return t;
}

/** Split a sentence into lines of at most `max` characters, at spaces, with the lines about equally long. */
function wrap(text: string, max: number): string[] {
  if (text.length > max) max = Math.min(max, Math.ceil(text.length / Math.ceil(text.length / max)) + 4);
  const lines: string[] = [];
  let line = '';
  for (const w of text.split(' ')) {
    if (line && (line + ' ' + w).length > max) { lines.push(line); line = w; } else line = line ? line + ' ' + w : w;
  }
  if (line) lines.push(line);
  return lines;
}

// ------------------------------------------------------------------ bracket checker picture
function renderBrackets(stage: HTMLElement, f: BracketFrame) {
  const narrow = isNarrow(stage);
  const W = narrow ? NARROW : WIDE;
  const n = f.chars.length;
  const ROW_Y = 74, CELL_H = 48, LOW = ROW_Y + CELL_H + 66;
  const slot = Math.min(50, (W - 30) / n);
  const cw = slot - (narrow ? 4 : 6);
  const x0 = (W - slot * n) / 2;
  const cx = (i: number) => x0 + i * slot + slot / 2;
  const PX = narrow ? W - 66 : 550, PILE_TOP = LOW + 28;
  const slots = f.slots;
  const pileBottom = PILE_TOP + (slots <= 8 ? 30 : 240 / slots) * slots;

  // where the hint or the verdict goes: bottom-left beside the pile (wide), or under everything (narrow)
  const boxX = narrow ? 12 : 14, boxW = narrow ? W - 24 : 422;
  const boxY = narrow ? Math.max(pileBottom, LOW + 84) + 22 : LOW + 70;
  const verdictLines = f.status === 'running' ? [] : [f.verdict?.[0] ?? '', ...wrap(f.verdict?.[1] ?? '', narrow ? 44 : 50)];
  const boxH = 18 + verdictLines.length * 27;
  const H = narrow
    ? boxY + (f.status === 'running' ? 64 : boxH + 14)
    : Math.max(pileBottom + 22, LOW + 172, boxY + boxH + 14);
  const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img',
    'aria-label': `The brackets ${f.chars.join(' ')}, with ${f.depth} on the pile` });

  // matched pairs: an arc from the opening bracket to its closing bracket; wider pairs get taller arcs
  for (const [a, b] of f.pairs) {
    const hgt = (14 + (48 * (b - a - 1)) / Math.max(1, n - 2)) / 0.75;
    svg.append(s('path', { d: `M${cx(a)},${ROW_Y - 3} C${cx(a)},${ROW_Y - 3 - hgt} ${cx(b)},${ROW_Y - 3 - hgt} ${cx(b)},${ROW_Y - 3}`, class: 'stacks-arc' }));
  }
  f.chars.forEach((ch, i) => {
    svg.append(...cell(cx(i) - cw / 2, ROW_Y, cw, CELL_H, ch, f.charState[i]),
      s('text', { x: cx(i), y: ROW_Y + CELL_H + 20, 'text-anchor': 'middle', class: 'stacks-label' }, String(i)));
  });
  if (f.ptr >= 0) svg.append(s('text', { x: cx(f.ptr), y: ROW_Y + CELL_H + 46, 'text-anchor': 'middle', class: 'stacks-ptr' }, '↑'));

  // the pile, on the right
  svg.append(s('text', { x: PX, y: LOW + 4, 'text-anchor': 'middle', class: 'stacks-title' }, 'The pile'));
  svg.append(...drawPile(PX, PILE_TOP, slots, f.pile.map((p) => p.ch), f.pileState, f.pileBad, narrow ? 76 : 84).els);

  // depth now, deepest so far and the goal, on the left
  if (narrow) {
    ([['Depth now', f.depth], ['Deepest so far', f.maxDepth], ['Goal', GOAL_DEPTH]] as [string, number][]).forEach(([label, v], k) => {
      const t = s('text', { x: 14, y: LOW + 8 + k * 34, class: 'stacks-hint' });
      t.append(s('tspan', { class: 'stacks-muted' }, label + ': '), s('tspan', { class: 'stacks-strong' }, String(v)));
      svg.append(t);
    });
  } else {
    const stat = (x: number, label: string, v: number) => [
      s('text', { x, y: LOW + 4, class: 'stacks-label' }, label),
      s('text', { x, y: LOW + 42, class: 'stacks-num' }, String(v)),
    ];
    svg.append(...stat(22, 'Depth now', f.depth), ...stat(150, 'Deepest so far', f.maxDepth), ...stat(300, 'Goal', GOAL_DEPTH));
  }

  if (f.status === 'running') {
    const top = f.pile[f.pile.length - 1];
    if (top) {
      svg.append(rich(boxX + 8, boxY + 24, 'stacks-hint', `Top of the pile: ${top.ch}`),
        rich(boxX + 8, boxY + 52, 'stacks-hint', `So the next closing bracket must be ${CLOSE_OF[top.ch]}`));
    } else {
      svg.append(rich(boxX + 8, boxY + 24, 'stacks-hint', 'The pile is empty: nothing is open.'));
    }
  } else {
    const cls = f.status === 'ok' ? 'ok' : 'bad';
    svg.append(s('rect', { x: boxX, y: boxY, width: boxW, height: boxH, rx: 8, class: `stacks-verdict ${cls}` }));
    verdictLines.forEach((t, k) => svg.append(
      rich(boxX + 14, boxY + 27 + k * 27, 'stacks-verdict-t' + (k === 0 ? ' head' : ''), (k === 0 ? (cls === 'ok' ? '✓ ' : '✗ ') : '') + t)));
    svg.append(s('rect', { x: 2, y: 2, width: W - 4, height: H - 4, rx: 10, class: `stacks-frame ${cls}` }));
  }
  stage.append(svg);
}

// ------------------------------------------------------------------ stack vs queue picture
function renderOrder(stage: HTMLElement, f: OrderFrame) {
  const narrow = isNarrow(stage);
  const W = narrow ? NARROW : WIDE;
  const n = f.items.length;
  const slots = Math.max(4, n);
  const SX = narrow ? 84 : 150, TOP = 52;
  const bottom = TOP + slots * 30;
  const QX = narrow ? 192 : 340;
  const QS = narrow ? Math.min(36, (W - 10 - QX) / n) : 36;
  const OS = narrow ? Math.min(34, (W - 12 - 152) / n) : 34;     // output slot width
  const H = narrow ? bottom + 128 : bottom + 92;
  const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img',
    'aria-label': `Stack: ${f.stack.join(' ') || 'empty'}. Queue: ${f.queue.join(' ') || 'empty'}.` });

  svg.append(
    s('text', { x: SX, y: 24, 'text-anchor': 'middle', class: 'stacks-title' }, 'Stack (a pile)'),
    s('text', { x: QX + (n * QS) / 2, y: 24, 'text-anchor': 'middle', class: 'stacks-title' }, 'Queue (a line)'),
  );
  svg.append(...drawPile(SX, TOP, slots, f.stack, f.stackState, false, narrow ? 64 : 84).els);

  const qy = (TOP + bottom) / 2 - 20;
  svg.append(s('rect', { x: QX - 4, y: qy - 4, width: n * QS + 4, height: 48, rx: 8, class: 'stacks-track' }));
  f.queue.forEach((ch, k) => svg.append(...cell(QX + k * QS, qy, QS - 4, 40, ch, f.queueState[k], 'sm')));
  if (f.queue.length) {
    svg.append(s('text', { x: QX + (QS - 4) / 2, y: qy + 66, 'text-anchor': narrow ? 'start' : 'middle', class: 'stacks-label' }, '↑ front'));
    svg.append(s('text', { x: QX + (f.queue.length - 1) * QS + (QS - 4) / 2, y: qy - 14, 'text-anchor': 'middle', class: 'stacks-label' }, 'back ↓'));
    if (!narrow) svg.append(s('text', { x: QX - 10, y: qy + 26, 'text-anchor': 'end', class: 'stacks-label' }, 'out ←'));
  }

  const outRow = (x: number, y: number, cellsX: number, label: string, items: string[], states: Cell[]) => {
    svg.append(s('text', { x, y: narrow ? y + 24 : y - 10, class: 'stacks-label' }, label));
    svg.append(s('rect', { x: cellsX - 3, y: y - 3, width: n * OS + 2, height: 42, rx: 8, class: 'stacks-track' }));
    items.forEach((ch, k) => svg.append(...cell(cellsX + k * OS, y, OS - 4, 36, ch, states[k], 'sm')));
  };
  if (narrow) {
    outRow(12, bottom + 30, 152, 'Stack gave:', f.stackOut, f.stackOutState);
    outRow(12, bottom + 80, 152, 'Queue gave:', f.queueOut, f.queueOutState);
  } else {
    outRow(20, bottom + 40, 20, 'Out of the stack, in order:', f.stackOut, f.stackOutState);
    outRow(QX, bottom + 40, QX, 'Out of the queue, in order:', f.queueOut, f.queueOutState);
  }
  stage.append(svg);
}

// ------------------------------------------------------------------ the visualiser
const LEGENDS: [string, string][][] = [
  [['var(--search)', 'being read or compared'], ['var(--yellow)', 'still open (on the pile)'], ['var(--green)', 'matched'], ['var(--red)', 'the wrong bracket']],
  [['var(--red)', 'moved in this step'], ['var(--search)', 'next to come out'], ['var(--yellow)', 'came out, in this order'], ['var(--green)', 'all out']],
];
const LABELS = [
  `Brackets: ( ) [ ] { }, up to ${MAX_BRACKETS}, spaces allowed`,
  `Letters or digits, ${MIN_ITEMS} to ${MAX_ITEMS} of them`,
];
const HELP = [
  'Positions count from 0, as in Python.',
  'Each item goes into the stack and into the queue. Then both give all their items back.',
];

const viz: Viz = (el, api) => {
  let showing = false;
  let mode = 0;                                  // 0 = bracket checker, 1 = stack vs queue
  const legend = h('div', { class: 'legend' });

  const algorithms: Algorithm<SQFrame>[] = [
    { name: 'Bracket checker', code: BRACKET_CODE, run: (t) => bracketFrames(parseBrackets(t)) },
    { name: 'Stack vs queue', code: ORDER_CODE, run: (t) => orderFrames(parseItems(t)) },
  ];

  const player = makePlayer<SQFrame>({
    algorithms,
    inputs: {
      label: LABELS[0],
      value: DEFAULT_BRACKETS,
      help: HELP[0],
      presets: BRACKET_PRESETS,
      random: () => (mode === 0 ? randomBrackets() : randomItems()),
    },
    render: (stage, f) => (f.kind === 'brackets' ? renderBrackets(stage, f) : renderOrder(stage, f)),
    onRun: (frames, input, algo) => {
      setMode(algorithms.indexOf(algo));
      const end = frames[frames.length - 1];
      if (end.kind === 'order') {
        api.feedback(`The stack gave ${end.stackOut.join(' ')}; the queue gave ${end.queueOut.join(' ')}. Switch to the bracket checker for the challenge.`);
      } else {
        const r = checkBrackets(parseBrackets(input));
        if (r.ok && r.maxDepth >= GOAL_DEPTH) {
          if (showing) api.feedback(`Matched, and the pile got ${r.maxDepth} deep. Now write a different string of your own that does it.`);
          else api.win(`Matched, and the pile got ${r.maxDepth} brackets deep.`);
        } else if (r.ok) {
          api.feedback(`Matched. The pile got ${r.maxDepth} deep; the goal is ${GOAL_DEPTH}.`);
        } else {
          if (r.error) api.feedback(`Not matched: ${describeError(r.error)}. The pile got ${r.maxDepth} deep.`);
        }
      }
      showing = false;
    },
  });

  // The two modes share one input box. Each mode keeps its own last good input, so switching never shows an error.
  const box = player.el.querySelector<HTMLInputElement>('.dp-input')!;
  const label = player.el.querySelector<HTMLElement>('.dp-input-label');
  const help = player.el.querySelector<HTMLElement>('.dp-help');
  const presets = player.el.querySelector<HTMLElement>('.dp-presets');
  const algoRow = player.el.querySelector<HTMLElement>('.dp-algos');
  const parses = [parseBrackets, parseItems];
  const isValid = (k: number, t: string) => { try { parses[k](t); return true; } catch { return false; } };
  const lastGood = [DEFAULT_BRACKETS, DEFAULT_ITEMS];
  algoRow?.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest('button');
    const k = btn ? [...algoRow.querySelectorAll('button')].indexOf(btn) : -1;
    if (k < 0 || k === mode) return;
    if (isValid(mode, box.value)) lastGood[mode] = box.value;
    if (!isValid(k, box.value)) box.value = lastGood[k];
    setMode(k);
  }, true);                                       // capture: runs before the player re-runs with the box text

  function setMode(k: number) {
    mode = k;
    if (label) label.textContent = LABELS[k];
    if (help) help.textContent = HELP[k];
    if (presets) presets.style.display = k === 0 ? '' : 'none';   // not the hidden attribute: .btn-row sets display
    legend.replaceChildren(...LEGENDS[k].map(([c, t]) => h('span', null, h('span', { class: 'sw', style: `background:${c}` }), t)));
  }
  setMode(0);

  el.append(player.el, legend);

  return {
    async showMe() {
      showing = true;
      player.setInput(SHOW_ME_BRACKETS, 0);
      await sleep(400);
      player.play();
    },
  };
};

export default viz;

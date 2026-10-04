// DSA 9 — Greedy algorithms: "Make change". Left, biggest-first builds a stack one coin at a time.
// Right, a table of the fewest coins for every amount 0..target fills in, then the trace back builds the best stack.
// Challenge: find coins and an amount where biggest-first uses more coins than needed (not 1, 3, 4 and 6).
import { h, s } from '../../../lib/dom';
import { sleep, type Viz } from '../../fieldviz/kit';
import { makePlayer, type Algorithm } from '../player';
import { CHANGE_CODE, changeFrames, compareChange, parseChange, sumText, type ChangeFrame } from './greedy-core';
import './greedy.css';

const W = 640;
const PANEL_W = 296;
const COIN_W = 44, COIN_H = 20, COIN_PITCH = 22, COL_PITCH = 48, PER_COL = 10;
const PER_ROW = 10, CELL_PITCH = 61, CELL_W = 57, CELL_H = 42, ROW_PITCH = 48;
const SHOW_ME = '1 7 10; 14';

const coinWord = (n: number) => `${n} coin${n === 1 ? '' : 's'}`;

/** One pile of coins, filled bottom-up in columns of 10, centred in its panel. */
function drawStack(svg: SVGSVGElement, stack: number[], total: number, px: number, base: number, state: 'run' | 'done', fresh: boolean) {
  const cols = Math.max(1, Math.ceil(total / PER_COL));
  const x0 = px + (PANEL_W - (cols * COL_PITCH - (COL_PITCH - COIN_W))) / 2;
  stack.forEach((v, k) => {
    const col = Math.floor(k / PER_COL), row = k % PER_COL;
    const x = x0 + col * COL_PITCH;
    const y = base - 4 - (row + 1) * COIN_PITCH + (COIN_PITCH - COIN_H);
    const isFresh = fresh && k === stack.length - 1;
    const cls = 'greedy-coin' + (isFresh ? ' fresh' : state === 'done' ? ' done' : '');
    svg.append(
      s('rect', { x, y, width: COIN_W, height: COIN_H, rx: 9, class: cls }),
      s('text', { x: x + COIN_W / 2, y: y + 15, 'text-anchor': 'middle', class: 'greedy-coin-t' }, String(v)),
    );
  });
}

function render(stage: HTMLElement, f: ChangeFrame) {
  const rowsInStack = Math.min(PER_COL, Math.max(3, f.gTotal, f.bTotal));
  const stackTop = 92;
  const base = stackTop + rowsInStack * COIN_PITCH + 6;
  const panelBottom = base + 30;
  const tableTop = panelBottom + 34;
  const tableRows = Math.ceil((f.amount + 1) / PER_ROW);
  const H = tableTop + tableRows * ROW_PITCH + 4;
  const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img',
    'aria-label': `Coins ${f.coins.slice().reverse().join(', ')}, amount ${f.amount}. Biggest first: ${f.gStack.join(' + ') || 'no coins yet'}. Fewest possible: ${f.bStack.join(' + ') || 'not traced yet'}.` });

  // ---------------- coin chips and the amount
  svg.append(s('text', { x: 16, y: 31, class: 'greedy-l' }, 'Coins'));
  const asc = f.coins.slice().reverse();
  asc.forEach((c, k) => {
    const cx = 82 + k * 44;
    const cls = 'dv-node' + (f.chipHi === c ? ' hi' : f.chipCmp?.includes(c) ? ' front' : '');
    const g = s('g', { class: f.chipDim?.includes(c) ? 'greedy-chip-dim' : '' },
      s('circle', { cx, cy: 26, r: 18, class: cls }),
      s('text', { x: cx, y: 31, 'text-anchor': 'middle', class: 'greedy-coin-t', style: 'font-size:14px' }, String(c)));
    svg.append(g);
  });
  svg.append(s('text', { x: W - 16, y: 32, 'text-anchor': 'end', class: 'greedy-v' }, `Amount ${f.amount}`));

  // ---------------- the two panels
  const panels: { px: number; title: string; status: string; bad: boolean; stack: number[]; total: number; state: 'run' | 'done'; fresh: boolean; sum: string; empty?: string[] }[] = [];
  {
    const done = f.gState !== 'run';
    const sum = f.gStack.length ? `${sumText(f.gStack)} = ${f.amount - f.gLeft}` : '';
    panels.push({
      px: 16, title: 'Biggest first',
      status: f.gState === 'stuck' ? `stuck, ${f.gLeft} left` : f.gState === 'done' ? coinWord(f.gStack.length) : `${f.gLeft} left`,
      bad: f.gState === 'stuck', stack: f.gStack, total: f.gTotal, state: done ? 'done' : 'run', fresh: f.fresh === 'g',
      sum: f.gState === 'stuck' ? (sum ? `${sum}; ${f.gLeft} can't be made` : `no coin fits ${f.gLeft}`) : sum,
    });
  }
  {
    const st = f.bState;
    panels.push({
      px: W - 16 - PANEL_W, title: 'Fewest possible',
      status: st === 'done' ? coinWord(f.bStack.length) : st === 'none' ? `${f.amount} can't be made` : st === 'trace' ? `${f.bStack.length} so far` : '',
      bad: st === 'none', stack: f.bStack, total: f.bTotal, state: st === 'done' ? 'done' : 'run', fresh: f.fresh === 'b',
      sum: f.bStack.length ? `${sumText(f.bStack)} = ${f.bStack.reduce((a, b) => a + b, 0)}` : '',
      empty: st === 'wait' ? ['Built from the table below,', 'after biggest-first.'] : st === 'fill' ? ['Traced back once the table is full.'] : undefined,
    });
  }
  for (const p of panels) {
    svg.append(
      s('rect', { x: p.px - 6, y: 52, width: PANEL_W + 12, height: panelBottom - 52, rx: 10, class: 'greedy-panel' }),
      s('text', { x: p.px + 6, y: 76, class: 'greedy-h' }, p.title),
      s('text', { x: p.px + PANEL_W - 6, y: 76, 'text-anchor': 'end', class: 'greedy-v' + (p.bad ? ' greedy-bad' : p.state === 'done' ? ' greedy-good' : '') }, p.status),
      s('line', { x1: p.px + 24, x2: p.px + PANEL_W - 24, y1: base, y2: base, class: 'greedy-base' }),
    );
    drawStack(svg, p.stack, p.total, p.px, base, p.state, p.fresh);
    if (p.sum) svg.append(s('text', { x: p.px + PANEL_W / 2, y: base + 20, 'text-anchor': 'middle', class: 'greedy-l' }, p.sum));
    p.empty?.forEach((line, k) =>
      svg.append(s('text', { x: p.px + PANEL_W / 2, y: base - 34 + k * 18, 'text-anchor': 'middle', class: 'greedy-l' }, line)));
  }

  // ---------------- the table: fewest coins for every amount
  svg.append(s('text', { x: 16, y: tableTop - 10, class: 'greedy-l' }, 'Fewest coins for each amount (– means it can\'t be made)'));
  const x0 = (W - (PER_ROW * CELL_PITCH - (CELL_PITCH - CELL_W))) / 2;
  for (let a = 0; a <= f.amount; a++) {
    const x = x0 + (a % PER_ROW) * CELL_PITCH;
    const y = tableTop + Math.floor(a / PER_ROW) * ROW_PITCH;
    const filled = a <= f.filled;
    let cls = 'dv-cell';
    if (a === f.cur) cls += ' hi';
    else if (f.look?.includes(a)) cls += ' cmp';
    else if (f.path?.includes(a)) cls += ' done';
    const g = s('g', { class: filled || a === f.cur ? '' : 'greedy-unfilled' },
      s('rect', { x, y, width: CELL_W, height: CELL_H, rx: 6, class: cls }),
      s('text', { x: x + 6, y: y + 15, class: 'greedy-cell-n' }, String(a)));
    if (filled) {
      const v = f.best[a];
      g.append(s('text', { x: x + CELL_W - 8, y: y + 34, 'text-anchor': 'end', class: 'greedy-cell-v' + (v < 0 ? ' greedy-bad' : '') }, v < 0 ? '–' : String(v)));
    }
    svg.append(g);
  }
  stage.append(svg);
}

const viz: Viz = (el, api) => {
  let showing = false;
  const legend = h('div', { class: 'legend' },
    ([
      ['var(--yellow)', 'the current amount, and the coin chosen for it'],
      ['var(--search)', 'what is left after each coin that fits (looked at)'],
      ['var(--red)', 'the coin just put on a stack'],
      ['var(--green)', 'a finished stack, and the trace-back path'],
    ] as [string, string][]).map(([c, t]) => h('span', null, h('span', { class: 'sw', style: `background:${c}` }), t)));

  const algorithms: Algorithm<ChangeFrame>[] = [
    { name: 'Make change', code: CHANGE_CODE, run: (t) => { const p = parseChange(t); return changeFrames(p.coins, p.amount); } },
  ];

  const player = makePlayer<ChangeFrame>({
    algorithms,
    inputs: {
      label: 'Coin values (1 to 100, up to 6 of them), a semicolon, then the amount (1 to 60)',
      value: '1 5 10 25; 30',
      help: 'Each run builds the left stack first, then fills the table, then traces back the right stack.',
      presets: [
        { label: '1 5 10 25; 30', value: '1 5 10 25; 30' },
        { label: '1 3 4; 6', value: '1 3 4; 6' },
        { label: '1 2 5 10 20 50; 48', value: '1 2 5 10 20 50; 48' },
        { label: '3 5; 7', value: '3 5; 7' },
      ],
      random: () => {
        const pool = Array.from({ length: 29 }, (_, i) => i + 2);
        const k = 1 + Math.floor(Math.random() * 3);
        const coins = new Set<number>(Math.random() < 0.8 ? [1] : []);
        while (coins.size < k + (coins.has(1) ? 1 : 0)) coins.add(pool[Math.floor(Math.random() * pool.length)]);
        const amount = 8 + Math.floor(Math.random() * 33);
        return `${[...coins].sort((a, b) => a - b).join(' ')}; ${amount}`;
      },
    },
    render: (stage, f) => render(stage, f),
    onRun: (_frames, input) => {
      const { coins, amount } = parseChange(input);
      const r = compareChange(coins, amount);
      const g = r.stuck ? `stuck with ${amount - r.greedy.reduce((a, b) => a + b, 0)} left` : coinWord(r.greedy.length);
      const b = r.fewest ? coinWord(r.fewest.length) : `${amount} can't be made`;
      const both = `Biggest first: ${g}. Fewest possible: ${b}.`;
      if (showing) {
        api.feedback(`${both} Biggest-first takes ${sumText(r.greedy)}, but ${sumText(r.fewest!)} is enough. Now find a different example of your own.`);
      } else if (r.win) {
        api.win(r.stuck
          ? `${both} Biggest-first got stuck, but ${sumText(r.fewest!)} makes ${amount} exactly.`
          : `${both} Biggest-first used ${coinWord(r.greedy.length - r.fewest!.length)} more than needed: ${sumText(r.fewest!)} is enough.`);
      } else if (r.greedyWrong) {
        api.feedback(`${both} That is the prediction's example (1, 3, 4 and 6), so it doesn't count. Find another.`);
      } else if (!r.fewest) {
        api.feedback(`${both} No set of these coins makes ${amount} exactly, so there is nothing to beat.`);
      } else {
        api.feedback(`${both} They match, so biggest-first was right here.`);
      }
      showing = false;
    },
  });

  el.append(player.el, legend);

  return {
    async showMe() {
      showing = true;
      player.setInput(SHOW_ME);
      await sleep(400);
      player.play();
    },
  };
};

export default viz;

// DSA 4 — Recursion and backtracking. Queens are placed row by row; a row with no safe square sends the
// search back to the row above (a backtrack). The panel on the right lists the unfinished calls.
// Challenge: find the board size from 4 to 8 whose first solution needs the most backtracks.
import { h, s } from '../../../lib/dom';
import { readout, sleep, type Viz } from '../../fieldviz/kit';
import { makePlayer, type Algorithm } from '../player';
import { GOAL_SIZES, LINE, QUEENS_CODE, attacked, backtracksBySize, judge, parseSize, queensFrames, type QueenFrame } from './queens-core';
import './queens.css';

const Y0 = 64;          // board top edge (column numbers and panel headings sit above)

/** Board and panel geometry. A narrow stage (a phone) gets a narrower picture, so it is scaled down less. */
function layout(n: number, compact: boolean) {
  const w = compact ? 520 : 640;
  const x0 = compact ? 26 : 34;                                  // board left edge (row numbers sit to its left)
  const cell = compact ? Math.min(48, Math.floor(216 / n)) : Math.min(60, Math.floor(328 / n));
  const side = n * cell;
  const px = compact ? x0 + side + 14 : 392;                     // left edge of the calls panel
  return { w, x0, cell, side, px, pw: w - 4 - px };
}

function queenShape(cx: number, cy: number, size: number, cls: string) {
  const g = s('g', { transform: `translate(${cx} ${cy}) scale(${size})` });
  const crown = '-0.38,0.28 0.38,0.28 0.46,-0.2 0.2,0.04 0,-0.34 -0.2,0.04 -0.46,-0.2';
  const attrs = { class: cls, 'vector-effect': 'non-scaling-stroke' };
  g.append(
    s('polygon', { points: crown, ...attrs }),
    s('rect', { x: -0.4, y: 0.34, width: 0.8, height: 0.12, rx: 0.04, ...attrs }),
    ...[[-0.46, -0.2], [0, -0.34], [0.46, -0.2]].map(([x, y]) => s('circle', { cx: x, cy: y, r: 0.07, ...attrs })),
  );
  return g;
}

function render(stage: HTMLElement, f: QueenFrame) {
  const n = f.n;
  const compact = stage.clientWidth > 0 && stage.clientWidth < 520;
  const { w: W, x0: X0, cell, side, px: PX, pw: PW } = layout(n, compact);
  const H = Y0 + side + 40;
  const cx = (c: number) => X0 + c * cell + cell / 2;
  const cy = (r: number) => Y0 + r * cell + cell / 2;
  const placedRows = f.queens.map((c, r) => `row ${r + 1} column ${c + 1}`).join(', ');
  const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', class: compact ? 'qn-compact' : '',
    'aria-label': `A ${n} by ${n} board. ${f.queens.length ? 'Queens at ' + placedRows : 'No queens yet'}. ${f.backtracks} backtracks so far.` });

  // squares
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      svg.append(s('rect', { x: X0 + c * cell, y: Y0 + r * cell, width: cell, height: cell, class: (r + c) % 2 ? 'qn-sq dark' : 'qn-sq' }));
    }
  }
  // the row being searched: attacked squares shaded and crossed
  if (f.row >= 0 && f.status === 'searching') {
    for (let c = 0; c < n; c++) {
      if (!attacked(f.queens, f.row, c)) continue;
      const x = X0 + c * cell, y = Y0 + f.row * cell, m = cell * 0.3;
      svg.append(
        s('rect', { x, y, width: cell, height: cell, class: 'qn-hit' }),
        s('path', { d: `M${x + m} ${y + m}L${x + cell - m} ${y + cell - m}M${x + cell - m} ${y + m}L${x + m} ${y + cell - m}`, class: 'qn-x' }),
      );
    }
  }
  svg.append(s('rect', { x: X0, y: Y0, width: side, height: side, class: 'qn-frame' }));
  if (f.deadRow !== undefined && f.deadRow < n) {
    svg.append(s('rect', { x: X0 + 1.5, y: Y0 + f.deadRow * cell + 1.5, width: side - 3, height: cell - 3, rx: 3, class: 'qn-dead' }));
  }
  if (f.row >= 0 && f.status === 'searching') {
    svg.append(s('rect', { x: X0 + 1.5, y: Y0 + f.row * cell + 1.5, width: side - 3, height: cell - 3, rx: 3, class: 'qn-rowband' }));
  }
  // labels
  for (let k = 0; k < n; k++) {
    svg.append(
      s('text', { x: cx(k), y: Y0 - 9, 'text-anchor': 'middle', class: 'qn-label' }, String(k + 1)),
      s('text', { x: X0 - 10, y: cy(k) + 5, 'text-anchor': 'end', class: 'qn-label' }, String(k + 1)),
    );
  }
  svg.append(s('text', { x: X0 + side / 2, y: Y0 - 30, 'text-anchor': 'middle', class: 'qn-head' }, 'column'));

  // queens
  const qSize = cell * 0.66;
  f.queens.forEach((c, r) => {
    const cls = f.status === 'solved' ? 'qn-queen done' : r === f.row && f.line === LINE.place ? 'qn-queen cur' : 'qn-queen';
    svg.append(queenShape(cx(c), cy(r), qSize, cls));
  });
  if (f.lifted) svg.append(queenShape(cx(f.lifted.col), cy(f.lifted.row), qSize, 'qn-ghost'));

  // counter and the calls panel
  svg.append(
    s('text', { x: PX, y: 24, class: 'qn-head' }, 'Backtracks: ', s('tspan', { class: 'qn-count' }, String(f.backtracks))),
    s('text', { x: PX, y: Y0 - 12, class: 'qn-head' }, 'Unfinished calls, one per row'),
  );
  const boxH = Math.min(cell - (compact ? 4 : 6), 34);
  for (const ln of f.stack) {
    const y = cy(ln.row);
    svg.append(
      s('line', { x1: X0 + side + 4, y1: y, x2: PX - 4, y2: y, class: 'qn-link' }),
      s('rect', { x: PX, y: y - boxH / 2, width: PW, height: boxH, rx: 6, class: `qn-call ${ln.state}` }),
      s('text', { x: PX + 10, y: y + (compact ? 6 : 5), class: ln.state === 'ended' ? 'qn-call-t ended' : 'qn-call-t' }, ln.text),
    );
  }
  if (f.status === 'solved') {
    svg.append(s('text', { x: PX, y: Y0 + side + 28, class: 'qn-base' }, `row ${n + 1}: no rows left (base case)`));
  }
  if (f.status === 'none') {
    svg.append(
      s('text', { x: PX, y: cy(0) - 4, class: 'qn-none' }, 'No calls left.'),
      s('text', { x: PX, y: cy(0) + 16, class: 'qn-none' }, `No solution for ${n} × ${n}.`),
    );
  }
  stage.append(svg);
}

const viz: Viz = (el, api) => {
  let showing = false;
  const tried = new Map<number, number>();
  const { best } = backtracksBySize();

  const btR = readout('Backtracks so far');
  const placedR = readout('Queens placed so far');
  const triedR = readout('Sizes tried (backtracks)', 'none yet');
  const sw = (c: string, t: string) => h('span', null, h('span', { class: 'sw', style: `background:${c}` }), t);
  const legend = h('div', { class: 'legend' },
    sw('var(--search)', 'the row being searched'),
    sw('var(--faint)', 'square attacked by a queen above'),
    sw('var(--yellow)', 'queen placed in this step; the call running now'),
    sw('var(--red)', 'queen lifted (a backtrack); a row with no safe square'),
    sw('var(--green)', 'solution'));

  const algorithms: Algorithm<QueenFrame>[] = [
    { name: 'Place the queens', code: QUEENS_CODE, run: (t) => queensFrames(parseSize(t)) },
  ];

  const player = makePlayer<QueenFrame>({
    algorithms,
    inputs: {
      label: 'Board size (1 to 8)',
      value: '6',
      help: 'One queen goes in each row. Try 3 and 4 first: does every size have a solution?',
      presets: [
        { label: '3 × 3', value: '3' },
        { label: '4 × 4', value: '4' },
        { label: '6 × 6', value: '6' },
        { label: '8 × 8', value: '8' },
      ],
      random: () => String(GOAL_SIZES[Math.floor(Math.random() * GOAL_SIZES.length)]),
    },
    render: (stage, f) => render(stage, f),
    onFrame: (f) => { btR.set(String(f.backtracks)); placedR.set(String(f.placed)); },
    onRun: (frames) => {
      const end = frames[frames.length - 1];
      const n = end.n, bt = end.backtracks;
      const head = end.status === 'none'
        ? `Size ${n}: no solution, found after ${bt} backtracks.`
        : `Size ${n}: ${bt} backtrack${bt === 1 ? '' : 's'}.`;
      if (showing) {
        api.feedback(`${head} That is the most of any size from 4 to 8. To finish the challenge, run size ${best} and one other size from 4 to 8 yourself.`);
      } else {
        // The default run counts: it is on screen and its count is shown.
        if (GOAL_SIZES.includes(n)) tried.set(n, bt);
        const verdict = judge(tried);
        if (verdict.won) api.win(verdict.message);
        else api.feedback(`${head} ${verdict.message}`);
      }
      triedR.set(GOAL_SIZES.filter((k) => tried.has(k)).map((k) => `${k}: ${tried.get(k)}`).join(' · ') || 'none yet');
      showing = false;
    },
    stageHeight: 150,
  });

  el.append(
    player.el,
    legend,
    h('div', { class: 'viz-readouts' }, btR.el, placedR.el, triedR.el),
  );

  return {
    async showMe() {
      showing = true;
      player.setInput(String(best));
      player.setSpeed(4);                      // size 8 has about 220 steps
      await sleep(400);
      player.play();
    },
  };
};

export default viz;

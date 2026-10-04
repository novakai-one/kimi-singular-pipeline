// DSA 1, Big-O. Three real programs (one pass, sorting, every pair) are timed in the browser at growing sizes.
// One frame per size: stepping forward reveals (and measures) the next size. The chart and the table show the times
// and the ratio to the size before. Challenge: guess the every-pair time for the next size, within 30%, before you reveal it.
import { h, s } from '../../../lib/dom';
import { inline } from '../../../lib/md';
import { segmented, sleep, type Viz } from '../../fieldviz/kit';
import { makePlayer, type Algorithm } from '../player';
import {
  CODE, DEFAULT_SIZES, PRESETS, fmtMs, fmtN, fmtRatio, fmtTimes, guessResult, makeFrames, measureAll, parseSizes,
  patternGuess, randomSizes, ratioAt, type BigOFrame, type ProgKey, type RunState,
} from './big-o-core';
import './big-o.css';

type Shape = 'circle' | 'square' | 'triangle';
const SERIES: Record<ProgKey, { color: string; shape: Shape; label: string }> = {
  one: { color: 'var(--act)', shape: 'circle', label: 'One pass' },
  sort: { color: 'var(--learn)', shape: 'square', label: 'Sorting' },
  pair: { color: 'var(--red)', shape: 'triangle', label: 'Every pair' },
};
const KEYS: ProgKey[] = ['one', 'sort', 'pair'];

function marker(shape: Shape, cx: number, cy: number, color: string, cls = 'big-o-pt') {
  const style = `fill:${color}`;
  if (shape === 'circle') return s('circle', { cx, cy, r: 5, class: cls, style });
  if (shape === 'square') return s('rect', { x: cx - 4.6, y: cy - 4.6, width: 9.2, height: 9.2, rx: 1.5, class: cls, style });
  return s('path', { d: `M${cx},${cy - 6.4} L${cx + 6},${cy + 4.2} L${cx - 6},${cy + 4.2} Z`, class: cls, style });
}
function swatch(shape: Shape, color: string) {
  const svg = s('svg', { width: 14, height: 14, viewBox: '0 0 14 14', class: 'big-o-sw', 'aria-hidden': 'true' });
  svg.append(marker(shape, 7, 7.5, color, ''));
  return svg;
}

/** Tick label for 10^e: 0.001, 0.01, 0.1, 1, 10, 100, 1,000. */
const decade = (e: number) => (e >= 0 ? fmtN(10 ** e) : '0.' + '0'.repeat(-e - 1) + '1');
function niceStep(raw: number) {
  const p = 10 ** Math.floor(Math.log10(raw));
  for (const m of [1, 2, 5, 10]) if (m * p >= raw) return m * p;
  return 10 * p;
}
const fmtGuess = (g: number) => String(Number(g.toPrecision(4)));
/** "7.5", "7,5" or "1,200" → a number of ms, or null. */
function parseGuess(text: string): number | null {
  let t = text.trim().replace(/\s/g, '').replace(/ms$/i, '');
  if (!t) return null;
  t = /^\d{1,3}(,\d{3})+(\.\d+)?$/.test(t) ? t.replace(/,/g, '') : t.replace(',', '.');
  const v = Number(t);
  return Number.isFinite(v) && v > 0 ? v : null;
}
const nextPaint = () => new Promise<void>((res) => requestAnimationFrame(() => setTimeout(res, 0)));
const yieldNow = () => new Promise<void>((res) => setTimeout(res, 0));

const viz: Viz = (el, api) => {
  let run: RunState | null = null;
  let shown: BigOFrame | null = null;
  let stageEl: HTMLElement | null = null;
  let revealed = -1;
  let pending: { k: number; value: number; byShowMe: boolean } | null = null;
  let batchHadGuess = false;
  let scale: 'log' | 'lin' = 'log';
  let lastW = 640;

  // ---------------------------------------------------------------- chart + table
  function draw(stage: HTMLElement, f: BigOFrame) {
    const r = f.run;
    const k = f.k;
    const narrow = stage.clientWidth > 0 && stage.clientWidth < 540;
    const W = narrow ? 420 : 640, H = narrow ? 290 : 300;
    lastW = W;
    const x0 = narrow ? 50 : 62, x1 = W - (narrow ? 88 : 104), y0 = 34, y1 = H - 48;
    const sizes = r.sizes, n0 = sizes[0], nL = sizes[sizes.length - 1];

    // values on screen: measured times up to size k, and guesses (with their 30% windows)
    const vals: number[] = [];
    for (let j = 0; j <= k; j++) {
      const t = r.times[j];
      if (t) vals.push(t.one, t.sort, t.pair);
      if (r.guesses[j] !== null) vals.push(r.guesses[j]! * 0.7, r.guesses[j]! * 1.3);
    }
    const live = pending && k === revealed && pending.k === k + 1 ? pending : null;
    if (live) vals.push(live.value * 0.7, live.value * 1.3);

    let X: (n: number) => number, Y: (v: number) => number;
    const yTicks: { v: number; label: string }[] = [];
    if (scale === 'log') {
      const span = Math.log(nL) - Math.log(n0);
      X = (n) => x0 + 16 + ((Math.log(n) - Math.log(n0)) / span) * (x1 - x0 - 22);
      let lo = vals.length ? Math.floor(Math.log10(Math.min(...vals))) : -3;
      let hi = vals.length ? Math.ceil(Math.log10(Math.max(...vals))) : 1;
      if (hi - lo < 2) { hi = Math.max(hi, lo + 2); }
      Y = (v) => y1 - ((Math.log10(v) - lo) / (hi - lo)) * (y1 - y0);
      for (let e = lo; e <= hi; e++) yTicks.push({ v: 10 ** e, label: decade(e) });
    } else {
      X = (n) => x0 + 10 + (n / nL) * (x1 - x0 - 16);
      const max = vals.length ? Math.max(...vals) : 1;
      const step = niceStep(max / 4);
      const top = Math.ceil(max / step) * step;
      Y = (v) => y1 - (v / top) * (y1 - y0);
      for (let v = 0; v <= top + step / 2; v += step) yTicks.push({ v, label: fmtMs(v === 0 ? 0 : v).replace(/^0\.0$/, '0') });
    }

    const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': ariaFor(r, k) });
    // grid and axes
    for (const t of yTicks) {
      const y = Y(t.v);
      svg.append(
        s('line', { x1: x0, x2: x1, y1: y, y2: y, class: 'big-o-grid' }),
        s('text', { x: x0 - 8, y: y + 4.5, 'text-anchor': 'end', class: 'big-o-tick' }, t.v === 0 ? '0' : t.label));
    }
    svg.append(
      s('line', { x1: x0, x2: x0, y1: y0 - 4, y2: y1, class: 'big-o-axis' }),
      s('line', { x1: x0, x2: x1, y1: y1, y2: y1, class: 'big-o-axis' }),
      s('text', { x: 8, y: 18, class: 'big-o-title' }, 'time (ms)'),
      s('text', { x: W - 8, y: 18, 'text-anchor': 'end', class: 'big-o-title' },
        scale === 'log' ? (narrow ? 'each line up: 10 times longer' : 'each grid line up is 10 times longer') : 'evenly spaced grid'),
      s('text', { x: (x0 + x1) / 2, y: H - 8, 'text-anchor': 'middle', class: 'big-o-title' }, 'n, the number of items'));

    // the size this frame shows (yellow band)
    svg.append(s('rect', { x: X(sizes[k]) - 13, y: y0 - 4, width: 26, height: y1 - y0 + 4, rx: 6, class: 'big-o-cur' }));

    // size labels on the x axis; skip a label that would touch the one to its right
    let lastX = Infinity;
    for (let j = sizes.length - 1; j >= 0; j--) {
      const x = X(sizes[j]);
      const text = fmtN(sizes[j]);
      const wText = text.length * 7.6;
      if (x + wText / 2 > lastX - 6) continue;
      lastX = x - wText / 2;
      svg.append(s('text', { x, y: y1 + 20, 'text-anchor': 'middle', class: 'big-o-tick' + (j > k ? ' later' : '') }, text));
    }

    // guesses: a yellow ring at the guess, and a bar for the 30% window
    const guessMark = (n: number, g: number, labelIt: boolean) => {
      const x = X(n);
      svg.append(
        s('line', { x1: x, x2: x, y1: Y(g * 0.7), y2: Y(g * 1.3), class: 'big-o-window' }),
        s('circle', { cx: x, cy: Y(g), r: 7, class: 'big-o-ring' }, s('title', null, `Your guess for n = ${fmtN(n)}: ${fmtGuess(g)} ms`)));
      if (labelIt) svg.append(s('text', { x: x + 11, y: Y(g) + 4.5, class: 'big-o-guess-lab' }, 'your guess'));
    };
    for (let j = 0; j <= k; j++) if (r.guesses[j] !== null) guessMark(sizes[j], r.guesses[j]!, false);
    if (live) guessMark(sizes[live.k], live.value, true);

    // the three programs: a line through the measured points, a marker at each
    const ends: { key: ProgKey; x: number; y: number }[] = [];
    for (const key of KEYS) {
      const pts: [number, number][] = [];
      for (let j = 0; j <= k; j++) {
        const t = r.times[j];
        if (t) pts.push([X(sizes[j]), Y(t[key])]);
      }
      if (!pts.length) continue;
      const c = SERIES[key];
      if (pts.length > 1) svg.append(s('polyline', { points: pts.map((p) => p.join(',')).join(' '), class: 'big-o-line', style: `stroke:${c.color}` }));
      pts.forEach(([x, y], j) => {
        const m = marker(c.shape, x, y, c.color);
        m.append(s('title', null, `${c.label}, n = ${fmtN(sizes[j])}: ${fmtMs(r.times[j]![key])} ms`));
        svg.append(m);
      });
      const [ex, ey] = pts[pts.length - 1];
      ends.push({ key, x: ex, y: ey });
    }
    // direct labels at the newest points; labels that would overlap are merged
    ends.sort((a, b) => a.y - b.y);
    const labels: { x: number; y: number; text: string }[] = [];
    for (const e of ends) {
      const text = SERIES[e.key].label.toLowerCase();
      const prev = labels[labels.length - 1];
      if (prev && e.y - prev.y < 17) prev.text += ', ' + text;
      else labels.push({ x: e.x + 11, y: e.y, text });
    }
    for (const l of labels) svg.append(s('text', { x: l.x, y: l.y + 5, class: 'big-o-lab' }, l.text));

    // timing in progress
    if (r.measuring) {
      svg.append(s('text', { x: (x0 + x1) / 2, y: (y0 + y1) / 2, 'text-anchor': 'middle', class: 'big-o-measuring' },
        `Measuring… ${Math.round(r.progress * 100)}%`));
    }

    stage.append(h('div', { class: 'big-o-wrap' }, svg, table(r, k)));
  }

  function ariaFor(r: RunState, k: number) {
    const t = r.times[k];
    return t ? `Chart of time against n. At n = ${fmtN(r.sizes[k])}: every pair ${fmtMs(t.pair)} ms, sorting ${fmtMs(t.sort)} ms, one pass ${fmtMs(t.one)} ms.`
      : `Chart of time against n. Measuring n = ${fmtN(r.sizes[k])}.`;
  }

  function table(r: RunState, k: number) {
    const head1 = h('tr', null,
      h('th', { rowspan: 2, class: 'n' }, 'n'),
      KEYS.map((key) => h('th', { colspan: 2 }, swatch(SERIES[key].shape, SERIES[key].color), SERIES[key].label)),
      h('th', { rowspan: 2 }, 'Your guess'));
    const head2 = h('tr', null, KEYS.map(() => [
      h('th', null, 'ms'),
      h('th', { title: 'this size\'s time ÷ the time at the size before' }, 'ratio')]));
    const rows = r.sizes.map((n, j) => {
      const t = j <= k ? r.times[j] : null;
      const cells: Node[] = [];
      for (const key of KEYS) {
        const cls = key === 'pair' ? 'pair' : '';
        if (t) {
          const q = ratioAt(r, j, key);
          cells.push(h('td', { class: cls }, fmtMs(t[key])), h('td', { class: 'ratio' }, q === null ? '–' : `×${fmtRatio(q)}`));
        } else {
          const txt = j <= k && r.measuring ? '…' : '?';
          cells.push(h('td', { class: 'later' }, txt), h('td', { class: 'later' }, ''));
        }
      }
      let guessCell: Node;
      const g = j <= k ? r.guesses[j] : null;
      if (g !== null) {
        const res = t ? guessResult(g, t.pair) : null;
        guessCell = h('td', null, fmtGuess(g), res ? h('span', { class: res.win ? 'ok' : 'no' }, res.win ? ' ✓' : ' ✗') : null);
      } else if (pending && pending.k === j && k === revealed) {
        guessCell = h('td', { class: 'later' }, `${fmtGuess(pending.value)}?`);
      } else guessCell = h('td', { class: 'later' }, '–');
      return h('tr', { class: j === k ? 'cur' : '' },
        h('td', { class: 'n' + (j > k ? ' later' : '') }, fmtN(n)), cells, guessCell);
    });
    return h('div', { class: 'big-o-table-wrap' },
      h('table', { class: 'big-o-table' }, h('thead', null, head1, head2), h('tbody', null, rows)));
  }

  // ---------------------------------------------------------------- redraw outside the player (while timing runs)
  function refresh() {
    if (stageEl && shown) {
      stageEl.replaceChildren();
      draw(stageEl, shown);
      const note = player.el.querySelector('.dp-note');
      if (note) note.innerHTML = inline(shown.note);
    }
    updateGuessUI();
  }

  // ---------------------------------------------------------------- timing every size (in rounds), before any is shown
  let onScreen: Promise<void> | null = null;
  /** Resolves once the visualiser has been on screen (timing never competes with the page loading). */
  function whenOnScreen() {
    onScreen ??= new Promise<void>((res) => {
      if (typeof IntersectionObserver === 'undefined') { res(); return; }
      const io = new IntersectionObserver((es) => {
        if (es.some((e) => e.isIntersecting)) { io.disconnect(); res(); }
      });
      io.observe(el);
    });
    return onScreen;
  }
  const idle = () => new Promise<void>((res) => {
    if ('requestIdleCallback' in window) requestIdleCallback(() => res(), { timeout: 800 });
    else setTimeout(res, 150);
  });

  async function measureRun(r: RunState) {
    r.measuring = true;
    await whenOnScreen();
    await idle();
    await nextPaint();
    if (r !== run) return;
    const g = measureAll(r.sizes, r.seed, () => performance.now());
    let step = g.next();
    let lastDraw = 0;
    while (!step.done) {
      if (step.value.phase === 'time') r.progress = step.value.done / step.value.total;
      if (performance.now() - lastDraw > 250) { refresh(); lastDraw = performance.now(); }
      await yieldNow();
      if (r !== run) return;
      step = g.next();
    }
    step.value.times.forEach((t, k) => { r.times[k] = t; });
    r.measuring = false;
    r.progress = 1;
    for (let k = 0; k <= revealed; k++) report(r, k);
    refresh();
  }

  // ---------------------------------------------------------------- the challenge
  /** Feedback once size k is both revealed and measured. */
  function report(r: RunState, k: number) {
    const t = r.times[k];
    if (!t) return;
    const N = fmtN(r.sizes[k]);
    const nextN = k + 1 < r.sizes.length ? fmtN(r.sizes[k + 1]) : null;
    const g = r.guesses[k];
    if (g !== null) {
      batchHadGuess = true;
      const res = guessResult(g, t.pair);
      const pct = Math.round(Math.abs(res.off) * 100);
      const off = pct === 0 ? 'right on it' : `${pct}% ${res.off > 0 ? 'more' : 'less'} than the guess`;
      const q = ratioAt(r, k, 'pair');
      if (r.shown[k]) {
        api.feedback(`Show me guessed **${fmtGuess(g)} ms** for n = ${N}. Every pair took ${fmtMs(t.pair)} ms: ${off}, ${res.win ? 'inside' : 'outside'} the 30%. ` +
          (nextN ? `Your turn: type a guess for n = ${nextN}, then reveal it.` : 'Press Run for new random numbers and try it yourself.'));
      } else if (res.win) {
        api.win(`You guessed **${fmtGuess(g)} ms** for n = ${N}, and every pair took ${fmtMs(t.pair)} ms: ${off}, inside 30%.` +
          (q ? ` The time grew ${fmtRatio(q)} times while n grew ${fmtTimes(r.sizes[k] / r.sizes[k - 1])} times.` : ''));
      } else {
        const pg = k > 0 && r.times[k - 1] ? patternGuess(r.times[k - 1]!.pair, r.sizes[k - 1], r.sizes[k]) : null;
        const followed = pg !== null && Math.abs(g - pg) <= 0.12 * pg;
        api.feedback(`You guessed ${fmtGuess(g)} ms for n = ${N}. Every pair took **${fmtMs(t.pair)} ms**: ${off}. The goal is within 30%. ` +
          (followed
            ? 'Your guess followed the pattern, but this timing wobbled. That happens when other programs share the computer. Try the next size.'
            : 'Look at the ratio column for every pair: how many times longer did each step take?'));
      }
      return;
    }
    if (k !== revealed || batchHadGuess) return;
    api.feedback(nextN
      ? `Every pair took **${fmtMs(t.pair)} ms** at n = ${N}. Type your guess for n = ${nextN}, then reveal it.`
      : `Every pair took **${fmtMs(t.pair)} ms** at n = ${N}, the last size. Press Run for new random numbers, then guess before each reveal.`);
  }

  // ---------------------------------------------------------------- guess box
  const guessLabel = h('label', { class: 'big-o-guess-label', for: 'big-o-guess-input' }, '');
  const guessInput = h('input', {
    type: 'text', id: 'big-o-guess-input', inputmode: 'decimal', autocomplete: 'off', spellcheck: 'false',
    placeholder: 'e.g. 7.5', 'aria-describedby': 'big-o-guess-help',
  });
  const revealBtn = h('button', { class: 'btn small primary', type: 'button', onclick: () => reveal() }, 'Reveal');
  const guessHelp = h('div', { class: 'big-o-guess-help', id: 'big-o-guess-help', 'aria-live': 'polite' });
  const guessBox = h('div', { class: 'big-o-guess' },
    guessLabel,
    h('div', { class: 'big-o-guess-row' }, guessInput, h('span', { class: 'c-muted' }, 'ms'), revealBtn),
    guessHelp);
  guessInput.addEventListener('input', () => {
    const v = parseGuess(guessInput.value);
    pending = run && v !== null ? { k: revealed + 1, value: v, byShowMe: false } : null;
    refresh();
  });
  guessInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') reveal(); });

  function updateGuessUI() {
    const r = run;
    const target = revealed + 1;
    const open = !!r && target < r.sizes.length;
    guessInput.disabled = !open;
    revealBtn.disabled = !open;
    guessBox.classList.toggle('off', !open);
    if (!r) return;
    if (!open) {
      guessLabel.textContent = 'Every size is revealed.';
      revealBtn.textContent = 'Reveal';
      guessHelp.textContent = 'Press Run for new random numbers, or pick a preset. Guessing works only for sizes not yet shown.';
      return;
    }
    const N = fmtN(r.sizes[target]);
    guessLabel.textContent = `Your guess: how long will every pair take at n = ${N}?`;
    revealBtn.textContent = `Reveal n = ${N} ▶|`;
    const prev = r.times[revealed];
    const behind = shown && shown.k < revealed ? ' You are looking at an earlier size; Reveal jumps to the next new one.' : '';
    if (pending && pending.k === target) {
      guessHelp.textContent = `Within 30% of ${fmtGuess(pending.value)} ms means ${fmtMs(pending.value * 0.7)} to ${fmtMs(pending.value * 1.3)} ms.${behind}`;
    } else if (guessInput.value.trim()) {
      guessHelp.textContent = 'Type a number of milliseconds, like 7.5.';
    } else if (prev) {
      guessHelp.textContent = `At n = ${fmtN(r.sizes[revealed])} it took ${fmtMs(prev.pair)} ms. Type your guess, then reveal.${behind}`;
    } else {
      guessHelp.textContent = 'Measuring every size first. You can type your guess now.';
    }
  }

  /** Step forward to the next size nobody has seen yet. */
  function reveal() {
    if (!run || revealed + 1 >= run.sizes.length) return;
    const target = revealed + 1;
    const fwd = player.el.querySelector<HTMLButtonElement>('button[title="Step forward"]');
    for (let guard = 0; shown && shown.k < target && guard < 12; guard++) fwd?.click();
  }

  // ---------------------------------------------------------------- the player
  const algorithms: Algorithm<BigOFrame>[] = [{
    name: 'Time three programs',
    code: CODE,
    run: (text) => {
      const frames = makeFrames(parseSizes(text), 1 + Math.floor(Math.random() * 1e9));
      const r = frames[0].run;
      run = r;
      revealed = -1;
      pending = null;
      guessInput.value = '';
      r.measuring = true;
      setTimeout(() => measureRun(r), 0);
      return frames;
    },
  }];

  const player = makePlayer<BigOFrame>({
    algorithms,
    inputs: {
      label: 'Sizes to time (each at least 1.5 times the one before, up to 32,000)',
      value: DEFAULT_SIZES,
      help: 'Each Run times every size on new random numbers. Step forward to reveal the next size.',
      presets: PRESETS,
      random: () => randomSizes(Math.random),
    },
    render: (stage, f) => {
      stageEl = stage;
      shown = f;
      draw(stage, f);
    },
    onFrame: (f) => {
      if (f.run !== run) return;
      if (f.k > revealed) {
        // revealing new sizes: a guess typed for one of them is now fixed
        if (pending && pending.k <= f.k) {
          f.run.guesses[pending.k] = pending.value;
          f.run.shown[pending.k] = pending.byShowMe;
          pending = null;
        }
        const from = revealed + 1;
        revealed = f.k;
        batchHadGuess = false;
        guessInput.value = '';
        if (!f.run.measuring) for (let k = from; k <= f.k; k++) report(f.run, k);
        refresh();
      } else updateGuessUI();
    },
    stageHeight: 300,
  });

  const axes = segmented('Chart grid', [
    { label: '×10 per line', value: 'log' as const },
    { label: 'Even steps', value: 'lin' as const },
  ], 'log', (v) => { scale = v; refresh(); });
  axes.el.classList.add('big-o-axes');

  const legend = h('div', { class: 'legend' },
    KEYS.map((key) => h('span', null, swatch(SERIES[key].shape, SERIES[key].color), `${SERIES[key].label.toLowerCase()}`)),
    h('span', null, h('span', { class: 'sw', style: 'background:var(--yellow-soft);outline:1px solid var(--yellow)' }), 'the size this step shows'),
    h('span', null, h('span', { class: 'sw', style: 'background:transparent;border:2.5px solid var(--yellow);border-radius:50%' }), 'your guess, with its 30% window'));

  el.append(player.el, guessBox, legend, axes.el);

  // redraw at the other width when the stage crosses the phone breakpoint
  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(() => {
      if (!stageEl || !shown) return;
      const want = stageEl.clientWidth > 0 && stageEl.clientWidth < 540 ? 420 : 640;
      if (want !== lastW) refresh();
    }).observe(player.el);
  }

  return {
    async showMe() {
      // a run with a next size to guess
      if (!run || revealed + 1 >= run.sizes.length) {
        player.setInput(DEFAULT_SIZES);
        await sleep(30);
      }
      const r = run;
      if (!r) return;
      // go to the newest revealed size and wait for the timing to finish
      const fwd = player.el.querySelector<HTMLButtonElement>('button[title="Step forward"]');
      for (let guard = 0; shown && shown.k < revealed && guard < 12; guard++) fwd?.click();
      for (let waited = 0; r === run && r.measuring && waited < 900; waited++) await sleep(100);
      if (r !== run || !r.times[revealed]) return;
      const k = revealed;
      const prev = r.times[k]!.pair;
      const grow = r.sizes[k + 1] / r.sizes[k];
      const g = patternGuess(prev, r.sizes[k], r.sizes[k + 1]);
      guessInput.value = fmtGuess(g);
      pending = { k: k + 1, value: g, byShowMe: true };
      const why = grow === 2 ? 'Doubling n gives about 2 × 2 = 4 times the time' : `n grows ${fmtTimes(grow)} times, so the time grows about ${fmtTimes(grow)} × ${fmtTimes(grow)} = ${fmtTimes(grow * grow)} times`;
      api.feedback(`Every pair took ${fmtMs(prev)} ms at n = ${fmtN(r.sizes[k])}. ${why}, so Show me guesses ${fmtTimes(grow * grow)} × ${fmtMs(prev)} ≈ **${fmtGuess(g)} ms** for n = ${fmtN(r.sizes[k + 1])}. Revealing it now…`);
      refresh();
      await sleep(1400);
      if (r !== run || !pending || !pending.byShowMe) return;
      reveal();
    },
  };
};

export default viz;

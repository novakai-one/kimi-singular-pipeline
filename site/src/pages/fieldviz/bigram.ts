// Field 3 — Language models: guess the next letter with a bigram model.
// The heatmap is the whole model: row = current letter, column = next letter,
// brightness = that row's chance (square-root scale so small chances show).
// Pure logic lives in bigram-core.ts (tested in Node).
import { h } from '../../lib/dom';
import { url } from '../../lib/config';
import { button, colours, makeCanvas, onTheme, sleep, type Colours, type Viz } from './kit';
import {
  checkWord, clean, currentChar, DEMO_WORD, lastWord, makeModel, MAX_CHARS, MIN_LETTERS, sample, SURPRISE, TOP, topK,
  type BigramData, type Model,
} from './bigram-core';
import './bigram.css';

const SHOW = (ch: string) => (ch === ' ' ? '␣' : ch);
const PCT = (p: number) => (p >= 0.995 ? '100%' : p >= 0.1 ? `${Math.round(p * 100)}%` : `${(p * 100).toFixed(1)}%`);
const WRITE_N = 80;

// heatmap geometry (logical px)
const W = 520, ML = 50, MT = 40, CW = 17, CH = 15, N = 27;
const H = MT + N * CH + 8;
const DEFAULT_HOVER = 'Rows: current letter. Columns: next letter. ␣ is a space. Point at a cell to read it.';

function hexRgb(hex: string): [number, number, number] {
  const m = hex.replace('#', '');
  const f = m.length === 3 ? m.split('').map((c) => c + c).join('') : m.slice(0, 6);
  const n = parseInt(f, 16);
  return Number.isNaN(n) ? [128, 128, 128] : [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function mix(a: string, b: string, t: number) {
  const A = hexRgb(a), B = hexRgb(b);
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',')})`;
}
const isDark = (c: Colours) => { const [r, g, b] = hexRgb(c.bg); return r + g + b < 3 * 110; };

/** Cell colour for a chance p (square-root scale). */
function ramp(c: Colours, p: number) {
  const t = Math.sqrt(p);
  if (isDark(c)) return t < 0.45 ? mix(c.surface2, '#7a6216', t / 0.45) : mix('#7a6216', c.yellow, (t - 0.45) / 0.55);
  return t < 0.45 ? mix(c.surface2, '#ffd84d', t / 0.45) : mix('#ffd84d', '#f08c00', (t - 0.45) / 0.55);
}

const viz: Viz = (el, api) => {
  const root = h('div', { class: 'bigram' });
  el.append(root);
  root.append(h('div', { class: 'c-muted', style: 'padding:40px;text-align:center' }, 'Loading the letter counts…'));

  let ready: Promise<Model | null>;
  let handle: { showMe(): Promise<void> } | null = null;
  const getJson = <T,>(p: string) => fetch(url(p)).then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json() as Promise<T>; });
  ready = Promise.all([getJson<BigramData>('models/fields/bigram.json'), getJson<string[]>('models/fields/words.json')])
    .then(([data, words]) => { const m = makeModel(data); handle = build(m, new Set(words)); return m; })
    .catch(() => {
      root.replaceChildren(h('div', { class: 'note-building' }, 'The letter counts did not load. Reload the page to try again.'));
      return null;
    });

  function build(model: Model, real: Set<string>) {
    const cv = makeCanvas(W, H, 'A 27 by 27 grid. Each row is a current letter, each column a next letter. Brighter cells are more common pairs.');
    cv.c.style.touchAction = 'manipulation'; // no dragging here, so let phones scroll over the grid
    let hover: [number, number] | null = null;
    /** While "Write 80 letters" runs: the row being read and the cell picked. */
    let writing: { row: number; col: number } | null = null;
    let demoTok = 0, writeTok = 0;
    /** Text that Show me typed; a word inside it doesn't count as the student's. */
    let demoPrefix: string | null = null;

    const input = h('input', {
      type: 'text', class: 'bigram-input', id: 'bigram-input', maxlength: String(MAX_CHARS),
      autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', 'aria-label': 'Type letters here',
      placeholder: 'type letters',
    });
    const hoverLine = h('div', { class: 'viz-caption bigram-hover', 'aria-live': 'polite' }, DEFAULT_HOVER);
    const barsTitle = h('div', { class: 'bigram-bars-title' });
    const bars = h('div', { class: 'bigram-bars' });
    const wordBox = h('div', { class: 'bigram-word', 'aria-live': 'polite' });
    const outLabel = h('div', { class: 'bigram-out-label' });
    const outPre = h('span', { class: 'bigram-out-pre' });
    const outGen = h('span', null);
    const outBox = h('div', { class: 'bigram-out', hidden: true }, outLabel, h('div', { class: 'bigram-out-text' }, outPre, outGen));

    const ix = (ch: string) => Math.max(0, model.alphabet.indexOf(ch));
    const cellX = (j: number) => ML + j * CW;
    const cellY = (i: number) => MT + i * CH;

    function draw() {
      const c = colours();
      const g = cv.g;
      cv.clear();
      const text = input.value;
      const cur = writing ? writing.row : ix(currentChar(text));
      const top = writing ? [] : model.order[cur].slice(0, TOP);
      // cells
      g.fillStyle = c.surface;
      g.fillRect(ML - 1, MT - 1, N * CW + 2, N * CH + 2);
      for (let i = 0; i < N; i++) {
        for (let j = 0; j < N; j++) {
          g.fillStyle = ramp(c, model.probs[i][j]);
          g.fillRect(cellX(j) + 0.5, cellY(i) + 0.5, CW - 1, CH - 1);
        }
      }
      // current row (green = the input letter)
      g.strokeStyle = c.green; g.lineWidth = 2.5;
      g.strokeRect(ML - 2, cellY(cur) - 1, N * CW + 4, CH + 2);
      // top guesses (or the cell being picked while writing)
      g.strokeStyle = c.text; g.lineWidth = 2;
      for (const j of top) g.strokeRect(cellX(j) + 1, cellY(cur) + 1, CW - 2, CH - 2);
      if (writing) g.strokeRect(cellX(writing.col) + 1, cellY(writing.row) + 1, CW - 2, CH - 2);
      if (hover) {
        g.lineWidth = 1.5; g.strokeStyle = c.text;
        g.strokeRect(cellX(hover[1]) + 0.75, cellY(hover[0]) + 0.75, CW - 1.5, CH - 1.5);
      }
      // labels
      // the space (␣) is drawn larger: its glyph is small
      const mono = (wt: string, big = false) => `${wt} ${big ? 16 : 12.5}px JetBrains Mono Variable, ui-monospace, Menlo, Consolas, monospace`;
      g.textAlign = 'center'; g.textBaseline = 'alphabetic';
      for (let j = 0; j < N; j++) {
        const isTop = top.includes(j) || writing?.col === j;
        g.font = mono(isTop ? '800' : '500', j === 0);
        g.fillStyle = isTop ? c.yellow : hover?.[1] === j ? c.text : c.muted;
        g.fillText(SHOW(model.alphabet[j]), cellX(j) + CW / 2, MT - 6);
      }
      g.textAlign = 'right'; g.textBaseline = 'middle';
      for (let i = 0; i < N; i++) {
        const isCur = i === cur;
        g.font = mono(isCur ? '800' : '500', i === 0);
        g.fillStyle = isCur ? c.green : hover?.[0] === i ? c.text : c.muted;
        g.fillText(SHOW(model.alphabet[i]), ML - 6, cellY(i) + CH / 2 + 0.5);
      }
      // axis titles
      g.font = '600 12.5px Inter Variable, system-ui, sans-serif';
      g.fillStyle = c.muted; g.textBaseline = 'alphabetic'; g.textAlign = 'center';
      g.fillText('next letter', ML + (N * CW) / 2, 13);
      g.save(); g.translate(15, MT + (N * CH) / 2); g.rotate(-Math.PI / 2);
      g.fillText('current letter', 0, 0);
      g.restore();
      g.textBaseline = 'alphabetic';
    }

    function renderBars(text: string) {
      const cur = currentChar(text);
      barsTitle.textContent = `Top 3 guesses after ${cur === ' ' ? '␣ (a space)' : `"${cur}"`}`;
      const best = topK(model, cur, TOP);
      bars.replaceChildren(...best.map((b) => h('div', { class: 'bigram-bar' },
        h('span', { class: 'bigram-bar-ch', title: b.ch === ' ' ? 'space' : b.ch }, SHOW(b.ch)),
        h('div', { class: 'bigram-bar-track' }, h('div', { class: 'bigram-bar-fill', style: `width:${(b.p * 100).toFixed(1)}%` })),
        h('span', { class: 'bigram-bar-p' }, PCT(b.p)))));
    }

    function renderWord(text: string) {
      const { word } = lastWord(text);
      if (!word) {
        wordBox.replaceChildren(h('div', { class: 'bigram-word-empty' }, 'Type a word to see the chance of each letter.'));
        return;
      }
      const chk = checkWord(model, word, real);
      wordBox.replaceChildren(...chk.letters.map((l, k) => h('div', {
        class: `bigram-l ${k === 0 ? 'first' : l.surprising ? 'bad' : 'ok'}`,
        title: k === 0 ? 'first letter' : `${PCT(l.p!)} after "${word[k - 1]}"`,
      },
      h('span', { class: 'bigram-l-ch' }, l.ch),
      h('span', { class: 'bigram-l-m' }, k === 0 ? 'first' : l.surprising ? 'rare' : '✓'),
      k === 0 ? null : h('span', { class: 'bigram-l-p' }, PCT(l.p!)))));
    }

    /** Redraw everything; say how the last word is doing. mode 'demo' never wins. */
    function update(mode: 'student' | 'demo' | 'quiet') {
      const text = input.value;
      draw();
      renderBars(text);
      renderWord(text);
      if (mode === 'quiet') return;
      const { word, start } = lastWord(text);
      const chk = checkWord(model, word, real);
      const pre = mode === 'demo' ? 'Show me: ' : '';
      const n = word.length;
      const rareText = () => {
        const k = chk.rarest;
        return `the model gives "${word[k]}" after "${word[k - 1]}" only ${PCT(chk.minP)}`;
      };
      if (n < MIN_LETTERS) {
        api.feedback(`${pre}Type a real word from the plays. Under the box, each letter shows its chance.`);
      } else if (chk.wins) {
        const msg = `**${word}** is a real word, but ${rareText()}. Counting one letter back can't tell a rare pair in a real word from a mistake.`;
        const demoOwned = demoPrefix !== null && text.startsWith(demoPrefix) && start < demoPrefix.length;
        if (mode === 'demo') api.feedback(`Show me typed ${msg} Now type a space and find your own.`);
        else if (demoOwned) api.feedback(`Show me typed **${word}**. Now type your own word.`);
        else api.win(msg);
      } else if (!chk.isReal) {
        api.feedback(`${pre}**${word}** isn't a word in the plays (or it is very rare there). Try a common word.`);
      } else {
        api.feedback(`${pre}**${word}**: every letter has at least a ${Math.round(SURPRISE * 100)}% chance. The model expects this word. Try another.`);
      }
    }

    function stopWriting() { writeTok++; writing = null; }

    input.addEventListener('input', () => {
      demoTok++;
      stopWriting();
      const v = clean(input.value);
      if (v !== input.value) {
        const pos = Math.min(v.length, (input.selectionStart ?? v.length) - (input.value.length - v.length));
        input.value = v;
        try { input.setSelectionRange(pos, pos); } catch { /* not focused */ }
      }
      if (demoPrefix !== null && !v.startsWith(demoPrefix)) demoPrefix = null;
      update('student');
    });

    async function write() {
      demoTok++;
      const my = ++writeTok;
      const text = input.value;
      const start = currentChar(text);
      const out = sample(model, start, WRITE_N, Math.random);
      outLabel.textContent = `${WRITE_N} letters written by the model, starting after ${start === ' ' ? 'a space' : `"${start}"`}:`;
      outPre.textContent = text;
      outGen.textContent = '';
      outBox.hidden = false;
      for (let k = 0; k < out.length; k++) {
        if (my !== writeTok) break;
        writing = { row: ix(k ? out[k - 1] : start), col: ix(out[k]) };
        outGen.textContent = out.slice(0, k + 1);
        draw();
        await sleep(28);
      }
      outGen.textContent = out;
      if (my === writeTok) { writing = null; draw(); }
    }

    function clearBox() {
      demoTok++; stopWriting();
      input.value = ''; demoPrefix = null;
      update('quiet');
    }

    // hover / tap a cell to read it
    const cellAt = (e: PointerEvent): [number, number] | null => {
      const [x, y] = cv.pos(e);
      const j = Math.floor((x - ML) / CW), i = Math.floor((y - MT) / CH);
      return i >= 0 && j >= 0 && i < N && j < N ? [i, j] : null;
    };
    const showCell = (e: PointerEvent) => {
      const cell = cellAt(e);
      if (cell?.[0] === hover?.[0] && cell?.[1] === hover?.[1]) return;
      hover = cell;
      if (cell) {
        const a = model.alphabet[cell[0]], b = model.alphabet[cell[1]];
        const p = model.probs[cell[0]][cell[1]];
        const k = (ch: string) => (ch === ' ' ? 'a space (<span class="bigram-k">␣</span>)' : `<span class="bigram-k">${ch}</span>`);
        hoverLine.innerHTML = `After ${k(a)}, the next letter is ${k(b)} ${PCT(p)} of the time.`;
      } else hoverLine.textContent = DEFAULT_HOVER;
      draw();
    };
    cv.c.addEventListener('pointermove', showCell);
    cv.c.addEventListener('pointerdown', showCell);
    cv.c.addEventListener('pointerleave', () => { hover = null; hoverLine.textContent = DEFAULT_HOVER; draw(); });

    root.replaceChildren(
      cv.c,
      hoverLine,
      h('div', { class: 'bigram-panel' },
        h('div', null,
          h('label', { class: 'bigram-label', for: 'bigram-input' }, 'Type here (letters and spaces)'),
          input,
          barsTitle,
          bars),
        h('div', null,
          h('span', { class: 'bigram-label' }, 'Last word: the chance of each letter'),
          wordBox,
          h('div', { class: 'btn-row bigram-write' },
            button('Write 80 letters', () => { void write(); }, 'btn small primary'),
            button('Clear', clearBox, 'btn small ghost')))),
      outBox,
    );
    update('quiet');
    onTheme(draw);

    return {
      async showMe() {
        const my = ++demoTok;
        stopWriting();
        input.value = ''; demoPrefix = null;
        update('quiet');
        for (const ch of DEMO_WORD) {
          await sleep(400);
          if (my !== demoTok) return;
          input.value += ch;
          update('demo');
        }
        demoPrefix = input.value;
      },
    };
  }

  return {
    async showMe() {
      await ready;
      await handle?.showMe();
    },
  };
};

export default viz;

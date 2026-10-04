// Showpiece B — A tiny language model you can see inside.
// Type a start; the model writes one character at a time. Top-5 bars show its guesses at each step,
// a temperature slider reshapes them, and clicking a character shows which earlier characters it used.
import { mountLayout } from '../../lib/layout';
import { challenge, cue, inShort, predict, problem, why } from '../../lib/blocks';
import { append, clear, h, s } from '../../lib/dom';
import { inline, mdEl } from '../../lib/md';
import { colabUrl, githubUrl, url } from '../../lib/config';
import { Session, buildModel, mulberry32, sampleIndex, softmax, topK, type StepOut, type TinyModel } from './model';
import { CHALLENGE, DEMO, isRambling, isRepetitive } from './metrics';
import './tinylm.css';

const NOTEBOOK = 'notebooks/showpieces/tinylm_retrain.ipynb';
const PRESETS = ['ROMEO:\n', 'First Citizen:\n', 'To be, or not to be', 'The king is '];
const SHARP = 0.5;   // attention challenge: one character gets more than half of a head's attention

interface TrainInfo {
  curve: { step: number; train: number; val: number }[];
  minutes: number; iters: number; batch: number; params: number; characters: number;
  final: { step: number; train: number; val: number };
}

const page = mountLayout({ crumbs: [{ label: 'Showpieces' }, { label: 'A tiny language model' }], wide: true });
page.classList.add('tl');

page.append(
  h('div', { class: 'tl-head' },
    h('div', null,
      h('div', { class: 'eyebrow' }, 'Showpiece · runs in your browser'),
      h('h1', null, 'A tiny language model you can see inside'),
      h('p', { class: 'lede', html: inline('This model read the plays of Shakespeare, one character at a time, and learned to guess the next character. **Give it a start, and watch it write the rest, one guess at a time.**') })),
    inShort(
      'How can a program write text it has never seen?',
      'At every step it gives a score to each of the 65 characters it can write, turns the scores into probabilities, and picks one. Then it repeats, with the new character added to the text.')),
  problem(`
    Your phone suggests the next word while you type. Large language models write whole essays.
    **Both do the same small thing over and over: guess what comes next.** This one is small enough to watch.
  `),
  predict({
    prompt: 'At each step the model gives every character a probability. **If it always takes the most likely one, what will the text look like?**',
    choices: ['Normal sentences', 'It repeats itself', 'Random letters'],
    reveal: '**It repeats itself.** The same text always leads to the same top choice, so the model falls into a loop. The temperature slider below controls how often it takes the top choice; try the lowest setting.',
  }),
);

const loading = h('div', { class: 'tl-loading' }, 'Loading the trained model (about 3 MB)…');
page.append(loading);

const fetchJson = <T,>(p: string): Promise<T> => fetch(url(p)).then((r) => { if (!r.ok) throw new Error(p); return r.json(); });
Promise.all([
  fetchJson<unknown>('models/tinylm/model.json'),
  fetchJson<string[]>('models/tinylm/words.json'),
  fetchJson<TrainInfo>('models/tinylm/train.json'),
]).then(([mj, ws, info]) => build(buildModel(mj), new Set(ws), info))
  .catch((e) => { loading.textContent = `Could not load the model files (${e}). Try reloading the page.`; });

const show = (c: string) => (c === '\n' ? '↵' : c === ' ' ? '␣' : c);
const pct = (p: number) => (p > 0.999 ? '>99.9%' : p < 0.001 ? '<0.1%' : p >= 0.1 ? `${Math.round(p * 100)}%` : `${(p * 100).toFixed(1)}%`);
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;

function build(model: TinyModel, known: Set<string>, info: TrainInfo) {
  loading.remove();
  const V = model.cfg.vocab;
  const MAX_PROMPT = model.cfg.block / 2;

  // ---------------------------------------------------------------- state
  const session = new Session(model);
  let ids: number[] = [];
  let promptLen = 0;
  /** steps[j]: the model's output when it chose character j (from everything before j). */
  let steps: (StepOut & { temp?: number })[] = [];
  let selected: number | null = null;     // a clicked character; null = the next, unwritten one
  let T = 0.8;
  let running = false;
  let stopAsked = false;
  let showing: 'repeat' | 'ramble' | 'attention' | null = null;
  let rand: () => number = Math.random;
  /** True while the text on screen is one complete Write run (scored by the challenges). */
  let scored = false;

  // ---------------------------------------------------------------- panel 1: write
  const promptBox = h('textarea', { class: 'tl-prompt', rows: 2, spellcheck: 'false', 'aria-label': 'The start of the text' });
  promptBox.value = PRESETS[0];
  const promptNote = h('div', { class: 'tl-note' });
  const out = h('div', { class: 'tl-out', 'aria-live': 'off' });
  const stats = h('div', { class: 'tl-stats' });
  const writeBtn = h('button', { class: 'btn primary', type: 'button' }, `Write ${CHALLENGE.minChars} characters`);
  const oneBtn = h('button', { class: 'btn', type: 'button' }, 'One more character');
  const stopBtn = h('button', { class: 'btn', type: 'button', disabled: true }, 'Stop');
  const clearBtn = h('button', { class: 'btn ghost', type: 'button' }, 'Clear');

  // ---------------------------------------------------------------- panel 2: guesses
  const barsTitle = h('div', { class: 'tl-bars-title' });
  const barsContext = h('div', { class: 'tl-context' });
  const bars = h('div', { class: 'tl-bars' });
  const barsNote = h('div', { class: 'tl-note' });
  const prevBtn = h('button', { class: 'btn small', type: 'button', 'aria-label': 'Look at the character before' }, '◀ Earlier');
  const nextBtn = h('button', { class: 'btn small', type: 'button', 'aria-label': 'Look at the character after' }, 'Later ▶');
  const tSlider = h('input', { type: 'range', min: '0.05', max: '2', step: '0.05', value: String(T), 'aria-label': 'Temperature' });
  const tValue = h('span', { class: 'tl-t-value' }, T.toFixed(2));

  // ---------------------------------------------------------------- panel 3: attention
  const layerSel = h('select', { 'aria-label': 'Layer' },
    Array.from({ length: model.cfg.n_layer }, (_, i) => h('option', { value: String(i), selected: i === 2 }, `layer ${i + 1}`)));
  const headSel = h('select', { 'aria-label': 'Head' },
    h('option', { value: '-1' }, 'all heads, averaged'),
    Array.from({ length: model.cfg.n_head }, (_, i) => h('option', { value: String(i), selected: i === 1 }, `head ${i + 1}`)));
  const attNote = h('div', { class: 'tl-note' });

  // ---------------------------------------------------------------- challenges
  const share = Math.round(CHALLENGE.ramble.share * 100);
  const chRepeat = challenge({
    goal: `Make it repeat itself at a temperature of ${CHALLENGE.repeat.minT} or higher: write ${CHALLENGE.minChars} characters in which a piece of ${CHALLENGE.repeat.length} or more characters appears ${CHALLENGE.repeat.times} times.`,
    detail: 'Lower temperatures repeat more easily, so look for the highest one that still does it. Each Write is a new random draw.',
    showMe: () => demo('repeat'),
  });
  const chRamble = challenge({
    goal: `Make it ramble at a temperature of ${CHALLENGE.ramble.maxT} or lower: write ${CHALLENGE.minChars} characters in which at least ${share}% of the words are made up.`,
    detail: 'A made-up word never appears anywhere in the Tiny Shakespeare text. Higher temperatures ramble more easily, so look for the lowest one that still does it.',
    showMe: () => demo('ramble'),
  });
  const chAttention = challenge({
    goal: 'Find a head that gives more than half of its attention to one earlier character.',
    detail: 'Click a written character, then choose a layer and a single head (not the average).',
    showMe: () => demoAttention(),
  });

  const panel = (n: number, label: string, question: string, ...body: (Node | null)[]) =>
    h('section', { class: 'tl-panel' },
      h('div', { class: 'tl-panel-head' }, h('span', { class: 'tl-num' }, String(n)),
        h('div', null, h('div', { class: 'tl-label' }, label), h('h2', null, question))),
      ...body.filter(Boolean) as Node[]);

  page.append(
    h('div', { class: 'tl-grid' },
      panel(1, 'Write', 'What does it write after your start?',
        h('div', { class: 'tl-prompt-row' }, promptBox,
          h('div', { class: 'btn-row tl-presets' }, h('span', { class: 'c-muted', style: 'font-size:13px' }, 'Try:'),
            PRESETS.map((p) => h('button', { class: 'btn small ghost', type: 'button', onclick: () => { promptBox.value = p; restart(); } }, p.replace('\n', ' ↵'))))),
        promptNote,
        h('div', { class: 'btn-row tl-actions' }, writeBtn, oneBtn, stopBtn, clearBtn),
        h('div', { class: 'tl-note', style: 'margin-top:-4px' }, 'Write starts again from your start each time. One more character adds to the text on screen.'),
        out,
        stats,
        h('div', { class: 'tl-key' },
          h('span', null, h('i', { class: 'k-prompt' }), 'your start'),
          h('span', null, h('i', { class: 'k-gen' }), 'written by the model'),
          h('span', null, h('i', { class: 'k-sel' }), 'the character you clicked'),
          h('span', null, h('i', { class: 'k-att' }), 'share of attention (brighter green = bigger)'))),
      h('div', { class: 'tl-side' },
        panel(2, 'Guesses', 'What could come next?',
          barsTitle, barsContext, bars, barsNote,
          h('div', { class: 'btn-row', style: 'margin-top:8px' }, prevBtn, nextBtn),
          h('div', { class: 'tl-temp' },
            h('label', null, 'Temperature ', tValue), tSlider,
            h('div', { class: 'tl-temp-ends' }, h('span', null, '0.05: top guess almost always'), h('span', null, '2: guesses even out')),
            h('div', { class: 'tl-note', html: inline('The temperature divides every score before the scores become probabilities. Below 1, the top guess gets even more likely; above 1, the probabilities even out.') }))),
        panel(3, 'Attention', 'Which earlier characters did it use?',
          h('div', { class: 'tl-note', style: 'margin:0 0 8px' }, `The model has ${model.cfg.n_layer} layers, one after another. In each layer, ${model.cfg.n_head} attention heads each share out their attention over the earlier characters; a head's shares add up to 100%.`),
          h('div', { class: 'btn-row' }, layerSel, headSel),
          attNote))),
    h('div', { class: 'grid-3 tl-challenges' }, chRepeat.el, chRamble.el, chAttention.el),
  );

  // ---------------------------------------------------------------- text and model
  function cleanPrompt(): string {
    const raw = promptBox.value;
    const allowed = [...raw].filter((c) => model.index.has(c)).join('');
    const kept = allowed.slice(-MAX_PROMPT);
    const dropped = [...new Set([...raw].filter((c) => !model.index.has(c)))];
    const notes: string[] = [];
    if (dropped.length) notes.push(`Left out ${dropped.map((c) => `"${c}"`).join(' ')}: the model only knows the ${V} characters in its training text.`);
    if (allowed.length > MAX_PROMPT) notes.push(`Only the last ${MAX_PROMPT} characters of your start are used.`);
    promptNote.textContent = notes.join(' ');
    return kept || PRESETS[0];
  }

  function restart() {
    stopAsked = true;
    scored = false;
    const text = cleanPrompt();
    session.reset();
    ids = []; steps = []; selected = null;
    for (const c of text) {
      const id = model.index.get(c)!;
      ids.push(id);
      steps[ids.length] = session.push(id);
    }
    promptLen = ids.length;
    clear(out);
    ids.forEach((id, i) => out.append(charSpan(id, i)));
    renderAll();
  }

  function charSpan(id: number, i: number) {
    const c = model.chars[id];
    const span = h('span', { class: 'tl-c' + (i < promptLen ? ' p' : '') + (c === '\n' ? ' nl' : ''), 'data-i': String(i) },
      c === '\n' ? '↵\n' : c);
    span.addEventListener('click', () => { selected = selected === i ? null : i; renderAll(); checkAttention(); });
    return span;
  }

  function addChar() {
    const j = ids.length;                            // the position being written
    const step = steps[j];
    const p = softmax(step.logits, T);
    const id = sampleIndex(p, rand());
    step.temp = T;
    ids.push(id);
    steps[ids.length] = session.push(id);
    out.append(charSpan(id, j));
  }

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  async function write(n: number) {
    if (running) return;
    restart();
    running = true; stopAsked = false;
    writeBtn.disabled = true; oneBtn.disabled = true; stopBtn.disabled = false;
    for (let k = 0; k < n && !stopAsked; k++) {
      addChar();
      if (k % 2 === 1 || k === n - 1) { renderAll(); out.scrollTop = out.scrollHeight; await sleep(16); }
    }
    running = false;
    rand = Math.random;
    writeBtn.disabled = false; oneBtn.disabled = false; stopBtn.disabled = true;
    scored = generated().length >= n;
    renderAll();
    checkChallenges();
  }

  // ---------------------------------------------------------------- rendering
  function renderAll() {
    renderBars();
    renderAttention();
    renderStats();
  }

  function renderBars() {
    const j = selected ?? ids.length;
    clear(bars);
    prevBtn.disabled = j <= 0;
    nextBtn.disabled = selected === null;
    if (j === 0) {
      barsTitle.textContent = 'Character 1';
      barsContext.replaceChildren();
      barsNote.textContent = 'The first character has nothing before it, so the model makes no guess for it.';
      return;
    }
    const step = steps[j];
    if (!step) return;
    const p = softmax(step.logits, T);
    const top = topK(p, 5);
    const chosen = j < ids.length ? ids[j] : null;
    const before = ids.slice(Math.max(0, j - 18), j).map((i) => model.chars[i]).join('');
    barsTitle.textContent = j >= ids.length ? 'The next character' : j < promptLen ? `Character ${j + 1} (you typed it)` : `Character ${j + 1}, as it was chosen`;
    barsContext.replaceChildren(h('span', { class: 'tl-ctx-text' }, before.replace(/\n/g, '↵')), h('span', { class: 'tl-ctx-gap' }, chosen === null ? '?' : show(model.chars[chosen])));
    const rows = top.slice();
    const extra = chosen !== null && !rows.some((r) => r.i === chosen);
    if (extra) rows.push({ i: chosen!, p: p[chosen!] });
    for (const r of rows) {
      bars.append(h('div', { class: 'tl-bar-row' + (r.i === chosen ? ' chosen' : '') },
        h('span', { class: 'tl-bar-c' }, show(model.chars[r.i])),
        h('span', { class: 'tl-bar-track' }, h('span', { class: 'tl-bar', style: `width:${(r.p * 100).toFixed(1)}%` })),
        h('span', { class: 'tl-bar-p' }, pct(r.p))));
    }
    const used = j < ids.length && j >= promptLen ? steps[j]?.temp : undefined;
    const notes: string[] = [];
    if (j < promptLen && j < ids.length) notes.push(`You typed this character. The bars show what the model would have guessed, at temperature ${T.toFixed(2)}.`);
    else if (chosen !== null) {
      notes.push(`The yellow row was picked. Bars are shown at temperature ${T.toFixed(2)}${used !== undefined && Math.abs(used - T) > 1e-9 ? `; it was written at ${used.toFixed(2)}` : ''}.`);
      if (extra) notes.push('The last row is the picked character: it was not in the top 5.');
    } else notes.push(`The five most likely of ${V} characters, at temperature ${T.toFixed(2)}. Move the slider and watch them change.`);
    barsNote.innerHTML = inline(notes.join(' '));
  }

  function attentionOf(j: number, layer: number, head: number) {
    const heads = steps[j].att[layer];
    const n = heads[0].length;
    const w = new Float32Array(n);
    if (head < 0) heads.forEach((hw) => hw.forEach((v, t) => { w[t] += v / heads.length; }));
    else w.set(heads[head]);
    let top = 0;
    w.forEach((v, t) => { if (v > w[top]) top = t; });
    return { w, top, start: steps[j].windowStart };
  }

  function renderAttention() {
    const spans = out.querySelectorAll<HTMLElement>('.tl-c');
    spans.forEach((sp) => { sp.classList.remove('sel', 'hot'); sp.style.removeProperty('--att'); });
    if (selected === null) {
      attNote.innerHTML = inline('**Click any character in panel 1** (or use Earlier and Later in panel 2). The characters it used light up.');
      return;
    }
    const j = selected;
    spans[j]?.classList.add('sel');
    if (j === 0) { attNote.textContent = 'The first character has nothing before it to look at.'; return; }
    const layer = Number(layerSel.value), head = Number(headSel.value);
    const { w, top, start } = attentionOf(j, layer, head);
    w.forEach((v, t) => {
      const r = Math.sqrt(v);                     // brightness shows the real share (square root, so small shares still show)
      spans[start + t]?.style.setProperty('--att', r.toFixed(3));
      spans[start + t]?.classList.toggle('hot', r > 0.6);
    });
    const absTop = start + top;
    const back = j - absTop;
    attNote.innerHTML = inline(`To choose character ${j + 1}, layer ${layer + 1} (${head < 0 ? 'all heads averaged' : `head ${head + 1}`}) gave its biggest share, **${pct(w[top])}**, to "${show(model.chars[ids[absTop]])}", ${back === 1 ? 'the character right before it' : `${plural(back, 'character')} back`}.`
      + (start > 0 ? ` It can only see the last ${w.length} characters.` : ''));
  }

  function generated() { return ids.slice(promptLen).map((i) => model.chars[i]).join(''); }

  function runTemps() {
    const ts = steps.slice(promptLen, ids.length).map((st) => st?.temp).filter((v): v is number => v !== undefined);
    return { min: Math.min(...ts), max: Math.max(...ts) };
  }

  function renderStats() {
    const g = generated();
    if (!g.length) { stats.textContent = 'Nothing written yet. Press Write.'; return; }
    const rep = isRepetitive(g), ram = isRambling(g, known);
    stats.replaceChildren(
      h('span', null, `${g.length} characters written`),
      h('span', null, rep.piece ? `longest piece seen ${rep.count} times: ${rep.piece.length} characters` : 'no piece of 8+ characters appears 3 times'),
      h('span', null, `made-up words: ${ram.unknown} of ${ram.total} (${ram.total ? Math.round(ram.share * 100) : 0}%)`));
  }

  function checkChallenges() {
    if (!scored) return;
    const g = generated();
    const { min, max } = runTemps();
    if (Math.abs(max - min) > 1e-9) {
      if (!showing) chRepeat.feedback('The temperature changed during this run. Set it first, then press Write.');
      showing = null;
      return;
    }
    const t = min;
    const rep = isRepetitive(g), ram = isRambling(g, known);
    const reason = {
      repeat: 'At a low temperature the top guess wins almost every time, so the same text leads to the same text again.',
      ramble: 'At a high temperature the probabilities even out, so unlikely characters get picked and words fall apart.',
    };
    const repMsg = `At temperature ${t.toFixed(2)}, "${rep.piece.replace(/\n/g, '↵')}" (${rep.piece.length} characters) appears ${rep.count} times.`;
    const ramMsg = `At temperature ${t.toFixed(2)}, ${ram.unknown} of ${ram.total} words are made up, like ${ram.examples.slice(0, 3).map((w) => `"${w}"`).join(', ')}.`;
    if (showing === 'repeat') chRepeat.feedback(`${repMsg} ${reason.repeat} Now find the highest temperature where you can make it happen.`);
    else if (showing === 'ramble') chRamble.feedback(`${ramMsg} ${reason.ramble} Now find the lowest temperature where you can make it happen.`);
    else {
      if (rep.win && t >= CHALLENGE.repeat.minT) chRepeat.win(`${repMsg} ${reason.repeat}`);
      else if (rep.win) chRepeat.feedback(`${repMsg} That counts at ${CHALLENGE.repeat.minT} or higher. Raise the temperature and try again.`);
      else chRepeat.feedback(`At temperature ${t.toFixed(2)}, the longest piece seen ${CHALLENGE.repeat.times} times has ${rep.piece.length} characters. The goal is ${CHALLENGE.repeat.length}.`);
      if (ram.win && t <= CHALLENGE.ramble.maxT) chRamble.win(`${ramMsg} ${reason.ramble}`);
      else if (ram.win) chRamble.feedback(`${ramMsg} That counts at ${CHALLENGE.ramble.maxT} or lower. Lower the temperature and try again.`);
      else chRamble.feedback(`At temperature ${t.toFixed(2)}, ${Math.round(ram.share * 100)}% of the words are made up. The goal is ${share}%.`);
    }
    showing = null;
  }

  function checkAttention() {
    if (selected === null || selected === 0 || showing === 'attention') return;
    const head = Number(headSel.value);
    if (head < 0) return;
    const { w, top, start } = attentionOf(selected, Number(layerSel.value), head);
    if (w[top] > SHARP) {
      const back = selected - (start + top);
      chAttention.win(`Layer ${Number(layerSel.value) + 1}, head ${head + 1} gave ${pct(w[top])} of its attention to one character, ${back === 1 ? 'the one right before' : `${plural(back, 'character')} back`}. Some heads specialise like this; others spread their attention over a whole word or line.`);
    }
  }

  async function demo(kind: 'repeat' | 'ramble') {
    stopAsked = true;
    while (running) await sleep(20);
    showing = kind;
    promptBox.value = PRESETS[0];
    setT(DEMO[kind].T);
    rand = mulberry32(DEMO[kind].seed);
    try { await write(CHALLENGE.minChars); } finally { rand = Math.random; }
  }

  function demoAttention() {
    if (generated().length < 20) { chAttention.feedback('Write some text first, then press Show me again.'); return; }
    let best = { j: 1, layer: 0, head: 0, v: 0 };
    for (let j = promptLen; j < ids.length; j++)
      for (let l = 0; l < model.cfg.n_layer; l++)
        for (let hh = 0; hh < model.cfg.n_head; hh++) {
          const { w, top } = attentionOf(j, l, hh);
          if (w[top] > best.v) best = { j, layer: l, head: hh, v: w[top] };
        }
    showing = 'attention';
    layerSel.value = String(best.layer); headSel.value = String(best.head); selected = best.j;
    renderAll();
    out.querySelectorAll('.tl-c')[best.j]?.scrollIntoView({ block: 'nearest' });
    chAttention.feedback(`Layer ${best.layer + 1}, head ${best.head + 1}, at character ${best.j + 1}: ${pct(best.v)} of its attention on one character. Now find another one yourself.`);
    showing = null;
  }

  function setT(v: number) {
    T = v; tSlider.value = String(v); tValue.textContent = v.toFixed(2);
    renderBars();
  }

  // ---------------------------------------------------------------- wiring
  writeBtn.addEventListener('click', () => { void write(CHALLENGE.minChars); });
  oneBtn.addEventListener('click', () => {
    if (running) return;
    if (cleanPrompt() !== ids.slice(0, promptLen).map((i) => model.chars[i]).join('')) restart();
    scored = false;
    addChar(); selected = null; renderAll();
  });
  stopBtn.addEventListener('click', () => { stopAsked = true; });
  clearBtn.addEventListener('click', () => restart());
  tSlider.addEventListener('input', () => setT(Number(tSlider.value)));
  layerSel.addEventListener('change', () => { renderAttention(); checkAttention(); });
  headSel.addEventListener('change', () => { renderAttention(); checkAttention(); });
  prevBtn.addEventListener('click', () => { const j = selected ?? ids.length; selected = Math.max(0, j - 1); renderAll(); checkAttention(); });
  nextBtn.addEventListener('click', () => { if (selected === null) return; selected = selected + 1 >= ids.length ? null : selected + 1; renderAll(); checkAttention(); });
  promptBox.addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) writeBtn.click(); });

  restart();
  explain(model, info);

  // test hooks for tests/tinylm-check.mjs
  (window as unknown as Record<string, unknown>).__tinylm = {
    setT, restart, write: (n: number) => write(n), generated, select: (i: number) => { selected = i; renderAll(); checkAttention(); },
    ids: () => ids.slice(), promptLen: () => promptLen,
    setAttention: (layer: number, head: number) => { layerSel.value = String(layer); headSel.value = String(head); renderAttention(); checkAttention(); },
    /** Seed the next Write (tests only), to play a known run without using Show me. */
    seedNext: (seed: number) => { const r = mulberry32(seed); rand = r; },
    sharpest: () => {
      let best = { j: 1, layer: 0, head: 0, v: 0 };
      for (let j = promptLen; j < ids.length; j++)
        for (let l = 0; l < model.cfg.n_layer; l++)
          for (let hh = 0; hh < model.cfg.n_head; hh++) {
            const { w, top } = attentionOf(j, l, hh);
            if (w[top] > best.v) best = { j, layer: l, head: hh, v: w[top] };
          }
      return best;
    },
  };
}

// ---------------------------------------------------------------- explanation, training, notebook
function lossChart(info: TrainInfo) {
  const W = 540, H = 250, L = 56, B = 44, R = 30, Tp = 14;
  const maxStep = info.curve[info.curve.length - 1].step;
  const yMax = Math.ceil(Math.max(...info.curve.map((c) => c.val)) * 2) / 2;
  const yMin = Math.max(0, Math.floor(Math.min(...info.curve.map((c) => c.train)) * 2) / 2 - 0.5);
  const x = (st: number) => L + (st / maxStep) * (W - L - R);
  const y = (v: number) => Tp + (1 - (v - yMin) / (yMax - yMin)) * (H - Tp - B);
  const path = (key: 'train' | 'val') => info.curve.map((c, i) => `${i ? 'L' : 'M'}${x(c.step).toFixed(1)},${y(Math.min(c[key], yMax)).toFixed(1)}`).join(' ');
  const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'tl-loss', role: 'img', 'aria-label': 'Loss against training step, for training text and held-out text' });
  for (let v = yMin; v <= yMax + 1e-9; v += 0.5) {
    svg.append(s('line', { x1: L, x2: W - R, y1: y(v), y2: y(v), class: 'tl-grid-line' }),
      s('text', { x: L - 8, y: y(v) + 5, 'text-anchor': 'end', class: 'tl-axis' }, v.toFixed(1)));
  }
  for (const st of [0, Math.round(maxStep / 2), maxStep]) svg.append(s('text', { x: x(st), y: H - B + 20, 'text-anchor': st === maxStep ? 'end' : st === 0 ? 'start' : 'middle', class: 'tl-axis' }, st.toLocaleString('en')));
  svg.append(s('text', { x: (L + W - R) / 2, y: H - 6, 'text-anchor': 'middle', class: 'tl-axis' }, 'training step'));
  svg.append(s('text', { x: 14, y: (Tp + H - B) / 2, 'text-anchor': 'middle', class: 'tl-axis', transform: `rotate(-90 14 ${(Tp + H - B) / 2})` }, 'loss'));
  svg.append(s('path', { d: path('train'), class: 'tl-line-train' }), s('path', { d: path('val'), class: 'tl-line-val' }));
  const last = info.curve[info.curve.length - 1];
  svg.append(s('text', { x: x(last.step) - 4, y: y(last.val) - 10, 'text-anchor': 'end', class: 'tl-lab-val' }, `held-out text ${last.val.toFixed(2)}`),
    s('text', { x: x(last.step) - 4, y: y(last.train) + 20, 'text-anchor': 'end', class: 'tl-lab-train' }, `training text ${last.train.toFixed(2)}`));
  return svg;
}

function lossCaption(info: TrainInfo) {
  const best = info.curve.reduce((a, c) => (c.val < a.val ? c : a));
  const base = 'Loss falls as training goes on. Held-out text is text the model never trained on.';
  return info.final.val - best.val > 0.02
    ? `${base} After about step ${best.step.toLocaleString('en')}, the held-out loss stops falling. The training loss keeps going down: the model starts to memorise its training text.`
    : base;
}

function explain(model: TinyModel, info: TrainInfo) {
  const seen = Math.round((info.iters * info.batch * model.cfg.block) / 1e6);
  const step = (n: number, label: string, text: string) =>
    h('section', { class: 'tl-step' }, h('div', { class: 'tl-step-label' }, h('span', { class: 'tl-num small' }, String(n)), label), mdEl(text, ''));
  append(page, [
    h('h2', null, 'What is going on?'),
    h('div', { class: 'grid-2 tl-explain' },
      step(1, 'What you see', `
        Each new character comes from the bars in panel 2. The model gives each of the ${model.cfg.vocab} characters a score,
        turns the scores into probabilities, and picks one at random, in proportion to its probability.
        At a low temperature the top bar takes almost everything. At a high temperature the bars even out.
      `),
      step(2, 'What it means', `
        The model has no plan for the sentence. **Every character is one guess, based on the characters before it.**
        Spelling, line breaks and speaker names all come from those guesses. The temperature sets how often a guess other than the top one is picked.
      `),
      step(3, 'What it\'s called', `
        This is a *character-level language model*. Its design is a *transformer*: ${model.cfg.n_layer} layers, each with ${model.cfg.n_head} *attention heads*
        that share out attention over the earlier characters. Picking at random from the probabilities is *sampling*;
        always picking the top one is *greedy decoding*. The dial is the *temperature*.
      `),
      step(4, 'The formula', `
        Each character $i$ gets a score $z_i$. At temperature $T$, its probability is
        $$p_i = \\frac{e^{z_i / T}}{\\sum_j e^{z_j / T}}$$
        Dividing by a small $T$ stretches the gaps between scores, so the top score wins almost always. A large $T$ shrinks the gaps.
      `)),
    why('Large language models use this same loop: score every possible next piece, pick one, repeat. They are bigger (billions of weights, pieces of words instead of characters), and temperature works the same way in them.'),
    h('h2', null, 'How was it trained?'),
    h('div', { class: 'tl-train' },
      h('div', null,
        mdEl(`
          - Weights: ${info.params.toLocaleString('en')} numbers inside the model, all starting small and random. Training adjusts them.
          - Text: ${info.characters.toLocaleString('en')} characters of Shakespeare's plays (*Tiny Shakespeare*, public domain). The last 10% was held out to test on.
          - Training: ${info.iters.toLocaleString('en')} steps of guessing next characters, about ${seen} million guesses in all, on a 4-core CPU in ${Math.round(info.minutes)} minutes.
          - Loss: $-\\ln p$, where $p$ is the probability the model gave the real next character ($\\ln$ is the natural logarithm). An even guess among ${model.cfg.vocab} characters scores $\\ln ${model.cfg.vocab} \\approx 4.17$. **On held-out text, the loss ended at ${info.final.val.toFixed(2)}.**
        `, ''),
        h('div', { class: 'btn-row', style: 'margin-top:10px' },
          h('a', { class: 'btn primary', href: colabUrl(NOTEBOOK), target: '_blank', rel: 'noopener' }, 'Retrain it in Colab'),
          h('a', { class: 'btn', href: githubUrl(NOTEBOOK), target: '_blank', rel: 'noopener' }, 'View the notebook on GitHub'),
          h('a', { class: 'btn ghost', href: url('fields/language-models.html') }, 'Field 3: Language models →'))),
      h('figure', { class: 'card tl-loss-card' }, lossChart(info), h('figcaption', { class: 'c-muted' }, lossCaption(info)))),
    cue([
      ['"generate text one piece at a time"', 'a language model: score, pick, repeat'],
      ['"make the output more varied" or "more predictable"', 'raise or lower the temperature'],
      ['"which earlier words does the model use?"', 'look at the attention shares'],
    ]),
  ]);
}

// Showpiece B — A tiny language model you can see inside.
// Type a start; the model writes one character at a time. Top-5 bars show its guesses at each step,
// a temperature slider reshapes them, and clicking a character shows which earlier characters it looked at.
import { mountLayout } from '../../lib/layout';
import { challenge, cue, inShort, predict, problem, why } from '../../lib/blocks';
import { append, clear, h, s } from '../../lib/dom';
import { inline, md, mdEl } from '../../lib/md';
import { colabUrl, githubUrl, url } from '../../lib/config';
import { Session, buildModel, sampleIndex, softmax, topK, type StepOut, type TinyModel } from './model';
import { CHALLENGE, isRambling, isRepetitive } from './metrics';
import './tinylm.css';

const NOTEBOOK = 'notebooks/showpieces/tinylm_retrain.ipynb';
const PRESETS = ['ROMEO:\n', 'First Citizen:\n', 'To be, or not to be', 'The king is '];

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
      'At every step it scores each of the 65 characters it can write, turns the scores into probabilities, and picks one. Then it repeats, with the new character added to the text.')),
  problem(`
    Your phone suggests the next word while you type. Large language models write whole essays.
    **Both do the same small thing over and over: guess what comes next.** This one is small enough to watch.
  `),
  predict({
    prompt: 'At each step the model gives every character a probability. **If it always takes the most likely one, what will the text look like?**',
    choices: ['Normal sentences', 'It repeats itself', 'Random letters'],
    reveal: '**It repeats itself.** The same text always leads to the same top choice, so the model falls into a loop. Set the temperature to 0.05 below and press Write to check.',
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

function build(model: TinyModel, known: Set<string>, info: TrainInfo) {
  loading.remove();
  const V = model.cfg.vocab;

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
  let showing: 'repeat' | 'ramble' | null = null;

  // ---------------------------------------------------------------- panel 1: write
  const promptBox = h('textarea', { class: 'tl-prompt', rows: 2, spellcheck: 'false', 'aria-label': 'The start of the text' });
  promptBox.value = PRESETS[0];
  const promptNote = h('div', { class: 'tl-note' });
  const out = h('div', { class: 'tl-out', 'aria-live': 'off' });
  const stats = h('div', { class: 'tl-stats' });
  const writeBtn = h('button', { class: 'btn primary', type: 'button' }, `Write ${CHALLENGE.minChars} characters`);
  const oneBtn = h('button', { class: 'btn', type: 'button' }, 'One more character');
  const stopBtn = h('button', { class: 'btn', type: 'button', disabled: true }, 'Stop');
  const againBtn = h('button', { class: 'btn ghost', type: 'button' }, 'Start again from the prompt');

  // ---------------------------------------------------------------- panel 2: guesses
  const barsTitle = h('div', { class: 'tl-bars-title' });
  const barsContext = h('div', { class: 'tl-context' });
  const bars = h('div', { class: 'tl-bars' });
  const barsNote = h('div', { class: 'tl-note' });
  const tSlider = h('input', { type: 'range', min: '0.05', max: '2', step: '0.05', value: String(T), 'aria-label': 'Temperature' });
  const tValue = h('span', { class: 'tl-t-value' }, T.toFixed(2));

  // ---------------------------------------------------------------- panel 3: attention
  const layerSel = h('select', { 'aria-label': 'Layer' },
    Array.from({ length: model.cfg.n_layer }, (_, i) => h('option', { value: String(i), selected: i === 0 }, `layer ${i + 1}`)));
  const headSel = h('select', { 'aria-label': 'Head' },
    h('option', { value: '-1' }, 'all heads, averaged'),
    Array.from({ length: model.cfg.n_head }, (_, i) => h('option', { value: String(i) }, `head ${i + 1}`)));
  const attNote = h('div', { class: 'tl-note' });

  // ---------------------------------------------------------------- challenges
  const chRepeat = challenge({
    goal: `Make it repeat itself: write ${CHALLENGE.minChars} characters in which a piece of ${CHALLENGE.repeat.length} or more characters appears ${CHALLENGE.repeat.times} times.`,
    detail: 'Use the temperature slider, then press Write.',
    showMe: () => demo('repeat'),
  });
  const chRamble = challenge({
    goal: `Now make it ramble: write ${CHALLENGE.minChars} characters in which at least ${Math.round(CHALLENGE.ramble.share * 100)}% of the words are made up.`,
    detail: 'A made-up word is one that never appears in the 1.1 million characters the model learned from.',
    showMe: () => demo('ramble'),
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
        h('div', { class: 'btn-row tl-actions' }, writeBtn, oneBtn, stopBtn, againBtn),
        out,
        stats,
        h('div', { class: 'tl-key' },
          h('span', null, h('i', { class: 'k-prompt' }), 'your start'),
          h('span', null, h('i', { class: 'k-gen' }), 'written by the model'),
          h('span', null, h('i', { class: 'k-sel' }), 'the character you clicked'),
          h('span', null, h('i', { class: 'k-att' }), 'looked at (darker = more)'))),
      h('div', { class: 'tl-side' },
        panel(2, 'Guesses', 'What could come next?',
          barsTitle, barsContext, bars, barsNote,
          h('div', { class: 'tl-temp' },
            h('label', null, 'Temperature ', tValue), tSlider,
            h('div', { class: 'tl-temp-ends' }, h('span', null, '0.05: safest guess'), h('span', null, '2: wild guesses')))),
        panel(3, 'Attention', 'Which earlier characters did it look at?',
          h('div', { class: 'btn-row' }, layerSel, headSel),
          attNote))),
    h('div', { class: 'grid-2 tl-challenges' }, chRepeat.el, chRamble.el),
  );

  // ---------------------------------------------------------------- text and model
  function cleanPrompt(): string {
    const raw = promptBox.value;
    const kept = [...raw].filter((c) => model.index.has(c)).join('').slice(-model.cfg.block / 2);
    const dropped = [...new Set([...raw].filter((c) => !model.index.has(c)))];
    promptNote.textContent = dropped.length
      ? `Left out ${dropped.map((c) => `"${c}"`).join(' ')}: the model only knows the ${V} characters in its training text.`
      : '';
    return kept || PRESETS[0];
  }

  function restart() {
    stopAsked = true;
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
    span.addEventListener('click', () => { selected = selected === i ? null : i; renderAll(); });
    return span;
  }

  function addChar() {
    const j = ids.length;                            // the position being written
    const step = steps[j];
    const p = softmax(step.logits, T);
    const id = sampleIndex(p, Math.random());
    step.temp = T;
    ids.push(id);
    steps[ids.length] = session.push(id);
    out.append(charSpan(id, j));
  }

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  async function write(n: number) {
    if (running) return;
    running = true; stopAsked = false;
    writeBtn.disabled = true; oneBtn.disabled = true; stopBtn.disabled = false;
    selected = null;
    for (let k = 0; k < n && !stopAsked; k++) {
      addChar();
      if (k % 2 === 1 || k === n - 1) { renderAll(); out.scrollTop = out.scrollHeight; await sleep(16); }
    }
    running = false;
    writeBtn.disabled = false; oneBtn.disabled = false; stopBtn.disabled = true;
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
    const step = steps[Math.max(1, j)];
    clear(bars);
    if (!step) return;
    const p = softmax(step.logits, T);
    const top = topK(p, 5);
    const chosen = j < ids.length ? ids[j] : null;
    const before = model.chars.length ? ids.slice(Math.max(0, j - 18), j).map((i) => model.chars[i]).join('') : '';
    barsTitle.textContent = j >= ids.length ? 'The next character' : j < promptLen ? `Character ${j + 1} (you typed it)` : `Character ${j + 1}, as it was chosen`;
    barsContext.replaceChildren(h('span', { class: 'tl-ctx-text' }, before.replace(/\n/g, '↵')), h('span', { class: 'tl-ctx-gap' }, chosen === null ? '?' : show(model.chars[chosen])));
    const rows = top.slice();
    if (chosen !== null && !rows.some((r) => r.i === chosen)) rows.push({ i: chosen, p: p[chosen] });
    for (const r of rows) {
      const isChosen = r.i === chosen;
      bars.append(h('div', { class: 'tl-bar-row' + (isChosen ? ' chosen' : '') },
        h('span', { class: 'tl-bar-c' }, show(model.chars[r.i])),
        h('span', { class: 'tl-bar-track' }, h('span', { class: 'tl-bar', style: `width:${(r.p * 100).toFixed(1)}%` })),
        h('span', { class: 'tl-bar-p' }, pct(r.p))));
    }
    const used = j < ids.length && j >= promptLen ? steps[j]?.temp : undefined;
    barsNote.innerHTML = inline(j < promptLen && j < ids.length
      ? `You typed this character. The bars show what the model would have guessed, at temperature ${T.toFixed(2)}.`
      : chosen !== null
        ? `The yellow row was picked. Bars are shown at temperature ${T.toFixed(2)}${used !== undefined && Math.abs(used - T) > 1e-9 ? `; it was written at ${used.toFixed(2)}` : ''}.`
        : `Five most likely of ${V} characters, at temperature ${T.toFixed(2)}. Move the slider and watch them change.`);
  }

  function renderAttention() {
    const spans = out.querySelectorAll<HTMLElement>('.tl-c');
    spans.forEach((sp) => { sp.classList.remove('sel', 'hot'); sp.style.removeProperty('--att'); });
    if (selected === null) {
      attNote.innerHTML = inline('**Click any character in panel 1.** The characters it looked at light up. Each layer has 4 heads; each head can look at different places.');
      return;
    }
    const j = selected;
    spans[j]?.classList.add('sel');
    if (j === 0) { attNote.textContent = 'The first character has nothing before it to look at.'; return; }
    const step = steps[j];
    const layer = Number(layerSel.value), head = Number(headSel.value);
    const heads = step.att[layer];
    const n = heads[0].length;
    const w = new Float32Array(n);
    if (head < 0) heads.forEach((hw) => hw.forEach((v, t) => { w[t] += v / heads.length; }));
    else w.set(heads[head]);
    const max = Math.max(...w);
    let topT = 0;
    w.forEach((v, t) => {
      if (v > w[topT]) topT = t;
      const abs = step.windowStart + t;
      const r = Math.min(1, v / max);
      spans[abs]?.style.setProperty('--att', r.toFixed(3));
      spans[abs]?.classList.toggle('hot', r > 0.5);
    });
    const absTop = step.windowStart + topT;
    attNote.innerHTML = inline(`To choose character ${j + 1}, layer ${layer + 1} (${head < 0 ? 'all heads' : `head ${head + 1}`}) looked hardest at **"${show(model.chars[ids[absTop]])}"**, ${j - 1 - absTop === 0 ? 'the character right before it' : `${j - 1 - absTop} characters before that`} (${pct(w[topT])} of its attention).`
      + (step.windowStart > 0 ? ` It can see the last ${n} characters only.` : ''));
  }

  function generated() { return ids.slice(promptLen).map((i) => model.chars[i]).join(''); }

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
    const g = generated();
    const rep = isRepetitive(g), ram = isRambling(g, known);
    if (g.length < CHALLENGE.minChars) return;
    const repMsg = `At temperature ${T.toFixed(2)}, "${rep.piece.replace(/\n/g, '↵')}" (${rep.piece.length} characters) appears ${rep.count} times.`;
    const ramMsg = `At temperature ${T.toFixed(2)}, ${ram.unknown} of ${ram.total} words are made up, like ${ram.examples.slice(0, 3).map((w) => `"${w}"`).join(', ')}.`;
    if (rep.win) {
      if (showing === 'repeat') chRepeat.feedback(repMsg + ' Now try it yourself.');
      else chRepeat.win(repMsg + ' A low temperature makes the top guess win almost every time, so the same text leads to the same text again.');
    } else if (showing !== 'ramble') chRepeat.feedback(`Longest piece seen ${CHALLENGE.repeat.times} times: ${rep.piece.length} characters. The goal is ${CHALLENGE.repeat.length}.`);
    if (ram.win) {
      if (showing === 'ramble') chRamble.feedback(ramMsg + ' Now try it yourself.');
      else chRamble.win(ramMsg + ' A high temperature flattens the probabilities, so unlikely characters get picked and words fall apart.');
    } else if (showing !== 'repeat') chRamble.feedback(`Made-up words: ${Math.round(ram.share * 100)}%. The goal is at least ${Math.round(CHALLENGE.ramble.share * 100)}%.`);
    showing = null;
  }

  async function demo(kind: 'repeat' | 'ramble') {
    stopAsked = true;
    while (running) await sleep(20);
    showing = kind;
    setT(kind === 'repeat' ? 0.05 : 2);
    restart();
    await write(CHALLENGE.minChars);
  }

  function setT(v: number) {
    T = v; tSlider.value = String(v); tValue.textContent = v.toFixed(2);
    renderBars();
  }

  // ---------------------------------------------------------------- wiring
  writeBtn.addEventListener('click', () => {
    if (cleanPrompt() !== ids.slice(0, promptLen).map((i) => model.chars[i]).join('')) restart();
    void write(CHALLENGE.minChars);
  });
  oneBtn.addEventListener('click', () => {
    if (running) return;
    if (cleanPrompt() !== ids.slice(0, promptLen).map((i) => model.chars[i]).join('')) restart();
    addChar(); selected = null; renderAll();
  });
  stopBtn.addEventListener('click', () => { stopAsked = true; });
  againBtn.addEventListener('click', () => restart());
  tSlider.addEventListener('input', () => setT(Number(tSlider.value)));
  layerSel.addEventListener('change', renderAttention);
  headSel.addEventListener('change', renderAttention);
  promptBox.addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) writeBtn.click(); });

  restart();
  explain(model, info);

  // test hooks for tests/tinylm-check.mjs
  (window as unknown as Record<string, unknown>).__tinylm = {
    setT, restart, write: (n: number) => write(n), generated, select: (i: number) => { selected = i; renderAll(); },
    ids: () => ids.slice(), promptLen: () => promptLen,
  };
}

// ---------------------------------------------------------------- explanation, training, notebook
function lossChart(info: TrainInfo) {
  const W = 520, H = 220, L = 44, B = 34, R = 12, Tp = 12;
  const maxStep = info.curve[info.curve.length - 1].step;
  const yMax = Math.ceil(Math.max(...info.curve.map((c) => c.val)) * 2) / 2, yMin = 1;
  const x = (st: number) => L + (st / maxStep) * (W - L - R);
  const y = (v: number) => Tp + (1 - (v - yMin) / (yMax - yMin)) * (H - Tp - B);
  const path = (key: 'train' | 'val') => info.curve.map((c, i) => `${i ? 'L' : 'M'}${x(c.step).toFixed(1)},${y(Math.min(c[key], yMax)).toFixed(1)}`).join(' ');
  const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'tl-loss', role: 'img', 'aria-label': 'Loss against training step, for training text and held-out text' });
  for (let v = yMin; v <= yMax + 1e-9; v += 0.5) {
    svg.append(s('line', { x1: L, x2: W - R, y1: y(v), y2: y(v), class: 'tl-grid-line' }),
      s('text', { x: L - 6, y: y(v) + 4, 'text-anchor': 'end', class: 'tl-axis' }, v.toFixed(1)));
  }
  for (const st of [0, Math.round(maxStep / 2), maxStep]) svg.append(s('text', { x: x(st), y: H - B + 16, 'text-anchor': 'middle', class: 'tl-axis' }, st.toLocaleString('en')));
  svg.append(s('text', { x: (L + W - R) / 2, y: H - 4, 'text-anchor': 'middle', class: 'tl-axis' }, 'training step'));
  svg.append(s('path', { d: path('train'), class: 'tl-line-train' }), s('path', { d: path('val'), class: 'tl-line-val' }));
  const last = info.curve[info.curve.length - 1];
  svg.append(s('text', { x: x(last.step) - 4, y: y(last.val) - 8, 'text-anchor': 'end', class: 'tl-lab-val' }, `held-out text ${last.val.toFixed(2)}`),
    s('text', { x: x(last.step) - 4, y: y(last.train) + 16, 'text-anchor': 'end', class: 'tl-lab-train' }, `training text ${last.train.toFixed(2)}`));
  return svg;
}

function lossCaption(info: TrainInfo) {
  const best = info.curve.reduce((a, c) => (c.val < a.val ? c : a));
  const base = 'Loss falls as training goes on. Held-out text is text the model never trained on.';
  return info.final.val - best.val > 0.02
    ? `${base} After about step ${best.step.toLocaleString('en')}, the held-out loss stops falling while the training loss keeps going down: the model starts to memorise its training text.`
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
        Each new character comes from the bars in panel 2. The model scores all ${model.cfg.vocab} characters,
        turns the scores into probabilities, and picks one at random, in proportion to its probability.
        At a low temperature the top bar takes almost everything. At a high temperature the bars even out.
      `),
      step(2, 'What it means', `
        The model has no plan for the sentence. **Every character is one guess, based on the characters before it.**
        Spelling, line breaks and speaker names all come from those guesses. The temperature decides how adventurous each guess is.
      `),
      step(3, 'What it\'s called', `
        This is a *character-level language model*. Its design is a *transformer*: ${model.cfg.n_layer} layers, each with ${model.cfg.n_head} *attention heads*
        that choose which earlier characters to use. Picking at random from the probabilities is *sampling*;
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
          - **${info.params.toLocaleString('en')} weights**, all starting as small random numbers.
          - **Text:** ${info.characters.toLocaleString('en')} characters of Shakespeare's plays (*Tiny Shakespeare*, public domain). The last 10% was held out to test on.
          - **Training:** ${info.iters.toLocaleString('en')} steps of guessing the next character, about ${seen} million guesses in all, on a 4-core CPU in ${Math.round(info.minutes)} minutes.
          - **Loss** measures how surprised the model is by the real next character. At the start it is about 4.2: an even guess among ${model.cfg.vocab} characters gives $\\ln ${model.cfg.vocab} \\approx 4.17$. It ended at ${info.final.val.toFixed(2)} on the held-out text.
        `, ''),
        h('div', { class: 'btn-row', style: 'margin-top:10px' },
          h('a', { class: 'btn primary', href: colabUrl(NOTEBOOK), target: '_blank', rel: 'noopener' }, 'Retrain it in Colab'),
          h('a', { class: 'btn', href: githubUrl(NOTEBOOK), target: '_blank', rel: 'noopener' }, 'View the notebook on GitHub'),
          h('a', { class: 'btn ghost', href: url('fields/language-models.html') }, 'Field 3: Language models →'))),
      h('figure', { class: 'card tl-loss-card' }, lossChart(info), h('figcaption', { class: 'c-muted' }, lossCaption(info)))),
    cue([
      ['"generate text one piece at a time"', 'a language model: score, pick, repeat'],
      ['"make the output more varied" or "more predictable"', 'raise or lower the temperature'],
      ['"which earlier words does the model use?"', 'look at the attention weights'],
    ]),
  ]);
  void md;
}

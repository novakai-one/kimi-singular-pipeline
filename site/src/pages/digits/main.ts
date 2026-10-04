// Showpiece A — Draw a digit, look inside.
import { mountLayout } from '../../lib/layout';
import { challenge, cue, inShort, predict, solution, why } from '../../lib/blocks';
import { h } from '../../lib/dom';
import { inline, md, mdEl } from '../../lib/md';
import { colabUrl, url } from '../../lib/config';
import './digits.css';
import { argmax, forward, parseModel, type Activations, type DigitModel, type ModelJson } from './model';
import { prepare, type Prepared } from './preprocess';
import { DrawPad, PAD } from './draw';
import { InsideView } from './inside';
import { DigitMap, type MapJson } from './map';
import { occlusion, type WhyResult } from './why';
import { ONE_TO_SEVEN, SAMPLES, TORN, toCanvas } from './samples';

const NOTEBOOK = 'notebooks/showpieces/digits_retrain.ipynb';

const page = mountLayout({ crumbs: [{ label: 'Showpieces' }, { label: 'Draw a digit, look inside' }], wide: true });
page.classList.add('dg');

const fromChip = (label: string, href: string | null, kind: string) =>
  href ? h('a', { class: `dg-from ${kind}`, href: url(href) }, label + ' →') : h('span', { class: `dg-from ${kind}` }, label);

/** Panel heading: a short label, then the question the panel answers. */
const panelHead = (n: number, label: string, question: string, ...chips: HTMLElement[]) =>
  h('div', { class: 'dg-panel-head' },
    h('span', { class: 'dg-num' }, String(n)),
    h('div', { class: 'dg-titles' }, h('div', { class: 'dg-label' }, label), h('h2', null, question)),
    h('span', { class: 'chips-r' }, chips));

/** Probability as text, same rounding everywhere. */
const pct = (p: number) => (p > 0.999 ? '>99.9%' : p < 0.001 ? '<0.1%' : p >= 0.1 ? `${Math.round(p * 100)}%` : `${(p * 100).toFixed(1)}%`);

// ------------------------------------------------------------------ header
page.append(
  h('div', { class: 'dg-head' },
    h('div', null,
      h('div', { class: 'eyebrow' }, 'Showpiece · runs in your browser'),
      h('h1', null, 'Draw a digit, look inside'),
      h('p', { class: 'lede', html: inline('Nobody can write rules for every way people write a 4. So a small network was shown 60,000 handwritten digits and adjusted its own numbers, called *weights*, until it read them well. **Draw a digit and watch what it does with yours.**') })),
    inShort(
      'What does a trained network do with your drawing?',
      'It turns your drawing into 784 numbers, passes them through three layers, and outputs ten probabilities. Every step is drawn on this page, live.')),
);

const loading = h('div', { class: 'dg-loading' }, 'Loading the trained network (about 1 MB)…');
page.append(loading);

const fetchJson = <T,>(p: string): Promise<T> => fetch(url(p)).then((r) => { if (!r.ok) throw new Error(p); return r.json(); });
const loadImage = (p: string) => new Promise<HTMLImageElement>((res, rej) => {
  const im = new Image();
  im.onload = () => res(im);
  im.onerror = rej;
  im.src = url(p);
});

Promise.all([
  fetchJson<ModelJson>('models/digits/model.json'),
  fetchJson<MapJson>('models/digits/map.json'),
  loadImage('models/digits/sprites.png'),
]).then(([mj, mapj, sprite]) => build(parseModel(mj), mapj, sprite))
  .catch((e) => { loading.textContent = `Could not load the model files (${e}). Try reloading the page.`; });

// ------------------------------------------------------------------ build
function build(model: DigitModel, mapData: MapJson, sprite: HTMLImageElement) {
  loading.remove();
  const meta = model.meta;
  const nWeights = Object.values(meta.layers).reduce((s, l) => s + l.shape.reduce((a, b) => a * b, 1), 0);

  // ---- panel 1: draw
  const padWrap = h('div', { class: 'dg-pad-wrap' });
  const pad = new DrawPad(padWrap);
  const whyBtn = h('button', { class: 'btn dg-why', type: 'button', 'aria-pressed': 'false' }, 'Why this answer?');
  const whyLegend = h('div', { class: 'dg-why-legend' },
    h('span', null, h('i', { style: 'background:#ffd23f' }), 'the answer depends on it'),
    h('span', null, h('i', { style: 'background:#6e96ff' }), 'it counts against the answer'));
  const drawCaption = h('div', { class: 'dg-caption' });
  const DRAW_TEXT = md(`
    Your drawing is shrunk to a 28 × 28 grid of squares. Each square becomes one number: 0 for empty, 1 for full ink.
    **Those 784 numbers are all the network ever sees.** The grid is at the far left of panel 4.
  `);
  const WHY_TEXT = md(`
    We erase one small square of your drawing, re-run the network, and repeat for every square.
    **Yellow: erasing it lowers the top digit's score. The answer depends on that ink.**
    Blue: erasing it *raises* the top digit's score. That ink counts against the answer.
    This test is called *occlusion*. It is one of the simplest tools in [interpretability](@/fields/interpretability.html), the field that studies what models do inside.
  `);
  drawCaption.innerHTML = DRAW_TEXT;
  const panelDraw = h('section', { class: 'dg-panel draw' },
    panelHead(1, 'Draw', 'What does the network see?', fromChip('Computer vision', 'fields/computer-vision.html', 'learn')),
    padWrap,
    h('div', { class: 'dg-tools' },
      h('button', { class: 'btn', type: 'button', onclick: () => pad.clear() }, 'Clear'),
      h('button', { class: 'btn', type: 'button', onclick: () => pad.undo() }, 'Undo'),
      whyBtn),
    whyLegend,
    drawCaption);

  // ---- panel 2: prediction
  const verdict = h('div', { class: 'dg-verdict' }, h('span', { class: 'big' }, '–'), h('span', { class: 'sub' }, 'Draw a digit'));
  const bars = Array.from({ length: 10 }, (_, d) => {
    const fill = h('div', { class: 'fill' });
    const v = h('span', { class: 'v' }, '0%');
    const row = h('div', { class: 'dg-bar' }, h('span', { class: 'd' }, String(d)), h('div', { class: 'track' }, fill), v);
    return { row, fill, v };
  });
  const panelPred = h('section', { class: 'dg-panel pred' },
    panelHead(2, 'Prediction', 'How sure is it?', fromChip('How models learn', 'fields/how-models-learn.html', 'learn')),
    verdict,
    h('div', { class: 'dg-bars', role: 'list', 'aria-label': 'Probability for each digit' }, bars.map((b) => b.row)),
    h('div', { class: 'dg-caption', html: md(`
      One bar per digit. Each bar is the network's probability for that digit.
      **The ten bars always add up to 100%.**
      Before the bars, the network gives each digit a raw *score*. A step called *softmax* turns the ten scores into probabilities.
    `) }),
    solution(`
      Scores can be any number, even negative. Softmax does two things:

      1. Raise $e$ (about 2.718) to the power of each score. The result is always positive, and a bigger score still gives a bigger result.
      2. Divide each result by the total, so they add up to 1.

      **Example with three digits.** Scores $\\cy{2}$, $\\cy{1}$, $\\cy{0}$ give $e^2 \\approx 7.4$, $e^1 \\approx 2.7$, $e^0 = 1$. The total is 11.1. So the probabilities are $7.4 / 11.1 = 67\\%$, then $24\\%$ and $9\\%$.

      In general, for score $\\cy{z_i}$:

      $$p_i = \\frac{e^{\\cy{z_i}}}{e^{z_0} + e^{z_1} + \\dots + e^{z_9}}$$
    `, 'Show how scores become probabilities'));

  // ---- panel 3: map
  const mapWrap = h('div', { class: 'dg-map-wrap' });
  const map = new DigitMap(mapWrap, mapData, sprite);
  const mapCaption = h('div', { class: 'dg-caption' });
  const MAP_TEXT = {
    tsne: md(`
      Before it decides, the network squeezes every drawing into a list of 64 numbers (layer 3 in panel 4).
      Each dot is one training digit, placed using its 64 numbers.
      **Digits whose 64 numbers are alike land close together.**
      Your drawing is the bright dot; the yellow line is its path as you drew. Hover over any dot to see that digit.
      This layout method is called *t-SNE*. It keeps close neighbours close. Your dot is placed among the training digits whose 64 numbers are nearest to yours.
    `),
    pca: md(`
      The same 3,000 digits, placed a second way. Multiply each list of 64 numbers by one 64 × 2 matrix, and you get an (x, y) point.
      **That is a projection: one matrix multiply, the same for every digit.**
      The matrix's two columns are the two directions in which the 64-number lists spread out most.
      The clusters overlap: one flat view can't pull ten groups apart.
      This method is called *PCA*. The two directions are the top eigenvectors of the data's covariance matrix.
    `),
  };
  mapCaption.innerHTML = MAP_TEXT.tsne;
  const tabT = h('button', { class: 'btn small', type: 'button', 'aria-pressed': 'true' }, 'Neighbours kept close');
  const tabP = h('button', { class: 'btn small', type: 'button', 'aria-pressed': 'false' }, 'Flat projection');
  const setMode = (m: 'tsne' | 'pca') => {
    map.setMode(m);
    tabT.setAttribute('aria-pressed', String(m === 'tsne'));
    tabP.setAttribute('aria-pressed', String(m === 'pca'));
    mapCaption.innerHTML = MAP_TEXT[m];
  };
  tabT.addEventListener('click', () => setMode('tsne'));
  tabP.addEventListener('click', () => setMode('pca'));
  const panelMap = h('section', { class: 'dg-panel map' },
    panelHead(3, 'Map of 3,000 training digits', 'Which digits look alike to it?',
      fromChip('Interpretability', 'fields/interpretability.html', 'learn'),
      fromChip('Linear algebra', null, 'maths')),
    h('div', { class: 'dg-map-tabs' }, tabT, tabP),
    mapWrap,
    mapCaption);

  page.append(h('div', { class: 'dg-top' }, panelDraw, panelPred, panelMap));

  // ------------------------------------------------------------------ challenges (right under the pad)
  let whyOn = false;
  const chTorn = challenge({
    goal: 'Make it unsure: get the top two bars within 10 percentage points (for example 52% and 45%).',
    detail: 'Where is your dot on the map when the top two bars are this close?',
    showMe: () => pad.play(toCanvas(TORN, PAD), { pointsPerFrame: 1 }),
  });
  const chCross = challenge({
    goal: 'Cross a border: turn one digit into another without pressing Clear.',
    detail: 'Both must reach 90% probability. For example, draw a 1, then add one stroke to make a 7. Watch the dot jump.',
    showMe: async () => {
      const ok = await pad.play(toCanvas(ONE_TO_SEVEN.one, PAD));
      if (!ok) return;
      await new Promise((r) => setTimeout(r, 700));
      pad.play(toCanvas([ONE_TO_SEVEN.extra], PAD), { append: true });
    },
  });
  const chBlue = challenge({
    goal: 'Find ink that counts against the answer: with "Why this answer?" on, get a bright blue square.',
    detail: 'Hint: draw a digit that is close to another digit, like a 4 with its top almost closed.',
    showMe: async () => {
      if (!whyOn) whyBtn.click();
      await pad.play(toCanvas(TORN, PAD), { pointsPerFrame: 1 });
    },
  });
  page.append(
    h('div', { class: 'dg-challenge-head' },
      h('h2', null, 'Challenges'),
      h('span', { class: 'c-muted' }, 'Optional. Only your own drawings count; the opening 3 and the Show me drawings don\'t.')),
    h('div', { class: 'dg-challenges' }, chTorn.el, chCross.el, chBlue.el),
  );

  // ---- panel 4: inside view
  const inside = new InsideView(model);
  page.append(h('section', { class: 'dg-inside' },
    panelHead(4, 'Inside the network', 'What happens at each layer?',
      fromChip('Computer vision', 'fields/computer-vision.html', 'learn'),
      fromChip('How models learn', 'fields/how-models-learn.html', 'learn')),
    inside.el,
    h('div', { class: 'dg-caption dg-cols' },
      [
        ['What you see', 'Each glowing grid shows the numbers one layer passes to the next. **Bright squares are big numbers; dark squares are zero.**'],
        ['Layer 1', 'Eight small 5 × 5 patterns slide across your drawing. Each grid is bright where its pattern lines up with your ink. The pattern sits in the grid\'s corner: red cells add, blue cells subtract. Then each grid is halved, 28 → 14, by keeping the biggest number in every 2 × 2 block.'],
        ['Layers 2 and 3', 'Layer 2 does the same with 16 patterns, each looking at all 8 grids at once. Then it halves again, 14 → 7. Layer 3 takes those 16 × 7 × 7 = 784 numbers, multiplies them by weights, and adds them up, 64 different ways.'],
        ['The names', 'The patterns are *filters*. The grids are *feature maps*. The halving step is *max-pooling*. A network built from filters is a *convolutional neural network* (CNN).'],
      ].map(([t, body]) => h('div', null, h('h3', null, t), mdEl(body, '')))),
  ));

  // ------------------------------------------------------------------ update loop
  let dirty = true;
  let last: { prep: Prepared; act: Activations } | null = null;
  const stats = { updates: 0, totalMs: 0, maxMs: 0 };

  function paintBars(p: Float32Array | null) {
    const top = p ? argmax(p) : -1;
    bars.forEach((b, d) => {
      const v = p ? p[d] : 0;
      b.fill.style.width = (v * 100).toFixed(1) + '%';
      b.v.textContent = p ? pct(v) : '–';
      b.row.classList.toggle('top', d === top);
    });
    (verdict.firstChild as HTMLElement).textContent = p ? String(top) : '–';
    (verdict.lastChild as HTMLElement).textContent = p ? `probability ${pct(p[top])}` : 'Draw a digit';
  }

  function update() {
    const t0 = performance.now();
    const prep = prepare(pad.strokes);
    if (!prep) {
      last = null;
      paintBars(null);
      inside.draw(null);
      map.setHidden(null);
    } else {
      const act = forward(model, prep.input);
      last = { prep, act };
      paintBars(act.probs);
      inside.draw(act);
      map.setHidden(act.hidden);
      checkChallenges(act.probs);
    }
    const dt = performance.now() - t0;
    stats.updates++; stats.totalMs += dt; stats.maxMs = Math.max(stats.maxMs, dt);
  }

  const frame = () => {
    if (dirty) { dirty = false; update(); }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
  pad.onChange = () => { dirty = true; if (whyOn) pad.clearOverlay(); };

  // ------------------------------------------------------------------ why this answer?
  let whyRun = 0;
  async function runWhy() {
    const run = ++whyRun;
    pad.clearOverlay();
    if (!whyOn) return;
    update();
    if (!last) return;
    const { prep, act } = last;
    const target = argmax(act.probs);
    const g = pad.overlayCtx;
    const res = await occlusion(model, prep.input, target, (u, v) => {
      // show the square being erased
      pad.clearOverlay();
      const [x0, y0] = prep.toCanvas(u - 1, v - 1);
      g.strokeStyle = 'rgba(255,255,255,.9)';
      g.lineWidth = 2;
      g.strokeRect(x0, y0, prep.cell * 3, prep.cell * 3);
    }, () => run !== whyRun || !whyOn);
    if (!res || run !== whyRun) return;
    paintWhy(prep, res);
  }
  function paintWhy(prep: Prepared, r: WhyResult) {
    const g = pad.overlayCtx;
    pad.clearOverlay();
    let strongBlue = false;
    for (let i = 0; i < 784; i++) {
      const d = r.drop[i];
      if (Number.isNaN(d)) continue;
      const t = Math.min(1, Math.abs(d) / r.maxAbs);
      if (t < 0.04) continue;
      if (d < 0 && t > 0.3) strongBlue = true;
      // weak: dim, strong: bright. Yellow = the answer depends on it, blue = it counts against.
      const k = Math.pow(t, 0.8);
      const mix = (a: number[], b: number[]) => a.map((v, j) => Math.round(v + (b[j] - v) * k)).join(',');
      g.fillStyle = d > 0
        ? `rgba(${mix([90, 62, 12], [255, 226, 90])},${0.55 + 0.45 * k})`
        : `rgba(${mix([25, 40, 90], [120, 160, 255])},${0.55 + 0.45 * k})`;
      const [x, y] = prep.toCanvas(i % 28, Math.floor(i / 28));
      g.fillRect(x, y, prep.cell + 0.5, prep.cell + 0.5);
    }
    if (strongBlue && pad.source === 'user') chBlue.win('Done: the blue squares are ink that pulls toward a different digit.');
  }
  whyBtn.addEventListener('click', () => {
    whyOn = !whyOn;
    whyBtn.setAttribute('aria-pressed', String(whyOn));
    whyLegend.classList.toggle('on', whyOn);
    pad.dim = whyOn;
    pad.redraw();
    drawCaption.innerHTML = whyOn ? WHY_TEXT : DRAW_TEXT;
    runWhy();
  });
  pad.onStrokeEnd = () => { if (whyOn) runWhy(); };

  // ------------------------------------------------------------------ challenge checks
  let confidentSeen = new Set<number>();
  pad.onClear = () => { confidentSeen = new Set(); };
  function checkChallenges(p: Float32Array) {
    const order = Array.from(p).map((v, i) => [v, i]).sort((a, b) => b[0] - a[0]);
    const [[p1, d1], [p2, d2]] = order;
    if (pad.source !== 'user') return;
    const gap = (p1 - p2) * 100;
    if (!chTorn.isWon()) chTorn.feedback(`Now: **${d1}** ${pct(p1)}, **${d2}** ${pct(p2)}. Gap: ${gap.toFixed(0)} percentage points.`);
    if (p1 - p2 <= 0.10) chTorn.win(`Done: **${d1}** ${pct(p1)} and **${d2}** ${pct(p2)}.`);
    if (p1 >= 0.9) {
      const before = [...confidentSeen].find((d) => d !== d1);
      if (before !== undefined) chCross.win(`Done: you turned a **${before}** into a **${d1}**.`);
      confidentSeen.add(d1);
    }
  }

  // ------------------------------------------------------------------ below the demo
  const pairs = meta.confused_pairs;
  const pairLabel = (a: number, b: number) => `${a} and ${b}`;
  const choices = [pairLabel(pairs[1].a, pairs[1].b), pairLabel(1, 7), pairLabel(pairs[0].a, pairs[0].b), pairLabel(pairs[2].a, pairs[2].b)];
  const wrong = meta.test_count - Math.round(meta.test_accuracy * meta.test_count);

  page.append(
    h('div', { class: 'dg-below' },
      h('div', null,
        predict({
          prompt: `The network read ${meta.test_count.toLocaleString()} digits it never saw during training. It got ${wrong} wrong. **Which two digits do you think it mixes up most often?**`,
          choices: Array.from(new Set(choices)),
          reveal: () => `**${pairLabel(pairs[0].a, pairs[0].b)}**: ${pairs[0].count} mix-ups. Then ${pairLabel(pairs[1].a, pairs[1].b)} (${pairs[1].count}) and ${pairLabel(pairs[2].a, pairs[2].b)} (${pairs[2].count}).

On the map, look for dots sitting inside the wrong cluster. Hover them: the tooltip says when the network reads a training digit as something else.`,
        }),
        why(`Networks built from filters like these read postcodes on letters and amounts on bank cheques in the 1990s. The same idea, much bigger, runs inside modern image models.

The questions on this page are open research questions for big models: which inputs did it depend on, and which examples does it treat as alike? That is the field of [interpretability](@/fields/interpretability.html).`)),
      h('div', null,
        h('h3', { style: 'margin-top:18px' }, 'Which field each panel belongs to'),
        h('table', { class: 'simple' },
          h('tbody', null,
            [
              ['1 · Draw', 'Computer vision', 'fields/computer-vision.html', 'An image is a grid of numbers.'],
              ['2 · Prediction', 'How models learn', 'fields/how-models-learn.html', `Training adjusted ${nWeights.toLocaleString()} weights until these bars were right.`],
              ['3 · Map', 'Interpretability, plus linear algebra', 'fields/interpretability.html', 'A flat projection is one matrix multiply.'],
              ['4 · Inside', 'Computer vision', 'fields/computer-vision.html', 'Filters, feature maps, pooling.'],
              ['Why this answer?', 'Interpretability', 'fields/interpretability.html', 'Test which inputs drove the output.'],
            ].map(([panel, field, href, note]) =>
              h('tr', null, h('td', null, panel), h('td', null, h('a', { href: url(href) }, field)), h('td', { class: 'c-muted' }, note))))),
        h('h3', null, 'Retrain it yourself'),
        mdEl(`
          The network has ${nWeights.toLocaleString()} weights. It was trained on MNIST, a public set of 70,000 handwritten digits, for 15 passes over the training digits: about one minute on a laptop CPU.
          On ${meta.test_count.toLocaleString()} digits it never saw during training, it is right ${(meta.test_accuracy * 100).toFixed(1)}% of the time.
          Everything on this page runs on your computer. There is no server.

          The notebook repeats the training step by step, then exports the same three files this page loads.

          [Open the retraining notebook in Colab](${colabUrl(NOTEBOOK)})
        `))),
    cue([
      ['images, or any grid of numbers', 'small filters that slide across the grid (a CNN)'],
      ['"which part of the input mattered?"', 'erase a piece and measure the change (occlusion)'],
      ['"which examples does the model treat as alike?"', 'take its layer-3 numbers and map them to 2-D'],
    ]),
  );

  // ------------------------------------------------------------------ test hooks + opening animation
  (window as unknown as Record<string, unknown>).__digits = {
    pad, map, stats, samples: SAMPLES, torn: TORN,
    probs: () => (last ? Array.from(last.act.probs) : null),
    top: () => (last ? argmax(last.act.probs) : null),
  };

  pad.setHint('');
  setTimeout(async () => {
    const done = await pad.play(toCanvas(SAMPLES['3'], PAD), { pointsPerFrame: 1 });
    if (done) pad.setHint('Your turn: draw a digit. The 3 disappears when you start.');
  }, 350);
}

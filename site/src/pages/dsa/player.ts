// Step player shared by every DSA visualiser.
// A topic turns an input into a list of frames (snapshots). The player shows one frame at a time,
// with back / forward / play / pause / speed, the pseudocode line that is running, and a note.
import { h, clear } from '../../lib/dom';
import { inline } from '../../lib/md';
import { onTheme } from '../fieldviz/kit';

export interface Frame {
  /** One short sentence: what happens in this step. Inline markdown allowed. */
  note: string;
  /** Index into the pseudocode lines (highlighted), or -1. */
  line?: number;
  /** Any data the topic's renderer needs. */
  [key: string]: unknown;
}

export interface InputSpec {
  label: string;
  /** Initial text in the box. */
  value: string;
  /** Short help shown under the box. */
  help?: string;
  /** Example inputs, shown as buttons. */
  presets?: { label: string; value: string }[];
  /** Produce a random valid input. */
  random?: () => string;
}

export interface Algorithm<F extends Frame = Frame> {
  name: string;
  code: string[];
  /** Turn the input text into frames; throw an Error with a plain message if the input is invalid. */
  run(input: string): F[];
}

export interface PlayerOpts<F extends Frame = Frame> {
  algorithms: Algorithm<F>[];
  inputs: InputSpec;
  /** Draw a frame into the stage element (SVG or HTML). */
  render(stage: HTMLElement, frame: F, algorithm: Algorithm<F>): void;
  /** Called after every new run, with all frames (for challenges and readouts). */
  onRun?(frames: F[], input: string, algorithm: Algorithm<F>): void;
  /** Called each time the shown frame changes. */
  onFrame?(frame: F, index: number, frames: F[]): void;
  stageHeight?: number;
}

export interface PlayerHandle<F extends Frame = Frame> {
  el: HTMLElement;
  /** Set the input box and re-run (used by Show me). */
  setInput(value: string, algorithmIndex?: number): void;
  play(): void;
  /** Change playback speed (0.5, 1, 2 or 4), e.g. so a long Show me plays faster. */
  setSpeed(v: number): void;
  frames(): F[];
}

export function makePlayer<F extends Frame>(o: PlayerOpts<F>): PlayerHandle<F> {
  let algo = o.algorithms[0];
  let frames: F[] = [];
  let i = 0;
  let timer: number | null = null;
  let speed = 1;
  let speedSel: HTMLSelectElement | null = null;

  const stage = h('div', { class: 'dp-stage', style: o.stageHeight ? `min-height:${o.stageHeight}px` : '' });
  const note = h('div', { class: 'dp-note', 'aria-live': 'polite' });
  const counter = h('span', { class: 'dp-counter' });
  const codeBox = h('ol', { class: 'dp-code' });
  const error = h('div', { class: 'dp-error', hidden: true });

  const btn = (label: string, title: string, fn: () => void) =>
    h('button', { class: 'btn small dp-btn', type: 'button', title, 'aria-label': title, onclick: fn }, label);
  const playBtn = btn('▶ Play', 'Play', () => (timer ? pause() : play()));
  const controls = h('div', { class: 'dp-controls' },
    btn('⏮', 'Go to the start', () => go(0)),
    btn('◀', 'Step back', () => go(i - 1)),
    playBtn,
    btn('▶|', 'Step forward', () => go(i + 1)),
    btn('⏭', 'Go to the end', () => go(frames.length - 1)),
    counter,
    h('label', { class: 'dp-speed' }, 'Speed ',
      (() => {
        const sel = h('select', { 'aria-label': 'Playback speed' },
          ['0.5', '1', '2', '4'].map((v) => h('option', { value: v, selected: v === '1' }, `${v}×`)));
        sel.addEventListener('change', () => { speed = Number(sel.value); if (timer) { pause(); play(); } });
        speedSel = sel;
        return sel;
      })()));

  const box = h('input', { type: 'text', class: 'dp-input', value: o.inputs.value, 'aria-label': o.inputs.label, spellcheck: 'false' });
  box.addEventListener('keydown', (e) => { if (e.key === 'Enter') runNow(); });
  const algoSel = o.algorithms.length > 1
    ? h('div', { class: 'btn-row dp-algos' }, o.algorithms.map((a, k) =>
        h('button', { class: 'btn small', type: 'button', 'aria-pressed': String(k === 0), onclick: (e: Event) => {
          algo = a;
          (e.currentTarget as HTMLElement).parentElement!.querySelectorAll('button').forEach((b, kk) => b.setAttribute('aria-pressed', String(kk === k)));
          runNow();
        } }, a.name)))
    : null;
  const inputRow = h('div', { class: 'dp-inputs' },
    h('label', { class: 'dp-input-label' }, o.inputs.label),
    h('div', { class: 'dp-input-row' },
      box,
      h('button', { class: 'btn small primary', type: 'button', onclick: () => runNow() }, 'Run'),
      o.inputs.random ? h('button', { class: 'btn small', type: 'button', onclick: () => { box.value = o.inputs.random!(); runNow(); } }, 'Random') : null),
    o.inputs.presets ? h('div', { class: 'btn-row dp-presets' }, h('span', { class: 'c-muted', style: 'font-size:13px' }, 'Try:'),
      o.inputs.presets.map((p) => h('button', { class: 'btn small ghost', type: 'button', onclick: () => { box.value = p.value; runNow(); } }, p.label))) : null,
    o.inputs.help ? h('div', { class: 'dp-help' }, o.inputs.help) : null,
    error);

  const el = h('div', { class: 'dp' },
    algoSel,
    inputRow,
    h('div', { class: 'dp-main' },
      h('div', { class: 'dp-left' }, stage, note, controls),
      h('div', { class: 'dp-right' }, h('div', { class: 'dp-code-h' }, 'Pseudocode'), codeBox)));

  function paintCode() {
    clear(codeBox);
    algo.code.forEach((ln, k) => codeBox.append(h('li', { class: 'dp-line' + (frames[i]?.line === k ? ' on' : '') }, ln)));
  }
  function show() {
    if (!frames.length) return;
    const f = frames[i];
    clear(stage);
    o.render(stage, f, algo);
    note.innerHTML = inline(f.note);
    counter.textContent = `step ${i + 1} of ${frames.length}`;
    codeBox.querySelectorAll('li').forEach((li, k) => li.classList.toggle('on', f.line === k));
    o.onFrame?.(f, i, frames);
  }
  function go(k: number) {
    if (!frames.length) return;
    i = Math.max(0, Math.min(frames.length - 1, k));
    show();
    if (i === frames.length - 1) pause();
  }
  function play() {
    if (i >= frames.length - 1) i = 0;
    playBtn.textContent = '⏸ Pause';
    playBtn.setAttribute('aria-label', 'Pause');
    const tick = () => {
      if (i >= frames.length - 1) { pause(); return; }
      go(i + 1);
      timer = window.setTimeout(tick, 700 / speed);
    };
    timer = window.setTimeout(tick, 350 / speed);
  }
  function pause() {
    if (timer) window.clearTimeout(timer);
    timer = null;
    playBtn.textContent = '▶ Play';
    playBtn.setAttribute('aria-label', 'Play');
  }
  function runNow() {
    pause();
    try {
      frames = algo.run(box.value);
      error.hidden = true;
    } catch (e) {
      error.textContent = (e as Error).message;
      error.hidden = false;
      return;
    }
    i = 0;
    paintCode();
    show();
    o.onRun?.(frames, box.value, algo);
  }
  onTheme(show);
  setTimeout(runNow, 0);

  return {
    el,
    setInput(value, algorithmIndex) {
      box.value = value;
      if (algorithmIndex !== undefined && algoSel) (algoSel.children[algorithmIndex] as HTMLButtonElement).click();
      else runNow();
    },
    play,
    setSpeed(v: number) {
      speed = v;
      if (speedSel) speedSel.value = String(v);
      if (timer) { pause(); play(); }
    },
    frames: () => frames,
  };
}

/** Parse "5, 3, 8 1" into numbers; throws a readable error. */
export function parseNumbers(text: string, opts: { min?: number; max?: number; minCount?: number; maxCount?: number; integers?: boolean } = {}): number[] {
  const parts = text.split(/[\s,]+/).filter(Boolean);
  const nums = parts.map(Number);
  if (nums.some((n) => Number.isNaN(n))) throw new Error('Use numbers separated by commas or spaces, for example: 5, 3, 8, 1');
  if (opts.integers && nums.some((n) => !Number.isInteger(n))) throw new Error('Use whole numbers only.');
  if (opts.minCount !== undefined && nums.length < opts.minCount) throw new Error(`Enter at least ${opts.minCount} numbers.`);
  if (opts.maxCount !== undefined && nums.length > opts.maxCount) throw new Error(`Enter at most ${opts.maxCount} numbers, so the animation stays readable.`);
  if (opts.min !== undefined && nums.some((n) => n < opts.min!)) throw new Error(`Numbers must be at least ${opts.min}.`);
  if (opts.max !== undefined && nums.some((n) => n > opts.max!)) throw new Error(`Numbers must be at most ${opts.max}.`);
  return nums;
}

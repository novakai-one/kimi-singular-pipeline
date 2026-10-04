// Small toolkit shared by the Field Card interactives.
import { cssVar, h } from '../../lib/dom';

/** What a field interactive can tell the page. */
export interface VizApi {
  /** The challenge's win condition was met (idempotent). */
  win(message?: string): void;
  /** Live progress text under the challenge goal. */
  feedback(message: string): void;
}
/** What a field interactive gives back. */
export interface VizHandle {
  /** Demonstrate a solution (the challenge's "Show me"). */
  showMe(): void;
}
export type Viz = (el: HTMLElement, api: VizApi) => VizHandle;

/** Theme colours, read fresh (call inside draw functions). */
export function colours() {
  const v = (n: string) => cssVar(n);
  return {
    green: v('--green'), red: v('--red'), yellow: v('--yellow'),
    search: v('--search'), learn: v('--learn'), act: v('--act'),
    text: v('--text'), muted: v('--muted'), faint: v('--faint'),
    border: v('--border'), surface: v('--surface'), surface2: v('--surface-2'), surface3: v('--surface-3'), bg: v('--bg'),
  };
}
export type Colours = ReturnType<typeof colours>;

/** Redraw when the light/dark theme changes. */
export function onTheme(fn: () => void) {
  window.addEventListener('afe-theme', fn);
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', fn);
}

/** A canvas with a fixed logical size (w x h) that scales to its container's width. */
export function makeCanvas(w: number, hgt: number, label: string) {
  const c = h('canvas', { role: 'img', 'aria-label': label, style: `width:100%;max-width:${w}px;height:auto;display:block;touch-action:none` });
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  c.width = Math.round(w * dpr);
  c.height = Math.round(hgt * dpr);
  const g = c.getContext('2d')!;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  /** Pointer position in logical coordinates. */
  const pos = (e: PointerEvent | MouseEvent): [number, number] => {
    const r = c.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * w, ((e.clientY - r.top) / r.height) * hgt];
  };
  const clear = () => g.clearRect(0, 0, w, hgt);
  return { c, g, pos, clear, w, h: hgt };
}

export function button(label: string, onclick: () => void, cls = 'btn small'): HTMLButtonElement {
  return h('button', { class: cls, type: 'button', onclick }, label);
}

/** A row of toggle buttons; exactly one is pressed. */
export function segmented<T>(label: string, options: { label: string; value: T }[], initial: T, onChange: (v: T) => void) {
  let current = initial;
  const btns = options.map((o) => {
    const b = h('button', { class: 'btn small', type: 'button', 'aria-pressed': String(o.value === initial) }, o.label);
    b.addEventListener('click', () => set(o.value, true));
    return b;
  });
  function set(v: T, fire = false) {
    current = v;
    btns.forEach((b, i) => b.setAttribute('aria-pressed', String(options[i].value === v)));
    if (fire) onChange(v);
  }
  const el = h('div', { class: 'viz-seg' }, h('span', { class: 'viz-seg-label' }, label), h('div', { class: 'btn-row' }, btns));
  return { el, set, get: () => current };
}

/** A labelled number readout. */
export function readout(label: string, initial = '–') {
  const v = h('span', { class: 'viz-readout-v' }, initial);
  const el = h('div', { class: 'viz-readout' }, h('span', { class: 'viz-readout-l' }, label), v);
  return { el, set: (text: string) => { v.textContent = text; } };
}

/** Deterministic random numbers (so every visit shows the same data). */
export function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}
export function gauss(r: () => number) {
  const u = Math.max(1e-9, r()), v = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

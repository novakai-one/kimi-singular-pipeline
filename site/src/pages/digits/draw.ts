// The drawing pad: pointer input, undo/clear, and animated playback of sample strokes.
import type { Pt, Stroke } from './preprocess';

export const PAD = 300; // strokes are stored in a 300 x 300 coordinate box
const INK = '#3ddc84';  // green = input, in both themes (the pad is always dark)

export type Source = 'empty' | 'demo' | 'user';

export class DrawPad {
  readonly canvas: HTMLCanvasElement;
  readonly overlay: HTMLCanvasElement;
  readonly hint: HTMLElement;
  strokes: Stroke[] = [];
  source: Source = 'empty';
  drawing = false;
  /** Grey ink, so the 'Why this answer?' colours stand out. */
  dim = false;
  onChange: () => void = () => {};
  onStrokeEnd: () => void = () => {};
  onUserStart: () => void = () => {};
  onClear: () => void = () => {};
  private ctx: CanvasRenderingContext2D;
  private octx: CanvasRenderingContext2D;
  private playToken = 0;

  constructor(wrap: HTMLElement) {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'dg-pad';
    this.canvas.setAttribute('aria-label', 'Drawing pad. Draw a digit with the mouse or your finger.');
    this.overlay = document.createElement('canvas');
    this.overlay.className = 'dg-overlay';
    this.hint = document.createElement('div');
    this.hint.className = 'dg-hint';
    wrap.append(this.canvas, this.overlay, this.hint);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    for (const c of [this.canvas, this.overlay]) { c.width = PAD * dpr; c.height = PAD * dpr; }
    this.ctx = this.canvas.getContext('2d')!;
    this.octx = this.overlay.getContext('2d')!;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.octx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.bind();
    this.redraw();
  }

  private toPad(e: PointerEvent): Pt {
    const r = this.canvas.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * PAD, ((e.clientY - r.top) / r.height) * PAD];
  }

  private bind() {
    const c = this.canvas;
    c.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.playToken++; // stop any playback
      if (this.source !== 'user') { this.strokes = []; this.onClear(); }
      this.source = 'user';
      this.drawing = true;
      c.setPointerCapture(e.pointerId);
      this.strokes.push([this.toPad(e)]);
      this.setHint('');
      this.onUserStart();
      this.redraw();
      this.onChange();
    });
    c.addEventListener('pointermove', (e) => {
      if (!this.drawing) return;
      const s = this.strokes[this.strokes.length - 1];
      const evs = typeof e.getCoalescedEvents === 'function' ? e.getCoalescedEvents() : [e];
      for (const ev of evs.length ? evs : [e]) {
        const p = this.toPad(ev);
        const last = s[s.length - 1];
        if (Math.hypot(p[0] - last[0], p[1] - last[1]) >= 1.5) s.push(p);
      }
      this.redraw();
      this.onChange();
    });
    const end = () => {
      if (!this.drawing) return;
      this.drawing = false;
      this.onStrokeEnd();
    };
    c.addEventListener('pointerup', end);
    c.addEventListener('pointercancel', end);
  }

  setHint(text: string) { this.hint.textContent = text; this.hint.style.opacity = text ? '1' : '0'; }

  clear() {
    this.playToken++;
    this.strokes = [];
    this.source = 'empty';
    this.clearOverlay();
    this.redraw();
    this.onClear();
    this.onChange();
    this.setHint('Draw a digit here');
  }

  undo() {
    this.playToken++;
    this.strokes.pop();
    if (!this.strokes.length) this.source = 'empty';
    this.redraw();
    this.onChange();
    this.onStrokeEnd();
  }

  redraw() {
    const g = this.ctx;
    g.clearRect(0, 0, PAD, PAD);
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.strokeStyle = this.dim ? 'rgba(150, 156, 170, .32)' : INK;
    g.lineWidth = 17;
    g.shadowColor = 'rgba(61, 220, 132, .55)';
    g.shadowBlur = this.dim ? 0 : 14;
    for (const s of this.strokes) {
      if (!s.length) continue;
      g.beginPath();
      g.moveTo(s[0][0], s[0][1]);
      if (s.length === 1) g.lineTo(s[0][0] + 0.01, s[0][1]);
      for (let i = 1; i < s.length; i++) g.lineTo(s[i][0], s[i][1]);
      g.stroke();
    }
    g.shadowBlur = 0;
  }

  get overlayCtx() { return this.octx; }
  clearOverlay() { this.octx.clearRect(0, 0, PAD, PAD); }

  /** Animate strokes being drawn. Resolves false if interrupted. */
  play(strokes: Stroke[], opts: { append?: boolean; pointsPerFrame?: number; source?: Source } = {}): Promise<boolean> {
    const token = ++this.playToken;
    if (!opts.append) { this.strokes = []; this.clearOverlay(); this.onClear(); }
    this.source = opts.source ?? 'demo';
    this.setHint('');
    const ppf = opts.pointsPerFrame ?? 2;
    return new Promise((resolve) => {
      let si = 0, pi = 0;
      const step = () => {
        if (token !== this.playToken) return resolve(false);
        for (let k = 0; k < ppf; k++) {
          if (si >= strokes.length) break;
          if (pi === 0) this.strokes.push([]);
          this.strokes[this.strokes.length - 1].push(strokes[si][pi]);
          pi++;
          if (pi >= strokes[si].length) { si++; pi = 0; }
        }
        this.redraw();
        this.onChange();
        if (si >= strokes.length) { this.onStrokeEnd(); return resolve(true); }
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }
}

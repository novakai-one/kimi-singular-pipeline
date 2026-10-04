// "Inside view": every layer's numbers drawn as glowing grids.
// Bright = big number. Same brightness scale for every drawing (fixed per layer).
import type { Activations, DigitModel } from './model';

type RGB = [number, number, number];

function lut(stops: [number, RGB][]): Uint8ClampedArray {
  const out = new Uint8ClampedArray(256 * 3);
  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    let k = 0;
    while (k < stops.length - 2 && t > stops[k + 1][0]) k++;
    const [t0, c0] = stops[k], [t1, c1] = stops[k + 1];
    const u = Math.min(1, Math.max(0, (t - t0) / (t1 - t0)));
    for (let ch = 0; ch < 3; ch++) out[i * 3 + ch] = c0[ch] + (c1[ch] - c0[ch]) * u;
  }
  return out;
}

// amber/yellow glow for layer outputs (yellow = result), green for the input (green = data)
const AMBER = lut([[0, [18, 19, 26]], [0.2, [70, 38, 8]], [0.5, [196, 116, 10]], [0.78, [255, 210, 63]], [1, [255, 248, 214]]]);
const GREEN = lut([[0, [18, 19, 26]], [0.35, [18, 110, 60]], [0.75, [61, 220, 132]], [1, [214, 255, 230]]]);

class GlowGrid {
  readonly canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private small: HTMLCanvasElement;
  private sctx: CanvasRenderingContext2D;
  private img: ImageData;
  private scratch: HTMLCanvasElement;
  private dpr: number;

  /** maps: how many grids; h x w each; laid out cols across; cell = CSS px per value */
  constructor(readonly maps: number, readonly h: number, readonly w: number, readonly cols: number,
              readonly cell: number, readonly gap: number, readonly ramp = AMBER) {
    const rows = Math.ceil(maps / cols);
    const cw = cols * w * cell + (cols - 1) * gap;
    const ch = rows * h * cell + (rows - 1) * gap;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas = document.createElement('canvas');
    this.canvas.width = Math.round(cw * this.dpr);
    this.canvas.height = Math.round(ch * this.dpr);
    this.canvas.style.width = cw + 'px';
    this.canvas.style.height = ch + 'px';
    this.ctx = this.canvas.getContext('2d')!;
    this.small = document.createElement('canvas');
    this.small.width = w * maps;
    this.small.height = h;
    this.sctx = this.small.getContext('2d')!;
    this.img = this.sctx.createImageData(w * maps, h);
    this.scratch = document.createElement('canvas');
    this.scratch.width = this.canvas.width;
    this.scratch.height = this.canvas.height;
  }

  pos(k: number): [number, number] {
    const r = Math.floor(k / this.cols), c = k % this.cols;
    return [c * (this.w * this.cell + this.gap), r * (this.h * this.cell + this.gap)];
  }

  draw(data: ArrayLike<number> | null, scale: number, after?: (ctx: CanvasRenderingContext2D) => void) {
    const { maps, h, w } = this;
    const px = this.img.data;
    const W = w * maps;
    for (let k = 0; k < maps; k++) {
      for (let i = 0; i < h; i++) {
        for (let j = 0; j < w; j++) {
          const v = data ? data[(k * h + i) * w + j] : 0;
          const t = Math.max(0, Math.min(1, v / scale));
          const li = Math.round(Math.pow(t, 0.8) * 255) * 3;
          const o = (i * W + k * w + j) * 4;
          px[o] = this.ramp[li]; px[o + 1] = this.ramp[li + 1]; px[o + 2] = this.ramp[li + 2]; px[o + 3] = 255;
        }
      }
    }
    this.sctx.putImageData(this.img, 0, 0);
    const g = this.ctx;
    const d = this.dpr;
    g.setTransform(d, 0, 0, d, 0, 0);
    g.clearRect(0, 0, this.canvas.width, this.canvas.height);
    g.imageSmoothingEnabled = false;
    for (let k = 0; k < maps; k++) {
      const [x, y] = this.pos(k);
      g.drawImage(this.small, k * w, 0, w, h, x, y, w * this.cell, h * this.cell);
    }
    // glow: add a blurred copy on top
    const sc = this.scratch.getContext('2d')!;
    sc.clearRect(0, 0, this.scratch.width, this.scratch.height);
    sc.drawImage(this.canvas, 0, 0);
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.globalAlpha = 0.45;
    g.filter = `blur(${Math.max(2, this.cell * 1.2) * d}px)`;
    g.drawImage(this.scratch, 0, 0);
    g.restore();
    g.setTransform(d, 0, 0, d, 0, 0);
    after?.(g);
  }
}

function col(title: string, sub: string, el: HTMLElement): HTMLElement {
  const c = document.createElement('div');
  c.className = 'dg-col';
  const t = document.createElement('div'); t.className = 't'; t.textContent = title;
  const s = document.createElement('div'); s.className = 's'; s.textContent = sub;
  c.append(t, el, s);
  return c;
}
function arrow(text: string): HTMLElement {
  const a = document.createElement('div');
  a.className = 'dg-arrow';
  a.innerHTML = `<span class="a">→</span><span>${text}</span>`;
  return a;
}

export class InsideView {
  readonly el: HTMLElement;
  private input = new GlowGrid(1, 28, 28, 1, 4, 0, GREEN);
  private l1 = new GlowGrid(8, 28, 28, 4, 2, 6);
  private l2 = new GlowGrid(16, 14, 14, 4, 3, 5);
  private l3 = new GlowGrid(64, 1, 1, 8, 13, 2);
  private out = new GlowGrid(10, 1, 1, 1, 19, 3);

  constructor(private model: DigitModel) {
    this.el = document.createElement('div');
    this.el.className = 'dg-flow';
    const outWrap = document.createElement('div');
    outWrap.style.cssText = 'display:flex;gap:6px;align-items:flex-start';
    const labels = document.createElement('div');
    labels.style.cssText = 'display:grid;gap:3px;font-size:12px;color:#7d8090;font-weight:700';
    for (let d = 0; d < 10; d++) {
      const l = document.createElement('div');
      l.textContent = String(d);
      l.style.cssText = 'height:19px;line-height:19px';
      labels.append(l);
    }
    outWrap.append(labels, this.out.canvas);
    this.el.append(
      col('Your drawing', '28 × 28 = 784 numbers', this.input.canvas),
      arrow('8 patterns,<br>5 × 5 each'),
      col('Layer 1: 8 grids', 'Bright where the pattern in the corner lines up with your ink.', this.l1.canvas),
      arrow('halve: 28 → 14,<br>then 16 patterns'),
      col('Layer 2: 16 grids', '14 × 14 each. A dark grid: its pattern is not in this drawing.', this.l2.canvas),
      arrow('halve: 14 → 7,<br>then 784 → 64'),
      col('Layer 3: 64 numbers', 'The whole drawing, squeezed into 64 numbers.', this.l3.canvas),
      arrow('64 → 10'),
      col('Output', '10 probabilities', outWrap),
    );
    this.draw(null);
  }

  draw(a: Activations | null) {
    const s = this.model.actScale;
    this.input.draw(a ? a.input : null, 1);
    this.l1.draw(a ? a.c1 : null, s.c1, (g) => this.drawFilters(g));
    this.l2.draw(a ? a.c2 : null, s.c2);
    this.l3.draw(a ? a.hidden : null, s.hidden);
    this.out.draw(a ? a.probs : null, 1);
  }

  /** Each layer-1 map gets its 5 x 5 filter in the corner: red = positive weight, blue = negative. */
  private drawFilters(g: CanvasRenderingContext2D) {
    const w = this.model.conv1w.data;
    let m = 0;
    for (const v of w) m = Math.max(m, Math.abs(v));
    const px = 3;
    for (let k = 0; k < 8; k++) {
      const [x0, y0] = this.l1.pos(k);
      g.fillStyle = '#0a0b0f';
      g.fillRect(x0, y0, 5 * px + 2, 5 * px + 2);
      for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) {
        const v = w[k * 25 + i * 5 + j] / m;
        const a = Math.min(1, Math.abs(v) * 1.4);
        g.fillStyle = v >= 0 ? `rgba(255,107,107,${a})` : `rgba(110,150,255,${a})`;
        g.fillRect(x0 + 1 + j * px, y0 + 1 + i * px, px, px);
      }
    }
  }
}

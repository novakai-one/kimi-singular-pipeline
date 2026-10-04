// Hand-made pen strokes for each digit, in a 0..1 box (y points down).
// Used for the opening animation, the "Show me" buttons, and the tests.
import type { Pt, Stroke } from './preprocess';

const arc = (cx: number, cy: number, rx: number, ry: number, a0: number, a1: number, n = 28): Stroke => {
  const s: Stroke = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    s.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]);
  }
  return s;
};
const line = (...p: Pt[]): Stroke => {
  // densify so animated drawing looks smooth
  const s: Stroke = [];
  for (let i = 0; i < p.length - 1; i++) {
    const [ax, ay] = p[i], [bx, by] = p[i + 1];
    const n = Math.max(2, Math.round(Math.hypot(bx - ax, by - ay) * 40));
    for (let k = 0; k < n; k++) s.push([ax + ((bx - ax) * k) / n, ay + ((by - ay) * k) / n]);
  }
  s.push(p[p.length - 1]);
  return s;
};
const PI = Math.PI;

export const SAMPLES: Record<string, Stroke[]> = {
  '0': [arc(0.5, 0.5, 0.27, 0.4, -PI / 2, (3 * PI) / 2 + 0.15, 40)],
  '1': [line([0.4, 0.24], [0.54, 0.1], [0.53, 0.9])],
  '2': [[...arc(0.5, 0.32, 0.24, 0.2, PI * 1.05, PI * 2.25, 24), ...line([0.68, 0.5], [0.24, 0.88], [0.8, 0.88])]],
  '3': [[...arc(0.48, 0.3, 0.22, 0.19, PI * 1.1, PI * 2.5, 24), ...arc(0.48, 0.68, 0.25, 0.21, -PI * 0.5, PI * 0.85, 26)]],
  '4': [line([0.36, 0.1], [0.24, 0.58], [0.78, 0.58]), line([0.64, 0.14], [0.64, 0.92])],
  '5': [[...line([0.74, 0.12], [0.32, 0.12], [0.29, 0.46]), ...arc(0.48, 0.65, 0.25, 0.22, -PI * 0.8, PI * 0.82, 26)]],
  '6': [[...line([0.66, 0.1], [0.34, 0.5]), ...arc(0.5, 0.68, 0.2, 0.2, PI * 1.05, PI * 3.15, 30)]],
  '7': [line([0.22, 0.14], [0.78, 0.14], [0.42, 0.92])],
  '8': [Array.from({ length: 61 }, (_, i) => {
    const t = (i / 60) * 2 * PI + 0.25; // start just right of the top, so the pen overlaps where it began
    return [0.5 + 0.21 * Math.sin(2 * t), 0.5 - 0.39 * Math.cos(t)] as Pt;
  })],
  '9': [[...arc(0.48, 0.32, 0.2, 0.2, 0.1, PI * 2.1, 30), ...line([0.68, 0.36], [0.64, 0.92])]],
};

/** A drawing between 4 and 9: a 4 whose top is almost closed (found by searching the gap size). */
export const TORN: Stroke[] = [
  line([0.3, 0.14], [0.27, 0.52], [0.72, 0.5]),
  line([0.7, 0.12], [0.68, 0.92]),
  line([0.3, 0.14], [0.4775, 0.13]),
];

/** A 1, then the extra stroke that turns it into a 7. */
export const ONE_TO_SEVEN: { one: Stroke[]; extra: Stroke } = {
  one: [line([0.6, 0.16], [0.46, 0.9])],
  extra: line([0.2, 0.16], [0.6, 0.16]),
};

/** Scale strokes from the 0..1 box onto a canvas of the given size. */
export function toCanvas(strokes: Stroke[], size: number, margin = 0.14): Stroke[] {
  const k = size * (1 - 2 * margin), o = size * margin;
  return strokes.map((s) => s.map(([x, y]) => [o + x * k, o + y * k] as Pt));
}

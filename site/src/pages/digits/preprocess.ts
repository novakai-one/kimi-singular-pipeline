// Turn mouse strokes into the 28 x 28 grid the network was trained on.
// MNIST digits were prepared like this: fit the digit into a 20 x 20 box,
// then shift it so its centre of mass sits in the middle of a 28 x 28 grid.
// We do the same, and draw every stroke with the same thickness, so a small
// drawing and a big drawing give the same input. Pure maths: runs in Node too.

export type Pt = [number, number];
export type Stroke = Pt[];

export interface Prepared {
  input: Float32Array; // 784 values in [0, 1], row by row
  /** Map a point on the drawing canvas to the 28 x 28 grid. */
  toGrid: (x: number, y: number) => Pt;
  /** Map a 28 x 28 grid point back to the drawing canvas. */
  toCanvas: (u: number, v: number) => Pt;
  /** Size of one grid cell, in canvas pixels. */
  cell: number;
}

const SS = 4;              // supersampling: draw at 112 x 112, then average 4 x 4 blocks
const N = 28 * SS;
const BOX = 20;            // digit fits in a 20 x 20 box
export const STROKE = 2.6; // stroke width, in 28-grid pixels

function render(strokes: Stroke[], f: (x: number, y: number) => Pt): Float32Array {
  const big = new Float32Array(N * N);
  const r = (STROKE * SS) / 2;
  const stamp = (ax: number, ay: number, bx: number, by: number) => {
    const x0 = Math.max(0, Math.floor(Math.min(ax, bx) - r - 1));
    const x1 = Math.min(N - 1, Math.ceil(Math.max(ax, bx) + r + 1));
    const y0 = Math.max(0, Math.floor(Math.min(ay, by) - r - 1));
    const y1 = Math.min(N - 1, Math.ceil(Math.max(ay, by) + r + 1));
    const dx = bx - ax, dy = by - ay;
    const len2 = dx * dx + dy * dy;
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const px = x + 0.5, py = y + 0.5;
        let t = len2 > 0 ? ((px - ax) * dx + (py - ay) * dy) / len2 : 0;
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        const qx = ax + t * dx - px, qy = ay + t * dy - py;
        const d = Math.sqrt(qx * qx + qy * qy);
        const cov = r + 0.5 - d;
        if (cov > 0) {
          const k = y * N + x;
          const v = cov > 1 ? 1 : cov;
          if (v > big[k]) big[k] = v;
        }
      }
    }
  };
  for (const s of strokes) {
    if (s.length === 0) continue;
    const pts = s.map(([x, y]) => f(x, y)).map(([u, v]) => [u * SS, v * SS] as Pt);
    if (pts.length === 1) stamp(pts[0][0], pts[0][1], pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) stamp(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]);
  }
  const out = new Float32Array(784);
  for (let i = 0; i < 28; i++) {
    for (let j = 0; j < 28; j++) {
      let s = 0;
      for (let a = 0; a < SS; a++) for (let b = 0; b < SS; b++) s += big[(i * SS + a) * N + j * SS + b];
      out[i * 28 + j] = s / (SS * SS);
    }
  }
  return out;
}

function centreOfMass(img: Float32Array): Pt {
  let sx = 0, sy = 0, m = 0;
  for (let i = 0; i < 28; i++) for (let j = 0; j < 28; j++) {
    const v = img[i * 28 + j];
    sx += (j + 0.5) * v; sy += (i + 0.5) * v; m += v;
  }
  return m > 0 ? [sx / m, sy / m] : [14, 14];
}

/** Returns null when there is nothing drawn. */
export function prepare(strokes: Stroke[]): Prepared | null {
  const pts = strokes.flat();
  if (pts.length === 0) return null;
  let minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;
  for (const [x, y] of pts) {
    if (x < minx) minx = x; if (x > maxx) maxx = x;
    if (y < miny) miny = y; if (y > maxy) maxy = y;
  }
  const cx = (minx + maxx) / 2, cy = (miny + maxy) / 2;
  // Fit the longer side (plus stroke width) into the 20 x 20 box.
  // A tiny scribble is not blown up to fill the box: side is at least 24 canvas px.
  const side = Math.max(maxx - minx, maxy - miny, 24);
  const scale = (BOX - STROKE) / side;
  let offX = 0, offY = 0;
  const f = (x: number, y: number): Pt => [(x - cx) * scale + 14 + offX, (y - cy) * scale + 14 + offY];
  const first = render(strokes, f);
  const [mx, my] = centreOfMass(first);
  offX = 14 - mx;
  offY = 14 - my;
  const input = render(strokes, f);
  return {
    input,
    toGrid: f,
    toCanvas: (u, v) => [(u - 14 - offX) / scale + cx, (v - 14 - offY) / scale + cy],
    cell: 1 / scale,
  };
}

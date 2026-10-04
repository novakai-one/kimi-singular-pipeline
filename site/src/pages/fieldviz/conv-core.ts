// Field 5 — pure convolution logic (no browser code), so tests can import it.
// A 16 x 16 image: dark background (0) with a light square (1) on rows and columns 4 to 11.
// out[i][j] = sum over a, b in {-1, 0, 1} of w[a][b] * x[i + a][j + b], with pixels outside the image = 0.

export const SIZE = 16;
export const SQ_LO = 4, SQ_HI = 11;
/** Rows (for left/right edges) and columns (for top/bottom edges) that are measured: away from the corners. */
export const EDGE_LO = 5, EDGE_HI = 10;
export const VERTICAL_TARGET = 2;
export const HORIZONTAL_RATIO = 0.25;

/** A 3 x 3 filter, row by row: index (a + 1) * 3 + (b + 1) for row offset a and column offset b. */
export type Filter = number[];
export const ZERO_FILTER: Filter = [0, 0, 0, 0, 0, 0, 0, 0, 0];
/** Show me's filter: −1 0 +1 in every row. */
export const SHOW_ME_FILTER: Filter = [-1, 0, 1, -1, 0, 1, -1, 0, 1];
/** The order Show me fills the cells in. */
export const SHOW_ME_ORDER = [0, 2, 3, 5, 6, 8];

/** A click moves a cell 0 → +1 → −1 → 0. */
export const nextCell = (v: number) => (v === 0 ? 1 : v === 1 ? -1 : 0);

/** The input image, row by row (index i * SIZE + j). */
export function makeImage(): number[] {
  const img = new Array(SIZE * SIZE).fill(0);
  for (let i = SQ_LO; i <= SQ_HI; i++) for (let j = SQ_LO; j <= SQ_HI; j++) img[i * SIZE + j] = 1;
  return img;
}
export const IMAGE = makeImage();

/** Pixel value with zero padding outside the image. */
export function pixel(img: number[], i: number, j: number, size = SIZE): number {
  return i < 0 || j < 0 || i >= size || j >= size ? 0 : img[i * size + j];
}

/** The nine (filter cell, pixel) pairs for the patch centred on (i, j), row by row. */
export function patch(img: number[], f: Filter, i: number, j: number, size = SIZE): { w: number; x: number }[] {
  const out: { w: number; x: number }[] = [];
  for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) out.push({ w: f[(a + 1) * 3 + (b + 1)], x: pixel(img, i + a, j + b, size) });
  return out;
}

/** Slide the filter over every pixel (zero padding, so the output is the same size). */
export function convolve(img: number[], f: Filter, size = SIZE): number[] {
  const out = new Array(size * size).fill(0);
  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      let s = 0;
      for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) s += f[(a + 1) * 3 + (b + 1)] * pixel(img, i + a, j + b, size);
      out[i * size + j] = s;
    }
  }
  return out;
}

/** One row, filter kept fully on the row (the practice question). */
export function convolveRow(row: number[], f: number[]): number[] {
  const out: number[] = [];
  for (let c = 1; c + 1 < row.length; c++) out.push(f[0] * row[c - 1] + f[1] * row[c] + f[2] * row[c + 1]);
  return out;
}

/**
 * How strongly the square's edges light up.
 * Each edge is a boundary between two rows or columns of pixels. For every position along it
 * (rows 5 to 10 for left/right, columns 5 to 10 for top/bottom) take the larger |output| of the
 * two pixels either side, then average.
 */
export function edgeScores(out: number[], size = SIZE): { vertical: number; horizontal: number } {
  const at = (i: number, j: number) => Math.abs(out[i * size + j]);
  let v = 0, hz = 0, n = 0;
  for (let k = EDGE_LO; k <= EDGE_HI; k++) {
    v += Math.max(at(k, SQ_LO - 1), at(k, SQ_LO)) + Math.max(at(k, SQ_HI), at(k, SQ_HI + 1));
    hz += Math.max(at(SQ_LO - 1, k), at(SQ_LO, k)) + Math.max(at(SQ_HI, k), at(SQ_HI + 1, k));
    n += 2;
  }
  return { vertical: v / n, horizontal: hz / n };
}

/** The challenge: left/right edges at least 2, top/bottom edges at most a quarter of that. */
export function isWin(s: { vertical: number; horizontal: number }): boolean {
  return s.vertical >= VERTICAL_TARGET && s.horizontal <= HORIZONTAL_RATIO * s.vertical;
}

/** Largest |output| (sets the brightness scale; at least 1). */
export function maxAbs(out: number[]): number {
  let m = 0;
  for (const v of out) m = Math.max(m, Math.abs(v));
  return Math.max(1, m);
}

/** Signed number as shown on the page: +1, −1, 0 (true minus sign). */
export function signed(v: number, plus = true): string {
  if (v < 0) return '−' + Math.abs(v);
  return v > 0 && plus ? '+' + v : String(v);
}

/** The worked sum for one patch, as three lines (one per filter row) and the total. */
export function workedSum(img: number[], f: Filter, i: number, j: number): { lines: string[]; total: number } {
  const p = patch(img, f, i, j);
  const lines: string[] = [];
  for (let r = 0; r < 3; r++) lines.push(p.slice(r * 3, r * 3 + 3).map((t) => `(${signed(t.w)}×${t.x})`).join(' + '));
  return { lines, total: p.reduce((s, t) => s + t.w * t.x, 0) };
}

// Pure logic for the queens visualiser (DSA 4, recursion and backtracking): board size → frames.
// No DOM, so Node can test it. Rows and columns are 0-based here and shown 1-based on screen.

/** One line in the "unfinished calls" panel: the call working on one row. */
export interface CallLine {
  row: number;
  text: string;
  /** current = the call running now; waiting = an older call; ended = a call that just returned; done = solved. */
  state: 'current' | 'waiting' | 'ended' | 'done';
}

export interface QueenFrame {
  note: string;
  line: number;
  n: number;
  /** Column of the queen in each filled row, top row first. */
  queens: number[];
  /** The row being searched (attacked squares are shaded in it), or -1. */
  row: number;
  /** A queen lifted in this step (drawn as a red outline). */
  lifted?: { row: number; col: number };
  /** A row that ran out of safe squares in this step. */
  deadRow?: number;
  /** The unfinished calls, one per row, top row first. */
  stack: CallLine[];
  backtracks: number;
  placed: number;
  status: 'searching' | 'solved' | 'none';
  [key: string]: unknown;
}

export const QUEENS_CODE = [
  'place(row):',
  '  if row > n: solved, stop',
  '  for column = 1 to n:',
  '    if the square is safe:',
  '      put a queen there',
  '      place(row + 1)',
  '      if solved: stop',
  '      backtrack: lift the queen',
  '  no safe square left: return',
];

/** Pseudocode line shown for each kind of step. */
export const LINE = { start: 0, base: 1, place: 4, lift: 7, none: 8 } as const;

export const MIN_N = 1;
export const MAX_N = 8;
/** The sizes the challenge compares. */
export const GOAL_SIZES = [4, 5, 6, 7, 8];

/** Read the board size from the input box. Throws a readable Error. */
export function parseSize(text: string): number {
  const t = text.trim();
  const n = Number(t);
  if (t === '' || !Number.isInteger(n)) throw new Error('Type one whole number for the board size, for example 6.');
  if (n < MIN_N || n > MAX_N) throw new Error(`Choose a board size from ${MIN_N} to ${MAX_N}, so every square stays readable.`);
  return n;
}

/** Does a queen at (row, col) share a column or diagonal with a queen in the rows above? */
export function attacked(queens: number[], row: number, col: number): boolean {
  for (let r = 0; r < row && r < queens.length; r++) {
    const c = queens[r];
    if (c === col || Math.abs(c - col) === row - r) return true;
  }
  return false;
}

/** The first solution found row by row, left to right, without frames (fast). */
export function firstSolution(n: number): { cols: number[] | null; backtracks: number; placed: number } {
  const cols: number[] = [];
  let backtracks = 0, placed = 0;
  const place = (row: number): boolean => {
    if (row === n) return true;
    for (let c = 0; c < n; c++) {
      if (attacked(cols, row, c)) continue;
      cols.push(c); placed++;
      if (place(row + 1)) return true;
      cols.pop(); backtracks++;
    }
    return false;
  };
  const ok = place(0);
  return { cols: ok ? cols.slice() : null, backtracks, placed };
}

/** Backtracks of the first solution for each size, and the size with the most. */
export function backtracksBySize(sizes = GOAL_SIZES): { counts: Map<number, number>; best: number } {
  const counts = new Map<number, number>();
  for (const n of sizes) counts.set(n, firstSolution(n).backtracks);
  let best = sizes[0];
  for (const n of sizes) if (counts.get(n)! > counts.get(best)!) best = n;
  return { counts, best };
}

const colList = (from: number, to: number) =>
  to === from ? `column ${from + 1} is`
    : to === from + 1 ? `columns ${from + 1} and ${to + 1} are`
      : `columns ${from + 1}–${to + 1} are`;

/** Frames for the row-by-row search: one per placement and one per lift, plus a start and an end frame. */
export function queensFrames(n: number): QueenFrame[] {
  const frames: QueenFrame[] = [];
  const cols: number[] = [];
  let backtracks = 0, placed = 0;
  const board = `${n} × ${n}`;

  const lines = (current: number, currentText: string): CallLine[] => {
    const out: CallLine[] = [];
    for (let r = 0; r < current; r++) out.push({ row: r, text: `row ${r + 1}: trying column ${cols[r] + 1}`, state: 'waiting' });
    out.push({ row: current, text: currentText, state: 'current' });
    return out;
  };
  type Step = Pick<QueenFrame, 'note' | 'line' | 'row' | 'stack' | 'status' | 'lifted' | 'deadRow'>;
  const push = (f: Step) =>
    frames.push({ ...f, n, queens: cols.slice(), backtracks, placed });

  push({ note: `An empty ${board} board. The first call, place(1), works on row 1.`, line: LINE.start, row: 0, status: 'searching',
    stack: [{ row: 0, text: 'row 1: starting', state: 'current' }] });

  const place = (row: number): boolean => {
    if (row === n) return true;
    let start = 0;                 // first column not tried yet in this row
    for (let c = 0; c < n; c++) {
      if (attacked(cols, row, c)) continue;
      cols.push(c);
      placed++;
      let note: string;
      if (start === 0 && c === 0) note = `Row ${row + 1}: column 1 is safe. Put a queen there.`;
      else if (start === 0) note = `Row ${row + 1}: ${colList(0, c - 1)} attacked. Put a queen in column ${c + 1}, the first safe square.`;
      else note = `Row ${row + 1}: the next safe square to the right is column ${c + 1}. Put the queen there.`;
      push({ note, line: LINE.place, row, status: 'searching', stack: lines(row, `row ${row + 1}: trying column ${c + 1}`) });

      if (place(row + 1)) return true;

      cols.pop();
      backtracks++;
      const st = lines(row, `row ${row + 1}: lifted from column ${c + 1}`);
      st.push({ row: row + 1, text: `row ${row + 2}: no safe square, ends`, state: 'ended' });
      push({
        note: `Row ${row + 2} has no safe square left. Back to row ${row + 1}: lift its queen from column ${c + 1}. That is backtrack ${backtracks}.`,
        line: LINE.lift, row, lifted: { row, col: c }, deadRow: row + 1, status: 'searching', stack: st,
      });
      start = c + 1;
    }
    return false;
  };

  if (place(0)) {
    push({
      note: `Every row has a queen: the base case. Solution found after **${backtracks} backtrack${backtracks === 1 ? '' : 's'}**.`,
      line: LINE.base, row: -1, status: 'solved',
      stack: cols.map((c, r) => ({ row: r, text: `row ${r + 1}: queen in column ${c + 1}`, state: 'done' as const })),
    });
  } else {
    push({
      note: `Row 1 has no safe square left, and there is no row above it. **No solution** on a ${board} board, after ${backtracks} backtracks.`,
      line: LINE.none, row: -1, deadRow: 0, status: 'none', stack: [],
    });
  }
  return frames;
}

/** The challenge, as a pure function of the sizes the student ran (size → backtracks). */
export function judge(tried: Map<number, number>): { won: boolean; message: string } {
  const { counts, best } = backtracksBySize();
  const seen = GOAL_SIZES.filter((s) => tried.has(s));
  const list = seen.map((s) => `${s} (${tried.get(s)})`).join(', ');
  if (seen.length >= 2 && tried.has(best)) {
    const others = seen.filter((s) => s !== best).map((s) => `size ${s}: ${tried.get(s)}`).join(', ');
    return {
      won: true,
      message: `**Size ${best} needs the most: ${tried.get(best)} backtracks.** You compared it with ${others}. ` +
        `A bigger board is not always slower: size 7 needs only ${counts.get(7)}.`,
    };
  }
  if (seen.length === 0) return { won: false, message: 'The challenge compares sizes 4 to 8.' };
  if (seen.length === 1) return { won: false, message: `Sizes tried: ${list}. Run another size from 4 to 8 to compare.` };
  let top = seen[0];
  for (const s of seen) if (tried.get(s)! > tried.get(top)!) top = s;
  return { won: false, message: `Sizes tried: ${list}. The most so far is size ${top}. Have you tried every size from 4 to 8?` };
}

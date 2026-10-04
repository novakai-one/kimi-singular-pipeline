// Pure logic for the edit-distance visualiser ("Fill the table"): two words → frames. No DOM, so Node can test it.
// Row i, column j of the table = the fewest edits that turn the first i letters of word a into the first j letters of word b.

export type Op = 'keep' | 'change' | 'insert' | 'delete';

/** A cell read while filling another one, and what it adds (+1, or +0 for a free diagonal). */
export interface Read { i: number; j: number; add: number; dir: 'above' | 'left' | 'diagonal' }

/** One step of the walk back: at cell (i, j), the op that produced it, coming from cell (pi, pj). */
export interface Step { i: number; j: number; op: Op; pi: number; pj: number }

export interface EdFrame {
  note: string;
  line: number;
  a: string;
  b: string;
  /** Snapshot of the table; null = not filled yet. */
  table: (number | null)[][];
  /** The cell being filled (yellow), or where the walk back has reached. */
  cur?: [number, number];
  /** Cells being read (blue). */
  reads?: Read[];
  /** Cells filled together in this frame (yellow): the top row or the left column. */
  fresh?: [number, number][];
  /** The walk back so far, starting at the bottom-right cell. */
  path?: Step[];
  /** Edits found so far, in order from the start of the word. */
  edits: string[];
  /** Inner cells filled so far, out of n × m. */
  filled: number;
  /** The final answer for these two words. */
  dist: number;
  /** Last frame: the answer cell turns green. */
  done?: boolean;
  [key: string]: unknown;
}

export const MAX_LEN = 10;

export const CODE = [
  'D[0][j] = j   (top row: j inserts)',
  'D[i][0] = i   (left column: i deletes)',
  'for each row i, each column j:',
  '  c = 0 if the letters match, else 1',
  '  D[i][j] = min(above + 1, left + 1, diagonal + c)',
  'answer = D[n][m], the bottom-right cell',
  'walk back to the cell that gave each min: above = delete, left = insert, diagonal = change (or keep, if c = 0)',
];

/** Parse "kitten, sitting" into two lowercase words. Throws a readable Error. */
export function parseInput(text: string): { a: string; b: string } {
  const parts = text.trim().toLowerCase().split(/[\s,]+/).filter(Boolean);
  if (parts.length !== 2) throw new Error('Type two words separated by a comma, like: kitten, sitting');
  if (parts.some((w) => !/^[a-z]+$/.test(w))) throw new Error('Use the letters a to z only, like: kitten, sitting');
  if (parts.some((w) => w.length > MAX_LEN)) throw new Error(`Use words of at most ${MAX_LEN} letters each, so the table stays readable.`);
  return { a: parts[0], b: parts[1] };
}

/** The full table D, (n + 1) rows by (m + 1) columns. */
export function editTable(a: string, b: string): number[][] {
  const n = a.length, m = b.length;
  const D = Array.from({ length: n + 1 }, (_, i) => Array.from({ length: m + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const c = a[i - 1] === b[j - 1] ? 0 : 1;
      D[i][j] = Math.min(D[i - 1][j] + 1, D[i][j - 1] + 1, D[i - 1][j - 1] + c);
    }
  }
  return D;
}

export const editDistance = (a: string, b: string) => editTable(a, b)[a.length][b.length];

/** Walk back from the bottom-right cell to (0, 0). Ties prefer: keep, change, delete, insert. */
export function traceBack(a: string, b: string, D = editTable(a, b)): Step[] {
  const steps: Step[] = [];
  let i = a.length, j = b.length;
  while (i > 0 || j > 0) {
    const v = D[i][j];
    let op: Op;
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1] && D[i - 1][j - 1] === v) op = 'keep';
    else if (i > 0 && j > 0 && D[i - 1][j - 1] + 1 === v) op = 'change';
    else if (i > 0 && D[i - 1][j] + 1 === v) op = 'delete';
    else op = 'insert';
    const pi = op === 'insert' ? i : i - 1;
    const pj = op === 'delete' ? j : j - 1;
    steps.push({ i, j, op, pi, pj });
    i = pi; j = pj;
  }
  return steps;
}

/** One edit in words, e.g. "change k to s". Empty for a keep. */
export function editWords(a: string, b: string, s: Step): string {
  if (s.op === 'change') return `change ${a[s.i - 1]} to ${b[s.j - 1]}`;
  if (s.op === 'insert') return `insert ${b[s.j - 1]}`;
  if (s.op === 'delete') return `delete ${a[s.i - 1]}`;
  return '';
}

/** The edits in order from the start of the word, e.g. ["change k to s", "change e to i", "insert g"]. */
export function editList(a: string, b: string): string[] {
  return traceBack(a, b).slice().reverse().map((s) => editWords(a, b, s)).filter(Boolean);
}

/** The word after each edit, starting from a and ending at b: kitten → sitten → sittin → sitting. */
export function wordChain(a: string, b: string): string[] {
  const out = [a];
  for (const s of traceBack(a, b).slice().reverse()) {
    if (s.op !== 'keep') out.push(b.slice(0, s.j) + a.slice(s.i));
  }
  return out;
}

const q = (w: string) => `"${w}"`;

// ------------------------------------------------------------------ frames
export function editFrames(a: string, b: string): EdFrame[] {
  const n = a.length, m = b.length;
  const D = editTable(a, b);
  const dist = D[n][m];
  const T: (number | null)[][] = Array.from({ length: n + 1 }, () => Array.from({ length: m + 1 }, () => null));
  const frames: EdFrame[] = [];
  let filled = 0;
  type Part = Pick<EdFrame, 'note' | 'line' | 'cur' | 'reads' | 'fresh' | 'path' | 'done'> & { edits?: string[] };
  const push = (f: Part) => frames.push({ ...f, edits: f.edits ?? [], a, b, table: T.map((r) => r.slice()), filled, dist });

  push({ note: `Turn ${q(a)} (down the side) into ${q(b)} (along the top). Cell (i, j) will hold how many edits turn the first i letters into the first j letters.`, line: -1 });

  for (let j = 0; j <= m; j++) T[0][j] = j;
  push({ note: `Top row: turning no letters into the first j letters of ${q(b)} takes j inserts: ${D[0].join(', ')}.`, line: 0,
    fresh: D[0].map((_, j) => [0, j] as [number, number]) });

  for (let i = 1; i <= n; i++) T[i][0] = i;
  push({ note: `Left column: turning the first i letters of ${q(a)} into no letters takes i deletes: ${D.map((r) => r[0]).join(', ')}.`, line: 1,
    fresh: D.map((_, i) => [i, 0] as [number, number]) });

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const x = a[i - 1], y = b[j - 1];
      const c = x === y ? 0 : 1;
      const up = D[i - 1][j], left = D[i][j - 1], diag = D[i - 1][j - 1];
      T[i][j] = D[i][j];
      filled++;
      const why = c ? `${x} ≠ ${y}, so the diagonal adds 1.` : `The letters match (${x} = ${y}), so the diagonal adds 0.`;
      push({
        note: `${q(a.slice(0, i))} → ${q(b.slice(0, j))}: min(${up}+1, ${left}+1, ${diag}+${c}) = **${D[i][j]}**. ${why}`,
        line: 4,
        cur: [i, j],
        reads: [
          { i: i - 1, j, add: 1, dir: 'above' },
          { i, j: j - 1, add: 1, dir: 'left' },
          { i: i - 1, j: j - 1, add: c, dir: 'diagonal' },
        ],
      });
    }
  }

  push({ note: `The table is full. The bottom-right cell says **${dist} edit${dist === 1 ? '' : 's'}** turn ${q(a)} into ${q(b)}. Walk back to find which.`,
    line: 5, cur: [n, m], path: [] });

  const steps = traceBack(a, b, D);
  const found: string[] = [];
  const path: Step[] = [];
  for (const s of steps) {
    path.push(s);
    const v = D[s.i][s.j], u = D[s.pi][s.pj];
    const w = editWords(a, b, s);
    if (w) found.unshift(w);
    let note: string;
    if (s.op === 'keep') note = `${v} = diagonal ${u} + 0: ${a[s.i - 1]} matches ${b[s.j - 1]}, so keep it. No edit.`;
    else if (s.op === 'change') note = `${v} = diagonal ${u} + 1: **${w}**.`;
    else if (s.op === 'delete') note = `${v} = above ${u} + 1: **${w}**.`;
    else note = `${v} = left ${u} + 1: **${w}**.`;
    push({ note, line: 6, cur: [s.pi, s.pj], path: path.slice(), edits: found.slice() });
  }

  const chain = wordChain(a, b);
  push({
    note: dist === 0
      ? `The words are the same: **0 edits**.`
      : `**${dist} edit${dist === 1 ? '' : 's'}**: ${found.join(', ')}. ${chain.join(' → ')}.`,
    line: 5, path: path.slice(), edits: found.slice(), done: true,
  });
  return frames;
}

/** Positions where two same-length words have different letters. */
export const differingPositions = (a: string, b: string) => [...a].filter((c, i) => c !== b[i]).length;

/** The challenge: two words of the same length (at least GOAL_LEN letters) that need fewer edits than
 *  the number of positions where their letters differ. Comparing column by column overcounts them. */
export const GOAL_LEN = 4;
export const meetsGoal = (a: string, b: string) =>
  a !== b && a.length === b.length && a.length >= GOAL_LEN && editDistance(a, b) < differingPositions(a, b);

/** Word list for the Random button. */
export const WORDS = [
  'kitten', 'sitting', 'sunday', 'saturday', 'garden', 'harden', 'planet', 'plant', 'winter', 'water', 'mother',
  'other', 'spring', 'string', 'robot', 'rabbit', 'stone', 'tones', 'music', 'magic', 'listen', 'silent', 'bread',
  'beard', 'camel', 'candle', 'table', 'cable', 'flower', 'flour', 'orange', 'range', 'night', 'light', 'thing',
];

/** Two different random words that do not already meet the goal. */
export function randomPair(rand: () => number = Math.random): string {
  for (;;) {
    const a = WORDS[Math.floor(rand() * WORDS.length)];
    const b = WORDS[Math.floor(rand() * WORDS.length)];
    if (a !== b && !meetsGoal(a, b)) return `${a}, ${b}`;
  }
}

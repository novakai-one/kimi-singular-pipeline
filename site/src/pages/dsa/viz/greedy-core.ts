// Pure logic for the greedy visualiser ("Make change"): input → frames. No DOM, so Node can test it.
// Left: biggest-first (take the largest coin that still fits, again and again).
// Right: the fewest coins possible, from a table of the fewest coins for every amount 0..target.

export interface ChangeFrame {
  note: string;
  line: number;
  phase: 'greedy' | 'fill' | 'trace' | 'end';
  /** Coin values, largest first, no repeats. */
  coins: number[];
  amount: number;
  /** Biggest-first: coins taken so far, and the amount still to make. */
  gStack: number[];
  gLeft: number;
  gState: 'run' | 'done' | 'stuck';
  /** The full table (−1 = can't be made). Cells 0..filled are shown. */
  best: number[];
  filled: number;
  /** Fewest possible: coins put on the stack so far (during the trace back). */
  bStack: number[];
  bState: 'wait' | 'fill' | 'trace' | 'done' | 'none';
  /** Table cells: the current amount (yellow), amounts looked at (blue), the trace-back path (green). */
  cur?: number;
  look?: number[];
  path?: number[];
  /** Coin chips: the chosen one (yellow), the ones being tried (blue), the ones too big (faded). */
  chipHi?: number;
  chipCmp?: number[];
  chipDim?: number[];
  /** Which stack just got a coin (drawn red). */
  fresh?: 'g' | 'b';
  /** Final sizes, so every frame of a run has the same layout. */
  gTotal: number;
  bTotal: number;
  [key: string]: unknown;
}

export const CHANGE_CODE = [
  'biggest first:',
  '  left = amount',
  '  while left > 0:',
  '    c = largest coin ≤ left',
  '    if none fits: stuck, stop',
  '    add c to stack; left −= c',
  'fewest possible:',
  '  best[0] = 0',
  '  for x = 1 to amount:',
  '    try each coin c ≤ x',
  '    best[x] = 1 + min best[x−c]',
  '  x = amount',
  '  while x > 0:',
  '    add the coin on top of x',
  '    x −= that coin',
  'compare the two counts',
];

export const MAX_COINS = 6;
export const MAX_COIN = 100;
export const MAX_AMOUNT = 60;

const HOW = 'Type the coin values, a semicolon, then the amount, like: 1 5 10 25; 30';

/** Parse "1 5 10 25; 30". Returns the distinct coins, largest first. Throws a readable Error. */
export function parseChange(text: string): { coins: number[]; amount: number } {
  const parts = text.split(';');
  if (parts.length !== 2) throw new Error(HOW);
  const [coinPart, amountPart] = parts;
  const raw = coinPart.split(/[\s,]+/).filter(Boolean).map(Number);
  if (!raw.length) throw new Error('Put at least one coin value before the semicolon. ' + HOW);
  if (raw.some((n) => !Number.isInteger(n))) throw new Error('Coin values must be whole numbers separated by spaces, like: 1 5 10 25');
  if (raw.some((n) => n < 1 || n > MAX_COIN)) throw new Error(`Coin values must be from 1 to ${MAX_COIN}.`);
  const coins = [...new Set(raw)].sort((a, b) => b - a);
  if (coins.length > MAX_COINS) throw new Error(`Use at most ${MAX_COINS} different coin values, so the picture stays readable.`);
  const t = amountPart.trim();
  const amount = Number(t);
  if (t === '' || !Number.isInteger(amount) || amount < 1 || amount > MAX_AMOUNT) {
    throw new Error(`After the semicolon, type one whole amount from 1 to ${MAX_AMOUNT}.`);
  }
  return { coins, amount };
}

/** Biggest-first. `left` > 0 means it got stuck: no coin fits what is left. */
export function greedyChange(coins: number[], amount: number): { stack: number[]; left: number } {
  const desc = [...new Set(coins)].sort((a, b) => b - a);
  const stack: number[] = [];
  let left = amount;
  while (left > 0) {
    const c = desc.find((v) => v <= left);
    if (c === undefined) break;
    stack.push(c);
    left -= c;
  }
  return { stack, left };
}

/**
 * The table: best[x] = fewest coins that make x exactly (−1 if no set of coins makes x),
 * last[x] = the coin on top of that best answer. Ties go to the largest coin, so when biggest-first
 * is already a best answer, the trace back gives exactly the same coins.
 */
export function fewestTable(coins: number[], amount: number): { best: number[]; last: number[] } {
  const desc = [...new Set(coins)].sort((a, b) => b - a);
  const best = [0];
  const last = [0];
  for (let x = 1; x <= amount; x++) {
    let b = -1, l = 0;
    for (const c of desc) {
      if (c > x || best[x - c] < 0) continue;
      if (b < 0 || best[x - c] + 1 < b) { b = best[x - c] + 1; l = c; }
    }
    best.push(b);
    last.push(l);
  }
  return { best, last };
}

/** The coins of one best answer (from the trace back), or null if the amount can't be made. */
export function fewestChange(coins: number[], amount: number): number[] | null {
  const { best, last } = fewestTable(coins, amount);
  if (best[amount] < 0) return null;
  const out: number[] = [];
  for (let x = amount; x > 0; x -= last[x]) out.push(last[x]);
  return out;
}

/** Coins 1, 3, 4 and amount 6: the prediction's example, which the challenge excludes. */
export function isPredictionExample(coins: number[], amount: number): boolean {
  const set = [...new Set(coins)].sort((a, b) => a - b);
  return amount === 6 && set.join(' ') === '1 3 4';
}

export interface ChangeResult {
  greedy: number[];
  stuck: boolean;
  /** null when no set of coins makes the amount exactly. */
  fewest: number[] | null;
  /** Biggest-first used more coins than needed, or got stuck although an exact answer exists. */
  greedyWrong: boolean;
  /** greedyWrong, and not the prediction's example. */
  win: boolean;
}

export function compareChange(coins: number[], amount: number): ChangeResult {
  const g = greedyChange(coins, amount);
  const fewest = fewestChange(coins, amount);
  const stuck = g.left > 0;
  const greedyWrong = fewest !== null && (stuck || g.stack.length > fewest.length);
  return { greedy: g.stack, stuck, fewest, greedyWrong, win: greedyWrong && !isPredictionExample(coins, amount) };
}

const coinWord = (n: number) => `${n} coin${n === 1 ? '' : 's'}`;
/** "25 + 5", or "4 × 10 + 3 × 1" for long stacks. */
export function sumText(stack: number[]): string {
  if (!stack.length) return '';
  const sorted = stack.slice().sort((a, b) => b - a);
  if (sorted.length <= 6) return sorted.join(' + ');
  const groups: [number, number][] = [];
  for (const v of sorted) {
    if (groups.length && groups[groups.length - 1][0] === v) groups[groups.length - 1][1]++;
    else groups.push([v, 1]);
  }
  return groups.map(([v, k]) => (k === 1 ? String(v) : `${k} × ${v}`)).join(' + ');
}

// ------------------------------------------------------------------ frames
export function changeFrames(coinsIn: number[], amount: number): ChangeFrame[] {
  const coins = [...new Set(coinsIn)].sort((a, b) => b - a);
  const frames: ChangeFrame[] = [];
  const g = greedyChange(coins, amount);
  const { best, last } = fewestTable(coins, amount);
  const fewest = best[amount] >= 0 ? fewestChange(coins, amount)! : null;
  const gTotal = g.stack.length;
  const bTotal = fewest ? fewest.length : 0;

  let gStack: number[] = [];
  let gLeft = amount;
  let gState: ChangeFrame['gState'] = 'run';
  let filled = -1;
  let bStack: number[] = [];
  let bState: ChangeFrame['bState'] = 'wait';
  const push = (f: Partial<ChangeFrame> & { note: string; line: number; phase: ChangeFrame['phase'] }) =>
    frames.push({ coins, amount, gStack: gStack.slice(), gLeft, gState, best, filled, bStack: bStack.slice(), bState, gTotal, bTotal, ...f });

  // ---------------- left: biggest first
  push({ phase: 'greedy', line: 1, note: `**Biggest first.** Coins ${coins.slice().reverse().join(', ')}. Amount to make: **${amount}**.` });
  while (gLeft > 0) {
    const c = coins.find((v) => v <= gLeft);
    const tooBig = coins.filter((v) => v > gLeft);
    if (c === undefined) {
      gState = 'stuck';
      push({ phase: 'greedy', line: 4, chipDim: tooBig,
        note: `Every coin is bigger than ${gLeft}. Biggest-first is **stuck** with ${gLeft} left to make.` });
      break;
    }
    const before = gLeft;
    gStack.push(c);
    gLeft -= c;
    push({ phase: 'greedy', line: 5, chipHi: c, chipDim: tooBig, fresh: 'g',
      note: `The largest coin that fits in ${before} is **${c}**. Take it: ${gLeft} left.` });
  }
  if (gState === 'run') {
    gState = 'done';
    push({ phase: 'greedy', line: 2, note: `Nothing left. Biggest-first uses **${coinWord(gStack.length)}**: ${sumText(gStack)} = ${amount}.` });
  }

  // ---------------- right: fill the table
  bState = 'fill';
  filled = 0;
  push({ phase: 'fill', line: 7, cur: 0,
    note: `**Fewest possible.** Fill a table: the fewest coins for every amount from 0 to ${amount}. Amount 0 needs **0** coins.` });
  for (let x = 1; x <= amount; x++) {
    filled = x;
    const fits = coins.filter((c) => c <= x).reverse();
    const look = fits.map((c) => x - c);
    const left = look.length === 1 ? `the only coin that fits leaves ${look[0]}` : `the coins that fit leave ${look.slice(0, -1).join(', ')} or ${look[look.length - 1]}`;
    let note: string;
    if (!fits.length) {
      note = `Amount ${x}: every coin is bigger than ${x}, so ${x} **can't be made**.`;
    } else if (best[x] < 0) {
      note = `Amount ${x}: ${left}, and ${look.length === 1 ? 'that can\'t' : 'none of those can'} be made. So ${x} **can't be made** either.`;
    } else {
      const rest = x - last[x];
      note = look.length === 1
        ? `Amount ${x}: ${left} (${coinWord(best[rest])}). So ${x} needs ${best[rest]} + 1 = **${best[x]}**, with a ${last[x]} on top.`
        : `Amount ${x}: ${left}. Of those, ${rest} needs the fewest (${coinWord(best[rest])}), so ${x} needs ${best[rest]} + 1 = **${best[x]}**, with a ${last[x]} on top.`;
    }
    push({ phase: 'fill', line: 10, cur: x, look, chipCmp: fits, chipHi: best[x] >= 0 ? last[x] : undefined, note });
  }

  // ---------------- right: trace back
  const path: number[] = [];
  if (!fewest) {
    bState = 'none';
    push({ phase: 'trace', line: 11, cur: amount,
      note: `The table says ${amount} **can't be made** exactly with these coins, so there is nothing to trace back.` });
  } else {
    bState = 'trace';
    for (let x = amount; x > 0; x -= last[x]) {
      const c = last[x];
      bStack.push(c);
      path.push(x);
      push({ phase: 'trace', line: 13, cur: x, look: [x - c], path: path.slice(0, -1), chipHi: c, fresh: 'b',
        note: `Amount ${x} was best made with a **${c}** on top. Put it on the stack and go to ${x} − ${c} = ${x - c}.` });
    }
    path.push(0);
    bState = 'done';
    push({ phase: 'trace', line: 12, path: path.slice(),
      note: `Back at 0. The fewest possible is **${coinWord(bStack.length)}**: ${sumText(bStack)} = ${amount}.` });
  }

  // ---------------- compare
  let end: string;
  if (gState === 'stuck') {
    end = fewest
      ? `Biggest-first got stuck, but **${coinWord(bTotal)}** make ${amount} exactly: ${sumText(fewest)}. Biggest-first was wrong.`
      : `Neither side can make ${amount} exactly with these coins.`;
  } else if (gTotal > bTotal) {
    end = `Biggest-first: ${coinWord(gTotal)}. Fewest possible: ${coinWord(bTotal)}. **Biggest-first used ${gTotal - bTotal} more than needed.**`;
  } else {
    end = `Both stacks hold the same **${coinWord(gTotal)}**. Here biggest-first found a best answer.`;
  }
  push({ phase: 'end', line: 15, path, note: end });
  return frames;
}

// ------------------------------------------------------------------ the practice answers (tested; also used in the notebook)

/** Meetings in one room by earliest finish. A meeting may start when the last one ends. */
export function earliestFinish(meetings: [number, number][]): [number, number][] {
  const out: [number, number][] = [];
  let free = -Infinity;
  for (const m of meetings.slice().sort((a, b) => a[1] - b[1] || a[0] - b[0])) {
    if (m[0] >= free) { out.push(m); free = m[1]; }
  }
  return out;
}

/** Most meetings with no overlaps, by trying every subset (small inputs only). */
export function mostMeetingsBrute(meetings: [number, number][]): number {
  const n = meetings.length;
  let bestCount = 0;
  for (let mask = 0; mask < 1 << n; mask++) {
    const pick = meetings.filter((_, i) => mask & (1 << i)).sort((a, b) => a[0] - b[0]);
    if (pick.every((m, i) => i === 0 || m[0] >= pick[i - 1][1])) bestCount = Math.max(bestCount, pick.length);
  }
  return bestCount;
}

/** Items you can cut: take the most valuable per kilogram first, cutting the last one to fit. */
export function cutToFit(items: { kg: number; value: number }[], capacity: number): number {
  let room = capacity, total = 0;
  for (const it of items.slice().sort((a, b) => b.value / b.kg - a.value / a.kg)) {
    if (room <= 0) break;
    const take = Math.min(it.kg, room);
    total += (it.value * take) / it.kg;
    room -= take;
  }
  return total;
}

/** Items you can't cut: the same rule (whole items only, best value per kilogram first). */
export function wholeByRatio(items: { kg: number; value: number }[], capacity: number): number {
  let room = capacity, total = 0;
  for (const it of items.slice().sort((a, b) => b.value / b.kg - a.value / a.kg)) {
    if (it.kg <= room) { total += it.value; room -= it.kg; }
  }
  return total;
}

/** Items you can't cut: the true best, by trying every subset. */
export function wholeBest(items: { kg: number; value: number }[], capacity: number): number {
  let bestValue = 0;
  for (let mask = 0; mask < 1 << items.length; mask++) {
    let kg = 0, value = 0;
    items.forEach((it, i) => { if (mask & (1 << i)) { kg += it.kg; value += it.value; } });
    if (kg <= capacity) bestValue = Math.max(bestValue, value);
  }
  return bestValue;
}

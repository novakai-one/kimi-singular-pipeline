// Pure logic for the stacks and queues visualiser: input → frames. No DOM, so Node can test it.
// Mode 1 checks brackets with a pile (a stack). Mode 2 puts the same items through a pile and a line (a queue).

/** Cell colours: look = blue (being read / compared), open = yellow (still open, on the pile),
 *  done = green (matched / finished), red = wrong, or the item that just moved. */
export type Cell = '' | 'look' | 'open' | 'done' | 'red' | 'out' | 'dim';

export interface PileItem { ch: string; at: number }

export interface BracketFrame {
  kind: 'brackets';
  note: string;
  line: number;
  chars: string[];
  /** Position being read, or -1 (before the start and at the end). */
  ptr: number;
  charState: Cell[];
  /** Open brackets still waiting, bottom first. */
  pile: PileItem[];
  pileState: Cell[];
  /** Matched pairs so far: [open position, close position]. */
  pairs: [number, number][];
  depth: number;
  maxDepth: number;
  /** Pile slots to draw: the deepest the pile gets in this run, at least 4. */
  slots: number;
  status: 'running' | 'ok' | 'bad';
  /** Plain-text result lines drawn in the picture on the last frame. */
  verdict?: string[];
  /** The pile itself is drawn red (a closing bracket found it empty). */
  pileBad?: boolean;
  [key: string]: unknown;
}

export interface OrderFrame {
  kind: 'order';
  note: string;
  line: number;
  items: string[];
  /** Bottom first. */
  stack: string[];
  /** Front first. */
  queue: string[];
  stackOut: string[];
  queueOut: string[];
  stackState: Cell[];
  queueState: Cell[];
  stackOutState: Cell[];
  queueOutState: Cell[];
  [key: string]: unknown;
}

export type SQFrame = BracketFrame | OrderFrame;

export const BRACKET_CODE = [
  'pile = empty',
  'for each bracket b, left to right:',
  '  if b opens: push b on the pile',
  '  else if the pile is empty: wrong',
  '  else if b matches the top: pop the top',
  '  else: wrong',
  'matched only if the pile ends empty',
];

export const ORDER_CODE = [
  'stack = empty pile, queue = empty line',
  'for each item x:',
  '  stack: push x on the top',
  '  queue: add x at the back',
  'until both are empty:',
  '  stack: pop the top',
  '  queue: take the front',
];

export const OPENERS = '([{';
export const CLOSERS = ')]}';
const PARTNER: Record<string, string> = { ')': '(', ']': '[', '}': '{', '(': ')', '[': ']', '{': '}' };
export const MAX_BRACKETS = 12;
export const MIN_ITEMS = 2;
export const MAX_ITEMS = 8;
/** The challenge: a matched string whose pile gets this deep. */
export const GOAL_DEPTH = 4;
/** The page's opening input: the string from the problem (not matched, so it does not meet the goal). */
export const DEFAULT_BRACKETS = '{ [ ( ] }';
/** Show me plays this one: matched, and the pile gets 4 deep. */
export const SHOW_ME_BRACKETS = '{ [ ( ( ) ) ] }';
export const DEFAULT_ITEMS = 'A B C D';
export const BRACKET_PRESETS = [
  { label: 'The problem', value: DEFAULT_BRACKETS },
  { label: 'From the guess', value: '( [ ] )' },
  { label: 'Crossed', value: '( [ ) ]' },
  { label: 'One left open', value: '( { [ ] }' },
];

/** Does this input meet the challenge? Matched, and the pile gets at least GOAL_DEPTH deep. */
export function meetsGoal(text: string): boolean {
  const r = checkBrackets(parseBrackets(text));
  return r.ok && r.maxDepth >= GOAL_DEPTH;
}

const isOpen = (c: string) => OPENERS.includes(c);
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;

// ------------------------------------------------------------------ input
/** "{ [ ( ] }" → ['{', '[', '(', ']', '}']. Throws a readable Error. */
export function parseBrackets(text: string): string[] {
  const chars = text.replace(/\s+/g, '').split('');
  const bad = chars.find((c) => !OPENERS.includes(c) && !CLOSERS.includes(c));
  if (bad !== undefined) throw new Error(`"${bad}" is not a bracket. Use only ( ) [ ] { } and spaces, for example: { [ ( ) ] }`);
  if (!chars.length) throw new Error('Type at least one bracket, for example: ( [ ] )');
  if (chars.length > MAX_BRACKETS) throw new Error(`Use at most ${MAX_BRACKETS} brackets, so every one stays readable.`);
  return chars;
}

/** "A B C D" or "ABCD" → ['A', 'B', 'C', 'D']. Throws a readable Error. */
export function parseItems(text: string): string[] {
  let parts = text.split(/[\s,]+/).filter(Boolean);
  if (parts.length === 1 && /^[A-Za-z0-9]+$/.test(parts[0])) parts = parts[0].split('');
  const help = `Type ${MIN_ITEMS} to ${MAX_ITEMS} letters or digits separated by spaces, for example: A B C D`;
  if (parts.some((p) => !/^[A-Za-z0-9]$/.test(p))) throw new Error(help);
  if (parts.length < MIN_ITEMS || parts.length > MAX_ITEMS) throw new Error(help);
  return parts;
}

// ------------------------------------------------------------------ bracket checker
export type BracketError =
  | { kind: 'mismatch'; at: number; ch: string; top: PileItem }
  | { kind: 'empty'; at: number; ch: string }
  | { kind: 'leftover'; open: PileItem[] };

export interface BracketCheck { ok: boolean; maxDepth: number; error?: BracketError }

/** The checker without frames: matched or not, the deepest the pile got, and what went wrong. */
export function checkBrackets(chars: string[]): BracketCheck {
  const pile: PileItem[] = [];
  let maxDepth = 0;
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];
    if (isOpen(c)) {
      pile.push({ ch: c, at: i });
      maxDepth = Math.max(maxDepth, pile.length);
    } else if (!pile.length) {
      return { ok: false, maxDepth, error: { kind: 'empty', at: i, ch: c } };
    } else if (pile[pile.length - 1].ch === PARTNER[c]) {
      pile.pop();
    } else {
      return { ok: false, maxDepth, error: { kind: 'mismatch', at: i, ch: c, top: pile[pile.length - 1] } };
    }
  }
  if (pile.length) return { ok: false, maxDepth, error: { kind: 'leftover', open: pile } };
  return { ok: true, maxDepth };
}

/** One sentence saying which bracket is wrong (backticks around brackets: inline markdown). */
export function describeError(e: BracketError): string {
  if (e.kind === 'mismatch') return `\`${e.ch}\` at position ${e.at} does not match the top of the pile, \`${e.top.ch}\` from position ${e.top.at}`;
  if (e.kind === 'empty') return `\`${e.ch}\` at position ${e.at} closes, but nothing is open`;
  const list = e.open.map((p) => `\`${p.ch}\` at position ${p.at}`).join(', ');
  return `${e.open.length === 1 ? 'one bracket is' : `${e.open.length} brackets are`} never closed: ${list}`;
}

export function bracketFrames(chars: string[]): BracketFrame[] {
  const n = chars.length;
  const frames: BracketFrame[] = [];
  const pile: PileItem[] = [];
  const pairs: [number, number][] = [];
  const matched = new Set<number>();
  let maxDepth = 0;
  const slots = Math.max(GOAL_DEPTH, checkBrackets(chars).maxDepth);

  /** Row colours: matched = green, still open = yellow, unread = plain. */
  const rowState = (): Cell[] => chars.map((_, i) => (matched.has(i) ? 'done' : pile.some((p) => p.at === i) ? 'open' : ''));
  const pileState = (): Cell[] => pile.map(() => 'open');
  const push = (f: Partial<BracketFrame> & { note: string; line: number }) => frames.push({
    kind: 'brackets', chars, ptr: -1, charState: rowState(), pile: pile.slice(), pileState: pileState(),
    pairs: pairs.map((p) => [p[0], p[1]] as [number, number]), depth: pile.length, maxDepth, slots, status: 'running', ...f,
  });

  push({ note: `Read the ${plural(n, 'bracket')} from left to right. The pile starts empty.`, line: 0 });

  for (let i = 0; i < n; i++) {
    const c = chars[i];
    if (isOpen(c)) {
      pile.push({ ch: c, at: i });
      const deeper = pile.length > maxDepth;
      maxDepth = Math.max(maxDepth, pile.length);
      const cs = rowState(); cs[i] = 'look';
      push({ note: `\`${c}\` at position ${i} opens. Push it on the pile. Depth ${pile.length}${deeper && pile.length > 1 ? ', the deepest so far' : ''}.`,
        line: 2, ptr: i, charState: cs });
      continue;
    }
    if (!pile.length) {
      const cs = rowState(); cs[i] = 'red';
      push({ note: `\`${c}\` at position ${i} closes, but the pile is empty. Nothing is open for it to match, so **it is the wrong bracket**.`,
        line: 3, ptr: i, charState: cs, status: 'bad', pileBad: true,
        verdict: ['Not matched.', `${c} at position ${i} has nothing open to match.`] });
      return frames;
    }
    const top = pile[pile.length - 1];
    let cs = rowState(); cs[i] = 'look'; cs[top.at] = 'look';
    const ps = pileState(); ps[ps.length - 1] = 'look';
    push({ note: `\`${c}\` at position ${i} closes. Compare it with the top of the pile: \`${top.ch}\` from position ${top.at}.`,
      line: 4, ptr: i, charState: cs, pileState: ps });
    if (top.ch === PARTNER[c]) {
      pile.pop();
      matched.add(top.at); matched.add(i);
      pairs.push([top.at, i]);
      push({ note: `\`${top.ch}\` and \`${c}\` match. Pop \`${top.ch}\` off the pile. Depth ${pile.length}.`, line: 4, ptr: i });
    } else {
      cs = rowState(); cs[i] = 'red'; cs[top.at] = 'look';            // the wrong one is red; the top it failed to match stays blue
      push({ note: `\`${c}\` does not match \`${top.ch}\`. The \`${top.ch}\` at position ${top.at} must close first, so **\`${c}\` at position ${i} is the wrong bracket**.`,
        line: 5, ptr: i, charState: cs, pileState: ps, status: 'bad',
        verdict: ['Not matched.', `${c} at position ${i} does not match ${top.ch} at position ${top.at}.`] });
      return frames;
    }
  }

  if (pile.length) {
    const cs = rowState();
    for (const p of pile) cs[p.at] = 'red';
    const list = pile.map((p) => `\`${p.ch}\` (position ${p.at})`).join(', ');
    const short = pile.length <= 3 ? pile.map((p) => `${p.ch} at ${p.at}`).join(', ') : `${pile.length} brackets`;
    push({ note: `The end, but the pile still holds ${list}. ${pile.length === 1 ? 'It was' : 'They were'} never closed, so **the string is not matched**.`,
      line: 6, charState: cs, pileState: pile.map(() => 'red'), status: 'bad',
      verdict: ['Not matched.', `Never closed: ${short}.`] });
  } else {
    push({ note: `The end, and the pile is empty: **every bracket is matched**. The pile was at most ${maxDepth} deep.`,
      line: 6, charState: chars.map(() => 'done'), status: 'ok',
      verdict: ['Matched.', `The pile was at most ${maxDepth} deep.`] });
  }
  return frames;
}

/** A random bracket string that never meets the challenge: either matched with the pile at most 3 deep,
 *  or broken in one place. `rand` returns numbers in [0, 1). */
export function randomBrackets(rand: () => number = Math.random): string {
  const pairs = 3 + Math.floor(rand() * 3);              // 3 to 5 pairs: 6 to 10 brackets, plus at most one
  const out: string[] = [];
  const pile: string[] = [];
  let opensLeft = pairs;
  while (opensLeft > 0 || pile.length) {
    const canOpen = opensLeft > 0 && pile.length < GOAL_DEPTH - 1;
    if (canOpen && (!pile.length || rand() < 0.55)) {
      const c = OPENERS[Math.floor(rand() * 3)];
      pile.push(c); out.push(c); opensLeft--;
    } else {
      out.push(PARTNER[pile.pop()!]);
    }
  }
  const r = rand();
  if (r < 0.2) {
    // change one closing bracket into a different kind
    const closes = out.map((c, i) => (isOpen(c) ? -1 : i)).filter((i) => i >= 0);
    const k = closes[Math.floor(rand() * closes.length)];
    const others = CLOSERS.split('').filter((c) => c !== out[k]);
    out[k] = others[Math.floor(rand() * 2)];
  } else if (r < 0.35) {
    // drop one closing bracket
    const closes = out.map((c, i) => (isOpen(c) ? -1 : i)).filter((i) => i >= 0);
    out.splice(closes[Math.floor(rand() * closes.length)], 1);
  } else if (r < 0.45) {
    out.unshift(CLOSERS[Math.floor(rand() * 3)]);
  }
  return out.join(' ');
}

// ------------------------------------------------------------------ postfix (practice problem 2)
/** Work out "3 4 + 2 *": numbers go on a pile; each operator pops two and pushes the result.
 *  Returns the answer and the pile after every token. */
export function evalPostfix(text: string): { value: number; piles: number[][] } {
  const pile: number[] = [];
  const piles: number[][] = [];
  for (const t of text.trim().split(/\s+/)) {
    if ('+-*/'.includes(t) && t.length === 1) {
      if (pile.length < 2) throw new Error(`"${t}" needs two numbers on the pile.`);
      const b = pile.pop()!, a = pile.pop()!;
      pile.push(t === '+' ? a + b : t === '-' ? a - b : t === '*' ? a * b : a / b);
    } else {
      const v = Number(t);
      if (!Number.isFinite(v)) throw new Error(`"${t}" is not a number or an operator.`);
      pile.push(v);
    }
    piles.push(pile.slice());
  }
  if (pile.length !== 1) throw new Error('The expression should leave exactly one number on the pile.');
  return { value: pile[0], piles };
}

// ------------------------------------------------------------------ stack vs queue
export function orderFrames(items: string[]): OrderFrame[] {
  const frames: OrderFrame[] = [];
  const stack: string[] = [];
  const queue: string[] = [];
  const stackOut: string[] = [];
  const queueOut: string[] = [];
  const plain = (a: string[]): Cell[] => a.map(() => '');
  const push = (f: Partial<OrderFrame> & { note: string; line: number }) => frames.push({
    kind: 'order', items, stack: stack.slice(), queue: queue.slice(), stackOut: stackOut.slice(), queueOut: queueOut.slice(),
    stackState: plain(stack), queueState: plain(queue), stackOutState: stackOut.map(() => 'out'), queueOutState: queueOut.map(() => 'out'), ...f,
  });
  /** Blue on the next item each will give: the top of the stack, the front of the queue. */
  const nextUp = () => {
    const ss = plain(stack), qs = plain(queue);
    if (ss.length) ss[ss.length - 1] = 'look';
    if (qs.length) qs[0] = 'look';
    return { stackState: ss, queueState: qs };
  };

  push({ note: `Put ${items.join(', ')} into a stack (a pile) and into a queue (a line), one at a time.`, line: 0 });
  for (const x of items) {
    stack.push(x);
    const ss = plain(stack); ss[ss.length - 1] = 'red';
    push({ note: `Push ${x} on the top of the stack.`, line: 2, stackState: ss });
    queue.push(x);
    const qs = plain(queue); qs[qs.length - 1] = 'red';
    push({ note: `Add ${x} at the back of the queue.`, line: 3, queueState: qs });
  }
  push({ note: `All ${items.length} are in. Next out: ${stack[stack.length - 1]} from the stack (its top), ${queue[0]} from the queue (its front).`, line: 4, ...nextUp() });
  while (stack.length) {
    const s = stack.pop()!;
    stackOut.push(s);
    const so = stackOut.map((): Cell => 'out'); so[so.length - 1] = 'red';
    push({ note: `Pop the stack: ${s} comes out. It is the newest item still inside.`, line: 5, stackOutState: so, ...nextUp() });
    const q = queue.shift()!;
    queueOut.push(q);
    const qo = queueOut.map((): Cell => 'out'); qo[qo.length - 1] = 'red';
    push({ note: `Take the front of the queue: ${q} comes out. It is the oldest item still inside.`, line: 6, queueOutState: qo, ...nextUp() });
  }
  push({ note: `The stack gave **${stackOut.join(' ')}**: last in, first out. The queue gave **${queueOut.join(' ')}**: first in, first out.`,
    line: -1, stackOutState: stackOut.map(() => 'done'), queueOutState: queueOut.map(() => 'done') });
  return frames;
}

export function randomItems(rand: () => number = Math.random): string {
  const n = 4 + Math.floor(rand() * 4);                  // 4 to 7 items
  const start = Math.floor(rand() * (26 - n));
  return Array.from({ length: n }, (_, k) => String.fromCharCode(65 + start + k)).join(' ');
}

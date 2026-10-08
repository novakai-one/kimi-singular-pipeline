// Chapter 18, the trajectory problem: every string the player reads in Scenes 1–6 (markdown with $TeX$).
// Plain data and pure functions, no DOM, so tests/unit/game-c18-traj.test.ts can run the wording rules
// over all of it. Strings for Scenes 1–3 come before the name card, so they never say "eigenvector",
// "eigenvalue" or λ: the kept direction and its multiplier are named only after the player has used them.
import type { Vec } from '../../../math/la.ts';
import { fmtN } from './logic.ts';
import type { MultVerdict } from './traj-logic.ts';

/** A number as TeX (ASCII minus). */
export const tn = (x: number): string => fmtN(x).replace(/−/g, '-');
/** A vector as TeX: (1, -1). */
export const tv = (v: Vec): string => `(${v.map(tn).join(', ')})`;
/** A vector as plain text, real minus signs: (1, −1). */
export const fv = (v: Vec): string => `(${v.map(fmtN).join(', ')})`;

/** A number as TeX with every digit the player typed (2.9999 stays 2.9999, never 3.00). */
export const tnp = (x: number): string => {
  const short = tn(x);
  return Math.abs(parseFloat(short) - x) < 1e-12 ? short : String(parseFloat(x.toPrecision(10)));
};
const tvp = (v: Vec): string => `(${v.map(tnp).join(', ')})`;

/** An angle for the player: whole degrees, one decimal below 1° (a turned line is never "0°"). */
export function fdeg(d: number): string {
  if (d >= 0.95) return `${Math.round(d)}°`;
  return d >= 0.05 ? `${d.toFixed(1)}°` : 'less than 0.1°';
}

/** "twice", "half of", "3 times", "−1 times". */
export function times(k: number): string {
  if (Math.abs(k - 2) < 1e-9) return 'twice';
  if (Math.abs(k - 0.5) < 1e-9) return 'half of';
  return `${fmtN(k)} times`;
}

const PART = ['first', 'second'];

/** Why a multiplier is wrong, part by part (and the sign, when that is the only problem). */
export function wrongMult(v: Vec, w: MultVerdict): string {
  const eq = `$${tnp(w.m)}${tv(v)} = ${tvp(w.scaled)} \\ne ${tv(w.image)}$.`;
  // only the sign is wrong: every part that is not zero has the opposite sign
  const live = [0, 1].filter((i) => Math.abs(w.image[i]) > 1e-9);
  const flipped = live.length > 0 && w.scaled.every((x, i) => Math.abs(x + w.image[i]) < 1e-9);
  if (flipped && live.length === 2) return `${eq} Every part has the wrong sign: did yellow point the same way as green, or the opposite way?`;
  if (flipped) return `${eq} The ${PART[live[0]]} part has the wrong sign: did yellow point the same way as green, or the opposite way?`;
  if (w.bad.length === 2) return `${eq} Neither part matches yellow.`;
  const i = w.bad[0];
  return `${eq} The ${PART[i]} part is off: $${tnp(w.m)} \\times ${tn(v[i])} = ${tnp(w.scaled[i])}$, but yellow's ${PART[i]} part is $${tn(w.image[i])}$.`;
}

export const ZERO = 'The zero vector has no direction, so there is no line to keep. The ship stays at the Anchor.';
export const UNREAD = 'Type one number in each box, like 1 and 0, between −9999 and 9999. Use **±** for a minus sign.';
export const UNREAD_M = 'Type one number, like 2, -1 or 0.5, between −9999 and 9999. Use **±** for a minus sign.';

// ------------------------------------------------------------------ Scenes 1–3 (before the name card)

export const P1 = {
  title: 'Which launch direction stays on its line?',
  goal: 'Each pulse transforms your trajectory. Find a launch direction that stays on its original line.',
  subgoals: ['Find a launch direction the pulse does not turn', 'Enter how much the pulse multiplied it', 'Find a second direction, and its multiplier'],
  start: 'Your launch vector is $(1, 0)$. Press **Test this arrow**: the ship launches along it, then the pulse fires.',
  firstMiss: (v: Vec, w: Vec) => `Your launch direction changed. The pulse moved $${tv(v)}$ to $${tv(w)}$. Find a direction that the pulse doesn't turn.`,
  /** After the first miss, the launch numbers unlock. */
  edit: 'Change the numbers in $\\mathbf v$, then test again.',
  miss: (v: Vec, w: Vec, deg: number) => `The pulse moved $${tv(v)}$ to $${tv(w)}$: turned ${fdeg(deg)} off the green line. Try another direction.`,
  kept: 'The direction stayed on the same line. The pulse changed its length, but didn\'t turn it.',
  /** A kept vector whose length did not change either (multiplier ±1): the Scene 2 sentence would be false. */
  keptSame: 'The direction stayed on the same line. The pulse didn\'t turn it.',
  ask: (v: Vec) => `How much did the pulse multiply your vector $${tv(v)}$?`,
  askShort: 'Enter the multiplier, then press **Check**.',
  right: (v: Vec, w: Vec, m: number) => `Right: $${tn(m)}${tv(v)} = ${tv(w)}$. The line is locked, multiplier ${fmtN(m)}.`,
  another: 'One safe direction found. Is there another?',
  dupe: (v: Vec, base: Vec, k: number) => `$${tv(v)}$ also stays on this line. It's ${times(k)} $${tv(base)}$, so you've found another vector, not another direction.`,
  dupePending: (v: Vec, base: Vec) => `$${tv(v)}$ is on the same line as $${tv(base)}$: the same direction. Answer the multiplier for $${tv(base)}$ first.`,
  /** The very vector already locked, tested again. */
  again: (v: Vec) => `That is $${tv(v)}$ again: its line is already locked. Look for another direction.`,
  againPending: (v: Vec) => `That is $${tv(v)}$ again. Enter its multiplier first.`,
  queued: 'A second direction holds too. Its multiplier comes next.',
  done: 'Both directions hold. Watch the pulse: points on the copper lines stay on them, every other point is turned.',
  hints: {
    first: 'Press **Test this arrow**. The first launch shows what one pulse does to your trajectory.',
    find1: [
      'Yellow is where the pulse sends your launch vector. You need yellow on the green dashed line: yellow equal to a number times green.',
      'The pulse sends $(a, b)$ to $(2a + b,\\ a + 2b)$. Try a vector whose two parts are equal.',
      'Test $(1, 1)$.',
    ],
    ask: (v: Vec, w: Vec) => [
      `Compare part by part. Green is $${tv(v)}$, yellow is $${tv(w)}$. What number turns each part of green into the same part of yellow?`,
      `Divide: $${tn(w[0])} \\div ${tn(v[0] || v[1])}$${v[0] ? '' : ' (using the second parts)'}.`,
    ],
    /** For the second direction; `have` is the line already found. */
    find2: (have: Vec) => Math.abs(have[0] - have[1]) < 1e-9 * (Math.abs(have[0]) + 1) ? [
      `A multiple of $${tv(have)}$ lies on the same line. A new direction needs a different ratio between its two parts.`,
      'For yellow to be $m$ times green: $2a + b = ma$ and $a + 2b = mb$. Subtract: $a - b = m(a - b)$. Either $a = b$, the line you have, or $m = 1$.',
      'Test $(1, -1)$.',
    ] : [
      `A multiple of $${tv(have)}$ lies on the same line. A new direction needs a different ratio between its two parts.`,
      'For yellow to be $m$ times green: $2a + b = ma$ and $a + 2b = mb$. Add: $3(a + b) = m(a + b)$. Either $a = -b$, the line you have, or $m = 3$.',
      'Test $(1, 1)$.',
    ],
  },
};

// ------------------------------------------------------------------ Scene 4: the two-pulse mission

export const M1T = {
  title: 'Where must you launch to reach (9, 9)?',
  goal: 'Two pulses remain. Set your launch vector so the ship reaches the waypoint at $(9, 9)$.',
  subgoals: ['Reach $(9, 9)$ after exactly two pulses'],
  start: 'Your copper lines are on the chart. Set $\\mathbf v$ and press **Launch**: the ship flies out along it, then the pulse fires twice.',
  hit: (pts: Vec[]) => `Waypoint reached: $${pts.map(tv).join(' \\to ')}$. Your launch was an eigenvector: each pulse multiplied it by 3.`,
  miss: (v: Vec, end: Vec, t: Vec) => `Two pulses took $${tv(v)}$ to $${tv(end)}$. The waypoint is at $${tv(t)}$.`,
  missOnLine: (end: Vec) => `You stayed on a line the pulse keeps, but each pulse multiplied the trajectory, so you ended at $${tv(end)}$.`,
  hints: [
    'The waypoint $(9, 9)$ lies on one of your copper lines. On that line, what does one pulse do to a vector?',
    'On the line through $(1, 1)$ each pulse multiplies by 3, so two pulses multiply by 9. Which vector becomes $(9, 9)$ when multiplied by 9?',
    'Launch $(1, 1)$: $(1, 1) \\to (3, 3) \\to (9, 9)$.',
  ],
};

// ------------------------------------------------------------------ Scene 6: the independent challenge

export const SOLOT = {
  title: 'Independent challenge: reach (32, 16)',
  goal: 'A pulse you have not met. Reach the waypoint at $(32, 16)$ after **exactly two pulses**. **Probe** fires one test pulse and costs nothing. **Launch** commits the mission.',
  subgoals: ['Reach $(32, 16)$ after exactly two pulses'],
  start: 'No lines are on this chart. Work from $B$, your own calculations and probes.',
  probe: (v: Vec, w: Vec, kept: boolean, deg: number) => kept
    ? `Probe: $${tv(v)} \\to ${tv(w)}$, on its own line.`
    : `Probe: $${tv(v)} \\to ${tv(w)}$, turned ${fdeg(deg)} off its line.`,
  miss: (v: Vec, end: Vec, t: Vec) => `Two pulses took $${tv(v)}$ to $${tv(end)}$, not $${tv(t)}$.`,
  hints: [
    'Look at the waypoint first. Which line through the Anchor is it on? Test whether $B$ keeps that line.',
    '$(32, 16) = 16(2, 1)$. Work out $B(2, 1)$ and compare it with $(2, 1)$.',
    '$B(2, 1) = (8, 4) = 4(2, 1)$. Two pulses multiply $(2, 1)$ by $4^2 = 16$. Launch $(2, 1)$.',
  ],
  summary: (v: Vec, m: number, n: number, t: Vec) => `**How it works.** $${tv(t)}$ lies on the line through $${tv(v)}$, and $B${tv(v)} = ${tv(v.map((x) => x * m))} = ${tn(m)}${tv(v)}$. So $${tv(v)}$ is an eigenvector of $B$ with eigenvalue $\\lambda = ${tn(m)}$. From $B\\mathbf v = \\lambda\\mathbf v$, ${n} pulses give $B^{${n}}\\mathbf v = \\lambda^{${n}}\\mathbf v$: launch $${tv(t)} \\div ${tn(m ** n)} = ${tv(v)}$.`,
  more: 'Another challenge: a new pulse, a new waypoint. Same tools.',
};

/** Labels for the flight log. */
export const LOG_NAMES: Record<string, string> = {
  'p1-line1': 'First kept line',
  'p1-line2': 'Second kept line',
  m1: 'Two-pulse mission',
  'drill-1': 'Round 1 · trajectory lock',
  'drill-2': 'Round 2 · pulse multiplier',
  'drill-3': 'Round 3 · duplicate flight plans',
  'drill-4': 'Round 4 · two corridors',
  'drill-5': 'Round 5 · two channels',
  'drill-6': 'Round 6 · reversing pulse',
  'drill-7': 'Round 7 · collapse',
  'drill-8': 'Round 8 · drifting region',
  'drill-9': 'Round 9 · unseen pulse',
  'drill-10': 'Round 10 · three-pulse mission',
  solo: 'Independent challenge',
};
export const OUTCOME_NAMES = { independent: 'independent', corrected: 'corrected', assisted: 'assisted' } as const;

// ------------------------------------------------------------------ Scene 5: ten practice rounds

const S_ = '\\begin{bmatrix} 3 & 1 \\\\ 1 & 3 \\end{bmatrix}';

export const DRILL = {
  title: 'Ten navigation rounds',
  goal: 'Ten short rounds on the same chart. Each one is a different navigation problem.',
  roundGoal: (n: number, of: number, name: string, goal: string) => `**Round ${n}${of ? ` of ${of}` : ''} · ${name}.** ${goal}`,
  next: 'Next round',
  doneRound: (out: string) => `Round complete · ${out}.`,
  summary: (ind: number, cor: number, ass: number) => `**Practice complete.** Independent: ${ind}. Corrected: ${cor}. Assisted: ${ass}.`,
  more: 'More rounds',
  finish: 'Finish practice',
  noHints: 'This round has no hints. **Show me** demonstrates it, and the round is recorded as assisted.',
  r1: {
    name: 'trajectory lock',
    goal: 'Same pulse as before. Only one of these launch plans stays on its line. Lock it: the plan you pick flies at once.',
    turned: (v: Vec, w: Vec, deg: number) => `$${tv(v)} \\to ${tv(w)}$: turned ${fdeg(deg)} off its line. Pick again.`,
    hit: (v: Vec, w: Vec) => `Locked: $${tv(v)} \\to ${tv(w)}$, still on its line.`,
    hints: ['On a kept line yellow is a multiple of green. Which plan is a multiple of $(1, 1)$ or $(1, -1)$?', '$(-2, -2)$ is $-2$ times $(1, 1)$.'],
  },
  r2: {
    name: 'pulse multiplier',
    goal: 'Your locked plan is $(-2, -2)$. Set the pulse multiplier: the ring shows where that puts the ship. Then fire the pulse.',
    fire: 'Fire pulse',
    hit: (v: Vec, w: Vec, m: number) => `Calibrated: $${tn(m)}${tv(v)} = ${tv(w)}$. The ship landed in your ring.`,
    hints: ['Work out $A(-2, -2)$: each row of $A$ times $(-2, -2)$.', '$A(-2, -2) = (-6, -6)$. What number times $(-2, -2)$ gives $(-6, -6)$?'],
  },
  r3: {
    name: 'duplicate flight plans',
    goal: 'The corridor along $(1, 1)$ is open. Three flight plans came in. Mark each one **Same** corridor, **New** corridor or **Turned** off its line, then check the log: each plan flies in turn.',
    opts: [['same', 'Same'], ['new', 'New'], ['turns', 'Turned']] as [string, string][],
    check: 'Check the log',
    whySame: (v: Vec, k: number) => `$${tv(v)} = ${tn(k)}(1, 1)$: another vector on the open corridor, not another direction.`,
    whyNew: (v: Vec, w: Vec) => `$${tv(v)} \\to ${tv(w)}$: kept, on a different line. A new corridor.`,
    whyTurns: (v: Vec, w: Vec, deg: number) => `$${tv(v)} \\to ${tv(w)}$: turned ${fdeg(deg)} off its line.`,
    wrong: 'Some marks were wrong (in amber). Change them and check again.',
    hit: 'Log checked: one duplicate rejected, one new corridor opened.',
    hints: ['A multiple of $(1, 1)$ is the same corridor. A plan the pulse keeps on a different line is new. Work out $A$ times each plan.', '$A(3, 1) = (7, 5)$, $A(-4, -4) = (-12, -12)$, $A(2, -2) = (2, -2)$.'],
  },
  r4: {
    name: 'two corridors',
    goal: `A new pulse, $A = ${S_}$. Find both lines it keeps. **Scan** shows only the heading the pulse gives your vector, not how far it goes.`,
    scan: 'Scan',
    kept: (v: Vec) => `Heading held: the line through $${tv(v)}$ is a corridor. Its multiplier stays hidden until round 5.`,
    same: (v: Vec, base: Vec) => `$${tv(v)}$ is on the corridor through $${tv(base)}$ again.`,
    turned: (v: Vec, deg: number) => `The pulse turns the heading of $${tv(v)}$ ${fdeg(deg)} off its line.`,
    hit: 'Both corridors unlocked.',
    hints: ['Try the kinds of vector that held for the first pulse.', 'Scan $(1, 1)$ and $(1, -1)$.'],
  },
  r5: {
    name: 'two channels',
    goal: 'Calibrate both corridors before you fly them. Enter each multiplier (worked out from $A$, never shown), then fire that channel.',
    fire: 'Fire',
    hit: 'Both channels calibrated.',
    hints: (a: Vec, wa: Vec, b: Vec, wb: Vec) => [`Multiply: $A${tv(a)}$ and $A${tv(b)}$. Compare each result with the vector you started from.`, `$A${tv(a)} = ${tv(wa)}$ and $A${tv(b)} = ${tv(wb)}$.`],
  },
  r6: {
    name: 'reversing pulse',
    goal: 'One pulse. A beacon sits at $(0, -3)$, below the Anchor. Choose the launch so the pulse carries the ship onto it.',
    start: 'Set $\\mathbf v$ and press **Launch**: one pulse fires.',
    hit: (pts: Vec[]) => `Beacon reached: $${pts.map(tv).join(' \\to ')}$. The pulse sent the ship back through the Anchor.`,
    miss: (v: Vec, end: Vec, t: Vec) => `One pulse took $${tv(v)}$ to $${tv(end)}$. The beacon is at $${tv(t)}$.`,
    ask: (v: Vec, w: Vec) => `What multiplier did the pulse apply? $${tv(w)} = ? \\times ${tv(v)}$`,
    hints: ['This pulse doubles the first part and flips the sign of the second: $A(a, b) = (2a, -b)$. Which launch ends at $(0, -3)$?', 'Launch $(0, 3)$.'],
    askHints: (v: Vec, w: Vec) => [`$${tv(v)} \\to ${tv(w)}$: the arrow points the opposite way. The multiplier is negative.`],
  },
  r7: {
    name: 'collapse',
    goal: 'This pulse flattens space. One launch direction is sent all the way back to the Anchor. Find it, then enter its multiplier.',
    other: (v: Vec, w: Vec) => `$${tv(v)} \\to ${tv(w)}$ stays on its line, but it does not collapse. Find the direction that ends on the Anchor.`,
    collapsed: (v: Vec) => `$${tv(v)} \\to (0, 0)$: the trajectory collapsed onto the Anchor. What multiplier is that?`,
    hints: ['$A(a, b) = (2a, a)$: the second part of the launch never matters. When is $(2a, a)$ the zero vector?', 'Test $(0, 1)$.'],
    askHints: (v: Vec) => [`$(0, 0) = m \\times ${tv(v)}$. Which $m$?`],
  },
  r8: {
    name: 'drifting region',
    goal: 'This region drifts sideways with every pulse. Find a launch that holds its line through **three** pulses, then enter its multiplier.',
    fly: 'Fly 3 pulses',
    drift: (v: Vec, end: Vec, deg: number) => `Three pulses drifted $${tv(v)}$ to $${tv(end)}$, ${fdeg(deg)} off its line.`,
    held: (v: Vec) => `$${tv(v)}$ held its line through three pulses. How much did each pulse multiply it?`,
    hints: ['The pulse adds the second part to the first: $A(a, b) = (a + b, b)$. When is that a multiple of $(a, b)$?', 'Fly $(1, 0)$.'],
    askHints: ['The ship did not move at all. What multiplier leaves a vector unchanged?'],
  },
  r9: {
    name: 'unseen pulse',
    goal: 'A pulse you have not met, no hints. Find both lines it keeps and enter each multiplier.',
  },
  r10: {
    name: 'three-pulse mission',
    goal: 'Three pulses. Reach the waypoint at $(-8, 8)$. Your corridors from rounds 4 and 5 are on the chart.',
    start: 'Set $\\mathbf v$ and press **Launch**: the pulse fires three times.',
    hit: (pts: Vec[]) => `Waypoint reached: $${pts.map(tv).join(' \\to ')}$. Each pulse multiplied by 2: $2^3 = 8$.`,
    miss: (v: Vec, end: Vec, t: Vec) => `Three pulses took $${tv(v)}$ to $${tv(end)}$. The waypoint is at $${tv(t)}$.`,
    missOnLine: (end: Vec) => `You stayed on a corridor, but three pulses ended at $${tv(end)}$.`,
    hints: ['$(-8, 8)$ is on the corridor through $(-1, 1)$. What does one pulse multiply it by?', 'Three pulses multiply by $2^3 = 8$. Launch $(-1, 1)$.'],
  },
  extraLines: {
    name: 'kept lines',
    goal: 'A fresh pulse. Find both lines it keeps and enter each multiplier.',
    hints: ['Look for a vector $\\mathbf v$ with $A\\mathbf v$ a multiple of $\\mathbf v$. Try small whole numbers.', 'For $\\mathbf v = (a, b)$, write $A\\mathbf v = m\\mathbf v$ as two equations and compare them.'],
  },
  extraMission: {
    name: 'two-pulse mission',
    goal: (t: Vec) => `A fresh pulse. Reach the waypoint at $${tv(t)}$ after exactly two pulses. **Probe** fires one test pulse and costs nothing.`,
    hints: ['Which line through the Anchor is the waypoint on? Probe a vector on it.', 'If $A\\mathbf v = m\\mathbf v$, two pulses give $m^2\\mathbf v$.'],
  },
  hunt: {
    test: 'Test this arrow',
    kept: (v: Vec, w: Vec) => `$${tv(v)} \\to ${tv(w)}$: on its own line. How much did the pulse multiply it?`,
    dupe: (v: Vec, base: Vec) => (v.every((x, i) => Math.abs(x - base[i]) < 1e-9)
      ? `That is $${tv(v)}$ again: its line is already locked.`
      : `$${tv(v)}$ is on the line through $${tv(base)}$: the same direction, not a new one.`),
    turned: (v: Vec, w: Vec, deg: number) => `$${tv(v)} \\to ${tv(w)}$: turned ${fdeg(deg)} off its line.`,
    right: (v: Vec, m: number) => `Right: multiplier ${fmtN(m)} along $${tv(v)}$.`,
    another: 'One line locked. Find the other.',
  },
};

// ------------------------------------------------------------------ the name card (beat 4), from what the player did

/** What Scenes 1–3 recorded: the first turned launch, the kept lines in the order found, the first multiple tested. */
export interface Seen { miss?: [Vec, Vec]; lines: [Vec, Vec, number][]; dupe?: [Vec, Vec, number] }
const SEEN_DEFAULT: Seen = { miss: [[1, 0], [2, 1]], lines: [[[1, 1], [3, 3], 3], [[1, -1], [1, -1], 1]] };
const usable = (s: Seen | undefined): Seen => (s && s.lines?.length === 2 ? s : SEEN_DEFAULT);
const longer = (m: number) => (Math.abs(m - 1) < 1e-9 ? 'came back as itself' : `the same line ${times(m).replace(/^half of$/, 'half')} as long`);

export function nameSaw(s0?: Seen): string {
  const s = usable(s0);
  const miss = s.miss ? `Most launches were turned off their line: the pulse moved $${tv(s.miss[0])}$ to $${tv(s.miss[1])}$.` : 'Most launches were turned off their line.';
  const [a, b] = s.lines;
  const one = (l: [Vec, Vec, number]) => (Math.abs(l[2] - 1) < 1e-9 ? `$${tv(l[0])}$ came back as itself` : `$${tv(l[0])}$ came back as $${tv(l[1])}$, ${longer(l[2])}`);
  const dupe = s.dupe ? ` $${tv(s.dupe[0])}$ held too, but it was the line of $${tv(s.dupe[1])}$ again.` : '';
  return `${miss} Two directions held. ${one(a)}, and ${one(b)}.${dupe}`;
}

const col = (v: Vec, c: 'cg' | 'cy') => `\\${c}{\\begin{bmatrix} ${tn(v[0])} \\\\ ${tn(v[1])} \\end{bmatrix}}`;
const PULSE_TEX = '\\begin{bmatrix} 2 & 1 \\\\ 1 & 2 \\end{bmatrix}';
export function nameFormula(s0?: Seen): string {
  const [[v1, w1, m1], [v2, w2, m2]] = usable(s0).lines;
  return `\\begin{gathered} \\underbrace{${PULSE_TEX}}_{A \\text{ (the pulse)}} \\underbrace{${col(v1, 'cg')}}_{\\mathbf v \\text{ (launch)}} = \\underbrace{${col(w1, 'cy')}}_{A\\mathbf v} = \\underbrace{${tn(m1)}}_{\\lambda} \\underbrace{${col(v1, 'cg')}}_{\\mathbf v} \\\\[4pt] ${PULSE_TEX} ${col(v2, 'cg')} = ${col(w2, 'cy')} = \\underbrace{${tn(m2)}}_{\\lambda} ${col(v2, 'cg')} \\end{gathered}`;
}

/** The spec's naming sentence, then the definition. */
export const NAME_TEXT = 'Those kept directions are called **eigenvectors**. Their multipliers are **eigenvalues**. An eigenvector of $A$ is a non-zero vector $\\mathbf v$ that $A$ keeps on its own line; its eigenvalue λ is the number it is multiplied by: $A\\mathbf v = \\lambda\\mathbf v$.';

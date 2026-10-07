// Chapter 18: every voiced line. Plain data; story numbers are formatted from logic.ts / truth.ts, never typed.
import type { Line } from '../../lines';
import { CUTTER, P1_A, P2_A, P5_VALUES, P6_LINES, P7_VALUES, P3_LINES, P1_LINES, fmtN, fmtV, sayV, spell } from './logic.ts';

const col = (M: number[][], j: number) => M.map((r) => r[j]);
const vals = (xs: number[]) => xs.map(fmtN).join(', ');

export const S: Record<string, Line[]> = {
  open: [
    { who: 'lantern', text: 'A Survey Authority cutter is holding station by the Anchor. Director Vell is on the open channel.' },
    { who: 'vell', text: 'The spires are free again. Thank you for that.' },
    { who: 'vell', text: 'I am locking a setting of my own into the Anchor, and letting it repeat. Fifty pulses. The debris field gathers onto one line, and my cutter tows the line home.' },
    { who: 'wren', text: 'The ark is in that field.' },
    { who: 'vell', text: 'Then it should ride the lines my pulse does not turn. If there are any.' },
    { who: 'bram', text: 'Most lines through the Anchor get turned by a pulse. A few might only stretch. We find those first.' },
  ],
  p1Intro: [
    { who: 'lantern', text: `A test first, on a matrix we know from the spire bench. It sends ${fmtV([1, 0])} to ${fmtV(col(P1_A, 0))}, and ${fmtV([0, 1])} to ${fmtV(col(P1_A, 1))}.`, say: `A test first, on a matrix we know from the spire bench. It sends one, zero to ${sayV(col(P1_A, 0))}, and zero, one to ${sayV(col(P1_A, 1))}.` },
    { who: 'bram', text: 'Green is your arrow. Yellow is where the pulse throws it. Most arrows come out turned.' },
    { who: 'bram', text: 'Find the ones that come out pointing the same way, Nav. Only longer or shorter.' },
  ],
  p1Win: [
    { who: 'lantern', text: `Two lines hold. Along ${fmtV(P1_LINES[0][0])} every arrow is stretched ${spell(P1_LINES[0][1])} times. Along ${fmtV(P1_LINES[1][0])} every arrow keeps its length.`, say: `Two lines hold. Along ${sayV(P1_LINES[0][0])}, every arrow is stretched ${spell(P1_LINES[0][1])} times. Along ${sayV(P1_LINES[1][0])}, every arrow keeps its length.` },
    { who: 'wren', text: 'And everything in between gets turned.' },
  ],
  p2Intro: [
    { who: 'lantern', text: `A shear. The grid arrows land at ${fmtV(col(P2_A, 0))} and ${fmtV(col(P2_A, 1))}.`, say: `A shear. The grid arrows land at ${sayV(col(P2_A, 0))}, and ${sayV(col(P2_A, 1))}.` },
    { who: 'bram', text: 'Two lines last time. How many this time? Sweep the whole circle before you answer.' },
  ],
  p2Win: [
    { who: 'lantern', text: 'One line holds: the first grid axis, stretch one. The full sweep found no second line.' },
    { who: 'bram', text: 'Good. Nobody plans on a line that isn’t there.' },
  ],
  p3Intro: [
    { who: 'lantern', text: 'A faster search. Pick a number λ on the dial and take away λ times the identity: the grid shows A − λI.', say: 'A faster search. Pick a number, lambda, on the dial, and take away lambda times the identity. The grid shows A minus lambda I.' },
    { who: 'lantern', text: 'An arrow that A stretches by λ is sent to the origin by A − λI. So at that λ, the grid goes flat.', say: 'An arrow that A stretches by lambda is sent to the origin by A minus lambda I. So at that lambda, the grid goes flat.' },
    { who: 'bram', text: 'Flat on purpose, this time. Turn the dial, Nav.' },
  ],
  p3Win: [
    { who: 'lantern', text: `The grid goes flat at λ = ${fmtN(P3_LINES[0][1])} and at λ = ${fmtN(P3_LINES[1][1])}. The lines it sends to the origin: ${fmtV(P3_LINES[0][0])} and ${fmtV(P3_LINES[1][0])}.`, say: `The grid goes flat at lambda equals ${spell(P3_LINES[0][1])}, and at lambda equals ${spell(P3_LINES[1][1])}. The lines it sends to the origin: ${sayV(P3_LINES[0][0])}, and ${sayV(P3_LINES[1][0])}.` },
    { who: 'bram', text: 'Flattening, used as a tool. I can live with that.' },
  ],
  coda: [
    { who: 'lantern', text: 'The same dial, on the two-decimal model of the Collapse.' },
    { who: 'lantern', text: 'At λ = 0 the dial takes nothing away. The model is flat already. Zero is an eigenvalue of the two-decimal model.', say: 'At lambda equals zero, the dial takes nothing away. The model is flat already. Zero is an eigenvalue of the two-decimal model.' },
    { who: 'bram', text: 'Same fact, another face. Flat is flat.' },
  ],
  p4Intro: [
    { who: 'lantern', text: 'The routine pulse, on the ground layer. Every fourth one brings the ground layer home.' },
    { who: 'wren', text: 'So which lines does that one keep?' },
  ],
  p4Win: [
    { who: 'lantern', text: 'No real line holds. In its own slanted grid, each routine pulse is a quarter turn. Four quarter turns are one full turn: everything is home.' },
    { who: 'bram', text: 'That’s the fourth pulse, then. Not luck. Arithmetic.' },
  ],
  p5Intro: [
    { who: 'lantern', text: 'Three dimensions: a pulse that keeps the first axis and mixes the other two. By hand, this time. I check each step.' },
    { who: 'bram', text: 'By hand, so you can do it when I’m not standing here.' },
  ],
  p5Win: [
    { who: 'lantern', text: `Stretches ${vals(P5_VALUES)}. They add to ${fmtN(P5_VALUES.reduce((a, b) => a + b, 0))}, the trace. They multiply to ${fmtN(P5_VALUES.reduce((a, b) => a * b, 1))}, the determinant.`, say: `Stretches ${P5_VALUES.map(spell).join(', ')}. They add to ${spell(P5_VALUES.reduce((a, b) => a + b, 0))}, the trace. They multiply to minus fifty, the determinant.` },
    { who: 'wren', text: 'Minus five. So that line flips every pulse.' },
  ],
  p6Intro: [
    { who: 'vell', text: 'Here is my setting, Navigator. Written in your numbers, so nobody argues about grids.' },
    { who: 'lantern', text: 'Vell’s pulse, V. Testing lines through the Anchor.' },
  ],
  p6Win: [
    { who: 'lantern', text: `Three lines hold. Along ${fmtV(P6_LINES[0][0])}, stretch ${fmtN(P6_LINES[0][1])}. Along ${fmtV(P6_LINES[1][0])}, stretch ${fmtN(P6_LINES[1][1])}. Along ${fmtV(P6_LINES[2][0])}, stretch ${fmtN(P6_LINES[2][1])}.`, say: `Three lines hold. Along ${sayV(P6_LINES[0][0])}, stretch ${spell(P6_LINES[0][1])}. Along ${sayV(P6_LINES[1][0])}, stretch ${spell(P6_LINES[1][1])}. Along ${sayV(P6_LINES[2][0])}, stretch ${spell(P6_LINES[2][1])}.` },
    { who: 'vell', text: 'As I said. Everything ends on the first line.' },
    { who: 'bram', text: 'Everything. Remember he said that.' },
  ],
  p7Intro: [
    { who: 'lantern', text: 'Optional. A shortcut people try: row reduce the pulse first, then read the stretches off it.' },
  ],
  p7Win: [
    { who: 'lantern', text: `Row reduced, the stretches are ${vals(P7_VALUES)}. The pulse’s are 5 and 2. Row operations change the move, so they change its stretches.`, say: `Row reduced, the stretches are four and two point five. The pulse's are five and two. Row operations change the move, so they change its stretches.` },
  ],
  briefing: [
    { who: 'bram', text: 'Holotable. Before anyone trusts Vell’s lines, I want this in plain words.' },
  ],
  finderIntro: [
    { who: 'lantern', text: `Line finder, on Vell’s pulse. Start: his cutter’s position, ${fmtV(CUTTER)}. Sixty repeats, each one rescaled to length one.`, say: `Line finder, on Vell's pulse. Start: his cutter's position, ${sayV(CUTTER)}. Sixty repeats, each one rescaled to length one.` },
  ],
  finderMine: [{ who: 'lantern', text: 'Computed with your power_iteration. The arrow settles on the line through (1, 1, 1).', say: 'Computed with your power iteration. The arrow settles on the line through one, one, one.' }],
  finderBackup: [{ who: 'lantern', text: 'Computed with my backup routine. The arrow settles on the line through (1, 1, 1).', say: 'Computed with my backup routine. The arrow settles on the line through one, one, one.' }],
  close: [
    { who: 'lantern', text: `Vell’s cutter sits at ${fmtV(CUTTER)}. That is inside the field his plan gathers.`, say: `Vell's cutter sits at ${sayV(CUTTER)}. That is inside the field his plan gathers.` },
    { who: 'wren', text: 'His own ship is in the field.' },
    { who: 'ilse', text: 'He is not wrong about the line. Ask him what else lands on it.' },
    { who: 'bram', text: 'Then the next question is where everything ends up. Fifty pulses from now.' },
    { who: 'lantern', text: 'Stern channel: static. Unchanged.' },
  ],
};


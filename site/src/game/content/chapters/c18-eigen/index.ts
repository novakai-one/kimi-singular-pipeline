// Chapter 18: "Which lines does the pulse not turn?" (GDD §6.9, N20), the first chapter of Act VII.
// Eigenvectors and eigenvalues. The opening is the trajectory problem (game-design/ch18-trajectory-spec.md):
// a failed launch, two kept directions and their multipliers, the name, a two-pulse mission, ten practice
// rounds and an independent challenge. Then the sweep finds the one line a shear keeps, the λ dial flattens A − λI at
// each stretch (the characteristic polynomial), a turn keeps no real line (complex eigenvalues, the
// fourth-pulse clue closes), a 3 × 3 by hand, Vell's lines. Briefing with LANTERN's Procedure; builds
// eig2 and power_iteration; the line finder runs on the player's power_iteration.
import type { Beat, ChapterDef } from '../../../game/types';
import { bridgeShot } from '../../common/shots';
import { p2, p3, p4 } from './puzzles';
import { m1, p1, solo } from './traj-puzzles';
import { drill } from './drill';
import { p5, p6, p7 } from './puzzles2';
import { compare, doubtEvery, doubtTrace, doubtZero, law, procedure, sayit } from './briefing';
import { buildEig2, buildPower } from './build';
import { coda, coldOpen, fieldShot, finder, whyVisual } from './scenes';
import { S } from './script';

const IN_SHORT_ANSWER = 'Which arrows stay on their own line? Most arrows turn. A few only **stretch, shrink or flip**. They sit where the move minus a stretch flattens space. A quarter turn keeps no line at all.';

// Named only after the player has launched, failed, found two kept directions and typed both multipliers
// (Scenes 1–3). Every symbol of A v = λ v is tied to the pulse and the vectors just used.
const NAME_EIG: Beat = {
  kind: 'name', id: 'name-eigen', entry: {
    id: 'eigenvector', term: 'eigenvector', question: 'What do we call a launch direction the pulse does not turn?', nodes: ['N20'],
    saw: 'Most launches were turned off their line: the pulse moved $(1, 0)$ to $(2, 1)$. Two directions held. $(1, 1)$ came back as $(3, 3)$, the same line three times as long, and $(1, -1)$ came back as itself. $(2, 2)$ held too, but it was the line of $(1, 1)$ again.',
    means: 'Along a kept direction the pulse does one thing: it multiplies the vector by a number. Every non-zero vector on that line is multiplied by the same number.',
    name: 'A non-zero vector $\\mathbf v$ that $A$ keeps on its own line is an **eigenvector** of $A$. The number it is multiplied by, λ, is its **eigenvalue**: $A\\mathbf v = \\lambda\\mathbf v$.',
    formula: '\\begin{gathered} \\underbrace{\\begin{bmatrix} 2 & 1 \\\\ 1 & 2 \\end{bmatrix}}_{A \\text{ (the pulse)}} \\underbrace{\\cg{\\begin{bmatrix} 1 \\\\ 1 \\end{bmatrix}}}_{\\mathbf v \\text{ (launch)}} = \\underbrace{\\cy{\\begin{bmatrix} 3 \\\\ 3 \\end{bmatrix}}}_{A\\mathbf v} = \\underbrace{3}_{\\lambda} \\underbrace{\\cg{\\begin{bmatrix} 1 \\\\ 1 \\end{bmatrix}}}_{\\mathbf v} \\\\[4pt] \\begin{bmatrix} 2 & 1 \\\\ 1 & 2 \\end{bmatrix} \\cg{\\begin{bmatrix} 1 \\\\ -1 \\end{bmatrix}} = \\cy{\\begin{bmatrix} 1 \\\\ -1 \\end{bmatrix}} = \\underbrace{1}_{\\lambda} \\cg{\\begin{bmatrix} 1 \\\\ -1 \\end{bmatrix}} \\end{gathered}',
    why: 'The zero vector is never an eigenvector: it has no direction. Any non-zero multiple of an eigenvector is another eigenvector on the same line, with the same eigenvalue. λ can be negative (the vector flips through the Anchor) or 0 (it collapses onto the Anchor).',
    cue: 'When you see **“stays on its own line”**, think **eigenvector**.',
    use: 'Google’s first ranking of web pages was one eigenvector of a matrix of links.',
  },
};

const NAME_CHAR: Beat = {
  kind: 'name', id: 'name-char', entry: {
    id: 'characteristic-polynomial', term: 'characteristic polynomial', question: 'How do we find the stretches without sweeping?', nodes: ['N20'],
    saw: 'The grid of $A - \\lambda I$ went flat at exactly two settings of the dial, λ = 5 and λ = 2, where the plot of $\\det(A - \\lambda I)$ crossed zero. Each time, one violet line went to the origin.',
    means: 'An arrow that $A$ stretches by λ is sent to the origin by $A - \\lambda I$. So $A - \\lambda I$ flattens space and its determinant is 0. The stretches are the roots of one polynomial in λ.',
    name: '$\\det(A - \\lambda I)$ is the **characteristic polynomial** of $A$; setting it to 0 is the **characteristic equation**. For each root λ, the null space of $A - \\lambda I$ (its eigenvectors and the zero arrow) is the **eigenspace** of λ.',
    formula: '\\begin{gathered} \\det(A - \\lambda I) = (4 - \\lambda)(3 - \\lambda) - 2 \\\\ = \\lambda^2 - 7\\lambda + 10 = (\\lambda - 5)(\\lambda - 2) \\end{gathered}',
    why: '$A\\mathbf v = \\lambda\\mathbf v$ for some $\\mathbf v \\neq \\mathbf 0$ ⟺ $(A - \\lambda I)\\mathbf v = \\mathbf 0$ for some $\\mathbf v \\neq \\mathbf 0$ ⟺ $A - \\lambda I$ flattens a direction ⟺ $\\det(A - \\lambda I) = 0$.',
    cue: 'When you need the stretches, think **$\\det(A - \\lambda I) = 0$**.',
    use: 'Vibration analysis finds a bridge’s natural frequencies as the roots of a characteristic equation.',
  },
};

const NAME_COMPLEX: Beat = {
  kind: 'name', id: 'name-complex', entry: {
    id: 'complex-eigenvalues', term: 'complex eigenvalues', question: 'What are the stretches of a move that turns?', nodes: ['N20'],
    saw: 'The routine pulse turned every test arrow, and the plot $\\lambda^2 + 1$ never touched zero. $D$ was a turn of 45° and a stretch by 1.41; its roots $1 \\pm i$ added to 2 and multiplied to 2. Four routine pulses made $I$.',
    means: 'A turn by any angle except 0° or 180°, with or without a stretch, keeps no real line. Its roots come as a pair $p \\pm qi$: the size $\\sqrt{p^2 + q^2}$ is the stretch and, in its own slanted grid, the angle of $p + qi$ is the turn.',
    name: 'Roots $p \\pm qi$ with $q \\neq 0$ are **complex eigenvalues**. The sum down the diagonal, $a + d$, is the **trace**. The eigenvalues always add up to the trace and multiply to the determinant.',
    formula: '\\begin{gathered} \\lambda = 1 \\pm i:\\quad |\\lambda| = \\sqrt 2,\\ \\text{angle } 45^\\circ \\\\ \\lambda_1 + \\lambda_2 = \\operatorname{tr} D = 2, \\qquad \\lambda_1\\lambda_2 = \\det D = 2 \\end{gathered}',
    why: '$\\lambda^2 - (a + d)\\lambda + (ad - bc) = (\\lambda - \\lambda_1)(\\lambda - \\lambda_2)$: match the terms. For the routine pulse $\\lambda = \\pm i$ and $i^4 = 1$, which is why $T^4 = I$.',
    cue: 'When the λ dial never flattens, think **a turn: complex eigenvalues**.',
    use: 'In a recurrent network, a complex pair larger than 1 in size makes the signal spiral outwards.',
  },
};

const NAME_MULT: Beat = {
  kind: 'name', id: 'name-mult', entry: {
    id: 'algebraic-multiplicity', term: 'algebraic multiplicity', question: 'What if a stretch appears twice?', nodes: ['N20'],
    saw: 'The 3 × 3 had three different roots, 5, 2 and −5, and one line for each. The shear’s polynomial was $(1 - \\lambda)^2$: the root 1 twice, and the sweep found only one line.',
    means: 'A root can repeat. Counting repeats (and complex roots), an $n \\times n$ matrix has $n$ eigenvalues. How many independent lines a repeated root has is a separate question.',
    name: 'The number of times λ appears as a root of the characteristic polynomial is its **algebraic multiplicity**. The shear’s λ = 1 has algebraic multiplicity 2.',
    formula: '\\det\\left(\\begin{bmatrix} 1 & 1 \\\\ 0 & 1 \\end{bmatrix} - \\lambda I\\right) = (1 - \\lambda)^2',
    why: 'For a triangular matrix, $\\det(A - \\lambda I)$ is the product down the diagonal, so its eigenvalues are the diagonal entries, repeats included.',
    cue: 'When a root repeats, **count its lines** before you count on them.',
    use: 'A repeated root that is short of lines is exactly where numerical eigen-solvers lose accuracy.',
  },
};

const WHY = 'Repeat a move many times and only its stretches matter. Along an eigenvector, $n$ repeats multiply by $\\lambda^n$: larger than 1 in size and it **explodes**, smaller and it **fades**. That is why gradients explode or vanish in recurrent networks, which apply one matrix at every step.\n\nRepeating and rescaling swings almost any arrow (any with a part on that line) onto the line with the largest stretch in size, as on the holotable now. That is your next function, `power_iteration`, and LANTERN’s line finder runs on it.';

const ch: ChapterDef = {
  id: 'c18',
  act: 7,
  num: 18,
  title: 'Which lines does the pulse not turn?',
  subtitle: 'Lines a move keeps',
  nodes: ['N20'],
  palette: 'teal',
  music: 'explore',
  script: S,
  inShort: `Which lines does the pulse not turn?\n\n${IN_SHORT_ANSWER}`,
  prereqs: ['c17', 'c16', 'c15', 'c14'],
  catchup: 'A matrix moves every point; its columns are where the grid arrows land. A move **flattens space** exactly when its determinant is 0, and then some non-zero arrow lands on the origin. Story so far: the ark is out of the debris stream, Ilse is alive in the core, and Vell holds the Anchor.',
  beats: [
    { kind: 'cinematic', id: 'open', run: coldOpen },
    { kind: 'card', id: 'inshort', card: { kind: 'inshort', title: 'Which lines does the pulse not turn?', body: IN_SHORT_ANSWER } },
    { kind: 'scene', id: 'p1-intro', lines: S.p1Intro, setup: bridgeShot },
    { kind: 'puzzle', id: 'p1', puzzle: p1 },
    NAME_EIG,
    { kind: 'puzzle', id: 'm1', puzzle: m1 },
    { kind: 'puzzle', id: 'drill', puzzle: drill },
    { kind: 'puzzle', id: 'solo', puzzle: solo },
    { kind: 'scene', id: 'p2-intro', lines: S.p2Intro, setup: bridgeShot },
    { kind: 'puzzle', id: 'p2', puzzle: p2 },
    { kind: 'scene', id: 'p3-intro', lines: S.p3Intro, setup: bridgeShot },
    { kind: 'puzzle', id: 'p3', puzzle: p3 },
    NAME_CHAR,
    { kind: 'cinematic', id: 'coda', run: coda },
    { kind: 'scene', id: 'p4-intro', lines: S.p4Intro, setup: bridgeShot },
    { kind: 'puzzle', id: 'p4', puzzle: p4 },
    NAME_COMPLEX,
    { kind: 'scene', id: 'p5-intro', lines: S.p5Intro, setup: bridgeShot },
    { kind: 'puzzle', id: 'p5', puzzle: p5 },
    NAME_MULT,
    { kind: 'scene', id: 'p6-intro', lines: S.p6Intro, setup: fieldShot },
    { kind: 'puzzle', id: 'p6', puzzle: p6 },
    { kind: 'scene', id: 'p7-intro', lines: S.p7Intro, setup: bridgeShot },
    { kind: 'puzzle', id: 'p7', puzzle: p7 },
    { kind: 'scene', id: 'brief-intro', lines: S.briefing, setup: bridgeShot },
    { kind: 'sayit', id: 'sayit', sayit },
    { kind: 'doubt', id: 'd-every', doubt: doubtEvery },
    { kind: 'doubt', id: 'd-trace', doubt: doubtTrace },
    { kind: 'doubt', id: 'd-zero', doubt: doubtZero },
    { kind: 'law', id: 'law', law },
    { kind: 'procedure', id: 'procedure', procedure },
    { kind: 'compare', id: 'compare', compare },
    { kind: 'card', id: 'why', card: { kind: 'why', title: 'Why it matters', body: WHY, cue: 'When you see **“repeated”**, **“stable direction”** or **“long run”**, think **eigenvectors**.', visual: whyVisual } },
    { kind: 'build', id: 'build-eig2', build: buildEig2 },
    { kind: 'build', id: 'build-power', build: buildPower },
    { kind: 'cinematic', id: 'finder', run: finder },
  ],
};

export default ch;

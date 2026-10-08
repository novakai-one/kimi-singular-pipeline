# LESSON PACK — d01-dot v2
Changelog: v1 — initial. v2 — §4 rewritten as staging + attention budget:
every element gets an entry and exit condition; licensed chrome changes
CH1–CH3; new acceptance tests AT7–AT9. Content (§1–§3) unchanged.

## 0. Meta
- Lesson id: `d01-dot` · Title: "How much does this arrow point along that one?"
- Curriculum node: N05 (core only: dot product as shadow; angle; orthogonality)
- Class topic: first-year linear algebra, dot product (MTH1030 / ENG1005 week on vectors)
- Terms used (already earned): vector, component, length, scalar
- Terms earned here: **dot product**, **shadow** (projection onto a line), **orthogonal**
- Difficulty design: Cadet = drag with coarse snap and both readouts; Navigator =
  finer snap; Commander = finest snap, typed answers, shadow readout hidden

## 1. The problem

The Lantern's docking sensor reads strongest when it points straight along the
beacon's beam, fades as it turns away, and reads exactly nothing at a right
angle. This lesson finds the one number that measures how much one arrow
points along another.

## 2. Beats (ordered)

### beat `open` — scene

- LANTERN: "Docking sensor test. The beacon's beam is fixed along (4, 0). Your
  sensor arrow has length 3; you can point it anywhere."
  say: "Docking sensor test. The beacon's beam is fixed along four, zero. Your
  sensor arrow has length three; you can point it anywhere."
- BRAM: "Find the strongest reading first. Then find where it dies."

### beat `p1` — puzzle (discover)

- id: `d01-p1` · title: "Where is the reading strongest?"
- Goal text (exact): "Turn the sensor. Find the heading with the biggest
  reading, then the heading where the reading is exactly zero."
- Setup: beam v = (4, 0), fixed, green, labelled `beam`. Sensor w, length 3,
  draggable direction (`VectorHandle`), violet, labelled `sensor`. `Shadow`
  (kit/geom) draws w's shadow on the beam's line. `AngleArc` between the
  arrows. Live readout rows: `reading` = v·w (2 dp); `shadow` = length of the
  shadow (2 dp).
- Win: two bands, auto-detected in either order, each confirmed when held 1 s:
  A (biggest): reading within ±0.05 of 12.00. B (zero): |reading| ≤ 0.05.
- Prediction prompt (exact): "Before you drag: at what angle between the
  arrows will the reading hit zero? Say a number of degrees."
- Feedback strings (exact):
  - If reading ≤ −11.95 is held 1 s, LANTERN barks: "Strong in size, but
    negative — the sensor points against the beam. Find the biggest positive
    reading first."
- Per difficulty: Cadet snap 15° · Navigator snap 5° · Commander snap 1° and
  the `shadow` readout row hidden (infer it from the reading).
- Reference solution (for solve-all): set w = (3, 0), hold; then w = (0, 3),
  hold.

### beat `name-dot` — name

- term: dot product · question: "How much does one arrow point along another?"
- saw: "The reading was biggest when the sensor pointed along the beam, zero
  at a right angle, and negative past it. The shadow on the beam's line grew
  and shrank with it."
- means: "Multiply matching components and add: (4, 0) · (a, b) = 4a — the
  beam's length times the shadow's length."
- name: "The **dot product** $\mathbf v \cdot \mathbf w = v_1w_1 + v_2w_2$ is
  one number: how much $\mathbf w$ points along $\mathbf v$, scaled by both
  lengths. A zero dot product means the arrows are at a right angle — they
  are **orthogonal**."
- formula: $\mathbf v \cdot \mathbf w = v_1w_1 + v_2w_2 = \|\mathbf v\|\,\|\mathbf w\|\cos\theta$
- why: "Expand $\|\mathbf v - \mathbf w\|^2$ with components and compare with
  the law of cosines: the two agree only if $\mathbf v \cdot \mathbf w =
  \|\mathbf v\|\,\|\mathbf w\|\cos\theta$."
- cue: "When you see **'how much along'** or **'aligned'**, think **dot product**."
- use: "One neuron in a network computes a dot product of its weights with its
  inputs."

### beat `p2-intro` — scene

- LANTERN: "Now with numbers. Beam (3, 4), sensor (5, 0). Compute the reading
  by hand, then check it."
  say: "Now with numbers. Beam three, four. Sensor five, zero. Compute the
  reading by hand, then check it."

### beat `p2` — puzzle (compute)

- id: `d01-p2` · title: "What is the reading?"
- Goal text (exact): "Compute v·w for v = (3, 4), w = (5, 0), then answer."
- Cadet / Navigator: `ChoiceCards` with options {7, 15, 25, 35}.
  Commander: typed input; win if |answer − 15| ≤ 0.01.
- Feedback strings (exact):
  - 25: "That is ‖v‖ times ‖w‖ — the reading only if the arrows pointed the
    same way. Multiply matching components, not the lengths."
  - 35: "That multiplies the sums. Multiply each matching pair first, then
    add: 3·5 + 4·0."
  - 7: "That adds v's components. The dot product mixes both arrows: multiply
    matching pairs, then add."
- Solution (one transformation per line):
  $$
  \begin{aligned}
  \mathbf v \cdot \mathbf w &= 3 \cdot 5 + 4 \cdot 0 \\
  &= 15 + 0 \\
  &= 15
  \end{aligned}
  $$

## 3. Briefing

### sayit (Bram)

- ask: "In plain words: what does the dot product measure?"
- frames:
  - see: "The reading was biggest when the arrows pointed the ___ way, and
    zero at a ___ angle."
  - means: "The dot product multiplies matching ___ and adds them; it equals
    the beam's length times the ___ length."
  - called: "This number is called the ___ ___."
  - cue: "When you see 'how much along', think ___."
- wordBank: [same, opposite, right, components, lengths, shadow, dot, product,
  projection, slope]

### doubt — claim is FALSE

- claim: "A zero dot product means one of the arrows is the zero arrow."
- reason: "(3, 4)·(−4, 3) = −12 + 12 = 0, and neither arrow is zero. Zero
  means a right angle, not zero length."
- goal (exact): "Set both arrows. **Challenge it** — two non-zero arrows with
  a zero reading — or **Back it**."
- setup: two draggable `VectorHandle`s (v green, w red), live dot readout.
- curated edge case: v = (3, 4), w = (−4, 3). `showMe('challenge')` animates
  to it.
- randomize: integer components in [−4, 4], not both arrows zero.

### law

- frame: "$\mathbf v \cdot \mathbf w = 0$ exactly when the arrows are ___
  (or one has no length)."
- slot `cond` options:
  - `perp` ✓ "at a right angle"
  - `parallel` "parallel"
  - `opposite` "pointing in opposite directions"
  - `equal` "equal in length"
- gen: random integer pairs in [−4, 4]. edgeCases: [(0, 0) with (1, 2)],
  [(3, 4) with (−4, 3)].
- holds: dot = 0 ⟺ perpendicular or a zero arrow. The target filling
  (`perp`) survives all 500 cases; each near-miss filling is broken by at
  least one case (unit-test this).
- reason ask: "Your Law survived. Why a right angle?"
  - a ✓: "$\mathbf v \cdot \mathbf w = \|v\|\|w\|\cos\theta$; with non-zero
    lengths it is zero exactly when $\cos\theta = 0$ — a right angle."
    why-right: "Yes: the lengths are non-zero, so only $\cos\theta$ can make
    the product zero."
  - b ✗: "Because the components cancel." rebuttal: "Cancelling parts are not
    the condition: (3, 4)·(−3, 3) = 3 ≠ 0. The guarantee is the right angle."
  - c ✗: "Because the arrows have equal length." rebuttal: "(4, 0)·(4, 0) =
    16: equal lengths, not zero. Length decides size, not sign."

### procedure

- Decision: none this lesson. The operation is one line; it is drilled in the
  build beat.

### compare — Ilse's page

- page: "The **dot product** $\mathbf v \cdot \mathbf w = v_1w_1 + v_2w_2$
  measures how much one arrow points along another: it equals
  $\|\mathbf v\|\,\|\mathbf w\|\cos\theta$ — the beam's length times the
  shadow's length. Zero means a right angle (orthogonal); negative means more
  than 90° apart."
- formula: $\mathbf v \cdot \mathbf w = \|\mathbf v\|\,\|\mathbf w\|\cos\theta$
- keyIdeas:
  - "Did you say what it measures — how much one arrow points along another?"
  - "Did you say why zero means a right angle?"
  - "Did you connect it to the shadow?"

### build — `dot`

- id: `d01-dot-build` · fn: `dot`
- title: "The sensor firmware" · brief: "Write `dot(v, w)`. The readout runs
  on your code from here."
- solution: `def dot(v, w):\n    return v[0]*w[0] + v[1]*w[1]`
- swarm: 200 random integer pairs with components in [−9, 9]; crew reference
  is the same formula.
- Modes: Cadet Assemble (solution lines + decoy
  `    return sum(a + b for a, b in zip(v, w))`), Navigator Fill, Commander Write.
- failure message (exact): "Checked against 200 random pairs. First mismatch:
  dot({a}, {b}) should be {r}; your function returned {y}."
- success line, LANTERN: "Sensor firmware updated. The readout now runs on
  your dot."
  say: "Sensor firmware updated. The readout now runs on your dot."

## 4. Staging and attention budget

The canvas is the protagonist. Every on-screen element must have an entry
condition and an exit condition; an element without an exit condition is a
defect. During interactive beats (puzzle, doubt, law, procedure, build), at
most FOUR non-canvas elements may be visible: the collapsed goal pill, the
readout, the action row, and at most ONE transient element.

### Licensed chrome changes (scoped shared-file license per contract v1.1)

The builder is licensed to change ONLY these behaviors in the shared UI files
that render them, and only gated to chapter `d01-dot`:

- CH1: During puzzle / doubt / law / procedure / build beats, the top-right
  nav cluster (Log, Case board, Codex, eye) collapses into the single
  hamburger button.
- CH2: During those beats, the eyebrow + chapter title banner ("ACT I · …" +
  title) is not rendered at all. It renders only on card, scene, cinematic
  and Briefing beats.
- CH3: At most one transient element (bark, prompt, toast) is visible at a
  time; a new transient replaces the current one.

### Per-beat element lifecycle — d01-dot

**beat p1:**
- goal card: enters at beat start (full text). Exits on the player's first
  drag → collapses to a one-line "Goal" pill top-left (tap to re-read). The
  par stars render only in the win moment.
- prediction prompt: enters at beat start, bottom-left. Exits PERMANENTLY on
  answer submit OR on the first drag, whichever comes first. Never re-enters
  this session.
- negative-reading bark: toast, bottom-center. Exits after 4 s OR on the next
  drag, whichever comes first.
- readout (`reading`, `shadow`): persistent, top-right. This is the
  instrument.
- action row (Reset / Hint / Show me / Skip): persistent, bottom-right, quiet
  (70% opacity until hover).
- canvas labels (beam, sensor, shadow, angle arc): persistent — they ARE the
  content.

**beat p2:** same chrome rules. Goal card collapses on first answer attempt.

**build beat:** nav hidden per CH1; banner hidden per CH2. Left panel shows
title + brief + one tests line only. On success, the success line REPLACES
the tests line (not added beneath it). The Continue button appears
bottom-right only after success.

**scenes, cards, Briefing beats:** full chrome may render.

## 5. Acceptance tests

- AT1: `node tests/game-solve-all.mjs d01-dot` passes at cadet, navigator and
  commander; zero console errors.
- AT2: `node tests/game-wording.mjs d01-dot` reports 0 hits; the string
  "dot product" appears in no beat before `name-dot`.
- AT3: Commander `p2`: entering 25, 35 or 7 yields the exact §2 feedback
  string for that value; entering 15 wins.
- AT4: provenance lint: every learner-facing string in the chapter code
  appears verbatim in this Pack.
- AT5: §4 screenshot review passes at both widths.
- AT6: build beat: the reference solution passes the 200-case swarm; a
  deliberately wrong function produces the exact §3 failure message format.
- AT7: attention budget: every flow screenshot of an interactive beat shows
  at most four non-canvas elements (goal pill, readout, action row, ≤1
  transient).
- AT8: no flow screenshot taken after a drag shows the prediction prompt or
  the full goal card.
- AT9: no flow screenshot of an interactive beat shows the eyebrow/title
  banner or the expanded nav cluster.

## 6. OPEN items

- Voice lines: PROPOSED — ship this prototype text-only; record voices only
  after the Pack passes review. Accept or override.
- Chapter id: PROPOSED `d01-dot`.

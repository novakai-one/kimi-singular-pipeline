# CAPABILITY SHEET — v1

> Condensed from game-design/AUTHORING.md. The AUTHOR may only specify what
> appears on this sheet. If a lesson needs something not listed here, that is
> an OPEN item in the Pack — not an instruction to invent.
> Changelog: v1 — initial.

## 1. Beat kinds (the only building blocks)

| Beat | What it is | Key fields |
|---|---|---|
| `cinematic` | scripted camera sequence, no interaction | run function |
| `scene` | voiced dialogue over a staged shot | lines (who/text/say), setup shot |
| `card` (`inshort`) | chapter card: question title + one literal sentence | title, body |
| `card` (`why`) | why-it-matters card with cue | title, body, cue, optional visual |
| `puzzle` | interactive challenge | id, title, goal, predict (optional), hints, par, setup → {showMe, solve, wrong} |
| `name` | a Codex entry naming the concept | term, question, saw, means, name, formula, why, cue, use |
| `sayit` | fill-in-the-blank recall (Bram asks) | ask, frames {see, means, called, cue}, wordBank |
| `doubt` | evaluate a claim: Challenge or Back it | claim, isTrue, reason, goal, setup → {holds, describe, randomize, edgeCases, showMe} |
| `law` | fill the frame; survives 500 random cases; then the reason | frame, slots, answer, gen, edgeCases, holds, describe, draw, reason |
| `procedure` | order the steps; LANTERN runs them literally | tiles, decoys, reference, run |
| `compare` | Ilse's model page + self-check | page, formula, keyIdeas |
| `build` | Python function, swarm-tested (Assemble / Fill / Write) | fn, title, brief, starter, solution, swarm {gen, crew}, fill?, assemble? |
| `review` | act-end: four claims by one speaker (built like doubts) | claims |

The engine adds **Show me** and **Skip** to every puzzle, doubt, law,
procedure and build automatically — never author those.

## 2. Kit components (the only visuals)

- `VectorHandle` — a draggable vector (snapping, constraints, move counting)
- `BurnChain` — tip-to-tail burns from the ship, Fire flies it
- `MatrixView` / `MatrixView3` — draggable 2×2 / 3×3 matrix, grid, typed input
- `RowOpsBoard`, `SystemView` — row operations, lines/planes kept in sync
- `kit/geom`: `RightAngle`, `AngleArc`, `Shadow` (projection), `Sweep` (eigen hunt), `UnitCircleImage` (SVD)
- `kit/data`: `PointCloud`, `FitLine`, `Projector3D`, `PCAView`
- `kit/steps`: `StepWorksheet` (typed steps by difficulty), `TileOrder`
- `kit/cine`: `letterbox`, `fadeBlack`, `titleCard`, `NumberBoard`
- `gfx`: `Arrow`, `Grid2D`, `Parallelogram`, `Parallelepiped`, `PlanePatch`,
  `InfLine`, `Dot`, `Beacon`, `Label`, `BuoyField`, models (`lantern`,
  `meridian`, `anchor`, `buoy`, `debris_0..5`, `bridge`)
- `ui/widgets`: `MatrixInput`, `VectorInput`, `Slider`, `ChoiceCards`, `Readout`
- `game/caseboard`: `pin`, `answer`; `game/build.ts` `pylib`: `call`, `map`
- Stage: `view2D`, `view3D`, `shockwave`, `flash`, `nudge`

## 3. Cast (speakers for `scene` lines)

Wren, Bram, Teo, Vell, Ilse (story register — never explains maths, never
uses a term before its naming beat) · LANTERN (maths register — literal).

## 4. Difficulty rules

Difficulty changes **parameters only, never content**: snap (1 / 0.5 / null),
tolerance (±0.05 / ±0.05 / ±0.01), live preview (Cadet only), typed steps,
seeded number ranges. Swarm sizes: 20 / 100 / 300.

## 5. Wording law

- Literal first: say what the arrows, points and grid do. Sentences ≤ 20 words.
- No analogies. Banned: fruit, shopping, cooking, factories, machines that eat
  or spit, sports, personification of maths objects. A matrix is never a machine.
- Never: simply, just, obviously, clearly, trivially, easy to see, recall that,
  note that, it turns out, as you know. No exclamation marks.
- One word per idea; no term before its naming beat (an automated check enforces
  this game-wide, in dialogue too).
- Colours: green = first vector, red = second, blue = third, yellow = result.
  Violet is reserved for the null space.
- Voiced lines containing maths get a `say:` variant (no symbols, written for
  flat TTS delivery).
- Derivations: one transformation per line, aligned equals signs.

## 6. Standing content sources

- Story numbers come from `content/truth.ts` — reference them, never retype.
- `ChapterDef.catchup`: 1–2 literal sentences re-teaching what the lesson
  assumes (never "recall that").
- In-short card: question as title, one literal sentence, no unearned term.

## 7. What the AUTHOR never specifies

File layout beyond the chapter folder, variable names, engine internals,
performance, test infrastructure. Those are the builder's T1 decisions.

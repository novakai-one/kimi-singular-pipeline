# Chapter authoring guide

How to write a chapter of the game. Read this, `GDD.md`, and the chapter's rows in `curriculum.md` before writing anything.
The reference chapter is `site/src/game/content/chapters/c01-*/index.ts`. Copy its structure.

---

## 1. Where things go

```
site/src/game/content/chapters/cNN-slug/
  index.ts        default export: ChapterDef (beats in order)
  script.ts       every voiced line of the chapter (plain data, no imports except types)
  puzzles.ts      PuzzleDef objects (or one file per puzzle if long)
  scenes.ts       cinematic / scene setup code (optional)
```

- The registry picks up `content/chapters/*/index.ts` automatically. Do not edit shared files.
- `id` is `cNN` (e.g. `c07`). `act` and `num` come from the GDD chapter table.
- Dev-only test chapters set `dev: true`.

## 2. The beats

A chapter is a list of beats (`site/src/game/game/types.ts`):

| kind | what the player sees | key fields |
|---|---|---|
| `scene` | voiced dialogue on the comm channel; optional `setup(g)` draws something first; `onLine(line, i)` runs before each line (camera moves, visuals) | `lines`, `setup`, `onLine`, `view` |
| `cinematic` | a scripted visual sequence, HUD hidden | `run(g)` |
| `puzzle` | a challenge: goal, win condition, hints, Show me, Skip, stars | `puzzle: PuzzleDef` |
| `name` | the naming card: what you saw → what it means → its name → formula | `entry: CodexEntry` |
| `explain` | explain-back: a chain of reasoning steps; wrong options carry the counter-argument | `explain: ExplainDef` |
| `build` | the builder terminal: the player writes a **Python** function (real Python 3 in the browser, lists not NumPy), tests run, it joins their library (`basis.py`) | `build: BuildDef` |

House order inside a chapter: **problem → see it (puzzles) → name it → formula → by hand → in code**.
Never name a term before the beat that earns it (a `name` beat). Before that, describe what the player sees.

## 3. Puzzles

```ts
const p1: PuzzleDef = {
  id: 'c03-reach',                       // unique across the game
  title: 'Which points can two thrusters reach?',   // a plain question
  goal: 'Fire the two thrusters so the ship stops on the beacon.',
  subgoals: ['Reach the first beacon', 'Reach the second beacon'],
  predict: { prompt, choices, answer, reveal },     // optional; never required
  hints: ['…', '…', '… (the last hint all but gives it away)'],
  par: 2,                                // moves for the second star (omit if moves do not matter)
  view: '2d',                            // or '3d'
  onWin: [['wren', 'Clean burn.']],      // optional short reaction
  setup(p) {
    const grid = p.grid();               // the standard grid
    // build the scene with kit/ and gfx/ pieces, add them with p.add(...)
    // call p.move() for each player action that counts; p.win() when the goal is met
    return {
      async showMe() { /* animate the real solution through the same controls, ending in p.win() */ },
    };
  },
};
```

Rules:
- **Every puzzle has a win condition** checked from the game state, never from a button the player presses to claim success.
- **Show me** must animate the actual solution with the same objects the player uses, then call `p.win()`.
- The headless test calls `__game.solve()`, which runs `showMe()` at high speed and checks that `p.win()` fired. Every puzzle must pass.
- Difficulty: read `p.difficulty` (`'cadet' | 'navigator' | 'commander'`). Cadet: whole numbers, extra guides drawn (e.g. components, the parallelogram). Navigator: halves and simple fractions. Commander: messier numbers, tighter par, no snapping, "compute it" variants (type the answer before you see it). `p.snap()` already returns 1 / 0.5 / null.
- Tolerances: compare with `near(a, b, tol)` from `kit/handle.ts`. Use tol 0.05 when snapping, 0.08 on commander.
- Keep the picture readable: one idea per puzzle, at most ~4 arrows on screen, labels never on top of each other.
- Readouts (`p.readout(title)`) show live numbers next to the picture, colour-coded (green v, red w, yellow result).

## 4. The kit (use these; do not re-implement)

| Module | Use it for |
|---|---|
| `kit/handle.ts` `VectorHandle` | any vector the player drags (snapping, ticks, moves, constraints) · `near()` |
| `kit/matrixview.ts` `MatrixView` | a 2×2 matrix: moved grid + column arrows (draggable) + typed input + unit-square area · `apply2()` |
| `kit/matrixview3.ts` `MatrixView3` | a 3×3 matrix: moved lattice + 3 column arrows + 3×3 input + unit-cube volume · `apply3()` |
| `kit/rowops.ts` `RowOpsBoard`, `SystemView` | augmented matrix with row operations; the lines/planes picture kept in sync |
| `kit/geom.ts` | `RightAngle`, `AngleArc`, `Shadow` (projection), `Sweep` (eigen hunt), `UnitCircleImage` (SVD) |
| `kit/data.ts` | `PointCloud`, `FitLine` (least squares), `Projector3D`, `PCAView` |
| `kit/flight.ts` `BurnChain` | burns drawn tip to tail from the ship; **Fire** flies the ship; fixed (already fired) burns; per-burn constraints; `onArrive` returns `'win' / 'ok' / 'miss'` |
| `kit/cine.ts` | `letterbox`, `fadeBlack`, `titleCard`, `NumberBoard`, `stamp`, `clearCine` for cinematic beats |
| `gfx/buoys.ts` `BuoyField` | the lattice of light buoys: a matrix moves every point at once (`set`, `to`), `highlight`, `pick` |
| `gfx/models.ts` | `loadModel(name)`, `Ship` (model + engine exhaust, `flyTo`, `face`, `setThrust`); models in `public/game/models/` (`lantern`, `meridian`, `anchor`, `buoy`, `debris_0..5`, `bridge`) |
| `content/common/set.ts` | `makeAnchor`, `makeLantern`, `SPIRES` (story set pieces with fallbacks) |
| `game/caseboard.ts` | `pin(id, question, chapter)` raises a story question; `answer(id, text, chapter)` resolves it |
| `game/build.ts` `pylib` | `await pylib.call('add', v, w)` runs the player's Python function (or the reference) — use for payoffs |
| `g.stage.shockwave(at, ms, amp)` | a screen-space shockwave ring (the pulse) · `g.stage.flash()`, `g.stage.nudge()` |
| `gfx/arrow.ts` `Arrow` | a non-draggable arrow (`moveTo`, `grow`, `pulse`) |
| `gfx/grid.ts` `Grid2D` | via `p.grid()`; `grid.to(M)` animates the moved grid |
| `gfx/shapes.ts` | `Parallelogram`, `Parallelepiped`, `PlanePatch`, `InfLine`, `Outline2D`, `Lattice3D` |
| `gfx/markers.ts` | `Pad` (target ring), `Dot`, `Beacon` (3-D) |
| `gfx/fx.ts` | `burst`, `shockwave`, `celebrate` |
| `gfx/label.ts` `Label` | text/maths pinned to a 3-D point |
| `ui/widgets.ts` | `MatrixInput`, `VectorInput`, `Slider`, `ChoiceCards`, `Readout`, `parseNum` |
| `math/la.ts`, `math/rref.ts`, `math/frac.ts` | all numbers (exact fractions for row reduction) · `nice()` for display |
| `audio/sfx.ts` `sfx` | `tick`, `snap`, `success`, `miss`, `whoosh`, `collapse`, `thrust`, `warp`, `alarm` |
| `core/tween.ts` | `animate(ms, fn, ease)`, `wait(ms)`, `ease.*` |

Camera: `g.stage.view2D({ center, height, ms })` and `g.stage.view3D({ target, distance, azimuth, elevation, ms })`. 2-D puzzles default to a 10-unit-high view of the origin.

## 5. Words (BUILD_BRIEF.md §2a is the law)

- Literal first: say what the arrows, points and grid do.
- Short sentences (≤ 20 words). One idea per sentence. Bold one key idea per block.
- No analogies. Banned: fruit, shopping, cooking, factories, machines that eat or spit, sports, personification of maths objects ("the matrix wants", "favourite direction").
- A matrix is never a machine. It moves points; it transforms the grid.
- Never: simply, just, obviously, clearly, trivially, easy to see, recall that, note that, it turns out, as you know. No exclamation marks. No hype words.
- One word per idea: "linear transformation" (not map/operator/function), "null space" (not kernel), "column space", "augmented matrix", "pivot", "row echelon form", "reduced row echelon form", "span", "scalar triple product", "coplanar", "diagonalisation" (British spelling).
- Headings are plain questions: "What happens to the area?"
- Characters may have feelings. Maths objects may not.
- Maths in text: `$…$` (KaTeX). Colour macros: `\cg{v}` green, `\cr{w}` red, `\cy{…}` yellow.
- Voiced lines: if a line contains maths, add `say:` with how it should be spoken (e.g. `say: 'v plus w'`).

## 6. Done means

1. `npx tsc --noEmit -p tsconfig.json` clean for your files.
2. `node tests/game-flow.mjs cNN <dir>`: every puzzle `solve → true`, no console errors. Look at every screenshot.
3. Every number on screen checked against `math/la.ts` (write a unit test in `tests/unit/` for any non-trivial puzzle maths).
4. `npm run check:game-wording` (once it exists) reports nothing for your chapter.
5. Every voiced line is in `script.ts` (scene lines, explain intros, onWin lines, and any `g.say` in code).

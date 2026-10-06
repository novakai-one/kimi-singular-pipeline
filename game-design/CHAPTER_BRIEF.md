# Brief for a chapter builder

You are building chapters of **SINGULAR**, a voiced story game that teaches university linear algebra, in the repo
`/home/user/claude-ai-demo`. The engine, kit and two reference chapters exist. You write content on top of them.

## Read first, in this order (do not skip)
1. `game-design/AUTHORING.md` — the chapter format, beats, puzzle contract, kit table, wording rules, definition of done.
2. `game-design/GDD.md` — the game design. Read the whole story bible and cast, then **your chapters' rows in full**.
3. `game-design/curriculum.md` — the curriculum nodes your chapters cover (question, the picture, where the formula comes from, misconceptions, explain-back target, by-hand skills). Section 0.3 fixes notation and terms.
4. `site/src/game/game/types.ts` — the contract (PuzzleDef, PuzzleCtx, CodexEntry, ExplainDef, BuildDef, ChapterDef).
5. The reference chapters, which set the quality bar: `site/src/game/content/chapters/c00-prologue/` and `c01-vectors/` (index.ts + script.ts). Copy their structure, voice and level of polish.
6. The kit you will use: `site/src/game/kit/*.ts` (handle, matrixview, matrixview3, rowops, system, geom, data, flight, cine), `site/src/game/gfx/*.ts` (arrow, grid, shapes, markers, buoys, models, fx, label, lines), `site/src/game/content/common/set.ts` (Anchor, Lantern), `site/src/game/ui/widgets.ts`.

## What to build
Your chapters, exactly as the GDD describes them (plot beat, puzzles with their concrete numbers and win conditions,
the aha, the naming moment, the explain-back, the build task, difficulty deltas). Where the GDD is vague, decide,
following the house rules. Every chapter needs:
- An opening scene that states the plot problem as a plain question (problem first, never a definition).
- 3–6 puzzles. Each has a real win condition checked from game state, hints (the last nearly gives it away), a working
  **Show me** that drives the same objects to the answer and ends in `p.win()`, and difficulty variants via `p.difficulty`.
  Use `predict` on at least two puzzles per chapter. Use `style: 'doubt'` for the crew-doubt puzzle if the GDD has one.
- Naming cards (`name` beats) only after the puzzles that earn them: saw → means → name → formula → why → cue → use.
  Colour the maths: `\cg{}` green (first vector / column 1), `\cr{}` red (second / column 2), `\cy{}` yellow (result).
- One explain-back (`explain` beat): 3–4 steps, each with one right option and two tempting wrong ones whose `why`
  refutes the misconception with the picture. Base the wrong options on the curriculum's misconceptions.
- One or two Python builds (`build` beats) as the GDD specifies: a real function on plain lists (no NumPy), starter code
  with a docstring and a helpful comment, a reference solution, 4–6 tests (including an edge case), a one-line payoff.
  Later builds may call earlier ones with `uses: ['add', ...]`.
- A closing scene that turns the plot toward the next chapter.
- Every voiced line in `script.ts`; lines with maths get `say:` (how to read it aloud, no symbols).

## Craft standards
- The picture does the teaching. Keep scenes uncluttered: at most ~4 arrows, labels never overlapping, readouts for exact numbers.
- Make winning feel good: Fire/commit moments, ship or object motion, `celebrate`, `sfx.success()`, a short crew reaction.
- Make failing teach: show where the attempt landed and the gap; a gentle `sfx.miss()`; never a scolding line.
- Small whole numbers first; harder numbers on commander. Verify every number with `site/src/game/math/la.ts` or `rref.ts`.
- Story lines are short (≤ 20 words), in character, no exclamation marks, no banned words, maths objects never personified.
- Do not name a term before its `name` beat (an automated check enforces this across the whole game).

## Verify (required before you report)
1. `npx tsc --noEmit -p tsconfig.json` has no errors in your files.
2. Write `tests/unit/game-<chapterId>.test.ts` that checks your puzzle numbers (targets reachable, answers right, par
   achievable) with the maths library; run `node --experimental-strip-types --test tests/unit/game-<chapterId>.test.ts`.
3. `node tests/game-solve-all.mjs <chapterId>` — every puzzle passes at cadet, navigator and commander, no console errors.
   (The dev server runs on http://localhost:5173 without hot reload; if it is down, start it with `npx vite --port 5173 &`.)
4. `node tests/game-flow.mjs <chapterId> <scratch dir>` — LOOK at every screenshot with the Read tool. Fix anything that
   is cluttered, overlapping, off-screen, unreadable or ugly. Iterate until it looks like a shipped game.
5. `node tests/game-wording.mjs <chapterId>` reports 0 hits for your chapter.
6. Interact for real at least once per chapter: a Playwright script in the scratch dir that drags a handle or types an
   answer through the actual UI and confirms the puzzle reacts.

The machine is shared with other builders (4 CPU cores, software rendering), so browser tests are slow. Be patient;
do not start extra servers.

## Rules
- Create/modify only: `site/src/game/content/chapters/<your chapter dirs>/**`, `tests/unit/game-<chapterId>*.test.ts`.
  If you need a reusable component that does not exist, put it in your chapter folder (e.g. `.../c07-dot/reactor.ts`).
  Do not edit shared files (kit, engine, types, other chapters). If a shared file has a bug or needs a feature,
  work around it locally and describe the change in your report.
- Do not commit. The lead reviews and commits.
- Final report (concise): files created; each puzzle with its win condition and solve result at each difficulty; the
  codex entries; the builds; anything you could not do; shared-file changes you recommend.

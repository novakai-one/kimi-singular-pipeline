# EXECUTION CONTRACT — v1.1

> Paste this to the coding agent (the BUILDER) at the start of every build session,
> together with the path to the Lesson Pack. Versioned: one new rule per diagnosed failure.
> Changelog: v1 — initial. v1.1 — rule 5 gains a scoped-license exception, so a
> Pack's §4 may authorize exact, enumerated chrome changes.

You are the BUILDER. The Lesson Pack referenced below is the complete and only
source of learner-facing content for this task.

## Rules

1. **Write ZERO learner-facing prose.** Every word, number, label, hint, and
   feedback message a learner can see or hear must appear verbatim in the Pack.
   If you are about to type a sentence a learner might read: find it in the Pack
   and copy it, or treat it as a T3 gap (rule 2).

2. **Unspecified decisions use three tiers:**
   - **T1 — plumbing** (file layout, variable names, internal structure,
     performance): decide freely. Log each in the report's DECISIONS section.
     Never blocking.
   - **T2 — learner-visible but not content-bearing** (animation timing, decimal
     rounding beyond spec, control placement): copy the convention of the nearest
     existing chapter (reference: `c00-prologue`, `c01-vectors`), implement, and
     log in DECISIONS with the chapter you copied. Non-blocking; the author
     reviews the log after the build.
   - **T3 — content-bearing** (any learner-facing word, number, formula, win
     condition, feedback string, or beat order): NEVER decide. Instead:
     (a) continue building everything else;
     (b) collect ALL T3 gaps into one numbered STOP list;
     (c) for each gap, write a concrete PROPOSED default.
     The author replies "accept all" or patches the Pack. One batched round trip.

3. **Never modify the Pack.** Do not fix typos, reword, or improve it. Report
   defects instead.

4. **Content lives in data.** Chapter content modules contain only data copied
   from the Pack; engine code contains no content.

5. **Do not edit shared files** (kit, engine, types, truth, UI chrome, other
   chapters). Work only in `site/src/game/content/chapters/<lesson id>/` and
   `tests/unit/game-<lesson id>.test.ts`.
   **Exception:** if the Pack's §4 grants a numbered licensed chrome change
   (CH1, CH2, …) naming the exact behavior, you may edit the shared files that
   render that behavior, gated to this chapter only, nothing beyond the license.
   Log every licensed change in the report. Any other shared-file bug: work
   around it locally and say so.

## Before reporting done

1. `npx tsc --noEmit -p tsconfig.json` clean for your files.
2. `node --experimental-strip-types --test tests/unit/game-<lesson id>.test.ts` passes.
3. `node tests/game-solve-all.mjs <lesson id>` passes at cadet, navigator and
   commander, no console errors (dev server on http://localhost:5173).
4. `node tests/game-flow.mjs <lesson id> <scratch dir>` — look at every
   screenshot; nothing cluttered, overlapping, off-screen or ugly; the Pack's
   attention-budget tests pass.
5. `node tests/game-wording.mjs <lesson id>` reports 0 hits.
6. `node tools/checks/provenance.mjs <lesson id>` — every learner-facing string
   in your chapter code appears verbatim in the Pack file (highest version N).

## Report format

- Files created/modified.
- Check outputs, verbatim.
- Screenshot paths.
- DECISIONS: every T1/T2 decision, one line each, with the reference chapter
  for T2. Every licensed chrome change, one line each.
- STOP list: numbered T3 gaps, each with a PROPOSED default.
- Do not summarize the pedagogy. You did not author it.

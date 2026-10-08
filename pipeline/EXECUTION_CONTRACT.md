# EXECUTION CONTRACT — v1

> Paste this to the coding agent (the BUILDER) at the start of every build session,
> together with the path to the Lesson Pack. Versioned: one new rule per diagnosed failure.
> Changelog: v1 — initial.

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

5. **Do not edit shared files** (kit, engine, types, truth, other chapters).
   Work only in `site/src/game/content/chapters/<lesson id>/` and
   `tests/unit/game-<lesson id>.test.ts`. If a shared file has a bug, work
   around it locally and say so in the report.

## Before reporting done

1. `npx tsc --noEmit -p tsconfig.json` clean for your files.
2. `node --experimental-strip-types --test tests/unit/game-<lesson id>.test.ts` passes.
3. `node tests/game-solve-all.mjs <lesson id>` passes at cadet, navigator and
   commander, no console errors (dev server on http://localhost:5173).
4. `node tests/game-flow.mjs <lesson id> <scratch dir>` — look at every
   screenshot; nothing cluttered, overlapping, off-screen or ugly.
5. `node tests/game-wording.mjs <lesson id>` reports 0 hits.
6. `node tools/checks/provenance.mjs <lesson id>` — every learner-facing string
   in your chapter code appears verbatim in the Pack file.

## Report format

- Files created/modified.
- Check outputs, verbatim.
- Screenshot paths.
- DECISIONS: every T1/T2 decision, one line each, with the reference chapter
  for T2.
- STOP list: numbered T3 gaps, each with a PROPOSED default.
- Do not summarize the pedagogy. You did not author it.

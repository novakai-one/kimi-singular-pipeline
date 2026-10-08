# PACK TEMPLATE — v1

> The AUTHOR (chat agent: Kimi / ChatGPT / Claude) fills every field of this
> template. A field the author cannot fill goes in §6 OPEN items with a
> PROPOSED default. Empty §6 = green light.
> Changelog: v1 — initial.

```markdown
# LESSON PACK — <lesson-id> v<N>
Changelog: v<N> — <one line per version>.

## 0. Meta
- Lesson id · Title (the plain question the lesson answers)
- Curriculum node (from game-design/curriculum.md)
- Class topic this maps to
- Terms used (must already be earned in earlier lessons)
- Terms earned here
- Difficulty design: what Cadet / Navigator / Commander each do
  (parameters only, never different content)

## 1. The problem
The motivating situation, in objects the learner already manipulates.
2–4 sentences. Must not be solvable by inspection. No unearned terms.

## 2. Beats (ordered)
Every beat fully specified. Only beat kinds and kit components from
CAPABILITY_SHEET.md may be used.

For each puzzle beat:
- id, title (a plain question), goal text (exact)
- setup: exact numbers, every object on screen, every readout row
- win condition (machine-checkable, tolerances stated)
- prediction prompt (exact text)
- per-difficulty parameters (snap, tolerance, ranges)
- feedback strings: one exact string per anticipated wrong move
- reference solution (for solve-all), derivation one transformation per line

For each name beat: term, question, saw / means / name / formula / why /
cue / use — all seven fields, full text.

For each scene/cinematic: every line, speaker, exact text, and `say:`
spoken variant for any line containing maths symbols.

## 3. Briefing
- sayit: ask (exact), every frame, the full word bank
- doubts: claim, true/false, reason, goal text, scene setup, curated edge
  cases, what showMe constructs
- law: frame with slots, all slot options, the correct filling, generation
  rule for random cases, near-miss fillings that must break, the reason
  step's options with a rebuttal for every wrong option
- procedure (or an explicit "none this lesson" decision): tiles, decoys,
  reference order, failure messages
- compare: the model page (full text) + 2–3 "Did you say…?" key ideas

## 4. Staging
Per beat: what is on screen (kit components only), max number of arrows,
readout rows, camera view. No layout invention left to the builder.
Flow screenshots required at 1440px and 390px for every beat.

## 5. Acceptance tests
Numbered, machine-checkable. Every puzzle win condition, every feedback
string, every term-ordering rule, and the provenance check must appear here.

## 6. OPEN items
Anything unspecified, each with a PROPOSED default. Empty = green light.
```

## Completeness gate (the author runs this before sending)

- [ ] Every field filled, or listed in §6 with a PROPOSED default
- [ ] Every puzzle has: exact numbers, win condition, per-difficulty
      parameters, feedback strings, reference solution
- [ ] Every term used is listed in §0 as earned-here or earned-earlier
- [ ] No banned words (see CAPABILITY_SHEET.md §5)
- [ ] Acceptance tests numbered and machine-checkable
- [ ] Only capability-sheet beat kinds and kit components used

The author states "gate passed" with the checklist when delivering the Pack.

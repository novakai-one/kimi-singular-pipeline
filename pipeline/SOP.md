# SOP — the authoring pipeline — v1

> How a lesson goes from idea to shipped chapter. Roles:
> **AUTHOR** = chat agent (Kimi / ChatGPT / Claude) — owns every learner-facing word.
> **BUILDER** = coding agent (Claude Code / Codex) — owns zero prose.
> **CHECKER** = the automated harness (solve-all, flow, wording, provenance).
> **BRIDGE** = the human — moves artifacts verbatim, never summarizes.
> Changelog: v1 — initial.

## Phase 0 — setup (once)

| Step | Role | Action |
|---|---|---|
| 0.1 | BRIDGE | Clone the game repo → `kimi-singular-pipeline`. ✅ Done. |
| 0.2 | AUTHOR | Draft `pipeline/CAPABILITY_SHEET.md` from `game-design/AUTHORING.md`. ✅ Done. |
| 0.3 | AUTHOR | Save `EXECUTION_CONTRACT.md`, `PACK_TEMPLATE.md`, `SOP.md`, first Pack. ✅ Done (this commit). |
| 0.4 | BRIDGE→BUILDER | Paste the PROVENANCE LINT task (below). Builder writes `tools/checks/provenance.mjs` and validates it on a synthetic fixture. |

### The provenance lint task (paste verbatim to the BUILDER)

```
Write tools/checks/provenance.mjs. Usage: node tools/checks/provenance.mjs <lesson-id>.
It reads the Lesson Pack at pipeline/packs/<lesson-id>-v<N>.md (highest N) and
the chapter source at site/src/game/content/chapters/<lesson-id>/**. It extracts
every string literal in the chapter code that could be learner-facing (text,
goal, ask, claim, reason, hints, frames, wordBank entries, cue, saw, means,
name, why, use, page, keyIdeas, brief, title, feedback strings, say variants)
and fails with exit code 1, listing each string that does not appear verbatim
in the Pack file. Passes silently otherwise. Validate on a synthetic fixture:
one matching string (pass), one absent string (fail). Do not modify any other
file. Report the two fixture results verbatim.
```

## Phase 1 — author one lesson

| Step | Role | Action |
|---|---|---|
| 1.1 | BRIDGE→AUTHOR | Paste: `PACK_TEMPLATE.md` + `CAPABILITY_SHEET.md` + "Author Pack v1 for lesson <id>, complete." For lesson `d01-dot` this is already done — the Pack is at `pipeline/packs/d01-dot-v1.md`. |
| 1.2 | AUTHOR | Run the completeness gate (template §end). Deliver the Pack + "gate passed". |
| 1.3 | BRIDGE | Save the Pack to `pipeline/packs/<id>-v<N>.md`. Never paraphrase, trim, or fix it. |

## Phase 2 — build

| Step | Role | Action |
|---|---|---|
| 2.1 | BRIDGE→BUILDER | Paste `EXECUTION_CONTRACT.md` + the Pack's repo path. Nothing else. |
| 2.2 | BUILDER | Build under the contract. T1/T2/T3 decision tiers. Run all six checks (contract §Before reporting done). Return the report. |
| 2.3 | BRIDGE | Triage: plumbing failures → back to BUILDER with raw output. Content failures + screenshots → to AUTHOR. |

## Phase 3 — revise

| Step | Role | Action |
|---|---|---|
| 3.1 | AUTHOR | Diagnose. Content defects → Pack v<N+1> (full new version + changelog line; never prose instructions). Plumbing defects → Builder-Fix Note quoting the exact check output. |
| 3.2 | BRIDGE | Repeat 2.1–3.1 until all checks green AND author approves screenshots AND you approve screenshots. |
| 3.3 | BRIDGE | Retrospective, 15 min: every T2 flag and T3 stop becomes one new line in the contract, template, or capability sheet. Bump the version. |

## Standing rules

1. The BRIDGE moves artifacts verbatim. Raw test output and screenshots travel;
   interpretations do not.
2. Every improvisation incident becomes exactly one new rule in one of the four
   pipeline documents. Versioned, one rule per failure.
3. Packs are immutable. Changes are new versions, not edits.
4. The BUILDER never touches `/pipeline/`.

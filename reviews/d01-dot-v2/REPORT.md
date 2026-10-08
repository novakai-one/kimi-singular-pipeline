# d01-dot — Pack v2 build report

Intended outcome: implement the authored chapter under execution contract v1.1, apply its licensed CH1–CH3 chrome and v2 staging, run the six checks plus AT7–AT9, and provide reviewable game evidence in this repository.

Pack: [d01-dot-v2.md](../../pipeline/packs/d01-dot-v2.md). Contract: [v1.1](../../pipeline/EXECUTION_CONTRACT.md). Source baseline: `2913442`; final implementation: `7995b89a3084a6b9880e702abd170d7d1b73f624`. No pipeline or other-chapter source was modified. Shared source changes are limited to the chapter-gated CH1–CH3 renderer paths below. The authored content and mathematics remain verbatim; the STOP list is awaiting the author. Chris's screenshot acceptance is also pending.

## Files created / modified

- [site/src/game/content/chapters/d01-dot/AGENTS.md](../../site/src/game/content/chapters/d01-dot/AGENTS.md)
- [site/src/game/content/chapters/d01-dot/briefing.ts](../../site/src/game/content/chapters/d01-dot/briefing.ts)
- [site/src/game/content/chapters/d01-dot/build.ts](../../site/src/game/content/chapters/d01-dot/build.ts)
- [site/src/game/content/chapters/d01-dot/copy.ts](../../site/src/game/content/chapters/d01-dot/copy.ts)
- [site/src/game/content/chapters/d01-dot/index.ts](../../site/src/game/content/chapters/d01-dot/index.ts)
- [site/src/game/content/chapters/d01-dot/instrument.ts](../../site/src/game/content/chapters/d01-dot/instrument.ts)
- [site/src/game/content/chapters/d01-dot/lifecycle.ts](../../site/src/game/content/chapters/d01-dot/lifecycle.ts)
- [site/src/game/content/chapters/d01-dot/logic.ts](../../site/src/game/content/chapters/d01-dot/logic.ts)
- [site/src/game/content/chapters/d01-dot/plumbing.ts](../../site/src/game/content/chapters/d01-dot/plumbing.ts)
- [site/src/game/content/chapters/d01-dot/puzzles.ts](../../site/src/game/content/chapters/d01-dot/puzzles.ts)
- [site/src/game/content/chapters/d01-dot/staging.ts](../../site/src/game/content/chapters/d01-dot/staging.ts)
- [site/src/game/content/chapters/d01-dot/storage.ts](../../site/src/game/content/chapters/d01-dot/storage.ts)
- [site/src/game/content/chapters/d01-dot/style.css](../../site/src/game/content/chapters/d01-dot/style.css)
- [site/src/game/game/app.ts](../../site/src/game/game/app.ts)
- [site/src/game/game/hud.ts](../../site/src/game/game/hud.ts)
- [site/src/game/game/runner.ts](../../site/src/game/game/runner.ts)
- [site/src/game/ui/beat-chrome.ts](../../site/src/game/ui/beat-chrome.ts)
- [site/src/game/ui/ui.ts](../../site/src/game/ui/ui.ts)
- [tests/unit/game-d01-dot.test.ts](../../tests/unit/game-d01-dot.test.ts)

Evidence artifacts: this report, [screenshot index](SCREENSHOTS.md), all linked PNGs, and raw outputs/observations in [checks](checks). There are 93 PNGs, including 5 explicitly rejected review frames.

## Check outputs, verbatim

### 1. TypeScript

`npx tsc --noEmit -p tsconfig.json`

Exit 0; stdout and stderr are empty.

### 2. Unit tests

`node --experimental-strip-types --test tests/unit/game-d01-dot.test.ts`

```text
✔ p1 holds each band for a full second, in either order (0.486334ms)
✔ p1 leaving a band resets its timer; negative readings bark without winning (0.06575ms)
✔ sensor radius stays 3 with the authored angular steps; bands include their tolerance boundaries (5.654042ms)
✔ p2 accepts 15 within ±0.01, rejects the three specified misconceptions (0.566292ms)
✔ doubt: non-zero perpendicular arrows refute the claim; a zero arrow satisfies it (0.302917ms)
✔ law: target survives 500 seeded cases; every near-miss breaks (9.147375ms)
✔ build: 200 integer pairs in the authored range; reference passes and decoy fails with the authored format (1.089583ms)
✔ Commander typing previews complete and partial answers; only Enter submits the current field value (1.28ms)
✔ prediction dismissal survives Reset-style remounts; a goal only reopens on a deliberate toggle (0.330333ms)
✔ only the licensed d01 interactive beats receive compact chrome (0.224ms)
✔ a new transient replaces the old one; its old timeout cannot remove the replacement (0.6275ms)
✔ Continue needs 200 passing cases and finite adopted output; editing invalidates a pending adoption (0.189167ms)
✔ the saved player function supplies the instrument; stale results and teardown cannot overwrite it (0.355333ms)
✔ an old adoption rejection cannot invalidate a newer pass or touch a later beat (0.656292ms)
✔ instrument rejection obeys epochs, recovers after a current failure, and is inert after teardown (0.15575ms)
✔ holding a heading refreshes confirmation presentation without executing Python again (0.086917ms)
✔ Start over status clearing restores one authored tests line without replacing a result (0.048542ms)
✔ edited success resets to one tests line without causing an observer mutation loop (0.0485ms)
✔ run ownership starts at synchronous status write, rejects edits during testing, and recovers on a fresh run (0.438292ms)
✔ d01 mounting, passing, failing and serializing never replace story source/flags/drafts (0.328ms)
✔ an aborted renderer isolates late writes while preserving a newer story save (0.06225ms)
✔ overlapping build lifetimes route each result to its owner and restore absent flags on setup failure (0.08275ms)
ℹ tests 22
ℹ suites 0
ℹ pass 22
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 480.783125
```

### 3. Puzzle solve checks

`node tests/game-solve-all.mjs d01-dot`

```text

0/0 passed
```

The unchanged harness enumerates story chapters by default. This developer chapter is excluded, so `0/0` is **zero coverage**, not a puzzle pass. The meaningful developer run follows; it exercises both puzzles at all three difficulties.

`node tests/game-solve-all.mjs d01-dot --dev`

```text
ok   d01-dot d01-p1 [cadet] 5311ms
ok   d01-dot d01-p1 [navigator] 3309ms
ok   d01-dot d01-p1 [commander] 2946ms
ok   d01-dot d01-p2 [cadet] 1416ms
ok   d01-dot d01-p2 [navigator] 1437ms
ok   d01-dot d01-p2 [commander] 1603ms

6/6 passed
```

### 4. Flow

`node tests/game-flow.mjs d01-dot reviews/d01-dot-v2/screenshots/flow-desktop`

```text
beat 1 puzzle d01-p1: solve → true
beat 4 puzzle d01-p2: solve → true
beat 6 doubt: solve → true
beat 7 law: solve → true
beat 9 build dot: assemble true, fill true, write true
no console errors
```

Every produced image was inspected. The harness's WebDriver dialogue auto-advance can overrun scene captures, and its startup frame can include the Loading fade. The verified normal-render scene/card/Briefing captures in the index supply actual beat states, with auto-advance paused and Loading removed. Those capture changes affect the test session only. The final phone Law was additionally checked using the normal renderer, including the generated example and the scrolled reason panel.

### 5. Wording

`node tests/game-wording.mjs d01-dot`

```text
0 strings checked in d01-dot, 0 hits
```

The same developer exclusion gives zero strings. A separate fixture temporarily includes the developer chapter only while extracting its existing structured text, restores the registry immediately, and applies the unchanged harness RULES. It does not change production registration or add test-only gameplay behavior.


```text
Developer-chapter fixture: 40 strings checked, 0 hits
"dot product" before name-dot: 0 hits
The unmodified wording RULES were applied after temporary registry inclusion for text extraction only.
```

### 6. Provenance

`node tools/checks/provenance.mjs d01-dot`

Exit 0; stdout and stderr are empty.

The lint selects the highest Pack version, v2. No Pack edits or wording normalization were used.

### Additional acceptance evidence

The headless interactive run produced **46** measured captures at both widths. All have ≤4 visible non-canvas groups, no interactive banner or expanded navigation, ≤1 transient, no off-screen UI group, and no pairwise overlap between those UI groups. Every capture after an actual drag/answer attempt has no prediction and a collapsed goal. Counts inspect rendered cards/panels, not only declared data attributes. [Full per-frame observations](checks/07-acceptance.json).

`AT7 / AT8 / AT9` — final run output:

```text
46 interactive screenshots: AT7/AT9 passed; all after-drag/attempt captures: AT8 passed.
AT3 feedback, prediction permanence, CH3 replacement/dismissal, build gating/invalidation, and AT6 200-case modes: passed.
no console errors
```

AT3 checks compare the rendered 25/35/7 feedback byte-for-byte to the Pack. Enter on 15 wins. Real sequential typing of `15.1` stays unconfirmed and fails on Enter; `15.01` remains unconfirmed while typing and wins on Enter. Empty Enter does not submit. Show me remains an explicit committed solution. Numeric confirmation is recorded in the independent [numeric review](reviews/numeric-review.md).

AT6 runs real Python: exactly 200 passing rows in Assemble, Fill and Write at both widths, and a wrong function displays the authored first-mismatch format. Continue stays absent/inert before a pass, after a failure, after editing a pass, and after Start over. The success line replaces the tests line. A direct call to the adopted player source supplies the separate instrument.

The final focused regression edited the draft during a slow Python run that subsequently completed 200/200 passing cases. Its old result did not restore Continue, a readout, or a success claim; a fresh run of the current authored function recovered. [Focused fix and actual browser evidence](reviews/final-fix-report.md). Editing an already completed pass restores the authored tests line. The CH3 replacement pictures are explicitly injected toast probes; their authored message is used only to exercise replacement/placement, not to claim a negative reading at that heading.

Library isolation was checked with an existing passing general/3D story source seeded before opening d01. Its source, pass flag and serialized value stayed unchanged during each mode, after leaving d01, and after an aborted Python run settled. `dot([0,0,1],[0,0,1])` remained 1 and `dot([2,3,6],[2,3,6])` remained 49. A deliberately distinguishable test function passed the integer suite and yielded 123.45 on a non-integer discovery heading, proving the d01 instrument used adopted player source rather than reference fallback; it was a test fixture, not shipped learner content. [Full isolation observations](checks/08-isolation.json).

## Screenshot paths and what was assessed

[Complete index](SCREENSHOTS.md). Selected frames:

| Workflow | Actual observation | Assessment / practical limit |
|---|---|---|
| [p1 entry](screenshots/mobile-p1-entry.png) | Full goal, numeric prediction, reading 8.49 and shadow 2.12; beam/sensor/shadow visible | Four groups; no banner/nav clutter; initial labels remain separate |
| [p1 maximum after drag](screenshots/mobile-p1-maximum.png) | Goal pill only; prompt gone; reading 12.00, shadow 3.00 | Actual pointer drag and one-second confirmation |
| [p1 negative](screenshots/mobile-p1-negative.png) | Sensor points left; reading −12.00, shadow +3.00; one authored bark | Endpoint labels fit; bark replaces transient and exits on next drag or timer. Signed-length wording is a STOP item |
| [p1 solved](screenshots/mobile-p1-solved.png) | Win stars and Continue appear, with no earlier prompt | Win card is the sole transient; centering stays inside viewport throughout its entrance |
| [Commander wrong answer](screenshots/mobile-p2-wrong-25.png) | 25 remains failed; exact feedback appears in one glass transient | No early win at a correct numeric prefix; complete answer is confirmed with Enter |
| [Doubt](screenshots/mobile-doubt-solved.png) | Non-zero arrows, reading 0.00, authored settled verdict | Goal/instrument/actions/verdict fit as four groups; free-drag tolerance is pending author decision |
| [Law](screenshots/mobile-law-normal-render.png), [reason bottom](screenshots/mobile-law-normal-render-bottom.png) | Law/reason panel above a visible green and red case; one toast above actions | Panel ends around y507, example is around y569–634, toast y731–769, actions below y791. The final generated case is v=(1,0), w=(−1,4), reading −1; the 500-case test includes both zero and non-zero cases. Phone reason content scrolls; both ends were inspected |
| [Build start/reset](screenshots/mobile-build-start-over.png) | Title, brief and one tests line; no Continue | Start over restores the same authored status element and invalidates adoption |
| [Build pass](screenshots/mobile-build-write-passed.png) | Authored code, success replacing tests text, readout 15.00, Continue | 200 real cases plus direct player-source adoption; editor changes revoke readiness |
| [Existing story](screenshots/story-c01-scope-check.png) | Existing c01 banner and full nav return | Licensed presentation and local function adoption do not leak into the story |

Name cards, scene dialogue, Say it/help, and Compare have verified full-chrome captures at both widths. They use the authored text and existing engine presentation; phone long-form cards scroll. These reviews establish the observed layout and interaction behavior, not author or learner acceptance of the explanation.

## DECISIONS

- **CH1:** Only d01 puzzle/doubt/law/procedure/build fold navigation to the existing hamburger. It joins the action group to avoid a fifth group; Log and Case board remain available in the folded menu. Other chapters retain their normal navigation.
- **CH2:** The chapter banner node detaches during those scoped interactive beats and returns for normal/full-chrome states.
- **CH3:** One owned transient replaces its predecessor; stale timers cannot dismiss the replacement. Negative bark uses its authored four-second/next-drag exit; win replaces prompt/bark/feedback. Beat cleanup clears ownership.
- **T1:** Plain COPY data is copied from Pack v2. Pure math, lifecycle, scoped storage, instrument execution, staging and renderer adaptation are separate chapter-local modules. Existing engine APIs are reused.
- **T1:** Developer registration preserves the existing story and its reference registration. The unchanged solve/wording zero-coverage outputs are disclosed; meaningful developer supplements are used. The registry/debug/harness source is untouched.
- **T1:** Exactly 200 seeded integer pairs are supplied to the existing Python test runner, bypassing its unrelated 20/100/300 swarm policy without shared build edits.
- **T1:** Source/pass/draft/adoption live in `flags['d01-dot-build']`. A bounded record adapter handles the existing renderer's expected global interface, serializes the original story records, isolates its source/pass writes and finalizer, and drains old primary handlers. Ordinary story reads and later operations remain intact, including late aborted results.
- **T1:** Build readiness is tied to this run's epoch, 200 results and finite adopted output. Editing, mode changes, Start over, reruns and teardown invalidate it. Success and failure callbacks use the same lifetime guards.
- **T1:** A bounded adapter on the current build status element pins source/epoch at the unchanged renderer's synchronous run-start write; it restores instance accessors after settlement and never changes global DOM prototypes. Old test completion cannot adopt after a draft/mode/reset change. Editing a completed pass restores the existing authored tests line.
- **T1:** Reading execution is deduplicated by source/input, while cached presentation can refresh confirmation colour. Older responses/errors and disposed sessions cannot override newer values; current success recovers visibility.
- **T1:** Prediction dismissal persists through Reset within the UI session. The capture harness waits for Loading removal and verifies the actual beat, avoiding false visual sign-off from automatic advancement.
- **T2 — c00-prologue / c01-vectors:** Reuse the grid, vector controls, glass surfaces, field/keyboard conventions and 700 ms Show me motion. Copy the existing action/goal styling and confirmation colour; preserve authored one-second holds and two-decimal display.
- **T2 — c01-vectors label/camera conventions:** Fit the entire p1 sweep and offset labels at cardinal headings. Phone Law example moves into the free lower canvas; its transient stays clear of panel, case and actions. Desktop layout retains the existing right-side example pattern.
- **T2 — c00-prologue / c01-vectors glass/toast conventions:** Ordinary d01 interactive toasts use the same bottom placement pattern as the authored bark, clear of top goal/readout and bottom actions. The already verified Law toast position is preserved.
- **T2 — c00-prologue / c01-vectors keyboard convention:** Enter confirms the complete Commander answer, following the existing field/primary confirmation convention used by their renderer; input preview preserves exact supplied feedback. This repairs early success/focus loss while typing 15.1, with no new button or prose and no tolerance change.
- **T1:** No procedure content is invented: the Pack specifies none. Shared scoped chrome still recognizes the licensed procedure kind.

## Concrete review findings and repairs

The independent task review found global story-dot contamination, stale adoption rejection affecting a later Continue, stale readout failure/recovery, and Start over clearing the tests line. All were fixed and re-reviewed. Primary visual review repaired an incompletely collapsed goal, aligned label collision, a clipped win entrance, and a Law example hidden by the phone panel. Real character-by-character typing caught the 15 prefix win; confirmed submission now follows the full number. Final whole-output review caught a stale success claim after editing, adoption of an old run after a draft edit, and ordinary toasts overlapping the phone goal/readout. The focused final fix repairs those together; its [scoped re-review passes](reviews/final-fix-review.md) with all three addressed and no new Critical/Important finding. Name captures wait out the inherited Codex toast rather than widening shared chrome scope. [Review notes](reviews) retain the exact findings and resolved status. The rejected screenshots preserve failed frames as evidence, not benchmarks.

## STOP — author decisions pending

1. **Signed shadow:** p1 can show reading −12 and geometric shadow length +3, while means/page call the reading beam length times shadow length. **PROPOSED:** specify a signed shadow readout/label and use “signed shadow length” in those explanations.
2. **Zero-vector angle:** naming/page say zero means a right angle without qualifying non-zero vectors, while the Law permits a zero vector. **PROPOSED:** state that zero dot product is orthogonality, and the right-angle interpretation applies when both arrows are non-zero.
3. **Doubt precision:** exact-zero checks with free Commander dragging can reject a displayed 0.00. **PROPOSED:** author specifies a numerical zero-reading convention/tolerance matching two-decimal display, e.g. `|dot| < 0.005`, or an exact snapping convention.
4. **Other Commander answers:** only 7/25/35 have authored wrong-answer feedback; other wrong submitted values are silent. **PROPOSED:** supply an exact fallback such as “Multiply matching components and add.” or explicitly accept silence.
5. **Voice:** text-only remains a Pack OPEN proposal. **PROPOSED:** accept the text-only prototype until the Pack passes review. The explicit d01-dot request resolves the proposed chapter id.
6. **Ambiguous Law distractor:** “Because the components cancel” could mean the component products sum to zero, which is the algebraic zero-dot condition. In the supplied counterexample, the products −9 and 12 do not cancel and the dot product is 3. **PROPOSED:** make B explicitly “Because the first components add to zero.” and explain that the first components of (3,4) and (−3,3) sum to zero while their dot product is 3. This preserves the intended false distractor; author wording must be added to a new Pack version.

These proposals were not inserted into learner content or pipeline files. Please resolve them through author acceptance/new Pack content before treating the explanation as approved.

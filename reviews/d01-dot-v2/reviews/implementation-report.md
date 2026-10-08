> Historical implementation and fix record. Earlier commit/status/coverage statements below describe their own round. The final [build report](../REPORT.md) and [scoped re-review](final-fix-review.md) supersede them. Author decisions remain pending.

# Task 1 implementation report — d01-dot Pack v2

Status: DONE_WITH_CONCERNS. Fix round 1 below supersedes the earlier storage/error-handling descriptions. Current commit: `e491746c9d3accd49991055f94bf584de05af128`. Implementation commits: `4a4d942` and final `b44288df231c300322940cb37c8274885b3429b4`.

## Intended outcome and scope

Implement the v2 element lifecycles and four-group attention budget, keep every authored content string and mathematical rule unchanged, retain the existing 200-case Python build, and scope all shared behavior to CH1–CH3 for d01-dot. The primary owns final browser evidence, all six contract checks, AT7–AT9, and whole-branch review. This report does not claim browser acceptance or author acceptance.

Read `.superpowers/sdd/d01-v2-plan/task-1-brief.md`, `pipeline/EXECUTION_CONTRACT.md` v1.1, `pipeline/packs/d01-dot-v2.md`, and chapter `AGENTS.md`. Its former v1 report path was absent; the primary supplied the current content concern list and instructed updating the chapter instructions to the v2 report path.

## Source paths committed

Chapter source: `site/src/game/content/chapters/d01-dot/{AGENTS.md,briefing.ts,build.ts,copy.ts,index.ts,instrument.ts,lifecycle.ts,logic.ts,plumbing.ts,puzzles.ts,staging.ts,style.css}`. These include the previously uncommitted v1 implementation, brought forward under v2.

Unit path: `tests/unit/game-d01-dot.test.ts`.

Licensed shared renderer paths: `site/src/game/game/{app.ts,hud.ts,runner.ts}` and `site/src/game/ui/{beat-chrome.ts,ui.ts}`.

No pipeline, registry, debug, shared test harness, other chapter, screenshots, or review artifacts committed.

## Exact validation

Command: `npx tsc --noEmit -p tsconfig.json`
Exit: 0. Output: empty.

Command: `node --experimental-strip-types --test tests/unit/game-d01-dot.test.ts`
Exit: 0. Verbatim output:

```text
✔ p1 holds each band for a full second, in either order (2.717166ms)
✔ p1 leaving a band resets its timer; negative readings bark without winning (0.089417ms)
✔ sensor radius stays 3 with the authored angular steps; bands include their tolerance boundaries (1.187958ms)
✔ p2 accepts 15 within ±0.01, rejects the three specified misconceptions (0.101958ms)
✔ doubt: non-zero perpendicular arrows refute the claim; a zero arrow satisfies it (0.060666ms)
✔ law: target survives 500 seeded cases; every near-miss breaks (2.200208ms)
✔ build: 200 integer pairs in the authored range; reference passes and decoy fails with the authored format (0.427791ms)
✔ prediction dismissal survives Reset-style remounts; a goal only reopens on a deliberate toggle (0.104334ms)
✔ only the licensed d01 interactive beats receive compact chrome (0.068917ms)
✔ a new transient replaces the old one; its old timeout cannot remove the replacement (2.3175ms)
✔ Continue needs 200 passing cases and finite adopted output; editing invalidates a pending adoption (0.114375ms)
✔ the saved player function supplies the instrument; stale results and teardown cannot overwrite it (3.093708ms)
ℹ tests 12
ℹ suites 0
ℹ pass 12
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 188.606334
```

Command: `node tools/checks/provenance.mjs d01-dot`
Exit: 0. Output: empty. The checker chooses the highest numbered Pack and passed against v2; source attribution now names v2.

Command: `git diff --cached --check`
Exit: 0. Output: empty.

Earlier repaired checks: the first new unit run rejected a TypeScript constructor parameter property under Node's strip-only mode; replaced it with an explicit field. The first provenance run mistook a local variable named `claim`'s DOM selector `.doubt-claim` for authored prose; renamed the variable without changing the selector or content. Final checks above were rerun after the repairs.

## Whole-output review findings and repairs

- Visual hiding alone did not prevent the inherited document-level Enter/Space Continue handler: build now intercepts advance before successful adoption, and hides/disables Continue. Inputs retain their ordinary editor key handling.
- Shared button callbacks stop bubbling. Build edit/Start over invalidation now uses capture listeners so a previous passing result cannot unlock edited code.
- An async readout result could arrive after another drag or teardown. ReadingChannel keeps request epochs and ignores stale output; unchanged frames do not continually call Python.
- A Reset remount could recreate prediction UI. The actual session lifecycle store is keyed by UI and puzzle id, and dismissal survives remounts. A later beat entry starts its goal full while preserving the prediction's session dismissal.
- The v1 mobile p1 camera clipped the negative sensor endpoint. The full authored sweep now uses mobile center [0.5, 1], height 22, per the primary's concrete finding.
- The inherited hamburger menu had no Log or Case board access. CH1 now adds those existing actions to that menu only under the licensed d01 interactive scope.
- Solved puzzle states keep the win card as their single transient. It replaces the prediction/bark/feedback instead of adding another group, and renders on phone as well as desktop.
- Build success no longer appends a count or readout table to the left brief. The same status line is replaced; the instrument reading is a separate top-right group.

- Primary's actual `mobile-p1-after-drag.png` exposed an inline `display:flex` title row surviving CSS-only collapse. Inspected that image, then repaired the goal renderer to set native `hidden` on every non-toggle child.
- The same image showed the sensor/beam labels colliding at maximum alignment. Beam label is now below its endpoint; the sensor label follows a perpendicular offset. Reviewed the local 0/90/180/270-degree label positions against the mobile camera extent: sensor label remains inside the sweep frame; the negative label separates vertically from the shadow label. Primary owns refreshed visual confirmation.
- Repeated move events inside one drag could prematurely dismiss a bark. Dismissal now occurs once at each actual drag gesture, rather than every pointer move. Clearing an empty p2 numeric input also removes its old feedback transient rather than leaving an empty padded card.

## DECISIONS

- T1: `compactBeatChrome(chapter, beat)` is the sole shared scope predicate; only d01 puzzle/doubt/law/procedure/build receive the policies.
- CH1: `Hud.setBeatChrome` groups the existing hamburger with the bottom-right action row, leaving one navigation/action group rather than adding a fifth group. Existing nav buttons hide within that scope. `app.ts` retains Log and Case board access from the folded menu.
- CH2: the existing chapter banner element is detached during the licensed interactive beats, and reinserted on full-chrome beats or abort.
- CH3: UI owns one `TransientSlot` only under the scoped policy. A new transient dismisses its predecessor; old timer callbacks cannot remove a replacement. Beat teardown clears it. Existing non-d01 toast/bark behavior stays unchanged.
- T1: a per-beat `game:beat-chrome` event replaces the v1 document-wide title-detecting MutationObserver. Local bounded observers watch only the current UI scene/HUD for build and Briefing renderers, and disconnect on the next beat/abort. Build and Briefing lack local content/lifecycle hooks; modifying their shared engines would exceed CH1–CH3.
- T1: chapter-local BuildGate requires 200 passing result rows from this run and a finite value returned by the saved source before enabling Continue; old save flags do not unlock it. Editing, mode selection, Start over and subsequent runs invalidate it.
- T1: playerReading invokes `callPython(savedSource, 'dot', args)` directly, with no reference fallback. After successful build it supplies the separate instrument. Subsequent p1/doubt instruments call the same saved source whenever their input pair changes.
- T1: seeded chapter-local tests remain exactly 200 integer pairs in [-9, 9]; no shared difficulty-dependent swarm is added. The existing Assemble/Fill/Write editors and original mismatch template remain intact.
- T1: goal state persists across Reset, while a new beat starts with a full goal. Prediction is dismissed for the browser UI session by Enter submission, first actual handle movement, replacement, or teardown; Reset cannot recreate it.
- T2 (c01-vectors/c00-prologue): keep the existing grid, VectorHandle/Arrow, glass cards, controls, 700 ms Show me motion, authored 1 s hold, and shared win styling. Keep the scene's camera-fit pattern and explicit mobile fit; numeric display remains authored 2 dp.
- T2 (c01-vectors shared numeric/editor convention): prediction submission uses Enter in its numeric field, avoiding an unauthored extra button label. P2 retains its existing immediate numeric attempt behavior and exact 7/25/35 feedback; the authored goal collapses on that first attempt.
- T2 (c01-vectors Briefing): existing doubt/law actions are moved into the same action group. The doubt claim is retained inside the expandable goal; the existing verdict is the transient. The law statement/reason stay within one law interaction panel with its actions in the shared row.
- T2 (c01-vectors local Label/Arrow positioning convention): offset the beam label below its endpoint and the rotating sensor label perpendicular to its direction; mobile uses extra separation because the full sweep must fit the narrow viewport. This is chapter-local label placement, with no new content.
- T1: no procedure content is invented because the Pack explicitly has no procedure decision/beat. The licensed shared scope still supports procedure.

## Rendered selectors and acceptance APIs

- Active chapter: `.ui-root[data-d01-active]`; licensed beat kind: `.ui-root[data-d01-interactive="puzzle|doubt|law|procedure|build"]`.
- One combined navigation/action group: `.d01-actions[data-attention="actions"]`. Its `.hud-tr` shows only `[data-chrome-menu]`; `.hud-chapter` is absent in interactive beats.
- Goal: `.objective[data-expanded="false"]` shows only `.d01-goal-toggle` with `aria-expanded=false`; clicking toggles it. Full starts with true. Objective stars are suppressed; the win transient supplies the win-moment stars.
- P1 prompt: `.d01-prediction`, input `aria-label` is the exact authored prompt, Enter submits. `runtime.setSensor(degrees)` preserved and intentionally does not pretend to be a real pointer drag. `runtime.telemetry()` includes `predictionVisible`, `goalExpanded`, sensor and band/reading state. Actual UI pointer drags call staging from the VectorHandle onChange when DragManager reports dragging.
- P2: `runtime.submit(value)` preserved, `.d01-answer` for Commander; existing ChoiceCards for Cadet/Navigator. `.d01-feedback` is the authored feedback transient. Win solution stays in the top-right readout.
- Build: `.build[data-ready="false|true"]`; `.build-left` visibly contains only h2, `.build-brief`, `.build-status`. `.test-results` remains hidden in that panel for the unchanged renderer/test result contract. `.build-status` itself receives the exact mismatch or success text.
- Build Continue is `.hud-br .primary`, hidden+disabled until ready, with capture-phase keyboard protection. All editor/build controls sit with `.d01-actions`.
- Adopted instrument: `.d01-player-reading[data-source="player"]`, a single `reading` row outside `.build-left`. No v1 beam/sensor table remains.
- `data-attention` labels identify intended groups, but browser acceptance must inspect actual visible cards/panels and layout, not trust labels alone.

## Readout verification

Unit coverage executes the real ReadingChannel with an injected saved-source executor, confirms that source and input pairs reach the executor, displays a deliberately distinguishable return value, rejects an older response after a newer one, and rejects a late response after teardown. Source inspection confirms production uses direct `callPython` on `S().code.dot` after all 200 results and uses `libSource` only when `isPlayerFn('dot')` is true for subsequent chapter instruments.

Primary browser acceptance should run real Python in all three modes, inspect 200 result rows, compare the exact wrong-code string, confirm `data-ready` and Continue gating, and verify the separate readout against the saved source. A discriminating supplementary test can use a function correct on integer swarm inputs but distinct on a non-integer p1 heading, then restore correct source; all production reads are direct source calls. No test-only production behavior was added.

## Screenshot paths and deferred validation

No browser session was opened by this implementer. Inspected the primary's `reviews/d01-dot-v2/screenshots/mobile-p1-after-drag.png` and repaired its two observed defects; refreshed captures remain primary-owned. The primary owns captures at 1440x900 and 390x844, screenshot narration, the six contract commands, and AT7–AT9. Existing normal solve/wording commands exclude developer chapters; this implementation does not modify their registry or harness to mask zero coverage. Their outputs must accompany actual developer-chapter supplements in the primary report.

## STOP / author concerns (unchanged content; proposals are not accepted)

1. Negative p1 reading is -12 while geometric shadow length is +3, but means/compare call the reading beam length times shadow length. PROPOSED: author specifies “signed shadow length” and its readout convention.
2. Naming/page say zero means a right angle unconditionally, while law permits a zero vector with undefined angle. PROPOSED: author adds an explicit non-zero qualification.
3. Doubt uses exact zero with free Commander dragging; a reading rounded to 0.00 can still fail. PROPOSED: author specifies a numerical tolerance; do not invent one locally.
4. Commander p2 only specifies feedback for 7/25/35; other wrong inputs remain silent. PROPOSED: author supplies a fallback or explicitly accepts silence.
5. Text-only voice proposal remains OPEN. PROPOSED: accept text-only prototype until the Pack is reviewed. The explicit d01-dot request resolves the proposed chapter id.

## Remaining implementation risks

- Build/Briefing compatibility depends on their existing DOM classes and result format because chapter-local bounded adaptation is required by the limited license. Browser acceptance remains essential.
- Player source errors on inputs beyond its successful integer suite hide the readout instead of silently claiming reference output is player output. No new error prose is invented.
- This task has no screenshot sign-off; final visual/lifecycle acceptance is deliberately left to the assigned primary review.


## Fix round 1 — Important findings 1–4, Minor finding, and primary visual findings

Commit: `1dfbc99389270025c93bec9bc5a2440cccb06a5c`.

Read the complete `.superpowers/sdd/d01-v2-plan/task-1-review.md`. Repaired all four Important findings within chapter-local source/unit paths. This round edits no shared files and changes no authored source, feedback or mathematical rule.

1. **Late adoption rejection:** BuildGate now has an explicit lifetime and epoch-aware rejection. The production rejection branch checks the same alive/connected/source ownership as success and only renders when the current epoch is rejected. Gate rendering retains the originating Continue element rather than looking up a later beat's primary. Cleanup disposes the gate without rendering into later UI. A deferred-rejection regression covers both a newer successful run and post-teardown rejection.
2. **Readout rejection/recovery:** ReadingChannel delivers both successes and errors through the same epoch/lifetime guard. P1/doubt current successes explicitly restore readout visibility. The regression exercises older failure after newer success, a current noninteger-input failure, recovery on a later successful input, and failure after disposal. It confirms no stale error notification reaches the view.
3. **Start over status:** Every current build reconciliation restores `COPY.build.tests` if the shared renderer has cleared the status node. It leaves running/error/mismatch/success text untouched. A focused test reproduces the shared handler's `status.textContent = ''` mutation and checks one restored authored line; primary owns the actual shared-button browser path.
4. **Story-library isolation:** Added `storage.ts`. d01 source, suite pass, accepted instrument source, and editor draft now live under `S().flags['d01-dot-build']` as `source`, `passed`, `adoptedSource`, `draft`. Instruments only read `adoptedSource`; they no longer call global `libSource`/`isPlayerFn`. The authored two-component function and `fn: 'dot'` remain verbatim.

### Storage adapter decision and teardown review

The unchanged shared build renderer expects global `code.dot`, `buildPassing.dot`, and `buildDraft.dot`. A bounded record adapter supplies the chapter's local saved values only while that renderer mounts. Its JSON serialization always emits the original story records; after mount, ordinary library reads also use those story records. A write is captured only when the originating build has new completed result rows, with its immediately following pass assignment paired to the same owner, or during that renderer's explicitly bounded finalizer. Unrelated story writes pass through, including while an aborted Python run is outstanding.

Cleanup removes interaction listeners, disposes UI adoption, and resolves the old shared primary so its key handler/finalizer cannot linger into a later beat. The finalizer's draft write remains isolated through its microtask. If a test run is outstanding, a detached-box observer remains only until that run's status settles; its source/pass writes are captured from its own new result rows. Then the adapter restores the original record identities. It retains changes made by a newer story operation rather than restoring a stale whole snapshot over them. Multiple d01 lifetimes have separate local snapshots; an older aborted result cannot overwrite the newer d01 save.

Tests cover serialization during mount, story reads while the renderer is mounted, pass and fail writes, separate drafts, restoration of record identities, explicit finalizer drafts, late aborted results alongside a newer story save, overlapping d01 lifetimes, and cleanup of originally absent flags after a setup failure. Primary's browser check should seed a known general/3D story dot before opening d01. This fix cannot reconstruct source already overwritten by an earlier build; it does not guess or migrate ownership from that old global value.

### Additional repairs

- **Minor held-band colour:** ReadingChannel caches numerical execution but replays a resolved value to the current presentation callback on unchanged frames. The confirmation colour can now update after a one-second hold without another Python call. A regression uses the actual band timer and confirms one execution with the later confirmed presentation.
- **Win animation:** Chapter-local `d01-win-in` keyframes keep `translateX(-50%)` throughout the inherited entrance animation. Existing duration/easing remain in effect, eliminating the temporary right-edge clipping observed in the primary's mobile solved capture.
- **Feedback surface:** P2's relocated feedback now includes the existing `glass` class, matching the other transient cards.
- **Project guidance:** Added the concrete story-isolation and rejected/late-call requirements to the chapter AGENTS.md, retaining the primary report and screenshot guidance.

### Exact final validation for fix round 1

Command: `npx tsc --noEmit -p tsconfig.json`
Exit: 0. Output: empty.

Command: `node --experimental-strip-types --test tests/unit/game-d01-dot.test.ts`
Exit: 0. Verbatim output:

```text
✔ p1 holds each band for a full second, in either order (7.983166ms)
✔ p1 leaving a band resets its timer; negative readings bark without winning (0.38825ms)
✔ sensor radius stays 3 with the authored angular steps; bands include their tolerance boundaries (6.812958ms)
✔ p2 accepts 15 within ±0.01, rejects the three specified misconceptions (7.813875ms)
✔ doubt: non-zero perpendicular arrows refute the claim; a zero arrow satisfies it (14.732667ms)
✔ law: target survives 500 seeded cases; every near-miss breaks (7.754917ms)
✔ build: 200 integer pairs in the authored range; reference passes and decoy fails with the authored format (2.224333ms)
✔ prediction dismissal survives Reset-style remounts; a goal only reopens on a deliberate toggle (0.61925ms)
✔ only the licensed d01 interactive beats receive compact chrome (0.607292ms)
✔ a new transient replaces the old one; its old timeout cannot remove the replacement (3.079834ms)
✔ Continue needs 200 passing cases and finite adopted output; editing invalidates a pending adoption (1.067416ms)
✔ the saved player function supplies the instrument; stale results and teardown cannot overwrite it (2.395375ms)
✔ an old adoption rejection cannot invalidate a newer pass or touch a later beat (0.426875ms)
✔ instrument rejection obeys epochs, recovers after a current failure, and is inert after teardown (0.916666ms)
✔ holding a heading refreshes confirmation presentation without executing Python again (0.348959ms)
✔ Start over status clearing restores one authored tests line without replacing a result (0.569834ms)
✔ d01 mounting, passing, failing and serializing never replace story source/flags/drafts (6.328917ms)
✔ an aborted renderer isolates late writes while preserving a newer story save (10.329084ms)
✔ overlapping build lifetimes route each result to its owner and restore absent flags on setup failure (1.734791ms)
ℹ tests 19
ℹ suites 0
ℹ pass 19
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 724.674292
```

Command: `node tools/checks/provenance.mjs d01-dot`
Exit: 0. Output: empty (highest-version v2).

Command: `git diff --cached --check`
Exit: 0. Output: empty.

During implementation, the earlier 12-test suite initially failed only because the old display-count assertion assumed unchanged frames never refresh presentation. Updated that expectation to reflect the intentional cached presentation refresh, then added seven regressions; final 19-test output above is from the final implementation.

### Review boundaries and remaining concerns

Reread the actual final source diff plus the new storage adapter, challenged teardown/ownership paths, and repaired an additional overlap case so old local snapshots cannot overwrite a newer chapter save. No browser was launched by this implementer. The primary's actual Start over, all acceptance checks, real Python 200-case runs, and real 3D-library isolation checks remain required. The five author/content STOP items above remain unchanged and unaccepted.


## Fix round 2 — phone law drawing and transient placement

Commit: `e491746c9d3accd49991055f94bf584de05af128`.

Inspected the primary's normal-render capture `reviews/d01-dot-v2/screenshots/mobile-law-human-render-review.png`. The law panel spans approximately y68–507, hiding the case centered around y338; the toast spans approximately y18–90 and overlaps the panel's top edge.

Changed exactly two chapter-local placement rules:

- `briefing.ts`: phone law camera center `[0, -5.5]` → `[0, 13.5]`, retaining height 55 and the desktop center `[-5, 0]`, height 14.
- `style.css`: only phone `[data-d01-interactive=law] .toasts` uses `top:auto; bottom:75px; left:12px; right:12px; transform:none`, moving the existing transient into the lower free space and giving it the available width. Ordinary desktop toast placement is untouched.

DECISIONS: T2 chapter-local placement using the existing law framing and shared toast surface, adjusted from concrete primary screenshot evidence. No content, shared renderer, test harness, or gameplay logic changes.

Self-reviewed the complete two-line diff and the viewport geometry. At 390×844, scale is 844/55 pixels per world unit. The origin is at y629.16; every authored ±4 endpoint is within y567.78–690.55 and x133.62–256.38. The panel's maximum bottom is y506.88, leaving about 61 pixels before the highest case endpoint. The toast container bottom is y769, above the action row (bottom y832); its wider 366-pixel space reduces the old narrow wrapping. Final actual toast height and normal-render overlap checks remain with primary's screenshot review.

Geometry command:

```sh
node --input-type=module -e 'const width=390,height=844,scale=height/55; console.log(JSON.stringify({viewport:[width,height],origin:[width/2,height/2+13.5*scale],caseX:[width/2-4*scale,width/2+4*scale],caseY:[height/2+(13.5-4)*scale,height/2+(13.5+4)*scale],panelBottom:68+.52*height,toastBottom:height-75,actionsBottom:height-12}));'
```

Exit: 0. Exact output:

```text
{"viewport":[390,844],"origin":[195,629.1636363636363],"caseX":[133.61818181818182,256.3818181818182],"caseY":[567.7818181818182,690.5454545454545],"panelBottom":506.88,"toastBottom":769,"actionsBottom":832}
```

Command: `npx tsc --noEmit -p tsconfig.json`
Exit: 0. Output: empty.

Command: `node tools/checks/provenance.mjs d01-dot`
Exit: 0. Output: empty.

Command: `git diff --cached --check`
Exit: 0. Output: empty.

As requested, no repeated broad unit suite for this placement-only change. No browser launched by this implementer; primary owns refreshed normal-render law captures at both widths and final artifact review.


## Fix round 3 — Commander numeric answer confirmation

Commit: `c65dd76f6754085643fe5e9f245c05cf4fee891e`.

Primary's real character-by-character input exposed a completion bug: typing `15.1` triggered the win at the intermediate `15`, focused Continue, and prevented the remaining characters from reaching the answer field. The prior immediate numeric submission behavior is superseded by this repair.

The chapter now separates preview from submission. `.d01-answer` input events only collapse the goal and preview the exact existing 7/25/35 feedback. Enter prevents its default action, stops propagation, and submits the current complete field value. Only that submission reaches `p2Won` and can reveal the solution or call `p.win()`. Empty input clears the preview and Enter on an empty field submits nothing. Choice cards, runtime `submit(value)`, Show me, and solve remain explicit committed submissions. No blur/change auto-submission, new learner prose, labels, buttons, tolerance changes, shared edits, or test-only gameplay behavior were added.

Added a unit regression around the actual production `bindNumericAnswer` event binding. It dispatches input events through `1`, `15`, `15.`, `15.1`, proves no prefix submits, confirms Enter submits the current 15.1 and cannot win, exercises 7/25/35 preview/confirmation and empty input, and proves 15 still needs Enter before winning. Chapter instructions now require character-by-character Commander verification.

DECISION: explicit Enter follows the already present numeric confirmation convention and preserves the authored tolerance against completed answers. Runtime submission API and `.d01-answer` selector are unchanged. Re-read the full final diff: all numeric-field winning paths pass through the confirmed callback; input preview has no win/readout side effect. No browser launched by this implementer. Primary retains actual Chromium sequential typing, exact rendered wrong-feedback checks, and acceptance screenshots. The existing five author/content STOP items remain unchanged.

### Exact validation for fix round 3

Command: `npx tsc --noEmit -p tsconfig.json`
Exit: 0. Output: empty.

Command: `node --experimental-strip-types --test tests/unit/game-d01-dot.test.ts`
Exit: 0. Verbatim output:

```text
✔ p1 holds each band for a full second, in either order (0.885208ms)
✔ p1 leaving a band resets its timer; negative readings bark without winning (0.068375ms)
✔ sensor radius stays 3 with the authored angular steps; bands include their tolerance boundaries (0.980334ms)
✔ p2 accepts 15 within ±0.01, rejects the three specified misconceptions (0.170291ms)
✔ doubt: non-zero perpendicular arrows refute the claim; a zero arrow satisfies it (0.204667ms)
✔ law: target survives 500 seeded cases; every near-miss breaks (1.820834ms)
✔ build: 200 integer pairs in the authored range; reference passes and decoy fails with the authored format (0.866375ms)
✔ Commander typing previews complete and partial answers; only Enter submits the current field value (1.109541ms)
✔ prediction dismissal survives Reset-style remounts; a goal only reopens on a deliberate toggle (0.250208ms)
✔ only the licensed d01 interactive beats receive compact chrome (0.232167ms)
✔ a new transient replaces the old one; its old timeout cannot remove the replacement (0.26975ms)
✔ Continue needs 200 passing cases and finite adopted output; editing invalidates a pending adoption (0.181416ms)
✔ the saved player function supplies the instrument; stale results and teardown cannot overwrite it (0.447167ms)
✔ an old adoption rejection cannot invalidate a newer pass or touch a later beat (0.134583ms)
✔ instrument rejection obeys epochs, recovers after a current failure, and is inert after teardown (0.280584ms)
✔ holding a heading refreshes confirmation presentation without executing Python again (0.221792ms)
✔ Start over status clearing restores one authored tests line without replacing a result (0.139834ms)
✔ d01 mounting, passing, failing and serializing never replace story source/flags/drafts (2.038167ms)
✔ an aborted renderer isolates late writes while preserving a newer story save (0.257416ms)
✔ overlapping build lifetimes route each result to its owner and restore absent flags on setup failure (0.240542ms)
ℹ tests 20
ℹ suites 0
ℹ pass 20
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 208.993958
```

Command: `node tools/checks/provenance.mjs d01-dot`
Exit: 0. Output: empty.

Command: `git diff --cached --check`
Exit: 0. Output: empty.


# Final fix wave — build run ownership, invalidated status and ordinary toasts

Commit: `7995b89a3084a6b9880e702abd170d7d1b73f624`.

All three findings in `.superpowers/sdd/d01-v2-plan/final-review.md`'s focused addendum are repaired in chapter-local source. The shared renderer, pipeline, Pack, authored COPY, registry/debug harness and other chapters were unchanged. Updated the chapter AGENTS.md with the concrete slow-run/edit/Start over and ordinary-toast regression requirements.

## Repairs and decisions

**Edited success:** editor/mode invalidation now restores `COPY.build.tests` in the existing single status element while removing current instrument/Continue. A still-running status is preserved. `restoreTestsLine` avoids repeating an identical write, preventing an observer feedback loop. A new failed run retains its authored mismatch rather than being cleared as a stale run. The historical `adoptedSource` remains unchanged until a new owned run passes; editing readiness is distinct from deleting previously accepted source.

**Run ownership:** the unchanged shared builder captures `editor.code()`, synchronously writes Running/Starting Python, then awaits tests. A bounded chapter adapter observes the native `textContent`/`innerHTML` accessors of that one status element. It never changes global prototypes. The synchronous Running write pins a `BuildRun` containing the gate epoch and exact current source, before subsequent input or mode events and even before a same-turn programmatic edit. Write source comes from the current textarea; Fill uses the unchanged renderer's existing `deriveFill`/`composeFill` functions; Assemble reads the generated ordered lines with indentation restored. Completion and asynchronous adoption require that pinned epoch, matching visible source and matching tested source captured by the local storage adapter. A mismatch keeps the tests line, no ready state and no current instrument.

Explicit run tracking also closes the Start over/abort edge: clearing status does not finish an outstanding Python run. The status and storage adapters remain bound to the old actual builder until its result/error settles, then restore the original property ownership and record identities. Fresh runs establish fresh tokens and recover. Completion source comparison also catches programmatic editor changes which do not dispatch input. This adapter intentionally depends on the unchanged builder's documented-in-source status-write ordering; it stays entirely within the licensed local scope instead of adding shared lifecycle APIs.

**Ordinary interactive toasts:** chapter-local non-Law interactive `.toasts` now sits 100px above the desktop bottom; phones use left/right 12px and bottom 140px. The existing Law-specific phone position remains unchanged at bottom 75px and desktop Law styling is untouched. This separates ordinary UI.toast cards from the full top-left goal, top-right readout and bottom actions. The replacement probe remains labelled as a probe; it is not presented as the normal negative-reading bark.

## Focused checks and actual browser evidence

Used the Playwright skill's guarded CLI with separate headless session `d01-finalfix`. The primary's `d01-review` session was untouched. The owned session was closed after verification (`Browser 'd01-finalfix' closed`). Browser fixture scripts and raw outputs are in the ignored scratch directory as `task-1-finalfix-browser.js/.txt` and `task-1-finalfix-browser-extra.js/.txt`; primary owns repository evidence copies and refreshed final captures.

The real renderer fixture used this deliberately slow but correct Python source, executing all 200 authored cases:

```python
import time
def dot(v, w):
    time.sleep(0.006)
    return v[0]*w[0] + v[1]*w[1]
```

For each edit, mode change, Start over and same-turn edit, it asserted the change happened before the pending Promise settled, then awaited the real run and asserted exactly 200 `.test.ok`, zero `.test.fail`, and the shared renderer's `passed()` value was true. Despite that old passing result, the chapter remained `data-ready=false`, showed the authored tests line, exposed neither current readout nor Continue, preserved prior adopted source, and preserved the story source. A fresh correct run recovered after each case. The ordinary edit fixture initially used the decoy return line alone; the strengthened second fixture used the complete function with the authored decoy body, and its same-turn edit likewise used a complete function. This distinction is visible in the exact observations below.

Additional actual checks: all three build modes still pass/adopt through the source snapshot adapter; a fresh wrong run retains the exact authored mismatch; Start over during a slow run followed by leaving for c01 releases both per-element status accessors after settlement and preserves the existing 3D story dot result of 1.

Inspected the actual PNGs produced in `output/playwright/`: `finalfix-build-edited.png` shows the tests line with no success/readout/Continue; strengthened `finalfix-build-stale-run.png` shows the complete wrong function with the same unready controls after the old 200/200 run; `finalfix-mobile-toast.png` shows a single probe card below the arrows, clear of full goal/readout/actions. Shared these progress images in commentary. At 390×844 the measured toast is x12–378/y631–704, the goal ends y177.375, the readout ends y56 and the action row begins y802. This supports separation of these surfaces; primary retains final both-width acceptance review. Primary preserved the rejected before-fix edited-success and toast-overlap frames before overwriting final evidence.

The first browser invocation used unsupported raw IIFE CLI syntax and was corrected to the documented function form. The next setup waited for Write while the fresh browser's actual difficulty was Navigator (the URL fixture parameter did not set saved difficulty); explicitly setting Commander in the isolated fixture resolved that setup error. No gameplay source change was made for either harness setup issue. Final browser assertions below all completed successfully.

## Exact covering validation

Command: `npx tsc --noEmit -p tsconfig.json`
Exit: 0. Output: empty.

Command: `node --experimental-strip-types --test tests/unit/game-d01-dot.test.ts`
Exit: 0. Verbatim output:

```text
✔ p1 holds each band for a full second, in either order (0.551292ms)
✔ p1 leaving a band resets its timer; negative readings bark without winning (0.075125ms)
✔ sensor radius stays 3 with the authored angular steps; bands include their tolerance boundaries (0.971916ms)
✔ p2 accepts 15 within ±0.01, rejects the three specified misconceptions (0.116833ms)
✔ doubt: non-zero perpendicular arrows refute the claim; a zero arrow satisfies it (0.072625ms)
✔ law: target survives 500 seeded cases; every near-miss breaks (2.714792ms)
✔ build: 200 integer pairs in the authored range; reference passes and decoy fails with the authored format (0.486875ms)
✔ Commander typing previews complete and partial answers; only Enter submits the current field value (1.021167ms)
✔ prediction dismissal survives Reset-style remounts; a goal only reopens on a deliberate toggle (0.13875ms)
✔ only the licensed d01 interactive beats receive compact chrome (0.108208ms)
✔ a new transient replaces the old one; its old timeout cannot remove the replacement (0.117833ms)
✔ Continue needs 200 passing cases and finite adopted output; editing invalidates a pending adoption (0.719791ms)
✔ the saved player function supplies the instrument; stale results and teardown cannot overwrite it (0.262041ms)
✔ an old adoption rejection cannot invalidate a newer pass or touch a later beat (0.167125ms)
✔ instrument rejection obeys epochs, recovers after a current failure, and is inert after teardown (0.135875ms)
✔ holding a heading refreshes confirmation presentation without executing Python again (0.0825ms)
✔ Start over status clearing restores one authored tests line without replacing a result (0.062083ms)
✔ edited success resets to one tests line without causing an observer mutation loop (0.046083ms)
✔ run ownership starts at synchronous status write, rejects edits during testing, and recovers on a fresh run (0.328834ms)
✔ d01 mounting, passing, failing and serializing never replace story source/flags/drafts (0.578ms)
✔ an aborted renderer isolates late writes while preserving a newer story save (0.078083ms)
✔ overlapping build lifetimes route each result to its owner and restore absent flags on setup failure (0.099333ms)
ℹ tests 22
ℹ suites 0
ℹ pass 22
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 259.389875
```

Command: `node tools/checks/provenance.mjs d01-dot`
Exit: 0. Output: empty.

Command: `git diff --cached --check`
Exit: 0. Output: empty.

Browser commands used `/Users/christopherdasca/.codex/skills/playwright/scripts/playwright_cli.sh --session d01-finalfix run-code` with the saved fixture functions above. Both final fixture commands exited 0. Exact first fixture result:

```json
[{"label":"initial confirmed pass","ready":"true","status":"Sensor firmware updated. The readout now runs on\n  your dot.","instrument":true,"continueVisible":true,"story":true,"source":"def dot(v, w):\n    return v[0]*w[0] + v[1]*w[1]"},{"label":"editing a previous pass restores tests","ready":"false","status":"200 random integer pairs","instrument":false,"continueVisible":false,"story":true,"source":"    return sum(a + b for a, b in zip(v, w))"},{"label":"fresh run after editing","ready":"true","status":"Sensor firmware updated. The readout now runs on\n  your dot.","instrument":true,"continueVisible":true,"story":true,"source":"def dot(v, w):\n    return v[0]*w[0] + v[1]*w[1]"},{"label":"mode change after pass restores tests","ready":"false","status":"200 random integer pairs","instrument":false,"continueVisible":false,"story":true},{"label":"old passing run rejected after edit","ready":"false","status":"200 random integer pairs","instrument":false,"continueVisible":false,"story":true,"source":"    return sum(a + b for a, b in zip(v, w))"},{"label":"fresh recovery after edit","ready":"true","status":"Sensor firmware updated. The readout now runs on\n  your dot.","instrument":true,"continueVisible":true,"story":true,"source":"def dot(v, w):\n    return v[0]*w[0] + v[1]*w[1]"},{"label":"old passing run rejected after mode","ready":"false","status":"200 random integer pairs","instrument":false,"continueVisible":false,"story":true},{"label":"fresh recovery after mode","ready":"true","status":"Sensor firmware updated. The readout now runs on\n  your dot.","instrument":true,"continueVisible":true,"story":true,"source":"def dot(v, w):\n    return v[0]*w[0] + v[1]*w[1]"},{"label":"old passing run rejected after start over","ready":"false","status":"200 random integer pairs","instrument":false,"continueVisible":false,"story":true,"source":"def dot(v, w):\n"},{"label":"fresh recovery after start over","ready":"true","status":"Sensor firmware updated. The readout now runs on\n  your dot.","instrument":true,"continueVisible":true,"story":true,"source":"def dot(v, w):\n    return v[0]*w[0] + v[1]*w[1]"},{"label":"old passing run rejected after same-turn edit","ready":"false","status":"200 random integer pairs","instrument":false,"continueVisible":false,"story":true,"source":"def dot(v, w):\n    return sum(a + b for a, b in zip(v, w))"},{"label":"fresh recovery after same-turn edit","ready":"true","status":"Sensor firmware updated. The readout now runs on\n  your dot.","instrument":true,"continueVisible":true,"story":true,"source":"def dot(v, w):\n    return v[0]*w[0] + v[1]*w[1]"},{"label":"source ownership accepts assemble","ready":"true","status":"Sensor firmware updated. The readout now runs on\n  your dot.","instrument":true,"continueVisible":true,"story":true},{"label":"source ownership accepts fill","ready":"true","status":"Sensor firmware updated. The readout now runs on\n  your dot.","instrument":true,"continueVisible":true,"story":true},{"label":"source ownership accepts write","ready":"true","status":"Sensor firmware updated. The readout now runs on\n  your dot.","instrument":true,"continueVisible":true,"story":true,"source":"def dot(v, w):\n    return v[0]*w[0] + v[1]*w[1]\n"},{"label":"mobile ordinary replacement toast avoids goal/readout/actions","toast":{"x":12,"y":630.998291015625,"width":366,"height":73},"goal":{"x":12,"y":12,"width":226,"height":165.375},"readout":{"x":242,"y":12,"width":136,"height":44},"actions":{"x":107.65625,"y":802,"width":270.34375,"height":30},"count":1}]
```

Exact strengthened pending-run and late-cleanup fixture result:

```json
[{"change":"edit","wasPending":true,"ok":200,"fail":0,"sharedPassed":true,"ready":"false","status":"200 random integer pairs","readout":false,"continueVisible":false,"source":"import time\ndef dot(v, w):\n    time.sleep(0.006)\n    return v[0]*w[0] + v[1]*w[1]\n","adopted":"def dot(v, w):\n    return v[0]*w[0] + v[1]*w[1]\n","story":true},{"change":"mode","wasPending":true,"ok":200,"fail":0,"sharedPassed":true,"ready":"false","status":"200 random integer pairs","readout":false,"continueVisible":false,"source":"import time\ndef dot(v, w):\n    time.sleep(0.006)\n    return v[0]*w[0] + v[1]*w[1]\n","adopted":"def dot(v, w):\n    return v[0]*w[0] + v[1]*w[1]","story":true},{"change":"start over","wasPending":true,"ok":200,"fail":0,"sharedPassed":true,"ready":"false","status":"200 random integer pairs","readout":false,"continueVisible":false,"source":"import time\ndef dot(v, w):\n    time.sleep(0.006)\n    return v[0]*w[0] + v[1]*w[1]\n","adopted":"def dot(v, w):\n    return v[0]*w[0] + v[1]*w[1]","story":true},{"change":"same-turn edit","wasPending":true,"ok":200,"fail":0,"sharedPassed":true,"ready":"false","status":"200 random integer pairs","readout":false,"continueVisible":false,"source":"import time\ndef dot(v, w):\n    time.sleep(0.006)\n    return v[0]*w[0] + v[1]*w[1]\n","adopted":"def dot(v, w):\n    return v[0]*w[0] + v[1]*w[1]","story":true},{"check":"fresh failure feedback preserved","mismatch":"Checked against 200 random pairs. First mismatch:\n  dot([6,-4], [-5,-1]) should be -26; your function returned -4."},{"check":"cleared running status and abort retain isolation until settlement","chapter":"c01","accessorReleased":true,"story":true,"dot3D":1}]
```

## Whole-fix review and remaining boundary

Reread the complete final delta after validation. Challenged whether a status-only race fixture could falsely label an errored run as a passing run; strengthened it to verify the actual 200/200 rows, shared passed flag and exact slow tested source, plus unchanged historical adoption. Challenged Start over clearing status while a run remains outstanding; explicit tracking and the actual leave-before-settlement fixture cover this. Challenged repeated status restoration causing observer recursion; the helper guards identical writes and the focused unit proves one mutation. Verified fresh failure feedback and Assemble/Fill source reconstruction through the actual shared renderer. The final source touches only chapter lifecycle/plumbing/style/instructions and the existing unit file.

No new authored text or author decision was invented. Existing author/content STOP items remain unchanged and unaccepted. The primary's final six prescribed checks, refreshed affected captures, whole-artifact reconciliation and Chris/author acceptance are separate from this implementer's covering validation.

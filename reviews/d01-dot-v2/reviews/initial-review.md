# Task 1 review — d01-dot v2

### Spec Compliance

- ❌ Issues found: the developer build replaces the global story `dot` source; stale build-adoption failure can alter a later beat's Continue; instrument errors can permanently hide the required readout; Start over removes the required tests/status line. See Important findings below.
- ✅ Scope in the diff is limited to the chapter, its unit test, and the licensed CH1–CH3 renderer paths. No pipeline changes appear. The shared predicate is explicitly restricted to d01 interactive beats (`site/src/game/ui/beat-chrome.ts:2`).
- ⚠️ Cannot verify from this diff: actual four-group layouts and exits at 1440×900 / 390×844, real pointer drag and Reset acceptance, real Python execution of all 200 cases in each editor mode, highest-version provenance, and whole-branch regressions. Primary owns these checks and screenshot narration. Reported passing commands were not repeated.

### Strengths

- Scoped presentation policy is centralized; the hamburger shares the action group and the chapter banner is detached/restored (`site/src/game/game/hud.ts:42`).
- Transient replacement owns its dismissal, so an old timeout cannot remove its successor (`site/src/game/ui/beat-chrome.ts:9`; `tests/unit/game-d01-dot.test.ts:113`).
- BuildGate checks this run's epoch, exactly 200 passing rows, and finite adopted output. The production executor directly calls the saved Python source rather than falling back to reference output (`site/src/game/content/chapters/d01-dot/lifecycle.ts:32`; `instrument.ts:6`).
- Bounded observers and capture listeners have explicit removal at the next beat/abort (`site/src/game/content/chapters/d01-dot/plumbing.ts:125`, `plumbing.ts:174`). Prediction state is keyed by the UI session and the goal renderer hides every non-toggle child (`lifecycle.ts:17`; `staging.ts:18`).

### Issues

#### Critical (Must Fix)

- None found.

#### Important (Should Fix)

1. **An old rejected build adoption can hide another beat's Continue.** `site/src/game/content/chapters/d01-dot/plumbing.ts:119` calls `invalidate()` for every rejection, although the success branch checks `alive`, connectedness, source and epoch at line 110. After teardown, `invalidate()` still calls `renderGate()`, which queries the current UI's `.hud-br .primary` at lines 42–51. A pending rejection can therefore hide/disable a later beat's button; within the same build it can also invalidate a newer run. Gate rejection handling on the captured run epoch and lifetime before changing state, and keep old cleanup from targeting a newer button. Add a focused late-rejection test.

2. **Instrument failures bypass the stale-result guard and never recover visibility.** `site/src/game/content/chapters/d01-dot/lifecycle.ts:49` only guards successful values at line 50; rejected older requests still reach `puzzles.ts:56` / `briefing.ts:28`, which hide the entire readout. A valid newer reading can disappear when an older request rejects. Even a current failure is permanent: later successful callbacks at `puzzles.ts:53` / `briefing.ts:25` do not restore `hidden = false`. A player function that passes the integer suite but errors on a non-integer heading exposes this through normal interaction. Deliver errors through the same epoch/lifetime guard as values, restore visibility on a successful current value, and test rejection/recovery as well as successful stale results. The focused probe below reproduced the stale-rejection case.

3. **Start over leaves the restricted panel without its tests line.** `site/src/game/content/chapters/d01-dot/plumbing.ts:79` supplies `COPY.build.tests` only during the initial mount. The unchanged Start over handler clears the same `.build-status` (`site/src/game/game/build.ts:477`), but subsequent reconciliation skips the mount block. The panel then has title and brief with an empty status until another run. Restore the authored tests line when the reset clears status; verify the real Start over path rather than only BuildGate state.

4. **The developer's two-component implementation replaces the story's general dot function.** `site/src/game/content/chapters/d01-dot/build.ts:8` uses the global `fn: 'dot'`; successful runs therefore save its authored two-component source (`copy.ts:156`) to `S().code.dot` and the global passing flag through unchanged `site/src/game/game/build.ts:440`. `dev: true` only preserves the registered reference definition (`game/build.ts:23`); `libSource` still selects the saved passing source globally (`game/build.ts:38`), including Python libraries and build dependencies (`game/build.ts:76`, `game/build.ts:181`). The story's c04 implementation supports arbitrary vector length (`site/src/game/content/chapters/c04-dot/build.ts:10`), its Navigator/Commander swarm uses 3D inputs (line 22), and its correct `length` implementation depends on `dot([2,3,6], [2,3,6])` to return 49 (lines 33, 38–41). The d01 source returns 13, so that correct story build produces √13 rather than 7; `dot([0,0,1], [0,0,1])` similarly becomes 0 instead of 1. This violates chapter-local adoption and the explicit no-other-chapter-behavior-change requirement. Persist the d01 player source/passing state in chapter-local storage and retain the existing story source/flag; use that local source for d01 instruments. Do not change the authored two-component solution to solve the isolation defect.

#### Minor (Nice to Have)

- `site/src/game/content/chapters/d01-dot/lifecycle.ts:46` deduplicates the entire display callback by source/vector key. The p1 callback also carries the independently changing one-second confirmation colour (`puzzles.ts:54`), so holding an unchanged heading does not refresh that colour when its band becomes confirmed. Separate reading execution deduplication from display state if this confirmation colour is retained.

### Checks and review boundaries

- Reviewed BASE `2913442b7d350000cfa07aaed03e60e2164e6515` → HEAD `b44288df231c300322940cb37c8274885b3429b4` using the supplied diff. Tool output truncated the first full read, so the missing middle was retrieved from the diff in bounded sections; no changed source file was independently reread in full.
- Named renderer risk: inspected unchanged `runBuild` result creation, status/reset, saved-source assignment and `buildTest` contract (`site/src/game/game/build.ts:318`, `build.ts:404`, `build.ts:436`, `build.ts:484`). This established the Start over defect and the adoption timing; it does not establish actual Python/browser acceptance.
- Named lifecycle/event risk: inspected the shared primary key handler and Reset/mount path (`site/src/game/game/hud.ts:98`; `site/src/game/game/runner.ts:234`, `runner.ts:322`) and VectorHandle callbacks/disposal (`site/src/game/kit/handle.ts:44`).
- Named Briefing adaptation risk: inspected unchanged doubt/law DOM, action and verdict updates (`site/src/game/game/briefing.ts:124`, `briefing.ts:298`). The local selectors match those renderers; actual visual grouping remains primary-owned.
- Named content/scope risk: read the current Pack's staging requirements (`pipeline/packs/d01-dot-v2.md:188`) and confirmed saved-source selection has the expected passing flag contract (`site/src/game/game/build.ts:38`).
- Additional primary-requested isolation risk: inspected `registerBuild`, `libSource`, Python library selection, and c04's general solution/3D dependency tests (`site/src/game/game/build.ts:23`, `build.ts:38`, `build.ts:76`; `site/src/game/content/chapters/c04-dot/build.ts:10`, `build.ts:22`, `build.ts:41`). Confirmed that reference-registration isolation does not isolate the developer's runtime saved source.
- Ran one focused Node `--experimental-strip-types --input-type=module` probe against the real ReadingChannel: request A pending, request B displays 12, A rejects, and the production-style catch hides the readout. Output: `{"shown":12,"visible":false}`. No existing passing suite was rerun; no browser was opened; source, index and HEAD were not modified.

### Assessment

**Spec-compliance verdict:** Issues found.

**Code-quality verdict / Task quality:** Needs fixes.

**Reasoning:** The presentation scope and successful-result paths are well structured, but global function persistence violates chapter isolation and failure paths do not respect the same epochs/lifetimes. The task cannot be approved until these behavior gaps are repaired and covered.

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

Repository evidence: [completed stale-run frame](../screenshots/finalfix-build-stale-run.png), [ordinary toast placement probe](../screenshots/finalfix-mobile-toast.png), and [rejected early/incomplete-code fixture frame](../screenshots/rejected/finalfix-build-edited-early-fixture.png). The strengthened completed-run frame is the final evidence. Exact fixtures and outputs: [first fixture](../checks/09-finalfix-browser.js), [first output](../checks/09-finalfix-browser.txt), [strengthened fixture](../checks/09-finalfix-browser-extra.js), [strengthened output](../checks/09-finalfix-browser-extra.txt).

Reread the complete final delta after validation. Challenged whether a status-only race fixture could falsely label an errored run as a passing run; strengthened it to verify the actual 200/200 rows, shared passed flag and exact slow tested source, plus unchanged historical adoption. Challenged Start over clearing status while a run remains outstanding; explicit tracking and the actual leave-before-settlement fixture cover this. Challenged repeated status restoration causing observer recursion; the helper guards identical writes and the focused unit proves one mutation. Verified fresh failure feedback and Assemble/Fill source reconstruction through the actual shared renderer. The final source touches only chapter lifecycle/plumbing/style/instructions and the existing unit file.

No new authored text or author decision was invented. Existing author/content STOP items remain unchanged and unaccepted. The primary's final six prescribed checks, refreshed affected captures, whole-artifact reconciliation and Chris/author acceptance are separate from this implementer's covering validation.

# Task 1 — Commander numeric confirmation re-review

Scope: `e491746c9d3accd49991055f94bf584de05af128..c65dd76f6754085643fe5e9f245c05cf4fee891e`, the supplied diff and Fix round 3 report. HEAD was verified as `c65dd76f6754085643fe5e9f245c05cf4fee891e`. This is a review of the confirmation fix, not a reopened review of older chapter code or content STOP items.

**Spec verdict: PASS. Quality verdict: PASS. New Critical/Important issues: none.**

## Production boundary and regression

- `lifecycle.ts:27–36` is the actual event binding used by Commander at `puzzles.ts:145`. `input` calls only `preview(value())`; Enter prevents the default action, stops propagation, reads the field at confirmation time, and calls `submit` only for a nonempty value.
- `puzzles.ts:128–135` previews the authored feedback and staging state. It has no win/readout side effect. Only the committed callback at lines 136–139 reaches `p2Won`, reveals the authored solution, and calls `p.win()`.
- `logic.ts` and `copy.ts` have no changes in this fix. The existing finite-number `±0.01` predicate, including its floating-point margin, remains intact. Exact 7/25/35 lookup keys and their authored strings remain intact. No new learner prose, labels, controls, shared source edits, blur/change submission, or gameplay harness changes appear in the diff.
- Choice-card selection remains committed. Runtime `submit`, Show me, solve and wrong retain their explicit committed paths at `puzzles.ts:148–159`; Show me and solve call `submit(15)`.
- `game-d01-dot.test.ts:80–119` imports the production binder and dispatches its real listeners through an EventTarget fixture. It checks every prefix of 15.1, current-value submission, default prevention, misconception preview values, empty input, and the need to confirm 15. This fixture is useful for the callback boundary but does not simulate Chromium number-input normalization, focus, or rendered authored feedback. The primary's actual Chromium typing check supplies the missing browser evidence. The already passing 20/20 unit suite was inspected through the report and was not rerun.

## Distinct headless Chromium checks

Used a separate agent-owned `numeric-review` CLI session through the mandated guarded Playwright launcher. The existing server was used; no server or primary browser was changed. Commander p2 was mounted with the existing debug mount API, then interactions used real keyboard or button events. Desktop viewport: 1440×900.

The primary reported completing the original 15.1 regression successfully on this HEAD: sequential typing retained complete `15.1` and `won=false`; Enter on 15.1 remained false; Enter on 15 won. Per the primary's instruction, this reviewer did not repeat that scenario.

Supplementary checks:

1. Empty Enter: field value remained `""`, focus remained on the input, chapter `d01-dot`, beat 4, puzzle `d01-p2`, `won=false`. No accidental zero submission or beat advance.
2. Sequential real keys `1`, `5`, `.`, `0`, `1`: the complete field displayed `15.01`. The captured unconfirmed state shows the focused input with no solution readout, solved toast or Continue button. Enter then produced `won=true` while retaining chapter/beat/puzzle and field value; the authored solution and Continue appeared. This confirms the tolerance boundary still wins only after confirmation and confirmation does not also advance the beat.
3. After remounting, actual Show me click won from an empty field and revealed the readout (`won=true`, field still `""`, readout visible). It remains a deliberate committed action independent of numeric preview.

Screenshots were opened and inspected in full, then shared with precise state narration in commentary:

- `output/playwright/numeric-review-15-01-unconfirmed.png`
- `output/playwright/numeric-review-15-01-confirmed.png`

The reviewer session was closed with the guarded launcher after checks. No source, index, HEAD, shared harness, or primary-browser mutation was performed.

## Whole-output review

The central question was whether a correct prefix can still commit before the complete numeric answer is confirmed. Both the real binding and the production preview callback exclude winning during input. The unit fixture exercises the extracted production listener rather than a duplicate implementation; browser evidence covers the actual field and focus behavior. The report deliberately separates this scoped pass from author acceptance and earlier content/layout reviews. The requested `reviews/d01-dot-v2/REPORT.md` was not present in this checkout at review time; the supplied task report's five content STOP items remain outside this fix's verdict.

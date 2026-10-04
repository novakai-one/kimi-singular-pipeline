# PROGRESS

## Done
- **Phase 0**: brief saved, PLAN, README, DECISIONS, site skeleton (26 pages, all reachable from the sidebar), wording check, screenshot script, notebook builder + runner.
- **Phase 1: Showpiece A** (`site/demo/digits.html`)
  - Trained network (99.4% test accuracy), TS forward pass matching PyTorch (unit-tested), 1.5 ms per pass.
  - Panels: draw, prediction bars, map of 3,000 digits with live dot (t-SNE + PCA), inside view (glowing grids for every layer), "Why this answer?" (occlusion).
  - Three optional challenges with win conditions and Show me; prediction prompt; cues; field links.
  - Showpiece check (`npm run test:digits`): 10/10 digits drawn with real mouse events at 5 sizes read correctly; 400/400 messy variants in unit tests; average update 4 ms.
  - Retraining notebook `notebooks/showpieces/digits_retrain.ipynb`: runs top to bottom in 68 s here.
  - Fresh reviewer pass done; 14 findings fixed (question headings, challenge placement, plain diagram labels, softmax worked example, no personification, one bold per block, Home prediction no longer gives away its answer).

- **Phase 2: Path Map and Field Cards.** Three-lane map with builds-on arrows, backward route challenge, maths/CS table, phone list view. Ten field cards, each with an interactive whose goal is tested winnable (64 unit tests), prediction, explanation in the problem → see → name → formula order, weekend project, by-hand practice, research questions, Monash unit, cues. Fresh reviewer: 14 findings fixed.
- **Phase 3: taste-project notebooks.** All ten run top to bottom (runtimes in `notebooks/runtimes.json`; slowest 4.3 min here). Every printed number checked against the text; several claims rewritten to match outputs (DECISIONS 30, 31). Fresh reviewer on notebooks 2 and 9: findings fixed (end image built from the notebook's own code, Python notes, no method names in headings, colour macros that render in Colab, solution outputs cleared).
- **Phase 4: DSA track.** Shared step player (back/forward/play/pause/speed, your own input, presets, pseudocode highlighting); topic template; overview page with topic order and where each topic shows up in AI. Ten visualisers with a challenge each (Big-O times real programs in the browser), unit tests proving every challenge, Show me and number on the page. Ten practice notebooks with a `check()` helper and collapsed solutions; links to CSES, USACO Guide and LeetCode by section. Fresh reviewer (heaps, dynamic programming, Spark Log): findings fixed.
- **Phase 5: Spark Log.** Notes and a 1–10 score per field, saved in localStorage (try/catch, warning when blocked, saved on tab close, merged across tabs), Export as Markdown, Copy, ranking by score. Browser check: `node tests/spark-log-check.mjs`.
- **Phase 6: Showpiece B.** A character-level transformer (1,016,320 weights) trained for 6,000 steps on Tiny Shakespeare on the build machine's CPU (27 minutes, held-out loss 1.56). Runs in the browser with a key/value cache; matches PyTorch in a unit test. Top-5 guesses, temperature slider, attention view by layer and head, three measured challenges with seeded Show me runs. Retrain notebook. Fresh reviewer: findings fixed.
- **Final sweep.**
  - All 22 notebooks re-run in sequence; runtimes in `notebooks/runtimes.json` and the README table.
  - Screenshots of every page at 1440 and 390 (`node tests/screenshots.mjs`): no console errors, no sideways page scroll.
  - Unit tests: `npm run test:unit` (182 pass). Browser checks: `npm run test:digits` (10/10 digits), `node tests/spark-log-check.mjs`, `node tests/tinylm-check.mjs`.
  - Wording check: `npm run check:wording` reports 0 hits across all pages and notebooks.

## Known limits
- Colab badges point to `main`. Until this branch is merged, open notebooks from Colab's GitHub tab and pick the branch (START_HERE.md, step 3).
- GitHub Pages on a private repository needs a paid GitHub plan. The site also runs locally with `npm run dev`.
- The notebooks were run with Jupyter on the build machine (4 cores), not on Colab itself. Colab's free CPU (2 cores) is slower; every notebook is well under the 20-minute limit here.
- The tiny language model overfits a little after about step 3,250 (held-out loss 1.52 then, 1.56 at the end). The page says so under the loss chart.
- Big-O timings depend on the computer; the page measures all sizes before showing any, so a slow moment affects every size alike.
- Desktop first. On phones every page fits the width; the wide DSA drawings scroll sideways inside their box.

## Problems found
- `download.pytorch.org` and `gutenberg.org` blocked from the build machine (see DECISIONS 6, 7).
- Full-page screenshots show the sticky sidebar cut off at the viewport height. Screenshot artefact only.

## Notebook runtimes (this machine: 4 CPU cores)
See `notebooks/runtimes.json`.

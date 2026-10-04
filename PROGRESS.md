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
- **Phase 4: DSA track (in progress).** Shared step player; topic template; overview page. Visualiser + practice notebook done for: arrays and hashing, recursion and backtracking, sorting and binary search, trees, heaps, graphs, greedy, dynamic programming. Each has unit tests proving the challenge, Show me and every number on the page.
- **Phase 5: Spark Log.** Notes and 1–10 score per field, saved in localStorage (try/catch, warning when blocked), Export as Markdown, Copy, ranking by score. Browser check: `node tests/spark-log-check.mjs`.

## In progress
- Phase 4: Big-O and stacks/queues visualisers; fresh reviewer of DSA pages and Spark Log.
- Phase 6: Showpiece B (tiny language model): model trained on CPU; page, browser inference, challenges and retrain notebook written.

## Next
- Final sweep: re-run every notebook in sequence for runtimes, screenshots of every page at 1440 and 390, wording check, START_HERE.md.

## Problems found
- `download.pytorch.org` and `gutenberg.org` blocked from the build machine (see DECISIONS 6, 7).
- Full-page screenshots show the sticky sidebar cut off at the viewport height. Screenshot artefact only.

## Notebook runtimes (this machine: 4 CPU cores)
See `notebooks/runtimes.json`.

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

## In progress
- Phase 2: Path Map + Field Cards.

## Next
- Phase 3: taste-project notebooks.

## Problems found
- `download.pytorch.org` and `gutenberg.org` blocked from the build machine (see DECISIONS 6, 7).
- Full-page screenshots show the sticky sidebar cut off at the viewport height. Screenshot artefact only.

## Notebook runtimes (this machine: 4 CPU cores)
See `notebooks/runtimes.json`.

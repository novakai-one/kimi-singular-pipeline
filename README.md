# AI Field Explorer

A hands-on tour of ten fields of AI. Build one small thing in each, then compare which ones excite you.

**New here? Read [`START_HERE.md`](START_HERE.md) first.**

---

## What's inside

- **Showpiece A — Draw a digit, look inside.** A trained network running in your browser. Draw, and watch every layer react.
- **Showpiece B — A tiny language model.** Watch a small model write text one character at a time.
- **Path Map.** All ten fields on one page: how they connect, and the maths and CS each one needs.
- **Ten Field Cards.** What each field asks, a small interactive, what you'd learn, open research questions.
- **Ten taste-project notebooks.** About a weekend each. Run in Google Colab, no install.
- **DSA track.** Ten topics with step-through animations, plus practice notebooks.
- **Spark Log.** Record what surprised you in each field, and rank them.

---

## Run the site on your computer

You need [Node.js](https://nodejs.org) 20 or newer.

```bash
npm install
npm run dev        # opens a local server, usually http://localhost:5173
```

Build the static files (for GitHub Pages or any static host):

```bash
npm run build      # writes dist/
npm run preview    # serves dist/ at http://localhost:4173
```

The `.github/workflows/pages.yml` workflow publishes `dist/` to GitHub Pages on every push to `main`.

---

## Notebooks (Google Colab)

Click a badge to open the notebook in Colab. Colab runs it in your browser; nothing to install.

<!-- NOTEBOOK-TABLE:START -->
| Notebook | Open | File | Runtime on the build machine (4-core CPU) |
|---|---|---|---|
| Showpiece A: retrain the digit reader | [![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/novakai-one/claude-ai-demo/blob/main/notebooks/showpieces/digits_retrain.ipynb) | [`digits_retrain.ipynb`](notebooks/showpieces/digits_retrain.ipynb) | 1.3 min |
| Showpiece B: retrain the tiny language model | [![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/novakai-one/claude-ai-demo/blob/main/notebooks/showpieces/tinylm_retrain.ipynb) | [`tinylm_retrain.ipynb`](notebooks/showpieces/tinylm_retrain.ipynb) | 6.0 min |
| Field 1: How models learn | [![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/novakai-one/claude-ai-demo/blob/main/notebooks/fields/01_how_models_learn.ipynb) | [`01_how_models_learn.ipynb`](notebooks/fields/01_how_models_learn.ipynb) | 3.9 min |
| Field 2: Classic machine learning | [![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/novakai-one/claude-ai-demo/blob/main/notebooks/fields/02_classic_ml.ipynb) | [`02_classic_ml.ipynb`](notebooks/fields/02_classic_ml.ipynb) | 6 s |
| Field 3: Language models | [![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/novakai-one/claude-ai-demo/blob/main/notebooks/fields/03_language_models.ipynb) | [`03_language_models.ipynb`](notebooks/fields/03_language_models.ipynb) | 1.2 min |
| Field 4: Looking inside models | [![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/novakai-one/claude-ai-demo/blob/main/notebooks/fields/04_interpretability.ipynb) | [`04_interpretability.ipynb`](notebooks/fields/04_interpretability.ipynb) | 10 s |
| Field 5: Computer vision | [![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/novakai-one/claude-ai-demo/blob/main/notebooks/fields/05_computer_vision.ipynb) | [`05_computer_vision.ipynb`](notebooks/fields/05_computer_vision.ipynb) | 41 s |
| Field 6: Learning by trial and error | [![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/novakai-one/claude-ai-demo/blob/main/notebooks/fields/06_reinforcement_learning.ipynb) | [`06_reinforcement_learning.ipynb`](notebooks/fields/06_reinforcement_learning.ipynb) | 27 s |
| Field 7: Swarms and many agents | [![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/novakai-one/claude-ai-demo/blob/main/notebooks/fields/07_multi_agent.ipynb) | [`07_multi_agent.ipynb`](notebooks/fields/07_multi_agent.ipynb) | 34 s |
| Field 8: Planning and search | [![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/novakai-one/claude-ai-demo/blob/main/notebooks/fields/08_planning_search.ipynb) | [`08_planning_search.ipynb`](notebooks/fields/08_planning_search.ipynb) | 14 s |
| Field 9: Optimisation | [![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/novakai-one/claude-ai-demo/blob/main/notebooks/fields/09_optimisation.ipynb) | [`09_optimisation.ipynb`](notebooks/fields/09_optimisation.ipynb) | 47 s |
| Field 10: Generative models | [![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/novakai-one/claude-ai-demo/blob/main/notebooks/fields/10_generative_models.ipynb) | [`10_generative_models.ipynb`](notebooks/fields/10_generative_models.ipynb) | 27 s |
| DSA 1: Big-O | [![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/novakai-one/claude-ai-demo/blob/main/notebooks/dsa/01_big_o.ipynb) | [`01_big_o.ipynb`](notebooks/dsa/01_big_o.ipynb) | 14 s |
| DSA 2: Arrays, hash maps and sets | [![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/novakai-one/claude-ai-demo/blob/main/notebooks/dsa/02_arrays_hashing.ipynb) | [`02_arrays_hashing.ipynb`](notebooks/dsa/02_arrays_hashing.ipynb) | 1 s |
| DSA 3: Stacks and queues | [![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/novakai-one/claude-ai-demo/blob/main/notebooks/dsa/03_stacks_queues.ipynb) | [`03_stacks_queues.ipynb`](notebooks/dsa/03_stacks_queues.ipynb) | 1 s |
| DSA 4: Recursion and backtracking | [![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/novakai-one/claude-ai-demo/blob/main/notebooks/dsa/04_recursion_backtracking.ipynb) | [`04_recursion_backtracking.ipynb`](notebooks/dsa/04_recursion_backtracking.ipynb) | 1 s |
| DSA 5: Sorting and binary search | [![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/novakai-one/claude-ai-demo/blob/main/notebooks/dsa/05_sorting_searching.ipynb) | [`05_sorting_searching.ipynb`](notebooks/dsa/05_sorting_searching.ipynb) | 2 s |
| DSA 6: Trees and binary search trees | [![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/novakai-one/claude-ai-demo/blob/main/notebooks/dsa/06_trees_bst.ipynb) | [`06_trees_bst.ipynb`](notebooks/dsa/06_trees_bst.ipynb) | 1 s |
| DSA 7: Heaps and priority queues | [![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/novakai-one/claude-ai-demo/blob/main/notebooks/dsa/07_heaps.ipynb) | [`07_heaps.ipynb`](notebooks/dsa/07_heaps.ipynb) | 2 s |
| DSA 8: Graphs | [![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/novakai-one/claude-ai-demo/blob/main/notebooks/dsa/08_graphs.ipynb) | [`08_graphs.ipynb`](notebooks/dsa/08_graphs.ipynb) | 3 s |
| DSA 9: Greedy algorithms | [![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/novakai-one/claude-ai-demo/blob/main/notebooks/dsa/09_greedy.ipynb) | [`09_greedy.ipynb`](notebooks/dsa/09_greedy.ipynb) | 1 s |
| DSA 10: Dynamic programming | [![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/novakai-one/claude-ai-demo/blob/main/notebooks/dsa/10_dynamic_programming.ipynb) | [`10_dynamic_programming.ipynb`](notebooks/dsa/10_dynamic_programming.ipynb) | 1 s |

*Generated by `python3 scripts/gen_readme_table.py`. Colab's free CPU is usually slower than the build machine.*
<!-- NOTEBOOK-TABLE:END -->

The repository is private. The first time you open a notebook, Colab asks to connect to GitHub. Tick **Include private repos**.

---

---

## SINGULAR: the linear algebra game

A voiced story game that teaches university linear algebra, from vectors to the singular value decomposition.
You move space with your own hands, find out *why* each idea works, explain it back, and write the Python behind it.

**Play:** `npm install`, then `npm run dev` and open http://localhost:5173/game/ (or **Linear algebra → SINGULAR** in the site menu).

**What is in it**

- A Prologue, 26 chapters in nine acts and an Epilogue: one big idea per chapter, each one found by doing (drag, fire, build), then named, then derived, then done by hand.
- The **Briefing** after each chapter: write your own Field Manual page first, settle a sceptic's Doubts by building cases, engrave a Law and watch it survive 500 random cases, then compare with Ilse's page.
- **lantern.py**: an optional Python thread (real Python in the browser). Assemble, Fill or Write each function; a swarm of random cases checks it; the ship then runs on your code. Export `lantern.py` and `test_lantern.py` from the Codex.
- Three difficulties (Cadet, Navigator, Commander), Viva mode for exam revision, text size and high-contrast settings.

| Where | What |
|---|---|
| `game-design/` | the design: `GDD.md`, `curriculum.md` (28 concept nodes), `AUTHORING.md` (how to write a chapter), the three original pitches |
| `site/game/index.html` | the game page |
| `site/src/game/` | the game: `core/` (stage, tweens, drag, save), `gfx/` (grid shader, arrows, buoys, shapes, models), `kit/` (puzzle components), `ui/`, `audio/` (music, effects, voice), `game/` (runner, builder, Python runner), `math/` (exact linear algebra), `content/` (chapters, cast, script) |
| `site/public/game/` | voice banks (`voice/`), Blender models (`models/`); Pyodide is copied in by `npm run gen` |
| `tools/game/` | `voices.py` + `pack_voices.py` (Kokoro voice acting), `blender/*.py` (procedural 3-D models) |

**Checks**

```bash
node --experimental-strip-types --test tests/unit/game-*.test.ts   # maths library and puzzle numbers
node tests/game-solve-all.mjs            # every puzzle, every difficulty, solved headlessly (dev server running)
node tests/game-flow.mjs c01 shots/c01   # screenshots of every beat of a chapter
node tests/game-wording.mjs              # house wording rules + "no term before it is named"
```

**Regenerate the voices** (Kokoro TTS, CPU, dev server running): `tools/game/voice-chapters.sh <kokoro dir> <python> c00 c01 …`
records only the lines that changed and rebuilds those chapters' audio banks.

---

## Repo layout

```
site/          the website (Vite + TypeScript)
notebooks/     Colab notebooks: fields/, dsa/, showpieces/
notebooks/src/ the Python scripts that generate the notebooks
training/      scripts that train and export the showpiece models
scripts/       page generator, wording check, notebook runner
tests/         Playwright checks: screenshots, showpiece test
```

## Checks

```bash
npm run build && npm run shots          # screenshots of every page at 1440px and 390px → shots/
npm run check:wording                   # banned words and analogies (Section 2a of the brief)
npm run test:digits                     # draws digits in a real browser and checks the predictions
python3 scripts/run_notebook.py <nb>    # runs a notebook top to bottom, records its runtime
```

Planning and build notes: [`PLAN.md`](PLAN.md), [`PROGRESS.md`](PROGRESS.md), [`DECISIONS.md`](DECISIONS.md). The original brief: [`BUILD_BRIEF.md`](BUILD_BRIEF.md).

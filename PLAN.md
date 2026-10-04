# PLAN — AI Field Explorer

The brief is in `BUILD_BRIEF.md`. Re-read it at the start of every phase.

---

## Repo layout

```
BUILD_BRIEF.md   the brief, word for word
PLAN.md          this file
PROGRESS.md      done / in progress / next / problems
DECISIONS.md     every judgement call, with the reason
START_HERE.md    written last, for the student

site/            Vite + TypeScript static site (multi-page)
  index.html               Home
  demo/digits.html         Showpiece A
  demo/tiny-lm.html        Showpiece B
  path-map.html            Path Map
  fields/<slug>.html       10 Field Cards
  dsa/index.html           DSA track overview
  dsa/<slug>.html          10 DSA visualisers
  spark-log.html           Spark Log
  src/                     TS: shared layout, content, visualisers
  public/models/           exported weights + map data (JSON, PNG)

training/        Python scripts that train + export the showpiece models
notebooks/       Colab notebooks (taste projects, DSA practice, showpiece retrain)
scripts/         build helpers: page generator, wording check, notebook runner
tests/           Playwright: screenshots, showpiece check, wording scan
```

---

## Shared pieces (built in Phase 0, used everywhere)

**Layout**
- Left sidebar lists every page at all times (Section 2b). Collapses to a menu button below 800px.
- Light/dark theme: follows the system, with a toggle.
- Desktop-first: picture and explanation side by side at 1280–1440px. Stacked below 800px.

**Lesson building blocks** (one TS helper each, so every page looks and reads the same)
- `inShort(question, answer)` — the "In short" box at the top.
- `predict(prompt, choices, reveal)` — a prediction invitation. Always has **Show me** and **Skip**.
- `challenge(goal, check, showMe)` — a goal with a win condition. Shows a quiet "done" mark when met. Never blocks anything.
- `solution(content)` — a worked solution, one click away.
- `cue(see, think)` — "When you see ___ in a problem, think ___."
- `whyItMatters(text)` — one real use in AI or competitive programming.

**Colour language** (same on every page and in notebooks)
- Green = input / data (the brief's `v`)
- Red = weights / the thing being adjusted (the brief's `w`)
- Yellow = result / output
- Big ideas: Search = blue, Learning from data = purple, Acting over time = teal

**Maths:** KaTeX, bundled from npm (no CDN).

---

## Phase 0 — Plan and scaffold
1. Docs: PLAN, README, PROGRESS, DECISIONS.
2. Vite multi-page site. A page generator writes the thin HTML shells for fields and DSA topics from one data file.
3. Every page exists from the start, with a "being built" note where content is pending.
4. Verification tools:
   - `npm run check:wording` — banned words and analogies scan (site text + notebooks)
   - `npm run shots` — Playwright screenshots of every page at 1440px and 390px
   - `scripts/run_notebook.py` — runs a notebook top to bottom, records runtime

## Phase 1 — Showpiece A: "Draw a digit, look inside"
1. `training/train_digits.py`: small CNN on MNIST (fallback: `load_digits`), with augmentation so mouse drawings work.
   - conv 5×5 ×8 → pool → conv 3×3 ×16 → pool → dense 64 → dense 10 (~52k weights)
2. Export: weights (base64 float32 JSON), test vectors, 3000 training digits as a PNG sprite sheet, their 64-number hidden codes, PCA and t-SNE 2-D positions.
3. TS forward pass. Unit test: matches PyTorch on the exported test vectors.
4. Page panels: Draw → Prediction bars → Inside view (glowing grids per layer) → Map with live dot (hover shows training image) → "Why this answer?" (erase-a-piece test).
5. Auto-draws a sample digit on load, so the page is alive in the first 10 seconds.
6. Optional challenges with win conditions + Show me.
7. Retrain notebook in `notebooks/`.
8. Playwright: draw 5+ digits, check predictions and frame time.
9. Fresh reviewer subagent. Fix findings.

## Phase 2 — Path Map + Field Cards
1. Path Map: SVG. Three columns (Search / Learning from data / Acting over time). Lines for "builds on". Maths and CS chips per field. Click a field to open its card.
2. Field Card template, content from Section 4 only (no invented facts).
3. One tiny interactive per field, each with a goal and win condition.
4. Reviewer. Fix.

## Phase 3 — Taste-project notebooks (brief order)
1 → 8 → 6 → 3 → 7 → 5 → 4 → 10 → 9 → 2.
- Shared notebook builder (`scripts/nb.py`) so headers, In short box, Spark Log prompts and solution cells are consistent.
- Each notebook run locally top to bottom; runtime recorded in PROGRESS.md.
- I write Field 1 as the reference. Others may be drafted in parallel by subagents that follow it, then reviewed by me.
- Reviewer. Fix.

## Phase 4 — DSA track
- One step-player framework: an algorithm produces a list of frames; the player gives back / forward / play / pause / speed / your own input.
- 10 topic pages, each: visualiser, short explanation, "where this shows up in AI", 3–5 practice problems with one-click solutions, links to CSES / USACO Guide / LeetCode.
- Practice notebooks (own problems, solutions in collapsed cells).
- Reviewer. Fix.

## Phase 5 — Spark Log
- Per field: what surprised me, what next, excitement 1–10.
- localStorage in try/catch. Export as Markdown. Ranked list at the bottom.

## Phase 6 — Showpiece B (stretch)
- Char-level transformer (~1M weights) trained on CPU. Text: Project Gutenberg if reachable, else public-domain Shakespeare.
- Browser inference, top-5 bars, temperature challenge, attention view. Retrain notebook.

## Final
- Screenshot sweep, wording check, facts check, START_HERE.md, push.

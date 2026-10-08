# Start here

This is your AI Field Explorer: a website and a set of notebooks for trying ten fields of AI before you choose one.

**The plan:** build one small thing in each field. After each one, write down how it felt. Then compare.

---

## 1. Open the site

**Option A: on your own computer (works now).** You need [Node.js](https://nodejs.org) 20 or newer.

```bash
git clone https://github.com/novakai-one/claude-ai-demo.git
cd claude-ai-demo
git checkout claude/ai-field-explorer-qjyojf     # until this branch is merged into main
npm install
npm run dev
```

Open the address it prints (usually http://localhost:5173).

**Option B: as a web page.** The repository can publish the site with GitHub Pages:

1. On GitHub: **Settings → Pages → Source: GitHub Actions**.
2. The next push to the default branch (`claude/ai-field-explorer-qjyojf`) publishes it at `https://novakai-one.github.io/claude-ai-demo/`. To publish without a push: **Actions → Deploy site to GitHub Pages → Run workflow**.
3. The game is at `https://novakai-one.github.io/claude-ai-demo/game/`. Add `?chapter=c18&beat=3` to open a chapter at a given beat (here: Chapter 18, Game 1).

GitHub Pages on a **private** repository needs a paid GitHub plan. If that isn't available, use Option A.

**Option C: a hosted copy (no install).** A built copy of the site is published at https://claude.ai/artifact/3YB6RZN1TBihrZQ51qiwdF. It is private to the account that built it; the owner can share it from the page's Share menu. Two limits there: links back to Home may not work from inner pages (use the browser's Back button), and the Spark Log's **Export as Markdown** is blocked, so use **Copy as Markdown** instead.

---

## 2. What to do first

1. **Draw a digit, look inside** (`Showpieces` in the menu). Draw a few digits. Try the three challenges. About 10 minutes.
2. **The Path Map.** One page with all ten fields, which ones build on which, and the maths each needs. Pick a goal field and plan a route back to a starting point.
3. **Any field card.** Each has a small interactive with a goal, a "predict first" question, and a weekend project.
4. **The Spark Log.** After each field, write what surprised you, what you'd want to know next, and a score from 1 to 10. Your notes stay in your browser; use **Export as Markdown** to keep a copy.

Every page is open from the menu on the left, in any order. Nothing is locked.

---

## 3. The notebooks (Google Colab)

Each field has a weekend notebook. Each DSA topic has a practice notebook. There are two retraining notebooks for the showpieces.
The README has a table with an **Open in Colab** badge for every one.

The repository is **private**, so Colab needs permission the first time:

- **After the branch is merged into `main`:** click a badge. Colab asks to connect to GitHub. Tick **Include private repos**.
- **Before it is merged:** the badges point to `main`, so they won't find the notebooks yet. In Colab, use **File → Open notebook → GitHub**, tick **Include private repos**, choose this repository, pick the branch `claude/ai-field-explorer-qjyojf`, and open the notebook from the list.

Every notebook:

- shows what you'll build first, then builds it step by step;
- explains the Python it uses in 🐍 notes as it goes;
- builds things from scratch first, then shows the library version;
- keeps solutions in collapsed cells (double-click a solution's title to open it);
- runs on Colab's free CPU. The slowest takes about 15 minutes; most take a minute or two.

---

## 4. The DSA track

Ten topics, from Big-O to dynamic programming. Each page has:

- a step-by-step animation you control (your own input, step forward and back, play, pause);
- a challenge (for example, "make quicksort do its worst");
- what it's called, its cost, and where it shows up in AI;
- four problems with answers one tap away, and a Colab notebook with five more;
- links to the CSES Problem Set, the USACO Guide and LeetCode.

A routine that works: one topic a week. Animation first, notebook midweek, three problems from one of the sites at the weekend.

---

## 5. Where things are

```
site/          the website (pages are written in TypeScript in site/src/pages)
notebooks/     fields/, dsa/, showpieces/ (the .ipynb files) and src/ (the scripts that generate them)
training/      the scripts that trained the two showpiece models
tests/         unit tests, browser checks, screenshots
PROGRESS.md    what is done
DECISIONS.md   every judgement call made while building, with the reason
```

---

## 6. What is limited

- **Colab links point to `main`.** Until the branch is merged, use the GitHub tab in Colab (section 3).
- **GitHub Pages and private repositories.** Publishing a private repo's site needs a paid GitHub plan. The site always runs locally with `npm run dev`.
- **Speed.** The notebook times in the README were measured on a 4-core machine. Colab's free CPU is slower; the slowest notebook (retraining the tiny language model) should take about 15 minutes there.
- **The tiny language model** was trained on Shakespeare's plays only (Project Gutenberg was not reachable while building it). The retrain notebook shows how to train it on other text.
- **Phones work, but the site is designed for a laptop screen.** Wide animations in the DSA track scroll sideways on a phone.

Everything else in the brief is built. `PROGRESS.md` lists what was checked, and `DECISIONS.md` explains every judgement call.

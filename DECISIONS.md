# DECISIONS

Every judgement call made during the build, with the reason. Newest at the bottom.

| # | Decision | Why |
|---|---|---|
| 1 | Vite + TypeScript multi-page site. Page content lives in TS; each HTML file is a thin shell written by `scripts/gen-pages.mjs`. | One template per page type keeps all 26 pages consistent. Shells are committed so `vite` works without the generator. |
| 2 | `base: './'` (relative URLs). | The site works on GitHub Pages under any sub-path, and from a local preview. |
| 3 | KaTeX and fonts bundled from npm, not a CDN. | Works offline and on GitHub Pages with no third-party requests. |
| 4 | Colab badges point to branch `main`. | `main` is the repo's default branch. Branch names with `/` are unreliable in Colab URLs. Until this work is merged into `main`, the badges will not resolve; START_HERE.md explains the workaround. The branch is set in one place (`site/src/lib/config.ts`, `scripts/nb.py`). |
| 5 | The repo is private. | Colab can open notebooks from private repos after you tick "Include private repos" in Colab's GitHub tab. GitHub Pages on a private repo needs a paid plan, so START_HERE.md also explains running the site locally. |
| 6 | PyTorch installed from PyPI (CUDA build, runs on CPU here). | `download.pytorch.org` is blocked by this build machine's network policy. |
| 7 | Project Gutenberg is unreachable from the build machine. Showpiece B and the language-model notebook fall back to Tiny Shakespeare (public domain, from Karpathy's char-rnn repo). The notebooks still try Gutenberg first when run in Colab. | Brief: "If the download fails, log it and use any public-domain text available." |
| 8 | Wording check scans the *rendered* page text (with every `<details>` opened and every prediction revealed) plus notebook markdown, comments and strings. | Page text is built by TS at runtime, so scanning source files would miss or mangle it. |
| 9 | "Personification" rule flags third-person *wants / thinks / knows / feels / likes to*, not "you want to". | The brief bans describing maths objects as having wishes. Addressing the student is fine. |
| 10 | Colour language: green = input/data (v), red = weights (w), yellow = result. Blue/purple/teal = the three big ideas. | Brief 2a asks for consistent colour coding across all lessons. |
| 11 | Showpiece network: conv 5×5×8 → pool → conv 3×3×16 → pool → dense 64 → dense 10 (52,266 weights), trained 15 epochs on MNIST with random rotate/zoom/slant/shift/thickness augmentation. 99.4% test accuracy. | Small enough for a 1.5 ms forward pass in plain TypeScript; augmentation makes mouse drawings read reliably (400/400 messy test variants). |
| 12 | Drawing → 28×28 conversion re-renders the strokes with a fixed stroke width, fits them in a 20×20 box, then centres by centre of mass (as MNIST was prepared). Written as pure maths, not canvas calls. | Big and small drawings give the same input. The same code runs in Node, so sample drawings are unit-tested. |
| 13 | Map default is t-SNE; PCA is a second tab. The live dot in t-SNE mode is placed among the 10 nearest training digits (in layer-3 space); in PCA mode it is an exact matrix multiply. | t-SNE separates the ten digits cleanly (the 10-second wow). PCA is the linear-algebra link and shows why a flat projection overlaps. |
| 14 | Map uses 10 colours plus a white digit label on every cluster and a hover tooltip. | Ten categories can't be told apart by colour alone (dataviz guidance), so colour is a second cue. |
| 15 | "Why this answer?" uses occlusion (erase a 3×3 square, re-run, measure the drop in the top digit's score) rather than gradients. | It is literal ("erase a piece and see what changes"), so it follows the brief's "literal first" rule. The student can check it by hand with the eraser. |
| 16 | The draw pad, inside view and map are dark "instrument" panels in both themes. | Glowing grids need a dark background. The rest of the page follows the light/dark theme. |
| 17 | Challenges only count the student's own strokes, not the opening animation or Show me playback. | Otherwise the opening 3 would complete challenges with nothing at stake (reviewer finding). |
| 18 | Map/panel headings are questions ("How sure is it?") with a small label above. | Brief 2a: headings are plain questions. Reviewer finding. |

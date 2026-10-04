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

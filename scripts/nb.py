"""Notebook builder used by every notebook script in notebooks/src/.

Keeps every notebook consistent:
  - header: title, Open in Colab badge, "In short" box, picture of the end result
  - solutions: collapsed code cells (Colab: double-click the title to open;
    Jupyter: click the "..." bar) or <details> blocks for written answers
  - footer: try-changing-this experiments, open research questions, Spark Log prompts

Usage (see notebooks/src/*.py):
    nb = Notebook()
    nb.md("...")
    nb.code("...")
    nb.solution("code", title="Solution")
    nb.save("notebooks/fields/01_x.ipynb")
"""
from __future__ import annotations

import base64
import re
import json
import textwrap
from pathlib import Path

import nbformat
from nbformat.v4 import new_code_cell, new_markdown_cell, new_notebook

REPO = "novakai-one/claude-ai-demo"
BRANCH = "main"
ROOT = Path(__file__).resolve().parent.parent


def colab_url(path: str) -> str:
    return f"https://colab.research.google.com/github/{REPO}/blob/{BRANCH}/{path}"


def badge(path: str) -> str:
    return (f'<a href="{colab_url(path)}" target="_parent">'
            '<img src="https://colab.research.google.com/assets/colab-badge.svg" alt="Open In Colab"/></a>')


def _clean(text: str) -> str:
    return textwrap.dedent(text).strip("\n")


# The site defines KaTeX colour macros (\cg, \cr, ...). Colab and GitHub don't, so notebooks use \color.
_COLOURS = {"g": "green", "r": "red", "y": "orange", "b": "blue", "p": "purple", "t": "teal"}


def normalise_md(text: str) -> str:
    """Make markdown safe and consistent for Colab/GitHub:
    - colour macros \cg{x} -> \color{green}{x}
    - in a "What it's called" block, only the label is bold; named terms are italic (one bold idea per block)."""
    text = re.sub(r"\\c([grybpt])\{", lambda m: "\\color{" + _COLOURS[m.group(1)] + "}{", text)
    label = "**What it's called:**"
    if label in text:
        before, _, after = text.partition(label)
        after = re.sub(r"\*\*([^*\n]+?)\*\*", r"*\1*", after)
        text = before + label + after
    return text


class Notebook:
    def __init__(self) -> None:
        self.nb = new_notebook()
        self.nb.metadata = {
            "kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"},
            "language_info": {"name": "python"},
            "colab": {"provenance": [], "toc_visible": True},
        }

    # ---------------- basic cells ----------------
    def md(self, text: str, attachments: dict | None = None) -> None:
        cell = new_markdown_cell(normalise_md(_clean(text)))
        if attachments:
            cell["attachments"] = attachments
        self.nb.cells.append(cell)

    def code(self, src: str, hidden: bool = False, title: str | None = None) -> None:
        src = _clean(src)
        meta: dict = {}
        if title:
            src = f"#@title {title}\n" + src
        if hidden:
            meta = {"cellView": "form", "jupyter": {"source_hidden": True}}
        self.nb.cells.append(new_code_cell(src, metadata=meta))

    # ---------------- lesson pieces ----------------
    def header(self, *, title: str, path: str, question: str, answer: str,
               build_text: str, image: str | None = None, eyebrow: str = "") -> None:
        """Title, Colab badge, In short box, and the end result shown first."""
        top = f"{badge(path)}\n\n"
        if eyebrow:
            top += f"*{eyebrow}*\n\n"
        top += f"# {title}\n\n"
        top += f"> **In short**\n>\n> **{question}**\n>\n> {answer}\n"
        self.md(top)
        attachments = None
        body = "## Where you'll end up\n\n" + _clean(build_text)
        if image:
            data = base64.b64encode((ROOT / image).read_bytes()).decode()
            name = Path(image).name
            attachments = {name: {"image/png": data}}
            body += f"\n\n![end result](attachment:{name})"
        self.md(body, attachments)

    def predict(self, prompt: str, answer: str, label: str = "Predict first") -> None:
        """A prediction with the answer one click away."""
        self.md(f"### 🤔 {label}\n\n{_clean(prompt)}\n\n"
                f"<details><summary><b>Show me the answer</b> (or skip it, and run the next cell)</summary>\n\n"
                f"{_clean(answer)}\n\n</details>")

    def solution(self, src: str, title: str = "Solution (double-click to show the code)") -> None:
        """A worked solution in a collapsed code cell. Never withheld: one click to open."""
        self.code(src, hidden=True, title=title)

    def details(self, summary: str, body: str) -> None:
        self.md(f"<details><summary><b>{summary}</b></summary>\n\n{_clean(body)}\n\n</details>")

    def exercise(self, n: int | str, text: str, starter: str | None, solution_src: str | None = None,
                 solution_md: str | None = None) -> None:
        self.md(f"### Exercise {n}\n\n{_clean(text)}")
        if starter is not None:
            self.code(starter)
        if solution_src:
            self.solution(solution_src, title=f"Solution to exercise {n} (double-click to show)")
        if solution_md:
            self.details(f"Show the answer to exercise {n}", solution_md)

    def cue(self, pairs: list[tuple[str, str]]) -> None:
        lines = "\n".join(f"- When you see **{a}** in a problem, think **{b}**." for a, b in pairs)
        self.md(f"## Recognition cues\n\n{lines}")

    def footer(self, *, experiments: list[str], questions: list[str], field_name: str) -> None:
        exp = "\n".join(f"{i + 1}. {e}" for i, e in enumerate(experiments))
        qs = "\n".join(f"- {q}" for q in questions)
        self.md(f"## Try changing this\n\n{exp}")
        self.md(f"## Open research questions\n\nPeople are working on these right now:\n\n{qs}\n\n"
                "Any of them could become a thesis topic.")
        self.md(
            "## Spark Log\n\n"
            f"Before you close this notebook, write three things about **{field_name}** in your Spark Log "
            "(the Spark Log page on the site):\n\n"
            "1. **What surprised me?**\n"
            "2. **What would I want to know next?**\n"
            "3. **Excitement, 1 to 10.** How much would you enjoy a year of this?\n\n"
            "Write it now, while it's fresh. You will compare fields later.")

    # ---------------- DSA practice notebooks ----------------
    def check_setup(self) -> None:
        """The check() helper every DSA notebook uses. It prints results and never raises,
        so the notebook runs top to bottom even before the student has solved anything."""
        self.md("""
            ## How the checks work

            Each problem gives you a function to fill in, and a list of test cases.
            Run the check after writing your code: it prints ✓ or ✗ for each case.
            Run the next cell once now, so `check` exists.
        """)
        self.code('''
def check(fn, cases):
    """Run fn on each (arguments, expected answer) pair and print ✓ or ✗."""
    passed = 0
    for args, expected in cases:
        try:
            got = fn(*args)
        except Exception as e:                      # a crash counts as a wrong answer
            got = f"error: {type(e).__name__}: {e}"
        ok = got == expected
        passed += ok
        shown = ", ".join(repr(a) for a in args)
        print(("✓" if ok else "✗"), f"{fn.__name__}({shown}) -> {got!r}", "" if ok else f"   (expected {expected!r})")
    print(f"{passed} of {len(cases)} passed")
''')
        self.md("""
            🐍 **Python notes**
            - `def check(fn, cases):` takes a **function** as an argument. In Python, functions are values like any other.
            - `fn(*args)` unpacks a tuple into separate arguments: `fn(*(3, 4))` is `fn(3, 4)`.
            - `try: ... except Exception as e:` catches an error, so one crash doesn't stop the whole check.
            - `f"{got!r}"` is an f-string; `!r` shows the value as Python would write it (strings get quotes).
        """)

    def problem(self, n: int, text: str, starter: str, solution: str) -> None:
        """A practice problem: statement (no method named), a starter cell that ends with check(...),
        and a collapsed solution cell that ends with the same check (so the saved outputs show it passing)."""
        self.md(f"### Problem {n}\n\n{_clean(text)}")
        self.code(starter)
        self.solution(solution, title=f"Solution to problem {n} (double-click to show)")

    def practise_more(self, sites: str) -> None:
        """Links to the three practice sites (linked, never copied)."""
        self.md("## Practise more\n\n" + _clean(sites) + "\n\n"
                "- CSES Problem Set: https://cses.fi/problemset/ (short problems grouped by topic, with an online judge)\n"
                "- USACO Guide: https://usaco.guide/ (free modules from Bronze to Platinum)\n"
                "- LeetCode: https://leetcode.com/problemset/ (filter by topic tag)\n\n"
                "Pick two or three problems, solve them here in a new cell first, then submit.")

    # ---------------- output ----------------
    def save(self, path: str) -> Path:
        out = ROOT / path
        out.parent.mkdir(parents=True, exist_ok=True)
        nbformat.validate(self.nb)
        nbformat.write(self.nb, str(out))
        return out


def load_json(path: str):
    return json.loads((ROOT / path).read_text())

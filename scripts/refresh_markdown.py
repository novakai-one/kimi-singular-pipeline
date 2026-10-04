"""Regenerate a notebook from its generator after a text-only change, keeping the saved outputs.

    python3 scripts/refresh_markdown.py notebooks/src/f02_classic_ml.py notebooks/fields/02_classic_ml.ipynb

Outputs are copied cell by cell from the executed notebook. If any code cell changed, nothing is merged:
the fresh (unexecuted) notebook is left in place and the script says to run it with run_notebook.py.
"""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

import nbformat

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
from run_notebook import clear_solution_outputs  # noqa: E402


def main() -> None:
    gen, path = Path(sys.argv[1]), ROOT / sys.argv[2]
    old = nbformat.read(str(path), as_version=4)
    subprocess.run([sys.executable, str(gen)], check=True, cwd=ROOT, stdout=subprocess.DEVNULL)
    new = nbformat.read(str(path), as_version=4)
    old_code = [c for c in old.cells if c.cell_type == "code"]
    new_code = [c for c in new.cells if c.cell_type == "code"]
    if len(old_code) != len(new_code) or any(a.source != b.source for a, b in zip(old_code, new_code)):
        changed = [i for i, (a, b) in enumerate(zip(old_code, new_code)) if a.source != b.source]
        print(f"code changed (code cells {changed or 'count'}): run  python3 scripts/run_notebook.py {sys.argv[2]}")
        sys.exit(2)
    for a, b in zip(old_code, new_code):
        b.outputs = a.outputs
        b.execution_count = a.execution_count
    clear_solution_outputs(new)
    new.metadata = old.metadata
    nbformat.write(new, str(path))
    print(f"refreshed text of {sys.argv[2]}, outputs kept")


if __name__ == "__main__":
    main()

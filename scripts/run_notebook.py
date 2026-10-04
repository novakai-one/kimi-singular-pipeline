"""Run notebooks top to bottom, save the outputs into the file, record runtimes.

    python3 scripts/run_notebook.py notebooks/fields/01_how_models_learn.ipynb [more.ipynb ...] [--no-record]

Runtimes are written to notebooks/runtimes.json (seconds, on this build machine),
unless --no-record is given (use it when several runs happen at once).
A notebook that raises an error fails the run (exit code 1) and is not saved.
"""
from __future__ import annotations

import json
import sys
import time
from pathlib import Path

import nbformat
from nbclient import NotebookClient

ROOT = Path(__file__).resolve().parent.parent
RUNTIMES = ROOT / "notebooks" / "runtimes.json"


def run(path: Path) -> float:
    nb = nbformat.read(str(path), as_version=4)
    client = NotebookClient(nb, timeout=1800, kernel_name="python3",
                            resources={"metadata": {"path": str(path.parent)}})
    t0 = time.time()
    client.execute()
    dt = time.time() - t0
    # keep execution counts tidy and strip widget state
    nb.metadata.pop("widgets", None)
    nbformat.write(nb, str(path))
    return dt


def main() -> None:
    times = json.loads(RUNTIMES.read_text()) if RUNTIMES.exists() else {}
    failed = False
    record = "--no-record" not in sys.argv
    for arg in [a for a in sys.argv[1:] if not a.startswith("--")]:
        p = (ROOT / arg) if not Path(arg).is_absolute() else Path(arg)
        rel = str(p.relative_to(ROOT))
        print(f"running {rel} ...", flush=True)
        try:
            dt = run(p)
        except Exception as e:  # noqa: BLE001
            print(f"  FAILED: {type(e).__name__}: {str(e)[-2000:]}")
            failed = True
            continue
        times[rel] = {"seconds": round(dt, 1), "date": time.strftime("%Y-%m-%d")}
        size = p.stat().st_size / 1e6
        print(f"  ok in {dt:.1f}s  ({size:.2f} MB)")
    if record:
        RUNTIMES.parent.mkdir(parents=True, exist_ok=True)
        RUNTIMES.write_text(json.dumps(dict(sorted(times.items())), indent=2) + "\n")
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()

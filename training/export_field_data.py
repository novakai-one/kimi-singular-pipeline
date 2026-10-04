"""Small data files for the Field Card interactives.

    python3 training/export_field_data.py

- bigram.json: letter-pair counts (a-z and space) from Tiny Shakespeare (public domain).
- probe.json: real layer-3 numbers from the showpiece digit network for round (0, 6, 8, 9)
  and straight (1, 4, 7) digits, reduced to 2-D with PCA.
"""
import json
import re
from pathlib import Path

import numpy as np
import torch

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "site/public/models/fields"
OUT.mkdir(parents=True, exist_ok=True)

# ---- bigram counts
text = (ROOT / "training/data/text/tinyshakespeare.txt").read_text().lower()
text = re.sub(r"[^a-z]+", " ", text)
alpha = " abcdefghijklmnopqrstuvwxyz"
idx = {c: i for i, c in enumerate(alpha)}
counts = np.zeros((27, 27), dtype=int)
for a, b in zip(text, text[1:]):
    counts[idx[a], idx[b]] += 1
(OUT / "bigram.json").write_text(json.dumps({"alphabet": alpha, "counts": counts.tolist(),
                                              "source": "Tiny Shakespeare (public domain)"}))
print("bigram total pairs:", counts.sum())

# ---- probe data from the trained digit network
import sys
sys.path.insert(0, str(ROOT / "training"))
from train_digits import DigitNet, load_data  # noqa: E402

model = DigitNet()
model.load_state_dict(torch.load(ROOT / "training/digits.pt"))
model.eval()
_, _, xte, yte, _ = load_data()
round_d, straight_d = [0, 6, 8, 9], [1, 4, 7]
g = torch.Generator().manual_seed(3)
pick = []
for d in round_d + straight_d:
    pool = (yte == d).nonzero().flatten()
    pick.append(pool[torch.randperm(len(pool), generator=g)[:45]])
pick = torch.cat(pick)
with torch.no_grad():
    H = model(xte[pick], return_all=True)["hidden"].numpy()
lab = yte[pick].numpy()
is_round = np.isin(lab, round_d)
# Axis 1: the direction in the 64 numbers that best separates round from straight
# (a probe: logistic regression). Axis 2: the main remaining spread (PCA), at right angles.
from sklearn.linear_model import LogisticRegression
mean = H.mean(0)
Hc = H - mean
probe = LogisticRegression(max_iter=2000, C=0.1).fit(Hc, is_round).coef_[0]
u1 = probe / np.linalg.norm(probe)
rest = Hc - np.outer(Hc @ u1, u1)
_, _, vt = np.linalg.svd(rest, full_matrices=False)
u2 = vt[0]
xy = np.stack([Hc @ u1, Hc @ u2], 1)
xy = xy - xy.mean(0)
xy = xy / np.abs(xy).max() * 0.9
best = (0, 0)
for deg in range(0, 360):
    a = np.radians(deg)
    proj = xy @ np.array([np.cos(a), np.sin(a)])
    # best threshold
    order = np.sort(proj)
    for t in order:
        acc = ((proj > t) == is_round).mean()
        if acc > best[0]:
            best = (acc, deg)
print("best single-direction accuracy %.3f at %d deg" % best)
(OUT / "probe.json").write_text(json.dumps({
    "xy": np.round(xy, 4).tolist(), "digit": lab.tolist(), "round": round_d, "straight": straight_d,
    "best_accuracy": round(float(best[0]), 3), "best_angle_deg": best[1]}))

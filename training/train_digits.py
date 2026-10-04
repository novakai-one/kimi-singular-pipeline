"""Train the Showpiece A digit network and export everything the web page needs.

    python3 training/train_digits.py            # full run (~5-10 min on a laptop CPU)
    python3 training/train_digits.py --quick    # 1 epoch, for testing the pipeline

Writes:
    site/public/models/digits/model.json     weights (base64 float32) + layer info
    site/public/models/digits/map.json       3000 training digits: labels, 2-D map positions, hidden codes
    site/public/models/digits/sprites.png    those 3000 digits as one image (60 x 50 tiles of 28 x 28)
    tests/unit/digits_vectors.json           inputs + expected outputs, to check the browser maths

Network (about 52,000 weights):
    input 1x28x28
    conv 5x5, 8 filters, pad 2 -> ReLU -> 8x28x28 -> max-pool 2 -> 8x14x14
    conv 3x3, 16 filters, pad 1 -> ReLU -> 16x14x14 -> max-pool 2 -> 16x7x7
    dense 784 -> 64 -> ReLU
    dense 64 -> 10 -> softmax
"""
from __future__ import annotations

import argparse
import base64
import json
import math
import time
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "site" / "public" / "models" / "digits"
DATA = ROOT / "training" / "data"


class DigitNet(nn.Module):
    def __init__(self) -> None:
        super().__init__()
        self.conv1 = nn.Conv2d(1, 8, 5, padding=2)
        self.conv2 = nn.Conv2d(8, 16, 3, padding=1)
        self.fc1 = nn.Linear(16 * 7 * 7, 64)
        self.fc2 = nn.Linear(64, 10)

    def forward(self, x: torch.Tensor, return_all: bool = False):
        c1 = F.relu(self.conv1(x))
        p1 = F.max_pool2d(c1, 2)
        c2 = F.relu(self.conv2(p1))
        p2 = F.max_pool2d(c2, 2)
        hid = F.relu(self.fc1(p2.flatten(1)))
        logits = self.fc2(hid)
        if return_all:
            return dict(c1=c1, p1=p1, c2=c2, p2=p2, hidden=hid, logits=logits)
        return logits


# ---------------------------------------------------------------- data
def load_data():
    """MNIST if it downloads; otherwise scikit-learn's bundled 8x8 digits, scaled up to 28x28."""
    try:
        import torchvision

        tr = torchvision.datasets.MNIST(str(DATA), train=True, download=True)
        te = torchvision.datasets.MNIST(str(DATA), train=False, download=True)
        xtr = tr.data.float().div(255).unsqueeze(1)
        xte = te.data.float().div(255).unsqueeze(1)
        return xtr, tr.targets.clone(), xte, te.targets.clone(), "MNIST"
    except Exception as e:  # noqa: BLE001
        print(f"MNIST download failed ({e}); falling back to sklearn load_digits")
        from sklearn.datasets import load_digits

        d = load_digits()
        x = torch.tensor(d.images, dtype=torch.float32).unsqueeze(1) / 16.0
        x = F.interpolate(x, size=(20, 20), mode="bilinear", align_corners=False)
        x = F.pad(x, (4, 4, 4, 4))
        y = torch.tensor(d.target)
        g = torch.Generator().manual_seed(0)
        idx = torch.randperm(len(x), generator=g)
        cut = int(0.8 * len(x))
        return x[idx[:cut]], y[idx[:cut]], x[idx[cut:]], y[idx[cut:]], "sklearn load_digits (upscaled)"


def augment(x: torch.Tensor) -> torch.Tensor:
    """Random rotate / scale / shear / shift, plus random thicker or thinner strokes.
    Done on whole batches with affine_grid (fast on CPU)."""
    n = x.shape[0]
    ang = (torch.rand(n) * 2 - 1) * math.radians(14)
    sc = 1 / (0.78 + torch.rand(n) * 0.40)          # zoom between 0.78x and 1.18x
    sh = (torch.rand(n) * 2 - 1) * 0.25
    tx = (torch.rand(n) * 2 - 1) * 0.16
    ty = (torch.rand(n) * 2 - 1) * 0.16
    cos, sin = torch.cos(ang), torch.sin(ang)
    theta = torch.zeros(n, 2, 3)
    theta[:, 0, 0] = cos * sc
    theta[:, 0, 1] = (-sin + sh) * sc
    theta[:, 1, 0] = sin * sc
    theta[:, 1, 1] = cos * sc
    theta[:, 0, 2] = tx
    theta[:, 1, 2] = ty
    grid = F.affine_grid(theta, list(x.shape), align_corners=False)
    out = F.grid_sample(x, grid, align_corners=False, padding_mode="zeros")
    # stroke thickness: dilate 30% of the batch, thin 15%
    r = torch.rand(n)
    thick = r < 0.30
    thin = (r >= 0.30) & (r < 0.45)
    if thick.any():
        out[thick] = F.max_pool2d(out[thick], 3, stride=1, padding=1) * 0.5 + out[thick] * 0.5
    if thin.any():
        eroded = -F.max_pool2d(-out[thin], 3, stride=1, padding=1)
        out[thin] = out[thin] * 0.6 + eroded * 0.4
    return out.clamp(0, 1)


# ---------------------------------------------------------------- train
def train(model, xtr, ytr, xte, yte, epochs: int) -> float:
    opt = torch.optim.AdamW(model.parameters(), lr=3e-3, weight_decay=1e-4)
    steps = epochs * math.ceil(len(xtr) / 128)
    sched = torch.optim.lr_scheduler.OneCycleLR(opt, max_lr=3e-3, total_steps=steps)
    for ep in range(epochs):
        t0 = time.time()
        model.train()
        perm = torch.randperm(len(xtr))
        total, correct, loss_sum = 0, 0, 0.0
        for i in range(0, len(xtr), 128):
            idx = perm[i:i + 128]
            xb, yb = augment(xtr[idx]), ytr[idx]
            logits = model(xb)
            loss = F.cross_entropy(logits, yb)
            opt.zero_grad()
            loss.backward()
            opt.step()
            sched.step()
            loss_sum += loss.item() * len(idx)
            correct += (logits.argmax(1) == yb).sum().item()
            total += len(idx)
        acc = evaluate(model, xte, yte)
        print(f"epoch {ep + 1}/{epochs}  loss {loss_sum / total:.4f}  train acc {correct / total:.4f}  "
              f"test acc {acc:.4f}  ({time.time() - t0:.0f}s)", flush=True)
    return acc


@torch.no_grad()
def evaluate(model, x, y) -> float:
    model.eval()
    pred = torch.cat([model(x[i:i + 1000]).argmax(1) for i in range(0, len(x), 1000)])
    return (pred == y).float().mean().item()


# ---------------------------------------------------------------- export
def b64(t: torch.Tensor) -> str:
    return base64.b64encode(t.detach().float().contiguous().numpy().astype("<f4").tobytes()).decode()


@torch.no_grad()
def export(model, xtr, ytr, xte, yte, source: str, acc: float) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    model.eval()

    # Activation scales: the 99.5th percentile of each layer on test digits, so the
    # glowing grids use a fixed brightness scale (bright means "strong for this layer").
    acts = model(xte[:2000], return_all=True)
    scale = {k: float(torch.quantile(v.flatten()[v.flatten() > 0][:2_000_000], 0.995))
             for k, v in acts.items() if k in ("c1", "c2", "hidden")}

    # Which pairs of digits get mixed up most on the test set?
    pred = torch.cat([model(xte[i:i + 1000]).argmax(1) for i in range(0, len(xte), 1000)])
    conf = np.zeros((10, 10), dtype=int)
    for t, p in zip(yte.tolist(), pred.tolist()):
        conf[t, p] += 1
    pairs = []
    for a in range(10):
        for b in range(a + 1, 10):
            pairs.append(((a, b), int(conf[a, b] + conf[b, a])))
    pairs.sort(key=lambda p: -p[1])

    model_json = {
        "source": source,
        "test_accuracy": round(acc, 4),
        "test_count": len(xte),
        "confused_pairs": [{"a": a, "b": b, "count": c} for (a, b), c in pairs[:6]],
        "act_scale": scale,
        "layers": {
            "conv1.weight": {"shape": list(model.conv1.weight.shape), "data": b64(model.conv1.weight)},
            "conv1.bias": {"shape": list(model.conv1.bias.shape), "data": b64(model.conv1.bias)},
            "conv2.weight": {"shape": list(model.conv2.weight.shape), "data": b64(model.conv2.weight)},
            "conv2.bias": {"shape": list(model.conv2.bias.shape), "data": b64(model.conv2.bias)},
            "fc1.weight": {"shape": list(model.fc1.weight.shape), "data": b64(model.fc1.weight)},
            "fc1.bias": {"shape": list(model.fc1.bias.shape), "data": b64(model.fc1.bias)},
            "fc2.weight": {"shape": list(model.fc2.weight.shape), "data": b64(model.fc2.weight)},
            "fc2.bias": {"shape": list(model.fc2.bias.shape), "data": b64(model.fc2.bias)},
        },
    }
    (OUT / "model.json").write_text(json.dumps(model_json))

    # ---- map of 3000 training digits (300 per digit)
    g = torch.Generator().manual_seed(7)
    idx = []
    for d in range(10):
        pool = (ytr == d).nonzero().flatten()
        idx.append(pool[torch.randperm(len(pool), generator=g)[:300]])
    idx = torch.cat(idx)
    idx = idx[torch.randperm(len(idx), generator=g)]
    imgs, labels = xtr[idx], ytr[idx]
    out = model(imgs, return_all=True)
    hid = out["hidden"].numpy()
    preds = out["logits"].argmax(1).numpy()

    # PCA: the two directions along which the 64-number codes spread out most
    mean = hid.mean(0)
    _, _, vt = np.linalg.svd(hid - mean, full_matrices=False)
    comps = vt[:2]
    pca_xy = (hid - mean) @ comps.T

    from sklearn.manifold import TSNE

    t0 = time.time()
    tsne_xy = TSNE(n_components=2, perplexity=35, init="pca", random_state=0, learning_rate="auto").fit_transform(hid)
    print(f"t-SNE done in {time.time() - t0:.0f}s")

    def norm(xy):
        lo, hi = xy.min(0), xy.max(0)
        span = (hi - lo).max()
        mid = (hi + lo) / 2
        n = (xy - mid) / span * 0.92 + 0.5     # square aspect, 4% margin
        return n, {"mid": mid.tolist(), "span": float(span)}

    pca_n, pca_norm = norm(pca_xy)
    tsne_n, _ = norm(tsne_xy)

    hmax = hid.max(0) + 1e-6
    hq = np.clip(np.round(hid / hmax * 255), 0, 255).astype(np.uint8)

    map_json = {
        "count": len(idx),
        "labels": "".join(str(int(v)) for v in labels),
        "preds": "".join(str(int(v)) for v in preds),
        "pca": {"xy": np.round(pca_n, 4).flatten().tolist(), "mean": mean.round(5).tolist(),
                "comps": comps.round(6).tolist(), **pca_norm},
        "tsne": {"xy": np.round(tsne_n, 4).flatten().tolist()},
        "hidden": {"max": hmax.round(5).tolist(), "data": base64.b64encode(hq.tobytes()).decode()},
        "sprite": {"cols": 60, "tile": 28},
    }
    (OUT / "map.json").write_text(json.dumps(map_json))

    from PIL import Image

    cols, rows = 60, math.ceil(len(idx) / 60)
    sheet = np.zeros((rows * 28, cols * 28), dtype=np.uint8)
    arr = (imgs.squeeze(1).numpy() * 255).round().astype(np.uint8)
    for i, im in enumerate(arr):
        r, c = divmod(i, cols)
        sheet[r * 28:(r + 1) * 28, c * 28:(c + 1) * 28] = im
    Image.fromarray(sheet, mode="L").save(OUT / "sprites.png", optimize=True)

    # ---- test vectors for the TypeScript forward pass
    vecs = []
    for i in range(4):
        x = xte[i:i + 1]
        o = model(x, return_all=True)
        vecs.append({
            "label": int(yte[i]),
            "input": np.round(x.flatten().numpy(), 6).tolist(),
            "logits": o["logits"].flatten().tolist(),
            "hidden": o["hidden"].flatten().tolist(),
            "c1_sum": float(o["c1"].sum()), "c2_sum": float(o["c2"].sum()),
        })
    (ROOT / "tests" / "unit").mkdir(parents=True, exist_ok=True)
    (ROOT / "tests" / "unit" / "digits_vectors.json").write_text(json.dumps(vecs))

    for f in ("model.json", "map.json", "sprites.png"):
        print(f"wrote {f}: {(OUT / f).stat().st_size / 1e3:.0f} kB")
    print("most confused pairs:", pairs[:4])


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--epochs", type=int, default=10)
    ap.add_argument("--quick", action="store_true")
    a = ap.parse_args()
    torch.manual_seed(0)
    xtr, ytr, xte, yte, source = load_data()
    print(f"data: {source}  train {len(xtr)}  test {len(xte)}")
    model = DigitNet()
    print("weights:", sum(p.numel() for p in model.parameters()))
    acc = train(model, xtr, ytr, xte, yte, 1 if a.quick else a.epochs)
    torch.save(model.state_dict(), ROOT / "training" / "digits.pt")
    export(model, xtr, ytr, xte, yte, source, acc)


if __name__ == "__main__":
    main()

"""Train the tiny character-level language model for Showpiece B, and export it for the browser.

    python3 training/train_tinylm.py [--iters 6000] [--threads 3]

Data: Tiny Shakespeare (public domain; Project Gutenberg is unreachable from the build machine, see DECISIONS.md).
Model: a GPT-style transformer, 5 layers, 4 heads, 128 wide, context 128 characters, about 1.0 million weights.
Writes:
  site/public/models/tinylm/model.json   weights (float16, base64) + vocabulary + config
  site/public/models/tinylm/words.json   every word in the training text (for the "ramble" challenge)
  site/public/models/tinylm/train.json   the loss curve and samples (shown on the page)
  tests/unit/tinylm_vectors.json         reference outputs, so the browser forward pass can be tested
  training/tinylm.pt                     the PyTorch weights
"""
from __future__ import annotations

import argparse
import base64
import json
import math
import re
import time
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F

ROOT = Path(__file__).resolve().parents[1]
TEXT = ROOT / "training" / "data" / "text" / "tinyshakespeare.txt"
OUT = ROOT / "site" / "public" / "models" / "tinylm"

CFG = dict(n_layer=5, n_head=4, n_embd=128, block=128)


class Block(nn.Module):
    def __init__(self, d: int, n_head: int, block: int):
        super().__init__()
        self.ln1, self.ln2 = nn.LayerNorm(d), nn.LayerNorm(d)
        self.qkv = nn.Linear(d, 3 * d)
        self.proj = nn.Linear(d, d)
        self.fc1, self.fc2 = nn.Linear(d, 4 * d), nn.Linear(4 * d, d)
        self.n_head = n_head
        self.register_buffer("mask", torch.tril(torch.ones(block, block)).bool())

    def attend(self, x):
        B, T, C = x.shape
        q, k, v = self.qkv(x).split(C, dim=2)
        hs = C // self.n_head
        q, k, v = (t.view(B, T, self.n_head, hs).transpose(1, 2) for t in (q, k, v))
        att = (q @ k.transpose(-2, -1)) / math.sqrt(hs)
        att = att.masked_fill(~self.mask[:T, :T], float("-inf")).softmax(-1)
        y = (att @ v).transpose(1, 2).reshape(B, T, C)
        return self.proj(y), att

    def forward(self, x):
        a, att = self.attend(self.ln1(x))
        x = x + a
        x = x + self.fc2(F.gelu(self.fc1(self.ln2(x)), approximate="tanh"))
        return x, att


class TinyLM(nn.Module):
    def __init__(self, vocab: int, n_layer: int, n_head: int, n_embd: int, block: int):
        super().__init__()
        self.tok = nn.Embedding(vocab, n_embd)
        self.pos = nn.Embedding(block, n_embd)
        self.blocks = nn.ModuleList(Block(n_embd, n_head, block) for _ in range(n_layer))
        self.ln_f = nn.LayerNorm(n_embd)
        self.block = block
        for m in self.modules():                            # small starting weights (GPT-2 style)
            if isinstance(m, (nn.Linear, nn.Embedding)):
                nn.init.normal_(m.weight, std=0.02)
            if isinstance(m, nn.Linear) and m.bias is not None:
                nn.init.zeros_(m.bias)

    def forward(self, idx, return_att: bool = False):
        T = idx.shape[1]
        x = self.tok(idx) + self.pos(torch.arange(T))
        atts = []
        for b in self.blocks:
            x, att = b(x)
            atts.append(att)
        logits = self.ln_f(x) @ self.tok.weight.T          # output layer shares the character embedding
        return (logits, atts) if return_att else logits


def b64(t: torch.Tensor) -> str:
    return base64.b64encode(t.detach().numpy().astype(np.float16).tobytes()).decode()


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--iters", type=int, default=6000)
    ap.add_argument("--threads", type=int, default=3)
    ap.add_argument("--batch", type=int, default=32)
    args = ap.parse_args()
    torch.set_num_threads(args.threads)
    torch.manual_seed(0)

    text = TEXT.read_text()
    chars = sorted(set(text))
    stoi = {c: i for i, c in enumerate(chars)}
    data = torch.tensor([stoi[c] for c in text])
    n = int(0.9 * len(data))
    train, val = data[:n], data[n:]
    model = TinyLM(len(chars), **CFG)
    n_params = sum(p.numel() for p in model.parameters())
    print(f"{len(text):,} characters, {len(chars)} different; {n_params:,} weights")

    def batch(split):
        d = train if split == "train" else val
        ix = torch.randint(len(d) - CFG["block"] - 1, (args.batch,))
        x = torch.stack([d[i:i + CFG["block"]] for i in ix])
        y = torch.stack([d[i + 1:i + CFG["block"] + 1] for i in ix])
        return x, y

    @torch.no_grad()
    def evaluate():
        model.eval()
        out = {}
        for split in ("train", "val"):
            losses = [F.cross_entropy(model(x).flatten(0, 1), y.flatten()).item() for x, y in (batch(split) for _ in range(20))]
            out[split] = float(np.mean(losses))
        model.train()
        return out

    opt = torch.optim.AdamW(model.parameters(), lr=2e-3, weight_decay=0.05, betas=(0.9, 0.98))
    warm = 200
    sched = torch.optim.lr_scheduler.LambdaLR(
        opt, lambda s: min(1, (s + 1) / warm) * (0.1 + 0.9 * 0.5 * (1 + math.cos(math.pi * min(1, s / args.iters)))))
    curve = []
    t0 = time.time()
    for it in range(args.iters + 1):
        if it % 250 == 0:
            ev = evaluate()
            curve.append({"step": it, **{k: round(v, 4) for k, v in ev.items()}})
            print(f"step {it:5d}  train {ev['train']:.3f}  val {ev['val']:.3f}  {time.time() - t0:.0f}s", flush=True)
        if it == args.iters:
            break
        x, y = batch("train")
        loss = F.cross_entropy(model(x).flatten(0, 1), y.flatten())
        opt.zero_grad(set_to_none=True)
        loss.backward()
        torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
        opt.step()
        sched.step()
    minutes = (time.time() - t0) / 60
    model.eval()

    @torch.no_grad()
    def sample(prompt: str, n: int, temperature: float, seed: int) -> str:
        g = torch.Generator().manual_seed(seed)
        idx = torch.tensor([[stoi[c] for c in prompt]])
        for _ in range(n):
            logits = model(idx[:, -CFG["block"]:])[0, -1] / temperature
            nxt = torch.multinomial(logits.softmax(-1), 1, generator=g)
            idx = torch.cat([idx, nxt[None]], 1)
        return "".join(chars[i] for i in idx[0].tolist())

    samples = {str(t): sample("ROMEO:\n", 300, t, 1) for t in (0.2, 0.8, 1.6)}
    for t, s in samples.items():
        print(f"--- temperature {t}\n{s}\n")

    # ---------------- export
    OUT.mkdir(parents=True, exist_ok=True)
    sd = model.state_dict()
    layers = []
    for i in range(CFG["n_layer"]):
        p = f"blocks.{i}."
        layers.append({k: b64(sd[p + k]) for k in (
            "ln1.weight", "ln1.bias", "qkv.weight", "qkv.bias", "proj.weight", "proj.bias",
            "ln2.weight", "ln2.bias", "fc1.weight", "fc1.bias", "fc2.weight", "fc2.bias")})
    export = {
        "config": {**CFG, "vocab": len(chars)},
        "chars": "".join(chars),
        "params": n_params,
        "tok": b64(sd["tok.weight"]), "pos": b64(sd["pos.weight"]),
        "ln_f.weight": b64(sd["ln_f.weight"]), "ln_f.bias": b64(sd["ln_f.bias"]),
        "layers": layers,
        "note": "Linear weights are stored PyTorch-style: [out, in], row-major. Output layer = tok embedding transposed.",
    }
    (OUT / "model.json").write_text(json.dumps(export))
    words = sorted({w.lower() for w in re.findall(r"[A-Za-z']+", text)})
    (OUT / "words.json").write_text(json.dumps(words))
    final = curve[-1]
    (OUT / "train.json").write_text(json.dumps({
        "curve": curve, "samples": samples, "minutes": round(minutes, 1), "iters": args.iters, "batch": args.batch,
        "params": n_params, "characters": len(text), "final": final}, indent=1))
    torch.save(model.state_dict(), ROOT / "training" / "tinylm.pt")

    # reference vectors for the TypeScript forward pass (computed from the float16-rounded weights)
    with torch.no_grad():
        for name, prm in model.named_parameters():
            prm.copy_(prm.half().float())
        prompt = "ROMEO:\nBut soft, what light"
        idx = torch.tensor([[stoi[c] for c in prompt]])
        logits, atts = model(idx, return_att=True)
    vec = {
        "prompt": prompt,
        "last_logits": [round(v, 5) for v in logits[0, -1].tolist()],
        "att_last_layer0_head0": [round(v, 6) for v in atts[0][0, 0, -1, :len(prompt)].tolist()],
        "argmax_next": chars[int(logits[0, -1].argmax())],
    }
    (ROOT / "tests" / "unit" / "tinylm_vectors.json").write_text(json.dumps(vec))
    size = (OUT / "model.json").stat().st_size / 1e6
    print(f"done in {minutes:.1f} min; final val loss {final['val']:.3f}; model.json {size:.2f} MB")


if __name__ == "__main__":
    main()

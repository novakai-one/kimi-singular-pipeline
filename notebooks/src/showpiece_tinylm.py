"""Generates notebooks/showpieces/tinylm_retrain.ipynb (retrain Showpiece B, the tiny language model)

    python3 notebooks/src/showpiece_tinylm.py [--redo]

The model code is copied from training/train_tinylm.py with inspect.getsource, so the notebook and the
site's model are the same network. The notebook trains for fewer steps so it fits Colab's free CPU.
"""
import inspect
import sys
import textwrap
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))
sys.path.insert(0, str(ROOT / "training"))
from nb import Notebook  # noqa: E402
import train_tinylm as T  # noqa: E402

PATH = "notebooks/showpieces/tinylm_retrain.ipynb"
IMG = "notebooks/images/tinylm_end.png"
STEPS = 1500

CODE_DATA = '''
import urllib.request, math, time, json, base64, os
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
import matplotlib.pyplot as plt

URL = "https://raw.githubusercontent.com/karpathy/char-rnn/master/data/tinyshakespeare/input.txt"
try:
    text = urllib.request.urlopen(URL, timeout=30).read().decode("utf-8")
except Exception as e:                                   # no internet: use a local copy, or a short stand-in text
    print("download failed:", e)
    text = open("tinyshakespeare.txt").read() if os.path.exists("tinyshakespeare.txt") else "To be, or not to be.\\n" * 2000
chars = sorted(set(text))
stoi = {c: i for i, c in enumerate(chars)}
encode = lambda s: [stoi[c] for c in s]
decode = lambda ids: "".join(chars[i] for i in ids)
data = torch.tensor(encode(text))
n = int(0.9 * len(data))
train_data, val_data = data[:n], data[n:]
'''

CODE_MODEL = "CFG = dict(n_layer=5, n_head=4, n_embd=128, block=128)\n\n" + inspect.getsource(T.Block) + "\n\n" + inspect.getsource(T.TinyLM)

CODE_TRAIN = f'''
torch.manual_seed(0)
model = TinyLM(len(chars), **CFG)
BATCH, STEPS = 32, {STEPS}

def get_batch(split):
    d = train_data if split == "train" else val_data
    ix = torch.randint(len(d) - CFG["block"] - 1, (BATCH,))
    x = torch.stack([d[i:i + CFG["block"]] for i in ix])
    y = torch.stack([d[i + 1:i + CFG["block"] + 1] for i in ix])
    return x, y

@torch.no_grad()
def estimate_loss():
    model.eval()
    out = {{}}
    for split in ("train", "val"):
        out[split] = float(np.mean([F.cross_entropy(model(x).flatten(0, 1), y.flatten()).item()
                                    for x, y in (get_batch(split) for _ in range(20))]))
    model.train()
    return out

opt = torch.optim.AdamW(model.parameters(), lr=2e-3, weight_decay=0.05, betas=(0.9, 0.98))
sched = torch.optim.lr_scheduler.LambdaLR(
    opt, lambda s: min(1, (s + 1) / 200) * (0.1 + 0.9 * 0.5 * (1 + math.cos(math.pi * min(1, s / STEPS)))))
curve, t0 = [], time.time()
for step in range(STEPS + 1):
    if step % 250 == 0:
        ev = estimate_loss()
        curve.append((step, ev["train"], ev["val"]))
        print(f"step {{step:5d}}   training text {{ev['train']:.3f}}   held-out text {{ev['val']:.3f}}   {{time.time() - t0:.0f}}s")
    if step == STEPS:
        break
    x, y = get_batch("train")
    loss = F.cross_entropy(model(x).flatten(0, 1), y.flatten())
    opt.zero_grad(set_to_none=True)
    loss.backward()
    torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
    opt.step(); sched.step()
train_seconds = time.time() - t0
_ = model.eval()                                          # switch to "use" mode (the _ = stops Jupyter printing the model)
'''

CODE_SAMPLE = '''
@torch.no_grad()
def write(prompt, n=300, temperature=0.8, seed=1):
    g = torch.Generator().manual_seed(seed)
    idx = torch.tensor([encode(prompt)])
    for _ in range(n):
        logits = model(idx[:, -CFG["block"]:])[0, -1] / temperature    # scores for the next character
        nxt = torch.multinomial(logits.softmax(-1), 1, generator=g)    # pick one, in proportion to probability
        idx = torch.cat([idx, nxt[None]], 1)
    return decode(idx[0].tolist())
'''


def make_end_image(redo: bool) -> None:
    out = ROOT / IMG
    if out.exists() and not redo:
        return
    import matplotlib
    matplotlib.use("Agg")
    ns: dict = {}
    data_code = textwrap.dedent(CODE_DATA).replace('open("tinyshakespeare.txt")', f'open("{ROOT}/training/data/text/tinyshakespeare.txt")')
    for code in (data_code, CODE_MODEL, CODE_TRAIN, CODE_SAMPLE):
        exec(textwrap.dedent(code), ns)
    plt = ns["plt"]
    curve = ns["curve"]
    fig, (a1, a2) = plt.subplots(1, 2, figsize=(13, 4.2), dpi=90, gridspec_kw={"width_ratios": [1, 1.6]})
    st, tr, va = zip(*curve)
    a1.plot(st, tr, color="#999", label="training text"); a1.plot(st, va, color="#e0a100", lw=2.5, label="held-out text")
    a1.set_xlabel("training step"); a1.set_ylabel("loss"); a1.legend(); a1.set_title(f"Loss: {va[0]:.2f} at the start, {va[-1]:.2f} after {st[-1]:,} steps", fontsize=10)
    sample = ns["write"]("ROMEO:\n", 260, 0.8)
    a2.text(0, 1, "Written by your model (temperature 0.8):\n\n" + sample, va="top", family="monospace", fontsize=8.5, wrap=True)
    a2.axis("off")
    fig.tight_layout()
    out.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(out, bbox_inches="tight")


def build(redo: bool = False) -> None:
    make_end_image(redo)
    nb = Notebook()
    nb.header(
        eyebrow="Showpiece B · retrain notebook",
        title="How does a program learn to write, one character at a time?",
        path=PATH,
        question="How does a program learn to write, one character at a time?",
        answer=("Show it a long text and ask it, millions of times, to guess the next character. "
                "Each guess nudges its weights a little, more when the guess was further off. After enough guesses, its own writing looks like the text."),
        build_text=f"""
            By the end you will have:

            1. **Trained the same network as the site's tiny language model**: 5 layers, about a million weights, on Shakespeare's plays.
            2. **Made it write** at different temperatures, and **looked at its attention**.
            3. **Exported it** in the format the site reads, so you can put your own model on the page.

            Training here runs {STEPS:,} steps (the site's model ran 6,000). Running every cell, including the exercise solutions, takes about 15 minutes on Colab's free CPU. The picture below is a real run of this notebook.
        """,
        image=IMG,
    )
    nb.md("""
        ## How to use this notebook

        - Run each grey code cell with **Shift + Enter**, top to bottom.
        - 🤔 **Predict first** boxes ask you to guess before you run. The answer is one click away.
        - 🐍 **Python notes** explain Python as it comes up.
        - Exercise solutions are in collapsed cells. In Colab, double-click a solution's title to open it.
    """)

    nb.md("""
        ## 1. The text, as numbers

        The model reads characters, so each different character gets a number. The whole text becomes a long list of numbers.
    """)
    nb.code(CODE_DATA + '''
print(f"{len(text):,} characters, {len(chars)} different ones:")
print(repr("".join(chars)))
print(encode("ROMEO:"), "->", repr(decode(encode("ROMEO:"))))
''')
    nb.md("""
        🐍 **Python notes**
        - `sorted(set(text))`: a `set` keeps one copy of each character; `sorted` puts them in order.
        - `{c: i for i, c in enumerate(chars)}` builds a dict from character to number. `enumerate` gives (position, item) pairs.
        - `encode = lambda s: [...]` makes a small one-line function. `"".join(...)` glues characters into one string.
        - `try: ... except Exception as e:` runs a fallback if the download fails.
    """)

    nb.md("""
        ## 2. The simplest guess: count what follows what

        Before any network: for each character, count which characters follow it in the text. Guess in proportion to those counts.
    """)
    nb.predict(
        "**Loss** measures surprise: $-\\ln p$, where $p$ is the probability the model gave the real next character. "
        f"An even guess among {65} characters scores $\\ln 65 \\approx 4.17$. **What will counting pairs score?**",
        "**About 2.5.** Knowing only the previous character already removes a lot of surprise. Run the next cell.",
    )
    nb.code('''
counts = torch.ones(len(chars), len(chars))                 # start every count at 1, so no pair has probability 0
for a, b in zip(train_data[:-1].tolist(), train_data[1:].tolist()):
    counts[a, b] += 1
probs = counts / counts.sum(1, keepdim=True)
v = val_data.tolist()
pair_loss = -np.mean([math.log(probs[a, b]) for a, b in zip(v[:-1], v[1:])])
print(f"even guess: {math.log(len(chars)):.2f}    counting pairs: {pair_loss:.2f}")
''')
    nb.md("""
        🐍 `zip(a, b)` walks two lists side by side. `counts.sum(1, keepdim=True)` adds up each row, so dividing makes each row add to 1.

        **What you see:** counting pairs scores about 2.5 on held-out text. To do better, a model must use more than one character of context.
    """)

    nb.md("""
        ## 3. The network

        This is the exact code behind the site's model (`training/train_tinylm.py`). Each character becomes a list of 128 numbers.
        Five blocks then mix information along the text. In each block, **attention** lets every position combine
        the positions before it, giving each a share that it works out from the text itself. The last step turns 128 numbers into one score per character.
    """)
    nb.code(CODE_MODEL + '''

model = TinyLM(len(chars), **CFG)
print(f"{sum(p.numel() for p in model.parameters()):,} weights")
''')
    nb.md("""
        🐍 **Python notes**
        - `class Block(nn.Module):` defines a new kind of object, built on PyTorch's `nn.Module`. `__init__` creates its weights; `forward` says what it computes.
        - `super().__init__()` runs `nn.Module`'s own set-up first.
        - `masked_fill(~mask, -inf)` hides the future: position 10 can't look at position 11. After `softmax`, hidden positions get weight 0.
        - `(t.view(...) for t in (q, k, v))` is a **generator expression**; unpacking it into three names applies the same reshape to all three.
        - `B, T, C = x.shape` unpacks the three sizes of a tensor: batch, positions, numbers per position. `@` multiplies matrices.
        - `{**CFG}` copies the dict `CFG`; `TinyLM(..., **CFG)` passes its keys as named arguments (`n_layer=5`, ...).

        **What it's called:** this design is a **transformer**. Each block has **attention** (4 **heads**, each with its own weights) and a small two-layer network.
    """)

    nb.md(f"""
        ## 4. Train it

        Each step: take 32 random pieces of 128 characters, ask the model to guess every next character, measure the loss, and nudge all the weights downhill.
        This is gradient descent (Field 1) with a better step rule called **AdamW**. The loss is printed every 250 steps, on training text and on held-out text.
    """)
    nb.code(CODE_TRAIN)
    nb.md("""
        🐍 **Reading the training loop**
        - `loss.backward()` works out, for every weight, which way to nudge it (the slopes from Field 1). `opt.zero_grad()` clears the old ones first.
        - `opt.step()` nudges every weight. The **learning rate** (`lr=2e-3`) sets the size of the nudges.
        - `LambdaLR(...)` changes the learning rate over time: it grows for the first 200 steps, then shrinks smoothly (a cosine curve) to a tenth.
        - `clip_grad_norm_(..., 1.0)` caps the size of one nudge, so a rare bad batch can't throw the weights far off.
        - `@torch.no_grad()` and `with torch.no_grad():` switch off slope-tracking while measuring, which saves time and memory.
        - `def estimate_loss(): ...` inside the cell is a normal function; the `@` line above it is a **decorator** that wraps it.
    """)
    nb.code('''
st, tr, va = zip(*curve)                                  # three lists: steps, training losses, held-out losses
plt.figure(figsize=(6.5, 3.4))
plt.plot(st, tr, color="#999", label="training text")
plt.plot(st, va, color="#e0a100", lw=2.5, label="held-out text")
plt.xlabel("training step"); plt.ylabel("loss"); plt.legend(); plt.show()
print(f"held-out loss: {va[-1]:.2f}   (counting pairs: {pair_loss:.2f}, even guess: {math.log(len(chars)):.2f})")
''')
    nb.md("""
        **What you see:** the loss starts near 4.17 (an even guess), passes the pair-counting score within a few hundred steps, and keeps falling.
        The held-out loss is the honest one: it is measured on text the model never trained on.
    """)

    nb.md("""
        ## 5. Make it write

        Writing is a loop: score every character, turn the scores into probabilities, pick one at random, add it, repeat.
        The **temperature** $T$ divides the scores first:

        $$p_i = \\frac{e^{z_i / T}}{\\sum_j e^{z_j / T}}$$
    """)
    nb.predict(
        "**What will temperature 0.05 do to the text? And temperature 2?**",
        "At 0.05 the top guess wins almost every time, and the text falls into loops. At 2 the probabilities even out, rare characters get picked, and words fall apart. Run the next cell.",
    )
    nb.code(CODE_SAMPLE + '''
for t in (0.05, 0.8, 2.0):
    print(f"----- temperature {t}")
    print(write("ROMEO:\\n", 250, t))
''')
    nb.md("""
        🐍 `torch.multinomial(probs, 1)` picks one index at random, in proportion to the probabilities. `torch.cat` joins tensors end to end.

        **What it's called:** picking at random in proportion to probability is **sampling**. Always picking the top one is **greedy decoding**.
    """)

    nb.md("""
        ## 6. Look at the attention

        For each position, each head shares out its attention over the earlier positions; the shares add up to 1. Here are the shares of every head in the third layer, for one line of text.
    """)
    nb.code('''
prompt = "ROMEO:\\nBut soft, what light"
with torch.no_grad():
    _, atts = model(torch.tensor([encode(prompt)]), return_att=True)
LAYER = 2                                                  # the third layer (counting from 0)
fig, axes = plt.subplots(1, CFG["n_head"], figsize=(16, 4.2))
labels = [c if c != "\\n" else "↵" for c in prompt]
for h, ax in enumerate(axes):
    ax.imshow(atts[LAYER][0, h].numpy(), cmap="magma", vmax=0.5)    # vmax: shares of 0.5 or more show as the brightest
    ax.set_xticks(range(len(prompt)), labels, fontsize=7); ax.set_yticks(range(len(prompt)), labels, fontsize=7)
    ax.set_title(f"layer {LAYER + 1}, head {h + 1}", fontsize=10)
plt.tight_layout(); plt.show()
''')
    nb.md("""
        **How to read it:** row = the position doing the looking; column = the earlier position it looks at. Bright = more attention. Everything above the diagonal is black: no position can look ahead.

        Compare the four heads: some put most of their attention on one or two recent characters (a bright stripe next to the diagonal); others spread it over the word or the line. The site's attention view shows the same shares, for any character you click.
    """)

    nb.md("""
        ## 7. Put your model on the site

        The site reads two files: `model.json` (the weights) and `train.json` (the numbers on the page: steps, loss curve, minutes).
        This cell writes both. Download them (Colab's file panel, on the left), put them in `site/public/models/tinylm/` in your copy of the repository,
        and run `npm run dev` to see your model on the page (or `npm run build` for the static site).
    """)
    nb.code('''
def b64(t):
    return base64.b64encode(t.detach().numpy().astype(np.float16).tobytes()).decode()

sd = model.state_dict()
KEYS = ["ln1.weight", "ln1.bias", "qkv.weight", "qkv.bias", "proj.weight", "proj.bias",
        "ln2.weight", "ln2.bias", "fc1.weight", "fc1.bias", "fc2.weight", "fc2.bias"]
export = {
    "config": {**CFG, "vocab": len(chars)}, "chars": "".join(chars),
    "params": sum(p.numel() for p in model.parameters()),
    "tok": b64(sd["tok.weight"]), "pos": b64(sd["pos.weight"]),
    "ln_f.weight": b64(sd["ln_f.weight"]), "ln_f.bias": b64(sd["ln_f.bias"]),
    "layers": [{k: b64(sd[f"blocks.{i}.{k}"]) for k in KEYS} for i in range(CFG["n_layer"])],
}
with open("model.json", "w") as f:
    json.dump(export, f)
train_info = {
    "curve": [{"step": s_, "train": round(t_, 4), "val": round(v_, 4)} for s_, t_, v_ in curve],
    "minutes": round(train_seconds / 60, 1), "iters": STEPS, "batch": BATCH, "params": export["params"],
    "characters": len(text), "final": {"step": curve[-1][0], "train": round(curve[-1][1], 4), "val": round(curve[-1][2], 4)},
}
with open("train.json", "w") as f:
    json.dump(train_info, f)
print(f"wrote model.json ({len(json.dumps(export)) / 1e6:.1f} MB) and train.json")
''')
    nb.md("""
        🐍 **Python notes**
        - The weights are saved as 16-bit numbers (`float16`) to halve the file size, then as **base64** text so they fit in JSON. The site turns them back into numbers when the page loads.
        - `with open("model.json", "w") as f:` opens a file for writing and closes it at the end of the block, even if an error happens.
    """)

    nb.md("## Practice\n\nTry each one before opening its solution.")
    nb.exercise(
        1,
        "By hand: three characters have scores 2, 1 and 0. **What are their probabilities at temperature 1? At temperature 0.5?**",
        None,
        solution_md=(
            "At $T = 1$: $e^2, e^1, e^0 = 7.39, 2.72, 1$; total 11.11; probabilities **0.67, 0.24, 0.09**.\n\n"
            "At $T = 0.5$ the scores double to 4, 2, 0: $54.6, 7.39, 1$; total 62.99; probabilities **0.87, 0.12, 0.02**. "
            "Lower temperature, sharper choice."),
    )
    nb.exercise(
        2,
        "**Make the model write in a different style.** Train it on another text of at least 200,000 characters (a public-domain book, or your own writing), and show a sample.",
        "# your code here\n",
        solution_src='''
            # Any plain-text file works, for example a Project Gutenberg book in Colab:
            #   text2 = urllib.request.urlopen("https://www.gutenberg.org/cache/epub/1342/pg1342.txt").read().decode("utf-8")
            # Here: Python's own source code, which is always on the machine. The model learns a very different style.
            import inspect, collections, json as json_module, textwrap as tw, random as rnd
            text2 = "\\n".join(inspect.getsource(m) for m in (collections, json_module.decoder, json_module.encoder, tw, rnd))
            chars2 = sorted(set(text2)); stoi2 = {c: i for i, c in enumerate(chars2)}
            data2 = torch.tensor([stoi2[c] for c in text2])
            torch.manual_seed(0)
            model2 = TinyLM(len(chars2), **CFG)
            opt2 = torch.optim.AdamW(model2.parameters(), lr=2e-3, weight_decay=0.05, betas=(0.9, 0.98))
            for step in range(400):                                   # a short run: enough to pick up the style
                ix = torch.randint(len(data2) - CFG["block"] - 1, (BATCH,))
                x = torch.stack([data2[i:i + CFG["block"]] for i in ix]); y = torch.stack([data2[i + 1:i + CFG["block"] + 1] for i in ix])
                loss = F.cross_entropy(model2(x).flatten(0, 1), y.flatten())
                opt2.zero_grad(set_to_none=True); loss.backward(); opt2.step()
            model2.eval()
            print(f"{len(text2):,} characters of Python; loss after 400 steps: {loss.item():.2f}")
            idx = torch.tensor([[stoi2[c] for c in "def "]])
            with torch.no_grad():
                for _ in range(300):
                    probs = (model2(idx[:, -CFG["block"]:])[0, -1] / 0.8).softmax(-1)
                    idx = torch.cat([idx, torch.multinomial(probs, 1)[None]], 1)
            print("".join(chars2[i] for i in idx[0].tolist()))
        ''',
    )
    nb.exercise(
        3,
        "Halve the width (`n_embd=64`) and use 2 layers. **How many weights are left? Train it for the same number of steps: how much higher is its held-out loss?**",
        "# your experiment here\n",
        solution_src='''
            torch.manual_seed(0)                                          # same seed as section 4, before building
            small = TinyLM(len(chars), n_layer=2, n_head=4, n_embd=64, block=128)
            print(f"{sum(p.numel() for p in small.parameters()):,} weights")
            opt_s = torch.optim.AdamW(small.parameters(), lr=2e-3, weight_decay=0.05, betas=(0.9, 0.98))
            sched_s = torch.optim.lr_scheduler.LambdaLR(
                opt_s, lambda s: min(1, (s + 1) / 200) * (0.1 + 0.9 * 0.5 * (1 + math.cos(math.pi * min(1, s / STEPS)))))
            for step in range(STEPS):                                     # same steps, schedule and clipping as section 4
                x, y = get_batch("train")
                loss = F.cross_entropy(small(x).flatten(0, 1), y.flatten())
                opt_s.zero_grad(set_to_none=True); loss.backward()
                torch.nn.utils.clip_grad_norm_(small.parameters(), 1.0)
                opt_s.step(); sched_s.step()
            small.eval()
            with torch.no_grad():
                small_val = float(np.mean([F.cross_entropy(small(x).flatten(0, 1), y.flatten()).item()
                                           for x, y in (get_batch("val") for _ in range(20))]))
            print(f"held-out loss: small {small_val:.2f}, full {va[-1]:.2f}")
            # Fewer weights store fewer patterns of spelling and grammar, so the loss stays higher.
        ''',
    )
    nb.cue([
        ("\"generate text one piece at a time\"", "a language model: score, pick, repeat"),
        ("\"more varied\" or \"more predictable\" output", "raise or lower the temperature"),
        ("\"which earlier words does the model use?\"", "look at the attention weights"),
        ("training loss falls but held-out loss doesn't", "the model is memorising: more data or a smaller model"),
    ])
    nb.footer(
        experiments=[
            "**Longer training.** Set `STEPS = 6000` (about four times as long). How low does the held-out loss go, and when does it stop falling?",
            "**A shorter memory.** Set `block=32` in `CFG`. What kind of mistakes appear in the writing?",
            "**Your own prompt.** Start `write` with a speaker name that isn't in the plays. What does the model do?",
        ],
        questions=[
            "How do models reason over many steps?",
            "Why do they sometimes make things up?",
        ],
        field_name="Language models",
    )
    nb.md("""
        ## Go deeper

        - Andrej Karpathy, *Let's build GPT: from scratch, in code, spelled out* (video, about 2 hours). This notebook's model follows the same design: https://www.youtube.com/watch?v=kCc8FmEb1nY
        - The site's page for Field 3, *Language models*.
    """)
    print("wrote", nb.save(PATH))


if __name__ == "__main__":
    build(redo="--redo" in sys.argv)

"""Generates notebooks/fields/03_language_models.ipynb

    python3 notebooks/src/f03_language_models.py          # reuses the end picture if it exists
    python3 notebooks/src/f03_language_models.py --redo   # retrains to redraw the end picture
"""
import sys
import textwrap
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))
from nb import Notebook  # noqa: E402

PATH = "notebooks/fields/03_language_models.ipynb"
IMG = "notebooks/images/f03_end.png"

CODE_DATA = '''
import urllib.request

SOURCES = [
    ("Pride and Prejudice, Jane Austen (Project Gutenberg)", "https://www.gutenberg.org/cache/epub/1342/pg1342.txt"),
    ("Tiny Shakespeare (Shakespeare's plays)", "https://raw.githubusercontent.com/karpathy/char-rnn/master/data/tinyshakespeare/input.txt"),
]
text, source = None, None
for name, url in SOURCES:
    try:
        with urllib.request.urlopen(url, timeout=20) as r:
            text = r.read().decode("utf-8", errors="ignore")
        source = name
        break
    except Exception as e:
        print(f"could not download {name}: {e}")
if text is None:
    # last resort: a short public-domain passage, so the notebook still runs offline
    source = "a short built-in passage (offline fallback)"
    text = ("It is a truth universally acknowledged, that a single man in possession of a good fortune, "
            "must be in want of a wife. ") * 400

if "gutenberg" in source.lower():
    start = text.find("Chapter 1")                       # skip the licence header and footer
    end = text.find("*** END OF THE PROJECT GUTENBERG")
    text = text[start if start > 0 else 0: end if end > 0 else None]
text = text[:1_000_000]
print("text:", source, "-", f"{len(text):,}", "characters")
'''

CODE_MODEL = '''
import torch
import torch.nn as nn
import torch.nn.functional as F

torch.manual_seed(0)
BLOCK = 64          # how many characters the model can look back over
EMBD = 96           # numbers per character inside the model
HEADS = 4
LAYERS = 3

class Head(nn.Module):
    """One attention head: each position takes a weighted average of earlier positions."""
    def __init__(self, size):
        super().__init__()
        self.query = nn.Linear(EMBD, size, bias=False)
        self.key = nn.Linear(EMBD, size, bias=False)
        self.value = nn.Linear(EMBD, size, bias=False)
        self.register_buffer("mask", torch.tril(torch.ones(BLOCK, BLOCK)))
        self.last_weights = None

    def forward(self, x):
        T = x.shape[1]
        q, k, v = self.query(x), self.key(x), self.value(x)
        scores = q @ k.transpose(-2, -1) / k.shape[-1] ** 0.5       # how well each query matches each key
        scores = scores.masked_fill(self.mask[:T, :T] == 0, float("-inf"))   # no looking ahead
        weights = F.softmax(scores, dim=-1)
        self.last_weights = weights.detach()
        return weights @ v

class Block(nn.Module):
    def __init__(self):
        super().__init__()
        self.heads = nn.ModuleList([Head(EMBD // HEADS) for _ in range(HEADS)])
        self.proj = nn.Linear(EMBD, EMBD)
        self.mlp = nn.Sequential(nn.Linear(EMBD, 4 * EMBD), nn.GELU(), nn.Linear(4 * EMBD, EMBD))
        self.ln1, self.ln2 = nn.LayerNorm(EMBD), nn.LayerNorm(EMBD)

    def forward(self, x):
        x = x + self.proj(torch.cat([h(self.ln1(x)) for h in self.heads], dim=-1))   # look back
        x = x + self.mlp(self.ln2(x))                                                 # think about it
        return x

class TinyGPT(nn.Module):
    def __init__(self, vocab):
        super().__init__()
        self.tok = nn.Embedding(vocab, EMBD)        # a list of numbers for each character
        self.pos = nn.Embedding(BLOCK, EMBD)        # a list of numbers for each position
        self.blocks = nn.Sequential(*[Block() for _ in range(LAYERS)])
        self.ln = nn.LayerNorm(EMBD)
        self.out = nn.Linear(EMBD, vocab)           # back to one score per character

    def forward(self, idx):
        T = idx.shape[1]
        x = self.tok(idx) + self.pos(torch.arange(T))
        return self.out(self.ln(self.blocks(x)))

def get_batch(data, batch=32):
    ix = torch.randint(len(data) - BLOCK - 1, (batch,))
    x = torch.stack([data[i:i + BLOCK] for i in ix])
    y = torch.stack([data[i + 1:i + BLOCK + 1] for i in ix])
    return x, y

@torch.no_grad()
def write(model, start, length=300, temperature=0.8):
    model.eval()
    idx = torch.tensor([[stoi[c] for c in start]])
    for _ in range(length):
        scores = model(idx[:, -BLOCK:])[:, -1, :] / temperature
        nxt = torch.multinomial(F.softmax(scores, dim=-1), 1)
        idx = torch.cat([idx, nxt], dim=1)
    model.train()
    return "".join(itos[int(i)] for i in idx[0])
'''

CODE_TRAIN = '''
import time
model = TinyGPT(len(chars))
print(f"weights: {sum(p.numel() for p in model.parameters()):,}")
opt = torch.optim.AdamW(model.parameters(), lr=3e-3)
STEPS = 1500
losses = []
t0 = time.time()
for step in range(STEPS):
    for g in opt.param_groups:
        g["lr"] = 3e-3 * min(1, (step + 1) / 100) * (0.1 + 0.9 * (1 - step / STEPS))   # warm up, then slow down
    x, y = get_batch(train_data)
    scores = model(x)
    loss = F.cross_entropy(scores.view(-1, scores.shape[-1]), y.view(-1))
    opt.zero_grad(); loss.backward(); opt.step()
    losses.append(loss.item())
    if step % 300 == 0 or step == STEPS - 1:
        print(f"step {step:4d}  loss {loss.item():.3f}  ({time.time() - t0:.0f}s)")
'''


def make_end_image(redo: bool) -> None:
    out = ROOT / IMG
    if out.exists() and not redo:
        return
    import matplotlib
    matplotlib.use("Agg")
    ns: dict = {}
    exec(textwrap.dedent(CODE_DATA), ns)
    exec("chars = sorted(set(text)); stoi = {c: i for i, c in enumerate(chars)}; itos = {i: c for c, i in stoi.items()}", ns)
    exec(textwrap.dedent(CODE_MODEL), ns)
    exec("data = torch.tensor([stoi[c] for c in text]); n = int(0.9 * len(data)); train_data, val_data = data[:n], data[n:]", ns)
    exec(textwrap.dedent(CODE_TRAIN), ns)
    torch = ns["torch"]
    torch.manual_seed(3)
    sample = ns["write"](ns["model"], "\n", 220, 0.8)
    plt = ns["plt"] if "plt" in ns else __import__("matplotlib.pyplot").pyplot
    phrase = "The king said that he"
    idx = torch.tensor([[ns["stoi"].get(c, 0) for c in phrase]])
    ns["model"].eval()
    with torch.no_grad():
        ns["model"](idx)
    w = ns["model"].blocks[1].heads[0].last_weights[0].numpy()
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 4.2), dpi=90, gridspec_kw={"width_ratios": [1.25, 1]})
    ax1.axis("off")
    lines = sample.strip("\n").split("\n")[:12]
    ax1.text(0, 1, "Text written by your model (trained about 2 minutes on a CPU):\n\n" + "\n".join(lines),
             va="top", family="monospace", fontsize=9.5, transform=ax1.transAxes)
    ax2.imshow(w, cmap="YlOrBr")
    ax2.set_xticks(range(len(phrase))); ax2.set_xticklabels(list(phrase), fontsize=8)
    ax2.set_yticks(range(len(phrase))); ax2.set_yticklabels(list(phrase), fontsize=8)
    ax2.set_title("One attention head: which earlier characters each character looks at", fontsize=9)
    fig.tight_layout()
    out.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(out, bbox_inches="tight")


def build(redo: bool = False) -> None:
    make_end_image(redo)
    nb = Notebook()
    nb.header(
        eyebrow="Field 3 · Language models · taste project",
        title="How does a model predict the next word?",
        path=PATH,
        question="How does a model predict the next word?",
        answer=("It learns, from a lot of text, how likely each possible next piece of text is, given what came before. "
                "Writing is repeating that: pick a likely next piece, add it, predict again."),
        build_text="""
            By the end you will have built:

            1. **A letter-pair counter** (a bigram model) that writes word-like gibberish.
            2. **A tiny transformer**, the same design as large language models, trained on a public-domain book. It writes new text in the book's style.
            3. **Pictures of attention**: which earlier characters the model looks at when it predicts the next one.
            4. **A byte-pair encoder**, the method that splits text into the tokens real models use.

            Running every cell takes about 5 minutes on a CPU.
        """,
        image=IMG,
    )
    nb.md("""
        ## How to use this notebook

        - Run each grey code cell with **Shift + Enter**, top to bottom.
        - 🤔 **Predict first** boxes ask you to guess before you run. The answer is one click away.
        - 🐍 **Python notes** explain Python as it comes up.
        - Exercise solutions are in collapsed cells. In Colab, double-click a solution's title to open it.
        - A GPU is not needed. (Runtime → Change runtime type → GPU would make training faster, but the code runs on CPU as written.)
    """)

    # ------------------------------------------------------------------ 1
    nb.md("""
        ## 1. The problem: what comes next?

        Type "th" on a phone and it suggests "the". **How can a program do that without understanding English?**

        It can learn from examples. Feed it a book. For every position, the next character is a free example of "what comes next".
        A 700,000-character book gives 700,000 examples.
    """)
    nb.code(CODE_DATA + '\nprint(text[:400])')
    nb.md("""
        🐍 **Python notes**
        - `for name, url in SOURCES:` unpacks each pair. `try:` / `except` tries the next source if a download fails.
        - `text[:400]` is the first 400 characters (**slicing** works on strings and lists).
        - `f"{len(text):,}"` prints a number with thousands separators.
    """)

    # ------------------------------------------------------------------ 2 tokens
    nb.md("""
        ## 2. Text as numbers

        A model works on numbers. So give every different character a number.
    """)
    nb.code('''
chars = sorted(set(text))                       # every different character, in order
stoi = {c: i for i, c in enumerate(chars)}      # character -> number
itos = {i: c for c, i in stoi.items()}          # number -> character
print(len(chars), "different characters:", repr("".join(chars)))
print("'hello' ->", [stoi[c] for c in "hello"])
''')
    nb.md("""
        🐍 **Python notes**
        - `set(text)` keeps one copy of each character; `sorted` puts them in order.
        - `{c: i for i, c in enumerate(chars)}` is a **dict comprehension**: it builds a dict in one line.
        - `repr(s)` shows a string with its quotes and escape codes, so you can see `\\n` (new line).

        **What it's called:** turning text into a list of numbers is **tokenisation**; each unit (here, one character) is a **token**. Section 7 shows the bigger tokens real models use.
    """)

    # ------------------------------------------------------------------ 3 bigram counts
    nb.md("""
        ## 3. The simplest predictor: count pairs

        For every character, count which character comes next. Then the chance of each next character is its count divided by the row total.
    """)
    nb.code('''
import numpy as np
import matplotlib.pyplot as plt

V = len(chars)
counts = np.zeros((V, V))
for a, b in zip(text, text[1:]):
    counts[stoi[a], stoi[b]] += 1

probs = (counts + 1) / (counts + 1).sum(axis=1, keepdims=True)    # +1 so nothing is impossible

def top_next(c, k=5):
    row = probs[stoi[c]]
    best = np.argsort(row)[::-1][:k]
    return [(itos[i], round(float(row[i]), 3)) for i in best]

print("after 't':", top_next("t"))
print("after 'q':", top_next("q"))
''')
    nb.md("""
        🐍 **Python notes**
        - `zip(text, text[1:])` pairs each character with the next one.
        - `counts.sum(axis=1, keepdims=True)` adds along each row and keeps the shape, so dividing gives row-by-row probabilities. numpy stretches the column of totals across each row; that stretching is called **broadcasting**.
        - `np.argsort(row)[::-1]` lists positions from largest to smallest.
    """)
    nb.predict(
        "This model only looks one character back. **If you let it write, what will come out?**",
        "**Word-like gibberish.** Pairs look right, nothing longer holds together. Run the next cell.",
    )
    nb.code('''
rng = np.random.default_rng(0)
def bigram_write(start="T", length=250):
    out = start
    for _ in range(length):
        out += itos[rng.choice(V, p=probs[stoi[out[-1]]])]
    return out
print(bigram_write())
''')
    nb.md("""
        **How good is it?** Measure it on text the model didn't count. For each character, take the probability the model gave the character that really came next, and average $-\\log$ of it.
        Lower is better. Guessing uniformly among all characters would score $\\log(V)$.
    """)
    nb.code('''
n = int(0.9 * len(text))
held_out = text[n:n + 50_000]
nll = -np.mean([np.log(probs[stoi[a], stoi[b]]) for a, b in zip(held_out, held_out[1:])])
print(f"bigram loss on unseen text: {nll:.3f}    uniform guessing: {np.log(V):.3f}")
''')
    nb.md("""
        **What it's called:** this score is the **cross-entropy loss** (average negative log-probability of what really happened).
        Counting pairs is a **bigram model**. Predicting what comes next, one token at a time, is **next-token prediction**: the job of every language model.
    """)

    # ------------------------------------------------------------------ 4 attention
    nb.md("""
        ## 4. Looking further back: attention

        To do better, each position needs information from **earlier** positions, and it must choose **which** ones matter.
        After "The king said that h", the "h" should look back at "said that" more than at "The".

        Here is the mechanism, one step at a time:

        1. Every position gets a list of numbers describing it (an **embedding**).
        2. From it, each position makes three lists: a **query** ("what am I looking for?"), a **key** ("what do I contain?") and a **value** ("what do I pass on?").
        3. Score every earlier position: query · key, a **dot product**. A big score means a good match.
        4. Turn the scores into weights that add up to 1 (**softmax**), and take the weighted average of the values.
        5. Positions may only look backwards: scores for later positions are set to $-\\infty$, so their weight is 0.
    """)
    nb.code('''
import torch
import torch.nn.functional as F
torch.manual_seed(0)

T, D = 5, 4                                   # 5 positions, 4 numbers each
x = torch.randn(T, D)                         # pretend embeddings
Wq, Wk, Wv = torch.randn(D, D), torch.randn(D, D), torch.randn(D, D)
q, k, v = x @ Wq, x @ Wk, x @ Wv

scores = q @ k.T / D ** 0.5                   # every query against every key
mask = torch.tril(torch.ones(T, T))           # 1 on and below the diagonal: "earlier or same"
scores = scores.masked_fill(mask == 0, float("-inf"))
weights = F.softmax(scores, dim=-1)
print("attention weights (row = position looking, column = position looked at):")
print(weights.numpy().round(2))
out = weights @ v
''')
    nb.md("""
        🐍 **Python notes**
        - `@` is matrix multiplication. `q @ k.T` compares every query with every key in one step: a 5 × 5 grid of dot products.
        - `torch.tril` keeps the lower triangle of a matrix ("tri-lower").

        **What you see:** each row adds up to 1, and everything above the diagonal is 0: no position looks ahead. Row 0 can only look at itself.

        **What it's called:** this is **self-attention**; one set of query/key/value weights is one **attention head**. The formula:

        $$\\text{Attention}(Q, K, V) = \\text{softmax}\\!\\left(\\frac{QK^\\top}{\\sqrt{d}}\\right) V$$

        Dividing by $\\sqrt{d}$ keeps the scores from growing with the list length, so the softmax doesn't become all-or-nothing.

        ### Check it against PyTorch's built-in version
    """)
    nb.code('''
lib = F.scaled_dot_product_attention(q[None], k[None], v[None], is_causal=True)[0]
print("largest difference from your version:", float((lib - out).abs().max()))
''')

    # ------------------------------------------------------------------ 5 transformer
    nb.md("""
        ## 5. A tiny transformer

        A **transformer** stacks blocks. Each block:

        1. lets every position look back with several attention heads at once (**multi-head attention**), then
        2. passes each position through a small network on its own (an **MLP**).

        Each step *adds* to the position's numbers instead of replacing them (a **residual connection**), and **layer norm** keeps the numbers at a steady size.
        The last layer turns each position's numbers into one score per character: the prediction for the next character.
    """)
    nb.code(CODE_MODEL + '''
data = torch.tensor([stoi[c] for c in text])
n = int(0.9 * len(data))
train_data, val_data = data[:n], data[n:]
x, y = get_batch(train_data, batch=2)
print("input :", repr("".join(itos[int(i)] for i in x[0][:30])))
print("target:", repr("".join(itos[int(i)] for i in y[0][:30])), " (the same text, shifted one character)")
''')
    nb.md("""
        🐍 **Python notes**
        - `class Head(nn.Module)` builds on PyTorch's module class; layers created in `__init__` are tracked, so the optimiser finds their weights.
        - `nn.Embedding(vocab, EMBD)` is a table with one row of `EMBD` numbers per character.
        - `nn.Sequential(*[Block() for _ in range(LAYERS)])`: the `*` spreads the list into separate arguments.

        Each training example predicts **every** next character in a 64-character window at once: 64 examples for the price of one.
    """)
    nb.predict(
        "The bigram model scored about 2.5. **What loss do you expect after a few minutes of training the transformer?**",
        "Around **1.6–1.8** on this data: it can now use up to 64 characters of context. Lower loss means it gives the true next character a higher probability.",
    )
    nb.code(CODE_TRAIN + '''
model.eval()
with torch.no_grad():
    vx, vy = get_batch(val_data, batch=200)
    vs = model(vx)
    val_loss = F.cross_entropy(vs.view(-1, vs.shape[-1]), vy.view(-1)).item()
model.train()
print(f"\\nloss on unseen text: transformer {val_loss:.3f}   bigram {nll:.3f}")
''')
    nb.code('''
plt.figure(figsize=(7, 3))
plt.plot(np.convolve(losses, np.ones(25) / 25, mode="valid"))
plt.axhline(nll, color="#888", ls="--", label="bigram model")
plt.xlabel("training step"); plt.ylabel("loss"); plt.legend(); plt.title("The transformer passes the bigram model within a few hundred steps")
plt.show()

torch.manual_seed(1)
print(write(model, "\\n", length=500))
''')

    # ------------------------------------------------------------------ 6 temperature + attention
    nb.md("""
        ## 6. Bold or safe? Temperature

        To write, the model picks the next character at random, in proportion to its probabilities.
        Dividing the scores by a **temperature** before softmax changes how bold the picks are.
    """)
    nb.predict(
        "**What happens at temperature 0.2? At 2.0?**",
        "At **0.2**, the top choice nearly always wins: safe, repetitive text that loops on common words. At **2.0**, unlikely characters get picked often: rambling, misspelled text.",
    )
    nb.code('''
for t in (0.2, 0.8, 2.0):
    torch.manual_seed(2)
    print(f"--- temperature {t} ---")
    print(write(model, "The ", length=200, temperature=t), "\\n")
''')
    nb.md("""
        ### What does each head look at?

        Each row of a heatmap is one character in the phrase; bright squares are the earlier characters it gives most weight to.
    """)
    nb.code('''
phrase = "The king said that he would"
idx = torch.tensor([[stoi.get(c, 0) for c in phrase]])
model.eval()
with torch.no_grad():
    model(idx)
model.train()

fig, axes = plt.subplots(LAYERS, HEADS, figsize=(14, 3.2 * LAYERS))
for L in range(LAYERS):
    for H in range(HEADS):
        ax = axes[L][H]
        ax.imshow(model.blocks[L].heads[H].last_weights[0].numpy(), cmap="YlOrBr")
        ax.set_xticks(range(len(phrase))); ax.set_xticklabels(list(phrase), fontsize=7)
        ax.set_yticks(range(len(phrase))); ax.set_yticklabels(list(phrase), fontsize=7)
        ax.set_title(f"layer {L + 1}, head {H + 1}", fontsize=9)
plt.tight_layout(); plt.show()
''')
    nb.md("""
        **What you see:** heads differ. Some look mostly at the character directly before (a bright stripe directly left of the diagonal). Some look back to the last space or the start of the word.
        Nobody programmed these patterns; they came from training. Working out what heads like these do is the job of [interpretability](https://transformer-circuits.pub/), Field 4.
    """)

    # ------------------------------------------------------------------ 7 BPE
    nb.md("""
        ## 7. Bigger tokens: byte-pair encoding

        Real models don't use single characters: sequences would be long and each step would carry little meaning.
        They use pieces of words, found by a **greedy** rule:

        1. Start with single characters.
        2. Find the most common **pair** of neighbouring tokens. Merge it into one new token.
        3. Repeat.
    """)
    nb.code('''
from collections import Counter

def bpe(words, merges=20):
    seqs = [list(w) for w in words]
    learned = []
    for _ in range(merges):
        pairs = Counter()
        for s in seqs:
            for a, b in zip(s, s[1:]):
                pairs[(a, b)] += 1
        if not pairs:
            break
        (a, b), count = pairs.most_common(1)[0]
        learned.append((a + b, count))
        for s in seqs:                                  # replace the pair everywhere
            i = 0
            while i < len(s) - 1:
                if s[i] == a and s[i + 1] == b:
                    s[i:i + 2] = [a + b]
                else:
                    i += 1
    return learned, seqs

sample_words = text[:60_000].lower().split()
learned, seqs = bpe(sample_words, merges=25)
print("merges, in order:", [m for m, _ in learned])
long_words = [w for w in dict.fromkeys(sample_words) if len(w) >= 8 and w.isalpha()][:5]
for w in long_words:
    print(f"{w!r} becomes:", seqs[sample_words.index(w)])
''')
    nb.md("""
        🐍 `Counter` (from `collections`) is a dict that counts: `pairs[(a, b)] += 1` works without setting a starting value, and `most_common(1)` returns the top entry.

        **What you see:** early merges are common pairs like "th", "he", "in"; later ones become whole short words. Each step takes the best-looking merge right now without planning ahead: a **greedy algorithm**. Counting pairs uses a **hash map** (the `Counter`).
    """)

    # ------------------------------------------------------------------ practice
    nb.md("## Practice\n\nTry each one before opening its solution.")
    nb.exercise(
        1,
        "By hand: scores for three characters are 2, 1 and 0. **What are the probabilities at temperature 1? At temperature 0.5?**",
        None,
        solution_md="Temperature 1: $e^2, e^1, e^0 = 7.39, 2.72, 1$; total 11.11 → **67%, 24%, 9%**. "
                    "Temperature 0.5 doubles the scores to 4, 2, 0: $54.6, 7.39, 1$; total 63.0 → **87%, 12%, 2%**. Lower temperature sharpens the choice.",
    )
    nb.exercise(
        2,
        "Write a function `most_likely_after(context)` that returns the transformer's 5 most likely next characters (with probabilities) after any string. Try the start of a word that is common in your book, like `\"The ki\"` or `\"my lo\"`.",
        "def most_likely_after(context):\n    ...\n",
        solution_src="""
            @torch.no_grad()
            def most_likely_after(context, k=5):
                model.eval()
                idx = torch.tensor([[stoi.get(c, 0) for c in context[-BLOCK:]]])
                p = F.softmax(model(idx)[0, -1], dim=-1)
                top = torch.topk(p, k)
                model.train()
                return [(itos[int(i)], round(float(v), 3)) for v, i in zip(top.values, top.indices)]

            for ctx in ["The ki", "my lo", "What "]:
                print(repr(ctx), most_likely_after(ctx))
        """,
    )
    nb.exercise(
        3,
        "The model can only look back 64 characters. **Find a way to show that limit in its writing**, for example a name that is introduced and then forgotten.",
        "# your experiment here\n",
        solution_md="One way: start writing from a prompt that names someone, generate 400 characters, and check whether the name comes back after more than 64 characters. "
                    "Then set `BLOCK = 16`, retrain, and compare. A shorter window makes the text lose track of who and what it is about sooner.",
    )

    nb.cue([
        ("\"predict what comes next in a sequence\"", "next-token prediction, trained with cross-entropy"),
        ("\"each item should use information from the relevant earlier items\"", "attention: queries, keys, values"),
        ("\"output too repetitive, or too random\"", "change the sampling temperature"),
        ("\"merge the most frequent pair, repeat\"", "a greedy algorithm (byte-pair encoding) with a hash map of counts"),
    ])
    nb.footer(
        experiments=[
            "**One layer, one head.** Set `LAYERS = 1` and `HEADS = 1`, retrain, and compare the loss and the writing.",
            "**A different book.** Swap the first URL in `SOURCES` for another public-domain text on Project Gutenberg. Does the style follow?",
            "**Shorter memory.** Set `BLOCK = 8`. How much worse is the loss? What does the text lose?",
        ],
        questions=[
            "How do models reason over many steps?",
            "Why do they sometimes make things up? (Your model invents words and names that look right: the same effect, small.)",
        ],
        field_name="Language models",
    )
    nb.md("""
        ## Go deeper

        - Andrej Karpathy, *Let's build GPT: from scratch, in code* (about 2 hours; builds a model like this one, step by step): https://www.youtube.com/watch?v=kCc8FmEb1nY
        - The site's showpiece *A tiny language model you can see inside* runs a bigger version of this model in your browser.
        - At Monash: FIT5217 Natural language processing.
    """)
    print("wrote", nb.save(PATH))


if __name__ == "__main__":
    build(redo="--redo" in sys.argv)

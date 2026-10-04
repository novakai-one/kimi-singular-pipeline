"""Generates notebooks/fields/04_interpretability.ipynb

    python3 notebooks/src/f04_interpretability.py [--redo]
"""
import sys
import textwrap
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))
from nb import Notebook  # noqa: E402

PATH = "notebooks/fields/04_interpretability.ipynb"
IMG = "notebooks/images/f04_end.png"

CODE_SETUP = '''
import numpy as np
import matplotlib.pyplot as plt
import torch
import torch.nn as nn
import torch.nn.functional as F
import torchvision

torch.manual_seed(0)
try:
    tr = torchvision.datasets.MNIST("data", train=True, download=True)
    te = torchvision.datasets.MNIST("data", train=False, download=True)
    X, y = tr.data.float().div(255).flatten(1), tr.targets
    Xt, yt = te.data.float().div(255).flatten(1), te.targets
    SIDE = 28
except Exception as e:
    print("MNIST download failed, using scikit-learn's 8x8 digits:", e)
    from sklearn.datasets import load_digits
    d = load_digits()
    allX, ally = torch.tensor(d.data / 16, dtype=torch.float32), torch.tensor(d.target)
    X, y, Xt, yt = allX[:1400], ally[:1400], allX[1400:], ally[1400:]
    SIDE = 8

model = nn.Sequential(nn.Linear(SIDE * SIDE, 64), nn.ReLU(), nn.Linear(64, 10))
opt = torch.optim.Adam(model.parameters(), lr=1e-3)
for epoch in range(3):
    order = torch.randperm(len(X))
    for i in range(0, len(X), 128):
        b = order[i:i + 128]
        loss = F.cross_entropy(model(X[b]), y[b])
        opt.zero_grad(); loss.backward(); opt.step()
with torch.no_grad():
    acc = (model(Xt).argmax(1) == yt).float().mean().item()
print(f"test accuracy: {acc:.1%}")
'''

CODE_HOOK = '''
captured = {}
def save_hidden(module, inputs, output):
    captured["hidden"] = output.detach()

hook = model[1].register_forward_hook(save_hidden)     # model[1] is the ReLU after the first layer
with torch.no_grad():
    model(Xt)
hook.remove()
H = captured["hidden"].numpy()                          # one row of 64 numbers per test digit
labels = yt.numpy()
'''

CODE_PROBE = '''
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split

keep = is_round | is_straight
Htr, Hte, ytr, yte = train_test_split(H[keep], is_round[keep], test_size=0.3, random_state=0)
probe = LogisticRegression(max_iter=2000).fit(Htr, ytr)
w = probe.coef_[0] / np.linalg.norm(probe.coef_[0])      # the probe's direction, length 1
'''

CODE_DIRECTION = '''
ROUND, STRAIGHT = [0, 6, 8, 9], [1, 4, 7]
is_round = np.isin(labels, ROUND)
is_straight = np.isin(labels, STRAIGHT)

direction = H[is_round].mean(0) - H[is_straight].mean(0)    # from the average straight digit to the average round one
direction /= np.linalg.norm(direction)                       # length 1
shadow = H @ direction                                       # every digit's position along the direction
'''


def make_end_image(redo: bool) -> None:
    out = ROOT / IMG
    if out.exists() and not redo:
        return
    import matplotlib
    matplotlib.use("Agg")
    import os
    cwd = os.getcwd()
    os.chdir(ROOT / "training")                     # so MNIST is read from training/data
    ns: dict = {}
    try:
        for code in (CODE_SETUP, CODE_HOOK, CODE_DIRECTION):
            exec(textwrap.dedent(code), ns)
    finally:
        os.chdir(cwd)
    np, plt, torch, F = ns["np"], ns["plt"], ns["torch"], ns["F"]
    exec(textwrap.dedent(CODE_PROBE), ns)
    fig, axes = plt.subplots(1, 2, figsize=(12, 3.4), dpi=90)
    H, w = ns["H"], ns["w"]
    sh, r, st = H @ w, ns["is_round"], ns["is_straight"]
    bins = np.linspace(sh.min(), sh.max(), 50)
    axes[0].hist(sh[st], bins, color="#2563d6", alpha=0.7, label="straight digits: 1 4 7")
    axes[0].hist(sh[r], bins, color="#e0a100", alpha=0.7, label="round digits: 0 6 8 9")
    axes[0].legend(); axes[0].set_title("Every test digit's position along a learned 'round' direction", fontsize=10)
    model, Xt, labels = ns["model"], ns["Xt"], ns["labels"]
    k = int(np.flatnonzero(labels == 1)[0])
    d = torch.tensor(w, dtype=torch.float32)
    alphas = np.linspace(0, 30, 31)
    probs = []
    with torch.no_grad():
        h = F.relu(model[0](Xt[k:k + 1]))
        for a in alphas:
            probs.append(F.softmax(model[2](h + a * d), dim=1)[0].numpy())
    probs = np.array(probs)
    for digit, col in [(1, "#2563d6"), (8, "#d03a3a"), (9, "#e0a100"), (0, "#188a4a")]:
        axes[1].plot(alphas, probs[:, digit], label=f"probability of {digit}", color=col)
    axes[1].set_xlabel("how far the '1' is pushed along the direction"); axes[1].legend(fontsize=8)
    axes[1].set_title("Push a '1' along that direction: the model's answer changes", fontsize=10)
    fig.tight_layout()
    out.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(out, bbox_inches="tight")


def build(redo: bool = False) -> None:
    make_end_image(redo)
    nb = Notebook()
    nb.header(
        eyebrow="Field 4 · Looking inside models · taste project",
        title="What is a trained model actually doing inside?",
        path=PATH,
        question="What is a trained model actually doing inside?",
        answer=("Its insides are lists of numbers, one list per layer. Many ideas the model uses turn out to be directions in those lists. "
                "You can find a direction, measure it, and push along it to change what the model does."),
        build_text="""
            By the end you will have:

            1. **Read the numbers inside a trained network** with a PyTorch hook.
            2. **Found a direction** in those numbers that means "this digit is round" (left, below).
            3. **Pushed a "1" along it** and watched the network's answer change (right, below).
            4. **Seen superposition**: a tiny network storing five ideas in two numbers.

            This field is applied linear algebra: vectors, dot products, projections, eigenvectors. Running every cell takes under a minute.
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

    # ------------------------------------------------------------------ 1
    nb.md("""
        ## 1. The problem: a network that works, but nobody knows how

        Here is a small network that reads handwritten digits. It is about 95% accurate.
        Inside, it turns every image into **64 numbers**, then turns those into 10 scores.

        Nobody told it which features to use. **Does it track an idea like "this digit is round"? Where? How would you check?**
        Questions like this, asked about large models, are how researchers check what a model is doing before trusting it.
    """)
    nb.code(CODE_SETUP)
    nb.md("""
        🐍 **Python notes**
        - `nn.Sequential(a, b, c)` chains layers. `model[1]` is the second one (the ReLU).
        - `.flatten(1)` turns each 28 × 28 image into one row of 784 numbers.
    """)

    # ------------------------------------------------------------------ 2 hooks
    nb.md("""
        ## 2. Read the numbers inside

        A **hook** is a function PyTorch calls every time a layer runs. It receives the layer's output, so you can copy it out.
    """)
    nb.code(CODE_HOOK + '''
print("inside numbers:", H.shape, "  (test digits x 64)")
print("digit", labels[0], "looks like this inside:")
print(np.round(H[0], 2))
''')
    nb.md("""
        🐍 **Python notes**
        - `register_forward_hook(fn)` attaches `fn` to a layer; it returns a handle, and `hook.remove()` detaches it.
        - `captured` is a dict defined outside the function; the hook writes into it. (A function can change a dict it can see, without `global`.)

        **What it's called:** these 64 numbers are the layer's **activations**. Each test digit is now a point in a 64-dimensional space: a **vector**.
    """)

    # ------------------------------------------------------------------ 3 neurons vs directions
    nb.md("""
        ## 3. Is there a "round" neuron?

        The simplest guess: one of the 64 numbers means "round". Test each one: how well does it alone sort round digits (0, 6, 8, 9) from straight ones (1, 4, 7)?

        Then try a **direction**: take the average round digit's 64 numbers and subtract the average straight digit's. That arrow points "from straight toward round". Scale it to length 1.
    """)
    nb.code(CODE_DIRECTION + '''
def best_cut(values, positive):
    """Best accuracy from one threshold on these values, either way round."""
    order = np.argsort(values)
    v, p = values[order], positive[order]
    keep = np.isin(labels[order], ROUND + STRAIGHT)
    v, p = v[keep], p[keep]
    pos_below = np.concatenate([[0], np.cumsum(p)])
    neg_below = np.concatenate([[0], np.cumsum(~p)])
    acc = (neg_below + (p.sum() - pos_below)) / len(p)      # cut: below = straight, above = round
    return max(acc.max(), 1 - acc.min())

single = [best_cut(H[:, j], is_round) for j in range(64)]
print(f"best single neuron: number {int(np.argmax(single))}, accuracy {max(single):.1%}")
print(f"average-difference direction: accuracy {best_cut(shadow, is_round):.1%}")
''')
    nb.md("""
        Each digit's position along the direction is a **dot product**:

        $$\\cy{\\text{shadow}} = \\cg{\\mathbf{h}} \\cdot \\cr{\\mathbf{d}} = h_1 d_1 + h_2 d_2 + \\dots + h_{64} d_{64}$$

        **What it's called:** that number is the **projection** of $\\mathbf{h}$ onto $\\mathbf{d}$: where its shadow falls on the line through $\\mathbf{d}$.

        **What you see:** the direction barely beats the best single neuron. Something is wrong with it. Section 5 finds out what.
    """)

    # ------------------------------------------------------------------ 4 PCA
    nb.md("""
        ## 4. Looking at 64 dimensions on a flat page

        You can't plot 64 numbers. Find the two directions along which the points spread out the most, and draw each point's shadow on those two.

        Those directions are the top **eigenvectors** of the activations' **covariance matrix** (a 64 × 64 table of how each pair of numbers varies together). Your linear algebra course covers eigenvectors; here is one use.
    """)
    nb.code('''
Hc = H - H.mean(0)                          # move the centre of the cloud to the origin
cov = Hc.T @ Hc / len(Hc)                   # 64 x 64 covariance matrix
vals, vecs = np.linalg.eigh(cov)            # eigenvalues in increasing order
top2 = vecs[:, -2:][:, ::-1]                # the two with the biggest eigenvalues
xy = Hc @ top2
print(f"share of the spread these two directions capture: {vals[-2:].sum() / vals.sum():.1%}")

plt.figure(figsize=(6.5, 5.5))
for d in range(10):
    m = labels == d
    plt.scatter(xy[m, 0], xy[m, 1], s=3, label=str(d))
    plt.text(*np.median(xy[m], 0), str(d), fontsize=16, weight="bold")
plt.title("Test digits on the two directions of greatest spread (PCA)"); plt.xticks([]); plt.yticks([])
plt.show()
''')
    nb.md("""
        🐍 `np.linalg.eigh` finds eigenvalues and eigenvectors of a symmetric matrix. `vecs[:, -2:][:, ::-1]` takes the last two columns, biggest first.

        **What it's called:** this is **PCA** (principal component analysis). An **eigenvector** of the covariance matrix is a direction the matrix only stretches; its **eigenvalue** says by how much, which here equals the spread of the data along it.
    """)

    # ------------------------------------------------------------------ 5 confound + probe
    nb.md("""
        ## 5. What did the first direction really measure?

        Round digits have loops; straight ones are thin strokes. So round digits also have **more ink**.
        An average-difference direction picks up **every** way the two groups differ, ink included.

        Test it: build a "lots of ink versus little ink" direction the same way, and measure the angle between the two directions.
        For two length-1 arrows, the dot product is the cosine of the angle between them.
    """)
    nb.code('''
ink = Xt.sum(1).numpy()
print(f"average ink: round digits {ink[is_round].mean():.0f}, straight digits {ink[is_straight].mean():.0f}")

thick, thin = ink > np.percentile(ink, 67), ink < np.percentile(ink, 33)
ink_dir = H[thick].mean(0) - H[thin].mean(0)
ink_dir /= np.linalg.norm(ink_dir)

def angle(a, b):
    return float(np.degrees(np.arccos(np.clip(abs(a @ b), -1, 1))))
print(f"angle between the 'round' direction and the 'ink' direction: {angle(direction, ink_dir):.0f} degrees")
''')
    nb.md("""
        **What you see:** round digits carry about 40% more ink, and the two directions are only about 30° apart. The first direction was **mostly measuring ink**.
        A hidden second difference like this is a **confound**. Spotting confounds is a large part of interpretability research.

        ### A better direction: train a probe

        A **probe** is a small model trained to read one idea out of activations. Logistic regression (from scikit-learn) finds the direction that best separates the two groups, so it learns to ignore differences, like ink, that don't help.
        Train it on 70% of the digits and test it on the other 30% (a **train/test split**).
    """)
    nb.code(CODE_PROBE + '''
print(f"probe accuracy on held-out digits: {probe.score(Hte, yte):.1%}")
print(f"angle between the probe and the 'ink' direction: {angle(w, ink_dir):.0f} degrees")
''')
    nb.md("""
        **What you see:** the probe is far more accurate, and it is almost at right angles to the ink direction: it measures roundness, not ink.
    """)
    nb.predict(
        "The digits 2, 3 and 5 were not used to train the probe. **Where will they land along its direction: with the round digits, with the straight ones, or in between?**",
        "**In between.** 3 and 5 have curves; 2 has a curve and a straight base. Look at the grey bars below.",
    )
    nb.code('''
probe_shadow = H @ w
bins = np.linspace(probe_shadow.min(), probe_shadow.max(), 50)
other = ~(is_round | is_straight)
plt.figure(figsize=(8, 3))
plt.hist(probe_shadow[is_straight], bins, color="#2563d6", alpha=0.7, label="straight: 1 4 7")
plt.hist(probe_shadow[is_round], bins, color="#e0a100", alpha=0.7, label="round: 0 6 8 9")
plt.hist(probe_shadow[other], bins, color="#999", alpha=0.4, label="not used: 2 3 5")
plt.legend(); plt.xlabel("position along the probe's 'round' direction"); plt.title("One dot product per digit")
plt.show()
''')

    # ------------------------------------------------------------------ 6 steering
    nb.md("""
        ## 6. Push along the direction

        If the probe's direction really means "round" **to the model**, then moving a digit's 64 numbers along it should change the model's answer toward round digits.

        Take a "1". Compute its 64 numbers. Add $\\alpha \\times$ the direction, for growing $\\alpha$. Feed the result to the last layer.
    """)
    nb.code('''
d = torch.tensor(w, dtype=torch.float32)
k = int(np.flatnonzero(labels == 1)[0])
alphas = np.linspace(0, 30, 31)

def push(direction_vec, alphas, k):
    out = []
    with torch.no_grad():
        h = F.relu(model[0](Xt[k:k + 1]))
        for a in alphas:
            out.append(F.softmax(model[2](h + a * direction_vec), dim=1)[0].numpy())
    return np.array(out)

probs = push(d, alphas, k)
fig, axes = plt.subplots(1, 2, figsize=(12, 3.4), gridspec_kw={"width_ratios": [1, 3]})
axes[0].imshow(Xt[k].reshape(SIDE, SIDE), cmap="gray_r"); axes[0].set_title("the digit"); axes[0].axis("off")
for digit in range(10):
    axes[1].plot(alphas, probs[:, digit], label=str(digit), lw=2.5 if digit in (1, 0, 6, 8, 9) else 1)
axes[1].set_xlabel("alpha: how far it is pushed along the 'round' direction"); axes[1].set_ylabel("probability")
axes[1].legend(ncol=5, fontsize=8); plt.show()
top = probs[-1].argmax()
print(f"at alpha = 0 the model says 1 ({probs[0, 1]:.0%}); at alpha = 30 it says {top} ({probs[-1, top]:.0%})")
''')
    nb.md("""
        **What it's called:** changing a model's behaviour by adding a direction to its activations is **steering**.

        ### Careful measurement: is it the direction, or any push?

        A fair test needs a **control**. Push 50 different "1"s by the same amount along **random** directions of length 1. Count how often the answer becomes a round digit.
    """)
    nb.code('''
ones = np.flatnonzero(labels == 1)[:50]
with torch.no_grad():
    hs = F.relu(model[0](Xt[ones]))
    pushed = model[2](hs + 20 * d).argmax(1).numpy()
rng = np.random.default_rng(0)
random_round = []
for trial in range(20):
    r = rng.normal(size=64); r /= np.linalg.norm(r)
    with torch.no_grad():
        ans = model[2](hs + 20 * torch.tensor(r, dtype=torch.float32)).argmax(1).numpy()
    random_round.append(np.isin(ans, ROUND).mean())
print(f"pushed along the probe direction: {np.isin(pushed, ROUND).mean():.0%} become round digits")
print(f"pushed along random directions:   {np.mean(random_round):.0%} become round digits (average of 20 directions)")
''')
    nb.md("""
        **What you see:** along the probe's direction, almost every "1" becomes a round digit. Random pushes of the same size rarely do. The direction is special.
        Checking against a control like this is basic **experiment design**, and the core habit of the field.
    """)

    # ------------------------------------------------------------------ 7 superposition
    nb.md("""
        ## 7. More ideas than numbers: superposition

        The digit network has 64 numbers but may track more than 64 ideas. How can that work?

        A small experiment: five features, each usually 0 and occasionally on. Squeeze them through **two** numbers and back out, and train the squeeze to keep as much as possible.
    """)
    nb.predict(
        "Two numbers can hold two independent directions at right angles. **With five rarely-on features, how many will the trained squeeze keep?**",
        "**All five**, as five directions spread around a circle (like a pentagon). They overlap, but because features are rarely on at the same time, the overlap rarely causes errors. Run the next cell.",
    )
    nb.code('''
torch.manual_seed(1)
N_FEAT, N_DIM, P_ON = 5, 2, 0.05
Wsq = nn.Parameter(torch.randn(N_DIM, N_FEAT) * 0.5)
bias = nn.Parameter(torch.zeros(N_FEAT))
opt = torch.optim.Adam([Wsq, bias], lr=0.02)
for step in range(4000):
    x = torch.rand(1024, N_FEAT) * (torch.rand(1024, N_FEAT) < P_ON)    # sparse: each feature on 5% of the time
    out = F.relu(x @ Wsq.T @ Wsq + bias)                                  # squeeze to 2 numbers, expand back to 5
    loss = ((out - x) ** 2).mean()
    opt.zero_grad(); loss.backward(); opt.step()

cols = Wsq.detach().numpy()
plt.figure(figsize=(4.5, 4.5))
for j in range(N_FEAT):
    plt.arrow(0, 0, cols[0, j], cols[1, j], width=0.02, color="#d03a3a", length_includes_head=True)
    plt.text(cols[0, j] * 1.15, cols[1, j] * 1.15, f"feature {j + 1}", ha="center")
lim = np.abs(cols).max() * 1.4
plt.xlim(-lim, lim); plt.ylim(-lim, lim); plt.gca().set_aspect("equal")
plt.title("Five features stored as five directions in 2 numbers"); plt.show()
print("lengths of the five feature arrows:", np.round(np.linalg.norm(cols, axis=0), 2))
''')
    nb.md("""
        **What you see:** the five arrows spread around the circle, each with a similar length: all five features survive in two numbers.

        **What it's called:** storing more features than dimensions, as overlapping directions, is **superposition**. It is why single neurons in big models often respond to several unrelated things, and why researchers look for directions instead of neurons.
    """)

    # ------------------------------------------------------------------ practice
    nb.md("## Practice\n\nTry each one before opening its solution.")
    nb.exercise(
        1,
        "By hand: $\\mathbf{h} = (3, 1)$ and $\\mathbf{d} = (0.6, 0.8)$ (length 1). **Where does $\\mathbf{h}$'s shadow fall along $\\mathbf{d}$? Which lands further along: (1, 2) or (2, 1)?**",
        None,
        solution_md="$3 \\times 0.6 + 1 \\times 0.8 = 2.6$. For (1, 2): $0.6 + 1.6 = 2.2$. For (2, 1): $1.2 + 0.8 = 2.0$. So (1, 2) lands further along.",
    )
    nb.exercise(
        2,
        "Train a probe for **\"is it a 7?\"** (7 against every other digit). Push a \"1\" along its direction. "
        "**What does the model say, and at what push size does it change?**",
        "# your code here\n",
        solution_src="""
            is7 = labels == 7
            Htr7, Hte7, ytr7, yte7 = train_test_split(H, is7, test_size=0.3, random_state=0)
            probe7 = LogisticRegression(max_iter=2000).fit(Htr7, ytr7)
            w7 = probe7.coef_[0] / np.linalg.norm(probe7.coef_[0])
            print(f"probe accuracy: {probe7.score(Hte7, yte7):.1%}")
            p7 = push(torch.tensor(w7, dtype=torch.float32), alphas, k)
            for a, row in zip(alphas[::5], p7[::5]):
                print(f"alpha {a:4.0f}: says {row.argmax()} ({row.max():.0%})")
        """,
    )
    nb.exercise(
        3,
        "Steer the other way: start from a **0** and push along **minus** the round direction. **What does the model say as you push further?**",
        "# your code here\n",
        solution_src="""
            k0 = int(np.flatnonzero(labels == 0)[0])
            p = push(-d, alphas, k0)
            for a, row in zip(alphas[::4], p[::4]):
                print(f"alpha {a:5.1f}: says {row.argmax()} ({row.max():.0%})")
        """,
    )
    nb.cue([
        ("\"does the model represent X?\"", "train a probe on activations, and test it on held-out examples"),
        ("\"how much does this vector point along that one?\"", "a dot product (projection onto a length-1 vector)"),
        ("\"too many dimensions to look at\"", "PCA: the top eigenvectors of the covariance matrix"),
        ("an effect from an intervention", "compare against a control (for example, random directions)"),
        ("two groups that differ in more than one way", "check for a confound before trusting a direction"),
    ])
    nb.footer(
        experiments=[
            "**A deeper network.** Add a second hidden layer and find the round direction in each layer. In which layer does it sort best?",
            "**Fewer neurons.** Train with 16 hidden numbers instead of 64. Does the round direction still exist?",
            "**More features.** In the superposition experiment, try 8 features and `P_ON = 0.3`. What happens to the arrows when features are often on together?",
        ],
        questions=[
            "Can we read a model's \"thoughts\" reliably?",
            "Can we check a model is safe by looking inside it?",
        ],
        field_name="Looking inside models",
    )
    nb.md("""
        ## Go deeper

        - ARENA interpretability curriculum (free exercises): https://github.com/callummcdougall/ARENA_3.0
        - transformer-circuits.pub (research articles on what is inside transformers): https://transformer-circuits.pub/
        - TransformerLens library (hooks for language models): https://github.com/TransformerLensOrg/TransformerLens
        - At Monash: builds on FIT5215 Deep learning; a strong candidate for research.
    """)
    print("wrote", nb.save(PATH))


if __name__ == "__main__":
    build(redo="--redo" in sys.argv)

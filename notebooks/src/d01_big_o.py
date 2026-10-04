"""Generates notebooks/dsa/01_big_o.ipynb (DSA topic 1: Big-O)

    python3 notebooks/src/d01_big_o.py
"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))
from nb import Notebook  # noqa: E402

PATH = "notebooks/dsa/01_big_o.ipynb"


def build() -> None:
    nb = Notebook()
    nb.header(
        eyebrow="DSA topic 1 · Big-O · practice notebook",
        title="How does the work grow as the input grows?",
        path=PATH,
        question="How does the work grow as the input grows?",
        answer=("Time a program at a few input sizes and watch the pattern. Doubling the input doubles some programs' "
                "time and quadruples others'. Big-O is the name for that pattern."),
        build_text="""
            In this notebook you will:

            1. **Count the steps** of three small loops.
            2. **Time three real programs** with `time.perf_counter` and plot time against the number of items.
            3. **Use the doubling ratio** to tell the programs apart, and to predict a million items.
            4. **Make a slow repeat check fast** with a set.
            5. **Solve 5 practice problems.** Each has checks you can run, and a solution one click away.

            Running every cell takes a few seconds. The site's *Big-O* page times the same three programs in your browser.
        """,
    )
    nb.md("""
        ## How to use this notebook

        - Run each grey code cell with **Shift + Enter**, top to bottom.
        - 🤔 **Predict first** boxes ask you to guess before you run. The answer is one click away.
        - 🐍 **Python notes** explain Python as it comes up.
        - Solutions are in collapsed cells. In Colab, double-click a solution's title to open it. Try first; open it when you're stuck.
    """)
    nb.check_setup()

    # ------------------------------------------------------------------ 1 count steps
    nb.md("""
        ## 1. How many steps does a loop take?

        Your code handles 1,000 items in a blink. **Will it still work on 1,000,000?**

        Before you time anything, count. Here are three loops. Each one adds 1 to `steps` once per turn.
        The first loop runs once per item. The second runs a loop inside a loop. The third halves `n` until 1 is left.
    """)
    nb.predict(
        "A loop inside a loop, both over n = 1,000 items. **How many steps? And for n = 2,000?**",
        "**1,000,000 and 4,000,000.** The inner loop makes 1,000 steps for each of the 1,000 outer turns: "
        "1,000 × 1,000. Doubling n doubles both loops, so the steps grow 2 × 2 = 4 times.",
    )
    nb.code('''
def steps_one_loop(n):
    steps = 0
    for i in range(n):
        steps += 1
    return steps

def steps_loop_in_loop(n):
    steps = 0
    for i in range(n):
        for j in range(n):
            steps += 1
    return steps

def steps_halving(n):
    steps = 0
    while n > 1:
        n = n // 2                    # whole-number division: 7 // 2 is 3
        steps += 1
    return steps

print(f"{'n':>6} {'one loop':>10} {'loop in loop':>14} {'halving':>8}")
for n in [10, 100, 1_000, 2_000]:
    print(f"{n:>6,} {steps_one_loop(n):>10,} {steps_loop_in_loop(n):>14,} {steps_halving(n):>8}")
''')
    nb.md("""
        🐍 **Python notes**
        - `range(n)` gives the whole numbers 0, 1, ..., n − 1. So `for i in range(n)` turns n times.
        - `steps += 1` is short for `steps = steps + 1`.
        - In an f-string, `{n:>6,}` prints `n` right-aligned in 6 characters, with commas: `1,000`.
        - `1_000` is the same as `1000`. The underscore only makes it easier to read.
    """)
    nb.md("""
        **What you see:** go from 1,000 to 2,000 items.
        One loop: 1,000 → 2,000 steps, **2 times**. Loop in loop: 1,000,000 → 4,000,000, **4 times**.
        Halving: 9 → 10 steps, **one more step**.

        The count depends on the shape of the loops, not on the computer. That is why you can predict it before you run anything.
    """)

    # ------------------------------------------------------------------ 2 timing
    nb.md("""
        ## 2. How long does it take? Time it

        Steps are exact, but the real question is time. Here are three real programs:

        - **one pass:** add up every number (one step per item);
        - **sorting:** Python's built-in `sorted`;
        - **every pair:** count the pairs of numbers closer than 0.001 (one step per pair).

        `time.perf_counter()` reads a clock in seconds. Read it before and after a call: the difference is the time the call took.

        Two details make the timing fair:
        - A very fast call (a few microseconds) is hard to time once. So `time_ms` repeats it until a run lasts at least 50 ms, then divides.
        - It does several runs and keeps **the fastest**. Other programs on your computer can only slow a run down,
          so the fastest run is the closest to the program's own time.
    """)
    nb.code('''
import random
import time

def time_ms(fn, data, repeats=5):
    """Milliseconds for one call of fn(data): the fastest of several runs."""
    calls = 1                                  # a fast call is repeated, so each run lasts at least 50 ms
    while True:
        start = time.perf_counter()
        for _ in range(calls):
            fn(data)
        if time.perf_counter() - start >= 0.05:
            break
        calls *= 2
    fastest = float("inf")
    for _ in range(repeats):
        start = time.perf_counter()
        for _ in range(calls):
            fn(data)
        fastest = min(fastest, (time.perf_counter() - start) / calls)
    return fastest * 1000

def one_pass(xs):                 # add up every number
    total = 0
    for x in xs:
        total += x
    return total

def sort_them(xs):                # Python's built-in sort
    return sorted(xs)

def every_pair(xs):               # count the pairs closer than 0.001
    count = 0
    n = len(xs)
    for i in range(n):
        for j in range(i + 1, n):
            if abs(xs[i] - xs[j]) < 0.001:
                count += 1
    return count

random.seed(1)
SIZES = [500, 1_000, 2_000, 4_000]
PROGRAMS = {"one pass": one_pass, "sorting": sort_them, "every pair": every_pair}
times = {name: [] for name in PROGRAMS}
for n in SIZES:
    xs = [random.random() for _ in range(n)]
    for name, fn in PROGRAMS.items():
        times[name].append(time_ms(fn, xs, repeats=3 if name == "every pair" else 5))

print(f"{'n':>6} " + "".join(f"{name + ' (ms)':>17}" for name in PROGRAMS))
for i, n in enumerate(SIZES):
    print(f"{n:>6,} " + "".join(f"{times[name][i]:>17.4f}" for name in PROGRAMS))
''')
    nb.md("""
        🐍 **Python notes**
        - `while True:` loops until a `break` stops it.
        - `float("inf")` is infinity. Any real time is smaller, so the first `min` replaces it.
        - `for _ in range(repeats)`: the name `_` says "I don't use this number".
        - `[random.random() for _ in range(n)]` is a **list comprehension**: a list of n random numbers from 0 to 1.
        - `{name: [] for name in PROGRAMS}` builds a dictionary the same way: one empty list per program name.
        - `PROGRAMS.items()` gives each (name, function) pair. `enumerate(SIZES)` gives each (position, size) pair.
    """)
    nb.md("""
        ### See it on a chart

        Left: plain axes, with evenly spaced grid lines. Right: each grid line up is 10 times the one below, and each step right doubles n.
    """)
    nb.code('''
import matplotlib.pyplot as plt

COLOURS = {"one pass": "#0b8a7f", "sorting": "#7442d6", "every pair": "#d03a3a"}
MARKERS = {"one pass": "o", "sorting": "s", "every pair": "^"}

fig, (left, right) = plt.subplots(1, 2, figsize=(10.5, 3.8))
for ax in (left, right):
    for name in PROGRAMS:
        ax.plot(SIZES, times[name], color=COLOURS[name], marker=MARKERS[name], linewidth=2, label=name)
    ax.set_xlabel("n, the number of items")
    ax.set_ylabel("time (ms)")
    ax.grid(alpha=0.3)
    ax.spines[["top", "right"]].set_visible(False)

left.set_title("Even steps")
left.annotate("every pair", (SIZES[-1], times["every pair"][-1]), xytext=(-8, 4), textcoords="offset points", ha="right")
left.annotate("one pass and sorting, near 0", (SIZES[-1], 0), xytext=(-8, 8), textcoords="offset points", ha="right")
left.legend(loc="upper left", frameon=False)

right.set_title("Each grid line up is 10 times longer")
right.set_xscale("log", base=2)
right.set_yscale("log")
right.set_xticks(SIZES, [f"{n:,}" for n in SIZES])
right.minorticks_off()
for name in PROGRAMS:
    right.annotate(name, (SIZES[-1], times[name][-1]), xytext=(8, 0), textcoords="offset points", va="center")
right.set_xlim(SIZES[0] * 0.8, SIZES[-1] * 2.6)
fig.tight_layout()
plt.show()
''')
    nb.md("""
        🐍 `plt.subplots(1, 2)` makes a figure with 2 charts side by side. `ax.plot(x, y)` draws a line through the points.
        `set_yscale("log")` spaces the grid by multiplying (1, 10, 100, ...) instead of adding.

        **What you see:** on the left, every pair shoots up and the other two stay flat near 0.
        On the right, all three are close to straight lines, and **the every-pair line climbs about twice as steeply** as one pass.
    """)

    # ------------------------------------------------------------------ 3 ratio
    nb.md("""
        ## 3. Double n and divide: the ratio shows the pattern

        Times depend on the computer. **The ratio does not:** divide each time by the time at the size before.
        Each size here is double the one before.
    """)
    nb.code('''
import math

print(f"{'n':>6} " + "".join(f"{name:>12}" for name in PROGRAMS))
for i in range(1, len(SIZES)):
    print(f"{SIZES[i]:>6,} " + "".join(f"{times[name][i] / times[name][i - 1]:>12.1f}" for name in PROGRAMS))

print()
for name in PROGRAMS:
    ks = [math.log2(times[name][i] / times[name][i - 1]) for i in range(1, len(SIZES))]
    print(f"{name:>10}: each doubling multiplies the time by 2 to the power {sum(ks) / len(ks):.1f}")
''')
    nb.md("""
        **What you see:** one pass: each doubling takes about 2 times as long. Every pair: about 4.
        Sorting: somewhere between 2 and 4, and it wobbles. A sort of a few thousand numbers takes well under a millisecond,
        and at that scale the speed of the computer's memory changes the time too. On bigger lists the sorting ratio settles:
    """)
    nb.code('''
print(f"{'n':>7} {'sorting (ms)':>13} {'ratio':>6} {'2 log2(2n) / log2(n)':>21}")
prev = None
for n in [8_000, 16_000, 32_000, 64_000]:
    t = time_ms(sort_them, [random.random() for _ in range(n)])
    if prev:
        print(f"{n:>7,} {t:>13.2f} {t / prev:>6.2f} {2 * math.log2(n) / math.log2(n // 2):>21.2f}")
    else:
        print(f"{n:>7,} {t:>13.2f}")
    prev = t
''')
    nb.md("""
        **What you see:** on bigger lists, sorting takes a little more than 2 times as long per doubling.
        The last column is what $n \\log_2 n$ predicts: doubling $n$ doubles the $n$ and adds 1 to $\\log_2 n$.

        **What it means:** if the time is about $c \\cdot n^k$, doubling $n$ multiplies it by $2^k$.
        So a ratio of 2 means $k = 1$, and a ratio of 4 means $k = 2$. In general $k = \\log_2(\\text{ratio})$, which is what the last lines print.
        If $n$ grows by any factor $f$ (not only 2), the time grows by $f^k$.

        **What it's called:** this pattern is the **time complexity**, written in **big-O notation**:
        $O(n)$ for one pass, $O(n \\log n)$ for good sorting, $O(n^2)$ for every pair, and $O(\\log n)$ for the halving loop of section 1.
        Big-O drops the constant $c$: a faster computer changes $c$, not $k$.
    """)
    nb.predict(
        "Every pair took some time at n = 4,000 (the last row above). **Guess its time at n = 8,000 before you run the next cell.**",
        "**About 4 times the 4,000 time.** Doubling n multiplies an $O(n^2)$ program's time by $2^2 = 4$.",
    )
    nb.code('''
xs = [random.random() for _ in range(8_000)]
guess = 4 * times["every pair"][-1]
start = time.perf_counter()                       # one call is long enough to time once
every_pair(xs)
took = (time.perf_counter() - start) * 1000
print(f"guess {guess:.0f} ms, took {took:.0f} ms: {abs(took - guess) / guess:.0%} off")

# The same rule, used far beyond what you can wait for:
grow = 1_000_000 / SIZES[-1]
print()
print(f"from {SIZES[-1]:,} to 1,000,000 items, n grows {grow:.0f} times")
print(f"one pass  : about {times['one pass'][-1] * grow / 1000:.2f} seconds")
print(f"sorting   : about {times['sorting'][-1] * grow * math.log2(1e6) / math.log2(SIZES[-1]) / 1000:.2f} seconds")
print(f"every pair: about {times['every pair'][-1] * grow ** 2 / 1000 / 3600:.1f} hours")
''')
    nb.md("""
        🐍 `{x:.0%}` prints a fraction as a percentage: `0.07` becomes `7%`.

        **What you see:** the guess lands close. For a million items, one pass and sorting still take under a second.
        Every pair takes hours. **The power of n matters far more than the speed of the computer.**
    """)

    # ------------------------------------------------------------------ 4 set
    nb.md("""
        ## 4. Make a slow check fast: does a list repeat a value?

        You have a list of IDs. **Is any ID in it twice?**

        The direct way compares every pair, like the every-pair program. A faster way reads the list once and remembers what it has seen.
    """)
    nb.predict(
        "The slow check runs on 4,000 different numbers, so it never finds a repeat. **How many pairs does it compare?**",
        "**7,998,000.** Each of the 4,000 numbers is compared with every number after it: "
        "4,000 × 3,999 / 2 = 7,998,000. That is $O(n^2)$.",
    )
    nb.code('''
def has_repeat_slow(xs):
    n = len(xs)
    for i in range(n):
        for j in range(i + 1, n):
            if xs[i] == xs[j]:
                return True               # two equal items: stop at once
    return False

def has_repeat_fast(xs):
    seen = set()
    for x in xs:
        if x in seen:
            return True
        seen.add(x)
    return False

print(f"{'n':>6} {'pairs compared':>15} {'slow (ms)':>10} {'ratio':>6} {'fast (ms)':>10} {'ratio':>6}")
prev = None
for n in [1_000, 2_000, 4_000]:
    xs = random.sample(range(10 * n), n)            # n different numbers: the slow check's worst case
    slow, fast = time_ms(has_repeat_slow, xs, 3), time_ms(has_repeat_fast, xs, 5)
    ratios = f"{slow / prev[0]:>6.1f} {fast:>10.3f} {fast / prev[1]:>6.1f}" if prev else f"{'':>6} {fast:>10.3f} {'':>6}"
    print(f"{n:>6,} {n * (n - 1) // 2:>15,} {slow:>10.1f} {ratios}")
    prev = (slow, fast)
print(f"at 4,000 items the fast check is {slow / fast:,.0f} times faster")
''')
    nb.md("""
        🐍 **Python notes**
        - `set()` makes an empty **set**: a collection with no repeats. `seen.add(x)` puts `x` in it.
        - `x in seen` asks whether `x` is in the set. For a set this takes about the same time however big the set is.
          (For a list, `x in xs` walks the list.) Topic 2 shows how a set does this.
        - `random.sample(range(10 * n), n)` picks n different numbers from 0 to 10n − 1.
        - `return True` inside the loops ends the function at once.

        **What you see:** the slow check's time grows about 4 times per doubling. The fast check's grows about 2 to 3 times,
        and at 4,000 items it is far faster (the last line says how many times). **The fast check is $O(n)$.**

        **The library version:** a set built from the whole list drops the repeats, so `len(set(xs)) < len(xs)` means there was a repeat.
        Check that all three agree:
    """)
    nb.code('''
random.seed(2)
for trial in range(300):
    xs = [random.randrange(50) for _ in range(random.randrange(12))]
    assert has_repeat_slow(xs) == has_repeat_fast(xs) == (len(set(xs)) < len(xs)), xs
print("all 300 random lists: the three checks agree")
''')
    nb.md("""
        🐍 `assert condition, xs` stops with an error (showing `xs`) if the condition is false. Silence means it held every time.
        `random.randrange(12)` is a whole number from 0 to 11, so some lists are empty.
    """)

    # ------------------------------------------------------------------ practice
    nb.md("""
        ## Practice

        Fill in each function, then run its cell to see the checks. The method isn't named: deciding how to solve it is part of the problem.
    """)
    nb.problem(1, """
        Here is a loop:

        ```python
        steps = 0
        for i in range(n):
            for j in range(i):
                steps += 1
        ```

        Write `triangle_steps(n)` that returns the final value of `steps` **without running the loop**,
        so it answers at once even for n = 1,000,000,000.
    """, starter='''
def triangle_steps(n):
    # your code here
    return None

CASES_1 = [((0,), 0), ((1,), 0), ((2,), 1), ((5,), 10), ((1_000,), 499_500), ((10**9,), 499_999_999_500_000_000)]
check(triangle_steps, CASES_1)
''', solution='''
def triangle_steps(n):
    # The inner loop runs 0, 1, 2, ..., n - 1 times: that adds up to n(n - 1)/2.
    return n * (n - 1) // 2

check(triangle_steps, CASES_1)
# Half of n * n, so still O(n^2): doubling n gives about 4 times the steps.
''')
    nb.problem(2, """
        Here is another loop:

        ```python
        steps = 0
        i = 1
        while i < n:
            for j in range(n):
                steps += 1
            i = i * 2
        ```

        Write `doubling_steps(n)` that returns the final value of `steps` (n is at least 1).
        It must answer n = 1,000,000 in well under a second.
    """, starter='''
def doubling_steps(n):
    # your code here
    return None

CASES_2 = [((1,), 0), ((2,), 2), ((8,), 24), ((10,), 40), ((1_000,), 10_000), ((1_000_000,), 20_000_000)]
check(doubling_steps, CASES_2)
''', solution='''
def doubling_steps(n):
    turns = 0                  # how many times the outer loop runs: i = 1, 2, 4, ... while i < n
    i = 1
    while i < n:
        turns += 1
        i = i * 2
    return turns * n           # each outer turn runs the inner loop n times

check(doubling_steps, CASES_2)
# The outer loop runs about log2(n) times, so this is n log n steps: O(n log n), the same pattern as good sorting.
''')
    nb.problem(3, """
        You timed a program at a few sizes and got pairs `(n, seconds)`, smallest n first.
        The time is about $c \\cdot n^k$ for some whole number $k$. Write `estimate_k(timings)` that returns $k$.
        The sizes do not always double, and real timings wobble a little.
    """, starter='''
def estimate_k(timings):
    # your code here
    return None

CASES_3 = [
    (([(1000, 0.002), (2000, 0.004), (4000, 0.008)],), 1),
    (([(1000, 0.02), (2000, 0.081), (4000, 0.33)],), 2),
    (([(100, 0.001), (200, 0.008), (400, 0.065)],), 3),
    (([(1000, 0.5), (3000, 4.4)],), 2),
    (([(500, 1.0), (1000, 1.9), (2000, 4.1), (4000, 7.9)],), 1),
    (([(10, 3.0), (20, 3.0)],), 0),
]
check(estimate_k, CASES_3)
''', solution='''
import math

def estimate_k(timings):
    (n1, t1), (n2, t2) = timings[0], timings[-1]      # the smallest and the largest size
    # n grew by a factor f = n2 / n1, and the time by f ** k. So k = log(time factor) / log(f).
    return round(math.log(t2 / t1) / math.log(n2 / n1))

check(estimate_k, CASES_3)
# Using the two ends, far apart, keeps the wobble of single timings small.
''')
    nb.problem(4, """
        This function is correct, but slow:

        ```python
        def common_slow(a, b):
            out = []
            for x in a:
                for y in b:
                    if x == y and x not in out:
                        out.append(x)
            return sorted(out)
        ```

        Write `common_fast(a, b)` that returns the same answers (the values in both lists, each once, smallest first),
        and stays fast when each list holds 100,000 numbers.
    """, starter='''
def common_fast(a, b):
    # your code here
    return None

CASES_4 = [(([3, 1, 2, 3], [3, 4, 1]), [1, 3]), (([], [1, 2]), []), (([5, 5, 5], [5]), [5]),
           (([1, 2], [3, 4]), []), (([7, -2, 0], [0, 7, 7, -2]), [-2, 0, 7])]
check(common_fast, CASES_4)

# A big case: 100,000 numbers in each list. (A slow version can run for minutes here: press stop if it does.)
big_a, big_b = list(range(0, 200_000, 2)), list(range(0, 300_000, 3))
start = time.perf_counter()
ok = common_fast(big_a, big_b) == list(range(0, 200_000, 6))
print("big case:", "✓" if ok else "✗", f"in {time.perf_counter() - start:.3f} s")
''', solution='''
def common_fast(a, b):
    in_b = set(b)                                   # one pass over b
    return sorted({x for x in a if x in in_b})      # one pass over a; each "in" check is fast

check(common_fast, CASES_4)

big_a, big_b = list(range(0, 200_000, 2)), list(range(0, 300_000, 3))
start = time.perf_counter()
ok = common_fast(big_a, big_b) == list(range(0, 200_000, 6))
print("big case:", "✓" if ok else "✗", f"in {time.perf_counter() - start:.3f} s")
# {x for x in a if ...} is a set comprehension: it also drops repeats. The slow version is O(len(a) * len(b));
# this one is O(len(a) + len(b)) plus the final sort.
''')
    nb.problem(5, """
        A contest judge allows about 100,000,000 simple steps in one second.
        A program takes $n^k$ steps on $n$ items.
        Write `largest_n(k, budget)`: the biggest whole number $n$ with $n^k$ at most `budget`.
    """, starter='''
def largest_n(k, budget):
    # your code here
    return None

CASES_5 = [((1, 10**8), 10**8), ((2, 10**8), 10_000), ((3, 10**8), 464), ((4, 10**8), 100),
           ((2, 99), 9), ((2, 10**8 - 1), 9_999)]
check(largest_n, CASES_5)
''', solution='''
def largest_n(k, budget):
    n = round(budget ** (1 / k))       # close, but floating-point roots can be off by one
    while n ** k > budget:
        n -= 1
    while (n + 1) ** k <= budget:
        n += 1
    return n

check(largest_n, CASES_5)
# So an n**2 program handles about 10,000 items in a second. With inputs up to 100,000 you need something faster.
''')

    nb.cue([
        ("a loop inside a loop over the same input", "$O(n^2)$"),
        ("the problem halves every step", "$O(\\log n)$"),
        ("inputs up to $10^5$ or $10^6$ in a contest problem", "you need about $O(n \\log n)$ or better"),
        ("checking whether a value is in a list, inside a loop", "a set makes each check fast"),
    ])
    nb.practise_more("""
        For this topic: the CSES Problem Set's *Introductory Problems* section; the USACO Guide's *Time Complexity* module (Bronze).
    """)
    nb.save(PATH)
    print("wrote", PATH)


if __name__ == "__main__":
    build()

"""Generates notebooks/dsa/10_dynamic_programming.ipynb (DSA topic 10 practice notebook)

    python3 notebooks/src/d10_dynamic_programming.py
"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))
from nb import Notebook  # noqa: E402

PATH = "notebooks/dsa/10_dynamic_programming.ipynb"


def build() -> None:
    nb = Notebook()
    nb.header(
        eyebrow="DSA topic 10 · Dynamic programming · practice notebook",
        title="How do you solve a problem made of many overlapping smaller problems?",
        path=PATH,
        question="How do you solve a problem made of many overlapping smaller problems?",
        answer=("Solve each small problem once and store its answer in a table. "
                "Build bigger answers from smaller ones. Each cell then takes only a few steps."),
        build_text="""
            In this notebook you will:

            1. **Count the calls** a plain recursive function makes, then cut them down with a dictionary of stored answers,
               with Python's `functools.lru_cache`, and with a table filled from the bottom up.
            2. **Fill tables** for climbing stairs, the fewest coins, the edit distance between two words, and the longest increasing run.
            3. **Solve 5 practice problems.** Each has checks you can run, and a solution one click away.

            Running every cell takes a few seconds. The site's step-by-step animation of the edit-distance table is on the
            *Dynamic programming* page of the DSA track.
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

    # ------------------------------------------------------------------ 1 fibonacci
    nb.md("""
        ## 1. Why is the plain recursive version so slow?

        Each number in this list is the sum of the two before it: 0, 1, 1, 2, 3, 5, 8, 13, …
        Call the $n$-th one $F(n)$, so $F(0) = 0$, $F(1) = 1$ and $F(n) = F(n-1) + F(n-2)$.

        That rule turns straight into a function that calls itself twice. Count the calls.
    """)
    nb.predict(
        "To work out $F(30)$, **how many times does the function get called?** About 60? About 30,000? About 3 million?",
        "**2,692,537 calls**, close to 3 million. Each call makes two more, so the count roughly doubles with every step up in $n$.",
    )
    nb.code('''
calls = [0]

def fib(n):
    calls[0] += 1                        # count this call
    if n < 2:
        return n                         # F(0) = 0, F(1) = 1
    return fib(n - 1) + fib(n - 2)

print(f"{'n':>3} {'F(n)':>8} {'calls':>11}")
for n in [5, 10, 15, 20, 25, 30]:
    calls[0] = 0
    value = fib(n)
    print(f"{n:>3} {value:>8,} {calls[0]:>11,}")
''')
    nb.md("""
        🐍 **Python notes**
        - `calls` is a one-item list, `[0]`. The function changes `calls[0]`, and the code outside sees the change, because both use the same list.
        - `f"{n:>3}"` prints `n` right-aligned in 3 characters, so the columns line up. `{value:>8,}` also adds commas: `832,040`.

        **What you see:** each step of 5 in $n$ multiplies the calls by about 11. At $n = 30$ there are about 2.7 million calls.
        That is far more work than 30 additions.

        ### Where do all those calls go?

        Count how many times each smaller $F(k)$ is worked out, inside one call of `fib(10)`.
    """)
    nb.code('''
times = {}

def fib_counted(n):
    times[n] = times.get(n, 0) + 1       # one more time F(n) is worked out
    if n < 2:
        return n
    return fib_counted(n - 1) + fib_counted(n - 2)

fib_counted(10)
for k in sorted(times, reverse=True):
    print(f"F({k}) worked out {times[k]:>2} times")
''')
    nb.md("""
        🐍 `times.get(n, 0)` reads the value stored for key `n`, or 0 if there is none yet. `sorted(times, reverse=True)` lists the keys from largest to smallest.

        **What you see:** $F(2)$ is worked out 34 times, and $F(1)$ 55 times. Every one of those gives the same answer.
        **The slow part is solving the same smaller problem again and again.**
    """)

    # ------------------------------------------------------------------ 2 memo, lru_cache, table
    nb.md("""
        ## 2. Store each answer the first time

        Keep a dictionary. Before working out $F(n)$, look in it. If the answer is there, return it. If not, work it out and store it.
        A dictionary of stored answers like this is called a **memo**.
    """)
    nb.code('''
memo = {}
calls = [0]

def fib_memo(n):
    calls[0] += 1
    if n in memo:
        return memo[n]                   # stored already: no more work
    value = n if n < 2 else fib_memo(n - 1) + fib_memo(n - 2)
    memo[n] = value                      # store it for next time
    return value

for n in [10, 30, 90]:
    memo.clear(); calls[0] = 0
    print(f"F({n}) = {fib_memo(n):,}   calls: {calls[0]}")
''')
    nb.md("""
        🐍 **Python notes**
        - `n in memo` checks whether `n` is a key of the dictionary. It takes about one step, however big the dictionary is.
        - `value = n if n < 2 else ...` is a one-line if/else: `n` when `n < 2`, otherwise the sum.
        - `memo.clear()` empties the dictionary, so each run starts fresh.

        **What you see:** $F(30)$ now takes 59 calls instead of 2,692,537. $F(90)$ takes 179.
        Each $F(k)$ is worked out once; every other call finds it in the memo.

        ### The library version: `functools.lru_cache`

        Python can add the memo for you. Put `@lru_cache(maxsize=None)` on the line above the function.
    """)
    nb.code('''
from functools import lru_cache

@lru_cache(maxsize=None)
def fib_cached(n):
    if n < 2:
        return n
    return fib_cached(n - 1) + fib_cached(n - 2)

print(fib_cached(90))
print(fib_cached.cache_info())
print("same answers as the plain version for n = 0 to 25:", all(fib_cached(n) == fib(n) for n in range(26)))
print("same answers as your memo for n = 0 to 300:      ", all(fib_cached(n) == fib_memo(n) for n in range(301)))
''')
    nb.md("""
        🐍 **Python notes: decorators**
        - A line starting with `@` above a `def` is a **decorator**. `@lru_cache(maxsize=None)` replaces `fib_cached` with a version that stores every answer.
        - It does the same as writing `fib_cached = lru_cache(maxsize=None)(fib_cached)` after the function.
        - `maxsize=None` means "store every answer, never throw any away". `cache_info()` shows how many calls found a stored answer (`hits`) and how many had to work one out (`misses`).
        - The arguments must be values that can be dictionary keys: numbers, strings and tuples work; lists do not.

        **What you see:** 91 misses, one for each of $F(0)$ to $F(90)$. Everything else was a hit.

        ### Or fill a table from the smallest answer up

        You can skip the recursion altogether. Make a list, fill in $F(0)$ and $F(1)$, then fill each next entry from the two before it.
    """)
    nb.code('''
def fib_table(n):
    table = [0] * (n + 1)                # n + 1 slots: table[0] ... table[n]
    if n >= 1:
        table[1] = 1
    for i in range(2, n + 1):
        table[i] = table[i - 1] + table[i - 2]
    return table[n]

print([fib_table(n) for n in range(13)])
print("table agrees with the memo for n = 0 to 300:", all(fib_table(n) == fib_memo(n) for n in range(301)))
''')
    nb.md("""
        🐍 `[0] * (n + 1)` makes a list of `n + 1` zeros. `range(2, n + 1)` runs `i` from 2 up to `n`, including `n`.

        **What it's called:** solving each smaller problem once, storing its answer, and building bigger answers from stored ones is
        **dynamic programming** (DP). Going top-down with a memo is called *memoisation*. Filling a table from the bottom up is called *tabulation*.
        The rule that links an answer to smaller answers, here $F(n) = F(n-1) + F(n-2)$, is the **recurrence**.

        The memo and the table each do about $n$ steps: $O(n)$ time. The plain version's calls grow like $1.6^n$.
    """)

    # ------------------------------------------------------------------ 3 stairs and coins
    nb.md("""
        ## 3. Two more one-row tables: stairs and coins

        ### In how many ways can you climb 5 stairs, 1 or 2 at a time?

        Look at your last move. Either it was 1 stair, from stair $n-1$, or 2 stairs, from stair $n-2$.
        So the ways to reach stair $n$ are the ways to reach $n-1$ plus the ways to reach $n-2$.
    """)
    nb.code('''
def climb_ways(n):
    ways = [0] * (n + 1)
    ways[0] = 1                          # one way to stay at the bottom: do nothing
    for i in range(1, n + 1):
        ways[i] = ways[i - 1] + (ways[i - 2] if i >= 2 else 0)
    return ways

print("stairs:", list(range(11)))
print("ways:  ", climb_ways(10))
print("ways to climb 5 stairs:", climb_ways(5)[5])
''')
    nb.md("""
        **What you see:** 1, 1, 2, 3, 5, **8**, 13, … Climbing 5 stairs has 8 ways.
        This is the list from section 1, shifted by one place: the same recurrence.

        ### What is the fewest number of coins for each amount?

        Your coins are worth 1, 3 and 4. You need to pay 6.
    """)
    nb.predict(
        "Take the biggest coin that fits, again and again: 4, then 1, then 1. That is 3 coins. **Can you pay 6 with fewer?**",
        "**Yes, 2 coins: 3 + 3.** Taking the biggest coin first is not always best. The table below finds the best for every amount.",
    )
    nb.code('''
def fewest_coins(coins, top):
    INF = float("inf")
    best = [0] + [INF] * top             # best[0] = 0: paying 0 takes no coins
    last = [0] * (top + 1)               # the last coin used, to rebuild the answer
    for amount in range(1, top + 1):
        for c in coins:
            if c <= amount and best[amount - c] + 1 < best[amount]:
                best[amount] = best[amount - c] + 1
                last[amount] = c
    return best, last

best, last = fewest_coins([1, 3, 4], 6)
print("amount:", list(range(7)))
print("coins: ", best)

def coins_used(amount):
    used = []
    while amount > 0:
        used.append(last[amount])
        amount -= last[amount]
    return used

print("pay 6 with", coins_used(6))
''')
    nb.md("""
        🐍 `float("inf")` is a number bigger than any other. It stands for "no way found yet", so any real count is smaller.

        **What you see:** 0, 1, 2, 1, 1, 2, **2**. Paying 6 takes 2 coins, `[3, 3]`.
        Each entry is 1 + the best of (amount − coin) over the coins that fit. The `last` list remembers which coin gave that best, so you can walk back and list the coins.
    """)

    # ------------------------------------------------------------------ 4 edit distance
    nb.md("""
        ## 4. Compare two words: a table with rows and columns

        A spell-checker suggests "receive" when you type "recieve".
        **How many single-letter edits (insert, delete or change a letter) turn one word into another?**

        Build the answer from the beginnings of the words. Let $D[i][j]$ be the number of edits that turn the first $i$ letters of word $a$ into the first $j$ letters of word $b$.
        To fill $D[i][j]$, look at the last letter of each beginning. There are three options:

        - **delete** $a$'s last letter: $D[i-1][j] + 1$ (the cell above)
        - **insert** $b$'s last letter: $D[i][j-1] + 1$ (the cell to the left)
        - **change** one into the other: $D[i-1][j-1] + 1$, or $+0$ if the letters already match (the diagonal cell)

        $D[i][j]$ is the smallest of the three.
    """)
    nb.predict(
        "**How many edits turn \"kitten\" into \"sitting\"?**",
        "**3**: change k to s, change e to i, insert g at the end. The table below finds it.",
    )
    nb.code('''
def edit_table(a, b):
    n, m = len(a), len(b)
    D = [[0] * (m + 1) for _ in range(n + 1)]     # n + 1 rows, m + 1 columns
    for i in range(n + 1):
        D[i][0] = i                      # first i letters → nothing: i deletes
    for j in range(m + 1):
        D[0][j] = j                      # nothing → first j letters: j inserts
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            c = 0 if a[i - 1] == b[j - 1] else 1
            D[i][j] = min(D[i - 1][j] + 1,        # delete (above)
                          D[i][j - 1] + 1,        # insert (left)
                          D[i - 1][j - 1] + c)    # change, or keep if c = 0 (diagonal)
    return D

def show_table(a, b, D):
    print("      " + "".join(f"{ch:>3}" for ch in " " + b))
    for i, row in enumerate(D):
        label = a[i - 1] if i > 0 else " "
        print(f"   {label:>3}" + "".join(f"{v:>3}" for v in row))

D = edit_table("kitten", "sitting")
show_table("kitten", "sitting", D)
print("edit distance:", D[-1][-1])
''')
    nb.md("""
        🐍 **Python notes: lists of lists**
        - `D[i][j]` is row `i`, column `j`: `D[i]` is a whole row, a list, and `[j]` picks one entry of it.
        - `[[0] * (m + 1) for _ in range(n + 1)]` builds `n + 1` separate rows. `_` is a name for a loop variable you don't use.
        - `enumerate(D)` gives each row together with its position: `(0, row0), (1, row1), …`
        - `D[-1][-1]` is the last entry of the last row: the bottom-right cell.

        There is a trap. `[[0] * 3] * 2` looks the same, but it makes **one** row and lists it twice. Change one cell and both rows change:
    """)
    nb.code('''
wrong = [[0] * 3] * 2
wrong[0][0] = 9
print("[[0] * 3] * 2 after one change:          ", wrong)

right = [[0] * 3 for _ in range(2)]
right[0][0] = 9
print("[[0] * 3 for _ in range(2)] after one change:", right)
''')
    nb.md("""
        **What you see** in the table: row $i$ is the first $i$ letters of "kitten", column $j$ the first $j$ letters of "sitting".
        The bottom-right cell is **3**, the answer for the whole words.

        To find *which* edits, start at the bottom-right cell and walk back. At each cell, step to the neighbour that gave the smallest value.
    """)
    nb.code('''
def walk_back(a, b, D):
    i, j = len(a), len(b)
    edits = []
    while i > 0 or j > 0:
        if i > 0 and j > 0 and a[i - 1] == b[j - 1] and D[i - 1][j - 1] == D[i][j]:
            i, j = i - 1, j - 1                              # letters match: keep, no edit
        elif i > 0 and j > 0 and D[i - 1][j - 1] + 1 == D[i][j]:
            edits.append(f"change {a[i - 1]} to {b[j - 1]}"); i, j = i - 1, j - 1
        elif i > 0 and D[i - 1][j] + 1 == D[i][j]:
            edits.append(f"delete {a[i - 1]}"); i -= 1
        else:
            edits.append(f"insert {b[j - 1]}"); j -= 1
    return edits[::-1]                   # found from the end, so reverse

for a, b in [("kitten", "sitting"), ("recieve", "receive"), ("sunday", "saturday")]:
    D = edit_table(a, b)
    print(f"{a} → {b}: {D[-1][-1]} edits:", ", ".join(walk_back(a, b, D)))
''')
    nb.md("""
        🐍 `edits[::-1]` is the list reversed. The walk starts at the end of the words, so the edits come out last-first.

        **What you see:** kitten → sitting takes 3 edits: change k to s, change e to i, insert g.
        recieve → receive takes 2, because swapping two letters counts as two changes.

        **What it's called:** this is the **edit distance**, also called the Levenshtein distance.
        The table has $(n+1)(m+1)$ cells and each takes a few steps, so filling it takes $O(nm)$ time for words of lengths $n$ and $m$.

        $$D[i][j] = \\min\\big(D[i-1][j] + 1,\\; D[i][j-1] + 1,\\; D[i-1][j-1] + c\\big)$$

        where $c = 0$ if the $i$-th letter of $a$ matches the $j$-th letter of $b$, and $c = 1$ if not.
        Python's standard library has no edit-distance function, so the table above is the version to use.
    """)

    # ------------------------------------------------------------------ 5 longest increasing run
    nb.md("""
        ## 5. The longest increasing run you can pick

        In 3, 1, 4, 1, 5, 9, 2, 6, **pick as many numbers as you can, keeping their order, so each is bigger than the one before.**

        For each position $i$, store the longest pick that *ends* at position $i$.
        It is 1 more than the best earlier pick that ends on a smaller number, or 1 (the number alone) if there is none.
    """)
    nb.code('''
def longest_rising(xs):
    best = [1] * len(xs)                 # best[i]: longest pick ending at position i
    prev = [-1] * len(xs)                # the position before i in that pick
    for i in range(len(xs)):
        for j in range(i):
            if xs[j] < xs[i] and best[j] + 1 > best[i]:
                best[i] = best[j] + 1
                prev[i] = j
    if not xs:
        return 0, [], []
    end = best.index(max(best))          # where the longest pick ends
    pick = []
    while end != -1:
        pick.append(xs[end]); end = prev[end]
    return max(best), pick[::-1], best

xs = [3, 1, 4, 1, 5, 9, 2, 6]
length, pick, best = longest_rising(xs)
print("numbers:", xs)
print("best:   ", best)
print("longest:", length, "for example", pick)
''')
    nb.md("""
        🐍 `best.index(max(best))` finds the position of the largest entry. `[1] * len(xs)` makes one entry per number, each starting at 1.

        **What you see:** the `best` row is 1, 1, 2, 1, 3, 4, 2, 4. The longest pick has length **4**, for example 3, 4, 5, 9.
        This table takes about $n^2$ steps: each position looks at every earlier one.

        **What it's called:** this is the **longest increasing subsequence**. A *subsequence* keeps the order but may skip items.

        ### A faster version with `bisect`

        Keep a list `tails`: `tails[k]` is the smallest number that can end a pick of length $k + 1$.
        For each new number, `bisect_left` finds the first tail that is not smaller, and replaces it. If there is none, the number makes the list longer.
        The length of `tails` at the end is the answer. Each number costs one halving search, so it takes $O(n \\log n)$.
    """)
    nb.code('''
from bisect import bisect_left
import random

def longest_rising_fast(xs):
    tails = []
    for x in xs:
        k = bisect_left(tails, x)        # first tail >= x
        if k == len(tails):
            tails.append(x)              # x extends the longest pick
        else:
            tails[k] = x                 # x is a smaller end for picks of length k + 1
    return len(tails)

random.seed(1)
tests = [[random.randint(1, 50) for _ in range(random.randint(0, 30))] for _ in range(500)]
print("fast version on 3 1 4 1 5 9 2 6:", longest_rising_fast(xs))
print("both versions agree on 500 random lists:", all(longest_rising_fast(t) == longest_rising(t)[0] for t in tests))
''')
    nb.md("""
        🐍 `bisect_left(tails, x)` returns the first position in the sorted list `tails` where `x` could go with the list staying sorted. It halves the range each step.
        `tails` stays sorted because each replacement puts a smaller number in the same place.
    """)

    # ------------------------------------------------------------------ practice
    nb.md("""
        ## Practice

        Fill in each function, then run its cell to see the checks. The method isn't named: deciding how to solve it is part of the problem.
    """)
    nb.problem(1, """
        A robot moves along a row of tiles, starting before tile 1. Each move takes it forward 1, 2 or 3 tiles.
        **In how many different orders of moves can it land exactly on tile `n`?**
        Moving 1 then 2 counts as different from moving 2 then 1. For `n = 0` there is one order: no moves.
    """, starter='''
def move_orders(n):
    # your code here
    return None

CASES_1 = [((0,), 1), ((1,), 1), ((3,), 4), ((4,), 7), ((6,), 24), ((10,), 274)]
check(move_orders, CASES_1)
''', solution='''
def move_orders(n):
    ways = [0] * (n + 1)
    ways[0] = 1                                       # no moves
    for i in range(1, n + 1):
        ways[i] = sum(ways[i - s] for s in (1, 2, 3) if i - s >= 0)   # the last move was 1, 2 or 3
    return ways[n]

check(move_orders, CASES_1)
''')
    nb.problem(2, """
        A grid of whole numbers is a toll map. You start on the top-left square and must reach the bottom-right square,
        moving one square right or one square down each time. You pay the number on every square you stand on, the first and last included.
        **What is the smallest total you can pay?**
    """, starter='''
def cheapest_route(grid):
    # your code here
    return None

CASES_2 = [(([[2, 9, 1], [3, 4, 8], [7, 1, 2]],), 12),
           (([[5]],), 5),
           (([[1, 2, 3]],), 6),
           (([[4], [1], [2]],), 7),
           (([[1, 8, 8, 8], [1, 9, 1, 1], [1, 1, 1, 9], [9, 9, 1, 1]],), 7)]
check(cheapest_route, CASES_2)
''', solution='''
def cheapest_route(grid):
    rows, cols = len(grid), len(grid[0])
    cost = [[0] * cols for _ in range(rows)]          # cost[r][c]: cheapest total to stand on (r, c)
    for r in range(rows):
        for c in range(cols):
            if r == 0 and c == 0:
                before = 0
            elif r == 0:
                before = cost[r][c - 1]               # top row: can only come from the left
            elif c == 0:
                before = cost[r - 1][c]               # left column: can only come from above
            else:
                before = min(cost[r - 1][c], cost[r][c - 1])
            cost[r][c] = before + grid[r][c]
    return cost[-1][-1]

check(cheapest_route, CASES_2)
''')
    nb.problem(3, """
        Take two strings. Cross out letters from each, keeping the rest in their order, until the two strings are the same.
        **What is the length of the longest string they can both end up as?**
        For example, "garden" and "harden" can both become "arden", so the answer is 5.
    """, starter='''
def longest_shared(a, b):
    # your code here
    return None

CASES_3 = [(("garden", "harden"), 5), (("abc", "xyz"), 0), (("", "abc"), 0),
           (("python", "typhoon"), 4), (("stone", "notes"), 2), (("abcde", "ace"), 3)]
check(longest_shared, CASES_3)
''', solution='''
def longest_shared(a, b):
    n, m = len(a), len(b)
    L = [[0] * (m + 1) for _ in range(n + 1)]         # L[i][j]: answer for a[:i] and b[:j]
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            if a[i - 1] == b[j - 1]:
                L[i][j] = L[i - 1][j - 1] + 1          # both last letters kept
            else:
                L[i][j] = max(L[i - 1][j], L[i][j - 1])   # cross out one of the two last letters
    return L[n][m]

check(longest_shared, CASES_3)
''')
    nb.problem(4, """
        A bag holds at most `capacity` kilograms. Each item is a pair `(weight, value)`, and you can take each item at most once.
        **What is the largest total value you can carry?** Weights are whole numbers.
    """, starter='''
def best_load(items, capacity):
    # your code here
    return None

CASES_4 = [(([(3, 40), (4, 50), (2, 30), (5, 60)], 7), 90),
           (([(3, 40), (4, 50), (2, 30), (5, 60)], 0), 0),
           (([(6, 100)], 5), 0),
           (([(1, 10), (3, 40), (4, 50), (5, 70)], 8), 110),
           (([(5, 60), (3, 50), (2, 50)], 5), 100),
           (([], 10), 0)]
check(best_load, CASES_4)
''', solution='''
def best_load(items, capacity):
    best = [0] * (capacity + 1)                       # best[w]: top value with at most w kg, items so far
    for weight, value in items:
        for w in range(capacity, weight - 1, -1):     # go down, so this item is used at most once
            best[w] = max(best[w], best[w - weight] + value)
    return best[capacity]

check(best_load, CASES_4)
# Going from high w to low w means best[w - weight] still holds the value from before this item.
''')
    nb.problem(5, """
        A message is written with the code 1 = a, 2 = b, …, 26 = z, and sent as digits with no gaps.
        **In how many different ways can a string of digits be read back as letters?**
        "123" can be read as 1-2-3 (abc), 1-23 (aw) or 12-3 (lc): 3 ways. A code never starts with 0, so "06" cannot be read at all.
    """, starter='''
def readings(digits):
    # your code here
    return None

CASES_5 = [(("123",), 3), (("2611",), 4), (("101",), 1), (("27",), 1), (("0",), 0), (("1111",), 5)]
check(readings, CASES_5)
''', solution='''
def readings(digits):
    n = len(digits)
    ways = [0] * (n + 1)                              # ways[i]: readings of the first i digits
    ways[0] = 1
    for i in range(1, n + 1):
        if digits[i - 1] != "0":
            ways[i] += ways[i - 1]                    # last code is one digit, 1 to 9
        if i >= 2 and 10 <= int(digits[i - 2:i]) <= 26:
            ways[i] += ways[i - 2]                    # last code is two digits, 10 to 26
    return ways[n]

check(readings, CASES_5)
''')

    nb.cue([
        ('"number of ways" or "best total", built from smaller versions of the same question', "dynamic programming"),
        ("a greedy rule that fails on a small example", "dynamic programming"),
        ('"compare two sequences"', "a 2-D DP table"),
    ])
    nb.practise_more("""
        For this topic: the CSES Problem Set's *Dynamic Programming* section; the USACO Guide's *Dynamic Programming* modules (Gold);
        LeetCode's *Dynamic Programming* tag.
    """)
    nb.save(PATH)
    print("wrote", PATH)


if __name__ == "__main__":
    build()

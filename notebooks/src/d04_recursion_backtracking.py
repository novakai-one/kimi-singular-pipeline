"""Generates notebooks/dsa/04_recursion_backtracking.ipynb (DSA practice notebook 4)

    python3 notebooks/src/d04_recursion_backtracking.py
"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))
from nb import Notebook  # noqa: E402

PATH = "notebooks/dsa/04_recursion_backtracking.ipynb"


def build() -> None:
    nb = Notebook()
    nb.header(
        eyebrow="DSA topic 4 · Recursion and backtracking · practice notebook",
        title="How do you search every possibility without writing a loop for each one?",
        path=PATH,
        question="How do you search every possibility without writing a loop for each one?",
        answer=("Make one choice, then solve the smaller problem that is left with the same function. "
                "If a choice leads to a dead end, undo it and try the next one."),
        build_text="""
            In this notebook you will:

            1. **Write functions that call themselves**, and watch the chain of unfinished calls grow and shrink.
            2. **List every group and every ordering** of a few items by choosing, undoing and choosing again.
            3. **Solve the queens puzzle** and count how often your code has to undo a choice.
            4. **Meet `itertools`**, Python's own version, and check that both give the same answers.
            5. **Solve 5 practice problems.** Each has checks you can run, and a solution one click away.

            Running every cell takes a few seconds. The site's step-by-step animation of the queens puzzle is on the
            *Recursion and backtracking* page of the DSA track.
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

    # ------------------------------------------------------------------ 1 recursion
    nb.md("""
        ## 1. The answer for 5 uses the answer for 4

        You want $5! = 5 \\times 4 \\times 3 \\times 2 \\times 1$. A loop can do it. But look at the pieces:
        $4 \\times 3 \\times 2 \\times 1$ is $4!$. So $5! = 5 \\times 4!$.

        **The answer for 5 is built from the answer for a smaller number.** The same is true for 4, and for 3.
        So one function can compute $n!$ by asking itself for $(n - 1)!$.
        It needs one place to stop: $0!$ is 1.
    """)
    nb.code('''
def factorial(n):
    if n == 0:                       # the stopping point
        return 1
    return n * factorial(n - 1)      # the same function, on a smaller number

print(factorial(5))
print(factorial(10))
''')
    nb.md("""
        🐍 **Python notes**
        - `def factorial(n):` starts a function. The indented lines under it are its body; there are no braces.
        - `return` sends a value back to whoever called the function.
        - `==` compares; `=` assigns.
    """)
    nb.predict(
        "`factorial(4)` calls `factorial(3)`, which calls `factorial(2)`, and so on. "
        "**At the deepest point, how many calls have started but not yet returned?**",
        "**5:** `factorial(4)`, `(3)`, `(2)`, `(1)` and `(0)`. Each one waits for the one it called. "
        "The next cell prints them, indented by depth.",
    )
    nb.code('''
def factorial_traced(n, depth=0):
    pad = "    " * depth
    print(pad + f"factorial({n}) starts")
    if n == 0:
        result = 1
    else:
        result = n * factorial_traced(n - 1, depth + 1)
    print(pad + f"factorial({n}) returns {result}")
    return result

answer = factorial_traced(4)
''')
    nb.md("""
        🐍 **Python notes**
        - `depth=0` gives the argument a default value. `factorial_traced(4)` uses `depth = 0`; the inner calls pass `depth + 1`.
        - `"    " * depth` repeats a string: 4 spaces per level.
        - `f"factorial({n}) starts"` is an **f-string**: the value of `n` goes where `{n}` is.

        **What you see:** the calls start top to bottom, then return bottom to top. `factorial(0)` is the first to return.
        Only then can `factorial(1)` finish its multiplication.

        **What it's called:**
        - A function that calls itself is **recursive**.
        - The case that stops without another call (`n == 0` here) is the **base case**.
        - The chain of calls that have started but not returned is the **call stack**. Each new call goes on top; the top one returns first.
    """)
    nb.md("""
        ### The same pattern on a list

        The total of `[4, 8, 15, 16, 23, 42]` is 4 plus the total of the rest. The total of an empty list is 0.
    """)
    nb.code('''
def total(xs):
    if not xs:                       # empty list: the base case
        return 0
    return xs[0] + total(xs[1:])     # first item + total of the rest

print(total([4, 8, 15, 16, 23, 42]))
print(total([]))
''')
    nb.md("""
        🐍 **Python notes**
        - `not xs` is `True` when the list is empty.
        - `xs[0]` is the first item. `xs[1:]` is a **slice**: every item from position 1 to the end, as a new list.
    """)
    nb.md("""
        ### What if there is no base case?

        Every call makes another call, and none of them returns. The call stack grows until Python refuses to go deeper.
    """)
    nb.code('''
import sys

def count_down(n):
    return count_down(n - 1)         # no base case: this never stops by itself

try:
    count_down(10)
except RecursionError as e:
    print("RecursionError:", e)
print("Python's limit on unfinished calls:", sys.getrecursionlimit())
''')
    nb.md("""
        🐍 **Python notes**
        - `try: ... except RecursionError as e:` catches the error, so the notebook keeps running. `e` holds the message.
        - `import sys` loads a standard module. `sys.getrecursionlimit()` reports how deep the call stack may grow.

        **What you see:** a `RecursionError`, after about as many calls as the limit printed above.
        When you meet this error, look for a missing or unreachable base case first.
    """)

    # ------------------------------------------------------------------ 2 subsets and orderings
    nb.md("""
        ## 2. Every group: each item is in or out

        You have the items `a`, `b` and `c`. **List every group you can pick from them**, including the empty group.

        Decide one item at a time. For `a`: leave it out, or put it in. Then do the same for `b`, then `c`.
        After the last item, the choices so far form one group.
    """)
    nb.predict(
        "Three items give 8 groups. **How many groups do 4 items give?**",
        "**16.** Each item doubles the count: in or out. $2^4 = 16$. The next cell counts them for 0 to 5 items.",
    )
    nb.code('''
def all_groups(items):
    out = []
    chosen = []

    def decide(i):
        if i == len(items):              # every item decided: one group is complete
            out.append(chosen.copy())
            return
        decide(i + 1)                    # choice 1: leave item i out
        chosen.append(items[i])          # choice 2: put item i in...
        decide(i + 1)
        chosen.pop()                     # ...then undo it, so the list is as it was

    decide(0)
    return out

print(all_groups(["a", "b", "c"]))
for n in range(6):
    print(n, "items:", len(all_groups(list(range(n)))), "groups")
''')
    nb.md("""
        🐍 **Python notes**
        - `decide` is a function defined inside `all_groups`. It can read and change `out` and `chosen`, which belong to `all_groups`.
        - `chosen.append(x)` adds `x` to the end; `chosen.pop()` removes the last item.
        - `chosen.copy()` saves a snapshot. Without it, every saved group would be the same list, which keeps changing.
        - `list(range(n))` is `[0, 1, ..., n - 1]`.

        **What you see:** 1, 2, 4, 8, 16, 32 groups. Each extra item doubles the count: $2^n$ groups for $n$ items.

        **What it's called:** a group of items picked from a set is a **subset**.
        Choosing, exploring, then undoing the choice and trying the next option is **backtracking**.
        The `chosen.pop()` line is the undo.
    """)
    nb.md("""
        ### Every ordering

        **In how many orders can you line up `a`, `b` and `c`?** Pick the first item from those not used yet,
        then the second, then the third. After each line-up, undo the last pick and try the next one.
    """)
    nb.code('''
import math

def all_orders(items):
    out = []
    chosen = []
    used = [False] * len(items)

    def extend():
        if len(chosen) == len(items):    # every item placed: one ordering is complete
            out.append(chosen.copy())
            return
        for i, x in enumerate(items):
            if used[i]:
                continue                 # already in the line-up
            used[i] = True
            chosen.append(x)
            extend()
            chosen.pop()                 # undo, then try the next item in this spot
            used[i] = False

    extend()
    return out

print(all_orders(["a", "b", "c"]))
for n in range(1, 8):
    print(n, "items:", len(all_orders(list(range(n)))), "orderings;  math.factorial:", math.factorial(n))
''')
    nb.md("""
        🐍 **Python notes**
        - `[False] * len(items)` makes a list of that many `False` values.
        - `for i, x in enumerate(items):` gives each position `i` together with its item `x`.
        - `continue` skips the rest of this turn of the loop and moves to the next item.
        - `math.factorial(n)` computes $n!$ directly, to compare with.

        **What you see:** 3 items give 6 orderings, and 7 items give 5,040. The count matches $n!$ every time:
        $n$ choices for the first spot, $n - 1$ for the second, and so on.

        **What it's called:** an ordering of all the items is a **permutation**. There are $n!$ of them.
    """)

    # ------------------------------------------------------------------ 3 queens
    nb.md("""
        ## 3. Six queens on a 6 × 6 board

        Place 6 queens on a 6 × 6 chessboard so that no two attack each other: no shared row, column or diagonal.
        **How do you find one valid board without trying every way to place them?**

        First, count how many boards there are to try.
    """)
    nb.code('''
print(f"any 6 of the 36 squares:     {math.comb(36, 6):>9,}")
print(f"one queen in each row:       {6 ** 6:>9,}")
print(f"one per row and per column:  {math.factorial(6):>9,}")
''')
    nb.md("""
        🐍 **Python notes**
        - `math.comb(36, 6)` counts the ways to choose 6 things from 36, ignoring order.
        - `**` is "to the power of": `6 ** 6` is $6^6$.
        - In an f-string, `{x:>9,}` right-aligns `x` in 9 characters and adds commas: `1,947,792`.

        **What you see:** about 1.9 million ways to place 6 queens anywhere. One queen per row cuts it to 46,656.
        The search below places queens row by row, and **gives up on a partial board the moment two queens clash**.
    """)
    nb.code('''
def solve_queens(n):
    """First solution, trying rows top to bottom and columns left to right.
    Returns (the queens' columns or None, number of backtracks, number of queens placed)."""
    cols = []                            # cols[r] = column of the queen in row r
    backtracks = 0
    placed = 0

    def safe(row, col):
        for r, c in enumerate(cols):     # every queen in the rows above
            if c == col or abs(c - col) == row - r:
                return False             # same column, or same diagonal
        return True

    def place(row):
        nonlocal backtracks, placed
        if row == n:                     # every row has a queen: the base case
            return True
        for col in range(n):
            if safe(row, col):
                cols.append(col)
                placed += 1
                if place(row + 1):
                    return True
                cols.pop()               # the rows below failed: lift this queen
                backtracks += 1
        return False                     # no safe square left in this row

    found = place(0)
    return (cols if found else None), backtracks, placed

def show(cols):
    for c in cols:
        print(" ".join("Q" if k == c else "." for k in range(len(cols))))

solution, backtracks, placed = solve_queens(6)
show(solution)
print("backtracks:", backtracks, "  queens placed:", placed)
''')
    nb.md("""
        🐍 **Python notes**
        - `nonlocal backtracks, placed` lets the inner function `place` change those two counters of `solve_queens`.
          (Lists like `cols` can be changed with `.append` without it.)
        - `abs(x)` is the size of `x` without its sign. Two queens share a diagonal when their column gap equals their row gap.
        - `return (cols if found else None), backtracks, placed` returns three values at once, as a tuple.
          `solution, backtracks, placed = ...` unpacks them.
        - `"Q" if k == c else "."` picks one of two values. `cols if found else None` works the same way.
        - `" ".join("Q" if ... for k in range(n))` builds one string per square, then joins them with a space between each.

        **What you see:** a valid board, found after placing 31 queens and lifting 25 of them.
        That is 31 partial boards instead of 46,656 full ones.
    """)
    nb.predict(
        "Run the same search on every size from 1 to 8. **Does a bigger board always need more backtracks?**",
        "**No.** Size 8 needs the most (105), but size 7 needs only 2, far fewer than size 6 (25). "
        "Sizes 2 and 3 have no solution at all.",
    )
    nb.code('''
print(f"{'size':>4}  {'backtracks':>10}  {'placed':>6}  {'n ** n':>10}  first solution (column per row)")
for n in range(1, 9):
    sol, bt, pl = solve_queens(n)
    shown = [c + 1 for c in sol] if sol else "none"
    print(f"{n:>4}  {bt:>10}  {pl:>6}  {n ** n:>10,}  {shown}")
''')
    nb.md("""
        **What you see:**
        - Sizes 2 and 3 have **no solution**. Every other size up to 8 has one.
        - Size 8 needs the most backtracks: 105, with 113 queens placed. One queen per row would allow 16,777,216 boards.
        - Size 5 needs no backtracks at all, and size 7 needs only 2. The count depends on where the first solution sits, not only on the size.

        Columns in the table are counted from 1, as on the site's board.

        **Where this shows up in AI:** constraint solvers (timetables, Sudoku) and game-tree search work this way:
        try a choice, check it, undo it when it leads nowhere.
    """)

    # ------------------------------------------------------------------ 4 itertools
    nb.md("""
        ## 4. The library version: `itertools`

        Python's `itertools` module lists groups and orderings for you:

        - `combinations(items, k)`: every group of `k` items, order ignored.
        - `permutations(items)`: every ordering.
        - `product([False, True], repeat=n)`: every in/out pattern for `n` items.

        Check them against your own functions.
    """)
    nb.code('''
from itertools import combinations, permutations, product

items = ["a", "b", "c", "d"]
groups_lib = [list(c) for k in range(len(items) + 1) for c in combinations(items, k)]
patterns = [[x for x, keep in zip(items, mask) if keep] for mask in product([False, True], repeat=len(items))]
orders_lib = [list(p) for p in permutations(items)]

print("groups:   ", len(groups_lib), "same as yours:", sorted(groups_lib) == sorted(all_groups(items)))
print("patterns: ", len(patterns), "same as yours:", sorted(patterns) == sorted(all_groups(items)))
print("orderings:", len(orders_lib), "same as yours:", sorted(orders_lib) == sorted(all_orders(items)))
print(list(combinations(items, 2)))
''')
    nb.md("""
        🐍 **Python notes**
        - `itertools` functions produce their results one at a time. Wrap them in `list(...)` to see them all.
        - Each result is a **tuple**, like `('a', 'b')`: a list that cannot be changed.
        - `[... for k in ... for c in ...]` is a **list comprehension** with two loops, read left to right.
        - `zip(items, mask)` pairs each item with its `True`/`False` mark.

        **What you see:** 16 groups, 16 in/out patterns and 24 orderings, the same as your functions.
    """)
    nb.md("""
        ### Queens with `permutations`, and with backtracking

        A board with one queen per row and per column is an ordering of the columns. So `permutations(range(8))`
        lists all 40,320 such boards. Keep those with no shared diagonal, and compare with backtracking.
    """)
    nb.code('''
def no_diagonal(cols):
    return all(abs(cols[a] - cols[b]) != b - a for a in range(len(cols)) for b in range(a + 1, len(cols)))

def all_queens(n):
    """Every solution, by backtracking. Also counts queens placed."""
    cols, out, placed = [], [], [0]
    def place(row):
        if row == n:
            out.append(tuple(cols))
            return
        for col in range(n):
            if all(c != col and abs(c - col) != row - r for r, c in enumerate(cols)):
                cols.append(col)
                placed[0] += 1
                place(row + 1)
                cols.pop()
    place(0)
    return out, placed[0]

n = 8
lib = [p for p in permutations(range(n)) if no_diagonal(p)]
mine, placed = all_queens(n)
print("boards checked by permutations:", math.factorial(n))
print("queens placed by backtracking: ", placed)
print("solutions:", len(lib), "and", len(mine), "  same:", lib == mine)
print("first solution the same:", list(lib[0]) == solve_queens(n)[0])
''')
    nb.md("""
        🐍 `all(...)` is `True` when every check inside is `True`. It stops at the first `False`.

        **What you see:** both find the same 92 solutions for size 8, in the same order.
        `permutations` builds all 40,320 full boards and checks each one. Backtracking places 2,056 queens in total,
        because it drops a partial board as soon as two queens clash.

        Use `itertools` when you need every group or ordering. Write your own backtracking when most
        partial choices can be ruled out early.
    """)

    # ------------------------------------------------------------------ practice
    nb.md("""
        ## Practice

        Fill in each function, then run its cell to see the checks. The method isn't named: deciding how to solve it is part of the problem.
    """)
    nb.problem(1, """
        You have a list of different positive whole numbers and a target.
        **Return every group of the numbers that adds up exactly to the target.**
        Sort the numbers inside each group, and sort the list of groups (use `sorted`), so the checks can compare.
        The empty group adds up to 0.
    """, starter='''
def groups_adding_to(nums, target):
    # your code here
    return None

CASES_1 = [(([3, 1, 4, 2], 5), [[1, 4], [2, 3]]),
           (([1, 2, 3, 4, 5], 5), [[1, 4], [2, 3], [5]]),
           (([6, 1, 5, 2, 7], 8), [[1, 2, 5], [1, 7], [2, 6]]),
           (([2, 4, 6], 5), []),
           (([1, 2, 3, 4], 10), [[1, 2, 3, 4]]),
           (([1, 2, 3], 0), [[]])]
check(groups_adding_to, CASES_1)
''', solution='''
def groups_adding_to(nums, target):
    out, chosen = [], []

    def decide(i, left):
        if i == len(nums):
            if left == 0:
                out.append(sorted(chosen))
            return
        decide(i + 1, left)                  # leave nums[i] out
        if nums[i] <= left:                  # all numbers are positive, so a bigger one can never fit
            chosen.append(nums[i])
            decide(i + 1, left - nums[i])    # put nums[i] in
            chosen.pop()                     # undo

    decide(0, target)
    return sorted(out)

check(groups_adding_to, CASES_1)
# The check `nums[i] <= left` skips every group that has already gone over the target.
''')
    nb.problem(2, """
        **Return every different arrangement of the letters of a word**, as a sorted list of strings.
        Letters can repeat: `"aab"` has only 3 different arrangements, not 6. Each arrangement must appear once.
    """, starter='''
def arrangements(word):
    # your code here
    return None

CASES_2 = [(("ab",), ["ab", "ba"]),
           (("abc",), ["abc", "acb", "bac", "bca", "cab", "cba"]),
           (("aab",), ["aab", "aba", "baa"]),
           (("bob",), ["bbo", "bob", "obb"]),
           (("aaa",), ["aaa"]),
           (("x",), ["x"])]
check(arrangements, CASES_2)
''', solution='''
def arrangements(word):
    counts = {}
    for ch in word:
        counts[ch] = counts.get(ch, 0) + 1   # how many of each letter are left to use
    out, chosen = [], []

    def extend():
        if len(chosen) == len(word):
            out.append("".join(chosen))
            return
        for ch in sorted(counts):            # each different letter once per spot, so no repeats
            if counts[ch] == 0:
                continue
            counts[ch] -= 1
            chosen.append(ch)
            extend()
            chosen.pop()                     # undo
            counts[ch] += 1

    extend()
    return out

check(arrangements, CASES_2)
# Trying letters in sorted order makes the list come out sorted already.
# counts.get(ch, 0) reads a dictionary entry, with 0 if the letter is not there yet.
''')
    nb.problem(3, """
        **In how many ways can you pay `amount` with coins from `coins`?** You can use each coin value as many times as you like.
        Order doesn't matter: 1 + 2 and 2 + 1 are the same way. Paying 0 has one way: no coins.
    """, starter='''
def ways_to_pay(amount, coins):
    # your code here
    return None

CASES_3 = [((5, [1, 2]), 3), ((10, [2, 5, 3, 6]), 5), ((12, [1, 5, 10]), 4),
           ((3, [2]), 0), ((0, [1, 2]), 1), ((100, [1, 5, 10, 25, 50]), 292)]
check(ways_to_pay, CASES_3)
''', solution='''
def ways_to_pay(amount, coins, i=0):
    if amount == 0:
        return 1                             # paid exactly: one way
    if amount < 0 or i == len(coins):
        return 0                             # overpaid, or no coin values left
    use_it = ways_to_pay(amount - coins[i], coins, i)       # use coin i (and maybe again)
    skip_it = ways_to_pay(amount, coins, i + 1)             # never use coin i again
    return use_it + skip_it

check(ways_to_pay, CASES_3)
# Once you skip a coin value you never come back to it. That is what stops 1 + 2 and 2 + 1 counting twice.
''')
    nb.problem(4, """
        A grid of letters is given as a list of strings. A word can be traced by starting on any square and
        moving one step up, down, left or right for each next letter. No square may be used twice in one word.
        **Return `True` if the word can be traced, else `False`.**

        ```
        C A R E
        O T S D
        D E A N
        ```
    """, starter='''
GRID = ["CARE",
        "OTSD",
        "DEAN"]

def can_trace(grid, word):
    # your code here
    return None

CASES_4 = [((GRID, "CARE"), True), ((GRID, "STAR"), True), ((GRID, "TEAS"), True),
           ((GRID, "CARTS"), False), ((GRID, "ACA"), False), ((GRID, "SEAT"), False)]
check(can_trace, CASES_4)
''', solution='''
def can_trace(grid, word):
    rows, cols = len(grid), len(grid[0])
    used = set()

    def walk(r, c, k):
        """Can word[k:] be traced starting on square (r, c)?"""
        if k == len(word):
            return True                      # every letter matched
        if not (0 <= r < rows and 0 <= c < cols):
            return False                     # off the grid
        if (r, c) in used or grid[r][c] != word[k]:
            return False
        used.add((r, c))
        found = any(walk(r + dr, c + dc, k + 1) for dr, dc in [(1, 0), (-1, 0), (0, 1), (0, -1)])
        used.discard((r, c))                 # undo, so other paths may use this square
        return found

    return any(walk(r, c, 0) for r in range(rows) for c in range(cols))

check(can_trace, CASES_4)
# "CARTS" fails because R to T is a diagonal step. "ACA" fails because it would need the same A twice.
''')
    nb.problem(5, """
        A 4 × 4 grid must hold the numbers 1 to 4 so that every row, every column and each of the four
        2 × 2 corner blocks contains 1, 2, 3 and 4 once each. A 0 marks an empty square.
        **Return the filled grid as a new list of lists, or `None` if it cannot be filled.**
        Each test puzzle has exactly one answer.
    """, starter='''
def fill_grid(grid):
    # your code here
    return None

FULL = [[1, 2, 3, 4], [3, 4, 1, 2], [2, 1, 4, 3], [4, 3, 2, 1]]
CASES_5 = [(([[0, 4, 0, 0], [0, 0, 2, 0], [0, 1, 0, 0], [0, 0, 3, 0]],), [[2, 4, 1, 3], [1, 3, 2, 4], [3, 1, 4, 2], [4, 2, 3, 1]]),
           (([[0, 0, 0, 1], [3, 0, 0, 0], [0, 0, 0, 0], [1, 2, 0, 0]],), [[2, 4, 3, 1], [3, 1, 2, 4], [4, 3, 1, 2], [1, 2, 4, 3]]),
           (([[0, 4, 1, 0], [2, 0, 0, 4], [0, 0, 0, 0], [0, 0, 0, 1]],), [[3, 4, 1, 2], [2, 1, 3, 4], [1, 2, 4, 3], [4, 3, 2, 1]]),
           (([[0, 2, 0, 0], [0, 0, 0, 3], [4, 0, 0, 0], [0, 0, 1, 0]],), [[3, 2, 4, 1], [1, 4, 2, 3], [4, 1, 3, 2], [2, 3, 1, 4]]),
           (([row[:] for row in FULL],), FULL),
           (([[1, 2, 3, 0], [0, 0, 0, 4], [0, 0, 0, 0], [0, 0, 0, 0]],), None)]
check(fill_grid, CASES_5)
''', solution='''
def fill_grid(grid):
    g = [row[:] for row in grid]             # work on a copy

    def allowed(r, c, v):
        if v in g[r]:
            return False                     # already in this row
        if any(g[k][c] == v for k in range(4)):
            return False                     # already in this column
        br, bc = r // 2 * 2, c // 2 * 2      # top-left square of the 2 x 2 block
        return all(g[br + i][bc + j] != v for i in range(2) for j in range(2))

    def fill():
        for r in range(4):
            for c in range(4):
                if g[r][c] == 0:             # the first empty square
                    for v in range(1, 5):
                        if allowed(r, c, v):
                            g[r][c] = v
                            if fill():
                                return True
                            g[r][c] = 0      # undo, try the next number
                    return False             # no number fits here
        return True                          # no empty square left

    return g if fill() else None

check(fill_grid, CASES_5)
# row[:] copies one row. [row[:] for row in grid] copies the whole grid, so the caller's grid is unchanged.
''')

    nb.cue([
        ('"try every combination or arrangement"', "recursion with backtracking"),
        ('"a choice may turn out bad later"', "undo it and try the next (backtrack)"),
        ('"the same problem, but smaller"', "recursion with a base case"),
    ])
    nb.practise_more("""
        For this topic: the CSES Problem Set's *Introductory Problems* section (it includes a queens problem);
        LeetCode problems with the *Backtracking* tag.
    """)
    nb.save(PATH)
    print("wrote", PATH)


if __name__ == "__main__":
    build()

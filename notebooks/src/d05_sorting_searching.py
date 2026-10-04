"""Generates notebooks/dsa/05_sorting_searching.ipynb (the reference DSA practice notebook)

    python3 notebooks/src/d05_sorting_searching.py
"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))
from nb import Notebook  # noqa: E402

PATH = "notebooks/dsa/05_sorting_searching.ipynb"


def build() -> None:
    nb = Notebook()
    nb.header(
        eyebrow="DSA topic 5 · Sorting and binary search · practice notebook",
        title="How do you put things in order fast, and then find one fast?",
        path=PATH,
        question="How do you put things in order fast, and then find one fast?",
        answer=("Merge sort splits the list, sorts the halves and merges them: about n log n steps. "
                "Once sorted, binary search finds any item by halving the range each time: about log n checks."),
        build_text="""
            In this notebook you will:

            1. **Write merge sort** and count its comparisons, then compare it with comparing every pair.
            2. **Write binary search**, and meet Python's own versions (`sorted` and `bisect`).
            3. **Solve 5 practice problems.** Each has checks you can run, and a solution one click away.

            Running every cell takes a few seconds. The site's step-by-step animation of these algorithms is on the
            *Sorting and binary search* page of the DSA track.
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

    # ------------------------------------------------------------------ 1 merge
    nb.md("""
        ## 1. Two sorted lists into one

        You have two lists that are already sorted. **How do you combine them into one sorted list, quickly?**

        Look at the front item of each list. The smaller one must be the smallest of all, so it goes first.
        Remove it, and repeat.
    """)
    nb.predict(
        "Merging `[2, 5, 9]` and `[1, 6, 7]` this way: **how many comparisons?**",
        "**5.** 1 vs 2, 2 vs 6, 5 vs 6, 9 vs 6, 9 vs 7. Then the second list is empty, so 9 is copied without comparing.",
    )
    nb.code('''
def merge(a, b, counter):
    out = []
    i = j = 0
    while i < len(a) and j < len(b):
        counter[0] += 1                      # one comparison
        if a[i] <= b[j]:
            out.append(a[i]); i += 1
        else:
            out.append(b[j]); j += 1
    out.extend(a[i:])                        # whatever is left in one list
    out.extend(b[j:])
    return out

counter = [0]
print(merge([2, 5, 9], [1, 6, 7], counter), "comparisons:", counter[0])
''')
    nb.md("""
        🐍 **Python notes**
        - `counter` is a one-item list, `[0]`. The function changes `counter[0]`, and the caller sees the change, because both refer to the same list.
        - `a[i:]` is a **slice**: the items from position `i` to the end. `out.extend(...)` adds all of them.
        - `i = j = 0` sets both names to 0.
    """)

    # ------------------------------------------------------------------ 2 merge sort
    nb.md("""
        ## 2. Merge sort: split, sort each half, merge

        A list of one item is already sorted. Any longer list: split it in half, sort each half the same way, and merge the two sorted halves.
    """)
    nb.code('''
def merge_sort(xs, counter):
    if len(xs) <= 1:
        return xs                            # one item: already sorted
    mid = len(xs) // 2
    left = merge_sort(xs[:mid], counter)
    right = merge_sort(xs[mid:], counter)
    return merge(left, right, counter)

import random
random.seed(0)
xs = random.sample(range(100), 12)
counter = [0]
print(xs)
print(merge_sort(xs, counter), "comparisons:", counter[0])
''')
    nb.md("""
        🐍 `merge_sort` calls itself on smaller lists: **recursion**. The `if len(xs) <= 1` line is the **base case** that stops it.
        `len(xs) // 2` is whole-number division: `7 // 2` is 3.
    """)
    nb.md("""
        ### How many comparisons, compared with checking every pair?

        Count merge sort's comparisons for growing lists, next to $n(n-1)/2$ (the number of pairs) and $n \\log_2 n$.
    """)
    nb.code('''
import math
print(f"{'n':>7} {'merge sort':>11} {'n log2 n':>10} {'every pair':>12}")
for n in [10, 100, 1_000, 10_000, 100_000]:
    counter = [0]
    merge_sort(random.sample(range(10 * n), n), counter)
    print(f"{n:>7,} {counter[0]:>11,} {round(n * math.log2(n)):>10,} {n * (n - 1) // 2:>12,}")
''')
    nb.md("""
        **What you see:** merge sort's count stays a little under $n \\log_2 n$. Comparing every pair grows far faster:
        at 100,000 items it is about 5 billion pairs against under 2 million comparisons.

        **What it's called:** splitting a problem into smaller copies of itself, solving them and combining the answers is **divide and conquer**.
        Merge sort takes $O(n \\log n)$ time.
    """)

    # ------------------------------------------------------------------ 3 library
    nb.md("""
        ## 3. The library version: `sorted`

        Python's `sorted(xs)` returns a new sorted list; `xs.sort()` sorts the list in place.
        Both use **Timsort**, a merge sort that also spots runs that are already in order.
    """)
    nb.code('''
import time
data = random.sample(range(10_000_000), 200_000)

t0 = time.time(); mine = merge_sort(data, [0]); t_mine = time.time() - t0
t0 = time.time(); theirs = sorted(data); t_lib = time.time() - t0
print("same answer:", mine == theirs)
print(f"your merge sort: {t_mine:.2f}s    sorted(): {t_lib:.3f}s")

people = [("Ana", 31), ("Ben", 25), ("Chloe", 31), ("Dev", 19)]
print(sorted(people, key=lambda p: p[1]))                  # sort by age
print(sorted(people, key=lambda p: (-p[1], p[0])))        # oldest first, then by name
''')
    nb.md("""
        🐍 **Python notes**
        - `key=lambda p: p[1]` tells `sorted` what to compare: here the second item of each pair. `lambda` makes a small one-line function.
        - A key that returns a tuple, like `(-p[1], p[0])`, compares the first item, then the second to break ties. The minus sign reverses the age order.
        - `200_000` is the same as `200000`; the underscores only make it easier to read.

        **What you see:** the same answer, but `sorted` is many times faster. It is written in C, and it is the one to use in real code.
        Writing your own is how you learn what it does and what it costs.
    """)

    # ------------------------------------------------------------------ 4 binary search
    nb.md("""
        ## 4. Find an item by halving: binary search

        In a sorted list, check the middle item. If it is too small, the target can only be in the right half; if too big, only in the left half.
        Each check throws away half of what is left.
    """)
    nb.predict(
        "A sorted list holds 1,000,000 numbers. **How many checks can binary search need, at most?**",
        "**20.** Each check halves the range, and $2^{20} = 1{,}048{,}576$ is the first power of 2 above a million.",
    )
    nb.code('''
def binary_search(xs, target):
    lo, hi = 0, len(xs) - 1
    checks = 0
    while lo <= hi:
        mid = (lo + hi) // 2
        checks += 1
        if xs[mid] == target:
            return mid, checks
        if xs[mid] < target:
            lo = mid + 1                     # target can only be to the right
        else:
            hi = mid - 1                     # target can only be to the left
    return -1, checks                        # not found

big = list(range(0, 2_000_000, 2))           # 1,000,000 even numbers, sorted
worst = max(binary_search(big, t)[1] for t in random.sample(range(2_000_000), 2_000))
print("position of 777,778:", binary_search(big, 777_778))
print("most checks over 2,000 random searches:", worst)
''')
    nb.md("""
        🐍 `lo, hi = 0, len(xs) - 1` sets two names at once. A function can return several values as a tuple: `return mid, checks`.

        **What it's called:** this is **binary search**. It takes $O(\\log n)$ checks, but only works on sorted data.

        **The library version:** the `bisect` module. `bisect_left(xs, x)` returns the first position where `x` could be inserted with the list staying sorted.
    """)
    nb.code('''
from bisect import bisect_left, bisect_right
xs = [3, 8, 8, 8, 15, 21]
print("first position of 8:", bisect_left(xs, 8))
print("position after the last 8:", bisect_right(xs, 8))
print("how many 8s:", bisect_right(xs, 8) - bisect_left(xs, 8))
''')

    # ------------------------------------------------------------------ 5 search on the answer
    nb.md("""
        ## 5. Halving works on more than lists

        **What is the smallest whole number $x$ with $x^2 \\ge 1{,}000{,}000{,}007$?**

        The yes/no question "is $x^2 \\ge$ the target?" is *no* for small $x$ and *yes* for every larger one: it flips once.
        Halving finds the flip point, without any list at all.
    """)
    nb.code('''
def smallest_yes(lo, hi, is_yes):
    """Smallest x in [lo, hi] with is_yes(x) True. Assumes the answer flips from False to True once."""
    while lo < hi:
        mid = (lo + hi) // 2
        if is_yes(mid):
            hi = mid                         # mid works: the answer is mid or smaller
        else:
            lo = mid + 1                     # mid fails: the answer is bigger
    return lo

target = 1_000_000_007
x = smallest_yes(0, target, lambda v: v * v >= target)
print(x, x * x >= target, (x - 1) * (x - 1) >= target)
''')
    nb.md("""
        **What you see:** about 30 checks find the answer among a billion candidates.

        **What it's called:** this is **binary search on the answer**. It works whenever a yes/no question flips once as the number grows.
    """)

    # ------------------------------------------------------------------ practice
    nb.md("""
        ## Practice

        Fill in each function, then run its cell to see the checks. The method isn't named: deciding how to solve it is part of the problem.
    """)
    nb.problem(1, """
        A sorted list may contain repeats. Return the **first position holding a value of at least `x`**.
        If every value is smaller than `x`, return `len(xs)`. Aim for about $\\log n$ steps.
    """, starter='''
def first_at_least(xs, x):
    # your code here
    return None

CASES_1 = [(([1, 3, 3, 3, 8], 3), 1), (([1, 3, 3, 3, 8], 4), 4), (([1, 3, 3, 3, 8], 9), 5),
           (([1, 3, 3, 3, 8], 0), 0), (([], 5), 0), (([7], 7), 0)]
check(first_at_least, CASES_1)
''', solution='''
def first_at_least(xs, x):
    lo, hi = 0, len(xs)                      # the answer is somewhere in 0..len(xs)
    while lo < hi:
        mid = (lo + hi) // 2
        if xs[mid] >= x:
            hi = mid                         # mid could be the answer; look left
        else:
            lo = mid + 1
    return lo

check(first_at_least, CASES_1)
# This is what bisect_left does.
''')
    nb.problem(2, """
        A sorted list of exam marks. **How many marks are between `lo` and `hi`, including both ends?**
        The list can be very long, so don't walk through all of it.
    """, starter='''
def count_between(marks, lo, hi):
    # your code here
    return None

CASES_2 = [(([40, 52, 52, 67, 71, 88, 93], 50, 70), 3), (([40, 52, 52, 67, 71, 88, 93], 0, 100), 7),
           (([40, 52, 52, 67, 71, 88, 93], 94, 99), 0), (([40, 52, 52, 67, 71, 88, 93], 52, 52), 2)]
check(count_between, CASES_2)
''', solution='''
from bisect import bisect_left, bisect_right

def count_between(marks, lo, hi):
    # first position >= lo, and first position > hi: everything between them is in range
    return bisect_right(marks, hi) - bisect_left(marks, lo)

check(count_between, CASES_2)
''')
    nb.problem(3, """
        A list of meetings, each a pair `(start, end)`, in no order. Meetings that overlap or touch must share one room booking.
        **Return the combined bookings, earliest first.** For example, `(1, 3)` and `(2, 6)` become `(1, 6)`.
    """, starter='''
def combine(meetings):
    # your code here
    return None

CASES_3 = [(([(1, 3), (2, 6), (8, 10), (15, 18)],), [(1, 6), (8, 10), (15, 18)]),
           (([(5, 7), (1, 2), (2, 4)],), [(1, 4), (5, 7)]),
           (([(1, 10), (2, 3), (4, 5)],), [(1, 10)]),
           (([],), [])]
check(combine, CASES_3)
''', solution='''
def combine(meetings):
    out = []
    for start, end in sorted(meetings):              # sorted by start time
        if out and start <= out[-1][1]:              # overlaps or touches the last booking
            out[-1] = (out[-1][0], max(out[-1][1], end))
        else:
            out.append((start, end))
    return out

check(combine, CASES_3)
# Sorting first means each meeting only needs comparing with the last booking: O(n log n) in total.
''')
    nb.problem(4, """
        A printer has a list of jobs, given as page counts. It works on one job at a time.
        Each hour it prints up to `s` pages of the current job; if the job finishes early, the rest of that hour is unused.
        **What is the smallest whole number `s` that finishes every job within `h` hours?** (Assume `h` is at least the number of jobs.)
    """, starter='''
def slowest_speed(jobs, h):
    # your code here
    return None

CASES_4 = [(([3, 6, 7, 11], 8), 4), (([30, 11, 23, 4, 20], 5), 30), (([30, 11, 23, 4, 20], 6), 23),
           (([1], 1), 1), (([1_000_000_000], 2), 500_000_000)]
check(slowest_speed, CASES_4)
''', solution='''
def hours_needed(jobs, s):
    return sum((pages + s - 1) // s for pages in jobs)    # whole hours per job, rounded up

def slowest_speed(jobs, h):
    lo, hi = 1, max(jobs)                    # speed max(jobs) always works: one hour per job
    while lo < hi:
        mid = (lo + hi) // 2
        if hours_needed(jobs, mid) <= h:
            hi = mid                         # fast enough: try slower
        else:
            lo = mid + 1                     # too slow
    return lo

check(slowest_speed, CASES_4)
# "Fast enough?" is False for small s and True for every larger s, so halving finds the flip point.
''')
    nb.problem(5, """
        A list of numbers in no order. **What is the smallest difference between any two of them?**
        Checking every pair is too slow for a million numbers.
    """, starter='''
def smallest_gap(xs):
    # your code here
    return None

CASES_5 = [(([31, 4, 15, 9, 26],), 5), (([10, 3, 10],), 0), (([1, 100],), 99), (([-5, 7, 2, -1],), 3)]
check(smallest_gap, CASES_5)
''', solution='''
def smallest_gap(xs):
    s = sorted(xs)
    return min(b - a for a, b in zip(s, s[1:]))     # after sorting, the closest pair are neighbours

check(smallest_gap, CASES_5)
# zip(s, s[1:]) pairs each item with the next one. Sorting costs O(n log n); the scan costs O(n).
''')

    nb.cue([
        ("find an item in sorted data", "binary search (or `bisect`)"),
        ('"the smallest x such that ..." with a yes/no answer that flips once', "binary search on the answer"),
        ("closest pair, overlaps, duplicates", "sort first, then look at neighbours"),
        ("sorting up to $10^6$ items", "an $O(n \\log n)$ sort, which `sorted` already is"),
    ])
    nb.practise_more("""
        For this topic: the CSES Problem Set's *Sorting and Searching* section; the USACO Guide's *Binary Search* module (Silver);
        LeetCode's *Binary Search* and *Sorting* tags.
    """)
    nb.save(PATH)
    print("wrote", PATH)


if __name__ == "__main__":
    build()

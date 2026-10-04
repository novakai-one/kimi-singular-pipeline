"""Generates notebooks/dsa/09_greedy.ipynb (DSA topic 9: greedy algorithms)

    python3 notebooks/src/d09_greedy.py
"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))
from nb import Notebook  # noqa: E402

PATH = "notebooks/dsa/09_greedy.ipynb"


def build() -> None:
    nb = Notebook()
    nb.header(
        eyebrow="DSA topic 9 · Greedy algorithms · practice notebook",
        title="When does taking the best-looking step every time give the best answer?",
        path=PATH,
        question="When does taking the best-looking step every time give the best answer overall?",
        answer=("Sometimes. A rule that takes the best-looking step and never goes back is fast. "
                "For some problems it is provably best; for others it is badly wrong. "
                "A small search by computer often shows you which kind you have."),
        build_text="""
            In this notebook you will:

            1. **Make change biggest-first**, and compare it with a table of the fewest coins for every amount.
            2. **Write a small checker** that tries every tiny case and stops at the first one where a quick rule loses.
            3. **Fit the most meetings in one room**, and use the checker to see why two other rules fail.
            4. **Fill a bag with items you can cut**, and see why the same rule fails when you can't cut them.
            5. **Solve 5 practice problems.** Each has checks you can run, and a solution one click away.

            Running every cell takes a few seconds. The site's step-by-step animation of the coin example is on the
            *Greedy algorithms* page of the DSA track.
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

    # ------------------------------------------------------------------ 1 coins
    nb.md("""
        ## 1. Does biggest-first give the fewest coins?

        You owe someone 6 cents, and you want to hand over as few coins as possible.
        A quick rule: **take the biggest coin that fits, then repeat** until nothing is left.
    """)
    nb.predict(
        "Coins 1, 3 and 4. Make 6 biggest-first. **Is that the fewest coins?**",
        "**No.** Biggest-first takes 4, then 1 and 1: three coins. But 3 + 3 uses two.",
    )
    nb.code('''
def biggest_first(coins, amount):
    """Take the largest coin that fits, again and again. Returns the coins taken, or None if it gets stuck."""
    taken = []
    for c in sorted(coins, reverse=True):    # largest coin first
        while c <= amount:                   # this coin still fits
            taken.append(c)
            amount -= c
    return taken if amount == 0 else None

print(biggest_first([1, 5, 10, 25], 30))
print(biggest_first([1, 3, 4], 6))
print(biggest_first([4, 5], 8))              # 5 fits, then 3 is left and no coin fits
''')
    nb.md("""
        🐍 **Python notes**
        - `sorted(coins, reverse=True)` returns a new list, largest first. The original list is unchanged.
        - `amount -= c` is short for `amount = amount - c`.
        - `taken if amount == 0 else None` picks one of two values. `None` is Python's "no value".
    """)
    nb.md("""
        ### The sure way: a table of the fewest coins for every amount

        Biggest-first commits to each coin. To be sure, work out the fewest coins for **every** amount from 0 up to the target.

        - Amount 0 needs 0 coins.
        - For amount `x`, try each coin `c` that fits. What is left, `x − c`, is a smaller amount, already in the table.
        - So `best[x]` is 1 more than the smallest `best[x − c]`.
    """)
    nb.code('''
INF = float("inf")                           # "can't be made": bigger than any count

def fewest_coins(coins, amount):
    """best[x] = the fewest coins that make x exactly, for every x from 0 to amount."""
    best = [0] + [INF] * amount
    for x in range(1, amount + 1):
        for c in coins:
            if c <= x and best[x - c] + 1 < best[x]:
                best[x] = best[x - c] + 1
    return best

print(fewest_coins([1, 3, 4], 6))
''')
    nb.md("""
        🐍 **Python notes**
        - `float("inf")` is infinity. Any number is smaller than it, so the first real count always replaces it.
        - `[INF] * amount` makes a list of `amount` copies. `[0] + [...]` joins two lists.
        - `range(1, amount + 1)` counts 1, 2, …, `amount`. The end of a range is not included.

        **What you see:** the table for coins 1, 3, 4 reads 0, 1, 2, 1, 1, 2, 2 for amounts 0 to 6.
        The last entry says 6 needs **2** coins. Biggest-first used 3.
    """)
    nb.md("""
        ### Side by side on a few coin sets
    """)
    nb.code('''
for coins, amount in [([1, 5, 10, 25], 30), ([1, 3, 4], 6), ([1, 5, 6, 9], 11), ([1, 7, 10], 14), ([4, 5], 8)]:
    g = biggest_first(coins, amount)
    f = fewest_coins(coins, amount)[amount]
    shown = f"{len(g)} coins {g}" if g else "stuck"
    print(f"coins {coins}, amount {amount}:  biggest-first {shown},  fewest {f}")
''')
    nb.md("""
        **What you see:**
        - Coins 1, 5, 10, 25 and amount 30: both give 2 coins (25 + 5).
        - Coins 1, 5, 6, 9 and amount 11: biggest-first takes 9 + 1 + 1, three coins. Two are enough: 5 + 6.
        - Coins 1, 7, 10 and amount 14: biggest-first takes 10 and four 1s, five coins. 7 + 7 is two.
        - Coins 4 and 5 and amount 8: biggest-first takes 5, then gets stuck on 3. But 4 + 4 works.

        **What it's called:** a method that takes the best-looking step each time, and never goes back, is a **greedy algorithm**.
        The table method is **dynamic programming**, the next topic.
        Greedy is fast. The table costs (amount × number of coins) steps, but it is always right.
    """)
    nb.md("""
        ### Does biggest-first ever fail for coins 1, 2, 5, 10, 20 and 50?

        List every amount where biggest-first loses to the table.
    """)
    nb.code('''
def failures(coins, top):
    """Every amount from 1 to top where biggest-first is stuck or uses more coins than the table."""
    best = fewest_coins(coins, top)
    out = []
    for a in range(1, top + 1):
        g = biggest_first(coins, a)
        if g is None or len(g) > best[a]:
            out.append(a)
    return out

print("1 2 5 10 20 50:", failures([1, 2, 5, 10, 20, 50], 200))
print("1 3 4:         ", failures([1, 3, 4], 30))
''')
    nb.md("""
        **What you see:** no amount up to 200 fails for 1, 2, 5, 10, 20 and 50.
        (If a coin set fails anywhere, its smallest failing amount is below the two largest coins added together, here 70.
        So 200 covers it.) For 1, 3, 4 the failures are 6, 10, 14 and every 4th amount after that, up to 30.

        **Whether greedy works depends on the exact coins, not on the idea of making change.**
    """)

    # ------------------------------------------------------------------ 2 checker
    nb.md("""
        ## 2. Let the computer hunt for a counterexample

        You have a quick rule, and a slow method that is always right.
        Try every small case, in order from small to large, and **stop at the first case where the quick rule does worse.**
        That case is a *counterexample*: one example that proves the rule is not always right.
    """)
    nb.code('''
def first_counterexample(cases, quick, sure):
    """Return the first case where quick(case) and sure(case) disagree, or None if they always agree."""
    tried = 0
    for case in cases:
        tried += 1
        if quick(*case) != sure(*case):
            return case, tried
    return None, tried

def coin_cases():
    """Coin sets {1, a, b} with b up to 10, and every amount up to 20: small coins first."""
    for b in range(3, 11):
        for a in range(2, b):
            for amount in range(1, 21):
                yield [1, a, b], amount

def greedy_count(coins, amount):
    g = biggest_first(coins, amount)
    return len(g) if g is not None else INF

def table_count(coins, amount):
    return fewest_coins(coins, amount)[amount]

print(first_counterexample(coin_cases(), greedy_count, table_count))
''')
    nb.md("""
        🐍 **Python notes**
        - `yield` turns a function into a **generator**: it hands back one value at a time, and `for case in coin_cases()` asks for the next one.
          Nothing is stored, so you can loop over millions of cases.
        - `quick(*case)` unpacks the tuple `case` into separate arguments.
        - `return case, tried` returns two values as one tuple.

        **What you see:** the checker stops at coins 1, 3, 4 and amount 6, the same example as the prediction.
        It had tried 46 cases.
    """)
    nb.code('''
bad_sets = []
for b in range(3, 11):
    for a in range(2, b):
        if failures([1, a, b], 2 * b):
            bad_sets.append((1, a, b))
print(len(bad_sets), "of 28 coin sets {1, a, b} fail somewhere:")
print(bad_sets)
''')
    nb.md("""
        🐍 `if failures(...)`: an empty list counts as false, so a coin set is added only when it has at least one failing amount.

        **What you see:** 17 of the 28 coin sets fail for some amount.
        Biggest-first change is not a safe habit; it is right only for some coin sets.
    """)

    # ------------------------------------------------------------------ 3 meetings
    nb.md("""
        ## 3. How many meetings fit in one room?

        Each meeting is a pair `(start, end)`. One room, no two meetings at once.
        A meeting may start the moment another ends. **Which meetings should you keep, to keep the most?**

        Three rules sound reasonable. Each sorts the meetings, then walks through them and keeps every meeting that doesn't overlap one already kept.
        - **Earliest start:** the meeting that starts first.
        - **Shortest:** the meeting that takes the least time.
        - **Earliest finish:** the meeting that ends first.
    """)
    nb.predict(
        "**Which of the three rules always keeps the most meetings?**",
        "**Earliest finish.** The other two fail on small examples, and the checker below finds them.",
    )
    nb.code('''
def keep(meetings, key):
    """Walk through the meetings in the order given by key; keep each one that overlaps none already kept."""
    kept = []
    for start, end in sorted(meetings, key=key):
        if all(end <= s or start >= e for s, e in kept):
            kept.append((start, end))
    return kept

RULES = {
    "earliest start": lambda m: m[0],
    "shortest": lambda m: m[1] - m[0],
    "earliest finish": lambda m: m[1],
}

meetings = [(1, 4), (2, 3), (3, 5), (6, 7)]
for name, key in RULES.items():
    print(f"{name:>15}: {keep(meetings, key)}")
''')
    nb.md("""
        🐍 **Python notes**
        - `sorted(meetings, key=...)` sorts by whatever the key function returns. `lambda m: m[1]` is a one-line function: "the end time of m".
        - `for start, end in ...` unpacks each pair into two names.
        - `all(...)` is `True` when every item is true. Here: the new meeting ends before, or starts after, every kept meeting.
        - `RULES` is a **dict** (name → function). `.items()` gives each name with its function. `{name:>15}` pads the name to 15 characters.

        **What you see:** earliest start keeps only 2 meetings here, because 1–4 starts first and blocks 2–3 and 3–5.
        Shortest and earliest finish both keep 3.
    """)
    nb.md("""
        ### The checker on meetings

        The sure method tries every group of meetings, biggest group first, and returns the size of the first group with no overlaps.
        The cases are every set of up to 4 meetings with whole-number times from 0 to 6.
    """)
    nb.code('''
from itertools import combinations

def most_meetings(meetings):
    """The true answer, by trying every group (fine for a handful of meetings)."""
    for k in range(len(meetings), 0, -1):
        for group in combinations(meetings, k):
            g = sorted(group)
            if all(a[1] <= b[0] for a, b in zip(g, g[1:])):
                return k
    return 0

SLOTS = [(s, e) for s in range(0, 6) for e in range(s + 1, 7)]       # 21 possible meetings

def meeting_cases():
    for n in range(1, 5):
        for group in combinations(SLOTS, n):
            yield (list(group),)

for name, key in RULES.items():
    case, tried = first_counterexample(meeting_cases(), lambda ms: len(keep(ms, key)), most_meetings)
    if case:
        ms = case[0]
        print(f"{name:>15}: fails on {ms}: keeps {keep(ms, key)}, but {most_meetings(ms)} fit")
    else:
        print(f"{name:>15}: no counterexample in {tried:,} cases")
''')
    nb.md("""
        🐍 **Python notes**
        - `combinations(xs, k)` gives every group of `k` items from `xs`, each group once.
        - `zip(g, g[1:])` pairs each meeting with the next one.
        - `[(s, e) for s in ... for e in ...]` is a **list comprehension** with two loops: every start with every later end.
        - `(list(group),)` is a tuple with one item. The trailing comma makes it a tuple, so the checker can unpack it into one argument.
        - `{tried:,}` prints a number with commas: `7,546`.

        **What you see:**
        - **Earliest start** fails on `(0, 3), (1, 2), (2, 3)`. It keeps 0–3, which blocks the other two. Two fit: 1–2 and 2–3.
        - **Shortest** fails on `(0, 3), (2, 4), (3, 5)`. It keeps 2–4, the shortest, which overlaps both others. Two fit: 0–3 and 3–5.
        - **Earliest finish** has no counterexample in all 7,546 cases.
    """)
    nb.md("""
        ### Why does earliest finish never lose?

        A test over 7,546 cases is strong evidence, not a proof. Here is the proof, in plain words.

        1. Take any best answer, with its meetings in time order.
        2. Its first meeting ends no earlier than the earliest-finishing meeting of all. Call that one `g`.
        3. Swap the first meeting for `g`. `g` ends no later, so it still ends before the second meeting starts. Same count, still no overlaps.
        4. Now look only at meetings that start after `g` ends, and repeat.

        Step by step, the best answer turns into the greedy answer, and it never loses a meeting.
        **So the greedy answer is as large as any best answer.**
        Changing a best answer into the greedy one, one swap at a time, without making it worse, is called an *exchange argument*.

        Watch the swaps on one example. The best answer below was picked by hand: 0–3, 3–6, 7–9.
    """)
    nb.code('''
meetings = [(0, 3), (1, 2), (2, 5), (3, 6), (6, 8), (7, 9)]
greedy = keep(meetings, RULES["earliest finish"])
answer = [(0, 3), (3, 6), (7, 9)]
print("best answer:", answer, "  greedy:", greedy)

for i in range(len(answer)):
    if answer[i] != greedy[i]:
        answer[i] = greedy[i]                # swap in the greedy choice
        ok = all(a[1] <= b[0] for a, b in zip(answer, answer[1:]))
        print(f"swap in {greedy[i]}: {answer}   still no overlaps: {ok}")
''')
    nb.md("""
        **What you see:** three swaps, and after each one the meetings still don't overlap. The count stays at 3.

        **Why the same proof fails for coins 1, 3, 4 and amount 6:** the best answer is 3 + 3.
        Swapping its first coin for the biggest coin, 4, leaves 2, and 2 needs two more coins. The swap makes the answer worse, so the exchange argument breaks.
    """)

    # ------------------------------------------------------------------ 4 knapsack
    nb.md("""
        ## 4. Items you can cut

        You can carry 10 kg. Each item has a weight and a value, and you may cut any item: a piece keeps value in proportion to its weight.
        **What is the most value you can carry?**

        Rule: take the item worth the most per kilogram first, then the next, and cut the last one to fit.
    """)
    nb.code('''
def cut_to_fit(items, capacity):
    """items: (kg, value) pairs. Best value per kg first; cut the last item to fit."""
    total = 0.0
    room = capacity
    for kg, value in sorted(items, key=lambda it: it[1] / it[0], reverse=True):
        take = min(kg, room)
        total += value * take / kg
        room -= take
        if room == 0:
            break
    return total

items = [(6, 30), (5, 20), (5, 20)]          # (kg, value): 5 per kg, 4 per kg, 4 per kg
print("cut to fit:", cut_to_fit(items, 10))
''')
    nb.md("""
        **What you see:** take all 6 kg of the first item (30), then 4 kg of the next (16): **46**.

        **Why it is best (an exchange argument):** suppose an answer carries some of a lower-value-per-kg item while a higher one is not all taken.
        Swap a little of the lower one for the same weight of the higher one. The weight stays the same and the value goes up or stays.
        Keep swapping and you reach the greedy answer without ever losing value.

        ### When you can't cut the items

        Now each item is all or nothing. Use the same rule (best value per kg first, whole items only), and compare with trying every group.
    """)
    nb.code('''
def whole_by_ratio(items, capacity):
    total, room = 0, capacity
    for kg, value in sorted(items, key=lambda it: it[1] / it[0], reverse=True):
        if kg <= room:
            total += value
            room -= kg
    return total

def whole_best(items, capacity):
    """Try every group of items."""
    best = 0
    for k in range(len(items) + 1):
        for group in combinations(items, k):
            if sum(kg for kg, _ in group) <= capacity:
                best = max(best, sum(v for _, v in group))
    return best

print("same rule, whole items:", whole_by_ratio(items, 10))
print("best group:            ", whole_best(items, 10))
''')
    nb.md("""
        🐍 `sum(kg for kg, _ in group)` adds up the weights. The `_` is a name for a value you don't use.

        **What you see:** the rule takes the 6 kg item (30) and then nothing else fits: 30. Two 5 kg items fit exactly and are worth **40**.
        The heavy item had the best value per kilogram, but it wasted 4 kg of space.

        Items you can't cut need the table method of the next topic.
    """)

    # ------------------------------------------------------------------ practice
    nb.md("""
        ## Practice

        Fill in each function, then run its cell to see the checks. The method isn't named: deciding how to solve it is part of the problem.
        Before you trust a quick rule, you can test it against a slow one with `first_counterexample`.
    """)
    nb.problem(1, """
        A list of talks, each a pair `(start, end)`. Two talks clash if one starts before the other ends; a talk may start the moment another ends.
        **What is the fewest talks you must cancel so that none of the rest clash?**
    """, starter='''
def fewest_to_cancel(talks):
    # your code here
    return None

CASES_1 = [(([(1, 4), (2, 3), (3, 5), (6, 7)],), 1),
           (([(0, 10), (1, 2), (3, 4), (5, 6)],), 1),
           (([(1, 2), (1, 2), (1, 2)],), 2),
           (([(1, 3), (3, 5), (5, 7)],), 0),
           (([],), 0),
           (([(0, 5), (1, 6), (2, 7), (6, 9)],), 2)]
check(fewest_to_cancel, CASES_1)
''', solution='''
def fewest_to_cancel(talks):
    kept, free_at = 0, float("-inf")
    for start, end in sorted(talks, key=lambda t: t[1]):   # earliest end first
        if start >= free_at:
            kept += 1
            free_at = end
    return len(talks) - kept                               # cancel everything not kept

check(fewest_to_cancel, CASES_1)
# Keeping the most talks is the same as cancelling the fewest.
''')
    nb.problem(2, """
        Every meeting must happen at its given time. **What is the fewest rooms you need so that no room has two meetings at once?**
        A meeting may use a room the moment the meeting before it in that room ends.
    """, starter='''
def fewest_rooms(meetings):
    # your code here
    return None

CASES_2 = [(([(1, 4), (2, 3), (3, 5), (6, 7)],), 2),
           (([(0, 10), (1, 2), (3, 4), (5, 6)],), 2),
           (([(1, 2), (1, 2), (1, 2)],), 3),
           (([(1, 3), (3, 5), (5, 7)],), 1),
           (([],), 0),
           (([(0, 5), (1, 6), (2, 7), (6, 9)],), 3)]
check(fewest_rooms, CASES_2)
''', solution='''
import heapq

def fewest_rooms(meetings):
    ends = []                                  # a heap: the end time of each room's last meeting
    for start, end in sorted(meetings):        # earliest start first
        if ends and ends[0] <= start:          # the room that frees up first is free now
            heapq.heapreplace(ends, end)       # reuse it
        else:
            heapq.heappush(ends, end)          # open a new room
    return len(ends)

check(fewest_rooms, CASES_2)
# heapq keeps the smallest end time at ends[0]. heapreplace pops it and pushes the new one in one step.
''')
    nb.problem(3, """
        A car's full tank lasts `r` km. Fuel stations stand at the km marks in `stations`, in order along a straight road.
        You start at km 0 with a full tank, and every stop fills the tank.
        **What is the fewest stops you need to reach km `d`?** Return `-1` if you can't get there.
    """, starter='''
def fewest_stops(r, stations, d):
    # your code here
    return None

CASES_3 = [((10, [4, 9, 15, 22, 28], 30), 3),
           ((10, [], 10), 0),
           ((10, [5], 16), -1),
           ((10, [5, 12], 20), 2),
           ((50, [10, 20, 30], 40), 0),
           ((10, [8, 9, 18, 19], 28), 2)]
check(fewest_stops, CASES_3)
''', solution='''
def fewest_stops(r, stations, d):
    reach, stops, i = r, 0, 0                  # reach: how far you can get without another stop
    while reach < d:
        farthest = None
        while i < len(stations) and stations[i] <= reach:
            farthest = stations[i]             # the last station you can still reach
            i += 1
        if farthest is None:
            return -1                          # no new station within reach
        reach = farthest + r                   # stop there and fill up
        stops += 1
    return stops

check(fewest_stops, CASES_3)
# Putting off each stop as long as possible never hurts: any plan can swap its stop for a later reachable one.
''')
    nb.problem(4, """
        Each material comes as one block, given as `(kg, value)`. You may cut any block; a piece keeps value in proportion to its weight.
        **What is the least total weight that gives a value of at least `v`?**
        Round the answer to 2 decimal places. Return `None` if all the blocks together are worth less than `v`.
    """, starter='''
def least_weight(blocks, v):
    # your code here
    return None

CASES_4 = [(([(6, 30), (5, 20), (5, 20)], 40), 8.5),
           (([(6, 30), (5, 20), (5, 20)], 30), 6.0),
           (([(6, 30), (5, 20), (5, 20)], 71), None),
           (([(2, 10), (4, 4)], 12), 4.0),
           (([(1, 2), (2, 8), (4, 12)], 14), 4.0),
           (([(3, 9)], 0), 0.0)]
check(least_weight, CASES_4)
''', solution='''
def least_weight(blocks, v):
    weight, value = 0.0, 0.0
    for kg, worth in sorted(blocks, key=lambda b: b[1] / b[0], reverse=True):   # best value per kg first
        if value >= v:
            break
        need = v - value
        if worth <= need:                      # take the whole block
            weight += kg
            value += worth
        else:                                  # take only the piece you need
            weight += kg * need / worth
            value = v
    return round(weight, 2) if value >= v else None

check(least_weight, CASES_4)
''')
    nb.problem(5, """
        A list of ranges `(a, b)` on a number line, both ends included.
        **What is the fewest points you can place so that every range contains at least one point?**
    """, starter='''
def fewest_points(ranges):
    # your code here
    return None

CASES_5 = [(([(1, 3), (2, 5), (4, 6)],), 2),
           (([(1, 2), (3, 4), (5, 6)],), 3),
           (([(1, 10), (2, 3), (4, 5)],), 2),
           (([(1, 5), (5, 9)],), 1),
           (([],), 0),
           (([(0, 4), (1, 2), (3, 6), (5, 7), (6, 8)],), 2)]
check(fewest_points, CASES_5)
''', solution='''
def fewest_points(ranges):
    points, last = 0, float("-inf")
    for a, b in sorted(ranges, key=lambda r: r[1]):   # earliest right end first
        if a > last:                                  # this range has no point yet
            last = b                                  # place one at its right end
            points += 1
    return points

check(fewest_points, CASES_5)
# A point at the right end of the earliest-ending range covers it and as many later ranges as any point could.
''')

    nb.cue([
        ('"choose the earliest-finishing / cheapest / biggest next"', "try greedy, then hunt for a small counterexample"),
        ("a greedy rule that fails on a small example", "dynamic programming"),
        ('"merge the best pair, repeat"', "greedy with a heap"),
    ])
    nb.practise_more("""
        For this topic: the CSES Problem Set's *Sorting and Searching* section (several greedy problems); LeetCode's *Greedy* tag.
    """)
    nb.save(PATH)
    print("wrote", PATH)


if __name__ == "__main__":
    build()

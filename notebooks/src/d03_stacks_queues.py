"""Generates notebooks/dsa/03_stacks_queues.ipynb (DSA topic 3: stacks and queues)

    python3 notebooks/src/d03_stacks_queues.py
"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))
from nb import Notebook  # noqa: E402

PATH = "notebooks/dsa/03_stacks_queues.ipynb"


def build() -> None:
    nb = Notebook()
    nb.header(
        eyebrow="DSA topic 3 · Stacks and queues · practice notebook",
        title="In what order should waiting items come out?",
        path=PATH,
        question="In what order should waiting items come out?",
        answer=("A stack gives back the newest item first. A queue gives back the oldest first. "
                "That one choice decides whether brackets can be matched and how a search explores."),
        build_text="""
            In this notebook you will:

            1. **Use a Python list as a pile**: add and remove at the end only.
            2. **Write a bracket checker** that finds the wrong bracket in a line of code.
            3. **See why `list.pop(0)` gets slow**, and use `collections.deque` for items that leave in arrival order.
            4. **Solve 5 practice problems.** Each has checks you can run, and a solution one click away.

            Running every cell takes a few seconds. The site's step-by-step animation of the bracket checker is on the
            *Stacks and queues* page of the DSA track.
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

    # ------------------------------------------------------------------ 1 a pile
    nb.md("""
        ## 1. Which bracket is wrong?

        Your code editor underlines one bracket in `{ [ ( ] }`. **Which one, and how does the editor find it?**

        Read from left to right. Keep every opening bracket that is still open on a pile, newest on top.
        A closing bracket must match the bracket on top of the pile.
    """)
    nb.predict(
        "In `{ [ ( ] }`, the `]` arrives. **What is on top of the pile at that moment?**",
        "**`(`.** The pile holds `{`, `[`, `(` with `(` on top, the newest. "
        "`]` does not match `(`, so the `]` is the wrong bracket. The `(` had to close first.",
    )
    nb.md("""
        A Python list can be the pile. `append` puts an item on the end, and `pop()` takes the item at the end.
        Treat the end of the list as the top of the pile.
    """)
    nb.code('''
pile = []
for b in "{[(":
    pile.append(b)                  # put b on top
    print("append", b, "->", pile)

print("top of the pile:", pile[-1])
print("pop() gives", pile.pop(), "->", pile)
print("pop() gives", pile.pop(), "->", pile)
print("is the pile empty?", not pile)
''')
    nb.md("""
        🐍 **Python notes**
        - `pile.append(b)` adds `b` at the end of the list. `pile.pop()` removes the last item and gives it back.
        - `pile[-1]` reads the last item without removing it. Negative positions count from the end.
        - An empty list counts as false in a test, so `not pile` is `True` when the pile is empty, and `if pile:` means "if the pile has items".
        - `for b in "{[(":` walks through a string one character at a time.

        **What you see:** the last item added is the first one out. The `(` went on last and came off first.

        **What it's called:** a pile where you only add and remove at the top is a **stack**.
        Adding is a **push**; removing is a **pop**. The newest item leaves first: **last in, first out** (LIFO).
        With a list, `append` and `pop()` each take the same short time however long the list is: $O(1)$.
    """)

    # ------------------------------------------------------------------ 2 bracket checker
    nb.md("""
        ## 2. The bracket checker, from scratch

        Three rules, one per kind of bracket:

        - An opening bracket goes on top of the pile.
        - A closing bracket must match the top of the pile. If it does, pop the top. If it doesn't, or the pile is empty, that closing bracket is wrong.
        - At the end, the pile must be empty. Anything left was never closed.
    """)
    nb.code('''
PARTNER = {")": "(", "]": "[", "}": "{"}

def check_brackets(text):
    """Return (True, deepest pile) if every bracket matches, else (False, what is wrong)."""
    pile = []                                        # (bracket, position) pairs, newest last
    deepest = 0
    for i, b in enumerate(text):
        if b in "([{":
            pile.append((b, i))
            deepest = max(deepest, len(pile))
        elif b in ")]}":
            if not pile:
                return False, f"{b} at position {i}: nothing is open"
            top, top_at = pile[-1]
            if top != PARTNER[b]:
                return False, f"{b} at position {i} does not match {top} at position {top_at}"
            pile.pop()
    if pile:
        return False, f"never closed: {pile}"
    return True, deepest

for text in ["([])", "{[(]}", "([)]", "((", ")(", "{[(())]}"]:
    print(f"{text:10}", check_brackets(text))
''')
    nb.md("""
        🐍 **Python notes**
        - `PARTNER` is a **dictionary**: it looks up a value by a key. `PARTNER["]"]` is `"["`.
        - `for i, b in enumerate(text):` gives each position `i` together with its character `b`.
        - `b in "([{"` is `True` when `b` is one of those three characters.
        - `top, top_at = pile[-1]` unpacks a pair into two names. `return False, "..."` returns a pair.
        - `f"{text:10}"` pads the text to 10 characters, so the results line up.

        **What you see:** `([])` and `{[(())]}` match, with the pile at most 2 and 4 deep.
        `{[(]}` fails at the `]` in position 3, which does not match `(` in position 2.
        `([)]` fails at the `)` in position 2: the most recent open bracket is `[`.
        `((` leaves two brackets open, and `)(` fails at once.

        Each bracket causes one push or one pop, so checking $n$ brackets takes $O(n)$ steps.
    """)

    # ------------------------------------------------------------------ 3 queue
    nb.md("""
        ## 3. Oldest first: why `list.pop(0)` gets slow

        Print jobs reach a shared printer. **They should print in the order they arrived.**
        A list can do it: `append` at the end, and take the oldest from the front with `pop(0)`.
    """)
    nb.code('''
jobs = []
for name in ["report", "photo", "ticket"]:
    jobs.append(name)
while jobs:
    print("print:", jobs.pop(0))           # take from the front
''')
    nb.md("""
        `pop(0)` gives the right order. But a list keeps its items side by side in memory, starting at position 0.
        Taking the front item means every other item moves one place to the left.
    """)
    nb.predict(
        "Empty a list from the front with `pop(0)`. **If the list is twice as long, about how much longer does it take?**",
        "**About 4 times.** Twice as many pops, and each pop moves about twice as many items: 2 × 2 = 4. "
        "Emptying $n$ items moves $n(n-1)/2$ items in total: $O(n^2)$. The next cell times it.",
    )
    nb.code('''
import time
from collections import deque

def time_list(n):
    xs = list(range(n))
    t0 = time.perf_counter()
    while xs:
        xs.pop(0)
    return time.perf_counter() - t0

def time_deque(n):
    q = deque(range(n))
    t0 = time.perf_counter()
    while q:
        q.popleft()
    return time.perf_counter() - t0

print(f"{'n':>7} {'items moved':>14} {'list pop(0)':>12} {'deque popleft':>14}")
for n in [20_000, 40_000, 80_000]:
    moved = n * (n - 1) // 2                        # each pop(0) moves every item behind the front
    print(f"{n:>7,} {moved:>14,} {time_list(n) * 1000:>10.1f}ms {time_deque(n) * 1000:>12.2f}ms")
''')
    nb.md("""
        🐍 **Python notes**
        - `from collections import deque` loads `deque` from Python's standard library. No install needed.
        - `deque(range(n))` builds a deque holding `0, 1, ..., n − 1`.
        - `q.append(x)` adds at the back; `q.popleft()` removes and returns the front item.
        - `time.perf_counter()` reads a precise clock. The difference of two readings is the seconds in between.
        - `80_000` is the same as `80000`; the underscores only make it easier to read.

        **What you see:** the "items moved" column grows about 4 times per doubling, and so does the list's time.
        The deque's time only about doubles, and stays far below the list's.
        Your exact times depend on the computer, but the pattern is the same.

        **What it's called:** a line where you add at the back and remove at the front is a **queue**:
        **first in, first out** (FIFO). `collections.deque` is Python's queue. Its `append` and `popleft` each take $O(1)$.
    """)
    nb.md("""
        ### Same items, two orders

        Put the same four letters into a stack and into a queue, then take everything out. Both give the same letters back, in different orders.
    """)
    nb.code('''
stack, queue = [], deque()
for x in "ABCD":
    stack.append(x)
    queue.append(x)

from_stack = [stack.pop() for _ in range(4)]
from_queue = [queue.popleft() for _ in range(4)]
print("stack gives:", from_stack)                 # newest first
print("queue gives:", from_queue)                 # oldest first

# the list version of a queue and the deque version agree
slow = list("ABCD")
print("same order as list.pop(0):", from_queue == [slow.pop(0) for _ in range(4)])
''')
    nb.md("""
        🐍 `[stack.pop() for _ in range(4)]` is a **list comprehension**: it runs `stack.pop()` four times and collects the results in a list.
        `_` is a name for a loop variable you don't use.

        **What you see:** the stack gives `D C B A`, the reverse of the order in. The queue gives `A B C D`, the same order as in.
    """)

    # ------------------------------------------------------------------ practice
    nb.md("""
        ## Practice

        Fill in each function, then run its cell to see the checks. The method isn't named: deciding how to solve it is part of the problem.
    """)
    nb.problem(1, """
        A line of code has brackets `( ) [ ] { }` mixed with other characters. Ignore the other characters.
        **Return the position of the first bracket that breaks the rules**, or `-1` if every bracket is fine.
        A closing bracket breaks the rules if it does not match, or if nothing is open.
        If the line ends with brackets still open, return the position of the leftmost one still open.
    """, starter='''
def first_bad_bracket(line):
    # your code here
    return None

CASES_1 = [(("f(a[1]) + {x}",), -1), (("{[(]}",), 3), (("print(x))",), 8), (("((a)",), 0),
           (("x = [1, 2",), 4), (("",), -1)]
check(first_bad_bracket, CASES_1)
''', solution='''
def first_bad_bracket(line):
    partner = {")": "(", "]": "[", "}": "{"}
    pile = []                                    # positions of the brackets still open
    for i, c in enumerate(line):
        if c in "([{":
            pile.append(i)
        elif c in ")]}":
            if not pile or line[pile[-1]] != partner[c]:
                return i                         # no match, or nothing open
            pile.pop()
    return pile[0] if pile else -1               # the bottom of the pile is the leftmost still open

check(first_bad_bracket, CASES_1)
# Storing positions instead of characters lets you report where the problem is.
''')
    nb.problem(2, """
        A calculator reads tokens separated by spaces: whole numbers and the operators `+`, `-` and `*`.
        Each operator uses the two most recent numbers that have not been used yet, and its result becomes a new number.
        For `"3 4 + 2 *"`: `3 + 4` is 7, then `7 * 2` is 14.
        **Return the final number.** The order matters for `-`: `"10 2 -"` is `10 - 2`.
    """, starter='''
def calculate(tokens):
    # your code here
    return None

CASES_2 = [(("3 4 + 2 *",), 14), (("5 1 2 + 4 * + 3 -",), 14), (("10 2 -",), 8), (("7",), 7),
           (("2 3 4 * +",), 14), (("6 2 - 3 -",), 1)]
check(calculate, CASES_2)
''', solution='''
def calculate(tokens):
    pile = []
    for t in tokens.split():
        if t in "+-*":
            b = pile.pop()                       # the most recent number
            a = pile.pop()                       # the one before it
            pile.append(a + b if t == "+" else a - b if t == "-" else a * b)
        else:
            pile.append(int(t))
    return pile[-1]

check(calculate, CASES_2)
# "3 4 + 2 *": pile [3], [3, 4], [7], [7, 2], [14].
''')
    nb.md("""
        🐍 `tokens.split()` cuts a string at the spaces: `"3 4 +".split()` is `["3", "4", "+"]`.
        `int("42")` turns text into the whole number 42.
        `a + b if t == "+" else a - b` picks one of two values: the first if the test is true, otherwise the second.
    """)
    nb.problem(3, """
        A small text box starts empty and receives commands, one at a time:

        - `"type xyz"` adds `xyz` at the end of the text.
        - `"undo"` removes the most recent typing that has not been undone yet.
        - `"redo"` puts back the most recently undone typing.
        - Typing something new after an undo means the undone typing can no longer come back.
        - An undo or redo with nothing to work on changes nothing.

        **Return the final text.**
    """, starter='''
def run_editor(commands):
    # your code here
    return None

CASES_3 = [((["type ab", "type cd", "undo"],), "ab"),
           ((["type ab", "type cd", "undo", "undo", "redo"],), "ab"),
           ((["type ab", "undo", "redo", "redo"],), "ab"),
           ((["type a", "undo", "type b", "redo"],), "b"),
           ((["undo", "redo"],), ""),
           ((["type x", "type y", "type z", "undo", "undo", "redo", "redo"],), "xyz")]
check(run_editor, CASES_3)
''', solution='''
def run_editor(commands):
    done, undone = [], []                        # two piles of typed pieces
    for cmd in commands:
        if cmd.startswith("type "):
            done.append(cmd[5:])
            undone.clear()                       # new typing: the undone pieces can't come back
        elif cmd == "undo" and done:
            undone.append(done.pop())            # the most recent piece moves to the other pile
        elif cmd == "redo" and undone:
            done.append(undone.pop())
    return "".join(done)

check(run_editor, CASES_3)
# The text is the done pile joined together. Undo and redo move one piece between the two piles.
''')
    nb.md("""
        🐍 `cmd.startswith("type ")` checks how a string begins. `cmd[5:]` is everything from position 5 on, here the typed text.
        `"".join(pieces)` glues a list of strings together with nothing in between.
    """)
    nb.problem(4, """
        Buildings stand in a row from west to east; you get their heights.
        **For each building, return the height of the first building to its east that is strictly taller**, or `-1` if there is none.
        With 100,000 buildings, comparing every pair is too slow. Aim for a method where each building is handled a fixed number of times.
    """, starter='''
def next_taller(heights):
    # your code here
    return None

CASES_4 = [(([2, 7, 3, 5, 4, 6, 8],), [7, 8, 5, 6, 6, 8, -1]), (([5, 4, 3],), [-1, -1, -1]),
           (([1, 2, 3],), [2, 3, -1]), (([3, 3, 4],), [4, 4, -1]), (([],), [])]
check(next_taller, CASES_4)
''', solution='''
def next_taller(heights):
    answer = [-1] * len(heights)
    waiting = []                                 # positions still looking for a taller building
    for i, h in enumerate(heights):
        while waiting and heights[waiting[-1]] < h:
            answer[waiting.pop()] = h            # h is the first taller one for that building
        waiting.append(i)
    return answer

check(next_taller, CASES_4)
# The waiting heights always go down from bottom to top, so a new building settles the shortest ones first.
# Each position is pushed once and popped at most once: O(n) in total.
''')
    nb.md("""
        🐍 `[-1] * 3` is `[-1, -1, -1]`: a list repeated.
        `while waiting and ...:` stops as soon as `waiting` is empty, before it tries to read `waiting[-1]`.
    """)
    nb.problem(5, """
        You may use Python lists, but only `append(x)` and `pop()` from the end: no `pop(0)`, no `insert`, no slicing.
        **Build a line where items leave in the order they arrived.**
        Fill in the class `TwoPileLine`, with `add(x)` and `take()`, where `take()` returns the oldest item still inside.
        Over many operations, each item should be moved only a few times.
        The function `simulate` runs a list of operations and collects what `take()` returns.
    """, starter='''
class TwoPileLine:
    def __init__(self):
        self.a = []                              # you may use these two lists
        self.b = []

    def add(self, x):
        pass                                     # your code here

    def take(self):
        return None                              # your code here

def simulate(ops):
    line, out = TwoPileLine(), []
    for op in ops:
        if op[0] == "add":
            line.add(op[1])
        else:
            out.append(line.take())
    return out

CASES_5 = [(([("add", 1), ("add", 2), ("take",), ("add", 3), ("take",), ("take",)],), [1, 2, 3]),
           (([("add", 5), ("take",)],), [5]),
           (([("add", 1), ("add", 2), ("add", 3), ("take",), ("add", 4), ("take",), ("take",), ("take",)],), [1, 2, 3, 4]),
           (([("add", "x"), ("add", "y"), ("take",), ("add", "z"), ("add", "w"), ("take",), ("take",)],), ["x", "y", "z"]),
           (([],), [])]
check(simulate, CASES_5)
''', solution='''
class TwoPileLine:
    def __init__(self):
        self.a = []                              # new items land here
        self.b = []                              # items waiting to leave, oldest on top

    def add(self, x):
        self.a.append(x)

    def take(self):
        if not self.b:                           # refill only when b is empty
            while self.a:
                self.b.append(self.a.pop())      # reversing a puts its oldest item on top of b
        return self.b.pop()

check(simulate, CASES_5)
# Each item is pushed on a, moved to b once, and popped from b once: O(1) per item on average.
''')
    nb.md("""
        🐍 **Python notes**
        - `class TwoPileLine:` defines a new kind of object. `TwoPileLine()` makes one.
        - `__init__` runs when the object is made. `self` is the object itself, so `self.a` is a list stored inside it.
        - A function written inside the class, like `add(self, x)`, is called as `line.add(x)`. Python fills in `self`.
    """)

    nb.cue([
        ('"match the most recent unmatched item"', "a stack"),
        ('"handle items in the order they arrived"', "a queue (`collections.deque`)"),
        ('"undo"', "a stack (and a second stack for redo)"),
        ('"the next bigger item to the right" for every item', "a stack of items still waiting for an answer"),
    ])
    nb.practise_more("""
        For this topic: the CSES Problem Set's *Introductory Problems* section; LeetCode's *Stack* and *Queue* tags.
    """)
    nb.save(PATH)
    print("wrote", PATH)


if __name__ == "__main__":
    build()

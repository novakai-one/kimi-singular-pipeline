"""Generates notebooks/dsa/07_heaps.ipynb (DSA topic 7: heaps and priority queues)

    python3 notebooks/src/d07_heaps.py
"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))
from nb import Notebook  # noqa: E402

PATH = "notebooks/dsa/07_heaps.ipynb"


def build() -> None:
    nb = Notebook()
    nb.header(
        eyebrow="DSA topic 7 · Heaps and priority queues · practice notebook",
        title="How do you always get the smallest item quickly, while new items keep arriving?",
        path=PATH,
        question="How do you always get the smallest item quickly, while new items keep arriving?",
        answer=("Keep the items in a list laid out as a tree, with every parent no bigger than its children. "
                "The smallest is then always at the top, and adding or removing an item repairs one path: about log n swaps."),
        build_text="""
            In this notebook you will:

            1. **Build a heap from scratch** in a plain Python list: add an item, and take out the smallest.
            2. **Meet Python's own version, `heapq`**, check that both agree, and sort a list with a heap.
            3. **Order jobs by priority** with tuples, breaking ties by arrival.
            4. **Solve 5 practice problems.** Each has checks you can run, and a solution one click away.

            Running every cell takes a few seconds. The site's step-by-step animation of a heap is on the
            *Heaps and priority queues* page of the DSA track.
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

    # ------------------------------------------------------------------ 1 the layout
    nb.md("""
        ## 1. Where is the smallest? Keep it at the top

        Patients arrive at an emergency department all day. Each has an urgency number: lower means more urgent.
        You must always see the most urgent patient next.

        With a plain list, finding the smallest means checking every item. A million patients means a million checks for every pick.

        Here is another layout. Draw the items as a tree: one item at the top, two below it, four below those, and so on.
        **Keep one rule: every parent is no bigger than its two children.** Then the smallest item is always at the top.

        The tree lives in an ordinary list. Read it level by level, left to right: position 0 is the top,
        positions 1 and 2 are the next level, positions 3 to 6 the level after.
    """)
    nb.code('''
heap = [1, 3, 8, 5, 4, 9, 10]

def show(heap):
    """Print the list one tree level per line: 1 item, then 2, then 4, ..."""
    start, width, level = 0, 1, 0
    while start < len(heap):
        print(f"level {level}:", *heap[start:start + width])
        start, width, level = start + width, width * 2, level + 1

show(heap)
print()
for i in range(len(heap)):
    kids = [c for c in (2 * i + 1, 2 * i + 2) if c < len(heap)]
    parent = (i - 1) // 2 if i > 0 else None
    print(f"position {i} holds {heap[i]:>2}   children at {kids}   parent at {parent}")
''')
    nb.md("""
        🐍 **Python notes**
        - `print(f"level {level}:", *heap[a:b])` prints a slice of the list. The `*` spreads the items out as separate arguments, so they print with spaces between them.
        - `[c for c in (...) if c < len(heap)]` is a **list comprehension**: it builds a list from the items that pass the `if`.
        - `x if condition else y` picks one of two values in one expression.
        - `{heap[i]:>2}` pads the number to 2 characters, lined up on the right.
    """)
    nb.md("""
        **What you see:** the children of position `i` sit at `2i + 1` and `2i + 2`. The parent of position `i` sits at `(i - 1) // 2`.
        **The positions alone give the tree's shape**, so nothing else needs storing.

        **What it's called:** a list that keeps this rule is a **binary heap**. With the smallest at the top, it is a **min-heap**.
    """)
    nb.code('''
def is_heap(heap):
    """True if every parent is no bigger than its children."""
    return all(heap[(i - 1) // 2] <= heap[i] for i in range(1, len(heap)))

print(is_heap([1, 3, 8, 5, 4, 9, 10]))
print(is_heap([1, 3, 8, 2]))        # position 3 holds 2, but its parent (position 1) holds 3
''')
    nb.md("""
        🐍 `all(...)` is `True` when every value inside is true. The `for` inside the brackets makes the values one at a time,
        so `all` can stop at the first `False`.
    """)

    # ------------------------------------------------------------------ 2 push
    nb.md("""
        ## 2. Add an item: put it at the bottom, swap it up

        A new item needs a place. Put it in the first free spot at the bottom: the end of the list. The tree keeps its shape.

        The rule may now be broken: the new item can be smaller than its parent.
        **Swap it with its parent, and repeat while it is smaller.** Each swap moves it up one level.
    """)
    nb.predict(
        "Insert 5, 3, 8, 1 into an empty heap this way. **What is the list after each insert?**",
        "**[5] → [3, 5] → [3, 5, 8] → [1, 3, 8, 5].** The 1 starts at position 3. It swaps with 5 (position 1), then with 3 (position 0).",
    )
    nb.code('''
def push(heap, item):
    """Add item to the heap. Returns the number of swaps."""
    heap.append(item)                        # the first free spot at the bottom
    i = len(heap) - 1
    swaps = 0
    while i > 0:
        parent = (i - 1) // 2
        if heap[i] >= heap[parent]:
            break                            # the parent is not bigger: the rule holds
        heap[i], heap[parent] = heap[parent], heap[i]
        i = parent
        swaps += 1
    return swaps

heap = []
for x in [5, 3, 8, 1]:
    swaps = push(heap, x)
    print(f"insert {x}: {heap}   swaps: {swaps}")
''')
    nb.md("""
        🐍 **Python notes**
        - `heap[i], heap[parent] = heap[parent], heap[i]` swaps two items in one line. Python reads the whole right side first, then assigns.
        - `break` leaves the `while` loop at once.
        - `push` changes the list it is given. The caller sees the change, because both names refer to the same list.

        **What it's called:** moving the new item up is called **sift up**.
    """)
    nb.predict(
        "A heap holds 1,000,000 items. **At most, how many swaps can adding one item need?**",
        "**About 20.** Each swap moves the new item up one level. A heap of 1,000,000 items has 20 levels, "
        "so a new item at the bottom can climb at most 19 times.",
    )
    nb.code('''
big = list(range(2, 1_000_002))              # 1,000,000 numbers in increasing order
print("is a sorted list a heap?", is_heap(big))
print("levels:", len(big).bit_length())
print("swaps to add 1, the new smallest:", push(big, 1))
print("still a heap?", is_heap(big), "  top:", big[0])
''')
    nb.md("""
        🐍 `n.bit_length()` is the number of binary digits in `n`. A heap of `n` items has exactly that many levels:
        levels 0 to 19 hold $1 + 2 + 4 + \\dots + 2^{19} = 2^{20} - 1 = 1{,}048{,}575$ items, enough for a million.

        **What you see:** a sorted list already keeps the rule, since every parent comes before its children.
        Adding a new smallest item makes it climb from the bottom level to the top: 19 swaps, out of a million items.
    """)

    # ------------------------------------------------------------------ 3 pop
    nb.md("""
        ## 3. Take out the smallest: move the last item to the top, swap it down

        The smallest item is at position 0. Taking it out leaves a hole at the top.
        Fill the hole with the last item in the list. The tree keeps its shape.

        Now the top item may be too big. **Swap it with its smaller child, and repeat while that child is smaller.**
        Why the smaller child? It becomes the parent of the other child, so the rule holds there too.
    """)
    nb.code('''
def pop(heap):
    """Remove and return the smallest item."""
    top = heap[0]
    last = heap.pop()                        # remove the last item from the list
    if heap:                                 # anything left?
        heap[0] = last                       # move the last item to the top
        i = 0
        while True:
            left, right = 2 * i + 1, 2 * i + 2
            if left >= len(heap):
                break                        # no children: stop
            child = left
            if right < len(heap) and heap[right] < heap[left]:
                child = right                # the smaller child
            if heap[child] >= heap[i]:
                break                        # no child is smaller: the rule holds
            heap[i], heap[child] = heap[child], heap[i]
            i = child
    return top

heap = []
for x in [7, 3, 9, 1, 5]:
    push(heap, x)
show(heap)
while heap:
    print("take out", pop(heap), "  left:", heap, "  still a heap?", is_heap(heap))
''')
    nb.md("""
        🐍 `heap.pop()` with no position removes and returns the last item of a Python list. Your `pop(heap)` is a different function:
        it returns the smallest. `if heap:` is true when the list is not empty.

        **What you see:** the items come out smallest first: 1, 3, 5, 7, 9.

        **What it's called:** moving the item down is **sift down**. Adding and taking out each repair one path from the top to the bottom:
        $O(\\log n)$ swaps. Reading the smallest, `heap[0]`, takes $O(1)$.
        Something that lets you add items and take out the smallest is a **priority queue**. A heap is the usual way to build one.
    """)
    nb.md("""
        ### Sorting with a heap

        Add every item, then take out the smallest again and again. The items come out in order.
    """)
    nb.code('''
import random

def heap_sort(xs):
    heap = []
    for x in xs:
        push(heap, x)
    return [pop(heap) for _ in range(len(xs))]

random.seed(1)
xs = [random.randint(1, 99) for _ in range(12)]
print(xs)
print(heap_sort(xs))
print("same as sorted()?", heap_sort(xs) == sorted(xs))
''')
    nb.md("""
        🐍 `_` is a name for a loop variable you never use. `random.seed(1)` makes the "random" numbers the same on every run.

        **What it's called:** this is **heapsort**. It makes $n$ additions and $n$ removals, each $O(\\log n)$: $O(n \\log n)$ in total.
    """)

    # ------------------------------------------------------------------ 4 heapq
    nb.md("""
        ## 4. The library version: `heapq`

        Python's `heapq` module works on an ordinary list, with the same layout and the same rule:
        - `heapq.heappush(h, x)` adds `x`.
        - `heapq.heappop(h)` removes and returns the smallest.
        - `h[0]` is the smallest, without removing it.
        - `heapq.heapify(xs)` rearranges a whole list into a heap, in place.
    """)
    nb.code('''
import heapq

h = []
for x in [5, 3, 8, 1]:
    heapq.heappush(h, x)
    print(h)
print("smallest:", h[0])
print("take out:", heapq.heappop(h), "  left:", h)

data = [9, 4, 7, 1, 8, 2]
heapq.heapify(data)
print("heapify:", data, "  a heap?", is_heap(data))
''')
    nb.md("""
        **What you see:** the same lists as your `push` gave for 5, 3, 8, 1.

        Now a bigger check. Run 20,000 random additions and removals on your heap and on `heapq`, side by side.
    """)
    nb.code('''
random.seed(2)
mine, theirs = [], []
same_out = True
for step in range(20_000):
    if mine and random.random() < 0.4:
        same_out = same_out and pop(mine) == heapq.heappop(theirs)
    else:
        x = random.randint(1, 1000)
        push(mine, x)
        heapq.heappush(theirs, x)
print("same items taken out, in the same order:", same_out)
print("both still heaps:", is_heap(mine), is_heap(theirs))
print("items left:", len(mine), len(theirs), "  same items:", sorted(mine) == sorted(theirs))
print("exactly the same lists:", mine == theirs)
''')
    nb.md("""
        **What you see:** both take out the same items in the same order, and both stay heaps.
        The lists inside are not identical. `heapq` repairs the heap after a removal in a slightly different order,
        and more than one arrangement keeps the rule. Both are correct heaps.
    """)
    nb.code('''
import time

random.seed(3)
xs = [random.random() for _ in range(200_000)]

t0 = time.time(); a = heap_sort(xs); t_mine = time.time() - t0
t0 = time.time()
h = xs[:]
heapq.heapify(h)
b = [heapq.heappop(h) for _ in range(len(h))]
t_lib = time.time() - t0
t0 = time.time(); c = sorted(xs); t_sorted = time.time() - t0

print("all three agree:", a == b == c)
print(f"your heapsort: {t_mine:.2f}s   heapq: {t_lib:.2f}s   sorted(): {t_sorted:.3f}s")
''')
    nb.md("""
        🐍 `xs[:]` is a copy of the whole list, so `heapify` does not change `xs`.

        **What you see:** the same answer three ways. `heapq` is written in C, so it is several times faster than your version.
        `sorted` is faster still for sorting.
        **A heap is the right tool when items keep arriving while you take out the smallest.** If you have the whole list at the start, sort it.
    """)

    # ------------------------------------------------------------------ 5 tuples
    nb.md("""
        ## 5. Jobs with priorities: put the priority first

        Real items are rarely bare numbers. A job has a name and a priority. Push a **tuple** `(priority, job)`:
        the heap orders by the first item, the priority.
    """)
    nb.code('''
jobs = []
heapq.heappush(jobs, (2, "write report"))
heapq.heappush(jobs, (1, "fix server"))
heapq.heappush(jobs, (3, "tidy files"))
heapq.heappush(jobs, (1, "answer call"))
while jobs:
    print(heapq.heappop(jobs))
''')
    nb.md("""
        🐍 **Python notes: tuples as priorities**
        - Python compares tuples item by item. `(1, "z") < (2, "a")` because 1 < 2. When the first items tie, it compares the second: `(1, "a") < (1, "b")`.
        - So the two priority-1 jobs above came out in alphabetical order, not in the order they arrived.
        - To break ties by arrival, put an arrival number second: `(priority, arrival, job)`. Arrival numbers never tie, so the job itself is never compared.
        - `heapq` only keeps the smallest on top. For the largest first, push `-priority`.
    """)
    nb.code('''
jobs = []
arrival = 0
for priority, job in [(2, "write report"), (1, "fix server"), (3, "tidy files"), (1, "answer call")]:
    heapq.heappush(jobs, (priority, arrival, job))
    arrival += 1
while jobs:
    priority, _, job = heapq.heappop(jobs)
    print(priority, job)
''')
    nb.md("""
        **What you see:** "fix server" now comes before "answer call", because it arrived first.
    """)

    # ------------------------------------------------------------------ practice
    nb.md("""
        ## Practice

        Fill in each function, then run its cell to see the checks. The method isn't named: deciding how to solve it is part of the problem.
    """)
    nb.problem(1, """
        A sensor sends a very long stream of readings. **Return the `k` largest readings, largest first.**
        You may keep only about `k` readings in memory at once, so you can't store the stream and sort it.
        Assume `k` is at least 1.
    """, starter='''
def largest_k(stream, k):
    # your code here
    return None

CASES_1 = [(([5, 1, 9, 3, 7, 6], 3), [9, 7, 6]), (([4, 4, 4, 1], 2), [4, 4]), (([2, 8], 5), [8, 2]),
           (([-3, -1, -2], 1), [-1]), (([], 2), []), (([7, 7, 3, 9, 1, 9], 3), [9, 9, 7])]
check(largest_k, CASES_1)
''', solution='''
import heapq

def largest_k(stream, k):
    h = []                                   # the k largest so far; the smallest of them on top
    for x in stream:
        if len(h) < k:
            heapq.heappush(h, x)
        elif x > h[0]:                       # bigger than the smallest one kept
            heapq.heapreplace(h, x)          # take out the top and add x, in one step
    return sorted(h, reverse=True)

check(largest_k, CASES_1)
# Each reading costs O(log k), and memory stays at k numbers. heapq.nlargest(k, stream) does the same.
''')
    nb.problem(2, """
        Several lists of timestamps, each already sorted. **Combine them into one sorted list.**
        There may be many lists. Aim for about $N \\log k$ steps, where $N$ is the total number of items and $k$ the number of lists.
    """, starter='''
def combine_sorted(lists):
    # your code here
    return None

CASES_2 = [(([[1, 4, 9], [2, 3, 10], [5]],), [1, 2, 3, 4, 5, 9, 10]), (([[1, 1], [1]],), [1, 1, 1]),
           (([[], [3, 4], []],), [3, 4]), (([],), []), (([[7]],), [7]),
           (([[-5, 0, 5], [-10, 10]],), [-10, -5, 0, 5, 10])]
check(combine_sorted, CASES_2)
''', solution='''
import heapq

def combine_sorted(lists):
    # one entry per list: (its front value, which list, position in that list)
    h = [(lst[0], i, 0) for i, lst in enumerate(lists) if lst]
    heapq.heapify(h)
    out = []
    while h:
        value, i, j = heapq.heappop(h)       # the smallest front value of all lists
        out.append(value)
        if j + 1 < len(lists[i]):
            heapq.heappush(h, (lists[i][j + 1], i, j + 1))
    return out

check(combine_sorted, CASES_2)
# The heap never holds more than k entries, so each step costs O(log k). heapq.merge(*lists) does the same.
''')
    nb.problem(3, """
        A help desk gets a list of events, in time order.
        - `("arrive", name, urgency)`: a person joins the queue. A lower urgency number is more urgent.
        - `("serve",)`: the desk helps the most urgent person waiting. If two are equally urgent, the one who arrived first. If nobody is waiting, record `None`.

        **Return the names in the order they were served.**
    """, starter='''
def serve_order(events):
    # your code here
    return None

CASES_3 = [
    (([("arrive", "Ana", 3), ("arrive", "Ben", 1), ("serve",), ("arrive", "Cy", 1), ("serve",), ("serve",)],), ["Ben", "Cy", "Ana"]),
    (([("arrive", "Zoe", 2), ("arrive", "Al", 2), ("serve",), ("serve",)],), ["Zoe", "Al"]),
    (([("serve",)],), [None]),
    (([("arrive", "Dan", 5), ("serve",), ("serve",), ("arrive", "Eve", 4), ("arrive", "Fay", 9), ("serve",)],), ["Dan", None, "Eve"]),
    (([],), []),
]
check(serve_order, CASES_3)
''', solution='''
import heapq

def serve_order(events):
    waiting = []
    served = []
    arrivals = 0
    for e in events:
        if e[0] == "arrive":
            _, name, urgency = e
            heapq.heappush(waiting, (urgency, arrivals, name))   # arrival number breaks ties
            arrivals += 1
        else:
            served.append(heapq.heappop(waiting)[2] if waiting else None)
    return served

check(serve_order, CASES_3)
# Without the arrival number, Al would come before Zoe: the names would break the tie.
''')
    nb.problem(4, """
        Numbers arrive one at a time. **After each one, report the median of all the numbers so far:**
        the middle one when sorted, or the average of the two middle ones when the count is even.
        Sorting again after every number is too slow for a long stream.
    """, starter='''
def running_medians(xs):
    # your code here
    return None

CASES_4 = [(([5, 2, 8, 1],), [5, 3.5, 5, 3.5]), (([1, 2, 3, 4, 5],), [1, 1.5, 2, 2.5, 3]), (([7],), [7]),
           (([4, 4, 4],), [4, 4, 4]), (([10, -10, 0, 20],), [10, 0, 0, 5]), (([],), [])]
check(running_medians, CASES_4)
''', solution='''
import heapq

def running_medians(xs):
    low = []                                 # the smaller half, negated, so its largest is on top
    high = []                                # the larger half; its smallest is on top
    out = []
    for x in xs:
        if low and x > -low[0]:
            heapq.heappush(high, x)
        else:
            heapq.heappush(low, -x)
        # keep the halves balanced: low holds the same number as high, or one more
        if len(low) > len(high) + 1:
            heapq.heappush(high, -heapq.heappop(low))
        elif len(high) > len(low):
            heapq.heappush(low, -heapq.heappop(high))
        if len(low) > len(high):
            out.append(-low[0])
        else:
            out.append((-low[0] + high[0]) / 2)
    return out

check(running_medians, CASES_4)
# The middle numbers are always the tops of the two heaps. Each new number costs O(log n).
''')
    nb.problem(5, """
        A long list of points `(x, y)` with whole-number coordinates. **Return the `k` points nearest to `(0, 0)`, nearest first.**
        If two points are equally far, the one with the smaller `x` comes first, then the smaller `y`.
        Assume `k` is at least 1, and much smaller than the list.
    """, starter='''
def nearest(points, k):
    # your code here
    return None

CASES_5 = [(([(3, 4), (1, 1), (-2, 0), (0, 5)], 2), [(1, 1), (-2, 0)]),
           (([(1, 0), (0, 1), (-1, 0), (0, -1)], 3), [(-1, 0), (0, -1), (0, 1)]),
           (([(5, 5)], 1), [(5, 5)]),
           (([(2, 2), (1, 3), (3, 1)], 5), [(2, 2), (1, 3), (3, 1)]),
           (([(0, 0), (10, 10), (0, 0)], 2), [(0, 0), (0, 0)])]
check(nearest, CASES_5)
''', solution='''
import heapq

def nearest(points, k):
    # keep the k nearest so far, the farthest of them on top: negate the key to put the largest on top
    h = []
    for x, y in points:
        key = (-(x * x + y * y), -x, -y)     # squared distance is enough to compare; no square root needed
        if len(h) < k:
            heapq.heappush(h, key)
        elif key > h[0]:                     # nearer than the farthest one kept
            heapq.heapreplace(h, key)
    return [(-nx, -ny) for _, nx, ny in sorted(h, reverse=True)]

check(nearest, CASES_5)
# Shorter, with the same idea inside:
print(heapq.nsmallest(2, [(3, 4), (1, 1), (-2, 0), (0, 5)], key=lambda p: (p[0] ** 2 + p[1] ** 2, p[0], p[1])))
''')

    nb.cue([
        ('"always handle the smallest / most urgent next"', "a priority queue (`heapq`)"),
        ('"the top k of a stream"', "a heap of size k, with the smallest of the k on top"),
        ("several sorted lists to combine", "a heap of their front items"),
        ('"cheapest path, with costs"', "Dijkstra with a heap (DSA topic 8)"),
    ])
    nb.practise_more("""
        For this topic: the CSES Problem Set's *Sorting and Searching* section; LeetCode's *Heap (Priority Queue)* tag.
    """)
    nb.save(PATH)
    print("wrote", PATH)


if __name__ == "__main__":
    build()

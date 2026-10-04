"""Generates notebooks/dsa/06_trees_bst.ipynb (DSA topic 6: trees and binary search trees)

    python3 notebooks/src/d06_trees_bst.py
"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))
from nb import Notebook  # noqa: E402

PATH = "notebooks/dsa/06_trees_bst.ipynb"


def build() -> None:
    nb = Notebook()
    nb.header(
        eyebrow="DSA topic 6 · Trees and binary search trees · practice notebook",
        title="How can data stay sorted while you keep adding to it?",
        path=PATH,
        question="How can data stay sorted while you keep adding to it?",
        answer=("A binary search tree keeps smaller values to the left and bigger ones to the right at every node. "
                "Finding or adding a value follows one path down: about log n steps, if the tree stays bushy."),
        build_text="""
            In this notebook you will:

            1. **Build a tree** out of small Python objects, then add values to it and search it.
            2. **Read it back in order**, and see why the values come out sorted.
            3. **Measure its height**, see how the insertion order changes it, and build the shortest tree possible.
            4. **Meet Python's stand-in**, a sorted list with `bisect`, and check that both give the same answers.
            5. **Solve 5 practice problems.** Each has checks you can run, and a solution one click away.

            Running every cell takes a few seconds. The site's step-by-step animation is on the
            *Trees and binary search trees* page of the DSA track.
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

    # ------------------------------------------------------------------ 1 build and search
    nb.md("""
        ## 1. Scores arrive one at a time. Can you keep them in order?

        At any moment you need to answer: is this score present? A sorted list answers fast, but adding to it is slow:
        every item after the new one shifts along.

        Here is another way to store them. Each value sits in a small box with two links:

        - `left` leads to the values smaller than it,
        - `right` leads to the values bigger than it.

        The box is called a **node**. In Python, you describe a new kind of object with a `class`.
    """)
    nb.code('''
class Node:
    def __init__(self, value, left=None, right=None):
        self.value = value
        self.left = left            # the part with smaller values (None: empty)
        self.right = right          # the part with bigger values (None: empty)

    def __repr__(self):             # the text Python shows when you print a Node
        if self.left is None and self.right is None:
            return f"Node({self.value})"
        return f"Node({self.value}, {self.left!r}, {self.right!r})"

leaf = Node(4)
print(leaf.value, leaf.left, leaf.right)
print(Node(6, Node(4), None))
''')
    nb.md("""
        🐍 **Python notes: classes**
        - `class Node:` describes a new kind of object. `Node(4)` builds one, and Python runs `__init__` on it.
        - `self` is the object being built. `self.value = value` stores the value on it; `leaf.value` reads it back.
        - `left=None` gives a parameter a default value, so `Node(4)` and `Node(6, Node(4), None)` both work.
        - `__repr__` returns the text Python shows for the object. Here it is the code that would rebuild it.

        🐍 **Python notes: `None`**
        - `None` is Python's value for "nothing here". An empty link is `None`.
        - Test for it with `is None` (or `is not None`), not `==`.
    """)
    nb.md("""
        ### Adding a value

        Start at the top. At each node, go left if the new value is smaller, right if it is bigger.
        When you reach an empty link, put the new value there. A repeat is skipped.
    """)
    nb.code('''
def insert(node, value):
    """Insert value into the tree that starts at node. Returns the top node of the tree."""
    if node is None:
        return Node(value)                       # an empty spot: the value goes here
    if value < node.value:
        node.left = insert(node.left, value)     # smaller: into the left part
    elif value > node.value:
        node.right = insert(node.right, value)   # bigger: into the right part
    return node                                  # equal values are repeats: nothing changes

def tree(*values):
    """Insert the values, in this order, into an empty tree."""
    root = None
    for v in values:
        root = insert(root, v)
    return root

root = tree(8, 3, 10, 1, 6, 14, 4)
print(root)
''')
    nb.md("""
        🐍 **Python notes**
        - `insert` calls itself on the left or right part: this is **recursion**. The `if node is None` line is the **base case** that stops it.
        - `insert` returns a node, so the caller can link it in: `node.left = insert(node.left, value)`.
        - `elif` means "else if".
        - `def tree(*values)` collects all its arguments into one tuple: `tree(8, 3, 10)` gives `values = (8, 3, 10)`.

        The printed text is hard to read, so the next cell defines `draw`, which prints one line per level.
        Each value gets its own column, in increasing order, so no two values overlap. Run it; reading it is optional.
    """)
    nb.code('''
def draw(root):
    """Print the tree, one line per level. Each value's column is its place in sorted order."""
    cells = []                                   # (level, value) pairs, smallest value first
    def walk(node, level):
        if node is not None:
            walk(node.left, level + 1)
            cells.append((level, node.value))
            walk(node.right, level + 1)
    walk(root, 1)
    levels = max((lv for lv, _ in cells), default=0)
    for level in range(1, levels + 1):
        row = "".join(f"{v:>4}" if lv == level else "    " for lv, v in cells)
        print(f"level {level:>2}:{row.rstrip()}")
''', hidden=True, title="A helper that draws a tree (run it; reading it is optional)")
    nb.code('''
draw(root)
''')
    nb.md("""
        **What you see:** 8 came first, so it sits at the top. 3 is smaller, so it went left; 10 went right.
        4 went left of 8, right of 3, then left of 6: it is on level 4.
    """)
    nb.md("""
        ### Finding a value

        Searching follows the same rule as adding: smaller goes left, bigger goes right.
    """)
    nb.predict(
        "In the tree above, you search for 4. **Which values do you compare 4 with, in order?**",
        "**8, 3, 6, 4.** 4 < 8: go left. 4 > 3: go right. 4 < 6: go left. 4 equals 4: found, after 4 comparisons.",
    )
    nb.code('''
def search(node, value, visited):
    """True if value is in the tree that starts at node. Appends each value compared to visited."""
    if node is None:
        return False                             # an empty link: the value is not there
    visited.append(node.value)
    if value == node.value:
        return True
    if value < node.value:
        return search(node.left, value, visited)
    return search(node.right, value, visited)

for target in [4, 5, 14]:
    visited = []
    found = search(root, target, visited)
    print(f"search for {target:>2}: found={found}, compared with {visited}")
''')
    nb.md("""
        **What you see:** each search follows one path from the top. Searching for 4 never looks at 1, 10 or 14.
        Searching for 5 follows the same path and finds an empty link right of 4.

        **What it's called:** each box is a *node*. The top one is the *root*. Nodes with no children are *leaves*.
        This is a *binary search tree* (BST): at every node, everything in the left part is smaller and everything in the right part is bigger.
        A search or an insert makes one comparison per level it passes.
    """)

    # ------------------------------------------------------------------ 2 in order
    nb.md("""
        ## 2. Can you get the values back in sorted order?
    """)
    nb.predict(
        "Visit every node like this: first its left part, then the node itself, then its right part. "
        "**In what order do the values of the tree above come out?**",
        "**Increasing order: 1, 3, 4, 6, 8, 10, 14.** Everything in a node's left part is smaller and everything in its right part is bigger, "
        "so each node comes out between the two.",
    )
    nb.code('''
def in_order(node, out):
    """Append the values of the tree that starts at node to out: left part, the node, right part."""
    if node is not None:
        in_order(node.left, out)
        out.append(node.value)
        in_order(node.right, out)
    return out

print(in_order(root, []))
print(sorted([8, 3, 10, 1, 6, 14, 4]))
''')
    nb.md("""
        **What it's called:** this visiting order is an *in-order traversal*. It gives the values sorted, and costs one step per node.

        The `draw` helper uses it too: each value's column is its place in this order.
    """)

    # ------------------------------------------------------------------ 3 height
    nb.md("""
        ## 3. How tall is the tree? The insertion order decides

        A search makes one comparison per level, so the number of levels sets the cost.
        The number of levels is the tree's **height**.
    """)
    nb.code('''
def height(node):
    """Number of levels in the tree that starts at node. An empty tree has 0."""
    if node is None:
        return 0
    return 1 + max(height(node.left), height(node.right))

print("levels:", height(root))
''')
    nb.predict(
        "Insert 1, 2, 3, 4, 5, 6, 7 in that order. **What does the tree look like?**",
        "**A long chain of 7 levels.** Each value is bigger than all the values before it, so it always goes right. "
        "Searching for 7 compares with all 7 values, as slow as searching a list.",
    )
    nb.code('''
chain = tree(1, 2, 3, 4, 5, 6, 7)
draw(chain)
print("levels:", height(chain))
''')
    nb.md("""
        ### How short can a tree with 15 nodes be?

        Shuffle the values 1 to 15 many times, build a tree from each order, and record its height.
    """)
    nb.code('''
import random
random.seed(1)
values = list(range(1, 16))
heights = []
for _ in range(10_000):
    random.shuffle(values)
    heights.append(height(tree(*values)))
print("10,000 random orders: fewest levels", min(heights), " most levels", max(heights))
print("sorted order:", height(tree(*range(1, 16))), "levels")
''')
    nb.md("""
        🐍 `random.shuffle(values)` puts the list in a random order, in place. `tree(*values)` does the opposite of `*values`
        in a definition: it unpacks the list into separate arguments. `_` is a name for a loop variable you don't use.

        **What you see:** random orders gave between 5 and 12 levels. Sorted order gave 15, a chain.
        None gave fewer than 5. Is 4 possible?
    """)
    nb.md("""
        ### The formula: how many nodes fit in h levels?

        A tree is **full** when every level holds as many nodes as it can. Each level holds twice as many as the one above it.
    """)
    nb.code('''
print("levels   most nodes")
for h in range(1, 6):
    print(f"{h:>6}   {' + '.join(str(2 ** d) for d in range(h))} = {2 ** h - 1}")
''')
    nb.md("""
        A full tree with $h$ levels holds $1 + 2 + 4 + \\dots + 2^{h-1} = 2^h - 1$ nodes.
        **So $n$ nodes need at least $\\log_2(n + 1)$ levels.**

        - 15 nodes: at least 4 levels, because $2^4 - 1 = 15$.
        - 1,000 nodes: at least 10 levels, because $2^{10} - 1 = 1{,}023$.
        - At most: $n$ levels, a chain.

        So 4 levels is possible for 15 nodes. Random orders almost never reach it.
    """)
    nb.md("""
        ### Building the shortest tree from a sorted list

        Put the middle value at the top. Then the left half and the right half each have half as many values.
        Do the same to each half.
    """)
    nb.code('''
import math

def build_bushy(values):
    """values must be sorted. The middle value is the root; each half becomes one side, built the same way."""
    if not values:
        return None
    mid = len(values) // 2
    return Node(values[mid], build_bushy(values[:mid]), build_bushy(values[mid + 1:]))

bushy = build_bushy(list(range(1, 16)))
draw(bushy)
print("levels:", height(bushy))
print("1,000 values:", height(build_bushy(list(range(1000)))), "levels;  log2(1,001) =", round(math.log2(1001), 2))
''')
    nb.md("""
        🐍 `values[:mid]` is a **slice**: the items before position `mid`. `values[mid + 1:]` is everything after it.
        `if not values:` is true for an empty list.

        **What you see:** 15 values give 4 levels, the fewest possible. 1,000 values give 10.

        Now compare the three ways of building a tree as the number of values grows.
    """)
    nb.code('''
random.seed(2)
print(f"{'n':>5} {'sorted order':>13} {'random order':>13} {'middle first':>13}")
for n in [100, 200, 400, 800]:
    vals = list(range(n))
    shuffled = random.sample(vals, n)
    print(f"{n:>5} {height(tree(*vals)):>13} {height(tree(*shuffled)):>13} {height(build_bushy(vals)):>13}")
''')
    nb.md("""
        **What you see:** sorted input makes a chain, so its height equals $n$. A random order stays far shorter.
        Middle first gives the minimum, $\\lceil \\log_2(n + 1) \\rceil$.

        🐍 Python stops a recursion about 1,000 calls deep with a `RecursionError`. That is why the table stops at 800:
        `insert` on a sorted list of a few thousand values would crash. A million values built middle first make only 20 levels.

        **What it's called:** search and insert take $O(h)$ steps for a tree of height $h$: $O(\\log n)$ for a bushy tree, $O(n)$ for a chain.
        *Self-balancing* trees (AVL trees, red-black trees) move nodes around after each insert, so the height stays about $\\log_2 n$ whatever the order.
    """)

    # ------------------------------------------------------------------ 4 library
    nb.md("""
        ## 4. The library version: a sorted list with `bisect`

        **Python has no built-in balanced tree.** Its standard library has no search tree of any kind.
        The usual stand-in is a sorted list with the `bisect` module, which finds positions by binary search.

        | | sorted list + `bisect` | bushy search tree | chain |
        |---|---|---|---|
        | is $x$ present? | $O(\\log n)$ | $O(\\log n)$ | $O(n)$ |
        | add $x$ | $O(n)$: items shift along | $O(\\log n)$ | $O(n)$ |

        The shift is a single block copy done in C, which is fast, but its cost still grows with $n$.
        Outside the standard library, the `sortedcontainers` package offers a `SortedList` that also adds values fast.

        Build both from the same stream of 2,000 scores, and check that they agree.
        The scores also answer the second question from the start: what is the next score above $x$?
    """)
    nb.code('''
from bisect import bisect_left, bisect_right

random.seed(3)
stream = [random.randint(1, 1000) for _ in range(2000)]

root, xs = None, []
for v in stream:
    root = insert(root, v)
    i = bisect_left(xs, v)                       # where v belongs in the sorted list
    if i == len(xs) or xs[i] != v:               # skip repeats, as the tree does
        xs.insert(i, v)

def next_above(node, x):
    """Smallest value in the tree bigger than x, or None."""
    best = None
    while node is not None:
        if node.value > x:
            best = node.value                    # a candidate; a closer one can only be to the left
            node = node.left
        else:
            node = node.right
    return best

def next_above_list(xs, x):
    i = bisect_right(xs, x)                      # first position holding a value bigger than x
    return xs[i] if i < len(xs) else None

print("different scores:", len(xs), "  tree levels:", height(root))
print("same values, same order:", in_order(root, []) == xs)
print("same 'is it present?' answers:", all(search(root, q, []) == (q in set(xs)) for q in range(0, 1002)))
print("same 'next above' answers:", all(next_above(root, q) == next_above_list(xs, q) for q in range(0, 1002)))
print("next score above 500:", next_above(root, 500))
''')
    nb.md("""
        🐍 **Python notes**
        - `[random.randint(1, 1000) for _ in range(2000)]` is a **list comprehension**: it builds a list of 2,000 random whole numbers from 1 to 1,000.
        - `xs.insert(i, v)` puts `v` at position `i`; every item after it shifts one place along.
        - `all(...)` is `True` when every check inside is `True`. `set(xs)` makes a set, which answers `in` quickly.

        **What you see:** 2,000 scores held 858 different values. The tree has 21 levels: about twice the minimum of 10, and far below 858.
        The tree and the sorted list agree on every question.
    """)

    # ------------------------------------------------------------------ practice
    nb.md("""
        ## Practice

        Fill in each function, then run its cell to see the checks. The method isn't named: deciding how to solve it is part of the problem.

        Every problem uses the `Node` class and the `tree(...)` helper from above. `T` below is the tree from section 1.
    """)
    nb.code('''
T = tree(8, 3, 10, 1, 6, 14, 4)
draw(T)
''')
    nb.problem(1, """
        Call a tree *well shaped* if, at every node, its left part and its right part differ by at most 1 in number of levels.
        An empty part has 0 levels. **Return `True` if the whole tree is well shaped.**
    """, starter='''
def well_shaped(root):
    # your code here
    return None

CASES_1 = [((T,), True), ((tree(1, 2, 3),), False), ((tree(2, 1, 3),), True), ((None,), True),
           ((tree(5),), True), ((tree(8, 3, 10, 1, 6, 4),), False)]
check(well_shaped, CASES_1)
''', solution='''
def well_shaped(root):
    def levels_or_fail(node):
        """Levels of this part, or -1 if some node inside it is badly shaped."""
        if node is None:
            return 0
        a = levels_or_fail(node.left)
        b = levels_or_fail(node.right)
        if a < 0 or b < 0 or abs(a - b) > 1:
            return -1
        return 1 + max(a, b)
    return levels_or_fail(root) >= 0

check(well_shaped, CASES_1)
# Calling height() at every node also works, but measures the lower levels again and again.
# Returning the levels and the verdict together visits each node once: O(n).
''')
    nb.problem(2, """
        Someone built a tree by hand, with `Node(...)`. **Is it a valid search tree?** At every node, every value in its left part
        must be smaller than the node, and every value in its right part must be bigger. Repeats are not allowed.
    """, starter='''
def is_search_tree(root):
    # your code here
    return None

CASES_2 = [((T,), True),
           ((Node(8, Node(10), Node(3)),), False),
           ((Node(8, Node(3, None, Node(12)), Node(10)),), False),
           ((None,), True),
           ((Node(5, Node(5)),), False),
           ((Node(20, Node(10, Node(5), Node(15)), Node(30, Node(25), Node(35))),), True)]
check(is_search_tree, CASES_2)
''', solution='''
def is_search_tree(root, low=None, high=None):
    """Every value below root must be strictly between low and high (None: no limit)."""
    if root is None:
        return True
    if (low is not None and root.value <= low) or (high is not None and root.value >= high):
        return False
    return is_search_tree(root.left, low, root.value) and is_search_tree(root.right, root.value, high)

check(is_search_tree, CASES_2)
# Comparing each node with its two children is not enough: in the third case 12 is bigger than 3,
# its parent, but it sits in the left part of 8. Passing the allowed range down catches it.
# Another way: the in-order values must be strictly increasing.
''')
    nb.problem(3, """
        **Return the `k`-th smallest value in the tree** (`k = 1` is the smallest).
        Stop as soon as you have it: for a small `k`, don't visit the whole tree.
    """, starter='''
def kth_smallest(root, k):
    # your code here
    return None

CASES_3 = [((T, 1), 1), ((T, 3), 4), ((T, 5), 8), ((T, 7), 14),
           ((tree(50, 30, 70, 20, 40, 60, 80), 4), 50), ((tree(5), 1), 5)]
check(kth_smallest, CASES_3)
''', solution='''
def kth_smallest(root, k):
    stack, node = [], root
    while stack or node is not None:
        while node is not None:                  # go as far left as possible, remembering the way back
            stack.append(node)
            node = node.left
        node = stack.pop()                       # the next value in increasing order
        k -= 1
        if k == 0:
            return node.value
        node = node.right                        # then the values above it, smallest first
    return None

check(kth_smallest, CASES_3)
# This is the left part, node, right part order, done with a stack, so it can stop early.
# With a sorted list the answer is xs[k - 1].
''')
    nb.problem(4, """
        Two values `a` and `b` are both in the tree. **Return the value of the lowest node that has both of them in its part of the tree**
        (the node itself, or anywhere below it).
    """, starter='''
def lowest_shared(root, a, b):
    # your code here
    return None

CASES_4 = [((T, 1, 4), 3), ((T, 4, 14), 8), ((T, 6, 4), 6), ((T, 10, 14), 10), ((T, 1, 6), 3), ((T, 8, 8), 8)]
check(lowest_shared, CASES_4)
''', solution='''
def lowest_shared(root, a, b):
    node = root
    while node is not None:
        if a < node.value and b < node.value:
            node = node.left                     # both are in the left part
        elif a > node.value and b > node.value:
            node = node.right                    # both are in the right part
        else:
            return node.value                    # they split here (or one of them is this node)
    return None

check(lowest_shared, CASES_4)
# One path from the root: O(h) steps.
''')
    nb.problem(5, """
        **Return every value from `low` to `high` (both included), in increasing order.**
        The tree may hold millions of values while the range holds a few, so don't visit every node.
    """, starter='''
def values_between(root, low, high):
    # your code here
    return None

CASES_5 = [((T, 4, 10), [4, 6, 8, 10]), ((T, 0, 100), [1, 3, 4, 6, 8, 10, 14]), ((T, 11, 13), []),
           ((T, 14, 14), [14]), ((None, 1, 5), [])]
check(values_between, CASES_5)
''', solution='''
def values_between(root, low, high):
    out = []
    def walk(node):
        if node is None:
            return
        if node.value > low:                     # the left part can only hold values in range if node > low
            walk(node.left)
        if low <= node.value <= high:
            out.append(node.value)
        if node.value < high:                    # the same for the right part
            walk(node.right)
    walk(root)
    return out

check(values_between, CASES_5)
# The left part, node, right part order keeps the output sorted; skipping parts out of range keeps it fast.
# With a sorted list: xs[bisect_left(xs, low):bisect_right(xs, high)].
''')

    nb.cue([
        ('"keep data sorted while inserting and searching"', "a balanced binary search tree"),
        ('"a hierarchy of yes/no questions"', "a tree"),
        ("parents and children", "recursion over the left and right parts"),
        ("sorted data in Python that changes now and then", "a sorted list with `bisect` (Python has no built-in tree)"),
    ])
    nb.practise_more("""
        For this topic: the CSES Problem Set's *Tree Algorithms* section; LeetCode's *Binary Search Tree* and *Tree* tags.
    """)
    nb.save(PATH)
    print("wrote", PATH)


if __name__ == "__main__":
    build()

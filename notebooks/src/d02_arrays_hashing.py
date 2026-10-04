"""Generates notebooks/dsa/02_arrays_hashing.ipynb (DSA topic 2 practice notebook)

    python3 notebooks/src/d02_arrays_hashing.py
"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))
from nb import Notebook  # noqa: E402

PATH = "notebooks/dsa/02_arrays_hashing.ipynb"


def build() -> None:
    nb = Notebook()
    nb.header(
        eyebrow="DSA topic 2 · Arrays, hash maps and sets · practice notebook",
        title="How do you find something fast in a big collection?",
        path=PATH,
        question="How do you find something fast in a big collection?",
        answer=("In a list you may have to check every item. A hash set works out where an item must be, "
                "from the item itself, and looks only there: about one step, however big the collection."),
        build_text="""
            In this notebook you will:

            1. **Search a list** and count how many names you check.
            2. **Build your own hash set** from 8 buckets, and see some words land in the same bucket.
            3. **Time `in`** on a list and on a set, as the size grows.
            4. **Count things with a dict**, then with Python's `Counter`.
            5. **Solve 5 practice problems.** Each has checks you can run, and a solution one click away.

            Running every cell takes a few seconds. The site's step-by-step animation of the buckets is on the
            *Arrays, hash maps and sets* page of the DSA track.
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

    # ------------------------------------------------------------------ 1 list search
    nb.md("""
        ## 1. Is the name taken? Check a list, one name at a time

        You have 100,000 usernames in a list, in no order. Someone signs up as `night_owl_77`. **Is the name taken?**

        With a list, the only way to know is to look. Start at the front and compare each name with the new one.
    """)
    nb.predict(
        "A list holds 100,000 names in no order. **On average, how many names do you check to find one that is there?** "
        "And if the name is not there?",
        "**About 50,000**, half the list: a name is as likely to be near the back as near the front. "
        "If the name is not there, you check all 100,000.",
    )
    nb.code('''
import random
random.seed(2)

def checks_in_list(names, target):
    """Compare target with each name, from the front. Return how many names were checked."""
    checks = 0
    for name in names:
        checks += 1
        if name == target:
            return checks
    return checks                            # not there: every name was checked

names = [f"user{i}" for i in range(100_000)]
random.shuffle(names)                        # no order

picks = random.sample(names, 100)            # 100 names that are in the list
average = sum(checks_in_list(names, t) for t in picks) / len(picks)
print("average checks for a name that is there:", round(average))
print("checks for a name that is not there:    ", checks_in_list(names, "night_owl_77"))
print("Python's own test agrees:", "night_owl_77" in names, picks[0] in names)
''')
    nb.md("""
        🐍 **Python notes**
        - `[f"user{i}" for i in range(100_000)]` is a **list comprehension**: it builds a list by working out `f"user{i}"` once for each `i`. The `f` before the quotes puts the value of `i` into the string.
        - `random.shuffle(names)` mixes the list in place. `random.sample(names, 100)` picks 100 different items from it.
        - `sum(checks_in_list(names, t) for t in picks)` adds up one value per pick.
        - `x in names` walks the list the same way `checks_in_list` does, and gives `True` or `False`.
    """)
    nb.md("""
        **What you see:** about half the list on average, and the whole list when the name is missing.

        **What it's called:** a Python list keeps its items in order, side by side in memory, like an **array**.
        Reading the item at a position, as in `names[5]`, takes one step: Python works out where it is.
        **Finding a value has no such shortcut.** It needs a search through up to $n$ items: $O(n)$.
    """)

    # ------------------------------------------------------------------ 2 buckets
    nb.md("""
        ## 2. Look in one place only: build your own hash set

        What if each word told you where it must be stored? Then a search would look only there.

        Here is one rule. Every character has a number, its **character code**: `a` is 97, `b` is 98, and so on up to `z`, 122.
        Add up the codes of a word's letters. Divide by 8 and keep the remainder, a number from 0 to 7.
        That number picks one of 8 lists. Each of those lists is a **bucket**.
    """)
    nb.code('''
def bucket_of(word, n_buckets=8):
    return sum(ord(ch) for ch in word) % n_buckets

print("a:", ord("a"), "  b:", ord("b"), "  z:", ord("z"))
print("ab: 97 + 98 =", ord("a") + ord("b"), "-> remainder after dividing by 8:", bucket_of("ab"))
print("cat ->", bucket_of("cat"), "  dog ->", bucket_of("dog"))
''')
    nb.md("""
        🐍 **Python notes**
        - `ord(ch)` gives the character code of one character. `chr(97)` goes the other way: it gives `"a"`.
        - `%` gives the remainder after division: `195 % 8` is 3, because 195 = 24 × 8 + 3.
        - `for ch in word` walks through the characters of a string, one at a time.
    """)
    nb.md("""
        Now the structure itself: a list of 8 buckets, each an empty list.
        `add` puts a word into its bucket, unless it is already there. `contains` looks in that one bucket only.
    """)
    nb.code('''
class BucketSet:
    def __init__(self, n_buckets=8, rule=bucket_of):
        self.rule = rule                                 # word -> bucket number
        self.buckets = [[] for _ in range(n_buckets)]    # n separate empty lists

    def add(self, word):
        b = self.rule(word, len(self.buckets))
        if word not in self.buckets[b]:                  # each word at most once
            self.buckets[b].append(word)

    def contains(self, word):
        b = self.rule(word, len(self.buckets))
        return word in self.buckets[b]                   # look in one bucket only

s = BucketSet()
for w in "cat dog sun map key box pen".split():
    s.add(w)
for i, bucket in enumerate(s.buckets):
    print(i, bucket)
print("pen?", s.contains("pen"), "  owl?", s.contains("owl"), f"(owl's bucket is {bucket_of('owl')})")
''')
    nb.md("""
        🐍 **Python notes**
        - `class BucketSet:` defines a new kind of object. `__init__` runs when you write `BucketSet()`. `self` is the object being built or used.
        - `self.buckets` is data stored on the object. `add` and `contains` are **methods**: functions that belong to the object.
        - `[[] for _ in range(8)]` makes 8 separate empty lists. Avoid `[[]] * 8`: it makes 8 references to *one* list, so adding to one bucket adds to all of them.
        - `enumerate(xs)` gives each position together with its item. `"a b c".split()` splits a string at the spaces.
    """)
    nb.md("""
        **What you see:** `key` and `box` share bucket 1, and `sun` and `map` share bucket 6.
        Two items in one bucket is a **collision**. `contains("owl")` looked only in bucket 2, which holds one word.
    """)
    nb.predict(
        "`stop`, `pots`, `tops` and `spot` use the same four letters. **Which buckets do they land in?**",
        "**All four land in bucket 6.** The same letters give the same sum, 454, so the same remainder. "
        "A rule that only adds up the letters puts every rearrangement of a word in one bucket.",
    )
    nb.code('''
four = ["stop", "pots", "tops", "spot"]
for w in four:
    print(w, "sum", sum(ord(ch) for ch in w), "-> bucket", bucket_of(w))
pile = BucketSet()
for w in four:
    pile.add(w)
print(pile.buckets)
''')

    nb.md("""
        ### How full do the buckets get?

        With 1,000 words in 8 buckets, each bucket holds about 125. A search inside one would check dozens of words.
        **Do more buckets fix that?** Try 1,024 buckets with the same rule, and then with a rule that mixes the letters more.
    """)
    nb.code('''
random.seed(3)
letters = "abcdefghijklmnopqrstuvwxyz"
words = ["".join(random.choices(letters, k=random.randint(3, 6))) for _ in range(1_000)]

def mixed_rule(word, n_buckets):
    h = 0
    for ch in word:
        h = h * 31 + ord(ch)                 # each letter's position changes the result
    return h % n_buckets

def report(name, hs):
    sizes = [len(b) for b in hs.buckets]
    stored = sum(sizes)
    # finding the k-th word of a bucket takes k checks, so a bucket of size k costs 1 + 2 + ... + k in total
    average = sum(k * (k + 1) / 2 for k in sizes) / stored
    used = sum(1 for k in sizes if k > 0)
    print(f"{name:<26} buckets used: {used:>4} of {len(sizes):<5} biggest: {max(sizes):>3}   average checks: {average:.1f}")

for name, n_buckets, rule in [("sum rule, 8 buckets", 8, bucket_of),
                              ("sum rule, 1,024 buckets", 1_024, bucket_of),
                              ("mixed rule, 1,024 buckets", 1_024, mixed_rule)]:
    hs = BucketSet(n_buckets, rule)
    for w in words:
        hs.add(w)
    report(name, hs)
''')
    nb.md("""
        🐍 **Python notes**
        - `random.choices(letters, k=4)` picks 4 letters, repeats allowed. `"".join(...)` glues them into one string.
        - `rule=bucket_of` passes a function as an argument, like any other value. `BucketSet(1_024, mixed_rule)` swaps in another rule.
        - `{name:<26}` in an f-string pads `name` to 26 characters, lined up on the left. `>4` lines up on the right; `.1f` shows one decimal place.
    """)
    nb.md("""
        **What you see:**
        - 8 buckets: every bucket is crowded, and a search checks about 60 words.
        - 1,024 buckets with the sum rule: most buckets stay empty. A 3- to 6-letter word's sum lies between 291 and 732, so at most 442 buckets can ever be used.
        - **The mixed rule spreads the words over most of the 1,024 buckets.** The biggest holds 5 words, and a search takes 1.5 checks on average.

        **What it's called:** the rule from item to bucket number is a **hash function**. This structure is a **hash set**.
        With a good hash function and enough buckets, each bucket stays small.
        Then a lookup takes about one step at any size: $O(1)$ on average.
    """)
    nb.md("""
        ### The library version: `set`

        Python's `set` works the same way. It uses a stronger rule, `hash()`, written in C, and adds buckets as it grows.
        Check that your `BucketSet` and Python's `set` give the same answers.
    """)
    nb.code('''
mine = BucketSet(1_024, mixed_rule)
for w in words:
    mine.add(w)
theirs = set(words)

queries = words[:500] + ["".join(random.choices(letters, k=4)) for _ in range(500)]
print("same answers:", all(mine.contains(q) == (q in theirs) for q in queries))
print("same size:", sum(len(b) for b in mine.buckets), len(theirs))
''')
    nb.md("""
        🐍 **Python notes**
        - `set(words)` builds a set from a list. A word that appears twice is stored once, as in `BucketSet`.
        - `x in theirs` asks the set; `theirs.add(x)` adds to it.
        - `all(...)` is `True` when every value inside is `True`.
    """)

    # ------------------------------------------------------------------ 3 timing
    nb.md("""
        ## 3. How long does `in` take as the collection grows?

        Time `x in a_list` and `x in a_set` at sizes 1,000, 10,000, 100,000 and 1,000,000.
        The numbers searched for are not in the collection, so the list has to compare each one with every item.
    """)
    nb.predict(
        "The collection gets 10 times bigger. **How much longer does `x in a_list` take? And `x in a_set`?**",
        "**About 10 times longer for the list**: it compares `x` with 10 times as many items. "
        "**About the same for the set**: it looks in one bucket, whatever the size.",
    )
    nb.code('''
import time

def seconds_per_lookup(collection, targets):
    t0 = time.perf_counter()
    for t in targets:
        found = t in collection
    return (time.perf_counter() - t0) / len(targets)

print(f"{'n':>10} {'x in list':>12} {'vs above':>10} {'x in set':>10}")
previous = None
for n in [1_000, 10_000, 100_000, 1_000_000]:
    items = list(range(n))
    as_set = set(items)
    t_list = seconds_per_lookup(items, range(-1, -21, -1))       # 20 numbers that are not there
    t_set = seconds_per_lookup(as_set, range(-1, -100_001, -1))  # 100,000 numbers that are not there
    growth = f"{t_list / previous:.1f}x" if previous else "-"
    previous = t_list
    print(f"{n:>10,} {t_list * 1e6:>10.1f}µs {growth:>10} {t_set * 1e6:>8.3f}µs")
''')
    nb.md("""
        🐍 **Python notes**
        - `time.perf_counter()` reads a clock in seconds, made for timing short pieces of code.
        - `1e6` is 1,000,000, so `t * 1e6` turns seconds into microseconds (µs, millionths of a second).
        - `range(-1, -21, -1)` counts down: -1, -2, ..., -20.
        - `{n:>10,}` lines `n` up on the right in 10 characters, with commas between thousands.
    """)
    nb.md("""
        **What you see:** each row has 10 times more items. **The list time grows about 10 times per row**
        (the "vs above" column divides each list time by the one above it). The set time stays about the same, well under a microsecond.

        **What it's called:** `x in a_list` takes $O(n)$ time. `x in a_set` takes $O(1)$ time on average.
    """)

    # ------------------------------------------------------------------ 4 dict counting
    nb.md("""
        ## 4. How many times does each word appear? Store a number next to each word

        A set answers "have I seen this word?". To count, you need a number stored next to each word.
    """)
    nb.code('''
text = """the sun rose over the hill and the dog ran up the hill
the cat sat in the sun and the dog sat by the cat"""

counts = {}                                  # word -> how many times so far
for w in text.split():
    counts[w] = counts.get(w, 0) + 1
print(counts)
print("the:", counts["the"], "  hill:", counts["hill"])
''')
    nb.md("""
        🐍 **Python notes**
        - `{}` is an empty **dict**. A dict stores pairs: a **key** (here a word) and a **value** (here its count).
        - `counts[w] = ...` stores a value under the key `w`. `counts["the"]` reads it back.
        - `counts.get(w, 0)` gives the value for `w`, or 0 if `w` is not a key yet.
        - `split()` with nothing in the brackets splits at any spaces and line breaks.
    """)
    nb.md("""
        **What it's called:** a hash set with a value stored next to each item is a **hash map**. Python's `dict` is one.
        It finds a key the same way a set finds an item: one bucket, picked by `hash(key)`.
        Reading, adding or changing a key takes $O(1)$ on average.
    """)
    nb.md("""
        **The library version:** `collections.Counter` does the counting loop for you. Check that both agree.
    """)
    nb.code('''
from collections import Counter

c = Counter(text.split())
print("same counts:", c == counts)
print("three most common:", c.most_common(3))

# keys can be pairs: which letter follows which (the bigram model in Field 3 counts these)
word = "mississippi"
print(Counter(zip(word, word[1:])).most_common(3))
''')
    nb.md("""
        🐍 **Python notes**
        - `Counter(items)` counts the items in one line. It is a dict, with extra methods such as `most_common(3)`: the 3 biggest counts, biggest first.
        - `zip(a, b)` pairs items position by position. `word[1:]` is the word without its first letter, so `zip(word, word[1:])` pairs each letter with the next one.
        - A pair such as `('s', 's')` is a **tuple**. A tuple can be a dict key; a list cannot, because a list can change after it is stored.
    """)

    # ------------------------------------------------------------------ practice
    nb.md("""
        ## Practice

        Fill in each function, then run its cell to see the checks. The method isn't named: deciding how to solve it is part of the problem.
    """)
    nb.problem(1, """
        A list of whole numbers and a target. Find two numbers **at different positions** that add up to the target.
        Return their positions as a pair `(i, j)` with `i < j`. If several pairs work, return the one with the smallest `j`,
        and for that `j` the smallest `i`. If no pair works, return `None`.
        The list can hold a million numbers, so read it only once.
    """, starter='''
def two_that_add_up(xs, target):
    # your code here
    return None

CASES_1 = [(([8, 3, 11, 5, 2], 7), (3, 4)), (([4, 6, 4], 8), (0, 2)), (([1, 2, 3], 100), None),
           (([5, -2, 9, 7], 7), (1, 2)), (([10], 20), None), (([3, 3, 3], 6), (0, 1))]
check(two_that_add_up, CASES_1)
''', solution='''
def two_that_add_up(xs, target):
    first_seen = {}                          # value -> the first position it appeared at
    for j, x in enumerate(xs):
        need = target - x
        if need in first_seen:               # a partner appeared earlier
            return (first_seen[need], j)
        if x not in first_seen:
            first_seen[x] = j
    return None

check(two_that_add_up, CASES_1)
# One pass, one dict lookup per number: O(n). Trying every pair would be O(n^2).
''')
    nb.problem(2, """
        Ticket codes are scanned at a door, in order. A code scanned twice means a copied ticket.
        **Return the first code that is scanned for a second time**: the repeat that happens earliest.
        If no code repeats, return `None`.
    """, starter='''
def first_copied(scans):
    # your code here
    return None

CASES_2 = [((["A7", "B2", "C9", "B2", "A7"],), "B2"), ((["X1", "X1"],), "X1"), ((["K5", "L6", "M7"],), None),
           (([],), None), ((["p", "q", "r", "q", "p", "p"],), "q")]
check(first_copied, CASES_2)
''', solution='''
def first_copied(scans):
    seen = set()
    for code in scans:
        if code in seen:                     # scanned before: this is the earliest repeat
            return code
        seen.add(code)
    return None

check(first_copied, CASES_2)
# Each scan costs one set lookup, so the whole list takes O(n).
''')
    nb.problem(3, """
        A list of lowercase words. Put words that use **the same letters, the same number of times**, into one group.
        Return a list of groups. Each group lists its words in the order they appear,
        and the groups are ordered by where their first word appears.
    """, starter='''
def same_letter_groups(words):
    # your code here
    return None

CASES_3 = [((["stop", "cat", "pots", "act", "dog", "tops"],), [["stop", "pots", "tops"], ["cat", "act"], ["dog"]]),
           ((["a", "b", "a"],), [["a", "a"], ["b"]]),
           (([],), []),
           ((["night", "thing", "night"],), [["night", "thing", "night"]]),
           ((["ab", "ba", "abb", "bab"],), [["ab", "ba"], ["abb", "bab"]])]
check(same_letter_groups, CASES_3)
''', solution='''
def same_letter_groups(words):
    groups = {}                              # sorted letters -> the words with those letters
    for w in words:
        key = "".join(sorted(w))             # "stop" -> "opst", and "pots" -> "opst" too
        groups.setdefault(key, []).append(w)
    return list(groups.values())

check(same_letter_groups, CASES_3)
# setdefault(key, []) gives the list stored under key, first storing an empty one if there is none.
# A dict keeps keys in the order they were first added, so the groups come out in order of first appearance.
''')
    nb.problem(4, """
        **Return the word that appears most often** in a sentence. Words are separated by spaces.
        If several words tie, return the one that appears first in the sentence. An empty sentence gives `None`.
    """, starter='''
def most_frequent(sentence):
    # your code here
    return None

CASES_4 = [(("to be or not to be",), "to"), (("red blue red green blue red",), "red"), (("one",), "one"),
           (("",), None), (("b a a b c",), "b")]
check(most_frequent, CASES_4)
''', solution='''
def most_frequent(sentence):
    counts = {}
    for w in sentence.split():
        counts[w] = counts.get(w, 0) + 1
    best = None
    for w in counts:                         # keys come out in order of first appearance
        if best is None or counts[w] > counts[best]:
            best = w                         # strictly bigger, so an earlier word keeps a tie
    return best

check(most_frequent, CASES_4)
# The library version: Counter(words).most_common(1)[0][0]. most_common keeps tied words in order of first appearance.
''')
    nb.problem(5, """
        A list of whole numbers in no order, possibly with repeats.
        **How long is the longest run of numbers that follow on from each other**, like 4, 5, 6, 7?
        The numbers of a run can sit anywhere in the list. Aim for about one step per number, without sorting.
    """, starter='''
def longest_run(xs):
    # your code here
    return None

CASES_5 = [(([10, 5, 12, 3, 11, 4, 20],), 3), (([9, 1, 8, 2, 7, 3, 6],), 4), (([1, 2, 2, 3],), 3),
           (([-2, -1, 0, 5],), 3), (([7],), 1), (([],), 0)]
check(longest_run, CASES_5)
''', solution='''
def longest_run(xs):
    present = set(xs)
    best = 0
    for x in present:
        if x - 1 not in present:             # x is the start of a run
            length = 1
            while x + length in present:
                length += 1
            best = max(best, length)
    return best

check(longest_run, CASES_5)
# Each run is walked once, from its start, so the total work is O(n) on average.
''')

    nb.cue([
        ('"have I seen this before?"', "a hash set"),
        ('"how many times does each thing appear?"', "a hash map of counts"),
        ('"find a pair that adds up to a target"', "a set (or dict) of the values seen so far"),
        ("group items that match in some way", "a dict from a shared key to a list"),
    ])
    nb.practise_more("""
        For this topic: the CSES Problem Set's *Sorting and Searching* section; LeetCode's *Hash Table* tag.
    """)
    nb.save(PATH)
    print("wrote", PATH)


if __name__ == "__main__":
    build()

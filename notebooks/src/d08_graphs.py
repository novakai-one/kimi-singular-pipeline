"""Generates notebooks/dsa/08_graphs.ipynb (DSA topic 8: graphs)

    python3 notebooks/src/d08_graphs.py
"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))
from nb import Notebook  # noqa: E402

PATH = "notebooks/dsa/08_graphs.ipynb"


def build() -> None:
    nb = Notebook()
    nb.header(
        eyebrow="DSA topic 8 · Graphs · practice notebook",
        title="How do you explore anything made of things and connections?",
        path=PATH,
        question="How do you explore anything made of things and connections?",
        answer=("Model it as a graph: dots and links. One small set of algorithms answers the common questions: "
                "how far, how cheap, in which order, and is it connected."),
        build_text="""
            In this notebook you will:

            1. **Store a graph** as a Python dict of lists.
            2. **Find the fewest steps** from one place to every other, on a map and on a grid maze.
            3. **Go deep first** with a function that calls itself.
            4. **Find the cheapest route** when links have costs.
            5. **Put tasks in an order** that respects every prerequisite, or show that none exists.
            6. **Track connected groups** as links arrive one at a time.
            7. **Check every answer** against the `networkx` library, then **solve 5 practice problems**.

            Running every cell takes a few seconds. The site's step-by-step animation of these algorithms is on the
            *Graphs* page of the DSA track.
        """,
    )
    nb.md("""
        ## How to use this notebook

        - Run each grey code cell with **Shift + Enter**, top to bottom.
        - 🤔 **Predict first** boxes ask you to guess before you run. The answer is one click away.
        - 🐍 **Python notes** explain Python as it comes up.
        - Solutions are in collapsed cells. In Colab, double-click a solution's title to open it. Try first; open it when you're stuck.

        The next cell installs `networkx`, a graph library used in section 6. Colab already has it, so there it does nothing.
    """)
    nb.code('''
%pip install -q networkx
''')
    nb.check_setup()

    # ------------------------------------------------------------------ 1 BFS
    nb.md("""
        ## 1. How many steps from A to every other place?

        Seven places, A to G. A line between two places means you can move between them in one step.

        ```
        A ── B ── D
        │    │
        C    E
        │    │
        F ───┘
        │
        G
        ```

        **How many steps does each place need, starting from A?** You could try every route, but the number of routes explodes as the map grows.

        First, store the map. For each place, list the places one step away.
    """)
    nb.code('''
graph = {
    "A": ["B", "C"],
    "B": ["A", "D", "E"],
    "C": ["A", "F"],
    "D": ["B"],
    "E": ["B", "F"],
    "F": ["C", "E", "G"],
    "G": ["F"],
}
print("one step from B:", graph["B"])
print("places:", len(graph), "  links:", sum(len(v) for v in graph.values()) // 2)
''')
    nb.md("""
        🐍 **Python notes**
        - `{"A": [...], ...}` is a **dict**: it maps each key (here a place) to a value (here a list of places). `graph["B"]` looks up B's list.
        - `graph.values()` gives every list; `len(v)` is the length of one list.
        - Each link appears twice (B lists A, and A lists B), so the total is divided by 2. `//` divides and drops the remainder.

        Each place is called a **node** and each link an **edge**. Nodes joined by edges form a **graph**.
        A dict that lists each node's neighbours is called an **adjacency list**.
    """)
    nb.md("""
        ### Search outwards, one ring at a time

        Start at A. Everything one step from A is in the first ring. Everything one step from the first ring, and not seen before, is in the second ring. And so on.

        To do this in code, keep a **queue**: a line of nodes waiting to be explored. Take nodes from the front; add newly found nodes at the back.
        Nodes found earlier come out earlier, so the rings come out in order.
    """)
    nb.predict(
        "Starting from A, **which nodes are exactly 2 steps away?**",
        "**D, E and F.** B and C are 1 step away. D and E are next to B; F is next to C. G is 3 steps away, next to F.",
    )
    nb.code('''
from collections import deque

def steps_from(graph, start):
    steps = {start: 0}                       # every node found so far, with its number of steps
    queue = deque([start])
    order = []
    while queue:
        node = queue.popleft()               # take from the front
        order.append(node)
        for nxt in graph[node]:
            if nxt not in steps:             # new: one step further than node
                steps[nxt] = steps[node] + 1
                queue.append(nxt)            # add to the back
    return steps, order

steps, order = steps_from(graph, "A")
print("visit order:", order)
print("steps from A:", steps)
''')
    nb.md("""
        🐍 **Python notes**
        - `deque` (say "deck") is a list that is fast at both ends. `queue.popleft()` removes the first item; `queue.append(x)` adds at the back.
          A plain list's `pop(0)` would shift every other item each time.
        - `while queue:` keeps going while the queue is not empty. An empty container counts as false.
        - `nxt not in steps` checks whether a key is in the dict. It takes about one step, however big the dict.

        **What you see:** A first, then the 1-step ring (B, C), then the 2-step ring (D, E, F), then G.

        **What it's called:** this is **breadth-first search (BFS)**. It finds the fewest edges from the start to every node.
        Each node enters the queue once and each edge is checked from both ends, so the work is $O(V + E)$ for $V$ nodes and $E$ edges.
    """)
    nb.md("""
        ### The same search on a grid maze

        A maze is a graph too. Each open square is a node. Squares that touch up, down, left or right are joined by an edge.
        `#` is a wall, `S` the start and `E` the exit. **What is the fewest number of moves from S to E?**
    """)
    nb.code('''
maze = [
    "S.#......",
    "..#.###.#",
    "..#...#..",
    ".####.##.",
    "......#.E",
]

def fewest_moves(maze):
    rows, cols = len(maze), len(maze[0])
    start = next((r, c) for r in range(rows) for c in range(cols) if maze[r][c] == "S")
    came_from = {start: None}
    queue = deque([start])
    while queue:
        r, c = queue.popleft()
        if maze[r][c] == "E":
            path = [(r, c)]                  # walk back to the start to recover the route
            while came_from[path[-1]] is not None:
                path.append(came_from[path[-1]])
            return len(path) - 1, path[::-1]
        for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            nr, nc = r + dr, c + dc
            if 0 <= nr < rows and 0 <= nc < cols and maze[nr][nc] != "#" and (nr, nc) not in came_from:
                came_from[(nr, nc)] = (r, c)
                queue.append((nr, nc))
    return -1, []                            # the exit cannot be reached

moves, path = fewest_moves(maze)
print("fewest moves:", moves)
drawn = [list(row) for row in maze]
for r, c in path[1:-1]:
    drawn[r][c] = "*"
print("\\n".join("".join(row) for row in drawn))
''')
    nb.md("""
        🐍 **Python notes**
        - `(r, c)` is a **tuple**: a fixed pair of values. Tuples can be dict keys; lists cannot.
        - `next(x for ... if ...)` returns the first item that passes the test.
        - `0 <= nr < rows` is a chained comparison: both `0 <= nr` and `nr < rows`.
        - `path[::-1]` is the list reversed. `"".join(row)` glues a list of characters into one string.

        **What you see:** the fewest moves is 24. The route goes down the left side, along the bottom, up through the middle,
        along the top, and down the right side.
        The first time BFS takes the exit from the queue, no shorter route can exist, because every shorter route would sit in an earlier ring.
    """)

    # ------------------------------------------------------------------ 2 DFS
    nb.md("""
        ## 2. Go as deep as you can, then back up

        A different order: from A, follow one edge to a new node, then one edge from there, and so on, as far as you can.
        When a node has no new neighbours left, back up to the node before it and try its next neighbour.

        A function that calls itself does the backing up for you: when the inner call returns, you are back at the node before.
    """)
    nb.code('''
def deep_first(graph, start):
    visited = []
    def visit(node):
        visited.append(node)
        for nxt in graph[node]:
            if nxt not in visited:
                visit(nxt)                   # go deeper; when this returns, you are back at node
    visit(start)
    return visited

print("deep first: ", deep_first(graph, "A"))
print("rings first:", order)
''')
    nb.md("""
        🐍 **Python notes**
        - `visit` is defined inside `deep_first`, so it can use `graph` and `visited` from the outer function.
        - `visit(nxt)` calls the same function again: **recursion**. Each call waits until the deeper call has finished.
        - `nxt not in visited` checks a list item by item. For big graphs use a `set` instead, which checks in about one step.

        **What you see:** from A it goes to B, then D. D has nothing new, so it backs up to B and goes to E, then F, then C. G comes last.

        **What it's called:** this is **depth-first search (DFS)**. Python keeps the unfinished calls on a **stack**: the last call started is the first to finish.
        It also takes $O(V + E)$. DFS does not find fewest steps, but it is the base of many other searches: finding connected parts, loops, and orders.
    """)

    # ------------------------------------------------------------------ 3 Dijkstra
    nb.md("""
        ## 3. The cheapest route when roads have costs

        Now each road has a cost (a toll, or minutes of driving).

        | road | A–B | A–C | B–D | C–E | D–E | D–F | E–F |
        |---|---|---|---|---|---|---|---|
        | cost | 5 | 1 | 5 | 1 | 1 | 2 | 6 |

        **What is the cheapest way from A to F?**
    """)
    nb.code('''
roads = [("A", "B", 5), ("A", "C", 1), ("B", "D", 5), ("C", "E", 1), ("D", "E", 1), ("D", "F", 2), ("E", "F", 6)]
road_map = {}
for a, b, cost in roads:
    road_map.setdefault(a, []).append((b, cost))
    road_map.setdefault(b, []).append((a, cost))      # two-way road
print(road_map["D"])

plain = {node: [nxt for nxt, cost in links] for node, links in road_map.items()}
fewest, _ = steps_from(plain, "A")
print("fewest roads from A to F:", fewest["F"])
''')
    nb.md("""
        🐍 **Python notes**
        - `for a, b, cost in roads:` unpacks each 3-item tuple into three names.
        - `d.setdefault(key, [])` returns `d[key]`, first creating it as an empty list if it is missing.
        - `{node: [...] for node, links in road_map.items()}` is a **dict comprehension**: it builds a new dict in one line. Here it drops the costs.
        - `_` is a name for a value you will not use.
    """)
    nb.predict(
        "BFS says F is 3 roads from A. The route A → B → D → F costs 5 + 5 + 2 = 12. **Is there a cheaper route? What does it cost?**",
        "**Yes: cost 5.** A → C → E → D → F uses 4 roads, but they cost 1 + 1 + 1 + 2 = 5. Fewest roads is not the same as cheapest.",
    )
    nb.md("""
        ### Always expand the cheapest node found so far

        Keep the cheapest known cost for each node. Repeatedly take the waiting node with the **lowest** cost.
        Its cost is now final: every other waiting node costs at least as much, and costs are never negative, so no detour through them can be cheaper.
        Then try each road out of it, and lower a neighbour's cost if the road gives a cheaper way.

        Finding the lowest-cost waiting node fast needs a **priority queue**: a collection that always gives back its smallest item first.
        Python's `heapq` module gives one.
    """)
    nb.code('''
import heapq

def cheapest_from(road_map, start):
    cost = {start: 0}
    came_from = {start: None}
    heap = [(0, start)]                      # (cost so far, node): the lowest cost comes out first
    done = set()
    while heap:
        c, node = heapq.heappop(heap)
        if node in done:
            continue                         # an older, dearer entry for a node already finished
        done.add(node)
        for nxt, road in road_map[node]:
            if c + road < cost.get(nxt, float("inf")):
                cost[nxt] = c + road
                came_from[nxt] = node
                heapq.heappush(heap, (c + road, nxt))
    return cost, came_from

def route_to(came_from, end):
    path = [end]
    while came_from[path[-1]] is not None:
        path.append(came_from[path[-1]])
    return path[::-1]

cost, came_from = cheapest_from(road_map, "A")
print("cheapest costs from A:", dict(sorted(cost.items())))
print("cheapest route to F:", " → ".join(route_to(came_from, "F")), "  cost", cost["F"])
''')
    nb.md("""
        🐍 **Python notes**
        - `heapq.heappush(heap, item)` adds an item; `heapq.heappop(heap)` removes the smallest. Both take about $\\log n$ steps.
        - Tuples compare by their first item, then the second: `(1, "C") < (5, "B")`. So the cheapest cost comes out first.
        - `cost.get(nxt, float("inf"))` returns the cost if it is known, otherwise infinity, which is larger than every number.
        - `set()` is an empty **set**: a collection with no repeats and a fast `in` check.

        **What you see:** F costs 5, by the 4-road route A → C → E → D → F.

        **What it's called:** this is **Dijkstra's algorithm**. With a heap it takes $O((V + E) \\log V)$.
        It needs every cost to be zero or more. One negative road could make a "final" cost wrong.
    """)

    # ------------------------------------------------------------------ 4 topological sort
    nb.md("""
        ## 4. In what order can you take these courses?

        Some courses need others first. An edge A → B means "take A before B".

        ```
             ┌──→ B ──┐
        A ───┤        ├──→ D ──→ E
             └──→ C ──┘
        ```

        **In what order can you take all five, so every course comes after its prerequisites?**

        Count each course's prerequisites. A course with none left is **ready**. Take a ready course, cross off the edges out of it,
        and any course whose count drops to 0 becomes ready too.
    """)
    nb.code('''
def course_order(courses, before):
    left = {c: 0 for c in courses}           # prerequisites not yet crossed off
    after = {c: [] for c in courses}
    for a, b in before:
        left[b] += 1
        after[a].append(b)
    ready = deque(sorted(c for c in courses if left[c] == 0))
    order = []
    while ready:
        c = ready.popleft()
        order.append(c)
        for nxt in after[c]:
            left[nxt] -= 1                   # cross off the edge c → nxt
            if left[nxt] == 0:
                ready.append(nxt)
    if len(order) < len(courses):
        return None, [c for c in courses if c not in order]   # these are on a loop, or wait on one
    return order, []

plan = [("A", "B"), ("A", "C"), ("B", "D"), ("C", "D"), ("D", "E")]
print("order:", course_order("ABCDE", plan))
print("with E before B as well:", course_order("ABCDE", plan + [("E", "B")]))
''')
    nb.md("""
        🐍 **Python notes**
        - `for c in "ABCDE"` goes through a string one character at a time, so a string works as a list of one-letter names.
        - `sorted(c for c in courses if left[c] == 0)` sorts the ready courses, so the answer does not depend on the input order.
        - A function can return two values as a tuple: `return order, []`.

        **What you see:** the order is A, B, C, D, E. Adding "E before B" makes it impossible: B waits on E, E on D, D on B.
        Nothing in that loop can ever be ready, so B, D and E are left over.

        **What it's called:** an order where every edge points forward is a **topological order**, and this method is **Kahn's algorithm**.
        A loop of edges is a **cycle**. A topological order exists exactly when the directed graph has no cycle.
    """)

    # ------------------------------------------------------------------ 5 union-find
    nb.md("""
        ## 5. Are these connected, as links keep arriving?

        Six towns, numbered 1 to 6. Roads open one at a time: 1–2, then 2–3, then 4–5, then 5–6.
        **After each new road, how many separate groups of connected towns are there?**

        You could run a search after every road. That repeats work. Instead, give each group a **leader**,
        and let every town point towards its group's leader.
    """)
    nb.code('''
def make_groups(towns):
    return {t: t for t in towns}             # each town starts as the leader of its own group

def leader(parent, t):
    root = t
    while parent[root] != root:              # follow the pointers up to the leader
        root = parent[root]
    while parent[t] != root:                 # point every town on the way straight at the leader
        parent[t], t = root, parent[t]
    return root

def join(parent, a, b):
    ra, rb = leader(parent, a), leader(parent, b)
    if ra == rb:
        return False                         # already in one group
    parent[rb] = ra                          # one leader now points at the other
    return True

parent = make_groups(range(1, 7))
groups = 6
for a, b in [(1, 2), (2, 3), (4, 5), (5, 6)]:
    if join(parent, a, b):
        groups -= 1
    print(f"road {a}–{b}: {groups} groups")
print("is 1 connected to 3?", leader(parent, 1) == leader(parent, 3))
print("is 3 connected to 4?", leader(parent, 3) == leader(parent, 4))
''')
    nb.md("""
        🐍 **Python notes**
        - `range(1, 7)` gives 1, 2, 3, 4, 5, 6 (it stops before 7).
        - `parent[t], t = root, parent[t]` sets two names at once. The right side is worked out first, so the old `parent[t]` is used.
        - `f"road {a}–{b}: {groups} groups"` is an **f-string**: values in `{}` are filled in.

        **What you see:** 5 groups, then 4, then 3, then **2**: {1, 2, 3} and {4, 5, 6}.

        **What it's called:** this is **union-find** (also called a disjoint-set structure). The second loop in `leader` is **path compression**:
        it makes later lookups shorter. With it, each join or lookup takes close to one step on average.
    """)

    # ------------------------------------------------------------------ 6 networkx
    nb.md("""
        ## 6. The library version: `networkx`

        `networkx` is Python's main graph library. It has all of these algorithms, written and tested by many people.
        Check that it agrees with your versions on the examples above.
    """)
    nb.code('''
import networkx as nx

G = nx.Graph(graph)                                      # undirected graph from the adjacency list
print("BFS steps agree:", nx.single_source_shortest_path_length(G, "A") == steps)

R = nx.Graph()
R.add_weighted_edges_from(roads)
print("Dijkstra costs agree:", nx.single_source_dijkstra_path_length(R, "A") == cost)
print("networkx cheapest route to F:", nx.dijkstra_path(R, "A", "F"))

D = nx.DiGraph(plan)
print("one networkx order:", list(nx.topological_sort(D)))
D.add_edge("E", "B")
print("with E before B, a loop:", nx.find_cycle(D))

T = nx.Graph([(1, 2), (2, 3), (4, 5), (5, 6)])
print("connected groups:", [sorted(c) for c in nx.connected_components(T)])
''')
    nb.md("""
        🐍 **Python notes**
        - `nx.Graph(...)` makes an undirected graph; `nx.DiGraph(...)` makes one with one-way edges. Both accept a dict of lists or a list of pairs.
        - `==` on two dicts is true when they hold the same keys with the same values, in any order.

        **What you see:** every answer agrees. A topological order is not always unique; any order where every edge points forward is valid.

        Now a stronger check: 300 random graphs, comparing each of your functions with `networkx`.
    """)
    nb.code('''
import random
random.seed(8)

def random_roads(n, m):
    pairs = random.sample([(a, b) for a in range(n) for b in range(a + 1, n)], m)
    return [(a, b, random.randint(0, 9)) for a, b in pairs]

agree = {"BFS": 0, "Dijkstra": 0, "order": 0, "groups": 0}
for trial in range(300):
    n = random.randint(2, 9)
    rs = random_roads(n, random.randint(1, n * (n - 1) // 2))
    adj = {v: [] for v in range(n)}
    wadj = {v: [] for v in range(n)}
    for a, b, c in rs:
        adj[a].append(b); adj[b].append(a)
        wadj[a].append((b, c)); wadj[b].append((a, c))
    Gx = nx.Graph()
    Gx.add_nodes_from(range(n))
    Gx.add_weighted_edges_from(rs)
    agree["BFS"] += steps_from(adj, 0)[0] == nx.single_source_shortest_path_length(Gx, 0)
    agree["Dijkstra"] += cheapest_from(wadj, 0)[0] == nx.single_source_dijkstra_path_length(Gx, 0)
    # one-way edges, pointing in a random direction: does an order exist, and is ours valid?
    arrows = [(a, b) if random.random() < 0.5 else (b, a) for a, b, _ in rs]
    mine, _ = course_order(list(range(n)), arrows)
    Dx = nx.DiGraph(arrows)
    Dx.add_nodes_from(range(n))
    valid = mine is not None and all(mine.index(a) < mine.index(b) for a, b in arrows)
    agree["order"] += (valid if nx.is_directed_acyclic_graph(Dx) else mine is None)
    parent = make_groups(range(n))
    count = n - sum(join(parent, a, b) for a, b, _ in rs)
    agree["groups"] += count == nx.number_connected_components(Gx)
print(agree)
''')
    nb.md("""
        🐍 `agree["BFS"] += (x == y)` adds `True` or `False` to a number. In Python `True` counts as 1 and `False` as 0.

        **What you see:** all four counts are 300. Your versions and the library agree on every random graph.
        In real code, use `networkx` (or a faster library for very large graphs). Writing your own is how you learn what it does and what it costs.
    """)

    # ------------------------------------------------------------------ practice
    nb.md("""
        ## Practice

        Fill in each function, then run its cell to see the checks. The method isn't named: deciding how to solve it is part of the problem.
    """)
    nb.problem(1, """
        A map is a list of strings. `#` is land and `.` is water.
        Land squares that touch up, down, left or right belong to the same island (touching only at a corner does not count).
        **How many islands are there?**
    """, starter='''
def count_islands(grid):
    # your code here
    return None

CASES_1 = [((["##..#", "#...#", "..#..", "....."],), 3), ((["...", "..."],), 0), ((["#"],), 1),
           ((["#.#", ".#.", "#.#"],), 5), ((["###", "#.#", "###"],), 1), (([],), 0)]
check(count_islands, CASES_1)
''', solution='''
from collections import deque

def count_islands(grid):
    rows = len(grid)
    cols = len(grid[0]) if rows else 0
    seen = set()
    islands = 0
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] != "#" or (r, c) in seen:
                continue
            islands += 1                     # a new island: mark all of its land as seen
            seen.add((r, c))
            queue = deque([(r, c)])
            while queue:
                y, x = queue.popleft()
                for ny, nx_ in [(y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)]:
                    if 0 <= ny < rows and 0 <= nx_ < cols and grid[ny][nx_] == "#" and (ny, nx_) not in seen:
                        seen.add((ny, nx_))
                        queue.append((ny, nx_))
    return islands

check(count_islands, CASES_1)
# Each island is one connected group of land squares. A search from each unseen land square marks one whole island.
''')
    nb.problem(2, """
        You have a list of tasks and a list of pairs `(a, b)`, meaning task `a` must be finished before task `b` starts.
        **Return an order that does every task once and respects every pair.** When several tasks could go next, pick the one
        that comes first in alphabetical order, so the answer is unique. If no order works, return `None`.
    """, starter='''
def task_order(tasks, before):
    # your code here
    return None

CASES_2 = [((["A", "B", "C", "D"], [("A", "B"), ("A", "C"), ("B", "D"), ("C", "D")]), ["A", "B", "C", "D"]),
           ((["A", "B", "C"], [("C", "A")]), ["B", "C", "A"]),
           ((["A", "B", "C"], [("A", "B"), ("B", "C"), ("C", "A")]), None),
           ((["X"], []), ["X"]),
           ((["D", "C", "B", "A"], []), ["A", "B", "C", "D"]),
           ((["A", "B", "C", "D", "E"], [("A", "B"), ("A", "C"), ("B", "D"), ("C", "D"), ("D", "E"), ("E", "B")]), None)]
check(task_order, CASES_2)
''', solution='''
import heapq

def task_order(tasks, before):
    left = {t: 0 for t in tasks}
    after = {t: [] for t in tasks}
    for a, b in before:
        left[b] += 1
        after[a].append(b)
    ready = [t for t in tasks if left[t] == 0]
    heapq.heapify(ready)                     # the alphabetically first ready task comes out first
    order = []
    while ready:
        t = heapq.heappop(ready)
        order.append(t)
        for nxt in after[t]:
            left[nxt] -= 1
            if left[nxt] == 0:
                heapq.heappush(ready, nxt)
    return order if len(order) == len(tasks) else None    # tasks left over sit on a loop

check(task_order, CASES_2)
# Kahn's method with a heap instead of a queue, so the smallest ready task is always taken next.
''')
    nb.problem(3, """
        Two-way roads between towns, each with a toll of zero or more: `(town, town, toll)`.
        **What is the lowest total toll to drive from `start` to `end`?** Return `-1` if there is no way to get there.
    """, starter='''
def lowest_toll(roads, start, end):
    # your code here
    return None

TOLLS = [("A", "B", 5), ("A", "C", 1), ("B", "D", 5), ("C", "E", 1), ("D", "E", 1), ("D", "F", 2), ("E", "F", 6)]
CASES_3 = [((TOLLS, "A", "F"), 5), ((TOLLS, "A", "A"), 0), ((TOLLS, "F", "B"), 7),
           (([("A", "B", 0), ("B", "C", 0)], "A", "C"), 0), (([("A", "B", 3), ("C", "D", 1)], "A", "D"), -1),
           (([("A", "B", 10), ("A", "C", 3), ("C", "B", 3)], "A", "B"), 6)]
check(lowest_toll, CASES_3)
''', solution='''
import heapq

def lowest_toll(roads, start, end):
    links = {}
    for a, b, toll in roads:
        links.setdefault(a, []).append((b, toll))
        links.setdefault(b, []).append((a, toll))
    best = {start: 0}
    heap = [(0, start)]
    while heap:
        c, town = heapq.heappop(heap)
        if town == end:
            return c                         # the first time end comes out, its cost is final
        if c > best[town]:
            continue                         # an older, dearer entry
        for nxt, toll in links.get(town, []):
            if c + toll < best.get(nxt, float("inf")):
                best[nxt] = c + toll
                heapq.heappush(heap, (c + toll, nxt))
    return -1

check(lowest_toll, CASES_3)
# Dijkstra: always expand the town with the lowest known toll. It works because no toll is negative.
''')
    nb.problem(4, """
        `n` computers are numbered `0` to `n - 1`, and none are linked. Cables arrive one at a time, each joining two computers.
        **After each cable, how many separate groups of linked computers are there?** Return the list of counts.
        A cable from a computer to itself changes nothing.
    """, starter='''
def groups_after_each(n, cables):
    # your code here
    return None

CASES_4 = [((5, [(0, 1), (1, 2), (0, 2), (3, 4)]), [4, 3, 3, 2]), ((6, [(0, 1), (1, 2), (3, 4), (4, 5)]), [5, 4, 3, 2]),
           ((3, []), []), ((4, [(0, 1), (2, 3), (1, 2), (3, 0)]), [3, 2, 1, 1]), ((2, [(0, 0), (0, 1)]), [2, 1])]
check(groups_after_each, CASES_4)
''', solution='''
def groups_after_each(n, cables):
    parent = list(range(n))                  # each computer leads its own group

    def leader(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]    # shorten the path as you go
            x = parent[x]
        return x

    groups = n
    out = []
    for a, b in cables:
        ra, rb = leader(a), leader(b)
        if ra != rb:
            parent[rb] = ra
            groups -= 1
        out.append(groups)
    return out

check(groups_after_each, CASES_4)
# Union-find: each new cable either joins two groups (one fewer group) or lands inside one group (no change).
''')
    nb.problem(5, """
        `n` people are numbered `0` to `n - 1`. Each pair in `edges` is two people who must sit at **different** tables.
        There are only two tables. **Can everyone be seated?** Return `True` or `False`.
    """, starter='''
def two_tables(n, edges):
    # your code here
    return None

CASES_5 = [((4, [(0, 1), (1, 2), (2, 3), (3, 0)]), True), ((3, [(0, 1), (1, 2), (2, 0)]), False),
           ((5, [(0, 1), (0, 2), (0, 3), (3, 4)]), True), ((6, [(0, 1), (2, 3), (3, 4), (4, 2)]), False),
           ((3, []), True), ((6, [(0, 1), (1, 2), (2, 3), (3, 4), (4, 5), (5, 0)]), True)]
check(two_tables, CASES_5)
''', solution='''
from collections import deque

def two_tables(n, edges):
    apart = [[] for _ in range(n)]
    for a, b in edges:
        apart[a].append(b)
        apart[b].append(a)
    table = [None] * n
    for first in range(n):
        if table[first] is not None:
            continue
        table[first] = 0                     # a new group: its first person can take either table
        queue = deque([first])
        while queue:
            p = queue.popleft()
            for q in apart[p]:
                if table[q] is None:
                    table[q] = 1 - table[p]  # the other table
                    queue.append(q)
                elif table[q] == table[p]:
                    return False             # two people who must be apart ended up together
    return True

check(two_tables, CASES_5)
# A search gives each person the opposite table to the person who found them. It fails exactly when
# there is a loop with an odd number of people (like the triangle). Such a graph is called bipartite when it works.
''')

    nb.cue([
        ('"fewest steps"', "breadth-first search"),
        ('"cheapest route, no negative costs"', "Dijkstra"),
        ('"order tasks with prerequisites"', "topological sort"),
        ('"are these connected, as connections keep arriving?"', "union-find"),
    ])
    nb.practise_more("""
        For this topic: the CSES Problem Set's *Graph Algorithms* section; the USACO Guide's *Graph Traversal* module (Silver);
        LeetCode's *Graph* tag.
    """)
    nb.save(PATH)
    print("wrote", PATH)


if __name__ == "__main__":
    build()

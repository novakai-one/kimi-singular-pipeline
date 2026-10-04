// DSA track content. Text follows BUILD_BRIEF Section 2a: problem first, literal first, name it last.
// Practice problems are unlabelled (they don't name the method). Practice sites are linked, not copied.

export interface DsaContent {
  slug: string;
  inShort: [string, string];
  problem: string;
  predict: { prompt: string; choices?: string[]; reveal: string };
  viz: { title: string; goal: string; detail?: string };
  explain: { see: string; means: string; called: string; formula?: string };
  inAI: string;
  practice: { q: string; a: string }[];
  cues: [string, string][];
  /** Where to practise more (sites linked, problems not copied). */
  more: string;
}

export const DSA: DsaContent[] = [
  // ------------------------------------------------------------------ 1
  {
    slug: 'big-o',
    inShort: [
      'How does the work grow as the input grows?',
      'Time a program at a few input sizes and watch the pattern. Doubling the input doubles some programs\' time and quadruples others\'. Big-O is the name for that pattern.',
    ],
    problem: `
      Your code handles 1,000 items in a blink. **Will it still work on 1,000,000?**
      Some programs slow down 1,000 times. Others slow down 1,000,000 times.
      You can tell which, before running them, from how the work grows.
    `,
    predict: {
      prompt: 'One program compares every pair of items. **If the input doubles, how much longer does it take?**',
      choices: ['2 times', '4 times', '8 times'],
      reveal: '**About 4 times.** There are twice as many items, and each is compared with twice as many others: 2 × 2 = 4. Run the timings and check the ratio column.',
    },
    viz: {
      title: 'Time three programs',
      goal: 'Predict the every-pair program\'s time for the next size, within 30%, before you run it.',
      detail: 'Type your guess in milliseconds, then step forward to the next size.',
    },
    explain: {
      see: 'Three real programs run in your browser at sizes 1,000, 2,000, 4,000 and so on. The chart shows the time each took. The ratio column shows how many times longer each size took than the one before.',
      means: 'One pass over the items: about 2 times longer per doubling. Sorting: a little more than 2. Every pair: about 4. **The ratio reveals the pattern, and the pattern tells you what a million items will cost.**',
      called: 'This pattern is the *time complexity*, written in *big-O notation*: $O(n)$ for one pass, $O(n \\log n)$ for good sorting, $O(n^2)$ for every pair. Big-O ignores constant factors (a faster computer is still $O(n^2)$) and keeps only how the cost grows.',
      formula: 'If the time is about $c \\cdot n^k$, doubling $n$ multiplies it by $2^k$: $k = 1$ gives 2 times, $k = 2$ gives 4 times.',
    },
    inAI: 'Attention in a transformer compares every token with every other token: $O(n^2)$ in the length of the text. That is why long inputs are expensive for language models, and why researchers look for cheaper kinds of attention.',
    practice: [
      { q: 'A loop runs inside another loop, each over the same $n$ items, doing one step per inner turn. **How many steps for $n$ = 1,000? For $n$ = 2,000?**', a: '$1{,}000^2 = 1{,}000{,}000$ and $2{,}000^2 = 4{,}000{,}000$. Doubling $n$ gives 4 times the steps.' },
      { q: 'A program takes 2 seconds on 10,000 items and 8 seconds on 20,000. **About how long will 80,000 items take?**', a: 'Each doubling multiplies the time by 4: 20,000 → 8 s, 40,000 → 32 s, 80,000 → **128 s**.' },
      { q: 'Each step halves the number of items left, until one remains. **How many steps for 1,000,000 items?**', a: 'About **20**, because $2^{20} = 1{,}048{,}576$. Halving gives $O(\\log n)$.' },
      { q: 'For large $n$, which grows faster: $100n$ or $n^2$? **From which $n$ is $n^2$ the bigger one?**', a: '$n^2 > 100n$ when $n > 100$. For big inputs the power of $n$ matters more than any constant in front.' },
    ],
    cues: [
      ['a loop inside a loop over the same input', '$O(n^2)$'],
      ['the problem halves every step', '$O(\\log n)$'],
      ['inputs up to $10^5$ or $10^6$ in a contest problem', 'you need about $O(n \\log n)$ or better'],
    ],
    more: 'CSES Problem Set, *Introductory Problems* section. USACO Guide, the *Time Complexity* module (Bronze).',
  },

  // ------------------------------------------------------------------ 2
  {
    slug: 'arrays-hashing',
    inShort: [
      'How do you find something fast in a big collection?',
      'In a list you may have to check every item. A hash set works out where an item must be, from the item itself, and looks only there: about one step, however big the collection.',
    ],
    problem: `
      You have 1,000,000 usernames. Someone signs up as "night_owl_77". **Is the name taken?**
      Checking one name at a time could take a million comparisons.
      A sign-up form has to answer instantly.
    `,
    predict: {
      prompt: 'A plain list holds 1,000,000 names in no order. **On average, how many must you check to find one that is there?**',
      choices: ['About 1', 'About 1,000', 'About 500,000'],
      reveal: '**About 500,000**: on average you find it halfway. If the name is not there, all 1,000,000. The bucket method below needs about one check either way.',
    },
    viz: {
      title: 'Put words in buckets',
      goal: 'Make a pile-up: enter words so that one bucket ends up holding 4 or more of them.',
      detail: 'Then search for one of those words and count the checks.',
    },
    explain: {
      see: 'Top: the words in a list; a search walks it from left to right. Bottom: 8 buckets. Each word\'s bucket comes from its letters: add up their character codes, then keep the remainder after dividing by 8. A search jumps straight to one bucket.',
      means: 'A list search grows with the list. A bucket search only grows with one bucket. **With a good bucket rule, buckets stay small, so a lookup takes about one step at any size.**',
      called: 'The rule from item to bucket number is a *hash function*. This structure is a *hash set*; with a value stored next to each item it is a *hash map* (Python\'s `dict`). Two items in one bucket are a *collision*. A list stored side by side in memory is an *array*: reading position $i$ is one step, but finding a value needs a search.',
      formula: 'bucket $= (\\text{sum of character codes}) \\bmod 8$. Lookup: $O(1)$ on average. List search: $O(n)$.',
    },
    inAI: 'Tokenisers use a hash map from pieces of text to token numbers. Counting which letter follows which (the bigram model in Field 3) is a hash map of counts.',
    practice: [
      { q: 'Given a list of numbers and a target, **find two numbers that add up to the target, in one pass over the list.**', a: 'Walk the list. For each number $x$, check whether $\\text{target} - x$ is in a set of numbers seen so far; if not, add $x$ to the set. One pass, about one step per number: $O(n)$.' },
      { q: '**Find the first word that appears twice** in a sentence.', a: 'Keep a set of words seen. Walk the words; the first word already in the set is the answer.' },
      { q: '**Do two words use exactly the same letters, the same number of times?** ("listen", "silent")', a: 'Count each word\'s letters in a hash map (letter → count) and compare the two maps. Or sort both words and compare.' },
      { q: 'With 8 buckets and the sum-of-codes rule, **which bucket does "ab" go in?** ("a" is 97, "b" is 98.)', a: '$97 + 98 = 195$, and $195 \\bmod 8 = 3$: bucket **3**.' },
    ],
    cues: [
      ['"have I seen this before?"', 'a hash set'],
      ['"how many times does each thing appear?"', 'a hash map of counts'],
      ['"find a pair that adds up to a target"', 'a set of the values seen so far'],
    ],
    more: 'CSES Problem Set, *Sorting and Searching* section. LeetCode: filter problems by the *Hash Table* tag.',
  },

  // ------------------------------------------------------------------ 3
  {
    slug: 'stacks-queues',
    inShort: [
      'In what order should waiting items come out?',
      'A stack gives back the newest item first. A queue gives back the oldest first. That one choice decides whether brackets can be matched and how a search explores.',
    ],
    problem: `
      Your code editor underlines the wrong bracket in \`{ [ ( ] }\`. **How does it know which one is wrong?**
      Each closing bracket must match the most recent opening bracket that is still open.
    `,
    predict: {
      prompt: 'Reading `( [ ] )` from left to right: **which opening bracket does the `]` match?**',
      choices: ['The first one, (', 'The [ right before it'],
      reveal: '**The `[`**: the most recent bracket still open. "Newest first" is the rule of a stack. Run the checker to see the pile grow and shrink.',
    },
    viz: {
      title: 'Check the brackets',
      goal: 'Write a correctly matched bracket string in which the pile gets 4 brackets deep.',
      detail: 'Use ( ) [ ] { }. The pile on the right shows the brackets still open.',
    },
    explain: {
      see: 'Each opening bracket goes on top of the pile. Each closing bracket must match the bracket on top, which is then removed. At the end the pile must be empty. The second mode puts the same letters through a pile and through a line, so you can compare the orders they come out in.',
      means: 'The top of the pile is always the most recent bracket still open. **That is exactly the one the next closing bracket must match.**',
      called: 'A pile where you only add and remove at the top is a *stack* (add = *push*, remove = *pop*): *last in, first out* (LIFO). A line where you add at the back and remove at the front is a *queue*: *first in, first out* (FIFO). Each add or remove takes $O(1)$.',
      formula: 'Checking $n$ brackets: one push or pop per bracket, so $O(n)$.',
    },
    inAI: 'Breadth-first search keeps its waiting nodes in a queue; depth-first search uses a stack (Field 8). Parsers that read code and maths expressions use stacks.',
    practice: [
      { q: '**Is `( [ ) ]` correctly matched?**', a: 'No. After `( [`, the `)` arrives but the most recent open bracket is `[`.' },
      { q: 'Work out `3 4 + 2 *`, where each operator uses the two most recent numbers and puts its result back.', a: 'Pile: 3, then 3 4; `+` gives 7; then 7 2; `*` gives **14**.' },
      { q: 'An editor needs "undo". **Which structure holds the history of changes?**', a: 'A stack: undo removes the most recent change first. (Redo uses a second stack.)' },
      { q: 'Print jobs arrive at a shared printer. **In what order should they print, and which structure keeps that order?**', a: 'In the order they arrived: a queue.' },
    ],
    cues: [
      ['"match the most recent unmatched item"', 'a stack'],
      ['"handle items in the order they arrived"', 'a queue'],
      ['"undo"', 'a stack'],
    ],
    more: 'CSES Problem Set, *Introductory Problems* section. LeetCode: filter problems by the *Stack* and *Queue* tags.',
  },

  // ------------------------------------------------------------------ 4
  {
    slug: 'recursion-backtracking',
    inShort: [
      'How do you search every possibility without writing a loop for each one?',
      'Make one choice, then solve the smaller problem that is left with the same function. If a choice leads to a dead end, undo it and try the next one.',
    ],
    problem: `
      Place 6 queens on a 6 × 6 chessboard so that no two attack each other: no shared row, column or diagonal.
      There are about 1.9 million ways to place 6 queens on 36 squares.
      **How do you find a valid one without trying them all?**
    `,
    predict: {
      prompt: '**Does every board size have a solution?**',
      choices: ['Yes', 'No'],
      reveal: '**No.** A 2 × 2 and a 3 × 3 board have none. Every size from 4 upwards has at least one. Try sizes 3 and 4 in the visualiser.',
    },
    viz: {
      title: 'Place the queens',
      goal: 'Find the board size from 4 to 8 whose first solution needs the most backtracks.',
      detail: 'A backtrack is lifting a queen to try a different square. The counter shows how many happened.',
    },
    explain: {
      see: 'The board fills row by row. A queen goes in the first safe square of its row. When a row has no safe square, the queen in the row above is lifted and moved further right: a backtrack. The list on the right shows the unfinished calls, one per row.',
      means: 'Each call places one queen and hands the smaller problem (the rows below) to another call of the same function. **Undoing a bad choice early skips every board that would have been built on it.**',
      called: 'A function that calls itself is *recursive*. It must stop at a *base case* (here: every row filled). Trying, undoing and trying the next option is *backtracking*. The chain of unfinished calls is the *call stack*.',
      formula: 'One queen per row gives up to $n^n$ boards to check. Backtracking builds far fewer, because it abandons each partial board the moment two queens clash.',
    },
    inAI: 'Constraint solvers (Field 9) and game-tree search (Field 8) are backtracking at heart. Sudoku solvers, timetablers and puzzle solvers all try, check and undo.',
    practice: [
      { q: 'Write $n!$ in terms of a smaller factorial. **What is the base case?**', a: '$n! = n \\times (n - 1)!$, with base case $0! = 1$.' },
      { q: '**List every subset of {a, b, c}. How many are there?**', a: 'Each element is either in or out: $2^3 = 8$ subsets: {}, {a}, {b}, {c}, {a,b}, {a,c}, {b,c}, {a,b,c}.' },
      { q: 'The first call is at depth 0. Every call at depth 0 to 9 makes two more calls; calls at depth 10 make none. **How many calls happen in total?**', a: 'Depth $d$ has $2^d$ calls: $1 + 2 + 4 + \\dots + 2^{10} = 2^{11} - 1 = 2{,}047$.' },
      { q: '**In how many ways can you make 5 from coins 1 and 2?** (Order doesn\'t matter.)', a: 'Three: 1+1+1+1+1, 1+1+1+2, 1+2+2.' },
    ],
    cues: [
      ['"try every combination or arrangement"', 'recursion with backtracking'],
      ['"a choice may turn out bad later"', 'undo it and try the next (backtrack)'],
      ['"the same problem, but smaller"', 'recursion with a base case'],
    ],
    more: 'CSES Problem Set, *Introductory Problems* section (it includes a queens problem). LeetCode: filter problems by the *Backtracking* tag.',
  },

  // ------------------------------------------------------------------ 5
  {
    slug: 'sorting-searching',
    inShort: [
      'How do you put things in order fast, and then find one fast?',
      'Merge sort and quicksort split the list, sort the parts and combine them: about $n \\log n$ steps. Once sorted, binary search finds any item by halving the range each time: about $\\log n$ checks.',
    ],
    problem: `
      An unsorted list of 1,000,000 names is slow to search: finding one name can mean reading them all.
      Sorted, you can open it in the middle, see which half your name is in, and repeat.
      **But sorting a million names must also be fast. How?**
    `,
    predict: {
      prompt: 'Halving search on 1,000,000 sorted names. **About how many checks to find one name?**',
      choices: ['About 20', 'About 1,000', 'About 500,000'],
      reveal: '**About 20.** Each check halves what is left, and $2^{20} \\approx 1{,}000{,}000$.',
    },
    viz: {
      title: 'Sort, then search',
      goal: 'Make quicksort work as hard as possible: find 9 numbers that need 36 comparisons, its worst case.',
      detail: 'This quicksort uses the first number as its pivot. For comparison, merge sort never needs more than 21 for 9 numbers.',
    },
    explain: {
      see: 'Each bar is a number. Blue: the items being compared. Red: an item moving. Yellow: the pivot (quicksort) or a part already sorted (merge sort). Green: in its final place. The counter shows comparisons so far. Binary search shows the range of possible positions halving with each check.',
      means: 'Merge sort splits the list in half, sorts each half, then merges them by repeatedly taking the smaller front item. Quicksort picks a pivot, moves smaller items to its left and bigger ones to its right, then sorts each side. **Both split the work into smaller pieces, which is why they beat comparing every item with every other.**',
      called: 'Splitting into smaller copies of the problem is *divide and conquer*. Merge sort takes $O(n \\log n)$ every time. Quicksort takes $O(n \\log n)$ on average but $O(n^2)$ when the pivot is always the smallest or largest item. Halving a sorted range is *binary search*: $O(\\log n)$.',
      formula: 'Merge sort splits $\\log_2 n$ times, and each level needs about $n$ comparisons to merge: about $n \\log_2 n$ in total.',
    },
    inAI: 'k-nearest neighbours sorts distances to find the closest examples (Field 2). Decision trees sort each measurement to find the best split. In contest problems, binary search answers "what is the smallest value that works?".',
    practice: [
      { q: 'A sorted list has 1,000 items. **What is the most checks a halving search can need?**', a: '**10**, because $2^{10} = 1{,}024 \\ge 1{,}000$.' },
      { q: 'Merge the sorted lists [2, 5, 9] and [1, 6, 7]. **How many comparisons?**', a: '1 vs 2, 2 vs 6, 5 vs 6, 9 vs 6, 9 vs 7, then 9 is copied: **5** comparisons.' },
      { q: 'A sorted list may contain repeats. **How do you find the first position holding a value of 7 or more?**', a: 'Halving search, but when the middle value is ≥ 7, keep searching the left half (including the middle) instead of stopping. The range ends at the first such position.' },
      { q: 'Quicksort uses the first item as its pivot. **Why is it slow on a list that is already sorted?**', a: 'The pivot is always the smallest item, so every split puts everything on one side. Each round removes only one item: $n + (n-1) + \\dots$ comparisons, which is $O(n^2)$.' },
    ],
    cues: [
      ['"find an item in sorted data"', 'binary search'],
      ['"the smallest $x$ such that …" (a yes/no answer that flips once)', 'binary search on the answer'],
      ['sorting up to $10^6$ items', 'an $O(n \\log n)$ sort'],
    ],
    more: 'CSES Problem Set, *Sorting and Searching* section. USACO Guide, the *Binary Search* module (Silver). LeetCode: *Binary Search* and *Sorting* tags.',
  },

  // ------------------------------------------------------------------ 6
  {
    slug: 'trees-bst',
    inShort: [
      'How can data stay sorted while you keep adding to it?',
      'A binary search tree keeps smaller values to the left and bigger ones to the right at every node. Finding or adding a value follows one path down: about $\\log n$ steps, if the tree stays bushy.',
    ],
    problem: `
      Scores arrive one at a time. At any moment you need to know whether a score is present, or find the next higher one.
      A sorted list makes each insertion slow: everything after the new item shifts along.
      **Can data stay in order and still take new items fast?**
    `,
    predict: {
      prompt: 'Insert 1, 2, 3, 4, 5, 6, 7 in that order. **What does the tree look like?**',
      choices: ['Bushy and balanced', 'A long chain'],
      reveal: '**A long chain.** Each value is bigger than all before it, so it always goes right. Searching that chain is as slow as searching a list.',
    },
    viz: {
      title: 'Grow a tree',
      goal: 'Insert 7 different numbers so the tree is as short as possible: 3 levels.',
      detail: 'The order you insert them in decides the shape.',
    },
    explain: {
      see: 'Each new value starts at the top. At each node it goes left if smaller, right if bigger, until it reaches an empty spot. The highlighted path shows the comparisons made. Search mode follows the same path to look a value up.',
      means: 'Everything to the left of a node is smaller, everything to the right is bigger. **So a search follows one path from the top, never the whole tree.** A bushy tree has short paths; a chain has long ones.',
      called: 'Each circle is a *node*; the top one is the *root*; nodes with no children are *leaves*. This is a *binary search tree* (BST). The number of levels is its *height*. Search and insert take $O(h)$: $O(\\log n)$ for a bushy tree, $O(n)$ for a chain. *Self-balancing* trees (AVL, red-black) rearrange nodes to stay bushy.',
      formula: 'A full tree with $h$ levels holds $2^h - 1$ nodes, so $n$ nodes need at least $\\log_2(n + 1)$ levels.',
    },
    inAI: 'Decision trees (Field 2) are trees of yes/no questions. k-d trees find nearest neighbours fast. Game trees (Field 8) and the parse trees of language processing are trees too.',
    practice: [
      { q: 'Insert 8, 3, 10, 1, 6, 14, 4 into an empty tree. **How many levels does it have, and which nodes does a search for 4 visit?**', a: '4 levels. The search visits 8 → 3 → 6 → 4.' },
      { q: 'Visit every node in the order: left part, the node itself, right part. **What do you get?**', a: 'The values in increasing order. (This is an *in-order traversal*.)' },
      { q: '**What is the smallest possible number of levels for a tree with 15 nodes? The largest?**', a: 'Smallest 4 (a full tree: $2^4 - 1 = 15$). Largest 15 (a chain).' },
      { q: '**Where is the smallest value in the tree?**', a: 'Keep going left from the root until there is no left child.' },
    ],
    cues: [
      ['"keep data sorted while inserting and searching"', 'a balanced binary search tree'],
      ['"a hierarchy of yes/no questions"', 'a tree'],
      ['parents and children', 'recursion over the left and right parts'],
    ],
    more: 'CSES Problem Set, *Tree Algorithms* section. LeetCode: *Binary Search Tree* and *Tree* tags.',
  },

  // ------------------------------------------------------------------ 7
  {
    slug: 'heaps',
    inShort: [
      'How do you always get the smallest item quickly, while new items keep arriving?',
      'A heap keeps the smallest item at the top. Adding or removing an item only repairs one path from the top to the bottom: about $\\log n$ swaps.',
    ],
    problem: `
      Patients arrive at an emergency department all day. The most urgent one must be seen next.
      Re-sorting the whole list after every arrival wastes work: you only ever need the most urgent.
      **How do you get it quickly, every time?**
    `,
    predict: {
      prompt: 'A heap holds 1,000,000 items. **At most, how many swaps can adding one item need?**',
      choices: ['About 20', 'About 1,000', 'About 500,000'],
      reveal: '**About 20.** The new item can only move up one path, and the heap is about $\\log_2 1{,}000{,}000 \\approx 20$ levels tall.',
    },
    viz: {
      title: 'Keep the smallest on top',
      goal: 'Make a single insertion need 3 swaps.',
      detail: 'Enter numbers to insert, and x to remove the smallest. The counter shows swaps for each operation.',
    },
    explain: {
      see: 'The same heap twice: as a tree and as an array. A new item goes into the first free spot at the bottom, then swaps with its parent while it is smaller. Removing the top moves the last item up to the top, then swaps it down with its smaller child.',
      means: 'Every parent is no bigger than its children, so the smallest item is always at the top. **Repairing after an add or a remove only touches one path, so it takes about $\\log n$ swaps.**',
      called: 'This is a *binary heap*; with the smallest on top, a *min-heap*. Stored in an array, the children of position $i$ sit at $2i + 1$ and $2i + 2$. A heap is the usual way to build a *priority queue*: add and remove-smallest in $O(\\log n)$, look at the smallest in $O(1)$.',
      formula: 'Children of position $i$: $2i + 1$ and $2i + 2$. Parent of position $i$: $\\lfloor (i - 1) / 2 \\rfloor$.',
    },
    inAI: 'Dijkstra and A* (Field 8) keep their waiting squares in a priority queue, so the most promising comes out next. Beam search in language models and "top k" selection use heaps too.',
    practice: [
      { q: 'Insert 5, 3, 8, 1 into an empty min-heap. **Write the array after each insert.**', a: '[5] → [3, 5] → [3, 5, 8] → [1, 3, 8, 5].' },
      { q: 'In an array heap, **what are the children of position 4? Its parent?**', a: 'Children at 9 and 10. Parent at $\\lfloor 3/2 \\rfloor = 1$.' },
      { q: 'Find the 3 largest numbers in a stream of a million numbers, **using memory for only a few numbers.**', a: 'Keep a min-heap of size 3. For each new number bigger than the heap\'s top, remove the top and add the new number. At the end the heap holds the 3 largest.' },
      { q: '**Sort a list using only a heap. How long does it take?**', a: 'Add everything, then remove the smallest $n$ times: heapsort, $O(n \\log n)$.' },
    ],
    cues: [
      ['"always handle the smallest / most urgent next"', 'a priority queue (heap)'],
      ['"the top $k$ of a stream"', 'a heap of size $k$'],
      ['"cheapest path, with costs"', 'Dijkstra with a heap'],
    ],
    more: 'CSES Problem Set, *Sorting and Searching* section. LeetCode: *Heap (Priority Queue)* tag.',
  },

  // ------------------------------------------------------------------ 8
  {
    slug: 'graphs',
    inShort: [
      'How do you explore anything made of things and connections?',
      'Model it as a graph: dots and links. One small set of algorithms answers the common questions: how far, how cheap, in which order, and is it connected.',
    ],
    problem: `
      Course prerequisites, road maps, friendships, links between web pages: all are things joined by connections.
      **How far apart are two things? What is the cheapest route? In what order can tasks be done? Is everything connected?**
    `,
    predict: {
      prompt: 'Starting from node A, **which search visits nodes in rings of distance: breadth-first or depth-first?**',
      choices: ['Breadth-first', 'Depth-first'],
      reveal: '**Breadth-first.** It keeps found nodes in a queue, so they come out in the order they were found: all 1 step away, then all 2 steps away. Depth-first follows one branch as far as it goes before backing up.',
    },
    viz: {
      title: 'Explore a graph',
      goal: 'Make the course plan impossible: add one prerequisite that creates a loop, so topological sort finds no valid order.',
      detail: 'Edges are written like A>B ("A before B"). Add one and run topological sort.',
    },
    explain: {
      see: 'Circles are nodes; lines are edges, some with costs. Highlighted nodes are waiting to be explored. The panel shows what each algorithm keeps: a queue, a stack, the cheapest cost found so far, or groups of connected nodes.',
      means: 'Every algorithm here keeps a collection of nodes to visit next. **The kind of collection decides the order of exploration:** a queue gives rings, a stack gives depth, a priority queue gives cheapest first.',
      called: 'A *graph* is *nodes* (vertices) joined by *edges*. *BFS* (queue) finds paths with the fewest edges. *DFS* (stack, or recursion) goes deep first. *Dijkstra* (priority queue) finds cheapest paths when no cost is negative. *Topological sort* orders nodes so every edge points forward; it only works when there are no cycles. *Union-find* keeps track of connected groups as edges arrive.',
      formula: 'BFS and DFS: $O(V + E)$ for $V$ nodes and $E$ edges. Dijkstra with a heap: $O((V + E) \\log V)$.',
    },
    inAI: 'A neural network is a graph of operations, and backpropagation runs through it in reverse topological order (Field 1). Planning and search (Field 8) explore graphs of states.',
    practice: [
      { q: 'Courses: A before B, A before C, B before D, C before D. **Give a valid order.**', a: 'A, B, C, D (A, C, B, D also works).' },
      { q: 'A grid maze with walls. **What is the fewest number of moves from start to exit, and how do you compute it?**', a: 'Search outwards in rings from the start, one move at a time, never revisiting a square: the ring where the exit appears is the answer.' },
      { q: 'Six towns and four roads: 1–2, 2–3, 4–5, 5–6. **How many separate groups of connected towns are there?**', a: '**Two**: {1, 2, 3} and {4, 5, 6}.' },
      { q: 'Roads have tolls (all zero or more). **How do you find the cheapest route between two towns?**', a: 'Always expand the town with the cheapest known cost so far, using a priority queue (Dijkstra).' },
    ],
    cues: [
      ['"fewest steps"', 'breadth-first search'],
      ['"cheapest route, no negative costs"', 'Dijkstra'],
      ['"order tasks with prerequisites"', 'topological sort'],
      ['"are these connected, as connections keep arriving?"', 'union-find'],
    ],
    more: 'CSES Problem Set, *Graph Algorithms* section. USACO Guide, the *Graph Traversal* module (Silver). LeetCode: *Graph* tag.',
  },

  // ------------------------------------------------------------------ 9
  {
    slug: 'greedy',
    inShort: [
      'When does taking the best-looking step every time give the best answer overall?',
      'Sometimes. A greedy algorithm never reconsiders a choice. It is fast and simple; for some problems it is provably best, and for others it is badly wrong. You have to check which kind you have.',
    ],
    problem: `
      A machine gives change with as few coins as possible: take the biggest coin that fits, then repeat.
      With coins 1, 2, 5, 10, 20 and 50 that always works.
      **Does it work for any set of coins?**
    `,
    predict: {
      prompt: 'Coins 1, 3 and 4. Make 6 by always taking the biggest coin that fits. **Is that the fewest coins?**',
      choices: ['Yes', 'No'],
      reveal: '**No.** Biggest-first takes 4 + 1 + 1: three coins. But 3 + 3 uses two.',
    },
    viz: {
      title: 'Make change',
      goal: 'Find coins and an amount where biggest-first uses more coins than needed. The example from the prediction (1, 3, 4 and 6) doesn\'t count.',
      detail: 'Enter the coin values, a semicolon, then the amount, like "1 5 10 25; 30".',
    },
    explain: {
      see: 'Left: biggest-first, taking the largest coin that still fits, again and again. Right: the fewest coins possible, found by checking every smaller amount first (the method of the next topic). When the two stacks differ, biggest-first was wrong.',
      means: 'Biggest-first commits to each coin and never looks back. **It is right only when the best-looking first step is always part of some best answer.** With coins 1, 3, 4 and amount 6, taking 4 first rules out the best answer, 3 + 3.',
      called: 'A method that always takes the locally best step is a *greedy algorithm*. Proving one correct usually uses an *exchange argument*: show that any best answer can be changed, one step at a time, into the greedy answer without getting worse.',
    },
    inAI: 'Byte-pair encoding (Field 3) merges the most frequent pair greedily. Greedy decoding picks the single most likely next token each time, which can miss better sentences; beam search keeps several options instead. Decision trees pick the best split greedily at each node.',
    practice: [
      { q: 'Meetings run 1–4, 2–3, 3–5 and 6–7. **What is the largest number that fit in one room, with no overlaps?**', a: '**3**: take the meeting that ends earliest (2–3), then the next that starts no earlier than it ends (3–5), then 6–7. Earliest-finish-first is a greedy rule that is provably best here.' },
      { q: 'Coins 1, 5, 10, 25. **Make 30 biggest-first. Is it the fewest coins?**', a: '25 + 5: two coins, and that is the fewest.' },
      { q: 'You can carry 10 kg, and every item can be cut into smaller pieces. **What should you take first? Why does that stop working when items can\'t be cut?**', a: 'Take the most valuable per kilogram first, cutting the last item to fit. Uncut, a heavy high-value item can block two lighter items worth more together, so a choice that looks best can waste space.' },
      { q: '**Find coins and an amount, other than 1, 3, 4 and 6, where biggest-first fails.**', a: 'For example coins 1, 5, 6, 9 and amount 11: biggest-first gives 9 + 1 + 1 (three coins); 5 + 6 uses two.' },
    ],
    cues: [
      ['"choose the earliest-finishing / cheapest / biggest next"', 'try greedy, then hunt for a small counterexample'],
      ['a greedy rule that fails on a small example', 'dynamic programming'],
      ['"merge the best pair, repeat"', 'greedy with a heap'],
    ],
    more: 'CSES Problem Set, *Sorting and Searching* section (several greedy problems). LeetCode: *Greedy* tag.',
  },

  // ------------------------------------------------------------------ 10
  {
    slug: 'dynamic-programming',
    inShort: [
      'How do you solve a problem made of many overlapping smaller problems?',
      'Solve each small problem once and store its answer in a table. Build bigger answers from smaller ones. Each cell then takes only a few steps.',
    ],
    problem: `
      A spell-checker suggests "receive" when you type "recieve".
      **How many single-letter edits (insert, delete or change a letter) turn one word into another?**
      Trying every sequence of edits explodes. But the answer for whole words can be built from the answers for their beginnings.
    `,
    predict: {
      prompt: '**How many edits turn "kitten" into "sitting"?**',
      choices: ['2', '3', '4'],
      reveal: '**3**: change k to s, change e to i, insert g at the end. Fill the table to check.',
    },
    viz: {
      title: 'Fill the table',
      goal: 'Find two different words, each at least 5 letters long, with an edit distance of exactly 1.',
      detail: 'Enter two words separated by a comma, like "kitten, sitting".',
    },
    explain: {
      see: 'Row $i$, column $j$ holds the number of edits needed to turn the first $i$ letters of one word into the first $j$ letters of the other. Each cell looks at three cells already filled: left (insert a letter), above (delete one), and diagonal (change one, or free if the letters match).',
      means: 'Each cell reuses answers already in the table, so nothing is worked out twice. **The bottom-right cell is the answer for the whole words.** Following the arrows back from it gives the list of edits.',
      called: 'Storing the answers to smaller problems and building up from them is *dynamic programming* (DP). The rule linking a cell to smaller cells is the *recurrence*. This distance is the *edit distance* (also called Levenshtein distance). Filling the table takes $O(nm)$ for words of lengths $n$ and $m$.',
      formula: '$D[i][j] = \\min\\big(D[i-1][j] + 1,\\; D[i][j-1] + 1,\\; D[i-1][j-1] + c\\big)$, where $c = 0$ if the $i$-th and $j$-th letters match and $1$ if not.',
    },
    inAI: 'Value iteration in reinforcement learning is dynamic programming over states (Field 6). Spell-checkers and DNA comparison use edit distance. Speech recognition lines sounds up with words using DP.',
    practice: [
      { q: 'You climb stairs 1 or 2 steps at a time. **In how many ways can you climb 5 stairs?**', a: 'Ways($n$) = Ways($n$−1) + Ways($n$−2), starting 1, 1: then 2, 3, 5, **8**.' },
      { q: 'Coins 1, 3, 4. **Fill a table of the fewest coins for every amount from 0 to 6.**', a: '0:0, 1:1, 2:2, 3:1, 4:1, 5:2, 6:**2** (3 + 3). Each entry is 1 + the best of (amount − coin) over the coins.' },
      { q: '**What is the edit distance between "cat" and "cut"? Between "cat" and "cast"?**', a: '1 (change a to u) and 1 (insert s).' },
      { q: 'In 3, 1, 4, 1, 5, 9, 2, 6, **what is the longest run of numbers you can pick, keeping their order, so each is bigger than the one before?**', a: 'Length **4**, for example 1, 4, 5, 9 or 3, 4, 5, 6.' },
    ],
    cues: [
      ['"number of ways" or "best total", built from smaller versions of the same question', 'dynamic programming'],
      ['a greedy rule that fails on a small example', 'dynamic programming'],
      ['"compare two sequences"', 'a 2-D DP table'],
    ],
    more: 'CSES Problem Set, *Dynamic Programming* section. USACO Guide, the *Dynamic Programming* modules (Gold). LeetCode: *Dynamic Programming* tag.',
  },
];

export const dsaContent = (slug: string) => DSA.find((d) => d.slug === slug)!;

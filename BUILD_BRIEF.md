# Build Brief: AI Field Explorer

## Before anything else

1. **Save this entire brief, word for word, as `BUILD_BRIEF.md` in the repo root.** This is a long overnight run. Re-read it at the start of every phase so the rules don't drift.
2. Read the whole brief.
3. Write `PLAN.md`, then build. Do not stop to ask questions.

---

## What you're building

A hands-on tour of the main fields of AI, so a student can find out which ones excite them before choosing a research direction.

It's one repo containing:

1. **A showpiece demo** (built first): a polished, interactive web page that shows something impressive this study path makes possible. See Section 5.
2. **A website** (static, deployable to GitHub Pages)
   - A **Path Map** page: every field, how they connect, and the maths/CS each one needs
   - One **Field Card** page per field (10 fields): what it is, what you'd learn, open research questions
   - A **Spark Log** page where the student records what excited them
   - A **DSA track** with animated algorithms
3. **Jupyter notebooks** (run in Google Colab, no install)
   - One **taste project** per field: about one weekend of work, ending in something visible
   - DSA practice notebooks
4. **A second showpiece** (stretch): a tiny language model you can see inside

The student uses a **desktop/laptop** first. Phone use is a bonus.

---

## 1. Who this is for

- Finishing foundation units now. Starting the **Monash Master of Artificial Intelligence (C6007)** next year, aiming for the **research stream** (masters thesis).
- Has programming experience. New to Python. Doing a visual linear algebra course in parallel.
- Wants to become strong in **AI** and **data structures and algorithms (DSA)**, and to explore many fields before narrowing down. "Not just find one word that's boring."
- Learns by **seeing** how something works. Rote memory does not stick. Needs to know **what question** a tool answers before it makes sense.
- Previous attempts at interactive demos failed when they were just sliders with nothing at stake. The student's reaction: "so what".

**The course they're heading into (for context, don't invent unit content):**
- Foundation: Python programming, databases, computer architecture and networks, mathematical foundations for data science and AI
- Core: Fundamentals of AI (FIT5047), Machine learning (FIT5201), Deep learning (FIT5215), Planning and automated reasoning (FIT5222), Multi-agent systems and collective behaviour (FIT5226), IT research and innovation methods (FIT5125)
- Specialisation options: Natural language processing (FIT5217), Intelligent image and video analysis (FIT5221), Modelling discrete optimisation problems (FIT5216)
- Research stream: thesis over three units (FIT5126–FIT5128). Entry needs roughly 80%+ across level 5 units, 75%+ in FIT5125, 70%+ overall.

---

## 2. Teaching rules (non-negotiable)

Every page and notebook must follow all of these. ("Lesson" below means any page or notebook.)

1. **Problem first.** Never open with a definition. Open with a concrete problem the learner wants to solve.
2. **Invite a prediction.** Ask the learner to guess before the reveal. This is an invitation, never a requirement (see Section 2b).
3. **Challenges, not free sliders.** Every interactive has a goal and a win condition (e.g. "land exactly on the target", "find a point you can't reach", "make the area zero"). Challenges are optional to complete.
4. **No term before it's earned.** Don't use a word or symbol until a lesson has introduced it.
5. **Name it last.** Order is always: problem → see it → name it → formula → by hand → in code.
6. **Say why it matters.** Each lesson links to one real use in AI or competitive programming.
7. **Recognition cues.** Each lesson ends with "When you see ___ in a problem, think ___."
8. **Unlabelled practice.** Problems must not say which method to use.
9. **Low word density.** Short sentences. Plain words. White space. Bold key ideas.
10. **Assume weak foundations.** Re-teach prerequisites briefly when they come up. Never say "recall that".

---

## 2a. How to explain and word things

This section matters as much as the code. Coding agents tend to write explanations that are vague, padded, oddly grouped, or built on strained analogies. Don't.

### Voice

- Write like a good tutor sitting next to the student. Direct. Plain. Use "you".
- **Literal first.** Describe what actually happens to the points, arrows and grid on screen. The geometry *is* the intuition.
- One idea per sentence. One idea per block.
- Short sentences. Aim for 20 words or fewer.
- Bold the single key idea in each block. Only one.
- When a term first appears, define it in one plain sentence tied to the picture.

### Analogies

- **Default: no analogies.** Show the picture instead.
- **Banned:** fruit, shopping, recipes, cooking, factories, machines that "eat" or "spit out", sports, personification ("the matrix wants", "its favourite direction", "the vector is happy").
- **Do not describe a matrix as a machine.** Say what it does literally: it moves points, it transforms the grid.
- An analogy is allowed only if it maps exactly onto the maths, needs no extending, is used once, then dropped. When in doubt, leave it out.
- Never stretch a metaphor past the point it fits.

### Words to avoid

- "simply", "just", "obviously", "clearly", "trivially", "it's easy to see", "recall that", "note that", "it turns out"
- Filler openings: "In this lesson we'll explore the fascinating world of..."
- Hype and exclamation marks.

### Terms

- Once a term is introduced, use it consistently. Don't rotate synonyms (transformation / map / function / operator). Pick one and stick to it.
- Use the course's terms (they match the exam): augmented matrix, pivot, row echelon form, reduced row echelon form, span, scalar triple product, coplanar, diagonalisation.

### Grouping information

- Order inside every explanation: **what you see → what it means → what it's called → the formula.**
- Group by the question being answered, not by textbook category.
- Headings are plain questions or statements: "What happens to the area?" not "Determinant properties". "Is one of these arrows wasted?" not "Linear independence".
- Max 3–5 bullets per group. If there are more, split the group.
- Show a concrete example **before** the general rule.
- Put each formula right next to the picture it describes. Colour-code symbols to match the picture (e.g. v green, w red, result yellow) and keep colours consistent across all lessons.
- Use small whole numbers in first examples. Messy numbers come later.
- Every lesson opens with an **"In short"** box: 2–3 lines saying what question the topic answers and the one-sentence answer.

### Good vs bad examples

| Bad | Good |
|---|---|
| "A matrix is a machine that eats vectors and spits out new ones." | "Multiply a point by a matrix and you get a new point. Do it to every point and the whole grid moves." |
| "Think of span like a shopping trip: with apples and pears, which fruit salads can you make?" | "Span is every point you can reach by stretching v and w and adding them together." |
| "The determinant is simply ad − bc." | "The determinant tells you how much a matrix scales area. For a 2×2 matrix it works out to ad − bc. Here's where that comes from: [parallelogram picture]." |
| "Eigenvectors are the matrix's favourite directions." | "Most arrows change direction when the matrix moves them. Eigenvectors don't. They only get longer, shorter, or flipped." |
| "Recall that Gaussian elimination simply reduces the matrix." | "Each row operation keeps the same solutions but makes the equations easier to read. Keep going until each equation has one unknown left." |

### Self-check for every paragraph

- Would a student who missed the lecture understand this on first read?
- Does every sentence tell them something new?
- Is there a picture doing the work, or is the text trying to do it alone?

---

## 2b. Never gate the learner

The student must be able to move freely. Nothing is ever locked.

- No "complete this to continue". Every section of every lesson is visible and scrollable from the start.
- Every prediction and challenge has a visible **"Show me"** / **"Skip"** option.
- Worked solutions are one tap away, never hidden behind attempting the problem.
- Any lesson can be opened in any order. Navigation lists all lessons at all times.
- No forced quizzes, no progress requirements, no timers, no scores that block anything.
- Notebooks: solutions in collapsed cells, never deleted or withheld.

---

## 3. The big picture to keep coming back to

Most of AI is three ideas, used in different combinations:

| Idea | Plain question | Where it shows up |
|---|---|---|
| **Search** | What's the best path through a huge set of choices? | Planning, games, optimisation, reasoning |
| **Learning from data** | How do I adjust numbers so the predictions get better? | Machine learning, deep learning, vision, language |
| **Acting over time** | How do I choose actions when the results come later? | Reinforcement learning, agents, multi-agent systems |

The Path Map page and every Field Card should say which of these three ideas the field mainly uses.

**Maths that runs through everything:**
- **Linear algebra:** data and model weights are vectors and matrices; a layer of a network moves points in space
- **Calculus:** derivatives say which way to adjust a number to reduce error (gradients, chain rule)
- **Probability and statistics:** models output probabilities; we measure how sure and how wrong they are
- **Discrete maths:** graphs, logic, counting, proofs about algorithms

**CS that runs through everything:**
- Data structures (arrays, hash maps, heaps, graphs, trees)
- Algorithm design (search, dynamic programming, greedy)
- Complexity (how cost grows as the problem gets bigger)

---

## 4. The ten fields

Each field gets a Field Card page and a taste-project notebook. Use the content below as the source for both. Keep each card's "What you'd learn" grouped exactly as shown: **AI**, **Maths**, **CS / DSA**, **Programming**.

### Field 1: How models learn (deep learning foundations)
- **Question it asks:** How does a network get better from examples?
- **Main idea:** learning from data
- **Taste project:** Build a tiny automatic-differentiation engine (~100 lines, micrograd style), then a small network on top of it that learns to classify handwritten digits. Then rebuild the same thing in PyTorch in 20 lines and compare.
- **What you'd learn:**
  - **AI:** neurons, layers, activation functions, loss functions, gradient descent, backpropagation, overfitting, train/test split
  - **Maths:** derivatives, the chain rule, partial derivatives and gradients, matrix multiplication, softmax and log-probabilities
  - **CS / DSA:** computation graphs (a directed acyclic graph), topological sort (to run backprop in the right order)
  - **Programming:** Python classes and operator overloading, numpy vectorisation, PyTorch tensors and training loops
- **Monash units:** FIT5215 Deep learning, FIT5201 Machine learning
- **Open research questions:** Why do huge networks generalise instead of memorising? Can models learn from far less data?
- **Go deeper:** Andrej Karpathy, *Neural Networks: Zero to Hero* (free video series); 3Blue1Brown neural networks series

### Field 2: Classic machine learning
- **Question it asks:** Which kind of model fits this data best, and how do I know it's not fooling me?
- **Main idea:** learning from data
- **Taste project:** Take one real dataset (e.g. house prices or a bundled scikit-learn dataset). Try linear regression, k-nearest neighbours, a decision tree and k-means clustering. Visualise each model's decision boundary. Use cross-validation to pick a winner.
- **What you'd learn:**
  - **AI:** regression vs classification, decision trees, k-nearest neighbours, clustering, overfitting vs underfitting, cross-validation, evaluation metrics
  - **Maths:** least squares, probability, mean/variance, distance measures, basic optimisation
  - **CS / DSA:** trees (decision trees are literally trees), sorting and nearest-neighbour search
  - **Programming:** pandas, scikit-learn, matplotlib
- **Monash units:** FIT5201 Machine learning
- **Open research questions:** How do we make models fair across groups? How do we know when a model is confidently wrong?
- **Go deeper:** scikit-learn's own user guide examples

### Field 3: Language models (NLP)
- **Question it asks:** How does a model predict the next word?
- **Main idea:** learning from data
- **Taste project:** Start with a bigram model (counts which letter follows which). Then build a tiny character-level transformer, trained on a public-domain book, that writes new text in that style. Visualise what each attention head looks at.
- **What you'd learn:**
  - **AI:** tokenisation, embeddings, attention, transformers, next-token prediction, sampling and temperature
  - **Maths:** dot products, softmax, cross-entropy, probability distributions, matrix multiplication
  - **CS / DSA:** hash maps for counting, byte-pair encoding (a greedy merging algorithm)
  - **Programming:** PyTorch modules, batching, training on CPU vs GPU
- **Monash units:** FIT5217 Natural language processing
- **Open research questions:** How do models reason over many steps? Why do they sometimes make things up?
- **Go deeper:** Andrej Karpathy, *Let's build GPT: from scratch, in code*

### Field 4: Looking inside models (interpretability)
- **Question it asks:** What is a trained model actually doing inside?
- **Main idea:** learning from data (studied from the inside)
- **Taste project:** Train a small network, then find a direction in its internal activations that represents one concept (e.g. "is this digit round?"). Push along that direction and watch the model's output change.
- **What you'd learn:**
  - **AI:** activations, features, probes, steering, superposition (more concepts than neurons)
  - **Maths:** vectors as directions, projections, dot products, PCA, eigenvectors. **This field is applied linear algebra.**
  - **CS / DSA:** experiment design, careful measurement
  - **Programming:** PyTorch hooks (reading values from inside a model), plotting high-dimensional data
- **Monash units:** builds on FIT5215 Deep learning; a strong candidate for research
- **Open research questions:** Can we read a model's "thoughts" reliably? Can we check a model is safe by looking inside it?
- **Go deeper:** ARENA interpretability curriculum; transformer-circuits.pub; TransformerLens library

### Field 5: Computer vision
- **Question it asks:** How does a model find and recognise things in an image?
- **Main idea:** learning from data
- **Taste project:** Write an edge detector by hand (a 3×3 filter sliding over an image). Then train a small convolutional network to classify images. Visualise what its learned filters look like.
- **What you'd learn:**
  - **AI:** convolution, filters, feature maps, pooling, CNNs, data augmentation, transfer learning
  - **Maths:** images as matrices, convolution, linear algebra
  - **CS / DSA:** 2D arrays, sliding-window algorithms
  - **Programming:** image loading, PyTorch `Conv2d`, visualising tensors as images
- **Monash units:** FIT5221 Intelligent image and video analysis
- **Open research questions:** How do models understand 3D scenes from flat images? How do they handle situations they've never seen?
- **Go deeper:** Stanford CS231n course notes (free)

### Field 6: Learning by trial and error (reinforcement learning)
- **Question it asks:** How does an agent learn to act well when rewards come later?
- **Main idea:** acting over time
- **Taste project:** A Q-learning agent learns to solve a gridworld maze from scratch, with its value estimates drawn as a live heatmap. Then use Gymnasium to train an agent to balance a pole (CartPole).
- **What you'd learn:**
  - **AI:** states, actions, rewards, policies, value functions, Q-learning, exploration vs exploitation
  - **Maths:** probability, expected value, Markov decision processes, the Bellman equation
  - **CS / DSA:** dynamic programming (value iteration is DP), tables and hash maps
  - **Programming:** simulation loops, Gymnasium environments, plotting learning curves
- **Monash units:** related to FIT5047 Fundamentals of AI and FIT5226 Multi-agent systems
- **Open research questions:** How can agents learn from far fewer attempts? How do we stop agents exploiting loopholes in their reward?
- **Go deeper:** Sutton and Barto, *Reinforcement Learning: An Introduction* (free online); OpenAI Spinning Up

### Field 7: Swarms and many agents (multi-agent systems)
- **Question it asks:** How does group behaviour emerge from simple individual rules?
- **Main idea:** acting over time
- **Taste project:** Simulate a flock of birds (boids) with three simple rules. Then ants that find food by leaving and following trails. Then a predator–prey world. Change one rule and watch the whole group change.
- **What you'd learn:**
  - **AI:** agents, emergence, cooperation vs competition, basic game theory, ant colony optimisation
  - **Maths:** vectors as forces and velocities, payoff matrices, Nash equilibrium, probability
  - **CS / DSA:** spatial grids and quadtrees (finding nearby agents fast), simulation performance
  - **Programming:** animation loops, numpy vectorisation for thousands of agents
- **Monash units:** FIT5226 Multi-agent systems and collective behaviour
- **Open research questions:** How do AI agents learn to cooperate or negotiate? How do we predict what a whole system will do?
- **Go deeper:** Craig Reynolds' original boids page

### Field 8: Planning and search
- **Question it asks:** What's the smartest path through a huge number of choices?
- **Main idea:** search
- **Taste project:** An animated pathfinder on a grid: watch breadth-first search, Dijkstra and A* explore differently. Then a sliding-puzzle solver. Then a Connect Four player using minimax with alpha-beta pruning that you can play against.
- **What you'd learn:**
  - **AI:** state spaces, uninformed vs informed search, heuristics, adversarial search, constraint satisfaction, logic
  - **Maths:** graph theory, why a heuristic must never overestimate (admissibility), counting states
  - **CS / DSA:** graphs, queues, priority queues (heaps), hash sets, recursion, big-O. **This is where DSA lives in AI.**
  - **Programming:** clean data structures, recursion, performance profiling
- **Monash units:** FIT5222 Planning and automated reasoning, FIT5047 Fundamentals of AI
- **Open research questions:** How do we plan for thousands of robots at once? How do we combine learned models with classic search?
- **Go deeper:** Red Blob Games pathfinding articles (very visual)

### Field 9: Optimisation
- **Question it asks:** What's the best schedule, route or allocation under a set of rules?
- **Main idea:** search
- **Taste project:** Write an exam timetable as constraints and let a solver find a valid schedule. Then solve a travelling-salesperson route with simulated annealing, animated so you can watch the route untangle.
- **What you'd learn:**
  - **AI:** constraint modelling, local search, simulated annealing, branch and bound
  - **Maths:** discrete maths, combinatorics, linear programming basics
  - **CS / DSA:** backtracking, NP-hardness (why some problems explode in size), heuristics
  - **Programming:** MiniZinc or a Python constraint solver, animation
- **Monash units:** FIT5216 Modelling discrete optimisation problems. Monash is a home of the MiniZinc modelling language.
- **Open research questions:** Can learned models help solvers find answers faster? How do we optimise when the rules keep changing?
- **Go deeper:** the official MiniZinc tutorial

### Field 10: Generative models
- **Question it asks:** How can a model create new things that look real?
- **Main idea:** learning from data
- **Taste project:** Train a tiny diffusion model on 2D points shaped like a spiral. Animate noise turning step by step into the spiral. (Runs on CPU in minutes.)
- **What you'd learn:**
  - **AI:** autoencoders, diffusion, noise schedules, denoising, sampling
  - **Maths:** probability distributions, Gaussian noise, expected value, a light touch of KL divergence
  - **CS / DSA:** iterative algorithms, numerical stability
  - **Programming:** PyTorch, animation with matplotlib
- **Monash units:** builds on FIT5215 Deep learning and FIT5221
- **Open research questions:** How do we make generation faster and controllable? How do we detect generated content?
- **Go deeper:** Hugging Face diffusion models course

---

## 5. Showpiece demos

These exist to answer "what could this path let me build?" They should feel impressive within 10 seconds of opening.

### Showpiece A (build first): "Draw a digit, look inside"

A single polished web page:

1. **Draw** a digit with the mouse (or finger).
2. **Prediction** updates live, with a probability bar for each digit 0–9.
3. **Inside view:** each layer's activations shown as glowing grids, updating as you draw.
4. **Map of all digits:** thousands of training digits shown as dots in 2D (projected with PCA or t-SNE, computed ahead of time), clustered by digit. **Your drawing appears as a live dot** that moves between clusters as you draw. Hovering a dot shows that training image.
5. **"Why this answer?"** button: highlights which pixels pushed the prediction most.

Short captions explain each panel in the Section 2a style. Link each panel to the field it comes from (deep learning, vision, interpretability, linear algebra).

Implementation notes:
- Train in Python (PyTorch). Use MNIST if it downloads; otherwise fall back to scikit-learn's bundled `load_digits` (8×8, no download).
- Export weights to JSON and run the forward pass in TypeScript in the browser (small model, no server). ONNX Runtime Web is also fine.
- Keep the model small enough to run smoothly at 60fps on a laptop.
- Provide a matching notebook so the student can retrain it themselves.

### Showpiece B (stretch): "A tiny language model you can see inside"

1. Type the start of a sentence.
2. The model writes the rest one character at a time.
3. A bar chart shows the **top 5 next-character guesses** and their probabilities at each step.
4. A temperature control with a clear goal: "Make it repeat itself. Now make it ramble." Explain what changed.
5. An **attention view**: click a character to see which earlier characters the model looked at.

Implementation notes:
- Character-level transformer, roughly 1 million parameters, trained on CPU on a public-domain book (e.g. from Project Gutenberg). If the download fails, log it and use any public-domain text available.
- Export weights and run inference in the browser.
- Matching notebook for retraining.

---

## 6. DSA track

Goal: strong DSA, learned visually, always linked to where it appears in AI.

For each topic: an **animated visualiser** on the site (step forward/back, play/pause, choose your own input), a short explanation in the Section 2a style, a "where this shows up in AI" line, and 3–5 practice problems.

Topics, in order:
1. Big-O: how cost grows as input grows (show it with timing plots, not just notation)
2. Arrays, hash maps and sets
3. Stacks and queues
4. Recursion and backtracking
5. Sorting (merge sort, quicksort) and binary search
6. Trees and binary search trees
7. Heaps and priority queues
8. Graphs: BFS, DFS, Dijkstra, topological sort, union-find
9. Greedy algorithms
10. Dynamic programming (show the table filling in)

Practice sources to link (don't copy their problems): CSES Problem Set, USACO Guide, LeetCode.
Write your own practice problems in the notebooks, with solutions in collapsed cells.

---

## 7. Spark Log

A page for the student to record, per field:
- What surprised me
- What I'd want to know next
- Excitement, 1–10

Store entries in the browser's localStorage (wrapped in try/catch) and offer **Export as Markdown**. At the bottom, show fields ranked by excitement score.

---

## 8. Deliverables (build in this order)

**Depth over breadth.** Finish each phase properly before starting the next.

### Phase 0 – Plan and scaffold
- `PLAN.md`, `README.md`, `PROGRESS.md`, `DECISIONS.md`
- Site skeleton with navigation to every page (all pages reachable from the start, Section 2b)

### Phase 1 – Showpiece A
Fully polished before moving on. This is the first thing the student sees in the morning.

### Phase 2 – Path Map and Field Cards
- **Path Map:** one visual page showing all 10 fields, grouped by the three big ideas (Section 3), with lines showing which fields build on which, and the maths/CS each needs.
- **Field Cards:** one page per field from Section 4. Include a small visual for each (a static diagram or a tiny interactive with a goal).

### Phase 3 – Taste-project notebooks
In this order (most foundational first):
1. Field 1 How models learn
2. Field 8 Planning and search
3. Field 6 Reinforcement learning
4. Field 3 Language models
5. Field 7 Swarms and many agents
6. Field 5 Computer vision
7. Field 4 Interpretability
8. Field 10 Generative models
9. Field 9 Optimisation
10. Field 2 Classic machine learning

Each notebook:
- Opens with the field's question and what you'll have built by the end (show the final output first)
- Teaches Python as it goes (the student knows programming, not Python)
- Builds from scratch first, then shows the library version
- Ends with: 2–3 "try changing this" experiments, the open research questions, and the Spark Log prompts
- Runs top to bottom on Google Colab free tier (CPU) in under ~20 minutes

### Phase 4 – DSA track
Visualisers on the site plus practice notebooks (Section 6).

### Phase 5 – Spark Log page (Section 7)

### Phase 6 – Showpiece B (stretch)

---

## 9. Tech choices

- Static site. Vite + TypeScript is fine. Plain SVG/canvas for visualisations.
- **Desktop-first.** Design for 1280–1440px. Use the width: picture and explanation side by side.
- **Mobile as a bonus.** Below ~800px, stack the picture above the text. Drag targets at least 44px.
- Dark and light mode. Render maths with KaTeX.
- Must build to static files deployable on GitHub Pages. No server.
- Notebooks: `.ipynb`, Colab-compatible, "Open in Colab" badges in the README.
- Libraries: numpy, matplotlib, pandas, scikit-learn, PyTorch, Gymnasium. Anything else must install with one `pip install` line at the top of the notebook.

---

## 10. Verification (do this, don't skip it)

- **Run every notebook** top to bottom before committing it. Record runtime.
- **Screenshot every page** with Playwright at 1440px (main) and 390px (usable check). Look at the screenshots. Fix layout problems, desktop first.
- **Showpiece check:** draw at least five digits programmatically in the browser test and confirm sensible predictions and smooth updates.
- **Facts check:** every claim about a field, resource or Monash unit must come from this brief or be verified. If unsure, leave it out.
- **Wording check.** Script that scans all page and notebook text for the banned words and analogies in Section 2a (e.g. simply, just, obviously, clearly, recall, machine that eats, apples, favourite). Fix every hit, or log why it's acceptable.
- **Fresh reviewer:** after each phase, spawn a subagent that has **not** seen the build. Give it Sections 2, 2a and 2b and ask it to critique two random pages or notebooks as a curious but confused student would. It should flag weird wording, strained analogies, badly grouped ideas, missing "so what", and anything gated. Fix what it finds.

---

## 11. Working overnight

- Do not stop to ask questions. Make a reasonable call, log it in `DECISIONS.md`, keep going.
- Commit after each page, notebook or visualiser.
- Keep `PROGRESS.md` current: done / in progress / next / problems found.
- If something is broken for more than ~20 minutes, log it and move on.
- Final step: write `START_HERE.md` for the student. Short. Open the showpiece first, then the Path Map, then pick any field. Explain how to open notebooks in Colab and what's unfinished.

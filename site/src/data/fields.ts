// Field Card content. Facts about fields, units and resources come from BUILD_BRIEF.md Section 4.
// Every "Go deeper" URL was checked (see DECISIONS.md).
// Text follows BUILD_BRIEF Section 2a: problem first, literal first, name it last.

export interface FieldContent {
  slug: string;
  inShort: [string, string];
  problem: string;
  predict: { prompt: string; choices?: string[]; reveal: string };
  viz: { title: string; goal: string; detail?: string };
  explain: { see: string; means: string; called: string; formula?: string };
  why: string;
  learn: { ai: string[]; maths: string[]; cs: string[]; prog: string[]; note?: string };
  taste: string;
  practice: { q: string; a: string }[];
  questions: string[];
  monash: string;
  deeper: { label: string; url: string; note?: string }[];
  cues: [string, string][];
  /** For the Path Map: which fields this one builds on. */
  buildsOn: string[];
  /** For the Path Map: maths areas named in this field's maths list. */
  maths: ('la' | 'calc' | 'prob' | 'disc')[];
}

export const FIELDS: FieldContent[] = [
  // ------------------------------------------------------------------ 1
  {
    slug: 'how-models-learn',
    inShort: [
      'How does a network get better from examples?',
      'It measures how wrong its predictions are, works out which way each weight should move to be less wrong, and moves every weight a small step that way. Then it repeats, thousands of times.',
    ],
    problem: `
      A model has one adjustable number, $\\cr{w}$. It predicts $y = \\cr{w}\\,x$.
      You have six data points. **Which value of $w$ puts the line closest to the points?**
      You could try every value, but a real network has millions of weights.
      You need a way to know which direction to move each one.
    `,
    predict: {
      prompt: 'You will take steps downhill on an error curve. **If you double the step size, do you reach the bottom in half as many steps?**',
      choices: ['Yes, twice as fast', 'Faster, but not twice', 'It depends: it can get worse'],
      reveal: `**It depends.** A bigger step helps while you are far from the bottom. Near the bottom, a step that is too big jumps past it. The error bounces, and with a big enough step it grows. Try the largest step size in the picture.`,
    },
    viz: {
      title: 'Find the best weight',
      goal: 'Get the error below 0.05 in 5 steps or fewer, starting from $w = -1$.',
      detail: 'Pick a step size, then press **Take a step**. Reset any time.',
    },
    explain: {
      see: `The left plot shows the data ({g|green}) and the model's line ({r|red}). The right plot shows the error for every possible $w$: a valley. The {y|yellow} ball is your current $w$. Each step moves the ball. Small steps crawl. Big steps jump past the bottom.`,
      means: `The slope of the valley under the ball tells you two things: which way is downhill, and how steep it is. **Move against the slope, further where it is steep.** At the bottom the slope is zero, so the steps stop.`,
      called: `The valley is the *loss* (the error, as a function of the weights). Its slope is the *derivative* $dE/dw$. With many weights, the list of all their slopes is the *gradient*. Stepping against it is *gradient descent*, and the step size is the *learning rate*. Working out the gradient through every layer of a network uses the chain rule from calculus; that is *backpropagation*.`,
      formula: `Error (mean squared difference): $E(\\cr{w}) = \\frac{1}{n}\\sum_i (\\cr{w}\\,x_i - \\cg{y_i})^2$

Its slope: $\\dfrac{dE}{dw} = \\frac{1}{n}\\sum_i 2x_i(\\cr{w}\\,x_i - \\cg{y_i})$

One step, with learning rate $\\eta$: $\\cr{w} \\leftarrow \\cr{w} - \\eta\\,\\dfrac{dE}{dw}$`,
    },
    why: `Every network on this site was trained with this loop, from the digit reader to the tiny language model. Large language models are trained the same way, with billions of weights instead of one, and smarter step sizes.`,
    learn: {
      ai: ['neurons', 'layers', 'activation functions', 'loss functions', 'gradient descent', 'backpropagation', 'overfitting', 'train/test split'],
      maths: ['derivatives', 'the chain rule', 'partial derivatives and gradients', 'matrix multiplication', 'softmax and log-probabilities'],
      cs: ['computation graphs (a directed acyclic graph)', 'topological sort (to run backprop in the right order)'],
      prog: ['Python classes and operator overloading', 'numpy vectorisation', 'PyTorch tensors and training loops'],
    },
    taste: 'Build a tiny automatic-differentiation engine (about 100 lines, in the style of micrograd), then a small network on top of it that learns to classify handwritten digits. Then rebuild the same thing in PyTorch in about 20 lines and compare.',
    practice: [
      {
        q: 'A model\'s error is $E(w) = (w - 3)^2$. You start at $w = 0$ with step size $0.25$. **Where are you after one step? After two?**',
        a: 'The slope is $dE/dw = 2(w - 3)$. At $w = 0$ it is $-6$, so $w = 0 - 0.25 \\times (-6) = 1.5$. At $w = 1.5$ the slope is $-3$, so $w = 1.5 + 0.75 = 2.25$. Each step halves the distance to 3.',
      },
      {
        q: 'Same error, but step size $1.0$. **What happens?**',
        a: 'From $w = 0$: slope $-6$, so $w = 6$. At $w = 6$: slope $+6$, so $w = 0$. It jumps between 0 and 6 forever. The step is exactly twice as big as it should be.',
      },
    ],
    questions: ['Why do huge networks generalise instead of memorising?', 'Can models learn from far less data?'],
    monash: 'FIT5215 Deep learning, FIT5201 Machine learning',
    deeper: [
      { label: 'Andrej Karpathy, Neural Networks: Zero to Hero', url: 'https://karpathy.ai/zero-to-hero.html', note: 'free video series; the first video builds micrograd' },
      { label: '3Blue1Brown, neural networks series', url: 'https://www.3blue1brown.com/lessons/neural-networks', note: 'visual explanations, starting from handwritten digits' },
    ],
    cues: [
      ['"find the numbers that make the error smallest"', 'gradient descent'],
      ['the error bounces or grows during training', 'the learning rate is too big'],
      ['a chain of functions, and you need the derivative of the whole chain', 'the chain rule (backpropagation)'],
    ],
    buildsOn: ['classic-ml'],
    maths: ['la', 'calc', 'prob'],
  },

  // ------------------------------------------------------------------ 2
  {
    slug: 'classic-ml',
    inShort: [
      'Which kind of model fits this data best, and how do I know it\'s not fooling me?',
      'Try several kinds of model, and judge each one only on data it never saw while learning. A model can be perfect on its own training data and still fail on new data.',
    ],
    problem: `
      Each dot is a past case with two measurements. Its colour is the known answer.
      A new case arrives with no colour. **Which colour should you predict, and how far can you trust that answer?**
      You can always build a model that gets every past case right. That is the trap.
    `,
    predict: {
      prompt: 'With $k = 1$, a new point copies the colour of the single closest training point. That scores 100% on the training points. **Will it also score best on new points?**',
      choices: ['Yes', 'No', 'Can\'t tell'],
      reveal: `**No.** With $k = 1$ the boundary bends around every training point, including the odd ones out. New points near an odd one out get the wrong colour. A middle value of $k$ scores better on the held-back test points. Try it.`,
    },
    viz: {
      title: 'Which k should you trust?',
      goal: 'Find the $k$ that scores best on the test points (the hollow dots).',
      detail: 'The training score uses the points the model learned from. The test score uses points it never saw.',
    },
    explain: {
      see: `Filled dots are training points. Hollow dots are test points, held back. The shaded background shows which colour a new point at that spot would get. With $k = 1$ the shading is patchy, with small islands around single points. With a large $k$ it is smooth, and it starts to ignore real bends.`,
      means: `Each new point takes the most common colour among its $k$ nearest training points. Small $k$ follows every detail, noise included. Large $k$ averages too much. **The test score tells you which is better, because those points played no part in building the model.**`,
      called: `This model is *k-nearest neighbours* (kNN). Following noise too closely is *overfitting*; smoothing away real structure is *underfitting*. Keeping test data separate is a *train/test split*. Repeating the split several different ways and averaging the scores is *cross-validation*.`,
      formula: `Distance between points $\\cg{a}$ and $\\cg{b}$: $d = \\sqrt{(a_1 - b_1)^2 + (a_2 - b_2)^2}$

Prediction: the most common colour among the $k$ training points with the smallest $d$.`,
    },
    why: `Every claim that "this model is 95% accurate" rests on a held-back test set. If test data leaks into training, the model looks better than it is. Checking that is part of every machine learning project.`,
    learn: {
      ai: ['regression vs classification', 'decision trees', 'k-nearest neighbours', 'clustering', 'overfitting vs underfitting', 'cross-validation', 'evaluation metrics'],
      maths: ['least squares', 'probability', 'mean/variance', 'distance measures', 'basic optimisation'],
      cs: ['trees (decision trees are literally trees)', 'sorting and nearest-neighbour search'],
      prog: ['pandas', 'scikit-learn', 'matplotlib'],
    },
    taste: 'Take one real dataset (for example house prices, or a dataset bundled with scikit-learn). Try linear regression, k-nearest neighbours, a decision tree and k-means clustering. Draw each model\'s decision boundary. Use cross-validation to pick a winner.',
    practice: [
      {
        q: 'Five labelled points: A(1, 1) red, B(2, 1) red, E(3, 3) blue, C(4, 4) blue, D(5, 4) blue. A new point P(2, 2) arrives. **Which colour would you give it? Does your answer change if you look only at the closest point? At the closest three? At all five?**',
        a: 'Distances from P: B = 1, A = 1.41, E = 1.41, C = 2.83, D = 3.61. Closest one: B, so red. Closest three: B, A, E: two red, one blue, so red. All five: two red, three blue, so blue. The answer depends on how many neighbours you use. That number is a choice you have to test.',
      },
    ],
    questions: ['How do we make models fair across groups?', 'How do we know when a model is confidently wrong?'],
    monash: 'FIT5201 Machine learning',
    deeper: [
      { label: 'scikit-learn: examples gallery', url: 'https://scikit-learn.org/stable/auto_examples/index.html', note: 'every model drawn on small datasets' },
      { label: 'scikit-learn: user guide', url: 'https://scikit-learn.org/stable/user_guide.html' },
    ],
    cues: [
      ['a model that is perfect on its training data', 'check it on held-back test data (overfitting?)'],
      ['"label a new case from similar past cases"', 'nearest neighbours'],
      ['"choose a setting such as k or tree depth"', 'cross-validation'],
    ],
    buildsOn: [],
    maths: ['la', 'prob', 'calc'],
  },

  // ------------------------------------------------------------------ 3
  {
    slug: 'language-models',
    inShort: [
      'How does a model predict the next word?',
      'It learns, from lots of text, how likely each possible next piece of text is, given what came before. Writing is repeating that: pick a likely next piece, add it, predict again.',
    ],
    problem: `
      Type "th" on a phone and it suggests "the".
      **How could a program do that without understanding English?**
      The simplest version counts, in a big pile of text, which letter tends to follow which.
    `,
    predict: {
      prompt: 'This model only ever looks **one letter back**. **If you let it write, what will come out?**',
      choices: ['Real English sentences', 'Word-like gibberish', 'Random letters'],
      reveal: `**Word-like gibberish.** Pairs of letters look right ("th", "he", "in"), but nothing longer holds together, because the model can't see further back than one letter. Press **Write 80 letters** to check. Seeing further back is what *attention* adds; see the tiny language model showpiece.`,
    },
    viz: {
      title: 'Guess the next letter',
      goal: 'Type a word of 5 or more letters where every letter after the first is one of the model\'s top 3 guesses.',
      detail: 'The three bars under the box are the model\'s top 3 guesses for the next letter.',
    },
    explain: {
      see: `The grid shows how often each letter follows each other letter in the training text (Shakespeare's plays). Each row is one "current letter". A bright cell means that next letter is common after the row's letter. When you type, the row for your last letter is highlighted, and its biggest cells become the guesses.`,
      means: `Divide each count in a row by the row's total, and you get the chance of each next letter. **That table of chances is the whole model.** Writing means: look up the row, pick a letter using those chances, move to that letter's row, repeat.`,
      called: `Counting pairs like this gives a *bigram model*. Each letter here is a *token*. Predicting what comes next is *next-token prediction*. Picking at random in proportion to the chances is *sampling*; a *temperature* setting makes the picks bolder or safer.`,
      formula: `$P(\\text{next} = \\cy{b} \\mid \\text{current} = \\cg{a}) = \\dfrac{\\text{count}(\\cg{a}\\,\\cy{b})}{\\text{count of all pairs starting with } \\cg{a}}$`,
    },
    why: `Large language models do the same job: predict the next token. The difference is how far back they look (thousands of tokens) and how they combine what they see, using attention inside a transformer.`,
    learn: {
      ai: ['tokenisation', 'embeddings', 'attention', 'transformers', 'next-token prediction', 'sampling and temperature'],
      maths: ['dot products', 'softmax', 'cross-entropy', 'probability distributions', 'matrix multiplication'],
      cs: ['hash maps for counting', 'byte-pair encoding (a greedy merging algorithm)'],
      prog: ['PyTorch modules', 'batching', 'training on CPU vs GPU'],
    },
    taste: 'Start with a bigram model (it counts which letter follows which). Then build a tiny character-level transformer, trained on a public-domain book, that writes new text in that style. Draw what each attention head looks at.',
    practice: [
      {
        q: 'In some text, the letter "q" appears 50 times. It is followed by "u" 49 times and by a space once. **What chance does a bigram model give to "u" after "q"?**',
        a: '$49 / 50 = 0.98$, so 98%.',
      },
      {
        q: 'Train a bigram model on the single word "banana". **List every letter pair and its count. What will the model write if you start it at "b"?**',
        a: 'Pairs: ba, an, na, an, na. So after b comes a (always); after a comes n (always); after n comes a (always). Starting at "b" it writes "bananananana…" forever. One letter of memory can\'t count how many "na"s it has written.',
      },
    ],
    questions: ['How do models reason over many steps?', 'Why do they sometimes make things up?'],
    monash: 'FIT5217 Natural language processing',
    deeper: [
      { label: 'Andrej Karpathy, Let\'s build GPT: from scratch, in code', url: 'https://www.youtube.com/watch?v=kCc8FmEb1nY', note: 'about 2 hours; builds a transformer on Shakespeare' },
    ],
    cues: [
      ['"predict what comes next in a sequence"', 'next-token prediction'],
      ['"count how often things appear together"', 'a hash map of pair counts'],
      ['output that is too repetitive, or too random', 'change the sampling temperature'],
    ],
    buildsOn: ['how-models-learn'],
    maths: ['la', 'prob'],
  },

  // ------------------------------------------------------------------ 4
  {
    slug: 'interpretability',
    inShort: [
      'What is a trained model actually doing inside?',
      'Its insides are lists of numbers, one list per layer. Many ideas the model uses turn out to be directions in those lists. You can find them, measure them, and push along them.',
    ],
    problem: `
      The digit network in the showpiece turns every drawing into 64 numbers before it decides.
      Nobody told it to track "is this digit round?".
      **Is that idea stored somewhere in the 64 numbers? How would you find it?**
    `,
    predict: {
      prompt: 'Each dot is a test digit, placed using its 64 inside numbers. **Can one straight arrow sort the round digits (0, 6, 8, 9) from the straight ones (1, 4, 7)?**',
      choices: ['Yes, almost perfectly', 'Partly', 'No, they are mixed up'],
      reveal: `**Yes, almost perfectly**, once the arrow points the right way. Turn it and watch the score. An idea the model learned often shows up as a direction like this.`,
    },
    viz: {
      title: 'Find the "round" direction',
      goal: 'Turn the arrow until it sorts round digits from straight ones with at least 90% accuracy.',
      detail: 'Drag the arrow tip, or use the turn buttons. Below the plot, each dot is dropped onto the arrow\'s line.',
    },
    explain: {
      see: `Each dot is one digit. Below the plot, every dot is dropped straight onto the arrow's line, like a shadow. Turn the arrow and the shadows reorder. When the arrow points the right way, the round digits' shadows gather at one end and the straight digits' at the other.`,
      means: `Then a single number, the shadow's position, answers "how round is this digit?". **The idea "round" is a direction in the model's numbers.** Push a digit's numbers along that direction, and the model treats it as rounder.`,
      called: `The shadow's position is the *projection* of the point onto the arrow, calculated with a *dot product*. An arrow that reads an idea out of a model is a *probe*. Pushing numbers along the arrow to change what the model does is *steering*. When a model stores more ideas than it has numbers, using directions that overlap, that is *superposition*.`,
      formula: `For a point $\\cg{\\mathbf{h}} = (h_1, h_2)$ and an arrow $\\cr{\\mathbf{w}} = (w_1, w_2)$ of length 1:

$\\cy{\\text{shadow}} = \\cg{\\mathbf{h}} \\cdot \\cr{\\mathbf{w}} = h_1 w_1 + h_2 w_2$`,
    },
    why: `Researchers look for directions like this inside large language models: for a topic, a language, or whether a statement is true. Finding them is a step toward checking what a model is doing before trusting it.`,
    learn: {
      ai: ['activations', 'features', 'probes', 'steering', 'superposition (more concepts than neurons)'],
      maths: ['vectors as directions', 'projections', 'dot products', 'PCA', 'eigenvectors'],
      cs: ['experiment design', 'careful measurement'],
      prog: ['PyTorch hooks (reading values from inside a model)', 'plotting high-dimensional data'],
      note: 'This field is applied linear algebra.',
    },
    taste: 'Train a small network, then find a direction in its internal activations that represents one concept (for example "is this digit round?"). Push along that direction and watch the model\'s output change.',
    practice: [
      {
        q: 'A point $\\mathbf{h} = (3, 1)$ and an arrow $\\mathbf{w} = (0.6, 0.8)$ (its length is 1). **Where does the point\'s shadow land on the arrow? Which lands further along: (1, 2) or (2, 1)?**',
        a: '$3 \\times 0.6 + 1 \\times 0.8 = 2.6$. For (1, 2): $0.6 + 1.6 = 2.2$. For (2, 1): $1.2 + 0.8 = 2.0$. So (1, 2) lands further along, even though (2, 1) is further right: the arrow points more up than right.',
      },
    ],
    questions: ['Can we read a model\'s "thoughts" reliably?', 'Can we check a model is safe by looking inside it?'],
    monash: 'Builds on FIT5215 Deep learning. A strong candidate for research.',
    deeper: [
      { label: 'ARENA interpretability curriculum (GitHub)', url: 'https://github.com/callummcdougall/ARENA_3.0', note: 'free exercises: transformers, circuits, probes, steering' },
      { label: 'transformer-circuits.pub', url: 'https://transformer-circuits.pub/', note: 'research articles on what is inside transformers' },
      { label: 'TransformerLens library', url: 'https://github.com/TransformerLensOrg/TransformerLens', note: 'read values from inside language models' },
    ],
    cues: [
      ['"does the model know X?"', 'train a probe: find a direction that reads X out'],
      ['"how much does this point go in that direction?"', 'a dot product (projection)'],
      ['"more concepts than neurons"', 'superposition: directions that overlap'],
    ],
    buildsOn: ['language-models', 'computer-vision'],
    maths: ['la'],
  },

  // ------------------------------------------------------------------ 5
  {
    slug: 'computer-vision',
    inShort: [
      'How does a model find and recognise things in an image?',
      'It slides small grids of weights, called filters, across the image. Early filters find edges. Later layers combine edges into shapes, and shapes into objects.',
    ],
    problem: `
      To a computer, a photo is a grid of numbers, one per pixel.
      Before it can find a cat, it has to find edges: places where dark changes to light.
      **How can arithmetic on a grid of numbers find an edge?**
    `,
    predict: {
      prompt: 'Set all nine cells of the filter to +1. **What will the output look like?**',
      choices: ['Only the edges', 'A blurred copy of the image', 'All black'],
      reveal: `**A blurred copy.** Each output pixel becomes the sum of a 3 × 3 patch, so sharp edges spread out. To find an edge, a filter needs negative cells too. Try it.`,
    },
    viz: {
      title: 'Build an edge detector',
      goal: 'Make a filter that lights up the left and right edges of the square, but not its top and bottom edges.',
      detail: 'Click a filter cell to change it: 0 → +1 → −1 → 0.',
    },
    explain: {
      see: `The 3 × 3 grid is your filter: {r|red} cells are +1, {b|blue} cells are −1. Hover over or tap the image: the filter sits on that 3 × 3 patch. Each output pixel is the patch's pixels times the filter's cells, all added up.`,
      means: `Where a patch is one flat shade, the +1s and −1s cancel and the output is 0. Where the left of the patch is dark and the right is light, they don't cancel, so the output lights up. **A filter with −1s on one side and +1s on the other finds edges that run the other way.**`,
      called: `Sliding a filter like this is a *convolution*. The filter is also called a *kernel*, and the output grid is a *feature map*. A *CNN* (convolutional neural network) learns its filter values from data instead of having them set by hand. Shrinking feature maps by keeping the biggest value in each block is *pooling*.`,
      formula: `$\\cy{\\text{out}}[i, j] = \\displaystyle\\sum_{a=-1}^{1}\\sum_{b=-1}^{1} \\cr{w}[a, b]\\; \\cg{x}[i+a,\\, j+b]$`,
    },
    why: `The first layer of a trained CNN often ends up with edge filters much like the one you build here. You can see this in the digit showpiece: look at the small red-and-blue squares in layer 1.`,
    learn: {
      ai: ['convolution', 'filters', 'feature maps', 'pooling', 'CNNs', 'data augmentation', 'transfer learning'],
      maths: ['images as matrices', 'convolution', 'linear algebra'],
      cs: ['2D arrays', 'sliding-window algorithms'],
      prog: ['image loading', 'PyTorch Conv2d', 'visualising tensors as images'],
    },
    taste: 'Write an edge detector by hand (a 3 × 3 filter sliding over an image). Then train a small convolutional network to classify images. Draw what its learned filters look like.',
    practice: [
      {
        q: 'One row of pixels: 0 0 0 1 1 1. A one-row filter: −1 0 +1. Slide the filter along, keeping it fully on the row. **What are the outputs, and where is the edge?**',
        a: 'Centred on positions 2 to 5: $-0 + 0 = 0$, $-0 + 1 = 1$, $-0 + 1 = 1$, $-1 + 1 = 0$. Outputs: 0 1 1 0. The 1s sit either side of the jump from 0 to 1, so the edge is between the third and fourth pixel.',
      },
    ],
    questions: ['How do models understand 3D scenes from flat images?', 'How do they handle situations they\'ve never seen?'],
    monash: 'FIT5221 Intelligent image and video analysis',
    deeper: [
      { label: 'Stanford CS231n course notes', url: 'https://cs231n.github.io/', note: 'free; start with "Convolutional Neural Networks"' },
    ],
    cues: [
      ['"find a small pattern anywhere in an image"', 'slide a filter (convolution)'],
      ['a 2-D grid with a small window moving across it', 'a sliding-window loop'],
      ['"the same thing could appear anywhere in the picture"', 'reuse one filter\'s weights at every position'],
    ],
    buildsOn: ['how-models-learn'],
    maths: ['la'],
  },

  // ------------------------------------------------------------------ 6
  {
    slug: 'reinforcement-learning',
    inShort: [
      'How does an agent learn to act well when rewards come later?',
      'It keeps a score for every move in every situation. After each move, it nudges that score toward "the reward I got, plus the best score from where I landed". Good scores spread backwards from the reward, one step at a time.',
    ],
    problem: `
      A robot sits in a maze. It gets +1 when it reaches the exit and nothing for every other step.
      **Nobody tells it which moves were good. How can it work out a route?**
      The early moves earn no reward at all, yet they decide whether it gets there.
    `,
    predict: {
      prompt: 'The agent has finished its first trip to the goal. **Which squares have a learned value so far?**',
      choices: ['Only the square next to the goal', 'Every square it visited', 'Every square in the maze'],
      reveal: `**Only the square next to the goal.** On each trip, value spreads back by about one step. Run single episodes and watch the yellow creep back from the goal.`,
    },
    viz: {
      title: 'Teach the agent the maze',
      goal: 'Train until the agent\'s best route (the arrows) reaches the goal in the fewest possible steps.',
      detail: 'Run one episode at a time, or 50. Try each exploration setting.',
    },
    explain: {
      see: `Each square's brightness is the agent's current estimate of how good it is to be there. Arrows show the move it currently rates best. As episodes run, yellow spreads out from the goal and the arrows line up into a route.`,
      means: `After each move, the agent updates its score for that move: the reward it got, plus a slightly shrunk copy of the best score from the square it landed on. **Squares next to the goal learn first; each ring then learns from the ring before.**`,
      called: `The agent's situation is a *state*; a move is an *action*; the +1 is the *reward*. The table of scores is a *Q-table*, and this method is *Q-learning*. The arrows are its *policy*. Taking a random move to find new routes is *exploration*; taking the best-known move is *exploitation*. The shrink factor $\\gamma$ is the *discount*.`,
      formula: `$Q(s, a) \\leftarrow Q(s, a) + \\alpha\\,\\big[\\,\\cy{r} + \\gamma \\max_{a'} Q(s', a') - Q(s, a)\\,\\big]$

$s$ = state, $a$ = action, $s'$ = the next state, $\\alpha$ = how big a nudge, $\\gamma$ = discount.`,
    },
    why: `This update, with a neural network in place of the table, learned to play dozens of Atari video games from the screen pixels (DeepMind's DQN, 2015).`,
    learn: {
      ai: ['states', 'actions', 'rewards', 'policies', 'value functions', 'Q-learning', 'exploration vs exploitation'],
      maths: ['probability', 'expected value', 'Markov decision processes', 'the Bellman equation'],
      cs: ['dynamic programming (value iteration is DP)', 'tables and hash maps'],
      prog: ['simulation loops', 'Gymnasium environments', 'plotting learning curves'],
    },
    taste: 'A Q-learning agent learns to solve a gridworld maze from scratch, with its value estimates drawn as a live heatmap. Then use Gymnasium to train an agent to balance a pole (CartPole).',
    practice: [
      {
        q: 'Reaching the goal gives +1 and every other step gives 0. Each step back from the goal, value is multiplied by $\\gamma = 0.9$. On the best route, **what is the value of the square 1 step from the goal? 2 steps? 3 steps?**',
        a: '1 step: 1 (the next move earns the +1). 2 steps: $0.9 \\times 1 = 0.9$. 3 steps: $0.9 \\times 0.9 = 0.81$. Far squares have smaller values because their reward is further away, which is how the agent prefers short routes.',
      },
    ],
    questions: ['How can agents learn from far fewer attempts?', 'How do we stop agents exploiting loopholes in their reward?'],
    monash: 'Related to FIT5047 Fundamentals of AI and FIT5226 Multi-agent systems',
    deeper: [
      { label: 'Sutton and Barto, Reinforcement Learning: An Introduction', url: 'http://incompleteideas.net/book/the-book-2nd.html', note: 'free online, 2nd edition' },
      { label: 'OpenAI Spinning Up', url: 'https://spinningup.openai.com/', note: 'deep reinforcement learning, with code' },
    ],
    cues: [
      ['the reward comes many steps after the decision', 'reinforcement learning: value spreads backwards'],
      ['"best total from here" depends on "best total from the next state"', 'the Bellman equation (dynamic programming)'],
      ['"try new things or use what works?"', 'exploration vs exploitation'],
    ],
    buildsOn: ['planning-search', 'how-models-learn'],
    maths: ['prob'],
  },

  // ------------------------------------------------------------------ 7
  {
    slug: 'multi-agent',
    inShort: [
      'How does group behaviour emerge from simple individual rules?',
      'Give each agent a few rules about its nearest neighbours only. No agent sees the whole group, yet flocks, trails and waves appear. Change one local rule and the whole group changes.',
    ],
    problem: `
      A flock of starlings turns as one shape, with no leader and no plan.
      Each bird can only see a few neighbours.
      **How can the whole flock move together?**
    `,
    predict: {
      prompt: 'Turn alignment down to zero, so the birds stop matching their neighbours\' direction. **What will the group do?**',
      choices: ['Still fly as one flock', 'Bunch together but point every way', 'Scatter completely'],
      reveal: `**Bunch together but point every way.** Cohesion still pulls them in. Without alignment, there is no shared direction: a swarm, not a flock.`,
    },
    viz: {
      title: 'Make them flock',
      goal: 'Get the whole group flying the same way: keep the order score above 0.9 for 2 seconds.',
      detail: 'Order score 1 means every bird points the same way; 0 means no shared direction.',
    },
    explain: {
      see: `Each triangle is a bird. Every frame, each bird looks only at birds within a short distance, then adjusts its direction using three rules. Change a rule's weight and watch the pattern change.`,
      means: `*Separation*: steer away from birds that are too close. *Alignment*: turn toward the average direction of nearby birds. *Cohesion*: steer toward the centre of nearby birds. **None of the rules mentions the flock, yet the flock appears.**`,
      called: `Each bird is an *agent*. A pattern that exists for the group but is written in no single rule is *emergence*. These three-rule birds are called *boids* (Craig Reynolds, 1987). The order score is the length of the birds' average direction arrow.`,
      formula: `Each frame: $\\mathbf{v} \\leftarrow \\mathbf{v} + s\\,\\mathbf{F}_{\\text{sep}} + a\\,\\mathbf{F}_{\\text{align}} + c\\,\\mathbf{F}_{\\text{coh}}$

Order score: $\\left|\\dfrac{1}{N}\\sum_i \\hat{\\mathbf{v}}_i\\right|$, where $\\hat{\\mathbf{v}}_i$ is bird $i$'s direction as a length-1 arrow.`,
    },
    why: `The same question, many simple agents producing one group outcome, comes up in robot swarms, traffic and markets. Ant colony optimisation turns ants' trail-following into an algorithm for finding short routes.`,
    learn: {
      ai: ['agents', 'emergence', 'cooperation vs competition', 'basic game theory', 'ant colony optimisation'],
      maths: ['vectors as forces and velocities', 'payoff matrices', 'Nash equilibrium', 'probability'],
      cs: ['spatial grids and quadtrees (finding nearby agents fast)', 'simulation performance'],
      prog: ['animation loops', 'numpy vectorisation for thousands of agents'],
    },
    taste: 'Simulate a flock of birds (boids) with three simple rules. Then ants that find food by leaving and following trails. Then a predator–prey world. Change one rule and watch the whole group change.',
    practice: [
      {
        q: 'Three birds point in the directions (1, 0), (0, 1) and (−1, 0). **What is the order score? What would make it exactly 1?**',
        a: 'Average arrow: $((1 + 0 - 1)/3,\\ (0 + 1 + 0)/3) = (0, 1/3)$. Its length is $1/3 \\approx 0.33$. It is 1 only when all three point the same way.',
      },
    ],
    questions: ['How do AI agents learn to cooperate or negotiate?', 'How do we predict what a whole system will do?'],
    monash: 'FIT5226 Multi-agent systems and collective behaviour',
    deeper: [
      { label: 'Craig Reynolds\' original boids page', url: 'https://www.red3d.com/cwr/boids/' },
    ],
    cues: [
      ['many simple agents, one group outcome', 'simulate the local rules and watch (emergence)'],
      ['"each agent needs its nearby agents, fast"', 'a spatial grid or quadtree'],
      ['agents whose best move depends on what the others do', 'game theory (payoff matrices)'],
    ],
    buildsOn: ['reinforcement-learning'],
    maths: ['la', 'prob'],
  },

  // ------------------------------------------------------------------ 8
  {
    slug: 'planning-search',
    inShort: [
      'What\'s the smartest path through a huge number of choices?',
      'Explore choices in a careful order and never explore the same place twice. A good guess of the distance left lets the search head toward the goal instead of spreading out in every direction.',
    ],
    problem: `
      A warehouse robot must reach a shelf. There are millions of possible paths.
      **How do you find the shortest one without checking them all?**
    `,
    predict: {
      prompt: 'Two searches race to the goal on an empty grid. Search 1 spreads out evenly in every direction. Search 2 prefers squares that look closer to the goal. **How many squares does Search 2 check, compared with Search 1?**',
      choices: ['About the same', 'About half', 'Less than a quarter'],
      reveal: `**Less than a quarter**, on an empty grid. Run both and compare the "squares checked" counts. Walls that block the straight line can make Search 2 check far more; that is the challenge.`,
    },
    viz: {
      title: 'Race two searches',
      goal: 'Build walls so Search 2 checks at least 3 times as many squares as it does on the empty grid.',
      detail: 'Click or drag on the grid to add or remove walls. There must still be a path to the goal.',
    },
    explain: {
      see: `Search 1 colours squares in rings around the start: every square 1 step away, then 2 steps, and so on. Search 2 stretches toward the goal. Both end with the same path length (yellow). Walls that block the straight line make Search 2 spread out.`,
      means: `Search 1 checks squares in order of steps taken so far. Search 2 checks them in order of steps taken so far **plus a guess of the steps left**. As long as the guess never overestimates, Search 2 still finds a shortest path, while checking far fewer squares.`,
      called: `Search 1 is *breadth-first search* (BFS); it keeps waiting squares in a *queue*. Search 2 is A* ("A star"); it keeps them in a *priority queue* ordered by the estimate. The guess is a *heuristic*; here it is the distance ignoring walls (*Manhattan distance*). A heuristic that never overestimates is *admissible*.`,
      formula: `A* checks next the square $n$ with the smallest $f(n) = \\cg{g(n)} + \\cy{h(n)}$

$g(n)$ = steps from the start so far, $h(n) = |x_n - x_{\\text{goal}}| + |y_n - y_{\\text{goal}}|$`,
    },
    why: `Game characters, robots and route planners use A* and its relatives. Search also sits inside game-playing AI: AlphaGo combined learned networks with tree search.`,
    learn: {
      ai: ['state spaces', 'uninformed vs informed search', 'heuristics', 'adversarial search', 'constraint satisfaction', 'logic'],
      maths: ['graph theory', 'why a heuristic must never overestimate (admissibility)', 'counting states'],
      cs: ['graphs', 'queues', 'priority queues (heaps)', 'hash sets', 'recursion', 'big-O'],
      prog: ['clean data structures', 'recursion', 'performance profiling'],
      note: 'This is where DSA lives in AI.',
    },
    taste: 'An animated pathfinder on a grid: watch breadth-first search, Dijkstra and A* explore differently. Then a sliding-puzzle solver. Then a Connect Four player using minimax with alpha-beta pruning that you can play against.',
    practice: [
      {
        q: 'An empty grid. Start at (0, 0), goal at (3, 2). Moves: up, down, left, right. **How long is the shortest path? How many different shortest paths are there?**',
        a: 'Shortest: 3 right + 2 up = 5 moves. A shortest path is any order of those 5 moves, so choose which 2 of the 5 are "up": $\\binom{5}{2} = 10$ paths.',
      },
    ],
    questions: ['How do we plan for thousands of robots at once?', 'How do we combine learned models with classic search?'],
    monash: 'FIT5222 Planning and automated reasoning, FIT5047 Fundamentals of AI',
    deeper: [
      { label: 'Red Blob Games: Introduction to A*', url: 'https://www.redblobgames.com/pathfinding/a-star/introduction.html', note: 'very visual' },
    ],
    cues: [
      ['shortest path where every move costs the same', 'breadth-first search with a queue'],
      ['shortest path, and you can estimate the distance left', 'A* with a priority queue'],
      ['"never visit the same state twice"', 'a hash set of visited states'],
    ],
    buildsOn: [],
    maths: ['disc'],
  },

  // ------------------------------------------------------------------ 9
  {
    slug: 'optimisation',
    inShort: [
      'What\'s the best schedule, route or allocation under a set of rules?',
      'Write down the rules and the goal precisely, then search the possible answers cleverly. For huge problems, start with any answer and keep improving it with small changes.',
    ],
    problem: `
      A courier must visit 8 addresses and come back. **Which order is shortest?**
      With 8 stops there are 2,520 different round trips.
      With 20 stops there are more than $6 \\times 10^{16}$.
    `,
    predict: {
      prompt: '**How many different round trips are there through 8 stops?** (Same starting stop. A trip and the same trip driven backwards count as one.)',
      choices: ['56', '2,520', '40,320'],
      reveal: `**2,520.** Fix the start. The other 7 stops can go in $7 \\times 6 \\times 5 \\times 4 \\times 3 \\times 2 \\times 1 = 5{,}040$ orders. Each trip is counted twice (once each way), so 2,520. This count grows faster than any exponential, which is why big problems need smarter search.`,
    },
    viz: {
      title: 'Find a short round trip',
      goal: 'Click the stops in order to build a round trip within 5% of the shortest one.',
      detail: 'Start anywhere; the trip closes itself after the last stop. Show me runs simulated annealing from a tangled trip.',
    },
    explain: {
      see: `Show me starts from a random, tangled trip. Each frame it tries reversing one section of the trip. Shorter trips are always kept. Longer ones are sometimes kept too: often at first, rarely later. Watch the crossings untangle and the length drop.`,
      means: `Accepting some worse trips early stops the search getting stuck on a trip that no single small change can improve. **As it "cools", it accepts fewer bad moves and settles on a short trip.**`,
      called: `This is the *travelling salesperson problem* (TSP). It is *NP-hard*: no known method finds the guaranteed best trip quickly for large inputs. Improving an answer by small changes is *local search*. Accepting worse changes with a chance that shrinks over time is *simulated annealing*; the shrinking control is the *temperature*.`,
      formula: `Accept a change that makes the trip $\\Delta$ longer with probability $e^{-\\Delta / T}$. Lower the temperature $T$ a little every step.`,
    },
    why: `Delivery routes, exam timetables, crew rosters and chip layouts are optimisation problems. Monash is a home of the MiniZinc modelling language: you write the rules, and a solver does the search.`,
    learn: {
      ai: ['constraint modelling', 'local search', 'simulated annealing', 'branch and bound'],
      maths: ['discrete maths', 'combinatorics', 'linear programming basics'],
      cs: ['backtracking', 'NP-hardness (why some problems explode in size)', 'heuristics'],
      prog: ['MiniZinc or a Python constraint solver', 'animation'],
    },
    taste: 'Write an exam timetable as constraints and let a solver find a valid schedule. Then solve a travelling-salesperson route with simulated annealing, animated so you can watch the route untangle.',
    practice: [
      {
        q: '**How many different round trips are there through 5 stops**, counting the same way as above?',
        a: 'Fix the start: the other 4 stops give $4 \\times 3 \\times 2 \\times 1 = 24$ orders. Halve for direction: 12.',
      },
      {
        q: 'A trip is 100 km. A small change would make it 105 km. **What is the chance of accepting the change at temperature $T = 10$? At $T = 1$?**',
        a: '$\\Delta = 5$. At $T = 10$: $e^{-0.5} \\approx 0.61$, so about 61%. At $T = 1$: $e^{-5} \\approx 0.007$, under 1%. Early on (hot), worse moves are common; later (cold), they almost never happen.',
      },
    ],
    questions: ['Can learned models help solvers find answers faster?', 'How do we optimise when the rules keep changing?'],
    monash: 'FIT5216 Modelling discrete optimisation problems. Monash is a home of the MiniZinc modelling language.',
    deeper: [
      { label: 'The official MiniZinc tutorial', url: 'https://docs.minizinc.dev/en/stable/part_2_tutorial.html' },
    ],
    cues: [
      ['"find the best order or assignment under rules"', 'model the constraints, then hand them to a solver'],
      ['the number of options grows like n!', 'don\'t check them all: use heuristics or local search'],
      ['local search keeps getting stuck', 'accept some worse moves (simulated annealing)'],
    ],
    buildsOn: ['planning-search'],
    maths: ['disc', 'la'],
  },

  // ------------------------------------------------------------------ 10
  {
    slug: 'generative-models',
    inShort: [
      'How can a model create new things that look real?',
      'Take real examples and add noise to them, step by step, until only noise is left. Train a model to undo one small step. Then start from fresh noise and undo every step: out comes a new example.',
    ],
    problem: `
      You have 400 points that form a spiral.
      **How do you produce new points that also form a spiral, without copying the old ones?**
      Swap points for images, and this is the question image generators answer.
    `,
    predict: {
      prompt: 'Noise is added to the spiral over 50 small steps. **Around which step does the spiral stop being recognisable?**',
      choices: ['Around step 5', 'Around step 20', 'Only at step 50'],
      reveal: `**Around step 20.** Press **Add noise** and watch the step counter. Most of the shape is gone well before the end. The last steps turn a blurry cloud into pure noise.`,
    },
    viz: {
      title: 'Turn noise into a spiral',
      goal: 'Generate a clean spiral (quality at least 90%) using 10 denoising steps or fewer.',
      detail: 'Pick a number of steps, then press **Generate**. Quality = the share of new points that land on the spiral.',
    },
    explain: {
      see: `"Add noise": the spiral dissolves into a cloud. "Generate": new random points start as a cloud and drift, step by step, onto the spiral. Each step removes a little noise. With very few steps, the jumps are large and some points land off the spiral.`,
      means: `At every step, each point moves toward where the spiral most likely is, given how noisy the point still is. Early steps make rough moves; late steps make fine ones. **The new points land between the old ones, so they are new, not copies.**`,
      called: `Adding noise step by step is the *forward process*; undoing it is *denoising*. How much noise each step adds is the *noise schedule*. Running the denoiser from pure noise is *sampling*. A model built this way is a *diffusion model*. Here the denoiser is calculated exactly from the spiral's points; a real diffusion model learns it with a neural network, because for images the exact calculation is impossible.`,
      formula: `Noisy point at step $t$: $\\cy{x_t} = \\sqrt{\\bar\\alpha_t}\\;\\cg{x_0} + \\sqrt{1 - \\bar\\alpha_t}\\;\\epsilon$

$\\cg{x_0}$ = the clean point, $\\epsilon$ = random Gaussian noise, $\\bar\\alpha_t$ falls from 1 (no noise) to near 0 (all noise).`,
    },
    why: `Image generators such as Stable Diffusion work this way, with images in place of 2-D points and a large neural network as the denoiser.`,
    learn: {
      ai: ['autoencoders', 'diffusion', 'noise schedules', 'denoising', 'sampling'],
      maths: ['probability distributions', 'Gaussian noise', 'expected value', 'a light touch of KL divergence'],
      cs: ['iterative algorithms', 'numerical stability'],
      prog: ['PyTorch', 'animation with matplotlib'],
    },
    taste: 'Train a tiny diffusion model on 2-D points shaped like a spiral. Animate noise turning step by step into the spiral. It runs on a CPU in minutes.',
    practice: [
      {
        q: 'The clean point is $x_0 = (2, 0)$. At this step $\\bar\\alpha = 0.25$, and the noise drawn is $\\epsilon = (1, -1)$. **What is the noisy point $x_t$?**',
        a: '$\\sqrt{0.25} = 0.5$ and $\\sqrt{0.75} \\approx 0.87$. So $x_t = 0.5 \\times (2, 0) + 0.87 \\times (1, -1) = (1 + 0.87,\\ -0.87) = (1.87, -0.87)$.',
      },
      {
        q: 'You add fresh random noise (average 0) to the point (2, 0) a thousand separate times. **Where is the average of the thousand noisy copies?**',
        a: 'Very close to (2, 0). The noise averages out to zero. That is the idea a denoiser builds on: the best guess of the clean point is an average over everything the noisy point could have come from.',
      },
    ],
    questions: ['How do we make generation faster and controllable?', 'How do we detect generated content?'],
    monash: 'Builds on FIT5215 Deep learning and FIT5221 Intelligent image and video analysis',
    deeper: [
      { label: 'Hugging Face diffusion models course', url: 'https://huggingface.co/learn/diffusion-course/en/unit0/1', note: 'free' },
    ],
    cues: [
      ['"generate new samples that look like the data"', 'a generative model (for example, diffusion)'],
      ['"undo a corruption one small step at a time"', 'denoising, step by step'],
      ['Gaussian noise added to a value', '$x_t = \\sqrt{\\bar\\alpha}\\,x_0 + \\sqrt{1 - \\bar\\alpha}\\,\\epsilon$'],
    ],
    buildsOn: ['computer-vision'],
    maths: ['prob'],
  },
];

export const fieldContent = (slug: string) => FIELDS.find((f) => f.slug === slug)!;

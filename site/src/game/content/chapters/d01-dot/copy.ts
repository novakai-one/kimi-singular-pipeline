// Verbatim content from pipeline/packs/d01-dot-v2.md, including its line breaks.
export const COPY = {
  "goalPill": "Goal",
  "title": "How much does this arrow point along that one?",
  "open": [
    {
      "who": "lantern",
      "text": "Docking sensor test. The beacon's beam is fixed along (4, 0). Your\n  sensor arrow has length 3; you can point it anywhere.",
      "say": "Docking sensor test. The beacon's beam is fixed along four, zero. Your\n  sensor arrow has length three; you can point it anywhere."
    },
    {
      "who": "bram",
      "text": "Find the strongest reading first. Then find where it dies."
    }
  ],
  "p1": {
    "title": "Where is the reading strongest?",
    "goal": "Turn the sensor. Find the heading with the biggest\n  reading, then the heading where the reading is exactly zero.",
    "prompt": "Before you drag: at what angle between the\n  arrows will the reading hit zero? Say a number of degrees.",
    "feedback": "Strong in size, but\n    negative — the sensor points against the beam. Find the biggest positive\n    reading first.",
    "labels": {
      "beam": "beam",
      "sensor": "sensor",
      "reading": "reading",
      "shadow": "shadow"
    }
  },
  "entry": {
    "id": "dot-product",
    "term": "dot product",
    "question": "How much does one arrow point along another?",
    "saw": "The reading was biggest when the sensor pointed along the beam, zero\n  at a right angle, and negative past it. The shadow on the beam's line grew\n  and shrank with it.",
    "means": "Multiply matching components and add: (4, 0) · (a, b) = 4a — the\n  beam's length times the shadow's length.",
    "name": "The **dot product** $\\mathbf v \\cdot \\mathbf w = v_1w_1 + v_2w_2$ is\n  one number: how much $\\mathbf w$ points along $\\mathbf v$, scaled by both\n  lengths. A zero dot product means the arrows are at a right angle — they\n  are **orthogonal**.",
    "formula": "\\mathbf v \\cdot \\mathbf w = v_1w_1 + v_2w_2 = \\|\\mathbf v\\|\\,\\|\\mathbf w\\|\\cos\\theta",
    "why": "Expand $\\|\\mathbf v - \\mathbf w\\|^2$ with components and compare with\n  the law of cosines: the two agree only if $\\mathbf v \\cdot \\mathbf w =\n  \\|\\mathbf v\\|\\,\\|\\mathbf w\\|\\cos\\theta$.",
    "cue": "When you see **'how much along'** or **'aligned'**, think **dot product**.",
    "use": "One neuron in a network computes a dot product of its weights with its\n  inputs.",
    "nodes": [
      "N05"
    ]
  },
  "intro": [
    {
      "who": "lantern",
      "text": "Now with numbers. Beam (3, 4), sensor (5, 0). Compute the reading\n  by hand, then check it.",
      "say": "Now with numbers. Beam three, four. Sensor five, zero. Compute the\n  reading by hand, then check it."
    }
  ],
  "p2": {
    "title": "What is the reading?",
    "goal": "Compute v·w for v = (3, 4), w = (5, 0), then answer.",
    "feedback": {
      "7": "That adds v's components. The dot product mixes both arrows: multiply\n    matching pairs, then add.",
      "25": "That is ‖v‖ times ‖w‖ — the reading only if the arrows pointed the\n    same way. Multiply matching components, not the lengths.",
      "35": "That multiplies the sums. Multiply each matching pair first, then\n    add: 3·5 + 4·0."
    },
    "solution": "  \\begin{aligned}\n  \\mathbf v \\cdot \\mathbf w &= 3 \\cdot 5 + 4 \\cdot 0 \\\\\n  &= 15 + 0 \\\\\n  &= 15\n  \\end{aligned}"
  },
  "sayit": {
    "id": "d01-dot",
    "who": "bram",
    "ask": "In plain words: what does the dot product measure?",
    "frames": {
      "see": "The reading was biggest when the arrows pointed the ___ way, and\n    zero at a ___ angle.",
      "means": "The dot product multiplies matching ___ and adds them; it equals\n    the beam's length times the ___ length.",
      "called": "This number is called the ___ ___.",
      "cue": "When you see 'how much along', think ___."
    },
    "wordBank": [
      "same",
      "opposite",
      "right",
      "components",
      "lengths",
      "shadow",
      "dot",
      "product",
      "projection",
      "slope"
    ]
  },
  "doubt": {
    "claim": "A zero dot product means one of the arrows is the zero arrow.",
    "reason": "(3, 4)·(−4, 3) = −12 + 12 = 0, and neither arrow is zero. Zero\n  means a right angle, not zero length.",
    "goal": "Set both arrows. **Challenge it** — two non-zero arrows with\n  a zero reading — or **Back it**."
  },
  "law": {
    "frame": [
      "$\\mathbf v \\cdot \\mathbf w = 0$ exactly when the arrows are ",
      {
        "slot": "cond"
      },
      "\n  (or one has no length)."
    ],
    "slots": {
      "cond": {
        "options": [
          {
            "id": "perp",
            "text": "at a right angle"
          },
          {
            "id": "parallel",
            "text": "parallel"
          },
          {
            "id": "opposite",
            "text": "pointing in opposite directions"
          },
          {
            "id": "equal",
            "text": "equal in length"
          }
        ]
      }
    },
    "reason": {
      "ask": "Your Law survived. Why a right angle?",
      "options": [
        {
          "id": "a",
          "text": "$\\mathbf v \\cdot \\mathbf w = \\|v\\|\\|w\\|\\cos\\theta$; with non-zero\n    lengths it is zero exactly when $\\cos\\theta = 0$ — a right angle.",
          "right": true,
          "why": "Yes: the lengths are non-zero, so only $\\cos\\theta$ can make\n    the product zero."
        },
        {
          "id": "b",
          "text": "Because the components cancel.",
          "right": false,
          "why": "Cancelling parts are not\n    the condition: (3, 4)·(−3, 3) = 3 ≠ 0. The guarantee is the right angle."
        },
        {
          "id": "c",
          "text": "Because the arrows have equal length.",
          "right": false,
          "why": "(4, 0)·(4, 0) =\n    16: equal lengths, not zero. Length decides size, not sign."
        }
      ]
    }
  },
  "compare": {
    "id": "d01-dot",
    "page": "The **dot product** $\\mathbf v \\cdot \\mathbf w = v_1w_1 + v_2w_2$\n  measures how much one arrow points along another: it equals\n  $\\|\\mathbf v\\|\\,\\|\\mathbf w\\|\\cos\\theta$ — the beam's length times the\n  shadow's length. Zero means a right angle (orthogonal); negative means more\n  than 90° apart.",
    "formula": "\\mathbf v \\cdot \\mathbf w = \\|\\mathbf v\\|\\,\\|\\mathbf w\\|\\cos\\theta",
    "keyIdeas": [
      "Did you say what it measures — how much one arrow points along another?",
      "Did you say why zero means a right angle?",
      "Did you connect it to the shadow?"
    ]
  },
  "build": {
    "title": "The sensor firmware",
    "tests": "200 random integer pairs",
    "brief": "Write `dot(v, w)`. The readout runs\n  on your code from here.",
    "solution": "def dot(v, w):\n    return v[0]*w[0] + v[1]*w[1]",
    "decoy": "    return sum(a + b for a, b in zip(v, w))",
    "feedback": "Checked against 200 random pairs. First mismatch:\n  dot({a}, {b}) should be {r}; your function returned {y}.",
    "success": {
      "who": "lantern",
      "text": "Sensor firmware updated. The readout now runs on\n  your dot.",
      "say": "Sensor firmware updated. The readout now runs on your dot."
    }
  }
};

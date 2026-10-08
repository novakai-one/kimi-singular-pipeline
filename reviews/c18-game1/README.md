# Chapter 18, Game 1 (`c18-p1`): latest screenshots

**How this works**

1. ChatGPT writes the text in `site/src/game/content/chapters/c18-eigen/traj-text.ts` (the `P1` block), on a branch named `chatgpt/...`.
2. Claude puts it in the game word for word, plays the game, and replaces the screenshots and text below.
3. Older rounds stay in this folder's git history.

---

**This round**

- Text: commit `4702af5` (ChatGPT), merged in `dbcd94d`.
- Played on desktop, 1440 × 900, by a script driving a real browser. No console errors.
- Preview link (owner only): https://claude.ai/artifact/BfNJC53nhnSVh3txgFFaio

---

## Screenshots, with what the player did and the exact text on screen

**1. Opening** — `1-opening.jpg`
- Player: nothing yet.
- Message: "Start with the vector (1, 0). Press **Test this arrow** to see where the matrix sends it."

**2. First launch** — `2-first-launch.jpg`
- Player: pressed Hint, then tested (1, 0).
- Hint: "Press **Test this arrow**. Watch where the yellow arrow ends up compared with the green line."
- Message: "The matrix changed (1, 0) to (2, 1). The yellow arrow is no longer on the green line. Can you find a vector that stays on its original line? Change the two numbers in your vector and press **Test this arrow** again."

**3. Line found** — `3-line-found.jpg`
- Player: tested (1, 2) (message: "The matrix changed (1, 2) to (4, 5). The yellow arrow is 12° away from the original line. Try another vector."), then tested (1, 1).
- Question: "That works. The yellow arrow stays on the green line, although its length changes. What number multiplies (1, 1) to give the yellow vector?"
- Below it: "Enter the multiplier and press **Check**."

**4. Wrong answer** — `4-wrong-answer.jpg`
- Player: pressed Hint, then entered 2.
- Hint: "The green vector is (1, 1) and the yellow vector is (3, 3). Find a single number that multiplies both green coordinates to give the yellow coordinates."
- Message: "2(1, 1) = (2, 2) ≠ (3, 3). Neither part matches yellow."
  - This message is **not** in the `P1` block. It comes from `wrongMult` in the same file and still has the old wording.

**5. Correct answer** — `5-correct-answer.jpg`
- Player: entered 3.
- Message: "Correct. 3 × (1, 1) = (3, 3). You've locked this line. You've found one line that works. Now find a different line."

**6. Complete** — `6-complete.jpg`
- Player: tested (2, 2), then (1, −1), then entered 1.
  - After (2, 2): "(2, 2) is twice (1, 1). They lie on the same line. You need a different line, not just a different-sized vector."
- Message: "Both lines found. Watch the grid change: points on either line stay on that line. Points elsewhere change direction."

---

**Not shown this round**

- Zero vector, re-testing the same vector, and the second-line hints after the first.
- Phone layout.

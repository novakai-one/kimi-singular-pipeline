// "Why this answer?" — erase one small square of the drawing at a time,
// re-run the network, and measure how much the top digit's score drops.
// Big drop: the network relied on that ink. Negative drop: that ink pointed elsewhere.
// (This method is called occlusion.)
import { forward, type DigitModel } from './model';

export interface WhyResult {
  target: number;
  drop: Float32Array; // 784, NaN where there is no ink
  maxAbs: number;
}

const PATCH = 1; // erase a 3 x 3 square (centre +- 1)

/** Runs in small chunks across animation frames. onStep gets the square being erased. */
export function occlusion(
  model: DigitModel, input: Float32Array, target: number,
  onStep: (u: number, v: number) => void, isCancelled: () => boolean,
): Promise<WhyResult | null> {
  const base = forward(model, input).logits[target];
  const cells: number[] = [];
  for (let i = 0; i < 784; i++) if (input[i] > 0.12) cells.push(i);
  const drop = new Float32Array(784).fill(NaN);
  const work = new Float32Array(784);
  let k = 0;
  return new Promise((resolve) => {
    const step = () => {
      if (isCancelled()) return resolve(null);
      const end = Math.min(cells.length, k + 10);
      for (; k < end; k++) {
        const c = cells[k];
        const ci = Math.floor(c / 28), cj = c % 28;
        work.set(input);
        for (let di = -PATCH; di <= PATCH; di++) for (let dj = -PATCH; dj <= PATCH; dj++) {
          const i = ci + di, j = cj + dj;
          if (i >= 0 && i < 28 && j >= 0 && j < 28) work[i * 28 + j] = 0;
        }
        drop[c] = base - forward(model, work).logits[target];
        if (k === end - 1) onStep(cj, ci);
      }
      if (k < cells.length) { requestAnimationFrame(step); return; }
      let maxAbs = 1e-6;
      for (const c of cells) maxAbs = Math.max(maxAbs, Math.abs(drop[c]));
      resolve({ target, drop, maxAbs });
    };
    requestAnimationFrame(step);
  });
}

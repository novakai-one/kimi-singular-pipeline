// One interactive per field, loaded on demand so each page stays small.
import type { Viz } from './kit';

export const VIZ: Record<string, () => Promise<{ default: Viz }>> = {
  'how-models-learn': () => import('./gradient'),
  'classic-ml': () => import('./knn'),
  'language-models': () => import('./bigram'),
  'interpretability': () => import('./probe'),
  'computer-vision': () => import('./conv'),
  'reinforcement-learning': () => import('./qlearn'),
  'multi-agent': () => import('./boids'),
  'planning-search': () => import('./search'),
  'optimisation': () => import('./tsp'),
  'generative-models': () => import('./diffusion'),
};

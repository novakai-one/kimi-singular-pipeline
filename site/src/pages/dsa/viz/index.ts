// One step-player visualiser per DSA topic, loaded on demand so each page stays small.
// Each module's default export has the same shape as a field interactive (see ../../fieldviz/kit.ts).
import type { Viz } from '../../fieldviz/kit';

export const DVIZ: Record<string, () => Promise<{ default: Viz }>> = {
  'big-o': () => import('./big-o'),
  'arrays-hashing': () => import('./hashing'),
  'stacks-queues': () => import('./stacks'),
  'recursion-backtracking': () => import('./queens'),
  'sorting-searching': () => import('./sorting'),
  'trees-bst': () => import('./bst'),
  'heaps': () => import('./heap'),
  'graphs': () => import('./graphs'),
  'greedy': () => import('./greedy'),
  'dynamic-programming': () => import('./editdistance'),
};

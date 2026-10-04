// Checks that each Field Card challenge can be won, and that the numbers in the text are right.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bfs, astar, trapWalls, EMPTY_COUNTS, COLS, ROWS } from '../../site/src/pages/fieldviz/search-core.ts';

test('search: A* checks far fewer squares than BFS on an empty grid; the trap triples A*', () => {
  const empty = new Uint8Array(COLS * ROWS);
  const a = astar(empty), b = bfs(empty);
  console.log(`  empty grid: BFS ${b.order.length}, A* ${a.order.length}, path ${a.path.length - 1}`);
  assert.equal(a.path.length, b.path.length);
  assert.ok(a.order.length < b.order.length / 4, 'less than a quarter (matches the prediction text)');
  const t = trapWalls();
  const at = astar(t), bt = bfs(t);
  console.log(`  trap: BFS ${bt.order.length}, A* ${at.order.length} (${(at.order.length / EMPTY_COUNTS.astar).toFixed(1)}x), path ${at.path.length - 1}`);
  assert.ok(at.order.length >= 3 * EMPTY_COUNTS.astar);
  assert.equal(at.path.length, bt.path.length, 'A* still finds a shortest path');
});

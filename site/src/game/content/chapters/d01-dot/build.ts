import type { BuildDef } from '../../../game/types';
import { rng } from '../../../game/lawcheck';
import { COPY } from './copy';
import { buildCases } from './logic.ts';

// Exactly 200 chapter-local cases, bypassing the shared 20/100/300 swarm policy.
export const build: BuildDef = {
  id: 'd01-dot-build', fn: 'dot', title: COPY.build.title, brief: COPY.build.brief,
  solution: COPY.build.solution,
  starter: COPY.build.solution.split('\n')[0] + '\n',
  assemble: { lines: COPY.build.solution.split('\n'), decoys: [COPY.build.decoy] },
  tests: buildCases(rng(0xd01)),
};

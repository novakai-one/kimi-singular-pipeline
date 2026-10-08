import type { ChapterDef } from '../../../game/types';
import reference from '../c01-vectors';
import { bridgeShot } from '../../common/shots';
import { COPY } from './copy';
import { p1, p2 } from './puzzles';
import { sayit, doubt, law, compare } from './briefing';
import { build } from './build';
import { installPlumbing } from './plumbing';

installPlumbing();
const chapter: ChapterDef = {
  id: 'd01-dot', dev: true, act: reference.act, num: reference.num,
  title: COPY.title, nodes: ['N05'],
  beats: [
    { kind: 'scene', id: 'open', lines: COPY.open, setup: bridgeShot },
    { kind: 'puzzle', id: 'p1', puzzle: p1 },
    { kind: 'name', id: 'name-dot', entry: COPY.entry },
    { kind: 'scene', id: 'p2-intro', lines: COPY.intro, setup: bridgeShot },
    { kind: 'puzzle', id: 'p2', puzzle: p2 },
    { kind: 'sayit', id: 'sayit', sayit },
    { kind: 'doubt', id: 'doubt', doubt },
    { kind: 'law', id: 'law', law },
    { kind: 'compare', id: 'compare', compare },
    { kind: 'build', id: 'dot', build },
  ],
};
export default chapter;

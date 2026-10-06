// Acts of the story (GDD §6.1). Act 10 is the Epilogue.
import type { ActDef } from '../game/types';

export const ACTS: ActDef[] = [
  { num: 0, title: 'Prologue', subtitle: 'The first pulse', palette: 'void' },
  { num: 1, title: 'Drift', subtitle: 'Arrows, combinations, reach', palette: 'default' },
  { num: 2, title: 'Signal', subtitle: 'Measuring space', palette: 'teal' },
  { num: 3, title: 'The Ledger', subtitle: 'Solving', palette: 'gold' },
  { num: 4, title: 'The Pulse', subtitle: 'Moving space', palette: 'violet' },
  { num: 5, title: 'Collapse', subtitle: 'Spaces inside spaces', palette: 'ember' },
  { num: 6, title: 'The Wrong Grid', subtitle: 'Coordinates', palette: 'copper' },
  { num: 7, title: 'Lines That Hold', subtitle: 'Directions a move does not turn', palette: 'teal' },
  { num: 8, title: 'Shadows', subtitle: 'Closest points', palette: 'default' },
  { num: 9, title: 'Singular', subtitle: 'The shape of data', palette: 'void' },
  { num: 10, title: 'Epilogue', subtitle: 'Every point stays where it is', palette: 'gold' },
];

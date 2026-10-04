// Placeholder until this topic's visualiser is written.
import { h } from '../../../lib/dom';
import type { Viz } from '../../fieldviz/kit';

const viz: Viz = (el) => {
  el.append(h('div', { class: 'note-building' }, 'This visualiser is being built.'));
  return { showMe() {} };
};
export default viz;

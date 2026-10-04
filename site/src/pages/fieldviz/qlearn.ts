// Placeholder: being built.
import { h } from '../../lib/dom';
import type { Viz } from './kit';

const viz: Viz = (el) => {
  el.append(h('div', { class: 'note-building' }, 'This interactive is being built.'));
  return { showMe() {} };
};
export default viz;

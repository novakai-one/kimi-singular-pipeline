import { mountLayout } from '../../lib/layout';
import { pageHead } from '../../lib/blocks';
import { h } from '../../lib/dom';

const page = mountLayout({ crumbs: [{ label: 'Showpiece' }], wide: true });
page.append(pageHead('Showpiece', 'Draw a digit, look inside'), h('div', { class: 'note-building' }, 'Being built.'));

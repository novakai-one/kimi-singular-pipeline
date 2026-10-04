import { mountLayout } from '../lib/layout';
import { pageHead } from '../lib/blocks';
import { h } from '../lib/dom';

const page = mountLayout({ crumbs: [{ label: 'Path Map' }] });
page.append(pageHead('Being built', 'Path Map'), h('div', { class: 'note-building' }, 'This page is being built. Every other page is open in the menu.'));

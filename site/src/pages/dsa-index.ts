import { mountLayout } from '../lib/layout';
import { pageHead } from '../lib/blocks';
import { h } from '../lib/dom';

const page = mountLayout({ crumbs: [{ label: 'DSA track' }] });
page.append(pageHead('Being built', 'DSA track'), h('div', { class: 'note-building' }, 'This page is being built. Every other page is open in the menu.'));

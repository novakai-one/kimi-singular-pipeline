import { mountLayout } from '../lib/layout';
import { pageHead } from '../lib/blocks';
import { h } from '../lib/dom';

const page = mountLayout({ crumbs: [{ label: 'Spark Log' }] });
page.append(pageHead('Being built', 'Spark Log'), h('div', { class: 'note-building' }, 'This page is being built. Every other page is open in the menu.'));

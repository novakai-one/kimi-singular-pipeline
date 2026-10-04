import { mountLayout } from '../lib/layout';
import { pageHead } from '../lib/blocks';
import { h } from '../lib/dom';
import reg from '../data/registry.json';

const slug = document.body.dataset.slug;
const d = reg.dsa.find((x) => x.slug === slug)!;
const page = mountLayout({ crumbs: [{ label: 'DSA track', href: 'dsa/index.html' }, { label: d.title }] });
page.append(pageHead(`DSA ${d.num}`, d.title, d.sub), h('div', { class: 'note-building' }, 'This topic is being built.'));

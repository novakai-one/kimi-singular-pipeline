import { mountLayout } from '../lib/layout';
import { pageHead } from '../lib/blocks';
import { h } from '../lib/dom';
import reg from '../data/registry.json';

const slug = document.body.dataset.slug;
const f = reg.fields.find((x) => x.slug === slug)!;
const page = mountLayout({ crumbs: [{ label: 'Fields', href: 'path-map.html' }, { label: f.title }] });
page.append(pageHead(`Field ${f.num}`, f.title, f.question), h('div', { class: 'note-building' }, 'This field card is being built.'));

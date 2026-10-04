// Shared page shell: sidebar listing every page (always), top bar, theme toggle.
import '../styles/base.css';
import reg from '../data/registry.json';
import { h } from './dom';
import { url } from './config';

export type Crumb = { label: string; href?: string };

interface NavItem { label: string; href: string; key: string; num?: number; dot?: string }

function navGroups(): { title: string; items: NavItem[] }[] {
  return [
    {
      title: 'Start',
      items: [
        { label: 'Home', href: 'index.html', key: 'home', dot: 'neutral' },
        { label: 'Path Map', href: 'path-map.html', key: 'path-map', dot: 'neutral' },
        { label: 'Spark Log', href: 'spark-log.html', key: 'spark-log', dot: 'neutral' },
      ],
    },
    {
      title: 'Showpieces',
      items: [
        { label: 'Draw a digit, look inside', href: 'demo/digits.html', key: 'digits', dot: 'learn' },
        { label: 'A tiny language model', href: 'demo/tiny-lm.html', key: 'tinylm', dot: 'learn' },
      ],
    },
    {
      title: 'Fields',
      items: reg.fields.map((f) => ({
        label: f.title, href: `fields/${f.slug}.html`, key: `field:${f.slug}`, num: f.num, dot: f.idea,
      })),
    },
    {
      title: 'DSA track',
      items: [
        { label: 'Overview', href: 'dsa/index.html', key: 'dsa-index' },
        ...reg.dsa.map((d) => ({ label: d.title, href: `dsa/${d.slug}.html`, key: `dsa:${d.slug}`, num: d.num })),
      ],
    },
  ];
}

function currentKey(): string {
  const page = document.body.dataset.page ?? '';
  const slug = document.body.dataset.slug;
  if (page === 'field') return `field:${slug}`;
  if (page === 'dsa-topic') return `dsa:${slug}`;
  return page;
}

function effectiveTheme(): 'light' | 'dark' {
  const t = document.documentElement.dataset.theme;
  if (t === 'light' || t === 'dark') return t;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function themeButton(): HTMLButtonElement {
  const btn = h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Switch light or dark theme', title: 'Light / dark' });
  const paint = () => { btn.textContent = effectiveTheme() === 'dark' ? '☀ Light' : '☾ Dark'; };
  btn.addEventListener('click', () => {
    const next = effectiveTheme() === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('afe-theme', next); } catch { /* storage blocked: theme still switches */ }
    paint();
    window.dispatchEvent(new Event('afe-theme'));
  });
  paint();
  return btn;
}

export interface LayoutOpts { crumbs?: Crumb[]; wide?: boolean }

/** Build the page shell. Returns the element to put page content in. */
export function mountLayout(opts: LayoutOpts = {}): HTMLElement {
  const key = currentKey();
  const app = document.getElementById('app')!;

  const sidebar = h('nav', { class: 'sidebar', 'aria-label': 'All pages' },
    h('a', { class: 'brand', href: url('index.html') },
      h('span', { class: 'brand-dots', 'aria-hidden': 'true' },
        h('i', { style: 'background:var(--learn)' }), h('i', { style: 'background:var(--search)' }),
        h('i', { style: 'background:var(--act)' }), h('i', { style: 'background:var(--yellow)' })),
      'AI Field Explorer'),
    navGroups().map((g) => [
      h('div', { class: 'nav-group' }, g.title),
      g.items.map((it) =>
        h('a', { class: 'nav-link' + (it.key === key ? ' active' : ''), href: url(it.href), 'aria-current': it.key === key ? 'page' : null },
          it.num !== undefined ? h('span', { class: 'nav-num' }, it.num) : null,
          it.dot ? h('span', { class: `nav-dot dot-${it.dot}`, 'aria-hidden': 'true' }) : null,
          h('span', null, it.label))),
    ]),
    h('div', { class: 'nav-group', style: 'margin-top:22px' }, 'Big ideas'),
    h('div', { style: 'padding: 2px 8px; display:grid; gap:4px; font-size:13px; color:var(--muted)' },
      h('span', null, h('span', { class: 'nav-dot dot-search', style: 'display:inline-block;margin-right:8px' }), 'Search'),
      h('span', null, h('span', { class: 'nav-dot dot-learn', style: 'display:inline-block;margin-right:8px' }), 'Learning from data'),
      h('span', null, h('span', { class: 'nav-dot dot-act', style: 'display:inline-block;margin-right:8px' }), 'Acting over time')),
  );

  const menuBtn = h('button', { class: 'icon-btn menu-btn', type: 'button', 'aria-label': 'Show all pages' }, '☰');
  menuBtn.addEventListener('click', () => document.body.classList.toggle('nav-open'));
  document.addEventListener('click', (e) => {
    if (!document.body.classList.contains('nav-open')) return;
    if (!sidebar.contains(e.target as Node) && e.target !== menuBtn) document.body.classList.remove('nav-open');
  });

  const crumbs = opts.crumbs ?? [];
  const topbar = h('header', { class: 'topbar' },
    menuBtn,
    h('div', { class: 'crumbs' },
      h('a', { href: url('index.html') }, 'Home'),
      crumbs.map((c) => [' / ', c.href ? h('a', { href: url(c.href) }, c.label) : h('span', null, c.label)])),
    h('div', { class: 'spacer' }),
    themeButton());

  const page = h('article', { class: 'page' + (opts.wide ? ' wide' : '') });
  app.replaceChildren(h('div', { class: 'app' }, sidebar, h('div', { class: 'main' }, topbar, page)));
  return page;
}

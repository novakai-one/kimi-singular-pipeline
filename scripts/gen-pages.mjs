// Writes the thin HTML shell for every page of the site.
// Page content lives in TypeScript (site/src). Each shell only says
// which script to run and where the site root is (for relative links).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const site = join(here, '..', 'site');
const reg = JSON.parse(readFileSync(join(site, 'src/data/registry.json'), 'utf8'));

const pages = [
  { path: 'index.html', title: 'AI Field Explorer', script: 'home', page: 'home' },
  { path: 'demo/digits.html', title: 'Draw a digit, look inside', script: 'digits/main', page: 'digits' },
  { path: 'demo/tiny-lm.html', title: 'A tiny language model you can see inside', script: 'tinylm/main', page: 'tinylm' },
  { path: 'path-map.html', title: 'Path Map', script: 'path-map', page: 'path-map' },
  { path: 'spark-log.html', title: 'Spark Log', script: 'spark-log', page: 'spark-log' },
  { path: 'dsa/index.html', title: 'DSA track', script: 'dsa-index', page: 'dsa-index' },
  ...reg.fields.map((f) => ({
    path: `fields/${f.slug}.html`, title: f.title, script: 'field', page: 'field', slug: f.slug,
  })),
  ...reg.dsa.map((d) => ({
    path: `dsa/${d.slug}.html`, title: d.title, script: 'dsa-topic', page: 'dsa-topic', slug: d.slug,
  })),
];

const themeBoot = `try{var t=localStorage.getItem('afe-theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t;}catch(e){}`;

for (const p of pages) {
  const depth = p.path.split('/').length - 1;
  const root = depth === 0 ? './' : '../'.repeat(depth);
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${p.page === 'home' ? p.title : `${p.title} · AI Field Explorer`}</title>
<meta name="afe-root" content="${root}">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Ccircle cx='9' cy='16' r='5' fill='%237c4ddb'/%3E%3Ccircle cx='23' cy='9' r='5' fill='%232f6fdd'/%3E%3Ccircle cx='23' cy='23' r='5' fill='%230f9488'/%3E%3C/svg%3E">
<script>${themeBoot}</script>
</head>
<body data-page="${p.page}"${p.slug ? ` data-slug="${p.slug}"` : ''}>
<div id="app"></div>
<noscript>This page needs JavaScript turned on.</noscript>
<script type="module" src="${root}src/pages/${p.script}.ts"></script>
</body>
</html>
`;
  const out = join(site, p.path);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, html);
}
console.log(`gen-pages: wrote ${pages.length} pages`);

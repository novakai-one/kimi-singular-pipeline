import { defineConfig } from 'vite';
import { readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

const root = resolve(here, 'site');

// Every .html file under site/ is a page (multi-page app).
function findPages(dir: string, out: Record<string, string> = {}): Record<string, string> {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (name === 'node_modules' || name === 'public' || name === 'src') continue;
    if (statSync(full).isDirectory()) findPages(full, out);
    else if (name.endsWith('.html')) out[relative(root, full).replace(/\.html$/, '')] = full;
  }
  return out;
}

export default defineConfig({
  root,
  base: './', // relative URLs: works on GitHub Pages under any sub-path
  build: {
    outDir: resolve(here, 'dist'),
    emptyOutDir: true,
    rollupOptions: { input: findPages(root) },
    chunkSizeWarningLimit: 1200,
  },
  server: { port: 5173 },
});

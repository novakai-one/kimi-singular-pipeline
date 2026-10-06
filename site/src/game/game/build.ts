// The builder thread: the player writes a function (Python by default, real Python 3 via Pyodide;
// JavaScript also supported), tests run in a Web Worker with a time limit, and a passing function
// joins the player's library. Later chapters inject library functions by name, and the game can
// call them (pylib.call / lib.call) to drive real systems.
// Nothing here blocks: Show solution and Skip are always available, and a missing or failing
// function falls back to the reference version.
import type { BuildDef, Game } from './types';
import type { Hud } from './hud';
import { h, md, inline, button } from '../ui/ui';
import { S, save } from '../core/save';
import { sfx } from '../audio/sfx';
import { runPythonTests, callPython, warmPython, pythonState } from './pyrunner';

const REF = new Map<string, string>();      // reference solutions by function name
const LANG = new Map<string, 'python' | 'js'>();
const PASSING = 'buildPassing';

/** Register every BuildDef (called once at boot from the chapter registry). */
export function registerBuild(def: BuildDef): void { REF.set(def.fn, def.solution); LANG.set(def.fn, def.lang ?? 'python'); }

function passing(): Record<string, boolean> {
  return ((S().flags[PASSING] as Record<string, boolean>) ??= {});
}

/** Source for a library function: the player's if it passed its tests, otherwise the reference. */
export function libSource(fn: string): string | null {
  const own = S().code[fn];
  if (own && passing()[fn]) return own;
  return REF.get(fn) ?? null;
}

export function isPlayerFn(fn: string): boolean { return !!(S().code[fn] && passing()[fn]); }

const compiled = new Map<string, { src: string; f: (...a: unknown[]) => unknown }>();

/** Call a library function on the main thread (player version if passing, else reference). */
export const lib = {
  call<T = unknown>(fn: string, ...args: unknown[]): T {
    const src = libSource(fn);
    if (!src) throw new Error(`no library function ${fn}`);
    let c = compiled.get(fn);
    if (!c || c.src !== src) {
      const deps = [...REF.keys()].filter((k) => k !== fn && LANG.get(k) === 'js').map((k) => libSource(k)).filter(Boolean).join('\n');
      // eslint-disable-next-line no-new-func
      const f = new Function(`${deps}\n${src}\nreturn ${fn};`)() as (...a: unknown[]) => unknown;
      c = { src, f };
      compiled.set(fn, c);
    }
    try {
      return c.f(...structuredClone(args)) as T;
    } catch {
      const ref = REF.get(fn)!;
      // eslint-disable-next-line no-new-func
      const f = new Function(`${ref}\nreturn ${fn};`)() as (...a: unknown[]) => unknown;
      return f(...args) as T;
    }
  },
  has(fn: string): boolean { return !!libSource(fn); },
  mine: isPlayerFn,
};

/** Python library: every registered Python function (the player's where passing), in order. */
function pyLibrary(except?: string): string {
  return [...REF.keys()].filter((k) => k !== except && LANG.get(k) === 'python').map((k) => libSource(k)).filter(Boolean).join('\n\n');
}

/** Call a Python library function (async: it runs in the Python worker). Falls back to the reference. */
export const pylib = {
  async call<T = unknown>(fn: string, ...args: unknown[]): Promise<T> {
    const r = await callPython(pyLibrary(), fn, args);
    if (r.error === undefined) return r.value as T;
    const ref = REF.get(fn);
    if (!ref) throw new Error(r.error);
    const r2 = await callPython(`${pyLibrary(fn)}\n\n${ref}`, fn, args);
    if (r2.error) throw new Error(r2.error);
    return r2.value as T;
  },
  warm: warmPython,
  state: pythonState,
};

/** Every function in the player's library, as one file (for export). */
export function exportLibrary(): string {
  const head = '# basis.py: the functions you wrote while playing SINGULAR.\n# Each one passed its tests in the game.\n\nimport math\n';
  return head + [...REF.keys()].filter((k) => LANG.get(k) === 'python').map((k) => {
    const own = S().code[k];
    return own && passing()[k] ? own : `# ${k}: not written yet. Reference version:\n${REF.get(k)}`;
  }).join('\n\n');
}

const WORKER_SRC = `
const close = (a, b, tol) => {
  if (typeof a === 'number' && typeof b === 'number') return Math.abs(a - b) <= tol || (Number.isNaN(a) && Number.isNaN(b));
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((x, i) => close(x, b[i], tol));
  if (a && b && typeof a === 'object' && typeof b === 'object') { const ka = Object.keys(a), kb = Object.keys(b); return ka.length === kb.length && ka.every((k) => close(a[k], b[k], tol)); }
  return a === b;
};
const show = (x) => { try { return JSON.stringify(x, (k, v) => typeof v === 'number' ? Math.round(v * 1e6) / 1e6 : v); } catch { return String(x); } };
self.onmessage = (e) => {
  const { libSrc, code, fn, tests } = e.data;
  const out = [];
  let f;
  try {
    f = new Function(libSrc + '\\n' + code + '\\n;return typeof ' + fn + " === 'function' ? " + fn + ' : undefined;')();
  } catch (err) { self.postMessage({ error: 'Your code has a syntax error: ' + err.message }); return; }
  if (!f) { self.postMessage({ error: 'Define a function named ' + fn + '.' }); return; }
  for (const t of tests) {
    try {
      const got = f(...JSON.parse(JSON.stringify(t.args)));
      out.push({ name: t.name, ok: close(got, t.expect, t.tol ?? 1e-6), got: show(got), want: show(t.expect) });
    } catch (err) { out.push({ name: t.name, ok: false, got: 'error: ' + err.message, want: show(t.expect) }); }
  }
  self.postMessage({ results: out });
};`;

interface TestResult { name: string; ok: boolean; got: string; want: string }

export async function runTests(def: BuildDef, code: string, timeoutMs = 2000): Promise<{ error?: string; results?: TestResult[]; stdout?: string }> {
  if ((def.lang ?? 'python') === 'python') {
    const lib = (def.uses ?? []).map((u) => libSource(u)).filter(Boolean).join('\n\n');
    return runPythonTests(lib, code, def.fn, def.tests, Math.max(timeoutMs, 4000));
  }
  return new Promise((resolve) => {
    let w: Worker;
    try {
      w = new Worker(URL.createObjectURL(new Blob([WORKER_SRC], { type: 'text/javascript' })));
    } catch {
      resolve({ error: 'This browser blocked the code runner (Web Workers).' });
      return;
    }
    const timer = window.setTimeout(() => { w.terminate(); resolve({ error: `Your code ran for more than ${timeoutMs / 1000} s. Is there a loop that never ends?` }); }, timeoutMs);
    w.onmessage = (e) => { window.clearTimeout(timer); w.terminate(); resolve(e.data); };
    w.onerror = (e) => { window.clearTimeout(timer); w.terminate(); resolve({ error: e.message }); };
    const libSrc = (def.uses ?? []).map((u) => libSource(u)).filter(Boolean).join('\n');
    w.postMessage({ libSrc, code, fn: def.fn, tests: def.tests });
  });
}

/** Tiny highlighter for the editor overlay (comments, keywords, numbers). */
function highlight(src: string, lang: 'python' | 'js'): string {
  const esc = src.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const comment = lang === 'python' ? /(#[^\n]*)/g : /(\/\/[^\n]*)/g;
  const kw = lang === 'python'
    ? /\b(def|return|for|in|if|elif|else|while|and|or|not|import|from|as|True|False|None|lambda|range|len|sum|zip|abs|min|max|enumerate|math|print)\b(?![^<]*<\/span>)/g
    : /\b(function|return|const|let|var|for|while|if|else|of|in|new|true|false|null|undefined|Math)\b(?![^<]*<\/span>)/g;
  return esc
    .replace(comment, '<span class="hl-c">$1</span>')
    .replace(kw, '<span class="hl-k">$1</span>')
    .replace(/\b(\d+\.?\d*)\b(?![^<]*<\/span>)/g, '<span class="hl-n">$1</span>') + '\n';
}

export async function runBuild(g: Game, def: BuildDef, hud: Hud): Promise<void> {
  const lang = def.lang ?? 'python';
  if (lang === 'python') warmPython();
  const indent = lang === 'python' ? '    ' : '  ';
  const saved = S().code[def.fn];
  const ta = h('textarea', { class: 'code-ta', spellcheck: 'false', autocapitalize: 'off', autocomplete: 'off', 'aria-label': `Code for ${def.fn}` }) as HTMLTextAreaElement;
  const pre = h('pre', { class: 'code-hl', 'aria-hidden': 'true' });
  ta.value = saved ?? def.starter;
  const sync = () => { pre.innerHTML = highlight(ta.value, lang); pre.scrollTop = ta.scrollTop; pre.scrollLeft = ta.scrollLeft; };
  ta.addEventListener('input', sync);
  ta.addEventListener('scroll', sync);
  ta.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const s = ta.selectionStart, en = ta.selectionEnd;
      ta.value = `${ta.value.slice(0, s)}${indent}${ta.value.slice(en)}`;
      ta.selectionStart = ta.selectionEnd = s + indent.length;
      sync();
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); void run(); }
    e.stopPropagation();
  });
  sync();
  const results = h('div', { class: 'test-results' });
  const status = h('div', { class: 'build-status' });
  const stdout = h('pre', { class: 'build-stdout' });
  stdout.hidden = true;
  if (lang === 'python' && pythonState() !== 'ready') status.innerHTML = '<span class="c-muted">Starting Python…</span>';
  const uses = (def.uses ?? []).length
    ? h('div', { class: 'c-muted build-uses', html: inline(`You can call: ${def.uses!.map((u) => `\`${u}\`${isPlayerFn(u) ? ' (yours)' : ''}`).join(', ')}`) })
    : null;

  for (const t of def.tests) results.appendChild(h('div', { class: 'test' }, h('span', { class: 'mark c-muted' }, '·'), h('span', { class: 'tname', html: inline(t.name) })));
  let passed = false;
  const run = async () => {
    status.textContent = lang === 'python' && pythonState() !== 'ready' ? 'Starting Python (first run takes a few seconds)…' : 'Running…';
    const r = await runTests(def, ta.value);
    results.replaceChildren();
    stdout.hidden = !r.stdout;
    stdout.textContent = r.stdout ? `print output:\n${r.stdout}` : '';
    if (r.error) { status.innerHTML = `<span class="c-red">${r.error}</span>`; sfx.miss(); return; }
    const all = r.results ?? [];
    const n = all.filter((x) => x.ok).length;
    for (const t of all) {
      results.appendChild(h('div', { class: `test ${t.ok ? 'ok' : 'fail'}` },
        h('span', { class: 'mark' }, t.ok ? '✓' : '✗'),
        h('span', { class: 'tname', html: inline(t.name) }),
        t.ok ? null : h('span', { class: 'tdiff' }, `got ${t.got}, want ${t.want}`)));
    }
    passed = n === all.length;
    status.innerHTML = passed ? `<span class="c-green">All ${n} tests pass. This function is now part of your library.</span>` : `<span>${n} of ${all.length} tests pass.</span>`;
    S().code[def.fn] = ta.value;
    passing()[def.fn] = passed;
    save();
    if (passed) sfx.solved(); else sfx.miss();
  };

  const box = h('div', { class: 'build glass' },
    h('div', { class: 'build-left' },
      h('div', { class: 'kicker' }, `Build · ${def.fn}() · ${lang === 'python' ? 'Python' : 'JavaScript'}`),
      h('h2', { html: inline(def.title) }),
      h('div', { class: 'build-brief', html: md(def.brief) }),
      uses,
      h('div', { class: 'kicker', style: 'margin-top:14px' }, 'Tests'),
      results,
      def.payoff ? h('div', { class: 'build-payoff', html: md(`**What it powers:** ${def.payoff}`) }) : null),
    h('div', { class: 'build-right' },
      h('div', { class: 'code-wrap' }, pre, ta),
      status,
      stdout,
      h('div', { class: 'build-actions' },
        button('Run tests', () => void run(), { cls: 'primary small', kbd: 'Ctrl+Enter' }),
        button('Show solution', () => { ta.value = def.solution; sync(); void run(); }, { cls: 'small' }),
        button('Start over', () => { ta.value = def.starter; sync(); }, { cls: 'ghost small' }))));
  box.style.pointerEvents = 'auto';
  g.ui.scene.appendChild(box);
  ta.focus();
  await hud.primary(passed ? 'Continue' : 'Continue');
  if (!passed && ta.value !== def.starter) { S().code[def.fn] = ta.value; save(); }
  box.remove();
}

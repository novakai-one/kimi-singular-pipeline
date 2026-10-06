// The Briefing engines (GDD §4): chapter cards, Say it, Bram's Doubts with the Shake, Laws with the
// Proving Ground, Compare with the model page, and Procedures. Nothing is graded as free text;
// everything is checked by consequence. Every step has Show me and Skip.
import type { CardDef, CompareDef, DoubtDef, DoubtScene, Game, LawDef, ProcedureDef, PuzzleCtx, ReviewDef, SayItDef } from './types';
import type { Hud } from './hud';
import { h, inline, md, button } from '../ui/ui';
import { tex } from '../../lib/md';
import { ChoiceCards } from '../ui/widgets';
import { S, save, chapterSave, type ManualPage } from '../core/save';
import { cast } from '../ui/dialogue';
import { sfx } from '../audio/sfx';
import { wait } from '../core/tween';
import { TileOrder } from '../kit/steps';

import { rng, checkLaw } from './lawcheck';
export { rng, checkLaw };

/** What the runner lends the Briefing engines. */
export interface BriefingHost {
  g: Game;
  hud: Hud;
  /** Mount an empty holotable scene with a puzzle context (world cleared, view set). */
  mount(view: '2d' | '3d'): Promise<{ p: PuzzleCtx; done: () => void }>;
  guard<T>(p: Promise<T>): Promise<T>;
  chapterId: string;
}

/** Test hooks: the debug API resolves the active Briefing step through these. */
export const briefingTest: { solve: (() => Promise<boolean>) | null; kind: string | null } = { solve: null, kind: null };

function panel(cls: string): HTMLElement {
  const el = h('div', { class: `brief ${cls} glass` });
  el.style.pointerEvents = 'auto';
  return el;
}

// ------------------------------------------------------------------ cards

export async function runCard(host: BriefingHost, c: CardDef): Promise<void> {
  const { g, hud } = host;
  hud.hideObjective();
  if (c.visual) await host.guard(Promise.resolve(c.visual(g)));
  const kicker = c.kind === 'inshort' ? 'In short' : c.kind === 'why' ? 'Why it matters' : c.kind === 'numpy' ? 'In NumPy' : 'Before you start';
  const el = panel(`card-${c.kind}`);
  el.append(
    h('div', { class: 'kicker' }, kicker),
    h('h2', { html: inline(c.title) }),
    h('div', { class: 'card-body', html: md(c.body) }),
    ...(c.code ? [h('pre', { class: 'card-code' }, c.code)] : []),
    ...(c.cue ? [h('div', { class: 'name-cue', html: md(c.cue) })] : []));
  g.ui.scene.appendChild(el);
  if (c.kind === 'inshort') sfx.open();
  briefingTest.kind = 'card';
  briefingTest.solve = async () => true;
  try { await host.guard(hud.primary('Continue')); } finally { el.remove(); briefingTest.solve = null; }
}

// ------------------------------------------------------------------ Say it (the Field Manual page, written first)

const SLOTS: { key: keyof Omit<ManualPage, 'ticks' | 'at' | 'first'>; label: string }[] = [
  { key: 'see', label: 'What you see' },
  { key: 'means', label: 'What it means' },
  { key: 'called', label: 'What it is called' },
  { key: 'cue', label: 'When you see ___, think ___' },
];

export function manualPage(id: string): ManualPage {
  return (S().manual[id] ??= { see: '', means: '', called: '', cue: '', ticks: [], at: Date.now() });
}

export async function runSayIt(host: BriefingHost, d: SayItDef): Promise<void> {
  const { g, hud } = host;
  hud.hideObjective();
  await host.guard(g.say([[d.who, d.ask]]));
  const page = manualPage(d.id);
  const el = panel('sayit');
  const areas = SLOTS.map((s) => {
    const ta = h('textarea', { class: 'own-words', rows: 2, 'aria-label': s.label }) as HTMLTextAreaElement;
    ta.value = page[s.key];
    ta.addEventListener('input', () => { page[s.key] = ta.value; page.at = Date.now(); save(); });
    ta.addEventListener('keydown', (e) => e.stopPropagation());
    return { s, ta };
  });
  const bank = h('div', { class: 'word-bank' });
  bank.hidden = true;
  const help = button('Help me start', () => {
    bank.hidden = false;
    areas.forEach(({ s, ta }) => { const f = d.frames?.[s.key]; if (f && !ta.value) ta.placeholder = f; });
    help.disabled = true;
  }, { cls: 'ghost small' });
  for (const w of d.wordBank ?? []) {
    const chip = h('button', { class: 'chip', type: 'button' }, w);
    chip.addEventListener('click', () => {
      const ta = (document.activeElement instanceof HTMLTextAreaElement ? document.activeElement : areas[1].ta) as HTMLTextAreaElement;
      ta.value = `${ta.value}${ta.value && !ta.value.endsWith(' ') ? ' ' : ''}${w}`;
      ta.dispatchEvent(new Event('input'));
      ta.focus();
    });
    bank.appendChild(chip);
  }
  el.append(
    h('div', { class: 'kicker' }, `Field Manual · your page`),
    h('div', { class: 'sayit-ask', html: `<span style="color:${cast(d.who).color}">${cast(d.who).name}:</span> ${inline(d.ask)}` }),
    h('p', { class: 'c-muted', style: 'font-size:13px;margin:4px 0 8px' }, 'Write first. Nothing here is marked. Ilse\'s page comes after, so you can compare.'),
    ...areas.map(({ s, ta }) => h('label', { class: 'slot' }, h('span', { class: 'slot-label' }, s.label), ta)),
    h('div', { style: 'display:flex;gap:8px;align-items:center;flex-wrap:wrap' }, help, bank));
  g.ui.scene.appendChild(el);
  areas[0].ta.focus();
  briefingTest.kind = 'sayit';
  briefingTest.solve = async () => true;
  try { await host.guard(hud.primary('Save page')); } finally { el.remove(); briefingTest.solve = null; }
  if (!page.first && (page.see || page.means)) { page.first = { see: page.see, means: page.means, called: page.called, cue: page.cue, at: page.at }; save(); }
  if (SLOTS.some((s) => page[s.key].trim())) g.toast('Saved to your Field Manual', 'Field Manual');
}

// ------------------------------------------------------------------ Doubts and the Shake

const SHAKES = { cadet: 2, navigator: 5, commander: 10 } as const;

export async function runDoubt(host: BriefingHost, d: DoubtDef, opts: { kicker?: string } = {}): Promise<{ stance: 'challenge' | 'back' | null; right: boolean; skipped: boolean }> {
  const { g, hud } = host;
  const m = await host.mount(d.view ?? '2d');
  const { p } = m;
  let scene: DoubtScene;
  try { scene = await d.setup(p); } catch (e) { m.done(); throw e; }
  const who = cast(d.who);
  const kicker = opts.kicker ?? `${who.name}'s doubt`;
  hud.setObjective(kicker, `${d.goal ?? `Decide: **Challenge it** (build a case where it fails) or **Back it** (build a case where it holds; then ${who.name} shakes it).`}`);
  const card = panel('doubt');
  const verdict = h('div', { class: 'doubt-verdict' });
  let stance: 'challenge' | 'back' | null = null;
  let firstStance: 'challenge' | 'back' | null = null;
  let finished = false;
  let outcome = { stance: null as 'challenge' | 'back' | null, right: false, skipped: true };
  let resolveDone!: () => void;
  const done = new Promise<void>((r) => { resolveDone = r; });
  const shaking = { on: false };

  const finish = (right: boolean, text: string) => {
    finished = true;
    outcome = { stance: firstStance, right: right && firstStance === (d.isTrue ? 'back' : 'challenge'), skipped: false };
    if (firstStance) S().doubts[d.id] = { stance: firstStance, right, at: Date.now() };
    save();
    verdict.innerHTML = `<div class="kicker ${right ? 'c-green' : 'c-yellow'}">${right ? 'Settled' : 'Settled, with a lesson'}</div>${md(text)}`;
    actions.replaceChildren();
    if (right) sfx.solved(); else sfx.success();
    void hud.primary('Continue').then(resolveDone);
  };

  const challenge = async () => {
    if (finished || shaking.on) return;
    stance ??= 'challenge'; firstStance ??= 'challenge';
    p.move();
    shaking.on = true;
    await scene.play?.();
    shaking.on = false;
    if (!scene.holds()) {
      if (!d.isTrue) {
        finish(true, `**${who.name}:** “Noted. That one is wrong.”\n\nYour case: ${scene.describe()}.\n\n${d.reason}`);
      } else {
        // a true claim cannot fail; holds() is the author's predicate, so this is defensive
        finish(false, d.reason);
      }
    } else {
      sfx.miss();
      verdict.innerHTML = md(`This case agrees with the claim: ${scene.describe()}. Try another, or **back it** instead.`);
      if (d.isTrue) giveUp.hidden = false;
    }
  };

  const back = async () => {
    if (finished || shaking.on) return;
    stance ??= 'back'; firstStance ??= 'back';
    p.move();
    shaking.on = true;
    await scene.play?.();
    shaking.on = false;
    if (!scene.holds()) {
      sfx.miss();
      verdict.innerHTML = md(`Your own case breaks it: ${scene.describe()}. That is a counterexample. You could **challenge** it instead.`);
      return;
    }
    shaking.on = true;
    const n = SHAKES[p.difficulty];
    const edges = d.isTrue ? (p.difficulty === 'cadet' ? 0 : p.difficulty === 'navigator' ? Math.min(1, scene.edgeCases ?? 0) : scene.edgeCases ?? 0) : scene.edgeCases ?? 0;
    const r = rng(0x5eed + d.id.length * 97 + (Object.keys(S().doubts).length + 1) * 13);
    verdict.innerHTML = md(`**${who.name}** shakes it.`);
    let broke: string | null = null;
    let count = 0;
    for (let i = 0; i < n + edges; i++) {
      await scene.randomize(r, i < edges ? i : undefined);
      await scene.play?.();
      count++;
      verdict.innerHTML = md(`**${who.name}** shakes it. Case ${count}: ${scene.describe()}`);
      sfx.tick(i % 5);
      await wait(g.headless ? 10 : 420);
      if (!scene.holds()) { broke = scene.describe(); break; }
    }
    shaking.on = false;
    if (broke) {
      sfx.miss();
      g.stage.nudge(0.08);
      verdict.innerHTML = md(`**${who.name}:** “Held for your case. Not for this one: ${broke}.”\n\nThis case breaks the claim, so the claim is false. ${d.isTrue ? '' : '**Challenge it** with a case like this one.'}`);
      return;
    }
    if (d.isTrue) {
      finish(firstStance === 'back', `**Survived ${count} cases.** That is evidence, not a proof. The reason:\n\n${d.reason}`);
    } else {
      // the author's edge cases should always break a false claim; if they did not, say so plainly
      finish(false, d.reason);
    }
  };

  const giveUp = button('I cannot break it', () => {
    if (finished) return;
    finish(false, `It cannot be broken: the claim is **true**.\n\n${d.reason}\n\nNow back it, to see it survive the Shake.`);
  }, { cls: 'ghost small' });
  giveUp.hidden = true;

  const actions = h('div', { class: 'doubt-actions' },
    button('Challenge it', () => void challenge(), { cls: 'small', title: 'Submit your case as a counterexample' }),
    button('Back it', () => void back(), { cls: 'small primary', title: `Submit your case as a demonstration, then ${who.name} shakes it` }),
    giveUp,
    button('Show me', async () => {
      if (finished) return;
      const right = d.isTrue ? 'back' : 'challenge';
      firstStance ??= right;
      await scene.showMe(right);
      if (right === 'back') await back(); else await challenge();
    }, { cls: 'ghost small' }),
    button('Skip', () => { finished = true; resolveDone(); }, { cls: 'ghost small' }));
  card.append(h('div', { class: 'kicker' }, kicker), h('div', { class: 'doubt-claim', html: inline(`“${d.claim}”`) }), actions, verdict);
  g.ui.scene.appendChild(card);
  briefingTest.kind = 'doubt';
  briefingTest.solve = async () => {
    const right = d.isTrue ? 'back' : 'challenge';
    firstStance ??= right;
    await scene.showMe(right);
    if (right === 'back') await back(); else await challenge();
    return finished;
  };
  try {
    await host.guard(done);
  } finally {
    briefingTest.solve = null;
    card.remove();
    hud.clearControls();
    scene.dispose?.();
    m.done();
  }
  return outcome;
}

// ------------------------------------------------------------------ The act Review (GDD §4.6)

/**
 * Four mixed claims by one speaker at the end of an act, each answered by construction (the Doubt
 * mechanic). Objecting to a true claim (or backing a false one) costs a star.
 */
export async function runReview(host: BriefingHost, r: ReviewDef): Promise<void> {
  const { g, hud } = host;
  const who = cast(r.who);
  let lost = 0;
  for (let i = 0; i < r.claims.length; i++) {
    const d = { ...r.claims[i], who: r.who };
    await host.guard(g.say([[r.who, d.claim]]));
    const res = await runDoubt(host, d, { kicker: `${r.title} · ${i + 1} of ${r.claims.length}` });
    if (!res.skipped && !res.right) lost++;
  }
  const stars = Math.max(0, 3 - lost);
  const cs = chapterSave(host.chapterId);
  cs.stars[r.id] = Math.max(cs.stars[r.id] ?? 0, stars);
  save();
  const el = panel('card-why');
  el.append(
    h('div', { class: 'kicker' }, `${r.title} · settled`),
    h('h2', null, `${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}`),
    h('div', { class: 'card-body', html: md(lost
      ? `${who.name}'s four claims are settled. ${lost === 1 ? 'One first call was' : `${lost} first calls were`} the wrong way round; each one's reason is in your Field Manual.`
      : `${who.name}'s four claims are settled, every one by construction, and every first call right.`) }));
  g.ui.scene.appendChild(el);
  sfx.solved();
  try { await host.guard(hud.primary('Continue')); } finally { el.remove(); }
}

// ------------------------------------------------------------------ Laws and the Proving Ground

export async function runLaw<C>(host: BriefingHost, L: LawDef<C>): Promise<void> {
  const { g, hud } = host;
  const m = await host.mount('2d');
  hud.setObjective('Engrave the Law', 'Fill the statement. Then the Proving Ground fires **500 cases** at it. Surviving is evidence; the reason makes it a proof.');
  const d = g.settings.difficulty;
  const filled: Record<string, string> = {};
  const editable = (slot: string) => d !== 'cadet' || !L.cadetSlots || L.cadetSlots.includes(slot);
  for (const k of Object.keys(L.slots)) if (!editable(k)) filled[k] = L.answer[k];
  const saved = S().laws[L.id];
  if (saved) Object.assign(filled, saved.filled);
  const sentence = h('div', { class: 'law-sentence' });
  const render = () => {
    sentence.replaceChildren(...L.frame.map((piece) => {
      if (typeof piece === 'string') return h('span', { html: inline(piece) });
      const slot = L.slots[piece.slot];
      if (!editable(piece.slot)) return h('span', { class: 'law-fixed', html: inline(slot.options.find((o) => o.id === filled[piece.slot])?.text ?? '') });
      const sel = h('select', { class: 'law-slot', 'aria-label': piece.slot }) as HTMLSelectElement;
      sel.append(h('option', { value: '' }, '…'), ...slot.options.map((o) => h('option', { value: o.id }, o.text.replace(/\$/g, ''))));
      sel.value = filled[piece.slot] ?? '';
      sel.addEventListener('change', () => { filled[piece.slot] = sel.value; status.innerHTML = ''; sfx.click(); });
      return sel;
    }));
  };
  render();
  const status = h('div', { class: 'law-status' });
  const reasonBox = h('div', { class: 'law-reason' });
  let survived = false, proven = false;
  let resolveDone!: () => void;
  const done = new Promise<void>((r) => { resolveDone = r; });

  const prove = async (): Promise<boolean> => {
    if (Object.keys(L.slots).some((k) => !filled[k])) { status.innerHTML = md('Fill every slot first.'); sfx.miss(); return false; }
    m.p.move();
    const r = rng(0xa11 + L.id.length * 31);
    const cases: C[] = [...L.edgeCases];
    for (let i = 0; i < 500; i++) cases.push(L.gen(r));
    status.innerHTML = md('Proving Ground: firing 500 cases…');
    let brokeAt = -1;
    const t0 = performance.now();
    for (let i = 0; i < cases.length; i++) {
      if (!L.holds(filled, cases[i])) { brokeAt = i; break; }
      if (L.draw && !g.headless && i % 25 === 0) { g.stage.clearWorld(); L.draw(g, cases[i]); await wait(40); }
    }
    void t0;
    if (brokeAt >= 0) {
      const c = cases[brokeAt];
      g.stage.clearWorld();
      L.draw?.(g, c);
      sfx.miss();
      g.stage.nudge(0.1);
      status.innerHTML = md(`**This case breaks your Law:** ${L.describe(c)}.`);
      S().laws[L.id] = { filled: { ...filled }, survived: false, proven: false, at: Date.now() }; save();
      return false;
    }
    survived = true;
    S().laws[L.id] = { filled: { ...filled }, survived: true, proven: false, at: Date.now() }; save();
    sfx.success();
    status.innerHTML = md('**Survived 500 cases.** Surviving cases is not a proof. A reason is.');
    // the reason step
    const cards = new ChoiceCards(L.reason.options.map((o) => ({ id: o.id, text: o.text })), (id) => {
      const o = L.reason.options.find((x) => x.id === id)!;
      cards.mark(id, o.right ? 'right' : 'wrong');
      fb.innerHTML = `<div class="kicker ${o.right ? 'c-green' : 'c-red'}">${o.right ? 'Proven' : 'Not quite'}</div>${md(o.why)}`;
      if (o.right) { proven = true; cards.disable(); S().laws[L.id] = { filled: { ...filled }, survived: true, proven: true, at: Date.now() }; save(); sfx.solved(); g.toast('A new plate is etched on the bridge', 'Law proven'); void hud.primary('Continue').then(resolveDone); } else sfx.miss();
    });
    const fb = h('div', { class: 'explain-feedback' });
    reasonBox.replaceChildren(h('div', { class: 'kicker' }, 'The reason'), h('div', { class: 'explain-q', html: md(L.reason.ask) }), cards.el, fb);
    return true;
  };

  const card = panel('law');
  card.append(h('div', { class: 'kicker' }, 'Engrave the Law'), sentence,
    h('div', { class: 'doubt-actions' },
      button('Test it', () => void prove(), { cls: 'primary small' }),
      button('Show me', async () => { Object.assign(filled, L.answer); render(); if (await prove()) { const right = L.reason.options.find((o) => o.right)!; (reasonBox.querySelector(`.choice-card:nth-child(${L.reason.options.indexOf(right) + 1})`) as HTMLElement | null)?.click(); } }, { cls: 'ghost small' }),
      button('Skip', () => resolveDone(), { cls: 'ghost small' })),
    status, reasonBox);
  g.ui.scene.appendChild(card);
  briefingTest.kind = 'law';
  briefingTest.solve = async () => {
    Object.assign(filled, L.answer); render();
    const ok = await prove();
    if (ok) { const right = L.reason.options.find((o) => o.right)!; (reasonBox.querySelectorAll('.choice-card')[L.reason.options.indexOf(right)] as HTMLElement | undefined)?.click(); }
    return ok && proven;
  };
  try { await host.guard(done); } finally { briefingTest.solve = null; card.remove(); hud.clearControls(); m.done(); }
  void survived;
}

// ------------------------------------------------------------------ Compare with the model page

export async function runCompare(host: BriefingHost, c: CompareDef): Promise<void> {
  const { g, hud } = host;
  hud.hideObjective();
  const page = manualPage(c.id);
  const mine = h('div', { class: 'cmp-mine' },
    h('div', { class: 'kicker' }, 'Your page'),
    ...SLOTS.map((s) => {
      const ta = h('textarea', { class: 'own-words', rows: 2, 'aria-label': s.label }) as HTMLTextAreaElement;
      ta.value = page[s.key];
      ta.addEventListener('input', () => { page[s.key] = ta.value; page.at = Date.now(); save(); });
      ta.addEventListener('keydown', (e) => e.stopPropagation());
      return h('label', { class: 'slot' }, h('span', { class: 'slot-label' }, s.label), ta);
    }));
  const ticks = c.keyIdeas.map((k, i) => {
    const cb = h('input', { type: 'checkbox', checked: page.ticks[i] || null }) as HTMLInputElement;
    cb.addEventListener('change', () => { page.ticks[i] = cb.checked; save(); sfx.click(); });
    return h('label', { class: 'toggle-row' }, cb, h('span', { html: inline(k) }));
  });
  const ilse = h('div', { class: 'cmp-ilse' },
    h('div', { class: 'kicker' }, 'Ilse’s page'),
    h('div', { class: 'cmp-page', html: md(c.page) }),
    ...(c.formula ? [h('div', { class: 'cmp-formula', html: tex(c.formula, true) })] : []),
    h('div', { class: 'kicker', style: 'margin-top:12px' }, 'Key ideas: tick the ones your page covers'),
    ...ticks,
    h('p', { class: 'c-muted', style: 'font-size:12.5px' }, 'Nobody marks this. Revise your page if you want to.'));
  const el = panel('compare');
  el.append(h('div', { class: 'cmp-cols' }, mine, ilse));
  g.ui.scene.appendChild(el);
  briefingTest.kind = 'compare';
  briefingTest.solve = async () => true;
  try { await host.guard(hud.primary('Done')); } finally { el.remove(); briefingTest.solve = null; }
}

// ------------------------------------------------------------------ Procedures (LANTERN runs your steps)

export async function runProcedure(host: BriefingHost, def: ProcedureDef): Promise<void> {
  const { g, hud } = host;
  hud.setObjective('LANTERN runs exactly what you wrote', `**${def.title}**\n\n${def.brief}`);
  let resolveDone!: () => void;
  const done = new Promise<void>((r) => { resolveDone = r; });
  let finished = false;
  const status = h('div', { class: 'law-status' });
  const decoys = g.settings.difficulty === 'commander' ? def.decoys : undefined;
  const run = async (order: string[]) => {
    if (finished) return false;
    status.innerHTML = md('LANTERN is running your steps…');
    const r = await def.run(g, order);
    status.innerHTML = md(r.ok ? `**It worked.** ${r.message}` : r.message);
    if (r.ok) { finished = true; sfx.solved(); void hud.primary('Continue').then(resolveDone); } else sfx.miss();
    return r.ok;
  };
  const el = panel('procedure');
  const tiles = new TileOrder(null, { tiles: def.tiles, decoys, showPython: true, onSubmit: (o) => void run(o), mount: el, title: 'Steps for LANTERN' });
  el.append(status, h('div', { class: 'doubt-actions' },
    button('Show me', async () => { tiles.set(def.reference); await run(def.reference); }, { cls: 'ghost small' }),
    button('Skip', () => { finished = true; resolveDone(); }, { cls: 'ghost small' })));
  g.ui.scene.appendChild(el);
  briefingTest.kind = 'procedure';
  briefingTest.solve = async () => { tiles.set(def.reference); return run(def.reference); };
  try { await host.guard(done); } finally { briefingTest.solve = null; el.remove(); hud.clearControls(); }
}

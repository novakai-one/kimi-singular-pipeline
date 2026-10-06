// The application: boots the stage and UI, shows the title screen and menus, and plays chapters.
import { Stage } from '../core/stage';
import { DragManager } from '../core/drag';
import { Backdrop } from '../gfx/background';
import { UI, h, inline, md, button, openModal } from '../ui/ui';
import { Dialogue, setCast, history, dialogueSettings } from '../ui/dialogue';
import { castMember } from '../content/cast';
import { audio } from '../audio/audio';
import { music } from '../audio/music';
import { sfx } from '../audio/sfx';
import { loadVoiceManifest, setVoiceEnabled } from '../audio/voice';
import { loadSave, save, S, chapterSave, resetSave, exportSave, type Difficulty, type CodeHelp } from '../core/save';
import { exportLibrary, exportTests } from './build';
import { setAnimSpeed, wait } from '../core/tween';
import { Hud } from './hud';
import { Runner, nameCard } from './runner';
import { CHAPTERS, ACTS, chapter as findChapter, nextChapter, chapterName } from './registry';
import type { ChapterDef, CodexEntry, Game } from './types';
import { TitleScene } from './title';
import { installDebug } from './debug';
import { caseBoardScreen } from './caseboard';
import { manualView, libraryView } from './manual';

/** Save text as a file (the browser's download). */
export function download(name: string, text: string, type = 'text/plain'): void {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  document.body.appendChild(a);
  a.click();
  window.setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

export class App implements Game {
  readonly stage: Stage;
  readonly ui: UI;
  readonly drag: DragManager;
  readonly bg: Backdrop;
  readonly dialogue: Dialogue;
  readonly hud: Hud;
  readonly runner: Runner;
  readonly headless: boolean;
  private title: TitleScene | null = null;
  private playing = false;

  constructor(root: HTMLElement) {
    const params = new URLSearchParams(location.search);
    this.headless = params.has('test');
    loadSave();
    const st = S().settings;
    this.stage = new Stage(root, { quality: this.headless ? 'low' : st.quality });
    // the software renderer used by tests is slow; keep screenshots at full quality
    if (this.headless || navigator.webdriver) this.stage.autoQuality = false;
    this.bg = new Backdrop(this.stage);
    this.drag = new DragManager(this.stage);
    this.ui = new UI(document.body);
    setCast(castMember);
    this.dialogue = new Dialogue(this.ui);
    this.hud = new Hud(this.ui, {
      onMenu: () => void this.pauseMenu(),
      onCodex: () => void this.codexScreen(),
      onSettings: () => void this.settingsScreen(),
      onLog: () => void this.logScreen(),
      onCase: () => void caseBoardScreen(this.ui),
    });
    this.hud.setVisible(false);
    this.runner = new Runner(this, this.hud);
    this.applySettings();
    if (this.headless) setAnimSpeed(8);
    this.stage.start();
    void loadVoiceManifest();
    installDebug(this);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.playing && !this.dialogue.active && !document.querySelector('.modal-back')) void this.pauseMenu();
      if ((e.key === 'c' || e.key === 'C') && this.playing && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) void this.codexScreen();
    });
  }

  get settings() { return S().settings; }

  say(lines: Parameters<Dialogue['play']>[0], o?: Parameters<Dialogue['play']>[1]) { return this.dialogue.play(lines, o); }
  toast(text: string, kicker = ''): void { this.ui.toast(text, kicker); }
  mood(name: string): void { if (!this.headless) music.play(name); }

  applySettings(): void {
    const s = S().settings;
    audio.setVolume('master', s.master);
    audio.setVolume('music', s.music);
    audio.setVolume('sfx', s.sfx);
    audio.setVolume('voice', s.voice);
    setVoiceEnabled(s.voiceOn && !this.headless);
    dialogueSettings.autoAdvance = s.autoAdvance || this.headless || navigator.webdriver;
    dialogueSettings.textSpeed = s.textSpeed;
    if (!this.headless) setAnimSpeed(s.reduceMotion ? 4 : 1);
  }

  // ------------------------------------------------------------ flow

  async boot(): Promise<void> {
    const params = new URLSearchParams(location.search);
    const jump = params.get('chapter');
    if (jump && findChapter(jump)) {
      audio.unlock();
      await this.play(findChapter(jump)!, Number(params.get('beat') ?? 0));
      return;
    }
    await this.titleScreen();
  }

  async titleScreen(): Promise<void> {
    this.playing = false;
    this.runner.abort();
    this.hud.setVisible(false);
    this.stage.clearWorld();
    this.title?.dispose();
    this.title = new TitleScene(this);
    this.mood('title');
    const last = S().last;
    const lastCh = last ? findChapter(last.chapter) : undefined;
    const choice = await this.title.menu({
      canContinue: !!lastCh,
      continueLabel: lastCh ? `Continue · ${chapterName(lastCh)}` : 'Continue',
    });
    this.title.dispose();
    this.title = null;
    if (choice === 'new') { await this.difficultyPick(); await this.play(CHAPTERS[0], 0); }
    else if (choice === 'continue' && lastCh && last) {
      const beat = last.beat >= lastCh.beats.length ? 0 : last.beat;
      const ch = last.beat >= lastCh.beats.length ? nextChapter(lastCh.id) ?? lastCh : lastCh;
      await this.play(ch, ch === lastCh ? beat : 0);
    } else if (choice === 'chapters') await this.chapterSelect();
    else if (choice === 'codex') { await this.codexScreen(); await this.titleScreen(); }
    else if (choice === 'settings') { await this.settingsScreen(); await this.titleScreen(); }
  }

  async play(ch: ChapterDef, beat = 0): Promise<void> {
    if (this.title) { this.title.dispose(); this.title = null; }
    this.playing = true;
    this.stage.clearWorld();
    this.hud.setVisible(true);
    const res = await this.runner.playChapter(ch, beat);
    if (res === 'aborted') return;
    await this.chapterEnd(ch);
  }

  private async chapterEnd(ch: ChapterDef): Promise<void> {
    const next = nextChapter(ch.id);
    const cs = chapterSave(ch.id);
    const puzzles = ch.beats.filter((b) => b.kind === 'puzzle').length;
    const stars = Object.values(cs.stars).reduce((s, x) => s + x, 0);
    this.hud.hideObjective();
    let go: 'next' | 'map' | 'title' = 'map';
    await openModal(this.ui, (close) => [
      h('div', { class: 'kicker' }, `${chapterName(ch)} complete`),
      h('h2', { html: inline(ch.title) }),
      h('p', { class: 'c-muted' }, `Stars: ${stars} of ${puzzles * 3}. Replay any puzzle from the chapter map to raise them.`),
      h('div', { style: 'display:flex;gap:10px;flex-wrap:wrap;margin-top:18px' },
        next ? button(`Next · ${chapterName(next)}`, () => { go = 'next'; close(); }, { cls: 'primary' }) : null,
        button('Chapter map', () => { go = 'map'; close(); }),
        button('Title screen', () => { go = 'title'; close(); }, { cls: 'ghost' })),
    ]);
    const g2 = go as string;
    if (g2 === 'next' && next) await this.play(next, 0);
    else if (g2 === 'title') await this.titleScreen();
    else await this.chapterSelect();
  }

  // ------------------------------------------------------------ screens

  async difficultyPick(): Promise<void> {
    const opts: { id: Difficulty; name: string; text: string }[] = [
      { id: 'cadet', name: 'Cadet', text: 'Points snap to whole numbers. More guidance on screen. Small, friendly numbers.' },
      { id: 'navigator', name: 'Navigator', text: 'Points snap to halves. Hints when you ask. Fractions appear. The intended way to play.' },
      { id: 'commander', name: 'Commander', text: 'No snapping. Messier numbers, tighter par scores, and you compute more by hand.' },
    ];
    await openModal(this.ui, (close) => [
      h('div', { class: 'kicker' }, 'Difficulty'),
      h('h2', null, 'How do you want to play?'),
      h('p', { class: 'c-muted' }, 'You can change this at any time in Settings. Nothing is ever locked.'),
      h('div', { class: 'choice-cards' }, ...opts.map((o) => {
        const b = h('button', { class: 'choice-card', type: 'button', html: `<div class="kicker">${o.name}</div>${md(o.text)}` });
        if (S().settings.difficulty === o.id) b.setAttribute('aria-pressed', 'true');
        b.addEventListener('click', () => { S().settings.difficulty = o.id; save(); sfx.click(); close(); });
        return b;
      })),
    ]);
  }

  async chapterSelect(): Promise<void> {
    this.playing = false;
    this.runner.abort();
    this.hud.setVisible(false);
    let picked: { ch: ChapterDef; beat: number } | null = null;
    await openModal(this.ui, (close) => {
      const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'];
      const cols = ACTS.filter((a) => CHAPTERS.some((c) => c.act === a.num)).map((a) => {
        const chs = CHAPTERS.filter((c) => c.act === a.num);
        return h('div', { class: 'map-act' },
          h('div', { class: 'kicker' }, ROMAN[a.num] ? `Act ${ROMAN[a.num]}` : '\u00a0'),
          h('h3', { class: 'map-act-title' }, a.title),
          h('div', { class: 'c-muted map-act-sub' }, a.subtitle),
          ...chs.map((c) => {
            const cs = chapterSave(c.id);
            const puzzles = c.beats.filter((b) => b.kind === 'puzzle').length;
            const stars = Object.values(cs.stars).reduce((s, x) => s + x, 0);
            const doneAll = c.beats.every((b) => cs.done.includes(b.id));
            const card = h('div', { class: `map-ch ${doneAll ? 'done' : ''}` },
              h('button', { class: 'map-ch-main', type: 'button' },
                h('span', { class: 'map-num' }, String(c.num)),
                h('span', { class: 'map-title', html: inline(c.title) }),
                h('span', { class: 'map-sub c-muted', html: inline(c.subtitle ?? '') }),
                h('span', { class: 'map-stars' }, puzzles ? `★ ${stars}/${puzzles * 3}` : '')),
              h('details', { class: 'map-beats' }, h('summary', null, 'Jump to a part'),
                h('div', { class: 'map-beat-list' }, ...c.beats.map((b, i) => {
                  const label = b.kind === 'puzzle' ? b.puzzle.title : b.kind === 'name' ? `Named: ${b.entry.term}` : b.kind === 'explain' ? 'Explain it' : b.kind === 'build' ? `Build: ${b.build.fn}()`
                    : b.kind === 'card' ? b.card.title : b.kind === 'sayit' ? 'Say it' : b.kind === 'doubt' ? `Doubt: ${b.doubt.claim}` : b.kind === 'review' ? b.review.title : b.kind === 'law' ? 'Engrave the Law' : b.kind === 'compare' ? 'Compare with Ilse’s page'
                    : b.kind === 'procedure' ? `Procedure: ${b.procedure.title}` : b.kind === 'scene' ? 'Scene' : 'Cinematic';
                  const bb = h('button', { class: `map-beat ${cs.done.includes(b.id) ? 'done' : ''}`, type: 'button', html: `<span class="bk">${b.kind}</span> ${inline(label)}${b.kind === 'puzzle' && cs.stars[b.puzzle.id] ? ` <span class="c-yellow">${'★'.repeat(cs.stars[b.puzzle.id])}</span>` : ''}` });
                  bb.addEventListener('click', () => { picked = { ch: c, beat: i }; sfx.click(); close(); });
                  return bb;
                }))));
            card.querySelector('.map-ch-main')!.addEventListener('click', () => { picked = { ch: c, beat: 0 }; sfx.click(); close(); });
            return card;
          }));
      });
      return [
        h('div', { class: 'kicker' }, 'Chapter map'),
        h('h2', null, 'Go anywhere'),
        h('p', { class: 'c-muted' }, 'The story runs left to right, but every chapter and every puzzle is open. Open a chapter to jump straight to any part of it.'),
        h('div', { class: 'map-grid' }, ...cols),
        h('div', { style: 'margin-top:16px;display:flex;gap:10px' }, button('Title screen', () => { close(); }, { cls: 'ghost' })),
      ];
    }, { wide: true });
    const p = picked as { ch: ChapterDef; beat: number } | null;
    if (p) await this.play(p.ch, p.beat);
    else await this.titleScreen();
  }

  async pauseMenu(): Promise<void> {
    let action: 'resume' | 'map' | 'title' | 'restart' = 'resume';
    await openModal(this.ui, (close) => [
      h('div', { class: 'kicker' }, 'Paused'),
      h('h2', null, 'Menu'),
      h('div', { class: 'pause-list' },
        button('Resume', () => close(), { cls: 'primary' }),
        button('Restart this part', () => { action = 'restart'; close(); }),
        button('Chapter map', () => { action = 'map'; close(); }),
        button('Codex', () => { close(); void this.codexScreen(); }),
        button('Settings', () => { close(); void this.settingsScreen(); }),
        button('Title screen', () => { action = 'title'; close(); }, { cls: 'ghost' })),
    ]);
    const a = action as string;
    if (a === 'map') await this.chapterSelect();
    else if (a === 'title') await this.titleScreen();
    else if (a === 'restart' && this.runner.chapter) {
      const ch = this.runner.chapter, i = this.runner.beatIndex;
      this.runner.abort();
      await wait(50);
      await this.play(ch, i);
    }
  }

  async settingsScreen(): Promise<void> {
    const s = S().settings;
    const slider = (label: string, key: 'master' | 'music' | 'sfx' | 'voice') => {
      const inp = h('input', { type: 'range', min: 0, max: 1, step: 0.05, value: s[key], 'aria-label': label }) as HTMLInputElement;
      inp.addEventListener('input', () => { s[key] = parseFloat(inp.value); this.applySettings(); save(); });
      return h('label', { class: 'slider-row' }, h('span', null, label), inp, h('span', { class: 'val' }, ''));
    };
    const toggle = (label: string, key: 'voiceOn' | 'autoAdvance' | 'reduceMotion') => {
      const inp = h('input', { type: 'checkbox', checked: s[key] || null }) as HTMLInputElement;
      inp.addEventListener('change', () => { s[key] = inp.checked; this.applySettings(); save(); sfx.click(); });
      return h('label', { class: 'toggle-row' }, inp, h('span', null, label));
    };
    const diff = h('div', { class: 'seg' }, ...(['cadet', 'navigator', 'commander'] as Difficulty[]).map((d) => {
      const b = h('button', { class: 'btn small', type: 'button', 'aria-pressed': String(s.difficulty === d) }, d[0].toUpperCase() + d.slice(1));
      b.addEventListener('click', () => { s.difficulty = d; save(); diff.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); sfx.click(); });
      return b;
    }));
    const helps: [CodeHelp, string][] = [['off', 'Off'], ['assemble', 'Assemble'], ['fill', 'Fill'], ['write', 'Write']];
    const help = h('div', { class: 'seg' }, ...helps.map(([k, label]) => {
      const b = h('button', { class: 'btn small', type: 'button', 'aria-pressed': String(s.codeHelp === k) }, label);
      b.addEventListener('click', () => { s.codeHelp = k; save(); help.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); sfx.click(); });
      return b;
    }));
    await openModal(this.ui, () => [
      h('div', { class: 'kicker' }, 'Settings'),
      h('h2', null, 'Settings'),
      h('div', { class: 'settings-grid' },
        h('section', null, h('h3', null, 'Difficulty'), diff,
          h('p', { class: 'c-muted', style: 'font-size:13px' }, 'Takes effect from the next puzzle. Cadet snaps to whole numbers, Navigator to halves, Commander does not snap.')),
        h('section', null, h('h3', null, 'Code'), help,
          h('p', { class: 'c-muted', style: 'font-size:13px' }, 'How much help the Python builds give. Assemble: put given lines in order. Fill: fill a few blanks. Write: write the body yourself. Off: skip the builds; no maths is lost.'),
          h('div', { style: 'display:flex;gap:8px;flex-wrap:wrap' },
            button('Download lantern.py', () => download('lantern.py', exportLibrary(), 'text/x-python'), { cls: 'small' }),
            button('Download test_lantern.py', () => download('test_lantern.py', exportTests(), 'text/x-python'), { cls: 'ghost small' }))),
        h('section', null, h('h3', null, 'Sound'), slider('Master', 'master'), slider('Music', 'music'), slider('Effects', 'sfx'), slider('Voices', 'voice'), toggle('Voice acting', 'voiceOn')),
        h('section', null, h('h3', null, 'Story'), toggle('Advance dialogue automatically after each line', 'autoAdvance'), toggle('Reduce motion (faster, calmer animations)', 'reduceMotion')),
        h('section', null, h('h3', null, 'Save'),
          h('p', { class: 'c-muted', style: 'font-size:13px' }, 'Progress is saved in this browser.'),
          h('div', { style: 'display:flex;gap:8px;flex-wrap:wrap' },
            button('Copy save data', () => { void navigator.clipboard?.writeText(exportSave()); this.toast('Save data copied'); }, { cls: 'small' }),
            button('Erase progress', () => { if (confirm('Erase all progress, codex notes and code?')) { resetSave(); this.toast('Progress erased'); } }, { cls: 'ghost small' })))),
    ]);
  }

  async codexScreen(tab: 'ideas' | 'manual' | 'library' = 'ideas'): Promise<void> {
    const entries: { e: CodexEntry; ch: ChapterDef }[] = [];
    for (const ch of CHAPTERS) for (const b of ch.beats) if (b.kind === 'name') entries.push({ e: b.entry, ch });
    await openModal(this.ui, () => {
      const pane = h('div', { class: 'codex-pane' });
      const ideas = () => {
        const detail = h('div', { class: 'codex-detail' });
        const list = h('div', { class: 'codex-list' });
        const show = (x: { e: CodexEntry; ch: ChapterDef }) => {
          detail.replaceChildren(nameCard(x.e));
          const note = h('textarea', { class: 'own-words', rows: 3, placeholder: 'Your own notes on this idea (saved in this browser).' }) as HTMLTextAreaElement;
          note.value = S().codex[x.e.id]?.note ?? '';
          note.addEventListener('input', () => { S().codex[x.e.id] = { ...(S().codex[x.e.id] ?? { at: Date.now() }), note: note.value }; save(); });
          note.addEventListener('keydown', (e) => e.stopPropagation());
          detail.append(h('div', { class: 'kicker', style: 'margin-top:14px' }, 'Your notes'), note);
        };
        // an idea not yet met shows only its chapter's plain question: no term before it is earned
        const seenList = entries.filter((x) => S().codex[x.e.id]);
        for (const x of entries) {
          const seen = !!S().codex[x.e.id];
          const b = h('button', { class: `codex-item ${seen ? '' : 'unseen'}`, type: 'button', disabled: seen ? null : true, html: `<span class="c-muted">${x.ch.num}</span> ${inline(seen ? x.e.term : x.ch.title)}` });
          if (seen) b.addEventListener('click', () => { list.querySelectorAll('.codex-item').forEach((n) => n.removeAttribute('aria-current')); b.setAttribute('aria-current', 'true'); show(x); sfx.click(); });
          list.appendChild(b);
        }
        if (seenList[0]) show(seenList[0]); else detail.append(h('p', { class: 'c-muted' }, 'Each idea appears here once you have named it in the story.'));
        return entries.length ? h('div', { class: 'codex' }, list, detail) : h('p', null, 'Nothing here yet.');
      };
      const tabs = h('div', { class: 'seg codex-tabs', role: 'tablist' });
      const views: [typeof tab, string, () => HTMLElement][] = [
        ['ideas', 'Ideas', ideas],
        ['manual', 'Field Manual', () => manualView(download)],
        ['library', 'lantern.py', () => libraryView(download)],
      ];
      const open = (t: typeof tab) => {
        tabs.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tab === t)));
        pane.replaceChildren(views.find((v) => v[0] === t)![2]());
      };
      for (const [t, label] of views) {
        const b = h('button', { class: 'btn small', type: 'button', role: 'tab', 'data-tab': t }, label);
        b.addEventListener('click', () => { sfx.click(); open(t); });
        tabs.append(b);
      }
      open(tab);
      return [
        h('div', { class: 'kicker' }, 'Codex'),
        h('div', { class: 'codex-head' }, h('h2', null, 'Every idea, in plain words'), tabs),
        pane,
      ];
    }, { wide: true });
  }

  async logScreen(): Promise<void> {
    await openModal(this.ui, () => [
      h('div', { class: 'kicker' }, 'Log'),
      h('h2', null, 'What was said'),
      h('div', { class: 'log-list' }, ...history.slice(-200).map((l) => h('div', { class: 'log-line', html: `${l.who ? `<strong>${l.who}</strong> ` : ''}${inline(l.text)}` }))),
    ]);
  }
}

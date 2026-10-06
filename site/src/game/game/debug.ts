// window.__game: the test harness drives the game through this (list chapters, jump anywhere,
// solve the current puzzle, read state). Also handy in the browser console.
import type { App } from './app';
import { CHAPTERS, DEV_CHAPTERS, chapter } from './registry';
import { S } from '../core/save';
import { normLine, spoken, voiceId, type Line } from '../content/lines';
import { castMember } from '../content/cast';

export function installDebug(app: App): void {
  const api = {
    chapters: (dev = false) => (dev ? DEV_CHAPTERS : CHAPTERS).map((c) => ({ id: c.id, act: c.act, num: c.num, title: c.title, beats: c.beats.map((b) => ({ id: b.id, kind: b.kind, puzzle: b.kind === 'puzzle' ? b.puzzle.id : undefined })) })),
    /** Start a chapter at a beat (does not wait for it to finish). */
    goto: (id: string, beat = 0) => {
      const ch = chapter(id);
      if (!ch) throw new Error(`no chapter ${id}`);
      app.runner.abort();
      void app.play(ch, beat);
      return true;
    },
    /** What is on screen now. */
    state: () => ({
      chapter: app.runner.chapter?.id ?? null,
      beat: app.runner.beatIndex,
      kind: app.runner.chapter?.beats[app.runner.beatIndex]?.kind ?? null,
      puzzle: app.runner.puzzle ? { id: app.runner.puzzle.def.id, won: app.runner.puzzle.ctx.won } : null,
      dialogue: app.dialogue.active,
      fps: Math.round(app.stage.fps),
    }),
    /** Solve the current puzzle with its solver. Resolves to true if its win condition fired. */
    solve: () => app.runner.solveCurrent(),
    /** Mount a single puzzle by chapter id + beat index and return once it is set up. */
    mountPuzzle: async (id: string, beat: number) => {
      const ch = chapter(id);
      if (!ch) throw new Error(`no chapter ${id}`);
      const b = ch.beats[beat];
      if (b.kind !== 'puzzle') throw new Error(`beat ${beat} of ${id} is ${b.kind}`);
      app.runner.abort();
      void app.play(ch, beat);
      for (let i = 0; i < 400 && !(app.runner.puzzle && app.runner.puzzle.def.id === b.puzzle.id && app.runner.puzzle.runtime); i++) await new Promise((r) => setTimeout(r, 25));
      return !!app.runner.puzzle?.runtime;
    },
    save: () => S(),
    /** Every string the player reads, with where it lives (for the wording check). */
    texts: () => {
      const out: { where: string; text: string; order: number; term?: string }[] = [];
      let order = 0;
      const add = (where: string, t: string | undefined) => { if (t) out.push({ where, text: t, order }); };
      for (const c of CHAPTERS) {
        add(`${c.id} title`, c.title); add(`${c.id} subtitle`, c.subtitle);
        for (const b of c.beats) {
          order++;
          const w = `${c.id}/${b.id}`;
          if (b.kind === 'name') out.push({ where: `${w} TERM`, text: b.entry.term, order, term: b.entry.term });
          if (b.kind === 'scene') b.lines.map(normLine).forEach((l, i) => add(`${w} line ${i}`, l.text));
          if (b.kind === 'puzzle') {
            const q = b.puzzle;
            add(`${w} title`, q.title); add(`${w} goal`, q.goal);
            (q.subgoals ?? []).forEach((x, i) => add(`${w} subgoal ${i}`, x));
            q.hints.forEach((x, i) => add(`${w} hint ${i}`, x));
            if (q.predict) { add(`${w} predict`, q.predict.prompt); q.predict.choices.forEach((x) => add(`${w} choice`, x.text)); add(`${w} reveal`, q.predict.reveal); }
            (q.onWin ?? []).map(normLine).forEach((l) => add(`${w} onWin`, l.text));
          }
          if (b.kind === 'name') { const e = b.entry; for (const k of ['term', 'question', 'saw', 'means', 'name', 'why', 'cue', 'use'] as const) add(`${w} ${k}`, e[k]); }
          if (b.kind === 'explain') {
            const e = b.explain;
            add(`${w} intro`, e.intro); add(`${w} summary`, e.summary); add(`${w} ownWords`, e.ownWords);
            e.steps.forEach((s, i) => { add(`${w} step ${i}`, s.ask); s.options.forEach((o) => { add(`${w} step ${i} option`, o.text); add(`${w} step ${i} why`, o.why); }); });
          }
          if (b.kind === 'build') { add(`${w} title`, b.build.title); add(`${w} brief`, b.build.brief); add(`${w} payoff`, b.build.payoff); }
        }
        for (const [k, ls] of Object.entries(c.script ?? {})) ls.map(normLine).forEach((l, i) => add(`${c.id} script.${k} ${i}`, l.text));
      }
      return out;
    },
    /** Every voiced line in the game, for the voice generator. */
    lines: () => {
      const all: { ch: string; l: Line }[] = [];
      for (const c of [...CHAPTERS, ...DEV_CHAPTERS]) {
        const push = (ls: Line[]) => ls.forEach((l) => all.push({ ch: c.id, l }));
        for (const b of c.beats) {
          if (b.kind === 'scene') push(b.lines);
          if (b.kind === 'explain') push([[b.explain.who, b.explain.intro]]);
          if (b.kind === 'puzzle' && b.puzzle.onWin) push(b.puzzle.onWin);
        }
        for (const ls of Object.values(c.script ?? {})) push(ls);
      }
      const seen = new Set<string>();
      return all.map(({ ch, l }) => {
        const o = normLine(l);
        const cm = castMember(o.who);
        return { id: voiceId(o), chapter: ch, who: o.who, text: o.text, spoken: spoken(o), voice: cm.voice, speed: cm.speed ?? 1 };
      }).filter((l) => (seen.has(l.id) ? false : (seen.add(l.id), true)));
    },
    app,
  };
  (window as unknown as { __game: typeof api }).__game = api;
}

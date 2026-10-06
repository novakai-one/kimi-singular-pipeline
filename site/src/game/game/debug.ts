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
    /** Every voiced line in the game, for the voice generator. */
    lines: () => {
      const all: Line[] = [];
      for (const c of CHAPTERS) {
        for (const b of c.beats) {
          if (b.kind === 'scene') all.push(...b.lines);
          if (b.kind === 'explain') all.push([b.explain.who, b.explain.intro]);
          if (b.kind === 'puzzle' && b.puzzle.onWin) all.push(...b.puzzle.onWin);
        }
        for (const ls of Object.values(c.script ?? {})) all.push(...ls);
      }
      const seen = new Set<string>();
      return all.map(normLine).filter((l) => l.who !== 'narrator' || true).map((l) => {
        const cm = castMember(l.who);
        return { id: voiceId(l), who: l.who, text: l.text, spoken: spoken(l), voice: cm.voice, speed: cm.speed ?? 1 };
      }).filter((l) => (seen.has(l.id) ? false : (seen.add(l.id), true)));
    },
    app,
  };
  (window as unknown as { __game: typeof api }).__game = api;
}

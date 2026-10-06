// Every chapter in content/chapters/<id>/index.ts is picked up automatically (default export).
import type { ActDef, ChapterDef } from './types';
import { registerBuild } from './build';
import { ACTS } from '../content/acts';

const mods = import.meta.glob<{ default: ChapterDef }>('../content/chapters/*/index.ts', { eager: true });

const ALL: ChapterDef[] = Object.values(mods)
  .map((m) => m.default)
  .filter(Boolean)
  .sort((a, b) => a.act - b.act || a.num - b.num);

/** Story chapters in order. */
export const CHAPTERS: ChapterDef[] = ALL.filter((c) => !c.dev);
/** Developer test chapters (kit showcases). */
export const DEV_CHAPTERS: ChapterDef[] = ALL.filter((c) => c.dev);

for (const ch of ALL) for (const b of ch.beats) if (b.kind === 'build') registerBuild(b.build);

export function chapter(id: string): ChapterDef | undefined { return ALL.find((c) => c.id === id); }
export function act(n: number): ActDef | undefined { return ACTS.find((a) => a.num === n); }
export function nextChapter(id: string): ChapterDef | undefined {
  const i = CHAPTERS.findIndex((c) => c.id === id);
  return i >= 0 ? CHAPTERS[i + 1] : undefined;
}
export { ACTS };

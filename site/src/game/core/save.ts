// Saved state (localStorage, every access in try/catch; the game works without it).
export type Difficulty = 'cadet' | 'navigator' | 'commander';

export interface Settings {
  difficulty: Difficulty;
  master: number; music: number; sfx: number; voice: number;
  voiceOn: boolean;
  autoAdvance: boolean;
  textSpeed: number;
  reduceMotion: boolean;
  quality: 'high' | 'low';
}

export interface ChapterSave {
  done: string[];                     // beat ids completed
  stars: Record<string, number>;      // puzzle id → 0..3
  shown: string[];                    // puzzles solved with Show me
}

export interface SaveData {
  v: 1;
  settings: Settings;
  last: { chapter: string; beat: number } | null;
  chapters: Record<string, ChapterSave>;
  codex: Record<string, { at: number; note?: string }>;
  explains: Record<string, { picked?: string[]; text?: string; at: number }>;
  code: Record<string, string>;       // builder thread: the player's own functions
  flags: Record<string, unknown>;
}

const KEY = 'la-game-v1';

export const DEFAULT_SETTINGS: Settings = {
  difficulty: 'navigator', master: 0.8, music: 0.5, sfx: 0.7, voice: 1, voiceOn: true,
  autoAdvance: false, textSpeed: 1, reduceMotion: false, quality: 'high',
};

function fresh(): SaveData {
  return { v: 1, settings: { ...DEFAULT_SETTINGS }, last: null, chapters: {}, codex: {}, explains: {}, code: {}, flags: {} };
}

let data: SaveData = fresh();
let storageOk = true;

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const j = JSON.parse(raw) as SaveData;
      if (j && j.v === 1) data = { ...fresh(), ...j, settings: { ...DEFAULT_SETTINGS, ...j.settings } };
    }
  } catch { storageOk = false; }
  return data;
}

export function save(): void {
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { storageOk = false; }
}

export function saveOk(): boolean { return storageOk; }
export function S(): SaveData { return data; }

export function chapterSave(id: string): ChapterSave {
  return (data.chapters[id] ??= { done: [], stars: {}, shown: [] });
}

export function resetSave(): void {
  const keep = data.settings;
  data = fresh();
  data.settings = keep;
  save();
}

export function exportSave(): string { return JSON.stringify(data, null, 2); }

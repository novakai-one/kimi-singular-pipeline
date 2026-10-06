// Voice lines (pre-generated with Kokoro TTS). Each line has an id; its audio is voice/<id>.mp3.
// If a file is missing (or audio is off) the line still plays as text, timed by its length.
import { audio } from './audio';

const cache = new Map<string, Promise<AudioBuffer | null>>();
let manifest: Set<string> | null = null;
let manifestLoad: Promise<void> | null = null;
let base = './voice/';
let current: AudioBufferSourceNode | null = null;
let enabled = true;

export function setVoiceBase(url: string): void { base = url.endsWith('/') ? url : `${url}/`; }
export function setVoiceEnabled(on: boolean): void { enabled = on; if (!on) stopVoice(); }
export function voiceEnabled(): boolean { return enabled; }

/** Load the list of lines that have audio (voice/manifest.json: { "ids": [...] }). */
export function loadVoiceManifest(): Promise<void> {
  if (manifestLoad) return manifestLoad;
  manifestLoad = fetch(`${base}manifest.json`)
    .then((r) => (r.ok ? r.json() : { ids: [] }))
    .then((j: { ids?: string[] }) => { manifest = new Set(j.ids ?? []); })
    .catch(() => { manifest = new Set(); });
  return manifestLoad;
}

export function hasVoice(id: string): boolean { return !!manifest?.has(id); }

function load(id: string): Promise<AudioBuffer | null> {
  if (!audio.ctx || !hasVoice(id)) return Promise.resolve(null);
  let p = cache.get(id);
  if (!p) {
    p = fetch(`${base}${id}.mp3`)
      .then((r) => (r.ok ? r.arrayBuffer() : null))
      .then((b) => (b ? audio.ctx!.decodeAudioData(b) : null))
      .catch(() => null);
    cache.set(id, p);
  }
  return p;
}

/** Start fetching lines that will be needed soon. */
export function preloadVoices(ids: string[]): void { ids.forEach((id) => { void load(id); }); }

/** Estimated reading time for a line with no audio. */
export function readingMs(text: string): number {
  const words = text.trim().split(/\s+/).length;
  return Math.max(1600, words * 330 + 600);
}

/**
 * Play a line. Resolves when it finishes (or is stopped). `rate` is the playback speed.
 * Returns how long the audio lasts in ms (0 if there was no audio).
 */
export async function playVoice(id: string, onStart?: (durationMs: number) => void, rate = 1): Promise<number> {
  stopVoice();
  if (!enabled || !audio.ctx) { onStart?.(0); return 0; }
  const buf = await load(id);
  if (!buf) { onStart?.(0); return 0; }
  const src = audio.ctx.createBufferSource();
  src.buffer = buf;
  src.playbackRate.value = rate;
  src.connect(audio.buses.voice);
  current = src;
  audio.duck(true);
  const ms = (buf.duration / rate) * 1000;
  onStart?.(ms);
  await new Promise<void>((resolve) => {
    src.onended = () => resolve();
    src.start();
  });
  if (current === src) { current = null; audio.duck(false); }
  return ms;
}

export function stopVoice(): void {
  if (current) {
    try { current.stop(); } catch { /* not started */ }
    current = null;
  }
  audio.duck(false);
}

export function isSpeaking(): boolean { return current !== null; }

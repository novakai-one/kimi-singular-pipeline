// Generative, adaptive score. Each mood is a key, a chord loop and a texture (pad, bass, arpeggio,
// bells, pulse). The scheduler looks ahead and places notes on the AudioContext clock, so timing is
// exact. setIntensity() thickens the texture during hard puzzles; stinger() marks a win.
import { audio, midiHz } from './audio';

export interface Mood {
  root: number;            // MIDI note of the key centre
  scale: number[];         // semitone offsets
  chords: number[][];      // scale-degree indices (≥ scale.length wraps up an octave)
  beatsPerChord: number;
  bpm: number;
  padCutoff: number;
  padVol: number;
  bassVol: number;
  arp: number[];           // chord-tone indices per 16th; -1 = rest
  arpVol: number;
  arpOct: number;
  bellProb: number;
  pulse: number;           // 0 = none; >0 = soft eighth-note pulse level
  wave: OscillatorType;
}

const DORIAN = [0, 2, 3, 5, 7, 9, 10];
const AEOLIAN = [0, 2, 3, 5, 7, 8, 10];
const LYDIAN = [0, 2, 4, 6, 7, 9, 11];
const IONIAN = [0, 2, 4, 5, 7, 9, 11];

export const MOODS: Record<string, Mood> = {
  // wide, slow, hopeful
  title: { root: 50, scale: LYDIAN, chords: [[0, 2, 4, 6], [1, 3, 5, 7], [5, 7, 9, 11], [4, 6, 8, 10]], beatsPerChord: 8, bpm: 64, padCutoff: 1500, padVol: 0.07, bassVol: 0.08, arp: [0, -1, 2, -1, 4, -1, 3, -1, 6, -1, 4, -1, 2, -1, 3, -1], arpVol: 0.028, arpOct: 2, bellProb: 0.12, pulse: 0, wave: 'sawtooth' },
  // calm exploring, Dorian
  explore: { root: 50, scale: DORIAN, chords: [[0, 2, 4, 6], [3, 5, 7, 9], [6, 8, 10, 12], [4, 6, 8, 10]], beatsPerChord: 8, bpm: 72, padCutoff: 1200, padVol: 0.06, bassVol: 0.08, arp: [0, -1, -1, 2, -1, -1, 4, -1, 3, -1, -1, 1, -1, -1, 2, -1], arpVol: 0.025, arpOct: 2, bellProb: 0.07, pulse: 0, wave: 'sawtooth' },
  // focused puzzle: sparse, gentle, never busy
  puzzle: { root: 50, scale: DORIAN, chords: [[0, 2, 4, 7], [5, 7, 9, 11], [3, 5, 7, 9], [4, 6, 8, 11]], beatsPerChord: 8, bpm: 80, padCutoff: 900, padVol: 0.05, bassVol: 0.07, arp: [0, -1, 4, -1, 2, -1, 4, -1, 1, -1, 4, -1, 2, -1, 3, -1], arpVol: 0.018, arpOct: 2, bellProb: 0.04, pulse: 0, wave: 'sawtooth' },
  // something is wrong
  tension: { root: 50, scale: AEOLIAN, chords: [[0, 2, 4, 6], [5, 7, 9, 11], [1, 3, 5, 8], [4, 6, 8, 11]], beatsPerChord: 4, bpm: 96, padCutoff: 800, padVol: 0.06, bassVol: 0.1, arp: [0, 0, -1, 2, -1, 0, 4, -1, 0, -1, 3, -1, 0, 2, -1, 1], arpVol: 0.022, arpOct: 1, bellProb: 0.02, pulse: 0.05, wave: 'sawtooth' },
  // resolution
  triumph: { root: 50, scale: IONIAN, chords: [[0, 2, 4, 7], [4, 6, 8, 11], [5, 7, 9, 12], [3, 5, 7, 9]], beatsPerChord: 8, bpm: 76, padCutoff: 2000, padVol: 0.07, bassVol: 0.09, arp: [0, 2, 4, 7, 4, 2, 0, 2, 4, 7, 9, 7, 4, 2, 4, 2], arpVol: 0.025, arpOct: 2, bellProb: 0.15, pulse: 0, wave: 'sawtooth' },
  // the dark middle of the story
  void: { root: 45, scale: AEOLIAN, chords: [[0, 4, 7], [5, 8, 12], [3, 7, 10], [6, 10, 13]], beatsPerChord: 8, bpm: 58, padCutoff: 600, padVol: 0.07, bassVol: 0.11, arp: [0, -1, -1, -1, -1, -1, 4, -1, -1, -1, -1, -1, 2, -1, -1, -1], arpVol: 0.02, arpOct: 2, bellProb: 0.05, pulse: 0, wave: 'sawtooth' },
};

class Music {
  private mood: Mood | null = null;
  private next: Mood | null = null;
  private timer: number | null = null;
  private step = 0;              // 16th-note counter within the chord loop
  private chordIdx = 0;
  private nextTime = 0;
  private intensity = 0.3;
  private bus: GainNode | null = null;
  private padNodes: { stop: (t: number) => void }[] = [];
  playing = false;
  name = '';

  play(name: keyof typeof MOODS | string): void {
    const m = MOODS[name];
    if (!m) return;
    this.name = name;
    audio.onReady(() => {
      if (!this.playing) {
        this.mood = m;
        this.start();
      } else if (this.mood !== m) {
        this.next = m; // switch at the next chord boundary
      }
    });
  }

  setIntensity(x: number): void { this.intensity = Math.max(0, Math.min(1, x)); }

  stop(fadeSec = 2): void {
    if (!audio.ctx || !this.bus) return;
    const t = audio.ctx.currentTime;
    this.bus.gain.setTargetAtTime(0, t, fadeSec / 3);
    const bus = this.bus;
    window.setTimeout(() => { bus.disconnect(); }, fadeSec * 1000 + 200);
    this.bus = null;
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
    this.playing = false;
    this.padNodes.forEach((p) => p.stop(t + fadeSec));
    this.padNodes = [];
  }

  private start(): void {
    const ctx = audio.ctx!;
    this.bus = ctx.createGain();
    this.bus.gain.value = 0;
    this.bus.gain.setTargetAtTime(1, ctx.currentTime, 1.2);
    this.bus.connect(audio.buses.music);
    this.playing = true;
    this.step = 0;
    this.chordIdx = 0;
    this.nextTime = ctx.currentTime + 0.1;
    this.timer = window.setInterval(() => this.schedule(), 50);
  }

  private schedule(): void {
    const ctx = audio.ctx;
    if (!ctx || !this.mood || !this.bus) return;
    while (this.nextTime < ctx.currentTime + 0.25) {
      this.playStep(this.nextTime);
      const sixteenth = 60 / this.mood.bpm / 4;
      this.nextTime += sixteenth;
    }
  }

  private noteOf(m: Mood, degree: number, octave = 0): number {
    const n = m.scale.length;
    const oct = Math.floor(degree / n);
    const idx = ((degree % n) + n) % n;
    return m.root + m.scale[idx] + 12 * (oct + octave);
  }

  private playStep(t: number): void {
    let m = this.mood!;
    const stepsPerChord = m.beatsPerChord * 4;
    const s = this.step % stepsPerChord;
    if (s === 0) {
      if (this.next) { this.mood = this.next; this.next = null; m = this.mood; this.chordIdx = 0; }
      const chord = m.chords[this.chordIdx % m.chords.length];
      const dur = (60 / m.bpm) * m.beatsPerChord;
      this.pad(chord.map((d) => this.noteOf(m, d, 0)), t, dur, m);
      this.bass(this.noteOf(m, chord[0], -1), t, dur, m);
    }
    const chord = m.chords[this.chordIdx % m.chords.length];
    // arpeggio, density follows intensity
    const a = m.arp[s % m.arp.length];
    const keep = a >= 0 && (s % 4 === 0 || Math.random() < 0.45 + 0.55 * this.intensity);
    if (keep) {
      const tone = chord[a % chord.length] + (a >= chord.length ? m.scale.length : 0);
      this.pluck(this.noteOf(m, tone, m.arpOct), t, m.arpVol * (0.7 + 0.6 * this.intensity), m);
    }
    if (s % 8 === 4 && Math.random() < m.bellProb) {
      const deg = chord[Math.floor(Math.random() * chord.length)] + m.scale.length * 2;
      this.bell(this.noteOf(m, deg, 1), t);
    }
    const pulse = m.pulse + (this.intensity > 0.7 ? 0.025 : 0);
    if (pulse > 0 && s % 2 === 0) this.thump(this.noteOf(m, chord[0], -2), t, pulse);
    this.step++;
    if (this.step % stepsPerChord === 0) this.chordIdx++;
  }

  private pad(notes: number[], t: number, dur: number, m: Mood): void {
    const ctx = audio.ctx!;
    const out = ctx.createGain();
    out.gain.setValueAtTime(0, t);
    out.gain.linearRampToValueAtTime(m.padVol, t + Math.min(2.2, dur * 0.4));
    out.gain.setValueAtTime(m.padVol, t + dur);
    out.gain.linearRampToValueAtTime(0, t + dur + 2.4);
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.Q.value = 0.6;
    const cut = m.padCutoff * (0.8 + 0.6 * this.intensity);
    f.frequency.setValueAtTime(cut * 0.6, t);
    f.frequency.linearRampToValueAtTime(cut, t + dur * 0.5);
    f.frequency.linearRampToValueAtTime(cut * 0.7, t + dur + 2);
    f.connect(out);
    out.connect(this.bus!);
    const send = ctx.createGain(); send.gain.value = 0.55;
    out.connect(send).connect(audio.reverbSend);
    const oscs: OscillatorNode[] = [];
    notes.forEach((n, i) => {
      for (const det of [-7, 6]) {
        const o = ctx.createOscillator();
        o.type = m.wave;
        o.frequency.value = midiHz(n);
        o.detune.value = det + (i - 1.5) * 1.5;
        const pan = ctx.createStereoPanner();
        pan.pan.value = (det < 0 ? -0.35 : 0.35) * (i % 2 ? 1 : -1);
        const g = ctx.createGain(); g.gain.value = 0.5 / notes.length;
        o.connect(g).connect(pan).connect(f);
        o.start(t);
        o.stop(t + dur + 2.6);
        oscs.push(o);
      }
    });
    const handle = { stop: (when: number) => { oscs.forEach((o) => { try { o.stop(when); } catch { /* already stopped */ } }); } };
    this.padNodes.push(handle);
    if (this.padNodes.length > 4) this.padNodes.shift();
  }

  private bass(n: number, t: number, dur: number, m: Mood): void {
    const ctx = audio.ctx!;
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = midiHz(n);
    const o2 = ctx.createOscillator(); o2.type = 'triangle'; o2.frequency.value = midiHz(n);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(m.bassVol, t + 1.2);
    g.gain.setValueAtTime(m.bassVol, t + dur - 0.2);
    g.gain.linearRampToValueAtTime(0, t + dur + 1.2);
    const g2 = ctx.createGain(); g2.gain.value = 0.25;
    o.connect(g); o2.connect(g2).connect(g);
    g.connect(this.bus!);
    o.start(t); o2.start(t);
    o.stop(t + dur + 1.3); o2.stop(t + dur + 1.3);
  }

  private pluck(n: number, t: number, vol: number, m: Mood): void {
    const ctx = audio.ctx!;
    const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = midiHz(n);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.004);
    g.gain.exponentialRampToValueAtTime(1e-4, t + 0.9);
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1800 + 2000 * this.intensity;
    const pan = ctx.createStereoPanner(); pan.pan.value = (Math.random() - 0.5) * 0.8;
    o.connect(f).connect(g).connect(pan).connect(this.bus!);
    const ds = ctx.createGain(); ds.gain.value = 0.5; pan.connect(ds).connect(audio.delaySend);
    const rs = ctx.createGain(); rs.gain.value = 0.35; pan.connect(rs).connect(audio.reverbSend);
    o.start(t); o.stop(t + 1);
    void m;
  }

  private bell(n: number, t: number): void {
    const ctx = audio.ctx!;
    const car = ctx.createOscillator(); car.type = 'sine'; car.frequency.value = midiHz(n);
    const mod = ctx.createOscillator(); mod.type = 'sine'; mod.frequency.value = midiHz(n) * 3.5;
    const mg = ctx.createGain(); mg.gain.setValueAtTime(midiHz(n) * 1.2, t); mg.gain.exponentialRampToValueAtTime(1, t + 2);
    mod.connect(mg).connect(car.frequency);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.022, t + 0.01); g.gain.exponentialRampToValueAtTime(1e-4, t + 3.2);
    car.connect(g).connect(this.bus!);
    const rs = ctx.createGain(); rs.gain.value = 0.9; g.connect(rs).connect(audio.reverbSend);
    car.start(t); mod.start(t); car.stop(t + 3.3); mod.stop(t + 3.3);
  }

  private thump(n: number, t: number, vol: number): void {
    const ctx = audio.ctx!;
    const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(midiHz(n) * 2, t);
    o.frequency.exponentialRampToValueAtTime(midiHz(n), t + 0.08);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.005); g.gain.exponentialRampToValueAtTime(1e-4, t + 0.35);
    o.connect(g).connect(this.bus!);
    o.start(t); o.stop(t + 0.4);
  }

  /** A short rising phrase on top of the score (a win). */
  stinger(): void {
    const ctx = audio.ctx;
    if (!ctx || !this.mood || !this.bus) return;
    const m = this.mood;
    const t = ctx.currentTime + 0.02;
    [0, 2, 4, 7].forEach((d, i) => this.pluck(this.noteOf(m, d, 2), t + i * 0.09, 0.05, m));
  }
}

export const music = new Music();

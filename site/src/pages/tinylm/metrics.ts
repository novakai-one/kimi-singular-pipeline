// Text measures for the two temperature challenges. Pure functions, tested in Node.

/** The longest piece (at least `min` characters) that appears at least `times` times in the text. */
export function longestRepeat(text: string, times = 3, min = 8): { piece: string; count: number } {
  const n = text.length;
  let lo = min, hi = Math.floor(n / times), best = { piece: '', count: 0 };
  // a piece of length L that repeats implies one of every shorter length repeats, so binary search on L
  while (lo <= hi) {
    const L = (lo + hi) >> 1;
    const counts = new Map<string, number>();
    let found: { piece: string; count: number } | null = null;
    for (let i = 0; i + L <= n; i++) {
      const s = text.slice(i, i + L);
      const c = (counts.get(s) ?? 0) + 1;
      counts.set(s, c);
      if (c >= times && (!found || c > found.count)) found = { piece: s, count: c };
    }
    if (found) { best = found; lo = L + 1; } else hi = L - 1;
  }
  return best;
}

/** Words (letters and apostrophes), lowercased. */
export function words(text: string): string[] {
  return (text.match(/[A-Za-z']+/g) ?? []).map((w) => w.toLowerCase().replace(/^'+|'+$/g, '')).filter(Boolean);
}

/** How many of the text's words never appear in the training text. */
export function madeUp(text: string, known: Set<string>): { total: number; unknown: number; examples: string[] } {
  const ws = words(text);
  const unknown = ws.filter((w) => !known.has(w));
  return { total: ws.length, unknown: unknown.length, examples: [...new Set(unknown)].slice(0, 6) };
}

/** Challenge thresholds (set from sampling the trained model at many temperatures; see DECISIONS.md). */
export const CHALLENGE = {
  minChars: 300,
  /** Repeat: a piece of 12+ characters seen 3 times, at a temperature of 0.2 or higher (lower always repeats). */
  repeat: { length: 12, times: 3, minT: 0.2 },
  /** Ramble: at least 40% made-up words, at a temperature of 1.6 or lower (2 always rambles). */
  ramble: { share: 0.4, maxT: 1.6 },
};

/** Show me: a fixed temperature and random seed from "ROMEO:" that reaches each goal (checked in tests/unit/tinylm-showme.test.ts). */
export const DEMO = { repeat: { T: 0.2, seed: 1 }, ramble: { T: 1.6, seed: 6 } };

export function isRepetitive(generated: string) {
  const r = longestRepeat(generated, CHALLENGE.repeat.times, 8);
  return { ...r, win: generated.length >= CHALLENGE.minChars && r.piece.length >= CHALLENGE.repeat.length };
}

export function isRambling(generated: string, known: Set<string>) {
  const m = madeUp(generated, known);
  const share = m.total ? m.unknown / m.total : 0;
  return { ...m, share, win: generated.length >= CHALLENGE.minChars && m.total >= 10 && share >= CHALLENGE.ramble.share };
}

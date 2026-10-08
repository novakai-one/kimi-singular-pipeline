// Pack d01-dot v2 licenses these three presentation policies only.
export function compactBeatChrome(chapter: string, beat: string): boolean {
  return chapter === 'd01-dot' && ['puzzle', 'doubt', 'law', 'procedure', 'build'].includes(beat);
}

/** A replacement owns its cleanup; an old timer cannot dismiss a newer item. */
export class TransientSlot {
  private current: (() => void) | null = null;
  replace(remove: () => void): () => void {
    this.clear();
    let active = true;
    const dismiss = () => {
      if (!active) return;
      active = false;
      if (this.current === dismiss) this.current = null;
      remove();
    };
    this.current = dismiss;
    return dismiss;
  }
  clear(): void { this.current?.(); }
}

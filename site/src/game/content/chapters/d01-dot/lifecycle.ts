/** Per browser session: Reset remounts a beat without undoing a dismissal. */
export class PuzzleLifecycle {
  predictionVisible = true;
  goalExpanded = true;
  private attempted = false;
  drag(): void { this.predictionVisible = false; this.attempt(); this.goalExpanded = false; }
  submitPrediction(): void { this.predictionVisible = false; }
  attempt(): void {
    if (this.attempted) return;
    this.attempted = true;
    this.goalExpanded = false;
  }
  toggleGoal(): void { this.goalExpanded = !this.goalExpanded; }
  startBeat(): void { this.goalExpanded = true; this.attempted = false; }
}

const sessions = new WeakMap<object, Map<string, PuzzleLifecycle>>();
export function puzzleLifecycle(scope: object, id: string): PuzzleLifecycle {
  if (!sessions.has(scope)) sessions.set(scope, new Map());
  const states = sessions.get(scope)!;
  if (!states.has(id)) states.set(id, new PuzzleLifecycle());
  return states.get(id)!;
}
export function beginPuzzleBeat(scope: object): void { sessions.get(scope)?.forEach((state) => state.startBeat()); }

/** Continue requires this run's full suite and adoption, never an old save flag. */
export class BuildGate {
  private epoch = 0;
  ready = false;
  invalidate(): number { this.ready = false; return ++this.epoch; }
  adopt(epoch: number, results: readonly boolean[], value: unknown): boolean {
    if (epoch !== this.epoch || results.length !== 200 || !results.every(Boolean) || typeof value !== 'number' || !Number.isFinite(value)) return false;
    this.ready = true;
    return true;
  }
}

/** Async Python results never overwrite a more recent arrow position. */
export class ReadingChannel {
  private epoch = 0;
  private key = '';
  private readonly execute: (source: string, v: readonly number[], w: readonly number[]) => Promise<number>;
  constructor(execute: (source: string, v: readonly number[], w: readonly number[]) => Promise<number>) { this.execute = execute; }
  async request(source: string | null, v: readonly number[], w: readonly number[], display: (value: number) => void): Promise<void> {
    const key = JSON.stringify([source, v, w]);
    if (key === this.key) return;
    this.key = key;
    const epoch = ++this.epoch;
    const value = source ? await this.execute(source, v, w) : v[0] * w[0] + v[1] * w[1];
    if (epoch === this.epoch) display(value);
  }
  dispose(): void { ++this.epoch; }
}

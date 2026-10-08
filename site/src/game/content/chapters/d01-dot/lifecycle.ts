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

/** Typing previews feedback; only Enter commits the complete numeric answer. */
export function bindNumericAnswer(input: HTMLInputElement, preview: (value: number | null) => void, submit: (value: number) => void): void {
  const value = () => input.value.trim() ? Number(input.value) : null;
  input.addEventListener('input', () => preview(value()));
  input.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    event.stopPropagation();
    const answer = value();
    if (answer !== null) submit(answer);
  });
}

/** Continue requires this run's full suite and adoption, never an old save flag. */
export interface BuildRun { epoch: number; source: string }
export class BuildGate {
  private epoch = 0;
  private alive = true;
  ready = false;
  invalidate(): number { this.ready = false; return ++this.epoch; }
  current(epoch: number): boolean { return this.alive && epoch === this.epoch; }
  startRun(source: string): BuildRun { return { epoch: this.invalidate(), source }; }
  ownsRun(run: BuildRun, source: string): boolean { return this.current(run.epoch) && run.source === source; }
  reject(epoch: number): boolean {
    if (!this.current(epoch)) return false;
    this.invalidate();
    return true;
  }
  dispose(): void { this.alive = false; this.invalidate(); }
  adopt(epoch: number, results: readonly boolean[], value: unknown): boolean {
    if (!this.current(epoch) || results.length !== 200 || !results.every(Boolean) || typeof value !== 'number' || !Number.isFinite(value)) return false;
    this.ready = true;
    return true;
  }
}

/** Async Python results never overwrite a more recent arrow position. */
export class ReadingChannel {
  private epoch = 0;
  private key = '';
  private alive = true;
  private cached: number | null = null;
  private readonly execute: (source: string, v: readonly number[], w: readonly number[]) => Promise<number>;
  constructor(execute: (source: string, v: readonly number[], w: readonly number[]) => Promise<number>) { this.execute = execute; }
  async request(source: string | null, v: readonly number[], w: readonly number[], display: (value: number) => void, rejected: (error: unknown) => void = () => {}): Promise<void> {
    if (!this.alive) return;
    const key = JSON.stringify([source, v, w]);
    if (key === this.key) { if (this.cached !== null) display(this.cached); return; }
    this.key = key;
    this.cached = null;
    const epoch = ++this.epoch;
    let value: number;
    try { value = source ? await this.execute(source, v, w) : v[0] * w[0] + v[1] * w[1]; }
    catch (error) { if (this.alive && epoch === this.epoch) rejected(error); return; }
    if (this.alive && epoch === this.epoch) { this.cached = value; display(value); }
  }
  dispose(): void { this.alive = false; ++this.epoch; }
}

/** The renderer clears this node on Start over; keep its one authored line. */
export function restoreTestsLine(status: { textContent: string | null }, tests: string, invalidated = false): void {
  if ((invalidated || !status.textContent?.trim()) && status.textContent !== tests) status.textContent = tests;
}

/** The unchanged renderer writes Running synchronously just after capturing code,
 * then writes innerHTML only when that run settles. Observe this one node, not
 * global DOM prototypes; a cleared Start over status is not run completion.
 */
export function observeBuildRunStatus(status: { textContent: string | null; innerHTML: string }, start: () => void, finish: () => void): () => void {
  const restore: (() => void)[] = [];
  for (const key of ['textContent', 'innerHTML'] as const) {
    const own = Object.getOwnPropertyDescriptor(status, key);
    let prototype: object | null = status;
    let descriptor: PropertyDescriptor | undefined;
    while (prototype && !descriptor) { descriptor = Object.getOwnPropertyDescriptor(prototype, key); prototype = Object.getPrototypeOf(prototype); }
    if (!descriptor?.get || !descriptor.set) throw new Error(`Missing build status accessor: ${key}`);
    const accessor = descriptor;
    Object.defineProperty(status, key, {
      configurable: true,
      get() { return accessor.get!.call(this); },
      set(value: string | null) {
        accessor.set!.call(this, value);
        if (key === 'textContent' && /^(Running|Starting Python \()/.test(value ?? '')) start();
        if (key === 'innerHTML') finish();
      },
    });
    restore.push(() => { if (own) Object.defineProperty(status, key, own); else Reflect.deleteProperty(status, key); });
  }
  return () => restore.forEach((reset) => reset());
}

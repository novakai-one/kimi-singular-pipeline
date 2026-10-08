// The authored two-component dot belongs to this lesson, never the story library.
export interface DotSave { code: Record<string, string>; flags: Record<string, unknown> }
export interface LocalDot { source?: string; passed?: boolean; adoptedSource?: string; draft?: { fill?: string[]; order?: string[] } }
export function localDot(store: DotSave): LocalDot {
  return (store.flags['d01-dot-build'] ??= {}) as LocalDot;
}
export function adoptedDot(store: DotSave): string | null { return (store.flags['d01-dot-build'] as LocalDot | undefined)?.adoptedSource ?? null; }

type WriteKind = 'result' | 'draft' | false;
type RecordKind = 'code' | 'passing' | 'draft';
interface Lease {
  local: LocalDot;
  bootstrap: boolean;
  ownsWrite: () => WriteKind;
}
interface Binding { parent: Record<string, unknown>; key: string; target: Record<string, unknown>; proxy: Record<string, unknown>; existed: boolean }
const brokers = new WeakMap<DotSave, StorageBroker>();

/** A bounded adapter for the unchanged renderer's dot storage accesses.
 * Reads and JSON remain story-owned after mount. Writes are claimed only by a
 * renderer's new result rows or its explicit finalizer; unrelated writes pass
 * through even while an aborted Python run is still settling.
 */
class StorageBroker {
  readonly leases = new Set<Lease>();
  private readonly bindings: Binding[] = [];
  private pendingPass: Lease | null = null;
  private readonly store: DotSave;
  constructor(store: DotSave) {
    this.store = store;
    this.bind(store as unknown as Record<string, unknown>, 'code', 'code');
    this.bind(store.flags, 'buildPassing', 'passing');
    this.bind(store.flags, 'buildDraft', 'draft');
  }
  private bind(parent: Record<string, unknown>, key: string, kind: RecordKind): void {
    const existed = Object.hasOwn(parent, key);
    const target = (parent[key] ?? {}) as Record<string, unknown>;
    const proxy = new Proxy(target, {
      get: (record, prop, receiver) => {
        // Temporary mount values must never leak into persisted story data.
        if (prop === 'toJSON') return () => record;
        if (prop === 'dot') {
          const boot = [...this.leases].reverse().find((lease) => lease.bootstrap);
          if (boot) return kind === 'code' ? boot.local.source : kind === 'passing' ? !!boot.local.passed : (boot.local.draft ??= {});
        }
        return Reflect.get(record, prop, receiver);
      },
      set: (record, prop, value) => {
        if (prop === 'dot' && kind === 'code') {
          for (const lease of [...this.leases].reverse()) {
            const claim = lease.ownsWrite();
            if (!claim) continue;
            lease.local.source = value;
            if (claim === 'result') {
              this.pendingPass = lease;
              queueMicrotask(() => { if (this.pendingPass === lease) this.pendingPass = null; });
            }
            return true;
          }
        }
        if (prop === 'dot' && kind === 'passing' && this.pendingPass) {
          this.pendingPass.local.passed = value;
          this.pendingPass = null;
          return true;
        }
        return Reflect.set(record, prop, value);
      },
    });
    this.bindings.push({ parent, key, target, proxy, existed });
    parent[key] = proxy;
  }
  release(lease: Lease): void {
    this.leases.delete(lease);
    if (this.pendingPass === lease) this.pendingPass = null;
    if (this.leases.size) return;
    for (const binding of this.bindings) {
      if (binding.parent[binding.key] !== binding.proxy) continue;
      if (binding.existed || Object.keys(binding.target).length) binding.parent[binding.key] = binding.target;
      else delete binding.parent[binding.key];
    }
    brokers.delete(this.store);
  }
}

export function isolateBuildStorage(store: DotSave, ownsWrite: () => WriteKind) {
  let broker = brokers.get(store);
  if (!broker) { broker = new StorageBroker(store); brokers.set(store, broker); }
  const previous = localDot(store);
  const local = { ...previous, ...(previous.draft ? { draft: structuredClone(previous.draft) } : {}) };
  const lease: Lease = { local, bootstrap: true, ownsWrite };
  // An older aborted renderer retains its own snapshot. If it settles after
  // a newer build, its late result cannot replace that newer chapter save.
  store.flags['d01-dot-build'] = local;
  broker.leases.add(lease);
  let released = false;
  return {
    local: lease.local,
    mounted: () => { lease.bootstrap = false; },
    release: () => { if (!released) { released = true; broker.release(lease); } },
  };
}

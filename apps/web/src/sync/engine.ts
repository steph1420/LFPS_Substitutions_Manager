/**
 * Live sync engine: last-writer-wins per entity, with an offline outbox (Bundle 35).
 *
 * Every entity version carries (ts, by): the writer's clock in ms and its device id.
 * The higher (ts, by) wins — on the relay and on every device, so all converge to the
 * same value. The relay clamps clocks running more than 2 min ahead.
 *
 * The engine keeps a small meta document per TAB in sessionStorage (`lfps_sync_v1`, so it
 * survives reloads; each tab is its own sync peer with its own socket):
 *   known  — for each entity, the hash + (ts, by) of the version this device holds
 *   outbox — local versions the relay hasn't confirmed yet (survives reloads/offline)
 * Closing a tab drops its meta; its local data stays in localStorage and is re-published
 * by the next tab under the first-run rule below.
 *
 * Rules:
 *   • Local edit → diff against `known` → new version (ts = max(now, known.ts + 1)) into
 *     the outbox. Unchanged entities are never re-sent.
 *   • First run in a week (no meta yet) → local entities get ts = 1, so anything the
 *     relay already has wins; entities the relay lacks are published.
 *   • Remote version → applied when it is not older than `known`; `known` is updated
 *     BEFORE the store changes, so the resulting store update is not sent back (no echo).
 *     An older remote version is ignored and ours is re-published.
 *   • HYDRATE → apply the relay's newer versions, then re-publish everything the relay
 *     lacks or holds older (this is how a restarted, empty relay is refilled).
 *   • A new school week starts a fresh meta.
 *
 *   • Deletions are tombstones (v = null) with their own (ts, by). In sheets mode the relay
 *     reloads substitutions and their tombstones from the Subs tab before it lets devices
 *     in (Bundle 35a), so a newer tombstone in HYDRATE removes a stale local copy and
 *     drops it from the outbox; only an edit made after the deletion wins.
 *
 * Not covered (documented in docs/SAS.md §6.3): undo/redo history is not rewritten for
 * remote changes (undo restores this device's snapshot and syncs that as a new edit).
 * In relay-only mode (no Sheet) a relay restart still forgets non-sub entities and their
 * deletions; in sheets mode only substitutions are reloaded from Subs.
 */
import type { KeyValueStorage } from '../store/persistence.js';
import { stableStringify, type EntityChanges, type EntityMap } from './entities.js';
import { scopedStorageKey } from '../lib/storageScope.js';

export const SYNC_META_KEY = scopedStorageKey('lfps_sync_v1');
export const DEVICE_ID_KEY = scopedStorageKey('lfps_device_id');
export const TAB_ID_KEY = scopedStorageKey('lfps_tab_id');
const TOMB = '-';

/** Wire format, matching apps/server/internal/livesync.Entity. */
export interface Entity {
  k: string;
  v: unknown | null;
  ts: number;
  by: string;
  rev?: number;
}

interface KnownEntry {
  h: string;
  ts: number;
  by: string;
}

export interface SyncMeta {
  v: 1;
  weekStart: string;
  known: Record<string, KnownEntry>;
  outbox: Record<string, Entity>;
}

export const hashValue = (v: unknown | null): string => (v == null ? TOMB : stableStringify(v));

/** (ts, by) ordering — identical to the relay's. */
export function compareVersion(a: { ts: number; by: string }, b: { ts: number; by: string }): number {
  if (a.ts !== b.ts) return a.ts < b.ts ? -1 : 1;
  if (a.by === b.by) return 0;
  return a.by < b.by ? -1 : 1;
}

const freshMeta = (weekStart: string): SyncMeta => ({ v: 1, weekStart, known: {}, outbox: {} });

function parseMeta(raw: string | null): SyncMeta | null {
  if (!raw) return null;
  try {
    const m = JSON.parse(raw) as SyncMeta;
    if (m?.v !== 1 || typeof m.weekStart !== 'string' || typeof m.known !== 'object' || typeof m.outbox !== 'object') return null;
    return m;
  } catch {
    return null;
  }
}

const randomId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID().replace(/-/g, '').slice(0, 10)
    : Math.random().toString(36).slice(2, 12);

function getOrCreate(storage: KeyValueStorage | null, key: string, make: () => string): string {
  try {
    const existing = storage?.getItem(key);
    if (existing) return existing;
  } catch {
    /* storage unavailable */
  }
  const id = make();
  try {
    storage?.setItem(key, id);
  } catch {
    /* in-memory id for this session */
  }
  return id;
}

/** "d-<browser>.<tab>": stable per browser (localStorage) and per tab (sessionStorage). */
export function getDeviceId(local: KeyValueStorage | null, session: KeyValueStorage | null): string {
  const browser = getOrCreate(local, DEVICE_ID_KEY, () => `d-${randomId()}`);
  const tab = getOrCreate(session, TAB_ID_KEY, () => randomId().slice(0, 6));
  return `${browser}.${tab}`;
}

export interface EngineOptions {
  storage: KeyValueStorage | null;
  deviceId: string;
  weekStart: string;
  now?: () => number;
}

export class SyncEngine {
  readonly deviceId: string;
  private storage: KeyValueStorage | null;
  private now: () => number;
  private meta: SyncMeta;
  /** True until the first local diff of a week with no stored meta. */
  private firstRun: boolean;

  constructor(opts: EngineOptions) {
    this.deviceId = opts.deviceId;
    this.storage = opts.storage;
    this.now = opts.now ?? Date.now;
    const stored = this.read();
    if (stored && stored.weekStart === opts.weekStart) {
      this.meta = stored;
      this.firstRun = false;
    } else {
      this.meta = freshMeta(opts.weekStart);
      this.firstRun = true;
    }
  }

  get weekStart(): string {
    return this.meta.weekStart;
  }

  /** New school week: forget the old week's versions and outbox. */
  resetWeek(weekStart: string): void {
    if (weekStart === this.meta.weekStart) return;
    this.meta = freshMeta(weekStart);
    this.firstRun = true;
    this.save();
  }

  /** Entities waiting for the relay, oldest first. */
  pending(): Entity[] {
    return Object.values(this.meta.outbox).sort((a, b) => a.ts - b.ts);
  }

  pendingCount(): number {
    return Object.keys(this.meta.outbox).length;
  }

  /** Record local edits; returns the new versions (also queued in the outbox). */
  diffLocal(local: EntityMap): Entity[] {
    const out: Entity[] = [];
    const first = this.firstRun;
    this.firstRun = false;
    const stamp = (k: string, v: unknown | null) => {
      const prev = this.meta.known[k];
      const ts = first ? 1 : Math.max(this.now(), (prev?.ts ?? 0) + 1);
      const e: Entity = { k, v, ts, by: this.deviceId };
      this.meta.known[k] = { h: hashValue(v), ts, by: this.deviceId };
      this.meta.outbox[k] = e;
      out.push(e);
    };
    for (const [k, v] of Object.entries(local)) {
      if (this.meta.known[k]?.h !== hashValue(v)) stamp(k, v);
    }
    for (const [k, kn] of Object.entries(this.meta.known)) {
      if (!(k in local) && kn.h !== TOMB) stamp(k, null);
    }
    if (out.length || first) this.save();
    return out;
  }

  /**
   * Remote versions (broadcast or ACK). Returns the changes to apply to the store.
   * Versions older than ours are ignored; their keys are re-queued when ours isn't queued.
   */
  applyRemote(entities: Entity[], local?: EntityMap): EntityChanges {
    const changes: EntityChanges = {};
    for (const e of entities) {
      if (!e || typeof e.k !== 'string' || typeof e.ts !== 'number') continue;
      const v = e.v ?? null;
      const h = hashValue(v);
      const kn = this.meta.known[e.k];
      if (kn && kn.h === h) {
        // Same value: adopt the relay's version (it may have clamped our clock).
        this.meta.known[e.k] = { h, ts: e.ts, by: e.by };
        const queued = this.meta.outbox[e.k];
        if (queued && hashValue(queued.v) === h) delete this.meta.outbox[e.k];
        continue;
      }
      if (kn && compareVersion(e, kn) < 0) {
        if (!this.meta.outbox[e.k] && local) this.meta.outbox[e.k] = { k: e.k, v: local[e.k] ?? null, ts: kn.ts, by: kn.by };
        continue;
      }
      this.meta.known[e.k] = { h, ts: e.ts, by: e.by };
      delete this.meta.outbox[e.k];
      changes[e.k] = v;
    }
    this.save();
    return changes;
  }

  /** MUTATION_ACK: the relay's stored winners, plus keys it refused (dropped from the outbox). */
  ack(stored: Entity[], rejected: { k: string }[] = []): EntityChanges {
    for (const r of rejected) delete this.meta.outbox[r.k];
    return this.applyRemote(stored);
  }

  /**
   * HYDRATE: the relay's whole week. Call diffLocal(local) first so `known` matches the store.
   * Returns the changes to apply; the outbox then holds everything the relay must learn.
   */
  hydrate(entities: Entity[], local: EntityMap): EntityChanges {
    const changes = this.applyRemote(entities, local);
    const onRelay = new Set(entities.map((e) => e.k));
    for (const [k, kn] of Object.entries(this.meta.known)) {
      if (onRelay.has(k) || kn.h === TOMB || this.meta.outbox[k]) continue;
      if (k in local) this.meta.outbox[k] = { k, v: local[k], ts: kn.ts, by: kn.by };
    }
    this.save();
    return changes;
  }

  private read(): SyncMeta | null {
    try {
      return parseMeta(this.storage?.getItem(SYNC_META_KEY) ?? null);
    } catch {
      return null;
    }
  }

  private save(): void {
    try {
      this.storage?.setItem(SYNC_META_KEY, JSON.stringify(this.meta));
    } catch {
      /* storage full or unavailable: sync still works for this session */
    }
  }
}

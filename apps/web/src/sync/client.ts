/**
 * The live sync connection (Bundle 35). Exactly one WebSocket per tab: `live.ts` owns a
 * ref-counted singleton started by <App>; components only read `useSyncStatus`.
 *
 * Packets (see docs/SAS.md §6.3):
 *   → HELLO {deviceId, appVersion}            ← HYDRATE {weekStart, rev, entities, mode, sheets?}
 *   → STATE_MUTATION {batchId, changes}       ← MUTATION_ACK {batchId, entities, rejected}
 *   ← STATE_MUTATION {changes, rev, from}     (other devices' accepted changes)
 *   ← CONNECT_ACK / PRESENCE {clients}        ← SHEETS_SNAPSHOT (read-only Sheet data)
 *   ← ERROR {reason, batchId?}
 */
import type { MasterSchedule } from '@lfps/core';
import type { KeyValueStorage } from '../store/persistence.js';
import { applyEntityChanges, extractEntities, SYNC_KEYS, type EntityChanges, type SyncSlice } from './entities.js';
import { SyncEngine, type Entity } from './engine.js';
import { useSyncStatus, type SheetsSummary, type SyncStatus } from './status.js';

export interface SyncStoreState extends SyncSlice {
  activeWeekStart: string;
}

export interface SyncStoreApi<S extends SyncStoreState> {
  getState(): S;
  setState(partial: Partial<S>): void;
  subscribe(listener: (state: S, prev: S) => void): () => void;
}

interface SocketLike {
  readyState: number;
  send(data: string): void;
  close(): void;
  onopen: ((ev: unknown) => void) | null;
  onmessage: ((ev: { data: unknown }) => void) | null;
  onclose: ((ev: unknown) => void) | null;
  onerror: ((ev: unknown) => void) | null;
}

export interface LiveSyncOptions<S extends SyncStoreState> {
  store: SyncStoreApi<S>;
  /** Base routine sched entities are diffed against; a getter follows Sheet updates. */
  defaults: MasterSchedule | (() => MasterSchedule);
  /** Read-only Sheet data from the relay (FEAT-62 part 3); applied by the caller. */
  onSheetSnapshot?: (snapshot: Record<string, unknown>) => void;
  url: string;
  appVersion: string;
  deviceId: string;
  /** Where the per-tab meta lives (sessionStorage in the browser). */
  metaStorage: KeyValueStorage | null;
  createSocket?: (url: string) => SocketLike;
  setStatus?: (patch: Partial<SyncStatus>) => void;
  now?: () => number;
  /** Quiet time after a local edit before it is diffed and sent. */
  diffDelayMs?: number;
  /**
   * Offline needs this many failed attempts in a row AND `wakeWindowMs` since the first one:
   * a sleeping Render relay takes about a minute to wake, which is "Connecting…", not
   * "Offline" (FEAT-66). No network (`isOnline() === false`) is Offline at once.
   */
  offlineAfterFailures?: number;
  wakeWindowMs?: number;
  isOnline?: () => boolean;
  ackTimeoutMs?: number;
  maxBatch?: number;
  /** Byte budget per STATE_MUTATION; the relay closes sockets on frames over 256 KiB. */
  maxBatchBytes?: number;
  /** window: reconnect on `online` and when the tab becomes visible. */
  target?: Pick<Window, 'addEventListener' | 'removeEventListener'>;
  log?: Pick<Console, 'info' | 'warn'>;
}

const OPEN = 1;

export interface LiveSyncClient {
  start(): void;
  stop(): void;
  /** Retry now (Settings "Reconnect"). */
  reconnect(): void;
  /** Diff local edits immediately (tests, pagehide). */
  flushLocal(): void;
}

/** The longest prefix within both limits; always at least one entity (the relay caps a value at 64 KiB). */
export function takeBatch(pending: Entity[], maxCount: number, maxBytes: number): Entity[] {
  const out: Entity[] = [];
  let bytes = 0;
  for (const e of pending) {
    if (out.length >= maxCount) break;
    const size = new TextEncoder().encode(JSON.stringify(e)).length + 1;
    if (out.length && bytes + size > maxBytes) break;
    out.push(e);
    bytes += size;
  }
  return out;
}

export function createLiveSyncClient<S extends SyncStoreState>(opts: LiveSyncOptions<S>): LiveSyncClient {
  const { store, url, appVersion, deviceId } = opts;
  const base = (): MasterSchedule => (typeof opts.defaults === 'function' ? opts.defaults() : opts.defaults);
  const now = opts.now ?? Date.now;
  const setStatus = opts.setStatus ?? ((p: Partial<SyncStatus>) => useSyncStatus.setState(p));
  const createSocket = opts.createSocket ?? ((u: string) => new WebSocket(u) as unknown as SocketLike);
  const diffDelayMs = opts.diffDelayMs ?? 150;
  const offlineAfter = opts.offlineAfterFailures ?? 3;
  const wakeWindowMs = opts.wakeWindowMs ?? 90_000;
  const isOnline =
    opts.isOnline ?? (() => (typeof navigator === 'undefined' || typeof navigator.onLine !== 'boolean' ? true : navigator.onLine));
  const ackTimeoutMs = opts.ackTimeoutMs ?? 15_000;
  const maxBatch = opts.maxBatch ?? 500;
  const maxBatchBytes = opts.maxBatchBytes ?? 128 * 1024;
  const log = opts.log ?? console;

  const engine = new SyncEngine({ storage: opts.metaStorage, deviceId, weekStart: store.getState().activeWeekStart, now });

  let socket: SocketLike | null = null;
  let running = false;
  let live = false;
  let failures = 0;
  let firstFailureAt = 0;
  let wakeTimer: ReturnType<typeof setTimeout> | null = null;
  const clearWake = () => {
    if (wakeTimer) clearTimeout(wakeTimer);
    wakeTimer = null;
  };
  const fail = () => {
    if (failures++ > 0) return;
    firstFailureAt = now();
    // Re-check exactly when the wake window ends, not at the next (backed-off) attempt.
    clearWake();
    wakeTimer = setTimeout(() => {
      wakeTimer = null;
      if (running && !live && failures) setStatus({ phase: downPhase() });
    }, wakeWindowMs);
  };
  const downPhase = (): SyncStatus['phase'] =>
    !isOnline() || (failures >= offlineAfter && now() - firstFailureAt >= wakeWindowMs) ? 'offline' : 'connecting';
  let applying = false;
  let diffTimer: ReturnType<typeof setTimeout> | null = null;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let inflight: { id: string; timer: ReturnType<typeof setTimeout> } | null = null;
  let retryFlushTimer: ReturnType<typeof setTimeout> | null = null;
  let batchSeq = 0;
  let unsubscribe: (() => void) | null = null;

  const local = () => {
    const s = store.getState();
    return extractEntities(s, s.activeWeekStart, base());
  };
  const updatePending = () => setStatus({ pending: engine.pendingCount() });

  const send = (type: string, payload: unknown) => {
    if (socket?.readyState === OPEN) socket.send(JSON.stringify({ type, payload }));
  };

  const applyChanges = (changes: EntityChanges) => {
    if (!Object.keys(changes).length) return;
    const s = store.getState();
    const patch = applyEntityChanges(s, s.activeWeekStart, base(), changes);
    if (!Object.keys(patch).length) return;
    applying = true;
    try {
      store.setState(patch as Partial<S>);
    } finally {
      applying = false;
    }
    setStatus({ lastSyncAt: now() });
  };

  const diffNow = () => {
    if (diffTimer) {
      clearTimeout(diffTimer);
      diffTimer = null;
    }
    const s = store.getState();
    if (s.activeWeekStart !== engine.weekStart) engine.resetWeek(s.activeWeekStart);
    const changes = engine.diffLocal(local());
    updatePending();
    return changes.length;
  };

  const clearInflight = () => {
    if (inflight) clearTimeout(inflight.timer);
    inflight = null;
  };

  const flush = () => {
    if (!live || inflight || socket?.readyState !== OPEN) return;
    const batch = takeBatch(engine.pending(), maxBatch, maxBatchBytes);
    if (!batch.length) return;
    const id = `${deviceId}-${++batchSeq}`;
    inflight = {
      id,
      timer: setTimeout(() => {
        inflight = null; // no ACK: send again
        flush();
      }, ackTimeoutMs),
    };
    send('STATE_MUTATION', { batchId: id, changes: batch });
  };

  const onLocalChange = (state: S, prev: S) => {
    if (applying) return;
    if (state.activeWeekStart !== prev.activeWeekStart) {
      // Week rollover: fresh meta, then ask the relay for the new week.
      diffNow();
      if (live) {
        live = false;
        setStatus({ phase: 'connecting' });
        send('HELLO', { deviceId, appVersion });
      }
      return;
    }
    if (!SYNC_KEYS.some((k) => state[k] !== prev[k])) return;
    if (diffTimer) clearTimeout(diffTimer);
    diffTimer = setTimeout(() => {
      if (diffNow()) flush();
    }, diffDelayMs);
  };

  const handle = (type: string, payload: Record<string, unknown>) => {
    switch (type) {
      case 'CONNECT_ACK':
      case 'PRESENCE':
        setStatus({ clients: Number(payload.clients) || 0 });
        break;
      case 'HYDRATE': {
        const weekStart = String(payload.weekStart ?? '');
        diffNow(); // known must match the store before merging
        if (weekStart !== store.getState().activeWeekStart) {
          log.warn(`[LiveSync] Relay week ${weekStart} ≠ local week ${store.getState().activeWeekStart}; not merging`);
          setStatus({ error: 'Week mismatch' });
        } else {
          applyChanges(engine.hydrate((payload.entities as Entity[]) ?? [], local()));
          setStatus({ error: null });
        }
        live = true;
        failures = 0;
        clearWake();
        const sheets = payload.sheets as { state?: string } | undefined;
        setStatus({
          phase: 'live',
          mode: typeof payload.mode === 'string' ? payload.mode : null,
          sheetsState: sheets?.state ?? null,
          lastSyncAt: now(),
        });
        updatePending();
        flush();
        break;
      }
      case 'STATE_MUTATION': {
        diffNow(); // a pending local edit is newer than anything already in flight
        applyChanges(engine.applyRemote((payload.changes as Entity[]) ?? [], local()));
        updatePending();
        setStatus({ lastSyncAt: now() });
        flush();
        break;
      }
      case 'MUTATION_ACK': {
        if (!inflight || payload.batchId !== inflight.id) break;
        clearInflight();
        const rejected = (payload.rejected as { k: string; reason: string }[] | null) ?? [];
        if (rejected.length) log.warn(`[LiveSync] Relay refused ${rejected.length} change(s): ${rejected[0].reason}`);
        diffNow();
        applyChanges(engine.ack((payload.entities as Entity[]) ?? [], rejected));
        updatePending();
        setStatus({ lastSyncAt: now() });
        flush();
        break;
      }
      case 'SHEETS_SNAPSHOT': {
        const tabs = (payload.tabs as { name: string; rows: unknown[] }[] | undefined) ?? [];
        const summary: SheetsSummary = {
          fetchedAt: Number(payload.fetchedAt) || now(),
          tabs: tabs.map((t) => ({ name: t.name, rows: Array.isArray(t.rows) ? t.rows.length : 0 })),
          hiddenTabs: Number(payload.hiddenTabs) || 0,
        };
        setStatus({ sheets: summary, sheetsState: 'ok' });
        if (opts.onSheetSnapshot) {
          diffNow(); // pending edits are captured against the old base first
          try {
            opts.onSheetSnapshot(payload);
          } catch (err) {
            log.warn(`[LiveSync] Sheet data not applied: ${(err as Error).message}`);
          }
          diffNow(); // redundant overrides become tombstones; everything else is unchanged
          flush(); // the first diffNow() cancelled the pending diff timer: send what it queued
        }
        break;
      }
      case 'ERROR':
        log.warn(`[LiveSync] Relay error: ${String(payload.reason)}`);
        if (inflight && payload.batchId === inflight.id) {
          clearInflight();
          // "hydrating": the relay is reloading Subs after a restart — the batch stays in
          // the outbox and is sent again shortly.
          if (payload.reason === 'hydrating') {
            setStatus({ sheetsState: 'hydrating' });
            if (!retryFlushTimer) {
              retryFlushTimer = setTimeout(() => {
                retryFlushTimer = null;
                flush();
              }, 2000);
            }
          }
        }
        break;
      default:
        break;
    }
  };

  const scheduleRetry = () => {
    if (!running || retryTimer) return;
    const base = Math.min(30_000, 1000 * 2 ** Math.min(failures - 1, 5));
    const delay = Math.round(base * (0.8 + Math.random() * 0.4));
    retryTimer = setTimeout(() => {
      retryTimer = null;
      connect();
    }, delay);
  };

  const connect = () => {
    if (!running || socket) return;
    let ws: SocketLike;
    try {
      ws = createSocket(url);
    } catch (err) {
      fail();
      setStatus({ phase: downPhase(), error: (err as Error).message });
      scheduleRetry();
      return;
    }
    socket = ws;
    setStatus({ phase: downPhase() });
    ws.onopen = () => send('HELLO', { deviceId, appVersion });
    ws.onmessage = (ev) => {
      let packet: { type?: string; payload?: Record<string, unknown> };
      try {
        packet = JSON.parse(String(ev.data));
      } catch {
        return;
      }
      if (packet && typeof packet.type === 'string') handle(packet.type, packet.payload ?? {});
    };
    ws.onerror = () => {
      /* onclose follows */
    };
    ws.onclose = () => {
      if (socket !== ws) return;
      socket = null;
      live = false;
      clearInflight();
      fail();
      setStatus({ phase: downPhase(), clients: 0 });
      scheduleRetry();
    };
  };

  const reconnect = () => {
    if (!running) return;
    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }
    if (!socket) connect();
  };

  const onOffline = () => {
    if (!live) setStatus({ phase: 'offline' });
  };

  const onVisible = () => {
    if (typeof document === 'undefined' || document.visibilityState === 'visible') reconnect();
  };

  return {
    start() {
      if (running) return;
      running = true;
      diffNow();
      unsubscribe = store.subscribe(onLocalChange);
      opts.target?.addEventListener('online', reconnect);
      opts.target?.addEventListener('offline', onOffline);
      opts.target?.addEventListener('focus', onVisible);
      connect();
    },
    stop() {
      if (!running) return;
      running = false;
      diffNow();
      unsubscribe?.();
      unsubscribe = null;
      opts.target?.removeEventListener('online', reconnect);
      opts.target?.removeEventListener('offline', onOffline);
      opts.target?.removeEventListener('focus', onVisible);
      if (retryTimer) clearTimeout(retryTimer);
      retryTimer = null;
      if (retryFlushTimer) clearTimeout(retryFlushTimer);
      retryFlushTimer = null;
      clearWake();
      clearInflight();
      const ws = socket;
      socket = null;
      live = false;
      ws?.close();
    },
    reconnect,
    flushLocal() {
      if (diffNow()) flush();
    },
  };
}

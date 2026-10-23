import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createStore } from 'zustand/vanilla';
import { DEFAULT_MASTER_SCHEDULE, SCHOOL_DAYS } from '@lfps/core';
import type { DayOfWeek } from '@lfps/core';
import { applyEntityChanges, extractEntities, parseKey, stableStringify, type SyncSlice } from '../src/sync/entities.js';
import { compareVersion, getDeviceId, SyncEngine, SYNC_META_KEY, type Entity } from '../src/sync/engine.js';
import { createLiveSyncClient, takeBatch, type SyncStoreState } from '../src/sync/client.js';
import type { SyncStatus } from '../src/sync/status.js';
import { MemoryStorage } from './setup.js';

const WEEK = '2026-10-19'; // Mon
const defaults = DEFAULT_MASTER_SCHEDULE;
const byDay = <T>(make: () => T) => Object.fromEntries(SCHOOL_DAYS.map((d) => [d, make()])) as Record<DayOfWeek, T>;

function emptySlice(): SyncSlice {
  return {
    schedule: { ...defaults },
    absences: [],
    availabilities: {},
    substitutions: [],
    displaced: byDay(() => []),
    officiatingAC: byDay(() => null),
    officiatingCT: byDay(() => ({})),
  };
}

function firstCell(day: DayOfWeek) {
  const periods = defaults[day] as Record<string, Record<string, string>>;
  const period = Object.keys(periods)[0];
  const teacher = Object.keys(periods[period])[0];
  return { period, teacher, task: periods[period][teacher] };
}

function richSlice(): SyncSlice {
  const s = emptySlice();
  const { period, teacher } = firstCell('TUE');
  s.schedule = { ...s.schedule, TUE: { ...s.schedule.TUE, [period]: { ...(s.schedule.TUE as never)[period], [teacher]: 'VI | Art' } } };
  s.absences = [{ teacherId: 't1', teacherName: 'Mrs. A|B', day: 'WED', type: 'FULL_DAY' as never, markedAt: 5 }];
  s.availabilities = { 'Mr. X': { teacherName: 'Mr. X', status: 'FREE_FROM_SUB' as never, isAvailable: false, updatedAt: 3 } };
  s.substitutions = [
    { id: 'sub-1', day: 'WED', period: '1st' as never, originalTeacher: 'Mrs. A|B', substituteTeacher: 'Mr. X', className: 'IV', subject: 'Maths', status: 'COVERED', assignedAt: 7 },
  ];
  s.displaced = { ...s.displaced, FRI: [{ id: 'l1', task: 'V | EVS', ogTeacher: 'Ms. Y', period: '2nd' as never, day: 'FRI' }] };
  s.officiatingAC = { ...s.officiatingAC, MON: 'Mr. X' };
  s.officiatingCT = { ...s.officiatingCT, SAT: { 'KG A': 'Ms. Y' } };
  return s;
}

describe('sync entities', () => {
  it('extracts dated keys for every kind', () => {
    const keys = Object.keys(extractEntities(richSlice(), WEEK, defaults)).sort();
    expect(keys).toEqual(
      [
        'abs|2026-10-21|Mrs.%20A%7CB',
        'avail|2026-10-19|Mr.%20X',
        'limbo|2026-10-23',
        'oac|2026-10-19',
        'oct|2026-10-24|KG%20A',
        expect.stringMatching(/^sched\|2026-10-20\|/),
        'sub|2026-10-21|sub-1',
      ].sort((a, b) => String(a).localeCompare(String(b)))
    );
    expect(parseKey('abs|2026-10-21|Mrs.%20A%7CB')).toEqual({ kind: 'abs', date: '2026-10-21', parts: ['Mrs. A|B'] });
    expect(parseKey('nope|2026-10-21')).toBeNull();
  });

  it('round-trips: applying all entities to an empty week rebuilds the same entities', () => {
    const src = extractEntities(richSlice(), WEEK, defaults);
    const target = emptySlice();
    const patch = applyEntityChanges(target, WEEK, defaults, src);
    const rebuilt = { ...target, ...patch };
    expect(stableStringify(extractEntities(rebuilt, WEEK, defaults))).toBe(stableStringify(src));
    expect(rebuilt.absences[0]).toMatchObject({ teacherName: 'Mrs. A|B', day: 'WED', date: '2026-10-21' });
  });

  it('deletes, keeps order, ignores other weeks and only patches touched fields', () => {
    const s = richSlice();
    s.substitutions.push({ ...s.substitutions[0], id: 'sub-2' });
    const patch = applyEntityChanges(s, WEEK, defaults, {
      'sub|2026-10-21|sub-1': null,
      'sub|2026-10-21|sub-3': { ...s.substitutions[0], id: 'sub-3' },
      'abs|2026-10-12|Old': { teacherName: 'Old' }, // last week
      [Object.keys(extractEntities(s, WEEK, defaults)).find((k) => k.startsWith('sched|'))!]: null,
    });
    expect(Object.keys(patch).sort()).toEqual(['schedule', 'substitutions']);
    expect(patch.substitutions!.map((x) => x.id)).toEqual(['sub-2', 'sub-3']);
    const { period, teacher, task } = firstCell('TUE');
    expect((patch.schedule!.TUE as never as Record<string, Record<string, string>>)[period][teacher]).toBe(task);
  });

  it('hashes values independently of key order', () => {
    expect(stableStringify({ b: 1, a: [{ d: 2, c: undefined }] })).toBe('{"a":[{"d":2}],"b":1}');
  });
});

describe('sync engine (LWW + outbox)', () => {
  let storage: MemoryStorage;
  let clock: number;
  const engine = (id = 'dA') => new SyncEngine({ storage, deviceId: id, weekStart: WEEK, now: () => clock });
  beforeEach(() => {
    storage = new MemoryStorage();
    clock = 1_000_000;
  });

  it('first run stamps local entities ts=1 so the relay wins; later edits use the clock', () => {
    const e = engine();
    const first = e.diffLocal({ 'oac|2026-10-19': 'Mr. X' });
    expect(first).toEqual([{ k: 'oac|2026-10-19', v: 'Mr. X', ts: 1, by: 'dA' }]);
    // the relay already had a newer value → it is applied
    expect(e.hydrate([{ k: 'oac|2026-10-19', v: 'Ms. Y', ts: 500, by: 'dB' }], { 'oac|2026-10-19': 'Mr. X' })).toEqual({
      'oac|2026-10-19': 'Ms. Y',
    });
    expect(e.pendingCount()).toBe(0);
    const next = e.diffLocal({ 'oac|2026-10-19': 'Mrs. Z' });
    expect(next[0].ts).toBe(clock);
  });

  it('does not resend unchanged entities and tombstones removed ones', () => {
    const e = engine();
    e.diffLocal({});
    e.diffLocal({ a: 1 } as never);
    expect(e.diffLocal({ a: 1 } as never)).toEqual([]);
    clock++;
    expect(e.diffLocal({})).toEqual([{ k: 'a', v: null, ts: clock, by: 'dA' }]);
  });

  it('applies newer remote versions, ignores older ones (re-queues ours), and never echoes', () => {
    const e = engine();
    e.diffLocal({});
    e.diffLocal({ 'oac|2026-10-19': 'Mine' });
    e.ack([{ k: 'oac|2026-10-19', v: 'Mine', ts: clock, by: 'dA' }]);
    expect(e.pendingCount()).toBe(0);
    // older remote: ignored and ours re-queued
    expect(e.applyRemote([{ k: 'oac|2026-10-19', v: 'Old', ts: clock - 5, by: 'dB' }], { 'oac|2026-10-19': 'Mine' })).toEqual({});
    expect(e.pending().map((x) => x.v)).toEqual(['Mine']);
    // newer remote: applied, outbox entry dropped, and a diff of the applied state sends nothing
    expect(e.applyRemote([{ k: 'oac|2026-10-19', v: 'Theirs', ts: clock + 5, by: 'dB' }])).toEqual({ 'oac|2026-10-19': 'Theirs' });
    expect(e.pendingCount()).toBe(0);
    expect(e.diffLocal({ 'oac|2026-10-19': 'Theirs' })).toEqual([]);
  });

  it('breaks ties on the device id like the relay', () => {
    expect(compareVersion({ ts: 5, by: 'dB' }, { ts: 5, by: 'dA' })).toBe(1);
    expect(compareVersion({ ts: 4, by: 'dZ' }, { ts: 5, by: 'dA' })).toBe(-1);
  });

  it('keeps the outbox across a reload and clears it on ACK (clamped clock accepted)', () => {
    let e = engine();
    e.diffLocal({});
    e.diffLocal({ x: 'offline edit' } as never);
    e = engine(); // reload, same tab
    expect(e.pending().map((p) => p.k)).toEqual(['x']);
    e.ack([{ k: 'x', v: 'offline edit', ts: clock - 100_000, by: 'dA' }]);
    expect(e.pendingCount()).toBe(0);
    expect(JSON.parse(storage.getItem(SYNC_META_KEY)!).outbox).toEqual({});
  });

  it('drops refused changes from the outbox', () => {
    const e = engine();
    e.diffLocal({});
    e.diffLocal({ bad: 1 } as never);
    e.ack([], [{ k: 'bad' }]);
    expect(e.pendingCount()).toBe(0);
  });

  it('HYDRATE re-publishes what the relay lacks or holds older (empty relay after restart)', () => {
    const e = engine();
    e.diffLocal({});
    const local = { a: 'A', b: 'B' } as never as Record<string, unknown>;
    e.diffLocal(local);
    e.ack([
      { k: 'a', v: 'A', ts: clock, by: 'dA' },
      { k: 'b', v: 'B', ts: clock, by: 'dA' },
    ]);
    expect(e.pendingCount()).toBe(0);
    const changes = e.hydrate([{ k: 'b', v: 'B-old', ts: clock - 1, by: 'dB' }], local);
    expect(changes).toEqual({});
    expect(e.pending().map((p) => `${p.k}=${p.v}@${p.ts}`).sort()).toEqual([`a=A@${clock}`, `b=B@${clock}`]);
  });

  it('starts a fresh meta in a new week', () => {
    const e = engine();
    e.diffLocal({});
    e.diffLocal({ a: 1 } as never);
    e.resetWeek('2026-10-26');
    expect(e.pendingCount()).toBe(0);
    expect(e.diffLocal({ c: 1 } as never)[0].ts).toBe(1);
  });

  it('device ids are stable per browser and per tab', () => {
    const local = new MemoryStorage();
    const tab1 = new MemoryStorage();
    const tab2 = new MemoryStorage();
    const a = getDeviceId(local, tab1);
    expect(getDeviceId(local, tab1)).toBe(a);
    const b = getDeviceId(local, tab2);
    expect(b).not.toBe(a);
    expect(a.split('.')[0]).toBe(b.split('.')[0]);
  });
});

// ── client against an in-memory relay with the same LWW rules as apps/server ──

class FakeRelay {
  entities = new Map<string, Entity>();
  sockets = new Set<FakeSocket>();
  up = true;
  merge(changes: Entity[]) {
    const stored: Entity[] = [];
    const accepted: Entity[] = [];
    for (const c of changes) {
      const cur = this.entities.get(c.k);
      if (cur && compareVersion(c, cur) <= 0) {
        stored.push(cur);
        continue;
      }
      this.entities.set(c.k, c);
      stored.push(c);
      accepted.push(c);
    }
    return { stored, accepted };
  }
}

class FakeSocket {
  readyState = 0;
  onopen: ((e: unknown) => void) | null = null;
  onmessage: ((e: { data: unknown }) => void) | null = null;
  onclose: ((e: unknown) => void) | null = null;
  onerror: ((e: unknown) => void) | null = null;
  sent: { type: string; payload: Record<string, unknown> }[] = [];
  constructor(private relay: FakeRelay) {
    queueMicrotask(() => {
      if (!relay.up) return this.drop();
      this.readyState = 1;
      relay.sockets.add(this);
      this.onopen?.({});
      this.emit('CONNECT_ACK', { clients: relay.sockets.size });
    });
  }
  emit(type: string, payload: unknown) {
    if (this.readyState === 1) this.onmessage?.({ data: JSON.stringify({ type, payload }) });
  }
  send(data: string) {
    const msg = JSON.parse(data);
    this.sent.push(msg);
    if (msg.type === 'HELLO') {
      this.emit('HYDRATE', { weekStart: WEEK, rev: 0, entities: [...this.relay.entities.values()], mode: 'relay-only' });
    } else if (msg.type === 'STATE_MUTATION') {
      const res = this.relay.merge(msg.payload.changes);
      this.emit('MUTATION_ACK', { batchId: msg.payload.batchId, entities: res.stored, rejected: [] });
      if (res.accepted.length) for (const s of this.relay.sockets) if (s !== this) s.emit('STATE_MUTATION', { changes: res.accepted });
    }
  }
  close() {
    this.drop();
  }
  drop() {
    this.readyState = 3;
    this.relay.sockets.delete(this);
    this.onclose?.({});
  }
}

function makeDevice(relay: FakeRelay, id: string, sockets: FakeSocket[], isOnline: () => boolean = () => true) {
  const store = createStore<SyncStoreState>(() => ({ ...emptySlice(), activeWeekStart: WEEK }));
  let status: Partial<SyncStatus> = {};
  const client = createLiveSyncClient({
    store,
    defaults,
    url: 'ws://relay',
    appVersion: 'test',
    deviceId: id,
    metaStorage: new MemoryStorage(),
    createSocket: () => {
      const s = new FakeSocket(relay);
      sockets.push(s);
      return s;
    },
    setStatus: (p) => (status = { ...status, ...p }),
    diffDelayMs: 10,
    isOnline,
    log: { info: () => {}, warn: () => {} },
  });
  return { store, client, status: () => status };
}

const settle = async () => {
  for (let i = 0; i < 5; i++) await vi.advanceTimersByTimeAsync(50);
};

describe('live sync client', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] });
    vi.setSystemTime(new Date(2026, 9, 21, 9, 0));
  });
  afterEach(() => vi.useRealTimers());

  it('two devices converge, one socket each, no echo', async () => {
    const relay = new FakeRelay();
    const socketsA: FakeSocket[] = [];
    const socketsB: FakeSocket[] = [];
    const A = makeDevice(relay, 'dA', socketsA);
    const B = makeDevice(relay, 'dB', socketsB);
    A.client.start();
    B.client.start();
    await settle();
    expect(A.status().phase).toBe('live');
    expect(socketsA).toHaveLength(1);

    A.store.setState({ officiatingAC: { ...A.store.getState().officiatingAC, WED: 'Mr. X' } });
    await settle();
    expect(B.store.getState().officiatingAC.WED).toBe('Mr. X');
    // B applied it without sending anything back
    expect(socketsB[0].sent.filter((m) => m.type === 'STATE_MUTATION')).toHaveLength(0);
    expect(A.status().pending).toBe(0);

    // both edit the same entity: the later write wins on both
    A.store.setState({ officiatingAC: { ...A.store.getState().officiatingAC, WED: 'Ms. A' } });
    await vi.advanceTimersByTimeAsync(5);
    B.store.setState({ officiatingAC: { ...B.store.getState().officiatingAC, WED: 'Ms. B' } });
    await settle();
    expect(A.store.getState().officiatingAC.WED).toBe(B.store.getState().officiatingAC.WED);
    expect(relay.entities.get('oac|2026-10-21')!.v).toBe(A.store.getState().officiatingAC.WED);
  });

  it('queues edits while the relay is down: Connecting… during the wake window, then Offline; flushes after reconnect', async () => {
    const relay = new FakeRelay();
    relay.up = false;
    const sockets: FakeSocket[] = [];
    const A = makeDevice(relay, 'dA', sockets);
    A.client.start();
    await settle();
    expect(A.status().phase).toBe('connecting');
    A.store.setState({ officiatingAC: { ...A.store.getState().officiatingAC, MON: 'Offline edit' } });
    await vi.advanceTimersByTimeAsync(10_000);
    // several failures already, but a Render cold start takes ~1 min: still "Connecting…"
    expect(A.status().phase).toBe('connecting');
    expect(A.status().pending).toBe(1);
    await vi.advanceTimersByTimeAsync(90_000);
    expect(A.status().phase).toBe('offline');

    relay.up = true;
    await vi.advanceTimersByTimeAsync(35_000);
    expect(A.status().phase).toBe('live');
    expect(A.status().pending).toBe(0);
    expect(relay.entities.get('oac|2026-10-19')!.v).toBe('Offline edit');
  });

  it('hydrates a late joiner and refills an empty (restarted) relay', async () => {
    const relay = new FakeRelay();
    const A = makeDevice(relay, 'dA', []);
    A.client.start();
    await settle();
    A.store.setState({ officiatingCT: { ...A.store.getState().officiatingCT, TUE: { 'KG B': 'Ms. Q' } } });
    await settle();

    const B = makeDevice(relay, 'dB', []);
    B.client.start();
    await settle();
    expect(B.store.getState().officiatingCT.TUE).toEqual({ 'KG B': 'Ms. Q' });

    // relay restarts empty; A reconnects and re-publishes
    relay.entities.clear();
    for (const s of [...relay.sockets]) s.drop();
    await vi.advanceTimersByTimeAsync(5_000);
    expect(relay.entities.get('oct|2026-10-20|KG%20B')?.v).toBe('Ms. Q');
  });

  it('stop() closes the only socket', async () => {
    const relay = new FakeRelay();
    const sockets: FakeSocket[] = [];
    const A = makeDevice(relay, 'dA', sockets);
    A.client.start();
    A.client.start();
    await settle();
    expect(sockets).toHaveLength(1);
    A.client.stop();
    expect(relay.sockets.size).toBe(0);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(sockets).toHaveLength(1);
  });
});

describe('live sync client: no network', () => {
  beforeEach(() => vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] }));
  afterEach(() => vi.useRealTimers());
  it('shows Offline at once when the browser reports no network', async () => {
    const relay = new FakeRelay();
    relay.up = false;
    const A = makeDevice(relay, 'dA', [], () => false);
    A.client.start();
    await settle();
    expect(A.status().phase).toBe('offline');
  });
});

describe('sync batching', () => {
  const ent = (i: number, size: number): Entity => ({ k: `abs|2026-10-19|T${i}`, v: { note: 'x'.repeat(size) }, ts: 1, by: 'd' });
  it('keeps each STATE_MUTATION under the byte budget (relay read limit is 256 KiB)', () => {
    const pending = Array.from({ length: 500 }, (_, i) => ent(i, 1000));
    const batch = takeBatch(pending, 500, 128 * 1024);
    const bytes = new TextEncoder().encode(JSON.stringify(batch)).length;
    expect(batch.length).toBeGreaterThan(50);
    expect(batch.length).toBeLessThan(500);
    expect(bytes).toBeLessThanOrEqual(128 * 1024);
    expect(batch).toEqual(pending.slice(0, batch.length)); // a prefix, in order
  });
  it('respects the count limit and always sends at least one entity', () => {
    expect(takeBatch([ent(1, 10), ent(2, 10), ent(3, 10)], 2, 1 << 20)).toHaveLength(2);
    expect(takeBatch([ent(1, 200_000)], 500, 128 * 1024)).toHaveLength(1);
    expect(takeBatch([], 500, 1024)).toEqual([]);
  });
});

describe('live sync client: Sheet data (FEAT-62 part 3)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] });
    vi.setSystemTime(new Date(2026, 9, 21, 9, 0));
  });
  afterEach(() => vi.useRealTimers());

  it('SHEETS_SNAPSHOT rebases onto the new base without losing an in-progress edit', async () => {
    const relay = new FakeRelay();
    const sockets: FakeSocket[] = [];
    let base = defaults;
    const store = createStore<SyncStoreState>(() => ({ ...emptySlice(), activeWeekStart: WEEK }));
    const { period, teacher } = firstCell('TUE');
    const other = Object.keys((defaults.TUE as never as Record<string, Record<string, string>>)[period])[1];
    const client = createLiveSyncClient({
      store,
      defaults: () => base,
      url: 'ws://relay',
      appVersion: 'test',
      deviceId: 'dA',
      metaStorage: new MemoryStorage(),
      createSocket: () => {
        const s = new FakeSocket(relay);
        sockets.push(s);
        return s;
      },
      setStatus: () => {},
      diffDelayMs: 10,
      log: { info: () => {}, warn: () => {} },
      onSheetSnapshot: () => {
        // what reference.applySheetSnapshot does: new base first, then rebase the store
        const next = JSON.parse(JSON.stringify(defaults));
        next.TUE[period][teacher] = 'SHEET KG A';
        next.TUE[period][other] = 'SHEET KG B';
        const s = store.getState();
        const old = base;
        base = next;
        const sch = { ...s.schedule };
        for (const d of SCHOOL_DAYS) {
          const day = JSON.parse(JSON.stringify(next[d]));
          for (const [p, byT] of Object.entries(s.schedule[d] as Record<string, Record<string, string>>))
            for (const [t, v] of Object.entries(byT)) if ((old[d] as never as Record<string, Record<string, string>>)[p]?.[t] !== v) (day[p] ??= {})[t] = v;
          sch[d] = day;
        }
        store.setState({ schedule: sch });
      },
    });
    client.start();
    await settle();
    // an edit, still inside the diff delay, when the Sheet data arrives
    const s = store.getState();
    store.setState({ schedule: { ...s.schedule, TUE: { ...s.schedule.TUE, [period]: { ...(s.schedule.TUE as never)[period], [teacher]: 'MINE' } } } });
    sockets[0].emit('SHEETS_SNAPSHOT', { hash: 'h1', fetchedAt: 1, tabs: [] });
    await settle();
    const cell = (k: string) => (store.getState().schedule.TUE as never as Record<string, Record<string, string>>)[period][k];
    expect(cell(teacher)).toBe('MINE');
    expect(cell(other)).toBe('SHEET KG B');
    const sched = [...relay.entities.values()].filter((e) => e.k.startsWith('sched|'));
    expect(sched.map((e) => e.v)).toEqual(['MINE']); // only the real edit was synced
    client.stop();
  });

  it('a batch refused while the relay is hydrating is sent again', async () => {
    const relay = new FakeRelay();
    const sockets: FakeSocket[] = [];
    const A = makeDevice(relay, 'dA', sockets);
    A.client.start();
    await settle();
    const sock = sockets[0];
    const realSend = sock.send.bind(sock);
    let refused = 0;
    sock.send = (data: string) => {
      const msg = JSON.parse(data);
      if (msg.type === 'STATE_MUTATION' && refused === 0) {
        refused++;
        sock.sent.push(msg);
        sock.emit('ERROR', { reason: 'hydrating', batchId: msg.payload.batchId });
        return;
      }
      realSend(data);
    };
    A.store.setState({ officiatingAC: { ...A.store.getState().officiatingAC, THU: 'Mr. X' } });
    await settle();
    expect(refused).toBe(1);
    expect(relay.entities.get('oac|2026-10-22')).toBeUndefined();
    await vi.advanceTimersByTimeAsync(2100);
    expect(relay.entities.get('oac|2026-10-22')!.v).toBe('Mr. X');
    A.client.stop();
  });
});

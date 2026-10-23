/**
 * Reload-safe local persistence for operational state (FEAT-62 part 1, BUG-25 part 1).
 *
 * WHAT IS SAVED (per browser, per device — this is NOT cross-device sync; that is FEAT-62
 * part 2 / Bundle 35 via the Render relay + Google Sheets bridge):
 *   • per CALENDAR DATE  : absences (incl. Away on Official Duty), substitutions (incl.
 *                          ACCEPTED / DISPUTED states), displaced (Limbo) items,
 *                          Off. AC, Off. CT, and routine edits for that date
 *   • per SCHOOL WEEK    : staff availability (it has no day field in the data model)
 *   • active week only   : undo/redo history (capped), so ⌘Z still works after a reload
 *   • global             : notifications (capped, aged out)
 *
 * WHY DATES: the UI has six weekday slots (MON–SAT). Each slot is bound to the real
 * calendar date of the active school week (see @lfps/core `activeWeekStart`). Last
 * Monday's absences are stored under last Monday's date, so they never reappear on
 * this Monday. Records older than RETENTION_DAYS are pruned on every save.
 *
 * ROUTINE EDITS are stored as a per-date DIFF against the built-in master timetable
 * (DEFAULT_MASTER_SCHEDULE). They are day-level operational overrides — exactly what
 * "Reset Day" already reverts. Permanent master-timetable changes belong in the
 * owner's Google Sheets (source of truth) and arrive via the Sheets bridge (Bundle 35).
 *
 * SCHEMA: the stored document carries `schemaVersion`. `migrateOperationalDoc` upgrades
 * older versions step by step. A document from a NEWER app version, or one that cannot
 * be parsed, is copied to a backup key before it is replaced — nothing is silently lost.
 */
import {
  activeWeekStart as computeActiveWeekStart,
  addDaysISO,
  dateForSchoolDay,
  daysBetweenISO,
  isISODate,
  schoolDayForDate,
  toISODate,
  SCHOOL_DAYS,
} from '@lfps/core';
import type {
  AbsenceRecord,
  AppNotification,
  DayOfWeek,
  MasterSchedule,
  StaffAvailabilityRecord,
  SubstitutionAssignment,
} from '@lfps/core';
import type {
  DisplacedItem,
  HistoryStack,
  RosterSnapshot,
  RoutineSnapshot,
  SubstitutionsSnapshot,
} from './useTimetableStore.js';

export const OPERATIONAL_STATE_KEY = 'lfps_operational_state';
export const OPERATIONAL_STATE_BACKUP_PREFIX = 'lfps_operational_state_backup_';
export const CURRENT_SCHEMA_VERSION = 1;
/** Day/week records older than this many days (relative to today) are pruned. */
export const RETENTION_DAYS = 42;
export const NOTIFICATION_RETENTION_DAYS = 14;
export const MAX_PERSISTED_NOTIFICATIONS = 100;
/** Undo/redo entries kept per stack across reloads (in-memory cap stays 30). */
export const MAX_PERSISTED_HISTORY = 10;

type DaySchedule = MasterSchedule[DayOfWeek];
/** period → teacher → task, only for cells that differ from the master timetable. */
export type ScheduleOverrides = Record<string, Record<string, string>>;

export interface PersistedDayRecord {
  day: DayOfWeek;
  absences: AbsenceRecord[];
  substitutions: SubstitutionAssignment[];
  displaced: DisplacedItem[];
  officiatingAC: string | null;
  officiatingCT: Record<string, string>;
  scheduleOverrides: ScheduleOverrides;
  updatedAt: number;
}

export interface PersistedWeekRecord {
  availabilities: Record<string, StaffAvailabilityRecord>;
  updatedAt: number;
}

export interface PersistedRoutineSnapshot {
  scheduleOverrides: Partial<Record<DayOfWeek, ScheduleOverrides>>;
  displaced: Record<DayOfWeek, DisplacedItem[]>;
}

export interface PersistedHistory {
  weekStart: string;
  routine: HistoryStack<PersistedRoutineSnapshot>;
  substitutions: HistoryStack<SubstitutionsSnapshot>;
  roster: HistoryStack<RosterSnapshot>;
}

export interface OperationalDocV1 {
  schemaVersion: 1;
  savedAt: number;
  appVersion: string;
  /** ISO date → that day's operational record. */
  days: Record<string, PersistedDayRecord>;
  /** Monday ISO date → that week's records. */
  weeks: Record<string, PersistedWeekRecord>;
  history: PersistedHistory | null;
  notifications: AppNotification[];
}

export type OperationalDoc = OperationalDocV1;

/** The slice of store state that is persisted. */
export interface OperationalSlice {
  schedule: MasterSchedule;
  absences: AbsenceRecord[];
  availabilities: Record<string, StaffAvailabilityRecord>;
  substitutions: SubstitutionAssignment[];
  displaced: Record<DayOfWeek, DisplacedItem[]>;
  officiatingAC: Record<DayOfWeek, string | null>;
  officiatingCT: Record<DayOfWeek, Record<string, string>>;
  notifications: AppNotification[];
  routineHistory: HistoryStack<RoutineSnapshot>;
  substitutionsHistory: HistoryStack<SubstitutionsSnapshot>;
  rosterHistory: HistoryStack<RosterSnapshot>;
}

export const OPERATIONAL_KEYS: readonly (keyof OperationalSlice)[] = [
  'schedule',
  'absences',
  'availabilities',
  'substitutions',
  'displaced',
  'officiatingAC',
  'officiatingCT',
  'notifications',
  'routineHistory',
  'substitutionsHistory',
  'rosterHistory',
];

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

// ───────────────────────────── helpers ─────────────────────────────

const emptyByDay = <T>(make: () => T): Record<DayOfWeek, T> =>
  Object.fromEntries(SCHOOL_DAYS.map((d) => [d, make()])) as Record<DayOfWeek, T>;

const emptyStack = <T>(): HistoryStack<T> => ({ past: [], future: [] });

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Cells of `current` that differ from `base` for one day. */
export function diffDaySchedule(base: DaySchedule | undefined, current: DaySchedule | undefined): ScheduleOverrides {
  const overrides: ScheduleOverrides = {};
  if (!current) return overrides;
  for (const [period, teachers] of Object.entries(current)) {
    if (!teachers) continue;
    const basePeriod = (base as Record<string, Record<string, string>> | undefined)?.[period] ?? {};
    for (const [teacher, task] of Object.entries(teachers as Record<string, string>)) {
      if (basePeriod[teacher] !== task) {
        (overrides[period] ??= {})[teacher] = task;
      }
    }
  }
  return overrides;
}

/** Master-timetable day with the stored overrides applied (base is never mutated). */
export function applyDayOverrides(base: DaySchedule | undefined, overrides: ScheduleOverrides | undefined): DaySchedule {
  const result = { ...(base ?? {}) } as Record<string, Record<string, string>>;
  if (overrides) {
    for (const [period, teachers] of Object.entries(overrides)) {
      result[period] = { ...(result[period] ?? {}), ...teachers };
    }
  }
  return result as DaySchedule;
}

function toPersistedRoutineSnapshot(snap: RoutineSnapshot, defaults: MasterSchedule): PersistedRoutineSnapshot {
  const scheduleOverrides: Partial<Record<DayOfWeek, ScheduleOverrides>> = {};
  for (const day of SCHOOL_DAYS) {
    const diff = diffDaySchedule(defaults[day], snap.schedule[day]);
    if (Object.keys(diff).length) scheduleOverrides[day] = diff;
  }
  return { scheduleOverrides, displaced: snap.displaced };
}

function fromPersistedRoutineSnapshot(snap: PersistedRoutineSnapshot, defaults: MasterSchedule): RoutineSnapshot {
  const schedule = { ...defaults } as MasterSchedule;
  for (const day of SCHOOL_DAYS) {
    const overrides = snap.scheduleOverrides?.[day];
    if (overrides) schedule[day] = applyDayOverrides(defaults[day], overrides);
  }
  return { schedule, displaced: { ...emptyByDay<DisplacedItem[]>(() => []), ...(snap.displaced ?? {}) } };
}

const capStack = <T>(stack: HistoryStack<T>): HistoryStack<T> => ({
  past: stack.past.slice(-MAX_PERSISTED_HISTORY),
  future: stack.future.slice(-MAX_PERSISTED_HISTORY),
});

const mapStack = <A, B>(stack: HistoryStack<A>, fn: (a: A) => B): HistoryStack<B> => ({
  past: stack.past.map(fn),
  future: stack.future.map(fn),
});

// ──────────────────────────── migrations ────────────────────────────

export type MigrationResult =
  | { ok: true; doc: OperationalDoc; migratedFrom: number | null }
  | { ok: false; reason: 'empty' | 'corrupt' | 'newer-schema'; foundVersion?: number };

/**
 * Upgrade steps: MIGRATIONS[n] turns a version-n document into version n+1.
 * When the schema changes: bump CURRENT_SCHEMA_VERSION, add OperationalDocV2,
 * add MIGRATIONS[1] = (v1) => v2, and add a test with a stored v1 fixture.
 */
const MIGRATIONS: Record<number, (doc: Record<string, unknown>) => Record<string, unknown>> = {};

function isValidV1(doc: Record<string, unknown>): doc is Record<string, unknown> & OperationalDocV1 {
  return doc.schemaVersion === 1 && isRecord(doc.days) && isRecord(doc.weeks) && Array.isArray(doc.notifications);
}

export function migrateOperationalDoc(raw: string | null): MigrationResult {
  if (raw === null || raw === '') return { ok: false, reason: 'empty' };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, reason: 'corrupt' };
  }
  if (!isRecord(parsed) || typeof parsed.schemaVersion !== 'number') return { ok: false, reason: 'corrupt' };

  const startVersion = parsed.schemaVersion;
  if (startVersion > CURRENT_SCHEMA_VERSION) {
    return { ok: false, reason: 'newer-schema', foundVersion: startVersion };
  }
  let doc: Record<string, unknown> = parsed;
  while ((doc.schemaVersion as number) < CURRENT_SCHEMA_VERSION) {
    const step = MIGRATIONS[doc.schemaVersion as number];
    if (!step) return { ok: false, reason: 'corrupt', foundVersion: startVersion };
    doc = step(doc);
  }
  if (!isValidV1(doc)) return { ok: false, reason: 'corrupt', foundVersion: startVersion };
  return { ok: true, doc, migratedFrom: startVersion === CURRENT_SCHEMA_VERSION ? null : startVersion };
}

// ───────────────────────────── hydrate ─────────────────────────────

/** Build the in-memory operational state for one school week from a stored document. */
export function hydrateWeek(
  doc: OperationalDoc | null,
  weekStart: string,
  defaults: MasterSchedule,
  now: Date = new Date()
): OperationalSlice {
  const schedule = { ...defaults } as MasterSchedule;
  const absences: AbsenceRecord[] = [];
  const substitutions: SubstitutionAssignment[] = [];
  const displaced = emptyByDay<DisplacedItem[]>(() => []);
  const officiatingAC = emptyByDay<string | null>(() => null);
  const officiatingCT = emptyByDay<Record<string, string>>(() => ({}));

  for (const day of SCHOOL_DAYS) {
    const date = dateForSchoolDay(weekStart, day);
    const rec = doc?.days[date];
    if (!rec) continue;
    if (rec.scheduleOverrides && Object.keys(rec.scheduleOverrides).length) {
      schedule[day] = applyDayOverrides(defaults[day], rec.scheduleOverrides);
    }
    absences.push(...(rec.absences ?? []).map((a) => ({ ...a, day, date })));
    substitutions.push(...(rec.substitutions ?? []).map((s) => ({ ...s, day })));
    displaced[day] = (rec.displaced ?? []).map((d) => ({ ...d, day }));
    officiatingAC[day] = rec.officiatingAC ?? null;
    officiatingCT[day] = { ...(rec.officiatingCT ?? {}) };
  }

  const history = doc?.history && doc.history.weekStart === weekStart ? doc.history : null;
  const notifCutoff = now.getTime() - NOTIFICATION_RETENTION_DAYS * 86_400_000;

  return {
    schedule,
    absences,
    availabilities: { ...(doc?.weeks[weekStart]?.availabilities ?? {}) },
    substitutions,
    displaced,
    officiatingAC,
    officiatingCT,
    notifications: (doc?.notifications ?? []).filter((n) => n.timestamp >= notifCutoff),
    routineHistory: history
      ? mapStack(history.routine, (s) => fromPersistedRoutineSnapshot(s, defaults))
      : emptyStack<RoutineSnapshot>(),
    substitutionsHistory: history ? history.substitutions : emptyStack<SubstitutionsSnapshot>(),
    rosterHistory: history ? history.roster : emptyStack<RosterSnapshot>(),
  };
}

// ──────────────────────────── dehydrate ────────────────────────────

/**
 * Merge the in-memory state for `weekStart` into the stored document. Dates outside the
 * active week are preserved (archive) until they age past RETENTION_DAYS.
 */
export function dehydrateWeek(
  slice: OperationalSlice,
  weekStart: string,
  previous: OperationalDoc | null,
  defaults: MasterSchedule,
  now: Date,
  appVersion: string
): OperationalDoc {
  const nowMs = now.getTime();
  const days: Record<string, PersistedDayRecord> = { ...(previous?.days ?? {}) };
  const weeks: Record<string, PersistedWeekRecord> = { ...(previous?.weeks ?? {}) };

  for (const day of SCHOOL_DAYS) {
    const date = dateForSchoolDay(weekStart, day);
    const record: PersistedDayRecord = {
      day,
      absences: slice.absences.filter((a) => a.day === day).map((a) => ({ ...a, date })),
      substitutions: slice.substitutions.filter((s) => s.day === day),
      displaced: slice.displaced[day] ?? [],
      officiatingAC: slice.officiatingAC[day] ?? null,
      officiatingCT: slice.officiatingCT[day] ?? {},
      scheduleOverrides: diffDaySchedule(defaults[day], slice.schedule[day]),
      updatedAt: nowMs,
    };
    const isEmpty =
      !record.absences.length &&
      !record.substitutions.length &&
      !record.displaced.length &&
      !record.officiatingAC &&
      !Object.keys(record.officiatingCT).length &&
      !Object.keys(record.scheduleOverrides).length;
    if (isEmpty) {
      delete days[date];
    } else {
      const prev = previous?.days[date];
      // Keep the old timestamp when nothing changed, so "last updated" stays meaningful.
      if (prev && sameContent(prev, record)) record.updatedAt = prev.updatedAt;
      days[date] = record;
    }
  }

  if (Object.keys(slice.availabilities).length) {
    const prev = previous?.weeks[weekStart];
    const record = { availabilities: slice.availabilities, updatedAt: nowMs };
    weeks[weekStart] =
      prev && JSON.stringify(prev.availabilities) === JSON.stringify(record.availabilities) ? prev : record;
  } else {
    delete weeks[weekStart];
  }

  const hasHistory =
    slice.routineHistory.past.length +
      slice.routineHistory.future.length +
      slice.substitutionsHistory.past.length +
      slice.substitutionsHistory.future.length +
      slice.rosterHistory.past.length +
      slice.rosterHistory.future.length >
    0;

  const doc: OperationalDoc = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    savedAt: nowMs,
    appVersion,
    days,
    weeks,
    history: hasHistory
      ? {
          weekStart,
          routine: mapStack(capStack(slice.routineHistory), (s) => toPersistedRoutineSnapshot(s, defaults)),
          substitutions: capStack(slice.substitutionsHistory),
          roster: capStack(slice.rosterHistory),
        }
      : null,
    notifications: slice.notifications,
  };
  return pruneOperationalDoc(doc, now);
}

function sameContent(a: PersistedDayRecord, b: PersistedDayRecord): boolean {
  return JSON.stringify({ ...a, updatedAt: 0 }) === JSON.stringify({ ...b, updatedAt: 0 });
}

/** Drop day/week records older than RETENTION_DAYS and stale/excess notifications. */
export function pruneOperationalDoc(doc: OperationalDoc, now: Date): OperationalDoc {
  const today = toISODate(now);
  const keep = (iso: string) => isISODate(iso) && daysBetweenISO(iso, today) <= RETENTION_DAYS;
  const notifCutoff = now.getTime() - NOTIFICATION_RETENTION_DAYS * 86_400_000;
  return {
    ...doc,
    days: Object.fromEntries(Object.entries(doc.days).filter(([iso]) => keep(iso))),
    // A week is kept while its Saturday is within retention.
    weeks: Object.fromEntries(Object.entries(doc.weeks).filter(([iso]) => isISODate(iso) && keep(addDaysISO(iso, 5)))),
    notifications: doc.notifications
      .filter((n) => n.timestamp >= notifCutoff)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, MAX_PERSISTED_NOTIFICATIONS),
  };
}

// ──────────────────────────── storage I/O ────────────────────────────

export interface LoadResult {
  doc: OperationalDoc | null;
  /** Set when an unreadable or newer-version document was moved aside. */
  backedUpTo: string | null;
  reason: 'empty' | 'corrupt' | 'newer-schema' | null;
}

export function loadOperationalDoc(storage: KeyValueStorage, now: Date = new Date()): LoadResult {
  let raw: string | null = null;
  try {
    raw = storage.getItem(OPERATIONAL_STATE_KEY);
  } catch {
    return { doc: null, backedUpTo: null, reason: 'corrupt' };
  }
  const result = migrateOperationalDoc(raw);
  if (result.ok) return { doc: pruneOperationalDoc(result.doc, now), backedUpTo: null, reason: null };
  if (result.reason === 'empty') return { doc: null, backedUpTo: null, reason: 'empty' };

  // Never destroy data we cannot read: move it aside first.
  const backupKey = `${OPERATIONAL_STATE_BACKUP_PREFIX}${result.reason}_${now.getTime()}`;
  try {
    storage.setItem(backupKey, raw as string);
    storage.removeItem(OPERATIONAL_STATE_KEY);
    return { doc: null, backedUpTo: backupKey, reason: result.reason };
  } catch {
    return { doc: null, backedUpTo: null, reason: result.reason };
  }
}

export type SaveOutcome = { ok: true; degraded: boolean } | { ok: false; error: string };

/** Write the document; if storage is full, retry without undo history, then without notifications. */
export function saveOperationalDoc(storage: KeyValueStorage, doc: OperationalDoc): SaveOutcome {
  const attempts: OperationalDoc[] = [doc, { ...doc, history: null }, { ...doc, history: null, notifications: [] }];
  let lastError = '';
  for (let i = 0; i < attempts.length; i++) {
    try {
      storage.setItem(OPERATIONAL_STATE_KEY, JSON.stringify(attempts[i]));
      return { ok: true, degraded: i > 0 };
    } catch (err) {
      lastError = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    }
  }
  return { ok: false, error: lastError || 'Unknown storage error' };
}

// ──────────────────────────── store binding ────────────────────────────

export interface PersistenceStatus {
  state: 'idle' | 'saved' | 'degraded' | 'error';
  lastSavedAt: number | null;
  error: string | null;
  /** Non-null when an unreadable / newer-version saved document was moved to this key. */
  backupKey: string | null;
}

export interface PersistableState extends OperationalSlice {
  activeWeekStart: string;
  selectedDay: DayOfWeek;
  persistenceStatus: PersistenceStatus;
}

interface StoreApiLike<S> {
  getState(): S;
  setState(partial: Partial<S>): void;
  subscribe(listener: (state: S, prev: S) => void): () => void;
}

export interface PersistenceOptions {
  storage: KeyValueStorage;
  defaults: MasterSchedule;
  appVersion: string;
  now?: () => Date;
  debounceMs?: number;
  /** Event target for lifecycle events (window in the browser). */
  target?: Pick<Window, 'addEventListener' | 'removeEventListener'> & {
    document?: { visibilityState: string; addEventListener: Document['addEventListener']; removeEventListener: Document['removeEventListener'] };
  };
  rolloverCheckMs?: number;
}

/** Initial state for store creation: today's active week hydrated from storage. */
export function loadInitialOperationalState(
  storage: KeyValueStorage | null,
  defaults: MasterSchedule,
  now: Date = new Date()
): PersistableState {
  const weekStart = computeActiveWeekStart(now);
  const loaded = storage ? loadOperationalDoc(storage, now) : { doc: null, backedUpTo: null, reason: null };
  return {
    ...hydrateWeek(loaded.doc, weekStart, defaults, now),
    activeWeekStart: weekStart,
    selectedDay: schoolDayForDate(now) ?? 'MON',
    persistenceStatus: {
      state: 'idle',
      lastSavedAt: loaded.doc?.savedAt ?? null,
      error: null,
      backupKey: loaded.backedUpTo,
    },
  };
}

/**
 * Wire a zustand-style store to localStorage: debounced saves on change, a flush when the
 * page is hidden/closed, week rollover, and cross-tab refresh. Returns a disposer.
 */
export function installOperationalPersistence<S extends PersistableState>(
  store: StoreApiLike<S>,
  options: PersistenceOptions
): { flush: () => void; checkRollover: () => boolean; dispose: () => void } {
  const { storage, defaults, appVersion, target } = options;
  const now = options.now ?? (() => new Date());
  const debounceMs = options.debounceMs ?? 250;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let dirty = false;
  let applyingExternal = false;

  const flush = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (!dirty) return;
    dirty = false;
    const state = store.getState();
    const current = now();
    const previous = loadOperationalDoc(storage, current).doc;
    const doc = dehydrateWeek(state, state.activeWeekStart, previous, defaults, current, appVersion);
    const outcome = saveOperationalDoc(storage, doc);
    applyingExternal = true;
    try {
      store.setState({
        persistenceStatus: outcome.ok
          ? { ...state.persistenceStatus, state: outcome.degraded ? 'degraded' : 'saved', lastSavedAt: doc.savedAt, error: null }
          : { ...state.persistenceStatus, state: 'error', error: outcome.error },
      } as Partial<S>);
    } finally {
      applyingExternal = false;
    }
    if (!outcome.ok) console.error('[persistence] Could not save operational state:', outcome.error);
  };

  const schedule = () => {
    dirty = true;
    if (timer) clearTimeout(timer);
    timer = setTimeout(flush, debounceMs);
  };

  const unsubscribe = store.subscribe((state, prev) => {
    if (applyingExternal) return;
    if (OPERATIONAL_KEYS.some((k) => state[k] !== prev[k])) schedule();
  });

  const applyWeek = (weekStart: string, current: Date, selectToday: boolean) => {
    const doc = loadOperationalDoc(storage, current).doc;
    applyingExternal = true;
    try {
      store.setState({
        ...hydrateWeek(doc, weekStart, defaults, current),
        activeWeekStart: weekStart,
        ...(selectToday ? { selectedDay: schoolDayForDate(current) ?? 'MON' } : {}),
      } as Partial<S>);
    } finally {
      applyingExternal = false;
    }
  };

  /** Switch to a new school week when the calendar moves on (tab left open overnight). */
  const checkRollover = () => {
    const current = now();
    const weekStart = computeActiveWeekStart(current);
    if (weekStart === store.getState().activeWeekStart) return false;
    flush(); // persist the old week under its own dates first
    applyWeek(weekStart, current, true);
    return true;
  };

  const onVisibility = () => {
    if (target?.document?.visibilityState === 'hidden') flush();
    else checkRollover();
  };
  const onStorage = (e: StorageEvent) => {
    if (e.key !== OPERATIONAL_STATE_KEY || dirty) return;
    applyWeek(store.getState().activeWeekStart, now(), false); // another tab saved
  };

  target?.addEventListener('pagehide', flush);
  target?.addEventListener('beforeunload', flush);
  target?.addEventListener('focus', checkRollover);
  target?.addEventListener('storage', onStorage as EventListener);
  target?.document?.addEventListener('visibilitychange', onVisibility);
  const interval = options.rolloverCheckMs ? setInterval(checkRollover, options.rolloverCheckMs) : null;

  return {
    flush,
    checkRollover,
    dispose: () => {
      flush();
      unsubscribe();
      if (interval) clearInterval(interval);
      target?.removeEventListener('pagehide', flush);
      target?.removeEventListener('beforeunload', flush);
      target?.removeEventListener('focus', checkRollover);
      target?.removeEventListener('storage', onStorage as EventListener);
      target?.document?.removeEventListener('visibilitychange', onVisibility);
    },
  };
}

/** localStorage when available and usable (private mode / disabled storage → null). */
export function getBrowserStorage(): KeyValueStorage | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const probe = '__lfps_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    return null;
  }
}

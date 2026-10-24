/**
 * FEAT-62 part 3 — reference data (staff directory, base routine, subject names) from the
 * owner's Sheet, cached per device and applied without clobbering local edits.
 *
 * Precedence, highest first:
 *   1. this device's / the relay's date-scoped edits (absences, subs, day overrides …)
 *   2. the Sheet's reference tabs (the newest snapshot this device has seen)
 *   3. the bundled seed (@lfps/core)
 *
 * Day overrides are stored as a diff against the base routine, so a new base is applied by
 * rebasing: overrides = diff(oldBase, schedule); schedule = apply(newBase, overrides). A cell
 * someone changed today keeps their value; untouched cells follow the Sheet.
 *
 * A snapshot is applied only when its hash differs and it is not older than the cached one
 * (fetchedAt is the time the relay first saw that data, App_Meta "last_pull").
 */
import { create } from 'zustand';
import { DEFAULT_MASTER_SCHEDULE, DEFAULT_STAFF_DIRECTORY, type DayOfWeek, type MasterSchedule, type StaffDirectory } from '@lfps/core';
import { applyDayOverrides, diffDaySchedule, type KeyValueStorage } from '../store/persistence.js';
import { mapSheetData, type SheetSnapshot } from './sheetData.js';
import { scopedStorageKey } from '../lib/storageScope.js';

export const REFERENCE_KEY = scopedStorageKey('lfps_reference_v1');

export interface ReferenceCache {
  v: 1;
  hash: string;
  fetchedAt: number;
  appliedAt: number;
  relayVersion: string | null;
  directory: StaffDirectory;
  routine: MasterSchedule;
  subjects: Record<string, string>;
  routineFromSheet: number;
  unmappedTabs: string[];
  issues: string[];
}

/** For Settings → About (no personal data). */
export interface ReferenceInfo {
  source: 'sheet' | 'bundled';
  hash: string | null;
  fetchedAt: number | null;
  appliedAt: number | null;
  staff: number;
  routineTeachers: number;
  unmappedTabs: string[];
  issues: string[];
}

const DAYS: DayOfWeek[] = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

let current: ReferenceCache | null = null;
let storage: KeyValueStorage | null = null;

function infoOf(c: ReferenceCache | null): ReferenceInfo {
  return c
    ? {
        source: 'sheet',
        hash: c.hash,
        fetchedAt: c.fetchedAt,
        appliedAt: c.appliedAt,
        staff: Object.keys(c.directory).length,
        routineTeachers: c.routineFromSheet,
        unmappedTabs: c.unmappedTabs,
        issues: c.issues,
      }
    : {
        source: 'bundled',
        hash: null,
        fetchedAt: null,
        appliedAt: null,
        staff: Object.keys(DEFAULT_STAFF_DIRECTORY).length,
        routineTeachers: 0,
        unmappedTabs: [],
        issues: [],
      };
}

export const useReferenceInfo = create<ReferenceInfo>(() => infoOf(null));

function valid(c: unknown): c is ReferenceCache {
  const r = c as ReferenceCache;
  return (
    !!r &&
    r.v === 1 &&
    typeof r.hash === 'string' &&
    typeof r.fetchedAt === 'number' &&
    !!r.directory &&
    typeof r.directory === 'object' &&
    !!r.routine &&
    DAYS.every((d) => r.routine[d] && typeof r.routine[d] === 'object')
  );
}

/** Loads the cached reference data (call once, before the store is created). */
export function initReference(s: KeyValueStorage | null): void {
  storage = s;
  current = null;
  try {
    const raw = s?.getItem(REFERENCE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (valid(parsed)) current = parsed;
    else if (raw) s?.removeItem(REFERENCE_KEY);
  } catch {
    current = null;
  }
  useReferenceInfo.setState(infoOf(current));
}

export function getBaseSchedule(): MasterSchedule {
  return current?.routine ?? DEFAULT_MASTER_SCHEDULE;
}

export function getBaseDirectory(): StaffDirectory {
  return current?.directory ?? DEFAULT_STAFF_DIRECTORY;
}

/** Subject abbreviation → full name from the Sheet, if it has one. */
export function sheetSubjectName(code: string): string | undefined {
  return current?.subjects[code];
}

/** Moves day overrides from oldBase onto newBase (cells nobody changed follow newBase). */
export function rebaseSchedule(schedule: MasterSchedule, oldBase: MasterSchedule, newBase: MasterSchedule): MasterSchedule {
  const out = { ...schedule } as MasterSchedule;
  for (const day of DAYS) {
    out[day] = applyDayOverrides(newBase[day], diffDaySchedule(oldBase[day], schedule[day]));
  }
  return out;
}

export interface ReferenceTarget {
  getState(): { schedule: MasterSchedule; routineHistory: { past: { schedule: MasterSchedule }[]; future: { schedule: MasterSchedule }[] } };
  setState(patch: Record<string, unknown>): void;
}

export type ApplyOutcome = 'applied' | 'unchanged' | 'older' | 'invalid';

/**
 * Applies a SHEETS_SNAPSHOT to the store. The cache is updated BEFORE the store, so the
 * persistence and sync layers (which diff against getBaseSchedule()) see the new base.
 */
export function applySheetSnapshot(store: ReferenceTarget, snap: SheetSnapshot, now: number = Date.now()): ApplyOutcome {
  if (!snap || typeof snap.hash !== 'string' || !snap.hash || !Array.isArray(snap.tabs)) return 'invalid';
  if (current && current.hash === snap.hash) return 'unchanged';
  const fetchedAt = Number(snap.fetchedAt) || 0;
  if (current && fetchedAt < current.fetchedAt) return 'older';

  const mapped = mapSheetData(snap, DEFAULT_STAFF_DIRECTORY, DEFAULT_MASTER_SCHEDULE);
  const oldBase = getBaseSchedule();
  const next: ReferenceCache = {
    v: 1,
    hash: snap.hash,
    fetchedAt,
    appliedAt: now,
    relayVersion: snap.appVersion ?? null,
    directory: mapped.directory,
    routine: mapped.routine,
    subjects: mapped.subjects,
    routineFromSheet: mapped.routineFromSheet.length,
    unmappedTabs: mapped.unmappedTabs,
    issues: mapped.issues,
  };
  try {
    storage?.setItem(REFERENCE_KEY, JSON.stringify(next));
  } catch {
    // quota: keep it in memory for this session
  }
  adopt(store, oldBase, next);
  return 'applied';
}

function adopt(store: ReferenceTarget, oldBase: MasterSchedule, next: ReferenceCache): void {
  current = next;
  useReferenceInfo.setState(infoOf(next));
  const s = store.getState();
  const rebase = (sch: MasterSchedule) => rebaseSchedule(sch, oldBase, next.routine);
  store.setState({
    directory: next.directory,
    schedule: rebase(s.schedule),
    routineHistory: {
      past: s.routineHistory.past.map((h) => ({ ...h, schedule: rebase(h.schedule) })),
      future: s.routineHistory.future.map((h) => ({ ...h, schedule: rebase(h.schedule) })),
    },
  });
}

/** Another tab on this device applied newer Sheet data: follow it (storage event). */
export function adoptStoredReference(store: ReferenceTarget): ApplyOutcome {
  let parsed: unknown = null;
  try {
    const raw = storage?.getItem(REFERENCE_KEY);
    parsed = raw ? JSON.parse(raw) : null;
  } catch {
    return 'invalid';
  }
  if (!valid(parsed)) return 'invalid';
  if (current && current.hash === parsed.hash) return 'unchanged';
  if (current && parsed.fetchedAt < current.fetchedAt) return 'older';
  adopt(store, getBaseSchedule(), parsed);
  return 'applied';
}

/** Tests only. */
export function __resetReferenceForTests(): void {
  current = null;
  storage = null;
  useReferenceInfo.setState(infoOf(null));
}

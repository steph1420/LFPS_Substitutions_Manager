/**
 * Live sync entities (Bundle 35, FEAT-62 part 2).
 *
 * The store's week state is split into small, independently editable facts ("entities"),
 * each keyed by the calendar date it belongs to. Devices exchange entities, not whole
 * states, so two people editing different things never overwrite each other, and two
 * people editing the same thing resolve by last-writer-wins on that one fact
 * (see engine.ts and docs/SAS.md §6.3).
 *
 *   abs|<date>|<teacher>             AbsenceRecord (without day/date)
 *   sub|<date>|<id>                  SubstitutionAssignment (without day)
 *   avail|<weekStart>|<teacher>      StaffAvailabilityRecord (availability is per week)
 *   oac|<date>                       Off. AC teacher name
 *   oct|<date>|<class>               Off. CT teacher name
 *   sched|<date>|<period>|<teacher>  routine edit for that date (task text; deleted = master)
 *   limbo|<date>                     displaced (Limbo) items for that date (without day)
 *
 * Name parts are encodeURIComponent'd so "|" in a name can't break a key. The relay
 * (apps/server/internal/livesync) only reads the kind and the date.
 */
import { dateForSchoolDay, SCHOOL_DAYS } from '@lfps/core';
import type {
  AbsenceRecord,
  DayOfWeek,
  MasterSchedule,
  StaffAvailabilityRecord,
  SubstitutionAssignment,
} from '@lfps/core';
import { applyDayOverrides, diffDaySchedule, type ScheduleOverrides } from '../store/persistence.js';
import type { DisplacedItem } from '../store/useTimetableStore.js';

/** The part of the store that is shared between devices. */
export interface SyncSlice {
  schedule: MasterSchedule;
  absences: AbsenceRecord[];
  availabilities: Record<string, StaffAvailabilityRecord>;
  substitutions: SubstitutionAssignment[];
  displaced: Record<DayOfWeek, DisplacedItem[]>;
  officiatingAC: Record<DayOfWeek, string | null>;
  officiatingCT: Record<DayOfWeek, Record<string, string>>;
}

export const SYNC_KEYS: readonly (keyof SyncSlice)[] = [
  'schedule',
  'absences',
  'availabilities',
  'substitutions',
  'displaced',
  'officiatingAC',
  'officiatingCT',
];

/** key → value. Absent keys are "not set". */
export type EntityMap = Record<string, unknown>;

/** A change: null value = deleted. */
export type EntityChanges = Record<string, unknown | null>;

const enc = encodeURIComponent;
const dec = (s: string) => {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
};

export type EntityKind = 'abs' | 'sub' | 'avail' | 'oac' | 'oct' | 'sched' | 'limbo';

export interface ParsedKey {
  kind: EntityKind;
  date: string;
  parts: string[]; // decoded name parts after the date
}

export function parseKey(key: string): ParsedKey | null {
  const [kind, date, ...rest] = key.split('|');
  if (!kind || !date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  if (!['abs', 'sub', 'avail', 'oac', 'oct', 'sched', 'limbo'].includes(kind)) return null;
  return { kind: kind as EntityKind, date, parts: rest.map(dec) };
}

/** Deterministic JSON (sorted object keys) so equal values hash equally on every device. */
export function stableStringify(value: unknown): string {
  if (value === undefined) return 'null';
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((v) => stableStringify(v)).join(',')}]`;
  const obj = value as Record<string, unknown>;
  return `{${Object.keys(obj)
    .filter((k) => obj[k] !== undefined)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`)
    .join(',')}}`;
}

function omit<T extends object, K extends keyof T>(obj: T, ...keys: K[]): Omit<T, K> {
  const out = { ...obj };
  for (const k of keys) delete out[k];
  return out;
}

/** All entities of the active week. */
export function extractEntities(slice: SyncSlice, weekStart: string, defaults: MasterSchedule): EntityMap {
  const out: EntityMap = {};
  for (const day of SCHOOL_DAYS) {
    const date = dateForSchoolDay(weekStart, day);
    for (const [period, teachers] of Object.entries(diffDaySchedule(defaults[day], slice.schedule[day]))) {
      for (const [teacher, task] of Object.entries(teachers)) out[`sched|${date}|${enc(period)}|${enc(teacher)}`] = task;
    }
    const ac = slice.officiatingAC[day];
    if (ac) out[`oac|${date}`] = ac;
    for (const [cls, teacher] of Object.entries(slice.officiatingCT[day] ?? {})) {
      if (teacher) out[`oct|${date}|${enc(cls)}`] = teacher;
    }
    const limbo = slice.displaced[day] ?? [];
    if (limbo.length) out[`limbo|${date}`] = limbo.map((d) => omit(d, 'day'));
  }
  for (const a of slice.absences) {
    out[`abs|${dateForSchoolDay(weekStart, a.day)}|${enc(a.teacherName)}`] = omit(a, 'day', 'date');
  }
  for (const s of slice.substitutions) {
    out[`sub|${dateForSchoolDay(weekStart, s.day)}|${enc(s.id)}`] = omit(s, 'day');
  }
  for (const [name, rec] of Object.entries(slice.availabilities)) {
    out[`avail|${weekStart}|${enc(name)}`] = rec;
  }
  return out;
}

function dayForDate(weekStart: string): Record<string, DayOfWeek> {
  return Object.fromEntries(SCHOOL_DAYS.map((d) => [dateForSchoolDay(weekStart, d), d]));
}

/**
 * Apply changes to the slice and return only the store fields that changed. Order of
 * existing absences/substitutions is kept; new ones are appended. Keys outside the
 * active week are ignored.
 */
export function applyEntityChanges(
  slice: SyncSlice,
  weekStart: string,
  defaults: MasterSchedule,
  changes: EntityChanges
): Partial<SyncSlice> {
  const days = dayForDate(weekStart);
  const patch: Partial<SyncSlice> = {};

  let absences: AbsenceRecord[] | null = null;
  let substitutions: SubstitutionAssignment[] | null = null;
  let availabilities: Record<string, StaffAvailabilityRecord> | null = null;
  let officiatingAC: Record<DayOfWeek, string | null> | null = null;
  let officiatingCT: Record<DayOfWeek, Record<string, string>> | null = null;
  let displaced: Record<DayOfWeek, DisplacedItem[]> | null = null;
  const schedDays = new Map<DayOfWeek, ScheduleOverrides>();

  for (const [key, value] of Object.entries(changes)) {
    const p = parseKey(key);
    if (!p) continue;
    if (p.kind === 'avail') {
      if (p.date !== weekStart || !p.parts[0]) continue;
      availabilities ??= { ...slice.availabilities };
      if (value == null) delete availabilities[p.parts[0]];
      else availabilities[p.parts[0]] = value as StaffAvailabilityRecord;
      continue;
    }
    const day = days[p.date];
    if (!day) continue;
    switch (p.kind) {
      case 'abs': {
        const name = p.parts[0];
        absences ??= [...slice.absences];
        const i = absences.findIndex((a) => a.day === day && a.teacherName === name);
        if (value == null) {
          if (i >= 0) absences.splice(i, 1);
        } else {
          const rec = { ...(value as AbsenceRecord), teacherName: name, day, date: p.date };
          if (i >= 0) absences[i] = rec;
          else absences.push(rec);
        }
        break;
      }
      case 'sub': {
        const id = p.parts[0];
        substitutions ??= [...slice.substitutions];
        const i = substitutions.findIndex((s) => s.id === id);
        if (value == null) {
          if (i >= 0) substitutions.splice(i, 1);
        } else {
          const rec = { ...(value as SubstitutionAssignment), id, day };
          if (i >= 0) substitutions[i] = rec;
          else substitutions.push(rec);
        }
        break;
      }
      case 'oac':
        officiatingAC ??= { ...slice.officiatingAC };
        officiatingAC[day] = value == null ? null : String(value);
        break;
      case 'oct': {
        officiatingCT ??= { ...slice.officiatingCT };
        const cls = { ...(officiatingCT[day] ?? {}) };
        if (value == null) delete cls[p.parts[0]];
        else cls[p.parts[0]] = String(value);
        officiatingCT[day] = cls;
        break;
      }
      case 'limbo':
        displaced ??= { ...slice.displaced };
        displaced[day] = value == null ? [] : (value as Omit<DisplacedItem, 'day'>[]).map((d) => ({ ...d, day }));
        break;
      case 'sched': {
        const [period, teacher] = p.parts;
        if (!period || !teacher) break;
        if (!schedDays.has(day)) schedDays.set(day, diffDaySchedule(defaults[day], slice.schedule[day]));
        const ov = schedDays.get(day)!;
        if (value == null) {
          if (ov[period]) {
            delete ov[period][teacher];
            if (!Object.keys(ov[period]).length) delete ov[period];
          }
        } else {
          (ov[period] ??= {})[teacher] = String(value);
        }
        break;
      }
    }
  }

  if (absences) patch.absences = absences;
  if (substitutions) patch.substitutions = substitutions;
  if (availabilities) patch.availabilities = availabilities;
  if (officiatingAC) patch.officiatingAC = officiatingAC;
  if (officiatingCT) patch.officiatingCT = officiatingCT;
  if (displaced) patch.displaced = displaced;
  if (schedDays.size) {
    const schedule = { ...slice.schedule } as MasterSchedule;
    for (const [day, ov] of schedDays) schedule[day] = applyDayOverrides(defaults[day], ov);
    patch.schedule = schedule;
  }
  return patch;
}

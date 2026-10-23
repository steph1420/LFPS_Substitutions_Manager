import type { DayOfWeek } from '../types/index.js';

/**
 * School-calendar helpers (FEAT-62).
 *
 * The app shows six weekday slots (MON–SAT). Each slot represents one REAL calendar
 * date of the "active school week": the Monday–Saturday week that contains today.
 * On Sunday (no school) the active week is the upcoming one, so Monday's plan can be
 * prepared on Sunday evening.
 *
 * All dates are local-time ISO calendar dates ("YYYY-MM-DD"), never UTC timestamps,
 * so 00:30 local time is never mistaken for the previous day.
 */

export const SCHOOL_DAYS: readonly DayOfWeek[] = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Local calendar date of `d` as "YYYY-MM-DD". */
export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Parse "YYYY-MM-DD" as a LOCAL date at midnight. Returns null for malformed input. */
export function parseISODate(iso: string): Date | null {
  const match = ISO_DATE.exec(iso);
  if (!match) return null;
  const d = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return toISODate(d) === iso ? d : null;
}

export function isISODate(value: unknown): value is string {
  return typeof value === 'string' && parseISODate(value) !== null;
}

/** Add whole calendar days (DST-safe: works on local Y/M/D, not milliseconds). */
export function addDaysISO(iso: string, days: number): string {
  const d = parseISODate(iso);
  if (!d) throw new Error(`Invalid ISO date: ${iso}`);
  return toISODate(new Date(d.getFullYear(), d.getMonth(), d.getDate() + days));
}

/** Monday ("YYYY-MM-DD") of the active school week for `now`. Sunday rolls forward. */
export function activeWeekStart(now: Date): string {
  const jsDay = now.getDay(); // 0 = Sun … 6 = Sat
  const offset = jsDay === 0 ? 1 : 1 - jsDay; // Sun → next Mon, Mon → 0, Tue → -1 …
  return toISODate(new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset));
}

/** Calendar date of a weekday slot within the week that starts on `weekStart` (a Monday). */
export function dateForSchoolDay(weekStart: string, day: DayOfWeek): string {
  return addDaysISO(weekStart, SCHOOL_DAYS.indexOf(day));
}

/** Map of every weekday slot to its calendar date for the given week. */
export function schoolWeekDates(weekStart: string): Record<DayOfWeek, string> {
  return Object.fromEntries(SCHOOL_DAYS.map((day) => [day, dateForSchoolDay(weekStart, day)])) as Record<
    DayOfWeek,
    string
  >;
}

/** Weekday slot for `now`, or null on Sunday. */
export function schoolDayForDate(now: Date): DayOfWeek | null {
  const jsDay = now.getDay();
  return jsDay === 0 ? null : SCHOOL_DAYS[jsDay - 1];
}

/** Whole days from `fromIso` to `toIso` (positive when `toIso` is later). */
export function daysBetweenISO(fromIso: string, toIso: string): number {
  const a = parseISODate(fromIso);
  const b = parseISODate(toIso);
  if (!a || !b) throw new Error(`Invalid ISO date: ${!a ? fromIso : toIso}`);
  const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((utcB - utcA) / 86_400_000);
}

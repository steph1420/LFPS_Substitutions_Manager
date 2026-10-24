import type { DayOfWeek } from '../types/index.js';

/**
 * School-calendar helpers (FEAT-62).
 *
 * The app shows six weekday slots (MON–SAT). Each slot represents one REAL calendar
 * date of the "active school week": the Monday–Saturday week that contains today.
 * On Sunday (no school) the active week is the upcoming one, so Monday's plan can be
 * prepared on Sunday evening.
 *
 * "Today" is always the date on the SCHOOL's wall clock (Asia/Kolkata), whatever time zone
 * the device is set to, so a laptop left on UTC or a visitor abroad still rolls over at
 * midnight IST. Functions that take an instant (`now: Date`) convert it with
 * `schoolDateFor`; the pure ISO helpers below work on calendar dates only.
 */

export const SCHOOL_DAYS: readonly DayOfWeek[] = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

/** IANA time zone of the school calendar. The Go relay uses the same default. */
export const SCHOOL_TIME_ZONE = 'Asia/Kolkata';

const dateFormatters = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let f = dateFormatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' });
    dateFormatters.set(timeZone, f);
  }
  return f;
}

/**
 * Calendar date ("YYYY-MM-DD") of the instant `now` on the wall clock of `timeZone`
 * (default: the school's). Falls back to the device's local date only if the runtime has
 * no time-zone data for `timeZone`.
 */
export function schoolDateFor(now: Date, timeZone: string = SCHOOL_TIME_ZONE): string {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = formatterFor(timeZone).formatToParts(now);
  } catch {
    return toISODate(now);
  }
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? '';
  const iso = `${get('year')}-${get('month')}-${get('day')}`;
  return ISO_DATE.test(iso) ? iso : toISODate(now);
}

/** JS weekday (0 = Sun … 6 = Sat) of an ISO calendar date. */
export function weekdayOfISO(iso: string): number {
  const d = parseISODate(iso);
  if (!d) throw new Error(`Invalid ISO date: ${iso}`);
  return d.getDay();
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Device-local calendar date of `d` as "YYYY-MM-DD" (use `schoolDateFor` for "today"). */
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

/** Monday ("YYYY-MM-DD") of the active school week at instant `now`. Sunday rolls forward. */
export function activeWeekStart(now: Date, timeZone: string = SCHOOL_TIME_ZONE): string {
  const today = schoolDateFor(now, timeZone);
  const jsDay = weekdayOfISO(today); // 0 = Sun … 6 = Sat
  const offset = jsDay === 0 ? 1 : 1 - jsDay; // Sun → next Mon, Mon → 0, Tue → -1 …
  return addDaysISO(today, offset);
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

/** Weekday slot at instant `now` on the school's clock, or null on Sunday. */
export function schoolDayForDate(now: Date, timeZone: string = SCHOOL_TIME_ZONE): DayOfWeek | null {
  const jsDay = weekdayOfISO(schoolDateFor(now, timeZone));
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

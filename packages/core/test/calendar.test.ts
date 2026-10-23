import { describe, it, expect } from 'vitest';
import {
  activeWeekStart,
  addDaysISO,
  dateForSchoolDay,
  daysBetweenISO,
  isISODate,
  parseISODate,
  schoolDayForDate,
  schoolWeekDates,
  toISODate,
} from '../src/calendar/index.js';

const local = (y: number, m: number, d: number, h = 9) => new Date(y, m - 1, d, h, 0, 0);

describe('school calendar (FEAT-62)', () => {
  it('formats local dates, not UTC', () => {
    expect(toISODate(local(2026, 10, 23, 0))).toBe('2026-10-23');
    expect(toISODate(local(2026, 10, 23, 23))).toBe('2026-10-23');
  });

  it('parses and validates ISO dates', () => {
    expect(parseISODate('2026-10-23')?.getDate()).toBe(23);
    expect(parseISODate('2026-02-30')).toBeNull();
    expect(parseISODate('23-10-2026')).toBeNull();
    expect(isISODate('2026-12-31')).toBe(true);
    expect(isISODate(42)).toBe(false);
  });

  it('maps every weekday (and Saturday) to the Monday of the same week', () => {
    // Mon 19 Oct 2026 … Sat 24 Oct 2026
    for (let d = 19; d <= 24; d++) {
      expect(activeWeekStart(local(2026, 10, d))).toBe('2026-10-19');
    }
  });

  it('rolls Sunday forward to the upcoming week', () => {
    expect(activeWeekStart(local(2026, 10, 25))).toBe('2026-10-26');
  });

  it('handles month and year boundaries', () => {
    expect(activeWeekStart(local(2027, 1, 1))).toBe('2026-12-28'); // Friday
    expect(addDaysISO('2026-12-31', 1)).toBe('2027-01-01');
    expect(daysBetweenISO('2026-10-19', '2026-11-02')).toBe(14);
  });

  it('gives each weekday slot its real calendar date', () => {
    expect(dateForSchoolDay('2026-10-19', 'MON')).toBe('2026-10-19');
    expect(dateForSchoolDay('2026-10-19', 'SAT')).toBe('2026-10-24');
    expect(schoolWeekDates('2026-10-19').WED).toBe('2026-10-21');
  });

  it('returns the weekday slot for a date, null on Sunday', () => {
    expect(schoolDayForDate(local(2026, 10, 23))).toBe('FRI');
    expect(schoolDayForDate(local(2026, 10, 25))).toBeNull();
  });
});

import { describe, it, expect } from 'vitest';
import {
  activeWeekStart,
  addDaysISO,
  dateForSchoolDay,
  daysBetweenISO,
  isISODate,
  parseISODate,
  SCHOOL_TIME_ZONE,
  schoolDateFor,
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

  describe('school time zone (Asia/Kolkata, UTC+05:30) regardless of device TZ', () => {
    // Instants are given in UTC, so these hold on any machine.
    const utc = (iso: string) => new Date(iso);

    it('defaults to Asia/Kolkata', () => {
      expect(SCHOOL_TIME_ZONE).toBe('Asia/Kolkata');
    });

    it('rolls the date over at midnight IST (18:30 UTC), not device midnight', () => {
      expect(schoolDateFor(utc('2026-10-23T18:29:59Z'))).toBe('2026-10-23'); // Fri 23:59:59 IST
      expect(schoolDateFor(utc('2026-10-23T18:30:00Z'))).toBe('2026-10-24'); // Sat 00:00 IST
      expect(schoolDateFor(utc('2026-10-23T18:30:00Z'), 'UTC')).toBe('2026-10-23');
    });

    it('switches to the upcoming week at Sunday 00:00 IST', () => {
      expect(activeWeekStart(utc('2026-10-24T18:29:00Z'))).toBe('2026-10-19'); // Sat 23:59 IST
      expect(activeWeekStart(utc('2026-10-24T18:30:00Z'))).toBe('2026-10-26'); // Sun 00:00 IST
      expect(schoolDayForDate(utc('2026-10-24T18:29:00Z'))).toBe('SAT');
      expect(schoolDayForDate(utc('2026-10-24T18:30:00Z'))).toBeNull();
      expect(schoolDayForDate(utc('2026-10-25T18:30:00Z'))).toBe('MON');
    });

    it('falls back to the device date for an unknown zone instead of throwing', () => {
      const d = local(2026, 10, 23, 12);
      expect(schoolDateFor(d, 'Not/AZone')).toBe(toISODate(d));
    });
  });
});

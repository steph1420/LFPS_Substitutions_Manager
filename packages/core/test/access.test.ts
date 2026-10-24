import { describe, it, expect } from 'vitest';
import {
  adminOfficeFor,
  DEFAULT_STAFF_DIRECTORY,
  PRINCIPAL_DESIGNATION,
  compareTeachersByHierarchy,
} from '../src/index.js';
import type { AbsenceRecord, DayOfWeek, StaffDirectory } from '../src/index.js';

const directory = DEFAULT_STAFF_DIRECTORY;
const none: Record<DayOfWeek, string | null> = { MON: null, TUE: null, WED: null, THU: null, FRI: null, SAT: null };
const away = (teacherName: string, day: DayOfWeek): AbsenceRecord => ({
  teacherId: teacherName,
  teacherName,
  day,
  type: 'FULL_DAY',
  markedAt: 0,
});
const office = (identity: string | null, day: DayOfWeek | null, absences: AbsenceRecord[] = [], map = none) =>
  adminOfficeFor({ identity, directory, day, absences, officiatingACMap: map });

describe('admin hierarchy (Bundle 34a)', () => {
  it('Principal (designation), AC and AAC are admin offices every day', () => {
    expect(office(PRINCIPAL_DESIGNATION, 'MON')).toBe('PRINCIPAL');
    expect(office('Mrs. R. Pahwa', 'MON')).toBe('AC');
    expect(office('Mrs. S. Lakra', 'MON')).toBe('AAC');
    expect(office('Mrs. R. Pahwa', null)).toBe('AC');
  });

  it('everyone else is identification only', () => {
    for (const t of Object.values(directory)) {
      if (t.abbr === 'Mrs. R. Pahwa' || t.abbr === 'Mrs. S. Lakra') continue;
      expect(office(t.abbr, 'WED')).toBeNull();
    }
    expect(office(null, 'WED')).toBeNull();
    expect(office('Mr. Nobody', 'WED')).toBeNull();
  });

  it('an appointed Off. AC is admin only on the day the appointment is in force', () => {
    const map = { ...none, WED: 'Mrs. M. Midha' };
    const bothAway = [away('Mrs. R. Pahwa', 'WED'), away('Mrs. S. Lakra', 'WED')];
    expect(office('Mrs. M. Midha', 'WED', bothAway, map)).toBe('OFF_AC');
    // Other days: no appointment, so no admin.
    expect(office('Mrs. M. Midha', 'THU', bothAway, map)).toBeNull();
    // AC back on duty: the appointment is not in force.
    expect(office('Mrs. M. Midha', 'WED', [], map)).toBeNull();
    // No school day.
    expect(office('Mrs. M. Midha', null, bothAway, map)).toBeNull();
  });

  it('a manual appointment while only the AC is away still makes that person Off. AC', () => {
    const map = { ...none, FRI: 'Mrs. R. Narayan' };
    expect(office('Mrs. R. Narayan', 'FRI', [away('Mrs. R. Pahwa', 'FRI')], map)).toBe('OFF_AC');
  });

  it('a directory entry with role Principal is recognised and ranks first', () => {
    const withPrincipal: StaffDirectory = {
      ...directory,
      'Dr. X': { ...Object.values(directory)[0], id: 'STAFF-P', abbr: 'Dr. X', fullName: 'Dr. X', role: 'Principal' },
    };
    expect(adminOfficeFor({ identity: 'Dr. X', directory: withPrincipal, day: 'MON', absences: [], officiatingACMap: none })).toBe(
      'PRINCIPAL'
    );
    const sorted = Object.values(withPrincipal).sort(compareTeachersByHierarchy);
    expect(sorted[0].abbr).toBe('Dr. X');
  });
});

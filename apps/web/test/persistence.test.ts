import { describe, it, expect, beforeEach } from 'vitest';
import { DEFAULT_MASTER_SCHEDULE, type AbsenceRecord, type SubstitutionAssignment } from '@lfps/core';
import {
  CURRENT_SCHEMA_VERSION,
  OPERATIONAL_STATE_BACKUP_PREFIX,
  OPERATIONAL_STATE_KEY,
  RETENTION_DAYS,
  applyDayOverrides,
  dehydrateWeek,
  diffDaySchedule,
  hydrateWeek,
  loadOperationalDoc,
  migrateOperationalDoc,
  saveOperationalDoc,
  type KeyValueStorage,
  type OperationalDoc,
} from '../src/store/persistence.js';
import { MemoryStorage } from './setup.js';

const D = DEFAULT_MASTER_SCHEDULE;
const WEEK = '2026-10-19'; // Mon 19 Oct 2026
const NEXT_WEEK = '2026-10-26';
const FRI = new Date(2026, 9, 23, 10);

const firstBusyCell = () => {
  for (const [period, teachers] of Object.entries(D.MON)) {
    for (const [teacher, task] of Object.entries(teachers as Record<string, string>)) {
      if (task && task !== 'Free' && task !== '-') return { period, teacher, task };
    }
  }
  throw new Error('fixture: no busy cell');
};

const absence = (teacherName: string, day: AbsenceRecord['day']): AbsenceRecord => ({
  teacherId: teacherName,
  teacherName,
  day,
  type: 'FULL_DAY',
  markedAt: 1,
});

const sub = (day: SubstitutionAssignment['day'], status: SubstitutionAssignment['status']): SubstitutionAssignment => ({
  id: `s-${day}`,
  day,
  period: '1st' as SubstitutionAssignment['period'],
  originalTeacher: 'A',
  substituteTeacher: 'B',
  className: 'III',
  subject: 'EVS',
  status,
  assignedAt: 2,
  ...(status === 'DISPUTED' ? { disputeRemark: 'clash', disputedAt: 3 } : {}),
  ...(status === 'ACCEPTED' ? { acceptedAt: 4 } : {}),
});

function sliceWith(overrides: Partial<ReturnType<typeof hydrateWeek>> = {}) {
  return { ...hydrateWeek(null, WEEK, D, FRI), ...overrides };
}

describe('schedule diff (routine edits as per-date overrides)', () => {
  it('round-trips an edited day and stores only changed cells', () => {
    const { period, teacher } = firstBusyCell();
    const edited = applyDayOverrides(D.MON, { [period]: { [teacher]: 'Free' } });
    const diff = diffDaySchedule(D.MON, edited);
    expect(diff).toEqual({ [period]: { [teacher]: 'Free' } });
    expect(applyDayOverrides(D.MON, diff)).toEqual(edited);
    expect(diffDaySchedule(D.MON, D.MON)).toEqual({});
  });

  it('never mutates the master timetable', () => {
    const { period, teacher, task } = firstBusyCell();
    applyDayOverrides(D.MON, { [period]: { [teacher]: 'X' } });
    expect((D.MON as Record<string, Record<string, string>>)[period][teacher]).toBe(task);
  });
});

describe('dehydrate / hydrate by calendar date', () => {
  it('restores absences, availability, subs (ACCEPTED/DISPUTED), Off. AC/CT, Limbo and routine edits', () => {
    const { period, teacher } = firstBusyCell();
    const slice = sliceWith({
      absences: [absence('Mrs. R. Pahwa', 'MON'), absence('T2', 'FRI')],
      substitutions: [sub('MON', 'ACCEPTED'), sub('FRI', 'DISPUTED')],
      availabilities: { T3: { teacherName: 'T3', status: 'FREE_FROM_SUB', isAvailable: false, updatedAt: 5 } },
      officiatingAC: { MON: 'Mrs. S. Lakra', TUE: null, WED: null, THU: null, FRI: null, SAT: null },
      officiatingCT: { MON: {}, TUE: {}, WED: {}, THU: {}, FRI: { 'III-A': 'T4' }, SAT: {} },
      displaced: { MON: [{ id: 'd1', task: 'Maths', ogTeacher: teacher, period: period as never, day: 'MON' }], TUE: [], WED: [], THU: [], FRI: [], SAT: [] },
      schedule: { ...D, MON: applyDayOverrides(D.MON, { [period]: { [teacher]: 'Free' } }) },
    });
    const doc = dehydrateWeek(slice, WEEK, null, D, FRI, '9.9.9');

    expect(doc.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(Object.keys(doc.days).sort()).toEqual(['2026-10-19', '2026-10-23']);
    expect(doc.days['2026-10-19'].absences[0].date).toBe('2026-10-19');

    const back = hydrateWeek(doc, WEEK, D, FRI);
    expect(back.absences.map((a) => [a.teacherName, a.day, a.date])).toEqual([
      ['Mrs. R. Pahwa', 'MON', '2026-10-19'],
      ['T2', 'FRI', '2026-10-23'],
    ]);
    expect(back.substitutions.find((s) => s.day === 'MON')?.status).toBe('ACCEPTED');
    expect(back.substitutions.find((s) => s.day === 'FRI')).toMatchObject({ status: 'DISPUTED', disputeRemark: 'clash' });
    expect(back.availabilities.T3.status).toBe('FREE_FROM_SUB');
    expect(back.officiatingAC.MON).toBe('Mrs. S. Lakra');
    expect(back.officiatingCT.FRI).toEqual({ 'III-A': 'T4' });
    expect(back.displaced.MON).toHaveLength(1);
    expect(back.schedule.MON).toEqual(slice.schedule.MON);
    expect(back.schedule.TUE).toBe(D.TUE);
  });

  it("does NOT bring last week's absences into this week", () => {
    const lastWeek = dehydrateWeek(
      sliceWith({ absences: [absence('T1', 'MON')] }),
      WEEK,
      null,
      D,
      FRI,
      'x'
    );
    const nextMonday = new Date(2026, 9, 26, 8);
    const thisWeek = hydrateWeek(lastWeek, NEXT_WEEK, D, nextMonday);
    expect(thisWeek.absences).toEqual([]);
    // …but the old record is archived, not lost.
    expect(lastWeek.days['2026-10-19'].absences).toHaveLength(1);
    const merged = dehydrateWeek(thisWeek, NEXT_WEEK, lastWeek, D, nextMonday, 'x');
    expect(merged.days['2026-10-19'].absences).toHaveLength(1);
  });

  it('prunes records older than the retention window', () => {
    const old = dehydrateWeek(sliceWith({ absences: [absence('T1', 'MON')] }), WEEK, null, D, FRI, 'x');
    const later = new Date(2026, 9, 19 + RETENTION_DAYS + 7, 9);
    const pruned = dehydrateWeek(sliceWith(), '2026-12-07', old, D, later, 'x');
    expect(pruned.days['2026-10-19']).toBeUndefined();
  });

  it('removes a day record when that day returns to baseline', () => {
    const withAbsence = dehydrateWeek(sliceWith({ absences: [absence('T1', 'MON')] }), WEEK, null, D, FRI, 'x');
    const cleared = dehydrateWeek(sliceWith(), WEEK, withAbsence, D, FRI, 'x');
    expect(cleared.days).toEqual({});
  });

  it('persists undo history for the active week only', () => {
    const slice = sliceWith({
      rosterHistory: { past: [{ absences: [], availabilities: {}, officiatingAC: sliceWith().officiatingAC, officiatingCT: sliceWith().officiatingCT }], future: [] },
    });
    const doc = dehydrateWeek(slice, WEEK, null, D, FRI, 'x');
    expect(hydrateWeek(doc, WEEK, D, FRI).rosterHistory.past).toHaveLength(1);
    expect(hydrateWeek(doc, NEXT_WEEK, D, FRI).rosterHistory.past).toHaveLength(0);
  });
});

describe('schema versioning & storage safety', () => {
  let storage: MemoryStorage;
  beforeEach(() => {
    storage = new MemoryStorage();
  });

  it('accepts the current schema', () => {
    const doc = dehydrateWeek(sliceWith(), WEEK, null, D, FRI, 'x');
    const res = migrateOperationalDoc(JSON.stringify(doc));
    expect(res.ok && res.migratedFrom).toBe(null);
  });

  it('moves a newer-schema document aside instead of overwriting it', () => {
    const future = JSON.stringify({ schemaVersion: CURRENT_SCHEMA_VERSION + 1, days: {} });
    storage.setItem(OPERATIONAL_STATE_KEY, future);
    const res = loadOperationalDoc(storage, FRI);
    expect(res.doc).toBeNull();
    expect(res.reason).toBe('newer-schema');
    expect(res.backedUpTo?.startsWith(OPERATIONAL_STATE_BACKUP_PREFIX)).toBe(true);
    expect(storage.getItem(res.backedUpTo as string)).toBe(future);
  });

  it('moves corrupt JSON aside', () => {
    storage.setItem(OPERATIONAL_STATE_KEY, '{not json');
    const res = loadOperationalDoc(storage, FRI);
    expect(res.reason).toBe('corrupt');
    expect(storage.getItem(res.backedUpTo as string)).toBe('{not json');
  });

  it('drops undo history, then notifications, when storage is full', () => {
    const doc: OperationalDoc = {
      ...dehydrateWeek(sliceWith(), WEEK, null, D, FRI, 'x'),
      history: { weekStart: WEEK, routine: { past: [], future: [] }, substitutions: { past: [], future: [] }, roster: { past: [], future: [] } },
    };
    let calls = 0;
    const tiny: KeyValueStorage = {
      getItem: () => null,
      removeItem: () => {},
      setItem: (_k, v) => {
        calls++;
        if (JSON.parse(v).history !== null) throw new DOMException('full', 'QuotaExceededError');
      },
    };
    expect(saveOperationalDoc(tiny, doc)).toEqual({ ok: true, degraded: true });
    expect(calls).toBe(2);

    const broken: KeyValueStorage = { getItem: () => null, removeItem: () => {}, setItem: () => { throw new Error('denied'); } };
    const out = saveOperationalDoc(broken, doc);
    expect(out.ok).toBe(false);
  });
});

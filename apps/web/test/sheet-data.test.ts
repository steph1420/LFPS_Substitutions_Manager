import { describe, it, expect, beforeEach } from 'vitest';
import { DEFAULT_MASTER_SCHEDULE, DEFAULT_STAFF_DIRECTORY, SCHOOL_DAYS } from '@lfps/core';
import type { DayOfWeek, MasterSchedule } from '@lfps/core';
import { mapSheetData, normalizeRole, parseCell, parseDay, initialsOf, type SheetTab } from '../src/sync/sheetData.js';
import {
  __resetReferenceForTests,
  adoptStoredReference,
  applySheetSnapshot,
  getBaseDirectory,
  getBaseSchedule,
  initReference,
  rebaseSchedule,
  REFERENCE_KEY,
} from '../src/sync/reference.js';
import { extractEntities, type SyncSlice } from '../src/sync/entities.js';
import { SyncEngine } from '../src/sync/engine.js';
import { MemoryStorage } from './setup.js';

const seed = DEFAULT_MASTER_SCHEDULE;
const dir = DEFAULT_STAFF_DIRECTORY;
const DAY_LABEL: Record<DayOfWeek, string> = { MON: 'MON.', TUE: 'TUES.', WED: 'WED.', THU: 'THU.', FRI: 'FRI.', SAT: 'SAT.' };
const PERIODS = Object.keys(seed.MON);
const TEACHERS = Object.keys(dir);
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));

/** Seed cell → the owner's grid form (the inverse of parseCell). */
function toSheetCell(v: string, period: string): string {
  if (period === 'BREAK' || v === 'Free') return '';
  const multi = v.match(/^(.*?) ((?:KG|PREP) [A-Z]) \+ ((?:KG|PREP) [A-Z])$/);
  if (multi) return `1ST ${multi[1]}\n${multi[2]}\n---\n2ND ${multi[1]}\n${multi[3]}`;
  const one = v.match(/^(.*) ((?:KG|PREP) [A-Z])$/);
  return one ? `${one[1]}\n${one[2]}` : v;
}

function teacherTab(abbr: string, schedule: MasterSchedule = seed): SheetTab {
  return {
    name: abbr,
    rows: [
      ['Day', ...PERIODS],
      ...SCHOOL_DAYS.map((d) => [DAY_LABEL[d], ...PERIODS.map((p) => toSheetCell(schedule[d][p]?.[abbr] ?? 'Free', p))]),
    ],
  };
}

function staffTab(extra: string[][] = [], omit: string[] = []): SheetTab {
  return {
    name: 'Staff Directory',
    rows: [
      ['Full Name', 'Teacher Abbreviation', 'Role', 'Primary Class'],
      ...Object.values(dir)
        .filter((t) => !omit.includes(t.abbr))
        .map((t) => [t.fullName, t.abbr, t.role === '3rd Teacher' ? '3rd Teacher / Support' : t.role, t.primaryClass ?? '']),
      ...extra,
    ],
  };
}

function snapshotOf(tabs: SheetTab[], hash = 'h1', fetchedAt = 100) {
  return { hash, fetchedAt, tabs, hiddenTabs: 1 };
}

const allTabs = (schedule: MasterSchedule = seed) => [
  staffTab(),
  { name: 'Subjects List', rows: [['Base Class (KG / PREP)', 'Subject Name', 'Abbreviation'], ['KG', 'Moral Science', 'M. SC.']] },
  { name: 'OVERVIEW', rows: [['x']] },
  ...TEACHERS.map((t) => teacherTab(t, schedule)),
];

describe('Sheet data mapper', () => {
  it('reproduces the bundled routine and directory from the owner tabs', () => {
    const r = mapSheetData(snapshotOf(allTabs()), dir, seed);
    expect(r.routine).toEqual(seed);
    expect(r.directory).toEqual(dir);
    expect(r.routineFromSheet).toHaveLength(TEACHERS.length);
    expect(r.subjects['M. SC.']).toBe('Moral Science');
    expect(r.unmappedTabs).toEqual(['OVERVIEW']);
    expect(r.issues).toEqual([]);
  });

  it('reads cells, days and roles like the owner writes them', () => {
    expect(parseCell('', '1st')).toBe('Free');
    expect(parseCell('ANYTHING', 'BREAK')).toBe('-');
    expect(parseCell('ENG. REC.\nKG A', '1st')).toBe('ENG. REC. KG A');
    expect(parseCell('1ST DRILL\nPREP A\n---\n2ND DRILL\nPREP B', 'G/PD')).toBe('DRILL PREP A + PREP B');
    expect(parseCell('1ST DRILL\nPREP A\n---\n2ND GAMES\nPREP B', 'G/PD')).toBeNull();
    expect(parseDay('TUES.')).toBe('TUE');
    expect(parseDay('Holiday')).toBeNull();
    expect(normalizeRole('3rd Teacher / Support')).toBe('3rd Teacher');
    expect(normalizeRole('class teacher')).toBe('Class Teacher');
    expect(normalizeRole('Gardener')).toBeNull();
    expect(initialsOf('Ms. Jane Q. Public')).toBe('JP');
  });

  it('a missing Principal row is fine; new staff get derived fields; unknown things are reported', () => {
    const [a] = TEACHERS;
    const changed = clone(seed);
    changed.MON['1st'][a] = 'ART KG B';
    const tabs = allTabs(changed);
    tabs[0] = staffTab([['Ms. New Person', 'Ms. N. Person', 'Gardener', 'PREP A']]);
    tabs.push({
      name: 'Ms. N. Person',
      rows: [['Day', '1st', 'Lunch'], ['MON.', 'ART\nPREP A', 'x'], ['Holiday', '', '']],
    });
    expect(Object.values(dir).some((t) => t.role === 'Principal')).toBe(false);
    const r = mapSheetData(snapshotOf(tabs), dir, seed);
    expect(r.routine.MON['1st'][a]).toBe('ART KG B');
    const n = r.directory['Ms. N. Person'];
    expect(n).toMatchObject({ id: 'SHEET-MS-N-PERSON', initials: 'NP', department: 'PREP', periodsTaught: 1, assignedSubjectPool: ['ART'] });
    expect(r.issues.join('\n')).toMatch(/unknown role/);
    expect(r.issues.join('\n')).toMatch(/unknown period column/);
    expect(r.issues.join('\n')).toMatch(/unknown day/);
    expect(r.issues.join('\n')).not.toMatch(/Person/); // no names in issues
  });

  it('keeps bundled data where the Sheet is silent', () => {
    const [a, b] = TEACHERS;
    const tabs = allTabs().filter((t) => t.name !== b);
    tabs[0] = staffTab([], [a]);
    const r = mapSheetData(snapshotOf(tabs), dir, seed);
    expect(r.directory[a]).toEqual(dir[a]); // not on the Sheet: kept
    expect(r.routine).toEqual(seed); // no tab for b: bundled routine
    expect(r.routineFromSheet).not.toContain(b);
    expect(mapSheetData(snapshotOf([]), dir, seed).directory).toEqual(dir);
  });
});

function fakeStore(schedule: MasterSchedule) {
  let state = {
    schedule,
    directory: dir,
    routineHistory: { past: [{ schedule, displaced: {} }], future: [] as { schedule: MasterSchedule }[] },
  };
  return {
    getState: () => state,
    setState: (p: Record<string, unknown>) => {
      state = { ...state, ...p } as typeof state;
    },
  };
}

describe('applying Sheet data on a device', () => {
  let storage: MemoryStorage;
  beforeEach(() => {
    __resetReferenceForTests();
    storage = new MemoryStorage();
    initReference(storage);
  });

  it("follows the Sheet but never clobbers this week's local edits", () => {
    const [a, b] = TEACHERS;
    const local = clone(seed);
    local.MON['1st'][a] = 'LOCAL EDIT KG A'; // someone changed a's 1st period today
    const store = fakeStore(local);
    const sheet = clone(seed);
    sheet.MON['1st'][a] = 'SHEET KG A';
    sheet.MON['1st'][b] = 'SHEET KG B';
    expect(applySheetSnapshot(store, snapshotOf(allTabs(sheet)))).toBe('applied');
    const s = store.getState();
    expect(s.schedule.MON['1st'][a]).toBe('LOCAL EDIT KG A');
    expect(s.schedule.MON['1st'][b]).toBe('SHEET KG B');
    expect(s.routineHistory.past[0].schedule.MON['1st'][b]).toBe('SHEET KG B');
    expect(getBaseSchedule().MON['1st'][a]).toBe('SHEET KG A');
    // the synced override stays the same entity, so nothing spurious is sent
    const slice = (sch: MasterSchedule) => ({ schedule: sch, absences: [], availabilities: {}, substitutions: [], displaced: {}, officiatingAC: {}, officiatingCT: {} }) as unknown as SyncSlice;
    const before = Object.entries(extractEntities(slice(local), '2026-10-19', seed)).filter(([k]) => k.startsWith('sched|'));
    const after = Object.entries(extractEntities(slice(s.schedule), '2026-10-19', getBaseSchedule())).filter(([k]) => k.startsWith('sched|'));
    expect(after).toEqual(before);
  });

  it('respects the data version: same hash is a no-op, older data is ignored, the cache survives a reload', () => {
    const [a] = TEACHERS;
    const store = fakeStore(clone(seed));
    const v2 = clone(seed);
    v2.TUE['2nd'][a] = 'NEW KG A';
    expect(applySheetSnapshot(store, snapshotOf(allTabs(v2), 'h2', 200))).toBe('applied');
    expect(applySheetSnapshot(store, snapshotOf(allTabs(v2), 'h2', 300))).toBe('unchanged');
    expect(applySheetSnapshot(store, snapshotOf(allTabs(), 'h1', 100))).toBe('older');
    expect(getBaseSchedule().TUE['2nd'][a]).toBe('NEW KG A');
    expect(applySheetSnapshot(store, { hash: '', fetchedAt: 1, tabs: [] })).toBe('invalid');

    __resetReferenceForTests();
    expect(getBaseSchedule()).toBe(seed);
    initReference(storage); // reload
    expect(getBaseSchedule().TUE['2nd'][a]).toBe('NEW KG A');
    expect(Object.keys(getBaseDirectory())).toEqual(Object.keys(dir));
  });

  it('a corrupt cache falls back to the bundled seed', () => {
    storage.setItem(REFERENCE_KEY, '{"v":1,"hash":3}');
    initReference(storage);
    expect(getBaseSchedule()).toBe(seed);
    expect(storage.getItem(REFERENCE_KEY)).toBeNull();
  });

  it('another tab applying newer data is followed (storage event path)', () => {
    const [a] = TEACHERS;
    const v2 = clone(seed);
    v2.WED['3rd'][a] = 'TAB2 KG A';
    const local = clone(seed);
    local.WED['4th'][a] = 'MINE KG A';
    const mine = fakeStore(local); // this tab loaded before the other tab got the Sheet
    expect(adoptStoredReference(mine)).toBe('invalid'); // nothing stored yet
    // the other tab writes the shared cache (same localStorage)
    const raw = (() => {
      const other = new MemoryStorage();
      __resetReferenceForTests();
      initReference(other);
      applySheetSnapshot(fakeStore(clone(seed)), snapshotOf(allTabs(v2), 'h9', 900));
      return other.getItem(REFERENCE_KEY)!;
    })();
    __resetReferenceForTests();
    initReference(storage); // this tab: seed base, shared storage
    storage.setItem(REFERENCE_KEY, raw);
    expect(adoptStoredReference(mine)).toBe('applied');
    expect(mine.getState().schedule.WED['3rd'][a]).toBe('TAB2 KG A');
    expect(mine.getState().schedule.WED['4th'][a]).toBe('MINE KG A');
    expect(adoptStoredReference(mine)).toBe('unchanged');
    expect(rebaseSchedule(seed, seed, v2).WED['3rd'][a]).toBe('TAB2 KG A');
  });
});

describe('outbox vs relay tombstones (deletions stick after a relay restart)', () => {
  const WEEK = '2026-10-19';
  const key = 'sub|2026-10-21|s1';
  const sub = { id: 's1', day: 'WED' };

  it('a newer tombstone in HYDRATE removes the sub and drops our queued copy', () => {
    let clock = 1000;
    const e = new SyncEngine({ storage: new MemoryStorage(), deviceId: 'dA', weekStart: WEEK, now: () => clock });
    e.diffLocal({});
    e.diffLocal({ [key]: sub }); // offline edit, ts=1000
    expect(e.pendingCount()).toBe(1);
    clock = 5000;
    const changes = e.hydrate([{ k: key, v: null, ts: 2000, by: 'dB' }], { [key]: sub });
    expect(changes).toEqual({ [key]: null });
    expect(e.pendingCount()).toBe(0);
    expect(e.diffLocal({})).toEqual([]); // nothing re-published
  });

  it('a fresh tab (first run) cannot resurrect a deleted sub', () => {
    const e = new SyncEngine({ storage: new MemoryStorage(), deviceId: 'dC', weekStart: WEEK, now: () => 9000 });
    e.diffLocal({ [key]: sub }); // stale local copy, stamped ts=1
    expect(e.hydrate([{ k: key, v: null, ts: 2000, by: 'dB' }], { [key]: sub })).toEqual({ [key]: null });
    expect(e.pendingCount()).toBe(0);
  });

  it('an edit made after the deletion wins (LWW) and is re-published', () => {
    let clock = 1000;
    const e = new SyncEngine({ storage: new MemoryStorage(), deviceId: 'dA', weekStart: WEEK, now: () => clock });
    e.diffLocal({});
    clock = 3000;
    e.diffLocal({ [key]: sub });
    expect(e.hydrate([{ k: key, v: null, ts: 2000, by: 'dB' }], { [key]: sub })).toEqual({});
    expect(e.pending().map((p) => p.ts)).toEqual([3000]);
  });
});

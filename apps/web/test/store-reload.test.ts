import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { OPERATIONAL_STATE_KEY } from '../src/store/persistence.js';

// Simulates a full page reload: fresh module graph, same localStorage.
async function loadStore() {
  vi.resetModules();
  const mod = await import('../src/store/useTimetableStore.js');
  return mod.useTimetableStore;
}
const flushViaPagehide = () => (window as unknown as EventTarget).dispatchEvent(new Event('pagehide'));

describe('store survives a reload (FEAT-62)', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
    vi.setSystemTime(new Date(2026, 9, 21, 9, 0)); // Wed 21 Oct 2026
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("opens on today's weekday and restores absences, availability and subs after reload", async () => {
    let store = await loadStore();
    expect(store.getState().selectedDay).toBe('WED');
    expect(store.getState().activeWeekStart).toBe('2026-10-19');

    const teacher = Object.values(store.getState().directory)[0].abbr;
    store.getState().toggleAbsence(teacher);
    store.getState().setStaffAvailability(teacher, 'FREE_FROM_SUB', { remark: 'exam duty' });
    store.getState().assignSubstitution({
      day: 'WED',
      period: '1st' as never,
      originalTeacher: teacher,
      substituteTeacher: 'Someone',
      className: 'IV',
      subject: 'Maths',
      status: 'COVERED',
    });
    flushViaPagehide();
    expect(localStorage.getItem(OPERATIONAL_STATE_KEY)).toContain('2026-10-21');

    store = await loadStore();
    const s = store.getState();
    expect(s.absences.map((a) => [a.teacherName, a.day, a.date])).toEqual([[teacher, 'WED', '2026-10-21']]);
    expect(s.availabilities[teacher]?.remark).toBe('exam duty');
    expect(s.substitutions).toHaveLength(1);
    expect(s.canUndo('roster')).toBe(true); // history survives within the week
  });

  it('saves automatically after the debounce, without an explicit flush', async () => {
    const store = await loadStore();
    store.getState().toggleAbsence(Object.values(store.getState().directory)[0].abbr);
    expect(localStorage.getItem(OPERATIONAL_STATE_KEY)).toBeNull();
    vi.advanceTimersByTime(300);
    expect(localStorage.getItem(OPERATIONAL_STATE_KEY)).not.toBeNull();
    expect(store.getState().persistenceStatus.state).toBe('saved');
  });

  it('starts next week clean and keeps the old week archived', async () => {
    let store = await loadStore();
    store.getState().toggleAbsence(Object.values(store.getState().directory)[0].abbr);
    flushViaPagehide();

    vi.setSystemTime(new Date(2026, 9, 26, 8, 0)); // next Monday
    store = await loadStore();
    expect(store.getState().activeWeekStart).toBe('2026-10-26');
    expect(store.getState().absences).toEqual([]);
    expect(store.getState().canUndo('roster')).toBe(false);
    expect(JSON.parse(localStorage.getItem(OPERATIONAL_STATE_KEY) as string).days['2026-10-21']).toBeDefined();
  });

  it('rolls over to the new week in an open tab', async () => {
    const store = await loadStore();
    store.getState().toggleAbsence(Object.values(store.getState().directory)[0].abbr);
    vi.setSystemTime(new Date(2026, 9, 25, 18, 0)); // Sunday evening → upcoming week
    vi.advanceTimersByTime(60_000); // rollover interval
    expect(store.getState().activeWeekStart).toBe('2026-10-26');
    expect(store.getState().absences).toEqual([]);
    expect(store.getState().selectedDay).toBe('MON');
    const saved = JSON.parse(localStorage.getItem(OPERATIONAL_STATE_KEY) as string);
    expect(saved.days['2026-10-21'].absences).toHaveLength(1);
  });
});

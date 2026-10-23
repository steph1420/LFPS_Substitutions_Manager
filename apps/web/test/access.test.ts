import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createHash } from 'node:crypto';

const PASSCODE = 'front-office-test-passcode';
const HASH = createHash('sha256').update(PASSCODE).digest('hex');

async function loadStore() {
  vi.resetModules();
  return (await import('../src/store/useTimetableStore.js')).useTimetableStore;
}
const flush = () => (window as unknown as EventTarget).dispatchEvent(new Event('pagehide'));

/** Pick a (period, teacher) pair on WED that has a real class, for routine-edit tests. */
function busySlot(schedule: Record<string, Record<string, Record<string, string>>>) {
  for (const [period, row] of Object.entries(schedule.WED)) {
    for (const [teacher, task] of Object.entries(row)) {
      if (task && task !== 'Free' && task !== '-') return { period, teacher, task };
    }
  }
  throw new Error('no busy slot');
}

describe('admin gate (lib/adminGate)', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('normalises a valid hash and rejects malformed / unset config', async () => {
    const { getConfiguredAdminHash } = await import('../src/lib/adminGate.js');
    expect(getConfiguredAdminHash(`  ${HASH.toUpperCase()} `)).toBe(HASH);
    expect(getConfiguredAdminHash('')).toBeNull();
    expect(getConfiguredAdminHash(undefined)).toBeNull();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(getConfiguredAdminHash('not-a-hash')).toBeNull();
    warn.mockRestore();
  });

  it('verifies the passcode against the SHA-256 hash', async () => {
    const { verifyAdminPasscode } = await import('../src/lib/adminGate.js');
    expect(await verifyAdminPasscode(PASSCODE, HASH)).toBe(true);
    expect(await verifyAdminPasscode('wrong', HASH)).toBe(false);
    expect(await verifyAdminPasscode(PASSCODE, null)).toBe(false);
  });
});

describe('roles in the store (SEC-01 interim)', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
    vi.setSystemTime(new Date(2026, 9, 21, 9, 0));
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it('defaults to Front Desk (GUEST), never ADMIN, and the front desk can run the day', async () => {
    const store = await loadStore();
    expect(store.getState().operatingRole).toBe('GUEST');
    const teacher = Object.values(store.getState().directory)[0].abbr;
    store.getState().toggleAbsence(teacher);
    expect(store.getState().absences).toHaveLength(1);
  });

  it('choosing a teacher name gives TEACHER, not ADMIN; logout returns to GUEST', async () => {
    const store = await loadStore();
    store.getState().login('Mrs. R. Pahwa');
    expect(store.getState().operatingRole).toBe('TEACHER');
    store.getState().logout();
    expect(store.getState().operatingRole).toBe('GUEST');
    expect(store.getState().loggedInTeacher).toBeNull();
  });

  it('blocks admin-only actions for the front desk', async () => {
    const store = await loadStore();
    const before = store.getState().schedule;
    const { period, teacher } = busySlot(before as never);
    store.getState().updatePeriodTask('WED', period as never, teacher, 'Free');
    store.getState().resetDay('WED');
    store.getState().setDeveloperMode(true);
    expect(store.getState().schedule).toBe(before);
    expect(store.getState().isDeveloperMode).toBe(false);
  });

  it('reports "not configured" when no hash is set', async () => {
    vi.stubEnv('VITE_ADMIN_PASSCODE_SHA256', '');
    const store = await loadStore();
    const res = await store.getState().unlockAdmin(PASSCODE);
    expect(res.ok).toBe(false);
    expect(res.reason).toMatch(/not configured/);
    expect(store.getState().operatingRole).toBe('GUEST');
  });

  it('unlocks with the right passcode, survives reload in the same tab, and lock/logout end it', async () => {
    vi.stubEnv('VITE_ADMIN_PASSCODE_SHA256', HASH);
    let store = await loadStore();
    expect((await store.getState().unlockAdmin('wrong')).ok).toBe(false);
    expect((await store.getState().unlockAdmin(PASSCODE)).ok).toBe(true);
    expect(store.getState().operatingRole).toBe('ADMIN');

    // Admin routine edit is applied and persisted per date.
    const { period, teacher } = busySlot(store.getState().schedule as never);
    store.getState().updatePeriodTask('WED', period as never, teacher, 'Free');
    expect(store.getState().schedule.WED[period as never][teacher]).toBe('Free');
    flush();

    store = await loadStore(); // reload: same tab session
    expect(store.getState().operatingRole).toBe('ADMIN');
    expect(store.getState().schedule.WED[period as never][teacher]).toBe('Free');

    store.getState().lockAdmin();
    expect(store.getState().operatingRole).toBe('GUEST');
    store = await loadStore();
    expect(store.getState().operatingRole).toBe('GUEST');
  });

  it('a rotated passcode hash invalidates existing admin sessions', async () => {
    vi.stubEnv('VITE_ADMIN_PASSCODE_SHA256', HASH);
    let store = await loadStore();
    await store.getState().unlockAdmin(PASSCODE);
    vi.stubEnv('VITE_ADMIN_PASSCODE_SHA256', createHash('sha256').update('another-passcode').digest('hex'));
    store = await loadStore();
    expect(store.getState().operatingRole).toBe('GUEST');
  });

  it('cools down after 5 wrong attempts', async () => {
    vi.stubEnv('VITE_ADMIN_PASSCODE_SHA256', HASH);
    const store = await loadStore();
    for (let i = 0; i < 5; i++) await store.getState().unlockAdmin('nope');
    const blocked = await store.getState().unlockAdmin(PASSCODE);
    expect(blocked.ok).toBe(false);
    expect(blocked.reason).toMatch(/Too many attempts/);
    vi.advanceTimersByTime(31_000);
    expect((await store.getState().unlockAdmin(PASSCODE)).ok).toBe(true);
  });
});

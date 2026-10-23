import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Test-only code; the real passcode is never in the repo.
const PASSCODE = '402917';
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
    vi.stubEnv('VITE_ADMIN_PASSCODE_SHA256', '');
    expect(getConfiguredAdminHash()).toBeNull(); // default reads the build-time env
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(getConfiguredAdminHash('not-a-hash')).toBeNull();
    warn.mockRestore();
  });

  it('verifies the passcode against the SHA-256 hash', async () => {
    const { verifyAdminPasscode } = await import('../src/lib/adminGate.js');
    expect(await verifyAdminPasscode(PASSCODE, HASH)).toBe(true);
    expect(await verifyAdminPasscode('402918', HASH)).toBe(false);
    expect(await verifyAdminPasscode(PASSCODE, null)).toBe(false);
  });

  it('accepts only exactly six digits', async () => {
    const { isWellFormedPasscode, verifyAdminPasscode } = await import('../src/lib/adminGate.js');
    expect(isWellFormedPasscode('402917')).toBe(true);
    for (const bad of ['', '40291', '4029170', '40291a', ' 402917', '４０２９１７']) {
      expect(isWellFormedPasscode(bad)).toBe(false);
    }
    // A longer code that happens to hash to the configured value is still refused.
    const longCode = 'front-office-passcode';
    expect(await verifyAdminPasscode(longCode, createHash('sha256').update(longCode).digest('hex'))).toBe(false);
  });

  it('escalates the wait: 4 free misses, then 30 s, 1 min, 5 min, 15 min, 1 h', async () => {
    const { lockoutDelayMs } = await import('../src/lib/adminGate.js');
    expect([1, 2, 3, 4].map(lockoutDelayMs)).toEqual([0, 0, 0, 0]);
    expect([5, 6, 7, 8, 9, 10, 50].map(lockoutDelayMs)).toEqual([
      30_000, 60_000, 300_000, 900_000, 3_600_000, 3_600_000, 3_600_000,
    ]);
  });

  it('forgets old failures after a day and ignores corrupt lockout records', async () => {
    const { readAdminLockout, recordFailedAdminAttempt, ADMIN_LOCKOUT_KEY, LOCKOUT_RESET_MS } = await import(
      '../src/lib/adminGate.js'
    );
    localStorage.clear();
    const t0 = 1_800_000_000_000;
    let state = readAdminLockout(t0);
    for (let i = 0; i < 3; i++) state = recordFailedAdminAttempt(state, t0);
    expect(readAdminLockout(t0 + 1000).failures).toBe(3);
    expect(readAdminLockout(t0 + LOCKOUT_RESET_MS + 1).failures).toBe(0);
    localStorage.setItem(ADMIN_LOCKOUT_KEY, '{not json');
    expect(readAdminLockout(t0).failures).toBe(0);
    localStorage.clear();
  });
});

/**
 * The owner's real passcode is provided out of band (env LFPS_ADMIN_PASSCODE) and its hash
 * lives in the untracked apps/web/.env.local. Skipped when either is missing (CI, clones).
 * Assertions compare booleans only, so neither value can appear in test output.
 */
describe('configured owner passcode (local only)', () => {
  const envLocal = fileURLToPath(new URL('../.env.local', import.meta.url));
  const ownerCode = process.env.LFPS_ADMIN_PASSCODE;
  const configured = existsSync(envLocal)
    ? /^VITE_ADMIN_PASSCODE_SHA256=(.*)$/m.exec(readFileSync(envLocal, 'utf8'))?.[1]?.trim()
    : undefined;

  it.skipIf(!ownerCode || !configured)('the gate accepts the owner passcode with the .env.local hash', async () => {
    const { getConfiguredAdminHash, isWellFormedPasscode, verifyAdminPasscode } = await import('../src/lib/adminGate.js');
    const hash = getConfiguredAdminHash(configured);
    expect(hash !== null).toBe(true);
    expect(isWellFormedPasscode(ownerCode as string)).toBe(true);
    expect(await verifyAdminPasscode(ownerCode as string, hash)).toBe(true);
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
    expect((await store.getState().unlockAdmin('000001')).ok).toBe(false);
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
    vi.stubEnv('VITE_ADMIN_PASSCODE_SHA256', createHash('sha256').update('592038').digest('hex'));
    store = await loadStore();
    expect(store.getState().operatingRole).toBe('GUEST');
  });

  it('does not count malformed input as an attempt', async () => {
    vi.stubEnv('VITE_ADMIN_PASSCODE_SHA256', HASH);
    const store = await loadStore();
    for (let i = 0; i < 10; i++) {
      expect((await store.getState().unlockAdmin('12ab')).reason).toMatch(/6-digit/);
    }
    expect(store.getState().adminFailedAttempts).toBe(0);
    expect((await store.getState().unlockAdmin(PASSCODE)).ok).toBe(true);
  });

  it('cools down after 5 wrong attempts, escalates, survives a reload, and resets on success', async () => {
    vi.stubEnv('VITE_ADMIN_PASSCODE_SHA256', HASH);
    let store = await loadStore();
    for (let i = 0; i < 4; i++) expect((await store.getState().unlockAdmin('111112')).reason).toBe('Incorrect passcode.');
    const fifth = await store.getState().unlockAdmin('111112');
    expect(fifth.reason).toMatch(/Try again in 30 s/);

    // Reloading the page does not reset the count or the wait.
    store = await loadStore();
    expect(store.getState().adminFailedAttempts).toBe(5);
    expect((await store.getState().unlockAdmin(PASSCODE)).reason).toMatch(/Too many attempts/);

    vi.advanceTimersByTime(31_000);
    const sixth = await store.getState().unlockAdmin('111112');
    expect(sixth.reason).toMatch(/Try again in 1 min/);
    vi.advanceTimersByTime(30_000);
    expect((await store.getState().unlockAdmin(PASSCODE)).ok).toBe(false); // still waiting
    vi.advanceTimersByTime(31_000);
    expect((await store.getState().unlockAdmin(PASSCODE)).ok).toBe(true);
    expect(store.getState().adminFailedAttempts).toBe(0);
    expect(localStorage.getItem('lfps_admin_lockout_v1')).toBeNull();
  });
});

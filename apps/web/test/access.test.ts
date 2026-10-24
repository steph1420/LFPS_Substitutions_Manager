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


describe('dev options gate (SEC-03)', () => {
  const DEV_CODE = '918273';
  const DEV_HASH = createHash('sha256').update(DEV_CODE).digest('hex');

  afterEach(() => {
    vi.unstubAllEnvs();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('normalises a valid Dev hash and refuses one that matches admin', async () => {
    const { getConfiguredDevHash } = await import('../src/lib/adminGate.js');
    expect(getConfiguredDevHash(`  ${DEV_HASH.toUpperCase()} `, HASH)).toBe(DEV_HASH);
    expect(getConfiguredDevHash('')).toBeNull();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(getConfiguredDevHash(HASH, HASH)).toBeNull(); // same as admin
    expect(getConfiguredDevHash('not-a-hash')).toBeNull();
    warn.mockRestore();
  });

  it('verifies the Dev passcode and starts a tab session', async () => {
    const { verifyDevPasscode, startDevSession, hasDevSession, endDevSession, getConfiguredDevHash } = await import(
      '../src/lib/adminGate.js'
    );
    expect(await verifyDevPasscode(DEV_CODE, DEV_HASH)).toBe(true);
    expect(await verifyDevPasscode('000001', DEV_HASH)).toBe(false);
    startDevSession(DEV_HASH);
    expect(hasDevSession(DEV_HASH)).toBe(true);
    endDevSession();
    expect(hasDevSession(DEV_HASH)).toBe(false);
    expect(getConfiguredDevHash(DEV_HASH, HASH)).toBe(DEV_HASH);
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

describe('roles in the store (SEC-01 interim, Bundle 34a hierarchy)', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
    vi.setSystemTime(new Date(2026, 9, 21, 9, 0)); // Wednesday
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  const AC = 'Mrs. R. Pahwa';
  const AAC = 'Mrs. S. Lakra';
  const CT = 'Mrs. M. Midha';

  it('defaults to Front Desk (GUEST), never ADMIN, and the front desk can run the day', async () => {
    const store = await loadStore();
    expect(store.getState().access.role).toBe('GUEST');
    expect(store.getState().access.canEdit).toBe(false);
    const teacher = Object.values(store.getState().directory)[0].abbr;
    store.getState().toggleAbsence(teacher);
    expect(store.getState().absences).toHaveLength(1);
  });

  it('a non-admin login is identification only (no passcode); logout returns to GUEST', async () => {
    vi.stubEnv('VITE_ADMIN_PASSCODE_SHA256', HASH);
    const store = await loadStore();
    expect(store.getState().login(CT)).toEqual({ ok: true });
    expect(store.getState().access.role).toBe('TEACHER');
    expect(store.getState().access.canEdit).toBe(false);
    expect((await store.getState().loginWithPasscode(CT, PASSCODE)).ok).toBe(false); // not an admin office
    store.getState().logout();
    expect(store.getState().access.role).toBe('GUEST');
    expect(store.getState().loggedInTeacher).toBeNull();
  });

  it('Principal, AC and AAC need the passcode at login and then get editing', async () => {
    vi.stubEnv('VITE_ADMIN_PASSCODE_SHA256', HASH);
    const store = await loadStore();
    for (const [identity, office] of [
      ['Principal', 'PRINCIPAL'],
      [AC, 'AC'],
      [AAC, 'AAC'],
    ] as const) {
      expect(store.getState().login(identity)).toEqual({ ok: false, needsPasscode: true });
      expect(store.getState().loggedInTeacher).toBeNull();
      expect((await store.getState().loginWithPasscode(identity, '000001')).ok).toBe(false);
      expect(store.getState().access.isAdmin).toBe(false);
      expect((await store.getState().loginWithPasscode(identity, PASSCODE)).ok).toBe(true);
      expect(store.getState().loggedInTeacher).toBe(identity);
      expect(store.getState().access).toMatchObject({ role: 'ADMIN', isAdmin: true, office, canEdit: true });
      store.getState().logout();
      expect(store.getState().access.canEdit).toBe(false);
    }
  });

  it('blocks admin-only actions for the front desk and a plain teacher', async () => {
    const store = await loadStore();
    const before = store.getState().schedule;
    const { period, teacher } = busySlot(before as never);
    for (const who of [null, CT]) {
      if (who) store.getState().login(who);
      store.getState().updatePeriodTask('WED', period as never, teacher, 'Free');
      store.getState().resetDay('WED');
      store.getState().setDeveloperMode(true);
      store.getState().setEditingOverride(true);
      expect(store.getState().schedule).toBe(before);
      expect(store.getState().isDeveloperMode).toBe(false);
      expect(store.getState().editingOverride).toBe(false);
    }
  });

  it("today's appointed Off. AC is an admin with the passcode, for that day only", async () => {
    vi.stubEnv('VITE_ADMIN_PASSCODE_SHA256', HASH);
    const store = await loadStore();
    expect(store.getState().login(CT).ok).toBe(true); // not Off. AC yet
    store.getState().logout();
    store.getState().toggleAbsence(AC);
    store.getState().toggleAbsence(AAC);
    store.getState().assignOfficiatingAC('WED', CT);
    expect(store.getState().login(CT)).toEqual({ ok: false, needsPasscode: true });
    expect((await store.getState().loginWithPasscode(CT, PASSCODE)).ok).toBe(true);
    expect(store.getState().access).toMatchObject({ isAdmin: true, office: 'OFF_AC' });

    const { period, teacher } = busySlot(store.getState().schedule as never);
    store.getState().updatePeriodTask('WED', period as never, teacher, 'Free');
    expect(store.getState().schedule.WED[period as never][teacher]).toBe('Free');

    // Thursday: the Wednesday appointment no longer makes her an admin.
    vi.setSystemTime(new Date(2026, 9, 22, 9, 0));
    const { resolveAccess } = await import('../src/lib/access.js');
    expect(resolveAccess(store.getState()).isAdmin).toBe(false);
    const before = store.getState().schedule;
    store.getState().updatePeriodTask('WED', period as never, teacher, 'Changed');
    expect(store.getState().schedule).toBe(before);
    expect(store.getState().access.isAdmin).toBe(false); // derived access caught up on the next change
  });

  it('the AC coming back ends an Off. AC admin session immediately', async () => {
    vi.stubEnv('VITE_ADMIN_PASSCODE_SHA256', HASH);
    const store = await loadStore();
    store.getState().toggleAbsence(AC);
    store.getState().assignOfficiatingAC('WED', CT);
    expect((await store.getState().loginWithPasscode(CT, PASSCODE)).ok).toBe(true);
    expect(store.getState().access.office).toBe('OFF_AC');
    store.getState().toggleAbsence(AC); // AC present again
    expect(store.getState().access.isAdmin).toBe(false);
  });

  it('switching identity drops the previous admin session', async () => {
    vi.stubEnv('VITE_ADMIN_PASSCODE_SHA256', HASH);
    const store = await loadStore();
    await store.getState().loginWithPasscode(AC, PASSCODE);
    expect(store.getState().access.isAdmin).toBe(true);
    store.getState().login(CT);
    expect(store.getState().access).toMatchObject({ role: 'TEACHER', isAdmin: false });
    expect(sessionStorage.getItem('lfps_admin_session_v2')).toBeNull();
  });

  it('reports "not configured" when no hash is set', async () => {
    vi.stubEnv('VITE_ADMIN_PASSCODE_SHA256', '');
    const store = await loadStore();
    const res = await store.getState().loginWithPasscode(AC, PASSCODE);
    expect(res.ok).toBe(false);
    expect(res.reason).toMatch(/not configured/);
    expect(store.getState().access.role).toBe('GUEST');
  });

  it('admin login survives reload in the same tab (with its identity), and logout ends it', async () => {
    vi.stubEnv('VITE_ADMIN_PASSCODE_SHA256', HASH);
    let store = await loadStore();
    expect((await store.getState().loginWithPasscode(AC, PASSCODE)).ok).toBe(true);

    const { period, teacher } = busySlot(store.getState().schedule as never);
    store.getState().updatePeriodTask('WED', period as never, teacher, 'Free');
    flush();

    store = await loadStore(); // reload: same tab session
    expect(store.getState().loggedInTeacher).toBe(AC);
    expect(store.getState().access.isAdmin).toBe(true);
    expect(store.getState().schedule.WED[period as never][teacher]).toBe('Free');

    store.getState().logout();
    expect(store.getState().access.role).toBe('GUEST');
    store = await loadStore();
    expect(store.getState().access.role).toBe('GUEST');
  });

  it('ignores a pre-34a session (no identity) and a rotated passcode hash', async () => {
    vi.stubEnv('VITE_ADMIN_PASSCODE_SHA256', HASH);
    sessionStorage.setItem('lfps_admin_session_v1', HASH);
    let store = await loadStore();
    expect(store.getState().access.isAdmin).toBe(false);
    await store.getState().loginWithPasscode(AC, PASSCODE);
    vi.stubEnv('VITE_ADMIN_PASSCODE_SHA256', createHash('sha256').update('592038').digest('hex'));
    store = await loadStore();
    expect(store.getState().access.isAdmin).toBe(false);
  });

  it('does not count malformed input as an attempt', async () => {
    vi.stubEnv('VITE_ADMIN_PASSCODE_SHA256', HASH);
    const store = await loadStore();
    for (let i = 0; i < 10; i++) {
      expect((await store.getState().loginWithPasscode(AC, '12ab')).reason).toMatch(/6-digit/);
    }
    expect(store.getState().adminFailedAttempts).toBe(0);
    expect((await store.getState().loginWithPasscode(AC, PASSCODE)).ok).toBe(true);
  });

  it('cools down after 5 wrong attempts, escalates, survives a reload, and resets on success', async () => {
    vi.stubEnv('VITE_ADMIN_PASSCODE_SHA256', HASH);
    let store = await loadStore();
    const attempt = (code: string) => store.getState().loginWithPasscode(AAC, code);
    for (let i = 0; i < 4; i++) expect((await attempt('111112')).reason).toBe('Incorrect passcode.');
    const fifth = await attempt('111112');
    expect(fifth.reason).toMatch(/Try again in 30 s/);

    // Reloading the page does not reset the count or the wait.
    store = await loadStore();
    expect(store.getState().adminFailedAttempts).toBe(5);
    expect((await attempt(PASSCODE)).reason).toMatch(/Too many attempts/);

    vi.advanceTimersByTime(31_000);
    const sixth = await attempt('111112');
    expect(sixth.reason).toMatch(/Try again in 1 min/);
    vi.advanceTimersByTime(30_000);
    expect((await attempt(PASSCODE)).ok).toBe(false); // still waiting
    vi.advanceTimersByTime(31_000);
    expect((await attempt(PASSCODE)).ok).toBe(true);
    expect(store.getState().adminFailedAttempts).toBe(0);
    expect(localStorage.getItem('lfps_admin_lockout_v1')).toBeNull();
  });
});

describe('dev override: Edit without login (Bundle 34a)', () => {
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

  it('an admin turns it on; then editing works with nobody logged in, on this device only', async () => {
    vi.stubEnv('VITE_ADMIN_PASSCODE_SHA256', HASH);
    let store = await loadStore();
    await store.getState().loginWithPasscode('Principal', PASSCODE);
    store.getState().setEditingOverride(true);
    store.getState().logout();
    expect(store.getState().access).toMatchObject({ role: 'GUEST', isAdmin: false, canEdit: true, editingUnlocked: true });

    const { period, teacher } = busySlot(store.getState().schedule as never);
    store.getState().updatePeriodTask('WED', period as never, teacher, 'Free');
    expect(store.getState().schedule.WED[period as never][teacher]).toBe('Free');

    // Device-local: survives reload via localStorage, and is not part of the synced/persisted day state.
    expect(localStorage.getItem('lfps_dev_editing_unlocked_v1')).toBe('1');
    flush();
    const persisted = Object.keys(localStorage)
      .filter((k) => k !== 'lfps_dev_editing_unlocked_v1')
      .map((k) => localStorage.getItem(k) ?? '')
      .join('\n');
    expect(persisted).not.toMatch(/editingOverride|lfps_dev_editing_unlocked/);
    store = await loadStore();
    expect(store.getState().access.canEdit).toBe(true);

    // Editing override still works; Dev Options needs its own passcode (SEC-03).
    store.getState().setDeveloperMode(true);
    expect(store.getState().isDeveloperMode).toBe(false);
    store.getState().setEditingOverride(false);
    expect(store.getState().access.canEdit).toBe(false);
    expect(localStorage.getItem('lfps_dev_editing_unlocked_v1')).toBeNull();
  });

  it('unlocks Developer Options with the Dev passcode alone (no admin session)', async () => {
    const DEV_CODE = '918273';
    const DEV_HASH = createHash('sha256').update(DEV_CODE).digest('hex');
    vi.stubEnv('VITE_ADMIN_PASSCODE_SHA256', HASH);
    vi.stubEnv('VITE_DEV_PASSCODE_SHA256', DEV_HASH);
    const store = await loadStore();
    expect(store.getState().access.canEdit).toBe(false);
    expect((await store.getState().unlockDeveloperMode('000001')).ok).toBe(false);
    expect(store.getState().isDeveloperMode).toBe(false);
    expect((await store.getState().unlockDeveloperMode(DEV_CODE)).ok).toBe(true);
    expect(store.getState().isDeveloperMode).toBe(true);
    // With Dev session, Edit without login can be turned on without admin.
    store.getState().setEditingOverride(true);
    expect(store.getState().access).toMatchObject({ canEdit: true, editingUnlocked: true, role: 'GUEST' });
    store.getState().setDeveloperMode(false);
    expect(store.getState().isDeveloperMode).toBe(false);
    // Closing Dev session does not clear the device-local editing override.
    expect(store.getState().access.canEdit).toBe(true);
  });

  it('refuses a Dev passcode that was baked equal to the admin hash', async () => {
    vi.stubEnv('VITE_ADMIN_PASSCODE_SHA256', HASH);
    vi.stubEnv('VITE_DEV_PASSCODE_SHA256', HASH);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const store = await loadStore();
    const result = await store.getState().unlockDeveloperMode(PASSCODE);
    expect(result.ok).toBe(false);
    warn.mockRestore();
  });
});

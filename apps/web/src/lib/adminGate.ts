/**
 * Admin unlock (SEC-01 interim, Bundle 34).
 *
 * IMPORTANT — THIS IS NOT REAL SECURITY. The app is a static site; everything here runs
 * in the visitor's browser and the configured hash ships inside the public JS bundle.
 * The passcode is 6 digits (owner decision), so there are only 1,000,000 candidates:
 * anyone who copies the hash out of the bundle can recover the passcode offline in well
 * under a second, and DevTools can bypass the check outright. The lockout below only slows
 * guessing through the UI. The gate exists to stop ACCIDENTAL admin actions (routine
 * edits, Reset Day, Purge History, solver policy, Developer Options) at a shared
 * front-desk device. Real enforcement must happen on the server: see TODO SEC-02.
 *
 * Setup (owner): `npm run admin:hash` → put the printed hex in VITE_ADMIN_PASSCODE_SHA256
 * (apps/web/.env.local, untracked) → rebuild. Unset = admin unlock unavailable; all
 * front-desk work keeps working. Full guide: docs/ADMIN_ACCESS.md.
 */

const SHA256_HEX = /^[0-9a-f]{64}$/;
export const ADMIN_SESSION_KEY = 'lfps_admin_session_v1';
export const ADMIN_LOCKOUT_KEY = 'lfps_admin_lockout_v1';

/** The admin passcode is exactly six digits (entered on a numeric keypad). */
export const ADMIN_PASSCODE_LENGTH = 6;
const PASSCODE_PATTERN = /^\d{6}$/;

export function isWellFormedPasscode(value: string): boolean {
  return PASSCODE_PATTERN.test(value);
}

/** Wrong attempts allowed before the first wait. */
export const MAX_FAILED_ATTEMPTS = 5;
/**
 * Escalating waits (iOS-style): the 5th wrong attempt waits 30 s, then each further wrong
 * attempt waits longer: 1 min, 5 min, 15 min, then 1 h for every attempt after that.
 */
export const LOCKOUT_STEPS_MS: readonly number[] = [30_000, 60_000, 5 * 60_000, 15 * 60_000, 60 * 60_000];
/** The failure count is forgotten after a day without wrong attempts. */
export const LOCKOUT_RESET_MS = 24 * 60 * 60_000;

/** Wait imposed after the `failures`-th consecutive wrong attempt (0 = none). */
export function lockoutDelayMs(failures: number): number {
  if (failures < MAX_FAILED_ATTEMPTS) return 0;
  const step = Math.min(failures - MAX_FAILED_ATTEMPTS, LOCKOUT_STEPS_MS.length - 1);
  return LOCKOUT_STEPS_MS[step];
}

export interface AdminLockoutState {
  /** Consecutive wrong attempts. */
  failures: number;
  /** Epoch ms until which attempts are refused, or null. */
  lockedUntil: number | null;
  /** Epoch ms of the last wrong attempt. */
  lastFailureAt: number | null;
}

const NO_LOCKOUT: AdminLockoutState = { failures: 0, lockedUntil: null, lastFailureAt: null };
type KeyValue = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function localStore(): KeyValue | null {
  try {
    return typeof window !== 'undefined' && window.localStorage ? window.localStorage : null;
  } catch {
    return null;
  }
}

/**
 * Lockout state is kept per device (localStorage), so a reload or a new tab does not
 * reset the count. It holds no secret: only counts and timestamps.
 */
export function readAdminLockout(now: number = Date.now(), storage: KeyValue | null = localStore()): AdminLockoutState {
  let parsed: Partial<AdminLockoutState> | null = null;
  try {
    const raw = storage?.getItem(ADMIN_LOCKOUT_KEY);
    parsed = raw ? (JSON.parse(raw) as Partial<AdminLockoutState>) : null;
  } catch {
    parsed = null;
  }
  if (!parsed || typeof parsed.failures !== 'number' || parsed.failures < 0) return NO_LOCKOUT;
  const lastFailureAt = typeof parsed.lastFailureAt === 'number' ? parsed.lastFailureAt : null;
  if (lastFailureAt === null || now - lastFailureAt > LOCKOUT_RESET_MS) return NO_LOCKOUT;
  const lockedUntil = typeof parsed.lockedUntil === 'number' && parsed.lockedUntil > now ? parsed.lockedUntil : null;
  return { failures: Math.floor(parsed.failures), lockedUntil, lastFailureAt };
}

/**
 * Record one wrong attempt after `previous` and return the new state (with any wait it
 * triggers). Pass the higher of the stored and in-memory state, so the count still grows
 * when storage is unavailable.
 */
export function recordFailedAdminAttempt(
  previous: AdminLockoutState,
  now: number = Date.now(),
  storage: KeyValue | null = localStore()
): AdminLockoutState {
  const failures = previous.failures + 1;
  const delay = lockoutDelayMs(failures);
  const next: AdminLockoutState = { failures, lockedUntil: delay ? now + delay : null, lastFailureAt: now };
  try {
    storage?.setItem(ADMIN_LOCKOUT_KEY, JSON.stringify(next));
  } catch {
    // Storage unavailable: the caller still enforces the returned state in memory.
  }
  return next;
}

export function clearAdminLockout(storage: KeyValue | null = localStore()): void {
  try {
    storage?.removeItem(ADMIN_LOCKOUT_KEY);
  } catch {
    // ignore
  }
}

/** "30 s", "1 min", "15 min", "1 h" — for lockout messages. */
export function formatWait(ms: number): string {
  const secs = Math.max(1, Math.ceil(ms / 1000));
  if (secs < 60) return `${secs} s`;
  const mins = Math.ceil(secs / 60);
  if (mins < 60) return `${mins} min`;
  return `${Math.ceil(mins / 60)} h`;
}

/** The configured hash (lower-case hex) or null if unset / malformed. */
export function getConfiguredAdminHash(raw: string | undefined = import.meta.env.VITE_ADMIN_PASSCODE_SHA256): string | null {
  const value = raw?.trim().toLowerCase();
  if (!value) return null;
  if (!SHA256_HEX.test(value)) {
    console.warn('[admin] VITE_ADMIN_PASSCODE_SHA256 is not a 64-character SHA-256 hex digest; admin unlock disabled.');
    return null;
  }
  return value;
}

export async function sha256Hex(text: string): Promise<string> {
  if (!globalThis.crypto?.subtle) {
    throw new Error('Secure context required (HTTPS or localhost) for passcode check.');
  }
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Length-independent comparison of two hex strings. */
function equalHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function verifyAdminPasscode(passcode: string, configuredHash: string | null): Promise<boolean> {
  if (!configuredHash || !isWellFormedPasscode(passcode)) return false;
  return equalHex(await sha256Hex(passcode), configuredHash);
}

function sessionStore(): KeyValue | null {
  try {
    return typeof window !== 'undefined' && window.sessionStorage ? window.sessionStorage : null;
  } catch {
    return null;
  }
}

/**
 * The unlock lasts for this browser tab only (sessionStorage) and only while the
 * configured hash is unchanged — rotating the passcode signs every device out.
 */
export function hasAdminSession(configuredHash: string | null = getConfiguredAdminHash()): boolean {
  if (!configuredHash) return false;
  return sessionStore()?.getItem(ADMIN_SESSION_KEY) === configuredHash;
}

export function startAdminSession(configuredHash: string): void {
  try {
    sessionStore()?.setItem(ADMIN_SESSION_KEY, configuredHash);
  } catch {
    // Storage unavailable: admin stays unlocked in memory for this page only.
  }
}

export function endAdminSession(): void {
  try {
    sessionStore()?.removeItem(ADMIN_SESSION_KEY);
  } catch {
    // ignore
  }
}

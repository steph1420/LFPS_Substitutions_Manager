/**
 * Admin unlock (SEC-01 interim, Bundle 34).
 *
 * IMPORTANT — THIS IS NOT REAL SECURITY. The app is a static site; everything here runs
 * in the visitor's browser and the configured hash ships inside the public JS bundle.
 * A determined person can bypass the check with DevTools or brute-force a short
 * passcode offline. It exists to stop ACCIDENTAL admin actions (routine edits, Reset
 * Day, Purge History, solver policy, Developer Options) at a shared front-desk device.
 * Real enforcement must happen on the server: see TODO SEC-02.
 *
 * Setup (owner): `npm run admin:hash` → put the printed hex in VITE_ADMIN_PASSCODE_SHA256
 * (apps/web/.env.local, untracked) → rebuild. Unset = admin unlock unavailable; all
 * front-desk work keeps working. Full guide: docs/ADMIN_ACCESS.md.
 */

const SHA256_HEX = /^[0-9a-f]{64}$/;
export const ADMIN_SESSION_KEY = 'lfps_admin_session_v1';
export const MAX_FAILED_ATTEMPTS = 5;
export const LOCKOUT_MS = 30_000;

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
  if (!configuredHash || !passcode) return false;
  return equalHex(await sha256Hex(passcode), configuredHash);
}

type SessionStore = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function sessionStore(): SessionStore | null {
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

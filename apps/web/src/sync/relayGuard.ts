/**
 * Relay-target safety check (Bundle 35a). Local dev servers and test builds must never talk to
 * the production relay: a stray edit from a test run would reach every device and, in sheets
 * mode, the owner's Sheet.
 *
 * Used twice, so a mistake fails early and loudly:
 *   • vite.config.ts — refuses to start `vite dev` / a non-production build that resolves to a
 *     production relay, and refuses a build marked VITE_RELAY_TARGET=local that isn't local;
 *   • sync/live.ts — the same check at runtime; a blocked build stays offline instead of connecting.
 *
 * Pure (no import.meta) so the Vite config and the tests can use it.
 */

/** Hosts that are a deployed relay. Render hosts the production relay (docs/RENDER_SETUP.md). */
export function isProductionRelay(url: string): boolean {
  const host = hostOf(url);
  return host !== null && (host === 'onrender.com' || host.endsWith('.onrender.com'));
}

/** Loopback only: localhost, *.localhost, 127.0.0.0/8, ::1. */
export function isLocalRelay(url: string): boolean {
  const host = hostOf(url);
  if (host === null) return false;
  return (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    /^127(\.\d{1,3}){3}$/.test(host) ||
    host === '[::1]' ||
    host === '::1'
  );
}

function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

export interface RelayTargetInput {
  wsUrl: string;
  apiUrl: string;
  /** True for production builds (`vite build` in mode "production"); false for dev and tests. */
  production: boolean;
  /** VITE_RELAY_TARGET — test scripts set "local". */
  target?: string;
  /** VITE_ALLOW_PROD_RELAY — "1" lets a dev build talk to production on purpose. */
  allowProd?: string;
}

/** Null when the target is allowed, otherwise a short reason. */
export function checkRelayTarget(input: RelayTargetInput): string | null {
  const urls = [input.wsUrl, input.apiUrl];
  if (input.target === 'local') {
    const bad = urls.find((u) => !isLocalRelay(u));
    return bad === undefined ? null : `VITE_RELAY_TARGET=local but the relay is not local (${safeHost(bad)})`;
  }
  if (!input.production && input.allowProd !== '1') {
    const bad = urls.find(isProductionRelay);
    if (bad !== undefined) {
      return `a dev/test build would use the production relay (${safeHost(bad)}); point VITE_WS_URL/VITE_API_URL at a local relay or set VITE_ALLOW_PROD_RELAY=1`;
    }
  }
  return null;
}

function safeHost(url: string): string {
  return hostOf(url) ?? 'invalid URL';
}

/**
 * Device-local Developer Options for Bundle 37 UI experiments (FEAT-69).
 * Same pattern as "Edit without login" (lib/access.ts): localStorage only, never synced.
 */

export type HeaderScrollMode = 'container' | 'thresholds';

export interface DevUiPrefs {
  /** UI-10: (a) container scroll (default) | (b) header thresholds on window scroll */
  headerScrollMode: HeaderScrollMode;
  /** When marking someone Absent, switch Roster filter to Absent */
  autoFilterAbsent: boolean;
  /** Optional "Needs attention" strip at top of Roster */
  needsAttentionStrip: boolean;
}

export const DEV_UI_PREFS_KEY = 'lfps_dev_ui_prefs_v1';

export const DEFAULT_DEV_UI_PREFS: DevUiPrefs = {
  headerScrollMode: 'container',
  autoFilterAbsent: false,
  needsAttentionStrip: false,
};

function localStore(): Storage | null {
  try {
    return typeof window !== 'undefined' && window.localStorage ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function readDevUiPrefs(): DevUiPrefs {
  try {
    const raw = localStore()?.getItem(DEV_UI_PREFS_KEY);
    if (!raw) return { ...DEFAULT_DEV_UI_PREFS };
    const parsed = JSON.parse(raw) as Partial<DevUiPrefs>;
    const mode = parsed.headerScrollMode;
    return {
      headerScrollMode: mode === 'thresholds' || mode === 'container' ? mode : 'container',
      autoFilterAbsent: Boolean(parsed.autoFilterAbsent),
      needsAttentionStrip: Boolean(parsed.needsAttentionStrip),
    };
  } catch {
    return { ...DEFAULT_DEV_UI_PREFS };
  }
}

export function writeDevUiPrefs(patch: Partial<DevUiPrefs>): DevUiPrefs {
  const next = { ...readDevUiPrefs(), ...patch };
  try {
    localStore()?.setItem(DEV_UI_PREFS_KEY, JSON.stringify(next));
  } catch {
    // Prefs last for this page only if storage is unavailable.
  }
  try {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('lfps-dev-ui-prefs', { detail: next }));
    }
  } catch {
    // ignore
  }
  return next;
}

/** Scroll container id when headerScrollMode === 'container' (App.tsx). */
export const APP_SCROLL_ID = 'lfps-app-scroll';

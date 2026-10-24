/**
 * Device-local Developer Options for Bundle 37/38a UI experiments (FEAT-69, FEAT-70).
 * Same pattern as "Edit without login" (lib/access.ts): localStorage only, never synced.
 */

import type { DayOfWeek } from '@lfps/core';

export type HeaderScrollMode = 'container' | 'thresholds';

/** FEAT-70: (a) snap to school day | (b) free browse with optional last-pick memory */
export type DayLoadMode = 'follow' | 'free';

export interface DevUiPrefs {
  /** UI-10: (a) container scroll (default) | (b) header thresholds on window scroll */
  headerScrollMode: HeaderScrollMode;
  /** When marking someone Absent, switch Roster filter to Absent */
  autoFilterAbsent: boolean;
  /** Optional "Needs attention" strip at top of Roster */
  needsAttentionStrip: boolean;
  /** FEAT-70: follow school day (default) vs free pick */
  dayLoadMode: DayLoadMode;
  /** Last MON–SAT the user picked while in free mode (device-local) */
  lastFreeDay: DayOfWeek | null;
}

export const DEV_UI_PREFS_KEY = 'lfps_dev_ui_prefs_v1';

const SCHOOL_DAYS: DayOfWeek[] = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

export const DEFAULT_DEV_UI_PREFS: DevUiPrefs = {
  headerScrollMode: 'container',
  autoFilterAbsent: false,
  needsAttentionStrip: false,
  dayLoadMode: 'follow',
  lastFreeDay: null,
};

function localStore(): Storage | null {
  try {
    return typeof window !== 'undefined' && window.localStorage ? window.localStorage : null;
  } catch {
    return null;
  }
}

function parseDay(value: unknown): DayOfWeek | null {
  return typeof value === 'string' && (SCHOOL_DAYS as string[]).includes(value)
    ? (value as DayOfWeek)
    : null;
}

export function readDevUiPrefs(): DevUiPrefs {
  try {
    const raw = localStore()?.getItem(DEV_UI_PREFS_KEY);
    if (!raw) return { ...DEFAULT_DEV_UI_PREFS };
    const parsed = JSON.parse(raw) as Partial<DevUiPrefs>;
    const mode = parsed.headerScrollMode;
    const dayMode = parsed.dayLoadMode;
    return {
      headerScrollMode: mode === 'thresholds' || mode === 'container' ? mode : 'container',
      autoFilterAbsent: Boolean(parsed.autoFilterAbsent),
      needsAttentionStrip: Boolean(parsed.needsAttentionStrip),
      dayLoadMode: dayMode === 'free' || dayMode === 'follow' ? dayMode : 'follow',
      lastFreeDay: parseDay(parsed.lastFreeDay),
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

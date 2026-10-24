import { describe, it, expect, beforeEach } from 'vitest';
import {
  DEFAULT_DEV_UI_PREFS,
  DEV_UI_PREFS_KEY,
  readDevUiPrefs,
  writeDevUiPrefs,
} from '../src/lib/devUiPrefs.js';

describe('devUiPrefs (FEAT-69 / FEAT-70)', () => {
  beforeEach(() => {
    localStorage.removeItem(DEV_UI_PREFS_KEY);
  });

  it('defaults to container scroll, strips off, follow school day', () => {
    expect(readDevUiPrefs()).toEqual(DEFAULT_DEV_UI_PREFS);
    expect(readDevUiPrefs().headerScrollMode).toBe('container');
    expect(readDevUiPrefs().dayLoadMode).toBe('follow');
    expect(readDevUiPrefs().lastFreeDay).toBeNull();
  });

  it('persists patches device-locally', () => {
    const next = writeDevUiPrefs({
      headerScrollMode: 'thresholds',
      autoFilterAbsent: true,
      needsAttentionStrip: true,
      dayLoadMode: 'free',
      lastFreeDay: 'WED',
    });
    expect(next.headerScrollMode).toBe('thresholds');
    expect(next.dayLoadMode).toBe('free');
    expect(next.lastFreeDay).toBe('WED');
    expect(readDevUiPrefs()).toEqual(next);
    expect(localStorage.getItem(DEV_UI_PREFS_KEY)).toContain('thresholds');
  });

  it('rejects unknown headerScrollMode and dayLoadMode values', () => {
    localStorage.setItem(
      DEV_UI_PREFS_KEY,
      JSON.stringify({ headerScrollMode: 'wiggle', dayLoadMode: 'random', autoFilterAbsent: 1, lastFreeDay: 'SUN' })
    );
    const prefs = readDevUiPrefs();
    expect(prefs.headerScrollMode).toBe('container');
    expect(prefs.dayLoadMode).toBe('follow');
    expect(prefs.autoFilterAbsent).toBe(true);
    expect(prefs.lastFreeDay).toBeNull();
  });
});

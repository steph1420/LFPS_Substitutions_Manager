import { describe, it, expect, beforeEach } from 'vitest';
import {
  DEFAULT_DEV_UI_PREFS,
  DEV_UI_PREFS_KEY,
  readDevUiPrefs,
  writeDevUiPrefs,
} from '../src/lib/devUiPrefs.js';

describe('devUiPrefs (FEAT-69)', () => {
  beforeEach(() => {
    localStorage.removeItem(DEV_UI_PREFS_KEY);
  });

  it('defaults to container scroll with strips off', () => {
    expect(readDevUiPrefs()).toEqual(DEFAULT_DEV_UI_PREFS);
    expect(readDevUiPrefs().headerScrollMode).toBe('container');
  });

  it('persists patches device-locally', () => {
    const next = writeDevUiPrefs({
      headerScrollMode: 'thresholds',
      autoFilterAbsent: true,
      needsAttentionStrip: true,
    });
    expect(next.headerScrollMode).toBe('thresholds');
    expect(readDevUiPrefs()).toEqual(next);
    expect(localStorage.getItem(DEV_UI_PREFS_KEY)).toContain('thresholds');
  });

  it('rejects unknown headerScrollMode values', () => {
    localStorage.setItem(
      DEV_UI_PREFS_KEY,
      JSON.stringify({ headerScrollMode: 'wiggle', autoFilterAbsent: 1 })
    );
    const prefs = readDevUiPrefs();
    expect(prefs.headerScrollMode).toBe('container');
    expect(prefs.autoFilterAbsent).toBe(true);
  });
});

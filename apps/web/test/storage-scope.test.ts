import { describe, expect, it } from 'vitest';
import { branchSlug, BUILD_CHANNEL, IS_PREVIEW_BUILD, PREVIEW_SLUG, scopedStorageKey } from '../src/lib/storageScope.js';

describe('storageScope', () => {
  it('exposes channel from VITE_BUILD_CHANNEL (production default; preview when set)', () => {
    if (BUILD_CHANNEL === 'preview') {
      expect(IS_PREVIEW_BUILD).toBe(true);
      expect(scopedStorageKey('lfps_operational_state')).toBe(
        `lfps_preview_${PREVIEW_SLUG}_operational_state`,
      );
      expect(scopedStorageKey('lfps_admin_session_v2')).toBe(
        `lfps_preview_${PREVIEW_SLUG}_admin_session_v2`,
      );
    } else {
      expect(BUILD_CHANNEL).toBe('production');
      expect(IS_PREVIEW_BUILD).toBe(false);
      expect(scopedStorageKey('lfps_operational_state')).toBe('lfps_operational_state');
      expect(scopedStorageKey('lfps_admin_session_v2')).toBe('lfps_admin_session_v2');
    }
  });

  it('slugifies branch names for preview URLs and keys', () => {
    expect(branchSlug('bundle/36')).toBe('bundle-36');
    expect(branchSlug('preview/foo_bar')).toBe('preview-foo_bar');
    expect(branchSlug('  weird//name!!  ')).toBe('weird-name');
  });
});

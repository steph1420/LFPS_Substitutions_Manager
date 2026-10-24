import { describe, expect, it } from 'vitest';
import { branchSlug, BUILD_CHANNEL, IS_PREVIEW_BUILD, scopedStorageKey } from '../src/lib/storageScope.js';

describe('storageScope (production defaults in Vitest)', () => {
  it('defaults to production channel so keys stay historical', () => {
    expect(BUILD_CHANNEL).toBe('production');
    expect(IS_PREVIEW_BUILD).toBe(false);
    expect(scopedStorageKey('lfps_operational_state')).toBe('lfps_operational_state');
    expect(scopedStorageKey('lfps_admin_session_v2')).toBe('lfps_admin_session_v2');
  });

  it('slugifies branch names for preview URLs and keys', () => {
    expect(branchSlug('bundle/36')).toBe('bundle-36');
    expect(branchSlug('preview/foo_bar')).toBe('preview-foo_bar');
    expect(branchSlug('  weird//name!!  ')).toBe('weird-name');
  });
});

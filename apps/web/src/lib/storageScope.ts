/**
 * Preview builds share the GitHub Pages origin with production, so bare localStorage
 * keys would collide (FEAT-64). Namespace every persisted key by channel + branch slug
 * on preview builds; production keeps the historical key names unchanged.
 */

export type BuildChannel = 'production' | 'preview';

const rawChannel = (import.meta.env.VITE_BUILD_CHANNEL || 'production').toLowerCase();
export const BUILD_CHANNEL: BuildChannel = rawChannel === 'preview' ? 'preview' : 'production';
export const IS_PREVIEW_BUILD = BUILD_CHANNEL === 'preview';

/** `bundle/36` → `bundle-36` (URL- and storage-safe). */
export function branchSlug(branch: string): string {
  return (
    branch
      .trim()
      .replace(/\//g, '-')
      .replace(/[^a-zA-Z0-9._-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '') || 'unknown'
  );
}

/** Branch slug for this build (from Vite `define`). */
export const PREVIEW_SLUG = branchSlug(typeof __GIT_BRANCH__ !== 'undefined' ? __GIT_BRANCH__ : 'unknown');

/**
 * Map a canonical `lfps_…` key to the scoped form used on this build.
 * Production: unchanged. Preview: `lfps_preview_<slug>_<rest>`.
 */
export function scopedStorageKey(baseKey: string): string {
  if (!IS_PREVIEW_BUILD) return baseKey;
  const rest = baseKey.startsWith('lfps_') ? baseKey.slice('lfps_'.length) : baseKey;
  return `lfps_preview_${PREVIEW_SLUG}_${rest}`;
}

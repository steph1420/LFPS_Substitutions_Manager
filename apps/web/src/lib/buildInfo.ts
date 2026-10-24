// Build provenance injected by Vite `define` (see vite.config.ts). Never hard-code versions in UI.
export { BUILD_CHANNEL, IS_PREVIEW_BUILD, PREVIEW_SLUG } from './storageScope.js';
export type { BuildChannel } from './storageScope.js';

export const APP_VERSION: string = __APP_VERSION__;
export const GIT_COMMIT: string = __GIT_COMMIT__;
export const GIT_BRANCH: string = __GIT_BRANCH__;
export const BUILD_TIME: string = __BUILD_TIME__;

/** e.g. "v2.0.0-alpha.3 · a1b2c3d · bundle/36" */
export const BUILD_LABEL = `v${APP_VERSION} · ${GIT_COMMIT} · ${GIT_BRANCH}`;

/** Absolute preview index on GitHub Pages (FEAT-64 option A). */
export const PREVIEW_INDEX_HREF = '/LFPS_Substitutions_Manager/preview/';

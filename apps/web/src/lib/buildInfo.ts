// Build provenance injected by Vite `define` (see vite.config.ts). Never hard-code versions in UI.
export const APP_VERSION: string = __APP_VERSION__;
export const GIT_COMMIT: string = __GIT_COMMIT__;
export const GIT_BRANCH: string = __GIT_BRANCH__;
export const BUILD_TIME: string = __BUILD_TIME__;

/** e.g. "v2.0.0-alpha.2 · a1b2c3d · bundle/34" */
export const BUILD_LABEL = `v${APP_VERSION} · ${GIT_COMMIT} · ${GIT_BRANCH}`;

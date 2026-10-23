/// <reference types="vite/client" />

/** Root package.json version, injected at build time (apps/web/vite.config.ts). */
declare const __APP_VERSION__: string;
/** Short git commit of the build (suffixed "-dirty" if built with uncommitted changes). */
declare const __GIT_COMMIT__: string;
/** Git branch the build was made from. */
declare const __GIT_BRANCH__: string;
/** ISO timestamp of the build. */
declare const __BUILD_TIME__: string;

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_WS_URL?: string;
  /** SHA-256 hex digest of the admin passcode. Unset = admin unlock unavailable. See docs/ADMIN_ACCESS.md. */
  readonly VITE_ADMIN_PASSCODE_SHA256?: string;
}

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Single source of truth for the version: the ROOT package.json (see scripts/version.mjs).
const rootPackageJson = fileURLToPath(new URL('../../package.json', import.meta.url));
const appVersion: string = JSON.parse(readFileSync(rootPackageJson, 'utf8')).version;

function git(command: string): string | null {
  try {
    return execSync(`git ${command}`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() || null;
  } catch {
    return null;
  }
}

// Build provenance shown in the footer and Settings → Build Info.
// CI may inject GIT_COMMIT / GIT_BRANCH explicitly; otherwise read the local checkout.
// A "-dirty" suffix means the build included uncommitted changes.
const isDirty = (git('status --porcelain --untracked-files=no') ?? '').length > 0;
const gitCommit =
  (process.env.GIT_COMMIT?.slice(0, 7) || git('rev-parse --short=7 HEAD') || 'unknown') + (isDirty ? '-dirty' : '');
const gitBranch = process.env.GIT_BRANCH || git('rev-parse --abbrev-ref HEAD') || 'unknown';

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
    __GIT_COMMIT__: JSON.stringify(gitCommit),
    __GIT_BRANCH__: JSON.stringify(gitBranch),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  server: {
    port: 5173,
    host: true,
  },
});

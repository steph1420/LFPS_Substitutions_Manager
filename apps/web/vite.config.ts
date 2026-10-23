import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { checkRelayTarget } from './src/sync/relayGuard';

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
export default defineConfig(({ command, mode }) => {
  // Relay safety check (Bundle 35a): the production relay URLs live in .env.production, so only
  // `vite build` in mode "production" gets them. Anything else that still resolves to the
  // production relay (a stray env var, a copied .env) fails here instead of syncing test edits.
  const env = { ...loadEnv(mode, process.cwd(), 'VITE_'), ...pickViteEnv(process.env) };
  const blocked = checkRelayTarget({
    wsUrl: env.VITE_WS_URL || 'ws://localhost:8080',
    apiUrl: env.VITE_API_URL || 'http://localhost:8080',
    production: command === 'build' && mode === 'production',
    target: env.VITE_RELAY_TARGET,
    allowProd: env.VITE_ALLOW_PROD_RELAY,
  });
  if (blocked) throw new Error(`[relay guard] ${blocked}`);
  return config;
});

function pickViteEnv(source: NodeJS.ProcessEnv): Record<string, string> {
  return Object.fromEntries(
    Object.entries(source).filter((e): e is [string, string] => e[0].startsWith('VITE_') && e[1] !== undefined),
  );
}

const config = {
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
};

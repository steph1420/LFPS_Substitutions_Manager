#!/usr/bin/env node
/**
 * Build the web app for LOCAL browser tests (Bundle 35a relay safety check).
 *
 *   node scripts/build-web-local.mjs [--relay http://127.0.0.1:8080] [--out apps/web/dist-local]
 *
 * 1. Sets VITE_WS_URL / VITE_API_URL explicitly to the local relay and VITE_RELAY_TARGET=local
 *    (vite.config.ts then refuses to build if either is not loopback), in mode "e2e" so
 *    .env.production is not loaded.
 * 2. Asserts the built bundle contains none of the production relay hosts from
 *    apps/web/.env.production and does contain the local relay. Exit 1 otherwise.
 *
 * Serve the output with e.g. `npx vite preview --outDir dist-local --mode e2e` from apps/web.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const web = join(root, 'apps/web');
const arg = (name, fallback) => {
  const i = process.argv.indexOf(name);
  return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};
const relay = new URL(arg('--relay', 'http://127.0.0.1:8080'));
const outDir = resolve(root, arg('--out', 'apps/web/dist-local'));
const api = relay.origin;
const ws = `${relay.protocol === 'https:' ? 'wss' : 'ws'}://${relay.host}`;

function fail(message) {
  console.error(`build-web-local: ${message}`);
  process.exit(1);
}

const LOOPBACK = /^(localhost|127(\.\d{1,3}){3}|\[::1\])$/;
if (!LOOPBACK.test(relay.hostname)) fail('--relay must be a loopback address');

const env = {
  ...process.env,
  VITE_API_URL: api,
  VITE_WS_URL: ws,
  VITE_RELAY_TARGET: 'local',
};
delete env.VITE_ALLOW_PROD_RELAY;

execFileSync('npm', ['run', 'build:libs'], { cwd: root, stdio: 'inherit', env });
execFileSync('npx', ['tsc', '-b'], { cwd: web, stdio: 'inherit', env });
execFileSync('npx', ['vite', 'build', '--mode', 'e2e', '--outDir', outDir, '--emptyOutDir'], {
  cwd: web,
  stdio: 'inherit',
  env,
});

// Assertion: no production relay host anywhere in the output.
const prodHosts = [];
const prodEnv = join(web, '.env.production');
if (existsSync(prodEnv)) {
  for (const line of readFileSync(prodEnv, 'utf8').split(/\r?\n/)) {
    const m = /^\s*VITE_(?:WS|API)_URL\s*=\s*(\S+)/.exec(line);
    if (!m) continue;
    try {
      prodHosts.push(new URL(m[1].replace(/^['"]|['"]$/g, '')).host);
    } catch {
      /* not a URL */
    }
  }
}
const files = [];
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(js|html|css|json|webmanifest)$/.test(name)) files.push(p);
  }
};
walk(outDir);
const text = files.map((f) => readFileSync(f, 'utf8')).join('\n');
const hits = prodHosts.filter((h) => text.includes(h));
if (hits.length) fail(`the bundle contains ${hits.length} production relay host(s); refusing to use it`);
if (!text.includes(ws) || !text.includes(api)) fail('the bundle does not contain the local relay URL');
console.log(`build-web-local: OK — ${outDir} targets ${api} (checked ${prodHosts.length} production hosts)`);

#!/usr/bin/env node
// Single source of truth for the app version: the ROOT package.json "version".
//
//   node scripts/version.mjs check   -> exit 1 if any workspace / server copy drifts
//   node scripts/version.mjs sync    -> rewrite every copy to match the root version
//
// To release a new version: edit "version" in the root package.json, run
// `npm run version:sync`, then `npm install` (refreshes package-lock.json).
// The web app reads the root version at build time via a Vite `define`
// (apps/web/vite.config.ts), so the footer/header never need manual edits.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const mode = process.argv[2] ?? 'check';
const rootVersion = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version;

const workspaceManifests = ['packages/ui/package.json', 'packages/core/package.json', 'apps/web/package.json'];
const goVersionFile = 'apps/server/internal/version/version.go';
const goVersionPattern = /const Version = "([^"]*)"/;

const drift = [];

for (const rel of workspaceManifests) {
  const path = join(root, rel);
  const text = readFileSync(path, 'utf8');
  const pkg = JSON.parse(text);
  if (pkg.version !== rootVersion) {
    drift.push(`${rel}: ${pkg.version}`);
    if (mode === 'sync') {
      pkg.version = rootVersion;
      writeFileSync(path, JSON.stringify(pkg, null, 2) + '\n');
    }
  }
}

{
  const path = join(root, goVersionFile);
  const text = readFileSync(path, 'utf8');
  const match = text.match(goVersionPattern);
  if (!match) {
    console.error(`[version] ${goVersionFile}: could not find 'const Version = "..."'`);
    process.exit(1);
  }
  if (match[1] !== rootVersion) {
    drift.push(`${goVersionFile}: ${match[1]}`);
    if (mode === 'sync') {
      writeFileSync(path, text.replace(goVersionPattern, `const Version = "${rootVersion}"`));
    }
  }
}

if (mode === 'sync') {
  console.log(drift.length ? `[version] synced to ${rootVersion}: ${drift.join(', ')}` : `[version] all copies already at ${rootVersion}`);
  if (drift.length) console.log('[version] now run `npm install` to refresh package-lock.json');
} else if (drift.length) {
  console.error(`[version] drift from root ${rootVersion}:\n  ${drift.join('\n  ')}\nRun: npm run version:sync`);
  process.exit(1);
} else {
  console.log(`[version] ${rootVersion} (root, workspaces and server agree)`);
}

#!/usr/bin/env node
// agent-common/checks: exact pins plus a committed lockfile (06 rule 11). No ^, ~, *, x, ranges, "latest" or git URLs.
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const bad = [];
for (const field of ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies']) {
  for (const [name, spec] of Object.entries(pkg[field] ?? {})) {
    if (field === 'peerDependencies') continue; // peers describe compatibility, not installs
    if (!/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(spec)) bad.push(`${field}: ${name}@${spec}`);
  }
}
const lockTracked = existsSync('package-lock.json') &&
  execFileSync('git', ['ls-files', 'package-lock.json'], { encoding: 'utf8' }).trim() === 'package-lock.json';
if (!lockTracked) bad.push('package-lock.json missing or not committed');
if (bad.length) { console.log('pins: not exact:'); for (const b of bad) console.log(`  ${b}`); process.exit(1); }
console.log('pins: every dependency is an exact version and package-lock.json is committed.');

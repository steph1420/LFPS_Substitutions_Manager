#!/usr/bin/env node
// agent-common/checks: build output is never tracked (06 rule 11). Fails if git tracks dist/, build/, out/ or coverage/.
// Locked archives are exempt (Steve go 2026-11-16 12:04 IST): handover assets and kit package builds are kept byte for byte.
// An app can add its own locked paths, one regex per line, in .build-output-archive at its root.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
const DIRS = ['dist', 'build', 'out', 'coverage', '.vite'];
const ARCHIVE = [/^handovers\/[^/]+\/assets\//, /^design-options\/[^/]+\/packages\/[^/]+\/dist\//];
if (existsSync('.build-output-archive')) {
  for (const line of readFileSync('.build-output-archive', 'utf8').split('\n').map((l) => l.trim()))
    if (line && !line.startsWith('#')) ARCHIVE.push(new RegExp(line));
}
const tracked = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean)
  .filter((f) => f.split('/').some((part) => DIRS.includes(part)) && !f.startsWith('node_modules/'))
  .filter((f) => !ARCHIVE.some((re) => re.test(f)));
if (tracked.length) {
  console.log(`build-output: ${tracked.length} tracked build file(s). Untrack with "git rm -r --cached <dir>" and add the dir to .gitignore:`);
  for (const f of tracked.slice(0, 20)) console.log(`  ${f}`);
  process.exit(1);
}
console.log('build-output: no build output tracked.');

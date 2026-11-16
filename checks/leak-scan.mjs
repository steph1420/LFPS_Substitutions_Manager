#!/usr/bin/env node
// agent-common/checks: leak scan (06 rule 13). Node only, no dependencies. Run before every push and in CI.
// Scans every git-tracked text file. Exit 1 on any finding. Prints file:line and the rule, never the secret itself.
// Optional real-names list: set LEAK_NAMES_FILE to a file OUTSIDE the repo (one name per line). Never commit it.
import { execFileSync } from 'node:child_process';
import { readFileSync, statSync, existsSync } from 'node:fs';
import { resolve, sep, basename } from 'node:path';

const RULES = [
  ['github token', /\b(ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{36}\b/],
  ['github fine-grained token', /\bgithub_pat_[A-Za-z0-9_]{60,}\b/],
  ['aws access key', /\b(AKIA|ASIA)[A-Z0-9]{16}\b/],
  ['private key', /-----BEGIN (RSA |EC |DSA |OPENSSH |PGP |ENCRYPTED )?PRIVATE KEY( BLOCK)?-----/],
  ['google api key', /\bAIza[0-9A-Za-z_-]{35}\b/],
  ['slack token', /\bxox[abpors]-[A-Za-z0-9-]{10,}\b/],
  ['openai-style key', /\bsk-(proj-|live-|test-)?[A-Za-z0-9_-]{32,}\b/],
  ['jwt', /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/],
  ['google sheet url', /docs\.google\.com\/spreadsheets\/d\/[A-Za-z0-9_-]{25,}/],
  ['google sheet id', /\b(sheet|spreadsheet)_?id\b["']?\s*[:=]\s*["'][A-Za-z0-9_-]{30,}["']/i],
  ['secret assignment', /\b(api[_-]?key|secret|token|passw(or)?d|client[_-]?secret|auth)\b["']?\s*[:=]\s*["'][A-Za-z0-9+/_.=-]{24,}["']/i],
];
// Long random-looking strings (40+ chars between slashes/quotes, mixed case, 4+ digits, few separators). Skipped in lockfiles, whose integrity hashes look like this.
const LONG_KEY = /(?<![A-Za-z0-9+_-])[A-Za-z0-9+_-]{40,}={0,2}(?![A-Za-z0-9+_-])/g;
const LOCKFILES = new Set(['package-lock.json', 'pnpm-lock.yaml', 'yarn.lock', 'npm-shrinkwrap.json']);
const BINARY = /\.(png|jpe?g|gif|webp|ico|pdf|zip|gz|woff2?|ttf|otf|mp4|webm|mov|wasm)$/i;
const count = (s, re) => (s.match(re) ?? []).length;
const looksRandom = (s) => /[a-z]/.test(s) && /[A-Z]/.test(s) && count(s, /\d/g) >= 4 && count(s, /[_-]/g) <= 4 && new Set(s).size >= 16;

const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
const files = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean);

function loadNames() {
  const p = process.env.LEAK_NAMES_FILE;
  if (!p) return [];
  const abs = resolve(p);
  if (abs === root || abs.startsWith(root + sep)) { console.error(`leak-scan: LEAK_NAMES_FILE must live OUTSIDE the repo (${abs}).`); process.exit(2); }
  if (!existsSync(abs)) { console.error(`leak-scan: LEAK_NAMES_FILE not found: ${abs}`); process.exit(2); }
  return readFileSync(abs, 'utf8').split('\n').map((s) => s.trim()).filter((s) => s && !s.startsWith('#'))
    .map((n) => new RegExp(`\\b${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i'));
}
const names = loadNames();

let findings = 0;
const report = (file, line, rule) => { findings++; console.log(`LEAK ${file}:${line}  ${rule}`); };
for (const file of files) {
  const abs = resolve(root, file);
  if (BINARY.test(file) || !existsSync(abs) || statSync(abs).size > 2_000_000) continue;
  const lines = readFileSync(abs, 'utf8').split('\n');
  const lock = LOCKFILES.has(basename(file));
  lines.forEach((text, i) => {
    for (const [rule, re] of RULES) if (re.test(text)) report(file, i + 1, rule);
    if (!lock) for (const m of text.matchAll(LONG_KEY)) if (looksRandom(m[0])) { report(file, i + 1, 'long random key'); break; }
    if (names.some((re) => re.test(text))) report(file, i + 1, 'name from LEAK_NAMES_FILE');
  });
}
console.log(findings ? `leak-scan: ${findings} finding(s) in ${files.length} files. Remove them before pushing.` : `leak-scan: clean (${files.length} files${names.length ? `, ${names.length} names` : ''}).`);
process.exit(findings ? 1 : 0);

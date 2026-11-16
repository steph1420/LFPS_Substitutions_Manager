#!/usr/bin/env node
// agent-common/checks: warn-mode baseline for existing apps (06 Rollout). Works with ESLint and stylelint JSON reports.
// Counts violations per file + rule. Fails only if a file/rule count goes UP versus the saved baseline (a new violation).
// Usage:
//   npx eslint . -f json -o .checks/eslint.json || true
//   node checks/baseline.mjs .checks/eslint.json checks-baseline/eslint.json            # compare (CI)
//   node checks/baseline.mjs .checks/eslint.json checks-baseline/eslint.json --update   # save after fixing (baseline may only shrink)
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, relative } from 'node:path';
const [reportPath, basePath, flag] = process.argv.slice(2);
if (!reportPath || !basePath) { console.error('usage: baseline.mjs <report.json> <baseline.json> [--update]'); process.exit(2); }
const report = JSON.parse(readFileSync(reportPath, 'utf8'));
const counts = {};
for (const r of report) {
  const file = relative(process.cwd(), r.filePath ?? r.source ?? '');
  for (const m of r.messages ?? r.warnings ?? []) {
    const key = `${file} :: ${m.ruleId ?? m.rule ?? 'parse'}`;
    counts[key] = (counts[key] ?? 0) + 1;
  }
}
const total = (o) => Object.values(o).reduce((a, b) => a + b, 0);
const base = existsSync(basePath) ? JSON.parse(readFileSync(basePath, 'utf8')) : {};
if (flag === '--update') {
  if (existsSync(basePath) && total(counts) > total(base)) { console.error(`baseline: refusing to grow the baseline (${total(base)} -> ${total(counts)}).`); process.exit(1); }
  mkdirSync(dirname(basePath), { recursive: true });
  writeFileSync(basePath, JSON.stringify(Object.fromEntries(Object.entries(counts).sort()), null, 2) + '\n');
  console.log(`baseline: saved ${total(counts)} known violation(s) to ${basePath}.`); process.exit(0);
}
const grew = Object.entries(counts).filter(([k, n]) => n > (base[k] ?? 0));
for (const [k, n] of grew) console.log(`NEW ${k}  (${base[k] ?? 0} -> ${n})`);
console.log(`baseline: ${total(counts)} now vs ${total(base)} saved. ${grew.length ? 'New violations: fix them.' : 'No new violations.'}`);
if (!grew.length && total(counts) < total(base)) console.log('baseline: it shrank. Run with --update to lock in the improvement.');
process.exit(grew.length ? 1 : 0);

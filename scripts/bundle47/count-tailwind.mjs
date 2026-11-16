#!/usr/bin/env node
/**
 * Bundle 47: how much Tailwind is left. For every .tsx under apps/web/src, counts
 *  - className attributes that still carry at least one Tailwind class in a literal, and
 *  - Tailwind class tokens inside className literals.
 *   node scripts/bundle47/count-tailwind.mjs [--files]
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { createRequire } from 'node:module';
const root = resolve(import.meta.dirname, '../..');
const web = join(root, 'apps/web');
const req = createRequire(join(web, 'noop.js'));
const ts = req('typescript');
const { __unstable__loadDesignSystem } = await import(req.resolve('@tailwindcss/node'));
const ds = await __unstable__loadDesignSystem('@import "tailwindcss";', { base: join(web, 'src') });
// LFPS's own global classes in index.css (e.g. .scrollbar-thin) are not Tailwind, even when
// Tailwind happens to know the same name.
const postcss = req('postcss');
const own = new Set();
postcss.parse(readFileSync(join(web, 'src/index.css'), 'utf8')).walkRules((r) => r.selectors.forEach((sel) => {
  const m = /^\.(-?[A-Za-z_][A-Za-z0-9_-]*)/.exec(sel.trim());
  if (m) own.add(m[1]);
}));
const cache = new Map();
const isTw = (t) => { if (own.has(t)) return false; if (!cache.has(t)) cache.set(t, !!ds.candidatesToCss([t])[0]); return cache.get(t); };
const files = [];
(function walk(d) { for (const n of readdirSync(d)) { const p = join(d, n); if (statSync(p).isDirectory()) walk(p); else if (n.endsWith('.tsx')) files.push(p); } })(join(web, 'src'));
let attrs = 0, attrsTw = 0, tokens = 0;
const per = [];
for (const f of files.sort()) {
  const sf = ts.createSourceFile(f, readFileSync(f, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let a = 0, at = 0, tk = 0;
  const lits = (n, out) => {
    if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) out.push(n.text);
    else if (ts.isTemplateExpression(n)) { out.push(n.head.text, ...n.templateSpans.map((s) => s.literal.text)); }
    ts.forEachChild(n, (c) => lits(c, out));
  };
  (function visit(n) {
    if (ts.isJsxAttribute(n) && n.name.getText(sf) === 'className' && n.initializer) {
      a++;
      const out = []; lits(n.initializer, out);
      const tw = out.flatMap((s) => s.split(/\s+/)).filter((t) => t && isTw(t));
      if (tw.length) at++;
      tk += tw.length;
    }
    ts.forEachChild(n, visit);
  })(sf);
  attrs += a; attrsTw += at; tokens += tk;
  per.push([relative(web, f), a, at, tk]);
}
if (process.argv.includes('--files')) for (const [f, a, at, tk] of per) console.log(`${f}\tclassName=${a}\twithTailwind=${at}\ttailwindTokens=${tk}`);
console.log(`TOTAL className=${attrs} withTailwind=${attrsTw} tailwindTokens=${tokens} files=${files.length}`);

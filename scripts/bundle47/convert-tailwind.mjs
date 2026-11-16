#!/usr/bin/env node
/**
 * Bundle 47 (ADR-0001, agent-common): move one component from Tailwind classes to a CSS Module
 * on the shared tokens, with NO visual change.
 *
 *   node scripts/bundle47/convert-tailwind.mjs [--dry] apps/web/src/components/Foo.tsx ...
 *
 * How it keeps the look identical:
 *  - Every Tailwind class in a className literal is compiled by the installed Tailwind (same
 *    version as the live build), in Tailwind's own order, then each selector is renamed to the
 *    CSS Module class of the literal(s) that used it. Same declarations, same cascade order,
 *    same specificity, same `utilities` cascade layer.
 *  - index.css day-theme rules that matched Tailwind class names (.text-white, .text-slate-500,
 *    .border-slate-800, [class*="bg-rose-950"] …) are re-emitted for the module classes with the
 *    same selector shape and order (unlayered, so they still beat the element's own rules).
 *  - Raw literals (hex, rgb(), px) become tokens in src/tokens/tokens.css (`--lit-*`), so module
 *    files carry no raw values (06 rule 3; stylelint). Media-query px become rem (exact).
 *  - @property registrations, the old-browser fallback and @keyframes go to src/tokens/properties.css.
 * Anything it cannot convert exactly (dynamic class names glued to ${}, unknown parents for
 * group-/peer- variants, Tailwind strings outside className) is listed and left untouched.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { createRequire } from 'node:module';

const root = resolve(import.meta.dirname, '../..');
const web = join(root, 'apps/web');
const req = createRequire(join(web, 'noop.js'));
const ts = req('typescript');
const postcss = req('postcss');
const { compile, optimize, __unstable__loadDesignSystem } = await import(req.resolve('@tailwindcss/node'));

const args = process.argv.slice(2);
const dry = args.includes('--dry');
const files = args.filter((a) => !a.startsWith('--')).map((f) => resolve(f));

const TOKENS = join(web, 'src/tokens/tokens.css');
const PROPS = join(web, 'src/tokens/properties.css');
// Detection uses the design system (stateless); each file gets a fresh compiler because
// compiler.build() accumulates every candidate it has ever seen.
const ds = await __unstable__loadDesignSystem('@import "tailwindcss";', { base: join(web, 'src') });
const freshCompiler = () => compile('@import "tailwindcss";', { base: join(web, 'src'), onDependency() {} });

// ---------- class classification ----------
const indexCss = readFileSync(join(web, 'src/index.css'), 'utf8');
const globalClasses = new Set([...indexCss.matchAll(/\.(-?[A-Za-z_][A-Za-z0-9_-]*)/g)].map((m) => m[1]));
// Classes index.css defines itself (first compound of a selector, e.g. `.scrollbar-thin {`):
// these stay on the element as global classes even when Tailwind also knows the name.
const definedGlobals = new Set();
postcss.parse(indexCss).walkRules((r) => r.selectors.forEach((sel) => {
  const m = /^\.(-?[A-Za-z_][A-Za-z0-9_-]*)/.exec(sel.trim());
  if (m) definedGlobals.add(m[1]);
}));
const MARKERS = /^(group|peer)(\/[A-Za-z0-9_-]+)?$/;
const twCache = new Map();
function isTailwind(tok) {
  if (MARKERS.test(tok)) return true;
  if (!twCache.has(tok)) twCache.set(tok, !!ds.candidatesToCss([tok])[0]);
  return twCache.get(tok);
}

// ---------- literal tokens (hoisted raw values) ----------
const litTokens = new Map(); // value -> name
const existingTokens = existsSync(TOKENS) ? readFileSync(TOKENS, 'utf8') : '';
for (const m of existingTokens.matchAll(/(--lit-[A-Za-z0-9_-]+):\s*([^;]+);/g)) litTokens.set(m[2].trim(), m[1]);
function litName(value) {
  if (litTokens.has(value)) return litTokens.get(value);
  let base;
  if (value === '3.40282e38px') base = '--lit-radius-pill';
  else if (/^-?[\d.]+px$/.test(value)) base = `--lit-px-${value.replace('px', '').replace('-', 'neg').replace('.', '_')}`;
  else if (value.startsWith('#')) base = `--lit-hex-${value.slice(1).toLowerCase()}`;
  else base = `--lit-c-${value.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase()}`;
  let name = base, i = 2;
  while ([...litTokens.values()].includes(name)) name = `${base}-${i++}`;
  litTokens.set(value, name);
  return name;
}
const COLOR_FN = /\b(rgba?|hsla?|hwb|lab|lch|oklab|oklch)\(/g;
function hoistValue(v) {
  // color functions (balanced parens) first
  let out = '', i = 0;
  COLOR_FN.lastIndex = 0;
  let m;
  while ((m = COLOR_FN.exec(v))) {
    let depth = 0, j = m.index + m[0].length - 1;
    for (; j < v.length; j++) { if (v[j] === '(') depth++; else if (v[j] === ')' && --depth === 0) break; }
    const lit = v.slice(m.index, j + 1);
    out += v.slice(i, m.index) + `var(${litName(lit)})`;
    i = j + 1;
    COLOR_FN.lastIndex = i;
  }
  out += v.slice(i);
  out = out.replace(/#[0-9a-fA-F]{3,8}\b/g, (h) => `var(${litName(h.toLowerCase())})`);
  out = out.replace(/(^|[\s,(*/+-])(-?\d*\.?\d+(?:e[+-]?\d+)?px)\b/g, (_, pre, px) => `${pre}var(${litName(px)})`);
  return out;
}
const pxToRem = (p) => p.replace(/(-?\d*\.?\d+)px\b/g, (_, n) => `${+(n / 16).toFixed(6)}rem`);

// ---------- compat (properties / keyframes) ----------
const propsExisting = existsSync(PROPS) ? readFileSync(PROPS, 'utf8') : '';
const propRules = new Map(); // name -> css text
const fallbackDecls = new Map(); // --tw-x -> value
const keyframes = new Map();
{
  const r = postcss.parse(propsExisting);
  r.walkAtRules('property', (a) => propRules.set(a.params, a.toString()));
  r.walkAtRules('keyframes', (a) => keyframes.set(a.params, a.toString()));
  r.walkDecls((d) => { if (d.parent?.selector?.startsWith('*')) fallbackDecls.set(d.prop, d.value); });
}

// ---------- TSX scanning ----------
function unescapeClass(sel, start) {
  let out = '', i = start;
  while (i < sel.length) {
    const ch = sel[i];
    if (ch === '\\') { out += sel[i + 1]; i += 2; continue; }
    if (/[A-Za-z0-9_-]/.test(ch)) { out += ch; i++; continue; }
    break;
  }
  return { cls: out, end: i };
}

async function convertFile(file) {
  const src = readFileSync(file, 'utf8');
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const report = { file: relative(root, file), elements: 0, frags: 0, issues: [], notes: new Set(), dropped: new Set(), kept: new Set(), leftovers: [] };
  const elements = []; // { name, frags: [{node,start,end,text,kind,tw:[],keep:[]}] }
  const usedNames = new Map();
  const claimed = new Set();

  function tagName(attr) {
    const el = attr.parent.parent; // JsxAttributes -> element
    const testId = el.attributes.properties.find((p) => p.name?.getText() === 'data-testid' && p.initializer && ts.isStringLiteral(p.initializer));
    let base = testId ? testId.initializer.text : el.tagName.getText();
    base = base.replace(/^motion\./, 'motion-').replace(/[^A-Za-z0-9]+(.)/g, (_, c) => c.toUpperCase()).replace(/[^A-Za-z0-9]/g, '');
    base = base[0].toLowerCase() + base.slice(1);
    const n = (usedNames.get(base) ?? 0) + 1;
    usedNames.set(base, n);
    return `${base}${n}`;
  }

  function addFrag(list, text, start, end, kind) {
    const toks = text.split(/\s+/).filter(Boolean);
    const tw = [], keep = [];
    for (const t of toks) {
      // Dead names: Tailwind-shaped but generate no CSS and index.css has no rule for them
      // (e.g. py-0.2, hover:text-ink). Dropping them changes nothing on screen.
      if (!isTailwind(t) && !globalClasses.has(t) && (t.includes(':') || /^-?[a-z]+(-[a-z]+)*-[\d.]+$/.test(t))) { report.dropped.add(t); continue; }
      if (isTailwind(t)) tw.push(t);
      if (!isTailwind(t) || definedGlobals.has(t)) { keep.push(t); report.kept.add(t); }
      if (isTailwind(t) && globalClasses.has(t) && !definedGlobals.has(t) && !['text-white', 'text-slate-500', 'text-slate-400', 'border-slate-800', 'border-slate-700'].includes(t)) report.notes.add(`${t} is also named in an index.css context rule`);
      if (t.startsWith('!') || t.endsWith('!')) report.issues.push(`important modifier ${t}`);
    }
    list.push({ text, start, end, kind, tw, keep });
  }
  function twGenerates(t) { return !MARKERS.test(t) && isTailwind(t); }

  function walkExpr(e, list) {
    if (!e) return;
    if (ts.isStringLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e)) {
      claimed.add(e.pos);
      addFrag(list, e.text, e.getStart(sf), e.end, 'literal');
    } else if (ts.isTemplateExpression(e)) {
      claimed.add(e.pos);
      const parts = [e.head, ...e.templateSpans.map((s) => s.literal)];
      parts.forEach((p, idx) => {
        const raw = p.rawText ?? p.text;
        const startOff = p.getStart(sf) + (idx === 0 ? 1 : 1); // skip ` or }
        const endOff = p.end - (ts.isTemplateTail(p) ? 1 : 2); // skip ` or ${
        if (idx > 0 && raw.length && !/^\s/.test(raw)) report.issues.push(`glued class after \${} near "${raw.slice(0, 20)}"`);
        if (idx < parts.length - 1 && raw.length && !/\s$/.test(raw)) report.issues.push(`glued class before \${} near "${raw.slice(-20)}"`);
        if (raw.trim()) addFrag(list, raw, startOff, endOff, 'template-part');
      });
      e.templateSpans.forEach((s) => walkExpr(s.expression, list));
    } else if (ts.isConditionalExpression(e)) { walkExpr(e.whenTrue, list); walkExpr(e.whenFalse, list); }
    else if (ts.isBinaryExpression(e)) { if (e.operatorToken.kind !== ts.SyntaxKind.AmpersandAmpersandToken) walkExpr(e.left, list); walkExpr(e.right, list); }
    else if (ts.isParenthesizedExpression(e)) walkExpr(e.expression, list);
    else if (ts.isArrayLiteralExpression(e)) e.elements.forEach((x) => walkExpr(x, list));
    else if (ts.isCallExpression(e)) { walkExpr(e.expression, list); e.arguments.forEach((x) => walkExpr(x, list)); }
    else if (ts.isPropertyAccessExpression(e)) walkExpr(e.expression, list);
    else if (ts.isIdentifier(e) || ts.isElementAccessExpression(e)) report.issues.push(`className uses a variable (${e.getText(sf).slice(0, 40)}) — its strings are converted only if literal here`);
  }

  function visit(n) {
    if (ts.isJsxAttribute(n) && n.name.getText(sf) === 'className' && n.initializer) {
      const list = [];
      const init = n.initializer;
      if (ts.isStringLiteral(init)) { claimed.add(init.pos); addFrag(list, init.text, init.getStart(sf), init.end, 'attr'); }
      else if (ts.isJsxExpression(init)) walkExpr(init.expression, list);
      if (list.some((f) => f.tw.length)) elements.push({ name: tagName(n), frags: list });
      return;
    }
    ts.forEachChild(n, visit);
  }
  visit(sf);

  // leftovers: Tailwind-looking string literals outside className attributes
  (function scan(n) {
    if ((ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) && !claimed.has(n.pos)) {
      const toks = n.text.split(/\s+/).filter(Boolean);
      if (toks.length >= 2 && toks.every((t) => isTailwind(t) || globalClasses.has(t)) && toks.some((t) => twGenerates(t))) {
        const { line } = sf.getLineAndCharacterOfPosition(n.getStart(sf));
        report.leftovers.push(`L${line + 1}: "${n.text.slice(0, 60)}"`);
      }
    }
    ts.forEachChild(n, scan);
  })(sf);

  // name fragments
  const fragOf = new Map(); // tw candidate -> [names]
  const markerOf = new Map();
  for (const el of elements) {
    report.elements++;
    const twFrags = el.frags.filter((f) => f.tw.length);
    twFrags.forEach((f, i) => {
      f.name = twFrags.length === 1 ? el.name : `${el.name}${String.fromCharCode(65 + i)}`;
      report.frags++;
      for (const c of f.tw) {
        const map = MARKERS.test(c) ? markerOf : fragOf;
        if (!map.has(c)) map.set(c, []);
        if (!map.get(c).includes(f.name)) map.get(c).push(f.name);
      }
    });
  }
  if (!elements.length) return { report, changed: false };

  // compile
  const cands = [...fragOf.keys()];
  const compiler = await freshCompiler();
  const built = optimize(compiler.build(cands), { minify: false }).code;
  const tree = postcss.parse(built);
  const out = postcss.root();
  const layer = postcss.atRule({ name: 'layer', params: 'utilities' });
  tree.each((node) => {
    if (node.type === 'atrule' && node.name === 'layer' && node.params === 'utilities') {
      node.each((c) => layer.append(c.clone()));
    } else if (node.type === 'atrule' && node.name === 'property') propRules.set(node.params, node.toString());
    else if (node.type === 'atrule' && node.name === 'keyframes') keyframes.set(node.params, node.toString());
    else if (node.type === 'atrule' && node.name === 'layer' && node.params === 'properties') node.walkDecls((d) => fallbackDecls.set(d.prop, d.value));
  });
  layer.walkAtRules('keyframes', (a) => { keyframes.set(a.params, a.toString()); a.remove(); });
  const markerSel = (marker) => {
    const names = markerOf.get(marker);
    if (!names) { report.issues.push(`variant needs a "${marker}" parent that is not in this file`); return null; }
    return names.map((x) => `.${x}`).join(', ');
  };
  layer.walkRules((rule) => {
    if (rule.parent?.type === 'atrule' && rule.parent.name === 'keyframes') return;
    const sels = [];
    for (const s of rule.selectors) {
      let at = -1, cls, end;
      for (let k = s.indexOf('.'); k !== -1; k = s.indexOf('.', k + 1)) {
        if (s[k - 1] === '\\') continue;
        const u = unescapeClass(s, k + 1);
        if (fragOf.has(u.cls)) { at = k; cls = u.cls; end = u.end; break; }
      }
      if (at < 0) { report.issues.push(`no fragment for selector ${s}`); continue; }
      const names = fragOf.get(cls);
      const pre = s.slice(0, at);
      let rest = s.slice(end);
      rest = rest.replace(/:where\(\.(group|peer)((?:\\\/[A-Za-z0-9_-]+)?)\)/g, (all, kind, named) => {
        const sel = markerSel(kind + named.replace(/\\/g, ''));
        return sel ? `:where(${sel})` : all;
      });
      for (const nm of names) sels.push(`${pre}.${nm}${rest}`);
    }
    rule.selectors = sels;
  });
  layer.walkDecls((d) => { d.value = hoistValue(d.value); });
  // Merge rules with the same selector inside one context, so each class reads as one block.
  // A move is allowed only when no rule in between could hit the same element with the same
  // property (fragments of one element are the only classes that ever meet on a node).
  const elementOfName = new Map();
  for (const el of elements) for (const f of el.frags) if (f.name) elementOfName.set(f.name, el.name);
  const namesIn = (sel) => new Set([...sel.matchAll(/\.([A-Za-z][A-Za-z0-9]*)/g)].map((m) => elementOfName.get(m[1])).filter(Boolean));
  const containers = [layer];
  layer.walkAtRules((a) => containers.push(a));
  for (const c of containers) {
    const rules = (c.nodes ?? []).filter((n) => n.type === 'rule');
    for (let i = 0; i < rules.length; i++) {
      const r = rules[i];
      if (!r.parent) continue;
      const j = rules.findIndex((x, idx) => idx < i && x.parent && x.selector === r.selector);
      if (j < 0) continue;
      const els = namesIn(r.selector);
      const props = new Set(r.nodes.filter((d) => d.type === 'decl').map((d) => d.prop));
      const blocked = rules.slice(j + 1, i).some((k) => k.parent && [...namesIn(k.selector)].some((e) => els.has(e)) &&
        k.nodes.some((d) => d.type === 'decl' && props.has(d.prop)));
      // also respect nested at-rules between j and i (media/supports blocks)
      const between = c.nodes.slice(c.nodes.indexOf(rules[j]) + 1, c.nodes.indexOf(r));
      const blockedAt = between.some((n) => n.type === 'atrule' && (() => { let hit = false; n.walkRules((k) => { if ([...namesIn(k.selector)].some((e) => els.has(e)) && k.nodes.some((d) => d.type === 'decl' && props.has(d.prop))) hit = true; }); return hit; })());
      if (blocked || blockedAt) continue;
      r.nodes.forEach((d) => rules[j].append(d.clone()));
      r.remove();
    }
  }
  layer.walkAtRules('media', (a) => { a.params = pxToRem(a.params); });
  out.append(layer);

  // day-theme rules from index.css, same shapes and order (see header)
  const T1 = ['light', 'warm-sepia'];
  const T2 = ['utopian-glass', 'aero-frost', 'high-contrast'];
  const T5 = [...T1, ...T2];
  const th = (t) => `:global([data-theme="${t}"])`;
  const allFrags = elements.flatMap((el) => el.frags.filter((f) => f.name).map((f) => ({ ...f, el })));
  const has = (f, ...cls) => cls.some((c) => f.tw.includes(c));
  const rules = [];
  const add = (themes, sel, decl, media) => rules.push({ sels: themes.map((t) => `${th(t)} ${sel}`), decl, media });
  const muted = allFrags.filter((f) => has(f, 'text-slate-500', 'text-slate-400'));
  const bord = allFrags.filter((f) => has(f, 'border-slate-800', 'border-slate-700'));
  muted.forEach((f) => add(T1, `.${f.name}`, 'color: var(--text-secondary)'));
  bord.forEach((f) => add(T1, `.${f.name}`, 'border-color: var(--border-color)'));
  const white = allFrags.filter((f) => has(f, 'text-white'));
  const accentRe = /bg-(blue|rose|emerald|amber|indigo|purple|gradient)-/;
  const pairs = [];
  for (const x of white) for (const el of [x.el]) for (const y of el.frags) {
    if (!accentRe.test(y.text)) continue;
    if (!y.name) { report.issues.push(`accent class in a non-module fragment next to text-white`); continue; }
    pairs.push(x.name === y.name ? `.${x.name}.${x.name}` : `.${x.name}.${y.name}`);
  }
  white.forEach((f) => add(T5, `.${f.name}:not(:global(.text-on-accent))`, 'color: var(--text-primary)'));
  white.forEach((f) => add(['system'], `.${f.name}:not(:global(.text-on-accent))`, 'color: var(--text-primary)', '(prefers-color-scheme: light)'));
  pairs.forEach((p) => add(['system'], p, 'color: var(--on-accent)', '(prefers-color-scheme: light)'));
  pairs.forEach((p) => add(T5, p, 'color: var(--on-accent)'));
  for (const [tone, v] of [['rose', 'danger'], ['amber', 'amber'], ['purple', 'purple']]) {
    allFrags.filter((f) => f.text.includes(`bg-${tone}-950`)).forEach((f) => add(T5, `.${f.name}`, `background-color: var(--${v}-soft-bg)`));
  }
  muted.forEach((f) => add(T2, `.${f.name}`, 'color: var(--text-secondary)'));
  bord.forEach((f) => add(T2, `.${f.name}`, 'border-color: var(--border-color)'));
  // global important colour classes would now beat these rules: flag them
  for (const el of elements) {
    const keepAll = el.frags.flatMap((f) => f.keep);
    if (el.frags.some((f) => has(f, 'text-white', 'text-slate-500', 'text-slate-400')) && keepAll.some((k) => /^(text-ink|text-muted|chip-|status-)/.test(k)))
      report.issues.push(`${el.name}: theme text rule meets an !important global class (${keepAll.join(' ')})`);
    for (const f of el.frags) if (f.keep.some((k) => /^(text|bg|border)-(white|slate|rose|amber|blue|emerald|purple|indigo)/.test(k))) report.issues.push(`${el.name}: kept class looks like Tailwind: ${f.keep.join(' ')}`);
  }
  for (const r of rules) {
    const rule = postcss.rule({ selectors: r.sels });
    const [prop, ...val] = r.decl.split(':');
    rule.append({ prop: prop.trim(), value: val.join(':').trim() });
    if (r.media) { const m = postcss.atRule({ name: 'media', params: r.media }); m.append(rule); out.append(m); } else out.append(rule);
  }

  const cssName = basename(file).replace(/\.tsx$/, '.module.css');
  const cssText = `/* ${basename(file)} styles (Bundle 47a: moved from Tailwind, no visual change). Values come from src/tokens/. */\n` + out.toString().trim() + '\n';

  // TSX edits (back to front)
  const edits = [];
  for (const el of elements) for (const f of el.frags) {
    if (!f.name) continue;
    const keep = f.keep.join(' ');
    if (f.kind === 'attr') edits.push([f.start, f.end, keep ? `{\`\${styles.${f.name}} ${keep}\`}` : `{styles.${f.name}}`]);
    else if (f.kind === 'literal') edits.push([f.start, f.end, keep ? `\`\${styles.${f.name}} ${keep}\`` : `styles.${f.name}`]);
    else {
      const lead = /^\s/.test(f.text) ? ' ' : '';
      const trail = /\s$/.test(f.text) ? ' ' : '';
      edits.push([f.start, f.end, `${lead}\${styles.${f.name}}${keep ? ' ' + keep : ''}${trail}`]);
    }
  }
  edits.sort((a, b) => b[0] - a[0]);
  let code = src;
  for (const [s, e, t] of edits) code = code.slice(0, s) + t + code.slice(e);
  const lastImport = [...code.matchAll(/^import [^;]+;\s*$/gm)].pop();
  const imp = `import styles from './${cssName}';\n\n`;
  code = lastImport ? code.slice(0, lastImport.index + lastImport[0].length) + '\n' + imp + code.slice(lastImport.index + lastImport[0].length).replace(/^\n/, '') : imp + code;
  if (!dry) {
    writeFileSync(join(dirname(file), cssName), cssText);
    writeFileSync(file, code);
  }
  return { report, changed: true, cssText };
}

const reports = [];
for (const f of files) {
  const { report } = await convertFile(f);
  reports.push(report);
  console.log(`\n== ${report.file}: ${report.elements} elements, ${report.frags} module classes`);
  if (report.issues.length) console.log('  issues:\n   - ' + [...new Set(report.issues)].join('\n   - '));
  if (report.leftovers.length) console.log('  Tailwind strings outside className:\n   - ' + report.leftovers.join('\n   - '));
  if (report.dropped.size) console.log('  dropped dead names: ' + [...report.dropped].join(' '));
  if (report.notes.size) console.log('  notes: ' + [...report.notes].join('; '));
  if (report.kept.size) console.log('  kept as global classes: ' + [...report.kept].join(' '));
}

if (!dry) {
  // tokens: literal section rewritten in place
  const lits = [...litTokens.entries()].sort((a, b) => a[1].localeCompare(b[1])).map(([v, n]) => `    ${n}: ${v};`).join('\n');
  let tokens = readFileSync(TOKENS, 'utf8');
  tokens = tokens.replace(/(\/\* LITERALS:BEGIN[^\n]*\n)[\s\S]*?(\n\s*\/\* LITERALS:END)/, `$1${lits}$2`);
  writeFileSync(TOKENS, tokens);
  const props = [
    '/* Composition properties and keyframes used by the module classes (Bundle 47a).',
    '   Same registrations Tailwind emitted; these stay when Tailwind is removed (47d). */',
    ...[...propRules.values()].sort(),
    `@layer properties {\n  @supports (((-webkit-hyphens: none)) and (not (margin-trim: inline))) or ((-moz-orient: inline) and (not (color: rgb(from red r g b)))) {\n    *, :before, :after, ::backdrop {\n${[...fallbackDecls.entries()].sort().map(([p, v]) => `      ${p}: ${v};`).join('\n')}\n    }\n  }\n}`,
    ...[...keyframes.values()].sort(),
  ].join('\n\n') + '\n';
  writeFileSync(PROPS, props);
}

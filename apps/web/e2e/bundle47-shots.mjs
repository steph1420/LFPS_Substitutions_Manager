#!/usr/bin/env node
/**
 * Bundle 47 (Tailwind → tokens + CSS Modules): before/after screenshots and pixel diff.
 *
 *   node apps/web/e2e/bundle47-shots.mjs shoot <before|after>   # build + capture
 *   node apps/web/e2e/bundle47-shots.mjs diff                   # compare after vs before
 *
 * Codenames only: the screenshot build renames every staff member in the bundled seed to a
 * tree codename (in memory, at build time). The app source is not changed, and the build
 * fails if any real name from the seed is left in the output.
 * Fixed inputs so before/after are comparable: clock 2026-11-04 10:30 IST (Wed), reduced
 * motion, fixed build label, no relay (offline pill), fresh storage per shot.
 * Tools: SHOTS_TOOLS=<dir with playwright, pngjs, pixelmatch> (default /workspace/work/pw);
 * Chrome at CHROME (default /usr/bin/google-chrome).
 */
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../../..');
const web = join(root, 'apps/web');
const shotsDir = join(root, 'docs/bundle47');
const tools = createRequire(join(process.env.SHOTS_TOOLS || '/workspace/work/pw', 'noop.js'));
const [mode, label] = process.argv.slice(2);

const VIEWPORTS = [
  { name: 'phone-portrait', width: 421, height: 926, scale: 3, mobile: true },
  { name: 'phone-landscape', width: 926, height: 421, scale: 3, mobile: true },
  { name: 'desktop', width: 1440, height: 900, scale: 1, mobile: false },
];

// ---- codenames (never written to disk, never printed) ----
const TREES = ['Alder', 'Birch', 'Cedar', 'Elmwood', 'Firth', 'Hazel', 'Juniper', 'Larch', 'Maple', 'Oakley', 'Pine', 'Rowan', 'Spruce', 'Willow'];
const FIRSTS = ['Avery', 'Blair', 'Casey', 'Devon', 'Emery', 'Finley', 'Harper', 'Jordan', 'Kendall', 'Logan', 'Morgan', 'Parker', 'Quinn', 'Riley'];
function codenameMap() {
  const seed = readFileSync(join(root, 'packages/core/src/data/seed.ts'), 'utf8');
  const keys = [...seed.matchAll(/^ {4}"([^"]+)": \{/gm)].map((m) => m[1]);
  const fullNames = [...seed.matchAll(/fullName: "([^"]+)"/g)].map((m) => m[1]);
  const words = new Map();
  for (const k of keys) {
    const s = k.split(' ').pop();
    if (!words.has(s)) words.set(s, TREES[words.size]);
  }
  let f = 0;
  for (const n of fullNames) {
    const parts = n.split(' ');
    for (const p of parts.slice(1, -1)) if (!words.has(p) && p.length > 2 && !p.endsWith('.')) words.set(p, FIRSTS[f++]);
  }
  const ac = /PRIMARY_AC = '([^']+)'/.exec(seed)[1];
  const rename = (s) => s.replace(/[A-Za-z]+/g, (w) => words.get(w) ?? w);
  return { words, rename, ac: rename(ac), staff: keys.map(rename) };
}

async function build(outDir) {
  const { words } = codenameMap();
  const pattern = new RegExp(`\\b(${[...words.keys()].join('|')})\\b`, 'g');
  process.env.VITE_API_URL = 'http://127.0.0.1:18089';
  process.env.VITE_WS_URL = 'ws://127.0.0.1:18089';
  process.env.VITE_RELAY_TARGET = 'local';
  delete process.env.VITE_ALLOW_PROD_RELAY;
  const vite = await import(createRequire(join(web, 'noop.js')).resolve('vite'));
  await vite.build({
    root: web,
    configFile: join(web, 'vite.config.ts'),
    mode: 'e2e',
    logLevel: 'warn',
    build: { outDir, emptyOutDir: true },
    define: {
      __GIT_COMMIT__: JSON.stringify('shots47'),
      __GIT_BRANCH__: JSON.stringify('bundle47-shots'),
      __BUILD_TIME__: JSON.stringify('2026-11-04T05:00:00.000Z'),
    },
    plugins: [
      {
        name: 'bundle47-codenames',
        enforce: 'pre',
        transform(code, id) {
          if (!/(packages\/core\/(dist|src)|apps\/web\/src)\//.test(id)) return null;
          let out = code.replace(pattern, (w) => words.get(w));
          if (/apps\/web\/src\/main\.tsx$/.test(id)) {
            out += "\nimport { useTimetableStore as __shotStore } from './store/useTimetableStore.js';\nwindow['__shotStore'] = __shotStore;\n";
          }
          return out === code ? null : { code: out, map: null };
        },
      },
    ],
  });
  // Leak assertion: no real seed name may survive in the output.
  let leaks = 0;
  const walk = (d) => readdirSync(d).forEach((n) => {
    const p = join(d, n);
    if (statSync(p).isDirectory()) return walk(p);
    if (!/\.(js|css|html)$/.test(n)) return;
    const text = readFileSync(p, 'utf8');
    for (const w of words.keys()) if (new RegExp(`\\b${w}\\b`).test(text)) leaks++;
  });
  walk(outDir);
  if (leaks) throw new Error(`codename leak check failed: ${leaks} real-name hit(s) in the build`);
  console.log('codename leak check: 0 hits');
}

function serve(dir, port) {
  const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.webmanifest': 'application/manifest+json' };
  const server = createServer((req, res) => {
    let p = decodeURIComponent((req.url || '/').split('?')[0]);
    if (p === '/') p = '/index.html';
    const file = join(dir, p.replace(/^\//, ''));
    if (!file.startsWith(dir) || !existsSync(file) || statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream' });
    res.end(readFileSync(file));
  });
  return new Promise((r) => server.listen(port, '127.0.0.1', () => r(server)));
}

// ---- scenarios: each runs on a fresh page ----
const S = (page, fn, arg) => page.evaluate(fn, arg);
const store = {
  admin: (page, ac) => S(page, (ac) => window.__shotStore.setState({ loggedInTeacher: ac, adminIdentity: ac }), ac),
  call: (page, name, ...args) => S(page, ([n, a]) => window.__shotStore.getState()[n](...a), [name, args]),
  tab: (page, t) => S(page, (t) => window.__shotStore.getState().setActiveTab(t), t),
};
async function absences(page, c) {
  await store.call(page, 'toggleAbsence', c.staff[1]);
  await store.call(page, 'toggleAbsence', c.staff[4], { type: 'PERIODS', periods: ['2nd', '3rd'] });
}
const SCENARIOS = [
  ['01-routine-guest', async () => {}],
  ['02-substitutions-guest', async (p) => store.tab(p, 'substitutions')],
  ['03-roster-guest', async (p) => store.tab(p, 'roster')],
  ['04-staff-login', async (p) => store.call(p, 'openStaffLogin')],
  ['05-admin-passcode-step', async (p, c) => {
    await store.call(p, 'openStaffLogin');
    await p.waitForTimeout(400);
    await p.locator(`button[data-identity="${c.ac}"]`).first().click();
  }],
  ['06-routine-admin', async (p, c) => { await store.admin(p, c.ac); await absences(p, c); }],
  ['07-substitutions-admin', async (p, c) => { await store.admin(p, c.ac); await absences(p, c); await store.tab(p, 'substitutions'); }],
  ['08-roster-admin', async (p, c) => { await store.admin(p, c.ac); await absences(p, c); await store.tab(p, 'roster'); }],
  ['09-settings', async (p, c) => { await store.admin(p, c.ac); await store.call(p, 'openSettings'); }],
  ['10-notifications', async (p, c) => { await store.admin(p, c.ac); await store.call(p, 'openNotificationCenter'); }],
  ['11-context-menu', async (p, c) => { await store.admin(p, c.ac); await store.call(p, 'openContextMenu', { x: 120, y: 260, teacher: c.staff[2], period: '1st' }); }],
  ['12-reset-purge-menu', async (p, c) => { await store.admin(p, c.ac); await store.call(p, 'openResetPurgeMenu', { x: 200, y: 120 }); }],
  ['13-sub-availability', async (p, c) => { await store.admin(p, c.ac); await store.call(p, 'openAvailabilityModal', c.staff[3]); }],
  ['14-co-teacher', async (p, c) => { await store.admin(p, c.ac); await store.call(p, 'openCoTeachModal', { period: '1st', teacher: c.staff[5], partnerTeacher: c.staff[6], className: 'KG A', subject: 'ENG. REC.' }); }],
  ['15-officiating-ac', async (p, c) => { await store.admin(p, c.ac); await store.call(p, 'openOfficiatingModal', { type: 'AC' }); }],
  ['16-dispute', async (p, c) => {
    await store.admin(p, c.ac);
    await store.call(p, 'openDisputeModal', { id: 'shot-1', day: 'WED', period: '2nd', originalTeacher: c.staff[1], substituteTeacher: c.staff[3], className: 'KG B', subject: 'ENG. ORAL', status: 'ASSIGNED' });
  }],
  ['17-add-to-home', async (p) => {
    const b = p.locator('button[aria-label="Add to Home Screen"]');
    for (let i = 0; i < await b.count(); i++) if (await b.nth(i).isVisible()) { await b.nth(i).click(); return; }
    const s = p.locator('button[aria-label="Console & Settings"]');
    for (let i = 0; i < await s.count(); i++) if (await s.nth(i).isVisible()) { await s.nth(i).click(); break; }
  }],
  ['18-routine-light', async (p) => { await store.call(p, 'setTheme', 'light').catch(() => S(p, () => document.documentElement.setAttribute('data-theme', 'light'))); }],
  ['19-limbo-tray', async (p, c) => {
    await store.admin(p, c.ac);
    await S(p, ([t]) => {
      const s = window.__shotStore.getState();
      window.__shotStore.setState({ displaced: { ...s.displaced, WED: [{ id: 'shot-limbo-1', task: 'ENG. REC. KG A', ogTeacher: t, period: '1st', day: 'WED', timestamp: 1 }] } });
    }, [c.staff[0]]);
  }],
];

// Theme pass (desktop only, small files): key frame + modal shots in every theme family
// that has its own override rules in index.css, plus the default theme on a dark OS.
const THEME_SCENARIOS = ['04-staff-login', '07-substitutions-admin', '09-settings', '11-context-menu', '13-sub-availability', '16-dispute', '17-add-to-home', '19-limbo-tray'];
const THEMES = [
  { name: 'dark-os', theme: null, scheme: 'dark' },
  { name: 'light', theme: 'light' },
  { name: 'warm-sepia', theme: 'warm-sepia' },
  { name: 'high-contrast', theme: 'high-contrast' },
  { name: 'midnight', theme: 'midnight' },
  { name: 'retro-glass', theme: 'retro-glass' },
  { name: 'utopian-glass', theme: 'utopian-glass' },
];

async function shotOne(browser, vp, name, run, c, dest, file, theme) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: vp.scale, isMobile: vp.mobile, hasTouch: vp.mobile, reducedMotion: 'reduce', timezoneId: 'Asia/Kolkata', locale: 'en-IN', colorScheme: theme?.scheme ?? 'light' });
  const page = await ctx.newPage();
  await page.clock.setFixedTime(new Date('2026-11-04T10:30:00+05:30'));
  await page.goto('http://127.0.0.1:14197/', { waitUntil: 'load', timeout: 30000 });
  await page.waitForFunction(() => !!window.__shotStore, null, { timeout: 15000 });
  if (theme?.theme) await store.call(page, 'setTheme', theme.theme);
  await page.waitForTimeout(700);
  try { await run(page, c); } catch (e) { console.warn(`${file}: step warn ${e.message.split('\n')[0]}`); }
  await page.waitForTimeout(900);
  await page.screenshot({ path: join(dest, file), animations: 'disabled' });
  await ctx.close();
}

async function shoot(which) {
  const c = codenameMap();
  const outDir = `/tmp/lfps-shots-${which}`;
  await build(outDir);
  const server = await serve(outDir, 14197);
  const { chromium } = tools('playwright');
  const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage', '--font-render-hinting=none'] });
  const dest = join(shotsDir, which);
  mkdirSync(dest, { recursive: true });
  const only = process.env.SHOTS_ONLY ? new RegExp(process.env.SHOTS_ONLY) : null;
  try {
    for (const vp of VIEWPORTS) {
      for (const [name, run] of SCENARIOS) {
        if (only && !only.test(name)) continue;
        await shotOne(browser, vp, name, run, c, dest, `${vp.name}--${name}.png`, null);
      }
      console.log(`${which}: ${vp.name} done`);
    }
    const desktop = VIEWPORTS.find((v) => v.name === 'desktop');
    for (const t of THEMES) {
      for (const [name, run] of SCENARIOS) {
        if (!THEME_SCENARIOS.includes(name) || (only && !only.test(name))) continue;
        await shotOne(browser, desktop, name, run, c, dest, `theme-${t.name}--${name}.png`, t);
      }
    }
    console.log(`${which}: theme pass done`);
  } finally {
    await browser.close();
    server.close();
  }
}

function diff() {
  const { PNG } = tools('pngjs');
  const pixelmatch = tools('pixelmatch');
  const b = join(shotsDir, 'before');
  const a = join(shotsDir, 'after');
  const rows = [];
  for (const n of readdirSync(b).filter((x) => x.endsWith('.png')).sort()) {
    if (!existsSync(join(a, n))) { rows.push({ shot: n, diffPixels: 'MISSING', pct: '' }); continue; }
    const x = PNG.sync.read(readFileSync(join(b, n)));
    const y = PNG.sync.read(readFileSync(join(a, n)));
    if (x.width !== y.width || x.height !== y.height) { rows.push({ shot: n, diffPixels: 'SIZE', pct: '' }); continue; }
    const out = new PNG({ width: x.width, height: x.height });
    const d = pixelmatch(x.data, y.data, out.data, x.width, x.height, { threshold: 0, includeAA: true });
    if (d) { mkdirSync(join(shotsDir, 'diff'), { recursive: true }); writeFileSync(join(shotsDir, 'diff', n), PNG.sync.write(out)); }
    // Largest per-channel change (0-255) and pixels changed by more than 16 (a change you could see).
    let maxDelta = 0, visible = 0;
    for (let i = 0; i < x.data.length; i += 4) {
      const m = Math.max(Math.abs(x.data[i] - y.data[i]), Math.abs(x.data[i + 1] - y.data[i + 1]), Math.abs(x.data[i + 2] - y.data[i + 2]));
      if (m > maxDelta) maxDelta = m;
      if (m > 16) visible++;
    }
    rows.push({ shot: n, diffPixels: d, pct: ((100 * d) / (x.width * x.height)).toFixed(4), maxDelta, visible });
  }
  const md = ['| Shot | Diff pixels | % | Max channel delta (0-255) | Pixels with delta > 16 |', '|---|---|---|---|---|', ...rows.map((r) => `| ${r.shot} | ${r.diffPixels} | ${r.pct} | ${r.maxDelta ?? ''} | ${r.visible ?? ''} |`)].join('\n');
  writeFileSync(join(shotsDir, 'DIFF.md'), `# Bundle 47 pixel diff (after vs before, threshold 0)\n\n${md}\n`);
  const bad = rows.filter((r) => r.diffPixels !== 0);
  // Noise floor measured by shooting the same build twice: up to ~250 pixels, max delta 33 on
  // 4 anti-aliased edge pixels (backdrop blur, hairlines). A real styling change moves far more.
  const seen = rows.filter((r) => typeof r.diffPixels !== 'number' || r.visible >= 25);
  console.log(`${rows.length - bad.length}/${rows.length} identical; ${seen.length} with a visible change (25+ pixels changed by more than 16)`);
  bad.forEach((r) => console.log(`DIFF ${r.shot} px=${r.diffPixels} maxDelta=${r.maxDelta} visible=${r.visible}`));
  process.exitCode = seen.length ? 2 : 0;
}

if (mode === 'shoot' && (label === 'before' || label === 'after')) await shoot(label);
else if (mode === 'diff') diff();
else { console.error('usage: shoot <before|after> | diff'); process.exit(1); }

#!/usr/bin/env node
/**
 * Two-browser end-to-end test of sheets mode against a LOCAL relay and a FAKE Sheet
 * (Bundle 35a, FEAT-62 part 3). Never touches Google or the production relay.
 *
 *   npm run e2e:sheets            (from the repo root; needs Go and Playwright's Chromium)
 *
 * Playwright is not a repo dependency: set PLAYWRIGHT_FROM to a directory with
 * `playwright` installed (default: the repo root), e.g. PLAYWRIGHT_FROM=/path/to/pw.
 *
 * Safety (relay guard): the web build comes from scripts/build-web-local.mjs, which pins
 * VITE_WS_URL / VITE_API_URL to 127.0.0.1 and asserts the bundle has no production host;
 * here every browser request to a non-loopback host is aborted and fails the test; the
 * relay starts with Google credentials removed from its environment.
 *
 * Steps: A and B go live → A marks two absences and assigns two subs → B receives them and
 * the fake Sheet's Subs tab has both → B goes offline → A releases one sub (tombstone row) →
 * A goes offline too and the relay is restarted (in-memory state lost) → a fresh browser C,
 * the only device online, gets exactly the surviving sub (so it came from the Sheet) → B comes
 * back with its stale copy and A comes back → all three converge; the released sub never
 * returns; the Sheet data version shows in Settings.
 *
 * E2E_SHOTS=<dir> saves screenshots on failure.
 */
import { spawn, execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../../..');
const web = join(root, 'apps/web');
const RELAY_PORT = 18080;
const WEB_PORT = 14173;
const RELAY = `http://127.0.0.1:${RELAY_PORT}`;
const APP = `http://127.0.0.1:${WEB_PORT}/`;
const work = mkdtempSync(join(tmpdir(), 'lfps-e2e-'));
const sheetFile = join(work, 'sheet.json');
const serverBin = join(work, 'lfps-server');
const outDir = join(work, 'dist');
const children = [];
const results = [];
const pages = [];

const requireFrom = createRequire(join(resolve(process.env.PLAYWRIGHT_FROM || root), 'noop.js'));
const { chromium } = requireFrom('playwright');

function check(name, ok, detail = '') {
  results.push({ name, ok: !!ok });
  console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn, ms = 15000, step = 200) {
  const end = Date.now() + ms;
  for (;;) {
    const v = await fn();
    if (v) return v;
    if (Date.now() > end) return v;
    await sleep(step);
  }
}

// ── 1. Builds: local-only web bundle (asserted) and the relay ───────────────────────────
execFileSync('node', [join(root, 'scripts/build-web-local.mjs'), '--relay', RELAY, '--out', outDir], {
  cwd: root,
  stdio: 'inherit',
});
execFileSync('go', ['build', '-o', serverBin, './cmd/api'], { cwd: join(root, 'apps/server'), stdio: 'inherit' });

// ── 2. Fake Sheet: owner tabs generated from the bundled seed (nothing personal on disk in the repo)
const core = await import(join(root, 'packages/core/dist/index.js'));
const dir = core.DEFAULT_STAFF_DIRECTORY;
writeFileSync(
  sheetFile,
  JSON.stringify({
    tabs: [
      {
        title: 'Staff Directory',
        rows: [
          ['Full Name', 'Teacher Abbreviation', 'Role', 'Primary Class'],
          ...Object.values(dir).map((t) => [t.fullName, t.abbr, t.role === '3rd Teacher' ? '3rd Teacher / Support' : t.role, t.primaryClass ?? '']),
        ],
      },
      { title: 'Subjects List', rows: [['Base Class (KG / PREP)', 'Subject Name', 'Abbreviation'], ['KG', 'Moral Science', 'M. SC.']] },
      { title: '_E2E_Hidden', hidden: true, rows: [['untouched']] },
    ],
  }),
);

function startRelay() {
  const env = {
    ...process.env,
    PORT: String(RELAY_PORT),
    ALLOWED_ORIGINS: `http://127.0.0.1:${WEB_PORT}`,
    SHEETS_FAKE_FILE: sheetFile,
    SHEETS_HYDRATE_TIMEOUT: '10s',
  };
  for (const k of ['SHEETS_SPREADSHEET_ID', 'GOOGLE_APPLICATION_CREDENTIALS', 'LFPS_SHEETS_SA_JSON', 'DATA_DIR']) delete env[k];
  const p = spawn(serverBin, [], { env, stdio: ['ignore', 'pipe', 'pipe'] });
  p.log = '';
  p.stdout.on('data', (d) => (p.log += d));
  p.stderr.on('data', (d) => (p.log += d));
  children.push(p);
  return p;
}
async function stopRelay(p) {
  p.kill('SIGTERM');
  await new Promise((r) => (p.exitCode !== null ? r() : p.once('exit', r)));
}
const health = async () => {
  try {
    const r = await fetch(`${RELAY}/api/v1/health`);
    return r.ok ? r.json() : null;
  } catch {
    return null;
  }
};
const subsTab = () => JSON.parse(readFileSync(sheetFile, 'utf8')).tabs.find((t) => t.title === 'Subs')?.rows ?? [];
const sheetRows = () => {
  const [, ...rows] = subsTab();
  return { live: rows.filter((r) => !r.includes('REMOVED')).length, removed: rows.filter((r) => r.includes('REMOVED')).length };
};

let exitCode = 1;
let browser;
try {
  let relay = startRelay();
  check('relay up in sheets mode (fake Sheet)', await until(async () => (await health())?.store === 'ready', 15000), JSON.stringify((await health())?.store));

  const preview = spawn(join(root, 'node_modules/.bin/vite'), ['preview', '--outDir', outDir, '--mode', 'e2e', '--host', '127.0.0.1', '--port', String(WEB_PORT), '--strictPort'], {
    cwd: web,
    env: { ...process.env, VITE_RELAY_TARGET: 'local', VITE_WS_URL: RELAY.replace('http', 'ws'), VITE_API_URL: RELAY },
    stdio: 'ignore',
    detached: true, // own process group, so the whole tree is stopped at the end
  });
  children.push(preview);
  await until(async () => (await fetch(APP).catch(() => null))?.ok, 20000);

  // ── 3. Browsers: anything that is not loopback is aborted and fails the test ───────────
  browser = await chromium.launch();
  const blocked = [];
  const LOCAL = /^(wss?|https?):\/\/(127\.0\.0\.1|localhost)(:\d+)?\//;
  async function device(name) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: 'block' });
    await ctx.route('**/*', (route) => {
      const u = route.request().url();
      if (LOCAL.test(u) || u.startsWith('data:') || u.startsWith('blob:')) return route.continue();
      blocked.push(new URL(u).host);
      return route.abort();
    });
    await ctx.addInitScript(() => localStorage.setItem('lfps_dev_editing_unlocked_v1', '1'));
    const page = await ctx.newPage();
    pages.push([name, page]);
    const sockets = [];
    page.on('websocket', (ws) => sockets.push(ws.url()));
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(APP);
    return { name, ctx, page, sockets, errors };
  }
  const phase = (d) => d.page.locator('[data-testid="sync-pill"]').getAttribute('data-phase').catch(() => null);
  const live = (d, ms = 20000) => until(async () => (await phase(d)) === 'live', ms);
  const subs = (d) =>
    d.page.evaluate(() => {
      const doc = JSON.parse(localStorage.getItem('lfps_operational_state') || 'null');
      if (!doc) return [];
      return Object.values(doc.days)
        .flatMap((r) => r.substitutions ?? [])
        .map((s) => s.id)
        .sort();
    });
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

  const A = await device('A');
  const B = await device('B');
  check('A and B live on the local relay', (await live(A)) && (await live(B)));

  // A: two absences → two subs (on a full weekday of the current week, whatever today is)
  for (const d of [A, B]) await d.page.getByRole('button', { name: 'TUE', exact: true }).first().click();
  await A.page.getByRole('button', { name: 'Staff Roster' }).click();
  const absent = A.page.locator('button[title="Currently Present — Tap to Mark Absent"]');
  await absent.nth(0).click();
  await sleep(300);
  await absent.nth(1).click(); // nth(1) of the remaining present staff
  await sleep(500);
  await A.page.getByRole('button', { name: 'Substitutions' }).click();
  await sleep(600);
  for (let i = 0; i < 2; i++) {
    await A.page.locator('[title^="Tap anywhere to assign substitute"]').first().click();
    await A.page.locator('div[class*="hover:bg-blue-600/15"]').first().click();
    await sleep(500);
  }
  const subsA = await subs(A);
  check('A assigned two subs', subsA.length === 2, `${subsA.length}`);
  check('B received both', same(await until(async () => ((await subs(B)).length === 2 ? subs(B) : null)), subsA));
  check('fake Sheet Subs has both rows', await until(async () => sheetRows().live === 2, 20000), JSON.stringify(sheetRows()));

  // B offline (keeps a stale copy) → A releases one sub
  await B.ctx.setOffline(true);
  await until(async () => (await phase(B)) !== 'live', 10000);
  await A.page.locator('[title="Release this substitution assignment"]').first().click();
  await sleep(500);
  const afterRelease = await subs(A);
  check('A released one sub', afterRelease.length === 1, `${afterRelease.length}`);
  const gone = subsA.find((id) => !afterRelease.includes(id));
  check('tombstone row written to Subs', await until(async () => sheetRows().removed === 1 && sheetRows().live === 1, 20000), JSON.stringify(sheetRows()));

  check('B (offline) still holds the stale copy', (await subs(B)).length === 2);

  // Restart the relay mid-test with NO device online: its memory is lost, so whatever a fresh
  // device gets afterwards can only come from the Sheet.
  await A.ctx.setOffline(true);
  await until(async () => (await phase(A)) !== 'live', 10000);
  await stopRelay(relay);
  relay = startRelay();
  const h = await until(async () => ((await health())?.store === 'ready' ? health() : null), 20000);
  check('relay restarted and rehydrated', !!h, h ? `store=${h.store}` : 'no health');
  check('relay log shows the reload', /reload|rehydrat|hydrat/i.test(relay.log));

  const C = await device('C');
  check('fresh browser C live (only device online)', await live(C));
  const firstC = await until(async () => ((await subs(C)).length ? subs(C) : null), 10000);
  check('C gets exactly the surviving sub from the Sheet', same(firstC, afterRelease), `C=${firstC?.length ?? 0}`);

  // Now the stale device and the editor come back
  await B.ctx.setOffline(false);
  await A.ctx.setOffline(false);
  check('A and B live again', (await live(A, 40000)) && (await live(B, 40000)));
  await sleep(2500);
  const finalA = await subs(A);
  const finalB = await subs(B);
  const finalC = await subs(C);
  check('released sub stays deleted on A', !finalA.includes(gone));
  check('stale B does not resurrect it', !finalB.includes(gone), `B=${finalB.length}`);
  check('A, B and C converge on the surviving sub', same(finalA, finalB) && same(finalB, finalC) && same(finalA, afterRelease));
  await sleep(3000);
  check('Sheet still has one live row and one tombstone', same(sheetRows(), { live: 1, removed: 1 }), JSON.stringify(sheetRows()));

  // Sheet data applied on devices (Settings → About)
  await C.page.locator('[title="Console & Settings"]:visible').first().click();
  const version = await C.page.getByTestId('sheet-data-version').innerText().catch(() => '');
  check('Settings shows the Sheet data version', /Sheet data/.test(version), version.replace(/\s+/g, ' '));
  const hidden = JSON.parse(readFileSync(sheetFile, 'utf8')).tabs.find((t) => t.title === '_E2E_Hidden');
  check('owner tabs untouched', same(hidden.rows, [['untouched']]) && hidden.hidden === true);

  const wsUrls = [...A.sockets, ...B.sockets, ...C.sockets];
  check('every socket went to the local relay', wsUrls.length > 0 && wsUrls.every((u) => LOCAL.test(u)), `${wsUrls.length} sockets`);
  check('no request left loopback', blocked.length === 0, blocked.length ? `${blocked.length} blocked` : '');
  const errors = [...A.errors, ...B.errors, ...C.errors];
  check('no page errors', errors.length === 0, errors.slice(0, 2).join(' | '));

  exitCode = results.every((r) => r.ok) ? 0 : 1;
  console.log(`\n${results.filter((r) => r.ok).length}/${results.length} checks passed`);
} catch (e) {
  console.error(e);
  // E2E_SHOTS=<dir>: screenshots of every browser on failure
  if (process.env.E2E_SHOTS) {
    for (const [name, page] of pages) await page.screenshot({ path: join(process.env.E2E_SHOTS, `e2e-${name}.png`) }).catch(() => {});
  }
} finally {
  await browser?.close().catch(() => {});
  for (const c of children) {
    try {
      process.kill(-c.pid, 'SIGTERM'); // detached: the process group
    } catch {
      c.kill('SIGTERM');
    }
  }
  rmSync(work, { recursive: true, force: true });
  process.exit(exitCode);
}

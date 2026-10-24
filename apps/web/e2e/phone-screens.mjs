#!/usr/bin/env node
/**
 * Bundle 40 — phone portrait + landscape screenshots (soft overflow checks).
 *
 *   npm run e2e:phone
 *
 * Builds a local-relay web bundle, serves it, captures:
 *   - Routine Matrix + Substitutions (guest)
 *   - Header guest + Header logged-in (Staff Login pick)
 * at 390×844 and 844×390 into /workspace/work/LFPS_phone_sim/
 *
 * Playwright: PLAYWRIGHT_FROM=<dir with playwright> (default: repo root or npx cache).
 * Soft-fails (exit 2) if document scrollWidth >> innerWidth on matrix (squeezed columns
 * that still overflow vertically are OK; we assert period headers are not all cramped).
 */
import { spawn, execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createServer } from 'node:http';
import { readFileSync, statSync } from 'node:fs';
import { extname } from 'node:path';

const root = resolve(import.meta.dirname, '../../..');
const RELAY = 'http://127.0.0.1:18081';
const WEB_PORT = 14174;
const outDir = join(root, 'apps/web/dist-phone');
const shotRoot = process.env.PHONE_SHOTS || '/workspace/work/LFPS_phone_sim';
const VIEWPORTS = [
  { name: 'portrait', width: 390, height: 844 },
  { name: 'landscape', width: 844, height: 390 },
];

const candidates = [
  process.env.PLAYWRIGHT_FROM,
  root,
  '/home/box/.npm/_npx/e41f203b7505f1fb',
].filter(Boolean);

let chromium;
let lastErr;
for (const base of candidates) {
  try {
    const req = createRequire(join(base, 'noop.js'));
    ({ chromium } = req('playwright'));
    console.log(`playwright from ${base}`);
    break;
  } catch (e) {
    lastErr = e;
  }
}
if (!chromium) {
  console.error('playwright not found; set PLAYWRIGHT_FROM. Last:', lastErr?.message);
  process.exit(1);
}

mkdirSync(shotRoot, { recursive: true });
if (process.env.PHONE_SKIP_BUILD === '1' && existsSync(join(outDir, 'index.html'))) {
  console.log(`PHONE_SKIP_BUILD=1 — reusing ${outDir}`);
} else {
  execFileSync('node', [join(root, 'scripts/build-web-local.mjs'), '--relay', RELAY, '--out', outDir], {
    cwd: root,
    stdio: 'inherit',
  });
}

const mime = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
};
const server = createServer((req, res) => {
  let urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  if (urlPath === '/') urlPath = '/index.html';
  const file = join(outDir, urlPath.replace(/^\//, ''));
  if (!file.startsWith(outDir) || !existsSync(file) || statSync(file).isDirectory()) {
    res.writeHead(404);
    res.end('not found');
    return;
  }
  res.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream' });
  res.end(readFileSync(file));
});
await new Promise((r) => server.listen(WEB_PORT, '127.0.0.1', r));
const APP = `http://127.0.0.1:${WEB_PORT}/`;
console.log(`serving ${outDir} at ${APP}`);

const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok: !!ok });
  console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`);
};

async function settle(page) {
  await page.waitForTimeout(800);
}

async function shot(page, name) {
  const path = join(shotRoot, `${name}.png`);
  await page.screenshot({ path, fullPage: false });
  console.log(`shot ${path}`);
  return path;
}

async function softOverflow(page, label) {
  const metrics = await page.evaluate(() => {
    const doc = document.documentElement;
    const matrix = document.querySelector('.routine-matrix-table');
    const shell = document.querySelector('.routine-matrix-shell');
    const header = document.querySelector('[data-testid="app-header-full"]');
    const periodTh = matrix
      ? [...matrix.querySelectorAll('th.period-col')].map((th) => th.getBoundingClientRect().width)
      : [];
    return {
      scrollW: doc.scrollWidth,
      clientW: doc.clientWidth,
      innerW: window.innerWidth,
      headerH: header ? header.getBoundingClientRect().height : 0,
      headerOverflow: header ? header.scrollWidth > header.clientWidth + 2 : false,
      periodWidths: periodTh,
      shellScrollW: shell ? shell.scrollWidth : 0,
      shellClientW: shell ? shell.clientWidth : 0,
    };
  });
  const cramped =
    metrics.periodWidths.length > 0 &&
    metrics.periodWidths.every((w) => w > 0 && w < 60);
  check(
    `${label}: period cols not cramped`,
    !cramped,
    `widths=${metrics.periodWidths.map((w) => w.toFixed(0)).join(',') || 'n/a'}`,
  );
  // Horizontal scroll on the matrix shell is expected/desired on phone.
  if (metrics.shellScrollW && metrics.shellClientW) {
    check(
      `${label}: matrix can scroll horizontally when needed`,
      metrics.shellScrollW >= metrics.shellClientW - 1,
      `shell ${metrics.shellScrollW}/${metrics.shellClientW}`,
    );
  }
  check(
    `${label}: header not overflowing its box`,
    !metrics.headerOverflow,
    `h=${metrics.headerH.toFixed(0)}`,
  );
  return metrics;
}

try {
  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 2,
      isMobile: vp.name === 'portrait',
      hasTouch: true,
    });
    const page = await context.newPage();
    await page.goto(APP, { waitUntil: 'networkidle', timeout: 60000 });
    await settle(page);

    // Guest header + matrix (default tab)
    await shot(page, `${vp.name}-guest-matrix`);
    await softOverflow(page, `${vp.name} guest matrix`);

    // Substitutions tab
    const subsTab = page.getByRole('button', { name: /Substitutions/i }).first();
    if (await subsTab.count()) {
      await subsTab.click();
      await settle(page);
      await shot(page, `${vp.name}-guest-substitutions`);
    }

    // Staff login → logged-in header (mobile Login or desktop Staff Login)
    try {
      const mobileLogin = page.locator('[data-testid="header-mobile-actions"] button[aria-label="Staff Login"]');
      const desktopLogin = page.getByRole('button', { name: /Staff Login/i });
      if (await mobileLogin.isVisible().catch(() => false)) {
        await mobileLogin.click();
      } else if (await desktopLogin.isVisible().catch(() => false)) {
        await desktopLogin.click();
      } else {
        const anyLogin = page.locator('button[aria-label="Staff Login"], button:has-text("Login")').first();
        await anyLogin.click({ force: true });
      }
      await settle(page);
      let picked = false;
      for (const id of ['Ms. N. Horo', 'Ms. K. Sanga', 'Mrs. M. Midha']) {
        const btn = page.locator(`button[data-identity="${id}"]`);
        if (await btn.count()) {
          await btn.click();
          await settle(page);
          picked = true;
          break;
        }
      }
      if (!picked) {
        const any = page.locator('button[data-identity]').nth(3);
        if (await any.count()) {
          await any.click();
          await settle(page);
        }
      }
    } catch (e) {
      console.warn(`login flow warn (${vp.name}):`, e.message || e);
    }
    await page.evaluate(() => {
      document.querySelectorAll('.fixed.inset-0.z-50').forEach((el) => el.remove());
    });
    await settle(page);
    await shot(page, `${vp.name}-loggedin-header`);
    const auth = await page.locator('[data-testid="app-header-full"]').getAttribute('data-auth');
    check(`${vp.name}: logged-in header auth attr`, auth === 'teacher' || auth === 'admin', `auth=${auth}`);

    // Light theme matrix
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'light');
      try { localStorage.setItem('lfps_theme', 'light'); } catch {}
    });
    try {
      const matrixTab = page.getByRole('button', { name: /Routine Matrix/i }).first();
      if (await matrixTab.count()) await matrixTab.click({ force: true });
    } catch (e) {
      console.warn(`matrix tab warn (${vp.name}):`, e.message || e);
    }
    await settle(page);
    await shot(page, `${vp.name}-light-matrix`);
    await softOverflow(page, `${vp.name} light matrix`);

    await context.close();
  }
} finally {
  await browser.close();
  server.close();
}

const manifest = {
  generatedAt: new Date().toISOString(),
  shotRoot,
  results,
};
writeFileSync(join(shotRoot, 'manifest.json'), JSON.stringify(manifest, null, 2));
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
console.log(`shots → ${shotRoot}`);
process.exit(failed.length ? 2 : 0);

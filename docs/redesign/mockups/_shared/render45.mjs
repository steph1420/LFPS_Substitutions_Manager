// Render Bundle 45 state PNGs at 390×844 @2x with Node Playwright.
// Usage: node render45.mjs   (from this folder, or any cwd)
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const shots = [
  { out: 'M06/M06-dev.png', url: 'M06/index.html?state=dev' },
  { out: 'M07/M07-used.png', url: 'M07/index.html?state=used' },
  { out: 'M07/M07-devices.png', url: 'M07/index.html?state=devices' },
  { out: 'M07/M07-undo.png', url: 'M07/index.html?state=undo' },
];

const browser = await chromium.launch({
  executablePath: process.env.CHROME || '/usr/bin/google-chrome',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
});
for (const s of shots) {
  const href = 'file://' + resolve(ROOT, s.url);
  await page.goto(href);
  if (s.url.includes('state=dev')) {
    await page.waitForTimeout(200);
    await page.evaluate(() => {
      const el = document.querySelector('#v-main');
      if (el) el.scrollTop = 9999;
    });
  }
  await page.waitForTimeout(400);
  const app = await page.$('.app');
  const dest = resolve(ROOT, s.out);
  if (app) await app.screenshot({ path: dest, type: 'png' });
  else await page.screenshot({ path: dest, type: 'png' });
  console.log('rendered', s.out);
}
await browser.close();

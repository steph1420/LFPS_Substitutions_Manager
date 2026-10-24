#!/usr/bin/env node
/**
 * Assemble the GitHub Pages site tree (FEAT-64 / Bundle 36).
 *
 *   <out>/                 ← production from origin/next-gen
 *   <out>/preview/<slug>/  ← live origin/bundle/* and origin/preview/*
 *   <out>/preview/index.html
 *   <out>/.nojekyll
 *
 * Env:
 *   VITE_ADMIN_PASSCODE_SHA256  required (64-char hex) — fail closed without it
 *   PAGES_OUT                   default: <repo>/site
 *   PAGES_ROOT_REF              default: origin/next-gen
 *   PAGES_EVENT_BRANCH          branch that triggered the workflow (optional)
 *   PAGES_FULL_PREVIEWS         "1" rebuild every preview branch (also auto on next-gen)
 *   PAGES_SKIP_PREVIEWS         "1" root only
 *   PAGES_SKIP_TESTS            "1" skip npm test (emergency only)
 */
import { spawnSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const OUT = resolve(process.env.PAGES_OUT || join(ROOT, 'site'));
const ROOT_REF = process.env.PAGES_ROOT_REF || 'origin/next-gen';
const EVENT_BRANCH = (process.env.PAGES_EVENT_BRANCH || '').replace(/^refs\/heads\//, '');
const FULL =
  process.env.PAGES_FULL_PREVIEWS === '1' || EVENT_BRANCH === 'next-gen' || EVENT_BRANCH === '';
const SKIP_PREVIEWS = process.env.PAGES_SKIP_PREVIEWS === '1';
const SKIP_TESTS = process.env.PAGES_SKIP_TESTS === '1';
const ADMIN_HASH = (process.env.VITE_ADMIN_PASSCODE_SHA256 || '').trim();

function sh(cmd, opts = {}) {
  const r = spawnSync(cmd, {
    shell: true,
    encoding: 'utf8',
    cwd: opts.cwd || ROOT,
    env: { ...process.env, ...(opts.env || {}) },
    stdio: opts.stdio || 'pipe',
  });
  if (r.status !== 0) {
    const err = (r.stderr || r.stdout || '').trim() || `exit ${r.status}`;
    throw Object.assign(new Error(err), { status: r.status });
  }
  return (r.stdout || '').trim();
}

function branchSlug(branch) {
  return (
    branch
      .trim()
      .replace(/\//g, '-')
      .replace(/[^a-zA-Z0-9._-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '') || 'unknown'
  );
}

function listPreviewBranches() {
  const out = sh('git branch -r --list "origin/bundle/*" "origin/preview/*"');
  return out
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => l.replace(/^origin\//, ''))
    .filter((b) => b && b !== 'HEAD')
    .sort();
}

function buildWeb({ cwd, channel, branch, commit, extraEnv = {} }) {
  const env = {
    ...extraEnv,
    GIT_BRANCH: branch,
    GIT_COMMIT: commit,
    VITE_BUILD_CHANNEL: channel,
  };
  sh('npm ci', { cwd, env, stdio: 'inherit' });
  if (!SKIP_TESTS) sh('npm test', { cwd, env, stdio: 'inherit' });
  sh('npm run build:web', { cwd, env, stdio: 'inherit' });
  const dist = join(cwd, 'apps/web/dist');
  if (!existsSync(join(dist, 'index.html'))) {
    throw new Error(`build produced no index.html in ${dist}`);
  }
  return dist;
}

function removeWorktree(work) {
  try {
    sh(`git worktree remove --force "${work}"`);
  } catch {
    rmSync(work, { recursive: true, force: true });
    try {
      sh('git worktree prune');
    } catch {
      /* ignore */
    }
  }
}

function writePreviewIndex(entries, builtAt) {
  const rows = entries
    .map((e) => {
      let status;
      if (e.ok) status = `<a href="./${e.slug}/">Open</a>`;
      else if (e.kept)
        status = `<span style="color:#b45309">build failed — kept previous</span> · <a href="./${e.slug}/">Open</a>`;
      else status = `<span style="color:#b91c1c">build failed</span>`;
      return `<tr>
  <td><code>${e.branch}</code></td>
  <td><code>${e.slug}</code></td>
  <td><code>${e.commit || '—'}</code></td>
  <td>${status}</td>
</tr>`;
    })
    .join('\n');
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>LFPS preview builds</title>
  <style>
    body { font-family: ui-sans-serif, system-ui, sans-serif; margin: 2rem; color: #0f172a; background: #f8fafc; }
    h1 { font-size: 1.25rem; }
    table { border-collapse: collapse; width: 100%; max-width: 52rem; background: #fff; }
    th, td { border: 1px solid #e2e8f0; padding: 0.5rem 0.75rem; text-align: left; font-size: 0.875rem; }
    th { background: #f1f5f9; }
    a { color: #2563eb; }
    .meta { color: #64748b; font-size: 0.8rem; margin-bottom: 1rem; }
  </style>
</head>
<body>
  <h1>LFPS Substitutions Manager — preview builds</h1>
  <p class="meta">Built ${builtAt} · production is <a href="../">the site root</a> (next-gen)</p>
  <table>
    <thead><tr><th>Branch</th><th>Slug</th><th>Commit</th><th>Status</th></tr></thead>
    <tbody>
${rows || '      <tr><td colspan="4">No bundle/* or preview/* branches on origin.</td></tr>'}
    </tbody>
  </table>
</body>
</html>
`;
}

function seedPreviewsFromLive() {
  const dest = join(OUT, 'preview');
  mkdirSync(dest, { recursive: true });
  const mirror = mkdtempSync(join(tmpdir(), 'lfps-seed-'));
  try {
    const r = spawnSync(
      `curl -fsSL "https://steph1420.github.io/LFPS_Substitutions_Manager/preview/index.html" -o "${join(mirror, 'index.html')}"`,
      { shell: true, encoding: 'utf8' },
    );
    if (r.status !== 0) {
      console.log('[pages] no live preview index to seed (ok before Actions cutover)');
      return;
    }
    const html = readFileSync(join(mirror, 'index.html'), 'utf8');
    const slugs = [...html.matchAll(/href="\.\/([a-zA-Z0-9._-]+)\//g)].map((m) => m[1]);
    for (const slug of slugs) {
      const slugDir = join(dest, slug);
      if (existsSync(join(slugDir, 'index.html'))) continue;
      mkdirSync(slugDir, { recursive: true });
      const base = `https://steph1420.github.io/LFPS_Substitutions_Manager/preview/${slug}`;
      const idxR = spawnSync(`curl -fsSL "${base}/index.html" -o "${join(slugDir, 'index.html')}"`, {
        shell: true,
      });
      if (idxR.status !== 0) continue;
      const idx = readFileSync(join(slugDir, 'index.html'), 'utf8');
      const assets = [...new Set([...idx.matchAll(/assets\/[A-Za-z0-9._-]+/g)].map((m) => m[0]))];
      mkdirSync(join(slugDir, 'assets'), { recursive: true });
      for (const a of assets) {
        spawnSync(`curl -fsSL "${base}/${a}" -o "${join(slugDir, a)}"`, { shell: true });
      }
      console.log(`[pages] seeded preview/${slug} from live site`);
    }
  } finally {
    rmSync(mirror, { recursive: true, force: true });
  }
}

function main() {
  if (!/^[0-9a-f]{64}$/i.test(ADMIN_HASH)) {
    console.error(
      '[pages] VITE_ADMIN_PASSCODE_SHA256 must be a 64-char hex digest (repo Actions secret). Refusing production root build.',
    );
    process.exit(1);
  }

  sh('git fetch --prune origin', { stdio: 'inherit' });

  if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });
  // Refresh root files but keep preview/ (workflow cache / previous seed).
  for (const name of readdirSync(OUT)) {
    if (name === 'preview') continue;
    rmSync(join(OUT, name), { recursive: true, force: true });
  }
  writeFileSync(join(OUT, '.nojekyll'), '');
  mkdirSync(join(OUT, 'preview'), { recursive: true });

  const builtAt = new Date().toISOString();

  const rootWork = mkdtempSync(join(tmpdir(), 'lfps-pages-root-'));
  try {
    console.log(`[pages] building production root from ${ROOT_REF}`);
    sh(`git worktree add --detach "${rootWork}" "${ROOT_REF}"`, { stdio: 'inherit' });
    const commit = sh('git rev-parse --short=7 HEAD', { cwd: rootWork });
    const dist = buildWeb({
      cwd: rootWork,
      channel: 'production',
      branch: 'next-gen',
      commit,
      extraEnv: { VITE_ADMIN_PASSCODE_SHA256: ADMIN_HASH },
    });
    cpSync(dist, OUT, { recursive: true });
    writeFileSync(join(OUT, '.nojekyll'), '');
    console.log(`[pages] root ok (${commit})`);
  } finally {
    removeWorktree(rootWork);
  }

  if (SKIP_PREVIEWS) {
    writeFileSync(join(OUT, 'preview', 'index.html'), writePreviewIndex([], builtAt));
    console.log(`[pages] done (previews skipped) → ${OUT}`);
    return;
  }

  seedPreviewsFromLive();

  const allLive = listPreviewBranches();
  let toBuild = allLive;
  if (!FULL && (EVENT_BRANCH.startsWith('bundle/') || EVENT_BRANCH.startsWith('preview/'))) {
    toBuild = allLive.filter((b) => b === EVENT_BRANCH);
    console.log(`[pages] incremental: rebuilding only ${EVENT_BRANCH} (others kept/seeded)`);
  } else {
    console.log(`[pages] full preview rebuild (${allLive.length} branches)`);
  }

  const previewEntries = [];
  for (const branch of allLive) {
    const slug = branchSlug(branch);
    const dest = join(OUT, 'preview', slug);
    if (!toBuild.includes(branch)) {
      const kept = existsSync(join(dest, 'index.html'));
      previewEntries.push({ branch, slug, commit: kept ? 'cached' : '—', ok: kept, kept });
      continue;
    }

    const work = mkdtempSync(join(tmpdir(), `lfps-pages-${slug}-`));
    let commit = '';
    try {
      console.log(`[pages] building preview ${branch}`);
      sh(`git worktree add --detach "${work}" "origin/${branch}"`, { stdio: 'inherit' });
      commit = sh('git rev-parse --short=7 HEAD', { cwd: work });
      const dist = buildWeb({
        cwd: work,
        channel: 'preview',
        branch,
        commit,
        extraEnv: {
          VITE_ADMIN_PASSCODE_SHA256: ADMIN_HASH,
          VITE_RELAY_TARGET: 'local',
          VITE_WS_URL: 'ws://127.0.0.1:8080',
          VITE_API_URL: 'http://127.0.0.1:8080',
        },
      });
      rmSync(dest, { recursive: true, force: true });
      mkdirSync(dest, { recursive: true });
      cpSync(dist, dest, { recursive: true });
      previewEntries.push({ branch, slug, commit, ok: true });
      console.log(`[pages] preview ${branch} ok (${commit})`);
    } catch (err) {
      console.error(`[pages] preview ${branch} FAILED:`, err.message || err);
      const kept = existsSync(join(dest, 'index.html'));
      if (!kept) {
        mkdirSync(dest, { recursive: true });
        writeFileSync(
          join(dest, 'index.html'),
          `<!doctype html><meta charset="utf-8" /><title>Preview build failed</title>
           <p>Build for <code>${branch}</code> failed. Fix the branch and re-run pages.
           <a href="../">Preview list</a></p>`,
        );
      }
      previewEntries.push({ branch, slug, commit, ok: false, kept });
    } finally {
      removeWorktree(work);
    }
  }

  writeFileSync(join(OUT, 'preview', 'index.html'), writePreviewIndex(previewEntries, builtAt));
  console.log(`[pages] done → ${OUT}`);
}

main();

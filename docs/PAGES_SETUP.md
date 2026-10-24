# GitHub Pages setup (Bundle 36 — FEAT-64 / ARCH-05)

Production URL: `https://steph1420.github.io/LFPS_Substitutions_Manager/`  
Preview list (after Actions cutover): `https://steph1420.github.io/LFPS_Substitutions_Manager/preview/`  
One preview: `https://steph1420.github.io/LFPS_Substitutions_Manager/preview/<slug>/`  
(`bundle/36` → slug `bundle-36`)

## What Bundle 36 adds

| Piece | Role |
|---|---|
| `.github/workflows/ci.yml` | Tests on `next-gen`, `bundle/**`, `preview/**`. **Render** (`autoDeployTrigger: checksPass`) waits for these checks on `next-gen` only. |
| `.github/workflows/pages.yml` | Builds the static site in Actions (`scripts/build-pages-site.mjs`) and, when enabled, deploys with `actions/deploy-pages`. |
| Committed root `index.html` + `assets/` | **Still present.** They keep the live site working while Pages source is “Deploy from a branch”. Do **not** delete them until the cutover below is done. |

Preview builds set `VITE_BUILD_CHANNEL=preview`, show a footer **Preview · &lt;branch&gt;** badge, namespace `localStorage` keys, and point the relay at loopback so they never touch production Sheets.

## Owner cutover checklist (exact clicks)

Do these in order. Until step 3 is done, the site keeps serving the committed `next-gen` root.

### 1. Add the passcode hash secrets

1. Open the repo on GitHub: **steph1420/LFPS_Substitutions_Manager**
2. **Settings** → **Secrets and variables** → **Actions**
3. Under **Repository secrets** → **New repository secret**

| Secret | Required | How to get the value |
|---|---|---|
| `VITE_ADMIN_PASSCODE_SHA256` | **Yes** (pages build) | `npm run admin:hash` → same hex as `apps/web/.env.local` |
| `VITE_DEV_PASSCODE_SHA256` | Recommended (SEC-03) | `npm run admin:hash -- --dev` → must **differ** from admin |

Never commit either value. Without the **admin** secret the `pages` **build is skipped** (workflow stays green so Render `checksPass` is not blocked). Without the **Dev** secret, Developer Options shows “not configured” in Actions-built sites; committed branch-deploy assets use whatever is in the build machine’s `.env.local`.

### 2. Confirm CI is green on `next-gen`

**Actions** tab → latest `ci` run on `next-gen` should be green (`server` + `web`). Render already uses **After CI Checks Pass**.

### 3. Switch Pages source to GitHub Actions

1. **Settings** → **Pages** (left sidebar under Code and automation)
2. **Build and deployment** → **Source**
3. Change from **Deploy from a branch** to **GitHub Actions**
4. Save / confirm if GitHub asks

Until you do this, `actions/deploy-pages` cannot publish. The workflow’s **deploy** job stays skipped until step 4 so it does not fail checks.

### 4. Enable the deploy job

1. **Settings** → **Secrets and variables** → **Actions** → **Variables** tab
2. **New repository variable**
3. Name: `PAGES_ACTIONS_DEPLOY`
4. Value: `true`
5. **Add variable**

### 5. Run a deploy

Either:

- Push to `next-gen`, or  
- **Actions** → **pages** → **Run workflow** → branch `next-gen` → **Run workflow**

When it finishes, open the production URL and a preview URL. Footer on previews shows **Preview · bundle/…**.

### 6. Optional follow-up (after Actions owns Pages)

Only after steps 3–5 look good for a day or two:

1. Stop committing new root assets (`npm run build` / `build:pages` copying into repo root). Prefer `npm run build:web` locally; let Actions publish.
2. Optionally remove committed root `index.html` + `assets/` in a dedicated commit (not part of the first Bundle 36 push). Keep a rollback tag before that delete.
3. Supersede ADR-0004 (committed root) with Actions as the source of truth — see `docs/DECISIONS/0006-github-pages-actions.md`.

## Local smoke (optional)

```sh
export VITE_ADMIN_PASSCODE_SHA256='<64-char hex>'
export VITE_DEV_PASSCODE_SHA256='<64-char hex>'   # optional; SEC-03
PAGES_SKIP_PREVIEWS=1 npm run build:pages-actions
# inspect ./site/
```

## Render

Unchanged: `docs/RENDER_SETUP.md`. Auto-Deploy stays **After CI Checks Pass**. Health Check Path `/api/v1/health`.

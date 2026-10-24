# Go-live runbook: 2.0.0-alpha.3 (Job Bundles 34a + 35 + 35a)

> **Prepared, not executed.** Every step that pushes, deploys, merges into `next-gen` or tags needs the owner's explicit approval. `main` is not touched.

**What ships:** `bundle/35a`. It contains `bundle/34a` (admin hierarchy, Edit without login) and `bundle/35` (live sync over the relay, Sheets bridge, Connecting… state, CI, `render.yaml`), plus 35a (devices apply the Sheet, `Subs` reload after a restart, relay guard). `next-gen` (`v2.0.0-alpha.2`) is an ancestor of `bundle/35a`, so the merge has no conflicts.

**Why client and relay go together:** the alpha.3 web app and relay speak the new WebSocket protocol. An alpha.3 app against the alpha.2 relay stays at Connecting… (it keeps working from local data). An alpha.2 app against the alpha.3 relay doesn't sync. Both are safe, but sync only works once both are live. The gap should be minutes.

## 0. Before you start (agent, local)

1. Back up: `tar -czf _backups/LFPS_pre-alpha3_<date>.tar.gz --exclude=node_modules LFPS_Substitutions_Manager` (outside the repo).
2. `git fetch origin` and check that local `next-gen` equals `origin/next-gen` (`git rev-parse next-gen origin/next-gen`). Stop if they differ.
3. On `bundle/35a`: `npm ci && npm test`; `cd apps/server && gofmt -l . && go vet ./... && go test -race ./...`. All green.
4. Optional, recommended: `npm run e2e:sheets` (local relay only; see SAS §3.1).

## 1. Release commits (agent, local, no push)

1. `git checkout next-gen && git merge --no-ff bundle/35a -m "merge: bundle/35a (34a + 35 + 35a) for v2.0.0-alpha.3"`.
2. Version: set the root `package.json` `version` to `2.0.0-alpha.3`, run `npm run version:sync`, then `npm install` (refreshes `package-lock.json`). `npm test` must pass (`version:check`).
3. CHANGELOG: move the `[Unreleased]` entries into `## [v2.0.0-alpha.3] - <date>` (keep the Planned list under `[Unreleased]`). Mark 34a/35/35a as live in TODO's bundle table and BUGS (BUG-25, 32, 33, 34). Commit `chore(release): v2.0.0-alpha.3`.
4. Root build **with the admin hash**: `apps/web/.env.local` must hold `VITE_ADMIN_PASSCODE_SHA256` (never commit it; check it's present without printing it, e.g. `grep -c '^VITE_ADMIN_PASSCODE_SHA256=.\{64\}$' apps/web/.env.local` → `1`). Run `npm run build`. It builds in production mode, so `apps/web/.env.production` supplies the Render relay URLs.
5. Check the bundle without printing anything secret:
   - the built JS contains the relay host from `.env.production` (count > 0) and no `localhost:8080`;
   - the admin hash is present (count of the 64-hex value = 1, compared in a script, not echoed);
   - `index.html` references exactly one `index-*.js` and one `index-*.css`.
6. Prune stale `assets/`: delete every hashed file that the new root `index.html` doesn't reference (WORKFLOW §5). Commit `build: v2.0.0-alpha.3 Pages assets`.
7. Run the leak check on both commits (`git diff --cached | /tmp/leakcheck.sh` before each). Dangling commit `532576e` must never be pushed (it is unreachable; don't recover it).
8. Tags (local): `git tag rollback/pre-v2.0.0-alpha.3 <current origin/next-gen, i.e. the v2.0.0-alpha.2 build 362d887>` and `git tag -a v2.0.0-alpha.3 -m "v2.0.0-alpha.3"` on the build commit.

## 2. Render (owner, Dashboard), in this order

All of 2.1–2.3 happens **before** the push in step 3.

1. **Deploy gate.** Service → Settings → Build & Deploy → Auto-Deploy → **After CI Checks Pass**; Health Check Path `/api/v1/health` (RENDER_SETUP §2, option A). Without this, the hand-made service deploys on every commit, before CI.
2. **Secret File first.** Service → Environment → Secret Files → **+ Add Secret File**, filename `sa.json`, paste the service-account JSON, Save. It mounts at `/etc/secrets/sa.json`.
3. **Environment variables** (RENDER_SETUP §3): `SHEETS_SPREADSHEET_ID` (the real ID), `GOOGLE_APPLICATION_CREDENTIALS=/etc/secrets/sa.json`; optional `SHEETS_PULL_INTERVAL=5m`, `SHEETS_LOG=0`, `SHEETS_HYDRATE_TIMEOUT=20s`, `ALLOWED_ORIGINS` (the default already covers `https://steph1420.github.io`); remove `DATA_DIR` if present. Never set `SHEETS_FAKE_FILE`. Choose **Save** (not "Save and deploy"); if only "Save, rebuild and deploy" is offered, that's harmless: the alpha.2 relay ignores these variables.
4. Confirm the Sheet is shared with the service account as **Editor** (SHEETS_SETUP §2). It already is: the real-Sheet self-test passed on 2026-10-24.

## 3. Go live (agent, after the owner's approval)

1. `git push origin next-gen` and `git push origin v2.0.0-alpha.3 rollback/pre-v2.0.0-alpha.3`. No force-push.
2. Pages redeploys from the `next-gen` root within a minute or two. CI (`.github/workflows/ci.yml`) runs on the push; when it passes, Render deploys the relay (`buildFilter` matches `apps/server/**`). In between, devices on the new app show Connecting… and keep working.
3. If CI fails, Render doesn't deploy. Fix forward on a branch, or roll back the Pages commit (§5).

## 4. Verify (agent + owner)

1. `curl -s https://<relay>/api/v1/health` → `version: 2.0.0-alpha.3`, `mode: sheets`, `store: ready`, `sheets: ok`. Right after the deploy `store` can read `hydrating` for a few seconds.
2. Render log: `[Sheets] Bridge on: …`, `[Sheets] Upgraded Subs to schema 2 …` (first start only; `Subs` is already schema 2 from the self-test, so it may not appear) and `[Sheets] Reloaded Subs: … rows …`. App_Meta `subs_reloaded_at` is set. No `Relay-only mode` line and no `FAKE SHEET` line.
3. App (hard reload): header pill **Live**; footer `v2.0.0-alpha.3`; Settings → Cloud Synchronization & Health "N devices · Sheets linked"; Settings → Build Info "Sheet data `<version>`", which matches App_Meta `data_version` (first 7 characters).
4. Two devices: assign a substitution on one and see it on the other. A row appears in `Subs` within ~15 s. Release it: the row turns `REMOVED`.
5. Optional restart check: Render → **Manual Deploy → Restart service**, then the released substitution stays released on every device.
6. The owner tabs are unchanged (no app writes outside `Subs`, `App_Meta`, `App_Log`).

## 5. Rollback

- **Relay:** Render → Events/Deploys → the last alpha.2 deploy → **Rollback**. Env vars and the Secret File stay; the alpha.2 relay ignores them. `Subs` keeps its schema-2 header and rows, and a later alpha.3 relay reads them as they are.
- **Pages:** without rewriting history: on `next-gen`, `git revert --no-edit <build commit>` and `git revert --no-edit <release commit>`, then `git revert -m 1 --no-edit <merge commit>`; rebuild (`npm run build`, with the admin hash), prune `assets/`, commit, push. That restores the alpha.2 app. Resetting `next-gen` to `rollback/pre-v2.0.0-alpha.3` needs a force-push and the owner's explicit approval.
- Roll back **both** together, for the same protocol reason. Devices keep their local data either way. Edits queued on an alpha.3 device stay queued until an alpha.3 relay is back.
- To switch Sheets off without a rollback: delete `SHEETS_SPREADSHEET_ID` (or the Secret File). The relay goes `relay-only` and devices keep syncing.

## 6. Uptime pinger (cron-job.org, BUG-31)

Before or right after go-live, switch the owner's job to **HEAD**: job → Edit → Advanced → Request method → **HEAD**. Saving responses is already off. `/api/v1/health` answers HEAD with headers only, does no I/O and never calls Sheets, so the ping costs no Sheets quota and can't fail with "output too large". Keep the school-hours schedule. Each cold start costs the relay a few Sheets reads and a ≤ 20 s hydrating window; the pinger keeps that to about once a day.

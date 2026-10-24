# HANDOVER: LFPS Substitutions Manager (2026-10-24)

**To the new assistant.** You are taking over a live project from another assistant. You have no memory of it, no chat history, and none of its computer. This file and the git bundle next to it are everything. Read all three parts before you do anything. Then do **Part A first**, together with the user, before any other work.

- **Repo:** https://github.com/steph1420/LFPS_Substitutions_Manager
- **Live site:** https://steph1420.github.io/LFPS_Substitutions_Manager/ (GitHub Pages, from branch `next-gen`, root)
- **Live relay:** https://lfps-substitutions-manager.onrender.com (Render, health at `/api/v1/health`)
- **Live version:** `2.0.0-alpha.2`. Ready but **not released**: `2.0.0-alpha.3` = bundles 34a + 35 + 35a.
- **The user:** the owner, GitHub `steph1420`, who works at Little Flower Preparatory School (LFPS). The app is the school's front-desk tool for teacher absences and substitutions. The school runs on **IST (Asia/Kolkata)**.

---

## Part A. FIRST: walk the user through setup (do this before any other work)

Take **one step at a time**. Explain what the step does and why in one or two sentences, give the exact clicks or commands, then **wait for the user** to say it's done. Verify it yourself before moving on. If a step fails, fix it before going further. Never ask for a secret in chat: use your masked secret-request field, so the value reaches you as an environment variable you never print.

### A1. Restore the code

The handover zip holds `LFPS_all_branches.bundle`, a git bundle of every branch and tag, including the local-only work branches that were **never pushed**. Ask the user to upload the zip to your computer (or the bundle file itself).

```sh
mkdir -p ~/work && cd ~/work
unzip LFPS_handover_2026-10-24.zip -d lfps_handover
git bundle verify lfps_handover/LFPS_all_branches.bundle      # must say "is okay"
git clone lfps_handover/LFPS_all_branches.bundle LFPS_Substitutions_Manager
cd LFPS_Substitutions_Manager
git remote rename origin handover-bundle
git remote add origin https://github.com/steph1420/LFPS_Substitutions_Manager.git
# create a local branch for every branch in the bundle
for b in $(git for-each-ref --format='%(refname:lstrip=3)' refs/remotes/handover-bundle/ | grep -v '^HEAD$'); do
  git show-ref --verify --quiet "refs/heads/$b" || git branch "$b" "handover-bundle/$b"
done
git fetch origin                   # needs A2 for private access; the repo is public, so it may work already
git branch -vv && git tag
git switch bundle/35a              # the newest work branch (handover/2026-10-24 = it plus this file)
```

**Verify:**
- `git branch` lists `main`, `next-gen`, `refine/jb31`, `bundle/34`, `bundle/34a`, `bundle/35`, `bundle/35a`, `handover/2026-10-24`.
- `git tag` lists `v2.0.0-alpha.2` and `rollback/pre-v2.0.0-alpha.2`.
- `git rev-parse next-gen origin/next-gen` prints the same hash twice. Expected: `362d887…`, unless the user released something after 2026-10-24. If they differ, stop and ask the user.
- `bundle/35a` head is `fd573b5` (go-live runbook).

**Fallback** if the user has pushed the branches by now (check: `git ls-remote --heads https://github.com/steph1420/LFPS_Substitutions_Manager.git` lists `bundle/35a`):

```sh
git clone https://github.com/steph1420/LFPS_Substitutions_Manager.git && cd LFPS_Substitutions_Manager
git fetch origin --tags
for b in $(git for-each-ref --format='%(refname:lstrip=3)' refs/remotes/origin/ | grep -v '^HEAD$'); do
  git show-ref --verify --quiet "refs/heads/$b" || git branch --track "$b" "origin/$b"
done
```

Then install the toolchain: **Node 20** (npm 10+), **Go 1.23+** (`apps/server/go.mod` says `go 1.23.2`; newer Go works too), `zip`/`unzip`. Run `npm ci` at the repo root.

**Make your first backup now** (see Part C). `_backups/` is git-ignored. The old tarballs were not handed over, because they contain secrets.

### A2. GitHub CLI login (device flow)

1. If `gh --version` fails, install the GitHub CLI (https://cli.github.com, or your package manager).
2. Run `gh auth login --hostname github.com --git-protocol https --web --scopes repo,workflow`.
3. Show the user the one-time code. Ask them to open **https://github.com/login/device**, make sure they're signed in as **steph1420**, enter the code, and click **Authorize**. `workflow` is needed because the repo contains `.github/workflows/ci.yml`.
4. Run `gh auth setup-git` so `git` uses that login.

**Verify:** `gh auth status` shows "Logged in to github.com account steph1420". **Never** ask the user to paste a token.

### A3. Admin passcode → hash

The app has a 6-digit admin passcode. Only its SHA-256 hash is baked into the web build, as `VITE_ADMIN_PASSCODE_SHA256` in the **git-ignored** `apps/web/.env.local`. Without it, a build has **no admin access** at all ("not configured"). Read `docs/ADMIN_ACCESS.md` first.

1. Ask the user for the passcode through the masked secret-request field, as env var **`LFPS_ADMIN_PASSCODE`**. Never in chat.
2. Write the hash without printing either value:
   ```sh
   printf %s "$LFPS_ADMIN_PASSCODE" | node scripts/hash-admin-passcode.mjs > /tmp/h.txt
   printf 'VITE_ADMIN_PASSCODE_SHA256=%s\n' "$(cat /tmp/h.txt)" > apps/web/.env.local && rm /tmp/h.txt
   git check-ignore -q apps/web/.env.local && echo ignored     # must print "ignored"
   ```
   The script refuses weak codes unless you pass `--allow-weak`. The user's code was accepted before.
3. **Verify:** `grep -c '^VITE_ADMIN_PASSCODE_SHA256=[0-9a-f]\{64\}$' apps/web/.env.local` prints `1`. With the env var set, `npm run test:web` also runs the "configured owner passcode" test instead of skipping it, and it must pass.

If the user wants a **new** passcode, follow ADMIN_ACCESS "Owner setup"; old sessions become invalid automatically.

### A4. Google Sheets service-account key

The relay (server) reads and writes the user's Google Sheet through a Google service account. You only need the key locally for `sheetcheck` and for checks against the real Sheet. Read `docs/SHEETS_SETUP.md`.

1. Ask for the JSON key through the masked secret-request field, as env var **`LFPS_SHEETS_SA_JSON`**. **Never print, log or commit it, or any of its fields** (`private_key`, `private_key_id`, `client_email`…).
2. Only when you need it as a file, write it **outside the repo**, chmod 600, and delete it right after:
   ```sh
   mkdir -p ~/_secrets && umask 077 && printf '%s' "$LFPS_SHEETS_SA_JSON" > ~/_secrets/sa.json && chmod 600 ~/_secrets/sa.json
   cd apps/server
   SHEETS_SPREADSHEET_ID=1ST9ThXZQ7PaRpl-n8ka3xulfN3X3u7awHkO6pErb6Ho \
   GOOGLE_APPLICATION_CREDENTIALS=~/_secrets/sa.json go run ./cmd/sheetcheck     # read-only report
   rm -f ~/_secrets/sa.json
   ```
3. **Spreadsheet ID:** `1ST9ThXZQ7PaRpl-n8ka3xulfN3X3u7awHkO6pErb6Ho` (the `/d/<id>/edit` part of the editor URL; config, never in Go code). The "Publish to web" `2PACX-…` link is **not** usable for writes.
4. The service account's email (the key's `client_email`; Google Cloud shows it on the service account page) must have **Editor** on the Sheet (Sheet → **Share**). This was done on 2026-10-24. Don't write that email into docs or reports.
5. **Verify:** the read-only `sheetcheck` report lists the tabs (no cell data) and exits 0. Optionally `-selftest` (writes and removes test rows in `Subs` only, and proves no other tab changed; it passed twice on 2026-10-24).
6. `npm run e2e:sheets` needs **no** key: it uses a fake Sheet and a local relay.

### A5. Render (the relay)

Nothing to re-link: the service `lfps-substitutions-manager` lives on the user's Render account, and auto-deploys from `next-gen`. Read `docs/RENDER_SETUP.md`.

**State now (alpha.2 live):** `GET https://lfps-substitutions-manager.onrender.com/api/v1/health` returns `{"status":"healthy","version":"2.0.0-alpha.2",…,"timeZone":"Asia/Kolkata"}` with no `mode` field. That's the alpha.2 relay, which has no Sheets bridge yet. The first call after idle can take about a minute (free tier wakes up).

**Pending go-live steps (owner, Render Dashboard, before alpha.3 is pushed).** From `docs/RELEASE_2.0.0-alpha.3.md` §2:
1. Service → **Settings → Build & Deploy → Auto-Deploy → "After CI Checks Pass"**; Health Check Path `/api/v1/health`.
2. Service → **Environment → Secret Files → + Add Secret File**: filename `sa.json`, contents = the JSON key; Save. It mounts at `/etc/secrets/sa.json`.
3. Service → **Environment → Environment Variables**:
   - `SHEETS_SPREADSHEET_ID` = the ID above;
   - `GOOGLE_APPLICATION_CREDENTIALS` = `/etc/secrets/sa.json`;
   - optional: `SHEETS_PULL_INTERVAL=5m`, `SHEETS_LOG=0`, `SHEETS_HYDRATE_TIMEOUT=20s`, `ALLOWED_ORIGINS` (the default already allows the Pages origin);
   - remove `DATA_DIR` if present; never set `SHEETS_FAKE_FILE`.

   Click **Save** (not "Save and deploy"; a deploy now is harmless anyway).

**After alpha.3 is live,** health must show `"version":"2.0.0-alpha.3"`, `"mode":"sheets"`, `"store":"ready"`, `"sheets":"ok"`. Ask the user what's in the Dashboard today; don't assume steps 1–3 are done or not done.

### A6. GitHub Pages (the website)

Current source: **Deploy from a branch → `next-gen` / `(root)`** (ADR-0004). The built `index.html` and `assets/` are **committed** at the `next-gen` root by the release step.

- **Where:** repo → **Settings → Pages → Build and deployment → Source: Deploy from a branch; Branch: `next-gen`, folder `/ (root)`**.
- **Verify:** `gh api repos/steph1420/LFPS_Substitutions_Manager/pages --jq '{status,source}'` → `{"status":"built","source":{"branch":"next-gen","path":"/"}}`. The site loads and its footer reads "LFPS Substitutions Manager · v2.0.0-alpha.2…" (build label; hover shows build time).
- Bundle 36 plans to move Pages to an Actions-built artifact. Not done yet; don't change the source.

### A7. cron-job.org uptime pinger (BUG-31)

The user already has a cron-job.org job that pings `https://lfps-substitutions-manager.onrender.com/api/v1/health` during school hours to keep the free Render relay awake. Don't build a keep-warm. During the alpha.2 deploy it reported "Failed (output too large)". Our earlier advice to use GET was wrong; the fix is **HEAD**:

1. cron-job.org → **Dashboard → the job → Edit**.
2. **Advanced → Request method → HEAD**. Saving responses is already off.
3. Save; keep the school-hours schedule.

**Verify:** the job's history shows successes. `curl -sI https://lfps-substitutions-manager.onrender.com/api/v1/health` returns `HTTP/2 200` with no body.

### A8. Final verification checklist

Run these on `bundle/35a` (or `handover/2026-10-24`) and report the real numbers:

| Check | Command | Expected (2026-10-24) |
|---|---|---|
| Install | `npm ci` | exit 0 |
| JS tests | `npm test` | version check OK; core **35/35**; web **73** (72 + 1 skipped without `LFPS_ADMIN_PASSCODE`; 73/73 with it) |
| Web build (work branch) | `npm run build:web` | exit 0. **Never** run root `npm run build` on a work branch: it rewrites the root `index.html`/`assets/` that Pages serves |
| Go | `cd apps/server && gofmt -l . && go vet ./... && go test -race ./...` | no gofmt output; all packages ok (46 top-level tests). Also with `GOTOOLCHAIN=go1.23.2` |
| ID not in Go | `grep -rl 1ST9ThXZQ7PaRpl apps/server --include=*.go` | no output |
| Browser e2e | `PLAYWRIGHT_FROM=<dir with playwright> npm run e2e:sheets` | 22/22 (local relay and fake Sheet only) |
| Relay | `curl -s https://lfps-substitutions-manager.onrender.com/api/v1/health` | `healthy`, version = live version |
| Site | open https://steph1420.github.io/LFPS_Substitutions_Manager/ | loads; footer shows the version; header pill (Live / Connecting… / Offline) |

Playwright isn't a repo dependency: `mkdir ~/pw && cd ~/pw && npm i playwright && npx playwright install --with-deps chromium`.

When all of A1–A8 pass, tell the user in a short summary, then ask what they'd like next. Don't start the release on your own.

---

## Part B. Project state

The docs index is **`docs/README.md`**; start there. The source code is the ground truth, and doc contradictions are tracked in `docs/DOC_ISSUES.md`. The key docs:
- `docs/SAS.md`: architecture, verified against the code;
- `CHANGELOG.md`;
- `docs/VERSIONING.md`;
- `TODO.md`: bundle plan and IDs;
- `BUGS.md`;
- `docs/DECISIONS/` (ADR-0001…0005);
- `docs/WORKFLOW.md`;
- `docs/SHEETS_SETUP.md`, `docs/RENDER_SETUP.md`, `docs/ADMIN_ACCESS.md`;
- `docs/RELEASE_2.0.0-alpha.3.md`;
- `DESIGN_PHILOSOPHY.md`.

### B1. Architecture (short)

- **Monorepo** (npm workspaces):
  - `packages/core`: TypeScript domain logic (solver, calendar/IST, access);
  - `packages/ui`: design tokens;
  - `apps/web`: React 19, Vite 6, Tailwind v4, Zustand, PWA; tests in `apps/web/test`, e2e in `apps/web/e2e`;
  - `apps/server`: Go module `lfps/server`, the relay and Sheets bridge; tools in `apps/server/cmd/sheetcheck`.
- **Google Sheets is the source of truth** (ADR-0005). **The Render server is a live relay, not storage.** It keeps the active school week in memory, has no disk and no database, and fans changes out to devices over one WebSocket per tab.
- **Local-first:** each browser keeps a date-scoped copy in `localStorage`, so the front desk always works offline. Edits queue in an outbox and sync when connected. Conflicts are per-entity last-writer-wins.
- **Sheets bridge (relay side):**
  - **Writes only app-owned tabs**: `Subs` (one row per substitution, schema 2, deletions kept as `REMOVED` tombstone rows, never deleted) and `App_Meta` (plus `App_Log` only with `SHEETS_LOG=1`). An allowlist enforces this.
  - **Reads the owner tabs** (one `batchGet`) at start and every 5 min, and streams them to devices, which apply Staff Directory, the per-teacher routine tabs and Subjects List. Precedence: local date-scoped edits > Sheet > bundled seed.
  - **On restart** it reloads the week's substitutions from `Subs` before letting devices in (`/health` `store: hydrating`, then `ready`).
  - **Without credentials** it runs `relay-only`.
- **Owner tabs are strictly read-only** for the app and for you: never write to, unhide, rename, reorder or reprotect them. The hidden tab **`_DB_Helper`** is the owner's; it is never read (hidden tabs are skipped). **Legacy tabs** `Daily_Ledger` and `Baseline_Updates`, made by the old v1 app, stay **untouched** until the user decides.
- **In-app timetable edits are date-scoped substitutions.** They never change the master timetable. Editing the master timetable is a future epic (EPIC-01).
- **IST:** Render can't set a time zone, so both client and server compute school time as Asia/Kolkata in code (`schooltz`, core `calendar`). Tests run under several device zones.
- **Admin hierarchy** (FEAT-68, 34a): the **Principal, Academic Coordinator (AC), Asst. Academic Coordinator (AAC) and today's Officiating AC** are admins.
  - Signing in as one of them in **Staff Login** needs the **6-digit passcode**, with an escalating lockout. Admin unlocks editing.
  - The front desk is the default role and **never hits a login wall**: it can always view, and record what every role may.
  - **Developer Options** (tap Build Info 5×) has a device-local switch, **"Edit without login"**, that unlocks editing with nobody signed in (amber "Editing unlocked" badge).
  - There is no server-side auth yet (SEC-02). The client gate is an interim measure (SEC-01).
- **Relay guard** (35a): dev and test builds can't target the production relay. Prod URLs live only in `apps/web/.env.production`. `vite.config.ts` and `sync/live.ts` refuse a prod URL outside a production build (override: `VITE_ALLOW_PROD_RELAY=1`), and `npm run build:web:local` builds for a loopback relay and checks the bundle.
- **Version** is single-sourced in the root `package.json` (`npm run version:sync`, `version:check` in `npm test`), shown in the header, the footer and Settings → Build Info, and returned by `/health`.

### B2. Branches, commits, tags (2026-10-24)

| Ref | Head | Where | What |
|---|---|---|---|
| `main` | `5c1b418` | pushed | Legacy v1 line. **Never touch** |
| `next-gen` | `362d887` | pushed | **Live** (Pages + Render): `v2.0.0-alpha.2` build |
| `refine/jb31` | `22aff51` | local only | Old docs branch; already contained in `next-gen` |
| `bundle/34` | `30b0f1f` | pushed | Bundle 34 + BUG-31 ops note (one commit beyond `next-gen`) |
| `bundle/34a` | `e72ea8e` | **local only** | Admin hierarchy / Edit without login: `77d68e1`, `e34c0fe`, `d522792`, `e72ea8e` |
| `bundle/35` | `5bcb55d` | **local only** | Live sync + Sheets bridge + CI + `render.yaml`: `202b2bc` `55c6035` `22a7c20` `fae689f` `ef32283` `2d1e494` `717fa89` `230ad60` `5bcb55d` |
| `bundle/35a` | `fd573b5` | **local only** | Sync gaps closed: `0c0df12` `470613c` `f038ca3` `d0199e3` `c404faf` `8f89ed2` `e4ddd65` `355ce42` `fd573b5` |
| `handover/2026-10-24` | (this file) | **local only** | `bundle/35a` + `HANDOVER.md` |
| `origin/test` | `9e99a64` | remote only | "Add files via upload". Unknown purpose; leave it alone |
| tag `v2.0.0-alpha.2` | → `362d887` | pushed | Release |
| tag `rollback/pre-v2.0.0-alpha.2` | → `19c1a1a` | pushed | Rollback point before alpha.2 |

Each bundle branch contains the previous one (34 → 34a → 35 → 35a), and all contain `next-gen`, so merging `bundle/35a` into `next-gen` has no conflicts.

A **dangling commit `532576e`** existed on the old computer and contained the passcode digits. It is not on any branch and is **not** in the handover bundle. If you ever see it, never push it.

### B3. Bundle history

- **≤ 33:** v1 legacy (`main`), then the v2 monorepo on `next-gen` (`2.0.0-alpha.1`).
- **34 (live, alpha.2, 2026-10-24):**
  - reload-safe local persistence (FEAT-62 part 1);
  - stateless relay hardening (BUG-24…28);
  - Front Desk by default plus the 6-digit admin passcode with lockout;
  - visible footer version, single-source versioning;
  - IST on client and server.
- **34a (owner's "34.1", unreleased):** admin hierarchy, admin login at Staff Login, one permission helper `resolveAccess()`, Dev Options "Edit without login".
- **35 (unreleased):** cross-device live sync over the relay (FEAT-62 part 2, BUG-25, BUG-32), Sheets bridge writing `Subs`/`App_Meta` (FEAT-65), "Connecting…" state (FEAT-66), `sheetcheck`, `render.yaml` with the `checksPass` deploy gate, and a CI workflow.
- **35a (unreleased):** devices apply Sheet data (FEAT-62 part 3); `Subs` schema 2 with tombstones and restart reload (BUG-33); relay guard (BUG-34); one-read pulls; e2e test; docs and runbook.
- **Real Sheet check (2026-10-24):** `sheetcheck -selftest` passed twice. `Subs` is upgraded to schema 2 and empty (header only); `App_Meta` has 8 rows; no other tab changed. Production is unaffected.

**Test counts (bundle/35a):** core 35, web 73, Go 46 top-level (`-race`, also on Go 1.23.2), e2e 22 checks.

### B4. Pending release: v2.0.0-alpha.3

Fully prepared, **not executed**: `docs/RELEASE_2.0.0-alpha.3.md`. The order:
1. Back up.
2. Merge `bundle/35a` into `next-gen` (`--no-ff`).
3. Run `version:sync` to `2.0.0-alpha.3`, and move the CHANGELOG `[Unreleased]` entries into the new section.
4. Run the root `npm run build` **with** the admin hash in `.env.local`, check the bundle, and prune stale `assets/`.
5. Create the tags `rollback/pre-v2.0.0-alpha.3` (on `362d887`) and `v2.0.0-alpha.3`.
6. The owner does the Render steps (A5) **before** the push.
7. Push. Client and relay go live together: the protocol is not compatible with alpha.2.
8. Verify health `mode=sheets` / `store=ready` / `sheets=ok` and do a two-device check.
9. If needed, roll back both together; see the runbook.

**This needs the user's explicit "go".**

### B5. Open owner decisions (recommendations in `docs/SHEETS_SETUP.md` §5)

1. **Principal row in Staff Directory:** add a row with Role `Principal` so Staff Login names the Principal. Without it, Staff Login offers the Principal by designation only.
2. **Legacy tabs** `Daily_Ledger` / `Baseline_Updates`. Options: A retire them (keep as history), B migrate past rows into `Subs`, C reuse them (not recommended). The recommendation is A, plus B if history is wanted.
3. **Protect the app tabs** (`sheetcheck -protect` adds protections to the app tabs only, so only the service account and the file owner can edit them; reversible in Data → Protect sheets and ranges). Proposed, not applied.
4. **Remove the service account from the owner tabs' protections.** It's listed as an editor there today. The code never writes there, but removing it makes Google enforce the rule too. Owner-only, manual: **Data → Protect sheets and ranges**.
5. **Publish-to-web privacy:** the published `2PACX` link is public and includes staff data. Consider unpublishing it, since the relay reads through the API. **Sharing:** if the Sheet's **Share → General access** was widened during setup, set it back to **Restricted**. The service account keeps its explicit Editor access, so the relay still works.
6. **`DEVELOPER_GUIDE.md`:** owner-controlled and stale in places (see `docs/DOC_ISSUES.md`). Update it only if the user asks.
7. The branch model in `docs/WORKFLOW.md` §3 vs the older guide (DI-07): the user follows "new branch per bundle", but the docs still ask for confirmation.

### B6. Later bundles (see the plan table at the top of `TODO.md`)

- **36:** CI-built Pages (no committed assets), branch previews at `/preview/<branch>/` with a footer badge (FEAT-64), full ARCH-05/02 adoption. The `checksPass` gate and CI already landed in 35.
- **37:** header/grid motion: UI-10, BUG-29 (header jitter), BUG-30 (name-column collapse jitter). Both bugs are reported but not yet reproduced.
- **38:** server-side auth for admin writes (SEC-02), docs reconciliation (ARCH-03), codebase audit (ARCH-04).
- **Deferred by the owner:** FEAT-67 (lockout settings in Dev Options), SEC-03 (separate Dev Options passcode).
- **Not scheduled:** EPIC-01 (master timetable editing), PERF-03 (keep-warm, handled by the pinger).

### B7. Known limits (from 35a)

- **Restart reload:**
  - Only substitutions for the **current week** come back. Other entities (absences, availability, Off. AC/CT, routine edits) are refilled by devices, so a long-offline device could bring one of their deletions back.
  - Schema-1 `Subs` rows have no version and are skipped.
  - Payloads over 45k characters aren't reloaded.
  - If Sheets is slow, the relay opens degraded after 20 s.
- **Sheet mapping:** OVERVIEW, the class tabs and the legacy tabs aren't mapped. Sheet subject names aren't shown yet. New staff get default fields.
- **Other:**
  - Undo history isn't rewritten for remote changes.
  - Sheets quota is 60 reads/min.
  - Playwright isn't a repo dependency.
  - There's no socket auth (SEC-02).
  - The web JS chunk is over 500 kB.
  - The old Vitest has 3 npm-audit advisories.

### B8. Leak check before every commit

The old computer ran this before every commit. Recreate it (it holds no secrets; it reads them from the env and `.env.local`) at `~/leakcheck.sh`, outside the repo:

```bash
#!/bin/bash
# Checks staged changes for secrets without printing them. Exit 0 clean, 1 hit, 2 not checked.
cd "${LFPS_REPO:-$HOME/work/LFPS_Substitutions_Manager}" || exit 2
H=$(sed -n 's/^VITE_ADMIN_PASSCODE_SHA256=//p' apps/web/.env.local 2>/dev/null | tr -d '"'"'"' \r')
J(){ python3 -c 'import json,os,sys;print(json.loads(os.environ.get("LFPS_SHEETS_SA_JSON","{}")).get(sys.argv[1],""))' "$1" 2>/dev/null; }
PKID=$(J private_key_id); CEM=$(J client_email); DOM=${CEM#*@}
[ -n "$LFPS_ADMIN_PASSCODE" ] && [ -n "$H" ] && [ -n "$PKID" ] && [ -n "$CEM" ] || { echo "leakcheck: missing a needle (not checked)"; exit 2; }
D=$(git diff --cached); hit=0
PK="BEGIN PRIVATE"; PK="$PK KEY"   # built in two parts so this doc never contains the marker itself
for n in "$LFPS_ADMIN_PASSCODE" "$H" "$PKID" "$CEM" "$DOM" "$PK"; do
  printf '%s' "$D" | grep -q -F -- "$n" && hit=1
done
[ $hit = 0 ] && echo "leakcheck: clean ($(git diff --cached --name-only | wc -l) files)" || { echo "leakcheck: HIT"; exit 1; }
```

Run `bash ~/leakcheck.sh` after `git add` and before every `git commit`. On a hit, locate it by printing only the needle number, file and line numbers, never the value. The service-account domain may appear in a report to the user, but never in docs.

**One expected exception:** the release build commit (B4 step 4) puts the admin **hash** into `assets/index-*.js`. That's by design: the client-side gate compares against it (SEC-01, see `docs/ADMIN_ACCESS.md`), and the live alpha.2 asset already contains it. For that commit only, check the staged diff **excluding** `assets/` and `index.html` (`git diff --cached -- . ':!assets' ':!index.html'`) and confirm the passcode itself appears nowhere. The hash must never appear in source, docs or `.env*` files. The real fix is server-side auth (SEC-02).

---

## Part C. How to work with this user (the working psychology)

These are firm principles. Each has a reason; keep the reason in mind when a situation isn't covered.

1. **Safety first.** Before **any** refinement, make a tarball backup in `_backups/` (`tar -czf _backups/LFPS_pre-<task>_<UTC ts>.tar.gz --exclude=node_modules --exclude=./_backups -C <repo> .`) and create a **new branch** for the work. Never touch `main`. Create a rollback tag before every release. No force-push, no history rewrite, and no rollback without the user's explicit approval.
   *Why:* this is a school's live front-desk tool, run by a non-developer. A bad change must always be one step away from undone, and the user has made backups a hard rule.
2. **Plan before doing.** Propose work as **numbered job bundles** sized to what you can really finish and verify in one go. Wait for approval before implementing. If a bundle grows, split it (34 → 34a, 35 → 35a) rather than overreach.
   *Why:* the user wants to steer scope and reads the plan to decide. Half-finished big bundles are worse than small finished ones.
3. **Nothing goes live and nothing is pushed** without the user's explicit "go" for that specific release. Prepared is not approved. A past "go live" doesn't cover the next bundle.
   *Why:* a push to `next-gen` deploys Pages and Render at once, and the school uses it during the day.
4. **Verify, don't assume.** Run the tests, builds, real health checks and browser checks before you say "done", and report real numbers (e.g. "web 73/73"). Never fabricate a result. If something wasn't run, say so.
   *Why:* the user can't easily check the code themselves. Your report *is* their evidence.
5. **Own mistakes plainly.** When earlier advice was wrong, say so in one line, correct it, and log it with an ID. Example: the pinger was set up with GET, it failed "output too large", and the right answer was HEAD (BUG-31). Another example: a local browser test once pointed at the production relay, so a guard was added (BUG-34).
   *Why:* trust comes from candour, and a logged mistake isn't repeated by the next person.
6. **Respect the user's data.** The Google Sheet is theirs. The app writes **only** its own tabs (`Subs`, `App_Meta`, optional `App_Log`). Never write to, unhide, rename, reorder or reprotect owner tabs; never read the hidden one unless genuinely needed (then report its name and purpose, no personal data). Propose protection changes; don't apply them. Keep teacher names and personal data out of reports and docs.
   *Why:* the Sheet is the school's record; the app is a guest in it.
7. **Secrets.**
   - Secrets come only through **masked fields**, as env vars.
   - Never print, log or commit the passcode, its hash, or the key (or any field of it).
   - Key files go outside the repo, chmod 600, and are deleted after use.
   - Run the leak check before every commit.
   - If a secret ever lands in git history, **stop and purge it before any push**, with the user's approval for the rewrite.

   *Why:* the repo and Pages site are public.
8. **Documentation discipline.** With every change, keep the full suite current: SAS, CHANGELOG `[Unreleased]`, SemVer/VERSIONING, TODO, BUGS, ADRs, DOC_ISSUES, so any developer could take over. Give every issue an ID (BUG-, FEAT-, SEC-, ARCH-, UI-, PERF-, EPIC-; next free BUG is **BUG-35**). Don't silently rewrite history in docs; record contradictions as `DI-xx`. **`DEVELOPER_GUIDE.md` is changed only when the user asks.** End every report by reminding the user to decide whether it should be updated.
   *Why:* the user explicitly wants a professional, hand-over-able project; this file exists because of that.
9. **Version:** single-sourced, bumped once per shipped bundle (`-alpha.N`), and visible in the site footer.
   *Why:* the user wants to know at a glance which version they're looking at.
10. **Explain infra and deploy consequences plainly**, with **exact UI locations** (e.g. "Render → service → Environment → Secret Files"). Give manual steps as short numbered lists, one action per step.
    *Why:* the user does the Dashboard clicks themselves and isn't an ops engineer.
11. **Decisions:** offer one clear **recommended** option plus the alternatives, with the trade-off in a line each. Don't pad.
    *Why:* the user decides quickly when the recommendation is clear.
12. **Communication:** warm, plain and short. During long work, **send progress updates**. The user once had to ask "Everything okay?" after a long silence; avoid that. Reports: what was done, real check results, what's left, and what needs their decision.
13. **Practical defaults:**
    - The front desk must **never be blocked** (offline-first, no login wall).
    - Protect against accidents: guards, confirmations, reversible changes.
    - Prefer simple, reversible solutions over clever ones.
    - The school runs on **IST**.
    - Follow `DESIGN_PHILOSOPHY.md`: no hacks; Apple-HIG-like springs; animate only transform/opacity; "Off. CT" terminology; 2–4 word microcopy.
14. **Builds:** don't run the root `npm run build` on work branches (use `npm run build:web` or a scratch clone). Every local browser test must target a **local** relay (`npm run build:web:local`).

---

*Prepared 2026-10-24 by the previous assistant from `bundle/35a` @ `fd573b5`. If anything here disagrees with the code or the docs, the code wins; log the difference in `docs/DOC_ISSUES.md`.*

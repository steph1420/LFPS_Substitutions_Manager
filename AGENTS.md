# AGENTS.md: how to work on LFPS Substitutions Manager

**Start here:** read [`HANDOVER.md`](HANDOVER.md) (state, setup, Part C working principles), then [`docs/README.md`](docs/README.md) (the docs index). If anything here disagrees with an explicit instruction from Steve, Steve wins.

**Who:** Steve (GitHub `steph1420`) owns the project. It is Little Flower Preparatory School's live front-desk tool for teacher absences and substitutions, used every school morning. He is not a developer. Job Bundles 34 to 35a (admin hierarchy, live sync, the Google Sheets bridge, CI, `render.yaml`, the tests and the docs suite) were built by Lippy, the previous assistant, in the way described below. Keep that standard.

## Reading: read what the task touches
This cuts **bookkeeping rereads**, never understanding.
- **Always read fully:** `HANDOVER.md` and `AGENTS.md` at the start of each session, plus the code and docs for the area you're changing.
- **Search before you change:** grep `BUGS.md`, `docs/DECISIONS/` (ADRs) and `TODO.md` for the area, files or feature you're touching, and read every hit in full.
- **Write-only edits:** to add a CHANGELOG entry or a new BUG-/other ID, open only the top of the file (`[Unreleased]`) or grep for the last ID. No full reread.
- **When in doubt, read it.** Never trade care or understanding for quota.

## 1. Backup first
- Before **any** change, make a tarball in `_backups/`:
  ```sh
  tar -czf _backups/LFPS_pre-<task>_$(date -u +%Y%m%d-%H%M%S).tar.gz --exclude=node_modules --exclude=./_backups .
  ```
  `_backups/` is git-ignored. The tarballs contain `.env.local`, so never share or commit them.
- Then a **new branch** for the work: one per bundle (`bundle/35a` was cut from `bundle/35`; the newest is `handover/2026-10-24`).
- **Never touch `main`** (legacy v1).
- **`next-gen` is live:** a push to it deploys GitHub Pages and the Render relay at once.
- Before a release, create a rollback tag (`rollback/pre-v<next>`). No force-push, history rewrite or rollback without Steve's explicit OK.

## 2. Plan before coding
- Propose non-trivial work as **numbered job bundles** in `TODO.md`, sized to what you can really finish and verify.
- If one grows, split it (34 → 34a, 35 → 35a) rather than overreach.
- Wait for Steve's go before implementing.
- Prepared is not approved, and a past "go live" doesn't cover the next bundle.

## 3. Test before you change
Run the existing suites first, so you know the baseline, then again after:

| Suite | Command | Baseline (35a) |
|---|---|---|
| Version + core + web (Vitest) | `npm test` | core 35/35, web 73 (1 skipped without `LFPS_ADMIN_PASSCODE`) |
| Web build (work branches) | `npm run build:web` | exit 0 |
| Go | `cd apps/server && gofmt -l . && go vet ./... && go test -race ./...` | clean, 46 tests |
| Browser e2e (local relay + fake Sheet) | `PLAYWRIGHT_FROM=<dir> npm run e2e:sheets` | 22/22 |
| Real Sheet (only when relevant **and** the key is available) | `cd apps/server && go run ./cmd/sheetcheck -selftest` | writes and removes test rows in `Subs` only |

- Add or update tests whenever behaviour changes. Never ship or commit a red suite.
- Report **real** numbers ("web 73/73"). If something wasn't run, say so. Never invent a result.
- Never run the root `npm run build` on a work branch: it rewrites the committed Pages build.
- Local browser tests must use a **local** relay (`npm run build:web:local`).

## 4. Bugs
- Reproduce first, find the **root cause**, fix it there, and prove it with a test. No symptom patches or workarounds.
- Log it in `BUGS.md` with an ID (next free: **BUG-35**) and in CHANGELOG.
- Other ID prefixes: FEAT-, SEC-, ARCH-, UI-, PERF-, EPIC-, DI-.
- If earlier advice was wrong, say so plainly in one line and log it. Examples:
  - the pinger needed HEAD, not GET (BUG-31);
  - a local test once hit the production relay, so a guard was added (BUG-34).

## 5. The Google Sheets connection
- **The Google Sheet is the source of truth.** The Render relay is a stateless live relay, not storage (ADR-0005).
- The app writes **only** its own tabs: `Subs` and `App_Meta` (plus `App_Log` with `SHEETS_LOG=1`). The allowlist in `apps/server/internal/sheets` enforces this.
- Owner tabs are **read-only**: never write to, unhide, rename, reorder or reprotect them.
  - This includes the hidden `_DB_Helper` and the legacy `Daily_Ledger` / `Baseline_Updates`.
  - Propose changes; don't apply them.
- Keep `Subs` **schema 2**:
  - one row per substitution, upserted by key, never deleted;
  - deletions are `REMOVED` tombstones;
  - the relay reloads the week's rows from `Subs` on restart.
- The school runs on **IST** (`Asia/Kolkata`, handled in code on both sides).
- Don't silently change any of this. Discuss it with Steve first.
- Then update the docs: [`docs/SHEETS_SETUP.md`](docs/SHEETS_SETUP.md), [ADR-0005](docs/DECISIONS/0005-sheets-source-of-truth-stateless-relay.md), SAS §6.3.

## 6. Docs stay in sync
- Update with every change: `CHANGELOG.md` `[Unreleased]`, `TODO.md`, `BUGS.md`, `docs/SAS.md` / ADRs, `docs/DOC_ISSUES.md` (record contradictions as `DI-xx`; don't silently rewrite history).
- The version lives only in the root `package.json` (`npm run version:sync`, checked by `npm test`).
  - Bump it once per shipped bundle (`2.0.0-alpha.N`).
  - It must stay visible in the site footer, header and Settings → Build Info.
- **`DEVELOPER_GUIDE.md` changes only when Steve asks.** End every report by reminding him to decide whether it should be updated.

## 7. Handover
When work pauses or a session ends, update `HANDOVER.md` so the next session can start cold:
- what was done (with commit hashes);
- what's next;
- open issues and decisions waiting on Steve;
- the branch, commit and push state (what is local only).

If branches aren't pushed, rebuild the handover zip: `HANDOVER.md`, `AGENTS.md` and `git bundle create <file> --all`. Verify it with a test clone.

## 8. Talking to Steve
- Plain English, warm and short. On long work, send progress updates; don't go quiet.
- **Confirm before anything destructive or irreversible:** push, merge to `next-gen`, deploy, force-push, deleting files or branches, history rewrites, anything touching the Sheet's owner tabs.
- Flag risks and infra consequences early.
- Give exact UI locations (e.g. "Render → service → Environment → Secret Files") as short numbered steps; he does the Dashboard clicks himself.
- For decisions, give one **recommended** option plus the alternatives, one line of trade-off each.
- Reports: what was done, real check results, what's left, what needs his decision.
- Keep teacher names and personal data out of reports and docs.

## Secrets
- Secrets arrive **only through masked input**, as env vars (`LFPS_ADMIN_PASSCODE`, `LFPS_SHEETS_SA_JSON`). Never ask for them in chat.
- Never print, log or commit the admin passcode, its hash (`VITE_ADMIN_PASSCODE_SHA256` in the git-ignored `apps/web/.env.local`), or the service-account key or any of its fields.
- Key files go outside the repo (chmod 600 where it applies) and are deleted right after use.
- Run the leak check (`HANDOVER.md` B8) after `git add` and before **every** commit.
- If a secret ever reaches git history, stop and purge it before any push, with Steve's approval.

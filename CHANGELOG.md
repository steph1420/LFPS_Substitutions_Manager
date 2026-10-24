# Changelog

All notable changes to the **Little Flower Preparatory School (LFPS) Substitutions Manager & Front Desk PWA** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Bundle 36] — 2026-10-24 (FEAT-64 / ARCH-05 rest)

> GitHub Actions builds the Pages site; branch previews under `/preview/<slug>/`. **Owner cutover** (secret + Pages source + `PAGES_ACTIONS_DEPLOY`) is required before Actions publishes — until then committed root assets keep the live site up. Guide: [`docs/PAGES_SETUP.md`](docs/PAGES_SETUP.md).

- **`pages.yml`**: on push to `next-gen` / `bundle/**` / `preview/**` and `workflow_dispatch`; builds root from `next-gen`, previews into `preview/<slug>/`, listing page; `actions/upload-pages-artifact` + `deploy-pages` when `PAGES_ACTIONS_DEPLOY=true`.
- **`ci.yml`**: also runs on `bundle/**` and `preview/**` (Render still gates on `next-gen` checks only).
- **Preview channel (FEAT-64)**: `VITE_BUILD_CHANNEL=preview`, footer/header badge, scoped `localStorage` keys, loopback relay (no production Sheets).
- **Docs**: `docs/PAGES_SETUP.md` cutover clicks; ADR-0006. Root `index.html`/`assets/` **not** deleted in this bundle.
- **Not in this bundle**: SEC-02/03 (38b); deleting committed root assets (optional after cutover).

## [Unreleased]

### Fixed
- **UI-12 (Bundle 39)**: Day-theme contrast — semantic `text-ink` / `bg-surface-*` / soft chip tokens; bare `text-white` remapped to ink on light families; `*-950` chips softened; Settings / Staff Login / Midnight modal surfaces tokenized.
- **FIND-05 (Bundle 39)**: Sync pill shows **Sheets error** / **Loading sheet…** when the bridge exposes it; tap opens Settings → Cloud.
- Front Desk copy: Off. CT tooltips, Brain Studio → Auto-Resolve, KPI “ALERT 0” honesty, friendlier empty states; remaining ticket IDs scrubbed from titles.
- A11y: focus-visible rings, larger header icon hit targets, `prefers-reduced-motion` on tab fades.
- **UI-11 (Bundle 38a)**: Routine matrix uses `table-layout: fixed`, reserved row height, and a directory-based min shell height so SAT / Hide Absent no longer collapses the card frame.
- **FIND-01 (Bundle 38a)**: Replaced infinite Tailwind `animate-pulse` on Live/Connecting dots and badges with static status-dot classes; honor `prefers-reduced-motion` for attention / look-at-me animations.
- **FIND-03 (Bundle 38a)**: Removed dead Target Cell Halo Pulse Developer Option (and color palette) — toggle had no runtime effect.
- **FIND-04 (Bundle 38a)**: Routine sticky absent name cell uses the same left-rail / no-bloom treatment as roster cards (UI-06 parity).
- **FIND-09 (Bundle 38a)**: Substitutions Overview / Off. CT appoint affordances quieted (no infinite pulse; quieter appoint chrome).
- **FIND-10 (Bundle 38a)**: Amber first-view look-at-me on compact roster card and list variants.
- **FIND-11 (Bundle 38a)**: Auto-filter Absent resets on Mark Present / Mark All Present, shows **Show all**, and uncovered chip opens Substitutions.
- Settings preference labels: removed FEAT-/BUG- ticket IDs from user-visible strings. Footer padding/theme so the dock does not cover the version line.
- **BUG-29 / UI-10 (Bundle 37)**: Header FULL↔PILL jitter — fix-only; Dev Options A/B container vs thresholds.
- **BUG-30 (Bundle 37)**: Routine name-column collapse jitter — fix-only.
- **UI-06 (Bundle 37)**: Absent card/row rail rewrite; quieter Off. CT Appoint; one-shot CSS attention pulses.

### Added
- **FEAT-70 (Bundle 38a)**: Dev Options day load mode — **(A) Follow school day** (default; snaps on load + tab visibility) vs **(B) Free pick** (remembers last MON–SAT on device). Today marker on day chips; date subtitle in free mode.
- **FEAT-69 (Bundle 37)**: Device-local Dev Options (`lfps_dev_ui_prefs_v1`): Header scroll mode, Auto-filter Absent, Needs attention strip.
- Assessment: [`docs/ASSESSMENT_2026-10-24.md`](docs/ASSESSMENT_2026-10-24.md).

### Planned
- **Bundle 38b**: SEC-02, SEC-03, per-admin design spike, ARCH-03 docs, BUG-31 HEAD reminder.
- **Bundle 36**: CI builds Pages; stop committing root assets (FEAT-64).
- **Deferred**: FEAT-67 lockout settings; per-admin passcodes / role privileges (after 38b).


## [v2.0.0-alpha.3] - 2026-10-24

> Job Bundles **34a** + **35** + **35a** (via `handover/2026-10-24`, which includes `bundle/35a`). **Live on `next-gen` / GitHub Pages + Render** (go-live 2026-10-24) (Pages + Render together). Rollback point: tag `rollback/pre-v2.0.0-alpha.3` → `362d887` (`v2.0.0-alpha.2`). Runbook: [`docs/RELEASE_2.0.0-alpha.3.md`](docs/RELEASE_2.0.0-alpha.3.md).
> Wire protocol changed vs alpha.2: client and relay must ship together for sync (SAS §6.3).

### Added
- **Live sync across devices (FEAT-62 part 2, BUG-25, Job Bundle 35)**: Absences, availabilities, substitutions, displaced slots, Off. AC / Off. CT appointments and dated routine edits now sync through the relay over one WebSocket. On connect a device sends `HELLO` and gets `HYDRATE` (the relay's current week). Edits go out as small per-entity changes (`STATE_MUTATION`, acknowledged, broadcast to the other devices). Conflicts resolve per entity, last writer wins. Edits made while offline queue in the tab and go out on reconnect. A relay that restarted empty is refilled by the devices.
- **"Connecting…" state (FEAT-66)**: The header pill shows **Live**, **Connecting…** (amber, gentle pulse) or **Offline**. A sleeping Render relay takes about a minute to wake; that stays Connecting…, and the app is fully usable from local data meanwhile. Offline means no network, or still failing after 90 s. The hover text shows queued changes. Reconnects back off from 1 s to 30 s with jitter, and retry at once when the network returns or the window regains focus.
- **Google Sheets bridge (FEAT-65)**: With credentials set, the relay writes substitutions to the app's own `Subs` tab and its state to `App_Meta` (optional `App_Log` with `SHEETS_LOG=1`). Writes are debounced, batched and retried with backoff, and never block devices. It pulls the owner's read-only tabs at startup and every 5 min and streams them to devices (`SHEETS_SNAPSHOT`; applied on devices since JB35a). An allowlist guard means the relay can write **only** to app-owned tabs; it refuses a foreign tab that has an app tab's name, and never reads hidden tabs. Without credentials it runs **relay-only**.
- **`sheetcheck` tool** (`apps/server/cmd/sheetcheck`): lists the Sheet's tabs and protections read-only; `-ensure` creates the app tabs; `-protect` (not run) would add warning-only protection to them.
- **`render.yaml` Blueprint (FEAT-63, ARCH-06)**: Docker web service on `next-gen`, health check `/api/v1/health`, deploys only after CI checks pass (`autoDeployTrigger: checksPass`), and env var names (the service-account key is a Secret File). Owner guide: `docs/RENDER_SETUP.md`.
- **CI workflow (part of ARCH-05)**: `.github/workflows/ci.yml` on push/PR to `next-gen`: gofmt, `go vet`, `go test -race`, a check that the spreadsheet ID isn't in Go code, `npm ci`, `npm run build:web`, `npm test`.
- **Devices apply the Sheet (FEAT-62 part 3, JB35a)**: Staff Directory, the per-teacher routine tabs and Subjects List now replace the bundled directory and routine on every device. Local date-scoped edits win over the Sheet, and the Sheet over the bundled data, so an edit in progress is never overwritten. A snapshot applies only when its data version is new; it is cached for reloads and followed by other tabs. Settings → Build Info shows **Sheet data `<version>` · `<time>`**. Cells the app can't read safely keep the bundled value and are reported in Developer Options.
- **Deletions survive a relay restart (BUG-33, JB35a)**: in sheets mode the relay reloads the week's substitutions and deletions from `Subs` before letting devices in (`/health` `store: hydrating`, then `ready`; `SHEETS_HYDRATE_TIMEOUT`, default 20 s). A device that missed a deletion can no longer bring the substitution back.
- **`sheetcheck -selftest` / `-clean` (JB35a)**: writes, reloads, deletes and removes test rows in `Subs` on the real Sheet, and checks that no other tab changed.
- **Relay guard (BUG-34, JB35a)**: dev servers and test builds refuse a production relay URL (`VITE_ALLOW_PROD_RELAY=1` to override on purpose); `npm run build:web:local` builds for a loopback relay and checks the bundle.
- **End-to-end test (JB35a)**: `npm run e2e:sheets`: two browsers and a fresh third against a local relay in sheets mode with a fake Sheet (`SHEETS_FAKE_FILE`), restart mid-test.
- **Admin Hierarchy at Staff Login (FEAT-68, Job Bundle 34a)**: The Principal, the Academic Coordinator, the Asst. Academic Coordinator and **today's** Officiating AC are the admins. In Staff Login they are tagged "Admin" (or "Off. AC today"). Choosing one asks for the 6-digit admin passcode (same keypad and lockout), and success turns on editing in that tab for that person. Everyone else is still identified at a tap. Log Out, or choosing another name, ends admin. An Off. AC is an admin only on the day the appointment is in force. `@lfps/core` adds `adminOfficeFor()` and the `'Principal'` staff role. The school data names no Principal, so Staff Login offers the Principal **by designation**; a Staff Directory row with Role `Principal` replaces it automatically.
- **Dev Options → "Edit without login" (FEAT-68)**: A device-local switch (`localStorage`, never synced) that allows editing with nobody logged in. While it is on, the header shows an amber **Editing unlocked** badge, and Settings → Admin Access offers **Turn off**. Developer Options themselves still need an admin login (until SEC-03). See the risks in `docs/ADMIN_ACCESS.md`.

### Changed
- **One sign-in place (FEAT-68)**: The separate Settings → Admin Access keypad is folded into Staff Login. The Admin Access panel shows who is signed in as admin, with Log Out, or an "Admin login" button that opens Staff Login. The Settings "I am…" picker is replaced by a **Staff Login** button (this also fixes its overflow at phone width).
- **One permission helper (FEAT-68)**: `apps/web/src/lib/access.ts` `resolveAccess()` now decides every admin-gated action and screen (store guards, `usePermissions`, `PermissionGuard`, Developer Options). Admin sessions are tied to the identity that entered the passcode (`lfps_admin_session_v2`); sessions from before 34a are ignored, so admins sign in once more.
- The lockout countdown is announced to screen readers (`role="status"`).
- **Health reports the mode (JB35)**: `/api/v1/health` adds `mode` (`sheets` or `relay-only`) and, in sheets mode, `sheets` (`starting`, `ok` or `error`). It stays small and does no I/O.
- **Settings → "Cloud Synchronization & Health" (JB35)**: real diagnostics: phase, mode, Sheets state, devices online, queued changes, last sync, and Reconnect.
- `useLiveSync()` only reads the sync status now; one client per tab owns the socket.
- **`Subs` schema 2 (JB35a)**: new columns Deleted At, Version TS, Version By and Payload; a removal is a tombstone row; writing the same state twice changes nothing. A schema-1 tab is upgraded in place (its rows aren't reloaded). `App_Meta` adds `data_version` and `subs_reloaded_at`.
- **One read per pull (JB35a)**: the owner tabs are read with a single `batchGet`, well inside the Sheets read quota (60/min).
- **Production relay URLs moved (JB35a)**: `apps/web/.env` → `apps/web/.env.production`, so only the production build uses them.
- Health adds `store` (`hydrating` / `ready`); the Sheets state can read `hydrating` (JB35a).

### Removed
- **REST mutation routes (JB35)**: `POST /api/v1/absence/toggle`, `POST /api/v1/availability`, `POST /api/v1/substitutions/assign` and `DELETE /api/v1/substitutions`. Edits travel over the WebSocket only.

### Fixed
- **BUG-32 (JB35)**: Opening Settings no longer opens a second WebSocket per tab.
- **JB35a**: a change made while a Sheet snapshot arrived is now sent at once, and a batch refused with "hydrating" is re-sent after 2 s.

### Docs
- **JB35**: new `docs/RENDER_SETUP.md` (Render fields, deploy gate, env vars, verify, rollback) and `docs/SHEETS_SETUP.md` (write rules and their tests, setup, tabs found, owner decisions). SAS §2.1, §6.3 (sync protocol), §7 and §9 updated.
- **JB35a**: ADR-0005 amended (substitutions reload from `Subs` after a restart); SAS §2.1, §3.1, §6.2, §6.3, §6.5, §7, §9; SHEETS_SETUP (schema 2, self-test and its real-Sheet result, fake Sheet, limits); RENDER_SETUP (new env vars, `store`, client and relay go live together); new `docs/RELEASE_2.0.0-alpha.3.md` go-live runbook.
- **DEVELOPER_GUIDE.md updated at the owner's request (2026-10-24, branch `handover/2026-10-24`)**: rewritten to match the code and docs as of JB35a: monorepo layout and ordered builds, single-sourced version and footer, date-scoped persistence, the relay and Google Sheets bridge (`Subs` schema 2, `App_Meta`, write allowlist, rehydrate on restart), IST in code, `ALLOWED_ORIGINS`, the production-relay guard, the admin gate with `resolveAccess` and "Edit without login", env vars and `.env.local`, test commands (incl. `sheetcheck -selftest` and `e2e:sheets`), `render.yaml` and CI, the release runbook, the backup/branch rule and a new §13 docs index. Stale facts removed (disk storage, `cmd/server`, `scratch` image, teal CT colour, old spring values and scoring formula, "work on `next-gen` and push"); people named by role only. Closes the DG parts of DOC_ISSUES DI-04, DI-07, DI-09–DI-16, DI-19, DI-23–DI-25 (§E).
- **`AGENTS.md` (2026-10-24, branch `handover/2026-10-24`, Steve's request)**: new root file for AI coding agents, distilled from HANDOVER Part C and WORKFLOW: backup and branch first, plan as job bundles, test before and after (real numbers), root-cause bug fixes with IDs, Sheets rules (source of truth, write allowlist, read-only owner tabs, `Subs` schema 2, IST), docs in sync, handover notes, plain-English communication, secrets. Indexed in `docs/README.md`.
- **AGENTS.md "Reading: read what the task touches" (2026-10-24, branch `handover/2026-10-24`, Steve's request)**: new short section that cuts bookkeeping rereads, not understanding (read HANDOVER/AGENTS and the touched area fully; grep BUGS.md, ADRs and TODO.md and read every hit; write-only CHANGELOG/ID edits open just the top or grep the last ID; when in doubt, read it). Matching CHEATSHEET.md tip; HANDOVER A1 now says the zip also includes `CHEATSHEET.md`.
- **`CHEATSHEET.md` and HANDOVER zip note (2026-10-24, branch `handover/2026-10-24`, Steve's request)**: new root cheat sheet of quality-neutral quota savers for Grok Build / AFK Pilot (`/compact` at a natural break, `/context`, plan mode, one session, short fresh prompts, `AGENTS.md`/`HANDOVER.md`/`@file`, targeted asks, closing sessions), each checked against docs.x.ai/build; explicitly excludes lower effort, cheaper models and skipped tests or backups. Indexed in `docs/README.md`. HANDOVER A1 now says the zip includes `AGENTS.md`.
- **BUG-31 (ops)**: Saving responses was already off on the owner's cron-job.org job, so the fix is switching its request method to **HEAD** (job → Edit → Advanced → Request method).

---

## [v2.0.0-alpha.2] - 2026-10-24

> Job Bundle 34, branch `bundle/34` (off `refine/jb31`). **Released 2026-10-24** on the owner's approval ("Go live now"): merged into `next-gen` (GitHub Pages and Render auto-deploy from it), tag `v2.0.0-alpha.2`. Rollback point: tag `rollback/pre-v2.0.0-alpha.2` (the previous `next-gen`, `19c1a1a`).
> The 2026-10-24 follow-ups (6-digit passcode, school time zone, owner clarifications) are part of Job Bundle 34 and **keep the version at 2.0.0-alpha.2**: nothing has shipped, and VERSIONING §2.1 bumps `-alpha.N` once per bundle shipped to Pages (see VERSIONING §2.5).
> Owner direction recorded here: **Google Sheets is the source of truth; the Render server is a stateless live relay, not storage.**

### Added
- **Reload-Safe Local Persistence (FEAT-62 part 1, BUG-25 part 1, Job Bundle 34)**: Operational state now survives a reload on the same device. It is saved to `localStorage` (`lfps_operational_state`, schema v1) 250 ms after each change and flushed when the tab is hidden or closed. Saved: absences, availability/deputations, substitutions (including Accepted/Disputed), displaced slots, Off. AC / Off. CT appointments, routine edits, the active week's undo history (last 10) and notifications (14 days, max 100). Open tabs on the same device stay in step through the `storage` event.
- **Calendar-Date Scoping (Job Bundle 34)**: `@lfps/core` `calendar` maps MON–SAT to the active school week's dates (Sunday rolls to the coming week). Last week's absences no longer reappear; data older than 42 days is pruned. The app now opens on **today's** weekday and rolls over at midnight. Routine edits are stored as per-date overrides; permanent routine changes will come from Google Sheets (Bundle 35).
- **Passcode-Gated Admin (SEC-01 interim, Job Bundle 34)**: The app opens as **Front Desk**. Admin (schedule editing, solver policy, Reset Day, history purge, developer mode) requires a passcode whose SHA-256 is set at build time (`VITE_ADMIN_PASSCODE_SHA256`, `npm run admin:hash`). Session is per tab; Lock in Settings. (The passcode format and lockout were revised the next day; see the 6-digit entry below.) Staff Login is now identity only. Client-side protection only; see `docs/ADMIN_ACCESS.md` and SEC-02.
- **6-Digit Admin Passcode (SEC-01 interim, Job Bundle 34 follow-up, owner 2026-10-24)**: The admin passcode is exactly six digits, entered as six dots over a numeric keypad. It submits on the sixth digit, and a wrong code shakes the row (transform only; respects Reduce Motion). The lockout now persists per device (`lfps_admin_lockout_v1`) and escalates: 4 free misses, then 30 s, 1 min, 5 min, 15 min, then 1 h per further miss. It resets on success or after 24 h. `npm run admin:hash` accepts only six digits and refuses easy codes unless `--allow-weak`.
- **School Time Zone (ARCH-07, Job Bundle 34 follow-up)**: The calendar follows **Asia/Kolkata** on every device, whatever the device's zone: date keys, the Sunday 00:00 week switch, the midnight rollover, pruning, the Excel file name and displayed times (`@lfps/core` `SCHOOL_TIME_ZONE`, `schoolDateFor`). The server defaults to Asia/Kolkata in code (`internal/schooltz`; `APP_TZ`, then `TZ`, override it), embeds zone data (`time/tzdata`) and reports `timeZone` in `/api/v1/health`. No Render setting is needed.
- **Build Info (Job Bundle 34)**: Header shows `v2.0.0-alpha.2`; the footer and Settings show `v<version> · <commit> · <branch>` (build time on hover). Settings shows "Saved on this device · <time>".
- **Tests (Job Bundle 34)**: `@lfps/web` gets a Vitest suite (persistence 11, reload 5, access 14 = 30; one access test runs only where the owner's passcode is configured). `@lfps/core` gains 11 calendar tests (30 total), including IST rollover. Go adds `schooltz` tests and an IST week-rollover test. Go gets tests for the store, handlers, router and hub, all run under `go test -race`.
- **Version tooling (Job Bundle 34)**: `scripts/version.mjs` (`npm run version:check` / `version:sync`) keeps the root, the three workspaces and `apps/server/internal/version` on one version; `npm test` fails on a mismatch.
- **Standard Documentation Suite (Job Bundle 31 workspace, `refine/jb31`)**:
  - **Docs Index**: Added `docs/README.md`, which indexes every project document and records that `DEVELOPER_GUIDE.md` is owner-controlled and only updated on explicit request.
  - **Software Architecture Specification**: Added `docs/SAS.md`, a code-verified description of the monorepo topology, the `@lfps/core` solver and scoring, the `@lfps/ui` tokens, the web store, persistence and RBAC, the Go server API and WebSocket hub, and deployment.
  - **Versioning Policy**: Added `docs/VERSIONING.md`, which covers SemVer lockstep across workspaces, the bump procedure, CHANGELOG conventions and the ID prefixes.
  - **Bug Register**: Added `BUGS.md`, which tabulates BUG-01 to BUG-23 from `TODO.md`/`CHANGELOG.md` (ID, title, severity, status, found in, fixed in, notes).
  - **Contributor & Workflow Guides**: Added `CONTRIBUTING.md` and `docs/WORKFLOW.md`, which describe the Job Bundle cycle, backups, the branch model and the verification baseline.
  - **Architecture Decision Records**: Added `docs/DECISIONS/` with a template and ADR-0001 to ADR-0004 (monorepo with a TS core and a Go server; Zustand per-tab undo stacks; root-mounted modals for BUG-14/15; GitHub Pages served from the `next-gen` root).
  - **Documentation Issues Audit**: Added `docs/DOC_ISSUES.md`, which lists contradictions between the existing docs and the code (DI-01 to DI-22). No existing document was rewritten.
- **User-Reported Items Logged (`refine/jb31`, docs only, no code changed)**:
  - **TODO.md**: Added a new section, "🔴 OPEN — User-Reported Items". No Job Bundle number is assigned yet; the plan awaits owner approval. It contains:
    - FEAT-62: reload-safe persistence across web and server
    - FEAT-63: Render server re-provisioning
    - ARCH-02: deployment model
    - ARCH-03: resolving the docs inconsistencies in `docs/DOC_ISSUES.md`
    - ARCH-04: codebase bug and quality audit
    - UI-10: detach the header from browser toolbar hide/show
    - BUG-29: header jitter
    - BUG-30: routine grid teacher name collapse jitter
  - **BUGS.md**: Registered seven open defects. Severities are proposed and await owner confirmation.
    - BUG-24: fresh-clone build fails because `@lfps/ui` is not built
    - BUG-25: changes lost on reload; sync is not wired and the server discards messages
    - BUG-26: WS hub mutates the client map under a read lock
    - BUG-27: unregistered backup download route
    - BUG-28: ignored state save errors
    - BUG-29 and BUG-30: reported, not yet reproduced

### Changed
- **Stateless Live Relay (ARCH-02 decision, Job Bundle 34)**: The Go server keeps state in memory only, scoped to the active school week, with "today" computed per request in the school time zone. `DATA_DIR`/`current_state.json` are no longer used. Server model matches `@lfps/core` (`ACCEPTED`, `disputeRemark`, `acceptedAt`, `disputedAt`); invalid input → 400. Broadcasts and responses are deep copies.
- **CORS and WebSocket origins (Job Bundle 34)**: One allowlist (`ALLOWED_ORIGINS`, default: the GitHub Pages origin and localhost 5173/4173) governs both REST and `/api/v1/ws`. Disallowed browser origins get 403.
- **Limits (Job Bundle 34)**: WebSocket messages up to 256 KiB (was 512 bytes); request bodies capped at 1 MiB (413).
- **Build order (Job Bundle 34)**: Root `build` runs `build:libs` (`@lfps/ui` → `@lfps/core`) before `build:web`; `npm test` runs every workspace.
- **Repo hygiene (Job Bundle 34)**: `apps/web/tsconfig.tsbuildinfo` is no longer tracked (it marked every build "-dirty"); `*.local` env files are ignored.

### Fixed
- **BUG-24 (Job Bundle 34)**: A fresh clone now builds (`npm ci && npm test && npm run build`, verified on a scratch clone).
- **BUG-26 (Job Bundle 34)**: WebSocket hub drops slow clients under the write lock.
- **BUG-28 (Job Bundle 34)**: No more silently ignored save errors; encode and Excel errors are logged or returned.
- **Footer hidden behind the tab bar (Job Bundle 34)**: The footer reserves the floating tab bar's height plus the iOS safe area on all breakpoints; the tab bar respects the safe area. Verified at 1280×800, 820×1180 and iPhone 13.

- **Plan and docs (owner clarifications, 2026-10-24)**:
  - In-app timetable edits are substitutions. They sync to an app-owned `Subs` tab, never to the master timetable.
  - Master TimeTable editing becomes EPIC-01 (unscheduled), with the conflict against per-date overrides noted.
  - Bundle 35's scope now covers: devices ⇄ relay over WebSocket only; app-owned `Subs` / `App_Meta` (+ log) written asynchronously, batched, debounced and retried; read-only tabs pulled at startup and periodically, then streamed; a client "Connecting…" state (FEAT-66); and owner setup of a service account and the real spreadsheet ID.
  - Relay keep-warm (PERF-03) is handled by the owner's uptime pinger during school hours, so no cron.
  - Previews: option A (`/preview/<branch>/`, footer branch badge) is scheduled with Bundle 36 (FEAT-64).
  - Updated: ADR-0005, SAS §2.1, ADMIN_ACCESS.

### Removed
- **BUG-27 (Job Bundle 34)**: `GET /api/v1/backups` and the server-side dated Excel copy. Under the relay model the server writes no files; `GET /api/v1/export/excel` still streams the workbook.

### Security
- Admin actions are guarded in the store as well as the UI; the developer console requires an admin session (Job Bundle 34).
- The relay no longer answers `Access-Control-Allow-Origin: *` (Job Bundle 34).
- The admin passcode hash ships in the public bundle, and a 6-digit code can be recovered from it offline in under a second. The gate prevents accidents only, so a real fix needs SEC-02. The new lockout only slows guessing through the app's own screen (Job Bundle 34).

## [v2.0.0-alpha.1] - 2026-10-18

### Added
- **Tactile Squircle Action Cards, Zero-Pass-Thru Appoint Squircles, Purple Attention Glow & AC Decluttering (Job Bundle 33)**:
  - **Tactile Squircle Action Row**: Replaced wide stacked action pills in `RosterNormalCard.tsx` with Apple-grade squircle cards. The left-aligned `[ Present / Absent ]` squircle sits side-by-side with `[ Off. CT ]` and `[ Off. AC ]` appointment squircles in one clean, horizontal row capable of holding 3 squircles without wrapping.
  - **Zero Pass-Thru Direct Appointment Tap**: Converted entire appointment squircles into explicit buttons with `e.stopPropagation()`. Tapping anywhere on the squircle card opens the designation modal directly with zero risk of toggling teacher absence.
  - **Coordinator Purple Glow (`.purple-attention-pulse`)**: Added dedicated purple pulsing keyframes and class in `index.css`. The Officiating AC card now pulses with an authentic coordinator purple halo rather than conflicting amber.
  - **AC & CT Card Decluttering**: Streamlined the bottom AC card by removing redundant "Appointment Needed" headline, and stripped away the unnecessary explanatory paragraph from the clubbed Class Teacher appointment card.
- **Clubbed Officiating Appointments, Coordinator Purple AC Appoint Card & Clean Name Overlays (Job Bundle 32)**:
  - **Clubbed Officiating Appointment Actions**: In the top action toolbar, multiple pending officiating appointments (AC and/or multiple CTs) are consolidated into a single sleek dropdown button (`[ 🛡️ Appoint Staff (X) ▾ ]`) with an auto-dismissing selection menu. When only 1 appointment is needed, renders a single direct pill button.
  - **Consolidated Officiating CT Cards in Section 3**: In Section 3 (`OFFICIATING STAFF`), multiple unappointed CT sections are clubbed into a single unified card (`Officiating Class Teachers (N Required)`) containing direct section appoint tiles (`KG A`, `KG B`, etc.), eliminating redundant multi-card clutter.
  - **Coordinator Purple Theme for AC Appoint Card**: The Officiating AC appointment card is styled strictly in Coordinator Purple (`border-purple-500/60 bg-purple-950/40 text-purple-200` with purple `[ Appoint ]` button), visibly distinguishing AC succession from Class Teacher duties.
  - **Designation-Free Full Teacher Name Overlay**: Removed role and designation subtitles from `TeacherNameOverlay.tsx`. The sliding acrylic window displays strictly the clean, full teacher name with zero layout shift.
- **Moral Science Nomenclature, Auto-Resolve Period Normalization, Officiating CT Appointment Cards & Column Header Sorter (Job Bundle 31)**:
  - **Canonical Subject Nomenclature (`M. SC.` = Moral Science)**: Defined `SUBJECT_FULL_NAMES` dictionary and `getSubjectFullName()` in `@lfps/core` with vitest test coverage. Guaranteed that "M. SC." is strictly Moral Science (never Mental). Integrated into Brain Studio and subject selection dropdowns.
  - **Auto-Resolve Count & Misleading Period Stamp Resolution**: Completely removed redundant and misleading `⚡ Auto-Resolve CT Classes (X)` button that caused confusion when 1 CT had 4 uncovered teaching slots. Stripped `• CT` stamp and amber borders from uncovered duty cards; all slots display clean `{period} Period` cards under unified `Auto-Resolve (X Slots)`.
  - **Officiating CT Appointment in Substitutions Page**: Added `OFFICIATING CT Required - Appointment Needed` cards with direct `[ Appoint ]` action in both the top toolbar and Section 3 (`OFFICIATING STAFF`), with alert status in the KPI summary strip, mirroring the Officiating AC workflow.
  - **Native Faculty Column Header Sorter**: Embedded the `[ Role | A-Z ]` sorting switcher directly inside the sticky Faculty table column header (`<th>`) in `RoutineGrid.tsx`, removing duplicate toolbar clutter.
  - **Apple-Grade Sliding Window Overlay (`TeacherNameOverlay.tsx`)**: Upgraded full-name overlay to a smooth sliding acrylic window (`stiffness: 450, damping: 28`) with acrylic grip accent that glides open horizontally over the abbreviation with zero layout reflow, overlaying freely over neighboring elements.
- **Whole-Day Off. CT Domain Alignment, Teacher Self-Service Login Scoping, Ergonomic Card Full-Name Overlays & Hierarchy Sorting (Job Bundle 30)**:
  - **Whole-Day Off. CT Precedence & Clean Period Substitutions**: Officiating Class Teacher (`Off. CT`) is anchored as a whole-day class responsibility for parent communication, attendance, and administrative duties. Teaching periods are substituted by subject specialists without misleading period-level `• CT` stamps.
  - **Scoped Teacher Self-Service Acceptance / Dispute**: `[ ✓ Accept ]` and `[ ⚑ Dispute ]` actions appear strictly for authenticated staff viewing their own assigned duties. Unauthenticated coordinators view clean status pills (`Assigned`, `✓ Accepted`, `⚑ Disputed`) with administrative controls.
  - **Staff Roster Tab Bar Glow Removal**: Completely eliminated `isUrgent` and amber text from the Staff Roster navigation tab.
  - **Role Hierarchy & Alphabetical Faculty Sorting**: Implemented 5-tier role hierarchy sorting (`Academic Coordinator` -> `Assistant Academic Coordinator` -> `Class Teachers` -> `2nd Teachers` -> `Other Staff`) and alphabetical ordering across both `RoutineGrid.tsx` and `AbsenceRoster.tsx` with a clean segmented toggle.
  - **Zero-Shift Full Name Overlay Component (`TeacherNameOverlay.tsx`)**: Displays abbreviated names in static flow with zero layout reflow, while instantly revealing the full name directly over the abbreviation on desktop hover or mobile touch with outside-tap dismissal.
  - **Off. CT Assign Pill Reordering**: Placed the Off. CT and Off. AC appointment pills directly above the attendance toggle button on teacher roster cards.
- **Security RBAC, Teacher Self-Service & Universal Notification Center (Job Bundle 29)**:
  - **Three-Tier Role-Based Access Control (`SEC-01`)**: Implemented `UserRole` (`'ADMIN' | 'TEACHER' | 'GUEST'`), `<PermissionGuard>` component, and `usePermissions()` hook. Unlocks teacher self-service while safeguarding master schedule integrity and destructive actions.
  - **Teacher Substitution Acceptance & Dispute Workflow (`FEAT-49`)**: Wired `[ ✓ Accept ]` and `[ ⚑ Dispute ]` actions across both Grid Card and List view modes in `SubstitutionsRegister.tsx`. Disputing summons `DisputeModal.tsx` allowing staff to record dispute remarks, marks status as `DISPUTED`, dispatches a real-time notification to coordinators, and surfaces a 1-tap `[ Reassign ]` button.
  - **Universal Notification Center & Live Alert Hub (`FEAT-50`)**: Integrated Apple HIG Bell button (`🔔`) with live unread counter badge in `Header.tsx` and built `NotificationCenterDrawer.tsx` slide-over drawer aggregating disputes, clashing commitments, pending duties, officiating prompts, and acceptance receipts with 1-tap mark-all-read and quick filters.
  - **Clean Routine Grid Teacher Names**: Eradicated golden and purple colors from teacher names in Routine Grid; standard clean text (`text-slate-100` / `text-rose-100` when absent).
  - **Universal Class Teacher Recognition**: Removed `&& !isAC && !isAAC` exclusion across `RoutineGrid.tsx`, `SubstitutionsRegister.tsx`, and `TabBar.tsx`. Academic Coordinators who are Class Teachers (`Mrs. R. Pahwa` - PREP A, `Mrs. S. Lakra` - KG A) now show both their AC/AAC and CT badges with full CT auto-resolve participation.
  - **Segregated Unavailable Staff in Popup Teacher Selector**: Replaced the accordion toggle in `AssignSubstituteModal.tsx` with segregated Available Candidates and Unavailable/Busy Staff sections, showing clear conflict reasons and `[ Override ]` button.
  - **Strict 1-Pulse Amber Attention Glow**: Configured amber glow animation strictly to 1 iteration (`.amber-look-at-me-1x`).
- **Whole-Day Officiating CT, Auto-Resolve Brain Studio & Ergonomic Polish (Job Bundle 28)**:
  - **Whole-Day Off. CT Priority (`BUG-18`)**: Officiating Class Teacher is anchored as a whole-day section responsibility in `@lfps/core` and `useTimetableStore`. `calculateCandidateAffinity` assigns +250 points affinity to the designated Off. CT for uncovered periods of their assigned class, ensuring the engine covers the section with the designated Off. CT before choosing other staff.
  - **Auto-Resolve Brain Studio (`FEAT-61`)**: Built `AutoResolveBrainModal.tsx` launched via the Brain icon in `SubstitutionsRegister.tsx`. Enables school coordinators to configure heuristic weights (Same Subject Co-Workers, Class Teacher, Second Teacher, Workload Balance penalty, Fatigue penalty, Whole-Day Off. CT priority, and Principal Preferred Subject Overrides).
  - **Strict 3 Single Pulses for Amber Glow**: Replaced multi-peak keyframe with `@keyframes singleAmberPulse` running exactly 3 individual pulses (0% -> 50% peak -> 100% rest) when switching to Staff Roster.
  - **Roster Normal Card Breathing Room & Text Cutoff Elimination**: Restored spacious card dimensions (`min-h-[210px]`, `p-4 sm:p-5`, `rounded-2xl`, `w-12 h-12` avatar) and converted Off. CT and Off. AC blocks to full-width vertical stacks, eliminating text cutoff for dual-role staff.
  - **Abbreviated Names with Hover Tooltip**: Standardized teacher card titles on `teacher.abbr` with full name on hover across all 4 roster layout modes (Normal Grid, Compact Grid, Normal List, Compact List).
  - **Binary Header Navigation Mode**: Simplified header states in `Header.tsx` to strictly Full Console or Dynamic Island Day Pill (`'FULL' | 'PILL'`), eliminating the slim peek strip for clean, zero-jerk mobile scrolling.
- **Academic Coordinator Succession & Officiating Workflow (LOGIC-04, Job Bundle 26A)**:
  - Engineered pure domain succession function `getEffectiveOfficiatingAC(day, absences, officiatingACMap)` in `@lfps/core` with comprehensive Vitest coverage.
  - Automatic chain of command: When Academic Coordinator (`Mrs. R. Pahwa`) is marked absent, the Assistant Academic Coordinator (`Mrs. S. Lakra`, AAC) automatically acts on her behalf as Officiating AC (`Off. AC`).
  - Only when BOTH the AC and AAC are absent does the system require appointing a 3rd-party Officiating AC (`needsAppointment: true`).
  - Surfaced dedicated Officiating AC prompt card in `SubstitutionsRegister.tsx` with 1-tap manual designation (`openOfficiatingModal({ type: 'AC' })`).
  - Visual Attention Glow: When an appointment is required, flashes both the **Substitutions** and **Staff Roster** navigation tabs with a soft pulsing amber halo (`@keyframes softAmberAttention` / `attention-pulse`).
  - In `AbsenceRoster.tsx`, dynamically indicates `Mrs. S. Lakra (Acting for Mrs. R. Pahwa)` on duty.
- **Dedicated Class Teacher Auto-Resolve & Golden Substitution Cards (LOGIC-05, Job Bundle 26A)**:
  - In `SubstitutionsRegister.tsx`, added dedicated `[ ⚡ Auto-Resolve CT (X Slots) ]` button next to the standard solver button that filters uncovered periods strictly to absent Class Teachers.
  - Rendered all Class Teacher substitution cards in both Grid Card View and List View with an eye-catching golden aesthetic (`border-amber-500/60 bg-gradient-to-br from-amber-950/35 via-slate-900/95 to-amber-900/25 ring-1 ring-amber-500/40 text-amber-200`).
  - When any Class Teacher has uncovered class periods, flashes both the **Substitutions** and **Staff Roster** tabs with the soft pulsing amber glow until coverage is complete.
- **Monorepo Architecture & Package Separation (Job Bundle 19)**:
  - Migrated legacy single-file codebase to modern NPM workspaces monorepo:
    - `@lfps/core`: Pure TypeScript domain engine, types, and substitution solver.
    - `@lfps/ui`: Apple HIG design tokens, spring physics curves, and semantic role palettes.
    - `apps/web`: React 19 + Vite 6 + Tailwind CSS + Framer Motion high-speed PWA.
    - `apps/server`: Go 1.23 high-concurrency microservice with WebSocket hub and Excel generation.
- **Pure TypeScript Substitution Solver & Domain Engine (`@lfps/core`)**:
  - Strict domain contracts: `Teacher`, `DailySchedule`, `MasterSchedule`, `AbsenceRecord`, `StaffAvailabilityRecord`, `SubstitutionAssignment`, `AutoResolvePlan`.
  - Deterministic solver scoring candidates by subject specialization, class familiarity, and daily load balance with 100% Vitest coverage.
  - Staff disambiguation engine resolving shared staff surnames.
- **Dynamic Island Day Bar with Symmetrical Spring Physics (`apps/web`)**:
  - Floating top-bar capsule that automatically morphs from the docked console to a floating capsule at `top-3` when scrolling down.
  - Symmetrical 600ms duration-based spring timing (`duration: 0.6`, `bounce: 0.12`) ensuring expand and collapse animate with identical fluidity.
  - Relaxed 4.8s auto-collapse countdown giving comfortable breathing room.
  - Full-screen backdrop enabling instant 1-tap outside dismissal.
- **Master Routine Matrix Fullscreen Workstation (`isFitGrid`, `apps/web`)**:
  - Full-viewport spreadsheet overlay (`fixed inset-0 z-50 bg-slate-950/98 backdrop-blur-2xl`) for wide table management.
  - Pinned multi-axial headers: period columns stay pinned at `sticky top-0 z-30`, teacher column stays pinned at `sticky left-0 z-20`, and corner cell anchors at `sticky top-0 left-0 z-40`.
  - Body scroll lock during fullscreen and instant <kbd>Esc</kbd> dismissal.
- **Apple HIG Floating Tab Navigation Dock & View Partitioning (`apps/web`)**:
  - Floating bottom navigation dock (`TabBar.tsx`) with animated pill indicator (`layoutId="activeNavDockPill"`), live notification count badges (amber for uncovered slots, rose for absent staff), and keyboard shortcuts (`1`, `2`, `3`).
  - Separated the congested vertical page flow into three high-velocity dedicated tabs: **Routine Matrix**, **Substitutions**, and **Staff Roster**.
  - Restored immediate, top-of-screen visibility for the Master Routine Matrix on mobile without requiring users to scroll past other tables.
- **Tab Overview Collapsible Controls (FEAT-38 & FEAT-39)**:
  - Added tactile Apple HIG collapse/expand toggle buttons (`[ ▾ Collapse Overview ]` / `[ ▸ Show Overview ]`) to both the **Substitutions** and **Staff Roster** workstation headers.
  - Smooth Framer Motion spring-animated accordion folding reclaims ~160px+ of vertical space on mobile screens, bringing the primary data tables and staff cards directly into immediate view.
- **Routine Fullscreen Workstation Root View Architecture (BUG-10)**:
  - Eliminated the Expand Grid blank screen error across mobile and desktop by hoisting fullscreen workstation rendering to the top-level application root in `App.tsx` (`h-screen h-[100dvh] w-screen z-[100] bg-slate-950`).
  - Eliminated CSS transform containing block collisions and portal attachment quirks.
  - Integrated direct MON..SAT day navigation pills into the fullscreen controls bar alongside the dual Teachers/Classes view toggle and <kbd>Esc</kbd> dismissal.
- **Dedicated Vertical Staff Attendance & Availability Workstation (`apps/web`)**:
  - Replaced the horizontal scrolling tray with a spacious, dedicated vertical workstation.
  - Implemented operational responsibility hierarchy sorting (FEAT-36): `AC` (Mrs. R. Pahwa) → `AAC` (Mrs. S. Lakra) → `CT` (Mrs. M. Midha, Mrs. R. Narayan) → `ST` (Ms. N. Horo, Ms. K. Sanga, etc.).
  - Added KPI metrics strip (Present, Marked Absent, Free from Sub, Away Official), quick search bar, category filters, and 1-tap "Mark All Present".
- **Dedicated Vertical Substitution Coverage Engine (`apps/web`)**:
  - Dedicated workstation featuring high-visibility action-required cards for uncovered slots, 1-tap Smart Auto-Resolve solver, active covered duties ledger, and temporary officiating summaries.
- **Tactile Interaction Modals & Micro Context Menus (`apps/web`)**:
  - Ultra-compact floating micro context menu on right-click or 500ms long-press.
  - Hero Substitution Availability Modal with 4 clean presets (`Bus Duty`, `PTM`, `Exam Duty`, `Away Official`) and inline status toggle.
  - Co-Teacher Inspector Modal with strictly per-period release (`releaseCoTeacher`), preserving teachers' solo classes.
  - Officiating Leadership Modal designating temporary Off. AC and Off. CT roles with class team partner recommendation.
- **Go 1.23 Cloud Backend & WebSocket Hub (`apps/server`, Job Bundle 20)**:
  - Gorilla WebSocket hub broadcasting `STATE_MUTATION` events across all connected tablets and phones with sub-millisecond latency.
  - Thread-safe RWMutex disk JSON storage (`data/state.json`) persisting state across restarts.
  - Excelize v2 XLSX engine generating publication-ready daily substitution tables with formal navy branding and Principal signature lines.
  - Production multi-stage Docker container (`~15MB`) deployed to Render.
- **Interactive Settings Console Modal & Mobile Affordance (BUG-11, Job Bundle 23)**:
  - Replaced the minimal UI boolean toggle in the header with an Apple HIG `SettingsModal.tsx` console featuring 5 distinct control groups: Operating Identity (Staff login/logout), Interface & 120fps GPU compositing status, Cloud & Live Sync diagnostics with manual reconnect, Data Management (Export Excel, Reset Day, Purge Buffers), and System Version metadata.
  - Added dedicated Settings button in mobile header navigation for parity with desktop.
- **Per-Tab Isolated Undo/Redo Engine (FEAT-40, Job Bundle 23)**:
  - Implemented three independent FIFO history stacks in `useTimetableStore.ts` (`routineHistory`, `substitutionsHistory`, `rosterHistory`) capped at 30 snapshots each, ensuring actions on one tab never corrupt or undo actions on another tab.
  - Bound global keyboard shortcuts (`⌘Z` / `Ctrl+Z`, `⌘⇧Z` / `Ctrl+Y`) dynamically routed to the active tab.
  - Embedded tactile `<UndoRedoControls />` button pairs on Routine Grid, Substitutions Register, and Staff Roster toolbars with live disabled states.
- **Global Reset Day & Contextual History Purge Engine (FEAT-41, Job Bundle 23)**:
  - Built tactile `ResetDayButton.tsx` in header: single-tap resets the current day's modifications back to master baseline with automatic undo snapshot capture (making reset fully reversible with `⌘Z`).
  - Added 500ms touch long-press (mobile) and desktop right-click context popover allowing administrators to completely purge all undo/redo history buffers across all tabs.
- **Tactile Front-Desk Polish & Manual Substitute Workflow (Job Bundle 24)**:
  - **Auto-Reset Substitutions on Teacher Present (`BUG-12`)**: When marking an absent teacher back to present, `toggleAbsence()` automatically scans and removes all substitution assignments involving that teacher (as either absent teacher or substitute), restoring original baseline schedule slots and updating live counters with undo snapshot preservation.
  - **Routine Instructional Period Cell Freedom (`BUG-13`)**: Scoped the `MicroContextMenu` trigger strictly to the sticky teacher name column cells, freeing instructional period cells for cell inspection, co-teaching modals, and future hold-and-drag reordering gestures.
  - **Staff Login Root Modal (`BUG-14`)**: Hoisted `StaffLoginModal.tsx` to application root in `App.tsx`, eliminating CSS transform containing block collisions that previously positioned the panel awkwardly at the top-middle off-screen. Added outside-click and <kbd>Escape</kbd> dismissal (`LOGIC-02`).
  - **Screen-Clamped History Purge Context Menu (`BUG-15`)**: Hoisted `ResetPurgeContextMenu.tsx` to application root in `App.tsx` with screen-space edge clamping, tactile spring animations, and outside-click dismissal (`LOGIC-02`).
  - **120fps GPU Spring Accordion Easing (`BUG-16`)**: Replaced jerky accordion animation on Substitutions and Roster overviews with `SPRING_TRANSITIONS.snappy`, strict `overflow-hidden`, and `will-change-[height,opacity]`.
  - **Away (Official) Classified Under 'Free' (`LOGIC-01`)**: Counted and filtered teachers on `Away (Official)` deputations under 'Free' in attendance roster metrics and filters.
  - **Universal Dismissal on Outside Click (`LOGIC-02`)**: Ensured all popovers, context menus, modals, and dropdowns close on outside click/tap and <kbd>Escape</kbd>.
  - **Equalized Co-Teacher Semantic Color-Coding (`LOGIC-03`)**: Built `areTeachersCoTeachingPartners` and `isTeacherCoTeachingInSlot` in `@lfps/core` with cross-partner inspection so all co-teachers' cells receive identical semantic color styling and badge indicators.
  - **Interactive Candidate Substitute Selection Drawer (`FEAT-42`)**: Added 1-tap `[ Assign Substitute ]` on uncovered teacher cards in `SubstitutionsRegister.tsx` opening `AssignSubstituteModal.tsx` with ranked candidate substitutes from `@lfps/core`.
  - **Substitutions Overview Cards Reordered (`FEAT-43`)**: Reordered KPI cards to 1st Covered (green border), 2nd Uncovered (red border), 3rd Officiating Staff (`border-purple-500/40`).
  - **Header Overview Collapse Ergonomics (`FEAT-44`)**: Replaced verbose text buttons with a sleek, rightmost-aligned Apple collapse/expand icon button (`ChevronUp`/`ChevronDown`) and enabled tapping empty header space to toggle collapse/expand state.
- **Tactical Matrix Ergonomics, Header Peek Navigation & Golden CT Tokens (Job Bundle 25)**:
  - **Scroll Peek Header Utility Console (`FEAT-52`)**: On downward scroll (`scrollY > 50`), smoothly transitioned the elevated console into a compact peek utility bar providing continuous 1-tap access to Reset Day, Settings, PWA Install, Excel export, and Staff Login, alongside the dynamic island day bar pill. Full branding console re-expands when scrolled to top.
  - **Mobile Browser URL Bar & Scroll Synchronization (`FEAT-57`)**: Connected a `window.visualViewport` resize listener with hysteresis to eliminate the jerky double-jump artifact on mobile browsers (Chromium, Firefox, Safari, Edge, Opera) when the native URL bar expands or collapses.
  - **Horizontal-Scroll Dynamic Teacher Column Collapse on Narrow Screens (`FEAT-53`)**: Added a horizontal scroll observer in `RoutineGrid.tsx` on narrow viewports: scrolling past 15px collapses the leftmost sticky column to ~64px width and switches teacher names to an ultra-clean 2-line split font (Line 1: initials/title, Line 2: surname), maximizing visible instructional periods while preserving row identity.
  - **Absent Teacher High-Contrast Crimson Highlight (`FEAT-54`)**: In `RoutineGrid.tsx`, absent teachers' sticky first-column name cells are rendered in bold crimson red (`bg-rose-950/90 border-r-2 border-r-rose-500 text-rose-200 font-bold shadow-[3px_0_12px_rgba(244,63,94,0.35)]`), ensuring absences are immediately noticeable.
  - **Hide Absent Teachers Routine Matrix Toggle (`FEAT-55`)**: Added interactive `[ 👁‍🗨 Hide Absent ]` / `[ 👁 Show All ]` toggle button in the Routine Grid toolbar and in Settings, filtering out absent staff rows for focused routine analysis.
  - **Class Teacher Golden Token Overhaul (`FEAT-56`)**: Color-coded Class Teachers in vibrant **Golden / Amber** (`#f59e0b` / `text-amber-300 bg-amber-500/15 border-amber-500/40`) across `@lfps/ui`, `RoutineGrid.tsx`, `AbsenceRoster.tsx`, and `SubstitutionsRegister.tsx`. Academic Coordinators (`AC` and `AAC`) strictly retain their signature **Purple / Violet** (`#8b5cf6`).
  - **Substitutions & Roster List/Grid View Types & Multi-Criteria Sorting (`FEAT-58`)**: Added tactile View Mode toggle (`[ ⊞ Grid ]` / `[ ☰ List ]`) and multi-criteria sorting pills (Role hierarchy, Alphabetical name, and Period sequence) to both the Substitutions Register and Staff Roster workstations.
  - **Add to Home Screen PWA Installation & iOS Safari Walkthrough (`FEAT-59`)**: Added `beforeinstallprompt` listener with an interactive "Install App" button in Header and Settings, and created `AddToHomeScreenModal.tsx` providing a 3-step visual guide for iOS Safari users.
  - **Unified Preferences Persistence Engine (`FEAT-60`)**: Auto-persisted all user preferences (view modes, sort orders, hidden overviews, hide absent staff, minimal UI) to `localStorage` under `lfps_user_preferences_v2`, complete with explicit `[ Save Preferences ]` and `[ Reset Defaults ]` actions in Settings.
  - **Minimal UI Mode Visual Implementation (`BUG-17`)**: Applied high-density compact styles across Header, Routine Grid, Substitutions Register, Absence Roster, and TabBar when `isMinimalUI` is enabled.
  - **Settings Preference: Hide Overviews by Default (`FEAT-45`)**: Added a preference toggle in Settings starting the Substitutions and Roster overviews in collapsed state on application launch.

## [v1.53.0] - 2026-10-17

### Added
- **Teacher Login & Non-Blocking Front-Desk Operation (FEAT-26)**:
  - Added dedicated login selector in Settings Group 1 ("Teacher Login & Operating Identity") and interactive top header profile pill (`#header-profile-pill`).
  - Completely non-blocking: timetable grid, absence tray, and routine viewing remain 100% accessible to anyone in guest / front-desk mode without logging in.
  - Added explicit "Log Out" action button (`#btn-profile-logout`) returning the session cleanly to front-desk mode.
- **Identical / Same-Name Disambiguation Engine (FEAT-27)**:
  - Safeguarded against identical staff names by assigning internal unique Staff IDs (`id: "STAFF-01"` through `STAFF-09`) in `staffDirectory`.
  - Implemented `getDisambiguatedTeacherName(teacher)` helper that detects duplicate names and appends primary class or department/role qualifiers (e.g. `Mrs. S. Lakra (KG A)` vs `Mrs. S. Lakra (Prep B)`).
- **Conditional Visibility for Logged-In Teacher Features (FEAT-28)**:
  - When not logged in (`state.loggedInTeacher = null`), teacher-specific controls disappear:
    - `'My Subs'` filter button (`#reg-filter-btn-my`) is hidden (`.hidden`). If currently viewing `'my'`, automatically falls back safely to `'all'`.
    - Inline row action buttons `[Accept]` and `[Dispute]` are hidden (`canTeacherAct = false`), preserving a clean front-desk overview.
    - Personal substitution duty alerts are suppressed in the notification center.
  - When logged in, `'My Subs'` appears with a live duty badge, and personal action buttons activate.
- **Ultra-Compact Micro Context Menus (FEAT-29)**:
  - Right-click (desktop) and 500ms touch long-press (mobile) on absence tray cards and routine grid teacher column cells summon an ultra-compact ~160px $\times$ 74px 2-button micro-menu (`.ctx-micro-menu`).
  - Provides instant 1-tap `[ 🔴/🟢 Mark Absent ]` & `[ ⛔/🟢 Mark Off-Duty ]` with zero screen clutter.
- **'Minimal UI Mode' Hidden Developer Setting (FEAT-30)**:
  - Added `#minimal-ui-toggle` to Developer Options (`state.settings.minimalUI: true` by default). Enabling renders the ultra-compact micro-menus, while disabling restores full elaborate cards and extended details.

### Fixed
- **Assign Officiating Class Teacher (Off. CT.) Modal Silent Failure (BUG-09)**:
  - Resolved bug where clicking "Assign Off. CT." failed silently across Roster tab cards, Substitutions page, Grid headers, and Quick Action modals due to missing container elements `#officiating-teacher-list` and `#officiating-modal-subtitle` in `#officiating-modal-body`.
  - Injected container elements directly in `index.html` and added self-healing dynamic fallback in `openOfficiatingModal()`.
  - Filtered candidate pool, tagged off-duty candidates with `⛔ Off-Duty`, and sorted available candidates ahead of unavailable ones.
  - Bound `#close-officiating-modal-footer-btn` and wired Notification Center Off. CT and Off. AC notices to directly launch `openOfficiatingModal()`.

## [v1.52.0] - 2026-10-16

### Added
- **Streamlined Officiating Class Teacher (Off. CT.) Architecture (FEAT-17)**:
  - Integrated inline Officiating Class Teacher action row (`.roster-card-offct-row`) directly into Roster tab cards for any absent Class Teacher, enabling 1-tap `[+ Assign Off. CT]`, `[Change]`, and `[✕ Clear]` controls without navigating away.
  - Introduced a dedicated Officiating Class Teachers ledger table (`#sub-off-ct-container`) in the Substitutions page placed right above the bottom counter panel, presenting class sections, absent class teachers, assigned officiating teachers, status badges, and rapid assignment actions.
- **Responsive Full Formal Names on Roster Cards (FEAT-18)**:
  - Implemented responsive dual name rendering (`.roster-name-abbr` / `.roster-name-full`) on Roster teacher cards. Compact abbreviations (`Mrs. S. Lakra`) are displayed on mobile screens, and full formal names (`Mrs. Synthia Lakra`) expand automatically on tablet and desktop screens ($\ge 768\text{px}$) with zero JS reflow overhead.
- **Settings Hierarchy Simplification (FEAT-19)**:
  - Relocated the "Appearance & Themes" group down to Section 5, positioned immediately above "About & Guides" (Section 6), prioritizing core school operational settings (Profiles, Attendance, Cloud Sync, and Storage) at the top of the modal.
- **Roster Card Decluttering & Yamaha-Inspired Hold Affordance (FEAT-20)**:
  - Removed the redundant gear icon (`⚙`) from Roster teacher cards to minimize visual noise.
  - Enhanced the 'Available' action button with desktop right-click (`contextmenu`) and 500ms touch long-press with tactile haptic feedback (`[45, 60]ms`) to summon the staff availability and duties modal.
  - Badged long-pressable buttons with a Yamaha keyboard-inspired finger indicator (`<span class="hold-indicator">👆</span>`) and explicit microcopy (`Hold for more`).
- **Simplified Staff Availability & Duties Modal (FEAT-21)**:
  - Redesigned `#sub-avail-modal` into a cleaner, decluttered `Staff Availability & Duties` dialog.
  - Converted common duty chips into a high-density 3-column grid (`repeat(3, 1fr)`) and stripped redundant explanatory text.

## [v1.51.0] - 2026-10-16

### Added
- **Modernized Substitutions Register with Bottom Summary Counter (FEAT-14.1)**:
  - Shifted the KPI counter strip (`#register-summary-bar`) from the top of the Substitutions page down to the bottom below the table (`.bottom-summary-bar`), creating a clean, unobstructed workspace.
  - Streamlined the top bar to focus purely on navigation filters (`All`, `Pending`, `Covered`, and `My Subs`).
- **'My Subs' Quick-Filter with Live Count Badge (FEAT-14.2)**:
  - Added `'My Subs'` filter tab (`#reg-filter-btn-my`) allowing staff to instantly isolate coverage duties and absent classes matching their active profile (`state.activeTeacher`).
  - Added live notification counter badge (`.reg-filter-count`) showing active duties at a glance.
  - Friendly contextual empty state when no duties are assigned (`No substitution duties assigned to [Teacher] today`).
- **Narrower Responsive Substitution Table Architecture (FEAT-14.3)**:
  - Compacted the table from 6 columns down to 5 by merging Period and Class/Subject into a unified stacked block (`.reg-cell-period-class`).
  - Reduced table minimum width from 680px down to 480px (440px on mobile viewports $\le 600\text{px}$), eliminating horizontal scroll traps and awkward overflow.
  - Tightened cell padding, added staff role subtitles, and streamlined action buttons for high-density readability across mobile and desktop devices.

## [v1.50.0] - 2026-10-16

### Added
- **Always-Editable Routine Grid & Hidden Developer Edit Lock (FEAT-15)**:
  - Eliminated the prerequisite requirement to click "Edit Schedule" before moving or assigning timetable cells. Drag-and-drop cell moves and tap interactions are now directly active by default at all times.
  - Relocated the optional Routine Edit Lock (`state.settings.routineEditLock: false`) into Developer Options (`#routine-edit-lock-toggle`) for coordinators who specifically prefer locking the grid against accidental drag gestures.
  - Automatically hid the redundant `#edit-toggle-btn` and `#fit-grid-edit-btn` from top controls when unlocked, significantly decluttering the header bar.
  - Preserved Master Edit Mode behavior: button dynamically reappears as `🛠 Master Save` when editing baseline routine.
- **Anchored iOS-Style Routine Grid Context Popover (`#grid-cell-context-popover`, FEAT-16)**:
  - Replaced cumbersome full modal popups with an anchored, high-speed iOS-style context popover docked right beside the clicked cell or touch cursor on desktop right-click or 500ms touch long-press.
  - Context-aware action buttons customized for every cell type:
    - **Teacher Column**: 1-tap Attendance Toggle (`[ 🔴 Mark Absent Today ]` / `[ 🟢 Mark Present Today ]`), Sub-Availability Toggle, Officiating AC assignment shortcut, and duty options link.
    - **Missing Period Cells (`.cell-missing`)**: Direct 1-tap `[ 🔄 Choose Substitute ]` button opening the candidate bottom sheet.
    - **Covered Period Cells (`.cell-covered`)**: Direct 1-tap `[ 🔄 Change Substitute ]` and `[ ✕ Clear Substitute ]` buttons.
    - **Modified Period Cells**: Direct 1-tap `[ ↺ Reset Slot to Master Routine ]` returning slot to baseline.
  - Full touch-friendly long-press with native haptic vibration (`navigator.vibrate([45, 60])`), viewport boundary clamping, and global Escape key dismissal.

### Fixed
- **Routine Grid Right-Edge Divider Bar & Leftmost Under-Slide Peeking Leak (BUG-08)**:
  - Fixed horizontal scrolling issue where the dividing edge of the sticky teacher column vanished as period cards slid underneath. Added a persistent 2.5px solid right-edge divider bar (`::after`) with drop shadow (`z-index: 25`) across all light, dark, and glass theme presets.
  - Fixed WebKit horizontal clipping bug where period cards slid all the way to the screen's left edge past the sticky teacher column. Added a 34px opaque masking flange (`::before`) and updated `.table-scroll-container` to `overflow-x: auto !important; overflow-y: hidden !important; overflow-y: clip !important; padding: 0 !important;`, ensuring clean occlusion and zero visual edge leak.

## [v1.49.0] - 2026-10-16

### Added
- **Dedicated Staff Roster & Attendance Tab (`#tab-roster`, Bottom Nav Zone 2)**:
  - Added dedicated Roster tab to bottom navigation (`[ 📊 Grid ] | [ 👥 Roster ] | [ 🔄 Substitutions ]`) for streamlined whole-school attendance and duty management.
  - Real-time absence counter badge (`#roster-absent-badge`) alerting coordinators to active staff absences at a glance.
  - KPI Stat Strip with glanceable status pills: `🟢 Present: X`, `🔴 Absent: Y`, `⛔ Off-Duty: Z`.
  - Instant live search filter (`#roster-search-input`) with 1-tap clear button (`#roster-search-clear`) matching teacher names, roles, classes, or duty remarks.
  - Batch action buttons: `[ 🟢 Mark All Present ]` (`#btn-roster-mark-all-present`) to quickly reset all staff attendance and `[ ⛔ Staff Availability & Duties ]` (`#btn-roster-open-duties`) to launch all-staff duty configuration.
  - Responsive Staff Roster card grid (`#roster-cards-container`) for all 9 teachers:
    - Teacher identity avatar with role-colored circular blobs (`.blob-ct` / `.blob-st`) and leadership corner badges (`AC`, `A.AC`, `⚡ Off. AC`).
    - Full respectful honorific teacher name and detailed role tags (`Class Teacher (Prep A)`, `Subject Teacher`, `Off. CT (Prep B)`).
    - Real-time daily teaching schedule breakdown (`📘 4 Classes: P1, P2, P4, P6` or `No Classes Today`).
    - Substitution duty load counter showing active coverage assignments (`🔄 Covering: P3 for Mrs. Midha`).
    - Tactile dual 1-tap action buttons:
      - **Attendance Toggle**: Instantly toggles between `🟢 Present` and `🔴 Absent` with automatic cloud broadcast and substitution reconciliation.
      - **Sub-Availability Toggle**: Instantly toggles between `✓ Available for Sub` and `⛔ Off-Duty: [Remark]`.
    - 1-tap duty management button (`⚙️`) launching `#teacher-quick-action-modal` for instant duty chip selection (`Bus Duty`, `CBSE Duty`, `Parent Meet`, etc.).
- **Developer Option: Hide Absence Panel from Routine Grid (`#hide-absence-panel-toggle`)**:
  - Added hidden setting toggle inside Developer Options (`state.settings.hideAbsencePanelFromGrid: false`).
  - When enabled, collapses `.absent-tray-container` (`.tray-hidden`) from the Grid view, giving coordinators a 100% full-height, distraction-free Master Routine table while all absence management is handled in the dedicated Roster tab.
- **Enhanced Absent Teacher Context Menu & Viewport Clamping**:
  - Augmented `#absence-context-popover` with direct 1-tap Attendance Toggle (`[ 🟢 Mark Present Today ]` / `[ 🔴 Mark Absent Today ]`), Sub-Availability Toggle, and duty remark shortcuts.
  - Implemented strict viewport boundary clamping ensuring the context popover never renders offscreen regardless of horizontal scroll or edge proximity.
  - Boosted popover `z-index` to `2100` and overlay to `2050` with full theme glass support across Utopian Glass and Utopian Night.

## [v1.48.0] - 2026-10-16

### Added
- **Cloud Operating Mode State Machine (`Live Cloud Mode` vs `Local Session`)**:
  - Added operating mode selection (`state.settings.cloudMode`) allowing coordinators to seamlessly switch between automated 2-way cloud synchronization and an offline local session.
  - Settings segmented control with tactile pills (`[ ☁ Live Cloud Mode ]` vs `[ 🏠 Local Session ]`) and explanatory callout microcopy.
- **Tactile Header Cloud Status Pill (`#header-cloud-status`)**:
  - Compact Apple-style status indicator docked in the header with live LED dot:
    - `🟢 ☁ Live`: Active 2-way cloud auto-sync running every 60s.
    - `🟡 🏠 Local`: Local offline session with routine auto-sync paused.
    - `⚪ Offline`: Network disconnected; actions safely queued locally.
    - `🔵 ☁↑ Broadcast`: Active live broadcast pulse transmitting substitution events to Google Sheets.
  - Tapping opens `#cloud-session-popover` for 1-tap mode toggling, immediate routine sync, and manual ledger push.
- **Background Auto-Sync Engine**:
  - Automatically fetches timetable diffs from Google Sheets every 60 seconds when in Live Cloud mode.
  - Detects incoming schedule modifications non-disruptively; surfaces alerts in Notification Center (`🔔`) without interrupting active drag-and-drop actions.
  - Automatically checks for updates when returning to the app (`visibilitychange`).
- **Unconditional Mandatory Substitution Broadcasting (`broadcastSubstitutionsToCloud`)**:
  - Regardless of whether the app is in Live Cloud Mode or Local Session, every substitution event is unconditionally broadcasted to Google Sheets in real time so all school teachers receive immediate notifications.
  - Automatically dispatches on single assignment (`assignSubstitute`), unassignment (`unassignSubstitute`), auto-resolve batches (`applySelectedProposal`), teacher absence reverts (`revertSubstitutionsForTeacher`), orphan cleanups (`cleanupOrphanSubstitutions`), dispute flagging (`submitDisputeReason`), dispute dismissals (`dismissDispute`), and undo/redo operations.
  - Non-blocking 400ms debouncing consolidates rapid multi-cell actions into single network payloads.
  - Built-in offline buffer (`state.pendingBroadcasts`) that automatically drains and flushes queued records upon network reconnection (`window.addEventListener('online')`).
- **Notification Center Cloud Integration**:
  - Operational notices for pending cloud routine diffs (`Review & Apply`) and local session status reminders (`☁ Go Live`).

## [v1.47.0] - 2026-10-16

### Fixed
- **Circular Undo/Redo Icons Exchanged**:
  - Exchanged rotation arrows in `getUndoRedoIcons('circular')` and Settings sample preview so Undo uses clockwise `↻` and Redo uses counter-clockwise `↺`.
- **Bottom Sheet Dismissal in Landscape & Tap-to-Close**:
  - Added tap-to-close on `#sheet-handle` with an expanded invisible hit area (`::before`) and pointer cursor, closing the bottom sheet on tap or click.
  - Dynamically lowered the drag-to-dismiss threshold in landscape orientation from 60px down to 25px, ensuring swipe-down dismissal works smoothly even on constrained phone heights.

### Changed
- **3-Dot Menu Streamlining & Header De-Cluttering**:
  - Renamed "Reset to Baseline" $\to$ "Reset" (`#more-item-reset`).
  - On narrow screens ($\le 768\text{px}$), hid `#settings-btn` from the top header bar and added it as an option inside the 3-dot overflow menu (`#more-item-settings`).
  - Removed redundant items from the 3-dot menu (Notifications, Staff Availability, Scale to Viewport, Features Tour), keeping it ultra-lean and fast.
  - Hid "Edit Baseline Master Routine" (`#master-lock-btn`) inside the 3-dot menu (`#more-item-master-lock`), decluttering the top header.
  - Ensured "Edit Schedule" (`#edit-toggle-btn`) is always prominently positioned outside in the top header bar across narrow mobile devices.
- **Fit-Grid (Scale to Viewport) Scrollability**:
  - Enabled horizontal scrolling on `.fit-grid-sticky-bar` (`overflow-x: auto; scrollbar-width: none`) so the collapse button (`#exit-fit-grid-btn`) is never pushed out of reach on narrow viewports.
  - Enabled horizontal scrolling for the timetable grid in portrait mode (`body.fit-grid-mode .table-scroll-container`), pinning the teacher column sticky on the left to preserve text legibility while avoiding crushed columns.

## [v1.46.0] - 2026-10-16

### Added
- **iOS & Ableton Live Inspired Visual Theme Menu**:
  - Replaced legacy text dropdown with a tactile palette swatch grid (`.theme-swatch-grid`) inspired by Ableton Live's Look/Feel color tiles and iOS Settings.
  - Each theme card (`.theme-swatch-card`) renders an authentic miniature preview canvas showcasing actual canvas background (`--bg-color`), inset surface card (`--surface-color`), accent LED indicator (`--accent-blue`), and grid line contrast.
  - Interactive family filter tabs (`.theme-family-pill`: `All`, `☀️ Light`, `🌙 Dark`, `🪟 Glass Materials`, `🔲 Studio`) with instant 1-tap live preview, haptic tap feedback, and iOS checkmark status badge (`.theme-swatch-check`).
  - Covers all 12 themes (`system`, `light`, `warm-sepia`, `dark`, `midnight`, `slate-nord`, `utopian-glass`, `utopian-night`, `aero-frost`, `cyber-glass`, `retro-glass`, `high-contrast`).

### Changed
- **Settings Hierarchy & Developer Options Relocation**:
  - Relocated Developer Options (`#roster-color-settings-group`) to the absolute bottom of the Settings modal below "About & Guides", cleanly separated and unlocked via the 5-tap version Easter egg with smooth auto-scroll.
  - Relocated **Same-Period Substitution Lock** (`#same-period-lock-toggle`) into "General & Policies" since it actively blocks coordinators by default.
  - Relocated **Allow Substitution Disputes** (`#admin-dispute-setting-row`) into Developer Options.
  - Relocated **Google Apps Script Web App Endpoint URL** (`#sheets-csv-url-input`) into Developer Options, keeping standard Cloud Sync focused purely on connection status, Push Today's Ledger, and Sync Routine.
  - Relocated **Simulate Absence / Test Scenarios** (`#mock-scenario-select` and `#btn-apply-scenario`) out of Timetable Data into Developer Options.
- **Same-Period Lock Toast Polish & Duration**:
  - Replaced wordy rejection copy with crisp, high-visibility microcopy: `⛔ Locked: Same-Period Subs Only (${tPeriod})`.
  - Upgraded `showToast` to track and cancel pending timers (`toastTimeout`), guaranteeing a full 5000ms display duration for critical constraints without premature dismissals.
  - Polished toggle toast to `🔒 Same-Period Lock Enabled` and `🔓 Cross-Period Subs Allowed`.

## [v1.45.1] - 2026-10-16

### Fixed
- **Absence Tray Context Popover Stacking Trap (BUG-07)**:
  - Resolved issue where right-clicking or 500ms long-pressing an absent teacher card only blurred the absence panel without displaying the context popover menu.
  - Root cause was `#absence-context-popover` and `#absence-context-overlay` residing inside `.absent-tray-container`, which created a local containing block in themes with `backdrop-filter`, confining the overlay and distorting popover coordinates.
  - Relocated popover and overlay to root of `<body>`; the popover now anchors right below the teacher card with full-screen soft blur overlay.
  - Added popover dismissal to the global Escape key handler.

## [v1.45.0] - 2026-10-16

### Added
- **Full-Height Hardware Pad Button for Staff Availability**:
  - Redesigned `#btn-open-sub-avail-modal` into a tactile hardware-style pad button (`.btn-sub-avail-pad`) spanning the full vertical height of `.absent-tray-container` docked against the right edge.
  - Features MPC/Launchpad squircle aesthetics (`border-radius: 14px`), tactile active press depth (`transform: translateY(2px)`), live status LED (`.pad-led` pulsing green/red), and dynamic off-duty count badge (`#pad-sub-avail-count`).
  - Seamlessly responsive across desktop, mobile portrait, and mobile landscape.
- **Anchored Context Popover for Action History Purge**:
  - Replaced the large full-screen `#history-purge-modal` with a sleek, compact iOS-style context popover (`#reset-context-popover`) anchored directly beside `#reset-schedule-btn` and `#more-item-reset` on right-click / 500ms long-press.
  - Enables zero-travel, 1-tap history buffer wiping without modal disruption.

### Changed
- **Routine Header Right-Alignment**:
  - Right-aligned Scale to Viewport button (`#fit-grid-btn`) and Hide Absent toggle (`#hide-absent-toggle-wrapper`) via `.routine-header-right-controls` with `margin-left: auto;`, creating a balanced, clean front-desk header.
- **Grid Scroll Panel De-Obstruction**:
  - Decoupled the master routine table from nested `.table-scroll-container` letterbox traps (`max-height: none !important; overflow-y: visible !important;`).
  - All 9 teacher rows are immediately visible on desktop displays without requiring internal vertical scrolling; natural document scrolling is fully restored.
- **Professional Re-branding to "Scale to Viewport"**:
  - Standardized terminology from "Fit Grid" to **Scale to Viewport** across tooltips, labels, 3-dot overflow menu, and guide text.

### Fixed
- **Desktop Need-to-Sub Cell Tap Interaction**:
  - Fixed issue where clicking `.cell-missing` or `.cell-covered` cells on desktop was inadvertently dismissed by trailing clicks hitting `#sheet-overlay`.
  - Added timestamp guard (`lastBottomSheetOpenTime < 300ms`) and safe event dispatching, ensuring 100% reliable 1-tap substitute picker activation on desktop.

## [v1.44.0] - 2026-10-16

### Fixed
- **Substitutions Page & Teacher Names Failure (BUG-06)**:
  - Eliminated fatal JavaScript runtime crash on page load by removing stale undefined window exports (`window.saveSubAvailModal`, `window.removeTeacherSubUnavailable`).
  - Added self-healing absence reconciliation in `renderSubstitutions()`, fallback class resolution, and wrapped teacher names in `.reg-teacher-name` spans.
  - Enforced `min-width: 680px` on `.sub-register-table` so columns never crush teacher names into invisible text across themes or mobile screens.
- **Smart Auto-Resolve Solver Execution (BUG-06)**:
  - Safeguarded `simSchedule[period]` object initialization in `generateStrategySolution()`, enabling seamless calculation of all 3 solver proposals (`Subject Match`, `Balanced Load`, `Minimal Splits`) and application via `#auto-resolve-apply-btn`.
- **Edit Schedule Mode Drag-to-Sub**:
  - Fixed `executeMove()` to recognize drops onto absent teachers' missing cells (`isTargetSubRelated`), correctly routing to `assignSubstitute()` with Limbo displacement, audit history, and badge updates rather than executing a raw routine swap.

### Added
- **Live Timetable Conflict Pill**:
  - Added live conflict pill in `.grid-status-footer` (`#footer-conflict-pill`) and synchronized with `#collision-indicator`.
  - Clicking the conflict pill smoothly scrolls to the conflicting cell and presents toast diagnostics.

## [v1.43.0] - 2026-10-16

### Added
- **Compact Context Popover for Absence Tray**:
  - Right-click / 500ms long-press on teacher card opens lightweight context menu (`#absence-context-popover`) for 1-tap availability toggling.
- **Squircle Sub-Availability Button**:
  - Redesigned `#btn-open-sub-avail-modal` with `.btn-squircle-edge` (9px Apple squircle radius).
- **Desktop Grid Tap Fix**:
  - Fixed mouse click interception on `.cell-missing` caused by HTML5 `draggable="true"`.

### Changed
- **iOS-Inspired Settings Screen**:
  - Restructured Settings into 7 clean iOS-style sections with an Operating Identity dropdown.
- **Terminology Audit**:
  - Replaced all instances of `offAC` with **Officiating AC (Off. AC)**.
- **Header Simplification & Fit-Grid Button**:
  - Removed `#tour-btn` from header. Replaced "Back to normal" with an inward collapse icon button.
- **Centered Mobile Day Bar**:
  - Centered `.day-selector` across mobile portrait and landscape viewports.

## [v1.42.0] - 2026-10-16

### Added
- **Header Notification Center (`🔔` Icon with Live Notice Badge & Popover)**:
  - Added an Apple-style bell button (`#notifications-btn`) with live notice counter pill (`#notif-badge`) in the top navigation bar, plus integrated into 3-dot overflow menu.
  - Slide-over modal (`#notifications-modal`) aggregates operational notices:
    - **Dispute Notices**: Live flags (`⚑`) when staff dispute an allocation, with direct 1-tap navigation to the register.
    - **Timetable Conflicts / Clashes**: Real-time warnings (`⚠️`) for schedule clashes, with 1-tap jump to the conflicting cell.
    - **Displaced Staff in Limbo**: Alerts (`👥`) for unallocated teachers awaiting reassignment.
    - **Officiating Role Alerts**: Reminders (`⭐`/`🏫`) when Academic Coordinator or Class Teachers are absent and require Off. AC / Off. CT. designated.
    - **Uncovered Periods**: Alerts (`🕒`) for uncovered periods with 1-tap assign drawer opener.
- **Subbed Teacher Target Cell Visual Indicator & Halo Ring**:
  - Target cells in routine table display an illuminated breathing halo ring (`@keyframes haloPulse`, `.sub-halo-active`).
  - Added toggle (`subHaloIndicator`, default: `true`) and 4-color palette selector (`🟢 Emerald`, `🔵 Neon Cyan`, `🟡 Amber Gold`, `🟣 Royal Violet`) in Developer Options.
- **Mobile Undo/Redo Icon Selector in Developer Options**:
  - Added interactive button style picker with live cards: `Curved` (`↩ ↪`), `Circular` (`↺ ↻`), `Geometric` (`◀ ▶`), and `Micro-Text` (`↶ ↷`).
  - Style selection immediately locks and applies to header buttons across all viewports.

### Changed
- **Free Dispute by Default Policy**:
  - Disabled the 10-second acceptance countdown timer by default. Substitutions are now free to dispute at any point without lock-in restrictions.
  - Relocated Acceptance Countdown Timer toggle (default `false`) and duration selector (`5s`, `10s`, `30s`, `60s`) into 🛠 Developer Options for administrators requiring permanent lock-ins.
- **Cross-Period Policy Relocation**:
  - Maintained `samePeriodLock: true` as the enforced default policy.
  - Relocated toggle out of visible Settings into 🛠 Developer Options to declutter front desk UI.
- **Concise, High-Density Toast Messages (Microcopy Streamlining)**:
  - Audited and trimmed wordy toasts across `app.js` into punchy 2–4 word microcopy (e.g. `Edit mode enabled`, `Baseline routine restored`, `Locked by acceptance`, `History purged`, `Co-teachers kept paired`).

### Fixed
- **Absent Teacher Subject Visibility in Utopian Night Theme**:
  - Corrected low-contrast styling in `[data-theme="utopian-night"]` by applying deep crimson background (`rgba(45, 12, 22, 0.72) !important`), bright crimson glow (`#ff4d4d !important; text-shadow: 0 0 10px rgba(239, 68, 68, 0.5)`), and red-tinted class tags on absent teacher rows and missing cells.

## [v1.41.0] - 2026-10-15

### Added
- **In-Situ Grid Teacher Quick Action Modal (`FEAT-08`)**:
  - Touch-hold (500ms on mobile) and right-click (desktop) with tactile haptic vibration (`navigator.vibrate([45, 60])`) directly on any teacher's name cell in the leftmost routine table column.
  - Launches an instant iOS-style Action Sheet (`#teacher-quick-action-modal`):
    - 1-tap `[ 🔴 Mark Absent Today ]` or `[ 🟢 Mark Present Today ]` toggling attendance directly without scrolling back up to the top attendance tray.
    - 1-tap `[ ⛔ Sub-Availability & Duties ]` linking directly into the teacher's rapid availability card.
    - Contextual `[ 🏫 Assign Off. CT. ]` shortcut if an absent teacher is a designated Class Teacher.
- **Reset Button History Purge Shortcut**:
  - Touch-hold (500ms) or right-click on the schedule Reset button (`#reset-schedule-btn` and `#more-item-reset`) opens a dedicated confirmation modal (`#history-purge-modal`).
  - Purges all undo/redo action history buffers from memory on demand without resetting the day's timetable schedule or absences.

### Changed
- **Two-Zone Routine Header Bar (Pinned View Selector & Scrollable Controls)**:
  - Re-architected `.routine-header` into two distinct ergonomic zones:
    - **Pinned Left Zone (`.routine-header-pinned`)**: Compact Apple-style dropdown selector (`#routine-view-select`, `👨‍🏫 Teachers ▾` vs `🏫 Classes`), bordered on the right with a subtle vertical divider (`1px solid var(--border-color)`).
    - **Scrollable Right Zone (`.routine-header-scrollable`)**: Horizontal smooth scroll container (`overflow-x: auto; -webkit-overflow-scrolling: touch`) housing `⛶` Expand, `Hide Absent` toggle switch, and conflict/displaced badges. Eliminates button compression and layout jumps on narrow portrait screens.

### Fixed
- **Absent Teacher Subject & Missing Cell Visibility in Utopian Night & Glass Themes**:
  - Enforced deep crimson glass background (`linear-gradient(135deg, rgba(239, 68, 68, 0.32) 0%, rgba(153, 27, 27, 0.22) 100%)`) with luminous red border (`1.5px solid rgba(239, 68, 68, 0.75)`) and soft red glow on `.cell-missing` in `utopian-night` and `cyber-glass`.
  - Enforced bright red text (`#f87171` in dark themes, `var(--accent-red)` universally) on `.row-absent .cell-subject-name` and `.cell-missing .cell-subject-name` so absent teachers' subjects are unmistakably identifiable across all themes.

## [v1.40.0] - 2026-10-15

### Fixed
- **Sticky Teacher Column Translucency Clashes (`BUG-05`)**:
  - Enforced 100% solid opaque background (`--surface-opaque`) on `.routine-table th:first-child`, `.routine-table td:first-child`, `.class-header-cell`, and `.class-name-cell` across all theme modes (classic light, warm sepia, dark, midnight OLED, slate nord, retro glass, and utopian glass).
  - Fixed absent teacher row opacity leak: ensured `.row-absent td:first-child` retains solid 100% opacity with red text so passing cards sliding underneath never bleed through teacher names.
- **Hide Absent Toggle Knob Overshoot**:
  - Enforced `flex-shrink: 0` on `.toggle-switch` and `.slider` to prevent horizontal squishing on narrow portrait screens.
  - Aligned knob translation flush with the pill boundary with smooth cubic-bezier easing.
- **Fit-Grid Portrait Overflow & Cell Height Distortion (`BUG-04`)**:
  - Prevented table and containers from bleeding past portrait viewport boundaries with strict `max-width: 100vw; overflow-x: hidden; box-sizing: border-box;`.
  - Enforced strict cell height cap (`height: 38px; max-height: 44px; overflow: hidden;`) with single-line text ellipsis in portrait Fit-Grid mode, stopping cells from vertically ballooning into giant multi-line blocks.
  - Dynamically adapts column proportions and provides friendly orientation toast guidance.

### Changed
- **Icon-Only Expand Button**:
  - Removed verbose "Fit Grid" text from `#fit-grid-btn`, leaving a clean, high-density Apple-style icon button (`⛶`), immediately reclaiming ~65px width in the routine header.

## [v1.39.0] - 2026-10-15
 
### Added
- **Rapid 1-Tap Substitution-Availability Card (Boomer / Layman Ergonomics)**:
  - Completely redesigned `#sub-avail-modal` into a lightning-fast dual-view action sheet tailored for front desk staff.
  - **Quick Single-Teacher Action Mode**:
    - Triggered automatically when long-pressing (500ms on touch) or right-clicking any teacher's avatar in the Mark Absence tray.
    - Prominently showcases teacher name, assigned role, and live availability pill (`🟢 Available` / `⛔ Unavailable: Reason`).
    - Massive 1-tap action button (`[ ⛔ Mark Unavailable Today ]` or `[ ✓ Set Back to Available ]`).
    - 6 auto-saving duty chips (`🚌 Bus Duty`, `📝 CBSE Duty`, `👥 Parent Meet`, `📑 Exam Duty`, `🩺 Sick Bay`, `🎪 Event Duty`) that instantly apply the remark, save state, buzz haptics, and dismiss the modal in a single tap.
    - Custom remark input supporting Enter key submission for special situations.
  - **All-Staff Quick-Checklist Mode**:
    - Accessible via tray button (`⛔ Sub-Availability`) or 3-dot overflow menu.
    - Displays all 9 teachers with instantaneous 1-tap status buttons (`✓ Available` vs `⛔ Duty`), completely eliminating cumbersome dropdown search menus.
    - Each row includes a quick `✏` edit button to drill down into the single-teacher action sheet.
- **Fluid View Switcher**:
  - Segmented control toggles between `⚡ Quick Action` and `📋 All Staff (N)`.
  - Dynamic footer toggle link (`📋 View All Staff (9)` / `⚡ Quick Action`) for frictionless navigation.

## [v1.38.0] - 2026-10-15

### Added
- **Locked-in User-Selected Roster Color Palette**:
  - Class Teachers (CT): Calm Teal Sky / Cyan (`#0284c7` / `rgba(2, 132, 199, 0.14)`).
  - Subject Teachers (ST): iOS Blue (`#007aff` / `rgba(0, 122, 255, 0.14)`).
  - Coordinator Badges (`AC` & `A.AC`): Unified Purple (`#8b5cf6`).
  - Absent State: Crimson Red (`#ff3b30` / `rgba(255, 59, 48, 0.16)`).
- **Android-Style Developer Options Easter Egg**:
  - Tapping the "Version" row in Settings 5 times triggers haptic vibration (`navigator.vibrate([50, 100, 50])`), tap countdown toasts, and reveals the Developer Options group (`#roster-color-settings-group`) with a visible `[ 🛠 Dev Unlocked ]` pill and 1-tap "Lock" control.
- **1-Tap Browser Fullscreen API (`toggleBrowserFullscreen`)**:
  - Added Fullscreen toggle to 3-dot overflow menu and Settings panel with cross-browser support (`requestFullscreen` / `webkitRequestFullscreen`), automatically hiding URL bar and navigation headers.
- **Fit-Grid In-Place Editing**:
  - Added "Edit Schedule" button inside `#fit-grid-sticky-bar`, allowing direct timetable edits without exiting Fit-Grid view.
  - Widened first column to 15% (min 80px) with 700 font weight for crisp teacher name legibility.

### Changed
- **Mobile Edit Button Brought Outside**:
  - Removed `header-desktop-only` restriction from `.edit-btn-group`, positioning the Edit button directly in the mobile header next to Undo/Redo.
  - Responsive typography allows compact text on standard phones and graceful icon-only collapse under 360px.
- **Synchronized Edit State across Header, Fit-Grid & 3-Dot Menu**:
  - When edit mode is active, `#edit-toggle-btn` displays `✓ Done Editing` with vibrant green highlight (`save-mode`).
  - In 3-dot overflow menu, dynamically updates from `Edit Routine` to `Done Editing (Save)` with an emerald `● In Edit Mode` badge, eliminating ambiguity.
- **Settings Menu Decluttering (Layman & Boomer Ergonomics)**:
  - Reorganized sections in intuitive flow: Role & Identity $\to$ Cloud Sync $\to$ Preferences & Protection $\to$ Appearance & Display $\to$ Baseline Tools $\to$ Application Info.
  - Collapsed 12-card theme selector into 3 quick pills (`☀️ Light`, `🌙 Dark`, `💠 Utopian`) + a clean `More Themes...` dropdown.
- **Admin PIN Privacy & Interactive 3-Step Change Flow**:
  - Removed plaintext/dotted password input from Settings; replaced with masked `••••` and a `[ 🔑 Change PIN ]` button.
  - Launches secure Apple HIG keypad workflow: Verify Current PIN $\to$ Set New 4-digit PIN $\to$ Confirm New PIN.

## [v1.37.1] - 2026-10-15

### Added
- **Temporary Interactive Roster Color Customizer**:
  - Added a dedicated tuning panel in Settings under "🎨 Roster Blob & Badge Colors" allowing live color selection for:
    - Class Teacher (CT) Blobs (default updated to Royal Violet `#af52de`).
    - Subject Teacher (ST) Blobs (default iOS Blue `#007aff`).
    - Coordinator Badges (AC & AAC) (default Amber Gold `#f59e0b`).
    - Absent State Rings & Fills (default Crimson `#ff3b30`).
  - Equipped with full HTML5 color pickers, quick-select preset swatches, real-time live preview across the app, and a 1-tap "Reset Defaults" button.
- **Unified Coordinator Badges**:
  - Matched AC (`Mrs. R. Pahwa`) and Assistant AC (`Mrs. S. Lakra`) badges to the exact same background color, eliminating visual hierarchy discrepancy.

### Fixed
- **Class Teacher vs. Absent Color Clash**:
  - Replaced the previous pink CT accent (`#ff2d55`), which visually collided with absent red (`#ff3b30`), with calm, non-obnoxious **Royal Violet** (`#af52de` / `rgba(175, 82, 222, 0.14)`).

## [v1.37.0] - 2026-10-15

### Added
- **Color-Coded Teacher Blobs (Pink CTs & Blue STs)**:
  - Redesigned the Mark Absence Panel avatars into high-clarity color-coded circular blobs:
    - **Pink Blobs** for Class Teachers (`Mrs. S. Lakra`, `Mrs. M. Midha`, `Mrs. R. Pahwa`, `Mrs. R. Narayan`).
    - **Blue Blobs** for Subject Teachers, 2nd Teachers, and 3rd Teachers (`Ms. N. Horo`, `Ms. K. Sanga`, `Ms. A. Amira`, `Mrs. S. Bage`, `Mr. S. A. Lakra`).
  - Added lower-right corner badges on the circular blobs for school leaders:
    - `AC` badge for Academic Coordinator (`Mrs. R. Pahwa`).
    - `A.AC` badge for Assistant Academic Coordinator (`Mrs. S. Lakra`).
    - `⚡` badge for Officiating AC when active.
- **Subtle Vertical Splitters (`.roster-splitter`)**:
  - Inserted 1px translucent vertical gradient dividers between each teacher avatar card in the Mark Absence tray, matching the hardware-segmented aesthetics of the bottom navigation bar.
- **Vertical Class/Subject Cell Stacking Architecture**:
  - Replaced inline task strings like `PREP B (MATH)` with vertically stacked layout: Class Name (`.cell-class-tag`) on top, Subject (`.cell-subject-name`) below.
  - Slashes period column width from 86px down to **54px on mobile** and **92px on desktop**, fitting 5–6 full periods on mobile portrait and eliminating text overflow.
- **Grid Status Footer**:
  - Relocated `.version-badge` from the congested header into a subtle footer strip below `#limbo-wrapper`.

### Changed
- **Header Space Reclaim**:
  - Removed redundant `#role-badge-btn` (`🛡 Admin`) from the header top bar, saving ~90px of horizontal space. Role switching and permission status remain cleanly housed within Settings.
- **Teacher Column Narrowing**:
  - Compressed sticky teacher column to **78px on mobile** (down from 108px) and **120px on desktop** (down from 148px).
- **Class Teachers Priority Order**:
  - Enforced strict priority ordering across both the Mark Absence tray and the Timetable Matrix so Class Teachers always render first.
- **Role Accuracy**:
  - Updated `Mr. S. A. Lakra` from "3rd Teacher / Support" to strictly "3rd Teacher".

## [v1.36.0] - 2026-10-15

### Added
- **Touch Device Long-Press for Substitution Availability**:
  - Added a 500ms touch-and-hold listener with haptic vibration feedback (`navigator.vibrate(40)`) on teacher avatar cards (`.teacher-avatar`), enabling phone users to easily open the Substitution Availability modal (`#sub-avail-modal`) without needing right-click.
  - Suppressed the standard short-tap absence toggle whenever a long-press triggers.
  - Retained desktop right-click (`contextmenu`) intact for mouse users.
- **Full Teacher Honorifics & Respectful Titles**:
  - Preserved full respectful prefixes (`Mrs. S. Lakra`, `Ms. N. Horo`, `Mr. S. A. Lakra`) in `renderAbsentTray()`, attendance cards, and table displays.
- **Undo/Redo History Reset Policy & Manual Purge**:
  - Added auto-reset of `state.actionHistory` on day navigation, preventing cross-day undo contamination.
  - Added a dedicated "🗑 Purge History" button (`#btn-purge-history`) in Settings under Application Info with instant toast confirmation.

### Fixed
- **High-Density Mobile Grid Architecture**:
  - Reversed layout bloat on mobile screens: collapsed cell heights back to ~38px–40px (down from ~95px), allowing 7–8 teacher rows to fit above the fold.
  - Compressed sticky teacher column to 108px with streamlined inline role badges (`.teacher-badges-container`) and hidden secondary subtitles on mobile.
  - Tightened period columns to 86px width (min 80px, max 92px) with compact `3px 2px` padding and `border-collapse: collapse !important`.
  - Scaled absence tray circle avatars to 28px × 28px, reducing overall tray height from 120px to ~48px.
- **Mobile Landscape Viewport & Single-Bar Header**:
  - Scoped desktop controls display to `@media (min-width: 640px) and (min-height: 501px)` to prevent phones in landscape (`height <= 500px`) from dumping all desktop buttons and overflowing.
  - Consolidated header, app identity, and day selector into a unified, slim 36px bar in landscape, eliminating day-bar overlap over row 1 of the timetable.
  - Reduced mobile landscape bottom navigation height to 36px, maximizing usable timetable grid area to 280px+ vertical height.

## [v1.35.0] - 2026-10-14

### Fixed
- **BUG-01 (Limbo Tray Drag & Smart Restore with Haptic Jitter)**:
  - Enabled direct drag-and-drop from the Limbo tray (`#displaced-tray`) across all application modes (`div.draggable = true`).
  - Implemented one-tap **Click-to-Restore**: tapping any displaced card immediately checks if its original source slot `(ogTeacher, period)` is `Free`, cleanly restoring the class and logging it to the action history.
  - Implemented full **Undo/Redo Support** (`restore_displaced`) in `undoLastAction()` and `redoLastAction()`.
  - Added phone-style side-by-side **Error Jitter** (`@keyframes errorJitter`) with emergency red glow and tactile vibration (`navigator.vibrate([45, 55, 45])`) whenever restoration is blocked by an occupied cell or invalid drop target.
- **BUG-02 (Instant Viewport & Silk-Scroll Optimization)**:
  - Promoted `.table-scroll-container` and sticky table column/cells to independent GPU composite layers (`transform: translateZ(0)`, `contain: paint layout`, `-webkit-overflow-scrolling: touch`).
  - Added width-change guards and debouncing to `window.resize` observer so mobile vertical scrolling (address-bar collapse/expansion) never triggers table layout thrashing or synchronous reflows.
  - Relocated heavy `backdrop-filter` from `.table-scroll-container` to `.master-routine-container`, eliminating continuous per-frame blur re-filtering during scroll.

### Added
- **Utopian Night Mode (`utopian-night`)**:
  - Engineered dark glass refraction theme with deep obsidian/midnight-sapphire backdrop (`linear-gradient(145deg, #03070f, #0a1930)`), 28px frosted diffusion, and radiant neon-cyan prismatic edge highlights (`inset 0 1.2px 1px rgba(0, 229, 255, 0.45)`).
  - Categorized under `🪟 Glass Materials` family in Settings alongside *Utopian Glass*, *Aero Frost*, and *Cyber Glass*.

---

## [v1.34.0] - 2026-10-14

### Added
- **Utopian Glass Complete Overhaul (*Divergent Upper-City Aesthetic*)**:
  - Transformed the flat pastel-blue theme into an ethereal, pristine architectural glass environment inspired by *Divergent* upper-city headquarters.
  - Added multi-stop iridescent ambient gradients, specular top-edge sheen catches (`inset 0 1.5px 1px rgba(255, 255, 255, 0.95)`), chromatic refraction borders, deep frosted diffusion (`backdrop-filter: blur(28px) saturate(210%)`), and radiant cyan ambient reflections across table cells, headers, avatars, and docks.
- **Theme Taxonomy & Sub-Category Variant Architecture**:
  - Reorganized the flat theme selector in Settings into three **Base Families** with curated sub-category variants:
    - **🪟 Glass Materials**: *Utopian Glass*, *Retro Glass*, *Aero Frost* (new), *Cyber Glass* (new).
    - **☀️ Minimalist & Paper**: *Auto (System)*, *Classic Light*, *Warm Sepia*, *High Contrast* (new).
    - **🌙 Dark Modes**: *Classic Dark*, *Midnight OLED*, *Slate Nord*.
  - Added interactive category segmented tabs in Settings that dynamically filter and display the corresponding variant swatch grids.
- **Desktop Zero-Scroll Viewport Layout**:
  - Streamlined desktop layout hierarchy: reduced header vertical padding, compacted day selector, and optimized absent tray height, returning over 100px of vertical space to the master routine.
  - Routine table now fits comfortably **above the fold** without requiring vertical scrolling down on desktop screens.
- **Commercial Mobile Adaptive Layout with 3-Dot Overflow Menu (`⋮`)**:
  - Preserved **100% mobile feature parity** for teachers while preventing header toolbar crowding on small screens.
  - Tucked secondary administrative actions (`Reset to Baseline`, `Edit Schedule`, `Sub-Availability`, `Fit Grid`, and `Features Tour`) into a sleek Apple-style glass overflow dropdown (`#header-more-popover`).
- **Dynamic Viewport Engine (`computeViewportLayout`)**:
  - Automatically measures viewport dimensions, sets device datasets on `document.body`, and dynamically computes optimal table scroll container constraints on resize and orientation changes.

---

## [v1.33.1] - 2026-10-14

### Fixed
- **Orphan Substitution Cleanup on Un-marking Absent Teachers**:
  - Resolved bug where un-marking an absent teacher (toggling back to Present) left behind stale substitution records in `state.substitutions`, creating ghost substitutions on present teachers (e.g. Mr. S. A. Lakra appearing with coverage badges `↳ N. Horo`, `↳ K. Sanga`, `↳ A. Amira` while present).
  - Added `revertSubstitutionsForTeacher(teacher, day)` to cleanly release all substitutes, restore substitute schedules to original tasks/free, restore returning teacher schedules, and resolve displacements when an absence is cancelled.
  - Implemented self-healing `cleanupOrphanSubstitutions(day)` invoked on `loadStateFromStorage()`, `renderAll()`, and day switches to automatically sanitize any legacy or persisted orphan substitution records.
- **Substitution-Aware Co-Teaching Conflict Detection**:
  - Enhanced `findConflicts()` with `areTeachersCoTeachingPartners(day, period, t1, t2)` and `getTeacherCoveringFor(t, period, day)`.
  - When a substitute teacher steps in to cover an absent co-teacher (e.g. covering Mr. S. A. Lakra in `KG A: HIN. KAV./GEET`), the conflict detection engine now recognizes that the substitute inherits the co-teaching partnership with the present partner (e.g. Ms. N. Horo).
  - Suppressed 8 cascading false-positive duplicate class conflicts previously triggered across periods 2nd, 3rd, 4th, and 6th.
- **Grid Rendering Guards for Present Teachers**:
  - Guarded `assignedSub` in `renderTableRoutine()` with `isAbsent` so present teachers never render as `cell-covered` with substitute coverage tags.
  - Guarded `coveringFor` in `renderTableRoutine()` to ensure colleagues only render as substituting for teachers who are actively present in `state.absentTeachers`.

---

## [v1.33.0] - 2026-10-14

### Added
- **Teacher Substitution Unavailability Engine**:
  - Ability to designate present teachers as unavailable for substitution duties for the day.
  - Dedicated **⛔ Sub-Availability** modal (`#sub-avail-modal`) with teacher selector, toggle switch, and optional custom remark input (up to 80 chars).
  - One-tap quick suggestion chips for common school duties: `🚌 Bus Duty`, `📝 CBSE Evaluation`, `👥 Parent Meeting`, `📑 Exam Correction`, `🩺 Sick Bay`, and `🎪 Event Prep`.
  - Right-click / contextmenu quick shortcut on any teacher avatar in the absent tray to immediately configure availability.
  - Persistent state under `state.subUnavailable[day] = { [teacher]: remark }` saved to local storage.
- **Interactive `?` Remark Popover**:
  - Replaced raw inline remark text with a distinct, visually identifiable blue circular **`?`** button (`.btn-sub-reason-help`).
  - Clicking `?` opens a floating popover (`#sub-remark-popover`) displaying teacher name and their exact reason (e.g. *"Bus Duty: Afternoon route 3 inspection"*), with polite fallback for blank remarks.
  - Smooth click-away and close button dismissal.
- **Dedicated Excluded Substitutes Section**:
  - Bottom sheet substitution picker (`openBottomSheet`) now renders a dedicated **⛔ Unavailable for Substitution** section listing excluded teachers with their status pill and interactive `?` button.

### Changed
- **Terminology Transition ("Collision" → "Conflict")**:
  - Transitioned terminology strictly from "Collision" to **"Conflict"** across the entire application.
  - Header pill updated to `⚡ X Conflict(s)` with tooltip `Click to inspect conflicts`.
  - Settings toggle updated to **Highlight Conflicts** (`#detect-collisions-toggle`).
  - Master Routine Cell Inspector warning updated to `Warning: Section X conflict: ...`.
  - Core engine function transitioned to `findConflicts()`, maintaining `findCollisions()` as a full backward-compatible alias.
- **Grid Ergonomics & Period Column Harmonization**:
  - Harmonized master routine table column dimensions: sticky first column (`th:first-child`, `td:first-child`) standardized to `148px` width.
  - Period columns standardized to balanced `112px` (min `104px`, max `118px`).
  - Break column standardized to compact `58px`.
  - Wrapped and centered multi-line header text for `PLAYTIME / 2ND GOLDEN HOUR` to prevent warping adjacent columns.
- **Smart Auto-Resolve Solver & Candidate Pool Exclusion**:
  - Unavailable teachers are strictly excluded from substitute candidate pools across all 3 Auto-Resolve heuristic strategies (`subject-match`, `balanced-load`, `minimal-splits`).
  - Excluded from manual substitution assignment in the bottom sheet.

### Fixed
- **Shared Class False-Positive Conflict Suppression**:
  - Resolved false-positive conflicts on legitimate joint/shared classes (e.g. Tuesday G/PD Drill where Ms. A. Amira teaches `1ST DRILL PREP A`, Mrs. S. Bage teaches `2ND DRILL PREP B`, and Mr. S. A. Lakra teaches `DRILL PREP A + PREP B`).
  - Enhanced `getCoTeachingPartners()` with ordinal prefix normalization (`1ST`, `2ND`, `3RD`, `4TH`).
  - Enhanced `findConflicts()` with root subject extraction (`extractRootSubject`) and baseline verification (`allInBase`) ensuring planned shared classes are recognized as collaborative rather than conflicting.

---

## [v1.32.1] - 2026-10-14

### Fixed
- **Primary Button Contrast**: Resolved blue-on-blue invisible text on filled `.btn-primary` action buttons (`#btn-conflict-accept-cloud` in Cloud Conflict Dialog and `#btn-sync-now` in Settings Panel) by enforcing high-contrast white text (`color: #ffffff !important;`).
- **Co-Teaching Solo Badge**: Clarified co-teaching split badge behavior to retain the exact same `👥 Co-teaching` badge (greyed out) with softened border when a teacher is covering solo after a partner is split/released.

---

## [v1.32.0] - 2026-10-14

### Added
- **Full 2-Way Google Sheets Cloud Integration**:
  - Connected Front Desk to the deployed Google Apps Script Web App endpoint (`/exec`).
  - **Pull (`doGet`)**: Streams master routine from the `OVERVIEW` tab as clean CSV directly into Front Desk with dynamic header detection across first 10 rows.
  - **Push (`doPost`)**: Securely handles live updates without third-party dependencies.
- **Google Sheets Tab Architecture**:
  - 🟦 `Daily_Ledger` tab with Apple HIG blue headers, frozen header row, and `warningOnly` protection for real-time substitution audit logging.
  - 🟧 `Baseline_Updates` tab with frozen header row and `warningOnly` protection for permanent master routine modifications.
- **Automatic & Manual Cloud Push Pipeline**:
  - Automatically posts accepted substitutions to `Daily_Ledger` upon 10-second countdown completion in `startAcceptSubCountdown()`.
  - Automatically posts audited slot differences to `Baseline_Updates` when saving master routine revisions in `saveMasterBaseline()`.
  - Added 1-tap **`☁ Push to Sheets`** in Daily Substitution Register and **`📤 Push Today's Ledger`** in Settings.

---

## [v1.31.0] - 2026-10-14

### Added
- **RFC 4180 State-Machine CSV Parser**: Pure zero-dependency lightweight parser (`parseCSV`) supporting escaped quotes (`""`), multi-line cells, comma preservation inside strings, and CR/LF cross-platform line breaks.
- **Google Sheets Cloud Sync Engine**: Settings configuration for published web CSV link or Sheet ID with automatic URL normalization (`normalizeCSVUrl`).
- **Cloud vs. Local Conflict Resolver Modal**: Compares incoming Google Sheets allocations against local `state.baseSchedule` via `calculateScheduleDiffs()`.
- Interactive diff comparison list showing affected teacher count, days, and slot difference count with choices: **"✓ Accept Cloud Routine"** vs. **"Keep Local Changes"**.

---

## [v1.30.0] - 2026-10-14

### Added
- **Protected In-App Master Routine Editor**:
  - Toggled via header lock button (`#master-lock-btn`).
  - Interactive Cell Inspector modal (`#master-cell-modal`) with class section quick selector, curriculum-aware subject chips from official Excel pools, and co-teaching partner assignment.
- **Apple HIG 4-Digit Passcode / PIN Pad Modal**:
  - Secures Master Routine baseline editing behind an Apple-style circular numeric keypad (`0-9`, `⌫`) with animated indicator dots (`.pin-indicator-dots`) and tactile shake feedback.
  - Configurable PIN (`state.settings.adminPin`, default `1234`) with instant update in Settings for Admin and AC roles.

---

## [v1.29.0] - 2026-10-13

### Added
- **Multi-Role Hierarchy & Permissions**: Support for `Admin`, `Academic Coordinator (AC)`, `Assistant AC`, and `Teacher` roles with live header badge and Settings role switcher.
- **Assistant AC Parity**: Assistant AC holds identical permissions to the primary AC.
- **Dual-Absence Officiating AC (`offAC`)**: Contingency banner automatically prompts assigning an `offAC` when both AC and Assistant AC are absent on the same day.
- **Officiating Class Teacher (`offCT`)**: Prompts assignment of an officiating CT when any Class Teacher is absent.
- **Teacher Substitution Acceptance Flow**: Interactive 10-second countdown timer (`⏳ Confirming 10s • Undo`) before permanent lock-in (`🔒 Accepted`).
- **Role-Gated Substitution Dispute Engine**: Optional setting for substitute teachers to dispute assignments with a rationale note.

---

## [v1.28.0] - 2026-10-13

### Added
- **Inline Co-Teacher Release**: Actions (`Release`, `Free Day`, `↩ Rejoin`) located directly inline beside teacher names in `#co-teach-modal`.
- **High-Density Daily Substitution Register**: Replaced cards with a compact, scannable table with summary stats (`Total`, `Pending`, `Covered %`), filter pills (`All`, `Pending`, `Covered`), and 1-click assignment controls.
- **Expanded Fit-Grid View**: 1-tap `⛶ Fit Grid` mode scaling the timetable grid to 100% viewport width with sticky floating top bar for mobile landscape viewing.
- **Priority Preference Matrix**: Subject, department cluster, section familiarity, and workload scoring engine ranking candidate substitutes.
- **3-Option Smart Auto-Resolve Solver**:
  - `Option 1: Subject Match (★ Best Academic Fit)`
  - `Option 2: Balanced Load (⚖ Lightest Workload)`
  - `Option 3: Minimal Splits (🛡 Preserve Co-Teaching)`

---

## [v1.26.0] - 2026-10-12

### Added
- **Smart Co-Teaching & Shared Badges**: Distinct purple `👥` badge for shared teaching allocations with partner cell breathing highlight.
- **Direct Drag-to-Split**: Dragging onto either co-teacher splits them cleanly without displacing to Limbo.
- **Option-Click (`Alt + Click`) Rapid Reset Engine**: Springy tactile bounce animation on reset; moved subjects safely returned to their origin.
- **Themes**: Added Utopian Glass and Retro Glass full UI themes.

---

## [v1.24.0] - 2026-10-12

### Added
- **Collision Detection & Gentle Radar**: Animated pulsing amber radar ring (`@keyframes collisionBreathe`) on duplicate class section bookings.
- **Settings Hub & Theme Selector**: 7 Apple-inspired palettes (Auto, Light, Sepia, Dark, Midnight OLED, Slate Nord, Retro Glass).
- **History Segmented Control**: Stable `.history-btn-group` pill preventing rapid-click jumping loops.

---

## [v1.22.0] - 2026-10-11

### Added
- **Drag-to-Assign Substitutions on Master Grid**: Missing classes draggable directly onto teachers to assign substitutes with real-time green coverage highlights.
- **Limbo Tray Displacement**: Busy teachers' classes displaced safely into a floating bottom tray.

---

## [v1.18.0] - 2026-10-11

### Added
- **Native Dark Mode & Apple Theme Tokens**: System preference auto-detection, manual theme switching, and tactile SVG vector icons.

---

## [v1.17.0] - 2026-10-11

### Added
- **Baseline Reset Button**: Added a dedicated `↺ Reset` button next to the Edit toggle. Instantly reverts the current day's working grid and substitutions back to the original `baseSchedule`.
- **Reset Undo Integration**: Fully integrated the reset action into the dual-stack undo engine, capturing the entire wipe as a single snapshot that can be reversed with one click.

### Changed
- **Unrestricted Ghost Slide**: Removed `overflow: hidden;` from grid cells and extended the `ghostSlideOut` animation drop distance to `45px` (a full slot height), allowing the displaced class text to visibly drop *over* the cell below it.

---

## [v1.16.0] - 2026-10-11

### Changed
- **Inline Limbo Tray Flow**: Moved the Limbo Tray out of its floating overlay state and back into the standard document flow directly below the grid. It now gracefully expands (`grid-template-rows: 0fr` to `1fr`) pushing the page scroll boundary down without shifting the grid underneath the user's fingers.

---

## [v1.15.0] - 2026-10-11

### Added
- **Floating Limbo Dock (Initial Version)**: Replaced the static displaced tray with a glass-morphism dock that slides up from the bottom.
- **Drag-Out Indicator**: Cells now instantly visually shrink to 95% scale and drop to 40% opacity (`cell-dragging`) the moment a drag is detected to confirm the grab.
- **Swipe-to-Dismiss Bottom Sheet**: Added native iOS-style touch-drag-to-close physics to the bottom sheet grey handle (`deltaY > 80px`).

### Fixed
- **Mobile Ghost Clicks**: Locked down event propagation (`e.stopPropagation()`, `e.preventDefault()`) on the bottom sheet overlay to prevent taps from falling through and accidentally triggering the bottom navigation bar underneath.
- **Dark Mode Animation Clash**: Removed hardcoded stark white backgrounds from the `flashRedOverwrite` animation, ensuring the soft pink ring respects dark mode inversion cleanly.

---

## [v1.14.0] - 2026-10-11

### Added
- **"Juicy" Overwrite Animations**: Overhauled UI feedback for copy-and-overwrite drag mechanics.
  - Added a soft Apple `accent-pink` (`rgba(255, 45, 85)`) bounding ring that scales down, curves, and springs back out on cell drop (`flashRedOverwrite`).
  - Added a translucent pink wash to the inner cell background that smoothly transitions back to default blue.
- **Ghost Slide Physics**: Overwritten text now turns pink, drops behind the new text, and softly slides downward (`ghostSlideOut`) to visually communicate displacement.

---

## [v1.13.0] - 2026-10-11

### Added
- **Contextual Overwrite Animations**: Grid drop behavior divided into two distinct visual feedback states. An empty drop triggers a standard pop-in, while overwriting an occupied class triggers an aggressive red flashing inset border (`.cell-displaced-flash`) to signal displacement.

### Changed
- **Targeted Tray Physics**: Restricted the popIn animation to apply exclusively to the single newly displaced item entering the Limbo Tray, allowing existing tray items to remain static and shift via standard flexbox flow.

---

## [v1.12.0] - 2026-10-11

### Added
- **Inline Displaced Indicator**: Added a static, space-efficient red pulsing badge (`#displaced-indicator`) directly beside the "Master Routine" header to warn of displaced classes without consuming vertical real estate.

### Changed
- **Tray Flow Restoration**: Restored the Limbo Tray to the standard document flow beneath the grid, reverting it from a floating overlay to ensure it pushes the scroll boundary naturally.

### Removed
- **Bulky Warning Bar**: Eliminated the full-width displaced warning banner above the grid to prevent layout jumping upon error state activation.

---

## [v1.11.0] - 2026-10-11

### Changed
- **Substitutions Tab Icon**: Updated the bottom navigation icon for the Substitutions tab from a warning symbol to a neutral swap/sync icon (`🔄`) to reflect its permanent dashboard identity and reduce false alarms.

---

## [v1.10.0] - 2026-10-11

### Added
- **Smooth Expansion Wrapper**: Encapsulated the Limbo Tray in a dynamic CSS Grid container (`#limbo-wrapper`) utilizing a `0fr` to `1fr` transition template.

### Fixed
- **Layout Shifting**: Eliminated vertical layout shift that previously forced the main table down when the dynamic warning bar and Limbo Tray appeared.

---

## [v1.9.0] - 2026-10-11

### Added
- **Tactile Grid Drop Feedback**: Applied a satisfying popIn animation (`.cell-just-dropped`) to grid target cells immediately upon receiving a dropped class from another grid slot or the Limbo Tray.

---

## [v1.8.0] - 2026-10-11

### Added
- **Top-Level Alert Positioning**: Relocated the displaced classes warning banner to sit directly above the main grid for instant visibility, enhanced with an Apple-style pulsing red attention dot.
- **Limbo Tray Animations**: Replaced janky trajectory physics with fluid, iOS-style `popIn` animations for displaced items entering the Limbo Tray.

---

## [v1.7.0] - 2026-10-11

### Added
- **The Limbo Tray (Displaced Classes)**: Engineered a dedicated holding area beneath the active grid to catch and temporarily store classes that are overwritten during manual grid manipulation.
- **Bidirectional Reassignment**: Enabled classes to be dragged or tapped directly out of the Limbo Tray and dropped back onto free slots on the active grid.

---

## [v1.6.0] - 2026-10-11

### Added
- **Baseline Truth Architecture (`state.baseSchedule`)**: Separated the active working grid from the original master routine, allowing the memory engine to permanently track original class ownership for accurate absence detection regardless of manual shuffling.
- **Persistent Substitutions Dashboard**: Upgraded the temporary Resolver into a permanent command center featuring a Dual-State UI. Unassigned absences generate Pink action cards, and assigned coverages transition into permanent Green audit cards.
- **Celebratory Empty States**: Built "All Clear!" and "Fully Covered" UI screens to provide immediate visual confirmation when substitution tasks are complete.
- **Batch Auto-Resolve Algorithm**: Wired up a single-click resolution engine (**✨ Auto-Resolve**) that scans the uncorrupted baseline, identifies unassigned absences, hunts free teachers, and executes bulk assignments simultaneously.

---

## [v1.5.0] - 2026-10-10

### Added
- **Native Smooth Edge-Scrolling**: Built an animation-frame edge-scrolling engine triggering when dragging classes near the desktop viewport boundaries.
- **Crash-Proof Local Storage**: Enforced strict synchronous writes to `localStorage` (`lfps_frontdesk_state`) on every single interaction to guarantee zero data loss on browser crash or reload.
- **Cache-Busting Initialization**: Appended dynamic version tags (`?v=1.5`) to stylesheet and script sources to force immediate cache invalidation on mobile devices.

### Changed
- **Movement Engine Rebuild (Copy & Overwrite)**: Stripped out the flawed swap logic. Dragging a class now strictly overwrites the target slot and completely frees the original slot, granting absolute manual control over the grid.
- **Context-Aware Undo Engine**: Divided the single history array into a dual-stack setup (`actionHistory.grid` and `actionHistory.subs`). The UI now accurately reverses drag-and-drop grid moves when on the Dashboard tab, and substitution assignments when on the Substitutions tab.

---

## [v1.0.0] - 2026-10-10

### Added
- **Initial Front Desk PWA Release**: Built the foundational vanilla JS/HTML/CSS offline-first application.
- **Dual-State Baseline Architecture**: Implemented the immutable `baseSchedule` (master routine) versus the mutable `schedule` (active working grid).
- **Copy-and-Overwrite Engine**: Engineered a custom HTML5 drag-and-drop system where dragging Class A onto Class B overwrites Class B instead of swapping them.
- **Crash-Proof State Management**: Synced all state mutations (`day`, `schedule`, `substitutions`, `displaced`, `actionHistory`) synchronously to `localStorage` (`lfps_frontdesk_state`).
- **Dual-Stack Context-Aware Undo**: Built an undo engine that dynamically tracks grid moves (`actionHistory.grid`) separately from substitute assignments (`actionHistory.subs`).
- **Substitution Resolver Dashboard**: Built a dual-state card UI tracking unassigned absences (Pink) and assigned coverages (Green).
- **Mock Data Generator**: Integrated `generateSimulatedData()` to populate initial teacher subjects across a 6-day `MON`-`SAT` cycle for testing.
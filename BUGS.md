# Bug Register

This register is built **only** from data already recorded in `TODO.md` (the 🐛 Critical Bug & Performance Tracker and the Job Bundle sections) and in `CHANGELOG.md`. It was compiled on 2026-10-23 from `next-gen` @ `19c1a1a`.

Some cells say "Not recorded". That means neither source states the value, and nothing here was guessed or invented. The narrative detail for each bug stays in `TODO.md`.

**Column conventions:**

- **Severity:** no source assigns severities. The TODO tracker heading reads "Critical Bug & Performance Tracker" but does not grade individual bugs. Assign a severity when the bug is next touched, using `S1 Critical`, `S2 Major`, `S3 Minor` or `S4 Cosmetic`.
- **Found in:** no source records the version in which a bug was found.
- **Fixed in:** a version (`v1.xx`) or a Job Bundle (`JB nn`). Every bundle from JB19 to JB33 is recorded under the `v2.0.0-alpha.1` CHANGELOG section.

| ID | Title | Severity | Status | Found in | Fixed in | Notes |
|---|---|---|---|---|---|---|
| BUG-01 | Limbo Tray Drag Failure & Click-to-Restore Mechanism | Not recorded | 🟢 Resolved | Not recorded | v1.35.0 | Legacy v1 app. Also in CHANGELOG v1.35.0 |
| BUG-02 | Schedule Re-rendering & Stutter During Scrolling | Not recorded | 🟢 Resolved | Not recorded | v1.35.0 | Legacy v1 app. Also in CHANGELOG v1.35.0 |
| BUG-03 | High-Density Mobile Grid & Mobile Landscape Header Overlap | Not recorded | 🟢 Resolved | Not recorded | v1.36.0 | Only in TODO; no CHANGELOG entry by ID |
| BUG-04 | Fit-Grid Portrait Mode Screen Overflow & Cell Height Distortion | Not recorded | 🟢 Resolved | Not recorded | v1.40.0 | Also in CHANGELOG v1.40.0 |
| BUG-05 | Sticky Teacher Column Translucency Clashes with Scrolling Period Cells | Not recorded | 🟢 Resolved | Not recorded | v1.40.0 | Also in CHANGELOG v1.40.0 |
| BUG-06 | Substitutions Page Failure — Missing Teacher Names & Auto-Resolve Inoperative | Not recorded | 🟢 Resolved | Not recorded | v1.44.0 | Also in CHANGELOG v1.44.0 |
| BUG-07 | Right-Click / Long-Press on Absent Teacher Only Blurs Absence Panel Without Popover Menu | Not recorded | 🟢 Resolved | Not recorded | v1.45.1 | Also in CHANGELOG v1.45.1 |
| BUG-08 | Grid Sticky Teacher Column Right Edge Border & Leftmost Under-Slide Peeking Leak | Not recorded | 🟢 Resolved | Not recorded | v1.50.0 | Also in CHANGELOG v1.50.0 |
| BUG-09 | Assign Officiating Class Teacher (Off. CT.) Modal Silent Failure | Not recorded | 🟢 Resolved | Not recorded | v1.53.0 | Last legacy release. Also in CHANGELOG v1.53.0 |
| BUG-10 | Routine Matrix Fullscreen Workstation Root View Architecture (Expand Grid blank screen) | Not recorded | 🟢 Resolved | Not recorded | JB22 (v2.0.0-alpha.1) | Fullscreen grid now renders as a separate root tree in `App.tsx` |
| BUG-11 | Settings Console Modal & Mobile Navigation Parity (broken Settings button) | Not recorded | 🟢 Resolved | Not recorded | JB23 (v2.0.0-alpha.1) | |
| BUG-12 | Marking Teacher Present Does Not Reset Their Active Substitutions | Not recorded | 🟢 Resolved | Not recorded | JB24 (v2.0.0-alpha.1) | |
| BUG-13 | Routine Grid Period Cells Trigger Teacher Absence Menu on Right-Click / Long-Press | Not recorded | 🟢 Resolved | Not recorded | JB24 (v2.0.0-alpha.1) | |
| BUG-14 | Staff Login Panel Positioning Glitch (Partially Off-Screen at Top-Middle) | Not recorded | 🟢 Resolved | Not recorded | JB24 (v2.0.0-alpha.1) | Root-mounted modals; see ADR-0003 |
| BUG-15 | Reset History Purge Context Menu Clipped & Inverted Coordinate Alignment | Not recorded | 🟢 Resolved | Not recorded | JB24 (v2.0.0-alpha.1) | Root-mounted menus; see ADR-0003 |
| BUG-16 | Tab Overview Accordion Collapse Animation Jerkiness | Not recorded | 🟢 Resolved | Not recorded | JB24 (v2.0.0-alpha.1) | |
| BUG-17 | Minimal UI Mode Toggle Has No Visual Effect | Not recorded | 🟢 Resolved | Not recorded | JB25 (v2.0.0-alpha.1) | |
| BUG-18 | Officiating Class Teacher (Off. CT.) Whole-Day Assignment & Solver Alignment | Not recorded | 🟢 Resolved | Not recorded | JB28 (v2.0.0-alpha.1) | TODO also has a stale duplicate "JB28 🔴 Queued" with this bug unchecked. Docs claim a +250 affinity bonus, but the code applies +30 (JB30 refinement). See DOC_ISSUES |
| BUG-19 | Officiating AC Persists After Marking AC Present or Marking All Present | Not recorded | 🟢 Resolved | Not recorded | JB26 | No CHANGELOG entry (there is no JB26 section). Covered by LOGIC-04 unit tests |
| BUG-20 | Misleading CT Auto-Resolve Count & Period Stamp | Not recorded | 🟢 Resolved | Not recorded | JB31 (v2.0.0-alpha.1) | CHANGELOG JB31 describes the fix without citing the ID. This is the "Moral Science" meaning of JB31 |
| BUG-21 | Missing Officiating CT Appointment Cards on Substitutions Page | Not recorded | 🟢 Resolved | Not recorded | JB31 (v2.0.0-alpha.1) | CHANGELOG JB31 describes it without the ID |
| BUG-22 | Cluttered Multiple Appoint Cards & Designation Leak in Teacher Name Overlay | Not recorded | 🟢 Resolved | Not recorded | JB32 (v2.0.0-alpha.1) | CHANGELOG JB32 describes it without the ID |
| BUG-23 | Appoint Card Pass-Thru Toggle Absence, Wide Pills to Squircle Redesign & AC Card Decluttering | Not recorded | 🟢 Resolved | Not recorded | JB33 (v2.0.0-alpha.1) | CHANGELOG JB33 describes it without the ID |
| BUG-24 | Fresh-clone build fails: `@lfps/ui` is never built (`TS2307 Cannot find module '@lfps/ui'`) | S2 Major (proposed) | 🟢 Resolved | v2.0.0-alpha.1 (`19c1a1a`) | JB34 (v2.0.0-alpha.2, `5f9ff9c`) | Root `build` now runs `build:libs` (ui → core) before `build:web`. Verified with a clean `git clone` + `npm ci && npm test && npm run build` on a scratch copy |
| BUG-25 | Changes lost on reload: sync not persisting, and the server discards client messages | S1 Critical (proposed) | 🟢 Resolved (ships in v2.0.0-alpha.3) | v2.0.0-alpha.1 (`19c1a1a`) | JB34 part 1 (v2.0.0-alpha.2, `f2c2eff`); JB35 part 2 (`bundle/35`, unreleased) | **Part 1:** reload loss on the same device fixed (date-scoped `localStorage`, FEAT-62 part 1). **Part 2:** cross-device sync through the relay (`HELLO`/`HYDRATE`, `STATE_MUTATION` + ACK, per-entity last-writer-wins, offline outbox); devices refill a relay that restarted empty; substitutions are written to Sheets `Subs`. Verified with unit tests and a two-browser Playwright run. Known limit: deletions are memory-only tombstones on the relay (SAS §6.3) |
| BUG-26 | WebSocket hub deletes and closes clients while holding only a read lock | S3 Minor (proposed) | 🟢 Resolved | v2.0.0-alpha.1 (`19c1a1a`) | JB34 (v2.0.0-alpha.2, `88e640a`) | Broadcast branch takes the write `Lock`. `TestBroadcastChurnIsRaceFree` reports a DATA RACE against the old `RLock` code and passes under `go test -race` now |
| BUG-27 | Backup download route is not registered (advertised links return 404) | S3 Minor (proposed) | 🟢 Resolved (route removed) | v2.0.0-alpha.1 (`19c1a1a`) | JB34 (v2.0.0-alpha.2, `88e640a`) | Under the relay model (Google Sheets is the source of truth, the server stores nothing) `GET /api/v1/backups` and the server-side Excel `SaveAs` were removed rather than adding a download route. `/api/v1/export/excel` still streams the workbook |
| BUG-28 | State save errors are silently ignored | S2 Major (proposed) | 🟢 Resolved | v2.0.0-alpha.1 (`19c1a1a`) | JB34 (v2.0.0-alpha.2, `88e640a`) | The disk write and `SaveAs` are gone (no files under the relay model); JSON encode/write errors and Excel generation errors are logged / returned as 500. Residual: `internal/excel/generator.go` still discards `SetCellValue`/`SetCellStyle` errors (`_ =`); harmless for fixed cell refs, revisit in ARCH-04 |
| BUG-29 | Header hide/show is jittery | S3 Minor (proposed) | 🟢 Fixed on `bundle/37`; residual phone polish in Bundle 40 | v2.0.0-alpha.1 (`19c1a1a`) | JB37 + JB40 | JB37 hysteresis + UI-10 A/B. JB40: wider hysteresis, direction-aware, viewport freeze both modes; phone two-row header (`docs/HEADER_MOBILE_40.md`). |
| BUG-30 | Routine grid teacher name column hide/show (collapse) is jittery | S3 Minor (proposed) | 🟢 Fixed on `bundle/37` (fix-only) | v2.0.0-alpha.1 (`19c1a1a`) | JB37 (`bundle/37`) | Fixed-width sticky column, wider hysteresis, ignore self-caused scroll, removed `transition-all`. No new shake animation. |
| BUG-31 | Uptime pinger (cron-job.org) reported "Failed (output too large)" on `/api/v1/health` during the release deploy | Ops (not an app defect) | 🟡 Monitor | v2.0.0-alpha.2 (release window, 2026-10-24) | — | Likely Render served its own large HTML page while redeploying or cold-starting; cron-job.org fails runs over 64 KB. Health itself is 148-byte JSON. Saving responses was already off (owner, 2026-10-24), so the fix is the job's request method: cron-job.org → job → Edit → **Advanced → Request method → HEAD**. Reopen if it recurs outside a deploy. See TODO BUG-31 and SAS §8 |
| BUG-32 | Two WebSockets per tab: `useLiveSync()` mounted in both `Header` and `SettingsModal`, so opening Settings doubled connections | S3 Minor (proposed) | 🟢 Resolved (ships in v2.0.0-alpha.3) | v2.0.0-alpha.2 | JB35 (`bundle/35`) | Logged and fixed in JB35 (FEAT-62 part 2). Sync now runs in a ref-counted singleton (`sync/live.ts`, 1 s grace); `useLiveSync()` only reads status. Test `live-singleton.test.ts`; Playwright saw at most 1 concurrent socket per tab with Settings open |
| BUG-33 | A substitution deleted before a relay restart could come back (tombstones were memory-only; the relay didn't read `Subs` back) | S2 Major (proposed) | 🟢 Resolved (ships in v2.0.0-alpha.3) | JB35 (`bundle/35`, unreleased) | JB35a (`bundle/35a`) | Sheets mode only: `Subs` schema 2 keeps tombstones with versions; the relay reloads the week before letting devices in. Other entities' deletions are still memory-only (SAS §6.3 Limits). Proven by `npm run e2e:sheets` and `sheetcheck -selftest` |
| BUG-34 | Local dev/test builds could target the production relay: `apps/web/.env` (production URLs) loads in every Vite mode | S2 Major (proposed) | 🟢 Resolved (ships in v2.0.0-alpha.3) | v2.0.0-alpha.2 | JB35a (`bundle/35a`) | URLs moved to `.env.production`; relay guard in `vite.config.ts` and `sync/live.ts`; `build:web:local` asserts the bundle (SAS §6.5) |


## Bundle 38a tracker notes (2026-10-24)
- **UI-11 / FEAT-70 / FIND-01…12**: product/UX items from `docs/ASSESSMENT_2026-10-24.md` — implemented on `bundle/38a` (not numbered BUG-xx).
- **BUG-29 / BUG-30**: fixed on Bundle 37 (in 38a branch); device smoke still recommended.
- **BUG-31**: still ops — cron-job.org → HEAD.

## Open items

- **BUG-24, BUG-26, BUG-27 and BUG-28** were resolved in Job Bundle 34 (v2.0.0-alpha.2, released 2026-10-24). **BUG-25** is resolved: same-device reload in JB34, cross-device sync in JB35 (ships in v2.0.0-alpha.3). **BUG-32** (double socket) was found and fixed in JB35. **BUG-29 and BUG-30** are fixed on `bundle/37` (fix-only motion; no new shake). All were logged 2026-10-23 on `refine/jb31`. Severities are **proposed** and need owner confirmation.
- **BUG-33 and BUG-34** are resolved in JB35a (ship in v2.0.0-alpha.3 with 34a and 35).
- BUG-29 and BUG-30 were fixed on `bundle/37` from code-level causes (hysteresis / layout shift / width animation). Device confirmation on iOS Safari / Android Chrome still recommended after merge.
- **BUG-31** is an ops note (uptime pinger, deploy window). Status: monitor. Response saving was already off; the remaining owner step is switching the job to **HEAD** (Advanced → Request method). Reopen if it recurs outside a deploy or cold start.
- The tracker also lists **PERF-01** ("Master Routine Initial Render Stutter & In-Memory Pre-Render / Keep-Warm Engine") as 🔴 Open. It is a performance item, not a numbered bug, and is kept in `TODO.md`.

The four setup findings previously listed here as "not yet triaged" are now BUG-24 to BUG-28. The hub-lock and save-error findings were split into BUG-26 and BUG-28.

## How to add a bug

1. Take the next free ID (`BUG-35` onward) and add a `### BUG-xx:` entry to the TODO tracker.
2. Add a row here. Fill **Severity** and **Found in** (the version from `package.json` at the time).
3. When the bug is fixed, set the status, record the version or bundle in **Fixed in**, and cite the ID in the `CHANGELOG.md` entry.

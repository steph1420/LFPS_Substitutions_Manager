# LFPS Substitutions Manager — Task & Todo Tracker

This tracker maintains active, upcoming, and future tasks for the **Front Desk PWA**.

> [!IMPORTANT]
> **Terminology Standard**: Do NOT use the informal term `offCT`. Always use **Officiating Class Teacher**, abbreviated as **Off. CT.**. Similarly, use **Officiating AC**, abbreviated as **Off. AC**.


## 🗺️ Job Bundle Plan 34–38 (approved by the owner 2026-10-23)

> [!IMPORTANT]
> **Owner facts that shape this plan**
> - **Google Sheets is the source of truth** (the "external database"). It needs last-updated time / version tracking.
> - The **Render server is only a live relay** between devices. It is **not storage**: the disk / Postgres direction is dropped.
> - **GitHub Pages builds from `next-gen`** (Settings → Pages). Going live means merging/pushing to `next-gen`, which is the owner's call.
> - **(2026-10-24) In-app timetable edits are just substitutions.** They sync to an app-owned **Subs** tab in Sheets, never to the master timetable. **Editing the Master TimeTable** is a bigger, later project (EPIC-01, unscheduled).
> - **(2026-10-24) Why a relay:** direct Sheets access from devices is too slow, and the school's old computers aren't on 24×7. Devices talk only to Render over WebSocket. The relay holds the live state in memory, writes the app-owned tabs to Sheets asynchronously (batched, debounced, retried), and pulls the read-only tabs at startup and periodically and streams them to devices. See ADR-0005.
> - **(2026-10-24) Render free-tier sleep** (15 min idle, about 1 min to wake) is covered by the owner's **existing uptime ping bot during school hours**. No keep-warm job in the repo (PERF-03).
> - **(2026-10-24) Previews: option A** (sub-paths under the Pages address), with Bundle 36 (FEAT-64).

| Bundle | Scope | Items | Status |
|---|---|---|---|
| **34** | Date-scoped local persistence; stateless relay hardening; fresh-clone build order; Front Desk by default with a **6-digit** passcode-gated admin (escalating lockout); footer version visible above the tab bar; single-source versioning (2.0.0-alpha.2); **school time zone Asia/Kolkata** on client and server | FEAT-62 (part 1), BUG-24, BUG-25 (part 1), BUG-26, BUG-27, BUG-28, SEC-01 interim, ARCH-02 (relay decision), ARCH-07 | 🟢 Live: v2.0.0-alpha.2, released 2026-10-24 |
| **35** | Cross-device sync through the relay (devices ⇄ relay over WebSocket only); Sheets bridge: app-owned `Subs` + `App_Meta` (+ optional log) written async/batched/debounced/retried, read-only tabs pulled at startup + periodically and streamed; client "Connecting…" state for relay cold starts; Render re-setup guide + `render.yaml`. **Owner setup first:** service account + real spreadsheet ID | FEAT-62 (part 2), BUG-25 (part 2), BUG-32, FEAT-65, FEAT-66, FEAT-63, ARCH-06 | 🟢 Live in v2.0.0-alpha.3 (2026-10-24) |
| **35a** | Close the two sync gaps (FEAT-62 part 3): devices apply the Sheet's read-only tabs (precedence: local edits > Sheet > bundled; version-gated; shown in Settings → Build Info); the relay reloads substitutions and their deletions from `Subs` after a restart (schema 2: tombstones, versions, idempotent upsert; hydrating gate). Relay guard so dev/test builds can't reach the production relay. Fake-Sheet tests, two-browser e2e with a restart, real-Sheet self-test. Go-live runbook for alpha.3 | FEAT-62 (part 3), FEAT-65 (reads), BUG-33, BUG-34 | 🟢 Live in v2.0.0-alpha.3 (2026-10-24; runbook docs/RELEASE_2.0.0-alpha.3.md) |
| **36** | GitHub Actions CI (test, build, `go vet`, `go test -race`); Pages built by Actions instead of committed root assets (`next-gen` → root); Render deploys only after checks pass; branch previews at `/preview/<branch>/` with a footer branch badge (option A) | ARCH-05 (rest), ARCH-02 (adoption), FEAT-64 | 🟡 Workflows + docs on `bundle/36` / `next-gen`; **owner cutover** still required (`docs/PAGES_SETUP.md`) |
| **37** | Header/grid motion fix (no new shake); absent red-glow rewrite; Dev Options A/B (UI-10, auto-filter, needs-attention); pulse one-shot | UI-10, BUG-29, BUG-30, UI-06, FEAT-69 | 🟢 Done on `bundle/37` (merged into `bundle/38a`) |
| **38a** | Bundle 37 follow-through + fixed routine geometry + day-load Dev Option + FIND motion/absent consistency | UI-11, FEAT-70, FIND-01/03/04/09/10/11/12 | 🟢 Merged to `next-gen` (2026-10-24) |
| **38b** | Server-side admin auth (design+stub); Dev Options own passcode; per-admin design spike; docs reconciliation; BUG-31 HEAD reminder | SEC-02, SEC-03, ARCH-03, ARCH-04 | 🟡 On `bundle/38b` |
| **39** | Day-theme contrast rewrite; a11y; Front Desk copy; sync pill honesty | UI-12, FIND-02/05/14/15, FIND-13/22 | 🟢 Merged to `next-gen` (2026-10-24) |
| **40** | Phone polish: matrix horizontal scroll, light absent contrast, Substitutions densify, header guest+logged-in, e2e:phone | UI-13, BUG-29 residual, UI-12 phone, FEAT-71 | 🟢 Merged to `next-gen` (2026-10-24) |
| **41a** | Phone feel: portrait name-col narrow+toggle+calm ease; header scroll-active; soft absent rose (themes parked) | UI-14, BUG-35, UI-15 | 🟢 Merged to `next-gen` (2026-10-24) |
| **42** | Documentation only: full logic sheet + mockups guide for fresh redesign (no UI/feature code) | docs/redesign | 🟢 This branch → `next-gen` |

> Split after post–Bundle 37 assessment (`docs/ASSESSMENT_2026-10-24.md`): **38a** UI/motion, **38b** security/docs, **39** themes/a11y/copy, **36** CI/Pages anytime. SEC-02 (38b) before privileged admin Sheets writes. Bundle 35 substitutions do not depend on SEC-02.
>

### Bundle 42 — Logic Sheet & Mockups Guide (docs only)
- **Status**: 🟢 Started/shipped on `bundle/42-logic-sheet`
- **Deliverable**: [`docs/redesign/LOGIC_SHEET.md`](docs/redesign/LOGIC_SHEET.md) + [`docs/redesign/MOCKUPS_GUIDE.md`](docs/redesign/MOCKUPS_GUIDE.md)
- **Scope**: Inventory of literally all product logic + screen inventory + how to build fresh mockups later. **No** runtime behaviour, CSS, or theme work.
- **Next (owner)**: Review the sheet → generate mockups from a clean mind → redesign app from mockups.
- **Out of scope here**: Image mockups; light theme redesign (parked); SEC-02; EPIC-01.

> **Not scheduled:** EPIC-01 (Master TimeTable editing), PERF-03 (relay keep-warm, outside the repo), FEAT-67 (after SEC-03), per-admin passcodes (design in 38b).

## 🔴 OPEN — User-Reported Items (logged 2026-10-23 on `refine/jb31`)

> [!NOTE]
> These items were reported by the owner on 2026-10-23 and are scheduled in the plan above. The defects are also registered in [`BUGS.md`](BUGS.md) (BUG-24 to BUG-30).

### FEAT-62: Reload-Safe Persistence Across Website & Server (Local-First + Server Persistence & Live Broadcast)
- **Status**: 🟢 Done, unreleased: part 1 (Job Bundle 34, `f2c2eff`, `88e640a`, live in alpha.2); part 2 (sync) on `bundle/35`; part 3 (apply the Sheet, reload `Subs`) on `bundle/35a`. Ships as alpha.3
- **Direction change (owner, 2026-10-23)**: Google Sheets is the source of truth and the server is a live relay only, so "server persistence" now means *relay + Sheets bridge*, not a server disk.
- **Reported**: *"Changes should not be lost on reload. Fix that across website and server."*
- **Behaviour before Bundle 34 (verified in code)**:
  - Only preferences and the auto-resolve policy are written to `localStorage`.
  - Absences, availabilities, substitutions, displaced slots, Off. AC/Off. CT appointments, routine edits and notifications live only in memory, so a reload resets them.
  - The client never pushes mutations to the Go server, and it ignores incoming `STATE_MUTATION` payloads.
  - The server discards inbound WS messages. See BUG-25.
- **Target Solution**:
  - [x] **Local-First Browser Persistence** (JB34, `apps/web/src/store/persistence.ts`, key `lfps_operational_state`, schema v1): Persist the operational slices of `useTimetableStore.ts` (versioned storage key with schema migration). Exclude transient UI state such as open modals and context menus.
  - [x] **Date Scoping** (JB34, `@lfps/core` `calendar`): Key operational state by calendar date (or week), not only by `DayOfWeek`. Otherwise last week's absences would reappear after a reload.
  - [x] **Server Model Parity** (JB34): `ACCEPTED`, `disputeRemark`, `acceptedAt`, `disputedAt`, optional `substituteTeacher`, validation → 400. Displaced slots and routine edits are relayed in Bundle 35.
  - [x] **Hydrate & Push** (JB35, `apps/web/src/sync/*`, `internal/livesync`, `internal/relay`; protocol in [`docs/SAS.md`](docs/SAS.md) §6.3): On connect, the relay sends the current state and the read-only Sheet data (staff, subjects, master routine). Devices push every mutation over the **same WebSocket** (no direct Sheets or REST calls from devices for sync).
  - [x] **Substitutions only to Sheets** (JB35, `internal/sheets`, allowlist-guarded; owner 2026-10-24): substitutions are written to the `Subs` tab; date-scoped routine edits sync between devices only. Nothing the app does writes to the master timetable (see EPIC-01).
  - [x] **Apply Live Broadcasts** (JB35, per-entity last-writer-wins): Apply `STATE_MUTATION` from other devices, ignoring echoes of the device's own changes.
  - [x] **Offline Outbox** (JB35, per-tab `sessionStorage`; batches ≤ 500 entities and ≤ 128 KiB): Queue mutations while offline and replay them on reconnect.
  - [x] **Single WebSocket Connection** (JB35, BUG-32, `sync/live.ts` ref-counted singleton): Use one WebSocket per tab. Before, `useLiveSync()` was mounted twice, in `Header.tsx` and `SettingsModal.tsx`; it's now a read-only status hook.
  - [x] **Server Hardening** (JB34, `88e640a`): BUG-26, BUG-27, BUG-28 fixed; stateless week-scoped relay, deep copies, CORS/WS origin allowlist, size limits. BUG-25 sync part remains (Bundle 35).
  - [x] **Tests** (JB34): web Vitest (persistence, reload, access: 30 tests), core calendar tests (incl. IST), Go tests for schooltz, store, handlers, hub and router (`go test -race`).
  - [x] **Sync tests** (JB35): web `sync.test.ts` (entities, engine, client against a fake relay, wake window, batching) and `live-singleton.test.ts`; Go `livesync`, `relay`, `sheets` (fake API) tests; a two-browser Playwright run (scratch, not in the repo).
  - [x] **Part 3: apply the Sheets snapshot** (JB35a, `sync/sheetData.ts`, `sync/reference.ts`; SAS §6.3): Staff Directory, the per-teacher routine tabs and Subjects List are mapped and applied on devices. Local date-scoped edits win over the Sheet, the Sheet over the bundled seed; the schedule and routine history are rebased, so in-progress edits survive. Applied only for a new hash with a fetchedAt not older; cached in `lfps_reference_v1`. Settings → Build Info shows the Sheet data version. Unsafe cells keep the bundled value and are reported; a missing Principal row is handled.
  - [x] **Part 3: reload `Subs` after a restart** (JB35a, BUG-33): `Subs` schema 2 (Deleted At, Version TS/By, Payload); tombstones; idempotent upsert by key; the relay holds devices while hydrating (`SHEETS_HYDRATE_TIMEOUT`); `/health` `store`; App_Meta `data_version`, `subs_reloaded_at`.
  - [x] **Part 3 tests** (JB35a): `sheet-data.test.ts` (mapper, precedence, version gate, outbox vs tombstone), `relay-guard.test.ts`, client snapshot/hydrating tests; Go fake-Sheet and rehydrate tests; `npm run e2e:sheets` (two browsers + a fresh one, local relay, fake Sheet, restart); real-Sheet `sheetcheck -selftest` (passed).
  - [ ] **Follow-ups** (not scheduled): reload the other entity kinds after a restart (absences, availability, Off. AC/CT, routine overrides); map OVERVIEW and the class tabs; show Sheet subject names in the UI; rewrite undo history for remote changes.

### FEAT-63: Render Server Re-Provisioning With the New Build / Codebase
- **Status**: 🟡 Guide and Blueprint done on `bundle/35` ([`docs/RENDER_SETUP.md`](docs/RENDER_SETUP.md)); the owner applies them and the post-deploy check follows
- **Reported**: *"Help me set up the server again with new build/codebase."*
- **Target Solution**:
  - [x] Write a step-by-step owner guide for the Render Web Service (JB35, `docs/RENDER_SETUP.md`):
    - Docker runtime with root directory `apps/server` (Dockerfile identical to the `Dockerfile.render` sidecar)
    - health check `/api/v1/health`
    - environment variable **names**: `PORT` (Render sets it), `ALLOWED_ORIGINS` (optional; defaults to the Pages origin + localhost), `APP_TZ` (optional; the school zone is Asia/Kolkata in code since JB34, so **no TZ setting is needed**), plus the Sheets bridge credentials Bundle 35 introduces. `DATA_DIR` is no longer used (ignored with a log line).
    - where to set them: Render Dashboard → the service → **Environment** in the left pane (not **Settings**) → Environment Variables → **+ Add Environment Variable** → Save, then choose "Save and deploy" ([Render docs](https://render.com/docs/configure-environment-variables)). Secret files (e.g. the service-account key) go in the same page under **Secret Files**, mounted at `/etc/secrets/<name>`.
    - health check path `/api/v1/health` (also what the owner's uptime pinger should call; it is cheap and needs no `Origin`).
  - [x] **Durable Storage Decision** (owner, 2026-10-23): **none on Render.** Google Sheets is the source of truth; the relay is stateless and an empty restart is expected. No disk, no Postgres.
  - [x] Codify the service as a `render.yaml` Blueprint (JB35, see ARCH-06).
  - [ ] Verify after deploy (owner + agent, after approval; steps in `docs/RENDER_SETUP.md`): health check (reports `version`), WS connect from the Pages origin, mutation round-trip between two devices, and devices re-hydrating from Sheets after a relay restart. Release steps: [`docs/RELEASE_2.0.0-alpha.3.md`](docs/RELEASE_2.0.0-alpha.3.md).

### ARCH-02: Deployment Model Decision & Adoption
- **Status**: 🟡 JB34 decisions + JB35 `checksPass` + JB36 Actions Pages workflow. Live cutover still owner: `docs/PAGES_SETUP.md` (secret, Pages source, `PAGES_ACTIONS_DEPLOY`).
- **Reported**: *"How should deployment be handled? Suggest the best method and adhere to it."*
- **Current Behaviour**:
  - Built assets are committed into the `next-gen` root, and GitHub Pages serves that root.
  - The Render service auto-deploys from `next-gen`, per `CLOUD_CONNECTIONS_AND_ROLLBACK_GUIDE.md`.
  - As a result, every push to `next-gen` is a production release of both the client and the server.
  - The repo has no `.github/workflows/` and no `render.yaml`.
- **Target Solution**:
  - [ ] Write up a recommended model and get the owner's approval, recorded as a new ADR in `docs/DECISIONS/`. It must respect the owner's rules: never touch `main`, work on separate branches, always back up.
  - [x] (JB36) Adopt CI + Actions Pages workflow + Render `checksPass` (already in JB35). Committed build output removed only after owner cutover.
  - [x] (JB36) `docs/PAGES_SETUP.md`, ADR-0006, WORKFLOW note. Cloud guide still accurate for rollback tags.

### ARCH-03: Resolve Documentation Inconsistencies
- **Status**: 🔴 Open
- **Reported**: *"Try to resolve docs inconsistencies."*
- **Scope**: Every entry DI-01 to DI-22 in [`docs/DOC_ISSUES.md`](docs/DOC_ISSUES.md). These include the duplicate bundle numbers 28, 29 and 31, stale test counts, the CT colour, wrong paths, false "sync works" and "build passes" claims, the branch/push policy, and the CHANGELOG structure.
- **Target Solution**:
  - [ ] Owner decides the items marked "Owner decision needed" in DOC_ISSUES (bundle renumbering, branch model, repo hygiene).
  - [ ] Correct `ARCHITECTURE.md`, `DESIGN_PHILOSOPHY.md`, `CATCH_UP_TO_ME.md`, `TODO.md` and the cloud guide. **`DEVELOPER_GUIDE.md` is changed only on the owner's explicit request.**
  - [ ] Append CHANGELOG corrections as new entries, without rewriting released sections.
  - [ ] Mark each DI entry resolved, with the commit hash.

### ARCH-04: Codebase Bug & Quality Audit
- **Status**: 🔴 Open
- **Reported**: The owner believes earlier assistant sessions introduced many bugs and errors, and asked for an audit.
- **Target Solution**:
  - [ ] Systematically review `packages/core`, `apps/web` and `apps/server`:
    - correctness: state, solver and RBAC
    - concurrency in Go
    - dead or unwired code (e.g. `pushAbsence`, `pushSubstitution`, `setOperatingRole`)
    - leftover `any`
    - accessibility and performance
  - [ ] File every confirmed defect as a `BUG-xx` in `BUGS.md` and this tracker, with severity.
  - [ ] Add `go test` and race-detector (`go test -race`) runs, and expand Vitest coverage beyond the single solver test file.
  - [ ] Supersedes or absorbs Future Roadmap item "4. [CRITICAL CODE REVIEW] Technical Debt & Codebase Bloat Elimination".

### UI-10: Detach Header Hide/Show From Browser Toolbar Hide/Show
- **Status**: 🟢 Done on `bundle/37` (FEAT-69 Dev Options A/B; default **(a) Container**)
- **Reported**: *"Detach the header hide/show from browser hide/show."*
- **Delivered (2026-10-24, Bundle 37)**:
  - [x] Owner chose **both** as Dev Options (device-local): **(a) Container scroll** (default) — `#lfps-app-scroll` inside a `100dvh` shell so the browser toolbar stays put; **(b) Thresholds** — window scroll with hysteresis, ignoring tiny viewport jumps.
  - [x] Toggle: Settings → Developer Options → Header scroll mode.
  - [ ] Still worth a quick check on iOS Safari / Android Chrome after merge.

### BUG-29: Header Hide/Show Is Jittery
- **Status**: 🟢 Fixed on `bundle/37` (fix-only — no new shake/jitter animation)
- **Reported**: *"Header hide/show is jittery."*
- **Fix (2026-10-24)**:
  - [x] Enter/exit hysteresis (`ENTER_PILL` 72 / `EXIT_FULL` 28).
  - [x] Constant header height (day-bar slot always reserved; no unmount layout shift).
  - [x] Scroll listener does not re-subscribe on every FULL↔PILL change (ref-driven).
  - [x] Dropped `backdrop-blur-xl` on the elevated header during motion.
  - [x] Fixed together with UI-10 (container vs thresholds Dev Option).

### BUG-30: Routine Grid Teacher Name Column Hide/Show (Collapse) Is Jittery
- **Status**: 🟢 Fixed on `bundle/37` (fix-only — no new shake/jitter animation)
- **Reported**: *"Routine grid teacher name hide/show is jittery."* This is the FEAT-53 horizontal-scroll collapse of the sticky teacher column.
- **Fix (2026-10-24)**:
  - [x] Fixed-width sticky column classes (no `transition-all` width animation).
  - [x] Wider hysteresis (collapse `> 40`, expand `<= 8`) plus a short ignore window after a toggle so resize-caused scroll events cannot thrash.
  - [x] Content still swaps abbreviation ↔ 2-line split; layout width no longer animates.

### UI-14: Portrait Faculty/Name Column Narrow by Default + Toggle (Bundle 41a)
- **Status**: 🟢 Done on `bundle/41a`
- **Reported**: Portrait Fac(R) column too wide; width animation blinding-fast / jittery.
- **Delivered**:
  - [x] Portrait (`orientation: portrait` + max-width 767): name column **narrow (64px) by default**.
  - [x] Toolbar **Names** toggle expands/shrinks; preference `routineNameColExpandedPortrait` persisted.
  - [x] Calm **0.38s** cubic-bezier width/padding transition (honors `prefers-reduced-motion`).
  - [x] Landscape / desktop keep readable widths; Bundle 40 period min-widths + horizontal scroll unchanged.
  - [x] Scroll no longer drives name-col width (toggle owns it — avoids BUG-30-style thrash).

### BUG-35: Header Hide/Show Only On Scroll Release / Near Top (Bundle 41a)
- **Status**: 🟢 Fixed on `bundle/41a`
- **Reported**: Header hides/shows only upon releasing scroll; should be actively doing it while scrolling.
- **Delivered**:
  - [x] Evaluate on every scroll **rAF** (removed 48ms post-scroll debounce).
  - [x] Scroll-down → PILL; **scroll-up → FULL mid-page** (classic), not only below EXIT_FULL.
  - [x] Keep IGNORE_DELTA + visualViewport freeze so mobile chrome show/hide does not flap.
  - [x] Both UI-10 modes (container + thresholds).

### UI-15: Soft Beautiful Absent Rose (Bundle 41a)
- **Status**: 🟢 Done on `bundle/41a`
- **Reported**: Absent teacher card / chip blunt hot magenta (`bg-rose-600`).
- **Delivered**:
  - [x] Soft rose tinted surfaces + gentle rail for card / compact / list variants.
  - [x] `.status-btn-absent` / `.status-chip-absent` replace solid rose-600 fills.
  - [x] Matrix sticky absent + ABS chip softened to match.
  - [x] Absent vs Present vs Away Official remain distinct.
  - [ ] Full light-theme redesign — **parked** (owner: themes later).


### FEAT-69: Bundle 37 Dev Options + Absent Affordance
- **Status**: 🟢 Done on `bundle/37`
- **Delivered**:
  - Device-local prefs (`lfps_dev_ui_prefs_v1`, never synced): header scroll mode A/B, auto-filter Absent, Needs attention strip.
  - UI-06 rewrite: absent cards/rows use left accent rail + crisp border + tint — **no** large outer rose bloom; Absent button stays the strong signal.
  - Attention pulses are one-shot (3 beats) / first-view amber look-at-me only — **no** new shake/jitter animation.
  - Soft thin scrollbars in dark modals; quieter Off. CT Appoint halo so Absent stays primary.

### SEC-01 (interim): Front Desk by Default, Passcode-Gated Admin
- **Status**: 🟢 Done (Job Bundle 34, `76c7fa0`). See [`docs/ADMIN_ACCESS.md`](docs/ADMIN_ACCESS.md).
- **Reported**: the app opened as admin with no password, and logging out left admin powers available.
- **Delivered**: opens as Front Desk (Guest); admin needs a passcode whose SHA-256 is baked in at build time (`VITE_ADMIN_PASSCODE_SHA256`, generate with `npm run admin:hash`); tab-scoped session; schedule editing, solver policy, Reset Day, history purge and developer mode are admin-only in both the UI and the store.
- **6-digit follow-up (JB34, owner 2026-10-24)**: the passcode is exactly **6 digits**, entered on a numeric keypad (six dots, auto-submit). Lockout is per device and survives reloads: 4 free misses, then 30 s, 1 min, 5 min, 15 min, then 1 h. `admin:hash` refuses easy codes unless `--allow-weak`. The owner's code is configured in the build box's git-ignored `apps/web/.env.local` and verified by a local-only test. **CI/Actions builds still need the hash as a variable** (ARCH-05).
- **Limit**: client-side only, and **a 6-digit hash in the public bundle can be brute-forced offline in under a second**. It stops accidents, not a determined user. Real enforcement is SEC-02.


### UI-11: Fixed Routine Table Size
- **Status**: 🟢 Done on `bundle/38a`
- **Reported**: Owner — routine table size changes by day (SAT collapses).
- **Delivered**: `table-layout: fixed`, min row height, directory-based `min-height` on matrix shell; Hide Absent still filters rows but outer frame stays stable.

### FEAT-70: Day Load Dev Option (Follow School Day vs Free Pick)
- **Status**: 🟢 Done on `bundle/38a`
- **Delivered**: Dev Options A/B in `devUiPrefs.dayLoadMode`; follow snaps on load + visibility; free pick persists `lastFreeDay`; Today marker on Header/Routine day chips; date subtitle in free mode.

### UI-12: Day Theme Contrast Rewrite
- **Status**: 🟢 Done on `bundle/39`
- **Reported**: Owner — night themes strong; day themes washed out.
- **Direction**: Semantic tokens (`text-ink`, `bg-surface-*`, soft chips); day-theme remap of bare `text-white` / `*-950` chips; Midnight modal surfaces tokenized (FIND-02 / FIND-14).

### Bundle 38a FIND follow-through
- **Status**: 🟢 Done on `bundle/38a` — FIND-01 pulse, FIND-03 remove halo, FIND-04 matrix rail, FIND-09/10/11/12 (with FEAT-70).

### Bundle 38b (this branch)
- [x] SEC-03 separate Dev Options passcode (`VITE_DEV_PASSCODE_SHA256`, 5-tap → keypad).
- [x] SEC-02 design + thin stub (`docs/SEC_02_SERVER_AUTH.md`; `LFPS_REQUIRE_ADMIN_TOKEN` default off).
- [x] Per-admin design spike (`docs/PER_ADMIN_ACCESS.md`).
- [x] ARCH-03 docs reconciliation (bundle table / SEC statuses).
- [ ] **Ops:** BUG-31 — owner switches cron-job.org → **HEAD** (still parked).

### Bundle 39 (done on `bundle/39`)
- [x] UI-12 day themes — semantic tokens + light-family contrast remap
- [x] FIND-05 sync pill honesty (Sheets error / Loading sheet…)
- [x] Front Desk copy — ticket IDs out of titles, Off. CT tooltips, Brain Studio → Auto-Resolve, friendlier empties, KPI ALERT honesty
- [x] A11y basics — focus-visible rings, ~40px header hits, prefers-reduced-motion on tab fades
- Leave **38b** / **36** planned (no SEC-02/03, no CI/Pages pipeline here)


### SEC-02: Server-Side Authentication for Admin Writes
- **Status**: 🟡 Design + stub on Bundle 38b (`docs/SEC_02_SERVER_AUTH.md`). Enforcement off by default.
- **Why**: the relay accepts writes from any allowed origin, and the admin gate is client-side.
- **Target Solution**:
  - [ ] Relay verifies admin actions (e.g. passcode → short-lived signed token, or Google sign-in restricted to school accounts) before relaying them or writing to Sheets.
  - [ ] Teacher identity for self-service actions (accept/dispute) once identity matters.
  - [ ] Keep the passcode/secret only in Render environment variables, never in the repo.

### FEAT-68: Admin Hierarchy at Staff Login + "Edit without login" Dev Override
- **Status**: 🟢 Done on `bundle/34a` (Job Bundle 34a, not shipped; ships as 2.0.0-alpha.3 with the next release, see VERSIONING §2.5).
- **Reported** (owner 2026-10-24): *"The principal, the academic coordinator, the asst. academic coordinator and the officiating academic coordinator are all admins. So logging them in should require passcode and enable editing. But add dev opt: Enable editing without logging in."*
- **Delivered**:
  - [x] `@lfps/core` `adminOfficeFor()`: PRINCIPAL / AC / AAC / OFF_AC (Off. AC only on the day the appointment is in force). `StaffRole` gains `'Principal'`.
  - [x] Staff Login: admin offices are tagged and continue to the 6-digit keypad (same lockout); success = admin session for that identity. Others are identified at a tap. Logout or switching name ends admin.
  - [x] Principal by designation: no Principal exists in the seed or the Sheet, so no name was invented. A future Staff Directory row with Role `Principal` takes over automatically.
  - [x] The standalone Settings keypad is folded into Staff Login; Settings → Admin Access is status + Log Out.
  - [x] Dev Options → "Edit without login": device-local `localStorage`, never synced, "Editing unlocked" header badge, Turn off in Settings.
  - [x] One permission helper (`lib/access.ts` `resolveAccess`) behind every gate. Tests: core 5, web access 19.
- **Related**: Developer Options (and so this override) stay admin-gated until **SEC-03** (separate dev passcode, deferred). **FEAT-67** (lockout settings) is still deferred. Real enforcement is SEC-02.

### FEAT-67: Admin Lockout Penalty Settings in Developer Options
- **Status**: ⚪ Deferred (unblocked after SEC-03; still not scheduled).
- **Ask**: let the owner set the admin-passcode lockout penalty from Developer Options instead of a code change.
- **Target Solution**:
  - [ ] Settings → Developer Options: number of free misses (today 4), the wait steps (today 30 s → 1 min → 5 min → 15 min → 1 h), and the 24 h reset window.
  - [ ] Validate the values (whole numbers, sensible minimum and maximum, steps never decreasing), and offer "Reset to defaults".
  - [ ] Store the values per device next to `lfps_admin_lockout_v1`, falling back to the built-in defaults in `adminGate.ts`. Unit tests cover custom schedules.
  - [ ] Changing the policy must not unlock a device that is currently locked out. It applies from the next miss.
- **Depends on**: SEC-03, because a Front Desk user who can reach Developer Options could otherwise switch the lockout off. Like the rest of the gate, this is client-side only until SEC-02.

### SEC-03: Separate Developer Options Passcode
- **Status**: 🟢 Done on Bundle 38b (owner: Dev Options not tied to admin).
- **Delivered**:
  - [x] `VITE_DEV_PASSCODE_SHA256` via `npm run admin:hash -- --dev` (refuses match with admin hash).
  - [x] 5-tap discovery → Dev passcode keypad; tab session `lfps_dev_session_v1`; lockout `lfps_dev_lockout_v1`.
  - [x] Dev code works alone (no admin session required). Edit-without-login enable needs Dev session or admin.
  - [x] Docs: `ADMIN_ACCESS.md`, `PAGES_SETUP.md`; Actions secret documented.
- **Limit**: same as SEC-01. The hash ships in the public bundle; real enforcement is SEC-02.
- **Follow-up**: FEAT-67 lockout settings UI is now unblocked to schedule.


### FEAT-64: Preview / Test-Branch Builds ("switch to a test branch")
- **Status**: 🟡 Implemented on Bundle 36 (`pages.yml`, preview badge, scoped storage); **live previews after owner cutover** in [`docs/PAGES_SETUP.md`](docs/PAGES_SETUP.md). **Owner chose option A** (2026-10-24).
- **Reported**: *"Add a way to switch to test branches."*
- **Decision**: previews live under the existing Pages address. Options B (hosted previews on a third party) and C (local only) were not chosen.
- **Design sketch** (to confirm in an ADR when built; supersedes ADR-0004's "Pages serves the committed `next-gen` root"):
  - **One Actions workflow** (`.github/workflows/pages.yml`), triggered on push to `next-gen`, `bundle/*` and `preview/*`, plus manual dispatch. Pages source switches from "Deploy from a branch" to **GitHub Actions** (owner action in Settings → Pages).
  - **Builds**: `next-gen` → site root `https://steph1420.github.io/LFPS_Substitutions_Manager/`. `bundle/34` → `…/preview/bundle-34/` (the `/` in a branch name becomes `-`). Vite `base: './'` already makes the build path-independent.
  - **Assembling the site**: Pages deploys one artifact per site, so each run rebuilds the whole tree. Build the root from `next-gen`, and each live `bundle/*` / `preview/*` branch into `preview/<slug>/`. Keep a small `preview/index.html` that lists the previews with commit and build time. Deleted branches drop out on the next run. Alternative: keep a `gh-pages` branch and update only one folder per run (the `peaceiris/actions-gh-pages` pattern), which is cheaper but adds a branch.
  - **Checks first**: the job runs `npm ci`, `npm test`, `npm run build:web` (ARCH-05) before publishing; a failing branch keeps its previous preview.
  - **Footer branch badge**: the build sets `GIT_BRANCH`/`GIT_COMMIT` (already read by `vite.config.ts`) and a new `VITE_BUILD_CHANNEL=production|preview`. On previews the footer shows a tinted **"Preview · bundle/34"** badge next to `v<version> · <commit>`, and the header version gets a matching dot. The badge links to `preview/` (fade/scale spring only, per DESIGN_PHILOSOPHY).
  - **Data isolation (required)**: previews share the origin, and therefore `localStorage`, with production. Namespace every storage key by channel and slug (e.g. `lfps_operational_state` → `lfps_preview_bundle-34_operational_state`), and the admin session and lockout keys too. A preview must **not** write to the production Sheets tabs. Either point it at no relay (local-only) or at a preview relay or tab prefix (decide with Bundle 35's bridge).
  - **Admin hash**: injected from an Actions secret/variable (`VITE_ADMIN_PASSCODE_SHA256`) for both channels.
  - [ ] Optional in-app "Build channel" row in Settings → Build Info that links between production and the preview list (admin only).

### FEAT-65: Google Sheets Bridge, Last-Updated Time & Version Tracking
- **Status**: 🟡 Bridge done on `bundle/35` (unreleased; integration-checked against the real Sheet with the owner's service account). Owner decisions open in [`docs/SHEETS_SETUP.md`](docs/SHEETS_SETUP.md) §5
- **Reported**: Google Sheets is the external database and needs update-time tracking. Clarified 2026-10-24: the app creates its **own** purpose-specific tabs and writes **only** to those. Every other tab is read-only information that the **server** pulls and streams to all devices.
- **The owner's Sheet** ("subApp - CLASS AND TEACHER ROUTINES Build 4", published copy read 2026-10-24): Staff Directory, Daily_Ledger, Baseline_Updates, Subjects List, 9 per-teacher routine tabs, OVERVIEW (master timetable + subject allocations), KG A, KG B, PREP A, PREP B. Full table in [`docs/SAS.md`](docs/SAS.md) §2.1.
- **Owner setup (blocking)**:
  - [x] Create a Google Cloud project, enable the **Google Sheets API**, create a **service account** and a JSON key.
  - [x] **Share the spreadsheet with the service account's e-mail as Editor.**
  - [x] Provide the **real spreadsheet ID** (in `render.yaml`, not in Go code): the `<id>` in `https://docs.google.com/spreadsheets/d/<id>/edit`. The `2PACX-…` ID in the "Publish to web" link is read-only and cached, and cannot be used for writes.
  - [ ] Store both on Render (steps in `docs/RENDER_SETUP.md`; the Blueprint expects `/etc/secrets/sa.json`): service → **Environment** → `SHEETS_SPREADSHEET_ID` as a variable, and the key under **Secret Files** (`sa.json` → `/etc/secrets/sa.json`, referenced by `GOOGLE_APPLICATION_CREDENTIALS`). Never in the repo.
  - [ ] Decide on the existing `Daily_Ledger` (left untouched for now; options A/B/C in `docs/SHEETS_SETUP.md` §5) (earlier app's substitution log): reuse it as the Subs table, or leave it read-only and start a new `Subs` tab. Decide whether `Baseline_Updates` (earlier master-routine edits) stays as a read-only history.
- **Target Solution**:
  - [x] App-owned tabs, created by the relay if missing (JB35; `App_Log` only with `SHEETS_LOG=1`): **`Subs`** (date, day, period, absent teacher, substitute, status, note, assigned by, `updatedAt` ISO in school time, `updatedBy` device/role/teacher, `appVersion`, monotonic `revision`, stable row `id`), **`App_Meta`** (schema version, last write time, last writer app version), optional **`App_Log`**.
  - [x] Writes (JB35): async, **batched** (`spreadsheets.values.batchUpdate`), **debounced** (a few seconds), **retried** with backoff on 429/5xx, idempotent by row `id`. A write failure never blocks devices; the relay reports a "Sheets: last saved …" status.
  - [x] Reads (JB35 pull and stream; JB35a apply on devices): pull the read-only tabs at startup and every 5 min (one `batchGet`), stream them to devices, and apply them there (Staff Directory → staff, per-teacher tabs → master routine, Subjects List → subjects; OVERVIEW is not used, the per-teacher tabs carry the same routine). Never write to those tabs.
  - [x] Conflict rule (JB35, per entity by `(ts, by)`): last-writer-wins per record by `revision`/`updatedAt`; clients show "Last synced …" in Settings next to the existing "Saved on this device" row.
  - [x] Quotas (JB35, debounced batched writes, 5 min pulls): stay well under the Sheets API per-minute limits by batching. One relay talks to Google; devices never do.

### FEAT-66: Client Cold-Start "Connecting…" State
- **Status**: 🟡 Done on `bundle/35` (unreleased)
- **Why**: outside school hours the owner's pinger stops, Render puts the relay to sleep, and the first connection takes about a minute (PERF-03).
- **Target Solution**:
  - [x] (JB35, `Header.tsx` `sync-pill`) Replace the binary "Cloud Live / Offline" pill with three states: **Live**, **Connecting…** (first attempt or waking; a calm pulse in opacity only) and **Offline** (no network, or still failing after the wake window).
  - [x] The app stays fully usable from local data throughout. Changes queue in the outbox (FEAT-62) and flush once connected.
  - [x] Reconnect with backoff and jitter (1 s → 30 s) instead of a fixed 3 s. The client uses only the WebSocket (no health fetch), so any failed attempt inside the 90 s wake window counts as "waking" and stays Connecting…; Offline needs no network or failures beyond that window.
  - [ ] Optional (not done; the socket attempt on app open already wakes the relay): a cheap `fetch('/api/v1/health')` on app open to start the wake-up early.

### PERF-03: Relay Keep-Warm (Render Free-Tier Spin-Down)
- **Status**: 🟢 Handled externally (owner, 2026-10-24). No work in this repo.
- **Context**: Render's free tier spins a web service down after 15 minutes without inbound traffic and needs about a minute to wake ([Render docs](https://render.com/docs/free)).
- **Resolution**: the owner already runs an **uptime ping bot during school hours**, so the relay stays warm while the front desk is in use and sleeps otherwise (which also saves free instance hours). The keep-warm cron that was briefly proposed for Bundle 35 is **dropped**.
- **Contract for the repo**: keep `GET /api/v1/health` (also `HEAD`) **cheap**: no store lock, no I/O, no Sheets call, no `Origin` needed. The pinger should call `https://lfps-substitutions-manager.onrender.com/api/v1/health`. Client-side cold-start handling is FEAT-66. **Pinger setup:** use **HEAD** if the pinger supports it. A cold start or deploy can return a large Render HTML page, which tripped cron-job.org's 64 KB output limit once (BUG-31).
- *Not the same as PERF-01* (client pre-render of the routine grid, below).

### ARCH-07: School Time Zone (Asia/Kolkata) on Client and Server
- **Status**: 🟢 Done (Job Bundle 34 follow-up)
- **Reported**: *"Render time zone: I tried editing in the server settings but there's no way to change."* Render has no time-zone field. Environment variables live on the service's **Environment** page (left pane), not on **Settings**.
- **Delivered**:
  - [x] Server: `internal/schooltz` defaults to `Asia/Kolkata` in code, overridable by `APP_TZ` then `TZ`; zone data embedded (`time/tzdata`); unknown values fall back with a warning; `/api/v1/health` reports `timeZone`. **No Render setting needed.**
  - [x] Web: `SCHOOL_TIME_ZONE` / `schoolDateFor()` in `@lfps/core`; date keys, the Sunday 00:00 week switch, the midnight rollover, pruning, the Excel file name and displayed times follow IST on every device.
  - [x] Tests: Go resolve order, default zone and IST week rollover; core IST rollover; web IST midnight test; suites also run under `TZ=UTC`, `America/Los_Angeles` and `Pacific/Kiritimati`.

### EPIC-01: Master TimeTable Editing (future, unscheduled)
- **Status**: ⚪ Not scheduled (owner, 2026-10-24: *"Editing Master TimeTable is a bigger part of the project that we will address later."*)
- **Scope (to be designed)**: let admins change the master timetable (permanent routine), with the result written to the master tabs in Sheets (OVERVIEW / per-teacher / per-class), or to a new app-owned staging tab that a person approves.
- **Conflict to resolve first**: today's in-app routine edits are **date-scoped overrides** (`lfps_operational_state.days[date].scheduleOverrides`, a diff against `DEFAULT_MASTER_SCHEDULE`, synced as substitutions in Bundle 35). If the master changes underneath, an existing override may no longer match its base cell. The epic must define:
  - whether a master change clears, keeps or re-bases overrides for future dates
  - how a device shows "the master changed since you edited this day"
  - which tab is authoritative when OVERVIEW and the per-teacher tabs disagree (they are maintained separately in the Sheet today)
  - that it needs SEC-02 (real server-side admin auth) before the app may write master data
- Until then, the app never writes to master tabs. The earlier app's `Baseline_Updates` log is read-only.

### ARCH-05: GitHub Actions CI
- **Status**: 🟡 Bundle 36: `ci.yml` on `next-gen` + `bundle/**` + `preview/**`; `pages.yml` builds the site artifact. Committed root assets remain until owner cutover ([`docs/PAGES_SETUP.md`](docs/PAGES_SETUP.md)).
- **Target Solution**:
  - [x] (JB35 + JB36) Workflow on push/PR: `npm ci`, `npm test` (includes `version:check`), `npm run build:web`, and in `apps/server`: `gofmt -l`, `go vet ./...`, `go test -race ./...`. Also runs on `bundle/**` / `preview/**`.
  - [x] (JB36) Build the Pages artifact in Actions (`VITE_ADMIN_PASSCODE_SHA256` secret, `GIT_COMMIT`/`GIT_BRANCH`, `VITE_BUILD_CHANNEL`). Deploy gated by `PAGES_ACTIONS_DEPLOY` + Pages source switch. Root `assets/` removal is an **optional follow-up after cutover**.
  - [ ] Branch protection on `next-gen` requiring the checks (owner action in GitHub settings).

### ARCH-06: `render.yaml` and Check-Gated Render Deploys
- **Status**: 🟡 Done on `bundle/35` (Blueprint + `autoDeployTrigger: checksPass`); the owner switches the existing service over (see `docs/RENDER_SETUP.md`)
- **Reported**: Render should redeploy only after checks pass; earlier sessions never explained the Render setup.
- **Target Solution**:
  - [x] (JB35; `dockerContext`/`dockerfilePath` instead of `rootDir`, plus a `buildFilter`) `render.yaml` Blueprint: Docker runtime, `rootDir: apps/server`, health check `/api/v1/health`, env var names (`ALLOWED_ORIGINS`, optional `APP_TZ`, `SHEETS_SPREADSHEET_ID` and the service-account secret file as `sync: false`), branch `next-gen`. No keep-warm cron (PERF-03).
  - [x] (JB35: `checksPass` chosen; no deploy-hook secret needed and it fails safe) Gate deploys: Render "Auto-Deploy: After CI checks pass" (Render waits for GitHub checks), or `autoDeploy: false` plus a deploy-hook call from the CI workflow after it passes. Document whichever the owner chooses.
  - [x] Step-by-step owner guide (field names, no screenshots) folded into FEAT-63: `docs/RENDER_SETUP.md`.

### BUG-24 – BUG-28: Confirmed Defects Logged During Workspace Setup
- **Status**: 🟢 BUG-24/26/27/28 resolved in Job Bundle 34; 🟢 BUG-25 sync part resolved on `bundle/35` (unreleased). Full register rows are in [`BUGS.md`](BUGS.md).
  - [x] **BUG-24** (JB34, `5f9ff9c`): Fresh-clone `build:web`/`npm run build` fails with `TS2307 Cannot find module '@lfps/ui'` because no root script builds `packages/ui`.
  - [x] **BUG-25** (part 1 JB34 `f2c2eff`: same-device reload fixed; part 2 JB35: sync through the relay): Changes are lost on reload. The client never pushes mutations, `STATE_MUTATION` payloads are ignored, and the server discards inbound WS messages.
  - [x] **BUG-26** (JB34, `88e640a`): The WebSocket hub (`internal/ws/hub.go`, broadcast branch) closes and deletes clients while holding only `RLock`.
  - [x] **BUG-27** (JB34, `88e640a`, route removed under the relay model): `GET /api/v1/backups` advertises `/api/v1/backups/download?file=…`, but that route is not registered (404).
  - [x] **BUG-28** (JB34, `88e640a`): State save errors are silently ignored (`_ = s.persistLocked()` in `internal/storage/store.go`), as is the Excel backup `SaveAs`.

---

### BUG-31: Uptime Pinger Reported "Failed (output too large)" During the v2.0.0-alpha.2 Deploy (ops)
- **Status**: 🟡 Monitor (ops note, not an app defect). Reopen if it recurs **outside** a deploy or cold start.
- **Seen**: 2026-10-24 (IST), during the v2.0.0-alpha.2 release window. The owner's cron-job.org uptime job pinging `/api/v1/health` reported "Failed (output too large)".
- **Now**: `GET /api/v1/health` returns 200 JSON, about 148 bytes (`version` 2.0.0-alpha.2, `timeZone` Asia/Kolkata). The new server is live.
- **Likely cause (unconfirmed)**: while Render was redeploying or cold-starting, Render, not our relay, answered with its own large HTML page (an interstitial or error page). cron-job.org reads at most **64 KB** of a response and fails the run if a response is bigger ([cron-job.org FAQ](https://cron-job.org/en/faq/), [blog](https://blog.cron-job.org/service/2021/12/01/errors-explained-output-too-large.html)). Our JSON is far below that.
- **Owner update (2026-10-24):** saving responses was **already off** on the job, so that setting is not the cause and not the fix.
- **Fix (owner, in cron-job.org)**: switch the job's request method to **HEAD**: cron-job.org → Cronjobs → the job → **Edit** → **Advanced** → **Request method** → `HEAD` → Save (`/api/v1/health` answers HEAD with 200 and no body). With HEAD no body is downloaded, so the 64 KB output limit can't trip; success depends only on the status code. Verified against cron-job.org's docs: the job's Advanced section has "Request method" (FAQ: GET/POST/PUT/HEAD… supported; REST API `requestMethod`, default GET). If the owner uses the cron-job.org API instead, that is `requestMethod: 3` (HEAD).
  - Expect an occasional failure during deploys and after a sleep. Render takes about a minute to wake, and cron-job.org gives up after 30 s. A single failed run in a deploy window is not an outage.
- **Repo contract** (unchanged, PERF-03): health stays cheap and small, and answers GET and HEAD.

### BUG-32: Two WebSockets per Tab (RESOLVED in JB35, unreleased)
- **Status**: 🟢 Fixed on `bundle/35`. Register row in [`BUGS.md`](BUGS.md).
- **Was**: `useLiveSync()` opened its own socket and was mounted in both `Header.tsx` and `SettingsModal.tsx`, so opening Settings doubled the connections (and the presence count).
- **Fix**: one ref-counted sync client per tab (`apps/web/src/sync/live.ts`, 1 s grace so a remount doesn't reconnect); `useLiveSync()` only reads status. Test: `live-singleton.test.ts`.

---

## 🐛 Critical Bug & Performance Tracker

### BUG-12: Marking Teacher Present Does Not Reset Their Active Substitutions
- **Status**: 🟢 Resolved (Job Bundle 24)
- **Reported**: If a teacher who was marked absent has their absence untoggled (marked present), their previously assigned substitutions remain in the substitutions register and timetable instead of being reset/reverted.
- **Solution Delivered**: In `useTimetableStore.ts`, `toggleAbsence()` checks if the teacher was previously absent; if so, it automatically purges all substitutions for `selectedDay` where `originalTeacher === teacherName || substituteTeacher === teacherName`, restoring baseline timetable slots and updating live counters, with full undo snapshot preservation.

### BUG-13: Routine Grid Period Cells Trigger Teacher Absence Menu on Right-Click / Long-Press
- **Status**: 🟢 Resolved (Job Bundle 24)
- **Reported**: Right-clicking or long-pressing cells in Routine currently mirrors the teacher absence menu. This blocks standard timetable interactions and prevents smooth hold-and-drag gestures.
- **Solution Delivered**: Removed `onContextMenu` from instructional period cells (`<td>`) in `RoutineGrid.tsx`. The `MicroContextMenu` is strictly scoped to the sticky teacher name column cells. Instructional cells are free for slot inspection, co-teach modals, and hold-and-drag gestures.

### BUG-14: Staff Login Panel Positioning Glitch (Partially Off-Screen at Top-Middle)
- **Status**: 🟢 Resolved (Job Bundle 24)
- **Reported**: Tapping the staff profile pill in the header opens a popover that appears awkwardly positioned at top-middle and is partially clipped off the top of the viewport.
- **Root Cause & Fix**: The modal was nested inside `<motion.header>`, whose CSS transform (`will-change-transform`, `animate={{ y: ... }}`) created a local CSS containing block trapping `position: fixed` modals. Created standalone `StaffLoginModal.tsx` mounted at root in `App.tsx` with outside-click and <kbd>Escape</kbd> dismissal.

### BUG-15: Reset History Purge Context Menu Clipped & Inverted Coordinate Alignment
- **Status**: 🟢 Resolved (Job Bundle 24)
- **Reported**: Long-pressing or right-clicking the Reset Day button summons a purge context menu that gets clipped off-screen or positioned improperly compared to the clean micro context menus on teacher cells.
- **Solution Delivered**: Created `ResetPurgeContextMenu.tsx` mounted at root in `App.tsx`. `ResetDayButton.tsx` delegates to `openResetPurgeMenu({ x, y })` with touch/cursor screen-space coordinates, clamping within viewport boundaries, and outside-click/<kbd>Escape</kbd> dismissal.

### BUG-16: Tab Overview Accordion Collapse Animation Jerkiness
- **Status**: 🟢 Resolved (Job Bundle 24)
- **Reported**: The collapse/expand animation of the metric overviews on the Substitutions and Roster tabs is jerky and snaps rather than gliding smoothly.
- **Solution Delivered**: Wrapped overview containers with `overflow-hidden will-change-[height,opacity]`, applied `SPRING_TRANSITIONS.snappy` easing in `AnimatePresence`, isolated inner container padding from the animating element to eliminate subpixel layout reflow jitter, and enabled tapping empty header space to toggle.

### BUG-17: Minimal UI Mode Toggle Has No Visual Effect
- **Status**: 🟢 Resolved (Job Bundle 25)
- **Reported**: Toggling "Minimal UI Mode" in Settings or Header changes store state but components do not visually alter their layout or density.
- **Fix**: Wired `isMinimalUI` across `Header.tsx`, `RoutineGrid.tsx`, `TabBar.tsx`, `SubstitutionsRegister.tsx`, and `AbsenceRoster.tsx` to conditionally compact padding, hide secondary explanatory copy, and activate high-velocity compact card views.

### BUG-18: Officiating Class Teacher (Off. CT.) Whole-Day Assignment & Solver Alignment
- **Status**: 🟢 Resolved (Job Bundle 28)
- **Reported**: When assigned as Officiating Class Teacher (`Off. CT.`), the teacher is appointed for the entire day, not period-by-period. The Auto-Resolve solver must also assign coverage on this whole-day basis (the designated Off. CT covers the absent CT's class for all periods of that day rather than period-by-period scattering).
- **Target Solution Delivered**:
  - Anchored Officiating CT appointments in `@lfps/core` and `useTimetableStore.ts` as whole-day section appointments.
  - In `autoResolveSubstitutions()`, passed `officiatingCT` and weighted designated Off. CT with +250 points affinity across all periods for their section, guaranteeing consistent whole-day coverage while respecting period-by-period teaching availability. Added comprehensive Vitest tests.

### BUG-19: Officiating AC Persists After Marking AC Present or Marking All Present
- **Status**: 🟢 Resolved (Job Bundle 26)
- **Reported**: Once an Officiating AC is assigned, even after marking all staff present (or untoggling AC absence), the actual AC remains marked under the temporary Off. AC.
- **Root Cause & Fix**:
  - In `getEffectiveOfficiatingAC`: If the primary AC is on duty (`!isAcAbsent`), `effectiveAC` strictly resolves to the primary AC (`Mrs. R. Pahwa`), ignoring stale manual entries in `officiatingACMap`.
  - In `useTimetableStore.ts`: Automatically prune/reconcile `officiatingAC[day]` when AC absence is untoggled and during `handleMarkAllPresent()`. Added unit tests in `solver.test.ts`.

### BUG-20: Misleading CT Auto-Resolve Count & Period Stamp
- **Status**: 🟢 Resolved (Job Bundle 31)
- **Reported**: When 1 Class Teacher was absent, the header button displayed "⚡ Auto-Resolve CT Classes (4)" because the teacher taught 4 periods, leading the user to believe 4 CTs were absent. Furthermore, uncovered cards stamped `• CT` on all individual periods.
- **Fix**: Removed the redundant CT Auto-Resolve button. Uncovered duty cards no longer display `• CT` on individual teaching periods and use clean card styling. Unified under `Auto-Resolve (X Slots)`.

### BUG-21: Missing Officiating CT Appointment Cards on Substitutions Page
- **Status**: 🟢 Resolved (Job Bundle 31)
- **Reported**: When a Class Teacher was absent, the Substitutions page displayed an appointment card for AC, but did not display any appointment card for absent Class Teachers unless already appointed.
- **Fix**: Added `unappointedCTs` computation in `SubstitutionsRegister.tsx`. Surfaced `OFFICIATING CT Required - Appointment Needed` cards with `[ Appoint ]` action button in both top toolbar and Section 3 (`OFFICIATING STAFF`), with alert status in the KPI summary strip.

### BUG-22: Cluttered Multiple Appoint Cards & Designation Leak in Teacher Name Overlay
- **Status**: 🟢 Resolved (Job Bundle 32)
- **Reported**: Multiple appointment buttons cluttered the top toolbar when several CTs were absent; bottom AC appoint card used amber instead of AC's semantic purple; Teacher Name Overlay displayed role designation subtitles.
- **Fix**:
  - Clubbed multiple appoint actions in the top toolbar into a single cohesive dropdown menu (`[ 🛡️ Appoint Staff (X) ▾ ]`) when `pending > 1`.
  - In Section 3 (`OFFICIATING STAFF`), styled the AC appointment card in AC's coordinator purple theme, and clubbed multiple unappointed CT sections into a single consolidated card with direct section appoint tiles.
  - Removed designation/subtitle completely from `TeacherNameOverlay.tsx` so it cleanly displays only the full teacher name.

### BUG-23: Appoint Card Pass-Thru Toggle Absence, Wide Pills to Squircle Redesign & AC Card Decluttering
- **Status**: 🟢 Resolved (Job Bundle 33)
- **Reported**: In roster CT/AC cards, tapping anywhere on the appoint pill other than the tiny button text passed through to the card and toggled teacher absence; wide stacked action pills felt visually uncomfortable; AC bottom card had amber glow instead of purple and redundant stacked copy; clubbed CT card had unnecessary explanatory text.
- **Fix**:
  - Replaced wide stacked action pills in `RosterNormalCard.tsx` with tactile **squircle cards**: left-aligned `[ Present / Absent ]` squircle, with `[ Off. CT ]` and `[ Off. AC ]` squircles sitting side-by-side in one compact row (holding up to 3 squircles without wrapping).
  - Made the entire appoint squircle an explicit `<button>` with `e.stopPropagation()`, ensuring tapping ANYWHERE on the appoint card opens the appointment modal directly with ZERO pass-thru to absence toggle.
  - Created `.purple-attention-pulse` in `index.css` so the Officiating AC card pulses strictly in coordinator purple rather than amber.
  - Decluttered the AC card by removing redundant "Appointment Needed" headline, and removed the unnecessary explanatory paragraph from the clubbed CT card.


### BUG-04: Fit-Grid Portrait Mode Screen Overflow & Cell Height Distortion (RESOLVED in v1.40.0)
- **Status**: 🟢 Resolved (v1.40.0)
- **Solution Delivered**:
  - [x] **Strict Cell Height Cap**: In portrait Fit-Grid mode, enforced `height: 38px !important; max-height: 44px !important; overflow: hidden !important;`, single-line `white-space: nowrap !important; text-overflow: ellipsis !important;` for `.cell-class-tag` and `.cell-subject-name`, completely stopping cells from stretching vertically into giant blocks.
  - [x] **Prevent Horizontal Spill**: Enforced `width: 100vw !important; max-width: 100vw !important; overflow-x: hidden !important; box-sizing: border-box !important;` on body, content container, and routine table so no elements ever bleed past mobile screen boundaries.
  - [x] **Adaptive Column Proportions**: Reduced sticky column width to 16% (min 58px) in portrait and dynamically preserved full multi-line layout on landscape viewports (`@media (orientation: landscape)`).
  - [x] **Orientation Guidance**: Triggered friendly toast guidance when toggling Fit-Grid in portrait mode.

### BUG-05: Sticky Teacher Column Translucency Clashes with Scrolling Period Cells (RESOLVED in v1.40.0)
- **Status**: 🟢 Resolved (v1.40.0)
- **Solution Delivered**:
  - [x] Added `--surface-opaque` variable across all light, dark, and glass theme presets.
  - [x] Enforced 100% solid, fully opaque background on `.routine-table th:first-child`, `.routine-table td:first-child`, `.class-header-cell`, and `.class-name-cell` across all theme modes.
  - [x] Enforced `opacity: 1 !important` and opaque background on `.row-absent td:first-child` so absent teacher cells never become 60% translucent.
  - [x] Retained tactile separation divider and elevated box-shadow (`box-shadow: 3px 0 8px rgba(0,0,0,0.08)`) with `z-index: 10` (and `z-index: 15` for header intersection) so passing period cards are cleanly occluded underneath with zero visual text collision.

### BUG-08: Grid Sticky Teacher Column Right Edge Border & Leftmost Under-Slide Peeking Leak (RESOLVED in v1.50.0)
- **Status**: 🟢 Resolved (v1.50.0)
- **Reported**:
  1. The teacher column on the left needs a visible, crisp border on its right edge because when period slot cards slide underneath it during horizontal scrolling, the dividing boundary disappears.
  2. Period slot cards sliding underneath travel all the way to the left edge of the screen, peeking out on the leftmost edge not covered by the teacher column (breaking the physical visual illusion that the teacher column is flush with the left viewport edge).
- **Solution Delivered**:
  - [x] **Solid Right-Edge Separation**: Implemented `.routine-table th:first-child::after, td:first-child::after` pseudo-element with dedicated high `z-index: 25`, pinned to the right edge with a 2.5px solid border and soft drop shadow across all light, dark, and glass themes. It cannot be collapsed or erased by passing period cards.
  - [x] **Eliminate Leftmost Gap & Under-Slide Peeking**: Implemented a 34px opaque masking flange (`::before`) extending to `left: -32px` with `z-index: 12`. Updated `.table-scroll-container` to `overflow-x: auto !important; overflow-y: hidden !important; overflow-y: clip !important; padding: 0 !important;` across all viewport sizes, fixing the WebKit horizontal scrollport leak where period cells bled outside the table to the screen's left edge.

### BUG-09: Assign Officiating Class Teacher (Off. CT.) Modal Silent Failure (RESOLVED in v1.53.0)
- **Status**: 🟢 Resolved (v1.53.0)
- **Reported**: Clicking "Assign Off. CT." or "Change" across Roster cards, Substitutions page, Grid headers, and Quick Action modals failed silently with zero feedback.
- **Root Cause**: `app.js` line 5205 aborted early (`if (!modal || !overlay || !listEl) return;`) because `#officiating-teacher-list` and `#officiating-modal-subtitle` were missing from `#officiating-modal-body` in `index.html`.
- **Solution Delivered**:
  - [x] Injected `#officiating-modal-subtitle`, `#officiating-teacher-list`, and `#close-officiating-modal-footer-btn` directly into `index.html`.
  - [x] Added self-healing DOM injection inside `openOfficiatingModal()` ensuring elements are dynamically created if missing.
  - [x] Filtered candidate pool, tagged off-duty candidates with `⛔ Off-Duty`, and sorted available candidates first.
  - [x] Wired Notification Center Off. CT and Off. AC notices to directly open `openOfficiatingModal()`.

### PERF-01: Master Routine Initial Render Stutter & In-Memory Pre-Render ("Keep-Warm" Engine)
- **Status**: 🔴 Open
- **Scope note (2026-10-24)**: this is the **client** routine-grid pre-render. Server keep-warm for Render is PERF-03 (handled externally).
- **Reported**: The Master Routine table draws noticeably slow / stutters when the page is first loaded and scrolled down into view.
- **Target Solution**:
  - [ ] **Instant Offscreen Pre-rendering on Load**: Instead of waiting for first scroll or deferred triggers, immediately construct and render the full Master Routine table DOM tree into memory during initial app boot (or via `requestIdleCallback`) before user scrolls.
  - [ ] **In-Memory DOM "Keep-Warm" Cache**: Keep the rendered routine table alive in memory. Avoid destroying and rebuilding `table.innerHTML` from scratch during routine refreshes or tab transitions; use targeted DOM node reconciliation (patch only modified cells).
  - [ ] **Periodic Background Sync & Selective Diff Patching**: Keep routine rendered and run background poll for Google Sheet cloud updates, selectively updating only cells with actual diffs (`calculateScheduleDiffs`), eliminating full-table redraw lag.
  - [ ] **Compositor & Layer Optimization**: Keep `contain: paint layout` and GPU layer promotion (`transform: translateZ(0)`) warm so scrolling onto the table has zero frame drops.

### BUG-07: Right-Click / Long-Press on Absent Teacher Only Blurs Absence Panel Without Popover Menu (RESOLVED in v1.45.1)
- **Status**: 🟢 Resolved (v1.45.1)
- **Reported**: Right-clicking or 500ms long-pressing an absent teacher card only blurred the absence panel, and no context menu appeared.
- **Root Cause**: `#absence-context-popover` and `#absence-context-overlay` were nested inside `.absent-tray-container`. In themes with `backdrop-filter` (e.g. Utopian Glass / Utopian Night), the container created a local stacking context and containing block for `position: fixed` elements, trapping the overlay inside the container and pushing the popover coordinates out of view.
- **Solution Delivered**:
  - [x] Relocated `#absence-context-popover` and `#absence-context-overlay` from inside `.absent-tray-container` to the root of `<body>` alongside modal sheets.
  - [x] Fullscreen overlay blur now covers the entire viewport and popover coordinates anchor precisely beneath the clicked teacher card.
  - [x] Added `closeAbsenceContextMenu()`, `closeResetContextMenu()`, and `closeNotificationsModal()` to global Escape key handler.

### BUG-06: Substitutions Page Failure — Missing Teacher Names & Auto-Resolve Inoperative (RESOLVED in v1.44.0)
- **Status**: 🟢 Resolved (v1.44.0)
- **Solution Delivered**:
  - [x] **Eliminated Fatal Script Crash**: Removed stale undefined window exports (`window.saveSubAvailModal` and `window.removeTeacherSubUnavailable`) that were halting JavaScript execution on page load.
  - [x] **Guarded Safe Dropdown Options Check**: Safeguarded `staffSelect.options` in `updateRolePermissionsUI()` against null pointer access.
  - [x] **Substitutions Register Resilience**: Added self-healing absence reconciliation in `renderSubstitutions()`, fallback class resolution, and wrapped teacher names in `.reg-teacher-name` spans.
  - [x] **High-Contrast Column Protection**: Enforced `min-width: 680px` on `.sub-register-table` and explicit font styles (`white-space: nowrap; min-width: 110px`) so teacher names are never squished into invisible text across themes or mobile viewports.
  - [x] **Smart Auto-Resolve Solver Hardening**: Initialized `simSchedule[period]` safely in `generateStrategySolution()`, enabling clean execution of all 3 optimization strategies (`Subject Match`, `Balanced Load`, `Minimal Splits`) and solution application via `#auto-resolve-apply-btn`.

### BUG-01: Limbo Tray Drag Failure & Click-to-Restore Mechanism (RESOLVED in v1.35.0)
- **Status**: 🟢 Resolved (v1.35.0)
- **Solution Delivered**:
  - [x] Made displaced Limbo cards draggable in all views (`div.draggable = true`).
  - [x] Implemented `handleDisplacedCardClick`: checks if `(item.ogTeacher, item.period)` is free and restores it cleanly with complete undo/redo integration (`restore_displaced`).
  - [x] Added phone-style side-by-side error jitter animation (`@keyframes errorJitter`) with emergency red glow and native haptic vibration (`navigator.vibrate([45, 55, 45])`) whenever restore or drag is blocked.

### BUG-02: Schedule Re-rendering & Stutter During Scrolling (RESOLVED in v1.35.0)
- **Status**: 🟢 Resolved (v1.35.0)
- **Solution Delivered**:
  - [x] Decoupled table layout recalculations: added width-change guard and debouncing to `window.resize` observer so mobile vertical scrolling (URL bar collapse) never causes layout thrashing.
  - [x] Promoted `.table-scroll-container` and sticky table cells to independent GPU composite layers using `transform: translateZ(0)` and `contain: paint layout`.
  - [x] Moved `backdrop-filter` from the scrolling container to `.master-routine-container`, eliminating continuous per-frame blur re-filtering during scroll.

### BUG-03: High-Density Mobile Grid & Mobile Landscape Header Overlap (RESOLVED in v1.36.0)
- **Status**: 🟢 Resolved (v1.36.0)
- **Solution Delivered**:
  - [x] Restored high-density spreadsheet grid on mobile viewports: reduced row heights from ~95px back to ~38px–40px, compressed sticky teacher column to 108px, tightened period columns to 86px (80px–92px range).
  - [x] Fixed mobile landscape: prevented desktop button dump by scoping to `(min-height: 501px)`, consolidated header and day selector into a slim 36px bar, eliminating day bar overlapping row 1.
  - [x] Implemented 500ms touch long-press with haptic vibration (`navigator.vibrate(40)`) on teacher cards to open Substitution Availability modal on touch devices.
  - [x] Preserved full teacher honorifics (`Mrs. S. Lakra`, `Mr. S. A. Lakra`) across attendance trays and roster displays.
  - [x] Implemented undo/redo history auto-reset on day navigation and manual history purge in Settings.

### FEAT-04: Header Space Reclaim, Color-Coded Blobs, Roster Splitters & Stacked Cell Architecture (RESOLVED in v1.37.0)
- **Status**: 🟢 Resolved (v1.37.0)
- **Solution Delivered**:
  - [x] **Header Decluttering**: Removed redundant `#role-badge-btn` (`🛡 Admin`) from the header top row and relocated `.version-badge` below the Limbo tray in `.grid-status-footer`, freeing ~140px of header space.
  - [x] **Mark Absence Roster**: Sorted Class Teachers first. Replaced text role subtags with color-coded circular blobs with corner badges for Coordinators (`AC` for Mrs. R. Pahwa, `A.AC` for Mrs. S. Lakra).
  - [x] **Subtle Splitters**: Added 1px gradient vertical dividers (`.roster-splitter`) between teacher avatars matching bottom nav styling.
  - [x] **Narrowed Teacher Column**: Compressed to **78px on mobile** and **120px on desktop**.
  - [x] **Stacked Cell Architecture**: Vertically separated Class Name (`.cell-class-tag`) on top and Subject (`.cell-subject-name`) below for both desktop and mobile, reducing cell width to **54px on mobile**.
  - [x] **Role Accuracy**: Corrected `Mr. S. A. Lakra` from "3rd Teacher / Support" to strictly "3rd Teacher".

### FEAT-05: Interactive Roster Color Customizer & Unified Coordinator Badges (RESOLVED in v1.37.1)
- **Status**: 🟢 Resolved (v1.37.1)
- **Solution Delivered**:
  - [x] **Color Separation from Absent (Red)**: Fixed pink clashing with red by switching default Class Teacher (CT) blob color to non-obnoxious **Royal Violet** (`#af52de` / `rgba(175, 82, 222, 0.14)`).
  - [x] **Unified Leadership Badges**: Synced `AC` and `A.AC` badges to the exact same background color (`#f59e0b`).
  - [x] **Interactive Color Tuning Panel**: Added a temporary settings group in Settings > "🎨 Roster Blob & Badge Colors" with HTML5 color pickers, quick-select preset swatches, real-time live preview, and "Reset Defaults" button.

### FEAT-06: Chosen Palette, Android Dev Easter Egg, Settings Declutter, PIN Security, Header Edit & Fullscreen (RESOLVED in v1.38.0)
- **Status**: 🟢 Resolved (v1.38.0)
- **Solution Delivered**:
  - [x] **Locked-in Chosen Palette**: Class Teachers (CT) in Teal Sky (`#0284c7`), Subject Teachers (ST) in iOS Blue (`#007aff`), Coordinator Badges (`AC` & `A.AC`) in unified Purple (`#8b5cf6`), Absent in Crimson Red (`#ff3b30`).
  - [x] **Android-Style Easter Egg**: Tapping the Settings "Version" row 5 times activates "Developer Options" with haptic pulse (`navigator.vibrate([50, 100, 50])`), countdown toast warnings, and reveals the hidden Roster Color Customizer with a 1-tap "Lock" toggle.
  - [x] **Settings Decluttering (Boomer/Layman Usability)**: Reorganized settings into logical sections (Identity $\to$ Cloud Sync $\to$ Preferences $\to$ Appearance $\to$ Info). Collapsed 12-card theme grid into 3 quick pills (`☀️ Light`, `🌙 Dark`, `💠 Utopian`) + a clean `More Themes...` dropdown.
  - [x] **Admin PIN Masking & Secure Change Flow**: Stopped exposing plaintext/dotted PIN in Settings; replaced with masked `••••` and a `[ 🔑 Change PIN ]` button launching an interactive 3-step PIN pad flow (Verify Current $\to$ Set New $\to$ Confirm New).
  - [x] **Mobile Edit Button Outside & State Sync**: Brought the Edit button outside to the mobile header controls alongside Undo/Redo. Dynamically updates `#edit-toggle-btn`, `#fit-grid-edit-btn`, and 3-dot overflow menu items (`✓ Done Editing` with `● In Edit Mode` badge, `🛠 Master Save` with `🛠 Editing` badge, or `✎ Edit Schedule`).
  - [x] **Fit-Grid Polish**: Added "Edit Schedule" button inside `#fit-grid-sticky-bar`, widened sticky teacher column to 15% (min 80px) with bold weight for crisp readability.
  - [x] **1-Tap Browser Fullscreen API**: Added Fullscreen toggle to 3-dot overflow menu and Settings to remove browser address/tab bars on demand.

---

## 🚀 Active / Next Priorities

### FEAT-07: Rapid 1-Tap Substitution-Availability Card Redesign (RESOLVED in v1.39.0)
- **Status**: 🟢 Resolved (v1.39.0)
- **Solution Delivered**:
  - [x] **Dual-Mode Ergonomic Card**: Replaced cumbersome form modal with a high-speed Dual-Mode Action Card:
    - **Mode 1 (Quick Action)**: Opened via long-press/right-click on any teacher avatar card. Displays teacher identity, large 1-tap toggle button (`[ ⛔ Mark Unavailable Today ]` vs `[ ✓ Set Back to Available ]`), and 6 auto-saving duty chips.
    - **Mode 2 (All Staff Checklist)**: Opened via tray button or 3-dot menu. Shows all 9 teachers with instantaneous 1-tap status pills, eliminating all dropdown search menus.
  - [x] **1-Tap Instant Duty Chips**: Tapping any quick duty chip (`🚌 Bus Duty`, `📝 CBSE Duty`, `👥 Parent Meet`, `📑 Exam Duty`, `🩺 Sick Bay`, `🎪 Event Duty`) immediately saves status, triggers tactile haptic feedback (`navigator.vibrate([40, 50, 40])`), and closes the modal.
  - [x] **Custom Remark Input**: Enter key or "Apply" button saves custom duties (`Lab setup`, `Principal meeting`, etc.) with instant toast confirmation.
  - [x] **Layman / Boomer Usability**: Giant touch targets, zero complex dropdown flows, instant visual status indicators (`🟢 Available` vs `⛔ Unavailable`).

### FEAT-09: Mobile Grid Visual Stability & Core Fixes (RESOLVED in v1.40.0)
- **Status**: 🟢 Resolved (v1.40.0)
- **Solution Delivered**:
  - [x] **Sticky Teacher Column Opaque Backing (BUG-05)**: Added `--surface-opaque` across all themes and enforced 100% solid, fully opaque backgrounds on `.routine-table th:first-child`, `.routine-table td:first-child`, `.class-header-cell`, and `.class-name-cell` so passing period cards never bleed through teacher names.
  - [x] **Icon-Only Expand Button**: Removed verbose "Fit Grid" text, leaving only the crisp Apple-style `⛶` icon button (`.btn-fit-grid`), immediately freeing ~65px width in the routine header.
  - [x] **Hide Absent Toggle Knob Overshoot Fix**: Enforced `flex-shrink: 0` on `.toggle-switch` and `.slider`, plus bounded translation so the white knob never spills past the pill boundary when squished in portrait mode.
  - [x] **Fit-Grid Portrait Refinement (BUG-04)**: Enforced `max-width: 100vw; overflow-x: hidden; box-sizing: border-box;` to stop horizontal screen spill, and capped cell heights to `height: 38px; max-height: 44px; overflow: hidden;` with text ellipsis in mobile portrait so cells never stretch into giant blocks. Added orientation prompt when toggling in portrait.

### FEAT-10: Routine Header Ergonomics, In-Situ Grid Absences & History Purge (RESOLVED in v1.41.0)
- **Status**: 🟢 Resolved (v1.41.0)
- **Solution Delivered**:
  - [x] **Pinned View vs. Scrollable Controls Header Bar**: Built two-zone routine header layout with pinned left dropdown and 1px vertical divider (`.routine-header-pinned`), plus horizontal smooth-scroll container (`.routine-header-scrollable`) for `⛶` Expand, `Hide Absent` toggle, and badges.
  - [x] **Compact View Mode Dropdown**: Converted segmented buttons into space-saving Apple-style dropdown (`#routine-view-select`, `👨‍🏫 Teachers ▾` vs `🏫 Classes`), saving ~60px horizontal space on mobile.
  - [x] **Mark Teacher Absent via Long-Press on Grid (FEAT-08)**: 500ms touch-hold and right-click on any `.teacher-cell` in `.routine-table` triggers haptic vibration and launches `#teacher-quick-action-modal` to mark Absent/Present in-situ, view sub-availability, or assign Off. CT.
  - [x] **Reset Button History Purge Shortcut**: 500ms touch-hold and right-click on `#reset-schedule-btn` and `#more-item-reset` reveals `#history-purge-modal` to wipe undo/redo buffers without altering the schedule.
  - [x] **Absent Teacher Subject & Missing Cell Visibility in Utopian Night & Glass Themes**: Enforced deep crimson glass background and luminous red borders on `.cell-missing`, and bright red text on `.row-absent .cell-subject-name` and `.cell-missing .cell-subject-name` across all themes.

### FEAT-11: Hidden Settings, Policy Safeguards, Notification Center & Halo Ring (RESOLVED in v1.42.0)
- **Status**: 🟢 Resolved (v1.42.0)
- **Solution Delivered**:
  - [x] **Free Dispute by Default & Hidden Acceptance Countdown Timer**:
    - **Free Dispute Policy**: 10-second timer lock-in disabled by default. Assigned substitutions can now be disputed freely at any time without time-locking restrictions.
    - **Developer Options Controls**: Added Acceptance Countdown Timer toggle (default `false`) and Countdown Duration dropdown (`5s`, `10s`, `30s`, `60s`) inside 🛠 Developer Options for administrators who still prefer hard lock-ins.
  - [x] **Header Notification Center (`🔔` Icon with Live Notice Badge)**:
    - Added an Apple-style bell button (`#notifications-btn`) with live notice counter pill (`#notif-badge`) in the top navigation bar, plus integrated into 3-dot overflow menu.
    - Added slide-over modal (`#notifications-modal`) aggregating real-time operational notices:
      - **Disputes**: Live dispute alerts (`⚑`) with 1-tap direct navigation to substitution register.
      - **Timetable Conflicts / Clashes**: Immediate warnings (`⚠️`) with 1-tap scroll-to-cell clash inspector.
      - **Displaced Staff in Limbo**: Alerts (`👥`) for unallocated staff awaiting reallocation.
      - **Officiating Role Alerts**: Reminders (`⭐`/`🏫`) when Academic Coordinator or Class Teachers are absent and need Off. AC / Off. CT. designated.
      - **Uncovered Periods**: Alerts (`🕒`) for uncovered periods with 1-tap assign drawer opener.
  - [x] **Cross-Period Substitution Policy in Hidden Settings**:
    - **Default Locked**: Enforced `samePeriodLock: true` as the unyielding default.
    - **Developer Options Relocation**: Moved the Same-Period Lock toggle out of the visible Settings menu and tucked it into "🛠 Developer Options" to keep standard front desk UI uncluttered.
  - [x] **Mobile Undo/Redo Icon Selector in Hidden Settings**:
    - Built interactive button style selector in Developer Options with live preview cards: `Curved` (`↩ ↪`), `Circular` (`↺ ↻`), `Geometric` (`◀ ▶`), and `Micro-Text` (`↶ ↷`).
    - Preferences immediately persist to storage and lock across all viewports.
  - [x] **Subbed Teacher Target Cell Visual Indicator & Halo Ring (Hidden Setting)**:
    - Target cells in routine table display an illuminated breathing halo ring (`@keyframes haloPulse`, `sub-halo-active`).
    - Added Developer Options toggle (`subHaloIndicator`, default: `true`) and color palette selector (`🟢 Emerald`, `🔵 Neon Cyan`, `🟡 Amber Gold`, `🟣 Royal Violet`).
  - [x] **Absent Teacher Subject Visibility in Utopian Night Theme**:
    - Strengthened CSS specificity and vivid red glow (`#ff4d4d !important; text-shadow: 0 0 10px rgba(239, 68, 68, 0.5)`) for absent teachers' cells, class tags, and subject names in Utopian Night theme, fixing visibility gaps.
  - [x] **Concise, High-Density Toast Messages (Microcopy Streamlining)**:
    - Audited and condensed over 60 wordy toast messages across `app.js` into glanceable 2–4 word microcopy (e.g. `Edit mode enabled`, `Baseline routine restored`, `Locked by acceptance`, `History purged`, `Co-teachers kept paired`).

### FEAT-13: Front Desk Velocity, Contextual Menus, Grid Alignment, Live Cloud Broadcast & Ableton Themes (ACTIVE / NEXT)
- **Status**: 🟡 In Queue / Next Up
- **Tasks to Deliver**:
  - [x] **Ergonomic Speed-of-Light Zero-Travel UI Architecture (Delivered in v1.45.0)**:
    - Avoid excessive hand/mouse travel distances across the interface.
    - Anchored contextual micro-actions directly adjacent to cursor/touch targets; eliminated disruptive full-screen modals for quick micro-actions.
  - [x] **Routine Header Right-Alignment (Delivered in v1.45.0)**:
    - Right-aligned Scale to Viewport button (`#fit-grid-btn`) and Hide Absent toggle (`#hide-absent-toggle-wrapper`) via `.routine-header-right-controls` with `margin-left: auto;`, balancing the pinned view select on the left.
  - [x] **Context Popover for Reset Button History Purge (Delivered in v1.45.0)**:
    - Replaced the disruptive `#history-purge-modal` popup on right-click / 500ms long-press of `#reset-schedule-btn` and `#more-item-reset` with a sleek, anchored iOS-style context popover (`#reset-context-popover`) right beside the button (`[ 🗑 Purge Action History ]`).
  - [x] **Grid Scroll Panel De-Obstruction (Delivered in v1.45.0)**:
    - Decoupled the routine table from nested `.table-scroll-container` letterbox traps: set `max-height: none !important; overflow-y: visible !important;` across CSS and dynamic layout engine.
    - All 9 teacher rows are immediately visible on desktop without scrolling inside a container; whole page scrolls naturally without cursor traps.
  - [x] **Absence Panel Sub-Availability Full-Height Hardware Pad Button (Delivered in v1.45.0)**:
    - Redesigned `#btn-open-sub-avail-modal` into a tactile hardware-like "pad button" (`.btn-sub-avail-pad`, MPC/Launchpad aesthetic with squircle corners, full vertical stretch, tactile press depth, glowing LED indicator, and clear stacked icon + label + live off-duty count badge) docked against the right edge of `.absent-tray-container`.
    - Fully accessible across desktop, mobile portrait, and mobile landscape.
  - [x] **Professional Terminology for "Fit-Grid" (Scale to Viewport) & Desktop Click Fix (Delivered in v1.45.0)**:
    - Rebranded feature terminology to **Scale to Viewport** across tooltips, labels, 3-dot overflow menu, and guide text.
    - Fixed desktop mouse interaction on need-to-sub cells (`.cell-missing` and `.cell-covered`): guarded `#sheet-overlay` dismissal against trailing clicks within 300ms, ensuring smooth 1-tap substitute picker opening.
  - [x] **Settings Section & Control Relocations (Job Bundle 9 - Delivered in v1.46.0)**:
    - **Developer Options to Very Bottom**: Moved the entire Developer Options card (`#roster-color-settings-group`) to the absolute bottom of Settings (below "About & Guides"), preserving the 5-tap version Easter egg unlock and smooth scroll-into-view.
    - **Same-Period Lock to Regular Settings**: Moved `samePeriodLock` toggle back to "General & Policies" since it actively blocks coordinators by default.
    - **Same-Period Lock Toast Polish**: Replaced wordy rejection copy with punchy, high-visibility microcopy (`⛔ Locked: Same-Period Subs Only (${tPeriod})`) with a 5000ms duration and timer-clearing tracking in `showToast` so coordinators comfortably understand cross-period constraints.
    - **Shift "Allow Disputes" to Developer Options**: Relocated `#admin-dispute-setting-row` out of General & Policies into Developer Options.
    - **Shift Google Sheets URL Input to Developer Options**: Relocated `#sheets-csv-url-input` and Save URL button into Developer Options, keeping standard Cloud Sync focused on clean connection status, manual Push, and Sync triggers.
    - **Shift Test Simulations to Developer Options**: Relocated `#mock-scenario-select` and `#btn-apply-scenario` out of Timetable Data into Developer Options.
  - [x] **iOS & Ableton Live Inspired Theme Menus (Job Bundle 9 - Delivered in v1.46.0)**:
    - Redesigned the theme selector taking inspiration from iOS Settings and Ableton Live's minimalist color themes.
    - Built tactile visual palette cards (`.theme-swatch-card`) displaying true canvas background (`--bg-color`), surface card (`--surface-color`), and accent LED chip (`--accent-blue`).
    - Grouped all 12 themes into cohesive families (`☀️ Light`, `🌙 Dark`, `🪟 Glass Materials`, `🔲 Studio`) with instant 1-tap live preview and responsive category tabs (`.theme-family-pill`).
  - [x] **Substitutions Page Bug Fixes (BUG-06) (Delivered in v1.44.0)**:
    - Fixed fatal JavaScript script crash caused by stale undefined window exports.
    - Added self-healing absence reconciliation and fallback class resolution in `renderSubstitutions()`.
    - Protected teacher names with `.reg-teacher-name` spans and enforced `min-width: 680px` on `.sub-register-table`.
    - Fixed Smart Auto-Resolve solver (`#auto-resolve-btn` / `performAutoResolve`) proposal generation and solution application.
  - [x] **Edit Schedule Mode Drag-to-Sub Fix (Delivered in v1.44.0)**:
    - Updated `executeMove()` to recognize when the drop target is an absent teacher's missing period cell (`isTargetSubRelated`), properly delegating to `assignSubstitute()` with full displacement, audit history, and badge updates rather than performing a raw routine edit.
  - [x] **Live Timetable Conflict Pill (Delivered in v1.44.0)**:
    - Added live conflict pill in `.grid-status-footer` (`#footer-conflict-pill`) and synchronized with `#collision-indicator`.
    - Clicking the pill smoothly scrolls to conflicting cells and provides instant toast diagnostics.
  - [x] **Mobile Ergonomics, 3-Dot Header Reorganization & Fit-Grid Scrollability (Job Bundle 10 - Delivered in v1.47.0)**:
    - **Circular Undo/Redo Icons Exchanged Fix**: Exchanged circular icons in `getUndoRedoIcons('circular')` and sample card so undo (`↻`) and redo (`↺`) match desired rotational flow.
    - **3-Dot Overflow Menu Streamlining & Header De-Cluttering**:
      - Renamed "Reset to Baseline" $\to$ "Reset" (`#more-item-reset`).
      - In narrow view ($\le 768\text{px}$), hid standalone Settings button (`#settings-btn`) from the top header bar and surfaced Settings as an option inside the 3-dot menu (`#more-item-settings`).
      - Removed Notifications (`#more-item-notifs`) from 3-dot menu (bell button already exists in header).
      - Hid Edit Baseline Master Routine (`#master-lock-btn`) inside 3-dot menu as `#more-item-master-lock`, keeping the header clean.
      - Kept Edit Schedule button (`#edit-toggle-btn`) prominently displayed outside in the header bar across narrow mobile screens.
      - Removed redundant items from 3-dot menu (Staff Availability, Scale to Viewport, Features Tour).
    - **Fit-Grid (Scale to Viewport) Scrollability**:
      - Made `.fit-grid-sticky-bar` horizontally scrollable (`overflow-x: auto`) so coordinators on narrow screens can scroll directly to the collapse button (`#exit-fit-grid-btn`).
      - In portrait orientation, enabled horizontal scrolling for the routine grid (`overflow-x: auto !important`) with sticky teacher column, preventing unreadable column squishing.
    - **Bottom Sheet Landscape Dismissal & Tap-to-Close**:
      - Enabled tap-to-close on `#sheet-handle` across touch and mouse interactions with expanded hit area (`::before`).
      - Adjusted drag-to-dismiss threshold in landscape / short viewports to 25px for effortless swipe-down dismissal.
    - **Developer Options Verification**:
  - [x] **Cloud Auto-Sync & Mandatory Substitution Broadcast (Job Bundle 11 - Delivered in v1.48.0)**:
    - **Live Cloud vs. Local Mode State Machine**: Operating mode state machine (`state.settings.cloudMode`: `live` vs `local`) with Settings segmented control pills and clear explanation callout.
    - **Tactile Header Cloud Status Pill (`#header-cloud-status`)**: Live multi-state LED dot badge (`● Live`, `● Local`, `⚪ Offline`, `☁↑ Broadcast`) with interactive `#cloud-session-popover` for 1-tap mode toggling, immediate routine sync, and ledger push.
    - **Background Auto-Sync Engine**: 60-second periodic fetch and `visibilitychange` poll in Live Cloud mode, non-intrusively detecting timetable diffs and routing alerts to Notification Center (`🔔`).
    - **Unconditional Mandatory Substitution Broadcasting**: Immediate cloud dispatch (`broadcastSubstitutionsToCloud`) for all substitution assignments, unassignments, auto-resolves, absence reverts, orphan cleanups, disputes, and undo/redo operations regardless of local or cloud mode.
    - **Offline Queue & Reconnection Draining**: Built-in queue buffer (`state.pendingBroadcasts`) that safely retains records when offline and drains automatically upon network restoration.
  - [x] **Roster Management Tab & Grid Absence Panel Toggle (Job Bundle 12 - Delivered in v1.49.0)**:
    - Dedicated Roster view tab (`#tab-roster`, bottom nav zone 2) for whole-school attendance, teaching schedule overview, and off-duty unavailability management.
    - Live absence notification counter badge (`#roster-absent-badge`) on bottom nav tab.
    - KPI statistics strip (`🟢 Present: X`, `🔴 Absent: Y`, `⛔ Off-Duty: Z`).
    - Real-time search filtering (`#roster-search-input`) with 1-tap clear button (`#roster-search-clear`).
    - Batch actions: `[ 🟢 Mark All Present ]` and `[ ⛔ Staff Availability & Duties ]`.
    - Responsive cards for all 9 teachers with real-time class load, substitution coverage, role badges, dual 1-tap toggles (`toggleTeacherAbsence`, `toggleSubAvailability`), and quick duty manager (`openTeacherQuickActionModal`).
    - Developer Options hidden toggle (`#hide-absence-panel-toggle` / `state.settings.hideAbsencePanelFromGrid`) to collapse `.absent-tray-container` from Grid view for an unobstructed, full-height Master Routine table.
    - Context menu right-click / long-press enhancement with direct Attendance Toggle (`[ 🟢 Mark Present Today ]` / `[ 🔴 Mark Absent Today ]`), Sub-Availability Toggle, and strict viewport boundary clamping.

---

## 🚀 Active Roadmap: Job Bundles 13, 14, 15 & 16

### Job Bundle 13: Routine Grid Visual Integrity, Always-Editable Routine & Grid Context Popover (RESOLVED in v1.50.0)
- **Status**: 🟢 Resolved (v1.50.0)
- [x] **BUG-08 (Sticky Teacher Column Right Border & Leftmost Peeking Fix)**:
  - Enforced prominent 2.5px right-edge border and drop shadow on sticky teacher column (`.routine-table th:first-child::after`, `.routine-table td:first-child::after` with `z-index: 25`) so scrolling period cells never erase the column boundary.
  - Fixed leftmost under-slide peeking: added 34px opaque masking flange (`::before`) and updated `.table-scroll-container` to `overflow-y: clip !important; padding: 0 !important;`, completely preventing sliding cells from peeking past the left edge of the teacher column.
- [x] **FEAT-15 (Always-Editable Routine Grid & Hidden Developer Edit Lock)**:
  - Removed the requirement to click "Edit Schedule" before moving or assigning slots. The routine table is directly interactive and editable by default at all times.
  - Moved the "Edit Routine Lock" into Developer Options as a hidden setting (`state.settings.routineEditLock: false`) for coordinators who specifically want to lock the grid to prevent accidental drags.
  - When unlocked (default), drag-and-drop and slot editing are immediately responsive without prerequisite mode toggling; redundant `#edit-toggle-btn` is hidden from the header.
- [x] **FEAT-16 (Anchored In-Situ Context Popover on Routine Grid)**:
  - Replaced cumbersome modal popups with an anchored, high-speed iOS-style context popover (`#grid-cell-context-popover`) docked right beside the clicked cell/cursor on right-click (desktop) and 500ms long-press (mobile).
  - Supplies rapid contextual micro-actions: Mark Absent/Present, Set Off-Duty, Assign Sub, Clear Sub, Reset Slot to Master Routine, and Quick Duty modal shortcut.

### Job Bundle 14: Modernized Substitutions Register, Bottom Counter, 'My Subs' Filter & Narrow Table (RESOLVED in v1.51.0)
- **Status**: 🟢 Resolved (v1.51.0)
- [x] **FEAT-14.1 (Counter Panel Relocation & Top Filter Simplification)**:
  - Shifted the counter pills (`#register-summary-bar` / `#register-stats-pills`) to the bottom of `#tab-substitutions` below the ledger table (`.bottom-summary-bar`).
  - Above the table, retained only the filter controls: `All`, `Pending`, `Covered`, plus `'My Subs'`.
- [x] **FEAT-14.2 ('My Subs' / 'My' Filter Button)**:
  - Added `'My Subs'` filter button showing only rows where the active profile (`state.activeTeacher`) is assigned as substitute or is the absent teacher.
  - Added live notification counter badge (`.reg-filter-count`) displaying active coverage duties at a glance.
- [x] **FEAT-14.3 (Narrower Responsive Substitution Table Architecture)**:
  - Compact multi-line cell design combining Period + Class into a unified column (`P1` badge with `Prep A` and subject below).
  - Reduced column count from 6 to 5 and reduced table min-width from 680px down to 480px (440px on mobile $\le 600\text{px}$), resolving horizontal scroll traps.
  - Tightened padding, added teacher role subtitles, and streamlined action buttons.

### Job Bundle 15: Streamlined Officiating Class Teacher (Off. CT.), Roster Full Names & Settings Re-Organization (RESOLVED in v1.52.0)
- **Status**: 🟢 Resolved (v1.52.0)
- [x] **FEAT-17 (Streamlined Officiating Class Teacher Workflow)**:
  - **In Roster Tab**: For any absent Class Teacher, provided an inline 1-tap Off. CT. row (`.roster-card-offct-row`) directly on their card showing either the assigned Off. CT (`Change` / `✕ Clear`) or a 1-tap `[+ Assign Off. CT]` prompt.
  - **In Substitutions Tab**: Added a dedicated Officiating Class Teachers ledger table (`#sub-off-ct-container`) situated directly above the bottom counter panel, presenting absent class teachers, designated officiating teachers, status indicators, and 1-tap action buttons.
- [x] **FEAT-18 (Roster Full Name Display on Responsive Screens)**:
  - Integrated responsive dual-name architecture (`.roster-name-abbr` / `.roster-name-full`) displaying full formal names (e.g. `Mrs. Manisha Midha`, `Mr. Stephen Ashish Lakra`) on Roster cards when viewport $\ge 768\text{px}$ and compact abbreviations on mobile via pure CSS media queries.
- [x] **FEAT-19 (Settings Section Flow: Themes to Bottom Above Version)**:
  - Reordered the Settings modal (`#settings-modal`): shifted "Appearance & Themes" down to Section 5, positioned immediately above "About & Guides" (Section 6), keeping core operational configurations (Profiles, Attendance, Cloud Sync, and Storage) prioritized at the top.
- [x] **FEAT-20 (Roster Card Action Streamlining & Universal Long-Press Affordance Badge)**:
  - **Removed Gear Icon**: Removed `.roster-card-btn-manage` (gear icon `⚙`) from Roster cards to eliminate visual clutter.
  - **Enhanced 'Available' Button Interactions**:
    - Primary 1-tap: Immediately toggles substitution availability (`toggleSubAvailability(teacher)`).
    - Right-Click (desktop) & 500ms Long-Press (mobile/touch) with haptic feedback: Opens the individual teacher's availability & duty remarks modal (`openSubAvailModal(teacher, 'single')`).
    - Guarded against trailing click events after touch long-press dismissal.
  - **Universal Long-Press Indicator Standard**: Standardized Yamaha-inspired finger glyph indicator (`<span class="hold-indicator">👆</span>`) with clear subtext microcopy (`Hold for duties` / `Hold for more`).
- [x] **FEAT-21 (Detailed Staff Availability Page Simplification & De-Cluttering)**:
  - Streamlined `#sub-avail-modal` with simplified header title `Staff Availability & Duties`, converted common duty chips into a high-density 3-column grid (`repeat(3, 1fr)`), and removed verbose parenthetical microcopy.

### Job Bundle 17: Teacher Login Mechanism, Conditional Visibility, Disambiguation Engine, Micro Context Menus & Off. CT Repair (RESOLVED in v1.53.0)
- **Status**: 🟢 Resolved (v1.53.0)
- [x] **BUG-09 (Assign Officiating Class Teacher Modal Silent Failure)**:
  - Repaired missing `#officiating-teacher-list` and `#officiating-modal-subtitle` in `#officiating-modal-body` inside `index.html`.
  - Added self-healing DOM creation in `openOfficiatingModal()` if elements are missing.
  - Filtered candidate pool, tagged off-duty teachers with `⛔ Off-Duty`, and sorted available candidates ahead of unavailable ones.
  - Bound `#close-officiating-modal-footer-btn` and wired Notification Center Off. CT and Off. AC notices to directly launch `openOfficiatingModal()`.
- [x] **FEAT-26 (Non-Blocking Teacher Login Mechanism & Header Profile Pill)**:
  - Added dedicated login selector in Settings Group 1 ("Teacher Login & Operating Identity") and interactive top header profile pill (`#header-profile-pill`).
  - System remains 100% accessible to anyone in guest / front-desk mode without logging in.
  - Added explicit "Log Out" button (`#btn-profile-logout`) returning session cleanly to front-desk mode.
- [x] **FEAT-27 (Identical / Same-Name Disambiguation Engine)**:
  - Assigned internal unique Staff IDs (`id: "STAFF-01"` through `STAFF-09`) in `staffDirectory`.
  - Implemented `getDisambiguatedTeacherName(teacher)` helper detecting duplicate names and appending primary class or department qualifiers (e.g. `Mrs. S. Lakra (KG A)`).
- [x] **FEAT-28 (Conditional Visibility for Logged-In Teacher Features)**:
  - When not logged in (`state.loggedInTeacher = null`):
    - `'My Subs'` filter button (`#reg-filter-btn-my`) is hidden (`.hidden`). If viewing `'my'`, automatically falls back safely to `'all'`.
    - Inline row action buttons `[Accept]` and `[Dispute]` are hidden (`canTeacherAct = false`), preserving a clean front-desk overview.
    - Personal substitution duty alerts are suppressed in the notification center.
  - When logged in, `'My Subs'` appears with a live duty badge, and personal action buttons activate for the teacher's own duties.
- [x] **FEAT-29 (Ultra-Compact Micro Context Menus)**:
  - Right-click (desktop) and 500ms touch long-press (mobile) on absence tray cards and routine grid teacher column cells summon an ultra-compact ~160px $\times$ 74px 2-button micro-menu (`.ctx-micro-menu`).
  - Provides instant 1-tap `[ 🔴/🟢 Mark Absent ]` & `[ ⛔/🟢 Mark Off-Duty ]` with zero screen clutter.
- [x] **FEAT-30 ('Minimal UI Mode' Hidden Developer Setting)**:
  - Added `#minimal-ui-toggle` to Developer Options (`state.settings.minimalUI: true` by default). Enabling renders the ultra-compact micro-menus, while disabling restores full elaborate cards and extended details.

### Job Bundle 19: Next-Gen Monorepo Workspace, Core TS Domain Engine & Go Service Scaffold (RESOLVED on `next-gen` branch)
- **Status**: 🟢 Resolved (Phase 1 Complete)
- **Scope & Solution Delivered**:
  - [x] **NPM Workspace Monorepo Architecture**:
    - Created clean multi-package layout: `packages/core`, `packages/ui`, `apps/web`, `apps/server`.
    - Archived v1.53.0 vanilla build into `legacy-v1/` for side-by-side verification and zero disruption to production `main` branch.
    - Set up root `package.json` with workspace orchestration (`npm run dev:web`, `npm run build:web`, `npm run test:core`).
  - [x] **`@lfps/core` Domain Engine & Pure TS Solver**:
    - Strict TypeScript contracts: `Teacher`, `DailySchedule`, `MasterSchedule`, `AbsenceRecord` (including `AWAY_OFFICIAL`), `StaffAvailabilityRecord` (`AVAILABLE` vs `FREE_FROM_SUB`), `SubstitutionAssignment`, `AutoResolvePlan`.
    - Ported full 2026–2027 timetable seed data (`DEFAULT_MASTER_SCHEDULE`) and all 9 staff records (`DEFAULT_STAFF_DIRECTORY`) with full departments and subject pools.
    - Staff Disambiguation Engine: `getDisambiguatedTeacherName()`, `resolveTeacherById()`.
    - Pure TS Substitution Solver: `parseCellSlot()`, `findAvailableSubstitutes()`, `calculateCandidateAffinity()`, and `autoResolveSubstitutions()`.
    - **Vitest Test Suite**: 100% passing tests (10/10 specs) in 383ms validating cell parsing, disambiguation, absence filters, Away Official checks, Free from Sub toggles, and multi-period auto-resolve plans.
  - [x] **`@lfps/ui` Apple HIG Design Tokens**:
    - Shared spring physics configs (`snappy`, `bouncy`, `smooth`) and CSS easing curve (`cubic-bezier(0.2, 0.9, 0.3, 1)`).
    - Scoped role palettes: Class Teachers in Teal Sky (`#0284c7`), Subject Teachers in iOS Blue (`#007aff`), Coordinators in Royal Violet (`#8b5cf6`), Absent in Crimson (`#ff3b30`), Away (Official) in Slate Indigo (`#475569`).
  - [x] **`apps/web` React 19 + Tailwind v4 + Framer Motion Scaffold**:
    - Lightning-fast Vite 6 + React 19 setup building clean bundle in 1.26s.
    - Zustand store (`useTimetableStore`) connecting `@lfps/core` models and state mutations.
    - Apple-grade Header with animated day pill (`layoutId="activeDay"`), profile login modal, and minimal UI toggle.
    - Tactile Absence Roster with horizontal smooth scrolling and 1-tap `[🟢 Available • Tap to free]` / `[⏸ Free from Sub • Tap to restore]` pills.
    - Live Substitution Register with 1-tap Auto-Resolve solver.
    - Master Routine Grid preview with sticky teacher column.
  - [x] **`apps/server` Go 1.23 High-Performance Service Skeleton**:
    - Go module initialized (`lfps/server`).
    - Handlers: `GET /api/v1/health` and `GET /api/v1/meta`.
    - WebSocket hub architecture (`ws/hub.go`) ready for live multi-staff broadcast synchronization in Phase 2.
    - Sub-millisecond execution with single static binary compilation.

### Job Bundle 20: Cloud-Ready Go Backend, WebSocket Hub, Excelize Engine & Live Client Sync (RESOLVED on `next-gen` branch)
- **Status**: 🟢 Resolved (Phase 2 Complete)
- **Scope & Solution Delivered**:
  - [x] **Production Multi-Stage Dockerfile (`apps/server/Dockerfile`)**:
    - Configured for 1-click cloud deployment on Render, Koyeb, Fly.io, or Railway with $0 hosting cost.
    - Generates tiny ~15MB scratch/alpine container with zero school computer load.
  - [x] **Thread-Safe Disk Persistence (`apps/server/internal/storage`)**:
    - Embedded file/JSON persistence engine preserving daily absences, availability toggles, substitutions, and officiating assignments across server reboots.
  - [x] **Full-Duplex WebSocket Engine (`apps/server/internal/ws`)**:
    - Upgraded via `github.com/gorilla/websocket` with ping/pong keepalives.
    - Whenever an absence is toggled or a sub assigned, a `STATE_MUTATION` broadcast packet is instantly pushed to all connected coordinator tablets and teacher phones in < 1 millisecond.
  - [x] **High-Speed Excelize Engine & Dated Backups (FEAT-25)**:
    - Built publication-ready Excel workbook generator (`internal/excel/generator.go`) using `github.com/xuri/excelize/v2` (pinned to v2.8.1 for native Go 1.23 compatibility).
    - Formats professional header banner, dark navy accents, period columns, status highlights, and Principal / Coordinator signature lines in under 20ms.
    - Automatically saves dated server backup snapshots (`data/backups/LFPS_Daily_Substitutions_YYYY-MM-DD.xlsx`) with audit logging endpoint `GET /api/v1/backups`.
  - [x] **React 19 Client Live-Sync Hook (`apps/web/src/hooks/useLiveSync.ts`)**:
    - Automatic WebSocket connection to the Go server with 3-second auto-reconnect backoff.
    - Added "Cloud Live" status indicator pill in Header.
    - Added 1-tap "Excel" export button in Header triggering instantaneous browser download from the Go backend.

### Job Bundle 24: Core Interaction Fixes, Substitutions Workstation Polish & Overview Ergonomics
- **Status**: 🟢 Resolved (v2.0.0-alpha.1)
- **Scope & Work Items**:
  - [x] **BUG-12 (Auto-Reset Substitutions When Marking Teacher Present)**:
    - In `useTimetableStore.ts`, when `toggleAbsence` marks a teacher present, automatically cleans up all substitution assignments involving that teacher (as either absent teacher or substitute).
    - Restores original baseline schedule slots and updates live coverage counters without leaving orphan substitution rows.
  - [x] **BUG-13 (Routine Grid Period Cell Gesture Freedom & Context Menu Separation)**:
    - Scoped `MicroContextMenu` listeners strictly to the sticky left teacher name cells in `RoutineGrid.tsx`.
    - Instructional period cells are completely unencumbered so touch hold-and-drag and click interactions operate without conflict.
  - [x] **BUG-14 (Staff Login Panel Off-Screen Positioning Glitch)**:
    - Created root-level `StaffLoginModal.tsx` in `App.tsx` free from header `will-change-transform` containing block traps with safe viewport boundaries and outside-click dismissal.
  - [x] **BUG-15 (Reset Purge Context Popover Alignment & Clipping Fix)**:
    - Created root-level `ResetPurgeContextMenu.tsx` in `App.tsx` with screen-space edge clamping, tactile spring animations, and outside-click dismissal.
  - [x] **BUG-16 (Smooth GPU Spring Animation for Tab Overview Collapse)**:
    - Fixed jerky accordion animation on Substitutions and Roster KPI overviews using `SPRING_TRANSITIONS.snappy`, `overflow-hidden`, and `will-change-[height,opacity]`.
  - [x] **LOGIC-01 (Away Official Classified Under 'Free from Sub')**:
    - Staff marked as `Away (Official)` are counted under the 'Free' / off-duty pool in attendance metrics and included in the 'Free' filter.
  - [x] **LOGIC-02 (Universal Dismissal on Outside Click)**:
    - All open popovers, context menus, modals, and dropdowns (Staff Login, Reset Purge, Micro Context Menu, Settings Modal) immediately close when clicking or tapping outside or pressing <kbd>Escape</kbd>.
  - [x] **LOGIC-03 (Equalized Semantic Color-Coding for All Co-Teachers' Cells)**:
    - Built `areTeachersCoTeachingPartners` and `isTeacherCoTeachingInSlot` in `@lfps/core` with cross-partner inspection so all co-teachers' cells receive identical semantic color styling and badge indicators.
  - [x] **FEAT-42 (Substitutions Tab Interactive Teacher Sub Assignment Drawer/Modal)**:
    - Uncovered teacher cards in `SubstitutionsRegister.tsx` allow 1-tap substitute assignment opening `AssignSubstituteModal.tsx` with ranked candidate substitutes from `@lfps/core`.
  - [x] **FEAT-43 (Substitutions Overview Cards Reordering & Terminology Polish)**:
    - Reordered overview KPI cards:
      - 1st Card: **Covered** with green border (`border-emerald-500/50`) and emerald badge.
      - 2nd Card: **Uncovered** with red border (`border-rose-500/60`) and rose badge.
      - 3rd Card: **"Officiating Staff"** (`border-purple-500/40`).
  - [x] **FEAT-44 (Header Overview Collapse Ergonomics: Rightmost Icon & Free-Space Tap Trigger)**:
    - Sleek rightmost-aligned Apple collapse/expand icon button (`ChevronUp` / `ChevronDown`).
    - Tapping anywhere in the free space of the workstation header toggles the collapse/expand state.

### Job Bundle 25: Tactical Matrix Ergonomics, Header Peek Navigation & Golden CT Tokens (RESOLVED on `next-gen` branch)
- **Status**: 🟢 Resolved
- **Scope & Work Items**:
  - [x] **FEAT-52 (Scroll Peek Header Utility Console)**:
    - On downward scroll, transitioned the header into a compact "peek" utility bar that grants instant access to Reset Day, Settings, and Staff Login, alongside the floating Dynamic Island Day Bar pill, while cleanly hiding full branding text (app title & subtitle).
    - Only when scrolled all the way to the top (`scrollY <= 50`) does the full elevated header console re-expand.
  - [x] **FEAT-57 (Mobile Browser URL Bar & Header Scroll Synchronization)**:
    - Eliminated the jerky "double jump" on mobile viewports (Chromium, Firefox, Opera, Safari, Edge) where the browser address bar expansion fights with custom header reveal.
    - Synchronized scroll delta thresholds with `window.visualViewport` resize listener and CSS dynamic viewport units (`100dvh`), introducing directional hysteresis so the browser bar and peek header glide in perfect lockstep.
  - [x] **FEAT-53 (Horizontal-Scroll Dynamic Teacher Column Collapse on Narrow Screens)**:
    - On mobile and narrow viewports, horizontally scrolling the routine table automatically triggers a collapsed mode for the sticky leftmost teacher name column.
    - When collapsed, the teacher column narrows (~64px) and switches to a small, thin font split cleanly over two lines (e.g. `Mrs. S.` on line 1, `Lakra` on line 2), maximizing visible instructional periods while preserving row identity.
  - [x] **FEAT-54 (Absent Teacher Routine Grid High-Contrast Crimson Highlight)**:
    - In `RoutineGrid.tsx`, when a teacher is marked absent for the day, styled their sticky first-column name cell in bold crimson red (`bg-rose-950/80 border-r-2 border-r-rose-500/80 text-rose-200 font-bold`) so absences are immediately conspicuous during morning grid reviews.
  - [x] **FEAT-55 (Hide Absent Teachers Option in Routine Matrix)**:
    - Added an interactive "Hide Absent Teachers" toggle switch in the Routine Grid controls toolbar (and Settings console).
    - When active, filters out rows of absent teachers, consolidating the matrix view strictly to active present faculty.
  - [x] **FEAT-56 (Class Teacher Golden Token Overhaul)**:
    - Updated `@lfps/ui` design tokens and component styling: Class Teachers (CT) are color-coded in vibrant **Golden / Amber** (`#f59e0b` / `text-amber-300 bg-amber-500/15 border-amber-500/40`) instead of Teal.
    - Academic Coordinators (`AC` Mrs. R. Pahwa and `AAC` Mrs. S. Lakra) strictly retain their signature **Purple / Violet** (`#8b5cf6`), even when they hold class teacher responsibilities.
  - [x] **FEAT-58 (Substitutions & Roster List/Grid View Types & Multi-Criteria Sorting)**:
    - Added tactile View Toggle (`[ ⊞ Grid ]` / `[ ☰ List ]`) to both the Substitutions Register and Staff Roster tab toolbars.
    - Added Sorting segmented selector:
      - **By Name**: Alphabetical (A-Z / Z-A).
      - **By Role**: Hierarchy rank (AC → AAC → Class Teachers → Subject Teachers).
      - **By Period**: Chronological instructional periods (for Substitutions).
  - [x] **FEAT-59 (Add to Home Screen PWA Installation & iOS Guidance)**:
    - Implemented `beforeinstallprompt` listener with an interactive "Install App / Add to Home Screen" button in Settings and header.
    - Built an Apple-style step-by-step guidance sheet (`AddToHomeScreenModal.tsx`) for iOS Safari users (Share $\to$ "Add to Home Screen").
  - [x] **FEAT-60 (Unified Preferences Persistence Engine)**:
    - Auto-persists all view preferences (active tab view type, sort orders, hidden overviews, hide absent staff toggle, minimal UI) to `localStorage`.
    - Added explicit `[ Save Preferences ]` and `[ Reset to Defaults ]` actions in Settings Modal.
  - [x] **BUG-17 (Minimal UI Mode Visual Implementation Across All Components)**:
    - Wired `isMinimalUI` store state to apply high-density compact styles across Header, Routine Grid, Substitutions Register, Absence Roster, and TabBar.
  - [x] **FEAT-45 (Settings Preference: Hide Overviews by Default)**:
    - Added user preference toggle in Settings (`hideOverviewsByDefault: boolean`) that starts the Substitutions and Roster overviews in collapsed state on application boot.

### Job Bundle 26A: Leadership Chain of Command, Dedicated CT Auto-Resolve & Attention Pulse
- **Status**: 🟢 Completed (2026-10-18)
- **Scope & Work Items**:
  - [x] **LOGIC-04 (Academic Coordinator Succession & Officiating Workflow)**:
    - Pure domain function `getEffectiveOfficiatingAC(day, absences, officiatingACMap)` implemented in `@lfps/core`.
    - Automatic chain of command: When AC (`Mrs. R. Pahwa`) is marked absent, the Assistant Academic Coordinator (`Mrs. S. Lakra`, AAC) automatically acts on her behalf as Officiating AC (`Off. AC`).
    - Only if BOTH the AC and AAC are absent does the system require appointing a 3rd-party Officiating AC (`needsAppointment: true`).
    - Surfaced dedicated Officiating AC prompt card in `SubstitutionsRegister.tsx` with 1-tap manual designation (`openOfficiatingModal({ type: 'AC' })`).
    - When appointment is needed, flashes both the **Substitutions** and **Staff Roster** navigation tabs with a soft pulsing amber glow (`attention-pulse`).
    - In `AbsenceRoster.tsx`, dynamically displays `Mrs. S. Lakra (Acting)` when AC is absent and AAC is on duty.
  - [x] **LOGIC-05 (Dedicated Class Teacher Auto-Resolve & Golden Substitution Cards)**:
    - In `SubstitutionsRegister.tsx`, added dedicated `[ ⚡ Auto-Resolve CT (X Slots) ]` button that specifically resolves uncovered slots for absent Class Teachers.
    - Rendered all Class Teacher substitution cards in both Grid and List views with an elegant golden aesthetic (`border-amber-500/60 bg-gradient-to-br from-amber-950/35 via-slate-900/95 to-amber-900/25 ring-1 ring-amber-500/40 text-amber-200`).
    - When any Class Teacher has uncovered class periods, flashes both the **Substitutions** and **Staff Roster** navigation tabs with the soft pulsing amber glow until resolved.

### Job Bundle 26: Immediate Operational Polish, Nomenclature, Roster Ergonomics & Non-Shifting UI
- **Status**: 🟢 Completed
- **Scope & Work Items**:
  - [x] **BUG-19 (Officiating AC Persistence Fix on Mark Present / Mark All Present)**:
    - In `@lfps/core` `getEffectiveOfficiatingAC`: If the primary AC is on duty (`!isAcAbsent`), `effectiveAC` strictly resolves to the primary AC (`Mrs. R. Pahwa`), ignoring any lingering manual assignments in `officiatingACMap`.
    - In `useTimetableStore.ts`: Automatically prune and reconcile `officiatingAC[day]` when AC is untoggled present or when `handleMarkAllPresent()` runs.
  - [x] **LOGIC-07 (Routine Classes View: Remove Nursery Sections)**:
    - In `RoutineGrid.tsx`, remove Nursery sections (`NUR A`, `NUR B`) from `classSections`, displaying strictly valid active classes (`KG A`, `KG B`, `PREP A`, `PREP B`).
  - [x] **TERMS-01 & TERMS-02 (Universal Nomenclature Cleanup: Eradicate 'Team' and 'Leader')**:
    - Eradicate the word "Team" entirely across UI copy, labels, tooltips, modals, and code. Teachers in a class are strictly referred to as **Class Teacher** (CT) and **2nd Teacher** (2T). Additional helpers are **"part of a class"**.
    - Eradicate the word "Leader" / "Leadership" across UI copy and code. Strictly use **"Officiating Staff"**, **"Officiating"**, **"Staff"**, or **"Teacher"**.
  - [x] **UI-01 & UI-03 (Human School Overview Headings)**:
    - Substitutions tab: Change *"Substitution Register & Coverage Engine"* $\to$ **"Substitutions Overview"** (e.g. `Substitutions Overview (MON)`).
    - Staff Roster tab: Change *"Staff Roster Matrix & Availability Register"* $\to$ **"Staff Roster Overview"** (e.g. `Staff Roster Overview (MON)`).
    - Officiating Section: Change *"Temporary Leadership Officiating Designations"* $\to$ **"Officiating Staff"**.
  - [x] **UI-05 (Non-Shifting UI for Absence Actions)**:
    - When AC or CT is marked absent, avoid layout jumps and sudden vertical content shifts.
    - Provide fixed/stable container slots or seamlessly integrated card actions so the surrounding UI remains stable without unexpected push-downs.
  - [x] **LOGIC-06, UI-02 & UI-04 (Staff Roster Card Ergonomics & Multi-Density Suite)**:
    - **Inviting & Comfortable Tap**: Whole card free space tap toggles attendance (`Mark Absent` ⟷ `Mark Present`) with enlarged, comfortable hit targets (eliminating thin, uninviting pills). Inner action buttons guard with `e.stopPropagation()`.
    - **Full Name Priority**: Always display the teacher's full name directly (`teacher.fullName`), only falling back to abbreviations on narrow/mobile screens via responsive CSS.
    - **Multi-Density View Variations**: Add clean segmented view switcher to the Roster tab to handle large staff counts (e.g. 50+ teachers):
      1. 🔲 **Comfort Grid** (Spacious cards with large icons & duty chips)
      2. ▦ **Compact Grid** (High-density cards with small icons)
      3. ☰ **Compact List** (Single-line spreadsheet-dense roster table)
      4. ☷ **Detailed List** (Multi-line list with role and duty breakdown)
    - Auto-persist view preference to `localStorage`.

### Job Bundle 27: Mobile Scroll & 100dvh Sync, Human School Roles, Roster Ergonomics & Non-Distracting Officiating Flow
- **Status**: 🟢 Completed
- **Scope & Work Items**:
  - [x] **UI-06 (Tactile Console Backlight Red Shift for Absent Teacher Cards)**:
    - Teacher cards and rows across all roster views (Normal Grid, Compact Grid, Normal List, Compact List) turn unmistakable backlit red like illuminated console buttons (`.card-absent-illuminated`, `.card-compact-absent-illuminated`, `.row-absent-illuminated`) with top radial illumination, crimson drop shadow, and bevel rim highlight, overriding `.glass-panel` background.
  - [x] **LOGIC-08 (Substitutions Page Officiating Purity: Omit Acting AC)**:
    - Never display Acting AC (`Mrs. S. Lakra (Acting)`) under "Officiating Staff" on the Substitutions tab. The Substitutions page is strictly reserved for teachers being actively assigned or needing manual assignment.
    - Omit auto-acting AC from KPI Card 3 and Section 3 so that only manually assigned Off. AC and Off. CTs appear there.
  - [x] **UI-07 (In-View 3-Pulse Amber Attention Glow for Unassigned Officiating Staff)**:
    - On Off. CT and Off. AC teacher cards, renamed the appointment button: `'Assign'` (if unappointed) and `'Reassign'` (if already appointed), replacing `'Change'`.
    - Amber glow never pulses immediately when marking a teacher absent on the card itself.
    - If the user navigates away (e.g. to Substitutions) and returns to the Staff Roster tab while Off. CT or Off. AC remains unassigned, the unassigned cards trigger strictly **3 amber attention pulses** (`.amber-look-at-me-3x`) **only when the card actually enters the viewport** via Framer Motion viewport intersection detection.
  - [x] **UI-08 (Tab Bar Inactive Alert Scoping)**:
    - Tab bar pulses amber strictly on inactive tabs: alerts on the 'Staff Roster' tab when Off. AC or Off. CT assignments are pending, and alerts on the 'Substitutions' tab when uncovered substitution slots remain. Active tabs do not pulse to prevent distraction while working.
  - [x] **PERF-02 (Mobile Header Hide/Show Reliability & Dynamic Viewport Height 100dvh Synchronization)**:
    - Eliminated the 250ms `isViewportResizing` lockout in `Header.tsx` that choked mobile scroll listeners when the browser toolbar expands/collapses.
    - Synchronized touch/drag delta thresholds (`> 20px` down for HIDDEN, `<-20px` up for PEEK, `<= 40px` for FULL) with 200ms animation lock.
    - Applied `100dvh` (Dynamic Viewport Height) across the main layout container in `App.tsx` and `index.html` so the UI naturally flexes with mobile browser address bars.
  - [x] **DATA-01 (School Department Descriptions Directive)**:
    - Per user directive (*"Do not replace with authentic school roles... Leave them be. In my school we don't have anything as such"*), preserved existing data models intact without arbitrary role substitutions.
  - [x] **UI-09 (Multi-Density Roster Labels: Normal & Compact)**:
    - Streamlined density modes to intuitive school nomenclature:
      - Grid: **Normal** (formerly Comfort Grid) & **Compact**
      - List: **Normal** (formerly Detailed List) & **Compact**
  - [x] **ARCH-01 (The Proven Architectural Strategy: Component Modularity)**:
    - Modularized the 968-line `AbsenceRoster.tsx` monolith into clean, dedicated subcomponents in `apps/web/src/components/roster/`:
      - `RosterNormalCard.tsx`
      - `RosterCompactCard.tsx`
      - `RosterNormalListRow.tsx`
      - `RosterCompactListRow.tsx`
    - Slashed `AbsenceRoster.tsx` down to ~350 lines, isolating layout concerns, reducing future token reading costs by ~70%, and eliminating regression surface area.

### Job Bundle 28: Whole-Day Officiating CT & Auto-Resolve Brain Studio
- **Status**: 🔴 Queued
- **Scope & Work Items**:
  - [ ] **BUG-18 (Officiating CT Whole-Day Assignment & Solver Alignment)**:
    - When assigned as Officiating Class Teacher (`Off. CT.`), the teacher is appointed for the entire day, not period-by-period.
    - Anchor Officiating CT appointments in `@lfps/core` and `useTimetableStore.ts` as whole-day section appointments.
    - Auto-Resolve solver prioritizes assigning the designated Off. CT across all uncovered periods of that absent CT's class.
  - [ ] **FEAT-61 (Auto-Resolve Brain Studio & Solver Policy Configuration)**:
    - In the Substitutions tab header (beside the Auto-Resolve button), add an intelligent Head-with-Brain icon (`Brain` from `lucide-react`).
    - Tapping opens the **Auto-Resolve Policy & Heuristics Studio**:
      - **Same Subject (Co-Workers)**: Priority weighting for subject teachers teaching the same curriculum.
      - **Class Teacher (CT)**: Priority weighting for primary class teachers.
      - **Second Teacher (2T)**: Priority weighting for secondary co-teachers in the class.
      - **Preferred / Defined Teachers (Principal Rule Overrides)**: Principal-defined rules (e.g. *"For Mathematics, prioritize Teacher X"*, *"For Science, prioritize Teacher Y"*).
      - **Assignment Sequence**: Order of allocation toggle (*Class Teachers First* vs. *Subject Teachers First* vs. *Fair-Share Load Balancing*).
    - Wire solver policies directly into `@lfps/core`'s `calculateCandidateAffinity` and auto-resolve engines.

### Job Bundle 29: Security RBAC, Teacher Self-Service & Universal Notification Center
- **Status**: 🟢 Completed
- **Scope & Work Items**:
  - [x] **SEC-01 (Three-Tier Role-Based Access Control Architecture: Admin, Teacher, Guest)**:
    - Strict rights segregation before drawing any logical element:
      1. **`Admin` (Full Rights)**: Can edit master routine, assign substitutions, baseline reset, purge history, configure solver policy, and appoint officiating roles.
      2. **`Teacher` (Logged-In Identity Rights)**: Can view personal duty schedule, accept/dispute their own substitutions, edit their own availability remark. Cannot modify baseline routine, reset days, or purge history.
      3. **`Guest` (Viewer Rights)**: Read-only inspection of routine matrix, substitutions register, and roster. Destructive mutations and dispute actions are suppressed.
    - Built `<PermissionGuard requiredRole={...}>` and `usePermissions()` hook checking permissions before rendering action buttons or executing mutations.
  - [x] **FEAT-49 (Teacher Substitution Acceptance & Dispute Workflow)**:
    - In `SubstitutionsRegister.tsx` (across both Grid Card and List view modes), substitution duties display interactive teacher decision controls:
      - `[ ✓ Accept ]`: Marks status as `ACCEPTED`, displays emerald confirmation badge (`✓ Accepted by [Teacher]`), and logs timestamp.
      - `[ ⚑ Dispute ]`: Summons tactile `DisputeModal.tsx` allowing staff to record dispute remarks (e.g. Lab duty, Library inventory, prior arrangement).
      - On confirm, marks status as `DISPUTED` (amber/rose callout badge with dispute remark) and dispatches real-time alert to Notification Center.
      - Coordinators receive an instant `[ Reassign ]` button on disputed cards/rows.
  - [x] **FEAT-50 (Universal Notification Center & Live Alert Hub)**:
    - Added Apple HIG Notification Bell button (`🔔`) with live reactive unread counter pill to `Header.tsx` (both desktop and mobile viewports).
    - Built `NotificationCenterDrawer.tsx`: slide-over drawer aggregating real-time operational notices:
      1. **Disputes (`⚑`)**: Alerts when staff disputes a substitution duty with 1-tap `[ Reassign Sub ]` action.
      2. **Timetable Clashes & Conflicts (`⚠️`)**: Real-time warnings when a teacher is double-booked across sections.
      3. **Uncovered Period Warnings (`🕒`)**: Alerts for pending substitution coverage.
      4. **Officiating Prompts (`🏫`)**: Reminders when AC or CT are absent and require temporary appointment.
      5. **Acceptance Receipts (`✓`)**: Notices when a teacher accepts assigned duty.
    - Provided 1-tap "Mark all as read", filter tabs (All, Unread, Actionable), clear notices, and smooth backdrop/<kbd>Esc</kbd> dismissal.
  - [x] **Routine Grid Clean Teacher Names**:
    - Eradicated golden and purple colors from teacher names in Routine Grid; strictly rendered in standard clean text (`text-slate-100` / `text-rose-100`).
  - [x] **Universal Class Teacher Recognition for Academic Coordinators**:
    - Eliminated `&& !isAC && !isAAC` exclusion across `RoutineGrid.tsx`, `SubstitutionsRegister.tsx`, and `TabBar.tsx`. Academic Coordinators who are Class Teachers (`Mrs. R. Pahwa` - PREP A, `Mrs. S. Lakra` - KG A) now show both their AC/AAC badge and CT badge with full CT auto-resolve participation.
  - [x] **Segregated Unavailable Staff in Popup Teacher Selector**:
    - Removed small accordion toggle button in `AssignSubstituteModal.tsx`. Always segregates staff into two clear sections: Available Candidates (ranked with Fit Score and `[ Assign ]`) and Unavailable / Busy Staff (dimmed with conflict reasons and `[ Override ]`).
  - [x] **Strict 1-Pulse Amber Attention Glow**:
    - Updated amber glow animation iteration count strictly to 1 in `index.css` and `RosterNormalCard.tsx`.

### Job Bundle 30: Whole-Day Off. CT Domain Alignment, Teacher Self-Service Login Scoping, Ergonomic Card Full-Name Overlays & Hierarchy Sorting
- **Status**: 🟢 Completed
- **Scope & Work Items**:
  - [x] **Whole-Day Officiating Class Teacher Domain Alignment & Precedence Clarification**:
    - Aligned domain understanding: Officiating Class Teacher (`Off. CT`) is a **whole-day class responsibility** appointed for a section (e.g. `KG A`), taking care of parent communication, child issues, attendance, and administrative duties for that class for the day.
    - Individual teaching periods of the absent CT are substituted period-by-period by subject teachers as per normal allocation rules.
    - Removed `{sub.period} • CT` period stamping across both Grid Card and List view modes in `SubstitutionsRegister.tsx`. Period substitutions are clean period slots (e.g. `G/PD`, `1st Period`, `2nd Period`) with absent CT identification.
    - Updated `calculateCandidateAffinity` in `@lfps/core` so Off. CT gets modest familiarity preference (+30 pts) without monopolizing teaching periods over subject specialists.
    - Unified engine attribution from `Auto-Resolve CT Engine` to `Auto-Resolve Engine`.
  - [x] **Teacher Self-Service Acceptance / Dispute Scoping (`FEAT-49` refinement)**:
    - Scoped `[ ✓ Accept ]` and `[ ⚑ Dispute ]` actions strictly to logged-in teachers looking at their own assigned substitutions (`loggedInTeacher && loggedInTeacher === sub.substituteTeacher`).
    - Unauthenticated front-desk coordinators and other staff see clean status pills (`Assigned`, `✓ Accepted`, `⚑ Disputed`) with administrative `[ Release Sub ]` and `[ Reassign ]` controls, completely eliminating unauthenticated dispute prompts.
  - [x] **Staff Roster Tab Bar Glow Removal**:
    - In `TabBar.tsx`, completely removed `isUrgent` and amber text from the Staff Roster tab under all conditions. Staff Roster tab text and pill strictly remain in standard typography.
  - [x] **Ordering of Teacher Names by Name and Roles (Hierarchy)**:
    - Engineered canonical 5-tier role hierarchy sorting in `@lfps/core`:
      1. Academic Coordinator (`Mrs. R. Pahwa`)
      2. Assistant Academic Coordinator (`Mrs. S. Lakra`)
      3. Class Teachers (`KG A` -> `KG B` -> `PREP A` -> `PREP B`)
      4. 2nd Teachers (`KG A` -> `KG B` -> `PREP A` -> `PREP B`)
      5. Other Staff (Activity, Hindi, Games, etc.)
      Within the same rank: class section order or alphabetical by full name.
    - Implemented `routineSortBy: 'role' | 'name'` in `useTimetableStore` with local storage persistence.
    - Added clean segmented sorting selector `[ Role | A-Z ]` to the `RoutineGrid.tsx` toolbar, and unified sorting across both `RoutineGrid.tsx` and `AbsenceRoster.tsx`.
  - [x] **Zero-Shift Full Name Overlay for Teacher Cards (Desktop Hover & Mobile Touch)**:
    - Built reusable `TeacherNameOverlay.tsx`: established static dimensions via base abbreviated name (preventing any layout reflow or UI shifts), while rendering an elevated, seamless overlay panel (`bg-slate-900/98 border border-slate-700/80 shadow-xl`) directly over the abbreviation.
    - Desktop: Instant zero-delay display on hover.
    - Mobile: Tap toggles the full name in-place with auto-dismiss on outside interaction.
    - Integrated across `RosterNormalCard.tsx`, `RosterCompactCard.tsx`, `RosterNormalListRow.tsx`, `RosterCompactListRow.tsx`, and `RoutineGrid.tsx`.
  - [x] **Off. CT Assign Pill Reordering Above Attendance Button**:
    - In `RosterNormalCard.tsx`, repositioned the Off. CT and Off. AC appointment pills directly ABOVE the mark absence/present button for immediate visibility when a teacher is marked absent.

### Job Bundle 31: Theme Engine, Restored Developer Options & Routine Drag Reordering (RESOLVED on `next-gen` branch)
- **Status**: 🟢 Resolved
- **Scope & Work Items**:
  - [x] **FEAT-46 (Complete 12-Theme Engine Adapted from THEMES.md)**:
    - Implemented CSS token engine supporting all 12 curated themes across 4 design families:
      1. ☀️ **Minimalist Light**: `system`, `light` (iOS Light), `warm-sepia` (Warm Sepia / Parchment).
      2. 🌙 **Minimalist Night**: `dark` (iOS Dark), `midnight` (Midnight OLED), `slate-nord` (Slate Nord).
      3. 🪟 **Glass Materials**: `utopian-glass`, `utopian-night`, `aero-frost`, `cyber-glass`, `retro-glass`.
      4. 🔲 **Studio & Accessibility**: `high-contrast`.
    - Integrated 1-tap visual theme swatches in `SettingsModal.tsx` with instant live preview and persistence.
  - [x] **FEAT-47 (Hidden Settings & Developer Options Restoration)**:
    - Restored hidden Developer Options panel unlocked via 5-tap easter egg on Settings version row:
      - Live Cloud Sync WebSocket connection diagnostics and latency meter.
      - Cross-Period substitution policy toggle (`samePeriodLock`, default `true`).
      - Target cell halo pulse indicator toggle (`subHaloIndicator`) and color palette selector (`Emerald`, `Neon Cyan`, `Amber`, `Violet`).
      - Acceptance countdown timer toggle and duration selector (`5s`, `10s`, `30s`, `60s`).
      - Mobile undo/redo icon style selector (`Curved`, `Circular`, `Geometric`, `Micro-Text`).
      - Live core solver heuristic weights visual display.
  - [x] **FEAT-37A & FEAT-37B (Routine Matrix Drag-and-Drop Reordering & Dedicated Class Context Menu)**:
    - Enabled intuitive drag-and-drop cell interactions in `RoutineGrid.tsx` allowing coordinators to move or swap period assignments with instant undo/redo tracking via `swapRoutineSlots`.
    - Added dedicated context menu handler in Classes View (`viewMode === 'classes'`).
  - [ ] **FEAT-22, FEAT-23, FEAT-24 (Substitution Table Sorting & Column Polish)**:
    - Clickable column headers with sorting chevrons (`▲`/`▼`) for Period, Class, Teacher, Status.

### Job Bundle 31: Unified Cloud & Google Sheets 2-Way Live Sync Engine
- **Status**: 🔴 Queued
- **Scope & Work Items**:
  - [ ] **FEAT-51A (Inbound Routine Sync from Google Sheets)**:
    - Allow desk staff to provide a standard Google Sheet sharing link or published CSV URL in Settings.
    - Automatically normalize URL to Google Sheets Visualization CSV endpoint (`/gviz/tq?tqx=out:csv&sheet=OVERVIEW`).
    - Parse RFC 4180 CSV, detect teacher/period headers, and calculate diffs against local baseline.
    - Show non-blocking diff notification in the Notification Center: "Google Sheet has 3 updated periods. [ Review & Merge ]".
  - [ ] **FEAT-51B (Outbound Daily Ledger Push to Google Sheets)**:
    - Allow 1-tap manual and automatic background broadcast to Google Sheets via Google Apps Script Web App webhook (`/exec`).
    - Appends today's substitution records (Date, Period, Class, Absent Teacher, Substitute, Status, Dispute Remark, Timestamp) into the `Daily_Ledger` sheet tab for school archiving.
  - [ ] **FEAT-48 (Production Two-Way Full-Duplex Cloud Sync Implementation)**:
    - Connect React client store with Go server WebSocket hub (`/ws`).
    - Push live state mutations (`STATE_MUTATION`) on any schedule change, absence toggle, or substitution assignment.
    - Real-time client state reconciliation and server disk persistence hydration with sub-millisecond broadcast.

### Job Bundle 28: Whole-Day Officiating CT, Auto-Resolve Brain Studio & Ergonomic Polish (RESOLVED on `next-gen` branch)
- **Status**: 🟢 Resolved
- **Scope & Work Items**:
  - [x] **BUG-18 (Officiating CT Whole-Day Assignment & Priority)**:
    - Anchored Officiating CT appointments in `@lfps/core` and `useTimetableStore.ts` as whole-day section appointments.
    - Updated `calculateCandidateAffinity` and `findAvailableSubstitutes` in `packages/core/src/solver/index.ts` to assign +250 affinity to designated Off. CT for uncovered slots in their section.
    - Integrated with `autoResolveSubstitutions` to pass `officiatingCT` and guarantee whole-day priority while respecting regular period teaching availability.
  - [x] **FEAT-61 (Auto-Resolve Brain Studio & Heuristics Tuning Modal)**:
    - Added `AutoResolvePolicyConfig` to `@lfps/core` with configurable heuristics (Same Subject, Class Teacher, Second Teacher, Workload Balance penalty, Fatigue penalty, Whole-Day Off. CT priority, and Principal Preferred Subject Overrides).
    - Created `AutoResolveBrainModal.tsx` mounted in `SubstitutionsRegister.tsx` with tactile sliders, rule editor for Principal subject preferences, and 1-tap defaults reset.
    - Connected policy persistence to `useTimetableStore` and `localStorage`.
  - [x] **Strict 3 Single Pulses for Amber Glow**:
    - Replaced dual-peak keyframe with `@keyframes singleAmberPulse` running exactly 3 single clean pulses (0% -> 50% peak -> 100% rest) when cards come into view.
  - [x] **Roster Normal Card Breathing Room & Text Cutoff Elimination**:
    - Restored comfortable dimensions (`min-h-[210px]`, `p-4 sm:p-5`, `rounded-2xl`, `w-12 h-12` avatar) for Normal Grid view.
    - Converted Off. CT and Off. AC blocks to full-width vertical stack (`flex flex-col gap-1.5 w-full`), eliminating horizontal ellipsis truncation for teachers with multiple roles (e.g. Mrs. Riya Pahwa).
  - [x] **Abbreviated Names Across All Roster Views**:
    - Standardized teacher card titles on `teacher.abbr` with full name on hover (`title={teacher.fullName}`) to prevent 2nd line wrapping.
  - [x] **Binary Header State Mode (Pill or Full)**:
    - Simplified `HeaderState` in `Header.tsx` to `'FULL' | 'PILL'`, eradicating the 44px slim peek strip for crisp, predictable mobile scrolling.

### Job Bundle 29: Routine Matrix Drag-and-Drop Reordering & Dedicated Class Context Menu
- **Status**: 🔴 Queued
- **Scope & Work Items**:
  - [ ] **FEAT-37A (Routine Grid Cell Drag & Drop Reordering)**:
    - Enable intuitive drag-and-drop cell interactions in `RoutineGrid.tsx` allowing coordinators to move or swap period assignments with instant undo/redo tracking.
  - [ ] **FEAT-37B (Dedicated Class View Context Menu)**:
    - In Classes View (`viewMode === 'classes'`), right-clicking or long-pressing provides class-specific actions (`[ Change Subject/Teacher ]`, `[ Inspect Substitutions ]`, `[ View Section Schedule ]`).
  - [ ] **FEAT-22, FEAT-23, FEAT-24 (Substitution Table Sorting & Column Polish)**:
    - Clickable column headers with sorting chevrons (`▲`/`▼`) for Period, Class, Teacher, Status.
    - Responsive desktop/mobile widths and column consolidation.

### Job Bundle 23: Interactive Settings Console, Per-Tab Undo/Redo Engine & Global Reset Controls (RESOLVED on `next-gen` branch)
- **Status**: 🟢 Resolved
- **Scope & Work Items**:
  - [x] **BUG-11 (Settings Console Modal & Mobile Navigation Parity)**:
    - Root-cause fix for broken Settings button in Header: replaced the stubbed `toggleMinimalUI` action with an Apple HIG `SettingsModal.tsx` console.
    - Added matching Settings button affordance to mobile header navigation alongside the staff profile pill.
    - Grouped iOS-style sections:
      1. **Active Staff Profile**: Login / Logout, role badge, operating permissions.
      2. **Appearance & Performance**: Minimal UI Mode toggle, 120fps GPU compositing status.
      3. **Cloud & Live Synchronization**: WebSocket connectivity status, peer count, manual sync button.
      4. **Data Management & History**: Baseline Reset, Export Excel register (`FEAT-25`), Purge Undo/Redo History.
      5. **About & Version Info**: Next-Gen v2.0-alpha.1 build metadata.
  - [x] **FEAT-40 (Per-Tab Isolated Undo/Redo Engine)**:
    - Created three isolated undo/redo history stacks in `useTimetableStore.ts`:
      1. `routineHistory`: Routine grid period assignments, moves, co-teaching allocations.
      2. `substitutionsHistory`: Substitution assignments, auto-resolve plans, removals.
      3. `rosterHistory`: Attendance absence marks, official deputations, duty statuses.
    - Ensured undo/redo operations in one tab never pollute or mutate state in another tab.
    - Global keyboard shortcuts (`⌘Z` / `Ctrl+Z` for Undo, `⌘⇧Z` / `Ctrl+Y` for Redo) dynamically dispatched to the currently active tab.
    - Added tactile, compact Undo/Redo button pairs to each tab's control toolbar with automatic disabled opacity when stacks are empty.
  - [x] **FEAT-41 (One-Tap Global Reset with Long-Press History Purge)**:
    - Added a high-visibility, safe Global Reset button (`[ ↺ Reset Day ]`) accessible from the header and settings console.
    - **Single Tap**: Resets current day modifications (substitutions, absences, custom remarks) back to master timetable baseline with undoability via `⌘Z`.
    - **500ms Long-Press (Mobile) / Right-Click (Desktop)**: Summons contextual safety popover: `[ 🗑 Purge All Undo/Redo History ]`, wiping past and future history stacks across all three tabs.

### Job Bundle 22: Routine Fullscreen Workstation Hardening & Tab Overview Collapse Controls (RESOLVED on `next-gen` branch)
- **Status**: 🟢 Resolved
- **Scope & Solution Delivered**:
  - [x] **BUG-10 (Routine Matrix Fullscreen Workstation Root View Architecture)**:
    - Root-cause fix for Expand Grid blank screen on mobile & desktop: eliminated portal-attachment clipping, flex basis collapse, and CSS transform containing block collisions.
    - Hoisted fullscreen matrix to top-level root rendering in `App.tsx` (`h-screen h-[100dvh] w-screen z-[100] bg-slate-950 flex flex-col p-2.5 sm:p-4 overflow-hidden`) with full modal access and integrated MON..SAT day navigation controls.
    - Table container uses `flex-1 min-h-0 w-full overflow-auto` with sticky headers and 120fps GPU scrolling.
  - [x] **FEAT-38 (Substitutions Tab Overview Collapsible Panel)**:
    - Provided tactile Apple HIG collapse/expand toggle button (`[ ▾ Collapse Overview ]` / `[ ▸ Show Overview ]`) in the Substitutions workstation header.
    - Animated KPI metrics strip with Framer Motion `AnimatePresence` and spring easing to reclaim vertical reading space on mobile viewports while preserving access to search/filter controls.
  - [x] **FEAT-39 (Staff Roster Tab Overview Collapsible Panel)**:
    - Provided tactile Apple HIG collapse/expand toggle button (`[ ▾ Collapse Overview ]` / `[ ▸ Show Overview ]`) in the Staff Roster workstation header.
    - Wrapped the 4-card attendance KPI strip with Framer Motion `AnimatePresence` and spring easing, reclaiming 160px+ of vertical space for the vertical staff cards.

### Job Bundle 21: Apple-Grade Fluid UI, High-Density Routine Grid & Tactile Interaction Engine (RESOLVED on `next-gen` branch)
- **Status**: 🟢 Resolved (Phase 3 Complete)
- **Scope & Solution Delivered**:
  - [x] **Dual-View High-Density Routine Matrix (`apps/web/src/components/RoutineGrid.tsx`)**:
    - **Teachers View** (`👨‍🏫`) $\longleftrightarrow$ **Classes View** (`🏫`) instantaneous toggle.
    - Sticky left column with 100% solid, fully opaque surface backing (`bg-slate-900/98`) and 2.5px solid right border with drop shadow occluding passing period cards (resolving `BUG-05` & `BUG-08`).
    - Stacked class tag and subject architecture capped to ~40px on mobile (`BUG-03`, `BUG-04`, `FEAT-04`).
    - Live cell states: Regular classes, absent highlights (`Need Sub!`), covered substitutions, and co-teaching badges.
    - Quick Fit-Grid View toggle (`⛶` Expand / Collapse) (`FEAT-09`).
  - [x] **Tactile Micro Context Menus (`apps/web/src/components/MicroContextMenu.tsx`) (FEAT-29)**:
    - Right-click (desktop) and 500ms touch long-press (mobile) summons an ultra-compact ~170px $\times$ 105px floating micro-menu with auto-clamping to screen edges.
    - Instant 1-tap `[ 🔴/🟢 Mark Absent ]` & `[ ⏸/🟢 Free from Sub ]` with zero screen clutter.
  - [x] **Hero Substitution Availability Card (`apps/web/src/components/SubAvailabilityModal.tsx`) (FEAT-34 & FEAT-35)**:
    - Hero card with inline toggle button next to teacher name: `[ 🟢 Available for Sub • Tap to free ]` $\longleftrightarrow$ `[ ⏸ Free from Sub • Tap to restore ]`.
    - Exactly 4 clean single-row duty presets: `[ 🚌 Bus Duty ]`, `[ 👥 PTM ]`, `[ 📑 Exam Duty ]`, `[ 🏢 Away (Official) ]`.
    - 1-tap preset activation sets the remark, excuses from sub, and confirms with tactile spring animation. Compact single-line custom remark input.
  - [x] **Co-Teacher Inspector Modal (`apps/web/src/components/CoTeacherModal.tsx`) (FEAT-31)**:
    - Completely removed the dangerous whole-day "Free Day" button.
    - Implemented strictly per-period release (`releaseCoTeacher(period, teacher)`), keeping all solo classes intact.
  - [x] **Officiating Leadership Modal (`apps/web/src/components/OfficiatingModal.tsx`) (BUG-09 parity)**:
    - Temporary leadership designation for Officiating Class Teacher (Off. CT) and Officiating Academic Coordinator (Off. AC) with recommended Class Team partner sorting (`★ Class Team`).

### Job Bundle 18: Away (Official) Deputation Engine & Multi-Period Selection (Phase 4)
- **Status**: 🔴 Queued (Next Up)
- [x] **FEAT-31 (Remove "Free Day" from Co-Teacher Inspector Modal)**:
  - Resolved in Job Bundle 21 via `CoTeacherModal.tsx`.
- [ ] **FEAT-32 (Away (Official) / Off-Campus Deputation Engine)**:
  - Implement full administrative multi-period deputation booking dialog with venue & purpose picker.
- [ ] **FEAT-33 (Multi-Period Click-to-Select & Drag-to-Select for Absence / Away)**:
  - Enable selecting multiple specific periods in a teacher's schedule to mark them absent or on official duty for partial days (e.g. Periods 1–3 for morning supply runs, or Periods 4–6).
  - Mode toggle pill `[✋ Move] [⬚ Select]` + Desktop `Shift+Drag` marquee + interactive period chip picker strip (`[1st] [2nd] [3rd] [4th] [5th] [6th] [All] [Morning] [Afternoon]`).
- [x] **FEAT-34 (Substitution Terminology Harmonisation)**:
  - Resolved in Job Bundle 21: standardized on `🟢 Available for Sub` $\longleftrightarrow$ `⏸ Free from Sub` with contextual hints.
- [x] **FEAT-35 (Staff Availability & Duties Modal Decluttering & Redesign)**:
  - Resolved in Job Bundle 21 via `SubAvailabilityModal.tsx`.
- [x] **FEAT-36 (Staff Hierarchy Ordering by Operational Responsibilities)**:
  - Resolved in Job Bundle 21 & Tab System: ordered staff strictly by operational hierarchy (`AC` → `AAC` → `CT` → `ST`) with dedicated vertical cards in the Staff Roster tab.
- [ ] **FEAT-37 (Routine Matrix Drag-and-Drop Cell Reordering & Dedicated Class Context Menu)**:
  - **Drag-and-Drop Cell Moves**: Enable drag-and-drop cell interactions in `RoutineGrid.tsx` to move/swap period assignments and reorder classes with full undo/redo state tracking.
  - **Dedicated Class-Section Context Menu**: In Classes View (`viewMode === 'classes'`), right-clicking or long-pressing class cells should summon class-specific context actions (e.g., Change Teacher, Inspect Sub, View Section Routine) rather than mirroring the teacher absence/availability menu.




### FEAT-12: Front Desk Ergonomics, Navigation Polish, Contextual Controls & Desktop Interaction Fixes (RESOLVED in v1.43.0)
- **Status**: 🟢 Resolved (v1.43.0)
- **Solution Delivered**:
  - [x] **Header Simplification & Tour Button Removal**:
    - Removed `#tour-btn` from `.header-controls` bar to reclaim header space across mobile and desktop.
    - Preserved direct feature tour access inside the 3-dot overflow menu (`#more-item-tour`) and within Settings ("Feature Overview & Guide").
  - [x] **Mobile Day Bar Centering**:
    - Fixed mobile layout bug where the day bar (`.day-selector`) shifted to the right of the 3-dot overflow menu.
    - Set `.header-top` to `display: contents !important` in mobile landscape with explicit flex ordering (`title-wrapper`: order 1, `day-selector`: order 2 with `margin: 0 auto`, `header-controls`: order 3), perfectly centering the day selector in the middle.
    - Enforced `margin: 0 auto 4px !important; max-width: 380px !important; justify-content: center !important;` in mobile portrait.
  - [x] **Fit-Grid Inward Collapse Icon (Eliminated "Back to Normal")**:
    - Removed text button "Back to normal".
    - Redesigned `#exit-fit-grid-btn` into a compact icon-only button with inward collapse squared corners (`M4 14h6v6`, `M20 14h-6v6`, `M4 10h6V4`, `M20 10h-6V4`) matching uniform icon dimensions.
  - [x] **iOS-Inspired Settings Screen Re-organization**:
    - Restructured Settings into 7 clean, logical iOS-style grouped sections:
      1. **Active Staff Profile**: Operating identity with automatic permission inheritance.
      2. **General & Policies**: Master Routine PIN (`••••` with Change PIN), Allow Disputes toggle, Minimize Alerts toggle, Conflict highlight toggle.
      3. **Appearance & Themes**: Interface Theme pills & dropdown, Browser Fullscreen Mode toggle.
      4. **Cloud & Synchronization**: Google Sheets Web App URL, Save URL, Push Today's Ledger, Sync Routine.
      5. **Timetable Data & Simulations**: Baseline reset, Test scenarios, Action History buffer purge.
      6. **Developer Options** (hidden behind 5-tap version Easter egg): Same-period lock, countdown timer, halo ring customizer, undo/redo button style, roster color customizer.
      7. **About & Guides**: Features tour, version info (`v1.43.0`), offline storage engine.
  - [x] **Strict Terminology Audit: Renamed `offAC` $\to$ `Off. AC`**:
    - Eradicated all user-facing instances of `offAC` across `index.html`, `app.js`, `styles.css`, tooltips, and contingency banners; standardized strictly on **Officiating AC (Off. AC)**.
  - [x] **Access Role & Identity Streamlining**:
    - Replaced the loud 4-card role grid in Settings with an elegant "Operating Identity" dropdown.
    - The app automatically inherits permissions based on the active staff profile (Admin, Coordinator for Mrs. R. Pahwa, Asst AC for Mrs. S. Lakra, Class Teacher, or Off. AC for designated teachers).
  - [x] **Compact Context Menu for Absence Tray Right-Click / Long-Press**:
    - Right-click (desktop) and 500ms long-press (mobile) on a teacher's card in the mark absence tray opens a sleek, compact iOS-style context popover with direct 1-tap toggle (`[ ⛔ Mark Unavailable Today ]` / `[ 🟢 Mark Available Today ]`) and a discreet `More duty options & remarks...` link, eliminating large modal popups for quick availability changes.
  - [x] **Absence Panel Sub-Availability Squircle Button Redesign**:
    - Redesigned `#btn-open-sub-avail-modal` into a distinctive squircle button (`.btn-squircle-edge`, `border-radius: 9px`) anchored to the top-right of the absence panel with clear call-to-action labeling (`⛔ Staff Availability`) and visible button affordance.
  - [x] **Desktop Grid Tap Bug Fix on Need-to-Sub Cells (`.cell-missing`)**:
    - Fixed desktop mouse interaction on `.cell-missing` and `.cell-covered` cells where HTML5 `draggable="true"` was suppressing native click events.
    - Added mouse position and movement distance tracking (< 6px threshold) on `mouseup` to reliably trigger `openBottomSheet(period, teacher)` on desktop mouse clicks.
    - Centered `.bottom-sheet` on desktop (`min-width: 900px`) as a clean Apple-style modal sheet (`max-width: 520px; left: 50%; transform: translateX(-50%)`) with `max-height: 82vh` and smooth scrolling.

### Job Bundle 7: Performance Engine & Keep-Warm Pre-Rendering (PERF-01)
- [ ] **Instant Offscreen Pre-rendering on Load**: Construct and composite the full Master Routine table DOM offscreen during initial page load (`requestIdleCallback`) before user scrolls down.
- [ ] **In-Memory DOM "Keep-Warm" Cache**: Keep rendered table elements alive in memory; avoid destructive `innerHTML` rebuilds on tab switches.
- [ ] **Selective Diff Patching**: When polling Google Sheets for background updates, selectively patch only cells with actual diffs (`calculateScheduleDiffs`), eliminating full-table redraw lag.

### 1. Cloud Sync Status Indicator (`☁ Live` vs `☁ Offline`)
- [ ] **Live Indicator**: Add a prominent yet elegant status badge/icon in the header/settings indicating the cloud Google Sheet is connected and syncing seamlessly (e.g., `🟢 Cloud Live` or `☁ Live` with a soft green pulse).
- [ ] **Offline Indicator**: When disconnected, no internet, or endpoint unreachable, clearly display `⚪ Sheet Offline` or `⚠ Offline Mode` with last sync timestamp.
- [ ] **Interactive Sync Details**: Tapping the status pill reveals connectivity diagnostics (endpoint URL, ping status, last successful fetch, manual re-sync button).

### 2. Teacher Roster Mobile Long-Press & Honorific Display (RESOLVED in v1.36.0)
- [x] **Mobile Long-Press for Sub-Availability**:
  - Phones cannot easily right-click. Added 500ms touch-hold listener on teacher avatars (`.teacher-avatar`) with haptic buzz feedback to open Substitution Availability modal (`#sub-avail-modal`) on mobile.
  - Suppressed standard click (absence toggle) when long-press triggers.
  - Retained desktop right-click (`contextmenu`).
- [x] **Full Honorific Display**:
  - Preserved full respectful titles and honorific prefixes (e.g., `Mrs. S. Lakra`, `Ms. N. Horo`, `Mr. S. A. Lakra`) across attendance tray and roster cards.

### 3. Undo/Redo History Reset Policy & Buffer Pruning
- [x] **Manual History Purge**: Added "Clear Action History" button (`#btn-purge-history`) in Settings under Application Info to wipe undo/redo stacks on demand (v1.36.0).
- [x] **Auto-Reset Policy Options**:
  - Automatically resets action history buffer when switching days to prevent accidental cross-day undo contamination (v1.36.0).
- [ ] **Direct Reset Button Shortcut**: Right-click (desktop) or 500ms long-press (mobile) on `#reset-day-btn` to reveal immediate option to purge undo/redo history buffer.
- [ ] **Buffer Depth Limit**: Enforce a FIFO cap (e.g. maximum 30 actions) to prevent `localStorage` bloating over time.

---

## 💡 Front-Desk High-Utility Feature Suggestions (Curated for Daily School Operations)

### Suggestion 1: One-Tap WhatsApp & Clipboard Substitution Dispatcher
- **Rationale**: Every morning, front desk staff have to manually notify 4–8 teachers of their substitution assignments.
- **Feature**: A clean "Share Routine" button generating an auto-formatted message:
  ```
  📋 *LFPS Substitution Notice — Monday, Oct 14*
  • Period 2: Mrs. R. Pahwa covering Prep A (English) for Mrs. S. Lakra
  • Period 4: Ms. N. Horo covering KG B (Math) for Mrs. M. Midha
  Please check in at Front Desk.
  ```
  Includes a 1-tap "Share via WhatsApp" (`whatsapp://send?text=...`) and "Copy Slip".

### Suggestion 2: Teacher Substitution Workload & Fair Share Meter
- **Rationale**: In real school administration, assigning the same free teacher multiple times in a week creates resentment and burnout.
- **Feature**: Display a subtle weekly load counter next to candidate names in the substitute picker (e.g. `Mrs. Pahwa (Covered: 1 this week)` vs `Ms. Horo (Covered: 4 this week)`).
- **Benefit**: Ensures equitable distribution across the staff directory.

### Suggestion 3: Morning Quick-Absence Check-In Modal
- **Rationale**: Tapping through the horizontal roster tray can be slow when 5 teachers call in sick before 8:00 AM.
- **Feature**: A rapid multi-select checklist or quick-search popover where the front desk coordinator can check off absent teachers in 10 seconds before assembly.

### Suggestion 4: Notice Board & Principal Print Layout (`@media print`)
- **Rationale**: Many schools require a printed paper slip for the staff room bulletin board and the Principal's signature desk.
- **Feature**: Clean print stylesheet formatting a compact, professional 1-page Substitution Sheet with date, absent teachers, assigned substitutes, room numbers, and signature lines.

### Suggestion 5: Emergency Uncovered Period Alert Chime / Flash
- **Rationale**: If Period 1 starts at 8:15 AM and an absent teacher's class has no substitute assigned by 8:10 AM, students are left unattended.
- **Feature**: An urgent visual pulse or audio chime (`🚨 Period 1 Starting in 5m Uncovered!`) alerting the coordinator immediately.

---

## 🔮 Future Roadmap Items

### 3. Simple Mode (Basic Manual Logic)
- [ ] Add a user-selectable **Simple Mode** toggle in Settings / Header.
- [ ] Strips away cognitive overload: hides algorithmic solver bells, complex multi-candidate split proposals, and deep administrative panels.
- [ ] Presents strictly the intuitive manual substitution logic:
  1. View absent teacher
  2. Tap/drag period cell
  3. Pick substitute from simple available list
  4. Save / confirm.

### 4. [CRITICAL CODE REVIEW] Technical Debt & Codebase Bloat Elimination
*Identified during the v1.34.0 architectural review. Flagged for a thorough future cleanup session:*
- [ ] **Remove Dead Static Arrays (250+ Lines)**:
  - `masterTimetableLog` (`app.js` lines 289–490, 200 lines): Hardcoded normalized log array that is completely unused by the active application (only exported to `window.masterTimetableLog`).
  - `subjectsCatalog` (`app.js` lines 136–186, 50 lines): Static array exported to window, never utilized by the active routine or solver engines.
- [ ] **Unified Migration Logic**:
  - `migratePeriodNames()` is run on `schedule` and `baseSchedule`, but lines in `loadStateFromStorage()` duplicate the exact same period check on `substitutions` and `displaced`. Consolidate into a single polymorphic sanitizer function.
- [ ] **Dual-Stack History Streamlining**:
  - `state.actionHistory.grid` and `state.actionHistory.subs` currently duplicate every single substitution action into both stacks. Streamline into a single tagged action log with scoped filtering to eliminate memory duplication.
- [ ] **CSS Theme Rule Consolidation**:
  - Scattered theme overrides (e.g. `[data-theme="dark"]`, `[data-theme="midnight"]` rules repeating at lines 1090, 1180, 1598, 1836, 3383 in `styles.css`) should be consolidated into unified theme-specific component stylesheets.

### 5. Complete UI Harmonisation & Simplification Overhaul (Post-Logic Maturity Milestone)
- [ ] **Objective**: Execute a comprehensive, whole-application visual harmonisation and radical simplification overhaul once all underlying operational logic, solver engines, and data pipelines are verified 100% stable and complete.
- [ ] **Key Focus Areas**:
  - **Aggressive De-Cluttering**: Strip away secondary micro-controls, wordy paragraphs, and nested borders across all tabs (Grid, Substitutions, Roster, Settings).
  - **Harmonized Design System**: Establish unified typography scale, consistent padding grids, tactile Apple/Ableton button ergonomics, and uniform corner radii.
  - **Zero Cognitive Friction**: Ensure the morning front-desk administrator can achieve full absence coverage in under 60 seconds with zero visual overwhelm.

---

## 📋 Completed Tasks (Recent)

- [x] **Next-Gen Bundle 32 (2026-10-20)**:
  - **Limbo Tray Restoration & Integration**: Restored `LimboTray.tsx` beneath the Routine Grid with fluid spring expansion (`AnimatePresence`), displaying displaced unallocated classes with original teacher/period tags, drag-to-reallocate to any grid cell, tap-to-restore with shake animation & error toast on occupied slots, and "Clear All" action.
  - **Move vs Swap Displacement Logic**: Refactored grid drag-and-drop to clean move semantics (`moveRoutineSlot`): dropping on a free cell cleanly moves the task and clears the source to `Free`; dropping on an occupied cell moves the task and displaces the existing class to the Limbo Tray without arbitrary cross-teacher swaps.
  - **Co-Teach Duplication Fix**: Fixed same-period move bug where modifying separate shallow copies of the period dictionary retained the source task and assigned it to the target, duplicating the slot and falsely triggering co-teaching detection.
  - **12-Theme Contrast & Visibility Engine**: Overrode Tailwind v4 `--color-slate-*` custom property tokens across all light and contrasting themes (`light`, `warm-sepia`, `aero-frost`, `utopian-glass`, `high-contrast`, `system-light`) so all cards, borders, text, and sticky columns immediately adapt with ultra-crisp contrast and zero illegible white-on-white text.
  - **Retro Glass Pebble Keypads**: Re-engineered `retro-glass` with authentic skeuomorphic curved glass pebble keypads inspired by vintage calculators, featuring domed gloss reflections (`inset 0 1.5px 1.5px rgba(255,255,255,0.55)`), specular mid-point inflection, bottom rim shadows, jewel-toned cell pills (aquamarine assigned, emerald covering, ruby need-sub, amber sub-active), and springy physical tactile bounce on click (`:active`).

- [x] **v1.35.0 (2026-10-14)**:
  - **BUG-01 (Limbo Tray Drag & Smart Restore with Haptic Jitter)**: Enabled direct drag-and-drop from Limbo tray across all application modes; implemented one-tap smart restoration to original teacher/period cell if free; built phone-style side-by-side error jitter animation (`@keyframes errorJitter`) with native tactile vibration (`navigator.vibrate([45, 55, 45])`) and full undo/redo integration (`restore_displaced`).
  - **BUG-02 (Instant Viewport & Silk-Scroll Optimization)**: Promoted table scroll container and sticky cells to dedicated GPU composite layers (`transform: translateZ(0)`, `contain: paint layout`); decoupled viewport calculations with width-change guards to stop mobile address-bar scrolling from triggering layout thrashing; isolated `backdrop-filter` from the scrolling element.
  - **Utopian Night Mode (`utopian-night`)**: Added dark glass refraction theme with deep obsidian/midnight-sapphire backdrop (`linear-gradient(145deg, #03070f, #0a1930)`), 28px frosted diffusion, and luminous neon-cyan edge highlights under `🪟 Glass Materials`.
- [x] **v1.34.0 (2026-10-14)**:
  - **Utopian Glass Complete Overhaul**: Full architectural Divergent upper-city transformation with multi-stop radial backdrop, crystalline top-edge sheen highlights, iridescent prismatic borders, deep frosted diffusion (`backdrop-filter: blur(28px)`), and ambient cyan reflections.
  - **Theme Taxonomy & Sub-Category Variants**: Reorganized Settings Theme selector into 3 Base Families (`🪟 Glass Materials`, `☀️ Minimalist & Paper`, `🌙 Dark Modes`) with 11 curated variants including new `❄️ Aero Frost`, `🌌 Cyber Glass`, and `🔲 High Contrast`.
  - **Desktop Zero-Scroll Layout**: Reduced vertical header and roster footprint by 100px+, giving the master routine full unobstructed above-the-fold visibility on desktop displays.
  - **Commercial Mobile Layout with 3-Dot Overflow Menu (`⋮`)**: Preserved 100% mobile feature parity while tucking secondary actions (`Reset`, `Edit Routine`, `Sub-Availability`, `Fit Grid`, `Tour`) into a sleek Apple-style glass overflow dropdown.
  - **Dynamic Viewport Engine (`computeViewportLayout`)**: Automatically measures screen geometry, assigns device datasets, and calculates table scroll container height.
- [x] **v1.33.1 (2026-10-14)**:
  - Cleaned up orphan substitutions when un-marking absence (`revertSubstitutionsForTeacher` & self-healing `cleanupOrphanSubstitutions`).
  - Implemented substitution-aware co-teaching conflict detection (`areTeachersCoTeachingPartners`).
  - Added absence guards for routine cell rendering.
- [x] **v1.33.0 (2026-10-14)**:
  - Transitioned terminology from "Collision" to "Conflict".
  - Feature: Mark teacher unavailable for substitution with interactive `?` remark popover (`#sub-avail-modal`, `.btn-sub-reason-help`).
  - Excluded unavailable teachers from substitution candidate pool & Auto-Resolve solver.
  - Harmonized master grid column dimensions.
- [x] **v1.32.1 (2026-10-14)**:
  - Fixed blue-on-blue button contrast in Cloud Conflict modal and Settings panel.
  - Retained greyed-out `👥 Co-teaching` badge for solo split coverage.


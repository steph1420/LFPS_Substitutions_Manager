# Software Architecture Specification (SAS) — LFPS Substitutions Manager v2 (Next-Gen)

> **Status:** Descriptive. This document records the system **as implemented** on branch `bundle/35` (Job Bundle 35, cut from `bundle/34a`, 2026-10-24). `next-gen` (what GitHub Pages serves) is `2.0.0-alpha.2` (Job Bundle 34); 34a and 35 are unreleased.
> Every statement was verified against the source. If another document disagrees, the code wins and the disagreement goes in [`DOC_ISSUES.md`](./DOC_ISSUES.md).
> **Version under description:** `2.0.0-alpha.2` (see [`VERSIONING.md`](./VERSIONING.md)).

> **Owner direction (2026-10-23):** **Google Sheets is the source of truth.** The Render server is a **stateless live relay** between devices, not storage. There is no server disk or database. Each browser keeps a local copy so a reload loses nothing.
>
> **Owner clarifications (2026-10-24):** in-app timetable edits are **substitutions only**. They sync to an app-owned Subs tab in Sheets and **never** to the master timetable. Editing the Master TimeTable is a separate, unscheduled future epic. Devices talk only to the relay (§2.1).

---

## 1. Purpose & Scope

LFPS Substitutions Manager is a front-desk tool for a pre-primary school. Staff use it to:

- view the master routine
- mark staff absences and "Away (Official)" deputations
- assign substitute teachers, by hand or with a scoring solver
- appoint Officiating Academic Coordinator (Off. AC) and Officiating Class Teacher (Off. CT) cover
- export the daily register to Excel

v2 replaces the legacy vanilla-JS app. That app is archived unchanged in `legacy-v1/` (v1.53.0).

## 2. System Context

```
┌──────────────────────────── Browser (PWA-style SPA) ────────────────────────────┐
│ apps/web  React 19 + Vite 6 + Tailwind v4 + Zustand + Framer Motion             │
│   ├─ @lfps/core  (pure TS domain: types, solver, disambiguation, seed data)     │
│   └─ @lfps/ui    (design tokens: springs, colour roles, glass presets)          │
└───────────────┬──────────────────────────────────────────────┬──────────────────┘
                │ REST (health, export)                         │ ONE WebSocket per tab
                ▼                                               ▼
┌──────────────────────────── apps/server (Go 1.23) ──────────────────────────────┐
│ net/http ServeMux · Gorilla WebSocket hub · LWW live store · Excelize v2        │
└──────────────────────────────────────────────────────────────────────────────────┘
          Sheets bridge (service account) ⇄ Google Sheets = source of truth
Hosting: web → GitHub Pages (root of branch `next-gen`); relay → Render.com (Docker).
Browser localStorage keeps each device's copy (reload-safe), see §6.2.
```

### 2.1 Why a relay, and the target data flow (Bundle 35)

**Why devices don't talk to Google Sheets directly** (owner, 2026-10-24):

- Reading and writing Sheets from each device is too slow for the front desk.
- The school's computers are old and aren't on 24×7, so no school machine can host the hub.

**Flow** (implemented in Bundle 35; protocol in §6.3, bridge in §7 and [`SHEETS_SETUP.md`](./SHEETS_SETUP.md)):

```
devices ──WebSocket only──▶ Render relay (live state in memory) ──async, batched,──▶ Sheets: app-owned tabs
   ▲                              │      debounced, retried                    (Subs, App_Meta, optional log)
   └──── stream of state + ◀──────┘◀── pull on startup + periodically ──── Sheets: every other tab (read-only)
         read-only tabs
```

- Devices talk **only** to the relay, over one WebSocket. They never call Google APIs.
- The relay keeps the live state in memory and fans each change out to all devices at once.
- **Writes:** the relay writes **only** to the tabs the app owns, which it creates itself. Writes are async, batched, debounced and retried, so a slow or failed Sheets call never blocks a device.
- **Reads:** every other tab is read-only information. The relay pulls those tabs at startup and periodically, and streams them to devices. Devices never write to them.
- A relay restart (deploy, spin-down) loses only what hasn't been flushed yet. Devices keep their local copy and re-send it on the next HYDRATE, and the relay re-pulls the read-only tabs. The relay does **not** read `Subs` back (§6.3 Limits).

**The owner's Sheet** (published copy, read 2026-10-24; title "subApp - CLASS AND TEACHER ROUTINES Build 4", 18 visible tabs. Through the API there are 19, including the hidden `_DB_Helper`, which the app does not read; see SHEETS_SETUP §4):

| Tab(s) | Contents (header row) | Role for the app |
|---|---|---|
| `Staff Directory` | Full Name, Teacher Abbreviation, Role, Primary Class (9 staff) | read-only |
| `Subjects List` | Base Class (KG / PREP), Subject Name, Abbreviation | read-only |
| `OVERVIEW` | "Table 1: Master Timetable" (Class, Day, Period, Subject, Teacher Abbr, Full Name, Role) and "Table 2: Subject Allocations" | read-only, best source for the routine |
| 9 per-teacher tabs (named by abbreviation) | Day × G/PD, 1st, BREAK, 2nd–4th, PLAYTIME / 2nd Golden Hour, 5th, 6th; cells are "SUBJECT\nCLASS" | read-only |
| `KG A`, `KG B`, `PREP A`, `PREP B` | printable class timetables (title block, then the grid) | read-only, for people |
| `Daily_Ledger` | Log Timestamp, School Day, Period, Absent Teacher, Assigned Substitute, Status, Dispute / Rationale Note, Assigned By | **legacy v1 log** (written by the v1 Apps Script `logSubstitutions`; test rows from 2026-10-14). **Untouched, read-only**; the app writes `Subs` instead. Migrate or retire: owner decides (SHEETS_SETUP §5) |
| `Baseline_Updates` | Commit Timestamp, School Day, Period, Teacher, Previous Task, New Task / Class Allocation, Co-Teaching Partner, Admin PIN Verified | **legacy v1 routine-edit log** (v1 `updateBaseline`). This writes to the master routine, which the new rule forbids. **Untouched, read-only** |

App-owned tabs that Bundle 35 creates (created 2026-10-24 by `sheetcheck -ensure`):

- **`Subs`**: one row per substitution, upserted by key and never deleted. Columns: Key, Date, Day, Period, Absent Teacher, Substitute, Class, Subject, Status, Note, Updated At (school time), Updated By, App Version, Revision.
- **`App_Meta`**: `schema_version`, `app_version`, `last_updated`, `last_pull`, `writer`.
- **`App_Log`** (optional, `SHEETS_LOG=1`).

> **Access.** The `2PACX-…` ID in a "Publish to web" link is **not** the spreadsheet ID and gives read-only, cached access (Google refreshes it about every 5 minutes). Writing needs the Sheets API with the real ID (the `/d/<id>/edit` part of the editor URL) and a Google **service account** that the owner adds as an editor. Its key is a Render Secret File (`/etc/secrets/sa.json`). Owner setup is done (2026-10-24); see [`SHEETS_SETUP.md`](./SHEETS_SETUP.md) and [`RENDER_SETUP.md`](./RENDER_SETUP.md).
> **Privacy.** The published copy is public to anyone with the link and includes staff names. Once the relay reads through the API, the owner may want to stop publishing.

**Hosting constraint.** On Render's free tier a web service spins down after **15 minutes** without inbound traffic (HTTP requests or WebSocket messages), and takes **about a minute** to wake on the next request ([Render docs](https://render.com/docs/free)). The owner **already runs an uptime ping bot during school hours**, so the relay stays warm while the front desk is in use and is idle (asleep) otherwise. That also keeps usage well within the 750 free instance hours per month. The app adds no keep-warm cron (PERF-03, handled externally). What the app must handle is the first request outside those hours: the client shows a **"Connecting…"** state while it keeps working from local data (Bundle 35, FEAT-66, §6.3).

## 3. Repository Topology (NPM workspaces)

| Path | Package | Role |
|---|---|---|
| `/` | `lfps-substitutions-suite` 2.0.0-alpha.2 (private) | Workspace root. It holds the scripts, and the **committed Pages build** (`index.html`, `assets/`) |
| `packages/core` | `@lfps/core` 2.0.0-alpha.2 | Pure TypeScript domain engine. ESM, built by `tsc` to `dist/`, tested with Vitest |
| `packages/ui` | `@lfps/ui` 2.0.0-alpha.2 | Design tokens (`src/tokens.ts`). Built by `tsc` to `dist/` |
| `apps/web` | `@lfps/web` 2.0.0-alpha.2 | React SPA. Vite `base: './'`, dev port 5173 |
| `apps/server` | Go module `lfps/server` (go 1.23), `internal/version` = 2.0.0-alpha.2 | Stateless REST + WebSocket relay + Excel export |
| `legacy-v1/` | — | Archived v1.53.0 (`index.html`, `app.js`, `styles.css`) |
| `_backups/` | — | Local tarball backups. Git-ignored, but 38 older tarballs are still tracked (see DOC_ISSUES) |

### 3.1 Root scripts (`package.json`)

| Script | Command | Notes |
|---|---|---|
| `dev:web` | `npm run dev --workspace=@lfps/web` | Vite dev server (run `build:libs` once first on a fresh clone) |
| `build:ui` / `build:core` | `tsc` for `@lfps/ui` / `@lfps/core` | |
| `build:libs` | `build:ui && build:core` | Order matters: core and web import `@lfps/ui` from `dist` |
| `build:web` | `build:libs`, then `tsc -b && vite build` in `@lfps/web` | Output in `apps/web/dist` only |
| `build:pages` / `build` | `build:web`, then copy `apps/web/dist/*` to the repo root | **Writes into the repo root** (Pages artefact). Use a scratch copy unless you are refreshing the committed Pages build |
| `test` | `version:check`, then `npm run test --workspaces --if-present` | `@lfps/core` (30) and `@lfps/web` (30, of which 1 runs only where the owner's passcode is configured) Vitest suites |
| `test:core` / `test:web` | one workspace | |
| `version:check` / `version:sync` | `node scripts/version.mjs` | One version across root, workspaces and the Go server |
| `admin:hash` | `node scripts/hash-admin-passcode.mjs` | Asks for a 6-digit passcode twice (hidden) and prints the SHA-256 for `VITE_ADMIN_PASSCODE_SHA256`. Refuses easy codes unless `--allow-weak` (see [`ADMIN_ACCESS.md`](./ADMIN_ACCESS.md)) |

> BUG-24 (fresh clone could not build `@lfps/ui`) is fixed by `build:libs`. Verified 2026-10-23 with `git clone` + `npm ci && npm test && npm run build` on a scratch copy.

## 4. Domain Core — `@lfps/core`

| Module | File | Responsibility |
|---|---|---|
| Types | `src/types/index.ts` | `DayOfWeek` (MON–SAT), `PeriodId`, `StaffRole`, `Teacher`, `StaffDirectory`, `DailySchedule`, `MasterSchedule`, `AbsenceType` (`FULL_DAY`/`PERIODS`/`AWAY_OFFICIAL`), `AbsenceRecord`, `SubAvailabilityStatus`, `DutyPreset`, `StaffAvailabilityRecord`, `SubstitutionStatus` (`PENDING`/`COVERED`/`FREE_FROM_SUB`/`ACCEPTED`/`DISPUTED`), `SubstitutionAssignment`, `UserRole` (`ADMIN`/`TEACHER`/`GUEST`), `AppNotification`, `OfficiatingAssignment`, `CandidateSubstitute`, `AutoResolvePolicyConfig` + `DEFAULT_AUTORESOLVE_POLICY`, `AutoResolveStrategy`, `AutoResolvePlan` |
| Solver | `src/solver/index.ts` | `KNOWN_CLASSES` (KG A/B, PREP A/B, NUR A/B), `parseCellSlot`, `extractClassSection(s)`, co-teaching helpers, `isTeacherUnavailableByAbsence`, `isTeacherFreeFromSub`, `calculateCandidateAffinity`, `findAvailableSubstitutes`, `autoResolveSubstitutions`, `getEffectiveOfficiatingAC` |
| Disambiguation | `src/disambiguation/index.ts` | `getDisambiguatedTeacherName`, `resolveTeacherById`, `findTeacher`, `compareTeachersByHierarchy`, `compareTeachersByName`, `getSortedTeachers` |
| Calendar | `src/calendar/index.ts` | `SCHOOL_TIME_ZONE` (`Asia/Kolkata`), `schoolDateFor(now, tz)`, `SCHOOL_DAYS`, `toISODate`, `parseISODate`, `isISODate`, `addDaysISO`, `weekdayOfISO`, `activeWeekStart` (Sunday → next Monday), `dateForSchoolDay`, `schoolWeekDates`, `schoolDayForDate`, `daysBetweenISO`. "Today", the week switch and midnight follow the **school's** zone, not the device's (§6.4) |
| Seed data | `src/data/seed.ts` | `DEFAULT_PERIODS` (G/PD, 1st, BREAK, 2nd–6th), `PRIMARY_AC`, `ASSISTANT_AC`, `SUBJECT_FULL_NAMES`, `DEFAULT_STAFF_DIRECTORY` (9 staff), `DEFAULT_MASTER_SCHEDULE` (MON–SAT) |

### 4.1 Candidate scoring (`calculateCandidateAffinity`)

The base score is 100. These terms are then added:

| Term | Amount |
|---|---|
| Designated Off. CT familiarity | **+30**, when `prioritizeOfficiatingCT` is on |
| Principal preferred-subject override | +80 |
| Same subject | `sameSubjectWeight` (default 40) |
| Class Teacher of the section | `classTeacherWeight` (35) |
| 2nd Teacher in the department | `secondTeacherWeight` (30) |
| Same department | +15 |
| Workload | `-(existingSubs × workloadBalancingWeight)`, floored at −40 |
| Sandwiched-period fatigue | `-consecutiveFatiguePenalty` (15) |

The total is clamped at a minimum of 0. Absent or Away staff, staff who are "Free from Sub", and staff with conflicting teaching are returned as unavailable, with a reason.

### 4.2 Academic Coordinator succession (LOGIC-04)

`getEffectiveOfficiatingAC`:

1. If the AC (`Mrs. R. Pahwa`) is present, she is the AC.
2. If the AC is absent and the AAC (`Mrs. S. Lakra`) is present, the AAC acts as AC.
3. If both are absent, the manually appointed Off. AC is used.
4. Otherwise there is no AC.

### 4.3 Tests

`packages/core/test/solver.test.ts` contains **19 Vitest tests** in 6 suites, and `test/calendar.test.ts` adds **11** (30 total), including the IST rollover cases:

| Suite | Tests |
|---|---|
| Cell parsing | 5 |
| Disambiguation | 2 |
| Absence/Away | 2 |
| Candidate solver | 2 |
| Auto-resolve | 3 |
| AC succession | 5 |

The web app has its own Vitest suite (`apps/web/test`, jsdom): persistence 11, store reload 5 (incl. IST midnight whatever the device zone), admin access 19 (one checks the owner's configured passcode and is skipped where it isn't set). The Go server has 19 `go test` tests across schooltz, storage, handlers, router and the WS hub, run with `-race`. The web and core suites were also run under `TZ=UTC`, `America/Los_Angeles` and `Pacific/Kiritimati`.

## 5. Design Tokens — `@lfps/ui`

`src/tokens.ts` exports three things.

**`SPRING_TRANSITIONS`**

| Name | Stiffness / damping / mass |
|---|---|
| snappy | 450 / 32 / 0.8 |
| bouncy | 320 / 24 / 1 |
| smooth | 260 / 28 / 1.2 |

It also includes `cssCubic`.

**`COLOR_ROLES`**

| Role | Colour |
|---|---|
| classTeacher | `#f59e0b` amber (FEAT-56) |
| subjectTeacher | `#007aff` |
| coordinator | `#8b5cf6` |
| absent | `#ff3b30` |
| awayOfficial | `#475569` |
| availableForSub | `#10b981` |
| freeFromSub | `#f59e0b` |

**`GLASS_PRESETS.utopian`**

> Note: `classTeacher` and `freeFromSub` share the same base colour.

## 6. Web Client — `apps/web`

### 6.1 Composition

- `App.tsx` mounts every modal and overlay at the **root of the tree**. That includes:
  - `MicroContextMenu`, `ResetPurgeContextMenu`, `StaffLoginModal`, `AssignSubstituteModal`
  - `SubAvailabilityModal`, `CoTeacherModal`, `OfficiatingModal`, `SettingsModal`
  - `DisputeModal`, `NotificationCenterDrawer`, `AwayOfficialModal`
- In fit-grid fullscreen mode, `App.tsx` returns a separate root tree (BUG-10).
- There are three tabs (`routine`, `substitutions`, `roster`), served by `RoutineGrid`, `SubstitutionsRegister` and `AbsenceRoster` (plus `components/roster/*`). Navigation is through `TabBar`.

### 6.2 State — `store/useTimetableStore.ts` (Zustand)

The store is a single `create<TimetableState>()` store of about 1,440 lines. It holds:

- schedule and base schedule, absences, availability, substitutions, displaced ("limbo") cells
- officiating AC/CT, notifications, login/role (RBAC), auto-resolve policy
- 12 `ThemeId`s, view and sort preferences

**Undo/redo:** each tab has its own history (`routineHistory`, `substitutionsHistory`, `rosterHistory`), with past and future stacks capped at **30 snapshots**. Shortcuts are bound in `App.tsx`: ⌘Z/Ctrl+Z for undo, ⌘⇧Z/Ctrl+Y for redo.

**Persistence (Job Bundle 34, `store/persistence.ts`):**

| Key | Contents |
|---|---|
| `lfps_user_preferences_v2` | theme, view, sort and UI preferences (unchanged). The developer-mode flag is stored here but the console only opens with an admin session |
| `lfps_autoresolve_policy_v2` | solver policy (unchanged) |
| `lfps_operational_state` | schema v1 document: `days[YYYY-MM-DD]` (absences, availability, substitutions incl. Accepted/Disputed, displaced cells, Off. AC, Off. CT, routine-edit overrides vs `DEFAULT_MASTER_SCHEDULE`), `weeks[weekStart]` (availability), `history` (active week, last 10 per tab), `notifications` (14 days, max 100) |
| `lfps_operational_state_backup_<ts>` | written once if the stored document is corrupt or from a newer schema, before it is replaced |

- The store maps MON–SAT to the dates of the **active school week** (Sunday → the coming week) and opens on today's weekday.
- Writes are debounced (250 ms) and flushed on `pagehide` / tab hidden. A focus check plus a 60 s timer handle midnight / week rollover. Other tabs on the same device apply changes through the `storage` event.
- Days older than 42 days are pruned. In-app routine edits are **date-scoped substitutions**: they change that date only, sync to the `Subs` tab (Bundle 35) and **never** change the master timetable. The master routine comes read-only from Sheets; editing it is a separate future epic (TODO EPIC-01).
- Transient UI (modals, menus, drag state) is not saved. The synced part of the day state is shared between devices through the relay (§6.3).
- The legacy v1 app used `lfps_frontdesk_state`; it is not migrated.

**Roles and access (Job Bundles 34 and 34a; `lib/adminGate.ts`, `lib/access.ts`, `@lfps/core` `access`; [`ADMIN_ACCESS.md`](./ADMIN_ACCESS.md)):**

- **Access model.** One pure function, `resolveAccess(state)` in `lib/access.ts`, decides access from `adminIdentity`, `loggedInTeacher`, `directory`, `absences`, `officiatingAC` and `editingOverride`, for the current date in the school time zone. It returns `{ role, isAdmin, office, canEdit, editingUnlocked }`. The store keeps a derived `access` copy up to date (a store subscription re-runs it after every change), which `usePermissions()` / `PermissionGuard` read; the store's own guards call `resolveAccess()` directly. Every admin-gated action and screen uses `canEdit`.
- **Hierarchy.** `@lfps/core` `adminOfficeFor()` returns the admin office an identity holds on a day: `PRINCIPAL` (designation login `"Principal"`, or a directory entry with role `'Principal'`), `AC` and `AAC` (by directory role), or `OFF_AC` (the effective Officiating AC is a manual appointment of this person on that day, LOGIC-04). Anyone else is identification only. The school data names no Principal, so the Principal logs in by designation, outside the teacher directory.
- **Login.** `role` is `GUEST` (Front Desk) with nobody logged in, `TEACHER` for an identity without an office, `ADMIN` for an office holder who entered the passcode. `login(identity)` refuses office holders (`needsPasscode`); Staff Login then shows the keypad (`AdminPasscodeStep`, `PasscodeField`: six dots over one numeric input, submits on the sixth digit). `loginWithPasscode(identity, code)` compares SHA-256(code) with the build-time `VITE_ADMIN_PASSCODE_SHA256` (constant-time compare). The admin session lives in `sessionStorage` (`lfps_admin_session_v2`, `{hash, identity}`): changing the hash logs everyone out, and it counts only while that identity is logged in and holds an office today. Logout or picking another name ends it. Settings → Admin Access shows status only (no second keypad).
- **Dev override.** Developer Options → "Edit without login" sets `localStorage` `lfps_dev_editing_unlocked_v1`. It is device-local and not in the persisted day state or the relay. It makes `canEdit` true with nobody logged in, and the header shows an "Editing unlocked" badge. Turning it on needs `canEdit`; anyone can turn it off. When `canEdit` becomes false, Developer Options close.
- Lockout per device in `localStorage` (`lfps_admin_lockout_v1`), surviving reloads: 4 free misses, then 30 s, 1 min, 5 min, 15 min, then 1 h per further miss; reset on success or after 24 h without misses. Input that isn't six digits isn't counted.
- **The 6-digit space (10⁶) can be searched offline from the public hash in under a second**, so this protects against accidents only.
- Admin-only: routine edits (drag, swap, limbo restore, period task), solver policy, Reset Day, history purge, developer mode. Guarded in the store **and** hidden in the UI (`PermissionGuard`). Everyone can mark attendance, assign substitutes and appoint Off. AC / Off. CT.
- This is **client-side only** (a determined user can bypass it). Server-side enforcement is SEC-02.

### 6.3 Live sync — `src/sync/*` (Bundle 35)

**One socket per tab.**
- `sync/live.ts` owns a ref-counted singleton. `<App>` starts it (`useEffect(() => startLiveSync(), [])`). A release waits 1 s before closing, so a React StrictMode remount reuses the socket.
- `hooks/useLiveSync.ts` is now **read-only**: Header and SettingsModal read `useSyncStatus` and no longer open sockets of their own. This fixes the double socket.
- The socket URL is `${VITE_WS_URL}/api/v1/ws`, default `ws://localhost:8080`.

**What syncs (`sync/entities.ts`).** The store fields `schedule` (date-scoped overrides only, diffed against the master), `absences`, `availabilities`, `substitutions`, `displaced`, `officiatingAC` and `officiatingCT` for the **active school week**. They're split into entities with string keys. Each part is `encodeURIComponent`'d:

| Key | Value |
|---|---|
| `abs\|<date>\|<teacher>` | the absence record (without derived `day`/`date`) |
| `sub\|<date>\|<id>` | the substitution |
| `avail\|<weekStart>\|<teacher>` | weekly availability |
| `oac\|<date>` | Off. AC appointment |
| `oct\|<date>\|<class>` | Off. CT appointment |
| `sched\|<date>\|<period>\|<teacher>` | one routine override cell |
| `limbo\|<date>` | the displaced (limbo) list |

Each entity travels as `{k, v, ts, by, rev?}`; `v: null` is a deletion (tombstone). Undo/redo stacks, UI state, the admin session and the dev override never sync.

**Protocol (JSON `{type, payload}` over the socket):**

| Direction | Message | Payload |
|---|---|---|
| → | `HELLO` | `{deviceId, appVersion}` |
| ← | `HYDRATE` | `{weekStart, rev, entities, mode, sheets?}`, the relay's whole week |
| → | `STATE_MUTATION` | `{batchId, changes}` (client batches ≤ 500 entities **and** ≤ 128 KiB, `takeBatch`; relay limits: 2000 entities, 256 KiB per frame) |
| ← | `MUTATION_ACK` | `{batchId, entities, rejected:[{k, reason}]}`: the stored version of every change (ours, or a newer one that won) |
| ← | `STATE_MUTATION` | `{changes, rev, from}`, accepted changes from other devices (never echoed to the sender) |
| ← | `CONNECT_ACK`, `PRESENCE` | `{clients}` |
| ← | `SHEETS_SNAPSHOT` | `{fetchedAt, hash, tabs:[{name, rows}], hiddenTabs}` (sheets mode only) |
| ← | `ERROR` | `{reason, batchId?}` |

**Conflicts: last writer wins (LWW).**
- The higher `(ts, by)` wins: timestamp first, then device id as a deterministic tie-break.
- The relay clamps timestamps more than 2 min ahead of its clock. When the client sees its own value come back with the clamped time, it adopts that version.
- The unit of conflict is **one entity**. Two desks editing different teachers or periods never conflict. Two desks editing the same cell: the later edit wins everywhere, and the earlier one is overwritten without a prompt.

**Client engine (`sync/engine.ts`, `sync/client.ts`).**
- **Per-tab meta.** The meta (`{weekStart, known, outbox}`) lives in **`sessionStorage` `lfps_sync_v1`**, so it survives reloads and each tab is its own peer.
  - The device id is `d-<browser id (localStorage lfps_device_id)>.<tab id (sessionStorage lfps_tab_id)>`.
  - A localStorage meta shared across tabs was rejected: one tab could overwrite another tab's view of what the relay has.
- **First run** (new tab, or a new week): every local entity gets `ts = 1`, so anything the relay already holds wins. Local-only data is still published.
- **Local edits.** 150 ms after a store change, the engine diffs the slice against `known`, stamps changed entities with `Date.now()` and this device id, and puts them in the **outbox** (persisted with the meta).
  - The outbox is sent when live. It is resent on reconnect, or after 15 s without an ACK.
  - Entries leave the outbox when ACKed or `rejected`.
- **Remote changes.**
  - A pending local diff is flushed first.
  - Then newer versions are applied to the store. `known` is updated before `setState`, so there's no echo.
  - Older versions are ignored, and ours is queued again. Applying a remote change doesn't touch the undo history.
- **HYDRATE** applies everything newer and **re-publishes** whatever the relay lacks or holds an older version of. This refills a relay that restarted empty.
- **Phases** (`sync/status.ts`, header pill `data-testid="sync-pill"`, Settings card `sync-card`):
  - **Connecting…** (amber, pulsing) from socket start until `HYDRATE`. This is FEAT-66: a sleeping Render relay takes about a minute, and the app stays fully usable from local data meanwhile.
  - **Live** (green) after HYDRATE.
  - **Offline** (grey) when the browser reports no network, or after 3+ failed attempts in a row that span the 90 s wake window (a Render cold start takes ~1 min, which stays Connecting…). A timer re-checks exactly when the window ends.
  - Backoff is 1 s·2ⁿ, capped at 30 s, ±20 % jitter. Reconnect happens at once on `online` and when the window regains focus. "Reconnect" in Settings forces it.
- **Week rollover.** At Sunday 00:00 (school zone) the engine resets for the new week and sends HELLO again. The relay drops the old week the same way.

**Relay side.**
- `internal/livesync` is the LWW store. It validates kinds, dates in the active week, and sizes (key ≤ 512 B, value ≤ 64 KiB, ≤ 20 000 entities).
- `internal/relay` handles messages. `internal/ws` is the hub (per-client send queue; slow clients are dropped).

**Limits (documented, accepted for alpha):**
- **Tombstones are memory-only.** If the relay restarts and a device that missed a deletion reconnects, the deleted item can come back (that device re-publishes it). Re-delete it once. They're short-lived because the week resets.
- The relay keeps **no history**. Sheets `Subs` is the durable record, but the relay doesn't read it back on start (SHEETS_SETUP §6).
- Pulled Sheet tabs reach devices (`SHEETS_SNAPSHOT`) and are summarised in Settings, but they don't yet replace the built-in directory or routine (FEAT-62 part 3).
- No auth on the socket (SEC-02). Origins are allowlisted.
- Closing a tab drops its meta. The browser's local data stays, and the next tab re-publishes it under the first-run rule.

**Removed (Bundle 35):**
- REST `POST /absence/toggle`, `/availability`, `/substitutions/assign`, `DELETE /substitutions`, and the unused `pushAbsence`/`pushSubstitution` client helpers. Edits go over the socket.
- The old fixed 3 s reconnect loop and the "Offline while asleep" behaviour.

### 6.4 School time zone

All calendar logic uses `SCHOOL_TIME_ZONE = 'Asia/Kolkata'` from `@lfps/core`, whatever the device's own zone is. That covers "today", the date keys in `lfps_operational_state`, the Sunday 00:00 week switch, the midnight rollover check, the pruning window, the Excel file name and the times shown in Settings and the notification drawer. `schoolDateFor()` uses `Intl.DateTimeFormat` (every supported browser ships IANA zone data) and falls back to the device date only if the zone is unknown. The server uses the same zone (§7), so client and relay agree on the day.

### 6.5 Configuration

`apps/web/.env` is committed. It defines `VITE_API_URL` and `VITE_WS_URL`, both public endpoint URLs read by Vite at build time. `VITE_ADMIN_PASSCODE_SHA256` belongs in the git-ignored `apps/web/.env.local` (or a CI variable), never in the committed `.env`.

**Build info:** `vite.config.ts` defines `__APP_VERSION__` (root `package.json`), `__GIT_COMMIT__` (short hash, `-dirty` if tracked files changed), `__GIT_BRANCH__` and `__BUILD_TIME__`; CI may override with `GIT_COMMIT` / `GIT_BRANCH`. `lib/buildInfo.ts` exposes them; the header shows the version and the footer shows `v<version> · <commit> · <branch>` above the tab bar.

## 7. Server — `apps/server` (Go)

| Concern | Implementation |
|---|---|
| Entry | `cmd/api/main.go` (`newRouter`, `http.Server` with a 10 s header timeout). Env vars: `PORT` (default 8080), `ALLOWED_ORIGINS` (comma list, `*` = any), the optional zone overrides below, and the Sheets bridge's `SHEETS_SPREADSHEET_ID`, `GOOGLE_APPLICATION_CREDENTIALS`, `SHEETS_PULL_INTERVAL` (≥ 1m, default 5m), `SHEETS_LOG` (`1` = App_Log). `DATA_DIR` is ignored (logged). Missing Sheets config → **relay-only** mode, logged with the reason (`readSheetsEnv`) |
| Time zone | `internal/schooltz`: the school zone is **`Asia/Kolkata` by default, in code**. `APP_TZ`, then `TZ`, override it (a leading `:` is accepted). `Local`, empty or unknown names fall back to the default with a log warning. Zone data is **embedded** (`import _ "time/tzdata"`), so it works on any image. The store reads the clock in this zone, so "today" and the Sunday-midnight week switch match the web client. **No Render setting is needed** |
| Routing | `internal/handlers` on Go 1.22+ `http.ServeMux` method patterns, wrapped in the `CORS` middleware (`cors.go`): allowlisted origins are echoed, preflights get 204, disallowed browser origins get 403, requests without `Origin` (curl, health checks) pass |
| Live store | `internal/livesync`: `NewStore(loc)`, **in-memory only**. A last-writer-wins entity map for the active school week (§6.3), with a revision counter; it resets when the week changes. `DailyState()` derives the classic week view (for `/state` and Excel); `Substitutions()` feeds the Sheets bridge. A restart starts empty by design (devices refill it; Sheets is the durable record). `internal/storage` now holds only the shared `DailyState` types |
| Relay | `internal/relay`: HELLO → HYDRATE, STATE_MUTATION → merge → MUTATION_ACK to the sender + broadcast of accepted changes to the others, PRESENCE, SHEETS_SNAPSHOT fan-out; notifies the bridge after each accepted batch. `Mode()` = `sheets` / `relay-only` |
| Sheets bridge | `internal/sheets`: `guard` allowlist (only `Subs`, `App_Meta`, `App_Log` writable), `Pull` (visible non-app tabs, hidden skipped), `EnsureTabs`, `Flush` (upsert `Subs` by key; debounced 2 s, max 15 s; backoff to 5 min), `WriteMeta`. `google.go` is the only Google API code. `cmd/sheetcheck` verifies setup ([`SHEETS_SETUP.md`](./SHEETS_SETUP.md)). The spreadsheet ID is never in Go |
| Realtime | `internal/ws/hub.go`: register/unregister/broadcast/send-to-one/send-to-all-but-one; slow clients are dropped (BUG-26). `CheckOrigin` uses the same allowlist. Inbound messages are decoded and passed to the relay handler (read limit 256 KiB per message, which is why clients cap a batch at 128 KiB; 60 s pong deadline; ping every 25 s) |
| Excel | `internal/excel/generator.go` (Excelize v2.8.1): `GenerateSubstitutionWorkbook`, streamed by `/export/excel`; nothing is written to disk |
| Limits | Request bodies ≤ 1 MiB (413) |
| Version | `internal/version.Version`, kept in sync by `scripts/version.mjs` |
| Auth | **None** (SEC-02) |

### 7.1 HTTP API (`/api/v1`)

| Method | Path | Behaviour |
|---|---|---|
| GET, HEAD | `/health` | Status, `version` (from `internal/version`), `timestamp` (school zone), `uptimeSec`, `timeZone`, **`mode`** (`sheets` / `relay-only`) and, in sheets mode, **`sheets`** (`starting` / `ok` / `error`). This is the target for Render's health check and the owner's uptime pinger, so it stays **cheap**: no store lock, no I/O, no Sheets call, and no `Origin` header needed |
| GET | `/meta` | Static metadata: 9 staff, periods, days |
| GET | `/state` | `DailyState` derived from the live entities (diagnostics) |
| GET | `/export/excel` | `.xlsx` download |
| GET | `/ws` | WebSocket upgrade: the live sync protocol (§6.3) |
| GET | `/{$}` | Root banner |

Preflight `OPTIONS` requests are answered by the CORS middleware for every route. `GET /backups` was removed in Job Bundle 34 (BUG-27). The REST mutation routes were removed in Bundle 35; edits travel over the WebSocket.

### 7.2 Cross-language model drift

The Go `DailyState`/`SubstitutionAssignment` structs are hand-maintained copies of the TS types and are not generated from them. Job Bundle 34 brought them to parity for substitutions (`ACCEPTED`, `disputeRemark`, `acceptedAt`, `disputedAt`, optional `substituteTeacher`). Since Bundle 35 the relay stores synced values as opaque JSON entities, so only the derived `DailyState`/`Subs` views read their fields. Keep the two in sync manually until code generation exists.

## 8. Build & Deployment

- **Web:** `npm run build` writes `apps/web/dist` and copies it into the repo root. The root `index.html` and `assets/` are committed on `next-gen`, and GitHub Pages serves that branch root at `https://steph1420.github.io/LFPS_Substitutions_Manager/`. See ADR-0004.
- **Server:** `apps/server/Dockerfile` is a multi-stage build, from `golang:1.23-alpine` to `alpine:3.20`, with CA certificates only (zone data is embedded in the binary), no data directory, and port 8080. No time-zone variable is needed. To override the zone or set `ALLOWED_ORIGINS`, use Render Dashboard → the service → **Environment** (left pane) → Environment Variables → **+ Add Environment Variable**, then "Save and deploy". These settings are not under the service's **Settings** page. It deploys on Render at `https://lfps-substitutions-manager.onrender.com`. The health check is `/api/v1/health`.
- **`render.yaml`** (Bundle 35) codifies the service: Docker, branch `next-gen`, `healthCheckPath`, **`autoDeployTrigger: checksPass`** (deploy only after `.github/workflows/ci.yml` passes), env var names, and the spreadsheet ID as a plain value. The key is a Render Secret File. The existing hand-made service must be switched to "After CI Checks Pass" or linked to the Blueprint. See [`RENDER_SETUP.md`](./RENDER_SETUP.md).
- **Ops: uptime pinger (BUG-31).** The owner's cron-job.org job keeps the relay warm in school hours (PERF-03).
  - During the v2.0.0-alpha.2 deploy (2026-10-24) it reported "Failed (output too large)". The likely cause: while Render redeployed or cold-started, Render answered with its own large HTML page instead of our ~150-byte JSON. cron-job.org reads at most 64 KB and gives up after 30 s ([FAQ](https://cron-job.org/en/faq/)).
  - Pinger setting: request method **HEAD** on `/api/v1/health` (cron-job.org → job → Edit → Advanced → Request method), so only the status code counts and no body is read. Response saving was already off on the owner's job, so HEAD is the fix.
  - Expect isolated failures during deploys or after a sleep (Render wakes in about a minute). Status: monitor, and reopen if it recurs outside a deploy.
- **Known build characteristics** (verified 2026-10-23):
  - The Vite bundle is about 635 kB of JS (it triggers the >500 kB chunk warning) and about 106 kB of CSS.
  - The build is reproducible. A rebuild produced assets byte-identical to the committed ones.

## 9. Quality Attributes & Known Gaps

| Attribute | Status |
|---|---|
| Correctness of domain logic | 30 core unit tests (solver + calendar incl. IST) |
| UI/Server tests | Web: 55 Vitest tests (persistence, reload, access, sync entities/engine/client with a fake relay, one-socket singleton). Server: Go tests under `-race` (LWW store, relay, hub, Sheets allowlist and bridge with a fake API, env config). No browser E2E in the repo (Bundle 35 verified two-browser sync with a scratch Playwright run) |
| Multi-user consistency | Live sync through the relay, per-entity last-writer-wins (§6.3). Tombstones are memory-only (a deletion can reappear after a relay restart) |
| Security | Client-side admin passcode gate (SEC-01 interim). CORS / WS origin allowlist. No server auth (SEC-02) |
| Durability | Per device: `localStorage` survives reloads and restarts. Shared live through the relay; substitutions are written to Sheets `Subs` (sheets mode). The relay is intentionally stateless and doesn't read `Subs` back |
| Performance | PERF-01 (client keep-warm pre-render of the routine grid) is open. The JS chunk is over 500 kB. Relay cold start (Render free tier, ~1 min): kept warm in school hours by the owner's external uptime pinger (PERF-03); the client shows "Connecting…" meanwhile (FEAT-66) |
| Supply chain | `npm audit` reports 3 vulnerabilities (1 moderate, 2 critical) through Vitest 3.x. Fixing them needs Vitest 4 |

## 10. Related Decisions

See [`DECISIONS/`](./DECISIONS/):

- ADR-0001: Monorepo with a TS core and a Go server
- ADR-0002: Zustand with per-tab undo stacks
- ADR-0003: Root-mounted modals
- ADR-0004: GitHub Pages from the root of `next-gen`

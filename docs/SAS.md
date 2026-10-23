# Software Architecture Specification (SAS) — LFPS Substitutions Manager v2 (Next-Gen)

> **Status:** Descriptive. This document records the system **as implemented** on branch `bundle/34` (Job Bundle 34, 2026-10-23), built on `next-gen` @ `19c1a1a`. `next-gen` itself (what GitHub Pages serves) is still `2.0.0-alpha.1` until the owner merges.
> Every statement was verified against the source. If another document disagrees, the code wins and the disagreement goes in [`DOC_ISSUES.md`](./DOC_ISSUES.md).
> **Version under description:** `2.0.0-alpha.2` (see [`VERSIONING.md`](./VERSIONING.md)).

> **Owner direction (2026-10-23):** **Google Sheets is the source of truth.** The Render server is a **stateless live relay** between devices, not storage. There is no server disk or database. Each browser keeps a local copy so a reload loses nothing.

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
                │ REST (fetch)                                  │ WebSocket
                ▼                                               ▼
┌──────────────────────────── apps/server (Go 1.23) ──────────────────────────────┐
│ net/http ServeMux · Gorilla WebSocket hub · Excelize v2 · in-memory week state  │
└──────────────────────────────────────────────────────────────────────────────────┘
          (Bundle 35) Sheets bridge ⇄ Google Sheets = source of truth
Hosting: web → GitHub Pages (root of branch `next-gen`); relay → Render.com (Docker).
Browser localStorage keeps each device's copy (reload-safe), see §6.2.
```

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
| `test` | `version:check`, then `npm run test --workspaces --if-present` | `@lfps/core` (26) and `@lfps/web` (24) Vitest suites |
| `test:core` / `test:web` | one workspace | |
| `version:check` / `version:sync` | `node scripts/version.mjs` | One version across root, workspaces and the Go server |
| `admin:hash` | `node scripts/hash-admin-passcode.mjs` | Prints the SHA-256 for `VITE_ADMIN_PASSCODE_SHA256` (see [`ADMIN_ACCESS.md`](./ADMIN_ACCESS.md)) |

> BUG-24 (fresh clone could not build `@lfps/ui`) is fixed by `build:libs`. Verified 2026-10-23 with `git clone` + `npm ci && npm test && npm run build` on a scratch copy.

## 4. Domain Core — `@lfps/core`

| Module | File | Responsibility |
|---|---|---|
| Types | `src/types/index.ts` | `DayOfWeek` (MON–SAT), `PeriodId`, `StaffRole`, `Teacher`, `StaffDirectory`, `DailySchedule`, `MasterSchedule`, `AbsenceType` (`FULL_DAY`/`PERIODS`/`AWAY_OFFICIAL`), `AbsenceRecord`, `SubAvailabilityStatus`, `DutyPreset`, `StaffAvailabilityRecord`, `SubstitutionStatus` (`PENDING`/`COVERED`/`FREE_FROM_SUB`/`ACCEPTED`/`DISPUTED`), `SubstitutionAssignment`, `UserRole` (`ADMIN`/`TEACHER`/`GUEST`), `AppNotification`, `OfficiatingAssignment`, `CandidateSubstitute`, `AutoResolvePolicyConfig` + `DEFAULT_AUTORESOLVE_POLICY`, `AutoResolveStrategy`, `AutoResolvePlan` |
| Solver | `src/solver/index.ts` | `KNOWN_CLASSES` (KG A/B, PREP A/B, NUR A/B), `parseCellSlot`, `extractClassSection(s)`, co-teaching helpers, `isTeacherUnavailableByAbsence`, `isTeacherFreeFromSub`, `calculateCandidateAffinity`, `findAvailableSubstitutes`, `autoResolveSubstitutions`, `getEffectiveOfficiatingAC` |
| Disambiguation | `src/disambiguation/index.ts` | `getDisambiguatedTeacherName`, `resolveTeacherById`, `findTeacher`, `compareTeachersByHierarchy`, `compareTeachersByName`, `getSortedTeachers` |
| Calendar | `src/calendar/index.ts` | `SCHOOL_DAYS`, `toISODate`, `parseISODate`, `isISODate`, `addDaysISO`, `activeWeekStart` (Sunday → next Monday), `dateForSchoolDay`, `schoolWeekDates`, `schoolDayForDate`, `daysBetweenISO`. Used for date-scoped persistence |
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

`packages/core/test/solver.test.ts` contains **19 Vitest tests** in 6 suites, and `test/calendar.test.ts` adds **7** (26 total):

| Suite | Tests |
|---|---|
| Cell parsing | 5 |
| Disambiguation | 2 |
| Absence/Away | 2 |
| Candidate solver | 2 |
| Auto-resolve | 3 |
| AC succession | 5 |

The web app has its own Vitest suite (`apps/web/test`, jsdom): persistence 11, store reload 4, admin access 9. The Go server has `go test` suites for storage, handlers, router and the WS hub, run with `-race`.

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
- Days older than 42 days are pruned. Routine edits are **date-scoped**; permanent routine changes are meant to come from Google Sheets (Bundle 35).
- Transient UI (modals, menus, drag state) is not saved. Nothing is shared between devices yet (§6.3).
- The legacy v1 app used `lfps_frontdesk_state`; it is not migrated.

**Roles and access (Job Bundle 34, `lib/adminGate.ts`, [`ADMIN_ACCESS.md`](./ADMIN_ACCESS.md)):**

- `operatingRole` starts as `GUEST` (Front Desk) unless the tab holds an admin session. Staff Login sets `TEACHER` (identity only). Logout ends the admin session and returns to `GUEST`.
- `unlockAdmin(passcode)` compares SHA-256(passcode) with the build-time `VITE_ADMIN_PASSCODE_SHA256` (constant-time compare). The session lives in `sessionStorage` (`lfps_admin_session_v1`) and stores the hash, so changing the hash logs everyone out. 5 failures → 30 s cooldown.
- Admin-only: routine edits (drag, swap, limbo restore, period task), solver policy, Reset Day, history purge, developer mode. Guarded in the store **and** hidden in the UI (`PermissionGuard`). Everyone can mark attendance, assign substitutes and appoint Off. AC / Off. CT.
- This is **client-side only** (a determined user can bypass it). Server-side enforcement is SEC-02.

### 6.3 Live sync — `hooks/useLiveSync.ts`

- Connects to `${VITE_WS_URL}/api/v1/ws`. The default is `ws://localhost:8080`, and the client reconnects 3 s after a close.
- `CONNECT_ACK` updates the connected-client count.
- `STATE_MUTATION` updates `lastSyncTime` only. **Its payload is not applied to the store.**
- `pushAbsence` and `pushSubstitution` (REST POST) exist but **nothing calls them**. Only `downloadExcel` is used (from Header and SettingsModal).
- **Net effect:** multi-device sync is not wired. FEAT-48 is still queued; it is scheduled for **Bundle 35** (relay sync + Google Sheets bridge, FEAT-62 part 2).

### 6.4 Configuration

`apps/web/.env` is committed. It defines `VITE_API_URL` and `VITE_WS_URL`, both public endpoint URLs read by Vite at build time. `VITE_ADMIN_PASSCODE_SHA256` belongs in the git-ignored `apps/web/.env.local` (or a CI variable), never in the committed `.env`.

**Build info:** `vite.config.ts` defines `__APP_VERSION__` (root `package.json`), `__GIT_COMMIT__` (short hash, `-dirty` if tracked files changed), `__GIT_BRANCH__` and `__BUILD_TIME__`; CI may override with `GIT_COMMIT` / `GIT_BRANCH`. `lib/buildInfo.ts` exposes them; the header shows the version and the footer shows `v<version> · <commit> · <branch>` above the tab bar.

## 7. Server — `apps/server` (Go)

| Concern | Implementation |
|---|---|
| Entry | `cmd/api/main.go` (`newRouter`, `http.Server` with a 10 s header timeout). Env vars: `PORT` (default 8080), `TZ` (school time zone; decides "today" and the week rollover; the image includes `tzdata`), `ALLOWED_ORIGINS` (comma list, `*` = any). `DATA_DIR` is ignored (logged) |
| Routing | `internal/handlers` on Go 1.22+ `http.ServeMux` method patterns, wrapped in the `CORS` middleware (`cors.go`): allowlisted origins are echoed, preflights get 204, disallowed browser origins get 403, requests without `Origin` (curl, health checks) pass |
| Storage | `internal/storage`: **in-memory only** (`sync.Mutex`). State belongs to the active school week and resets when the week changes; `date`, `selectedDay` and `weekStart` are computed per request. Reads, responses and broadcasts use `DailyState.Clone()` deep copies. Invalid input returns `ErrValidation` → 400. A restart starts empty by design (Sheets is the source of truth) |
| Realtime | `internal/ws/hub.go`: register/unregister/broadcast; slow clients are dropped under the write lock (BUG-26). `CheckOrigin` uses the same allowlist. The read pump still **discards inbound messages** (read limit 256 KiB, 60 s pong deadline, ping every 25 s); client → relay messages arrive in Bundle 35 |
| Excel | `internal/excel/generator.go` (Excelize v2.8.1): `GenerateSubstitutionWorkbook`, streamed by `/export/excel`; nothing is written to disk |
| Limits | Request bodies ≤ 1 MiB (413) |
| Version | `internal/version.Version`, kept in sync by `scripts/version.mjs` |
| Auth | **None** (SEC-02) |

### 7.1 HTTP API (`/api/v1`)

| Method | Path | Behaviour |
|---|---|---|
| GET | `/health` | Status, `version` (from `internal/version`), timestamp, uptime |
| GET | `/meta` | Static metadata: 9 staff, periods, days |
| GET | `/state` | Current `DailyState` |
| POST | `/absence/toggle` | Mutates state, then broadcasts `STATE_MUTATION` (full state) |
| POST | `/availability` | Mutates state, then broadcasts |
| POST | `/substitutions/assign` | Mutates state, then broadcasts |
| DELETE | `/substitutions?id=` | Mutates state, then broadcasts |
| GET | `/export/excel` | `.xlsx` download |
| GET | `/ws` | WebSocket upgrade |
| GET | `/{$}` | Root banner |

Preflight `OPTIONS` requests are answered by the CORS middleware for every route. `GET /backups` was removed in Job Bundle 34 (BUG-27).

### 7.2 Cross-language model drift

The Go `DailyState`/`SubstitutionAssignment` structs are hand-maintained copies of the TS types and are not generated from them. Job Bundle 34 brought them to parity for substitutions (`ACCEPTED`, `disputeRemark`, `acceptedAt`, `disputedAt`, optional `substituteTeacher`). Displaced cells, officiating and routine overrides are not modelled on the server yet (Bundle 35). Keep the two in sync manually until code generation exists.

## 8. Build & Deployment

- **Web:** `npm run build` writes `apps/web/dist` and copies it into the repo root. The root `index.html` and `assets/` are committed on `next-gen`, and GitHub Pages serves that branch root at `https://steph1420.github.io/LFPS_Substitutions_Manager/`. See ADR-0004.
- **Server:** `apps/server/Dockerfile` is a multi-stage build, from `golang:1.23-alpine` to `alpine:3.20`, with `tzdata`, no data directory, and port 8080. Set `TZ` (and `ALLOWED_ORIGINS` if needed) in Render. It deploys on Render at `https://lfps-substitutions-manager.onrender.com`. The health check is `/api/v1/health`.
- **Known build characteristics** (verified 2026-10-23):
  - The Vite bundle is about 635 kB of JS (it triggers the >500 kB chunk warning) and about 106 kB of CSS.
  - The build is reproducible. A rebuild produced assets byte-identical to the committed ones.

## 9. Quality Attributes & Known Gaps

| Attribute | Status |
|---|---|
| Correctness of domain logic | 26 core unit tests (solver + calendar) |
| UI/Server tests | Web: 24 Vitest tests (persistence, reload, access). Server: Go tests under `-race`. No browser E2E in the repo (Bundle 34 verified reload and footer with a scratch Playwright run) |
| Multi-user consistency | Not implemented; sync is not wired (§6.3). Bundle 35 |
| Security | Client-side admin passcode gate (SEC-01 interim). CORS / WS origin allowlist. No server auth (SEC-02) |
| Durability | Per device: `localStorage` survives reloads and restarts. Not shared across devices or browsers until the Sheets bridge (Bundle 35). The relay is intentionally stateless |
| Performance | PERF-01 (keep-warm pre-render) is open. The JS chunk is over 500 kB |
| Supply chain | `npm audit` reports 3 vulnerabilities (1 moderate, 2 critical) through Vitest 3.x. Fixing them needs Vitest 4 |

## 10. Related Decisions

See [`DECISIONS/`](./DECISIONS/):

- ADR-0001: Monorepo with a TS core and a Go server
- ADR-0002: Zustand with per-tab undo stacks
- ADR-0003: Root-mounted modals
- ADR-0004: GitHub Pages from the root of `next-gen`

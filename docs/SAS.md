# Software Architecture Specification (SAS) — LFPS Substitutions Manager v2 (Next-Gen)

> **Status:** Descriptive. This document records the system **as implemented** on `next-gen` at commit `19c1a1a` (2026-10-23).
> I verified every statement against the source. If another document disagrees, the code wins and the disagreement goes in [`DOC_ISSUES.md`](./DOC_ISSUES.md).
> **Version under description:** `2.0.0-alpha.1` (see [`VERSIONING.md`](./VERSIONING.md)).

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
│ net/http ServeMux · Gorilla WebSocket hub · Excelize v2 · JSON file storage     │
└──────────────────────────────────────────────────────────────────────────────────┘
Hosting: web → GitHub Pages (root of branch `next-gen`); server → Render.com (Docker).
```

## 3. Repository Topology (NPM workspaces)

| Path | Package | Role |
|---|---|---|
| `/` | `lfps-substitutions-suite` 2.0.0-alpha.1 (private) | Workspace root. It holds the scripts, and the **committed Pages build** (`index.html`, `assets/`) |
| `packages/core` | `@lfps/core` 2.0.0-alpha.1 | Pure TypeScript domain engine. ESM, built by `tsc` to `dist/`, tested with Vitest |
| `packages/ui` | `@lfps/ui` 2.0.0-alpha.1 | Design tokens (`src/tokens.ts`). Built by `tsc` to `dist/` |
| `apps/web` | `@lfps/web` 2.0.0-alpha.1 | React SPA. Vite `base: './'`, dev port 5173 |
| `apps/server` | Go module `lfps/server` (go 1.23) | REST + WebSocket + Excel service |
| `legacy-v1/` | — | Archived v1.53.0 (`index.html`, `app.js`, `styles.css`) |
| `_backups/` | — | Local tarball backups. Git-ignored, but 38 older tarballs are still tracked (see DOC_ISSUES) |

### 3.1 Root scripts (`package.json`)

| Script | Command | Notes |
|---|---|---|
| `dev:web` | `npm run dev --workspace=@lfps/web` | Vite dev server |
| `build:core` | `npm run build --workspace=@lfps/core` | Builds **core only**. It does **not** build `@lfps/ui` |
| `build:web` | `npm run build --workspace=@lfps/web` | `tsc -b && vite build` |
| `build` / `build:pages` | `build:core && build:web` then copy `apps/web/dist/*` to the repo root | **Writes into the repo root** (Pages artefact) |
| `test` | `npm run test --workspaces --if-present` | Only `@lfps/core` defines `test` (`vitest run`) |
| `test:core` | `npm run test --workspace=@lfps/core` | |

> ⚠️ On a fresh clone, `build:web` (and therefore `build`) fails with `TS2307: Cannot find module '@lfps/ui'`. The cause is that `packages/ui/dist` is not built by any root script. Workaround: run `npm run build --workspace=@lfps/ui` first. See [`../BUGS.md`](../BUGS.md) notes and DOC_ISSUES.

## 4. Domain Core — `@lfps/core`

| Module | File | Responsibility |
|---|---|---|
| Types | `src/types/index.ts` | `DayOfWeek` (MON–SAT), `PeriodId`, `StaffRole`, `Teacher`, `StaffDirectory`, `DailySchedule`, `MasterSchedule`, `AbsenceType` (`FULL_DAY`/`PERIODS`/`AWAY_OFFICIAL`), `AbsenceRecord`, `SubAvailabilityStatus`, `DutyPreset`, `StaffAvailabilityRecord`, `SubstitutionStatus` (`PENDING`/`COVERED`/`FREE_FROM_SUB`/`ACCEPTED`/`DISPUTED`), `SubstitutionAssignment`, `UserRole` (`ADMIN`/`TEACHER`/`GUEST`), `AppNotification`, `OfficiatingAssignment`, `CandidateSubstitute`, `AutoResolvePolicyConfig` + `DEFAULT_AUTORESOLVE_POLICY`, `AutoResolveStrategy`, `AutoResolvePlan` |
| Solver | `src/solver/index.ts` | `KNOWN_CLASSES` (KG A/B, PREP A/B, NUR A/B), `parseCellSlot`, `extractClassSection(s)`, co-teaching helpers, `isTeacherUnavailableByAbsence`, `isTeacherFreeFromSub`, `calculateCandidateAffinity`, `findAvailableSubstitutes`, `autoResolveSubstitutions`, `getEffectiveOfficiatingAC` |
| Disambiguation | `src/disambiguation/index.ts` | `getDisambiguatedTeacherName`, `resolveTeacherById`, `findTeacher`, `compareTeachersByHierarchy`, `compareTeachersByName`, `getSortedTeachers` |
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

`packages/core/test/solver.test.ts` contains **19 Vitest tests** in 6 suites:

| Suite | Tests |
|---|---|
| Cell parsing | 5 |
| Disambiguation | 2 |
| Absence/Away | 2 |
| Candidate solver | 2 |
| Auto-resolve | 3 |
| AC succession | 5 |

The web app and the Go server have no automated tests.

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

**Persistence:** only preferences go to `localStorage` (`lfps_user_preferences_v2`, plus the auto-resolve policy). Operational data (absences, substitutions, officiating) lives in memory, so a reload starts again from the seed baseline.

**RBAC:** `PermissionGuard` / `usePermissions` hide actions according to `operatingRole`. This is **client-side only**.

### 6.3 Live sync — `hooks/useLiveSync.ts`

- Connects to `${VITE_WS_URL}/api/v1/ws`. The default is `ws://localhost:8080`, and the client reconnects 3 s after a close.
- `CONNECT_ACK` updates the connected-client count.
- `STATE_MUTATION` updates `lastSyncTime` only. **Its payload is not applied to the store.**
- `pushAbsence` and `pushSubstitution` (REST POST) exist but **nothing calls them**. Only `downloadExcel` is used (from Header and SettingsModal).
- **Net effect:** multi-device sync is not wired. FEAT-48 is still queued.

### 6.4 Configuration

`apps/web/.env` is committed. It defines `VITE_API_URL` and `VITE_WS_URL`, both public endpoint URLs read by Vite at build time.

## 7. Server — `apps/server` (Go)

| Concern | Implementation |
|---|---|
| Entry | `cmd/api/main.go`. Env vars: `PORT` (default 8080), `DATA_DIR` (default `data`) |
| Routing | `internal/handlers` (`api.go`, `health.go`, `meta.go`) on Go 1.22+ `http.ServeMux` method patterns. Permissive CORS middleware (`*`) |
| Storage | `internal/storage`: an in-memory `DailyState` guarded by an RWMutex, persisted to `${DATA_DIR}/current_state.json`. Persist errors are ignored (`_ = s.persistLocked()`). Backups go under `${DATA_DIR}/backups` |
| Realtime | `internal/ws/hub.go`: a hub with register/unregister/broadcast. The client read pump **discards inbound messages** (read limit 512 B, 60 s pong deadline, ping every 25 s). `CheckOrigin` accepts every origin |
| Excel | `internal/excel/generator.go` (Excelize v2.8.1) |
| Auth | **None** |

### 7.1 HTTP API (`/api/v1`)

| Method | Path | Behaviour |
|---|---|---|
| GET | `/health` | Status plus a hard-coded version `2.0.0-alpha.1` |
| GET | `/meta` | Static metadata: 9 staff, periods, days |
| GET | `/state` | Current `DailyState` |
| POST | `/absence/toggle` | Mutates state, then broadcasts `STATE_MUTATION` (full state) |
| POST | `/availability` | Mutates state, then broadcasts |
| POST | `/substitutions/assign` | Mutates state, then broadcasts |
| DELETE | `/substitutions?id=` | Mutates state, then broadcasts |
| GET | `/export/excel` | `.xlsx` download |
| GET | `/backups` | Lists backups. The `download` URLs it returns point to an **unregistered** route |
| GET | `/ws` | WebSocket upgrade |
| GET | `/{$}` | Root banner |

All mutating routes also answer OPTIONS.

### 7.2 Cross-language model drift

The Go `DailyState`/`SubstitutionAssignment` structs are hand-maintained copies of the TS types and are not generated from them. Today the Go struct has no `disputeRemark`/`acceptedAt`/`disputedAt` fields, and its status comment omits `ACCEPTED`. Keep the two in sync manually until code generation exists.

## 8. Build & Deployment

- **Web:** `npm run build` writes `apps/web/dist` and copies it into the repo root. The root `index.html` and `assets/` are committed on `next-gen`, and GitHub Pages serves that branch root at `https://steph1420.github.io/LFPS_Substitutions_Manager/`. See ADR-0004.
- **Server:** `apps/server/Dockerfile` is a multi-stage build, from `golang:1.23-alpine` to `alpine:3.20`, with `DATA_DIR=/app/data` and port 8080. It deploys on Render at `https://lfps-substitutions-manager.onrender.com`. The health check is `/api/v1/health`.
- **Known build characteristics** (verified 2026-10-23):
  - The Vite bundle is about 635 kB of JS (it triggers the >500 kB chunk warning) and about 106 kB of CSS.
  - The build is reproducible. A rebuild produced assets byte-identical to the committed ones.

## 9. Quality Attributes & Known Gaps

| Attribute | Status |
|---|---|
| Correctness of domain logic | Covered by 19 core unit tests |
| UI/Server tests | None |
| Multi-user consistency | Not implemented; sync is not wired (§6.3) |
| Security | Client-only RBAC. Open CORS and WS origin. No server auth |
| Durability | Server persists to a JSON file but ignores write errors. Client does not persist operational data |
| Performance | PERF-01 (keep-warm pre-render) is open. The JS chunk is over 500 kB |
| Supply chain | `npm audit` reports 3 vulnerabilities (1 moderate, 2 critical) through Vitest 3.x. Fixing them needs Vitest 4 |

## 10. Related Decisions

See [`DECISIONS/`](./DECISIONS/):

- ADR-0001: Monorepo with a TS core and a Go server
- ADR-0002: Zustand with per-tab undo stacks
- ADR-0003: Root-mounted modals
- ADR-0004: GitHub Pages from the root of `next-gen`

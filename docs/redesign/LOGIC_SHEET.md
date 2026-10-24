# Logic Sheet — LFPS Substitutions Manager

> **Bundle 42 / split** — product & domain logic only.  
> **Companion:** [`MOCKUPS_GUIDE.md`](./MOCKUPS_GUIDE.md) (screens + clean-slate mockup plan).  
> **Status:** Source of truth for redesign *behaviour*. Inventory from code + verified docs on `next-gen` (Bundle 41a lineage + Bundle 42).  
> **Audience:** Owner Steve (steph1420) and Lippy.  
> **Ground truth:** If this sheet disagrees with running code, **code wins** — file a `DOC_ISSUES` entry and update this sheet. Prefer [`docs/SAS.md`](../SAS.md) for architecture depth.

---

## Table of contents

1. [How to use this file](#1-how-to-use-this-file)
2. [Product purpose in one paragraph](#2-product-purpose-in-one-paragraph)
3. [Domain logic (LOG-xx)](#3-domain-logic-log-xx)
4. [Access, roles, and gates (LOG-A)](#4-access-roles-and-gates-log-a)
5. [Persistence and sync (LOG-P / LOG-S)](#5-persistence-and-sync-log-p--log-s)
6. [Sheets source-of-truth rules (LOG-SH)](#6-sheets-source-of-truth-rules-log-sh)
7. [Modals and overlays (logic inventory)](#7-modals-and-overlays-logic-inventory)
8. [Preferences and device-local UI](#8-preferences-and-device-local-ui)
9. [Parked / deferred items that affect design later](#9-parked--deferred-items-that-affect-design-later)
10. [Non-goals — infrastructure vs UX](#10-non-goals--infrastructure-vs-ux)
11. [Cross-check checklist](#11-cross-check-checklist)
12. [Gaps / unverified from code](#12-gaps--unverified-from-code)
13. [Related documents](#13-related-documents)

---

## 1. How to use this file

### 1.1 Redesign stance (owner direction, 2026-10-24)

1. **Preserve product logic** unless Steve explicitly changes a rule in this sheet.
2. Visual redesign and mockup images live in [`MOCKUPS_GUIDE.md`](./MOCKUPS_GUIDE.md) — start from a **clean mind**; do not copy current chrome.
3. Themes (especially light theme polish) are **parked** — do not block logic decisions on theme tokens.
4. First deliverable was the combined Bundle 42 doc; this file is the **logic half** after the split.

### 1.2 ID scheme

| Prefix | Meaning |
|---|---|
| **LOG-D** | Domain / school day / staff / absences / subs / officiating |
| **LOG-A** | Access / roles / passcodes |
| **LOG-P** | Client persistence |
| **LOG-S** | Live sync / relay |
| **LOG-SH** | Google Sheets bridge |
| **MOD-** | Modal / overlay (see also mockups guide) |
| **PREF-** | Persisted preference |
| **PARK-** | Parked design-affecting item |
| **SCR-** | Screen IDs — defined in the mockups guide |

---

## 2. Product purpose in one paragraph

LFPS Substitutions Manager is a **front-desk tool for a pre-primary school**. Staff (often as anonymous **Front Desk / Guest**) mark who is absent or Away Official, see which teaching slots **Need Sub**, assign substitutes (hand or Auto-Resolve), appoint **Off. AC** / **Off. CT**, and keep a daily register that survives reload and syncs across devices. The **owner's Google Sheet** is the source of truth for staff directory and master routine (read-only to the app); the app writes only its own **Subs** / **App_Meta** tabs. The Render server is a **stateless live relay**, not a database. Hosting: GitHub Pages (`next-gen`) + Render relay.

---

---

## 3. Domain logic (LOG-xx)

### LOG-D01 — School calendar & weekday model

| Rule | Detail | Code / docs |
|---|---|---|
| School days | **MON–SAT** (`DayOfWeek`). No Sunday teaching UI. | `@lfps/core` `SCHOOL_DAYS` |
| School time zone | **`Asia/Kolkata`**. "Today", midnight rollover, week switch use school clock, not device TZ. | `calendar/index.ts`, SAS §6.4 |
| Active school week | Monday–Saturday week containing today. On **Sunday**, active week = **upcoming** Mon–Sat (plan ahead). | `activeWeekStart`, `dateForSchoolDay` |
| Date keys | Operational state keyed by **ISO dates** `YYYY-MM-DD` for each weekday slot. | `lfps_operational_state` |
| Periods (default seed) | G/PD, 1st, BREAK, 2nd, 3rd, 4th, 5th, 6th (+ PLAYTIME / 2ND GOLDEN HOUR in types / Sheet grids). BREAK is non-instructional. | `DEFAULT_PERIODS` |
| Day load modes | **Follow school day** (default): snap selected day to school-today on load + tab visibility. **Free pick**: remember last MON–SAT on device. | FEAT-70, `devUiPrefs.dayLoadMode` |

### LOG-D02 — Staff directory & roles

| StaffRole (domain) | Typical use |
|---|---|
| `Principal` | Admin office; usually **designation login** (no directory row today) |
| `Class Teacher / Academic Coordinator` | AC (e.g. Mrs. R. Pahwa) |
| `Class Teacher / Asst. Academic Coordinator` | AAC (e.g. Mrs. S. Lakra) |
| `Class Teacher` | Section CT |
| `2nd Teacher` / `3rd Teacher` | Subject / support |
| `Admin` | Generic admin role string (rare) |

Additional teacher fields: `id`, `fullName`, `abbr`, `primaryClass`, `department`, `assignedSubjectPool`, `periodsTaught`, `initials`.

**Known classes:** `KG A`, `KG B`, `PREP A`, `PREP B`, `NUR A`, `NUR B` (`KNOWN_CLASSES`).

**Seed vs Sheet:** Bundled seed ships 9 staff + default master schedule. When Sheets mode applies a snapshot, directory/routine come from Sheet with precedence (LOG-SH02).

### LOG-D03 — Cell / slot semantics (Routine Matrix)

| Cell content | Meaning |
|---|---|
| `Free` | Teacher free that period (no teaching duty) |
| `-` | Break / non-teaching marker (Sheet BREAK column maps here) |
| `SUBJECT CLASS` / multi-section forms | Teaching assignment; may be co-teaching (`+`) |
| Empty after mapping | Treated carefully; unreadable Sheet cells keep bundled value + report |

**Views:** Teachers × Periods (default) or Classes × Periods (`viewMode`).

**Cell states users care about in redesign:**

- Free
- Assigned teaching (subject + class)
- Covered by substitute (halo / indicator prefs)
- Need Sub (absent/away teacher still has teaching task, no covered sub)
- Limbo / displaced (dragged off grid)

### LOG-D04 — Absence model

| `AbsenceType` | Meaning | Substitution needed? |
|---|---|---|
| `FULL_DAY` | Marked absent for the day | Yes, for all instructional teaching slots |
| `PERIODS` | Partial-day absence | Yes, for listed periods |
| `AWAY_OFFICIAL` | Legally present / on duty, off campus (supplies, invitations, etc.) | Yes for selected periods; **not** counted as "Absent" in roster Absent filter |

Fields: `teacherId`, `teacherName`, `day`, optional `date`, `periods?`, `reason?`, `venue?`, `markedAt`, `markedBy?`.

**Present** = not absent and not Away Official (for roster Present filter).

**Mark All Present** (selected day): clears that day's absences and related day substitutions (store action); resets auto-filter Absent when that Dev Option is on (FIND-11).

### LOG-D05 — Availability ("Available for Sub" vs "Free from Sub")

| Status | Meaning |
|---|---|
| `AVAILABLE` (`isAvailable: true`) | Can be proposed / assigned as substitute |
| `FREE_FROM_SUB` (`isAvailable: false`) | Must not be used as sub (duty / personal / Away overlap) |

Duty presets: `BUS_DUTY`, `PTM`, `EXAM_DUTY`, `AWAY_OFFICIAL`. Optional remark.

Away Official teachers are treated as unavailable for sub duty in solver scoring.

### LOG-D06 — Substitutions register

| `SubstitutionStatus` | Meaning |
|---|---|
| `PENDING` | Assigned, awaiting teacher accept (when logged in) |
| `COVERED` | Covered assignment |
| `FREE_FROM_SUB` | Slot marked free-from-sub path |
| `ACCEPTED` | Teacher accepted |
| `DISPUTED` | Teacher disputed (+ `disputeRemark`) |

Core fields: `id`, `day`, `period`, `originalTeacher`, `substituteTeacher?`, `className`, `subject`, `status`, timestamps, `assignedBy?`.

**Uncovered ("Need Sub") rule (product):** For selected day, each instructional task of an absent/away teacher that is not Free/`-` and has no covering substitution → uncovered slot. Substitutions tab KPIs: Covered count, Uncovered Needs, Off. CT / Off. AC status chips.

**Filters (SCR-SUB):** `all` | `uncovered` | `covered` | `my` (logged-in teacher's own duties).

**Sort:** name | role | period (persisted preference).

**View:** grid | list.

**Phone densify (Bundle 40):** Uncovered duties **grouped by absent teacher** with compact Assign rows.

**Who can assign:** Front Desk / Guest / Teacher / Admin — all day roles (not admin-gated).

**Teacher self-service:** Logged-in teacher can **accept** / **dispute** **their own** assignments (FEAT-49).

### LOG-D07 — Candidate scoring & Auto-Resolve (solver)

Base score **100**, then adjustments (`calculateCandidateAffinity`):

| Term | Default effect |
|---|---|
| Off. CT familiarity | **+30** if `prioritizeOfficiatingCT` |
| Principal preferred-subject override | +80 |
| Same subject | `sameSubjectWeight` (40) |
| Class Teacher of section | `classTeacherWeight` (35) |
| 2nd Teacher | `secondTeacherWeight` (30) |
| Same department | +15 |
| Workload | `-(existingSubs × workloadBalancingWeight)`, floor −40 |
| Consecutive fatigue | `-consecutiveFatiguePenalty` (15) |

Unavailable candidates: absent / Away / Free from Sub / conflicting teaching — returned with reason.

**Auto-Resolve** (`autoResolveSubstitutions`): multi-period plan without double-booking; strategies include SUBJECT_MATCH, BALANCED_LOAD, MINIMAL_SPLITS, BRAIN_POLICY. Policy editable in Brain / Auto-Resolve Studio (**admin-gated** for policy changes). UI copy: "Auto-Resolve" (not "Brain Studio" in user titles — Bundle 39).

### LOG-D08 — Officiating (Off. AC / Off. CT)

#### Off. AC succession (LOGIC-04 / `getEffectiveOfficiatingAC`)

1. If AC present → AC is effective AC.
2. Else if AAC present → AAC acts as AC (`isAutoOfficiating`).
3. Else if manual Off. AC appointed → that person (`isManuallyAssigned`).
4. Else → no AC (`needsAppointment`).

**Admin implication:** Manually appointed Off. AC for today holds admin office `OFF_AC` only while appointment is in force (school day).

#### Off. CT

Per **section / class** for the day (`officiatingCT[day][class]`). Appoint from Roster / Substitutions overview. Whole-day Off. CT can be prioritized across section periods when policy flag is on (BUG-18 / policy).

Anyone (Front Desk+) may appoint Off. AC / Off. CT.

### LOG-D09 — Limbo / displaced cells (routine edit)

Admin (or Edit-without-login) may drag routine cells; displaced items land in **Limbo tray**. Restore / clear limbo admin-gated. Limbo list syncs as entity `limbo|<date>`.

### LOG-D10 — Routine edits vs master timetable (critical)

| What | Allowed today? | Syncs? | Writes Sheets? |
|---|---|---|---|
| Date-scoped cell override (drag/swap/task) | Admin / override | Yes (`sched|…`) | **No** — not master |
| Substitution assign/remove | Front Desk+ | Yes (`sub|…`) | **Yes** → app `Subs` tab |
| Edit master timetable in Sheet | **Out of app** (EPIC-01) | — | App **must never** mutate owner master tabs |

In-app timetable edits are **substitutions / day overrides only**. Master TimeTable editing is **EPIC-01** (unscheduled) and needs SEC-02 before privileged writes.

### LOG-D11 — Notifications

Types: `DISPUTE`, `UNCOVERED`, `OFFICIATING`, `CONFLICT`, `SYSTEM`. Persisted ~14 days / max 100. Drawer from header bell. Optional `actionTab` deep-link.

### LOG-D12 — Undo / redo / reset / purge

| Action | Scope | Gate |
|---|---|---|
| Undo / Redo | **Per active tab** stacks (`routine` / `substitutions` / `roster`), max **30** snapshots | All users for their edits; history local |
| Shortcuts | ⌘/Ctrl+Z undo; ⌘⇧Z / Ctrl+Y redo | App root |
| Reset Day | Clears day absences, subs, related day state; **undoable** across stacks | **Admin / canEdit** |
| Purge History | Clears undo stacks | **Admin / canEdit** |

Remote sync apply **does not** rewrite undo history.

### LOG-D13 — Excel export

`GET /api/v1/export/excel` — daily substitutions workbook (Excelize). Available to Front Desk+. Filename / timestamps use school TZ. No disk write on relay.

---

### LOG-D14 — Micro context menu (teacher / cell)

Opened from roster cards or matrix cells (`MicroContextMenu`). Typical actions (Front Desk+ unless noted):

| Action | Behaviour |
|---|---|
| Mark Absent (Full Day) / Mark Present | Toggles `FULL_DAY` absence |
| Mark Away on Duty… / Edit Away Periods… | Starts Away selection / opens Away modal |
| Free from Sub ↔ Available for Sub | Toggles availability |
| Assign / change substitute | Opens Assign modal when slot needs cover (from subs or cell flows) |
| Co-teacher inspect | Opens CoTeacher modal when co-teaching detected |
| Release co-teacher | `releaseCoTeacher` — Front Desk+; clears partner for that period |

Right-click / long-press on **period cells** must not open the teacher-absence menu incorrectly (BUG-13 fixed historically — keep in mockups: cell vs name-column targets differ).

### LOG-D15 — Developer visual prefs (not product-critical)

| Pref | Default | Effect |
|---|---|---|
| `samePeriodLock` | true | Constrains certain same-period moves (routine edit safety) |
| `subHaloIndicator` | true | Visual halo on covered sub cells |
| `subHaloColor` | emerald | Halo colour |
| `acceptanceCountdown` | false | Optional countdown UX around accept window |
| `acceptanceDuration` | 5/10/30/60 s | Duration when countdown on |
| `undoIconStyle` | curved | Undo control glyph family |

These live in user preferences; mockups can omit them unless Steve wants a Dev Options frame.

### LOG-D16 — Substitutions Overview collapse

`hideOverviewsByDefault` preference seeds whether the Substitutions KPI / overview strip starts collapsed. Toggle in-tab. Overview includes Covered / Uncovered / Off. CT / Off. AC appoint cards.

---

---

## 4. Access, roles, and gates (LOG-A)

> Full narrative: [`docs/ADMIN_ACCESS.md`](../ADMIN_ACCESS.md). Client-side only until SEC-02.

### LOG-A01 — Roles

| Role | How obtained | Can do |
|---|---|---|
| **GUEST** (Front Desk) | Default; no login | Mark absences/availability; assign/remove subs; Auto-Resolve run; appoint Off. AC/CT; release co-teachers; export Excel; all view prefs |
| **TEACHER** | Staff Login → non-office name | Everything Guest + accept/dispute **own** duties |
| **ADMIN** | Staff Login → Principal / AC / AAC / today's Off. AC + **admin passcode** | Adds: routine drag/swap/limbo, Reset Day, Purge History, Auto-Resolve **policy** edits |

### LOG-A02 — Admin offices

| Office | Who |
|---|---|
| PRINCIPAL | Designation `"Principal"` or directory role `Principal` |
| AC | Directory Academic Coordinator (not Asst.) |
| AAC | Directory Asst. Academic Coordinator |
| OFF_AC | Manual Off. AC for **today** only (LOGIC-04) |

### LOG-A03 — Passcodes

| Gate | Hash env | Session | Lockout key |
|---|---|---|---|
| Admin (SEC-01) | `VITE_ADMIN_PASSCODE_SHA256` | `sessionStorage` `lfps_admin_session_v2` `{hash, identity}` | `lfps_admin_lockout_v1` |
| Dev Options (SEC-03) | `VITE_DEV_PASSCODE_SHA256` | `sessionStorage` `lfps_dev_session_v1` | `lfps_dev_lockout_v1` |

Lockout schedule (both): 4 free misses → 30s → 1m → 5m → 15m → 1h per further miss; reset on success or 24h quiet. Non-6-digit input not counted.

**Security honesty:** Hashes ship in public JS; offline brute-force of 6 digits is trivial. Accident protection only.

Dev passcode **must differ** from admin. Discovery: Settings → tap Build Info **5 times**.

### LOG-A04 — Edit without login

`lfps_dev_editing_unlocked_v1` device-local. Makes `canEdit` true with nobody logged in. Header shows **Editing unlocked**. Turning on needs Dev session (or admin historically); turning off needs no login. Never synced.

### LOG-A05 — Single permission helper

`resolveAccess()` → `{ role, isAdmin, office, canEdit, editingUnlocked }`. Store + `PermissionGuard` + UI all use `canEdit` for admin-gated actions.

---

---

## 5. Persistence and sync (LOG-P / LOG-S)

### LOG-P01 — localStorage / sessionStorage keys (production names)

| Key | Contents |
|---|---|
| `lfps_user_preferences_v2` | Theme, view/sort, hide absent, name-col expand, undo icon, etc. |
| `lfps_autoresolve_policy_v2` | Solver policy |
| `lfps_operational_state` | Days / weeks / history / notifications (schema v1) |
| `lfps_reference_v1` | Last applied Sheet reference snapshot |
| `lfps_dev_ui_prefs_v1` | Header scroll mode, auto-filter, needs-attention, day-load |
| `lfps_dev_editing_unlocked_v1` | Edit without login |
| `lfps_admin_lockout_v1` / `lfps_dev_lockout_v1` | Lockout counters |
| `lfps_device_id` | Browser device id |
| `lfps_sync_v1` (session) | Sync meta / outbox per tab |
| `lfps_tab_id` (session) | Tab id |
| `lfps_admin_session_v2` / `lfps_dev_session_v1` (session) | Sessions |

**Preview builds** namespace keys: `lfps_preview_<slug>_…` (FEAT-64) so they do not collide with production on the same origin.

Debounce ~250ms; flush on `pagehide` / hidden; prune days older than 42; midnight/week checks on focus + 60s timer.

### LOG-S01 — Live sync entities (active week only)

| Key pattern | Payload |
|---|---|
| `abs\|<date>\|<teacher>` | Absence |
| `sub\|<date>\|<id>` | Substitution |
| `avail\|<weekStart>\|<teacher>` | Weekly availability |
| `oac\|<date>` | Off. AC |
| `oct\|<date>\|<class>` | Off. CT |
| `sched\|<date>\|<period>\|<teacher>` | Routine override cell |
| `limbo\|<date>` | Displaced list |

`v: null` = tombstone. LWW on `(ts, by)`. Undo stacks, UI, admin/dev sessions, editing override **never** sync.

### LOG-S02 — Sync UX phases

Connecting… (amber) → Live (green) → Offline (grey); Sheets error / Loading sheet… when bridge reports (FIND-05). App usable offline from local data; outbox flushes on reconnect. Render cold start ~1 min (FEAT-66).

### LOG-S03 — Durability caveat (alpha)

In sheets mode, **substitutions + deletion tombstones** reload from `Subs` after relay restart. Other entities refill from devices; a missed deletion can resurrect until re-deleted. Relay-only mode: nothing reloads from Sheets.

---

---

## 6. Sheets source-of-truth rules (LOG-SH)

### LOG-SH01 — Owner spreadsheet tabs

| Tab class | Examples | App role |
|---|---|---|
| Read-only owner data | Staff Directory, Subjects List, OVERVIEW, per-teacher abbr tabs, class printable tabs | Pull + stream; **never write** |
| Legacy v1 (untouched) | `Daily_Ledger`, `Baseline_Updates` | Read-only; do not migrate unless owner decides |
| App-owned | `Subs`, `App_Meta`, optional `App_Log` | Relay may create/write **only** these |

### LOG-SH02 — Precedence

**Local date-scoped edits > Sheet reference > bundled seed.** Snapshots version-gated by hash + fetchedAt. Rebase preserves in-progress overrides.

### LOG-SH03 — Mode A / channels

| Channel | Behaviour |
|---|---|
| Production Pages | Production relay URLs; historical storage keys; no preview badge |
| Preview (`VITE_BUILD_CHANNEL=preview`) | Footer **Preview · branch**; scoped storage; **loopback relay** — must not touch production Sheets |
| Relay-only | No Sheets credentials — live sync memory only |

---

---

## 7. Modals and overlays (logic inventory)

| ID | Component | Purpose | Gate |
|---|---|---|---|
| MOD-CTX | `MicroContextMenu` | Cell / teacher context actions | Varies by action |
| MOD-RESET | `ResetPurgeContextMenu` | Reset Day / Purge History | Admin |
| MOD-LOGIN | `StaffLoginModal` | Identity / admin login | — |
| MOD-PASS | `AdminPasscodeStep` / `PasscodeField` | 6-digit entry | — |
| MOD-ASSIGN | `AssignSubstituteModal` | Pick candidate sub for slot | Front Desk+ |
| MOD-AVAIL | `SubAvailabilityModal` | Available / Free from Sub + duty | Front Desk+ |
| MOD-CO | `CoTeacherModal` | Inspect / release co-teacher | Release: Front Desk+ |
| MOD-OFF | `OfficiatingModal` | Appoint Off. AC / Off. CT | Front Desk+ |
| MOD-SET | `SettingsModal` | Settings shell | — |
| MOD-DISPUTE | `DisputeModal` | Dispute reason | Teacher (own) |
| MOD-AWAY | `AwayOfficialModal` | Periods + venue for Away | Front Desk+ |
| MOD-BRAIN | `AutoResolveBrainModal` | Plan + policy | Run: all; policy: admin |
| MOD-NOTIF | `NotificationCenterDrawer` | Notification list | — |
| MOD-A2HS | `AddToHomeScreenModal` | PWA install hint | — |
| MOD-LIMBO | `LimboTray` (panel) | Displaced cells | Restore: admin |

**ADR-0003:** All modals mount at **App root** (not inside transformed ancestors) — keep this constraint in mockups (z-index / portal).

---

---

## 8. Preferences and device-local UI

### PREF-user (`lfps_user_preferences_v2`)

Theme; hideOverviewsByDefault; hideAbsentStaff; substitutionsViewMode; rosterViewMode; substitutionsSortBy; rosterSortBy; routineSortBy; **routineNameColExpandedPortrait** (default false); isMinimalUI; undoIconStyle; developer flags (halo, acceptance countdown, samePeriodLock, etc.).

### PREF-dev (`lfps_dev_ui_prefs_v1`)

| Key | Default | Meaning |
|---|---|---|
| headerScrollMode | `container` | UI-10 (a) container vs (b) thresholds |
| autoFilterAbsent | false | Roster jumps to Absent on mark |
| needsAttentionStrip | false | Roster top strip |
| dayLoadMode | `follow` | FEAT-70 |
| lastFreeDay | null | Free-pick memory |

### PREF-policy

Auto-Resolve weights / Off. CT prioritize / preferred subject overrides.

---

---

## 9. Parked / deferred items that affect design later

| ID | Item | Design impact when unparked |
|---|---|---|
| PARK-THEME | Light / day theme redesign (owner: themes later) | Surfaces, table rules, absent rose on light |
| PARK-SEC02 | Server admin auth | May add token/session UX; must not block Front Desk abs/sub |
| PARK-PERADMIN | Per-admin passcodes | Multiple credentials / office-specific login |
| PARK-UI11-EXTRA | Further fixed table size experiments | Matrix chrome |
| PARK-FEAT70-DEFAULT | Day-load may become user-facing (not only Dev) | Day chip behaviour |
| PARK-EPIC01 | Master timetable editing | Entirely new admin epic + SEC-02 |
| PARK-FEAT67 | Lockout settings in Dev Options | Settings panel |
| PARK-BUG31 | Uptime pinger HEAD | Ops only — no UI |
| PARK-PERF03 | Relay keep-warm | Ops — Connecting… remains |

---

---

## 10. Non-goals — infrastructure vs UX

Mockups **should not** invent UI for:

- Render Docker / `render.yaml` / cold start mechanics (show only Connecting… / Offline)
- GitHub Actions Pages pipeline / commit hashes as a product feature (Build Info is enough)
- Service-account JSON / spreadsheet ID entry in the app
- Direct Google Sheets API from the browser
- Server disk / Postgres (removed architecture)
- Brute-force-resistant client hashing theatre

Mockups **may** show: sync status, Sheet data version string, preview badge, passcode keypad, Dev Options as a clearly "advanced" surface.

---

---

## 11. Cross-check checklist

Verified present in this sheet against tabs / major features:

- [x] Routine / Substitutions / Roster tabs
- [x] Header FULL/PILL + day chips
- [x] Absences + Away Official + availability
- [x] Assign / Auto-Resolve / dispute / accept
- [x] Off. AC / Off. CT + LOGIC-04
- [x] Limbo / admin routine edits / Reset / Purge / Undo
- [x] Guest / Teacher / Admin / Dev / Edit-without-login
- [x] Sync entities + Sheets write allowlist
- [x] Preferences + Dev UI prefs + portrait name col
- [x] Preview channel scoping
- [x] Notifications + Excel export
- [x] Parked themes / SEC-02 / EPIC-01

---

---

## 12. Gaps / unverified from code

| Gap | Notes |
|---|---|
| Exact KPI math for every chip | Uncovered derivation summarized from SubstitutionsRegister; re-verify if mockups need pixel-exact counts |
| Full PLAYTIME column presence in live Sheet vs seed | Types allow it; seed `DEFAULT_PERIODS` list in SAS omits PLAYTIME row — Sheet teacher tabs include the column |
| Every RosterViewMode visual difference | Six+ modes exist; mockups can treat as density ladder unless Steve prioritizes |
| Acceptance countdown UX details | Pref exists; confirm in Settings Dev section when mocking teacher accept |
| Legacy v1 parity nuances | Archived in `legacy-v1/`; not required for redesign unless Steve asks |

---

---

## 13. Related documents

| Doc | Use |
|---|---|
| [`MOCKUPS_GUIDE.md`](./MOCKUPS_GUIDE.md) | Screens + clean-slate mockup plan (M01–M14) |
| [`docs/SAS.md`](../SAS.md) | Architecture verified against code |
| [`docs/ADMIN_ACCESS.md`](../ADMIN_ACCESS.md) | Roles & passcodes |
| [`docs/SEC_02_SERVER_AUTH.md`](../SEC_02_SERVER_AUTH.md) | Future server auth |
| [`docs/PER_ADMIN_ACCESS.md`](../PER_ADMIN_ACCESS.md) | Per-admin design spike |
| [`docs/SHEETS_SETUP.md`](../SHEETS_SETUP.md) | Sheet tabs & bridge |
| [`docs/PAGES_SETUP.md`](../PAGES_SETUP.md) | Pages / preview |
| [`docs/HEADER_MOBILE_40.md`](../HEADER_MOBILE_40.md) | Header phone layout |
| [`docs/VERSIONING.md`](../VERSIONING.md) | SemVer / IDs |
| [`TODO.md`](../../TODO.md) / [`CHANGELOG.md`](../../CHANGELOG.md) / [`BUGS.md`](../../BUGS.md) | Planning ledger |
| [`DEVELOPER_GUIDE.md`](../../DEVELOPER_GUIDE.md) | **Owner-controlled** — do not edit unless Steve asks |

---

*Bundle 42 · Logic Sheet · LFPS Substitutions Manager*

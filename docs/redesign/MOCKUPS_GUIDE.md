# Mockups Guide — LFPS Substitutions Manager

> **Bundle 42 / split** — screens + clean-slate mockup plan.  
> **Companion:** [`LOGIC_SHEET.md`](./LOGIC_SHEET.md) (all product/domain LOG rules).  
> **Status:** How to redesign UI from a **clean mind** while preserving logic.  
> **Audience:** Owner Steve (steph1420) and Lippy.  
> **Non-goal of this file:** New production UI code. Image mockups come after Steve reviews both docs.  
> **Ground truth for behaviour:** [`LOGIC_SHEET.md`](./LOGIC_SHEET.md). If a mockup invents a workflow, update the logic sheet first with Steve's OK.

---

## Table of contents

1. [How to use this guide](#1-how-to-use-this-guide)
2. [Screen inventory](#2-screen-inventory)
3. [Mockups guide — redesign from a clean mind](#3-mockups-guide--redesign-from-a-clean-mind)
4. [Parked items (design impact)](#4-parked-items-design-impact)
5. [Non-goals for mockups](#5-non-goals-for-mockups)
6. [Related documents](#6-related-documents)

---

## 1. How to use this guide

### 1.1 Redesign stance (owner direction, 2026-10-24)

1. **Forget the current website look.** Mockups start from a clean mind.
2. **Preserve product logic** — every control maps to a rule in [`LOGIC_SHEET.md`](./LOGIC_SHEET.md).
3. **Image mockups are next**, after Steve reviews the logic sheet + this guide.
4. Themes (especially light theme polish) are **parked** — use one neutral light + one dark for readability; full theme family later.

### 1.2 ID scheme (mockup-facing)

| Prefix | Meaning |
|---|---|
| **SCR-** | Screen / surface |
| **MOD-** | Modal / overlay (gates detailed in logic sheet) |
| **LOG-*** | Behaviour rules — see logic sheet |
| **PARK-** | Parked design-affecting item |
| **M01–M14** | Suggested mockup frames below |

---

## 2. Screen inventory

### SCR-APP — Application shell

| Aspect | Current behaviour |
|---|---|
| Purpose | Host Header, tab content, TabBar, root-mounted modals, live sync start |
| Tabs | `routine` \| `substitutions` \| `roster` |
| Scroll | Default: `#lfps-app-scroll` container (UI-10 mode a); alternate window thresholds (Dev Option) |
| Fit-grid | Separate fullscreen root tree for Routine (BUG-10) |
| Preview banner | Footer link when preview build |
| States | Guest / teacher / admin / editing-unlocked; Connecting / Live / Offline / Sheets error |
| Pain points | Header jitter history (BUG-29/35 mostly addressed); light theme contrast parked; large JS chunk |

### SCR-HDR — Header (FULL / PILL)

| Aspect | Detail |
|---|---|
| FULL desktop | Brand · day dock · Live · Reset · PWA · Excel · Bell · Settings · Login / name+Logout |
| FULL phone (&lt; md) | **Row1:** logo/version/admin/editing · compact sync · bell · settings · login/name+logout. **Row2:** day chips MON–SAT (`docs/HEADER_MOBILE_40.md`) |
| PILL | Floating day island only (no sync/account on pill) |
| Hide/show | Bundle 41a: **while scrolling** — down past ENTER_PILL → PILL; up → FULL mid-page; near top always FULL; hysteresis / IGNORE_DELTA / viewport freeze |
| Primary actions | Change day; open settings/login/notifications; export; sync status |
| Pain points historically | Jitter with browser chrome; hide only on finger-up (fixed 41a); two-row height clearance |

### SCR-TAB — Tab bar

Three destinations: Routine Matrix, Substitutions, Staff Roster. Version footer above dock. `prefers-reduced-motion` on fades.

### SCR-MAT — Routine Matrix (`RoutineGrid`)

| Aspect | Detail |
|---|---|
| Purpose | See who teaches what; spot Free / Need Sub; (admin) edit day overrides |
| Primary actions | Sort role/name; Hide Absent; Teachers↔Classes; Fit Grid; portrait **Names/Narrow** toggle (UI-14); open cell menus; limbo restore |
| Portrait name col | Default **narrow (~64px)**; toggle expands; persisted `routineNameColExpandedPortrait`; calm width ease (~0.38s) |
| Landscape/desktop | Readable name widths; period min-widths + horizontal scroll (Bundle 40) |
| Sticky | Period header, faculty column, corner cell |
| Geometry | Fixed table layout + reserved row height (UI-11) so Hide Absent / SAT does not crush card |
| Empty/loading | Directory-driven shell; Sheet apply may rebase quietly |
| Pain points | Name-col animation jitter (addressed); light Free/Need Sub contrast parked with themes |

### SCR-SUB — Substitutions (`SubstitutionsRegister`)

| Aspect | Detail |
|---|---|
| Purpose | Cover uncovered slots; run Auto-Resolve; manage covered list; Off. AC/CT overview chips |
| KPIs | Covered, Uncovered Needs, Off. CT/AC appoint status |
| Filters | All / Uncovered / Covered / My Duties |
| Phone | Group uncovered by absent teacher; compact Assign |
| Primary actions | Assign Sub → MOD-ASSIGN; Auto-Resolve → MOD-BRAIN; Appoint Off.*; Accept/Dispute when teacher |
| Empty | Friendly empty / all-clear copy (Bundle 39) |

### SCR-ROS — Staff Roster (`AbsenceRoster`)

| Aspect | Detail |
|---|---|
| Purpose | Attendance tray: Present / Absent / Away / No Subs |
| View modes | normal-grid, compact-grid, normal-list, compact-list, comfort-grid, detailed-list (+ legacy grid/list aliases) |
| Filters | All / Present / Absent / No Subs (`free_from_sub`) |
| Search | Name / role text |
| KPIs | Present, Absent Today, Away, Free-from-sub counts |
| Actions | Toggle absent; Away Official modal; availability modal; Mark All Present; Off. CT needs; optional Needs attention strip |
| Dev Option | Auto-filter Absent on mark; Show all chip; uncovered chip → Substitutions |
| Absent visual | Soft rose tint + left rail (UI-15) — beautiful, not blunt magenta |
| Pain points | Light theme absent readability parked |

### SCR-SET — Settings / Cloud / Build / Dev Options

| Section | Contents |
|---|---|
| Theme | 12 ThemeIds (park redesign of light family) |
| Preferences | Hide overviews, hide absent, sorts, views, undo icon, etc. |
| Admin Access | Status, open Staff Login, Log Out, Turn off editing unlocked |
| Cloud / Sync | Sync card, Reconnect, Sheets status |
| Build Info | Version · commit · branch · Sheet data hash/time; **5-tap** → Dev passcode |
| Dev Options | Header scroll A/B; auto-filter; needs-attention; day-load; Edit without login; diagnostics; mapping report |

### SCR-LOGIN — Staff Login + Admin passcode step

List staff (+ Principal designation). Non-admin → identity login. Admin office → keypad (six dots, auto-submit). Lockout messaging. Back to list.

### SCR-PREV — Preview channel chrome

Badge **Preview · &lt;branch&gt;**; link to preview index; isolated storage; no production relay.

---

### Modals (quick index)

Full purpose + gates: [`LOGIC_SHEET.md` §7](./LOGIC_SHEET.md#7-modals-and-overlays-logic-inventory). IDs: MOD-CTX, MOD-RESET, MOD-LOGIN, MOD-PASS, MOD-ASSIGN, MOD-AVAIL, MOD-CO, MOD-OFF, MOD-SET, MOD-DISPUTE, MOD-AWAY, MOD-BRAIN, MOD-NOTIF, MOD-A2HS, MOD-LIMBO. **ADR-0003:** mount at App root.

---

## 3. Mockups guide — redesign from a clean mind

### 3.1 Hard rules for mockup artists / Lippy

1. **Do not copy** current glass chrome, island morph, or colour fashion unless Steve asks. Start from school front-desk clarity.
2. **Every control must map to a LOG rule** above. If a mockup invents a workflow, update this sheet first with Steve's OK.
3. **Guest-first:** Most real use is Front Desk with nobody logged in. Admin chrome is secondary.
4. **Phone portrait is a first-class surface**, not a shrink of desktop (name col, header two-row, grouped subs).
5. **Themes parked:** Use one neutral light + one dark in mockups for readability; full theme family later.
6. **Do not invent fake systems** in UI: no "database browser", no fake SSO screens unless SEC-02/SSO is scheduled; sync can stay a small status.

### 3.2 Suggested mockup set order

| # | Mockup | Must show LOG / SCR | Happy path | Edge / empty / error |
|---|---|---|---|---|
| M01 | Guest Routine Matrix (phone portrait) | LOG-D03, SCR-MAT, UI-14 narrow names | Browse day, Free cells readable | Hide Absent on; horizontal scroll periods |
| M02 | Guest Routine Matrix (desktop) | SCR-MAT teachers view | Sticky headers | Need Sub cell affordance |
| M03 | Staff Roster — Absent focus | LOG-D04, SCR-ROS, UI-15 soft rose | Mark absent; Away | Mark All Present; search; No Subs filter |
| M04 | Assign Substitute flow | LOG-D06/D07, MOD-ASSIGN | Pick scored candidate | Unavailable reasons; Free from Sub |
| M05 | Substitutions — Uncovered (phone) | SCR-SUB grouped | Assign from group | All clear empty |
| M06 | Auto-Resolve result | LOG-D07, MOD-BRAIN | Apply plan | Unresolved slots list |
| M07 | Off. AC / Off. CT appoint | LOG-D08 | Appoint when AC+AAC away | Auto AAC acting |
| M08 | Header FULL + PILL (phone) | SCR-HDR, LOG scroll | Scroll-down pill; scroll-up expand | Connecting… / Offline |
| M09 | Staff Login + Admin keypad | LOG-A, SCR-LOGIN | Teacher tap vs AC+passcode | Lockout wait state |
| M10 | Settings — Admin / Cloud / Build | SCR-SET | Sync Live; Sheet version | Sheets error; no passcode configured |
| M11 | Teacher accept / dispute | LOG-D06 FEAT-49 | My Duties accept | Dispute with reason |
| M12 | Admin routine edit + Limbo | LOG-D09/D10 | Drag → limbo → restore | Guest cannot drag (disabled) |
| M13 | Preview channel | SCR-PREV | Badge + isolated feel | — |
| M14 | Away Official | MOD-AWAY | Period multi-select + venue | Partial periods |

### 3.3 Annotation checklist (every mockup)

- [ ] Which **LOG-** rules appear
- [ ] Role assumed: Guest / Teacher / Admin / Editing unlocked
- [ ] Day + sync state
- [ ] Primary CTA and secondary
- [ ] Empty / loading / error variant listed or drawn
- [ ] Mobile vs desktop called out
- [ ] Anything **parked** (theme, SEC-02) labeled "out of scope for this frame"

### 3.4 What "fresh" still must preserve

School week MON–SAT; IST today; Free vs Need Sub vs Covered; Away ≠ Absent for filters; Guest can run the desk; admin for master-like edits; Sheets never written except app tabs; one-week live sync mental model.

---

---

## 4. Parked items (design impact)

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

## 5. Non-goals for mockups

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

## 6. Related documents

| Doc | Use |
|---|---|
| [`LOGIC_SHEET.md`](./LOGIC_SHEET.md) | Full LOG-* behaviour rules |
| [`docs/HEADER_MOBILE_40.md`](../HEADER_MOBILE_40.md) | Header phone layout notes |
| [`docs/SAS.md`](../SAS.md) | Architecture |
| [`TODO.md`](../../TODO.md) / [`CHANGELOG.md`](../../CHANGELOG.md) | Planning ledger |

---

*Bundle 42 · Mockups Guide · LFPS Substitutions Manager*

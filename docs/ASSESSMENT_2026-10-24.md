# LFPS Substitutions Manager — Product Assessment (post Bundle 37)

**Date:** 2026-10-24 (Asia/Calcutta)  
**Scope:** Code-level assessment only — **no fixes, no push**.  
**Code under review:** `/workspace/work/LFPS_Substitutions_Manager` on branch `bundle/37` (6 commits ahead of live `next-gen` / alpha.3).  
**Also compared:** open items in `TODO.md` / `BUGS.md` / `CHANGELOG.md` / `THEMES.md` / `DESIGN_PHILOSOPHY.md` / `docs/DOC_ISSUES.md`.

Severity guide used below: **S1** blocks Front Desk ops or security; **S2** major UX/logic gap; **S3** noticeable polish; **S4** cosmetic / docs.

---

## Confirmed owner backlog

These are already requested by the owner (2026-10-24). Logged here as confirmed; not invented.

| ID | Item | Evidence / touch points | Suggested home |
|---|---|---|---|
| **UI-11** | **Fixed routine table size** — table currently changes based on day | See deep-dive below. Drivers: variable row content height (no fixed row/`table-layout`), day-varying cell density (SAT schedule shorter in seed), optional **Hide Absent** row filter (`RoutineGrid.tsx` ~83–90), absent/Need-Sub chrome adding height. Period columns are fixed (`DEFAULT_PERIODS`, 8 incl. BREAK). | Bundle **38a** (UI) or early **39** |
| **FEAT-70** | **Dev Option: load UI on current school day vs select a day** | `selectedDay` is **not** in `OPERATIONAL_KEYS` (`persistence.ts` 124–136). Load always does `schoolDayForDate(now) ?? 'MON'` (`persistence.ts` 499). `setDay` freely changes it in-session (`useTimetableStore.ts` 537). Header day chips show `MON`…`SAT` with **no “today” marker** and no calendar date (`Header.tsx` ~261–275, ~430+). Week rollover snaps with `selectToday: true` (`persistence.ts` 562–569, 578–584). Calendar helpers: `packages/core/src/calendar/index.ts` (`schoolDateFor`, `schoolDayForDate`, `dateForSchoolDay`, IST). | Bundle **38a** (extend FEAT-69 prefs) |
| **UI-12** | **Day themes washed out vs night** (Bundle 39 candidate) | Owner + CHANGELOG future notes. Root causes detailed in High/Medium: remapped `--color-slate-*` vs ~180+ hardcoded dark accents (`bg-*-950`, `text-white`), early hardcoded glass/header CSS, night themes strong by default. | Bundle **39** |
| **SEC-03+** | **Per-admin passcodes; privileges from role; Dev Options own passcode (SEC-03)** | Owner reconfirmed during Bundle 37. Today: one shared 6-digit hash (SEC-01 interim); FEAT-68 roles only decide *who* may enter the shared code; Dev Options still admin-gated until SEC-03 (`TODO.md` SEC-03, FEAT-68). Real enforcement still **SEC-02**. | Bundle **38** (SEC-02 + SEC-03 design) then auth follow-ups |

### Routine table size — why it changes by day (cite)

| Factor | Changes by day? | File:lines | Notes |
|---|---|---|---|
| Period **columns** | No | `packages/core/src/data/seed.ts` 10–19; `RoutineGrid.tsx` 224+, 352+, 618+ | Always `DEFAULT_PERIODS` (G/PD…6th + BREAK). |
| Teacher **rows** (Hide Absent off) | No (same directory) | `RoutineGrid.tsx` 76–90 | Full `directory` sorted. |
| Teacher **rows** (Hide Absent **on**) | **Yes** | `RoutineGrid.tsx` 83–90, 762–770 | Filters out absent (non–Away Official) for `selectedDay` → different row counts. |
| Cell **content density** | **Yes** | Seed day blocks; `RoutineGrid` cell render ~352–580 | SAT seed block shorter than MON; more `Free`/`-` → shorter visual cells; subject text wrap varies. |
| Absent / Need Sub chrome | **Yes** | `RoutineGrid.tsx` 266–318, 559–563; `index.css` `.cell-missing-quiet` | ABS badges + “Need Sub!” cells add height when that day has absences. |
| Fit / fullscreen layout | Indirect | `RoutineGrid.tsx` 73, 883–894 | Fills viewport; content still drives intrinsic row height inside scroll. |
| Name-column collapse | Independent of day | `RoutineGrid.tsx` 95–120 (Bundle 37 fix) | Width fixed after BUG-30; not the “table size by day” complaint. |

**Fix direction (UI-11):** lock a stable geometry — e.g. `table-layout: fixed` + min row height (or CSS grid with equal tracks), optional min table height in Fit mode, and/or keep absent rows (dim) instead of removing them when “Hide Absent” is on (or make Hide Absent not change outer frame). Dev Option if A/B desired.

### Day selection — how it works today / what FEAT-70 would touch

1. **School “today”** = `schoolDateFor(now)` in `Asia/Kolkata` (`calendar/index.ts` 20–48, 107–111). Sunday → `schoolDayForDate` is `null` → UI falls back to `'MON'` of the *upcoming* week (`activeWeekStart` rolls forward on Sunday).
2. **On every cold load:** `selectedDay = schoolDayForDate(now) ?? 'MON'` — always current school day, never last browsed day.
3. **In session:** Header / Routine day pills call `setDay` — browse any slot of the active week; absences/subs/Off. CT are day-scoped.
4. **Persistence:** day choice is **session-only** (not in operational save keys). Preferences persist theme, Hide Absent, etc., but not `selectedDay`.
5. **Rollover:** leaving the tab overnight → `checkRollover` → new week + `selectToday: true`.

**FEAT-70 Dev Option sketch:** extend `devUiPrefs` (`apps/web/src/lib/devUiPrefs.ts`):

- **(a) Follow school day (default):** on load + visibility/focus, snap `selectedDay` to `schoolDayForDate`; optionally disable or warn on picking another day during school hours.
- **(b) Free pick:** allow MON–SAT browse; optionally persist last pick per device; show **Today** chip + ISO date via `dateForSchoolDay(activeWeekStart, day)` under each pill.

Touch: `Header.tsx` day bar, `RoutineGrid` day controls, `loadInitialOperationalState` / rollover `selectToday`, Settings → Developer Options copy, tests in `dev-ui-prefs.test.ts`.

---

## High priority findings (new)

### FIND-01 — Infinite `animate-pulse` still everywhere (Bundle 37 incomplete on motion policy)
- **Severity:** S2  
- **Evidence:** Bundle 37 made `.attention-pulse` / `.purple-attention-pulse` one-shot (3 beats) in `index.css` 38–67, but **Tailwind `animate-pulse` remains infinite** on Live/Connecting dots (`Header.tsx` ~246, 485–487, 541), notification badges (~395, 524), Substitutions “Need Sub” pills (~765, 860), Settings sync dots, Staff Login, TabBar urgency. Count ≈ **11** `animate-pulse` call sites.  
- **Proposed fix:** Replace status dots with static color (or one-shot CSS); reserve motion for first-view affordances; honor `prefers-reduced-motion` globally (today mostly only `PasscodeField`).

### FIND-02 — Day-theme washout root cause: remapped slate vs hardcoded dark accents
- **Severity:** S2 (owner-confirmed as Bundle 39)  
- **Evidence:** Light themes invert `--color-slate-*` (`index.css` 167–226, warm-sepia, utopian-glass, aero-frost, high-contrast). But components still use **~180+** `text-white` / `bg-rose-950` / `bg-amber-950` / `bg-purple-950` / `bg-slate-950/...` that do **not** follow the invert. Early `.glass-panel` / `.header-elevated` (lines 15–36) hardcode dark rgba before token overrides (446+). Night themes look intentional; day themes look “washed” + bruised dark chips.  
- **Proposed fix:** Semantic tokens (`bg-surface`, `text-primary`, `bg-danger-soft`) in `@theme`; ban raw `*-950` / `text-white` in product UI; audit light + warm-sepia + high-contrast. Bundle **39**.

### FIND-03 — Dead “Target Cell Halo Pulse” Dev Option
- **Severity:** S2 (trust / Settings honesty)  
- **Evidence:** `subHaloIndicator` / `subHaloColor` live in store + Settings (`SettingsModal.tsx` ~985–1024, default **on**), but **no** `haloPulse` / `sub-halo-active` usage remains in `RoutineGrid` or `index.css`. Toggle changes nothing visible.  
- **Proposed fix:** Re-wire one-shot halo on assign targets **or** remove the control and prefs until reimplemented. Align with Bundle 37 “no infinite pulse” policy.

### FIND-04 — Routine sticky absent column still uses outer bloom (UI-06 partial)
- **Severity:** S2  
- **Evidence:** Roster cards use rail + no bloom (`.card-absent-illuminated`, Bundle 37). Routine sticky name cell still has `shadow-[3px_0_12px_rgba(244,63,94,0.35)]` + `bg-rose-950/90` (`RoutineGrid.tsx` 281–282). Same “bruise” language the owner rejected on cards.  
- **Proposed fix:** Apply the same left-rail / no outer bloom treatment to matrix sticky cells and absent rows.

### FIND-05 — Sync copy gap: Connecting… vs hydrating / Sheets error
- **Severity:** S2  
- **Evidence:** Header pill is only Live / Connecting… / Offline (`status.ts` 46–56; `Header.tsx` 459–491). Relay can be `store: hydrating` or `sheets: error` (alpha.3 health), but the pill does not surface Sheets bridge failure — user may think “still waking” while writes fail or snapshot is stale. Settings diagnostics are richer (~635–804) but Front Desk rarely opens them.  
- **Proposed fix:** Extend phase or subtitle: “Waking relay…”, “Loading sheet…”, “Sheets error — local only”; tap pill → Settings Cloud section. Keep microcopy short (DESIGN_PHILOSOPHY).

### FIND-06 — Shared admin passcode vs role privileges (owner direction)
- **Severity:** S1 (security / product model)  
- **Evidence:** FEAT-68 tags Principal/AC/AAC/Off. AC as admins but all share one bake-time hash (`docs/ADMIN_ACCESS.md`, SEC-01). Owner: privileges from **role**, per-admin passcodes later; Dev Options **own** passcode (SEC-03). Hash is brute-forceable offline (documented).  
- **Proposed fix:** Design SEC-02 (server token) + SEC-03 (dev code) first; then per-admin secrets keyed by office/identity. Do not expand client-only shared-code theater.

### FIND-07 — cron-job.org HEAD still parked (BUG-31)
- **Severity:** Ops / S3 app-adjacent  
- **Evidence:** `BUGS.md` BUG-31 — monitor until job uses **HEAD**. Not an app defect; still open owner ops.  
- **Proposed fix:** Owner switches cron-job.org → Advanced → Request method → HEAD.

---

## Medium

### FIND-08 — `transition-all` still widespread (DESIGN_PHILOSOPHY violation)
- **Severity:** S3  
- **Evidence:** ≈ **73** `transition-all` in `apps/web/src/**/*.tsx` (SubstitutionsRegister, RoutineGrid expand button, cards, etc.). Philosophy §2.3 forbids layout-triggering / fighting Framer springs. Bundle 37 removed it from sticky name column only.  
- **Proposed fix:** Replace with `transition-colors` / `transition-opacity` / `transition-transform` only; audit hover+active scales.

### FIND-09 — Substitutions tab still loud (appoint / attention)
- **Severity:** S3  
- **Evidence:** Bundle 37 quieted Off. CT on `RosterNormalCard` (`.off-ct-appoint-quiet`). `SubstitutionsRegister.tsx` still stacks `attention-pulse` / `purple-attention-pulse` on overview CT/AC buttons and appoint cards (~317–340, 1171–1228) plus infinite `animate-pulse` on Need Sub badges.  
- **Proposed fix:** Same one-shot + quiet appoint treatment as Roster; Absent/Uncovered stay primary.

### FIND-10 — Compact roster cards skip amber look-at-me
- **Severity:** S3  
- **Evidence:** `amber-look-at-me-1x` on `RosterNormalCard`; `amber-look-at-me-3x` on `RosterNormalListRow`; **compact** card/list variants get rail classes but no look-at-me (`RosterCompactCard.tsx`, `RosterCompactListRow.tsx`).  
- **Proposed fix:** Share one first-view hook across all four roster presentations.

### FIND-11 — Needs-attention strip Roster-only; auto-filter sticky
- **Severity:** S3  
- **Evidence:** Strip only in `AbsenceRoster.tsx` 182–210. Auto-filter Absent (`devUiPrefs.autoFilterAbsent`) switches filter on mark-absent but does **not** clear when marking present / Mark All Present — easy to “lose” the full roster. Uncovered chip is non-button (can’t jump to Substitutions).  
- **Proposed fix:** Optional strip on Substitutions; make uncovered chip navigate; reset filter on Mark Present or add “Show all” after auto-filter.

### FIND-12 — No “today” affordance on day chips
- **Severity:** S3 (pairs with FEAT-70)  
- **Evidence:** Day buttons render `{day}` only (`Header.tsx`). Planning Friday while today is Saturday is easy to miss.  
- **Proposed fix:** Dot/ring on `schoolDayForDate(now)`; subtitle date from `dateForSchoolDay`.

### FIND-13 — Front Desk vs Admin communication still fuzzy in Settings
- **Severity:** S3  
- **Evidence:** Identity line “Guest / Front Desk Mode” (`SettingsModal.tsx` ~336–348) is good; Admin Access copy explains shared passcode. Dev Options still unlocked by **admin + 5-tap** — Front Desk cannot reach motion A/B without admin (until SEC-03). Toast “Admin login required” on 5-tap is abrupt. “Editing unlocked” (FEAT-68 override) can look like full admin to Front Desk.  
- **Proposed fix:** Clarify badges: Front Desk / Teacher / Admin / Dev; SEC-03 separates Dev; short tooltips on Live pill and Editing unlocked.

### FIND-14 — Light muted contrast only lightly touched in Bundle 37
- **Severity:** S3  
- **Evidence:** CHANGELOG/TODO claim a small light muted pass; vast surface still `text-slate-400`/`500` on light remaps (secondary can become mid-gray on gray). High-contrast theme remaps slate aggressively but still inherits `text-white` chips.  
- **Proposed fix:** Fold into UI-12 / Bundle 39 token pass; WCAG check on labels.

### FIND-15 — Accessibility: focus rings and hit targets
- **Severity:** S3  
- **Evidence:** Many controls use `focus:outline-none` with only border color change (search fields). Header icon buttons often `p-1.5` (~24–28px) below 44px HIG. `aria-*` is good on Dev toggles / Staff Login / lockout `role="status"`, sparse elsewhere. Reduced motion only on passcode shake.  
- **Proposed fix:** `focus-visible:ring-2` tokens; min 44px touch on header/tab actions; `useReducedMotion` for island spring / tab AnimatePresence.

### FIND-16 — Partial absence / Away Official discoverability
- **Severity:** S3  
- **Evidence:** Types `FULL_DAY` | `PERIODS` | `AWAY_OFFICIAL` exist (`types/index.ts`). Period pick is grid marquee + context menu (“Select periods on grid”, `MicroContextMenu.tsx` ~119–120). Roster Absent toggle is full-day oriented — partial flow easy to miss for Front Desk.  
- **Proposed fix:** Roster long-press → “Partial day…”; show period chips on absent cards when `type === 'PERIODS'`.

### FIND-17 — PERF-01 still open (routine first paint)
- **Severity:** S3 performance  
- **Evidence:** `TODO.md` PERF-01 🔴 Open — Master Routine stutter on first view; keep-warm not built. Distinct from Render keep-warm (PERF-03, external).  
- **Proposed fix:** Idle pre-mount Routine tab or virtualize rows; don’t block Bundle 38 security.

### FIND-18 — Docs drift after alpha.3 go-live
- **Severity:** S3 docs  
- **Evidence:** Job Bundle Plan still says 35/35a “pending push” in places; Bundle 37 “In progress”; `DOC_ISSUES.md` audit dated pre-35 (some DI-* superseded in code). CATCH_UP stale per DI-05.  
- **Proposed fix:** ARCH-03 docs pass with Bundle 38; mark alpha.3 live; don’t rewrite released CHANGELOG sections.

### FIND-19 — UI-10(a) container scroll vs Fit-Grid fullscreen
- **Severity:** S3  
- **Evidence:** Container scroll wraps normal shell (`App.tsx` 88–128). Fit-Grid early-return (`App.tsx` 68–85) is a separate full viewport tree — header scroll mode irrelevant; possible toolbar jitter only in fullscreen path on mobile.  
- **Proposed fix:** Note in Dev Options; optional same overscroll containment in fullscreen wrapper.

---

## Low / polish

### FIND-20 — Bundle 37 device confirmation still open
- **Severity:** S4  
- **Evidence:** TODO/BUGS: iOS Safari / Android Chrome check for BUG-29/30 after merge.  
- **Proposed fix:** Owner smoke on two phones before/just after merge.

### FIND-21 — `scrollbar-thin` colors are dark-oriented
- **Severity:** S4  
- **Evidence:** `index.css` 124–142 — slate thumb rgba; applied to Settings/StaffLogin/Officiating/Routine. Fine on night; low-contrast or odd on light.  
- **Proposed fix:** Tokenize thumb/track per theme.

### FIND-22 — Empty states thin
- **Severity:** S4  
- **Evidence:** Roster empty search copy (`AbsenceRoster.tsx` ~601–604). Subs empty: “No covered substitutions recorded for {day}.” Little guidance when filter=Absent and count=0 (“Nobody absent — nice”).  
- **Proposed fix:** Friendly zero states + clear filters CTA.

### FIND-23 — Tab switch motion is opacity/y, not spring palette
- **Severity:** S4  
- **Evidence:** `App.tsx` 109–115 `duration: 0.16` linear-ish tween; philosophy prefers springs. Fine for speed; inconsistent with island spring.  
- **Proposed fix:** Optional snappy spring or respect reduced motion by skipping.

### FIND-24 — Hardcoded teacher names in store logic
- **Severity:** S4 / maintainability  
- **Evidence:** e.g. `Mrs. R. Pahwa` checks in `toggleAbsence` path (`useTimetableStore.ts` ~1043) and RoutineGrid role heuristics (~252–253) vs directory roles / `adminOfficeFor()`. Sheet-driven directory can drift.  
- **Proposed fix:** Role helpers only; no stringly AC names in UI logic.

### FIND-25 — DESIGN_PHILOSOPHY architecture diagram still mentions disk snapshots
- **Severity:** S4 docs  
- **Evidence:** `DESIGN_PHILOSOPHY.md` §4 still shows “Disk Snapshots” under server; relay model superseded that (ADR-0005 / alpha.3).  
- **Proposed fix:** Docs audit (ARCH-03).

### FIND-26 — Stale halo CHANGELOG lore vs code
- **Severity:** S4  
- **Evidence:** Older CHANGELOG/TODO describe breathing `haloPulse`; code path gone (FIND-03).  
- **Proposed fix:** Note under Unreleased when removing or restoring control.

---

## Bundle 37 unfinished edges (spot-check)

| Edge | Status |
|---|---|
| BUG-29 / UI-10 header hysteresis + container/thresholds A/B | Done on branch; device confirm pending |
| BUG-30 name-column fixed width + hysteresis | Done on branch |
| Absent **card/row** rail (UI-06) | Done for roster presentations |
| Absent **matrix sticky cell** bloom | **Not** aligned (FIND-04) |
| Attention CSS one-shot | Done for `.attention-pulse*`; **not** for `animate-pulse` (FIND-01) |
| Off. CT quiet | Roster normal card only (FIND-09) |
| Dev prefs event sync | Header + AbsenceRoster listen to `lfps-dev-ui-prefs` ✅ |
| Needs attention / auto-filter | Implemented; sticky filter + Roster-only (FIND-11) |
| `scrollbar-thin` on key modals | Done |
| Halo Settings toggle | **Orphan** (FIND-03) |
| Push / merge to `next-gen` | **Not done** (local `bundle/37` only) |
| DEVELOPER_GUIDE | Untouched (owner gate) |

---

## Suggested Job Bundle 38 / 39 split

Reorder vs the old plan (old 38 = SEC-02 + docs audit; old 36 = CI/Pages). Owner can swap; security still matters before trusting admin writes.

### Bundle 38a — Motion / Routine UI follow-through (ship Bundle 37 + close gaps)
- Merge/release Bundle 37 after phone smoke (FIND-20).  
- **UI-11** fixed routine geometry.  
- **FEAT-70** current-day vs pick-day Dev Option.  
- FIND-01 / FIND-04 / FIND-09 / FIND-10 / FIND-11 motion & absent consistency.  
- FIND-03 halo: re-wire or remove.  
- Optional: FIND-12 today marker (can ship with FEAT-70).

### Bundle 38b — Security & trust (was Bundle 38 core)
- **SEC-02** server-side admin auth for privileged mutations.  
- **SEC-03** separate Dev Options passcode.  
- Design spike only for **per-admin passcodes / role privileges** (implementation may be 38c).  
- ARCH-03 docs reconciliation (FIND-18, FIND-25); mark alpha.3 / Bundle 37 status accurately.  
- BUG-31 ops reminder (HEAD).

### Bundle 39 — Themes, a11y, communication
- **UI-12** full day-theme contrast rewrite (FIND-02, FIND-14, FIND-21).  
- Semantic tokens; retire hardcoded `text-white` / `*-950` chips.  
- A11y: focus rings, hit targets, reduced motion (FIND-15).  
- Sync pill honesty (FIND-05) if not pulled into 38a.  
- Empty-state / Front Desk copy pass (FIND-13, FIND-22).  
- PERF-01 only if capacity remains (else Bundle 40).

### Keep as already planned / parallel
- **Bundle 36** — CI builds Pages; stop committing root assets; preview channels (FEAT-64). Does not block 38a.  
- **EPIC-01** Master TimeTable editing — still unscheduled.  
- **FEAT-67** lockout settings — after SEC-03.

```
38a  UI/motion follow-through + UI-11 + FEAT-70
38b  SEC-02 + SEC-03 (+ per-admin design) + docs
39   Day themes + a11y + communication polish
36   CI/Pages (whenever; infra)
```

---

## Open tracker items still relevant (quick index)

| ID | Status | Notes |
|---|---|---|
| BUG-29, BUG-30, UI-10, FEAT-69, UI-06 | Fixed on `bundle/37` | Need merge + device confirm |
| BUG-31 | Monitor / owner ops | HEAD method |
| SEC-02 | Open → 38b | Server auth |
| SEC-03 | Deferred → 38b | Dev passcode |
| FEAT-67 | Deferred | After SEC-03 |
| PERF-01 | Open | Client routine keep-warm |
| PERF-03 | External | cron / uptime |
| ARCH-05 / FEAT-64 / Bundle 36 | Planned | Pages via Actions |
| EPIC-01 | Unscheduled | Master TT editing |
| UI-11, FEAT-70, UI-12, per-admin auth | **New confirmed backlog** | This assessment |

---

*End of assessment. No code changes were made; `bundle/37` was not pushed.*

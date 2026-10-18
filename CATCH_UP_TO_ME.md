# CATCH UP TO ME: Operational Handover & Inter-Agent Transfer Protocol
*Little Flower Preparatory School (LFPS) Substitutions Manager & Master Routine Suite (Next-Gen v2.0)*

> **CRITICAL DIRECTIVE FOR THE INCOMING AI AGENT:**
> You are picking up work on this codebase because the user has switched accounts/sessions due to quota limits. 
> This document is your comprehensive single source of truth. It details **everything done, why, where, when, and how**, along with exact instructions on how to maintain this and companion documentation files so the original agent can seamlessly catch back up when returning.
>
> **PRIME COMMANDMENT:**
> 1. **BRANCH SAFETY:** Work strictly on branch `next-gen`. **NEVER COMMIT OR PUSH TO `main`**.
> 2. **BACKUP RULE:** Before making large architectural changes or resolving job bundles, always create a snapshot archive in `_backups/`.
> 3. **120FPS GPU DISCIPLINE:** Adhere to Apple Human Interface Guidelines (HIG). Never animate layout reflow properties (`width`, `height`, `top`, `left`). Animate strictly `transform` and `opacity`. Equalize expand and collapse spring timings.
> 4. **BUILD PIPELINE INTEGRITY:** Running `npm run build` compiles `apps/web` and copies `apps/web/dist` to the repository root for GitHub Pages. Always delete stale hashed assets from `assets/` so only active build assets exist.

---

## 1. Project Identity & Active Topology

- **Project Name**: Little Flower Preparatory School (LFPS) Substitutions Manager & Routine Matrix
- **Current Version**: `v2.0.0-alpha.1` (Next-Gen Monorepo)
- **Active Git Branch**: `next-gen` (Tracking `origin/next-gen`)
- **Live GitHub Pages URL**: `https://steph1420.github.io/LFPS_Substitutions_Manager/`
- **Live Go Cloud API**: `https://lfps-substitutions-manager.onrender.com` (Go 1.23 WebSocket Hub & Excel Export Engine)
- **Repository Architecture**: NPM Workspaces Monorepo:
  - [`packages/core`](file:///Users/steve/BigFolder/Edit&Prod/Scripting/School/LFPS_Substitutions_Manager/packages/core): Pure TypeScript domain engine, solver, types, seed data, and disambiguation. (100% test coverage via Vitest).
  - [`packages/ui`](file:///Users/steve/BigFolder/Edit&Prod/Scripting/School/LFPS_Substitutions_Manager/packages/ui): Apple HIG design tokens, spring physics curves, glass presets, and semantic color roles.
  - [`apps/web`](file:///Users/steve/BigFolder/Edit&Prod/Scripting/School/LFPS_Substitutions_Manager/apps/web): React 19 + TypeScript + Vite 6 + Tailwind CSS v4 + Framer Motion high-density PWA.
  - [`apps/server`](file:///Users/steve/BigFolder/Edit&Prod/Scripting/School/LFPS_Substitutions_Manager/apps/server): Go 1.23 high-concurrency microservice with Gorilla WebSocket hub and Excelize v2 export engine.
  - [`_backups/`](file:///Users/steve/BigFolder/Edit&Prod/Scripting/School/LFPS_Substitutions_Manager/_backups): Dated `.tar.gz` snapshots before major bundle milestones.

---

## 2. Instructions for the Incoming Agent: How to Maintain This File & Project Docs

To ensure zero cognitive leakage when switching between AI instances or user accounts, follow this strict protocol:

### 2.1 The Five Pillars of Documentation

Whenever you touch the codebase, you must keep five documentation files synchronized:

1. **`CATCH_UP_TO_ME.md` (This File)**:
   - Log every completed user request and job bundle under Section 3 ("Chronological History of Work Completed").
   - Record: **What** was changed, **Why** it was necessary, **Where** (file paths and line numbers), **When** (timestamp/commit hash), and **How** it was resolved.
   - Update Section 5 ("Current Workspace State & Next Up Backlog") with active tasks.

2. **`TODO.md`**:
   - Number every new feature or bug cluster as a **Job Bundle** (e.g. Job Bundle 22, Job Bundle 23).
   - Use standardized task codes: `BUG-XX` (bug fixes), `FEAT-XX` (features), `PERF-XX` (performance).
   - Mark completed items with `[x]` and update the bundle status from `🟡 In Progress` to `🟢 Resolved`.

3. **`CHANGELOG.md`**:
   - Follow the [Keep a Changelog](https://keepachangelog.com/) standard under the active version `[v2.0.0-alpha.1]`.
   - Categorize entries into `### Added`, `### Changed`, `### Fixed`, or `### Performance`.

4. **`ARCHITECTURE.md`**:
   - If you introduce a new package, modify the WebSocket protocol, alter data contracts, or add a state store slice, update the system topology and Mermaid diagrams in `ARCHITECTURE.md`.

5. **`DESIGN_PHILOSOPHY.md`**:
   - Consult this file before making any UI, animation, or UX decisions. Maintain Apple HIG tactile standards: spring physics over linear transitions, zero travel distance, non-blocking front-desk velocity.

### 2.2 The 6-Step Agent Execution Cycle

For every task requested by the user:

```mermaid
flowchart TD
    A["1. Create Snapshot Backup in _backups/"] --> B["2. Formulate Job Bundle in TODO.md"]
    B --> C["3. Implement Code Changes with Zero Hacks"]
    C --> D["4. Verify: npm test && npm run build && prune assets/"]
    D --> E["5. Update Docs: TODO.md, CHANGELOG.md, CATCH_UP_TO_ME.md"]
    E --> F["6. Git Commit & Push strictly to origin/next-gen"]
```

1. **Snapshot Backup**:
   ```bash
   tar -czf _backups/LFPS_Substitutions_Manager_v2.0.0_<label>_$(date +%Y%m%d_%H%M%S).tar.gz --exclude="node_modules" --exclude=".git" --exclude="dist" --exclude="_backups" .
   ```
2. **Bundle Formulation**: Propose the work items as a numbered bundle in `TODO.md` before execution.
3. **Clean Implementation**: Avoid quick hacks. Separate core domain logic into `@lfps/core` and UI tokens into `@lfps/ui`.
4. **Verification**:
   - Run Vitest tests: `npm test`
   - Build production bundle: `npm run build`
   - Remove stale `.js` and `.css` files from `assets/` so GitHub Pages only serves active hashes.
5. **Sync Docs**: Update `TODO.md`, `CHANGELOG.md`, and append to `CATCH_UP_TO_ME.md`.
6. **Git Push**:
   ```bash
   git add -A
   git commit -m "feat/fix(...): description"
   git push origin next-gen
   ```

---

## 3. Chronological History of Everything Done (What, Why, Where, When, How)

### Milestone 1: Next-Gen Monorepo Migration & Pure Core Solver (`acc67c0`)
- **When**: 2026-10-17
- **Why**: The legacy project was a monolithic single-file HTML/JS app (`index.html` > 4,000 lines) with accumulated bugs, fragile DOM string manipulation, lack of tests, and severe performance bottlenecks.
- **Where**:
  - Created [`packages/core/`](file:///Users/steve/BigFolder/Edit&Prod/Scripting/School/LFPS_Substitutions_Manager/packages/core): Domain types ([`types/index.ts`](file:///Users/steve/BigFolder/Edit&Prod/Scripting/School/LFPS_Substitutions_Manager/packages/core/src/types/index.ts)), master seed timetable data ([`data/seed.ts`](file:///Users/steve/BigFolder/Edit&Prod/Scripting/School/LFPS_Substitutions_Manager/packages/core/src/data/seed.ts)), disambiguation helper ([`disambiguation/index.ts`](file:///Users/steve/BigFolder/Edit&Prod/Scripting/School/LFPS_Substitutions_Manager/packages/core/src/disambiguation/index.ts)), and deterministic substitution solver ([`solver/index.ts`](file:///Users/steve/BigFolder/Edit&Prod/Scripting/School/LFPS_Substitutions_Manager/packages/core/src/solver/index.ts)).
  - Created [`packages/ui/`](file:///Users/steve/BigFolder/Edit&Prod/Scripting/School/LFPS_Substitutions_Manager/packages/ui): Apple HIG spring tokens and semantic role palettes.
  - Created [`apps/web/`](file:///Users/steve/BigFolder/Edit&Prod/Scripting/School/LFPS_Substitutions_Manager/apps/web): Modern React 19 + TypeScript + Tailwind CSS application.
  - Created [`apps/server/`](file:///Users/steve/BigFolder/Edit&Prod/Scripting/School/LFPS_Substitutions_Manager/apps/server): Go 1.23 WebSocket Hub and Excelize v2 exporter.
- **How**: Built pure TypeScript domain logic with zero DOM dependencies and backed it with a 10-test Vitest suite covering cell parsing, disambiguation, candidate ranking, and auto-resolve.

---

### Milestone 2: Dynamic Island Day Bar & Symmetrical Spring Physics (`ef9cb95` $\to$ `e2d2730`)
- **When**: 2026-10-18 01:50 – 02:05 IST
- **Why**: The user wanted the top header to hide when scrolling down, morphing the day selector into an iOS-style "Dynamic Island" floating capsule at the top of the viewport. Tapping the capsule expands it into the full day selector; tapping outside collapses it.
- **Where**:
  - [`apps/web/src/components/Header.tsx`](file:///Users/steve/BigFolder/Edit&Prod/Scripting/School/LFPS_Substitutions_Manager/apps/web/src/components/Header.tsx)
- **How**:
  - Implemented `layoutId="dynamic-island-day-bar"` with Framer Motion.
  - Used symmetrical spring physics: `ISLAND_SPRING = { type: 'spring', duration: 0.6, bounce: 0.12 }` ensuring expand and collapse animations have equal timing and weight.
  - Added full-screen backdrop (`fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]`) so tapping anywhere outside instantly collapses the island.
  - Added relaxed 4.8s auto-collapse countdown when a day is tapped.
  - Pre-highlighted the selected day pill in blue from frame 1 to eliminate visual sliding glitches upon expansion.

---

### Milestone 3: Tab System Partitioning & Vertical Workstations (`b67e194`)
- **When**: 2026-10-18 02:26 IST
- **Why**: Vertically stacking the Routine Grid, Absence Roster, and Substitutions Register on mobile forced users to scroll past hundreds of pixels to reach the master routine. Furthermore, the absence roster was a cramped horizontal tray.
- **Where**:
  - Created [`apps/web/src/components/TabBar.tsx`](file:///Users/steve/BigFolder/Edit&Prod/Scripting/School/LFPS_Substitutions_Manager/apps/web/src/components/TabBar.tsx): Apple HIG floating dock at the bottom of the viewport with live badge counts (amber for uncovered slots, rose for absent teachers) and keyboard shortcuts (`1`, `2`, `3`).
  - Modified [`apps/web/src/App.tsx`](file:///Users/steve/BigFolder/Edit&Prod/Scripting/School/LFPS_Substitutions_Manager/apps/web/src/App.tsx): Partitioned layout into 3 dedicated views (`routine`, `substitutions`, `roster`).
  - Refactored [`apps/web/src/components/AbsenceRoster.tsx`](file:///Users/steve/BigFolder/Edit&Prod/Scripting/School/LFPS_Substitutions_Manager/apps/web/src/components/AbsenceRoster.tsx): Upgraded to a dedicated vertical staff workstation with operational hierarchy sorting:
    - **Academic Coordinator (AC)**: Mrs. R. Pahwa
    - **Assistant Academic Coordinator (AAC)**: Mrs. S. Lakra
    - **Class Teachers (CT)**: Mrs. M. Midha, Mrs. R. Narayan (Teal-bordered badges)
    - **Subject Teachers (ST)**: Ms. N. Horo, Ms. K. Sanga, Ms. P. Topno (Blue-bordered badges)
  - Refactored [`apps/web/src/components/SubstitutionsRegister.tsx`](file:///Users/steve/BigFolder/Edit&Prod/Scripting/School/LFPS_Substitutions_Manager/apps/web/src/components/SubstitutionsRegister.tsx): Reordered KPI cards to:
    1. **Covered Substitutions** (Green border)
    2. **Uncovered Slots** (Red border)
    3. **Officiating Staff** (Purple border)

---

### Milestone 4: Directional Hysteresis & Mobile Margin Reclamation (`98830b9`)
- **When**: 2026-10-18 02:42 IST
- **Why**:
  1. On mobile phones, partial scrolling caused the Header and Dynamic Island pill to flutter/glitch, fighting each other at the threshold.
  2. The routine table had excessive margins on mobile, making cells unnecessarily narrow.
- **Where**:
  - [`apps/web/src/components/Header.tsx`](file:///Users/steve/BigFolder/Edit&Prod/Scripting/School/LFPS_Substitutions_Manager/apps/web/src/components/Header.tsx#L120-L150)
  - [`apps/web/src/App.tsx`](file:///Users/steve/BigFolder/Edit&Prod/Scripting/School/LFPS_Substitutions_Manager/apps/web/src/App.tsx#L23)
  - [`apps/web/src/components/RoutineGrid.tsx`](file:///Users/steve/BigFolder/Edit&Prod/Scripting/School/LFPS_Substitutions_Manager/apps/web/src/components/RoutineGrid.tsx#L65-L72)
- **How**:
  - Implemented directional hysteresis accumulator (`deltaThreshold = 25px`) with a 400ms transition lock ref (`isTransitioningRef`), preventing state oscillations.
  - Reclaimed 45px+ of mobile viewport width by reducing `<main>` padding to `px-1.5` on mobile.
  - Tightened table columns to `min-w-[80px]` (faculty) and `min-w-[78px]` (period cells) with stacked class/subject typography (`parseCellSlot`).

---

### Milestone 5: Job Bundle 22 — Routine Fullscreen Workstation Hardening & Tab Overview Collapse Controls (`d9504eb`)
- **When**: 2026-10-18 03:00 IST
- **Why**:
  1. **`BUG-10`**: Clicking "Expand Grid" resulted in a completely blank screen on mobile and desktop.
  2. **`FEAT-38` & `FEAT-39`**: Mobile users needed a way to collapse the top overview panels (KPI statistics strips) in both the Substitutions and Staff Roster tabs to maximize vertical reading space.
- **Where**:
  - [`apps/web/src/App.tsx`](file:///Users/steve/BigFolder/Edit&Prod/Scripting/School/LFPS_Substitutions_Manager/apps/web/src/App.tsx#L17-L29)
  - [`apps/web/src/components/RoutineGrid.tsx`](file:///Users/steve/BigFolder/Edit&Prod/Scripting/School/LFPS_Substitutions_Manager/apps/web/src/components/RoutineGrid.tsx#L296-L379)
  - [`apps/web/src/components/SubstitutionsRegister.tsx`](file:///Users/steve/BigFolder/Edit&Prod/Scripting/School/LFPS_Substitutions_Manager/apps/web/src/components/SubstitutionsRegister.tsx#L130-L190)
  - [`apps/web/src/components/AbsenceRoster.tsx`](file:///Users/steve/BigFolder/Edit&Prod/Scripting/School/LFPS_Substitutions_Manager/apps/web/src/components/AbsenceRoster.tsx#L110-L170)
- **How**:
  - **`BUG-10` Root Architecture Fix**: 
    - The previous implementation used `createPortal(..., document.body)` inside a child component while `document.body.style.overflow = 'hidden'` was set. In mobile WebKit, parent transforms and overflow mutations collapsed the flex container height to 0px.
    - Solution: Hoisted Fullscreen Workstation rendering directly to the root in `App.tsx`:
      ```tsx
      if (isFitGrid) {
        return (
          <div className="fixed inset-0 h-screen h-[100dvh] w-screen bg-slate-950 flex flex-col p-2.5 sm:p-4 overflow-hidden z-[100] select-none">
            <RoutineGrid isFullscreen />
            <MicroContextMenu />
            <SubAvailabilityModal />
            <CoTeacherModal />
            <OfficiatingModal />
          </div>
        );
      }
      ```
    - In `RoutineGrid.tsx`, set the table wrapper to `flex-1 min-h-0 w-full overflow-auto`. Table renders with 100% reliability, zero containing block clipping, and pinned headers.
    - Added direct **MON · TUE · WED · THU · FRI · SAT** day selector pills right inside the fullscreen toolbar alongside the dual Teachers/Classes toggle and <kbd>Esc</kbd> dismissal.
  - **`FEAT-38` (Substitutions Tab Overview Collapse)**:
    - Added tactile toggle button `[ ▾ Collapse Overview ]` $\longleftrightarrow$ `[ ▸ Show Overview ]` to the header.
    - Wrapped the 3 KPI cards (Covered, Uncovered, Officiating Staff) in Framer Motion `<AnimatePresence>` with spring height animation (`duration: 0.22`), reclaiming ~140px on mobile while keeping search/filter pills accessible.
  - **`FEAT-39` (Staff Roster Tab Overview Collapse)**:
    - Added tactile toggle button `[ ▾ Collapse Overview ]` $\longleftrightarrow$ `[ ▸ Show Overview ]` to the header.
    - Wrapped the 4 attendance KPI cards in `<AnimatePresence>`, reclaiming ~160px+ of vertical space so staff cards are immediately visible.

### Milestone 6: Interactive Settings Console, Per-Tab Undo/Redo Engine & Global Reset Controls (Job Bundle 23)
- **When**: 2026-10-18
- **Why**:
  1. The header settings button only toggled `isMinimalUI` with no visual console or mobile entrypoint (`BUG-11`).
  2. The user required independent undo/redo functionality for each of the three tabs (Routine, Substitutions, Roster) without cross-tab state pollution (`FEAT-40`).
  3. The user requested a safe global reset button with undo support, plus a 500ms long-press / right-click action to purge all undo/redo history buffers across all tabs (`FEAT-41`).
- **Where**:
  - [`apps/web/src/store/useTimetableStore.ts`](file:///Users/steve/BigFolder/Edit&Prod/Scripting/School/LFPS_Substitutions_Manager/apps/web/src/store/useTimetableStore.ts): Added isolated `HistoryStack<T>` for `routineHistory`, `substitutionsHistory`, `rosterHistory`. Pushed undo snapshots to all mutating actions capped at 30 FIFO entries. Added `undo(tab)`, `redo(tab)`, `canUndo(tab)`, `canRedo(tab)`, `resetDay(day)`, `purgeHistory()`, and `isSettingsOpen` controls.
  - [`apps/web/src/components/SettingsModal.tsx`](file:///Users/steve/BigFolder/Edit&Prod/Scripting/School/LFPS_Substitutions_Manager/apps/web/src/components/SettingsModal.tsx): Created Apple HIG settings console with 5 grouped sections (Operating Identity / Staff login, Interface & GPU status, Live Cloud Sync & diagnostics, Data Management / Excel Export / Reset Day / Purge Buffers, About & version info).
  - [`apps/web/src/components/ResetDayButton.tsx`](file:///Users/steve/BigFolder/Edit&Prod/Scripting/School/LFPS_Substitutions_Manager/apps/web/src/components/ResetDayButton.tsx): Created tactile header reset button with single-click reset and 500ms long-press / right-click context menu to purge all undo/redo history.
  - [`apps/web/src/components/UndoRedoControls.tsx`](file:///Users/steve/BigFolder/Edit&Prod/Scripting/School/LFPS_Substitutions_Manager/apps/web/src/components/UndoRedoControls.tsx): Created reusable toolbar button pair (`[ ↶ Undo ]` / `[ ↷ Redo ]`) with live disabled state.
  - [`apps/web/src/components/Header.tsx`](file:///Users/steve/BigFolder/Edit&Prod/Scripting/School/LFPS_Substitutions_Manager/apps/web/src/components/Header.tsx): Integrated `ResetDayButton` and settings modal trigger for both desktop and mobile viewports.
  - [`apps/web/src/App.tsx`](file:///Users/steve/BigFolder/Edit&Prod/Scripting/School/LFPS_Substitutions_Manager/apps/web/src/App.tsx): Mounted `<SettingsModal />` and registered global `⌘Z` / `⌘⇧Z` / `Ctrl+Y` keyboard listener scoped dynamically to the active tab.
  - [`apps/web/src/components/RoutineGrid.tsx`](file:///Users/steve/BigFolder/Edit&Prod/Scripting/School/LFPS_Substitutions_Manager/apps/web/src/components/RoutineGrid.tsx), [`apps/web/src/components/SubstitutionsRegister.tsx`](file:///Users/steve/BigFolder/Edit&Prod/Scripting/School/LFPS_Substitutions_Manager/apps/web/src/components/SubstitutionsRegister.tsx), [`apps/web/src/components/AbsenceRoster.tsx`](file:///Users/steve/BigFolder/Edit&Prod/Scripting/School/LFPS_Substitutions_Manager/apps/web/src/components/AbsenceRoster.tsx): Embedded `<UndoRedoControls />` on each tab's toolbar.
- **How**:
  - Independent slices: each tab's history only captures the state belonging to that slice, ensuring undoing a substitution does not alter staff attendance marks or routine schedule.
  - `resetDay` captures an undo snapshot before clearing data, making accidental resets immediately undoable via `⌘Z` or the Undo button.
  - History purge popover provides safe confirmation before clearing past/future arrays.

### Milestone 7: Tactile Front-Desk Polish, Root Modals & Manual Sub Workflow (Job Bundle 24)
- **When**: 2026-10-18
- **Why**:
  1. Marking an absent teacher back to present left orphan substitutions active in the timetable (`BUG-12`).
  2. Right-clicking or long-pressing routine instructional cells mirrored the teacher absence context menu, blocking gesture freedom (`BUG-13`).
  3. Modals and menus (`StaffLoginModal`, `ResetPurgeContextMenu`) were nested inside transformed headers/buttons, creating CSS local containing block collisions that trapped or clipped popovers (`BUG-14`, `BUG-15`).
  4. Tab overview accordion collapse animation was jerky due to subpixel layout reflow jitter (`BUG-16`).
  5. `Away (Official)` staff needed to be counted and filtered under 'Free' in attendance roster metrics (`LOGIC-01`).
  6. Universal outside-click and <kbd>Escape</kbd> dismissal was required across all floating elements (`LOGIC-02`).
  7. Co-teachers in joint classes had asymmetric styling (`LOGIC-03`).
  8. Uncovered slots needed an interactive 1-tap substitute assignment modal (`FEAT-42`).
  9. Substitutions KPI cards needed reordering (1st Covered [green border], 2nd Uncovered [red border], 3rd Officiating Staff) (`FEAT-43`).
  10. Overview collapse ergonomics required a rightmost-aligned icon button and empty header space tap trigger (`FEAT-44`).
- **Where**:
  - [`packages/core/src/solver/index.ts`](file:///Users/steve/BigFolder/Edit&Prod/Scripting/School/LFPS_Substitutions_Manager/packages/core/src/solver/index.ts): Added `extractClassSections`, `areTeachersCoTeachingPartners`, and `isTeacherCoTeachingInSlot` (`LOGIC-03`). Passed 11/11 Vitest tests in `packages/core/test/solver.test.ts`.
  - [`apps/web/src/store/useTimetableStore.ts`](file:///Users/steve/BigFolder/Edit&Prod/Scripting/School/LFPS_Substitutions_Manager/apps/web/src/store/useTimetableStore.ts): In `toggleAbsence`, automatically scans and purges all substitutions involving the teacher when untoggling absence (`BUG-12`). Added store slice for `isStaffLoginOpen`, `activeResetPurgeMenu`, and `activeAssignSubSlot`.
  - [`apps/web/src/components/StaffLoginModal.tsx`](file:///Users/steve/BigFolder/Edit&Prod/Scripting/School/LFPS_Substitutions_Manager/apps/web/src/components/StaffLoginModal.tsx): Created standalone root modal resolving `BUG-14`.
  - [`apps/web/src/components/ResetPurgeContextMenu.tsx`](file:///Users/steve/BigFolder/Edit&Prod/Scripting/School/LFPS_Substitutions_Manager/apps/web/src/components/ResetPurgeContextMenu.tsx): Created standalone root context menu with screen-space edge clamping resolving `BUG-15`.
  - [`apps/web/src/components/AssignSubstituteModal.tsx`](file:///Users/steve/BigFolder/Edit&Prod/Scripting/School/LFPS_Substitutions_Manager/apps/web/src/components/AssignSubstituteModal.tsx): Created candidate substitute selection drawer ranking candidates using `findAvailableSubstitutes` (`FEAT-42`).
  - [`apps/web/src/components/RoutineGrid.tsx`](file:///Users/steve/BigFolder/Edit&Prod/Scripting/School/LFPS_Substitutions_Manager/apps/web/src/components/RoutineGrid.tsx): Scoped `MicroContextMenu` strictly to teacher column (`BUG-13`); applied `isTeacherCoTeachingInSlot` for co-teacher visual parity (`LOGIC-03`).
  - [`apps/web/src/components/AbsenceRoster.tsx`](file:///Users/steve/BigFolder/Edit&Prod/Scripting/School/LFPS_Substitutions_Manager/apps/web/src/components/AbsenceRoster.tsx): Categorized `Away (Official)` under 'Free' (`LOGIC-01`), rightmost collapse icon and header free space trigger (`FEAT-44`), smooth spring easing with `SPRING_TRANSITIONS.snappy` (`BUG-16`).
  - [`apps/web/src/components/SubstitutionsRegister.tsx`](file:///Users/steve/BigFolder/Edit&Prod/Scripting/School/LFPS_Substitutions_Manager/apps/web/src/components/SubstitutionsRegister.tsx): Reordered KPI cards to Covered (green border) -> Uncovered (red border) -> Officiating Staff (`FEAT-43`); added 1-tap `[ Assign Substitute ]` trigger on uncovered cards (`FEAT-42`); smooth spring easing and header ergonomics (`FEAT-44`, `BUG-16`).
  - [`apps/web/src/App.tsx`](file:///Users/steve/BigFolder/Edit&Prod/Scripting/School/LFPS_Substitutions_Manager/apps/web/src/App.tsx): Mounted `<StaffLoginModal />`, `<ResetPurgeContextMenu />`, and `<AssignSubstituteModal />` at root in both fullscreen and normal modes.
- **How**:
  - Elimination of CSS transform containing block traps: Modals and context menus rendered at root level in `App.tsx` are immune to ancestor CSS transforms (`will-change-transform`, `translate3d`).
  - Buttery 120fps GPU accordion collapse: Outer animating container uses `overflow-hidden will-change-[height,opacity]`, with inner padding isolated to child containers to prevent subpixel jumping.
  - Universal outside-click and <kbd>Escape</kbd> dismissal across all modals and popovers (`LOGIC-02`).

### Milestone 8: Tactical Matrix Ergonomics, Header Peek Navigation & Golden CT Tokens (Job Bundle 25)
- **When**: 2026-10-18
- **Why**:
  1. Scrolling down on mobile hid the entire header, making it cumbersome to reach Reset Day, Settings, or Login without scrolling all the way back up (`FEAT-52`).
  2. The mobile browser address bar expansion/collapse fought with custom header animation, creating a jerky double jump on Chromium, Safari, Firefox, Opera, and Edge (`FEAT-57`).
  3. On narrow screens, wide sticky teacher name columns squished the instructional period columns, impairing readability (`FEAT-53`).
  4. Absent teachers in the routine matrix were difficult to spot at a glance during morning reviews (`FEAT-54`).
  5. Front desk staff needed an option to hide absent teachers to focus on present faculty (`FEAT-55`).
  6. Class Teachers needed distinct Golden/Amber role color coding (`#f59e0b`) instead of Teal, while preserving Royal Violet (`#8b5cf6`) for Academic Coordinators (`FEAT-56`).
  7. Substitutions and Roster workstations lacked List vs Grid view modes and multi-criteria sorting (`FEAT-58`).
  8. Missing "Add to Home Screen" PWA install button and Apple-grade iOS Safari guidance (`FEAT-59`).
  9. User view preferences were lost on reload and lacked an explicit Save / Reset mechanism (`FEAT-60`).
  10. Minimal UI Mode had no visual effect on component density (`BUG-17`).
  11. Settings needed a preference toggle to collapse tab overviews by default on startup (`FEAT-45`).
- **Where**:
  - [`packages/ui/src/tokens.ts`](file:///Users/steve/BigFolder/Edit&Prod/Scripting/School/LFPS_Substitutions_Manager/packages/ui/src/tokens.ts): Updated `COLOR_ROLES.classTeacher` base to `#f59e0b` (Golden Amber) with dark text `#fbbf24` and matching bg/border (`FEAT-56`).
  - [`apps/web/src/store/useTimetableStore.ts`](file:///Users/steve/BigFolder/Edit&Prod/Scripting/School/LFPS_Substitutions_Manager/apps/web/src/store/useTimetableStore.ts): Added `hideOverviewsByDefault`, `hideAbsentStaff`, `substitutionsViewMode`, `rosterViewMode`, `substitutionsSortBy`, `rosterSortBy` to store state with auto-persistence and explicit `savePreferences()` and `resetPreferences()` (`FEAT-45`, `FEAT-55`, `FEAT-58`, `FEAT-60`).
  - [`apps/web/src/components/Header.tsx`](file:///Users/steve/BigFolder/Edit&Prod/Scripting/School/LFPS_Substitutions_Manager/apps/web/src/components/Header.tsx): Implemented Peek Header Console (`isPeekMode = currentScrollY > 50`) providing instant access to Reset Day, Settings, PWA Install, Excel, and Staff Login; added `window.visualViewport` resize listener with hysteresis to eliminate mobile address-bar double jump (`FEAT-52`, `FEAT-57`, `FEAT-59`).
  - [`apps/web/src/components/AddToHomeScreenModal.tsx`](file:///Users/steve/BigFolder/Edit&Prod/Scripting/School/LFPS_Substitutions_Manager/apps/web/src/components/AddToHomeScreenModal.tsx): Created standalone PWA installation and iOS Safari 3-step walkthrough modal (`FEAT-59`).
  - [`apps/web/src/components/RoutineGrid.tsx`](file:///Users/steve/BigFolder/Edit&Prod/Scripting/School/LFPS_Substitutions_Manager/apps/web/src/components/RoutineGrid.tsx): Added horizontal scroll observer collapsing sticky column to ~64px with 2-line split font on narrow viewports (`FEAT-53`); highlighted absent teachers in bold crimson red (`bg-rose-950/90 border-r-2 border-r-rose-500 text-rose-200`) (`FEAT-54`); added "Hide Absent" interactive toggle button in controls toolbar (`FEAT-55`); styled Class Teachers with golden amber badges (`FEAT-56`); wired `isMinimalUI` density classes (`BUG-17`).
  - [`apps/web/src/components/AbsenceRoster.tsx`](file:///Users/steve/BigFolder/Edit&Prod/Scripting/School/LFPS_Substitutions_Manager/apps/web/src/components/AbsenceRoster.tsx): Implemented Grid (`[ ⊞ Grid ]`) and List (`[ ☰ List ]`) views; added sorting pills for Role Hierarchy vs Alphabetical Name (`FEAT-58`); updated CT badge to golden amber (`FEAT-56`); initialized `isOverviewCollapsed` with `hideOverviewsByDefault` (`FEAT-45`); wired `isMinimalUI` density classes (`BUG-17`).
  - [`apps/web/src/components/SubstitutionsRegister.tsx`](file:///Users/steve/BigFolder/Edit&Prod/Scripting/School/LFPS_Substitutions_Manager/apps/web/src/components/SubstitutionsRegister.tsx): Implemented Grid and List views with Period, Name, and Role sorting (`FEAT-58`); styled Class Teacher uncovered and covered cards with golden amber tokens (`FEAT-56`); initialized `isOverviewCollapsed` with `hideOverviewsByDefault` (`FEAT-45`); wired `isMinimalUI` density classes (`BUG-17`).
  - [`apps/web/src/components/SettingsModal.tsx`](file:///Users/steve/BigFolder/Edit&Prod/Scripting/School/LFPS_Substitutions_Manager/apps/web/src/components/SettingsModal.tsx): Added toggles for "Minimal UI Mode", "Hide Overviews by Default", and "Hide Absent Teachers in Routine Matrix"; added "Save Preferences" and "Reset Defaults" actions (`FEAT-60`); integrated "Add to Home Screen / Install App" trigger (`FEAT-59`).
  - [`apps/web/src/components/TabBar.tsx`](file:///Users/steve/BigFolder/Edit&Prod/Scripting/School/LFPS_Substitutions_Manager/apps/web/src/components/TabBar.tsx): Wired `isMinimalUI` density padding (`BUG-17`).
- **How**:
  - `splitTeacherName` utility parses teacher initials and surname into clean 2-line stacked badges on horizontal scroll.
  - Viewport-aware scroll synchronization suppresses scroll delta accumulation when `visualViewport` height changes during mobile URL bar expansion/collapse.
  - Automatic `localStorage` preferences persistence with explicit UI control prevents state desynchronization across sessions.

---

## 4. Key Files Map & System Architecture

```
LFPS_Substitutions_Manager/
├── ARCHITECTURE.md                  # Detailed monorepo topology & Mermaid architecture diagrams
├── CATCH_UP_TO_ME.md                # THIS FILE: Narrative transfer log & agent handover manual
├── CHANGELOG.md                     # Semantic version release notes (Keep a Changelog format)
├── DESIGN_PHILOSOPHY.md             # Apple HIG standards, spring physics, and UX velocity heuristics
├── TODO.md                          # Numbered Job Bundles, work items, and queued backlog
├── index.html                       # Production GitHub Pages hydration entrypoint
├── assets/                          # Compiled CSS & JS bundles (keep pruned of stale hashes)
├── _backups/                        # Pre-bundle snapshot tarballs
│
├── packages/
│   ├── core/                        # Pure TypeScript domain & solver logic
│   │   ├── src/
│   │   │   ├── types/index.ts       # Domain contracts (Teacher, Schedule, Substitution, Absence)
│   │   │   ├── data/seed.ts         # Master baseline timetable & teacher directory
│   │   │   ├── disambiguation/      # Teacher disambiguation (same-name resolver)
│   │   │   └── solver/index.ts      # Deterministic substitution solver & auto-resolve engine
│   │   └── test/solver.test.ts      # 11 Vitest tests (run via `npm test`)
│   │
│   └── ui/                          # Apple HIG Design Tokens
│       └── src/index.ts             # Springs (snappy, smooth, fluid), glassmorphism presets, color palettes
│
└── apps/
    ├── web/                         # React 19 + Vite 6 PWA
    │   ├── src/
    │   │   ├── App.tsx              # Root app component (handles Fullscreen Workstation & tab switcher)
    │   │   ├── store/useTimetableStore.ts # Central Zustand store with reactive state & isolated undo/redo
    │   │   ├── hooks/useLiveSync.ts # Full-duplex WebSocket client with optimistic broadcast
    │   │   └── components/
    │   │       ├── TabBar.tsx       # Floating Apple-grade navigation dock
    │   │       ├── Header.tsx       # Elevated console & Dynamic Island Day Bar
    │   │       ├── RoutineGrid.tsx  # Dual-view matrix (Teachers/Classes) & Fullscreen workstation
    │   │       ├── SubstitutionsRegister.tsx # Daily substitutions ledger & collapsible KPI strip
    │   │       ├── AbsenceRoster.tsx# Vertical staff workstation with hierarchy sorting
    │   │       ├── SettingsModal.tsx# Apple HIG 5-section console (Identity, GPU, Cloud, Data, Version)
    │   │       ├── ResetDayButton.tsx# Tactile reset button with 500ms history purge long-press
    │   │       ├── UndoRedoControls.tsx# Reusable tab-scoped undo & redo button pair
    │   │       ├── MicroContextMenu.tsx # Ultra-compact popover (Mark Absent / Free from Sub)
    │   │       ├── SubAvailabilityModal.tsx # Hero staff duty and unavailability dialog
    │   │       ├── CoTeacherModal.tsx # Per-period co-teacher release inspector
    │   │       ├── OfficiatingModal.tsx # Temporary Off. CT & Off. AC designation modal
    │   │       ├── StaffLoginModal.tsx # Root-mounted staff identity selector (BUG-14)
    │   │       ├── ResetPurgeContextMenu.tsx # Root-mounted screen-clamped history purge menu (BUG-15)
    │   │       ├── AssignSubstituteModal.tsx # Interactive candidate substitute selector (FEAT-42)
    │   │       └── AddToHomeScreenModal.tsx # PWA install & iOS Safari guidance modal (FEAT-59)
    │   └── package.json
    │
    └── server/                      # Go 1.23 Cloud Microservice
        ├── cmd/server/main.go       # Entrypoint (Port 8080 or PORT env)
        └── internal/
            ├── ws/hub.go            # Full-duplex WebSocket hub
            └── excel/exporter.go    # Excelize v2 XLSX export engine with navy branding
```

---

## 5. Current Workspace State & Next Up Backlog

### Current Git State
- **Branch**: `next-gen`
- **Head Commit**: Job Bundle 25 Complete (`FEAT-52`, `FEAT-57`, `FEAT-53`, `FEAT-54`, `FEAT-55`, `FEAT-56`, `FEAT-58`, `FEAT-59`, `FEAT-60`, `BUG-17`, `FEAT-45`)
- **Working Tree**: Clean.
- **All Unit Tests**: 11/11 Passing (`npm test`).
- **Production Build**: Passes cleanly (`npm run build`).

### Queued Future Backlog (In Order of Priority)

1. **Job Bundle 26: Leadership Chain of Command, Dedicated CT Auto-Resolve & Attention Pulse (ACTIVE NEXT)**:
   - **`LOGIC-04` (Academic Coordinator Succession & Officiating Workflow)**: Automatic chain of command: When AC (Mrs. R. Pahwa) is absent, the Assistant Academic Coordinator (AAC, Mrs. S. Lakra) automatically acts on their behalf as Officiating AC (`Off. AC`). Only if BOTH AC and AAC are absent does the system require appointing a 3rd-party Officiating AC. Surfaces in Substitutions tab as a dedicated officiating duty card with manual selection. Flashes the Substitutions and Staff Roster navigation tabs with a soft pulsing amber glow (`@keyframes attentionPulse`) when an Off. AC needs appointment.
   - **`LOGIC-05` (Dedicated Class Teacher Auto-Resolve & Golden Substitution Cards)**: In `SubstitutionsRegister.tsx`, add a dedicated `[ ⚡ Auto-Resolve CT ]` button that specifically resolves uncovered slots for absent Class Teachers. Render all CT substitution cards in golden / amber styling. Flashes the Sub and Roster tabs with a soft pulsing amber glow when a CT is absent or has uncovered slots.
   - **`SEC-01` (Three-Tier Role-Based Access Control Architecture: Admin, Teacher, Guest)**: Universal rights segregation before drawing any logical element. Admin (full master routine, baseline reset, history purge, solver policy), Teacher (view own schedule, accept/dispute own substitutions, edit own availability remark), and Guest (read-only viewer). Build `<PermissionGuard>` and `canPerform(action, role)` checking before rendering action buttons or executing mutations.
   - **`FEAT-49` (Teacher Substitution Acceptance & Dispute Workflow)**: Logged-in teacher cards display inline `[ ✓ Accept ]` and `[ ⚑ Dispute ]` with optional reason remark field, notifying AC / AAC.
   - **`FEAT-50` (Universal Notification Center & Live Alert Hub)**: Header Bell icon with live notice counter pill opening `NotificationCenterModal.tsx`.

2. **Job Bundle 27: Auto-Resolve Brain Studio, Theme Engine & Developer Options**:
   - **`FEAT-61` (Auto-Resolve Brain Studio & Solver Policy Configuration)**: Head-with-Brain icon (`Brain`) in Substitutions tab opening Policy Studio: criteria weighting (Same Subject, Same Class, Different Class), assignment sequence (Class Teachers First vs. Subject Teachers First), and subject-specific priority overrides.
   - **`FEAT-46` (Complete 12-Theme Engine Adapted from THEMES.md)**: Implement CSS token system for all 12 themes across Minimalist Light, Minimalist Night, Glass Materials, and Studio families with instant preview.
   - **`FEAT-47` (Hidden Settings & Developer Options Restoration)**: Restore hidden Developer Options panel (5-tap on version row) with relocated cloud sync diagnostics, same-period lock toggle, target cell halo pulse toggle/colors, countdown timer, and undo/redo icon style selector.

3. **Job Bundle 28: Unified Cloud & Google Sheets 2-Way Live Sync Engine**:
   - **`FEAT-51A` (Inbound Routine Sync from Google Sheets CSV)**: Pull master schedule diffs from Google Sheets (`/gviz/tq?tqx=out:csv&sheet=OVERVIEW`) with review modal.
   - **`FEAT-51B` (Outbound Daily Ledger Push to Google Sheets)**: Push today's substitutions ledger to Google Sheets via Google Apps Script Web App webhook (`/exec`).
   - **`FEAT-48` (Production Two-Way Full-Duplex Cloud Sync)**: Real-time WebSocket synchronization with Go backend (`/ws`) for sub-millisecond multi-device state updates.

4. **Job Bundle 29: Routine Matrix Drag-and-Drop Reordering & Dedicated Class Context Menu**:
   - **`FEAT-37A` & `FEAT-37B`**: Routine cell drag-and-drop reordering with undo/redo integration and dedicated Class View context menu.
   - **`FEAT-22`, `FEAT-23`, `FEAT-24`**: Substitution Register interactive column sorting chevrons, desktop/mobile responsive width, and column consolidation.

---

## 6. Commands Reference Cheat-Sheet

| Action | Command |
| :--- | :--- |
| **Run Unit Tests** | `npm test` |
| **Run Full Monorepo Build** | `npm run build` |
| **Dev Mode (Frontend)** | `npm run dev --workspace=@lfps/web` |
| **Create Snapshot Backup** | `tar -czf _backups/LFPS_Substitutions_Manager_v2.0.0_<label>_$(date +%Y%m%d_%H%M%S).tar.gz --exclude="node_modules" --exclude=".git" --exclude="dist" --exclude="_backups" .` |
| **Clean Stale Hashed Assets** | `rm assets/index-*.js assets/index-*.css` (before copying newly built dist assets) |
| **Check Git Status** | `git status` |
| **Push Changes** | `git push origin next-gen` *(NEVER push to `main`)* |

---
*Maintained with pride under Apple HIG standards for Little Flower Preparatory School.*




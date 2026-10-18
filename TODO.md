# LFPS Substitutions Manager — Task & Todo Tracker

This tracker maintains active, upcoming, and future tasks for the **Front Desk PWA**.

> [!IMPORTANT]
> **Terminology Standard**: Do NOT use the informal term `offCT`. Always use **Officiating Class Teacher**, abbreviated as **Off. CT.**. Similarly, use **Officiating AC**, abbreviated as **Off. AC**.


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
- **Status**: 🔴 Open
- **Reported**: When assigned as Officiating Class Teacher (`Off. CT.`), the teacher is appointed for the entire day, not period-by-period. The Auto-Resolve solver must also assign coverage on this whole-day basis (the designated Off. CT covers the absent CT's class for all periods of that day rather than period-by-period scattering).
- **Target Solution**:
  - Anchor Officiating CT appointments in `@lfps/core` and `useTimetableStore.ts` as whole-day section appointments.
  - In `autoResolveSubstitutions()`, prioritize assigning the designated Off. CT across all uncovered periods of that absent CT's class before dispersing remaining periods to external substitutes.


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

### Job Bundle 26B: Three-Tier RBAC Architecture & Teacher Substitution Dispute Workflow
- **Status**: 🔴 Queued (Next Up - Max 2 items)
- **Scope & Work Items**:
  - [ ] **SEC-01 (Three-Tier Role-Based Access Control Architecture: Admin, Teacher, Guest)**:
    - Strict rights segregation before drawing any logical element:
      1. **`Admin` (Full Rights)**: Can edit master routine, assign substitutions, baseline reset, purge history, configure solver policy, and appoint officiating roles.
      2. **`Teacher` (Logged-In Identity Rights)**: Can view personal duty schedule, accept/dispute their own substitutions, edit their own availability remark. Cannot modify baseline routine, reset days, or purge history.
      3. **`Guest` (Viewer Rights)**: Read-only inspection of routine matrix, substitutions register, and roster. Destructive mutations and dispute actions are suppressed.
    - Build `<PermissionGuard requiredRole={...}>` and `canPerform(action, role)` helper checking permissions before rendering action buttons or executing store mutations.
  - [ ] **FEAT-49 (Teacher Substitution Acceptance & Dispute Workflow)**:
    - In `SubstitutionsRegister.tsx` (and dedicated teacher schedule view), when a teacher is logged in (`loggedInTeacher`), any substitution duty assigned to them displays an interactive decision pod:
      - `[ ✓ Accept ]`: Marks the substitution status as `ACCEPTED`, highlights the duty in emerald green, locks the slot, and dispatches an acceptance notice.
      - `[ ⚑ Dispute ]`: Expands an inline tactile micro-remark textbox (`"Reason for dispute (optional, e.g. Lab duty, Library inventory)"`) with `[ Confirm Dispute ]` and `[ Cancel ]`.
      - On confirm, marks the substitution status as `DISPUTED` (amber/rose badge), stores the dispute remark, and automatically dispatches a high-priority alert to the leadership chain: Academic Coordinator (Mrs. R. Pahwa), Assistant AC (Mrs. S. Lakra), or designated Officiating AC.

### Job Bundle 26C: Nomenclature Simplification & School Overview Headings
- **Status**: 🔴 Queued (Max 2 items)
- **Scope & Work Items**:
  - [ ] **TERMS-01 (Nomenclature Simplification: Eliminate 'Team', Standardize CT & 2nd Teacher)**:
    - Do away with 'Team' nomenclature entirely across UI copy, labels, tooltips, modals, and codebase.
    - Teachers in a class are strictly referred to as **Class Teacher** (CT) and **2nd Teacher** (2T).
    - If another teacher assists with class work, refer to them as **"part of a class"** (handling work in the class, but not necessarily CT or 2T).
  - [ ] **UI-01 (Human School Overview Headings: Substitutions Overview & Staff Roster Overview)**:
    - Replace overly technical overview headings that do not fit a school environment with simple, friendly titles:
      - Substitutions tab: Change *"Substitution Register & Coverage Engine"* $\to$ **"Substitutions Overview"** (e.g. `Substitutions Overview (MON)`).
      - Staff Roster tab: Change *"Staff Roster Matrix & Availability Register"* $\to$ **"Staff Roster Overview"** (e.g. `Staff Roster Overview (MON)`).

### Job Bundle 26D: Effortless Absence Marking & Staff Full Name Display
- **Status**: 🔴 Queued (Max 2 items)
- **Scope & Work Items**:
  - [ ] **LOGIC-06 (Effortless Absence Marking: Whole Card Free Space Tap to Toggle Absent)**:
    - Make marking absent easier for the front desk: tapping anywhere in the free / unoccupied space of a staff card toggles attendance (`Mark Absent` ⟷ `Mark Present`).
    - Applies to both **Grid Card View** and **List View** in `AbsenceRoster.tsx`.
    - Guard child interactive buttons/popovers (`e.stopPropagation()`) so clicking Off. CT, Availability, or Duty chips does not trigger attendance toggle.
  - [ ] **UI-02 (Staff Card Name Display: Full Name Directly, Abbreviation Only on Narrow Screens)**:
    - Staff cards must display the teacher's full name directly (`teacher.fullName`).
    - Only on narrow / mobile viewports compress/fallback to abbreviation (`teacher.abbr`) via responsive CSS classes / container queries (`hidden sm:inline`, `sm:hidden`).

### Job Bundle 26E: Officiating Class Teacher Whole-Day Assignment & Solver Alignment
- **Status**: 🔴 Queued (Max 2 items)
- **Scope & Work Items**:
  - [ ] **BUG-18 (Officiating CT Whole-Day Assignment & Auto-Resolve Alignment)**:
    - When assigned as Officiating Class Teacher (`Off. CT.`), the appointment is for the entire day, not period-by-period.
    - Auto-Resolve solver must prioritize and assign coverage on this whole-day basis for the designated Off. CT across the absent CT's timetable.

### Job Bundle 26F: Universal Notification Center & Live Alert Hub
- **Status**: 🔴 Queued
- **Scope & Work Items**:
  - [ ] **FEAT-50 (Universal Notification Center & Live Alert Hub)**:
    - Add an Apple HIG Notification Bell button (`🔔`) to `Header.tsx` with a live reactive notice counter pill (`notif-badge`).
    - Build `NotificationCenterModal.tsx`: an elevated slide-over drawer / floating modal aggregating real-time operational notices:
      1. **Disputes (`⚑`)**: Alerts when a teacher disputes a substitution with their name, period, class, remark, and a 1-tap `[ Reassign Sub ]` action.
      2. **Timetable Clashes & Conflicts (`⚠️`)**: Real-time warnings when a teacher is double-booked across sections.
      3. **Uncovered Period Warnings (`🕒`)**: Alerts for unassigned substitution duties.
      4. **Officiating Leadership Prompts (`⭐` / `🏫`)**: Reminders when AC or CT are absent and require temporary officiating assignment.
      5. **Acceptance Receipts (`✓`)**: Notices when a teacher confirms and accepts their duty.
    - Provide 1-tap "Mark All as Read", clear individual notices, and outside-click / <kbd>Esc</kbd> dismissal.

### Job Bundle 27: Auto-Resolve Brain Studio, Theme Engine & Developer Options
- **Status**: 🔴 Queued
- **Scope & Work Items**:
  - [ ] **FEAT-61 (Auto-Resolve Brain Studio & Solver Policy Configuration)**:
    - In the Substitutions tab header (beside the Auto-Resolve button), add an intelligent Head-with-Brain icon (`Brain` from `lucide-react`).
    - Tapping opens the **Auto-Resolve Policy & Heuristics Studio**:
      - **Criteria Weighting**: Configure priority sliders for *Same Subject Match*, *Same Class / Department Alignment*, and *Different Class Fair-Share*.
      - **Assignment Sequence**: Order of allocation toggle (*Class Teachers First* vs. *Subject Teachers First*).
      - **Subject-Specific Priority Overrides**: Add custom subject assignment rules (e.g. *"For Mathematics, prioritize Teacher X"*, *"For Science, prioritize Teacher Y"*).
    - Wire solver policies directly into `@lfps/core`'s `calculateCandidateAffinity` and auto-resolve engines.
  - [ ] **FEAT-46 (Complete 12-Theme Engine Adapted from THEMES.md)**:
    - Implement CSS token engine supporting all 12 curated themes across 4 design families:
      1. ☀️ **Minimalist Light**: `system`, `light` (iOS Light), `warm-sepia` (Warm Sepia / Parchment).
      2. 🌙 **Minimalist Night**: `dark` (iOS Dark), `midnight` (Midnight OLED), `slate-nord` (Slate Nord).
      3. 🪟 **Glass Materials**: `utopian-glass`, `utopian-night`, `aero-frost`, `cyber-glass`, `retro-glass`.
      4. 🔲 **Studio & Accessibility**: `high-contrast`.
    - Provide 1-tap theme selector in Settings with visual swatches and instant live preview.
  - [ ] **FEAT-47 (Hidden Settings & Developer Options Restoration)**:
    - Restore hidden Developer Options panel (unlocked via 5-tap on Settings version row or developer toggle):
      - Relocate Cloud Sync connection diagnostics, live latency meter, and manual reconnect button into Dev Options.
      - Cross-Period substitution policy toggle (`samePeriodLock`, default `true`).
      - Target cell halo pulse indicator toggle (`subHaloIndicator`) and color palette selector (`Emerald`, `Neon Cyan`, `Amber`, `Violet`).
      - Acceptance countdown timer toggle and duration selector (`5s`, `10s`, `30s`, `60s`).
      - Mobile undo/redo icon style selector (`Curved`, `Circular`, `Geometric`, `Micro-Text`).

### Job Bundle 28: Unified Cloud & Google Sheets 2-Way Live Sync Engine
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


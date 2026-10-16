# LFPS Substitutions Manager — Task & Todo Tracker

This tracker maintains active, upcoming, and future tasks for the **Front Desk PWA**.

> [!IMPORTANT]
> **Terminology Standard**: Do NOT use the informal term `offCT`. Always use **Officiating Class Teacher**, abbreviated as **Off. CT.**. Similarly, use **Officiating AC**, abbreviated as **Off. AC**.


## 🐛 Critical Bug & Performance Tracker

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

### PERF-01: Master Routine Initial Render Stutter & In-Memory Pre-Render ("Keep-Warm" Engine)
- **Status**: 🔴 Open
- **Reported**: The Master Routine table draws noticeably slow / stutters when the page is first loaded and scrolled down into view.
- **Target Solution**:
  - [ ] **Instant Offscreen Pre-rendering on Load**: Instead of waiting for first scroll or deferred triggers, immediately construct and render the full Master Routine table DOM tree into memory during initial app boot (or via `requestIdleCallback`) before user scrolls.
  - [ ] **In-Memory DOM "Keep-Warm" Cache**: Keep the rendered routine table alive in memory. Avoid destroying and rebuilding `table.innerHTML` from scratch during routine refreshes or tab transitions; use targeted DOM node reconciliation (patch only modified cells).
  - [ ] **Periodic Background Sync & Selective Diff Patching**: Keep routine rendered and run background poll for Google Sheet cloud updates, selectively updating only cells with actual diffs (`calculateScheduleDiffs`), eliminating full-table redraw lag.
  - [ ] **Compositor & Layer Optimization**: Keep `contain: paint layout` and GPU layer promotion (`transform: translateZ(0)`) warm so scrolling onto the table has zero frame drops.

### BUG-06: Substitutions Page Failure — Missing Teacher Names & Auto-Resolve Inoperative
- **Status**: 🔴 Open / Critical
- **Reported**: On the Substitutions tab (`#tab-substitutions` / Daily Substitution Register), teacher names are not rendering or visible, and the Smart Auto-Resolve solver (`#auto-resolve-btn` / `performAutoResolve`) is failing to execute.
- **Target Solution**:
  - [ ] **Audit `renderSubstitutions()`**:
    - Verify data extraction and DOM generation for absent teachers and assigned substitutes in `.sub-register-table`.
    - Fix color/contrast and text-clipping issues that may cause teacher names to appear invisible or blank across themes and responsive viewports.
  - [ ] **Audit `performAutoResolve()` & `generateStrategySolution()`**:
    - Fix runtime exceptions in `generateStrategySolution` (e.g. safeguarding `simSchedule[period]` object initialization, undefined dereferencing, and affinity checks).
    - Ensure `#auto-resolve-modal` correctly renders 3 solver proposals (`Subject Match`, `Balanced Load`, `Minimal Splits`) and applies assignments cleanly.

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
  - [ ] **Ergonomic Speed-of-Light Zero-Travel UI Architecture**:
    - Avoid excessive hand/mouse travel distances across the interface.
    - Anchor contextual micro-actions directly adjacent to cursor/touch targets; eliminate disruptive full-screen modals for quick micro-actions.
  - [ ] **Routine Header Right-Alignment**:
    - Right-align Fit-Grid button (`#fit-grid-toggle-btn`) and Hide Absent toggle (`#hide-absent-toggle-wrapper`) to the far right of the routine header bar, balancing the pinned view select on the left.
  - [ ] **Context Menu for Reset Button History Purge**:
    - Replace the disruptive `#history-purge-modal` popup on right-click / 500ms long-press of `#reset-schedule-btn` and `#more-item-reset` with a sleek, anchored Apple-style context popover right beside the button (`[ 🗑 Purge Action History ]`).
  - [ ] **Grid Scroll Panel De-Obstruction Assessment**:
    - Evaluate taking the routine table out of the nested `.table-scroll-container` scroll panel to prevent nested scrollbar traps.
    - Test natural page/document scrolling while preserving sticky header rows and sticky teacher columns intact across viewports.
  - [ ] **Settings Section & Control Relocations**:
    - **Developer Options to Very Bottom**: Move the entire Developer Options card to the absolute bottom of Settings (below "About & Guides").
    - **Same-Period Lock to Regular Settings**: Move `samePeriodLock` toggle back to "General & Policies" since it actively blocks users by default.
    - **Same-Period Lock Toast Polish**: Make the rejection toast punchy/concise and increase display duration (or offer an interactive prompt) so coordinators can comfortably read why the cross-period drop was rejected.
    - **Shift "Allow Disputes" to Developer Options**: Move `allowDisputes` toggle out of General & Policies into Developer Options.
    - **Shift Google Sheets URL Input to Developer Options**: Move `#sheets-url-input` and Save URL button into Developer Options, keeping standard Cloud Sync focused on clean connection status, manual Push, and Sync triggers.
    - **Shift Test Simulations to Developer Options**: Move `#btn-simulate-day` and `#btn-simulate-complex` out of Timetable Data into Developer Options.
  - [ ] **iOS & Ableton Live Inspired Theme Menus**:
    - Redesign the theme selector taking inspiration from iOS settings and Ableton Live's minimalist color themes.
    - Build sleek visual palette chips/swatches displaying true UI background, card surface, and accent/tint colors.
    - Group into cohesive families (`Light`, `Dark`, `Glass Refraction`, `High Contrast`) with instant live-preview on tap, eliminating bulky standard `<select>` dropdowns.
  - [ ] **Live Timetable Conflict Pill**:
    - Add a prominent live `⚠️ N Conflicts` pill/badge in the grid status footer/header (matching the Displaced Limbo counter), tapping which scrolls directly to or inspects active timetable clashes.
  - [ ] **Edit Schedule Mode Drag-to-Sub Fix**:
    - Fix drag-and-drop handler in 'Edit Schedule' mode (`state.isEditMode === true`): when dropping a card onto an absent teacher's missing period cell (`.cell-missing`), recognize it as a substitution assignment and record it into `state.substitutions` with full audit history and visual badges, rather than treating it as a raw routine swap.
  - [ ] **Cloud Auto-Sync & Mandatory Substitution Broadcast**:
    - **Live Cloud vs. Local Mode State Machine**: Respect user choices from connectivity notifications to either "Go Live" or stay in a "Local Session". When "Go Live" is active, resume background auto-sync.
    - **Unconditional Substitution Cloud Broadcast**: Regardless of whether the app is currently in local or cloud mode, every confirmed substitution event must immediately broadcast to the Google Apps Script cloud endpoint so all school staff are notified in real time.
  - [ ] **Absence Panel Sub-Availability Full-Height Pad Button**:
    - Redesign `#btn-open-sub-avail-modal` to span the entire vertical height of the absence panel (`.absent-tray-container`) instead of sitting inside the top header row.
    - Style it as a tactile hardware-like "pad button" (MPC/Launchpad aesthetic with prominent squircle corners, full vertical stretch, tactile press depth, and clear stacked icon + label) docked against the right edge of the absence tray.
  - [ ] **Subbed Teacher Target Cell Halo Ring Customizer**:
    - Polish visual indicator halo ring on target subbed cells (`sub-halo-active`) with developer options color presets.
  - [ ] **Substitutions Page Bug Fixes (BUG-06)**:
    - Fix missing/invisible teacher names in Daily Substitution Register (`.sub-register-table`).
    - Fix Smart Auto-Resolve solver (`#auto-resolve-btn` / `performAutoResolve`) and proposal generation.
  - [ ] **Professional Terminology for "Fit-Grid" (Feature Re-branding)**:
    - Select professional terminology: "Fit to Viewport", "Scale to Width", or "Full Bleed Canvas".



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


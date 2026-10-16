# Changelog

All notable changes to the **Little Flower Preparatory School (LFPS) Substitutions Manager & Front Desk PWA** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Planned
- **Roster Management Tab & Grid Absence Panel Toggle**:
  - Dedicated Roster view tab for bulk absence and off-duty unavailability management.
  - Setting toggle to hide absence panel from grid view for a cleaner, full-height routine.
- **Simple Mode**:
  - Streamlined view option presenting strictly basic manual substitution logic.
- **Codebase Technical Debt & Bloat Elimination**:
  - Prune dead static arrays (`masterTimetableLog`, `subjectsCatalog`) and streamline dual-stack actionHistory.

## [v1.48.0] - 2026-10-16

### Added
- **Cloud Operating Mode State Machine (`Live Cloud Mode` vs `Local Session`)**:
  - Added operating mode selection (`state.settings.cloudMode`) allowing coordinators to seamlessly switch between automated 2-way cloud synchronization and an offline local session.
  - Settings segmented control with tactile pills (`[ ☁ Live Cloud Mode ]` vs `[ 🏠 Local Session ]`) and explanatory callout microcopy.
- **Tactile Header Cloud Status Pill (`#header-cloud-status`)**:
  - Compact Apple-style status indicator docked in the header with live LED dot:
    - `🟢 ☁ Live`: Active 2-way cloud auto-sync running every 60s.
    - `🟡 🏠 Local`: Local offline session with routine auto-sync paused.
    - `⚪ Offline`: Network disconnected; actions safely queued locally.
    - `🔵 ☁↑ Broadcast`: Active live broadcast pulse transmitting substitution events to Google Sheets.
  - Tapping opens `#cloud-session-popover` for 1-tap mode toggling, immediate routine sync, and manual ledger push.
- **Background Auto-Sync Engine**:
  - Automatically fetches timetable diffs from Google Sheets every 60 seconds when in Live Cloud mode.
  - Detects incoming schedule modifications non-disruptively; surfaces alerts in Notification Center (`🔔`) without interrupting active drag-and-drop actions.
  - Automatically checks for updates when returning to the app (`visibilitychange`).
- **Unconditional Mandatory Substitution Broadcasting (`broadcastSubstitutionsToCloud`)**:
  - Regardless of whether the app is in Live Cloud Mode or Local Session, every substitution event is unconditionally broadcasted to Google Sheets in real time so all school teachers receive immediate notifications.
  - Automatically dispatches on single assignment (`assignSubstitute`), unassignment (`unassignSubstitute`), auto-resolve batches (`applySelectedProposal`), teacher absence reverts (`revertSubstitutionsForTeacher`), orphan cleanups (`cleanupOrphanSubstitutions`), dispute flagging (`submitDisputeReason`), dispute dismissals (`dismissDispute`), and undo/redo operations.
  - Non-blocking 400ms debouncing consolidates rapid multi-cell actions into single network payloads.
  - Built-in offline buffer (`state.pendingBroadcasts`) that automatically drains and flushes queued records upon network reconnection (`window.addEventListener('online')`).
- **Notification Center Cloud Integration**:
  - Operational notices for pending cloud routine diffs (`Review & Apply`) and local session status reminders (`☁ Go Live`).

## [v1.47.0] - 2026-10-16

### Fixed
- **Circular Undo/Redo Icons Exchanged**:
  - Exchanged rotation arrows in `getUndoRedoIcons('circular')` and Settings sample preview so Undo uses clockwise `↻` and Redo uses counter-clockwise `↺`.
- **Bottom Sheet Dismissal in Landscape & Tap-to-Close**:
  - Added tap-to-close on `#sheet-handle` with an expanded invisible hit area (`::before`) and pointer cursor, closing the bottom sheet on tap or click.
  - Dynamically lowered the drag-to-dismiss threshold in landscape orientation from 60px down to 25px, ensuring swipe-down dismissal works smoothly even on constrained phone heights.

### Changed
- **3-Dot Menu Streamlining & Header De-Cluttering**:
  - Renamed "Reset to Baseline" $\to$ "Reset" (`#more-item-reset`).
  - On narrow screens ($\le 768\text{px}$), hid `#settings-btn` from the top header bar and added it as an option inside the 3-dot overflow menu (`#more-item-settings`).
  - Removed redundant items from the 3-dot menu (Notifications, Staff Availability, Scale to Viewport, Features Tour), keeping it ultra-lean and fast.
  - Hid "Edit Baseline Master Routine" (`#master-lock-btn`) inside the 3-dot menu (`#more-item-master-lock`), decluttering the top header.
  - Ensured "Edit Schedule" (`#edit-toggle-btn`) is always prominently positioned outside in the top header bar across narrow mobile devices.
- **Fit-Grid (Scale to Viewport) Scrollability**:
  - Enabled horizontal scrolling on `.fit-grid-sticky-bar` (`overflow-x: auto; scrollbar-width: none`) so the collapse button (`#exit-fit-grid-btn`) is never pushed out of reach on narrow viewports.
  - Enabled horizontal scrolling for the timetable grid in portrait mode (`body.fit-grid-mode .table-scroll-container`), pinning the teacher column sticky on the left to preserve text legibility while avoiding crushed columns.

## [v1.46.0] - 2026-10-16

### Added
- **iOS & Ableton Live Inspired Visual Theme Menu**:
  - Replaced legacy text dropdown with a tactile palette swatch grid (`.theme-swatch-grid`) inspired by Ableton Live's Look/Feel color tiles and iOS Settings.
  - Each theme card (`.theme-swatch-card`) renders an authentic miniature preview canvas showcasing actual canvas background (`--bg-color`), inset surface card (`--surface-color`), accent LED indicator (`--accent-blue`), and grid line contrast.
  - Interactive family filter tabs (`.theme-family-pill`: `All`, `☀️ Light`, `🌙 Dark`, `🪟 Glass Materials`, `🔲 Studio`) with instant 1-tap live preview, haptic tap feedback, and iOS checkmark status badge (`.theme-swatch-check`).
  - Covers all 12 themes (`system`, `light`, `warm-sepia`, `dark`, `midnight`, `slate-nord`, `utopian-glass`, `utopian-night`, `aero-frost`, `cyber-glass`, `retro-glass`, `high-contrast`).

### Changed
- **Settings Hierarchy & Developer Options Relocation**:
  - Relocated Developer Options (`#roster-color-settings-group`) to the absolute bottom of the Settings modal below "About & Guides", cleanly separated and unlocked via the 5-tap version Easter egg with smooth auto-scroll.
  - Relocated **Same-Period Substitution Lock** (`#same-period-lock-toggle`) into "General & Policies" since it actively blocks coordinators by default.
  - Relocated **Allow Substitution Disputes** (`#admin-dispute-setting-row`) into Developer Options.
  - Relocated **Google Apps Script Web App Endpoint URL** (`#sheets-csv-url-input`) into Developer Options, keeping standard Cloud Sync focused purely on connection status, Push Today's Ledger, and Sync Routine.
  - Relocated **Simulate Absence / Test Scenarios** (`#mock-scenario-select` and `#btn-apply-scenario`) out of Timetable Data into Developer Options.
- **Same-Period Lock Toast Polish & Duration**:
  - Replaced wordy rejection copy with crisp, high-visibility microcopy: `⛔ Locked: Same-Period Subs Only (${tPeriod})`.
  - Upgraded `showToast` to track and cancel pending timers (`toastTimeout`), guaranteeing a full 5000ms display duration for critical constraints without premature dismissals.
  - Polished toggle toast to `🔒 Same-Period Lock Enabled` and `🔓 Cross-Period Subs Allowed`.

## [v1.45.1] - 2026-10-16

### Fixed
- **Absence Tray Context Popover Stacking Trap (BUG-07)**:
  - Resolved issue where right-clicking or 500ms long-pressing an absent teacher card only blurred the absence panel without displaying the context popover menu.
  - Root cause was `#absence-context-popover` and `#absence-context-overlay` residing inside `.absent-tray-container`, which created a local containing block in themes with `backdrop-filter`, confining the overlay and distorting popover coordinates.
  - Relocated popover and overlay to root of `<body>`; the popover now anchors right below the teacher card with full-screen soft blur overlay.
  - Added popover dismissal to the global Escape key handler.

## [v1.45.0] - 2026-10-16

### Added
- **Full-Height Hardware Pad Button for Staff Availability**:
  - Redesigned `#btn-open-sub-avail-modal` into a tactile hardware-style pad button (`.btn-sub-avail-pad`) spanning the full vertical height of `.absent-tray-container` docked against the right edge.
  - Features MPC/Launchpad squircle aesthetics (`border-radius: 14px`), tactile active press depth (`transform: translateY(2px)`), live status LED (`.pad-led` pulsing green/red), and dynamic off-duty count badge (`#pad-sub-avail-count`).
  - Seamlessly responsive across desktop, mobile portrait, and mobile landscape.
- **Anchored Context Popover for Action History Purge**:
  - Replaced the large full-screen `#history-purge-modal` with a sleek, compact iOS-style context popover (`#reset-context-popover`) anchored directly beside `#reset-schedule-btn` and `#more-item-reset` on right-click / 500ms long-press.
  - Enables zero-travel, 1-tap history buffer wiping without modal disruption.

### Changed
- **Routine Header Right-Alignment**:
  - Right-aligned Scale to Viewport button (`#fit-grid-btn`) and Hide Absent toggle (`#hide-absent-toggle-wrapper`) via `.routine-header-right-controls` with `margin-left: auto;`, creating a balanced, clean front-desk header.
- **Grid Scroll Panel De-Obstruction**:
  - Decoupled the master routine table from nested `.table-scroll-container` letterbox traps (`max-height: none !important; overflow-y: visible !important;`).
  - All 9 teacher rows are immediately visible on desktop displays without requiring internal vertical scrolling; natural document scrolling is fully restored.
- **Professional Re-branding to "Scale to Viewport"**:
  - Standardized terminology from "Fit Grid" to **Scale to Viewport** across tooltips, labels, 3-dot overflow menu, and guide text.

### Fixed
- **Desktop Need-to-Sub Cell Tap Interaction**:
  - Fixed issue where clicking `.cell-missing` or `.cell-covered` cells on desktop was inadvertently dismissed by trailing clicks hitting `#sheet-overlay`.
  - Added timestamp guard (`lastBottomSheetOpenTime < 300ms`) and safe event dispatching, ensuring 100% reliable 1-tap substitute picker activation on desktop.

## [v1.44.0] - 2026-10-16

### Fixed
- **Substitutions Page & Teacher Names Failure (BUG-06)**:
  - Eliminated fatal JavaScript runtime crash on page load by removing stale undefined window exports (`window.saveSubAvailModal`, `window.removeTeacherSubUnavailable`).
  - Added self-healing absence reconciliation in `renderSubstitutions()`, fallback class resolution, and wrapped teacher names in `.reg-teacher-name` spans.
  - Enforced `min-width: 680px` on `.sub-register-table` so columns never crush teacher names into invisible text across themes or mobile screens.
- **Smart Auto-Resolve Solver Execution (BUG-06)**:
  - Safeguarded `simSchedule[period]` object initialization in `generateStrategySolution()`, enabling seamless calculation of all 3 solver proposals (`Subject Match`, `Balanced Load`, `Minimal Splits`) and application via `#auto-resolve-apply-btn`.
- **Edit Schedule Mode Drag-to-Sub**:
  - Fixed `executeMove()` to recognize drops onto absent teachers' missing cells (`isTargetSubRelated`), correctly routing to `assignSubstitute()` with Limbo displacement, audit history, and badge updates rather than executing a raw routine swap.

### Added
- **Live Timetable Conflict Pill**:
  - Added live conflict pill in `.grid-status-footer` (`#footer-conflict-pill`) and synchronized with `#collision-indicator`.
  - Clicking the conflict pill smoothly scrolls to the conflicting cell and presents toast diagnostics.

## [v1.43.0] - 2026-10-16

### Added
- **Compact Context Popover for Absence Tray**:
  - Right-click / 500ms long-press on teacher card opens lightweight context menu (`#absence-context-popover`) for 1-tap availability toggling.
- **Squircle Sub-Availability Button**:
  - Redesigned `#btn-open-sub-avail-modal` with `.btn-squircle-edge` (9px Apple squircle radius).
- **Desktop Grid Tap Fix**:
  - Fixed mouse click interception on `.cell-missing` caused by HTML5 `draggable="true"`.

### Changed
- **iOS-Inspired Settings Screen**:
  - Restructured Settings into 7 clean iOS-style sections with an Operating Identity dropdown.
- **Terminology Audit**:
  - Replaced all instances of `offAC` with **Officiating AC (Off. AC)**.
- **Header Simplification & Fit-Grid Button**:
  - Removed `#tour-btn` from header. Replaced "Back to normal" with an inward collapse icon button.
- **Centered Mobile Day Bar**:
  - Centered `.day-selector` across mobile portrait and landscape viewports.

## [v1.42.0] - 2026-10-16

### Added
- **Header Notification Center (`🔔` Icon with Live Notice Badge & Popover)**:
  - Added an Apple-style bell button (`#notifications-btn`) with live notice counter pill (`#notif-badge`) in the top navigation bar, plus integrated into 3-dot overflow menu.
  - Slide-over modal (`#notifications-modal`) aggregates operational notices:
    - **Dispute Notices**: Live flags (`⚑`) when staff dispute an allocation, with direct 1-tap navigation to the register.
    - **Timetable Conflicts / Clashes**: Real-time warnings (`⚠️`) for schedule clashes, with 1-tap jump to the conflicting cell.
    - **Displaced Staff in Limbo**: Alerts (`👥`) for unallocated teachers awaiting reassignment.
    - **Officiating Role Alerts**: Reminders (`⭐`/`🏫`) when Academic Coordinator or Class Teachers are absent and require Off. AC / Off. CT. designated.
    - **Uncovered Periods**: Alerts (`🕒`) for uncovered periods with 1-tap assign drawer opener.
- **Subbed Teacher Target Cell Visual Indicator & Halo Ring**:
  - Target cells in routine table display an illuminated breathing halo ring (`@keyframes haloPulse`, `.sub-halo-active`).
  - Added toggle (`subHaloIndicator`, default: `true`) and 4-color palette selector (`🟢 Emerald`, `🔵 Neon Cyan`, `🟡 Amber Gold`, `🟣 Royal Violet`) in Developer Options.
- **Mobile Undo/Redo Icon Selector in Developer Options**:
  - Added interactive button style picker with live cards: `Curved` (`↩ ↪`), `Circular` (`↺ ↻`), `Geometric` (`◀ ▶`), and `Micro-Text` (`↶ ↷`).
  - Style selection immediately locks and applies to header buttons across all viewports.

### Changed
- **Free Dispute by Default Policy**:
  - Disabled the 10-second acceptance countdown timer by default. Substitutions are now free to dispute at any point without lock-in restrictions.
  - Relocated Acceptance Countdown Timer toggle (default `false`) and duration selector (`5s`, `10s`, `30s`, `60s`) into 🛠 Developer Options for administrators requiring permanent lock-ins.
- **Cross-Period Policy Relocation**:
  - Maintained `samePeriodLock: true` as the enforced default policy.
  - Relocated toggle out of visible Settings into 🛠 Developer Options to declutter front desk UI.
- **Concise, High-Density Toast Messages (Microcopy Streamlining)**:
  - Audited and trimmed wordy toasts across `app.js` into punchy 2–4 word microcopy (e.g. `Edit mode enabled`, `Baseline routine restored`, `Locked by acceptance`, `History purged`, `Co-teachers kept paired`).

### Fixed
- **Absent Teacher Subject Visibility in Utopian Night Theme**:
  - Corrected low-contrast styling in `[data-theme="utopian-night"]` by applying deep crimson background (`rgba(45, 12, 22, 0.72) !important`), bright crimson glow (`#ff4d4d !important; text-shadow: 0 0 10px rgba(239, 68, 68, 0.5)`), and red-tinted class tags on absent teacher rows and missing cells.

## [v1.41.0] - 2026-10-15

### Added
- **In-Situ Grid Teacher Quick Action Modal (`FEAT-08`)**:
  - Touch-hold (500ms on mobile) and right-click (desktop) with tactile haptic vibration (`navigator.vibrate([45, 60])`) directly on any teacher's name cell in the leftmost routine table column.
  - Launches an instant iOS-style Action Sheet (`#teacher-quick-action-modal`):
    - 1-tap `[ 🔴 Mark Absent Today ]` or `[ 🟢 Mark Present Today ]` toggling attendance directly without scrolling back up to the top attendance tray.
    - 1-tap `[ ⛔ Sub-Availability & Duties ]` linking directly into the teacher's rapid availability card.
    - Contextual `[ 🏫 Assign Off. CT. ]` shortcut if an absent teacher is a designated Class Teacher.
- **Reset Button History Purge Shortcut**:
  - Touch-hold (500ms) or right-click on the schedule Reset button (`#reset-schedule-btn` and `#more-item-reset`) opens a dedicated confirmation modal (`#history-purge-modal`).
  - Purges all undo/redo action history buffers from memory on demand without resetting the day's timetable schedule or absences.

### Changed
- **Two-Zone Routine Header Bar (Pinned View Selector & Scrollable Controls)**:
  - Re-architected `.routine-header` into two distinct ergonomic zones:
    - **Pinned Left Zone (`.routine-header-pinned`)**: Compact Apple-style dropdown selector (`#routine-view-select`, `👨‍🏫 Teachers ▾` vs `🏫 Classes`), bordered on the right with a subtle vertical divider (`1px solid var(--border-color)`).
    - **Scrollable Right Zone (`.routine-header-scrollable`)**: Horizontal smooth scroll container (`overflow-x: auto; -webkit-overflow-scrolling: touch`) housing `⛶` Expand, `Hide Absent` toggle switch, and conflict/displaced badges. Eliminates button compression and layout jumps on narrow portrait screens.

### Fixed
- **Absent Teacher Subject & Missing Cell Visibility in Utopian Night & Glass Themes**:
  - Enforced deep crimson glass background (`linear-gradient(135deg, rgba(239, 68, 68, 0.32) 0%, rgba(153, 27, 27, 0.22) 100%)`) with luminous red border (`1.5px solid rgba(239, 68, 68, 0.75)`) and soft red glow on `.cell-missing` in `utopian-night` and `cyber-glass`.
  - Enforced bright red text (`#f87171` in dark themes, `var(--accent-red)` universally) on `.row-absent .cell-subject-name` and `.cell-missing .cell-subject-name` so absent teachers' subjects are unmistakably identifiable across all themes.

## [v1.40.0] - 2026-10-15

### Fixed
- **Sticky Teacher Column Translucency Clashes (`BUG-05`)**:
  - Enforced 100% solid opaque background (`--surface-opaque`) on `.routine-table th:first-child`, `.routine-table td:first-child`, `.class-header-cell`, and `.class-name-cell` across all theme modes (classic light, warm sepia, dark, midnight OLED, slate nord, retro glass, and utopian glass).
  - Fixed absent teacher row opacity leak: ensured `.row-absent td:first-child` retains solid 100% opacity with red text so passing cards sliding underneath never bleed through teacher names.
- **Hide Absent Toggle Knob Overshoot**:
  - Enforced `flex-shrink: 0` on `.toggle-switch` and `.slider` to prevent horizontal squishing on narrow portrait screens.
  - Aligned knob translation flush with the pill boundary with smooth cubic-bezier easing.
- **Fit-Grid Portrait Overflow & Cell Height Distortion (`BUG-04`)**:
  - Prevented table and containers from bleeding past portrait viewport boundaries with strict `max-width: 100vw; overflow-x: hidden; box-sizing: border-box;`.
  - Enforced strict cell height cap (`height: 38px; max-height: 44px; overflow: hidden;`) with single-line text ellipsis in portrait Fit-Grid mode, stopping cells from vertically ballooning into giant multi-line blocks.
  - Dynamically adapts column proportions and provides friendly orientation toast guidance.

### Changed
- **Icon-Only Expand Button**:
  - Removed verbose "Fit Grid" text from `#fit-grid-btn`, leaving a clean, high-density Apple-style icon button (`⛶`), immediately reclaiming ~65px width in the routine header.

## [v1.39.0] - 2026-10-15
 
### Added
- **Rapid 1-Tap Substitution-Availability Card (Boomer / Layman Ergonomics)**:
  - Completely redesigned `#sub-avail-modal` into a lightning-fast dual-view action sheet tailored for front desk staff.
  - **Quick Single-Teacher Action Mode**:
    - Triggered automatically when long-pressing (500ms on touch) or right-clicking any teacher's avatar in the Mark Absence tray.
    - Prominently showcases teacher name, assigned role, and live availability pill (`🟢 Available` / `⛔ Unavailable: Reason`).
    - Massive 1-tap action button (`[ ⛔ Mark Unavailable Today ]` or `[ ✓ Set Back to Available ]`).
    - 6 auto-saving duty chips (`🚌 Bus Duty`, `📝 CBSE Duty`, `👥 Parent Meet`, `📑 Exam Duty`, `🩺 Sick Bay`, `🎪 Event Duty`) that instantly apply the remark, save state, buzz haptics, and dismiss the modal in a single tap.
    - Custom remark input supporting Enter key submission for special situations.
  - **All-Staff Quick-Checklist Mode**:
    - Accessible via tray button (`⛔ Sub-Availability`) or 3-dot overflow menu.
    - Displays all 9 teachers with instantaneous 1-tap status buttons (`✓ Available` vs `⛔ Duty`), completely eliminating cumbersome dropdown search menus.
    - Each row includes a quick `✏` edit button to drill down into the single-teacher action sheet.
- **Fluid View Switcher**:
  - Segmented control toggles between `⚡ Quick Action` and `📋 All Staff (N)`.
  - Dynamic footer toggle link (`📋 View All Staff (9)` / `⚡ Quick Action`) for frictionless navigation.

## [v1.38.0] - 2026-10-15

### Added
- **Locked-in User-Selected Roster Color Palette**:
  - Class Teachers (CT): Calm Teal Sky / Cyan (`#0284c7` / `rgba(2, 132, 199, 0.14)`).
  - Subject Teachers (ST): iOS Blue (`#007aff` / `rgba(0, 122, 255, 0.14)`).
  - Coordinator Badges (`AC` & `A.AC`): Unified Purple (`#8b5cf6`).
  - Absent State: Crimson Red (`#ff3b30` / `rgba(255, 59, 48, 0.16)`).
- **Android-Style Developer Options Easter Egg**:
  - Tapping the "Version" row in Settings 5 times triggers haptic vibration (`navigator.vibrate([50, 100, 50])`), tap countdown toasts, and reveals the Developer Options group (`#roster-color-settings-group`) with a visible `[ 🛠 Dev Unlocked ]` pill and 1-tap "Lock" control.
- **1-Tap Browser Fullscreen API (`toggleBrowserFullscreen`)**:
  - Added Fullscreen toggle to 3-dot overflow menu and Settings panel with cross-browser support (`requestFullscreen` / `webkitRequestFullscreen`), automatically hiding URL bar and navigation headers.
- **Fit-Grid In-Place Editing**:
  - Added "Edit Schedule" button inside `#fit-grid-sticky-bar`, allowing direct timetable edits without exiting Fit-Grid view.
  - Widened first column to 15% (min 80px) with 700 font weight for crisp teacher name legibility.

### Changed
- **Mobile Edit Button Brought Outside**:
  - Removed `header-desktop-only` restriction from `.edit-btn-group`, positioning the Edit button directly in the mobile header next to Undo/Redo.
  - Responsive typography allows compact text on standard phones and graceful icon-only collapse under 360px.
- **Synchronized Edit State across Header, Fit-Grid & 3-Dot Menu**:
  - When edit mode is active, `#edit-toggle-btn` displays `✓ Done Editing` with vibrant green highlight (`save-mode`).
  - In 3-dot overflow menu, dynamically updates from `Edit Routine` to `Done Editing (Save)` with an emerald `● In Edit Mode` badge, eliminating ambiguity.
- **Settings Menu Decluttering (Layman & Boomer Ergonomics)**:
  - Reorganized sections in intuitive flow: Role & Identity $\to$ Cloud Sync $\to$ Preferences & Protection $\to$ Appearance & Display $\to$ Baseline Tools $\to$ Application Info.
  - Collapsed 12-card theme selector into 3 quick pills (`☀️ Light`, `🌙 Dark`, `💠 Utopian`) + a clean `More Themes...` dropdown.
- **Admin PIN Privacy & Interactive 3-Step Change Flow**:
  - Removed plaintext/dotted password input from Settings; replaced with masked `••••` and a `[ 🔑 Change PIN ]` button.
  - Launches secure Apple HIG keypad workflow: Verify Current PIN $\to$ Set New 4-digit PIN $\to$ Confirm New PIN.

## [v1.37.1] - 2026-10-15

### Added
- **Temporary Interactive Roster Color Customizer**:
  - Added a dedicated tuning panel in Settings under "🎨 Roster Blob & Badge Colors" allowing live color selection for:
    - Class Teacher (CT) Blobs (default updated to Royal Violet `#af52de`).
    - Subject Teacher (ST) Blobs (default iOS Blue `#007aff`).
    - Coordinator Badges (AC & AAC) (default Amber Gold `#f59e0b`).
    - Absent State Rings & Fills (default Crimson `#ff3b30`).
  - Equipped with full HTML5 color pickers, quick-select preset swatches, real-time live preview across the app, and a 1-tap "Reset Defaults" button.
- **Unified Coordinator Badges**:
  - Matched AC (`Mrs. R. Pahwa`) and Assistant AC (`Mrs. S. Lakra`) badges to the exact same background color, eliminating visual hierarchy discrepancy.

### Fixed
- **Class Teacher vs. Absent Color Clash**:
  - Replaced the previous pink CT accent (`#ff2d55`), which visually collided with absent red (`#ff3b30`), with calm, non-obnoxious **Royal Violet** (`#af52de` / `rgba(175, 82, 222, 0.14)`).

## [v1.37.0] - 2026-10-15

### Added
- **Color-Coded Teacher Blobs (Pink CTs & Blue STs)**:
  - Redesigned the Mark Absence Panel avatars into high-clarity color-coded circular blobs:
    - **Pink Blobs** for Class Teachers (`Mrs. S. Lakra`, `Mrs. M. Midha`, `Mrs. R. Pahwa`, `Mrs. R. Narayan`).
    - **Blue Blobs** for Subject Teachers, 2nd Teachers, and 3rd Teachers (`Ms. N. Horo`, `Ms. K. Sanga`, `Ms. A. Amira`, `Mrs. S. Bage`, `Mr. S. A. Lakra`).
  - Added lower-right corner badges on the circular blobs for school leaders:
    - `AC` badge for Academic Coordinator (`Mrs. R. Pahwa`).
    - `A.AC` badge for Assistant Academic Coordinator (`Mrs. S. Lakra`).
    - `⚡` badge for Officiating AC when active.
- **Subtle Vertical Splitters (`.roster-splitter`)**:
  - Inserted 1px translucent vertical gradient dividers between each teacher avatar card in the Mark Absence tray, matching the hardware-segmented aesthetics of the bottom navigation bar.
- **Vertical Class/Subject Cell Stacking Architecture**:
  - Replaced inline task strings like `PREP B (MATH)` with vertically stacked layout: Class Name (`.cell-class-tag`) on top, Subject (`.cell-subject-name`) below.
  - Slashes period column width from 86px down to **54px on mobile** and **92px on desktop**, fitting 5–6 full periods on mobile portrait and eliminating text overflow.
- **Grid Status Footer**:
  - Relocated `.version-badge` from the congested header into a subtle footer strip below `#limbo-wrapper`.

### Changed
- **Header Space Reclaim**:
  - Removed redundant `#role-badge-btn` (`🛡 Admin`) from the header top bar, saving ~90px of horizontal space. Role switching and permission status remain cleanly housed within Settings.
- **Teacher Column Narrowing**:
  - Compressed sticky teacher column to **78px on mobile** (down from 108px) and **120px on desktop** (down from 148px).
- **Class Teachers Priority Order**:
  - Enforced strict priority ordering across both the Mark Absence tray and the Timetable Matrix so Class Teachers always render first.
- **Role Accuracy**:
  - Updated `Mr. S. A. Lakra` from "3rd Teacher / Support" to strictly "3rd Teacher".

## [v1.36.0] - 2026-10-15

### Added
- **Touch Device Long-Press for Substitution Availability**:
  - Added a 500ms touch-and-hold listener with haptic vibration feedback (`navigator.vibrate(40)`) on teacher avatar cards (`.teacher-avatar`), enabling phone users to easily open the Substitution Availability modal (`#sub-avail-modal`) without needing right-click.
  - Suppressed the standard short-tap absence toggle whenever a long-press triggers.
  - Retained desktop right-click (`contextmenu`) intact for mouse users.
- **Full Teacher Honorifics & Respectful Titles**:
  - Preserved full respectful prefixes (`Mrs. S. Lakra`, `Ms. N. Horo`, `Mr. S. A. Lakra`) in `renderAbsentTray()`, attendance cards, and table displays.
- **Undo/Redo History Reset Policy & Manual Purge**:
  - Added auto-reset of `state.actionHistory` on day navigation, preventing cross-day undo contamination.
  - Added a dedicated "🗑 Purge History" button (`#btn-purge-history`) in Settings under Application Info with instant toast confirmation.

### Fixed
- **High-Density Mobile Grid Architecture**:
  - Reversed layout bloat on mobile screens: collapsed cell heights back to ~38px–40px (down from ~95px), allowing 7–8 teacher rows to fit above the fold.
  - Compressed sticky teacher column to 108px with streamlined inline role badges (`.teacher-badges-container`) and hidden secondary subtitles on mobile.
  - Tightened period columns to 86px width (min 80px, max 92px) with compact `3px 2px` padding and `border-collapse: collapse !important`.
  - Scaled absence tray circle avatars to 28px × 28px, reducing overall tray height from 120px to ~48px.
- **Mobile Landscape Viewport & Single-Bar Header**:
  - Scoped desktop controls display to `@media (min-width: 640px) and (min-height: 501px)` to prevent phones in landscape (`height <= 500px`) from dumping all desktop buttons and overflowing.
  - Consolidated header, app identity, and day selector into a unified, slim 36px bar in landscape, eliminating day-bar overlap over row 1 of the timetable.
  - Reduced mobile landscape bottom navigation height to 36px, maximizing usable timetable grid area to 280px+ vertical height.

## [v1.35.0] - 2026-10-14

### Fixed
- **BUG-01 (Limbo Tray Drag & Smart Restore with Haptic Jitter)**:
  - Enabled direct drag-and-drop from the Limbo tray (`#displaced-tray`) across all application modes (`div.draggable = true`).
  - Implemented one-tap **Click-to-Restore**: tapping any displaced card immediately checks if its original source slot `(ogTeacher, period)` is `Free`, cleanly restoring the class and logging it to the action history.
  - Implemented full **Undo/Redo Support** (`restore_displaced`) in `undoLastAction()` and `redoLastAction()`.
  - Added phone-style side-by-side **Error Jitter** (`@keyframes errorJitter`) with emergency red glow and tactile vibration (`navigator.vibrate([45, 55, 45])`) whenever restoration is blocked by an occupied cell or invalid drop target.
- **BUG-02 (Instant Viewport & Silk-Scroll Optimization)**:
  - Promoted `.table-scroll-container` and sticky table column/cells to independent GPU composite layers (`transform: translateZ(0)`, `contain: paint layout`, `-webkit-overflow-scrolling: touch`).
  - Added width-change guards and debouncing to `window.resize` observer so mobile vertical scrolling (address-bar collapse/expansion) never triggers table layout thrashing or synchronous reflows.
  - Relocated heavy `backdrop-filter` from `.table-scroll-container` to `.master-routine-container`, eliminating continuous per-frame blur re-filtering during scroll.

### Added
- **Utopian Night Mode (`utopian-night`)**:
  - Engineered dark glass refraction theme with deep obsidian/midnight-sapphire backdrop (`linear-gradient(145deg, #03070f, #0a1930)`), 28px frosted diffusion, and radiant neon-cyan prismatic edge highlights (`inset 0 1.2px 1px rgba(0, 229, 255, 0.45)`).
  - Categorized under `🪟 Glass Materials` family in Settings alongside *Utopian Glass*, *Aero Frost*, and *Cyber Glass*.

---

## [v1.34.0] - 2026-10-14

### Added
- **Utopian Glass Complete Overhaul (*Divergent Upper-City Aesthetic*)**:
  - Transformed the flat pastel-blue theme into an ethereal, pristine architectural glass environment inspired by *Divergent* upper-city headquarters.
  - Added multi-stop iridescent ambient gradients, specular top-edge sheen catches (`inset 0 1.5px 1px rgba(255, 255, 255, 0.95)`), chromatic refraction borders, deep frosted diffusion (`backdrop-filter: blur(28px) saturate(210%)`), and radiant cyan ambient reflections across table cells, headers, avatars, and docks.
- **Theme Taxonomy & Sub-Category Variant Architecture**:
  - Reorganized the flat theme selector in Settings into three **Base Families** with curated sub-category variants:
    - **🪟 Glass Materials**: *Utopian Glass*, *Retro Glass*, *Aero Frost* (new), *Cyber Glass* (new).
    - **☀️ Minimalist & Paper**: *Auto (System)*, *Classic Light*, *Warm Sepia*, *High Contrast* (new).
    - **🌙 Dark Modes**: *Classic Dark*, *Midnight OLED*, *Slate Nord*.
  - Added interactive category segmented tabs in Settings that dynamically filter and display the corresponding variant swatch grids.
- **Desktop Zero-Scroll Viewport Layout**:
  - Streamlined desktop layout hierarchy: reduced header vertical padding, compacted day selector, and optimized absent tray height, returning over 100px of vertical space to the master routine.
  - Routine table now fits comfortably **above the fold** without requiring vertical scrolling down on desktop screens.
- **Commercial Mobile Adaptive Layout with 3-Dot Overflow Menu (`⋮`)**:
  - Preserved **100% mobile feature parity** for teachers while preventing header toolbar crowding on small screens.
  - Tucked secondary administrative actions (`Reset to Baseline`, `Edit Schedule`, `Sub-Availability`, `Fit Grid`, and `Features Tour`) into a sleek Apple-style glass overflow dropdown (`#header-more-popover`).
- **Dynamic Viewport Engine (`computeViewportLayout`)**:
  - Automatically measures viewport dimensions, sets device datasets on `document.body`, and dynamically computes optimal table scroll container constraints on resize and orientation changes.

---

## [v1.33.1] - 2026-10-14

### Fixed
- **Orphan Substitution Cleanup on Un-marking Absent Teachers**:
  - Resolved bug where un-marking an absent teacher (toggling back to Present) left behind stale substitution records in `state.substitutions`, creating ghost substitutions on present teachers (e.g. Mr. S. A. Lakra appearing with coverage badges `↳ N. Horo`, `↳ K. Sanga`, `↳ A. Amira` while present).
  - Added `revertSubstitutionsForTeacher(teacher, day)` to cleanly release all substitutes, restore substitute schedules to original tasks/free, restore returning teacher schedules, and resolve displacements when an absence is cancelled.
  - Implemented self-healing `cleanupOrphanSubstitutions(day)` invoked on `loadStateFromStorage()`, `renderAll()`, and day switches to automatically sanitize any legacy or persisted orphan substitution records.
- **Substitution-Aware Co-Teaching Conflict Detection**:
  - Enhanced `findConflicts()` with `areTeachersCoTeachingPartners(day, period, t1, t2)` and `getTeacherCoveringFor(t, period, day)`.
  - When a substitute teacher steps in to cover an absent co-teacher (e.g. covering Mr. S. A. Lakra in `KG A: HIN. KAV./GEET`), the conflict detection engine now recognizes that the substitute inherits the co-teaching partnership with the present partner (e.g. Ms. N. Horo).
  - Suppressed 8 cascading false-positive duplicate class conflicts previously triggered across periods 2nd, 3rd, 4th, and 6th.
- **Grid Rendering Guards for Present Teachers**:
  - Guarded `assignedSub` in `renderTableRoutine()` with `isAbsent` so present teachers never render as `cell-covered` with substitute coverage tags.
  - Guarded `coveringFor` in `renderTableRoutine()` to ensure colleagues only render as substituting for teachers who are actively present in `state.absentTeachers`.

---

## [v1.33.0] - 2026-10-14

### Added
- **Teacher Substitution Unavailability Engine**:
  - Ability to designate present teachers as unavailable for substitution duties for the day.
  - Dedicated **⛔ Sub-Availability** modal (`#sub-avail-modal`) with teacher selector, toggle switch, and optional custom remark input (up to 80 chars).
  - One-tap quick suggestion chips for common school duties: `🚌 Bus Duty`, `📝 CBSE Evaluation`, `👥 Parent Meeting`, `📑 Exam Correction`, `🩺 Sick Bay`, and `🎪 Event Prep`.
  - Right-click / contextmenu quick shortcut on any teacher avatar in the absent tray to immediately configure availability.
  - Persistent state under `state.subUnavailable[day] = { [teacher]: remark }` saved to local storage.
- **Interactive `?` Remark Popover**:
  - Replaced raw inline remark text with a distinct, visually identifiable blue circular **`?`** button (`.btn-sub-reason-help`).
  - Clicking `?` opens a floating popover (`#sub-remark-popover`) displaying teacher name and their exact reason (e.g. *"Bus Duty: Afternoon route 3 inspection"*), with polite fallback for blank remarks.
  - Smooth click-away and close button dismissal.
- **Dedicated Excluded Substitutes Section**:
  - Bottom sheet substitution picker (`openBottomSheet`) now renders a dedicated **⛔ Unavailable for Substitution** section listing excluded teachers with their status pill and interactive `?` button.

### Changed
- **Terminology Transition ("Collision" → "Conflict")**:
  - Transitioned terminology strictly from "Collision" to **"Conflict"** across the entire application.
  - Header pill updated to `⚡ X Conflict(s)` with tooltip `Click to inspect conflicts`.
  - Settings toggle updated to **Highlight Conflicts** (`#detect-collisions-toggle`).
  - Master Routine Cell Inspector warning updated to `Warning: Section X conflict: ...`.
  - Core engine function transitioned to `findConflicts()`, maintaining `findCollisions()` as a full backward-compatible alias.
- **Grid Ergonomics & Period Column Harmonization**:
  - Harmonized master routine table column dimensions: sticky first column (`th:first-child`, `td:first-child`) standardized to `148px` width.
  - Period columns standardized to balanced `112px` (min `104px`, max `118px`).
  - Break column standardized to compact `58px`.
  - Wrapped and centered multi-line header text for `PLAYTIME / 2ND GOLDEN HOUR` to prevent warping adjacent columns.
- **Smart Auto-Resolve Solver & Candidate Pool Exclusion**:
  - Unavailable teachers are strictly excluded from substitute candidate pools across all 3 Auto-Resolve heuristic strategies (`subject-match`, `balanced-load`, `minimal-splits`).
  - Excluded from manual substitution assignment in the bottom sheet.

### Fixed
- **Shared Class False-Positive Conflict Suppression**:
  - Resolved false-positive conflicts on legitimate joint/shared classes (e.g. Tuesday G/PD Drill where Ms. A. Amira teaches `1ST DRILL PREP A`, Mrs. S. Bage teaches `2ND DRILL PREP B`, and Mr. S. A. Lakra teaches `DRILL PREP A + PREP B`).
  - Enhanced `getCoTeachingPartners()` with ordinal prefix normalization (`1ST`, `2ND`, `3RD`, `4TH`).
  - Enhanced `findConflicts()` with root subject extraction (`extractRootSubject`) and baseline verification (`allInBase`) ensuring planned shared classes are recognized as collaborative rather than conflicting.

---

## [v1.32.1] - 2026-10-14

### Fixed
- **Primary Button Contrast**: Resolved blue-on-blue invisible text on filled `.btn-primary` action buttons (`#btn-conflict-accept-cloud` in Cloud Conflict Dialog and `#btn-sync-now` in Settings Panel) by enforcing high-contrast white text (`color: #ffffff !important;`).
- **Co-Teaching Solo Badge**: Clarified co-teaching split badge behavior to retain the exact same `👥 Co-teaching` badge (greyed out) with softened border when a teacher is covering solo after a partner is split/released.

---

## [v1.32.0] - 2026-10-14

### Added
- **Full 2-Way Google Sheets Cloud Integration**:
  - Connected Front Desk to the deployed Google Apps Script Web App endpoint (`/exec`).
  - **Pull (`doGet`)**: Streams master routine from the `OVERVIEW` tab as clean CSV directly into Front Desk with dynamic header detection across first 10 rows.
  - **Push (`doPost`)**: Securely handles live updates without third-party dependencies.
- **Google Sheets Tab Architecture**:
  - 🟦 `Daily_Ledger` tab with Apple HIG blue headers, frozen header row, and `warningOnly` protection for real-time substitution audit logging.
  - 🟧 `Baseline_Updates` tab with frozen header row and `warningOnly` protection for permanent master routine modifications.
- **Automatic & Manual Cloud Push Pipeline**:
  - Automatically posts accepted substitutions to `Daily_Ledger` upon 10-second countdown completion in `startAcceptSubCountdown()`.
  - Automatically posts audited slot differences to `Baseline_Updates` when saving master routine revisions in `saveMasterBaseline()`.
  - Added 1-tap **`☁ Push to Sheets`** in Daily Substitution Register and **`📤 Push Today's Ledger`** in Settings.

---

## [v1.31.0] - 2026-10-14

### Added
- **RFC 4180 State-Machine CSV Parser**: Pure zero-dependency lightweight parser (`parseCSV`) supporting escaped quotes (`""`), multi-line cells, comma preservation inside strings, and CR/LF cross-platform line breaks.
- **Google Sheets Cloud Sync Engine**: Settings configuration for published web CSV link or Sheet ID with automatic URL normalization (`normalizeCSVUrl`).
- **Cloud vs. Local Conflict Resolver Modal**: Compares incoming Google Sheets allocations against local `state.baseSchedule` via `calculateScheduleDiffs()`.
- Interactive diff comparison list showing affected teacher count, days, and slot difference count with choices: **"✓ Accept Cloud Routine"** vs. **"Keep Local Changes"**.

---

## [v1.30.0] - 2026-10-14

### Added
- **Protected In-App Master Routine Editor**:
  - Toggled via header lock button (`#master-lock-btn`).
  - Interactive Cell Inspector modal (`#master-cell-modal`) with class section quick selector, curriculum-aware subject chips from official Excel pools, and co-teaching partner assignment.
- **Apple HIG 4-Digit Passcode / PIN Pad Modal**:
  - Secures Master Routine baseline editing behind an Apple-style circular numeric keypad (`0-9`, `⌫`) with animated indicator dots (`.pin-indicator-dots`) and tactile shake feedback.
  - Configurable PIN (`state.settings.adminPin`, default `1234`) with instant update in Settings for Admin and AC roles.

---

## [v1.29.0] - 2026-10-13

### Added
- **Multi-Role Hierarchy & Permissions**: Support for `Admin`, `Academic Coordinator (AC)`, `Assistant AC`, and `Teacher` roles with live header badge and Settings role switcher.
- **Assistant AC Parity**: Assistant AC holds identical permissions to the primary AC.
- **Dual-Absence Officiating AC (`offAC`)**: Contingency banner automatically prompts assigning an `offAC` when both AC and Assistant AC are absent on the same day.
- **Officiating Class Teacher (`offCT`)**: Prompts assignment of an officiating CT when any Class Teacher is absent.
- **Teacher Substitution Acceptance Flow**: Interactive 10-second countdown timer (`⏳ Confirming 10s • Undo`) before permanent lock-in (`🔒 Accepted`).
- **Role-Gated Substitution Dispute Engine**: Optional setting for substitute teachers to dispute assignments with a rationale note.

---

## [v1.28.0] - 2026-10-13

### Added
- **Inline Co-Teacher Release**: Actions (`Release`, `Free Day`, `↩ Rejoin`) located directly inline beside teacher names in `#co-teach-modal`.
- **High-Density Daily Substitution Register**: Replaced cards with a compact, scannable table with summary stats (`Total`, `Pending`, `Covered %`), filter pills (`All`, `Pending`, `Covered`), and 1-click assignment controls.
- **Expanded Fit-Grid View**: 1-tap `⛶ Fit Grid` mode scaling the timetable grid to 100% viewport width with sticky floating top bar for mobile landscape viewing.
- **Priority Preference Matrix**: Subject, department cluster, section familiarity, and workload scoring engine ranking candidate substitutes.
- **3-Option Smart Auto-Resolve Solver**:
  - `Option 1: Subject Match (★ Best Academic Fit)`
  - `Option 2: Balanced Load (⚖ Lightest Workload)`
  - `Option 3: Minimal Splits (🛡 Preserve Co-Teaching)`

---

## [v1.26.0] - 2026-10-12

### Added
- **Smart Co-Teaching & Shared Badges**: Distinct purple `👥` badge for shared teaching allocations with partner cell breathing highlight.
- **Direct Drag-to-Split**: Dragging onto either co-teacher splits them cleanly without displacing to Limbo.
- **Option-Click (`Alt + Click`) Rapid Reset Engine**: Springy tactile bounce animation on reset; moved subjects safely returned to their origin.
- **Themes**: Added Utopian Glass and Retro Glass full UI themes.

---

## [v1.24.0] - 2026-10-12

### Added
- **Collision Detection & Gentle Radar**: Animated pulsing amber radar ring (`@keyframes collisionBreathe`) on duplicate class section bookings.
- **Settings Hub & Theme Selector**: 7 Apple-inspired palettes (Auto, Light, Sepia, Dark, Midnight OLED, Slate Nord, Retro Glass).
- **History Segmented Control**: Stable `.history-btn-group` pill preventing rapid-click jumping loops.

---

## [v1.22.0] - 2026-10-11

### Added
- **Drag-to-Assign Substitutions on Master Grid**: Missing classes draggable directly onto teachers to assign substitutes with real-time green coverage highlights.
- **Limbo Tray Displacement**: Busy teachers' classes displaced safely into a floating bottom tray.

---

## [v1.18.0] - 2026-10-11

### Added
- **Native Dark Mode & Apple Theme Tokens**: System preference auto-detection, manual theme switching, and tactile SVG vector icons.

---

## [v1.17.0] - 2026-10-11

### Added
- **Baseline Reset Button**: Added a dedicated `↺ Reset` button next to the Edit toggle. Instantly reverts the current day's working grid and substitutions back to the original `baseSchedule`.
- **Reset Undo Integration**: Fully integrated the reset action into the dual-stack undo engine, capturing the entire wipe as a single snapshot that can be reversed with one click.

### Changed
- **Unrestricted Ghost Slide**: Removed `overflow: hidden;` from grid cells and extended the `ghostSlideOut` animation drop distance to `45px` (a full slot height), allowing the displaced class text to visibly drop *over* the cell below it.

---

## [v1.16.0] - 2026-10-11

### Changed
- **Inline Limbo Tray Flow**: Moved the Limbo Tray out of its floating overlay state and back into the standard document flow directly below the grid. It now gracefully expands (`grid-template-rows: 0fr` to `1fr`) pushing the page scroll boundary down without shifting the grid underneath the user's fingers.

---

## [v1.15.0] - 2026-10-11

### Added
- **Floating Limbo Dock (Initial Version)**: Replaced the static displaced tray with a glass-morphism dock that slides up from the bottom.
- **Drag-Out Indicator**: Cells now instantly visually shrink to 95% scale and drop to 40% opacity (`cell-dragging`) the moment a drag is detected to confirm the grab.
- **Swipe-to-Dismiss Bottom Sheet**: Added native iOS-style touch-drag-to-close physics to the bottom sheet grey handle (`deltaY > 80px`).

### Fixed
- **Mobile Ghost Clicks**: Locked down event propagation (`e.stopPropagation()`, `e.preventDefault()`) on the bottom sheet overlay to prevent taps from falling through and accidentally triggering the bottom navigation bar underneath.
- **Dark Mode Animation Clash**: Removed hardcoded stark white backgrounds from the `flashRedOverwrite` animation, ensuring the soft pink ring respects dark mode inversion cleanly.

---

## [v1.14.0] - 2026-10-11

### Added
- **"Juicy" Overwrite Animations**: Overhauled UI feedback for copy-and-overwrite drag mechanics.
  - Added a soft Apple `accent-pink` (`rgba(255, 45, 85)`) bounding ring that scales down, curves, and springs back out on cell drop (`flashRedOverwrite`).
  - Added a translucent pink wash to the inner cell background that smoothly transitions back to default blue.
- **Ghost Slide Physics**: Overwritten text now turns pink, drops behind the new text, and softly slides downward (`ghostSlideOut`) to visually communicate displacement.

---

## [v1.13.0] - 2026-10-11

### Added
- **Contextual Overwrite Animations**: Grid drop behavior divided into two distinct visual feedback states. An empty drop triggers a standard pop-in, while overwriting an occupied class triggers an aggressive red flashing inset border (`.cell-displaced-flash`) to signal displacement.

### Changed
- **Targeted Tray Physics**: Restricted the popIn animation to apply exclusively to the single newly displaced item entering the Limbo Tray, allowing existing tray items to remain static and shift via standard flexbox flow.

---

## [v1.12.0] - 2026-10-11

### Added
- **Inline Displaced Indicator**: Added a static, space-efficient red pulsing badge (`#displaced-indicator`) directly beside the "Master Routine" header to warn of displaced classes without consuming vertical real estate.

### Changed
- **Tray Flow Restoration**: Restored the Limbo Tray to the standard document flow beneath the grid, reverting it from a floating overlay to ensure it pushes the scroll boundary naturally.

### Removed
- **Bulky Warning Bar**: Eliminated the full-width displaced warning banner above the grid to prevent layout jumping upon error state activation.

---

## [v1.11.0] - 2026-10-11

### Changed
- **Substitutions Tab Icon**: Updated the bottom navigation icon for the Substitutions tab from a warning symbol to a neutral swap/sync icon (`🔄`) to reflect its permanent dashboard identity and reduce false alarms.

---

## [v1.10.0] - 2026-10-11

### Added
- **Smooth Expansion Wrapper**: Encapsulated the Limbo Tray in a dynamic CSS Grid container (`#limbo-wrapper`) utilizing a `0fr` to `1fr` transition template.

### Fixed
- **Layout Shifting**: Eliminated vertical layout shift that previously forced the main table down when the dynamic warning bar and Limbo Tray appeared.

---

## [v1.9.0] - 2026-10-11

### Added
- **Tactile Grid Drop Feedback**: Applied a satisfying popIn animation (`.cell-just-dropped`) to grid target cells immediately upon receiving a dropped class from another grid slot or the Limbo Tray.

---

## [v1.8.0] - 2026-10-11

### Added
- **Top-Level Alert Positioning**: Relocated the displaced classes warning banner to sit directly above the main grid for instant visibility, enhanced with an Apple-style pulsing red attention dot.
- **Limbo Tray Animations**: Replaced janky trajectory physics with fluid, iOS-style `popIn` animations for displaced items entering the Limbo Tray.

---

## [v1.7.0] - 2026-10-11

### Added
- **The Limbo Tray (Displaced Classes)**: Engineered a dedicated holding area beneath the active grid to catch and temporarily store classes that are overwritten during manual grid manipulation.
- **Bidirectional Reassignment**: Enabled classes to be dragged or tapped directly out of the Limbo Tray and dropped back onto free slots on the active grid.

---

## [v1.6.0] - 2026-10-11

### Added
- **Baseline Truth Architecture (`state.baseSchedule`)**: Separated the active working grid from the original master routine, allowing the memory engine to permanently track original class ownership for accurate absence detection regardless of manual shuffling.
- **Persistent Substitutions Dashboard**: Upgraded the temporary Resolver into a permanent command center featuring a Dual-State UI. Unassigned absences generate Pink action cards, and assigned coverages transition into permanent Green audit cards.
- **Celebratory Empty States**: Built "All Clear!" and "Fully Covered" UI screens to provide immediate visual confirmation when substitution tasks are complete.
- **Batch Auto-Resolve Algorithm**: Wired up a single-click resolution engine (**✨ Auto-Resolve**) that scans the uncorrupted baseline, identifies unassigned absences, hunts free teachers, and executes bulk assignments simultaneously.

---

## [v1.5.0] - 2026-10-10

### Added
- **Native Smooth Edge-Scrolling**: Built an animation-frame edge-scrolling engine triggering when dragging classes near the desktop viewport boundaries.
- **Crash-Proof Local Storage**: Enforced strict synchronous writes to `localStorage` (`lfps_frontdesk_state`) on every single interaction to guarantee zero data loss on browser crash or reload.
- **Cache-Busting Initialization**: Appended dynamic version tags (`?v=1.5`) to stylesheet and script sources to force immediate cache invalidation on mobile devices.

### Changed
- **Movement Engine Rebuild (Copy & Overwrite)**: Stripped out the flawed swap logic. Dragging a class now strictly overwrites the target slot and completely frees the original slot, granting absolute manual control over the grid.
- **Context-Aware Undo Engine**: Divided the single history array into a dual-stack setup (`actionHistory.grid` and `actionHistory.subs`). The UI now accurately reverses drag-and-drop grid moves when on the Dashboard tab, and substitution assignments when on the Substitutions tab.

---

## [v1.0.0] - 2026-10-10

### Added
- **Initial Front Desk PWA Release**: Built the foundational vanilla JS/HTML/CSS offline-first application.
- **Dual-State Baseline Architecture**: Implemented the immutable `baseSchedule` (master routine) versus the mutable `schedule` (active working grid).
- **Copy-and-Overwrite Engine**: Engineered a custom HTML5 drag-and-drop system where dragging Class A onto Class B overwrites Class B instead of swapping them.
- **Crash-Proof State Management**: Synced all state mutations (`day`, `schedule`, `substitutions`, `displaced`, `actionHistory`) synchronously to `localStorage` (`lfps_frontdesk_state`).
- **Dual-Stack Context-Aware Undo**: Built an undo engine that dynamically tracks grid moves (`actionHistory.grid`) separately from substitute assignments (`actionHistory.subs`).
- **Substitution Resolver Dashboard**: Built a dual-state card UI tracking unassigned absences (Pink) and assigned coverages (Green).
- **Mock Data Generator**: Integrated `generateSimulatedData()` to populate initial teacher subjects across a 6-day `MON`-`SAT` cycle for testing.
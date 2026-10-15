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

### Job Bundle 4: Routine Header Ergonomics & In-Situ Grid Absences
- [ ] **Pinned View vs. Scrollable Controls Header Bar**:
  - Implement a two-zone header layout:
    - **Pinned Left Zone**: Pinned Teachers/Classes view selector with a subtle, identifiable vertical splitter (`border-right: 1px solid var(--border-color)`).
    - **Scrollable Right Zone**: Horizontal smooth scroll container (`overflow-x: auto; -webkit-overflow-scrolling: touch`) housing Expand (`⛶`), Hide Absent toggle, Displaced pill, and Conflict counter. Never squishes or drops buttons offscreen.
- [ ] **Teachers / Classes View Mode Compact Dropdown**:
  - Transform segmented 2-button bar (`[ 👨‍🏫 Teachers ] [ 🏫 Classes ]`) into an Apple-style compact dropdown select (`👨‍🏫 Teachers ▾`), saving ~60px of horizontal space.
- [ ] **Mark Teacher Absent via Long-Press on Master Grid Teacher Column (FEAT-08)**:
  - Add 500ms touch long-press (mobile) and right-click (desktop) with native haptic vibration (`navigator.vibrate([45, 60])`) directly on any teacher name cell in the leftmost sticky column (`.sticky-col` / `.teacher-header-cell`).
  - Opens rapid action popover / bottom sheet: `[ 🔴 Mark Absent ]  [ 🟢 Mark Present ]  [ ⛔ Sub-Availability ]` and immediately updates both grid row and top Mark Absence tray.
- [ ] **Reset Button History Purge Shortcut**:
  - Add desktop right-click (`contextmenu`) and mobile 500ms touch long-press with haptic vibration (`navigator.vibrate([40, 50])`) on the schedule **Reset Button** (`#reset-day-btn`) to reveal quick action: `🗑 Purge Action History (Clear Undo Buffer)` without resetting the actual routine schedule.

### Job Bundle 5: Hidden Settings, Cross-Period Policy, Acceptance Timer & Notification Center
- [ ] **Free Dispute by Default & Hidden Acceptance Countdown Timer**:
  - **Free Dispute by Default**: Disable the 10-second acceptance countdown timer and permanent lock-in (`Locked: Accepted substitutions cannot be disputed.`). Substitutions are free to dispute at any point without time lock-in restrictions.
  - **Relocate to Developer Options (Hidden Settings)**:
    - Add an Enable/Disable toggle for the Acceptance Countdown Timer (default: `false` / disabled).
    - Add a Countdown Duration selector dropdown (`5s`, `10s`, `30s`, `60s`) that activates when the timer is enabled.
- [ ] **Header Notification Center (`🔔` Icon with Live Notice Badge)**:
  - Add an Apple-style notification bell icon (`🔔`) in the top navigation header with an active unread notice counter/badge.
  - Tapping opens an interactive Notification Center / slide-over popover sheet displaying:
    - **Dispute Notices**: Live flags when a teacher disputes a substitution (e.g. `⚑ Mrs. R. Pahwa disputed Period 3 assignment ("Lab setup required")`) with 1-tap `[ Reassign ]` and `[ Clear Flag ]` buttons.
    - **Clashes & Conflicts**: Real-time warnings for teacher timetable collisions or duplicate room bookings.
    - **Displaced Teacher Alerts**: Unassigned displaced teachers in Limbo.
    - **Officiating Role Alerts**: Reminders to designate an Officiating Class Teacher (Off. CT.) or Officiating AC (Off. AC) when staff are absent.
    - **Cloud Sync Notices**: Offline warnings or successful cloud sync reports.
- [ ] **Cross-Period Substitution Policy in Hidden Settings**:
  - **Default**: Substitutions across different periods remain **locked by default** (`samePeriodLock: true`).
  - **Hidden Setting**: Relocate the "Same-Period Lock" toggle into "🛠 Developer Options" (hidden behind 5-tap Easter egg in Application Info) to declutter the main Settings for layman front desk staff.
- [ ] **Mobile Undo/Redo Icon Recognition**:
  - Add style selector in **Developer Options (Hidden Settings)** with live preview swatches:
    1. **Curved Arrows** (`↩ Undo` / `↪ Redo`)
    2. **Circular Arrows** (`↺ Undo` / `↻ Redo`)
    3. **Apple/Android High-Contrast SVG Vector Icons** (crisp geometric strokes)
    4. **Micro-Text Pills** (`[ UNDO ]` / `[ REDO ]` high-density typography)
  - Allow selecting, testing, and locking one preferred design across all screen breakpoints.
- [ ] **Cloud-Synced Global Settings (Unified Across Every Viewer)**:
  - Push / fetch config via Google Sheets / Apps Script (`Config` / `Metadata` tab).
  - Synchronizes roster color palette, locked undo button style, and preferences so every staff device loads the exact same uniform configuration.


### Job Bundle 6: Performance Engine & Keep-Warm Pre-Rendering (PERF-01)
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


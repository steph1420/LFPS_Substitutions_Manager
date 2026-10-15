# LFPS Substitutions Manager — Task & Todo Tracker

This tracker maintains active, upcoming, and future tasks for the **Front Desk PWA**.

## 🐛 Critical Bug Tracker

## 🐛 Critical Bug Tracker

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
  - [x] **Mark Absence Roster**: Sorted Class Teachers first. Replaced text role subtags with color-coded circular blobs: **Pink for CTs**, **Blue for STs**, with corner badges for Coordinators (`AC` for Mrs. R. Pahwa, `A.AC` for Mrs. S. Lakra).
  - [x] **Subtle Splitters**: Added 1px gradient vertical dividers (`.roster-splitter`) between teacher avatars matching bottom nav styling.
  - [x] **Narrowed Teacher Column**: Compressed to **78px on mobile** and **120px on desktop**.
  - [x] **Stacked Cell Architecture**: Vertically separated Class Name (`.cell-class-tag`) on top and Subject (`.cell-subject-name`) below for both desktop and mobile, reducing cell width to **54px on mobile**.
  - [x] **Role Accuracy**: Corrected `Mr. S. A. Lakra` from "3rd Teacher / Support" to strictly "3rd Teacher" (Blue ST blob).

---

## 🚀 Active / Next Priorities

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

### 3. Undo/Redo History Reset Policy & Buffer Pruning (RESOLVED in v1.36.0)
- [x] **Manual History Purge**: Added "Clear Action History" button (`#btn-purge-history`) in Settings under Application Info to wipe undo/redo stacks on demand.
- [x] **Auto-Reset Policy Options**:
  - Automatically resets action history buffer when switching days to prevent accidental cross-day undo contamination.
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


# Changelog

All notable changes to the **Little Flower Preparatory School (LFPS) Substitutions Manager & Front Desk PWA** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Planned
- **Live Cloud Sync Status Indicator**:
  - Live icon/pill showing the Google Sheet is active and syncing seamlessly.
  - Dedicated "Sheet Offline" indicator when disconnected or offline.
- **Simple Mode**:
  - Streamlined view option presenting strictly basic manual substitution logic.
- **Codebase Technical Debt & Bloat Elimination**:
  - Prune dead static arrays (`masterTimetableLog`, `subjectsCatalog`) and streamline dual-stack actionHistory.

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
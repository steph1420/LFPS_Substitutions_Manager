# LFPS Substitutions Manager — Task & Todo Tracker

This tracker maintains active, upcoming, and future tasks for the **Front Desk PWA**.

## 🐛 Critical Bug Tracker

### BUG-01: Limbo Tray Drag Failure & Click-to-Restore Mechanism (CRITICAL)
- **Status**: 🔴 Open / Investigated
- **Reported Issue**:
  1. **Drag Failure**: Users are unable to drag periods out of the Limbo tray (`#displaced-tray`). In standard mode, `div.draggable` is restricted by `state.isEditMode`, preventing drag interaction.
  2. **Click-to-Restore to Original Cell**: When a subject in the Limbo tray is clicked, it should automatically attempt to restore itself back to its original cell (`item.ogTeacher` at `item.period`) if that cell is blank / free (or in any valid safe manner).
  3. **Haptic & Visual Error Jitter**: If restoration or dragging fails (e.g., original cell is occupied or blocked), the item card should execute a side-by-side phone-style error jitter/shake animation (`@keyframes error-jitter`) paired with tactile device vibration (`navigator.vibrate([40, 60, 40])`).
- **Remediation Plan**:
  - [ ] Allow dragging directly from `#displaced-tray` with active drop targets across the master timetable grid.
  - [ ] Implement `restoreLimboItem(item)`: verify target `(ogTeacher, period)` is `Free` / empty, remove from `state.displaced`, restore to schedule, register in undo stack, and re-render.
  - [ ] Add `.error-jitter` CSS animation in `styles.css` with a 400ms side-by-side oscillation.
  - [ ] Provide haptic vibration feedback via `navigator.vibrate` on restoration failure or invalid drop.

### BUG-02: Schedule Re-rendering & Stutter During Scrolling (Instant View Rendering)
- **Status**: 🔴 Open / Investigated
- **Reported Issue**:
  - The schedule appears to re-render, hitch, or flicker each time the user scrolls horizontally or vertically.
  - The schedule must be ready to view instantly with smooth 60/120fps hardware-accelerated momentum scrolling and zero repaint stutter.
- **Root Causes & Performance Bottlenecks**:
  - Heavy composite repainting caused by non-isolated `backdrop-filter`, multi-stop inset shadows, and sticky header/column reflows during scroll interactions.
  - Viewport resize triggers firing on mobile scroll (address bar collapsing/expanding) causing layout recalibration.
  - Absence of CSS containment (`contain: paint layout`) and hardware GPU acceleration (`will-change: transform`, `transform: translateZ(0)`).
- **Remediation Plan**:
  - [ ] Decouple table rendering from scroll and resize events (add strict debouncing to viewport observers).
  - [ ] Add GPU composite layer promotion and CSS containment (`contain: content`, `will-change: transform`, `-webkit-overflow-scrolling: touch`) on `.table-scroll-container` and table rows.
  - [ ] Optimize sticky header & frozen first-column CSS so scroll ticks do not invalidate the entire layout tree.
  - [ ] Ensure the entire routine DOM is rendered once, fully cached, and instantly responsive without mid-scroll redraws.

---

## 🚀 Active / Next Priorities

### 1. Cloud Sync Status Indicator (`☁ Live` vs `☁ Offline`)
- [ ] **Live Indicator**: Add a prominent yet elegant status badge/icon in the header/settings indicating the cloud Google Sheet is connected and syncing seamlessly (e.g., `🟢 Cloud Live` or `☁ Live` with a soft green pulse).
- [ ] **Offline Indicator**: When disconnected, no internet, or endpoint unreachable, clearly display `⚪ Sheet Offline` or `⚠ Offline Mode` with last sync timestamp.
- [ ] **Interactive Sync Details**: Tapping the status pill reveals connectivity diagnostics (endpoint URL, ping status, last successful fetch, manual re-sync button).

### 2. Utopian Night Mode (Dark Glass Refraction Theme)
- [ ] Add `utopian-night` theme as a dark/night counterpart to the Utopian Glass aesthetic under the `🪟 Glass Materials` family.
- [ ] Aesthetic specification:
  - Deep obsidian & translucent midnight-sapphire backdrop (`linear-gradient(145deg, #070d18, #0e1a2e)`).
  - High-refraction frosted glass diffusion (`backdrop-filter: blur(28px) saturate(220%)`).
  - Luminous iridescent cyan/neon edge highlights (`inset 0 1.2px 1px rgba(0, 229, 255, 0.45)`).
  - Deep crystalline drop shadows, glowing cyan accents, and crisp high-contrast typography optimized for low-light environments.
- [ ] Add theme option in Settings drawer under the Glass Materials category.
- [ ] Register CSS variables in `styles.css` and wire into `updateThemeSelectorUI` in `app.js`.

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


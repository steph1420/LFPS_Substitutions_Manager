# LFPS Substitutions Manager — Task & Todo Tracker

This tracker maintains active, upcoming, and future tasks for the **Front Desk PWA**.

---

## 🚀 Active / Next Priorities

### 1. Cloud Sync Status Indicator (`☁ Live` vs `☁ Offline`)
- [ ] **Live Indicator**: Add a prominent yet elegant status badge/icon in the header/settings indicating the cloud Google Sheet is connected and syncing seamlessly (e.g., `🟢 Cloud Live` or `☁ Live` with a soft green pulse).
- [ ] **Offline Indicator**: When disconnected, no internet, or endpoint unreachable, clearly display `⚪ Sheet Offline` or `⚠ Offline Mode` with last sync timestamp.
- [ ] **Interactive Sync Details**: Tapping the status pill reveals connectivity diagnostics (endpoint URL, ping status, last successful fetch, manual re-sync button).

### 2. UI Viewport Rethinking & Commercial-Grade Adaptive Layout
- [ ] **Zero-Scroll Desktop Default View**:
  - Restructure desktop layout density so the primary routine grid and controls fit above the fold without requiring vertical scrolling down.
  - Streamline header height, compact the teacher absence tray into a clean horizontal rail or collapsible dock, and maximize master timetable grid viewport area.
- [ ] **Commercial Mobile vs Desktop Adaptive Architecture**:
  - Benchmark against top commercial productivity apps (Linear, Apple Calendar, Notion).
  - **Full Mobile Parity**: Guarantee **100% functional parity on mobile** (since teachers predominantly use mobile phones). No feature removed or compromised.
  - **3-Dot Overflow Menu (`⋮`)**: Move secondary/infrequently accessed actions (e.g., Master Baseline Reset, Export/Print, Advanced Settings, Theme switcher, Procedural generator) into a clean, tactile overflow menu.
  - **Dynamic Viewport & Screen Calculation Engine**:
    - Continuously evaluate available screen geometry (`window.innerWidth`, `window.innerHeight`, `window.visualViewport`, safe-area insets).
    - Dynamically adapt layout density, font scaling, column constraints, and sticky boundaries.
    - Guarantee touch operability with minimum 44×44px hit targets and high-contrast readability.

### 3. Utopian Glass Theme Complete Overhaul ("Divergent Upper-City Aesthetic")
- [ ] **True Architectural Glass Sheen & Depth**:
  - Overhaul the current flat pastel-blue look into a surreal, pristine architectural glass aesthetic inspired by *Divergent* upper-city minimalist offices.
  - Implement real glass optical traits: crystalline top-edge sheen (`inset 0 1px 1px rgba(255, 255, 255, 0.95)`), multi-stop iridescent prism borders (`linear-gradient(135deg, rgba(255,255,255,0.8), rgba(56,189,248,0.4), rgba(244,114,182,0.25))`), heavy frosted diffusion (`backdrop-filter: blur(28px) saturate(190%)`), and glowing cyan/ice-white ambient reflections.
  - Extend seamless glassy materials across app header, teacher roster avatars, routine grid cells, badges, and floating limbo tray.

### 4. Theme Sub-Category & Variant Hierarchy
- [ ] **Base Theme Families & Curated Variants**:
  - Group themes into logical **Base Categories** with dedicated **Sub-Category Variants**:
    - **Glass & Translucent Materials**:
      - *Utopian Glass*: Architectural Divergent upper-city minimalist glass, iridescent prism edge, cyan luminescence.
      - *Retro Glass*: Tactile pocket calculator keycaps, concave button physics, vintage amber/violet accents.
      - *Aero Frost*: Apple Liquid Glass / Windows Aero fluid frosted acrylic.
      - *Cyber Smoked Glass*: Dark smoked glass with neon refraction borders.
    - **Clean Minimalist & Paper**:
      - *Classic Light*: Pure Apple HIG light palette.
      - *Warm Sepia*: Editorial book paper, gentle cream tones for low eye strain.
      - *High-Contrast Studio*: Sharp black-on-white clarity for bright rooms & projectors.
    - **Dark & Night Modes**:
      - *Classic Dark*: Balanced slate & graphite dark mode.
      - *Midnight OLED*: True deep black (`#000000`) for OLED power saving.
      - *Slate Nord*: Cool Arctic Scandinavian palette with muted icy tones.
- [ ] **Settings Sub-Category Theme Selector UI**:
  - Update Settings panel with segmented category pills (e.g. `🪟 Glass`, `☀️ Light`, `🌙 Dark`) revealing nested variant swatches for intuitive selection.

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

---

## 📋 Completed Tasks (Recent)

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


# Front Desk PWA - Architecture & Developer Guide
**Current Version:** v1.17
**Project Type:** Vanilla JS/HTML/CSS Offline-First PWA
**Purpose:** School substitution management and daily timetable resolution.

## 1. Core Philosophy & AI Directives
*   **Zero Dependencies:** Strict Vanilla JS and CSS. Do NOT introduce React, Vue, Tailwind, jQuery, or any external libraries.
*   **Surgical Edits Only:** Never replace entire files. Edits must always be targeted, surgical line diffs to conserve AI token quota and eliminate code regressions.
*   **Crash-Proof Memory:** The `state` object is the single source of truth. Every mutation must synchronously write to `localStorage` (`'lfps_frontdesk_state'`). If the browser crashes, zero progress is lost.
*   **Tactile, Apple-Inspired UI:** The UX prioritizes "juicy" physics. We use CSS Grid for layout transitions (no UI jumping), glass-morphism (`backdrop-filter: blur`), and soft variables (`--accent-pink`, `--shadow-soft`).

## 2. Project Logbook & Achievements (Up to v1.17)
*   **Stable Grid Matrix:** Transitioned from floating overlays to a solid, scrollable timetable grid.
*   **Copy-and-Overwrite Drag Engine:** Built a custom HTML5 drag-and-drop engine where classes overwrite targets rather than swapping. 
*   **The Limbo Dock:** Engineered a sliding, glass-morphism floating dock at the bottom of the screen to catch displaced classes without causing layout shifts.
*   **Context-Aware Undo Engine:** Built a dual-stack history array capable of reverting specific grid moves, batch auto-resolutions, and full baseline schedule resets.
*   **Mobile-First Polish:** Built a custom iOS-style bottom sheet for substitute selection with swipe-to-dismiss physics and event-propagation stops to eliminate mobile "ghost clicks".
*   **Animation Polish:** Implemented highly specific, tactile animations (red flash overwrites, dropping ghost text, bouncy pop-ins).

## 3. The Data Shape & Spreadsheet Integration
The system relies on a master matrix (currently mocked, pending live Google Sheets CSV integration).
*   **Matrix Structure:** Rows represent Teachers (`Mr. Stephen`, `Mrs. Midha`). Columns represent Periods (`GOLDEN HOUR`, `1st Pd.`, `BREAKFAST`, etc.).
*   **Static Cells:** `BREAKFAST` and `PLAY TIME` are non-editable global breaks.
*   **State Mapping:** `state.schedule[day][period][teacher] = 'CLASS NAME'`.

## 4. Core State Architecture (The Brain)
```javascript
const state = {
    day: 'MON',
    isEditMode: false,
    absentTeachers: new Set(),
    baseSchedule: {}, // Immutable master timetable (used to detect orphans)
    schedule: {},     // Active, mutable working grid
    substitutions: {}, // Tracks: { [day]: { [period]: { [absentTeacher]: subTeacher } } }
    displaced: { 'MON': [] }, // Holds overwritten classes (The Limbo Dock)
    actionHistory: { grid: [], subs: [] } // Dual-stack undo engine
};
```

## 5. Interaction Rules & Engine Mechanics
*   **Grid Movement:** Dragging Class A onto Class B overwrites Class B. Class B becomes a "newly displaced" object and gets pushed into `state.displaced`. The original slot for Class A becomes `'Free'`.
*   **Displaced Classes (Limbo Dock):** Dragging an item *out* of the Limbo Dock removes it from `state.displaced`.
*   **Substitutions Dashboard:** Unassigned absences generate Pink alert cards. Assigned absences generate Green resolved cards (tracking who covered what).
*   **Dual-Stack Undo Routing:** The undo engine (`getActiveHistoryStack()`) dynamically targets `state.actionHistory.subs` when on `#tab-substitutions` and `state.actionHistory.grid` when on `#tab-dashboard`.
*   **Baseline Resets:** Clicking "Reset" copies `baseSchedule` back into `schedule`, clears `displaced` and `substitutions`, and logs the entire action as a single undoable event.

## 6. UI/UX Animation Dictionary
*Do not alter these CSS animation classes unless explicitly required.*
*   `flashRedOverwrite`: Triggers a soft pink ring and inset background when a grid cell is overwritten. (Dark-mode safe using `rgba`).
*   `ghostSlideOut`: Overwritten class text turns pink and physically slides down (`45px`) out of the grid cell.
*   `popIn`: Bouncy entry physics (`cubic-bezier(0.175, 0.885, 0.32, 1.275)`) applied strictly to newly dropped cells and the *newest* displaced item entering the tray.
*   `cell-dragging`: Shrinks to 95% scale and fades to 40% opacity instantly when a cell is grabbed.

## 7. Upcoming Roadmap (Next Tasks)
1.  **Live Google Sheets Pipeline:** Replace `generateSimulatedData()` with a `fetch()` engine to parse a live published CSV.
2.  **Version Conflict Resolution:** Add timestamps to `localStorage` savestates. If the live CSV updates, prompt the user to resolve Cloud vs. Local states on boot.
3.  **Priority Preference Matrix:** Implement a secondary CSV tab to map teacher subject preferences. Upgrade the `performAutoResolve()` algorithm to a constraint-satisfaction engine based on these priorities.
4.  **Native Dark Mode:** Implement a robust CSS variable system using `prefers-color-scheme` with a manual toggle override.

## 8. File Map & Project Directory
*   `index.html`: Core markup, header controls, day segmented controller, grid view, substitutions conflict list, and iOS bottom sheet modal.
*   `styles.css`: Apple-inspired styling, CSS variables, glassmorphism headers, responsive tables, tactile animations (`popIn`, `ghostSlideOut`, `flashRedOverwrite`).
*   `app.js`: State management (`state`), event listeners, drag-and-drop mechanics, limbo dock renderer, bottom sheet controller, and dual-stack undo engine.
*   `ARCHITECTURE.md`: Living documentation, project logbook, memory palace, and technical reference.

## 9. Session Log & Incremental Changelog
*   **v1.17 Baseline**: Completed review of `app.js`, `styles.css`, and `index.html`. Confirmed dual-state architecture (`baseSchedule` vs `schedule`), drag-and-overwrite mechanics, and iOS touch physics.
*   **Documentation Baseline**: Initialized and updated `ARCHITECTURE.md` with strict surgical editing rule, state engine mapping, dual-stack routing explanation, and project file guide.
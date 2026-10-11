# Front Desk PWA - Architecture & Developer Guide
**Current Version:** v1.21
**Project Type:** Vanilla JS/HTML/CSS Offline-First PWA
**Purpose:** School substitution management and daily timetable resolution.

## 1. Core Philosophy & AI Directives
*   **Zero Dependencies:** Strict Vanilla JS and CSS. Do NOT introduce React, Vue, Tailwind, jQuery, or any external libraries.
*   **Natural Function & Context Rewrites:** Rewrite complete functions and logical units naturally with full contextual reasoning so code logic is robust and cohesive, allowing the editor extension to generate clean inline diffs.
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
*   **Matrix Structure:** Rows represent Teachers (`Mr. Stephen`, `Mrs. Midha`). Columns represent Periods (`GOLDEN HOUR`, `1st Pd.`, `BREAKFAST BREAK`, `2nd Pd.`, `3rd Pd.`, `4th Pd.`, `5th Pd.`, `2nd GOLDEN HOUR`, `6th Pd.`, `7th Pd.`).
*   **Static Cells:** `BREAKFAST BREAK` is the global non-editable break. Both Golden Hours (`GOLDEN HOUR` and `2nd GOLDEN HOUR`) are fully assignable.
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
*   **Technical Specifications Integrated**: Appended technical blueprints for RFC 4180 CSV parser, priority preference matrix heuristics, cloud vs local sync workflow, and Apple HIG dark mode tokens.
*   **v1.18 Release (Native Dark Mode & Apple Theme Switcher)**: Implemented full Apple HIG dark mode token system with automatic `@media (prefers-color-scheme: dark)` detection, manual toggle override via `data-theme` attribute and `localStorage` persistence. Added tactile, circular Apple-style theme toggle button with dynamic SVG Sun/Moon vector icon switching. Updated script and style assets to v1.18 cache-busting queries.
*   **v1.19 Release (Theme Toggle Event Fix & Robust Selector Binding)**: Eliminated double-invocation race condition caused by duplicate inline onclick and addEventListener handlers. Simplified boolean state toggling, bound `data-theme` to both `html` and `body`, updated CSS theme selectors from `:root[data-theme]` to `[data-theme]`, and bumped cache-busting tags.
*   **v1.20 Release (Interactive Grid Hovers & Period Refactoring)**: Implemented interactive hover indicators and synchronized row/column highlights for teacher names and period headers. Renamed 'BREAKFAST' to 'BREAKFAST BREAK'. Replaced non-editable 'PLAY TIME' with fully assignable '2nd GOLDEN HOUR' (both Golden Hours now fully editable, draggable, and substitute-eligible). Added automatic backward-compatible storage migration for period names.
*   **v1.21 Release (Banner Removal & Bottom Sheet Fix)**: Removed the intrusive 'Fully Covered' notification banner from the Substitutions tab. Fixed bottom sheet teacher selection popup by removing blocking `.hidden` class from markup, ensuring smooth transition open/close, and globally exporting handlers to `window`.

## 10. Appendix: Technical Specifications

### 10.1 Google Sheets CSV Pipeline & RFC 4180 Parser
Custom lightweight state-machine parser to handle Google Sheets edge cases without external dependencies:

```javascript
function parseCSV(text) {
    let result = [];
    let row = [];
    let cell = '';
    let inQuotes = false;
    
    for (let i = 0; i < text.length; i++) {
        let char = text[i];
        if (char === '"' && text[i+1] === '"') { 
            cell += '"'; i++; // Handle escaped quotes
        } else if (char === '"') { 
            inQuotes = !inQuotes; // Toggle quote state
        } else if (char === ',' && !inQuotes) { 
            row.push(cell.trim()); cell = ''; // End of cell
        } else if (char === '\n' && !inQuotes) { 
            row.push(cell.trim()); result.push(row); row = []; cell = ''; // End of row
        } else if (char !== '\r') { 
            cell += char; 
        }
    }
    if (cell) row.push(cell.trim());
    if (row.length > 0) result.push(row);
    return result;
}
```

**State Mapping Schema:**
* **Row 0 (Headers):** `['Teacher', 'GOLDEN HOUR', '1st Pd.', 'BREAKFAST', ...]`
* **Row 1+ (Data):** Loop through rows. `col[0]` is teacher name. Loop through `col[1]` to `col[N]`.
* **Mapping:** `state.schedule[day][ headers[i] ][ teacher ] = col[i] || 'Free'`

---

### 10.2 Priority Preference Matrix Specification
Secondary Google Sheets tab guiding `performAutoResolve()`:

**Data Dictionary:**
1. **Teacher Name:** (e.g., `Mr. Stephen`)
2. **Priority Tier:** `1` (Primary Sub), `2` (Secondary Sub), `3` (Emergency Only)
3. **Max Subs/Day:** Integer limit (e.g., `2`)
4. **Preferred Subjects:** Comma-separated (e.g., `MATH KGA, ENG KGB`)

**Constraint-Satisfaction Heuristic:**
1. **Filter 1 (Availability):** Teachers marked `'Free'` for that period.
2. **Filter 2 (Fatigue):** Exclude teachers reaching `Max Subs/Day` threshold in `state.substitutions`.
3. **Sort 1 (Preference Match):** Prioritize teachers whose `Preferred Subjects` includes target class.
4. **Sort 2 (Tier):** Sort remaining candidates by `Priority Tier` (1 -> 3).
5. **Assign:** Select candidate at `index[0]`.

---

### 10.3 Cloud vs. Local Version Conflict Resolution UX
* Checks dedicated `Timestamp` cell (e.g., cell A1) against `state.lastSyncTimestamp`.
* If `cloud_timestamp > local_timestamp`, triggers Apple-style centered glassmorphic alert:
  * **Title:** "Schedule Updated"
  * **Body:** "The master routine was updated at [Time]. You have unsaved local changes on your grid."
  * **Action 1 (Destructive):** "Overwrite Local Grid" (Erases local edits, applies new CSV, resets limbo tray).
  * **Action 2 (Primary):** "Keep My Edits" (Updates `baseSchedule` silently in background, preserves active working grid, updates sync timestamp).

---

### 10.4 Complete Apple HIG Dark Mode Token Palette
```css
/* LIGHT MODE (Default) */
:root {
    --bg-color: #f2f2f7;          /* SystemGray6 */
    --surface-color: #ffffff;     /* Pure White */
    --surface-elevated: #ffffff;  /* Modals/Popups */
    --text-primary: #1c1c1e;
    --text-secondary: #8e8e93;
    --border-color: #e5e5ea;      /* SystemGray5 */
    
    /* Contrast-Safe Accents */
    --accent-blue: #007aff;
    --accent-red: #ff3b30;
    --accent-pink: #ff2d55;
    --accent-green: #34c759;
    
    /* Status Backgrounds */
    --bg-assigned: #e5f0ff;
    --bg-missing: #fff0f5;
    --bg-resolved: #f0fff4;
}

/* DARK MODE OVERRIDES */
@media (prefers-color-scheme: dark) {
    :root {
        --bg-color: #000000;          /* Pure Black */
        --surface-color: #1c1c1e;     /* SystemGray6 (Dark) */
        --surface-elevated: #2c2c2e;  /* SystemGray5 (Dark) */
        --text-primary: #f2f2f7;
        --text-secondary: #aeaeb2;
        --border-color: #38383a;      /* SystemGray4 (Dark) */
        
        /* Desaturated Accents for Dark Mode Legibility */
        --accent-blue: #0a84ff;
        --accent-red: #ff453a;
        --accent-pink: #ff375f;
        --accent-green: #30d158;
        
        /* Status Backgrounds (Opacity adjusted for dark surfaces) */
        --bg-assigned: rgba(10, 132, 255, 0.15);
        --bg-missing: rgba(255, 55, 95, 0.15);
        --bg-resolved: rgba(48, 209, 88, 0.15);
    }
}
```
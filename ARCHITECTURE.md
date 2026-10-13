# Front Desk PWA - Architecture & Developer Guide
**Current Version:** v1.29
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
1.  **[CO-TEACHING] Shared Badge, Drag-to-Split & Selective Auto-Resolve:**
    *   **Shared Slot Badge & Tap Inspection:** When co-teachers share the same subject/class in the same period, display a harmonious badge on their slots (`👥 Co-teaching`). Tapping the cell presents an immediate popover/tooltip highlighting who they are sharing with (and allows jumping directly to the partner's row).
    *   **Direct Drag-to-Split:** A missing substitution cell can be dragged directly onto either co-teacher's slot to split them—assigning that teacher to the substitution while their partner continues teaching the original class unperturbed (no Limbo displacement needed). The shared badge on the partner's slot greys out (`👥 Solo (split)`) to clearly communicate that the partner is now covering the class alone.
    *   **Selective Auto-Resolve:** When all free teachers are exhausted, Auto-Resolve presents an interactive modal listing available co-teacher splits: allows selecting which teacher(s) to split, or choosing "None" to preserve all co-teaching pairings.
2.  **[RESPONSIVE / ERGONOMICS] Mobile Portrait Header Compact Mode / Small Screen Detector:**
    *   On narrow portrait screens (< 480px) where the header controls get cramped, dynamically detect viewport width or compact mode:
    *   Transition action buttons to an Apple-style compact horizontal scroll strip or iconified pills (`↺`, `✎ Edit`, `⚙`) with tooltip/aria labels, preventing title wrapping or control overflow.
3.  **[THEME] Retro Glass Expansion Across the Entire UI:**
    *   Extend the retro glass calculator aesthetic from just grid cells to the entire interface: app header, buttons, segmented controllers, bottom navigation bar, limbo tray items, and modals, giving the whole app a cohesive vintage glass keycap feel.
4.  **[THEME] "Utopian Glass" (Surreal Minimalist Architectural Glass):**
    *   A futuristic, hyper-clean aesthetic inspired by architectural minimalism (*Divergent / Insurgent / Blade Runner 2049* pristine corporate look).
    *   Ultra-fine frosted glass backdrops (`backdrop-filter: blur(28px)`), iridescent subtle prismatic edge borders (`linear-gradient(135deg, rgba(255,255,255,0.7), rgba(120,200,255,0.2), rgba(255,180,220,0.15))`), crisp typography, and luminous ambient cyan/white reflections.
5.  **[SHOWCASE] Interactive "Feature Overview & Capabilities" Tour:**
    *   A rich, Apple HIG visual walkthrough modal / sheet accessible from Settings and the header that elegantly showcases Front Desk's full power:
        *   Master Timetable Grid & Real-time Class Matrix
        *   Marking Absences & Live Substitution Conflict Cards
        *   Drag-and-Drop Direct Substitution & Limbo Dock Displacement
        *   Cross-Period Substitution with Lock Toggles
        *   Real-Time Collision Detection & Co-Teaching Split Engine
        *   Multi-Theme Engine (Light, Dark, Sepia, Nord, Retro Glass, Utopian Glass)
        *   Dual-Stack Undo / Redo with Zero Dependency Offline-First Persistence.
6.  **Live Google Sheets Pipeline:** Replace `generateSimulatedData()` with a `fetch()` engine to parse a live published CSV.
7.  **Version Conflict Resolution:** Add timestamps to `localStorage` savestates. If the live CSV updates, prompt the user to resolve Cloud vs. Local states on boot.
8.  **Priority Preference Matrix & Smart Solver:** Implement a secondary CSV tab to map teacher subject preferences. Upgrade the `performAutoResolve()` algorithm to a constraint-satisfaction engine based on these priorities.
9.  **Auto-Resolve Multi-Option Proposals (Max 3 Solutions):** Generate up to 3 distinct substitution schedule possibilities when auto-resolving. Display them as compact tabs/segmented controls with preview details and an explicit "Apply Solution" action.
10. **Substitutions View Redesign (Register / Ledger):** Transition from bulky cards to a compact, high-density Daily Substitution Register tailored for at-a-glance administrative overview.
11. **Expanded Fit-Grid View (Mobile Landscape):** Provide an expanded view mode that, on mobile in landscape orientation, dynamically scales/fits the master timetable grid to the screen width while maintaining smooth scrollability. In this fitted mode, display a sticky top bar with a "Back to Normal" toggle button.
12. **In-App Master Routine Editor:** Provide a native editor directly within the app to create, adjust, and modify the master routine/timetable without requiring external spreadsheet modifications.
13. **Protected Routine Editing (Multi-User Access Levels):** Role-based access control (RBAC) / tiered permissions (e.g. Admin vs. Front Desk / Teacher viewer) with passcode/PIN protection to safeguard the master routine from unauthorized modifications while keeping daily substitutions accessible.
14. **[CO-TEACHING] Inline Release Button Next to Teacher's Name:**
    *   In the Co-Teaching inspector popup (`#co-teach-modal`), reposition the "Release" action button directly inline next to each teacher's name in their respective card/row.
    *   Allows immediate 1-click release of either teacher directly beside their profile, rather than bottom stacked buttons.
15. **[SUB-ACCEPTANCE] Teacher Substitution Acceptance Flow with 10s Countdown Undo Window:**
    *   Provide an **Accept** button on substitution cards/cells for assigned teachers to acknowledge and accept their assigned substitution.
    *   **10-Second Undo Window:** Pressing Accept initiates an interactive 10-second countdown timer toast (`Accepting in 10s... [Undo]`) allowing the teacher to cancel/undo the acceptance before it finalizes.
    *   **Lock-in & Broadcast:** Once the 10-second timer expires without cancellation, the substitution acceptance is finalized, locked, reported to the server, and visually updated across the board with an Apple HIG verified checkmark (`✓ Accepted`).
    *   **Immutable Teacher Lock:** Once finalized with timeout, the teacher cannot unaccept or revoke it. Only an Administrator or Academic Coordinator (AC) possesses the permission level to revoke or reassign that acceptance.
16. **[DISPUTE ENGINE] Role-Gated Substitution Dispute Setting & Workflow:**
    *   **Admin/AC-Only Setting:** An optional configuration setting toggle in Settings (`Allow Substitution Disputes`), strictly visible to Administrator and Academic Coordinator roles.
    *   **Dispute Button & Reason Modal:** When enabled, substitute teachers who receive an assignment have access to a "Dispute" button.
    *   **Optional Rationale Input:** Clicking Dispute opens a concise Apple HIG sheet with an optional reason text box (e.g. lab setup, prior student counseling, grading urgency) before submitting the dispute flag to the admin/AC substitution dashboard.
17. **[OFFICIATING CT] Assign Officiating Class Teacher on CT Absence:**
    *   When a Class Teacher (CT) is marked absent for the day, prompt or provide an action to assign an **Officiating Class Teacher (offCT)** for that class section.
    *   The officiating CT temporarily assumes morning attendance, student management, and daily register responsibilities for that class.
    *   Visually tagged in the routine and substitution register with an Apple HIG badge (e.g. `📋 Officiating CT - 9A`).
18. **[AC ROLES & DELEGATION] Assistant AC Equivalence & Officiating AC (offAC) Delegation:**
    *   **Assistant Academic Coordinator (Asst AC) Parity:** Grant identical administrative and substitution management permissions to the Assistant AC as the primary Academic Coordinator (AC).
    *   **Dual-Absence Contingency (Officiating AC):** If both the AC and Assistant AC are absent on the same day, provide an admin/system prompt and option to assign an **Officiating AC (offAC)** for the day.
    *   **Inherited Ephemeral Permissions:** The assigned `offAC` inherits full AC administrative permissions (substitution resolution, dispute review, acceptance overrides) strictly for that day, resetting automatically on the next school day.

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
*   **v1.22 Release (Drag-to-Assign Substitutions in Main Grid & Bidirectional Sync)**: Implemented full drag-and-drop substitution assignment on the master routine grid. Dragging an absent teacher's missing class onto an available teacher immediately registers `state.substitutions`, displays green Apple HIG covering tags (`.cell-sub-active`) and covered indicators (`.cell-covered`), displaces busy teachers' tasks into the Limbo Dock, updates the Substitutions tab count/badges/cards in real-time, and enables drag-to-reassign and drag-to-unassign. Synchronized dual-stack history undo engine across both views.
*   **v1.23 Release (Redo Engine, Settings Modal, Cross-Period Dragging & Streamlined UI)**: Deprecated and removed the obsolete Cards page (`#tab-cards`) and bottom navigation tab. Introduced paired dual-stack Redo engine with `#header-redo-btn` and keyboard shortcuts (`Cmd+Shift+Z` / `Ctrl+Y`). Built Apple HIG Settings modal with persistent "Same-Period Lock" toggle switch. When Same-Period Lock is disabled, cross-period drag-and-drop substitutions are fully enabled across the grid with multi-period Limbo displacement and dual-stack undo/redo support.
*   **v1.24 Release (Collision Engine, Retro Glass Calculator Theme, Soft Splitter Navigation & Settings Hub)**:
    *   **Collision Detection & Harmony Matrix**: Built real-time cross-grid collision engine detecting duplicate class section bookings in the same period. Animated with the Apple-inspired "Gentle Radar" breathing amber ring (`@keyframes collisionBreathe`), corner conflict badges, hover inspection details, and interactive counter pill in the routine header. Configurable via Settings toggle.
    *   **Retro All-Glass Calculator UI & Extended Themes**: Replaced binary header toggle with a centralized Settings Theme Selector featuring 7 palettes (Auto System, Classic Light, Warm Sepia, Classic Dark, Midnight OLED, Slate Nord, and **Retro Glass**). The Retro Glass theme introduces curved translucent button keycaps on grid cells with specular top-sheen highlights, refractive border bevels, and tactile depression physics reminiscent of vintage pocket calculators.
    *   **Ergonomic Undo/Redo Group**: Replaced layout-shifting button toggles with a stable, segmented `.history-btn-group` pill. Buttons use disabled states (`opacity: 0.35; pointer-events: none;`) to permanently eliminate rapid-click jumping loops.
    *   **Cross-Period Substitution Highlighting Fix**: Resolved target period cell mapping so substitutes assigned across different periods only highlight their actual teaching period cell, not the original period column.
    *   **Soft Splitter Bottom Bar**: Added a subtle visual divider dividing the bottom tab bar with full-zone touch hitboxes (`.nav-zone`) for seamless tab switching.
    *   **Minimize Alerts / Quiet Mode**: Added persistent toggle in Settings to mute routine toasts and reduce notifications.
    *   **Fluid Sheet Physics**: Enhanced touch drag-to-dismiss physics on `#bottom-sheet` and handle with `touch-action: none` and elastic dismiss thresholds.
*   **v1.25 Release (Collision-Free Realistic Master Mock Engine & Schema Versioning)**:
    *   **Realistic Teacher-Subject Curriculum Mapping**: Refactored `generateSimulatedData()` to assign distinct, curriculum-accurate subject and class sections per teacher (Math, English, Science/Physics/Chemistry/Bio, History/Geography, Hindi/Sanskrit, Computer/IT, Physical Ed, and Arts/Crafts).
    *   **Collision-Free Routine Generation**: Integrated strict per-period class section tracking (`usedClassesInPeriod`) ensuring 0 initial collisions upon generation.
    *   **Automatic Schema Migration**: Introduced `schemaVersion: '1.25'` in local storage state to automatically replace legacy collision-heavy mock data upon upgrade.
*   **v1.26 Release (Smart Co-Teaching Engine, Selective Auto-Resolve Split, Utopian Glass & Full Retro Glass UI, Feature Tour & Mobile Compact Header)**:
    *   **Smart Co-Teaching & Shared Badges**: Legitimate co-teaching classes (e.g. Mr. Stephen & Mrs. Midha co-teaching MATH 10A) display a prominent purple `👥 Co-teaching` badge with purple accent border. Tapping/clicking any co-teaching slot inspects the pairing, generates an informational toast, and highlights the sharing partner's slot across the grid with an animated breathing ring.
    *   **Direct Drag-to-Split**: Dragging an absent teacher's missing class onto either co-teacher's slot splits them cleanly—assigning the sub to that teacher while their partner continues teaching the class without displacing anything to Limbo. The remaining partner's badge changes to a muted `👥 Solo (split)`. Fully reversible via undo/redo.
    *   **Selective Auto-Resolve Co-Teaching Split Modal**: When free teachers are exhausted, Auto-Resolve prompts with an Apple HIG modal (`#split-resolve-modal`) allowing administrators to choose specifically which co-teacher(s) to split (formatted concisely as `Split [Teacher] to [Period]`), or choose "Keep All Paired" with 1-click execution.
    *   **Collision Engine Co-Teaching Awareness**: Refactored collision detection to recognize legitimate base co-teachers, preventing false conflict alerts on shared classes.
    *   **Mobile Portrait Header Compact Mode**: Added small-screen responsive media queries (`@media (max-width: 580px)`) that hide text labels and preserve compact icon buttons (`↺`, `✎`, `⚙`, `💡`), eliminating header overflow on mobile portrait screens.
    *   **Retro Glass Full UI Expansion**: Expanded the vintage curved glass calculator aesthetic beyond grid cells to headers, buttons, pills, dock, bottom nav, and modal dialogs.
    *   **Utopian Glass Theme**: Added a surreal minimalist corporate architectural glass theme (*Divergent/Insurgent* aesthetic) with deep frosted blur (`backdrop-filter: blur(28px)`), iridescent prismatic edges, and luminous cyan/white ambient glow.
    *   **Feature Overview Showcase**: Added an interactive visual modal (`#tour-modal`) accessible via header button (`💡`) and Settings, detailing the full feature set.
    *   **Schema 1.26 Migration**: Auto-migrated `schemaVersion` to `'1.26'` with realistic co-teaching seed pairings on Monday, Wednesday, and Friday.
    *   **Option-Click (`Alt + Click`) Rapid Reset Engine with Tactile Pop-In Animation & Smart Moved Subject Return**: Holding `Option`/`Alt` and clicking any grid cell or Limbo dock item instantly resets it to its pristine state and triggers a springy `.cell-just-reset` pop-in animation:
        *   If the cell has an assigned substitute (`assignedSub` or `coveringFor`), reverts the substitution immediately and returns the class to the absent teacher with bounce animation on both affected cells.
        *   **Smart Moved Subject Return (Bugfix)**: If an assignment was moved from Cell A to Cell B, Option-clicking Cell B safely returns that subject back home to Cell A (or back to Limbo if originated from Limbo), restores Cell B to its previous task, cleans up any displaced task, and fires springy tactile bounce animations on both cells without orphaning or losing the subject.
        *   **Baseline Recall**: If Option-clicking an empty or modified cell whose original baseline class was moved elsewhere, automatically locates and recalls that class back to its original slot.
        *   If clicking an item in the Limbo dock with Option key held, returns that class directly to its original teacher and period with bounce animation on the restored cell.
        *   Even if already at baseline, triggers an immediate springy bounce feedback confirming pristine state.
        *   Logged as reversible actions (`cell-reset`, `cell-reset-move`, `cell-reset-return-origin`, `cell-reset-recall`) supported by full dual-stack Undo (`Cmd+Z`) and Redo (`Cmd+Shift+Z`).
    *   **Minimalist Icon-Only Co-Teaching Badge**: Replaced bulky "Co-teaching" text label with a compact, Apple HIG icon badge (`👥` only, 11px font size) keeping grid cells clean and high-density.
    *   **Co-Teaching Inspector & Release Modal (`#co-teach-modal`)**: Tapping any co-teaching cell opens a dedicated inspector modal displaying shared details, current partner status, and an actionable **Release Teacher** button:
        *   "Release for Period": Releases the teacher from co-teaching for that specific period, marking them `Free` to take substitutions or prep while their partner continues teaching solo.
        *   "Release for Whole Day": Releases the teacher across all their co-teaching classes for the day.
        *   "Rejoin Co-Teaching": Restores a released teacher back into the co-teaching partnership.
        *   Logged as reversible actions (`co-teach-release`) in the undo/redo engine.
    *   **Class Section Collision Scanner**: Introduced regex-based class section extraction (`extractClassSection`) identifying student grade sections (`9A`, `10A`, `7B`, `11A`, etc.). Upgraded `findCollisions()` to detect student double-booking when multiple teachers teach different subjects to the same section in the same period (e.g. `GEO 9A` with `SCI 9A` in Period 5).
    *   **Intelligent Co-Teaching Disambiguation**: Differentiates legitimate co-teaching (teachers sharing the *same* subject for that section) from conflicting double-booked sections (different subjects for the same student cohort), triggering amber pulsing radar rings and descriptive conflict tooltips.
    *   **Collision-Free Master Generator**: Updated `generateSimulatedData()` with per-period section tracking (`usedSectionsInPeriod`) and automated overlap suppression for co-teaching seeds, guaranteeing a 100% collision-free baseline schedule.
    *   **Schema 1.27 Migration**: Bumped `schemaVersion` to `'1.27'` to automatically purge legacy overlapping mock data and refresh state with the collision-free baseline.
*   **v1.28 Release (Inline Co-Teacher Release, High-Density Daily Substitution Register, Expanded Fit-Grid View, Priority Preference Matrix & 3-Option Smart Auto-Resolve Solver)**:
    *   **Inline Co-Teacher Release (`#co-teach-modal`)**: Repositioned the `Release`, `Free Day`, and `↩ Rejoin` buttons directly inline next to each teacher's name in `.co-teacher-row`, enabling immediate 1-click release of either co-teacher right beside their name.
    *   **High-Density Daily Substitution Register / Ledger (`renderSubstitutions`)**: Upgraded the Substitutions tab from bulky cards to a scannable, high-density **Daily Substitution Register** table (`.sub-register-table`) with live summary stats (`Total`, `Pending`, `Covered %`), segmented filter pills (`All`, `Pending`, `Covered`), department tags, subject affinity badges, and 1-click `+ Assign Sub` / `Reassign` / `✕` actions.
    *   **Expanded Fit-Grid View (`toggleFitGridMode`)**: Added a 1-tap `⛶ Fit Grid` mode in the routine header that scales the entire master timetable grid to 100% of the screen width (`body.fit-grid-mode`)—ideal for mobile landscape viewing—complete with a sticky floating top bar (`#fit-grid-sticky-bar`), compact day switcher pills, and a `"↙ Back to Normal"` button (or `Esc` key).
    *   **Priority Preference Matrix (`teacherPreferences` & `evaluateTeacherAffinity`)**: Built a multi-factor subject, department cluster, class-section familiarity, grade-band, and daily workload scoring engine. Also integrated affinity ranking and daily period load indicators (`Load: X/9 pds`) directly into the manual Substitute Picker Bottom Sheet (`openBottomSheet`).
    *   **Multi-Option Smart Auto-Resolve Proposals (`#auto-resolve-modal`)**: Upgraded `✨ Smart Auto-Resolve` to generate up to **3 distinct schedule strategies** displayed as interactive segmented tabs:
        *   `Option 1: Subject Match (★ Best Academic Fit)`
        *   `Option 2: Balanced Load (⚖ Lightest Workload)`
        *   `Option 3: Minimal Splits (🛡 Preserve Co-Teaching)`
        *   Includes summary metric pills (`Coverage`, `Avg Affinity`, `Co-Teach Splits`, `Peak Teacher Load`), per-row checkboxes, and a 1-click **`✨ Apply Solution`** button backed by atomic `batch-sub` undo/redo.
*   **v1.29 Release (Multi-Role Hierarchy, Assistant AC Equivalence, Officiating AC & CT Contingencies, 10s Teacher Acceptance Lock-In & Dispute Engine)**:
    *   **Role & Permission Switcher (`Admin`, `AC`, `Asst AC`, `Teacher`)**: Added a live header role badge (`#role-badge-btn`) and Settings Role Selector (`#settings-role-grid`) with Teacher Identity selector (`#active-teacher-select`). Assistant Academic Coordinator (`Mrs. Midha`) holds full parity permissions alongside primary AC (`Mr. Stephen`) and `Admin`.
    *   **Dual-Absence Officiating AC (`offAC`) Contingency**: When both `Mr. Stephen (AC)` and `Mrs. Midha (Asst AC)` are marked absent on the same day, displays `#off-ac-banner` prompting assignment of an **Officiating AC (`offAC`)** for the day (`state.officiatingAC[day]`). The assigned `offAC` automatically inherits full coordinator permissions (unlocking acceptances, reviewing disputes, managing substitutions) for that day.
    *   **Officiating Class Teacher (`offCT`) Assignment**: Mapped baseline Class Teacher sections (`10A`–`6A`) in `classTeacherMap` with `CT` badges on teacher avatars and grid rows. When any CT is marked absent, displays `#off-ct-strip` with interactive chips to assign an **Officiating Class Teacher (`offCT`)** for that section (`state.officiatingCT[day][section]`), ranking available teachers by whether they teach that section and their daily period load.
    *   **Teacher Substitution Acceptance with 10s Undo Countdown & Permanent Lock-In**:
        *   Assigned substitutions feature a **`✓ Accept`** button (`startAcceptSubCountdown`).
        *   Pressing Accept starts a live **10-second countdown timer** (`⏳ Confirming 10s • Undo`) allowing immediate cancellation (`cancelAcceptSub`) before server lock-in.
        *   Once the 10-second timer finishes, the substitution locks in (`🔒 Accepted` in `state.subStatus[day][period][absentTeacher]`) across both the Register and Routine Grid. Teachers cannot unaccept, dispute, or unassign a locked substitution; only `Admin`, `AC`, `Asst AC`, or `offAC` (`hasCoordinatorPermissions()`) can unlock (`🔓 Unlock`) or reassign it.
    *   **Admin/AC-Gated Substitution Dispute Engine**:
        *   Added `#admin-dispute-setting-row` (`Allow Substitution Disputes` toggle) in Settings, visible exclusively to `Admin`, `AC`, `Asst AC`, and `offAC`.
        *   When enabled, unaccepted substitutions show a **`⚑ Dispute`** button opening `#dispute-modal` with an optional reason text box (`#dispute-reason-input`), flagging the assignment as `⚑ Disputed` with the teacher's note displayed inline in the Daily Substitution Register.

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

---

## 11. Schema 2.0 Real Timetable Architecture & Cloud Sync Blueprint

### 11.1 School Scope & Staff Directory
Little Flower Preparatory School (Doranda, Ranchi-2) 2026–2027 Official Timetable:
*   **Classes:** `KG A`, `KG B`, `PREP A`, `PREP B`
*   **Periods:** 9 periods (`G/PD`, `1st`, `BREAK`, `2nd`, `3rd`, `4th`, `PLAYTIME / 2ND GOLDEN HOUR`, `5th`, `6th`)
*   **Staff Matrix (9 Teachers):**
    1.  `Mrs. S. Lakra` (CT `KG A` / Asst. Academic Coordinator)
    2.  `Mrs. M. Midha` (CT `KG B`)
    3.  `Mrs. R. Pahwa` (CT `PREP A` / Academic Coordinator)
    4.  `Mrs. R. Narayan` (CT `PREP B`)
    5.  `Ms. N. Horo` (2nd Teacher `KG A` — Hindi specialist)
    6.  `Ms. K. Sanga` (2nd Teacher `KG B` — Hindi specialist)
    7.  `Ms. A. Amira` (2nd Teacher `PREP A` — Holistic/Activity/Games)
    8.  `Mrs. S. Bage` (2nd Teacher `PREP B` — Holistic/Activity/Games)
    9.  `Mr. S. A. Lakra` (3rd Teacher / Support `KG A` — Games, Drill, Singing, Support)

### 11.2 Monday G/PD Parallel Activity Rule
On Monday `G/PD`, Class Teachers take English recitation (`ENG. REC.`) while Activity teachers (`Ms. A. Amira`, `Mrs. S. Bage`, `Mr. S. A. Lakra`) run outdoor Games/Drill rotating `KG A` (1st half) and `KG B` (2nd half). This is an intentional parallel activity split and is whitelisted in collision detection.

### 11.3 Class View vs Teacher View Engine
*   **Interactive Segmented Control:** `#routine-view-toggle` switches instantly between `👨‍🏫 Teachers` and `🏫 Classes`.
*   **Class View Rows:** 4 class rows (`KG A`, `KG B`, `PREP A`, `PREP B`) showing class subjects, active teachers, co-teacher partnerships (`.pill-coteach`), substitute coverage (`.pill-sub`), and unassigned absences (`.pill-missing`).
*   **Tappable Interactions in Class View:** Clicking unassigned or covered pills directly opens the substitution bottom sheet or co-teaching inspector.

### 11.4 Officiating Hierarchy
*   **Academic Coordinator (AC):** `Mrs. R. Pahwa` (Primary AC), `Mrs. S. Lakra` (Assistant AC). If both are absent, an Officiating AC (`offAC`) can be appointed who temporarily inherits coordinator privileges.
*   **Class Teacher (CT):** If a CT is absent, the officiating modal automatically recommends the preferred class team partner:
    *   `KG A`: `Mr. S. A. Lakra` (`★ Class Team (Recommended)`)
    *   `KG B`: `Ms. K. Sanga`
    *   `PREP A`: `Ms. A. Amira`
    *   `PREP B`: `Mrs. S. Bage`

### 11.5 Google Sheets Cloud Sync Blueprint
To enable live synchronization from Google Sheets in future releases:
1.  **Tab 1 (`Master_Log`):** Flat CSV format (`Class, Day, Period, Subject, Teacher Abbr, Full Name, Role`). Optimal for 1-click cloud sync and delta ingestion.
2.  **Tab 2 (`Staff_Directory`):** `Full Name, Abbr, Role, Primary Class, Secondary Class, Dept, Initials`.
3.  **Tabs 3–6 (`Class_Timetables` & `Teacher_Timetables`):** Human-readable 2D grids for printing and administrative notice boards.
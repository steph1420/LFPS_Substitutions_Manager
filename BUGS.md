# Bug Register

This register is built **only** from data already recorded in `TODO.md` (the 🐛 Critical Bug & Performance Tracker and the Job Bundle sections) and in `CHANGELOG.md`. It was compiled on 2026-10-23 from `next-gen` @ `19c1a1a`.

Some cells say "Not recorded". That means neither source states the value, and nothing here was guessed or invented. The narrative detail for each bug stays in `TODO.md`.

**Column conventions:**

- **Severity:** no source assigns severities. The TODO tracker heading reads "Critical Bug & Performance Tracker" but does not grade individual bugs. Assign a severity when the bug is next touched, using `S1 Critical`, `S2 Major`, `S3 Minor` or `S4 Cosmetic`.
- **Found in:** no source records the version in which a bug was found.
- **Fixed in:** a version (`v1.xx`) or a Job Bundle (`JB nn`). Every bundle from JB19 to JB33 is recorded under the `v2.0.0-alpha.1` CHANGELOG section.

| ID | Title | Severity | Status | Found in | Fixed in | Notes |
|---|---|---|---|---|---|---|
| BUG-01 | Limbo Tray Drag Failure & Click-to-Restore Mechanism | Not recorded | 🟢 Resolved | Not recorded | v1.35.0 | Legacy v1 app. Also in CHANGELOG v1.35.0 |
| BUG-02 | Schedule Re-rendering & Stutter During Scrolling | Not recorded | 🟢 Resolved | Not recorded | v1.35.0 | Legacy v1 app. Also in CHANGELOG v1.35.0 |
| BUG-03 | High-Density Mobile Grid & Mobile Landscape Header Overlap | Not recorded | 🟢 Resolved | Not recorded | v1.36.0 | Only in TODO; no CHANGELOG entry by ID |
| BUG-04 | Fit-Grid Portrait Mode Screen Overflow & Cell Height Distortion | Not recorded | 🟢 Resolved | Not recorded | v1.40.0 | Also in CHANGELOG v1.40.0 |
| BUG-05 | Sticky Teacher Column Translucency Clashes with Scrolling Period Cells | Not recorded | 🟢 Resolved | Not recorded | v1.40.0 | Also in CHANGELOG v1.40.0 |
| BUG-06 | Substitutions Page Failure — Missing Teacher Names & Auto-Resolve Inoperative | Not recorded | 🟢 Resolved | Not recorded | v1.44.0 | Also in CHANGELOG v1.44.0 |
| BUG-07 | Right-Click / Long-Press on Absent Teacher Only Blurs Absence Panel Without Popover Menu | Not recorded | 🟢 Resolved | Not recorded | v1.45.1 | Also in CHANGELOG v1.45.1 |
| BUG-08 | Grid Sticky Teacher Column Right Edge Border & Leftmost Under-Slide Peeking Leak | Not recorded | 🟢 Resolved | Not recorded | v1.50.0 | Also in CHANGELOG v1.50.0 |
| BUG-09 | Assign Officiating Class Teacher (Off. CT.) Modal Silent Failure | Not recorded | 🟢 Resolved | Not recorded | v1.53.0 | Last legacy release. Also in CHANGELOG v1.53.0 |
| BUG-10 | Routine Matrix Fullscreen Workstation Root View Architecture (Expand Grid blank screen) | Not recorded | 🟢 Resolved | Not recorded | JB22 (v2.0.0-alpha.1) | Fullscreen grid now renders as a separate root tree in `App.tsx` |
| BUG-11 | Settings Console Modal & Mobile Navigation Parity (broken Settings button) | Not recorded | 🟢 Resolved | Not recorded | JB23 (v2.0.0-alpha.1) | |
| BUG-12 | Marking Teacher Present Does Not Reset Their Active Substitutions | Not recorded | 🟢 Resolved | Not recorded | JB24 (v2.0.0-alpha.1) | |
| BUG-13 | Routine Grid Period Cells Trigger Teacher Absence Menu on Right-Click / Long-Press | Not recorded | 🟢 Resolved | Not recorded | JB24 (v2.0.0-alpha.1) | |
| BUG-14 | Staff Login Panel Positioning Glitch (Partially Off-Screen at Top-Middle) | Not recorded | 🟢 Resolved | Not recorded | JB24 (v2.0.0-alpha.1) | Root-mounted modals; see ADR-0003 |
| BUG-15 | Reset History Purge Context Menu Clipped & Inverted Coordinate Alignment | Not recorded | 🟢 Resolved | Not recorded | JB24 (v2.0.0-alpha.1) | Root-mounted menus; see ADR-0003 |
| BUG-16 | Tab Overview Accordion Collapse Animation Jerkiness | Not recorded | 🟢 Resolved | Not recorded | JB24 (v2.0.0-alpha.1) | |
| BUG-17 | Minimal UI Mode Toggle Has No Visual Effect | Not recorded | 🟢 Resolved | Not recorded | JB25 (v2.0.0-alpha.1) | |
| BUG-18 | Officiating Class Teacher (Off. CT.) Whole-Day Assignment & Solver Alignment | Not recorded | 🟢 Resolved | Not recorded | JB28 (v2.0.0-alpha.1) | TODO also has a stale duplicate "JB28 🔴 Queued" with this bug unchecked. Docs claim a +250 affinity bonus, but the code applies +30 (JB30 refinement). See DOC_ISSUES |
| BUG-19 | Officiating AC Persists After Marking AC Present or Marking All Present | Not recorded | 🟢 Resolved | Not recorded | JB26 | No CHANGELOG entry (there is no JB26 section). Covered by LOGIC-04 unit tests |
| BUG-20 | Misleading CT Auto-Resolve Count & Period Stamp | Not recorded | 🟢 Resolved | Not recorded | JB31 (v2.0.0-alpha.1) | CHANGELOG JB31 describes the fix without citing the ID. This is the "Moral Science" meaning of JB31 |
| BUG-21 | Missing Officiating CT Appointment Cards on Substitutions Page | Not recorded | 🟢 Resolved | Not recorded | JB31 (v2.0.0-alpha.1) | CHANGELOG JB31 describes it without the ID |
| BUG-22 | Cluttered Multiple Appoint Cards & Designation Leak in Teacher Name Overlay | Not recorded | 🟢 Resolved | Not recorded | JB32 (v2.0.0-alpha.1) | CHANGELOG JB32 describes it without the ID |
| BUG-23 | Appoint Card Pass-Thru Toggle Absence, Wide Pills to Squircle Redesign & AC Card Decluttering | Not recorded | 🟢 Resolved | Not recorded | JB33 (v2.0.0-alpha.1) | CHANGELOG JB33 describes it without the ID |

## Open items

No `BUG-xx` is currently open in any source.

The tracker also lists **PERF-01** ("Master Routine Initial Render Stutter & In-Memory Pre-Render / Keep-Warm Engine") as 🔴 Open. It is a performance item, not a numbered bug, and is kept in `TODO.md`.

### Observed during workspace setup (2026-10-23), not yet triaged

These issues were found during the JB31 workspace setup. They have **not** been assigned BUG IDs, because the owner allocates IDs. They are listed here so they are not lost. Details are in [`docs/DOC_ISSUES.md`](docs/DOC_ISSUES.md).

1. On a fresh clone, `npm run build:core && npm run build:web` (and `npm run build`) fails with `TS2307 Cannot find module '@lfps/ui'`, because no root script builds `packages/ui`.
2. Live sync is not wired:
   - the client never calls `pushAbsence`/`pushSubstitution`
   - the client ignores the `STATE_MUTATION` payload
   - the server discards inbound WS messages
3. The server's `GET /api/v1/backups` returns `/api/v1/backups/download?file=…` links, but that route is not registered.
4. The server ignores state-persist errors (`_ = s.persistLocked()`). The WS broadcast branch deletes clients while it holds only a read lock.

## How to add a bug

1. Take the next free ID (`BUG-24` onward) and add a `### BUG-xx:` entry to the TODO tracker.
2. Add a row here. Fill **Severity** and **Found in** (the version from `package.json` at the time).
3. When the bug is fixed, set the status, record the version or bundle in **Fixed in**, and cite the ID in the `CHANGELOG.md` entry.

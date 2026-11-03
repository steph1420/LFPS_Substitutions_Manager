# LFPS Substitutions Manager — Feature Guide (tour edition)

> **Living document.** Version **0.1.0** · 2026-11-04 IST · branch `bundle/44-m04-m05`.
> Covers the redesign mockups M01–M05 and the locked shared patterns. Codenames only (Teacher-A…L, ST-1). The real app loads real names live from the Sheet.
> Status words: **LOCKED** = Steve decided · **APPLIED** = recommended option used after Steve's "go" (t18u) · **PROPOSED** = not decided yet.

## How to use this guide for a tour
1. Open a phone, or desktop Chrome with DevTools → device mode (390×844, touch on).
2. Follow the chapters in order: the screens first (§1–§5), then the behaviour that applies everywhere (§6–§9).
3. Each "Demo it" block lists the exact steps and links.

Mockup base URL: `https://raw.githack.com/steph1420/LFPS_Substitutions_Manager/bundle/44-m04-m05/docs/redesign/mockups/`

| Link | Opens |
|---|---|
| [M01](https://raw.githack.com/steph1420/LFPS_Substitutions_Manager/bundle/44-m04-m05/docs/redesign/mockups/M01/index.html) | Routine, phone (still) |
| [M02](https://raw.githack.com/steph1420/LFPS_Substitutions_Manager/bundle/44-m04-m05/docs/redesign/mockups/M02/index.html) | Routine, desktop (still) |
| [M03](https://raw.githack.com/steph1420/LFPS_Substitutions_Manager/bundle/44-m04-m05/docs/redesign/mockups/M03/index.html) · [sheet](https://raw.githack.com/steph1420/LFPS_Substitutions_Manager/bundle/44-m04-m05/docs/redesign/mockups/M03/sheet.html) | Staff Roster (still) |
| [M04](https://raw.githack.com/steph1420/LFPS_Substitutions_Manager/bundle/44-m04-m05/docs/redesign/mockups/M04/index.html) | Assign Substitute (**interactive**) |
| [M04 table only](https://raw.githack.com/steph1420/LFPS_Substitutions_Manager/bundle/44-m04-m05/docs/redesign/mockups/M04/index.html?nosheet) | Table with the Assign panel lowered |
| [M04 shrunk](https://raw.githack.com/steph1420/LFPS_Substitutions_Manager/bundle/44-m04-m05/docs/redesign/mockups/M04/index.html?nosheet&state=shrunk) · [peek](https://raw.githack.com/steph1420/LFPS_Substitutions_Manager/bundle/44-m04-m05/docs/redesign/mockups/M04/index.html?nosheet&state=peek) | Name column states |
| [M04 reduce-motion](https://raw.githack.com/steph1420/LFPS_Substitutions_Manager/bundle/44-m04-m05/docs/redesign/mockups/M04/index.html?nosheet&rm) | Fades instead of springs |
| [M05](https://raw.githack.com/steph1420/LFPS_Substitutions_Manager/bundle/44-m04-m05/docs/redesign/mockups/M05/index.html) | Uncovered |

URL parameters: `?nosheet` lowers the bottom panel · `?state=shrunk|peek` starts in that state (scrolled 260 px) · `?rm` forces reduce-motion.

---

## 0. The common frame (every phone screen)
**Top header**
- Wordmark **LFPS · SUBS** with a glowing cyan dot and **LIVE**, which means connected to the live sync.
- Bell (alerts), gear (Settings, §9.5) and person (Staff login).

**Day strip MON–SAT**
- Shows the date under each day. The selected day is filled cyan.
- Each day is at least 48 px, the minimum touch size.

**Bottom tabs**
- Routine · Subs · Roster. The active tab is cyan.

**Footer stamp** under the tabs: `v2.0.0-alpha.3 · 697a8a6 · 4 Nov 2026 IST`
- Tap it to open What's New.
- Tap it 7 times to unlock Developer options (§9.5, §9.7).

**Look**
- Dark only in v1 (APPLIED, Q-43-06 a).
- The calm LUCID style: one cyan accent `#45eef8`, thin uppercase labels, and touch targets of at least 48 px.

**Why:** the front desk works mostly on phones, so every screen has the same frame and nothing needs relearning.

## 1. M01 — Routine Matrix (phone)
**What it shows**
- Teachers as rows and periods as columns: G/PD 8:00, 1st 8:15, BREAK 9:00, 2nd 9:20, 3rd 10:05, 4th 10:50, 5th 11:35, 6th 12:20.
- **Hide absent** is on in this frame, so Teacher-B and Teacher-I are hidden.
- An Away teacher (TE) has a violet underline.
- One amber "Need sub" cell and one cyan covered cell marked "↳ sub".
- A fade on the right edge hints that more columns are off screen.

**Interactions**
- Scroll the periods sideways.
- The name column became the overlay column in Bundle 44 (§6), which replaces the old "Names ▸" chip.

**Demo it:** open [M01](https://raw.githack.com/steph1420/LFPS_Substitutions_Manager/bundle/44-m04-m05/docs/redesign/mockups/M01/index.html), then show the same table working live in [M04 table only](https://raw.githack.com/steph1420/LFPS_Substitutions_Manager/bundle/44-m04-m05/docs/redesign/mockups/M04/index.html?nosheet).

## 2. M02 — Routine Matrix (desktop, 1440×900)
**What it shows**
- All 8 periods fit on screen; BREAK is a narrow column.
- Absent rows are tinted soft rose with an "Absent" pill. The Away row is violet with an "Away · duty" pill.
- Need-sub cells are amber and show **Assign ›**. Covered cells are cyan and show "↳ substitute".

**Left nav rail** (APPLIED, Q-43-04 a)
- Routine Matrix, Substitutions, Staff Roster.
- Calm KPI tiles below them: Absent 2 · Away 1 · Need sub 5 · Covered 3.

**Top bar**
- Day segment, "Live · synced 08:42 IST", bell, settings and Staff login.
- A Teachers / Classes switch, plus Sort · Role and Hide absent chips.
- The period header and name column stay in place while you scroll.

**Why:** wide screens keep the counts in view at all times.

**Demo it:** [M02](https://raw.githack.com/steph1420/LFPS_Substitutions_Manager/bundle/44-m04-m05/docs/redesign/mockups/M02/index.html).

## 3. M03 — Staff Roster (phone)
**What it shows**
- KPI tiles: Present / Absent / Away / No subs.
- Search, and a filter segment: All / Present / Absent / No subs.
- Absent cards show whether the teacher is out all day or for some periods, with a covered count.
- **Away is not counted as Absent** (LOG-D04).

**Mark all present**
- A quiet secondary action (APPLIED, Q-43-05 a), followed by an Undo toast.
- It is never a loud button, in line with LUCID's "calm and restorable" rule.

**Sheet variant:** tap a present teacher to open a bottom panel with three choices:
- Mark absent — full day.
- Mark absent — some periods.
- Mark away on duty… (choose periods and venue).

**Demo it:** [M03](https://raw.githack.com/steph1420/LFPS_Substitutions_Manager/bundle/44-m04-m05/docs/redesign/mockups/M03/index.html), then [M03 sheet](https://raw.githack.com/steph1420/LFPS_Substitutions_Manager/bundle/44-m04-m05/docs/redesign/mockups/M03/sheet.html).

## 4. M04 — Assign Substitute (phone, interactive)
**What it shows**
- The Routine table with the chosen Need-sub cell (3rd · 10:05 · EVS 1 B) outlined in amber.
- The 3rd-period header is underlined amber.
- The **Assign substitute** bottom panel:
  - Header "1 of 10 need sub".
  - Context line "3rd · 10:05 · EVS 1 B — Teacher-B is absent".
  - Candidates who are free that period, best fit first (§8). The first one is highlighted and tagged BEST FIT.
  - Each candidate shows a line such as "Free 3rd · 1 sub today".
- Buttons: **Assign Teacher-D** (primary, cyan) and **Skip for now** (quiet).

**Interactions**
- Tap the grab bar to lower or raise the panel. It slides on the shared spring, or fades with reduce-motion.
- With the panel lowered, the table works as described in §6.

**Demo it**
1. Open [M04](https://raw.githack.com/steph1420/LFPS_Substitutions_Manager/bundle/44-m04-m05/docs/redesign/mockups/M04/index.html) and point out the context line and the best-fit order.
2. Tap the grab bar to lower the panel.
3. Scroll the periods sideways and lift your finger. The name column folds once the scroll stops (§6).
4. Tap the strip to peek, tap elsewhere to close, then scroll back fully left to restore it.

## 5. M05 — Uncovered (phone)
**What it shows**
- Tiles: **Need sub 10** (amber) · **Covered 3** (cyan) · **Free now 6**.
- A switch: By period / By teacher. The PNG shows By period.
- A quiet **Auto-suggest all** button.
- Groups per period, e.g. "G/PD · 8:00 2". Each uncovered period is an amber card such as "ASSEMBLY · 1 B — Teacher-B · Absent", with a quiet amber **Assign ›** button that opens M04.
- The reason is coloured: Absent in rose, Away · duty in violet.

**Why:** a single list of everything still uncovered, ordered by the clock.

**Demo it:** [M05](https://raw.githack.com/steph1420/LFPS_Substitutions_Manager/bundle/44-m04-m05/docs/redesign/mockups/M05/index.html).

---

## 6. Name column overlay (Steve t15u–t17u, t20u) — LOCKED behaviour
Implemented in `mockups/_shared/namecol.js` and `namecol.css`.

| Rule | Exact behaviour |
|---|---|
| Overlay | The name column floats over the table on the left. Period columns slide **under** it, and nothing reflows or jumps. |
| When it reacts | Only after the finger is **lifted** AND the scroll momentum has fully stopped, like YouTube comments. During a touch it never changes. |
| Settled means | No scroll event for **80 ms** (Q-44-03, revised from 140 ms by Steve t20u), or the browser's `scrollend` event. |
| Expand | Only when it settles at the **exact** full-left edge (`scrollLeft ≤ 0.5 px`). |
| Mid-drag | Passing the start while dragging (e.g. while dragging to copy something) does **not** expand it. |
| Shrink | Settling even a few pixels away from full-left shrinks it to a **30 px** strip. The full width is 132 px. |
| Shrunk names | Turned sideways, reading **bottom to top**. |
| Font size | **One** size for every name, calculated from the longest name so it fits the row height (60 px minus 10 px padding). Range 8–12 px. |
| Tap-peek | Tapping the strip opens it to full width as a temporary overlay with a deeper shadow. It closes on a tap anywhere else or when scrolling starts. |
| Swipe | **None.** Sideways swipe already means scroll (Steve t17u). |
| Motion | Width springs over **300 ms** `cubic-bezier(.3,1.25,.55,1)` (snappier per t20u, was 420 ms). The name content crossfades over 200 ms. |
| Reduce-motion | With the OS setting or `?rm`, the width snaps and only the 200 ms fade remains. |
| Status tint | Absent names are rose with a rose gradient row; Away names are violet, in both full and strip modes. |

**Demo it:** follow the [M04 table only](https://raw.githack.com/steph1420/LFPS_Substitutions_Manager/bundle/44-m04-m05/docs/redesign/mockups/M04/index.html?nosheet) steps in §4.
- Drag right, then back past the start without lifting: it stays shrunk.
- Lift 3 px from the edge: it stays shrunk.
- Lift at 0: it expands.

## 7. Colour language — LOCKED
| Colour | Means | Where |
|---|---|---|
| Soft rose `#e39aa4` | **Absent** (Q-44-01 LOCKED; calm, not alarming, always with the word "Absent") | names, pills, row tint |
| Amber `#e8b25a` / text `#ffcf66` | **Need sub**, i.e. needs action. Only this. | cells, cards, KPI, selected-cell ring |
| Cyan accent `#45eef8` | **Covered**, the current selection, live, primary button | covered cells "↳ sub", tabs |
| Teal `#4fc3b0` | **Free** period | Free cells |
| Violet `#a77ee6` | **Away on duty**, which is not Absent | names, pills |
| Red `#c84f5a` | **Danger only**: errors, lost sync, destructive actions | never used for people |
| Grey / faint | Break, neutral | BREAK column |

## 8. Substitute best-fit order — LOCKED (Q-44-02)
Default ranking of candidates for a period:
1. Free that period.
2. Fewest substitutions today.
3. Same subject or class.

**Adjustable:** the user can reorder or turn off these criteria in a Settings option, which lives in the shared Settings registry (§9.5) under section General or Data. The UI is not drawn yet.

## 9. Shared app patterns (agent-common `08-shared-app-patterns.md`, Q-HARM-1…9) — LOCKED
### 9.1 Data layer (Q-HARM-1)
- Every screen reads and writes through one `DataSource` interface.
- Adapters: Apps Script (default), the Go relay (for live multi-device sync) and a fake adapter for tests.
- The Sheet is the source of truth; Render is only a relay.

### 9.2 Offline and updates (Q-HARM-2)
- PWA following the SoW pattern: the app shell is precached, data is kept in IndexedDB, and writes made offline are queued.
- A calm "Update ready, tap to reload" message appears.
- It **never** reloads by itself in the middle of a task, a class or a live session.

### 9.3 Motion (Q-HARM-3)
- Shared spring tokens (snappy, smooth, gentle) live in one file. Apps use named tokens, never raw numbers.
- Reduce-motion swaps springs for short fades.

### 9.4 Shared components (Q-HARM-4)
- The kit holds HoldToConfirm, Undo/Redo, AppHeader, Toggle, Tip and IndexRail.
- They are copied with version notes until the `steph-ui` package (DK-P4) locks.

### 9.5 Settings and Developer options (Q-HARM-5)
- One Settings screen with sections: General, Display, Account & Pairing, Data, About, Developer.
- **Developer** unlocks with **7 taps on the version stamp**, or through admin rights.
- Every option is declared in one registry with an id, type, default and scope. Examples: the best-fit order (§8), the device expiry days (§9.9), the settle delay.

### 9.6 Accounts and rights — modular (Q-HARM-6)
- The kit has every access option: passcode, roles, admin, pairing and accounts.
- Each app builds in **only** what it needs, so no unused code ships.
- Rights are named capabilities mapped to roles, e.g. `view.realNames`, `edit.roster`, `admin.devices`.
- Admins can see and revoke paired devices.

### 9.7 Versioning (Q-HARM-7)
- SemVer, a CHANGELOG and a tag per release.
- The footer stamp reads `vX.Y.Z · short hash · build date IST`. Tapping it opens What's New.
- Each release gets a preview link.

### 9.8 Tests (Q-HARM-8) — guidelines only
- Unit tests for logic.
- Contract tests for each data adapter.
- A few Playwright smoke tests.
- Use a TEST copy of the Sheet only.

### 9.9 Privacy and pairing (Q-HARM-9)
**Names**
- Codenames show by default.
- Real names show **without login only on a device paired with a code**, or to a logged-in user.
- Real names are never cached on unpaired devices.

**Pairing code** (based on SoW v0.34.0)
- A 6-digit code, stored as a salted SHA-256 hash.
- Expires after **5 minutes**, allows **5 tries**, works **once**, and is deleted under lock.

**When a code is used** (Steve t12u)
- Further pairing with it is blocked instantly.
- The host's pairing screen resets immediately.

**Client screen** (Steve t12u)
- The code box gets focus as soon as the screen opens, with the numeric keypad.
- It **submits automatically at the 6th digit**.
- A **QR code** can be scanned instead of typing.

**Devices**
- On claim, the bridge issues each device its own random key (at least 32 bytes) and stores only the hash.
- The device registry keeps: id, label, capabilities, pairedAt, lastSeen, revoked.
- Devices can be **revoked one at a time**. Rotating the shared token remains the emergency revoke-all.
- The device ID is random and stored on the device (IndexedDB plus a localStorage copy). It is not a hardware ID, which Steve accepted. If it is lost, pair again.

**After login**
- The user is offered **"Retain pairing on this device"**, which registers the device.
- Unused devices **expire after 90 days**. This is a Developer option.

**Setup and migration**
- Setup files never contain the shared token, only a one-time code.
- SoW migrates over one release, accepting both kinds of key.

## 10. Not built yet / placeholders
**Screens and UI**
- The Settings screen, the best-fit reorder UI, What's New, the Developer options and the pairing/QR screens are described here but not drawn.
- Not drawn yet: loading and offline sync dots (amber = degraded, red = lost), the empty "all present" roster, the Classes × Periods view, the light theme (after v1), and a desktop version of M04/M05.
- The By teacher view on M05, Auto-suggest all and the Undo toast are static in the mockups.

**Placeholders**
- The footer stamp value is fixed.
- The candidate stats and the "Best fit · Hindi, knows 1 B" tag are invented data.
- Tapping a candidate or Assign does nothing in the mockup.

**Open elsewhere**
- Q8 (names in history), Q-STACK-01 and Q-PRIV-01 (Sheet IDs) are still open in the handover DECISIONS.
- Q-STACK-02 is locked on option d: design tokens plus CSS Modules, with LFPS keeping Tailwind until its redesign.

## Changelog
- **0.1.0 — 2026-11-04 IST** — First version. Covers M01–M05, the name column (80 ms, 300 ms spring), the colour language, the best-fit order and Q-HARM-1…9. (Steve t21u)

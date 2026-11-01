# LFPS redesign — still mockups v1 (Bundle 43)

> **Status: mockups v1 — UNLOCKED.** Nothing here is decided. Only Steve locks.
> Docs/images only; no app code changed. Placeholder/codename data only (Teacher-A…L, ST-1, class names). The real app keeps reading real names from the Sheet at runtime.

**Style:** LUCID tokens (`_shared/tokens.css`, copied verbatim from `agent-common/design-options/lucid`) adapted for a school front desk. Feel copied (dark, calm, one cyan accent `#45eef8`, thin uppercase labels, ≥48 pt targets); controller content not copied. Every LFPS-specific value lives in `_shared/lfps.css` and is **PROPOSED**.

**Rebuild:** `cd _shared && python build.py` (needs `playwright` + chromium). Renders every `index.html` to PNG @2x.

| Frame | File | Size | What it shows | LOG / SCR | Role · day · sync |
|---|---|---|---|---|---|
| M01 | [`M01/M01.png`](M01/M01.png) | 390×844 @2x (phone portrait) | Guest Routine Matrix. Narrow name column (abbr, UI-14), **Hide absent ON** (Teacher-B / Teacher-I hidden), Free cells in teal, Away teacher (TE, violet underline) with one Need-sub cell (amber) and one covered cell (cyan, ↳ sub). Periods scroll sideways; right-edge fade hints more columns. Bottom tabs Routine / Subs / Roster. | LOG-D03, SCR-MAT, UI-14 | Guest · MON · Live |
| M02 | [`M02/M02.png`](M02/M02.png) | 1440×900 @2x (desktop) | Guest Routine Matrix, Teachers × Periods, all 8 periods visible (BREAK narrow). Absent rows soft rose with pill, Away row violet. Need-sub cells amber with **Assign ›** affordance; covered cells cyan with ↳ substitute. Left rail: three destinations + calm KPI tiles (Absent / Away / Need sub / Covered). Top bar: day segment, Live + last sync, bell, settings, Staff login. Sticky period header + name column intended. | SCR-MAT, LOG-D03, LOG-D04 | Guest · MON · Live |
| M03 | [`M03/M03.png`](M03/M03.png) | 390×844 @2x (phone — front desk is phone-first per guide §3.1.4) | Staff Roster, **Absent** filter. KPI tiles Present / Absent / Away / No subs, search, filter segment All / Present / Absent / No subs. Absent cards (full day vs some periods) with covered count; **Mark all present** as a quiet text action. Note that Away is not counted as Absent (LOG-D04). | LOG-D04, SCR-ROS, UI-15 | Guest · MON · Live |
| M03 sheet | [`M03/M03-sheet.png`](M03/M03-sheet.png) | 390×844 @2x | Same screen with the bottom sheet for marking a present teacher: Mark absent — full day / some periods / Mark away on duty… (periods + venue). | LOG-D04, MOD-CTX, MOD-AWAY | Guest · MON · Live |

Edge states not drawn yet (listed for v2): loading / offline sync dot (amber/red), empty "all present" roster, Classes × Periods view, light theme.

## Open questions (reply e.g. "Q-43-01 a")

**Q-43-01 — Colour for Absent.** LUCID keeps red for danger only.
- a) Soft rose `#e39aa4` (as drawn), always with the word "Absent" — **recommended**: calm, readable, not alarming
- b) LUCID danger red `#c84f5a` (breaks LUCID's "red = danger only")
- c) No colour; neutral grey + "Absent" label only

**Q-43-02 — Status colours for cells.** Drawn: Free = teal, Need sub = amber, Covered = cyan accent, Away = violet.
- a) Keep as drawn — **recommended** (amber = "needs action" matches LUCID's queued/warning meaning)
- b) Free neutral grey (less colour on screen), rest as drawn
- c) Suggest your own

**Q-43-03 — Phone matrix name column.** Drawn: narrow abbreviations (TA, TB…) with the Names ▸ chip to expand (UI-14 default).
- a) Keep narrow by default — **recommended** (shows ~3 periods at once)
- b) Show short names by default

**Q-43-04 — Desktop navigation.** Drawn: left rail with the three destinations + KPI tiles.
- a) Left rail — **recommended** (uses wide screens, KPIs always in view)
- b) Bottom tabs like phone (one layout everywhere)

**Q-43-05 — Mark all present.** Drawn as a quiet text action (undo afterwards, per LUCID "calm and restorable").
- a) Quiet action + Undo toast — **recommended**
- b) Press-and-hold to confirm
- c) Confirmation dialog

**Q-43-06 — Theme.** Guide §3.1.5 asks for one light + one dark; v1 is dark (LUCID) only.
- a) Dark only until you pick a look, then add light — **recommended**
- b) Add a light version of M01–M03 in the next bundle

**Q-43-07 — Next frames.** a) M04 Assign Substitute + M05 Uncovered (phone) — **recommended**; b) Revise M01–M03 first; c) Other order.

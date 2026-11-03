> 📘 Tour guide for all features and micro-behaviours: [`../FEATURE_GUIDE.md`](../FEATURE_GUIDE.md)

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

---

# Bundle 44 — M04 Assign Substitute + M05 Uncovered (phone, interactive)

> **Status: mockups — UNLOCKED.** Branch `bundle/44-m04-m05` off `bundle/43-mockups` (backup tag `backup/bundle-43-mockups-pre-44-20261104`). Docs/images only; no app code. Codenames only. Dark only (Q-43-06 a).

**Rebuild:** `cd _shared && python build44.py` writes the HTML (reuses `build.py` data). PNGs were rendered with Playwright/Chromium at 390×844 @2x. The HTML files are **interactive**: open them in a phone browser or in DevTools device mode with touch.

| Frame | File | What it shows |
|---|---|---|
| M04 | [`M04/M04.png`](M04/M04.png) | Routine with the selected Need-sub cell (3rd · EVS 1 B, amber ring) and the **Assign substitute** bottom sheet: free teachers for that period, best fit first, with **Assign** as the primary button and **Skip for now** as a quiet secondary. Tap the grab bar to lower the sheet. |
| M04 shrunk | [`M04/M04-shrunk.png`](M04/M04-shrunk.png) | The name column after a horizontal scroll has settled: a narrow strip with names turned sideways (reading bottom to top), all at the same font size. (`index.html?nosheet&state=shrunk`) |
| M04 peek | [`M04/M04-peek.png`](M04/M04-peek.png) | The strip after a tap: a temporary full-width overlay on top of the columns. (`?nosheet&state=peek`) |
| M05 | [`M05/M05.png`](M05/M05.png) | Uncovered: Need-sub / Covered / Free-now tiles, a By period / By teacher toggle, a quiet "Auto-suggest all" button, and each uncovered period as an amber card with a quiet **Assign ›** button. The away reason is shown in violet and Absent in soft rose. |

**Name column (Steve t15u–t17u)**, in `_shared/namecol.css` and `_shared/namecol.js`:
- It is an overlay on the left. The period columns slide underneath it, and nothing reflows.
- It changes state only after the finger has lifted **and** the scroll momentum has fully settled (no scroll event for 80 ms, or `scrollend`), like YouTube comments.
- It opens to full width only when it settles at the exact full-left edge (`scrollLeft ≤ 0.5`). Passing the start mid-drag does nothing. Settling even a few pixels away from the edge shrinks it.
- In the shrunk state, names read sideways from bottom to top. One font size, set by the longest name, applies to every row.
- Tapping the strip opens a peek overlay. It closes on a tap anywhere else or when scrolling starts. There is no swipe gesture.
- Motion uses the shared spring tokens `--lfps-spring` / `--lfps-spring-dur` (Q-HARM-3). With reduce-motion on (or `?rm`), the width snaps and the content fades instead.
- Footer stamp `vX.Y.Z · hash · IST date` (Q-HARM-7) appears under the tabs and is a placeholder. Tapping it would open What's New.

## Decisions (Bundle 44) — LOCKED by Steve (t19u)
- **Q-44-01 Absent colour — LOCKED: soft rose `#e39aa4`.** Amber stays reserved for Need sub.
- **Q-44-02 Best-fit ranking — LOCKED.** Default order: free that period → fewest subs today → same subject/class. **It must be manageable:** the user can change the order of these criteria in a Settings option that lives in the shared Settings registry (Q-HARM-5). The mockups don't draw this UI.
- **Q-44-03 Settle delay — LOCKED: 80 ms (revised by Steve t20u, was 140 ms).** The name column folds after 80 ms without scrolling, or on `scrollend`.

---

# Bundle 45 — M06 Settings + M07 Pairing (phone, interactive)

> **Status: mockups — UNLOCKED.** Branch `bundle/45-m06-m07` off `bundle/44-m04-m05` (backup tag `backup/bundle-44-pre-45-20261104`). Docs/images only. Codenames only. Dark only.

**Rebuild:** `cd _shared && python build45.py`. Full behaviour is described in [`../FEATURE_GUIDE.md`](../FEATURE_GUIDE.md) §11–§12.

| Frame | PNG | Live state URL |
|---|---|---|
| M06 Settings | [M06.png](M06/M06.png) | `M06/index.html` |
| M06 Best-fit order | [M06-bestfit.png](M06/M06-bestfit.png) | `?state=best` |
| M06 7-tap countdown | [M06-taps.png](M06/M06-taps.png) | `?state=taps` |
| M06 Developer on | [M06-dev.png](M06/M06-dev.png) | `?state=dev` |
| M06 What's New | [M06-whatsnew.png](M06/M06-whatsnew.png) | `?state=whatsnew` |
| M07 Host code + QR | [M07-host.png](M07/M07-host.png) | `M07/index.html?state=host` |
| M07 Code used → reset | [M07-used.png](M07/M07-used.png) | `?state=used` (`&hold` = stay on success) |
| M07 Client entry | [M07-client.png](M07/M07-client.png) | `?state=client` / `client6` |
| M07 Retain pairing | [M07-retain.png](M07/M07-retain.png) | `?state=login` |
| M07 Devices | [M07-devices.png](M07/M07-devices.png) | `?state=devices` |
| M07 Guest unpaired | [M07-guest.png](M07/M07-guest.png) | `?state=guest` |

## Open questions (Bundle 45)
- **Q-45-01 Developer unlock window.** The 7 taps must land within 1.5 s of each other, and the countdown toast appears from the 3rd tap. a) Keep this — **recommended**; b) show the countdown from the 1st tap.
- **Q-45-02 Best-fit rules on/off.** Each rule can also be switched off, but at least one must stay on. a) Keep — **recommended**; b) reorder only.
- **Q-45-03 After a code is used.** The host shows a ✓ for 3.5 s, then a fresh code. a) Keep — **recommended**; b) return to the Devices list instead.
- **Q-45-04 Revoke one device.** Revoking happens at once, with no confirmation. a) Add an Undo toast — **recommended**; b) a confirm sheet like revoke-all.

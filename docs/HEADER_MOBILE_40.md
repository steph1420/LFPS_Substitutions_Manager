# Header mobile layout (Bundle 40)

Phone-first states for the elevated FULL header and the floating PILL day island.

## Layout (FULL, &lt; md)

| Row | Contents |
|---|---|
| **1** | Logo (+ title from `sm`) + version (+ Admin / Editing dot) · Compact sync (Live/…/Err/Off) · Bell · Settings · Login **or** short name + **Logout**. Reset lives on desktop strip / Settings. |
| **2** | Day chips (MON–SAT), full width, tighter `px` on phone |

Desktop (≥ md) keeps the previous single-row brand · day dock · controls strip (Live, Reset, PWA, Excel, Bell, Settings, Staff Login / name+Logout).

## States

| State | Mobile behaviour |
|---|---|
| **Guest FULL** | Row1 ends with **Login**; sync pill shows Connecting / Live / Offline / Sheets error |
| **Guest PILL** | FULL header slides away; floating day island only (unchanged) |
| **Logged-in teacher FULL** | Name truncated (~7.5rem) + separate Logout control (tap name does **not** log out) |
| **Admin FULL** | Emerald **Admin** chip next to version; same account cluster as teacher |
| **Editing unlocked** | Amber **dot** on phone (full “Editing unlocked” chip from `sm` up) |
| **Connecting / Live / Offline** | Compact sync pill on phone (`data-testid=sync-pill-mobile`); desktop keeps `sync-pill` |

## Motion (BUG-29 residual)

- Wider hysteresis: enter PILL at scrollY &gt; 108, return FULL only below 12 (or absolute top).
- Direction-aware flips; ignore Δ &lt; 16 in **both** UI-10 modes; freeze ~420ms on `visualViewport` resize/scroll (toolbar).
- Debounced evaluate (~48ms); longer transition lock (~360ms).
- Slide distance increased (−220) so a two-row phone header clears the viewport.

## Non-goals

- No hamburger / overflow menu yet.
- PILL island does not show sync or account (day selection only).

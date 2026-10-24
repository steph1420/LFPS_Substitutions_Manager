# ADR-0003: Mount all modals, menus and drawers at the application root

- **Status:** Accepted (retrospective record)
- **Date:** 2026-10-18 (Job Bundle 24; recorded 2026-10-23)
- **Deciders:** Project owner (steph1420)
- **Related:** BUG-14 (Staff login panel off-screen), BUG-15 (Purge menu clipped / inverted coordinates), BUG-10 (fullscreen blank screen), `CATCH_UP_TO_ME.md` Issue 9

## Context

The UI uses Framer Motion transforms, `backdrop-filter` glass and sticky containers heavily.

Any ancestor with `transform`, `filter` or `backdrop-filter` becomes the **containing block** for `position: fixed` descendants. Modals rendered inside those ancestors were therefore positioned relative to the ancestor rather than the viewport. That made the login panel appear partly off-screen at the top-middle (BUG-14), and made the purge context menu clip and invert its coordinates (BUG-15).

## Decision

We will render every modal, context menu and drawer **once, at the root of `App.tsx`**, outside any transformed or filtered ancestor, and drive their visibility from store state. Today that covers:

- `MicroContextMenu`, `ResetPurgeContextMenu`, `StaffLoginModal`, `AssignSubstituteModal`
- `SubAvailabilityModal`, `CoTeacherModal`, `OfficiatingModal`, `SettingsModal`
- `DisputeModal`, `NotificationCenterDrawer`, `AwayOfficialModal`

Trigger components only dispatch store actions, and the anchor coordinates they pass are viewport (`clientX`/`clientY`) values.

The fullscreen routine view (BUG-10) follows the same principle. `App.tsx` returns a separate root tree in fit-grid mode, and the root modals stay reachable from it.

## Consequences

**Positive**

- Positioning is viewport-correct regardless of animations.
- There is a single z-index layer to reason about.
- No portals are needed.

**Negative / trade-offs**

- `App.tsx` grows with every new overlay.
- Modal open state and payload must live in the global store.

**Follow-ups**

- Any new overlay must be added at the root. Note this in code review.

## Alternatives considered

| Option | Why not chosen |
|---|---|
| `createPortal` to `document.body` per component | Viable. The record says the problem was solved by hoisting instead; BUG-10 notes "eliminated portal-attachment clipping" |
| Removing transforms from ancestors | Conflicts with the spring-physics design language (`DESIGN_PHILOSOPHY.md`) |

## Verification

The modal JSX sits at the end of the `App.tsx` root return, and in the fit-grid branch. Manually check that the login panel is viewport-centred while the header is mid-animation.

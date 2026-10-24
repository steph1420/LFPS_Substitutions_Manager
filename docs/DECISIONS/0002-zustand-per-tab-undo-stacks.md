# ADR-0002: Single Zustand store with per-tab snapshot undo/redo stacks

- **Status:** Accepted (retrospective record)
- **Date:** 2026-10-18 (Job Bundle 23; recorded 2026-10-23)
- **Deciders:** Project owner (steph1420)
- **Related:** Job Bundle 23 (Per-Tab Undo/Redo Engine, BUG-11), FEAT-37A (`swapRoutineSlots` with undo), TODO "Undo/Redo History Reset Policy & Buffer Pruning"

## Context

Front-desk staff make rapid, error-prone edits: absences, substitutions, routine swaps. They need instant, reliable undo.

v1 kept dual history stacks (`actionHistory.grid` / `.subs`) that duplicated every action. Users also expect undo on one tab not to revert unrelated work on another tab.

## Decision

We will hold all client state in **one Zustand store** (`apps/web/src/store/useTimetableStore.ts`), using a single `create<TimetableState>()`. Undo/redo will work by **whole-slice snapshots kept per tab**:

- There are three histories, `routineHistory`, `substitutionsHistory` and `rosterHistory`. Each has `past` and `future` stacks.
- Mutating actions call `pushSnapshot` for the active tab before they change state. Each stack is capped at **30** entries, and the oldest entry is dropped first.
- Undo/redo is bound to ⌘Z / Ctrl+Z and ⌘⇧Z / Ctrl+Y in `App.tsx`, with on-screen `UndoRedoControls`.
- "Reset Day" is itself undoable. A long-press or right-click on it purges all history stacks.

## Consequences

**Positive**

- The undo model is simple and predictable, with no inverse operations to write.
- Undo is scoped per tab.
- Zustand requires no providers and allows selective subscriptions.

**Negative / trade-offs**

- Snapshots cost memory, which is bounded by the cap of 30.
- The single store is very large (about 1,440 lines).
- Only preferences are persisted to `localStorage`. **Operational state and history are lost on reload.**

**Follow-ups**

- Consider splitting the store into slices.
- Decide whether operational state should persist locally or come from the server (FEAT-48).

## Alternatives considered

| Option | Why not chosen |
|---|---|
| Redux Toolkit + redux-undo | More boilerplate |
| Command/inverse-operation log | More complex and error-prone for many action types |
| One global undo stack | Undo on one tab would revert unrelated work on another |

## Verification

In `useTimetableStore.ts`, check `pushSnapshot`, the `*History` fields and the `30` cap. Check the keyboard handler in `App.tsx`.

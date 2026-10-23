# ADR-0005: Google Sheets is the source of truth; the Render server is a stateless live relay

- **Status:** Accepted (owner direction, 2026-10-23; implemented in part by Job Bundle 34)
- **Date:** 2026-10-23
- **Deciders:** Project owner (steph1420)
- **Related:** ARCH-02, FEAT-62, FEAT-63, FEAT-65, BUG-25–28, [`../SAS.md`](../SAS.md) §6.2 and §7

## Context

Changes were lost on reload (BUG-25). The Go server wrote `current_state.json` to a local disk, but Render's free tier has an ephemeral filesystem, write errors were ignored (BUG-28), and the advertised backup downloads did not exist (BUG-27). Earlier planning (FEAT-62/63) considered a persistent disk or Postgres. The school already keeps its data in Google Sheets.

## Decision

- **Google Sheets is the system of record** (the "external database"). Records carry last-updated time and version metadata (FEAT-65).
- **The Render server is a stateless live relay** between devices. It keeps only the active school week in memory, resets when the week changes, and starts empty after a restart. It writes no files; there is no server disk or database.
- **Each browser keeps a local copy** in `localStorage`, scoped by calendar date, so a reload or restart on that device loses nothing (Job Bundle 34).
- Bundle 35 wires the sync: devices push changes to the relay, the relay fans them out and bridges them to Sheets, and devices re-hydrate from Sheets after a relay restart.

## Consequences

**Positive**

- No paid disk or database. Redeploys and spin-downs cannot lose data that Sheets holds.
- The server is simple to reason about and to test (`go test -race`).
- Staff can still read and correct data directly in Sheets.

**Negative / trade-offs**

- Until Bundle 35 ships, data is per device: two devices do not see each other's changes.
- Sheets API quotas and latency apply; writes must be batched and conflict-aware (last writer wins by `revision`/`updatedAt`).
- The Sheets bridge needs credentials on Render, and admin writes need server-side auth (SEC-02).

## Alternatives considered

- **Render persistent disk** (paid): single instance, ties data to one host. Rejected by the owner.
- **Managed Postgres**: extra service and cost, duplicates Sheets. Rejected by the owner.

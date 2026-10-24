# ADR-0005: Google Sheets is the source of truth; the Render server is a stateless live relay

- **Status:** Accepted (owner direction, 2026-10-23; clarified 2026-10-24; implemented in part by Job Bundle 34)
- **Date:** 2026-10-23 (amended 2026-10-24, and for Job Bundle 35a)
- **Deciders:** Project owner (steph1420)
- **Related:** ARCH-02, FEAT-62, FEAT-63, FEAT-65, PERF-03, EPIC-01, BUG-25–28, [`../SAS.md`](../SAS.md) §2.1, §6.2 and §7

## Context

Changes were lost on reload (BUG-25). The Go server wrote `current_state.json` to a local disk, but Render's free tier has an ephemeral filesystem, write errors were ignored (BUG-28), and the advertised backup downloads did not exist (BUG-27). Earlier planning (FEAT-62/63) considered a persistent disk or Postgres. The school already keeps its data in Google Sheets.

Why not let every device read and write Sheets directly (owner, 2026-10-24)? Direct Sheets access from each device is **too slow** for the front desk. And the school's computers are **old and not on 24×7**, so none of them can host a hub. A small always-reachable relay solves both problems: devices get fast updates from memory, and Sheets latency stays off the critical path.

## Decision

- **Google Sheets is the system of record** (the "external database"). Records carry last-updated time and version metadata (FEAT-65).
- **The Render server is a stateless live relay** between devices. It keeps only the active school week in memory, resets when the week changes, and after a restart reloads that week's substitutions from `Subs` (amendment below). It writes no files; there is no server disk or database.
- **Each browser keeps a local copy** in `localStorage`, scoped by calendar date, so a reload or restart on that device loses nothing (Job Bundle 34).
- **Devices talk only to the relay**, over WebSocket. They never call Google APIs and hold no Google credentials.
- **The relay holds the live state in memory** and fans every change out to all connected devices.
- **Writes go only to app-owned tabs.** The relay creates and writes its own tabs, `Subs`, `App_Meta` (last-updated time, app version, schema version) and optionally `App_Log`. Writes are **asynchronous, batched, debounced and retried**, so a slow or failing Sheets call never blocks a device.
- **Every other tab is read-only** for the app: Staff Directory, Subjects List, OVERVIEW, the per-teacher and per-class timetables, and the existing `Daily_Ledger` / `Baseline_Updates` unless the owner decides otherwise. The relay pulls them **at startup and periodically**, and streams them to devices.
- **In-app timetable edits are substitutions.** They apply to one date, sync to `Subs`, and **never** write to the master timetable. Editing the master timetable is a separate future epic (EPIC-01, unscheduled).
- Bundle 35 wires this up. After a relay restart, devices re-send their local copy and the relay re-reads the Sheet (and, since 35a, reloads `Subs`).

## Amendment: Job Bundle 35a (FEAT-62 part 3)

Bundle 35 left two gaps: devices received the Sheet's read-only tabs but didn't use them, and a restarted relay started empty, so a device that missed a deletion could bring the substitution back (BUG-33).

- **The relay reads its own tab back.** `Subs` (schema 2) keeps every row's last-writer-wins version and the substitution itself, and a deletion stays as a **tombstone** row (Status `REMOVED`). On start the relay reloads the active week from `Subs` before it lets devices in (**hydrating**: HELLO held, edits refused with `ERROR "hydrating"`, retried by the device). The server still keeps no disk: `Subs` is the memory.
- **It won't write before it has read.** Until the reload succeeds, nothing is written to `Subs`, so a restart can't overwrite rows it hasn't seen. If Sheets is slow, devices are let in after `SHEETS_HYDRATE_TIMEOUT` (default 20 s, degraded); the late reload merges by last writer wins.
- **Devices apply the read-only tabs.** Precedence: local date-scoped edits > Sheet > bundled seed. Edits stay date-scoped; the Sheet is still never written outside the app's tabs.
- **Scope:** only substitutions are reloaded (they are what `Subs` holds). Absences, availability, Off. AC/CT and routine overrides are still refilled by devices after a restart; their deletions remain memory-only. Only the active week is reloaded.

Alternatives considered: a Render disk or database (rejected again: the owner's direction stands); writing every entity kind to Sheets (more quota and owner-visible tabs for short-lived data; can follow if needed).

## Consequences

**Positive**

- No paid disk or database. Redeploys and spin-downs cannot lose data that Sheets holds.
- The server is simple to reason about and to test (`go test -race`).
- Staff can still read and correct data directly in Sheets.

**Hosting: Render free tier.** A free web service spins down after **15 minutes** without inbound HTTP or WebSocket traffic, and takes **about one minute** to wake on the next request. The owner **already runs an uptime ping bot during school hours**, so the relay stays warm while the front desk works and sleeps otherwise. That is also well inside the 750 free instance hours a month. The repo therefore adds **no keep-warm job** (PERF-03, handled externally). Two consequences for the code:

- `GET /api/v1/health` must stay cheap: no lock, no I/O, no Sheets call.
- The client must cope with a sleeping relay outside school hours. It shows a "Connecting…" state while it keeps working from local data, and sends its changes once connected (Bundle 35).

Unflushed writes can be lost if the relay spins down or restarts (devices re-send them on reconnect). Debounce windows are kept short (seconds), and devices keep their local copy until the relay confirms the write.

**Negative / trade-offs**

- Until Bundle 35 ships, data is per device: two devices do not see each other's changes.
- Sheets API quotas and latency apply; writes must be batched and conflict-aware (last writer wins by `revision`/`updatedAt`).
- The Sheets bridge needs credentials on Render: a Google service account that the owner adds as an editor, and the real spreadsheet ID (the "Publish to web" `2PACX-…` ID is read-only and cached). Admin writes need server-side auth (SEC-02).
- Read-only tabs reach devices only as fresh as the last pull (startup + periodic).

## Alternatives considered

- **Render persistent disk** (paid): single instance, ties data to one host. Rejected by the owner.
- **Managed Postgres**: extra service and cost, duplicates Sheets. Rejected by the owner.
- **Devices read and write Sheets directly**: too slow, every device would need Google credentials, and there would be no live fan-out. Rejected (owner, 2026-10-24).
- **A school computer as the hub**: the machines are old and not on 24×7. Rejected.
- **A keep-warm cron in the repo** (GitHub Actions or similar): it duplicates the owner's existing pinger and would burn free hours outside school time. Not added.

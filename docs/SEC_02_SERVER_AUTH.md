# SEC-02 — Server-side admin auth (design, Bundle 38b)

> Status: **design + optional stub**. Not enforced in production. Front Desk substitution
> sync must keep working without an admin token.

## Problem

Today the admin passcode gate runs only in the browser (SEC-01). The relay accepts
`STATE_MUTATION` from any allowlisted origin. Anyone who bypasses the client UI can push
entity writes the Front Desk app would normally send — including routine (`sched`) and Limbo
(`limbo`) edits that the UI treats as admin-only.

## Proposed flow

1. **Unlock (client):** Staff Login admin passcode succeeds (existing SEC-01 / FEAT-68).
2. **Token mint (relay):** client `POST /api/v1/admin/session` with `{ passcode }` (or a
   one-time proof derived from it). Relay holds `ADMIN_PASSCODE_SHA256` (or Argon2id hash) in
   Render env — **never** in the Pages bundle. On success it returns a short-lived signed JWT
   (or HMAC token), e.g. 15–60 minutes, claims `{ role: "admin", office?, sub: identity, exp }`.
3. **Present:** WebSocket `HELLO` gains optional `adminToken`. HTTP privileged routes use
   `Authorization: Bearer <token>`.
4. **Verify:** before accepting **admin-privileged** mutations (below), relay checks signature
   + expiry. Missing/invalid → `MUTATION_ACK.rejected` with reason `admin required` for those
   keys only; other keys in the same batch still merge.
5. **Rotate:** changing the server secret invalidates outstanding tokens. Client clears the
   token on Log Out and on `401`/`admin required`.

Google / school SSO can replace step 2 later; the mutation gate stays the same.

## Mutation privilege matrix (current product)

| Entity kind | Example key | Who may write today (product) | SEC-02 gate |
|---|---|---|---|
| `abs` | absence | Front Desk / any role | **any-role** (no token) |
| `sub` | substitution assign/remove | Front Desk / any role | **any-role** |
| `avail` | staff availability | Front Desk / any role | **any-role** |
| `oac` | Off. AC appointment | Front Desk / any role | **any-role** |
| `oct` | Off. CT appointment | Front Desk / any role | **any-role** |
| `sched` | routine cell edit | Admin / Edit-without-login | **admin-privileged** |
| `limbo` | Limbo tray | Admin / Edit-without-login | **admin-privileged** |

Reset Day / Purge History / solver policy are client-local today; if they ever sync, treat
them as admin-privileged.

**Do not** require a token for `abs` / `sub` / `avail` / `oac` / `oct` — that would break
Front Desk multi-device sync (Bundle 35 / 35a).

## Thin spike (Bundle 38b)

- HELLO payload may include `adminToken` (ignored unless enforcement is on).
- Env `LFPS_REQUIRE_ADMIN_TOKEN=1` on the relay: reject `sched` / `limbo` changes when the
  connection has no verified token. **Default off** so production stays unchanged.
- Token verification itself is stubbed until the mint endpoint ships (reject if enforcement
  on and token empty; accept any non-empty stub token only in tests).

## Out of scope here

- Full OAuth / Google login
- Per-admin server accounts (see `PER_ADMIN_ACCESS.md`)
- Teacher accept/dispute identity binding (follow-up)

## Acceptance later

- [ ] Mint + verify real tokens with server-held secret
- [ ] Client attaches token after admin login; clears on logout
- [ ] Enforcement on by default in production once clients are updated together
- [ ] Tests: any-role mutations succeed without token; sched/limbo fail without; succeed with

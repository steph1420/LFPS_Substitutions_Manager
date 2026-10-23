# ADR-0001: NPM-workspaces monorepo with a pure TypeScript core and a Go server

- **Status:** Accepted (retrospective record)
- **Date:** 2026-10-18 (decision taken in Job Bundles 19–20; recorded 2026-10-23)
- **Deciders:** Project owner (steph1420)
- **Related:** Job Bundle 19 (monorepo + core), Job Bundle 20 (Go backend), commit `acc67c0`, `legacy-v1/`

## Context

v1 (≤ v1.53.0) was a single vanilla-JS app. `app.js` held the UI, state, solver and persistence together. The TODO technical-debt review lists dead arrays and duplicated migration and history logic. That coupling made the substitution logic hard to test and impossible to share with a server.

The school also wants multi-device "live" operation and Excel registers, which need a backend.

## Decision

We will structure v2 as an **NPM-workspaces monorepo**:

- `packages/core` (`@lfps/core`): **pure, framework-free TypeScript**. It holds the domain types, the substitution solver, name disambiguation and seed data, all unit-tested with Vitest.
- `packages/ui` (`@lfps/ui`): design tokens.
- `apps/web`: a React 19 + Vite SPA that consumes both packages.
- `apps/server`: a separate **Go** service (stdlib `net/http`, Gorilla WebSocket, Excelize). It provides REST, real-time broadcast and `.xlsx` export, and is deployed independently on Render via Docker.

## Consequences

**Positive**

- Solver logic is testable in isolation. There are 19 tests in `packages/core/test/solver.test.ts`.
- The web app and the server deploy independently: Pages for the web app, Render for the server.
- Go provides a small, fast service with a mature Excel library.

**Negative / trade-offs**

- The domain model is **duplicated** across TS (`packages/core/src/types`) and Go (`apps/server/internal/storage`), and the copies have already drifted. For example, the Go struct has no dispute or acceptance fields.
- The server does not reuse the TS solver, so all business rules execute client-side.
- Workspace build ordering matters. `@lfps/ui` must be built before `apps/web`, and the root scripts do not do this (see `BUGS.md`).

**Follow-ups**

- Generate shared types (e.g. a JSON Schema or OpenAPI spec feeding TS and Go), or add contract tests.
- Add `@lfps/ui` to the build chain.

## Alternatives considered

| Option | Why not chosen |
|---|---|
| Keep the v1 single-file app | Untestable coupling, no backend |
| Node/TS backend sharing `@lfps/core` | Not chosen. No written rationale exists. The docs stress Excelize speed and a small container image; the owner should confirm the reasoning |
| Separate repositories | Harder to keep the client and core versions in step |

## Verification

- The `workspaces` field in the root `package.json`.
- `npm test` gives 19/19.
- `apps/server/go.mod` (module `lfps/server`, go 1.23).
- `cd apps/server && go build ./...` succeeds.

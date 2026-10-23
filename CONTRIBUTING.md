# Contributing to LFPS Substitutions Manager

Thank you for helping. This project is a front-desk tool used every school morning, so stability comes before novelty. Read this file first, then [`docs/WORKFLOW.md`](docs/WORKFLOW.md).

## 1. Ground rules

1. **The owner's instructions win.** If this file, `docs/`, or any other document conflicts with an explicit instruction from the owner (steph1420), follow the owner and log the conflict in [`docs/DOC_ISSUES.md`](docs/DOC_ISSUES.md).
2. **`DEVELOPER_GUIDE.md` is owner-controlled.** Do not edit it unless the owner explicitly asks you to. Corrections go in `docs/DOC_ISSUES.md`.
3. **Back up before you modify anything.** See [`docs/WORKFLOW.md` §2](docs/WORKFLOW.md#2-backups).
4. **Never commit to `main`.** Do not push to `next-gen` without the owner's go-ahead. GitHub Pages deploys from the root of `next-gen`, so a push to it is a production release (ADR-0004).
5. **Never commit secrets.** `.env*` files in the repo root and outside `apps/web` must stay untracked. `apps/web/.env` is committed today, and holds only the public `VITE_API_URL` and `VITE_WS_URL` endpoints. Keep it free of anything sensitive.
6. **Domain logic belongs in `@lfps/core`**, as pure, typed, unit-tested functions. Visual constants belong in `@lfps/ui`. React components should orchestrate, not compute.

## 2. Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Node.js / npm | Node 20+ (verified with Node 20.19.2 / npm 11.21.1; no `engines` field is declared) | NPM workspaces |
| Go | ≥ 1.23 (`go.mod`: `go 1.23`) | Needed only for `apps/server` |
| Git | any recent | |

## 3. Getting started

```bash
git clone https://github.com/steph1420/LFPS_Substitutions_Manager.git
cd LFPS_Substitutions_Manager
git checkout next-gen
git switch -c <type>/<short-name>          # see docs/WORKFLOW.md §3

npm install
npm run build --workspace=@lfps/ui         # REQUIRED on a fresh clone (see below)
npm test                                   # Vitest, @lfps/core (19 tests)
npm run build:core && npm run build:web    # type-check + Vite build into apps/web/dist
npm run dev:web                            # http://localhost:5173

cd apps/server && go build ./... && go vet ./... && go run ./cmd/api   # :8080
```

> **Fresh-clone caveat:** `@lfps/ui` resolves to `packages/ui/dist`, and no root script builds it. If you skip the `@lfps/ui` build, `build:web` fails with 17 × `TS2307 Cannot find module '@lfps/ui'`. This is logged in `BUGS.md` → "Observed during workspace setup".

> **`npm run build` writes into the repo root.** It copies `apps/web/dist` over the root `index.html` and `assets/`, which are the GitHub Pages artefact. Run it only when you intend to produce a release build, and delete stale hashed files from `assets/` afterwards. For an ordinary check, use `build:core && build:web`.

> **`apps/web/tsconfig.tsbuildinfo` is tracked**, and every build rewrites it. Do not commit those incidental changes. Revert them with `git checkout -- apps/web/tsconfig.tsbuildinfo`.

## 4. Making a change

1. Find or create the work item in `TODO.md` (`BUG-xx`, `FEAT-xx`, …) inside a numbered **Job Bundle**.
2. Make a backup snapshot (`docs/WORKFLOW.md` §2).
3. Implement the change. Add or extend Vitest tests in `packages/core/test/` for any domain-logic change.
4. Verify: run `npm test`, `build:core && build:web`, and `go build ./... && go vet ./...` if you touched the server.
5. Update the docs:
   - `CHANGELOG.md` `[Unreleased]`
   - `TODO.md` status
   - `BUGS.md` row for bugs
   - an ADR in `docs/DECISIONS/` for any architectural decision
   - `docs/SAS.md` if the architecture changed
6. Commit using the conventions below. Open a PR into `next-gen`, or hand the branch to the owner.

## 5. Commit messages

The history uses Conventional-Commit style. Observed counts: `feat` 47, `docs` 40, `fix` 10, `chore` 3, and one each of `style`, `refactor` and `perf`.

```
<type>(<optional scope>): <imperative summary>
```

- **Types:** `feat`, `fix`, `docs`, `chore`, `refactor`, `perf`, `style`, `test`.
- **Scopes** seen in history: `ui`, `themes`, `dev`, `routine`, `away`, `limbo`, `menu`. Use a package or feature area.
- Mention the Job Bundle or item IDs in the subject or body when relevant, e.g. `fix(roster): reset subs when marking present (BUG-12, Bundle 24)`.

## 6. Code style

- TypeScript is strict. Avoid `any`: `DEVELOPER_GUIDE.md` requires "Zero `any`", but 5 occurrences remain today.
- Use Tailwind v4 utility classes and the `@lfps/ui` tokens. Animate with Framer Motion springs taken from `SPRING_TRANSITIONS`.
- Mount modals and popovers at the `App.tsx` root (ADR-0003).
- State changes go through `useTimetableStore` actions that push undo snapshots (ADR-0002).
- Format Go code with `gofmt`, and keep `go vet` clean.

## 7. Documentation map

See [`docs/README.md`](docs/README.md).

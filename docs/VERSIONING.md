# Versioning Policy

> This document explains how LFPS Substitutions Manager numbers its releases, and where those numbers are kept.
> Section 1 describes the **current, observed** practice, as verified in the repository on 2026-10-23 (updated for Job Bundle 34 on `bundle/34`).
> Section 2 is the **policy going forward**. It changes no existing history.

## 1. Current State (observed)

> **Since Job Bundle 34 (`bundle/34`, v2.0.0-alpha.2):** the **root `package.json` `version` is the single source**. `scripts/version.mjs` copies it into the three workspace manifests and `apps/server/internal/version/version.go` (`npm run version:sync`) and fails `npm test` on drift (`npm run version:check`). The web build reads it through a Vite `define`, and the header, footer and Settings → Build Info show `v<version> · <commit> · <branch>`. `GET /api/v1/health` returns the Go copy. The table below is the **pre-JB34** snapshot (`next-gen` @ `19c1a1a`), kept for history.

| Location | Value | Notes |
|---|---|---|
| `package.json` (root `lfps-substitutions-suite`) | `2.0.0-alpha.1` | private workspace root |
| `packages/core/package.json` (`@lfps/core`) | `2.0.0-alpha.1` | |
| `packages/ui/package.json` (`@lfps/ui`) | `2.0.0-alpha.1` | |
| `apps/web/package.json` (`@lfps/web`) | `2.0.0-alpha.1` | |
| `apps/server` health handler | `"2.0.0-alpha.1"` (hard-coded string) | Returned by `GET /api/v1/health` |
| `apps/server/go.mod` (`lfps/server`) | — | Go modules carry no version; there are no git tags |
| Settings "About" footer (`SettingsModal.tsx`) | "Next-Gen v2.0" | display string only |
| `legacy-v1/` | v1.53.0 | frozen archive |
| Git tags | none | Releases are not tagged |
| `CHANGELOG.md` | `## [v2.0.0-alpha.1] - 2026-10-18` and 49 earlier `v1.x` headings | Headings use a `v` prefix. There are no compare-link footers |

**History in brief:**

- v1.0.0 (2026-10-10) through v1.53.0 (2026-10-17) was the legacy vanilla-JS app.
- v2.0.0-alpha.1 (2026-10-18) is the next-gen monorepo.
- All work since 2026-10-18, Job Bundles 24 through 33, was recorded **inside** the already-dated `v2.0.0-alpha.1` section rather than under `[Unreleased]`. Five later feature commits (`3dfa4c4`…`aba0369`, 2026-10-20) have no CHANGELOG entry. See [`DOC_ISSUES.md`](./DOC_ISSUES.md).

## 2. Policy

### 2.1 Scheme

The project follows **[SemVer 2.0.0](https://semver.org/)**: `MAJOR.MINOR.PATCH[-PRERELEASE]`.

- **MAJOR** changes for architectural or data-model breaks. Example: a stored-state format the previous client cannot read.
- **MINOR** changes for user-visible features (FEAT-xx) that stay backward compatible.
- **PATCH** changes for bug fixes (BUG-xx) and documentation or tooling-only changes.
- **Pre-release** versions take the form `-alpha.N`, then `-beta.N`, then `-rc.N`. While v2 is in alpha, increment `N` for each Job Bundle that is shipped to Pages.

### 2.2 Single version across the workspace

Every workspace package moves in lockstep. `@lfps/core`, `@lfps/ui`, `@lfps/web`, the root package and the Go server (`internal/version`) always carry **the same version**. To bump the version:

1. Edit `version` in the **root** `package.json` only.
2. Run `npm run version:sync` (updates the workspaces and the Go constant), then `npm install` to refresh `package-lock.json`. `npm test` runs `version:check` and fails if anything drifted.
3. Move the `CHANGELOG.md` `[Unreleased]` entries under a new dated heading.
4. Commit with `chore(release): vX.Y.Z[-pre]`.
5. Tagging is optional. If you tag, use `vX.Y.Z` (and push the tag only when the owner approves).

### 2.3 CHANGELOG conventions

- The format is [Keep a Changelog 1.0.0](https://keepachangelog.com/en/1.0.0/).
- **Keep the existing `v`-prefixed heading style** (`## [vX.Y.Z] - YYYY-MM-DD`) for consistency. Do not rewrite past headings.
- New work goes under `## [Unreleased]`, using `### Added / Changed / Fixed / Removed / Security / Planned`.
- Reference bundle and work-item IDs in entry titles, e.g. `(Job Bundle 34)` or `(BUG-24)`.
- Never edit released sections after the fact, except to fix an obvious typo. Record corrections as new entries.

### 2.4 Identifiers

| Prefix | Meaning | Tracked in |
|---|---|---|
| `BUG-xx` | Defect | [`../BUGS.md`](../BUGS.md) (register) and `TODO.md` (narrative) |
| `FEAT-xx` | Feature | `TODO.md` |
| `PERF-xx` | Performance | `TODO.md` |
| `LOGIC-xx`, `UI-xx`, `SEC-xx`, `ARCH-xx` | Domain logic, UI polish, security, architecture | `TODO.md` |
| `EPIC-xx` | Large future project, not yet scheduled into a bundle | `TODO.md` |
| `Job Bundle N` | A delivered group of work items | `TODO.md`, `CHANGELOG.md`, commit subjects |

Bundle numbers must be **unique**. Bundle numbers 28, 29 and 31 are currently reused for different scopes; see DOC_ISSUES. Use letter suffixes (`31A`, `31B`) for splits, as Bundle 26A already does.

### 2.5 Worked example: Job Bundle 34 follow-ups stay at 2.0.0-alpha.2

Job Bundle 34 set the version to `2.0.0-alpha.2` on `bundle/34`. On 2026-10-24 the owner asked for follow-ups: a 6-digit admin passcode, the school time zone, and plan clarifications. They **do not bump** the version, for three reasons:

1. When the follow-ups were made, `2.0.0-alpha.2` had **not been released**: it was not on `next-gen`, not deployed to Pages or Render, and had no pushed tag. (It was released with them on 2026-10-24.) §2.1 bumps `-alpha.N` once per Job Bundle **shipped**, so later work in the same unshipped bundle joins the same version.
2. The follow-ups belong to Job Bundle 34's own scope (SEC-01 interim, persistence rollover).
3. Nothing outside the branch has seen `alpha.2`, so no released state format changes. The new `lfps_admin_lockout_v1` key is additive, and the persisted schema stays v1.

The entries are recorded in the existing `[v2.0.0-alpha.2]` section. That section can still change because it is unreleased; once it ships it is frozen (§2.3). The next shipped bundle becomes `2.0.0-alpha.3`.

### 2.6 Worked example: Job Bundle 34a (and 35) before release

`2.0.0-alpha.2` is released, so its CHANGELOG section is frozen. Job Bundle 34a (`bundle/34a`, the owner's "34.1": admin hierarchy and the editing override) is a split of 34 and is named with a letter suffix (§2.4); "34.1" would read as a version. While it is unshipped:

- `package.json` and the other version files **stay at `2.0.0-alpha.2`**, so the branch never claims a version that isn't live. Entries go under `[Unreleased]`.
- When the owner approves going live, the release commit (`chore(release): v2.0.0-alpha.3`) runs `npm run version:sync` after setting the root version, moves the `[Unreleased]` entries into `[v2.0.0-alpha.3]` and tags it (§2.2).
- If 34a and 35 ship **together** (35 is cut from 34a), both are `2.0.0-alpha.3`. If 34a ships alone, it is `alpha.3` and 35 becomes `alpha.4`. Changes to the persisted state or the wire protocol don't change this; they are documented in SAS. Bundle 35's WebSocket protocol (SAS §6.3) is **not** compatible with the alpha.2 relay, so the Pages build and the Render relay must go live together. That is a release step (`docs/RENDER_SETUP.md`), not a version rule: pre-releases may break compatibility, and the next bump is still `-alpha.N`.

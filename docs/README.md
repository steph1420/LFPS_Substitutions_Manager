# LFPS Substitutions Manager: Documentation Index

This page indexes every project document.

When documents disagree, the **source code is the ground truth**. Known contradictions are tracked in [`DOC_ISSUES.md`](./DOC_ISSUES.md).

> 🔒 **`DEVELOPER_GUIDE.md` is owner-controlled.** It is updated **only on the owner's explicit request**. Do not edit it as part of routine work. Record corrections in [`DOC_ISSUES.md`](./DOC_ISSUES.md) instead.

## Standard suite (this folder and the repo root)

| Document | Purpose |
|---|---|
| [`SAS.md`](./SAS.md) | Software Architecture Specification, verified against the code |
| [`VERSIONING.md`](./VERSIONING.md) | Version locations, SemVer policy, bump procedure, ID prefixes |
| [`WORKFLOW.md`](./WORKFLOW.md) | Job Bundle cycle, backups, branches, verification baseline, release |
| [`DECISIONS/`](./DECISIONS/) | Architecture Decision Records ([template](./DECISIONS/0000-template.md)) |
| [`DOC_ISSUES.md`](./DOC_ISSUES.md) | Audit of contradictions between the docs and the code |
| [`../CONTRIBUTING.md`](../CONTRIBUTING.md) | Ground rules, setup, change process, commit conventions |
| [`../BUGS.md`](../BUGS.md) | Bug register (BUG-01 to BUG-23) |
| [`../CHANGELOG.md`](../CHANGELOG.md) | Release history (Keep a Changelog) |

### Architecture Decision Records

| ADR | Decision |
|---|---|
| [0001](./DECISIONS/0001-monorepo-ts-core-go-server.md) | NPM-workspaces monorepo with a TypeScript core and a Go server |
| [0002](./DECISIONS/0002-zustand-per-tab-undo-stacks.md) | Zustand store with per-tab snapshot undo stacks |
| [0003](./DECISIONS/0003-root-mounted-modals.md) | Root-mounted modals (BUG-14/15) |
| [0004](./DECISIONS/0004-github-pages-from-next-gen-root.md) | GitHub Pages served from the `next-gen` root |

## Pre-existing documents (repo root)

| Document | Purpose | Notes |
|---|---|---|
| [`../DEVELOPER_GUIDE.md`](../DEVELOPER_GUIDE.md) | Main developer handbook | **Owner-controlled. Edit only on explicit request.** Several stale facts are listed in DOC_ISSUES |
| [`../ARCHITECTURE.md`](../ARCHITECTURE.md) | Earlier architecture overview | Some paths and claims are stale (DI-09 to DI-14). Prefer `SAS.md` |
| [`../DESIGN_PHILOSOPHY.md`](../DESIGN_PHILOSOPHY.md) | Visual and interaction design principles | CT colour is stale (DI-09) |
| [`../THEMES.md`](../THEMES.md) | Theme engine reference | — |
| [`../TODO.md`](../TODO.md) | Job Bundle planning ledger and feature/bug IDs | Duplicate bundle numbers (DI-01, DI-02) |
| [`../CATCH_UP_TO_ME.md`](../CATCH_UP_TO_ME.md) | Session hand-off log for agents | §0 and §5 contradict each other (DI-05) |
| [`../CLOUD_CONNECTIONS_AND_ROLLBACK_GUIDE.md`](../CLOUD_CONNECTIONS_AND_ROLLBACK_GUIDE.md) | Render, GitHub Pages and environment wiring; rollback scenarios | Tarball name and commit hash are mismatched (DI-20). Build caveat (DI-15) |

## Maintenance rules

1. Every Job Bundle updates `CHANGELOG.md` under `[Unreleased]`, `TODO.md`, and `BUGS.md` if any bug status changed.
2. A new architectural decision needs a new ADR. Copy `DECISIONS/0000-template.md` and use the next number. Do not edit accepted ADRs; supersede them instead.
3. If a doc contradicts the code, add a `DI-xx` entry to `DOC_ISSUES.md` rather than silently "fixing" history.

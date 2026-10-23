# Development Workflow

This file covers how work moves from an idea to production. It complements [`../CONTRIBUTING.md`](../CONTRIBUTING.md).

> **Precedence:** if this file conflicts with an explicit instruction from the owner, the owner wins.
> The branch model in §3 **differs** from the older "work directly on `next-gen` and push" instruction in `DEVELOPER_GUIDE.md` §7.4/§11.4 and `CATCH_UP_TO_ME.md` §2.2. The owner must confirm which model applies (see `DOC_ISSUES.md` DI-07). Until then, nobody pushes without the owner's explicit approval.

## 1. The Job Bundle cycle

Work is grouped into numbered **Job Bundles** in `TODO.md`. Each bundle runs through six steps:

```
1 Backup → 2 Formulate bundle in TODO.md → 3 Implement → 4 Verify → 5 Update docs → 6 Commit (→ owner-approved merge/push)
```

| Step | What | Done when |
|---|---|---|
| 1. Backup | Snapshot tarball (§2) | A file exists in `_backups/` |
| 2. Formulate | Add `### Job Bundle N: <title>` with status `🔴 Queued`, then `🟡 In Progress`, then `🟢 Resolved`, and with `[ ]` items carrying IDs | The bundle number is **unique** (DOC_ISSUES DI-01/DI-02) |
| 3. Implement | Follow `CONTRIBUTING.md` §6 | |
| 4. Verify | `npm test`; `npm run build --workspace=@lfps/ui && npm run build:core && npm run build:web`; `go build ./... && go vet ./...` for server changes | Everything passes. Record the test count |
| 5. Docs | `CHANGELOG.md` `[Unreleased]`, `TODO.md`, `BUGS.md`, `CATCH_UP_TO_ME.md`, an ADR if relevant | |
| 6. Commit | Conventional commit on the feature branch | Merge and push only with the owner's approval |

**Bundle size.** The latest recorded owner instruction is in `CATCH_UP_TO_ME.md` §0.4: *"Now we will not stick to just 2 tasks… You can make bundles as big as you can handle"*. It supersedes the earlier "2-Item Micro-Bundle Rule" in §3.14 of the same file. Keep bundles **thematically cohesive**.

## 2. Backups

Make a snapshot before modifying anything:

```bash
tar -czf _backups/LFPS_Substitutions_Manager_v2.0.0_<label>_$(date +%Y%m%d_%H%M%S).tar.gz \
  --exclude="node_modules" --exclude=".git" --exclude="dist" --exclude="_backups" .
```

- `_backups/` is listed in `.gitignore`, so new snapshots stay local. **Do not `git add -f` them.**
  - 38 historical snapshots are still tracked from before the ignore rule existed. Removing them from the index (`git rm --cached`) is an owner decision.
- Before editing a single important file such as `CHANGELOG.md`, you may also copy it to `_backups/<name>.<label>_<timestamp>.bak`.
- Off-repo backups (for example the pristine rollback tarball) should be kept read-only.

## 3. Branches

| Branch | Purpose | Rules |
|---|---|---|
| `main` | Legacy / v1 line | **Never touch** |
| `next-gen` | v2 integration branch **and the GitHub Pages production source** | Change it only by merging a reviewed branch, with owner approval |
| `<type>/<name>` (e.g. `refine/jb31`, `fix/bug-24-…`, `feat/feat-48-sync`) | Work branches cut from `next-gen` | One bundle or theme per branch |
| `test` (remote) | Exists on origin; purpose not documented | Leave it alone |

## 4. Verification matrix

| Check | Command | Baseline (2026-10-23, `19c1a1a`) |
|---|---|---|
| Unit tests | `npm test` | ✅ 1 file, 19/19 passed (Vitest 3.2.7) |
| Core build | `npm run build:core` | ✅ |
| UI tokens build | `npm run build --workspace=@lfps/ui` | ✅ (needed before `build:web`) |
| Web build | `npm run build:web` | ✅ when ui is built; ❌ on a fresh clone without it. Warning: JS chunk is about 635 kB, over 500 kB |
| Server | `cd apps/server && go build ./... && go vet ./...` | ✅ |
| Audit | `npm audit` | ⚠️ 3 vulns (1 moderate, 2 critical) via Vitest 3.x |

## 5. Releasing to production (owner-approved only)

1. On an up-to-date `next-gen`, run `npm run build`. This copies `apps/web/dist` into the root `index.html` and `assets/`.
2. Delete stale hashed files from `assets/`. Only the files referenced by `index.html` should remain.
3. Bump the version per [`VERSIONING.md`](./VERSIONING.md), and move the `[Unreleased]` entries into a dated section.
4. Commit with `chore(release): …`. **Push only when the owner approves.** Pages redeploys from the `next-gen` root, and Render auto-deploys the server.
5. To roll back, follow `CLOUD_CONNECTIONS_AND_ROLLBACK_GUIDE.md`.

# ADR-0004: Deploy the web client by committing the build to the root of `next-gen` (GitHub Pages)

- **Status:** Accepted (retrospective record)
- **Date:** 2026-10-18 (v2 cut-over; recorded 2026-10-23)
- **Deciders:** Project owner (steph1420)
- **Related:** root scripts `build` / `build:pages`, `DEVELOPER_GUIDE.md` §12.1, `CLOUD_CONNECTIONS_AND_ROLLBACK_GUIDE.md` Scenario B

## Context

The client is a static SPA. The project needed zero-cost hosting with no CI setup. GitHub Pages "deploy from a branch" can only serve `/` or `/docs` of a single branch. The v2 work lives on `next-gen`, while `main` keeps the legacy line.

## Decision

We will serve production from **GitHub Pages, configured for branch `next-gen`, folder `/` (root)**. The deploy works as follows:

- `npm run build` (or `build:pages`) runs `build:core && build:web`, then copies `apps/web/dist/*` into the repo root, producing `index.html` and `assets/index-<hash>.{js,css}`.
- The generated root files are **committed**. Vite uses `base: './'`, so asset paths are relative and work under `/LFPS_Substitutions_Manager/`.
- Stale hashed assets are deleted by hand after each build.
- Live URL: `https://steph1420.github.io/LFPS_Substitutions_Manager/`.

## Consequences

**Positive**

- No CI is needed.
- Rollback is a `git revert` or checkout of an earlier `next-gen` commit.
- The deployed artefact is versioned with the source. I verified that rebuilding `19c1a1a` reproduces byte-identical assets.

**Negative / trade-offs**

- **Every push to `next-gen` is a production deploy.** Work-in-progress must live on other branches.
- Build output is mixed with source, which causes noisy diffs and risks stale assets.
- Forgetting to rebuild ships an outdated UI.
- No `.nojekyll` file exists, so Pages runs Jekyll. Underscore-prefixed paths such as `_backups/` are not published, which is fine. Markdown files, including `docs/`, are rendered as pages.
- Running `npm run build` locally always dirties the root artefact.

**Follow-ups (owner decision)**

- Consider a GitHub Actions Pages workflow that builds from source, so the build output no longer needs to be committed.
- Add `.nojekyll` if Jekyll processing is unwanted.

## Alternatives considered

| Option | Why not chosen |
|---|---|
| Serve from `/docs` | `docs/` now holds documentation; the build output would also need relocating |
| GitHub Actions artefact deploy | Needs workflow setup. A possible future improvement |
| Netlify/Vercel | Another external account; Pages was already in use for v1 |

## Verification

`package.json` scripts `build` / `build:pages`; `apps/web/vite.config.ts` `base: './'`; the root `index.html` references `assets/index-5e2if5RV.js` and `assets/index-B8e1BSxP.css` at `19c1a1a`.

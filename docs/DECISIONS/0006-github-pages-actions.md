# ADR-0006: Build and deploy GitHub Pages from Actions (previews under /preview/)

- **Status:** Accepted (Bundle 36)
- **Date:** 2026-10-24
- **Deciders:** Project owner (steph1420)
- **Supersedes:** ADR-0004 (committed `next-gen` root) for *how* the site is produced, after the owner cutover in `docs/PAGES_SETUP.md`. Until cutover, ADR-0004 still describes the live path.
- **Related:** FEAT-64, ARCH-05, `.github/workflows/pages.yml`, `scripts/build-pages-site.mjs`

## Context

Committed root assets make every `next-gen` push a production UI release, dirty the git tree, and block branch previews. The owner chose preview **option A** (sub-paths under the existing Pages host).

## Decision

1. **CI** (`.github/workflows/ci.yml`) runs on `next-gen`, `bundle/**`, and `preview/**` and remains the Render `checksPass` gate for `next-gen`.
2. **Pages** (`.github/workflows/pages.yml`) builds:
   - `origin/next-gen` → site root
   - each live `bundle/*` / `preview/*` → `preview/<slug>/`
   - a `preview/index.html` listing
3. Deploy uses official `actions/upload-pages-artifact` + `actions/deploy-pages`, enabled only when repo variable `PAGES_ACTIONS_DEPLOY=true` (after Settings → Pages → Source = GitHub Actions).
4. Admin hash comes from Actions secret `VITE_ADMIN_PASSCODE_SHA256` (fail closed for the production root build).
5. Preview builds use `VITE_BUILD_CHANNEL=preview`, scoped storage keys, and a loopback relay target so they cannot write production Sheets.
6. Committed root assets stay until the owner completes the cutover checklist; deleting them is an optional follow-up.

## Consequences

**Positive:** no need to commit hashed assets for production; branch previews share one host; Render stays gated by CI.

**Trade-offs:** first full preview rebuild is slow; owner must set a secret and switch Pages source; until cutover, Actions deploy is skipped on purpose.

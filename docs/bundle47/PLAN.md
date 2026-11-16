# Bundle 47 — Remove Tailwind from LFPS (tokens + CSS Modules, no visual change)
From agent-common `templates/BUNDLE.md`. Styling decision: agent-common [`adr/ADR-0001-styling.md`](https://github.com/steph1420/agent-common/blob/main/adr/ADR-0001-styling.md) (end condition: no Tailwind left — dependency, config and classes — after 47d). LFPS does not keep a second copy of that ADR.
- App: LFPS Substitutions Manager (`apps/web`)
- Author: Lippy (Grok Bot)
- Status: 47a Done (on `bundle/47a-css-modules`, not merged); 47b–47d Proposed
- Steve's go: 16 Nov 2026 11:36 IST, Coding System room ("Yes for all", covering "go 47a")

## Scope lock
Only what Steve named: move styling off Tailwind with **zero visual change**, before the redesign (Bundle 46). Nothing else.
- In (47a): backup + branch; before screenshots; token file; CSS Modules convention; framer-motion exact pin; converter + count + screenshot/diff tools; agent-common checks wired in baseline mode; Header, TabBar, `components/common/*`, and the small modals/menus listed below.
- Out (47a): every other component (47b–47d); removing Tailwind or `index.css` classes; any redesign, behaviour or copy change; merging to `next-gen`; deploying.
- A moved component never goes back to Tailwind.

## Fits ARCHITECTURE
`fits ARCHITECTURE §2.1 Styling` ([`apps/web/docs/ARCHITECTURE.md`](../../apps/web/docs/ARCHITECTURE.md)) — every value from `src/tokens/`, one `Component.module.css` per component; `§6` lists the screenshot viewports used here.

## Step table
| Step | What it adds | Files touched | Proven done by | Status |
| --- | --- | --- | --- | --- |
| 47a-1 | Backup tag `backup/next-gen-pre-47a-20261116`, branch `bundle/47a-css-modules`, tarball in `_backups/` | — | tag at 3e45562 | Done |
| 47a-2 | Before screenshots (113) + screenshot/pixel-diff tool with build-time codenames | `apps/web/e2e/bundle47-shots.mjs`, `docs/bundle47/before/` | leak assert 0 hits; repeat run = noise only | Done |
| 47a-3 | Token file (107 theme values + 12-theme engine moved from `index.css` + literals), layer order, framer-motion `12.43.0` exact | `src/tokens/*`, `src/main.tsx`, `src/index.css`, `package.json`, lockfile | gate: tests, build, 0 visible diffs | Done |
| 47a-4 | Header, TabBar, TeacherNameOverlay → CSS Modules | 3 × (`.tsx` + `.module.css`) | gate | Done |
| 47a-5 | 13 small modals/menus → CSS Modules (PermissionGuard has no styles) | 13 × (`.tsx` + `.module.css`) | gate | Done |
| 47a-6 | Inline motion numbers in converted files → `src/motion/tokens.ts` | Header, LimboTray, TeacherNameOverlay | tsc, lint 0 motion findings in converted files | Done |
| 47a-7 | agent-common checks: leak scan, build output, pins, ESLint + stylelint baseline | `checks/`, `apps/web/eslint.config.mjs`, `apps/web/stylelint.config.mjs`, `apps/web/checks-baseline/` | baselines saved; module CSS 0 stylelint findings | Done |
| 47b | SettingsModal (203 className), AutoResolveBrainModal (97), NotificationCenterDrawer (65), AssignSubstituteModal (56), AwayOfficialModal (44), AdminAccessPanel (15), App.tsx (7) | 7 components | same gate | Proposed |
| 47c | RoutineGrid (113), AbsenceRoster (85), roster/* (95) — includes the matrix/absent theme rules in `index.css` that target Tailwind names | 6 components + `index.css` rules | same gate + retro-glass/table theme shots | Proposed |
| 47d | SubstitutionsRegister (234); move remaining `index.css` global classes into modules/tokens; add a base reset equal to Tailwind preflight; remove `tailwindcss`, `@tailwindcss/vite`, `tailwind-merge` (unused), the Tailwind import and plugin; new version | SubstitutionsRegister, `index.css`, `vite.config.ts`, `package.json` | same gate + `count-tailwind.mjs` = 0 + no `tailwind` in deps | Proposed |
| Release | After 47d: version bump, CHANGELOG, Steve's OK, merge to `next-gen` | — | live footer shows new version | Waiting |

Proposed deadline for Steve to approve: **Tailwind removed (47d merged) by 30 Nov 2026.**

## How every step is checked (the gate)
1. `npm test` to a file, then `rg -n "×|Tests " /tmp/vt.txt` (baseline core 35/35, web 87/87). Go is untouched by this bundle.
2. `npx tsc -b && npx vite build`.
3. `node apps/web/e2e/bundle47-shots.mjs shoot after` then `… diff` → `docs/bundle47/DIFF.md`. A real change = 25+ pixels changed by more than 16/255; below that is the measured noise floor (blur and hairline anti-aliasing).
4. `npm run lint` (baseline mode: only new findings fail; module CSS must stay at 0).
5. Commit by explicit path as Grok Bot.

## Screen and component inventory
See [`FEATURES.md`](FEATURES.md) (agent-common `templates/FEATURES.md`): every screen and component with an ID, its Bundle 47 step, and its screenshot.

## Feature IDs
B47-S01…S19 (screens/states), B47-C01…C30 (components) — in `FEATURES.md`.

## Files touched (47a)
- `apps/web/src/tokens/tokens.css`, `apps/web/src/tokens/properties.css` — the one token source.
- `apps/web/src/components/**/X.module.css` (16 new) + their `.tsx` — the conversions.
- `apps/web/src/motion/tokens.ts` — motion numbers from converted files.
- `apps/web/src/main.tsx`, `apps/web/src/index.css` — token import order; theme engine moved out.
- `apps/web/package.json`, `package.json`, `package-lock.json` — framer-motion pin, lint tools, scripts.
- `scripts/bundle47/*`, `apps/web/e2e/bundle47-shots.mjs` — converter, counter, screenshots.
- `checks/*`, `apps/web/eslint.config.mjs`, `apps/web/stylelint.config.mjs`, `apps/web/checks-baseline/*`.
- `docs/bundle47/*`, `apps/web/docs/ARCHITECTURE.md`, `CHANGELOG.md`, `TODO.md`.

## Tests
- Vitest core 35/35, web 87/87 (unchanged; no behaviour change).
- `docs/bundle47/DIFF.md` — 113 before/after pairs.
- CI gate (lint, tests, types, build, contrast night and day, every display scale): local gate green; lint in baseline mode.

## Rollback
- Backup / tag: `backup/next-gen-pre-47a-20261116` (= 3e45562) and `_backups/LFPS_pre-47a_20261116-060805.tar.gz` (box only).
- How to roll back: nothing is merged; `next-gen` is untouched. Delete or ignore the branch.
- A moved screen or finished step never goes back without Steve's OK.

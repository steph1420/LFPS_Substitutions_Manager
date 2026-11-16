# ARCHITECTURE.md — LFPS Substitutions Manager (apps/web)
From agent-common `templates/ARCHITECTURE.md` (06 v2). Written in Bundle 47a (16 Nov 2026) to describe the web app **as it is** at `next-gen` 3e45562 plus Bundle 47a. Where today's code breaks a 06 rule, the row says so under "Gap"; those are fixed at the app's next approved release with a "gaps vs 06" note, never silently. The repo-level blueprint stays in [`/ARCHITECTURE.md`](../../../ARCHITECTURE.md); this file is the 06 layer map that every bundle cites (`fits ARCHITECTURE §x`).

## 1. Context
LFPS Substitutions Manager is Little Flower Preparatory School's front-desk tool for teacher absences, substitutions and officiating, used every school morning on phones and the office desktop. `apps/web` (React 19, Vite 6, TypeScript, Zustand, framer-motion 12.43.0) talks to the Go relay (`apps/server`, WebSocket + HTTP) which reads and writes the school's Google Sheet (source of truth, ADR-0005). Domain logic lives in `@lfps/core`; shared physics/colour constants in `@lfps/ui`.

## 2. Layers and allowed imports
| Layer | LFPS folder | May import | Must not import | Gap today |
| --- | --- | --- | --- | --- |
| config/tokens | `src/tokens/` (CSS tokens, Bundle 47a), `src/motion/tokens.ts`, `@lfps/ui` tokens | nothing | anything else | — |
| contract | `@lfps/core` types, `src/sync/entities.ts` | config/tokens | data, store, ui, motion, mock | — |
| data | `src/sync/*`, `src/store/persistence.ts`, `src/lib/storageScope.ts` | contract, config/tokens | store, ui, motion, mock | `src/lib/devUiPrefs.ts`, `access.ts`, `adminGate.ts` touch storage directly |
| store | `src/store/useTimetableStore.ts` | contract, data, config/tokens | ui, motion, mock, network, storage | store reads/writes localStorage itself (preferences) |
| motion | `src/motion/` (tokens only so far) | contract, config/tokens, framer-motion | data, store, ui, mock | screens still import framer-motion directly (25 files) |
| ui (screens) | `src/components/**`, `src/App.tsx` | contract, store, config/tokens, motion | data, network, storage, framer-motion | some components import framer-motion and `lib/` storage helpers |
| mock | none yet (screenshots use a build-time codename seed, `apps/web/e2e/bundle47-shots.mjs`) | contract, config/tokens | production app | — |

### 2.1 Styling (ADR-0001, agent-common `adr/ADR-0001-styling.md`)
One system: tokens + CSS Modules. Every component's styles live in `Component.module.css` next to `Component.tsx`; values come from `src/tokens/tokens.css` (`var(--…)`), never raw hex/px. `src/tokens/` is loaded first (`main.tsx`) and fixes the cascade layer order `properties, theme, base, components, utilities`; module rules sit in `utilities` so they keep the exact precedence the Tailwind classes had. `index.css` keeps LFPS's own global classes (theme engine hooks, chips, matrix rules) until 47b–47d move them. Tailwind stays installed only until Bundle 47d removes it (end condition of ADR-0001).

## 3. State owners
| State | Owner (module) | Who may write | Who may read |
| --- | --- | --- | --- |
| Day, tab, absences, substitutions, officiating, history | `useTimetableStore` | store actions only | all screens |
| Identity, admin session, access | `useTimetableStore` (`resolveAccess` in `lib/access.ts`) | login/logout actions | screens via `usePermissions` |
| Reference data (staff, routine) | `sync/reference.ts` → store | sync layer | store |
| Live sync status | `sync/status.ts` | sync engine | Header pills |
| Device UI prefs (header scroll mode, day load) | `lib/devUiPrefs.ts` | Settings → Dev Options | App, Header |

## 4. Data flow
1. A tap goes to the screen's handler. 2. The handler calls a store action. 3. The store updates state optimistically and hands the change to the sync engine (`sync/engine.ts`) as an op. 4. The relay writes the Sheet's own tabs (`Subs`, `App_Meta`) and broadcasts to other devices. 5. Screens redraw from the store. Sync is by op log (ADR-0005; schema-2 `Subs`).

## 5. Interaction owners
| Screen | Interaction owner | Gestures (one per direction) |
| --- | --- | --- |
| Routine Matrix | `RoutineGrid.tsx` | right-click / context menu on a cell: quick menu (`MicroContextMenu`); drag a slot: move (limbo tray) — checked in code |
| Substitutions | `SubstitutionsRegister.tsx` | taps only (no gesture handlers found) |
| Staff Roster | `AbsenceRoster.tsx` + `roster/*` | taps only (no gesture handlers found) |
| Header | `Header.tsx` | page scroll: compact/expand header; tap island: day picker |

## 6. Display scales and test viewports
Bundle 47 screenshots (`apps/web/e2e/bundle47-shots.mjs`) use exactly these; every screen must match its before shot.

| Scale | Viewports |
| --- | --- |
| Phone portrait | 421×926 @3x (touch, mobile UA) |
| Phone landscape | 926×421 @3x (touch, mobile UA) |
| Desktop | 1440×900 @1x |
| Themes (desktop pass) | default on light OS, default on dark OS, light, warm-sepia, high-contrast, midnight, retro-glass, utopian-glass |

Existing `npm run e2e:phone` also checks 390×844 and 844×390 for overflow. Night/day: default theme on light and dark OS.

## 7. Live worktree
| Copy | Repo | Branch | Tag | Path | Owner | Release pointer | Rollback sha | Live bundle hash |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| stable (live) | steph1420/LFPS_Substitutions_Manager | next-gen | v2.0.0-alpha.3 | GitHub Pages root + Render relay | Lippy | push to `next-gen` | `rollback/pre-v2.0.0-alpha.3` | see Pages footer |
| preview | same | bundle/** | — | Pages `/preview/<slug>/` | Lippy | pages.yml | — | — |

## 8. Risks
| Risk | What we do | Check |
| --- | --- | --- |
| Live Sheet written by a test | Local relay guard, loopback-only test builds | `relayGuard` tests, build-web-local assert |
| Real names in screenshots or commits | Build-time codename seed; leak scan | `bundle47-shots.mjs` leak assert, `npm run check:leaks` |
| Visual drift while moving off Tailwind | Mechanical converter + before/after pixel diff per step | `docs/bundle47/DIFF.md` |
| Two styling systems linger | ADR-0001 end condition; 47b–47d plan with deadline | count script `scripts/bundle47/count-tailwind.mjs` |

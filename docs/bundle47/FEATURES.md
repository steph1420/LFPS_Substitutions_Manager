# FEATURES.md — LFPS Bundle 47 inventory (screens and components)
From agent-common `templates/FEATURES.md`. Scope: what Bundle 47 moves off Tailwind. Every row is **keep** (no behaviour or look change); the Rewrite column is the 06 rule 9 check and needs Steve's OK before 47d removes Tailwind. App feature IDs (FEAT-, UI-, SEC-) stay in `TODO.md`/`BUGS.md`; this table maps them to files and screenshots.

## Screens and states (screenshot names in `before/` and `after/`, each at phone-portrait, phone-landscape, desktop)
| ID | Feature | Source (mock / turn) | Status | Test | Rewrite (keep / change / drop) |
| --- | --- | --- | --- | --- | --- |
| B47-S01 | Routine Matrix (guest) | live app 2.0.0-alpha.3 | LIVE (2.0.0-alpha.3); styles move in 47c | `*--01-routine-guest.png` pixel diff | keep (proposed) |
| B47-S02 | Substitutions (guest) | live app 2.0.0-alpha.3 | LIVE (2.0.0-alpha.3); styles move in 47d | `*--02-substitutions-guest.png` pixel diff | keep (proposed) |
| B47-S03 | Staff Roster (guest) | live app 2.0.0-alpha.3 | LIVE (2.0.0-alpha.3); styles move in 47c | `*--03-roster-guest.png` pixel diff | keep (proposed) |
| B47-S04 | Staff Login modal | live app 2.0.0-alpha.3 | LIVE (2.0.0-alpha.3); styles move in 47a | `*--04-staff-login.png` pixel diff | keep (proposed) |
| B47-S05 | Admin passcode step | live app 2.0.0-alpha.3 | LIVE (2.0.0-alpha.3); styles move in 47a | `*--05-admin-passcode-step.png` pixel diff | keep (proposed) |
| B47-S06 | Routine Matrix (admin, 2 absences) | live app 2.0.0-alpha.3 | LIVE (2.0.0-alpha.3); styles move in 47c | `*--06-routine-admin.png` pixel diff | keep (proposed) |
| B47-S07 | Substitutions (admin, 2 absences) | live app 2.0.0-alpha.3 | LIVE (2.0.0-alpha.3); styles move in 47d | `*--07-substitutions-admin.png` pixel diff | keep (proposed) |
| B47-S08 | Staff Roster (admin, 2 absences) | live app 2.0.0-alpha.3 | LIVE (2.0.0-alpha.3); styles move in 47c | `*--08-roster-admin.png` pixel diff | keep (proposed) |
| B47-S09 | Console & Settings | live app 2.0.0-alpha.3 | LIVE (2.0.0-alpha.3); styles move in 47b | `*--09-settings.png` pixel diff | keep (proposed) |
| B47-S10 | Notification Center drawer | live app 2.0.0-alpha.3 | LIVE (2.0.0-alpha.3); styles move in 47b | `*--10-notifications.png` pixel diff | keep (proposed) |
| B47-S11 | Cell quick menu (MicroContextMenu) | live app 2.0.0-alpha.3 | LIVE (2.0.0-alpha.3); styles move in 47a | `*--11-context-menu.png` pixel diff | keep (proposed) |
| B47-S12 | Reset / purge menu | live app 2.0.0-alpha.3 | LIVE (2.0.0-alpha.3); styles move in 47a | `*--12-reset-purge-menu.png` pixel diff | keep (proposed) |
| B47-S13 | Sub availability modal | live app 2.0.0-alpha.3 | LIVE (2.0.0-alpha.3); styles move in 47a | `*--13-sub-availability.png` pixel diff | keep (proposed) |
| B47-S14 | Co-teacher modal | live app 2.0.0-alpha.3 | LIVE (2.0.0-alpha.3); styles move in 47a | `*--14-co-teacher.png` pixel diff | keep (proposed) |
| B47-S15 | Officiating AC modal | live app 2.0.0-alpha.3 | LIVE (2.0.0-alpha.3); styles move in 47a | `*--15-officiating-ac.png` pixel diff | keep (proposed) |
| B47-S16 | Dispute modal | live app 2.0.0-alpha.3 | LIVE (2.0.0-alpha.3); styles move in 47a | `*--16-dispute.png` pixel diff | keep (proposed) |
| B47-S17 | Add to Home Screen (desktop button; phone opens Settings) | live app 2.0.0-alpha.3 | LIVE (2.0.0-alpha.3); styles move in 47a | `*--17-add-to-home.png` pixel diff | keep (proposed) |
| B47-S18 | Routine Matrix, light theme | live app 2.0.0-alpha.3 | LIVE (2.0.0-alpha.3); styles move in 47c | `*--18-routine-light.png` pixel diff | keep (proposed) |
| B47-S19 | Limbo tray | live app 2.0.0-alpha.3 | LIVE (2.0.0-alpha.3); styles move in 47a | `*--19-limbo-tray.png` pixel diff | keep (proposed) |

## Components (className attributes / still on Tailwind after 47a)
| ID | Feature | Source (mock / turn) | Status | Test | Rewrite (keep / change / drop) |
| --- | --- | --- | --- | --- | --- |
| B47-C01 | App shell + footer — `src/App.tsx` | live app | LIVE; Tailwind until 47b; 7 className / 7 Tailwind | screenshots + `count-tailwind.mjs` | keep (proposed) |
| B47-C02 | Header (incl. dynamic island, sync pill, day bar) — `src/components/Header.tsx` | live app | LIVE; CSS Module (47a); 75 className / 0 Tailwind | screenshots + `count-tailwind.mjs` | keep (proposed) |
| B47-C03 | TabBar (bottom dock) — `src/components/TabBar.tsx` | live app | LIVE; CSS Module (47a); 6 className / 0 Tailwind | screenshots + `count-tailwind.mjs` | keep (proposed) |
| B47-C04 | TeacherNameOverlay — `src/components/common/TeacherNameOverlay.tsx` | live app | LIVE; CSS Module (47a); 5 className / 0 Tailwind | screenshots + `count-tailwind.mjs` | keep (proposed) |
| B47-C05 | AddToHomeScreenModal — `src/components/AddToHomeScreenModal.tsx` | live app | LIVE; CSS Module (47a); 39 className / 0 Tailwind | screenshots + `count-tailwind.mjs` | keep (proposed) |
| B47-C06 | PasscodeField — `src/components/PasscodeField.tsx` | live app | LIVE; CSS Module (47a); 5 className / 0 Tailwind | screenshots + `count-tailwind.mjs` | keep (proposed) |
| B47-C07 | AdminPasscodeStep — `src/components/AdminPasscodeStep.tsx` | live app | LIVE; CSS Module (47a); 13 className / 0 Tailwind | screenshots + `count-tailwind.mjs` | keep (proposed) |
| B47-C08 | StaffLoginModal — `src/components/StaffLoginModal.tsx` | live app | LIVE; CSS Module (47a); 28 className / 0 Tailwind | screenshots + `count-tailwind.mjs` | keep (proposed) |
| B47-C09 | CoTeacherModal — `src/components/CoTeacherModal.tsx` | live app | LIVE; CSS Module (47a); 20 className / 0 Tailwind | screenshots + `count-tailwind.mjs` | keep (proposed) |
| B47-C10 | DisputeModal — `src/components/DisputeModal.tsx` | live app | LIVE; CSS Module (47a); 25 className / 0 Tailwind | screenshots + `count-tailwind.mjs` | keep (proposed) |
| B47-C11 | OfficiatingModal — `src/components/OfficiatingModal.tsx` | live app | LIVE; CSS Module (47a); 20 className / 0 Tailwind | screenshots + `count-tailwind.mjs` | keep (proposed) |
| B47-C12 | ResetDayButton — `src/components/ResetDayButton.tsx` | live app | LIVE; CSS Module (47a); 3 className / 0 Tailwind | screenshots + `count-tailwind.mjs` | keep (proposed) |
| B47-C13 | ResetPurgeContextMenu — `src/components/ResetPurgeContextMenu.tsx` | live app | LIVE; CSS Module (47a); 8 className / 0 Tailwind | screenshots + `count-tailwind.mjs` | keep (proposed) |
| B47-C14 | MicroContextMenu — `src/components/MicroContextMenu.tsx` | live app | LIVE; CSS Module (47a); 19 className / 0 Tailwind | screenshots + `count-tailwind.mjs` | keep (proposed) |
| B47-C15 | UndoRedoControls — `src/components/UndoRedoControls.tsx` | live app | LIVE; CSS Module (47a); 7 className / 0 Tailwind | screenshots + `count-tailwind.mjs` | keep (proposed) |
| B47-C16 | PermissionGuard (hooks only, no styles) — `src/components/PermissionGuard.tsx` | live app | LIVE; CSS Module (47a); 0 className / 0 Tailwind | screenshots + `count-tailwind.mjs` | keep (proposed) |
| B47-C17 | LimboTray — `src/components/LimboTray.tsx` | live app | LIVE; CSS Module (47a); 23 className / 0 Tailwind | screenshots + `count-tailwind.mjs` | keep (proposed) |
| B47-C18 | SubAvailabilityModal — `src/components/SubAvailabilityModal.tsx` | live app | LIVE; CSS Module (47a); 29 className / 0 Tailwind | screenshots + `count-tailwind.mjs` | keep (proposed) |
| B47-C19 | SettingsModal — `src/components/SettingsModal.tsx` | live app | LIVE; Tailwind until 47b; 203 className / 203 Tailwind | screenshots + `count-tailwind.mjs` | keep (proposed) |
| B47-C20 | AutoResolveBrainModal — `src/components/AutoResolveBrainModal.tsx` | live app | LIVE; Tailwind until 47b; 97 className / 97 Tailwind | screenshots + `count-tailwind.mjs` | keep (proposed) |
| B47-C21 | NotificationCenterDrawer — `src/components/NotificationCenterDrawer.tsx` | live app | LIVE; Tailwind until 47b; 65 className / 65 Tailwind | screenshots + `count-tailwind.mjs` | keep (proposed) |
| B47-C22 | AssignSubstituteModal — `src/components/AssignSubstituteModal.tsx` | live app | LIVE; Tailwind until 47b; 56 className / 56 Tailwind | screenshots + `count-tailwind.mjs` | keep (proposed) |
| B47-C23 | AwayOfficialModal — `src/components/AwayOfficialModal.tsx` | live app | LIVE; Tailwind until 47b; 44 className / 44 Tailwind | screenshots + `count-tailwind.mjs` | keep (proposed) |
| B47-C24 | AdminAccessPanel — `src/components/AdminAccessPanel.tsx` | live app | LIVE; Tailwind until 47b; 15 className / 15 Tailwind | screenshots + `count-tailwind.mjs` | keep (proposed) |
| B47-C25 | RoutineGrid — `src/components/RoutineGrid.tsx` | live app | LIVE; Tailwind until 47c; 114 className / 113 Tailwind | screenshots + `count-tailwind.mjs` | keep (proposed) |
| B47-C26 | AbsenceRoster — `src/components/AbsenceRoster.tsx` | live app | LIVE; Tailwind until 47c; 85 className / 85 Tailwind | screenshots + `count-tailwind.mjs` | keep (proposed) |
| B47-C27 | RosterNormalCard — `src/components/roster/RosterNormalCard.tsx` | live app | LIVE; Tailwind until 47c; 46 className / 46 Tailwind | screenshots + `count-tailwind.mjs` | keep (proposed) |
| B47-C28 | RosterCompactCard — `src/components/roster/RosterCompactCard.tsx` | live app | LIVE; Tailwind until 47c; 11 className / 11 Tailwind | screenshots + `count-tailwind.mjs` | keep (proposed) |
| B47-C29 | RosterNormalListRow / RosterCompactListRow — `src/components/roster/RosterNormalListRow.tsx` | live app | LIVE; Tailwind until 47c; 38 className / 38 Tailwind | screenshots + `count-tailwind.mjs` | keep (proposed) |
| B47-C30 | SubstitutionsRegister — `src/components/SubstitutionsRegister.tsx` | live app | LIVE; Tailwind until 47d; 234 className / 234 Tailwind | screenshots + `count-tailwind.mjs` | keep (proposed) |

Status values: `LIVE (<version>)`, `building`, `planned`, `deferred`, `dropped` (template). Counts from `node scripts/bundle47/count-tailwind.mjs --files` after 47a.

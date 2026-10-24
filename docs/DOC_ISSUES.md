# Documentation Issues & Contradictions

This audit was performed on 2026-10-23 against `next-gen` @ `19c1a1a`, on branch `refine/jb31`. Every item was **checked against the source code**. Where the docs and the code disagree, the code is the current truth, and the verdict says so.

These items are **reported, not fixed**. No existing document was rewritten. `DEVELOPER_GUIDE.md` is owner-controlled and was left untouched. Its entries below are for the owner to action.

**Legend:**

- **Docs:** CU = `CATCH_UP_TO_ME.md`, TD = `TODO.md`, CL = `CHANGELOG.md`, AR = `ARCHITECTURE.md`, DG = `DEVELOPER_GUIDE.md`, DP = `DESIGN_PHILOSOPHY.md`, CG = `CLOUD_CONNECTIONS_AND_ROLLBACK_GUIDE.md`.
- **Severity (doc impact):** **H** misleads work or operations; **M** wrong fact; **L** cosmetic.

---

## A. Planning & process contradictions

### DI-01 (H): "Job Bundle 31" refers to three different scopes

| # | Where | Scope | Recorded status | Code reality |
|---|---|---|---|---|
| a | CL l.28 (in v2.0.0-alpha.1); TD BUG-20/BUG-21 "Resolved (Job Bundle 31)"; commit `357f4b3` "(Bundle 31)" | Moral Science nomenclature, auto-resolve count/period stamp, Off. CT appointment cards, column header sorter | Shipped | Implemented: `getSubjectFullName` in core; no "Auto-Resolve CT" button; `unappointedCTs` cards in `SubstitutionsRegister.tsx` |
| b | TD l.677 "Theme Engine, Restored Developer Options & Routine Drag Reordering" (FEAT-46/47/37A/37B; FEAT-22/23/24 unchecked) | 12 themes, 5-tap dev console, drag-drop swaps | TD: 🟢 Resolved. **CU l.26 and l.636: "ACTIVE NEXT"** | Implemented in commit `bc0eb04` (2026-10-20), which does not mention a bundle number. Not in CL |
| c | TD l.701; CU l.642 (backlog item 5) | Unified Cloud & Google Sheets 2-Way Sync (FEAT-51A/51B/48) | 🔴 Queued | Not implemented (see DI-14) |

**Owner instruction (2026-10-23):** *"Job Bundle 31 is what we were following last… stick with that."* The branch is therefore named `refine/jb31`. **The owner still needs to say which JB31 is meant.**

- By the "last followed" reading, it is (b). That bundle is resolved apart from FEAT-22/23/24, and it has no CHANGELOG entry.
- The open work is (c).

**Recommendation:** renumber (b) and (c), for example to 34 and 35, or to 31B and 31C. Do this only on the owner's instruction.

### DI-02 (H): Job Bundles 28 and 29 each appear twice, with conflicting scope and status

- **JB28.**
  - TD l.595 shows "🔴 Queued" with BUG-18 and FEAT-61 as `[ ]`.
  - TD l.717 shows the same bundle as "🟢 Resolved" with `[x]`.
  - The code and CL agree it is resolved. The l.595 block is stale.
- **JB29.**
  - TD l.612 shows "Security RBAC, Teacher Self-Service & Notification Center" as 🟢 Completed. That matches CL JB29 and the code (`PermissionGuard.tsx`, `DisputeModal.tsx`, `NotificationCenterDrawer.tsx`).
  - TD l.738 shows "Routine Matrix Drag-and-Drop Reordering & Class Context Menu" as 🔴 Queued.
  - That second scope was delivered under DI-01(b) in `bc0eb04`.
  - The l.738 block is stale and duplicates FEAT-37A/37B.

### DI-03 (M): FEAT-22/23/24 (substitution table column sorting) status is unclear

- TD shows these items unchecked in both JB31(b) l.698 and JB29 l.745.
- CL JB31 lists a "Column Header Sorter".
- The code has `substitutionsSortBy` (period/name/role) for uncovered slots, added in FEAT-58 and commit `c901021`.
- Nothing shows clickable ▲/▼ headers for Period, Class, Teacher and Status as TD specifies. *Verdict: partially implemented. The owner should confirm the acceptance criteria.*

### DI-04 (M): Unit-test counts disagree. The actual count is **19**

| Source | Claim |
|---|---|
| CU l.14 | 19/19 |
| CU l.319 | 16/16 |
| CU l.557 | "all 15 tests pass" |
| CU l.586 | "11 Vitest tests" |
| CU l.631 (§5 Current Git State) | 18/18 |
| TD l.414 | 10/10 |
| CG l.127 | 19/19 |
| DG l.184 | 19 |

The real figure is `npm test` = 1 file, **19 passed**, in 6 suites (see SAS §4.3). The historical figures may have been correct when written. However, CU §5 claims to describe the *current* state and is stale.

### DI-05 (M): CATCH_UP_TO_ME.md contradicts itself about the current state

- §0 (l.12–26) says Job Bundle 33 was just completed, with 19/19 tests.
- §5 "Current Git State" (l.627–632) gives the head as JB30 with 18/18 tests.
- §5's backlog calls JB31(b) "ACTIVE NEXT", although TD marks it Resolved.
- Neither section mentions the five later commits (`3dfa4c4`…`aba0369`) or the docs commits `bdd6fd3`/`19c1a1a`.

### DI-06 (M): Bundle-size rule conflict

- CU §0.4 rule 1 (l.33) quotes the owner: *"Now we will not stick to just 2 tasks… make bundles as big as you can handle."*
- CU §3.14 rule 1 (l.534–536), "The 2-Item Micro-Bundle Rule ('Merge max 2 things')", says never to combine features, and CU l.294 notes "Max 2 items constraint".

*Verdict:* the §0 quote is the later instruction, and DG §11.4 sets no size limit, so large cohesive bundles apply. §3.14 is stale.

### DI-07 (H): Branch and push policy conflicts with current owner rules

- DG §7.4 (l.322) says "Work strictly on branch `next-gen`".
- DG §11.4 (l.480, l.494) and CU §2.2 (l.96, l.110–114) say to "Git Commit & Push strictly to origin/next-gen" (`git add -A`, `git push origin next-gen`).
- The current owner job rules say to work on feature branches cut from `next-gen`, never push, and never touch `main` or `next-gen`.
- Because Pages serves the `next-gen` root (ADR-0004), the documented procedure deploys to production on every push.
- `git add -A` would also stage the tracked `tsconfig.tsbuildinfo`, `.DS_Store` and similar files.

*Update 2026-10-24:* the DG part is closed (§E); the DG now records the owner's rule. CU §2.2 is still stale.

*Owner action needed (original):* confirm the branch model, then update DG if desired. `docs/WORKFLOW.md` §3 records the feature-branch model in the meantime.

### DI-08 (M): CATCH_UP §2.1 tells contributors to log changes under the released version

CU l.77 says to follow Keep a Changelog "under the active version `[v2.0.0-alpha.1]`". This conflicts with Keep a Changelog, which puts unreleased work under `[Unreleased]`. As a result, the v2.0.0-alpha.1 section is dated 2026-10-18 but contains work up to JB33 (2026-10-20). See DI-17 and `VERSIONING.md`.

---

## B. Architecture docs vs code

### DI-09 (M): Class Teacher role colour: Teal is documented, Amber is in the code

- AR l.138, DP l.91 and DG l.299 say Class Teachers are "Teal-Sky (`#0284c7`)".
- The code uses `packages/ui/src/tokens.ts` `COLOR_ROLES.classTeacher.base = '#f59e0b'` ("Golden Amber (FEAT-56)"), consistent with CL, TD l.501 and the CU Issue 5 owner quote.

*Verdict: Amber is correct; AR, DP and DG are stale.* Note also that `freeFromSub` uses the same `#f59e0b`, so the two roles cannot be told apart by colour alone.

### DI-10 (M): Wrong file paths

| Claim | Where | Actual |
|---|---|---|
| `packages/core/src/types.ts`, `constants.ts`, `solver.ts`, `disambiguation.ts` | AR l.23–26, l.120–121 | `src/types/index.ts`, `src/data/seed.ts`, `src/solver/index.ts`, `src/disambiguation/index.ts` |
| `apps/server/cmd/server/main.go` | AR l.58, DG l.107 | `apps/server/cmd/api/main.go` (and the Dockerfile builds `./cmd/api`) |
| `internal/excel/exporter.go` | CU l.620 | `internal/excel/generator.go` |

### DI-11 (M): The Docker runtime is not `scratch`

- AR l.63 and l.204, and DG l.112 and l.506, say: multi-stage, `golang:1.23-alpine` builder, then a `scratch` runtime, giving a ~15 MB image.
- The actual `apps/server/Dockerfile` (identical to the sidecar `Dockerfile.render`) uses an **`alpine:3.20` runtime** stage. The image-size claim is unverified.

### DI-12 (M): The state file name is wrong

- AR l.164, DG l.430 and CG l.106 say `data/state.json`.
- The code (`internal/storage/store.go`) writes `${DATA_DIR}/current_state.json`, with backups in `${DATA_DIR}/backups`.

### DI-13 (L): Token documentation does not match `@lfps/ui`

- AR l.134 and DG l.277 list `ISLAND_SPRING` as a `@lfps/ui` token (`duration 0.6`). It is **not** in `tokens.ts`. It is a local constant in `apps/web/src/components/Header.tsx`, with `duration: 0.55` and `bounce: 0.12`.
- DG l.274 shows `bouncy: { stiffness: 350, damping: 18, mass: 1.0 }`. The code has `320 / 24 / 1`.

### DI-14 (H): The real-time sync and "local-first / offline" claims do not match the code

**Claims**

- AR l.12: "local offline persistence"
- AR l.185: sequence diagram "Store → WS: Emit STATE_MUTATION"
- AR l.161 and TD l.439: "full-duplex"
- DG l.63 and l.69: "local-first … full offline usability"
- DG §9.2 l.398–401: `useLiveSync` broadcasts `STATE_MUTATION`, and offline mutations sync on reconnect

**Code**

- `useLiveSync.ts` never sends on the socket. `pushAbsence` and `pushSubstitution` are defined but **nothing calls them**.
- An incoming `STATE_MUTATION` only updates `lastSyncTime`; its payload is discarded.
- The server's `readPump` discards client frames. Mutations reach the server only through REST, which the client never calls.
- There is no offline queue. Only preferences are written to `localStorage`, so absences and substitutions are lost on reload.

*Verdict:* sync is scaffolded but not wired. This is exactly the open scope of JB31(c) / FEAT-48. CU and DG should not describe it as working.

### DI-15 (H): "Production build passes cleanly" holds only if `@lfps/ui` was built beforehand

- CU l.15 and l.632, DG l.319, and CG Scenario A (l.131) say `npm run build` passes.
- On a **fresh clone**, `npm run build:core && npm run build:web` fails with 17 × `TS2307 Cannot find module '@lfps/ui'`, because `@lfps/ui` resolves to `packages/ui/dist` and no root script builds it. `npm run build` fails in the same way, so CG Scenario A step 5 fails on a clean machine.
- After `npm run build --workspace=@lfps/ui`, the build succeeds and reproduces the committed `assets/` byte-for-byte.

### DI-16 (L): Tooling versions

- DG l.184 says "Vitest `3.0.5`". The package range is `^3.0.5`, and the installed version is **3.2.7**.
- `npm audit` reports 3 vulnerabilities (1 moderate, 2 critical) through the Vitest 3.x toolchain. The fix requires Vitest 4 (a breaking change), and no doc mentions it.

### DI-17 (M): CHANGELOG integrity

1. `[Unreleased]` → `### Planned` ends with a dangling bullet, "**Codebase Technical Debt & Bloat Elimination**:", which has no content and no blank line before `## [v2.0.0-alpha.1]`. That breaks Markdown structure.
2. `[v2.0.0-alpha.1] - 2026-10-18` contains Job Bundles 19–33. Several were delivered on 2026-10-19 and 2026-10-20, after the stated date (see DI-08).
3. Job Bundles 21, 22, 26 and 27 have no CL entry.
4. Five feature commits after the last CL change (`0833f28`) have no entry:
   - `3dfa4c4`
   - `c901021`
   - `bc0eb04` (themes, dev console, drag-drop)
   - `b28c48e`
   - `aba0369`
5. CL cites BUG-01, 02 and 04–18 by ID. BUG-03 and BUG-19 to BUG-23 are never cited by ID.
6. Headings use a `v` prefix, and there are no compare links or git tags. This is acceptable but non-standard, and `VERSIONING.md` keeps the existing style.

### DI-18 (M): Off. CT solver bonus: +250 is documented, +30 is in the code

- TD l.722 (JB28) and CL JB28 (about l.50) say `calculateCandidateAffinity` gives the designated Off. CT a "+250" bonus.
- TD l.652 (JB30) and the code (`packages/core/src/solver/index.ts`, `officiatingMatch = 30`) say **+30** "modest familiarity".

*Verdict:* +30 is current, because JB30 superseded JB28. BUGS.md flags this on BUG-18.

### DI-19 (L): The "Zero `any`" rule is not met

DG §7.2 (l.313) requires zero `any`. There are 5 occurrences across `apps/web/src` and `packages/*/src`.

### DI-20 (M): The rollback guide's identifiers don't match the artefacts

- CG Scenario A expects a tarball named `LFPS_PRISTINE_ROLLBACK_v2.0.0_bundle33_*.tar.gz`. The supplied file is `LFPS_Substitutions_Manager_PRISTINE_ROLLBACK_v2.0.0.tar.gz`.
- CG Scenario B calls `bdd6fd3` "This Pristine Commit".
- The tarball's contents actually match `19c1a1a`. It contains the `19c1a1a` version of `DEVELOPER_GUIDE.md`, which differs from `bdd6fd3` by 1 line. It does not contain `CLOUD_CONNECTIONS_AND_ROLLBACK_GUIDE.md`, which was added in `19c1a1a`.

---

## C. Repository hygiene (no fix applied; owner decision)

### DI-21 (M): Tracked files that the docs or `.gitignore` say should not be tracked

- 38 tarballs are tracked under `_backups/` even though `.gitignore` contains `_backups/`. Fix with `git rm --cached -r _backups` if desired.
- `.DS_Store` is tracked at the root.
- `apps/web/tsconfig.tsbuildinfo` is tracked, and every build rewrites it.
- `apps/web/.env` is tracked. It holds only the public `VITE_API_URL` and `VITE_WS_URL` endpoints, which are also visible in the shipped JS bundle, and it is identical to the sidecar `.env`/`env.production`. Even so, a tracked `.env` invites accidental secret commits. Consider renaming it to `.env.production` or `.env.example` and ignoring `.env`.

### DI-22 (L): Server behaviours that are undocumented or contradict the docs

- `GET /api/v1/backups` returns `downloadUrl: /api/v1/backups/download?file=…`, but that route is not registered.
- `_ = s.persistLocked()` swallows write errors (DG implies durable persistence).
- `hub.go` deletes clients from the map while holding only `RLock` in the broadcast branch.
- `CheckOrigin` accepts every origin, and CORS is `*`. There is no server-side auth, so the RBAC described in DG/CL (SEC-01) is client-side only.
- The Go `SubstitutionAssignment` has no `disputeRemark`, `acceptedAt` or `disputedAt` fields (FEAT-49). Those fields would be dropped in a server round-trip.

---

## Resolution tracking

| ID | Owner decision needed? | Suggested fix location |
|---|---|---|
| DI-01, DI-02 | **Yes** (renumbering) | TD, CU |
| DI-03 | Yes (acceptance criteria) | TD |
| DI-04, DI-05, DI-06, DI-08 | No | CU |
| DI-07 | **Yes** | DG (owner-only), CU |
| DI-09–DI-13, DI-16, DI-19 | No (DG parts are owner-only) | AR, DP, DG |
| DI-14, DI-15 | No for the docs; code fixes are a separate bundle | CU, DG, AR, CG; root `package.json` (code change, out of scope here) |
| DI-17, DI-18 | No | CL (append corrections; do not rewrite released sections) |
| DI-20 | No | CG |
| DI-21, DI-22 | **Yes** | repo / server code (largely done in JB34, see §D) |
| DI-23, DI-24, DI-25 | No (DG parts are owner-only) | AR, CG, CU, TD; DG on request |

> **2026-10-24:** the DG parts of all items above are closed by the owner-requested DEVELOPER_GUIDE update (§E). The non-DG parts (AR, CU, CG, DP, TD) stay open (ARCH-03).

---

## D. Job Bundle 34 update (branch `bundle/34`, 2026-10-23)

Code changes in Bundle 34 change the verdict of several items. The older docs (AR, CU, DG, CG) were **not** rewritten; that is ARCH-03 (Bundle 38), and DG stays owner-only.

| ID | Status after JB34 | Detail |
|---|---|---|
| DI-12 | Superseded | The server no longer writes any state file (`current_state.json`, `backups/`) under the relay model. AR l.164/169, DG l.430 and CG l.106 now describe something that does not exist at all. See DI-23 |
| DI-14 | Partly resolved in code | Same-device persistence exists now (`lfps_operational_state`, SAS §6.2), so "local persistence" is true per device. Real-time sync is **still not wired** (Bundle 35); the "full-duplex" / "offline mutations sync on reconnect" claims remain false |
| DI-15 | Resolved in code (`5f9ff9c`) | `build` now runs `build:libs` first; a fresh clone builds. CU/DG/CG "build passes" claims are true on `bundle/34` (not yet on `next-gen`) |
| DI-21 | Partly resolved (`1e5ce82`) | `apps/web/tsconfig.tsbuildinfo` untracked and `*.tsbuildinfo` ignored. `_backups/` tarballs, `.DS_Store` and `apps/web/.env` remain tracked (owner decision; `.env.local` patterns are now ignored for the admin hash) |
| DI-22 | Resolved (`88e640a`) | `/backups` removed (BUG-27), write errors handled (BUG-28), write lock (BUG-26), CORS/WS origin allowlist, Go model parity. Server auth is still absent (SEC-02) |
| DI-04 | Counts changed | Core now has **26** tests (19 solver + 7 calendar); web has 24 |

### DI-23 (H): Docs describe server-side storage, which the owner has ruled out

- AR l.169 ("timestamped daily snapshots `data/backups/…`"), CG l.59 (`/api/v1/backups` link), CG l.87 (`DATA_DIR` "persistent disk storage"), CG l.104 ("Persistent Disk (Optional but Recommended)"), TD l.570 (JB20 notes) and DG (server persistence) all describe the server as storage.
- Owner direction (2026-10-23): **Google Sheets is the source of truth; Render is a stateless live relay.** Since JB34 the code matches that: in-memory week state, no disk, `DATA_DIR` ignored.
- *Fix:* ARCH-03 for AR/CG/TD, FEAT-63 for the new Render guide; DG on the owner's request.

### DI-24 (M): Version strings in older docs

- CU, DG and AR quote `2.0.0-alpha.1` and "Next-Gen v2.0". The single source is now the root `package.json` (`2.0.0-alpha.2`), checked by `npm run version:check`; the app shows it in the header, footer and Settings.

### DI-25 (L): Admin gate vs DESIGN_PHILOSOPHY "no login walls" (checked, compatible)

- DP l.48–49 forbid compulsory login walls and require instant Front Desk access. The JB34 admin passcode only gates admin actions (schedule editing, solver policy, Reset Day, purge, developer mode); Front Desk keeps 0-second access to attendance, substitutions, Off. AC / Off. CT and export. No contradiction, but DG/CL describe SEC-01 as role selection without a passcode and should be updated (ARCH-03; DG owner-only).

---

## E. DEVELOPER_GUIDE update (2026-10-24, owner request, branch `handover/2026-10-24`)

The owner asked for `DEVELOPER_GUIDE.md` to be updated. It was rewritten against the code and docs as of `bundle/35a`. Only the **DG parts** of these items are closed; other documents named in them are unchanged (ARCH-03, Bundle 38).

| ID | DG status | How |
|---|---|---|
| DI-04 | Closed | DG no longer quotes a stale count; §11.3 gives the 35a counts (core 35, web 73, Go 46, e2e 22) and points to WORKFLOW §4 |
| DI-07 | Closed | DG §7.4/§11.4 now give the owner's rule: back up, new branch per bundle, never `main`, push/release only on the owner's go (WORKFLOW §3, §5) |
| DI-09 | Closed (DG) | CT colour is amber `#f59e0b`. DP still says teal |
| DI-10 | Closed (DG) | Paths corrected (`cmd/api`, `src/sync/*`, `lib/*`) |
| DI-11 | Closed (DG) | Docker runtime is `alpine:3.20` |
| DI-12, DI-23 | Closed (DG) | No server storage; the relay is stateless, Sheets is the source of truth (ADR-0005) |
| DI-13 | Closed (DG) | Spring tokens match `@lfps/ui`; `ISLAND_SPRING` noted as local to `Header.tsx` |
| DI-14 | Closed (DG) | §10 describes the real sync (35/35a): outbox, LWW per entity, HYDRATE, offline queue |
| DI-15 | Closed (DG) | Ordered builds (`build:libs`) documented; root `build` is release-only |
| DI-16 | Closed (DG) | Version table now indicative, with the installed Vitest noted |
| DI-19 | Closed (DG) | DG reworded to "do not add new `any`; a few legacy ones remain". The cleanup itself stays open |
| DI-24 | Closed (DG) | No hard-coded version strings; §9.4 points to the single source |
| DI-25 | Closed (DG) | §9.3 describes the passcode gate, `resolveAccess` and "Edit without login" |

DG §8.2 also now matches SAS §4.1 for candidate scoring. DG §1, §5 and §10 named individual teachers; they now use roles only.

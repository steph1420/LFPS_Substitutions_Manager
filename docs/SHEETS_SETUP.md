# Google Sheets setup: the Sheets bridge (Bundles 35, 35a)

Google Sheets is the **source of truth** (SAS §2.1, ADR-0005). The relay's Sheets bridge (`apps/server/internal/sheets`) does two things:

- It **reads** the owner's tabs at startup and then every `SHEETS_PULL_INTERVAL` (one `batchGet` request per pull), and streams them to devices as `SHEETS_SNAPSHOT`. Devices apply Staff Directory and the per-teacher routine tabs (35a, SAS §6.3). This is read-only.
- At startup it **reads `Subs` back** and reloads the week's substitutions and deletions into the relay before devices are let in (35a).
- It **writes only** the app-owned tabs `Subs`, `App_Meta` and (if `SHEETS_LOG=1`) `App_Log`. Writes are asynchronous, debounced (2 s quiet, at most 15 s), batched, and retried with backoff.

Spreadsheet: `1ST9ThXZQ7PaRpl-n8ka3xulfN3X3u7awHkO6pErb6Ho`, the `/d/<id>/edit` part of the editor URL. A "Publish to web" `2PACX-…` link is **not** this ID and can't be written through.

## 1. Rules the code enforces

| Rule | Where |
|---|---|
| Only `Subs`, `App_Meta`, `App_Log` can be created, written or appended. Any other tab name returns `ErrForbiddenTab` before any Google call | `sheets.WritableTabs` + the `guard` wrapper (`api.go`), tests `TestAllowlist`, `TestGuardBlocksOwnerTabs`, `TestEnsureTabsAndFlush` |
| An existing tab named `Subs`/`App_Meta`/`App_Log` whose header isn't the app's is left alone (`ErrNotAppOwned`) | `EnsureTabs`, `Flush`, test `TestRefusesForeignTabWithAppName` |
| Owner tabs are never written, unhidden, renamed, reordered or re-protected. The service never calls those Sheets API operations on them | `google.go` uses only values get/update/append and `AddSheet` (app tabs). `sheetcheck -protect` adds protections to app tabs only |
| Hidden tabs are **not pulled**; only their count is sent | `Pull`, test `TestPullSkipsHiddenAndAppTabs` |
| Legacy v1 tabs `Daily_Ledger`, `Baseline_Updates` are read-only (pulled like any owner tab, never written) | `sheets.LegacyTabs` |
| Rows in `Subs` are upserted by their stable key (column A) and **never deleted**. Writing the same state twice changes nothing (idempotent). A removed substitution keeps its row as a **tombstone**: Status `REMOVED`, `Deleted At` set, with its version | `Flush`, tests in `bridge_test.go`, `fake_test.go` |
| `Subs` is not written until it has been read back once after a start, so a restart can't overwrite rows it hasn't loaded | `Rehydrate` / `Flush`, `rehydrate_test.go` |
| A reloaded tombstone beats an older copy from any device (last writer wins by Version TS/By) | relay `ApplyRehydrate`, `internal/relay/hydrate_test.go` |
| The spreadsheet ID comes from the environment only | `cmd/api` `readSheetsEnv`, CI grep |
| Credentials are a file (`GOOGLE_APPLICATION_CREDENTIALS`); nothing of the key is logged | `google.go` |

Even where Google would allow it (the service account is an editor, and it is listed on the owner tabs' protections, §5), the allowlist is what stops a write.

## 2. One-time Google setup (owner)

1. **Google Cloud Console** → choose or create a project → **APIs & Services → Library → Google Sheets API → Enable**.
2. **IAM & Admin → Service Accounts → + Create service account** (e.g. `lfps-relay`). It needs no project roles.
3. Open it → **Keys → Add key → Create new key → JSON**. This downloads the key once. Treat it like a password: store it only as the Render Secret File `sa.json` (RENDER_SETUP §3), then delete the download.
4. In the **Sheet** → **Share** → add the service account's email (the `client_email` in the JSON key; Google Cloud also shows it on the service account page) as **Editor**, untick "Notify". Editor access is needed to create and write the app tabs. The code limits what it writes (§1).

Done (2026-10-24): the owner created the account and shared the Sheet. Reads and writes work (integration check below).

## 3. Verify with `sheetcheck`

Run it from `apps/server` with the key in a file **outside the repo** (chmod 600; delete it afterwards):

```sh
SHEETS_SPREADSHEET_ID=1ST9ThXZQ7PaRpl-n8ka3xulfN3X3u7awHkO6pErb6Ho \
GOOGLE_APPLICATION_CREDENTIALS=/path/outside/repo/sa.json \
go run ./cmd/sheetcheck            # read-only report
go run ./cmd/sheetcheck -ensure    # + create Subs/App_Meta if missing, write App_Meta
go run ./cmd/sheetcheck -selftest  # write, reload, delete, clean up test rows in Subs (35a)
go run ./cmd/sheetcheck -clean     # remove leftover self-test rows from Subs
go run ./cmd/sheetcheck -protect   # owner's choice only, see §5
```

- **No flags** is read-only. It lists every tab (name, hidden, protected, row count) and the legacy tabs' header rows. It prints no cell data and only the domain of the service-account email.
- **`-ensure`** goes through the same allowlisted bridge. It fingerprints every other tab before and after and fails if any changed.
- **`-selftest`** (35a) touches only `Subs` and `App_Meta`. It writes 3 test rows (ids `zz-itest-…`), simulates a restart and checks all 3 reload with versions and payloads, deletes one and checks the tombstone row and that a repeat flush writes nothing, simulates another restart and checks the tombstone reloads and refuses a stale copy, then removes the test rows. Before and after it fingerprints every other tab (values in one `batchGet`, plus order, visibility and protection; hidden tabs by properties only) and fails if any changed.
- The server also runs `EnsureTabs` at startup, so `-ensure` is optional.

**Real-Sheet result (2026-10-24, 35a):** `-selftest` passed every step, twice. `Subs` was upgraded from schema 1 (0 data rows) to schema 2; after cleanup it holds only the header, and `App_Meta` has 8 rows. None of the 19 other tabs changed (values, order, visibility, protection).

## 4. Tabs found (integration check, 2026-10-24)

19 tabs, read through the service account; no permission errors.

| Tabs | Owner | App use |
|---|---|---|
| Staff Directory, Subjects List, 9 per-teacher routine tabs, OVERVIEW, KG A, KG B, PREP A, PREP B | Owner | Read-only, pulled |
| `_DB_Helper` (hidden) | Owner | **Not pulled, not read** (only its name and hidden flag). v1 code doesn't reference it. By its name it is most likely a formula or Apps Script helper. The app has no need for it |
| `Daily_Ledger`, `Baseline_Updates` | Legacy v1 (written by the v1 Apps Script web app: `logSubstitutions` → Daily_Ledger, `updateBaseline` → Baseline_Updates) | **Left untouched.** Read-only |
| `Subs`, `App_Meta` | App (created by `sheetcheck -ensure`) | Written by the bridge |
| `App_Log` | App (optional) | Created only when `SHEETS_LOG=1` |

Each visible owner tab has one protected range, and the service account is listed as an editor on those protections.

### App-owned tab formats (schema `2`, Bundle 35a)

- **`Subs`**: `Key, Date, Day, Period, Absent Teacher, Substitute, Class, Subject, Status, Note, Updated At, Updated By, App Version, Deleted At, Version TS, Version By, Payload`.
  - `Key` is the sync key `sub|<date>|<id>`. Times are in the school zone (Asia/Kolkata).
  - `Date` … `App Version` are for people. `Version TS` (Unix ms) and `Version By` (device id) are the last-writer-wins version; `Payload` is the substitution as JSON, so the relay can reload it exactly. Please don't edit these four by hand.
  - A tombstone has Status `REMOVED`, `Deleted At` set and an empty `Payload`.
  - A schema-1 tab (Bundle 35: `…, App Version, Revision`) is upgraded in place on start; its old rows have no version and are not reloaded.
- **`App_Meta`**: key/value rows `schema_version`, `app_version`, `last_updated`, `last_pull`, `data_version` (hash of the pulled owner tabs; devices show it in Settings → Build Info), `subs_reloaded_at`, `writer`. Rewritten at startup and after writes.
- **`App_Log`**: `Time, Event, Rows, App Version`, one row per flush.

## 5. Owner decisions (proposals; nothing applied)

1. **Legacy tabs.** The default is in force: they're untouched, and new data goes to `Subs`.
   - **Option A:** retire them. Keep them as history and stop v1's Apps Script once v1 is off.
   - **Option B:** one-off migration of past `Daily_Ledger` rows into `Subs` (a script run on request, read-only on the source).
   - **Option C:** reuse `Daily_Ledger` as the app's log instead of `App_Log`. Not recommended: its v1 columns differ, and v1 may still write to it.
   - Recommendation: **A**, plus B if past history should appear in the new tab.
2. **Protect the app tabs** so only the service account (and the file owner, who can always edit) can change them: `go run ./cmd/sheetcheck -protect`. It is reversible (Data → Protect sheets and ranges → remove). Not applied.
3. **Remove the service account from the owner tabs' protections.** Today it is listed as an editor on them. The code never writes there, but removing it makes Google enforce the rule too. It is owner-only and manual: Data → Protect sheets and ranges → each range → remove the account.
4. **Principal in the Staff Directory.** Add a row with Role `Principal` so Staff Login lists the Principal by name (34a).
5. **Publish to web.** If the Sheet is still "published to web", anyone with that link can read it (it may include staff data). Consider unpublishing it, since the relay now reads through the API.

## 6. Limits (Bundles 35, 35a)

- Devices map Staff Directory, the per-teacher routine tabs and Subjects List. **Not mapped** (reported in the developer console): OVERVIEW, the class tabs KG A, KG B, PREP A, PREP B, and the legacy tabs. A routine cell the mapper can't read safely keeps the app's built-in value.
- Only the **active week** is reloaded from `Subs`, and only substitutions (SAS §6.3 Limits).
- If `Subs` can't be read at start, devices are let in after `SHEETS_HYDRATE_TIMEOUT` (degraded); the reload keeps retrying and nothing is written to `Subs` until it succeeds.
- **Quota:** Sheets allows 60 reads and 60 writes per minute per user. A start costs a few reads, each pull 1 (one `batchGet`), and the bridge does at most one batched write per debounce window (≈ 2–15 s).

## 7. Local tests without Google (35a)

`SHEETS_FAKE_FILE=/tmp/sheet.json` runs the relay in sheets mode against a JSON file instead of Google (`{"tabs":[{"title":…, "hidden":false, "rows":[[…]]}]}`). It is ignored when `SHEETS_SPREADSHEET_ID` is set, and logs a loud warning. Never set it on Render.

`npm run e2e:sheets` uses it: two browsers and a fresh third against a local relay, with a restart mid-test (SAS §3.1). The web build for it comes from `npm run build:web:local`, which can only target a loopback relay (SAS §6.5).

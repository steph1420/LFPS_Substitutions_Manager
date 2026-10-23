# Render setup: LFPS live relay (Bundles 35, 35a)

The Go server in `apps/server` is a **stateless live relay** (SAS §2.1). Devices sync through it over one WebSocket each. If it has Google credentials, it also runs the **Sheets bridge** ([SHEETS_SETUP.md](./SHEETS_SETUP.md)). Without them it runs **relay-only**: devices still sync live, and nothing touches Google Sheets.

Everything below is owner work in the Render Dashboard. Nothing deploys from this repo until the owner approves and pushes.

## 1. What `render.yaml` describes

| Field | Value | Why |
|---|---|---|
| `runtime` | `docker` | `apps/server/Dockerfile` (Go 1.23 build → Alpine with CA certificates) |
| `dockerContext` / `dockerfilePath` | `./apps/server` / `./apps/server/Dockerfile` | The Go module lives in `apps/server` |
| `branch` | `next-gen` | Same branch that GitHub Pages serves |
| `plan` | `free` | Sleeps after 15 min idle and wakes in about a minute. The owner's pinger keeps it warm in school hours (PERF-03). The client shows **Connecting…** meanwhile (FEAT-66) |
| `healthCheckPath` | `/api/v1/health` | Cheap: no lock, no I/O, no Sheets call. Answers GET and HEAD |
| `autoDeployTrigger` | **`checksPass`** | See §2 |
| `buildFilter.paths` | `apps/server/**`, `render.yaml` | Web-only commits don't redeploy the relay |
| `envVars` | see §3 | Names and non-secret values only |

## 2. Deploy gate: decision

**Chosen: `autoDeployTrigger: checksPass` ("After CI Checks Pass").** Render deploys a new `next-gen` commit only after **every** GitHub check on it passes. The checks come from `.github/workflows/ci.yml`:

- **server:** `gofmt`, `go vet`, `go test -race`, and a grep proving the spreadsheet ID is not in any `.go` file
- **web:** `npm ci`, `npm run build:web`, `npm test` (version drift check plus core and web tests)

Render [does not deploy](https://render.com/docs/deploys#integrating-with-ci) when a commit has zero checks or any failed check. So if Actions is disabled, nothing auto-deploys, which fails safe. Manual deploys (Dashboard → **Manual Deploy**) always work.

We chose this over a deploy hook because it needs no secret in GitHub (a deploy-hook URL is a credential) and no extra workflow step. The alternative, `autoDeployTrigger: off` plus a `curl $RENDER_DEPLOY_HOOK` step at the end of CI, would need a `RENDER_DEPLOY_HOOK` repository secret.

> **The existing service was created by hand, not from this Blueprint.** Until it's linked, `render.yaml` changes nothing. It probably still auto-deploys **on every commit**. Do one of these:
> - **A (simplest):** Dashboard → service → **Settings → Build & Deploy → Auto-Deploy → "After CI Checks Pass"**, and check that Health Check Path is `/api/v1/health`.
> - **B:** Dashboard → **New → Blueprint**, connect the repo, branch `next-gen`. Render shows the diff against the service named `lfps-substitutions-manager`. Review it, then apply.

## 3. Environment

Set these in Dashboard → service → **Environment** (left pane), not under Settings.

| Name | Value | Secret? |
|---|---|---|
| `SHEETS_SPREADSHEET_ID` | `1ST9ThXZQ7PaRpl-n8ka3xulfN3X3u7awHkO6pErb6Ho` | No: an ID, not a key. Kept in `render.yaml` and docs, never in Go |
| `GOOGLE_APPLICATION_CREDENTIALS` | `/etc/secrets/sa.json` | No: a path |
| **Secret File** `sa.json` | the service-account JSON key | **Yes** |
| `SHEETS_PULL_INTERVAL` | `5m` (minimum `1m`) | No |
| `SHEETS_LOG` | `0` (set `1` to append a row to `App_Log` per write) | No |
| `SHEETS_HYDRATE_TIMEOUT` | optional; default `20s` (max `5m`). How long devices are held at start while `Subs` is reloaded (35a) | No |
| `SHEETS_FAKE_FILE` | **never set on Render.** Local tests only | — |
| `ALLOWED_ORIGINS` | optional; default `https://steph1420.github.io` plus local Vite | No |
| `APP_TZ` | optional; default `Asia/Kolkata` | No |
| `PORT` | set by Render | — |
| `DATA_DIR` | **remove it** if it's still set (the relay ignores it and logs that). Any old persistent disk can be detached | — |

**Secret File:** Environment → **Secret Files → + Add Secret File**. Filename: `sa.json`. Contents: paste the JSON key, then Save. Render mounts it read-only at `/etc/secrets/sa.json`. Never commit it, and never paste it into an env var, a chat or a ticket.

**To go relay-only on purpose** (for example while the Sheet setup is pending), delete `SHEETS_SPREADSHEET_ID` or the Secret File. The server logs the reason and `/health` reports `"mode":"relay-only"`.

## 4. Verify after a deploy

```sh
curl -s https://lfps-substitutions-manager.onrender.com/api/v1/health
# {"status":"healthy","version":"2.0.0-alpha.N",...,"timeZone":"Asia/Kolkata","mode":"sheets","store":"ready","sheets":"ok"}
curl -sI https://lfps-substitutions-manager.onrender.com/api/v1/health   # HEAD, for the pinger
```

| `mode` / `sheets` | Meaning |
|---|---|
| `relay-only` | No ID or no key file; see the log line `[Sheets] Relay-only mode: …` |
| `store: hydrating` | Just started: reloading the week's substitutions from `Subs`. Devices show Connecting… for up to `SHEETS_HYDRATE_TIMEOUT` (35a) |
| `sheets` / `starting` | Bridge is on; first pull not finished |
| `sheets` / `ok` | Last pull or write succeeded |
| `sheets` / `error` | Last call failed and is retried with backoff (≤ 5 min). Devices keep syncing. The usual cause is the Sheet not being shared with the service account (SHEETS_SETUP §2) |

In the app, the header pill reads **Live** (green). Settings → Cloud Synchronization & Health shows "N devices · Sheets linked" (or "Relay only").

## 5. Rollback

Dashboard → service → **Events/Deploys** → pick the last good deploy → **Rollback**. A rollback doesn't change the env vars. Devices keep their local copies, so nothing is lost. The previous relay (alpha.2) never answers HELLO, so alpha.3 clients stay at **Connecting…** and keep working from local data, queuing their edits, until the relay is upgraded again. Roll the web app back at the same time (the go-live runbook's rollback tag). The `Subs` tab keeps its schema-2 header; an alpha.2 relay doesn't use Sheets, and a later alpha.3 relay reads it as is.

## 6. Wire compatibility

- Bundle 35 removed the REST mutation routes (`POST /absence/toggle`, `/availability`, `/substitutions/assign`, `DELETE /substitutions`). Edits go over the WebSocket (`STATE_MUTATION`).
- The deployed alpha.2 web client never called those routes and ignores the new messages, so an old client against a new relay keeps working offline-first, without sync.
- **Client and relay go live together** (owner, 35a). The alpha.3 web client and relay speak the new protocol; an alpha.2 client against an alpha.3 relay doesn't sync, and an alpha.3 client against an alpha.2 relay stays Connecting…. Put the Secret File in place **before** the deploy. The order is in [`RELEASE_2.0.0-alpha.3.md`](./RELEASE_2.0.0-alpha.3.md).

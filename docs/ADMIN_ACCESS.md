# Admin Access (SEC-01 interim, Bundle 34)

> **This is not real security.** LFPS Substitutions Manager is a static site. The passcode
> check runs in the visitor's browser, and the passcode *hash* is compiled into the public
> JavaScript bundle. Anyone with DevTools can bypass the check, and a short passcode can be
> guessed offline from the hash. The gate exists to prevent **accidental** admin actions
> on a shared front-desk device. Real protection needs server-side authentication:
> **TODO SEC-02**.

## Who can do what

| Role | How you get it | Can do |
|---|---|---|
| **Front Desk** (`GUEST`) | Default. No login, ever. | Mark absences, availability, assign/remove substitutes, run Auto-Resolve, appoint Off. AC / Off. CT, release co-teachers, export Excel, all view/preferences. |
| **Teacher** (`TEACHER`) | Header → Staff Login → pick a name (identity only, no password). | Everything Front Desk can do, plus accept/dispute **their own** duties. |
| **Admin** (`ADMIN`) | Settings → Operating Identity → **Admin Access** → passcode. | Adds: routine (master timetable) edits by drag-and-drop, Limbo restore/clear, Reset Day, Purge History, Auto-Resolve Brain Studio policy changes, Developer Options (5-tap on the build info). |

- Choosing a teacher name never grants admin. Before 2.0.0-alpha.2, the app defaulted to admin
  and two names were admins with no credential at all.
- Admin-only actions are checked in the store as well as hidden in the UI (defence in depth;
  still client-side).
- The unlock lasts for **this browser tab** (sessionStorage). It survives a reload and ends
  when the tab closes, on **Lock**, on **Log Out**, or when the configured passcode changes.
- 5 wrong attempts trigger a 30-second cooldown.
- If no passcode is configured, admin unlock is unavailable. The Settings panel shows the
  setup steps. **All front-desk work keeps working.**

## Owner setup (one time)

No passcode ships with the app, and none was invented for you.

1. Pick a passcode of **at least 12 characters**. Because the hash is public, length is the
   only protection against offline guessing. Use a phrase, not a word.
2. Generate its hash from the repo root. Input is hidden, and the passcode is never written
   anywhere:
   ```bash
   npm run admin:hash
   ```
   It prints a 64-character hex string.
3. Put the hash in **`apps/web/.env.local`**. This file is git-ignored, so it never commits.
   Don't use the tracked `apps/web/.env`.
   ```
   VITE_ADMIN_PASSCODE_SHA256=<the 64-hex string>
   ```
4. Rebuild and redeploy the web app. The hash is baked in at **build** time:
   - Pages (deploy-from-branch, current setup): `npm run build`, then commit the regenerated
     root assets on the deploy branch (see `docs/WORKFLOW.md`).
   - CI build (planned, ARCH-05): store the hash as a repository **Actions variable/secret**
     named `VITE_ADMIN_PASSCODE_SHA256` and expose it to the build step.
5. Open the site, then go to Settings → Admin Access, enter the passcode and press Unlock.
   An "Admin" badge appears in the header.

## Lockout recovery

- **Forgot the passcode:** you can't recover it from the hash. Choose a new one, repeat
  steps 2–4, and redeploy. Every old session becomes invalid automatically.
- **"Too many attempts":** wait 30 seconds, or reload the tab.
- **Stuck in admin on a shared device:** go to Settings → Admin Access → Lock, or close the
  tab.
- **Disable admin entirely:** remove the variable and rebuild. The app keeps working in
  Front Desk mode.
- **Unlock shows "not configured" after deploy:** the build didn't see the variable. Check
  that the file is named exactly `apps/web/.env.local`, check the variable name, and confirm
  that the build ran from `apps/web` through the root scripts.
- Clearing site data (browser settings → this site) also ends the session. Warning: it also
  deletes the **unsynced day data saved on this device** (see SAS §Persistence).

## Roadmap

- **SEC-02 (server-side auth):** the relay (Render) should verify admin actions with a
  server-held secret or real accounts, so that a static bundle can't grant admin rights.
  This is needed once the relay writes to Google Sheets (Bundle 35+).

# Admin Access (SEC-01 interim, Bundle 34): 6-digit passcode

> **This is accident protection only, not security.** LFPS Substitutions Manager is a static
> site. The passcode check runs in the visitor's browser, and the passcode *hash* is compiled
> into the public JavaScript bundle. The passcode is **6 digits** (owner decision), so there
> are only 1,000,000 possible codes. **Anyone who copies the hash out of the bundle can
> recover the passcode offline in well under a second** on an ordinary laptop, and anyone
> with DevTools can skip the check entirely. Salting or slow hashing would not change this
> in a meaningful way, because the salt and the algorithm would ship in the same bundle.
> The lockout only slows guessing **through the app's own screen**. The gate exists to stop
> **accidental** admin actions on a shared front-desk device. Real protection needs
> server-side authentication: **TODO SEC-02**. Until then, treat the passcode as a "Are you
> sure you're the admin?" step, and don't reuse it anywhere else (not as a phone or bank PIN).

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
- Entry is a row of six dots with the numeric keypad on phones and tablets. It submits
  by itself on the sixth digit; a wrong code shakes the row and clears it. Digits are never
  shown on screen.
- **Lockout (per device, survives reloads and new tabs):** the first 4 wrong codes are
  free. The 5th triggers a **30 s** wait. After each wait you get one more try, and each
  further wrong code waits longer: **1 min, 5 min, 15 min, then 1 h** for every later miss.
  A correct code resets the count, and so does a day without wrong attempts. Input that
  isn't six digits is not counted. The count is stored in `localStorage` under
  `lfps_admin_lockout_v1` (counts and times only, no secret).
- If no passcode is configured, admin unlock is unavailable. The Settings panel shows the
  setup steps. **All front-desk work keeps working.**

## Owner setup (one time)

No passcode ships with the app, and none was invented for you.

1. Pick a **6-digit** passcode. Avoid codes that others at the school could guess (a date,
   a room or phone number). The script refuses codes that are one digit repeated, a
   straight ascending or descending run, or a short repeating pattern, unless you pass
   `--allow-weak`. None of this helps against offline recovery from the hash (see above);
   it only helps against a colleague guessing at the keypad.
2. Generate its hash from the repo root. Input is hidden and asked twice, and the passcode
   is never written anywhere:
   ```bash
   npm run admin:hash
   ```
   It prints a 64-character hex string. To script it without a prompt, pipe the code in;
   only the hash is printed:
   ```bash
   printf %s "$CODE" | node scripts/hash-admin-passcode.mjs > /tmp/hash.txt
   ```
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
5. Open the site, go to Settings → Admin Access, and type the six digits. It unlocks by
   itself, and an "Admin" badge appears in the header.

> **Current state (Job Bundle 34):** the owner supplied a 6-digit passcode out of band. Its
> hash was written to `apps/web/.env.local` on the build box (git-ignored, never committed,
> never printed). A local-only test (`configured owner passcode`, skipped elsewhere) confirms
> that the gate accepts it. A build from this checkout includes admin access; a fresh clone
> or CI build does not, until the variable is provided there too.

## Lockout recovery

- **Forgot the passcode:** you can't recover it from the hash. Choose a new one, repeat
  steps 2–4, and redeploy. Every old session becomes invalid automatically.
- **"Too many attempts":** wait for the time shown. A reload does **not** clear it. To
  clear it at once on that device, remove the `lfps_admin_lockout_v1` entry from site data
  (DevTools → Application → Local Storage). This does not touch the day's saved work.
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

# Admin Access (SEC-01 interim, Bundles 34 and 34a): admin hierarchy and 6-digit passcode

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

## Admin hierarchy (Bundle 34a, owner 2026-10-24)

The school's admins are the people who hold one of four offices. Logging in as one of them
asks for the admin passcode and turns on editing; everyone else is identified only.

| Office | Who | When |
|---|---|---|
| **Principal** | The "Principal" entry at the top of Staff Login (by designation; see below). A Staff Directory row with Role `Principal` is also recognised. | Always |
| **Academic Coordinator (AC)** | Directory role `… / Academic Coordinator` (today: Mrs. R. Pahwa) | Always |
| **Asst. Academic Coordinator (AAC)** | Directory role `… / Asst. Academic Coordinator` (today: Mrs. S. Lakra) | Always |
| **Officiating AC (Off. AC)** | Whoever is the manually appointed Off. AC **in force today** (LOGIC-04: the AC is away and this person was appointed for today's weekday) | Today only, in the school time zone |

- **Principal data:** neither the seed nor any tab of the owner's Google Sheet (Staff Directory
  included, checked read-only on 2026-10-24) names a Principal. The app therefore offers the
  office **by designation** ("Principal", no name), outside the teacher directory, so it never
  appears in the routine grid or the substitute pool. `StaffRole` now includes `'Principal'`:
  if the Staff Directory later lists the Principal with Role `Principal`, that person is the
  Principal login and the designation entry disappears.
- **Off. AC:** the office follows the existing appointment state (Roster → Off. AC). When the
  AC is back, the appointment is cleared, or the date changes, the Off. AC's admin access ends
  on the next change in the app; the store guards re-check on every admin action.
  When the AC is away and no one is appointed, the AAC acts as AC automatically (and is already
  an admin).
- Code: `@lfps/core` `adminOfficeFor()` (the hierarchy) and `apps/web/src/lib/access.ts`
  `resolveAccess()` (the one permission helper; see below).

## Who can do what

| Role | How you get it | Can do |
|---|---|---|
| **Front Desk** (`GUEST`) | Default. No login, ever. | Mark absences, availability, assign/remove substitutes, run Auto-Resolve, appoint Off. AC / Off. CT, release co-teachers, export Excel, all view/preferences. |
| **Teacher** (`TEACHER`) | Header → Staff Login → pick a name without an admin office (identity only, no password). | Everything Front Desk can do, plus accept/dispute **their own** duties. |
| **Admin** (`ADMIN`) | Staff Login → pick the Principal, AC, AAC or today's Off. AC (tagged "Admin" / "Off. AC today") → passcode. | Adds: routine (master timetable) edits by drag-and-drop, Limbo restore/clear, Reset Day, Purge History, Auto-Resolve policy changes. Developer Options uses a **separate** passcode (SEC-03). |

- **One place to sign in.** The keypad now appears inside Staff Login, after you pick an admin
  office. The separate Settings → Admin Access keypad from Bundle 34 is gone; that panel shows
  the current admin (or "Admin login", which opens Staff Login) and Log Out. Reason: one
  identity, one sign-in and one sign-out (Apple HIG: don't make people authenticate twice or
  in two places for the same thing). An unlocked "admin" with no identity no longer exists.
- Choosing a name without an admin office never grants admin. Choosing an admin office never
  logs you in without the passcode (Back returns to the list).
- Admin-only actions are checked in the store as well as hidden in the UI (defence in depth;
  still client-side). Both use `resolveAccess()`.
- The admin session belongs to **the identity that entered the passcode** and lasts for
  **this browser tab** (sessionStorage `lfps_admin_session_v2`, `{hash, identity}`). It
  survives a reload and ends when the tab closes, on **Log Out**, when you pick a different
  name, when the identity no longer holds an office today, or when the configured passcode
  changes. Sessions from before 34a (`lfps_admin_session_v1`) are ignored.
- Entry is a row of six dots with the numeric keypad on phones and tablets. It submits
  by itself on the sixth digit; a wrong code shakes the row and clears it. Digits are never
  shown on screen.
- **Lockout (per device, survives reloads and new tabs):** the first 4 wrong codes are
  free. The 5th triggers a **30 s** wait. After each wait you get one more try, and each
  further wrong code waits longer: **1 min, 5 min, 15 min, then 1 h** for every later miss.
  A correct code resets the count, and so does a day without wrong attempts. Input that
  isn't six digits is not counted. The count is stored in `localStorage` under
  `lfps_admin_lockout_v1` (counts and times only, no secret).
- If no passcode is configured, admin login is unavailable. Staff Login and the Settings panel
  show the setup steps. **All front-desk work keeps working.**

## Developer Options passcode (SEC-03, Bundle 38b)

Developer Options is **not** tied to admin login. It has its own 6-digit passcode and its own
build-time hash (`VITE_DEV_PASSCODE_SHA256`). The same interim caveats apply: the hash ships in
the public bundle and can be recovered offline; this only slows accidental opens on a shared
device.

1. Settings → tap Build Info **5 times** (discovery only).
2. Enter the **Developer Options** passcode on the keypad (not the admin code).
3. Wrong attempts use the same escalating lockout schedule as admin, stored separately in
   `localStorage` under `lfps_dev_lockout_v1`.
4. A correct code starts a **tab-scoped** session (`sessionStorage` `lfps_dev_session_v1`) and
   opens the console. Closing the tab ends the session. Hiding the console also ends it.
5. Within the same tab, 5-tap again reopens without re-entry while the session lasts.

The Dev passcode **must differ** from the admin passcode. `npm run admin:hash -- --dev` refuses
a match against `VITE_ADMIN_PASSCODE_SHA256` (env or `apps/web/.env.local`), and the client
disables Dev unlock if both hashes are equal.

Front Desk day work (absences, subs, Auto-Resolve, exports) never needs this code.

### Owner setup (Dev Options)

```bash
npm run admin:hash -- --dev
# → put VITE_DEV_PASSCODE_SHA256=<hex> in apps/web/.env.local
# → also add repository Actions secret VITE_DEV_PASSCODE_SHA256 (Pages builds)
```

Rebuild the web app after changing the hash (same as admin).

## Dev Options → "Edit without login" (Bundle 34a / SEC-03)

A switch in the Developer & Diagnostics Console (Settings → 5-tap Build Info → Dev passcode)
that allows every admin-gated action **on this device** with nobody logged in. Turning the
switch **on** requires an unlocked Dev Options session (or an admin session). Turning it **off**
never needs a login.

- **Device-local:** stored in `localStorage` (`lfps_dev_editing_unlocked_v1` = `1`). It is
  never part of the saved day state or anything synced to other devices or the relay.
- **Visible:** while it is on and no admin is signed in, the header shows an amber
  **Editing unlocked** badge, and Settings → Admin Access shows "Editing unlocked on this
  device" with **Turn off** (no login needed to turn it off).
- **One helper:** `resolveAccess()` gives `canEdit = admin session OR override`; every gate
  (`usePermissions`, `PermissionGuard requireAdmin`, the store guards, Developer Options)
  uses `canEdit`.
- **Risks:** anyone who picks up that device can edit the routine, reset a day, purge undo
  history and change the solver policy, with no record of who did it. It also survives
  reloads and closing the browser. Use it only on a personal or test device, and turn it off
  afterwards. Clearing site data turns it off. Because it is client-side, it changes nothing
  about the security picture above (anyone with DevTools could already do this).


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
   - CI / Pages (ARCH-05 / Bundle 36): store `VITE_ADMIN_PASSCODE_SHA256` (and for SEC-03,
     `VITE_DEV_PASSCODE_SHA256`) as repository **Actions secrets** and expose them to the
     pages build. See `docs/PAGES_SETUP.md`.
5. Open the site, open Staff Login, pick an admin office (e.g. Principal) and type the six
   digits. It signs in by itself, and an "Admin" badge appears in the header.

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
- **Stuck in admin on a shared device:** Log Out (Staff Login or Settings → Admin Access), or
  close the tab. If the amber "Editing unlocked" badge shows, Settings → Admin Access →
  Turn off.
- **Disable admin entirely:** remove the variable and rebuild. The app keeps working in
  Front Desk mode.
- **Admin login shows "not configured" after deploy:** the build didn't see the variable. Check
  that the file is named exactly `apps/web/.env.local`, check the variable name, and confirm
  that the build ran from `apps/web` through the root scripts.
- Clearing site data (browser settings → this site) also ends the session. Warning: it also
  deletes the **unsynced day data saved on this device** (see SAS §Persistence).

## Roadmap

- **SEC-02 (design in Bundle 38b):** server-side admin auth for privileged mutations. See
  [`SEC_02_SERVER_AUTH.md`](./SEC_02_SERVER_AUTH.md). Front Desk substitution sync stays open.
- **SEC-03 (Bundle 38b):** separate Developer Options passcode — shipped above.
- **Per-admin passcodes (design spike):** privileges from **role**; later not all admins share
  one code. See [`PER_ADMIN_ACCESS.md`](./PER_ADMIN_ACCESS.md).
- **FEAT-67 (unlocked after SEC-03):** Developer Options controls for the lockout penalty
  (still deferred; can be scheduled now that Dev has its own gate).
- **FEAT-68 (Bundle 34a):** the admin hierarchy and the editing override described above.

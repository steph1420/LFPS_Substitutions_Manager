# Per-admin passcodes & role privileges (design spike, Bundle 38b)

> Status: **design only**. No multi-hash bake-in in this bundle.

## Owner intent

- Privileges stem from **role / office**, not from knowing a shared passcode.
- Later, not all admins share the same password.
- Dev Options stays on its **own** passcode (SEC-03) — not an admin requirement.

## Identity → capability (target)

Offices today (FEAT-68): Principal, AC, AAC, Off. AC (day-scoped).

| Capability | Front Desk | Teacher | Off. AC (today) | AAC | AC | Principal | Dev session |
|---|---|---|---|---|---|---|---|
| Mark absences / availability / assign subs / Auto-Resolve / export | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| Accept/dispute **own** duties | — | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| Routine drag-edit / Limbo / Reset Day / Purge / solver policy | — | — | ✓* | ✓* | ✓* | ✓* | via Edit-without-login |
| Appoint Off. AC / Off. CT | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| Open Developer Options | — | — | — | — | — | — | ✓ (own passcode) |

\* After SEC-02, these are the admin-privileged server mutations (`sched` / `limbo`).

## Future secret models (pick later)

1. **Per-office client hashes** — `VITE_ADMIN_PASSCODE_SHA256_AC`, etc. Still brute-forceable
   offline; only splits accident domains. Rejected as a long-term answer.
2. **Server-side accounts** (preferred with SEC-02) — each office (or person) has a credential
   verified by the relay; token claims carry `office` / `identity`. Pages bundle holds no
   admin hashes.
3. **School Google accounts** restricted to a group — strongest for real people; needs SSO
   work and offline Front Desk story.

Recommendation: implement SEC-02 with a **single** server secret first, then add per-identity
credentials on the relay without growing the client bundle.

## Non-goals for this spike

- Baking multiple hashes into Vite
- Changing FEAT-68 office detection
- Wiring Dev Options to admin roles

# Stage 1 preview: TODO

## Done
- Step 1a: Routine from the temp Sheet (desktop by class, phone M04 by teacher), sync mark, read-only bridge (`65e4a5d`).
- Assembly column hidden (Teacher-S t86u, `178da8a`).
- 2nd G. Hr. shown as a thin blank band like Break (t88u, `67f0d9c`).
- Device pairing (t69u): Sheet menu LFPS › Pair a device (QR + 6-digit code, 5 min, single use, 5 tries), Paired devices (Remove), Remove all devices; preview "Pair this device" (auto-focus numeric code box, auto-submit), revoked/expired → back to Enter code, Hold to unpair. Connect link superseded.
- Sync tick only when the data changed; slim names drop Mrs./Ms./Mr./Dr. etc.; "2nd G. Hr." on one line (t69u).

- Step 1b (t77u): mark absent (whole day / periods), drag-and-drop assign (touch long-press + mouse), tap-to-assign sheet ranked by best fit, move / swap / remove, conflicts blocked (client + bridge), Undo toasts, Substitutions tab, Mark all present, before/after compare, bridge write action into its own S1_ tabs (op log, tombstones, Lamport order). Pair dialog stays open after a pair and shows a fresh code (Q-45-03); Remove device acts at once with Undo (Q-45-04).

## Next
- [ ] Teacher-S: update the bridge for 1b (README › Bridge update: paste Code.gs, Manage deployments › Edit › New version). Saving to the real Sheet (S1_ tabs, POST from the phone) is not verified yet; only the local fake bridge.
- [ ] Settings: best-fit order (Q-44-02 says configurable), and where Unpair lives.
- [ ] Step 1c: one notice per absent teacher (school format); export PDF, WhatsApp image (never signatures), Print, Excel/CSV; "Include signatures" toggle, default OFF.
- [ ] Summer / Winter dates (times are final; dates not in any source yet).

## Decisions pending (Teacher-S)
- PROPOSED: "last seen" saved at most every 15 minutes; device label from the browser ("iPhone · Safari").
- PROPOSED: titles dropped in slim names: Mrs, Ms, Mr, Miss, Mx, Dr, Prof, Sr, Fr, Br (with or without a dot).
- PROPOSED: the device keeps the Sheet's web-app address (from the first QR) so later codes can be typed; the address is not built into the public preview.
- PROPOSED: Unpair sits at the bottom of the routine until Stage 1 has a Settings screen (Q-HARM-5 "Account & Pairing").

- PROPOSED (1b): rose `--dl-color-absent` stays PROPOSED; amber = Need sub only (Q-44-01).
- PROPOSED (1b): weekday dates = this IST week; on Sat/Sun the picker shows next week.
- PROPOSED (1b): a duty is "period + absent teacher" (a combined group counts once); an absent teacher's own covers in their absent periods are cleared automatically.
- PROPOSED (1b): drag starts after an 80 ms hold (touch) or 4 px of movement (mouse); a refused drop glides back in `--dl-dur-calm` (320 ms) with `--dl-ease-settle` — the kit has no 300 ms spring token.
- PROPOSED (1b): "knows the class/subject" = class teacher of that class, or teaches that class/subject the same day.
- PROPOSED (1b): Before/after: hold = peek, a tap under 250 ms = stays on with "Original · tap to exit".
- PROPOSED (1b): the bridge keeps only the last 21 days of changes in what it sends to devices (the S1_Ops tab keeps everything).

## Decisions recorded
- Pairing follows Q-HARM-9 (LOCKED): salted SHA-256 code, 5 min, 5 tries, single use, under lock; per-device random key ≥ 32 bytes, hash only; random device ID (IndexedDB + localStorage); 90-day idle expiry; host screen resets when the code is used; QR option.
- Sync tick only when something changed; drop "Mrs./Ms." in slim names; "2nd G. Hr." on one line (all t69u, approving Lippy's recommendations).
- Games / Eng. Rec. swap no longer applies. The routine shows what is written. Golden Hour staffing currently follows the Parents' Day practice schedule (background only, not shown). (t91u)
- Drill combined like Games; GH2 blank on purpose; no reporting/bus/home times; no Live icon (cloud with slash when offline).

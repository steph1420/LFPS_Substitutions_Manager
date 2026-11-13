# Stage 1 preview: TODO

## Done
- Step 1a: Routine from the temp Sheet (desktop by class, phone M04 by teacher), sync mark, read-only bridge (`65e4a5d`).
- Assembly column hidden (Teacher-S t86u, `178da8a`).
- 2nd G. Hr. shown as a thin blank band like Break (t88u, `67f0d9c`).
- Device pairing (t69u): Sheet menu LFPS › Pair a device (QR + 6-digit code, 5 min, single use, 5 tries), Paired devices (Remove), Remove all devices; preview "Pair this device" (auto-focus numeric code box, auto-submit), revoked/expired → back to Enter code, Hold to unpair. Connect link superseded.
- Sync tick only when the data changed; slim names drop Mrs./Ms./Mr./Dr. etc.; "2nd G. Hr." on one line (t69u).

## Next
- [ ] Teacher-S: set up / update the bridge in the temp Sheet (README › Bridge setup) and pair a phone. The real Apps Script deployment is not verified yet.
- [ ] Step 1b: mark absent (rose `--dl-color-absent`), assign a sub (bottom sheet), tap-to-peek, uncovered list, Substitutions list, hold/drag before-after icon (chip "Original · tap to exit"), bridge write action.
- [ ] Step 1c: one notice per absent teacher (school format); export PDF, WhatsApp image (never signatures), Print, Excel/CSV; "Include signatures" toggle, default OFF.
- [ ] Summer / Winter dates (times are final; dates not in any source yet).

## Decisions pending (Teacher-S)
- PROPOSED: "last seen" saved at most every 15 minutes; device label from the browser ("iPhone · Safari").
- PROPOSED: titles dropped in slim names: Mrs, Ms, Mr, Miss, Mx, Dr, Prof, Sr, Fr, Br (with or without a dot).
- PROPOSED: the device keeps the Sheet's web-app address (from the first QR) so later codes can be typed; the address is not built into the public preview.
- PROPOSED: Unpair sits at the bottom of the routine until Stage 1 has a Settings screen (Q-HARM-5 "Account & Pairing").

## Decisions recorded
- Pairing follows Q-HARM-9 (LOCKED): salted SHA-256 code, 5 min, 5 tries, single use, under lock; per-device random key ≥ 32 bytes, hash only; random device ID (IndexedDB + localStorage); 90-day idle expiry; host screen resets when the code is used; QR option.
- Sync tick only when something changed; drop "Mrs./Ms." in slim names; "2nd G. Hr." on one line (all t69u, approving Lippy's recommendations).
- Games / Eng. Rec. swap no longer applies. The routine shows what is written. Golden Hour staffing currently follows the Parents' Day practice schedule (background only, not shown). (t91u)
- Drill combined like Games; GH2 blank on purpose; no reporting/bus/home times; no Live icon (cloud with slash when offline).

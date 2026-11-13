# Stage 1 preview (separate from the live app)

A small, separate preview of the Stage 1 screens. It never touches the live site, `next-gen`, or the live relay.

- **Where it runs:** its own GitHub Pages site (`steph1420/lfps-subs-preview`), built from `stage1/` on branch `stage1-preview`.
- **Data:** read at runtime from the Stage 1 temp Sheet through `bridge/Code.gs` (an Apps Script web app bound to that Sheet). Timetable data is read-only. Nothing personal is in this repo or the build.
- **Devices pair with a code** (Q-HARM-9). The old `connectLink()` link is **superseded** (2026-11-13): it was removed, and old links no longer open any data.

## How pairing works
1. In the Sheet: **LFPS › Pair a device**. A dialog shows a QR code and a 6-digit code. The code works **once**, for **5 minutes**; **5 wrong tries** use it up. When a device pairs, the code and QR disappear at once (the dialog says "Paired: iPhone · Safari ✓").
2. On the device: scan the QR (it opens the preview with the code filled in and pairs by itself), or open the preview and type the code. The code box opens the number keypad and sends by itself at the 6th digit.
   - A device that has never seen the Sheet needs the QR (or the "No camera?" link under it) once, because that carries the Sheet's web-app address. After that, typing a code is enough.
3. The device gets its own long random key (48 bytes). The Sheet keeps only a hash of it, plus the device's random ID, a label ("iPhone · Safari"), when it paired and when it was last seen.
4. **LFPS › Paired devices** lists them, each with **Remove**. A removed device shows "This device was removed in the school Sheet" at its next refresh, its copy of the routine is wiped, and it goes back to "Pair this device".
5. **LFPS › Remove all devices…** is the emergency switch: every device stops at its next refresh.
6. On the device, **Hold to unpair this device** (bottom of the routine) does the same for that one device.
7. A device that isn't used for 90 days has to pair again.

The QR picture is made inside Apps Script (`bridge/Qr.gs`, the MIT `qrcode-generator` library, vendored unchanged), so no outside QR service ever sees a code or the Sheet's address.

## Bridge setup (first time) — for Teacher-S
1. Open the **temp** Sheet (never the live one) → **Extensions › Apps Script**.
2. In `Code.gs`, delete everything and paste the whole of `stage1/bridge/Code.gs`. Save.
3. Click **+ › Script**, name it `Qr`, delete what's inside, paste the whole of `stage1/bridge/Qr.gs`. Save.
4. Choose `setUp` in the function list and click **Run**. Allow the permissions it asks for (it reads this Sheet and shows dialogs). The log says "Ready".
5. **Deploy › New deployment** → type **Web app** → Execute as: **Me** · Who has access: **Anyone** → **Deploy**.
6. Go back to the Sheet and reload the page. A new **LFPS** menu appears (it can take a few seconds).
7. **LFPS › Pair a device**, then scan the QR with the phone. The phone should show the routine within a few seconds.

## Bridge update (it is already deployed, e.g. with the old connect link)
1. Do steps 1–3 above (replace `Code.gs`, add `Qr`).
2. Run `setUp` once. This retires the old connect link's key, so old links stop working.
3. **Deploy › Manage deployments** → select the existing Web app → ✏️ **Edit** → Version: **New version** → **Deploy**. Keep the same deployment, so the web-app address stays the same. (Don't make a *new* deployment: that changes the address.)
4. Reload the Sheet → **LFPS › Pair a device** on each phone/computer.

**If pairing says it can't reach the Sheet:** in Apps Script, **Project Settings › Script Properties**, add `BRIDGE_URL` = the Web app URL from Manage deployments (ends in `/exec`), then make a new code.

## Step 1a
Routine view from the Sheet: desktop (one row per class) and phone (M04 layout: one row per teacher, name column slims to sideways names when you scroll across; the slim names drop titles like Mrs./Ms./Mr./Dr.). Day picker Mon–Fri. Regular timings. GH2 blank on purpose, "2nd G. Hr." heading on one line. Combined Games/Drill shown as "KG A + B" / "PREP A + B". Status: nothing when online, cloud with a slash when offline, a short tick only when the Sheet's data really changed (quiet refreshes show nothing).

Driftline: `src/dl-tokens.css`, `src/dl-kit.css`, `src/dl-tokens.ts` and `src/dl-haptics.ts` are copied from the kit (v0.3.0). `src/HoldToConfirm.tsx` is a port of the kit's HoldToConfirm without framer-motion (version note in the file). `src/dl-proposed.css` adds the PROPOSED `--dl-color-absent` (#e39aa4) for Absent. The Sheet dialogs carry a copy of the Driftline tokens they use (utopian-night), since they can't load the app's CSS.

## Build and check
```sh
cd stage1 && npm ci && npm test && npm run build   # → stage1/dist
```
`npm test` runs the bridge logic (the real `Code.gs` + `Qr.gs` in a sandbox, including decoding the QR) and the client helpers.

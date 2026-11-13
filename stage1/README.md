# Stage 1 preview (separate from the live app)

A small, separate preview of the Stage 1 screens. It never touches the live site, `next-gen`, or the live relay.

- **Where it runs:** its own GitHub Pages site (`steph1420/lfps-subs-preview`), built from `stage1/` on branch `stage1-preview`.
- **Data:** read at runtime from the Stage 1 temp Sheet through `bridge/Code.gs` (an Apps Script web app bound to that Sheet, read-only, key-protected). Nothing personal is in this repo or the build.
- **Connecting a device:** open the link that `connectLink()` logs in the Sheet's Apps Script, once per device.

## Step 1a (this commit)
Routine view from the Sheet: desktop (one row per class) and phone (M04 layout: one row per teacher, name column slims to sideways names when you scroll across). Day picker Mon–Fri. Regular timings. GH2 blank on purpose. Combined Games/Drill shown as "KG A + B" / "PREP A + B". Status: nothing when online, cloud with a slash when offline, a short ring → tick on each sync (the SOW v0.45 auto-save pattern in Driftline tokens).

Driftline: `src/dl-tokens.css` and `src/dl-kit.css` are copied unchanged from the kit (v0.3.0). `src/dl-proposed.css` adds the PROPOSED `--dl-color-absent` (#e39aa4) for Absent.

## Build and check
```sh
cd stage1 && npm ci && npm run build   # → stage1/dist
```

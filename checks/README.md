# checks/ — shared code checks (copied from agent-common)
Copied unchanged from `steph1420/agent-common` `checks/` at commit `ab6431f` (includes Kiwi's `88c9672`) in Bundle 47a, 16 Nov 2026. Do not edit these copies here; change them in agent-common and copy again.

| Check | Where | Run | Mode in LFPS (47a) |
| --- | --- | --- | --- |
| Leak scan | `checks/leak-scan.mjs` | `npm run check:leaks` (set `LEAK_NAMES_FILE` to a names list outside the repo) | Wired. Pre-existing findings at 47a: 78 in `apps/server/go.sum` (lockfile hashes) + 7 lines holding the live Sheet ID / legacy Apps Script URL (docs, `render.yaml`, `legacy-v1/`). Moving them out needs Steve's go (see TODO). Nothing new may be added. |
| Build output | `checks/check-build-output.mjs` | `npm run check:build-output` | Wired, passes. |
| Exact pins | `checks/check-pins.mjs` | `npm run check:pins` | Wired. framer-motion and the new lint tools are exact; the other ranges and the workspace `*` links are listed in TODO for a later no-op pin step with Steve's go. |
| ESLint | `apps/web/eslint.config.mjs` | `npm run lint` | Baseline (warn) mode: `apps/web/checks-baseline/eslint.json`; only new violations fail. |
| stylelint | `apps/web/stylelint.config.mjs` | `npm run lint` (`lint:css`) | Baseline (warn) mode: `apps/web/checks-baseline/stylelint.json`. Token files (`src/tokens/`) are exempt; every `*.module.css` must stay at zero. |
| Pre-push hook | `checks/hooks/pre-push` | not installed | Copied for reference only. Install per clone with `git config core.hooksPath checks/hooks` only if Steve asks. |

The baseline may only shrink (`baseline.mjs --update` refuses a bigger one).

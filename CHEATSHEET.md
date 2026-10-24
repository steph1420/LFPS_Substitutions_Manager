# Stretching Grok Build quota without losing quality

**The rule:** these tips only cut waste (repeated context, rework, idle history). They never reduce the model's capability, reasoning or diligence.

**Applies to:** Grok Build CLI and AFK Pilot (the VS Code extension runs the same CLI underneath). Commands checked against docs.x.ai/build on 2026-10-24.

## Tips

- **`/compact` long sessions at a natural break.** First write the key decisions into the docs / `HANDOVER.md`, then compact (optionally `/compact <what to keep>`).
  *Why:* trims old history the model would otherwise re-read every turn, while the decisions stay safe in files. Grok also auto-compacts at 85% of the context window.
- **Check `/context` before deciding.**
  *Why:* you compact only when it's actually needed, not by habit.
- **Use plan mode for bigger changes** (`/plan <description>` or `Shift+Tab`; approve with `a`, request changes with `s`).
  *Why:* agreeing the approach before any edit avoids rework and back-and-forth. It's the job-bundle "plan first" rule, built in.
- **One session at a time**, not several in parallel (`/sessions` shows and closes them).
  *Why:* each session carries its own history and re-reads the project. One focused session does the same work once.
- **Start fresh sessions with a short, focused prompt** (`/new`), not pasted walls of context.
  *Why:* the model reads what it needs from the repo; pasted text is paid for on every turn.
- **Lean on `AGENTS.md`, `HANDOVER.md` and `docs/README.md`.**
  - Grok reads `AGENTS.md` automatically (from the folder you're in up to the repo root).
  - Point at files with `@file` (e.g. `@HANDOVER.md`, or `@` chips in AFK Pilot) instead of pasting them.

  *Why:* the project context is already written down, so the model doesn't re-derive it.
- **Keep `HANDOVER.md` current when you pause** (done / next / open issues / branch + commit).
  *Why:* the next session starts warm from one file instead of re-exploring the repo.
- **Read what the task touches, not whole logs.** Read the code, docs, bugs and ADRs for the area fully; for a CHANGELOG line or new ID, open only the top or grep for the last ID.
  *Why:* saves rereading bookkeeping files, while the model still reads everything relevant (see `AGENTS.md` → Reading).
- **Ask for targeted changes** ("fix `parseKey` in `apps/web/src/sync/entities.ts`"), not broad rewrites.
  *Why:* a narrow ask reads and changes less, and is easier to test and review. Same diligence, smaller scope.
- **Close sessions when done** (`/quit`, or close them in `/sessions`) rather than leaving long histories idle.
  *Why:* a resumed bloated session drags its whole history into the next turn. Start the next task with `/new`.

## Not on this list, on purpose

No lowering reasoning effort (`/effort`), no smaller or cheaper model, no skipping tests or backups, no cutting diligence. Quality is not where the quota goes.

*Sources:* docs.x.ai/build/modes-and-commands (`/compact`, `/context`, `/plan`, `/sessions`, `/new`, `/quit`), docs.x.ai/build/features/plan-mode, docs.x.ai/build/features/skills-plugins-marketplaces (AGENTS.md), docs.x.ai/build/overview (`@file`), the grok-build slash-command guide (auto-compact at 85%), and productcompass.pm/p/grok-build-vscode (AFK Pilot: `/compact`, Plan Mode, `@file` chips).

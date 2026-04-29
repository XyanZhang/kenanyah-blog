---
name: project-loop-env
description: Create and maintain a repeatable loop environment for long-running Codex tasks in this repo. Use when the user wants a repo-aware working loop with mission, backlog, journal, state tracking, or handoff artifacts.
---

# Project Loop Env

Use this skill when work in this repository will happen across multiple rounds and we need stable artifacts instead of relying on chat memory.

## Preferred CLI

Use the repo-level `loop` command first. Run commands from the repo root:

```bash
pnpm loop -- init --name "feature-name" --goal "short mission"
```

This creates a loop workspace under `.codex-runtime/loop-env/<slug>/` with:

- `mission.md` for the goal and constraints
- `backlog.md` for next tasks
- `journal.md` for progress notes
- `handoff.md` for the next Codex session
- `state.json` for machine-readable status

## During the loop

After a meaningful step, write a structured tick:

```bash
pnpm loop -- tick --name "feature-name" --summary "what changed" --next "next step"
```

Use `--status blocked` when work cannot continue.

## Useful commands

```bash
pnpm loop -- status --name "feature-name"
pnpm loop -- next --name "feature-name"
pnpm loop -- handoff --name "feature-name"
pnpm loop -- list
```

## Guidance

- Keep one loop per mission, not per small task.
- Put decisions in `journal.md` so future sessions can see why something changed.
- Update `handoff.md` when you stop with unfinished work.
- At the start of a resumed session, read `handoff.md`, then use `next` to choose the next concrete task.
- Prefer this skill when the user asks for an ongoing workflow, execution loop, or reusable task environment for this repository.

## Legacy scripts

The old scripts in `.codex/skills/loop-env/scripts/` are kept as migration references. Prefer the `task-loop` CLI unless the workspace package is unavailable.

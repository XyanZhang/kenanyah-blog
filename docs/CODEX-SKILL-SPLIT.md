# Codex Skill Layout

This repo now keeps only project-local Codex assets.

## Project layer

Stored in `.codex/skills/`.

- `project-loop-env`
- `project-skill-test-harness`
- `project-tui-orchestrator`

Use this layer when prompts, scripts, or workflow should stay repo-aware.

## Global layer

Global skills and tools are no longer versioned in this repository.

Maintain them manually in your Codex home:

- `~/.codex/skills/`
- `~/.codex/tools/`
- `~/.agents/skills/` when a third-party installer uses that location

## Runtime data

Runtime output should stay in the active repository:

- `.codex-runtime/loop-env/`
- `.codex-runtime/skill-tests/`
- `.codex-runtime/orchestrator/`
- `.codex-runtime/observability/`

## Why this layout exists

- Project skills can encode local rules without affecting other repos.
- Global capabilities are maintained separately from project version control.
- Runtime state remains local to the repo where work is happening.

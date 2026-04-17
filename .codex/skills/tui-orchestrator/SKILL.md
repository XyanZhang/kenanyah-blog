---
name: project-tui-orchestrator
description: Coordinate other Codex TUI sessions for this repo through task bundles, ownership rules, and status summaries. Use when the user wants one Codex flow to direct parallel TUI workers on this project without overlapping write scopes.
---

# Project TUI Orchestrator

Use this skill when one Codex session should plan work for other Codex TUI sessions working on this repository.

## Create a dispatch bundle

```bash
node .codex/skills/tui-orchestrator/scripts/create-tui-dispatch.js --mission "ship feature" --workers 3 --tasks "inspect api|build ui|write tests"
```

This creates a run folder under `.codex-runtime/orchestrator/runs/` with:

- `run.json` for top-level mission data
- `tasks/task-XX.md` for each worker prompt
- `status/worker-XX.json` for progress updates

## Summarize a run

```bash
node .codex/skills/tui-orchestrator/scripts/summarize-dispatch.js .codex-runtime/orchestrator/runs/<run-id>
```

## Guidance

- Give each worker a disjoint write scope.
- Put the source of truth in the run bundle, not only in chat.
- Use the summary script before integrating results.
- If workers discover overlap or hidden risk, pause and re-split the tasks.

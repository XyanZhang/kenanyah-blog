---
name: project-skill-test-harness
description: Generate test cases for Codex skills in this repo and run the checks. Use when creating or updating project skills and you want repeatable validation for frontmatter, linked files, scripts, and basic workflow quality.
---

# Project Skill Test Harness

Use this skill after creating or updating a project skill in this repository.

## Generate tests

Create a default test manifest from a skill folder:

```bash
node .codex/skills/skill-test-harness/scripts/generate-skill-tests.js .codex/skills/my-skill
```

The manifest is written to `.codex-runtime/skill-tests/<skill-name>/cases.json`.

## Run tests

```bash
node .codex/skills/skill-test-harness/scripts/run-skill-tests.js .codex/skills/my-skill
```

## What is checked

- required frontmatter fields
- non-empty instructions
- linked local files exist
- referenced script files exist
- optional glob checks from the manifest

## Guidance

- Generate tests once after creating a skill.
- Re-run tests after any edit to `SKILL.md` or bundled resources.
- Keep the manifest small and focused on failure modes that matter.

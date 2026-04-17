#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const part = argv[i];
    if (!part.startsWith("--")) continue;
    const key = part.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      args[key] = true;
      continue;
    }
    args[key] = next;
    i += 1;
  }
  return args;
}

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function writeFileIfMissing(filePath, content, force) {
  if (!force && fs.existsSync(filePath)) return;
  fs.writeFileSync(filePath, content, "utf8");
}

const args = parseArgs(process.argv.slice(2));
const name = args.name || args.n;
const goal = args.goal || "";
const owner = args.owner || "codex";
const force = Boolean(args.force);

if (!name) {
  console.error("Missing required argument: --name");
  process.exit(1);
}

const root = process.env.INIT_CWD || process.cwd();
const slug = slugify(name);
const loopDir = path.join(root, ".codex-runtime", "loop-env", slug);

fs.mkdirSync(loopDir, { recursive: true });
fs.mkdirSync(path.join(loopDir, "artifacts"), { recursive: true });

const now = new Date().toISOString();

writeFileIfMissing(
  path.join(loopDir, "mission.md"),
  `# ${name}

## Goal

${goal || "Describe the mission here."}

## Constraints

- Keep changes aligned with the repo conventions.
- Record decisions in the journal.
- Update handoff before stopping.
`,
  force,
);

writeFileIfMissing(
  path.join(loopDir, "backlog.md"),
  `# Backlog

- [ ] Confirm scope
- [ ] Inspect current code and constraints
- [ ] Implement the next smallest useful step
- [ ] Verify with tests or checks
- [ ] Prepare handoff
`,
  force,
);

writeFileIfMissing(
  path.join(loopDir, "journal.md"),
  `# Journal

## ${now}

- Loop created by ${owner}
- Initial goal: ${goal || "Not provided"}
`,
  force,
);

writeFileIfMissing(
  path.join(loopDir, "handoff.md"),
  `# Handoff

## Current status

Not started.

## Next step

Inspect the codebase and update backlog priorities.

## Risks

- Unknown until first inspection pass
`,
  force,
);

writeFileIfMissing(
  path.join(loopDir, "state.json"),
  JSON.stringify(
    {
      name,
      slug,
      owner,
      goal,
      status: "active",
      lastUpdatedAt: now,
      nextStep: "Inspect the codebase and update backlog priorities.",
    },
    null,
    2,
  ) + "\n",
  force,
);

console.log(`Loop environment ready: ${loopDir}`);

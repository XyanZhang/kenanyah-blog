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

const args = parseArgs(process.argv.slice(2));
const name = args.name;
const summary = args.summary || "Progress recorded.";
const nextStep = args.next || "Decide the next concrete step.";
const status = args.status || "active";

if (!name) {
  console.error("Missing required argument: --name");
  process.exit(1);
}

const root = process.env.INIT_CWD || process.cwd();
const slug = slugify(name);
const loopDir = path.join(root, ".codex-runtime", "loop-env", slug);
const statePath = path.join(loopDir, "state.json");
const journalPath = path.join(loopDir, "journal.md");
const handoffPath = path.join(loopDir, "handoff.md");

if (!fs.existsSync(statePath)) {
  console.error(`Loop environment not found: ${loopDir}`);
  process.exit(1);
}

const now = new Date().toISOString();
const state = JSON.parse(fs.readFileSync(statePath, "utf8"));
state.status = status;
state.lastUpdatedAt = now;
state.nextStep = nextStep;
fs.writeFileSync(statePath, JSON.stringify(state, null, 2) + "\n", "utf8");

fs.appendFileSync(
  journalPath,
  `
## ${now}

- Status: ${status}
- Summary: ${summary}
- Next: ${nextStep}
`,
  "utf8",
);

fs.writeFileSync(
  handoffPath,
  `# Handoff

## Current status

${summary}

## Next step

${nextStep}

## Risks

- Update this section if something is blocked or uncertain.
`,
  "utf8",
);

console.log(`Loop tick recorded: ${loopDir}`);

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
const mission = args.mission;
const tasks = (args.tasks || "")
  .split("|")
  .map((item) => item.trim())
  .filter(Boolean);
const workers = Number(args.workers || tasks.length || 1);

if (!mission) {
  console.error("Missing required argument: --mission");
  process.exit(1);
}

const now = new Date();
const runId = `${now.toISOString().replace(/[:.]/g, "-")}-${slugify(mission).slice(0, 40)}`;
const root = process.env.INIT_CWD || process.cwd();
const runDir = path.join(root, ".codex-runtime", "orchestrator", "runs", runId);

fs.mkdirSync(path.join(runDir, "tasks"), { recursive: true });
fs.mkdirSync(path.join(runDir, "status"), { recursive: true });

const normalizedTasks =
  tasks.length > 0
    ? tasks
    : Array.from({ length: workers }, (_, index) => `Worker ${index + 1} task not defined yet`);

fs.writeFileSync(
  path.join(runDir, "run.json"),
  JSON.stringify(
    {
      runId,
      mission,
      workers,
      createdAt: now.toISOString(),
      rules: [
        "Do not overlap file ownership unless the lead reassigns it.",
        "Do not revert other workers' edits.",
        "Escalate blockers instead of guessing when risk is high.",
      ],
    },
    null,
    2,
  ) + "\n",
  "utf8",
);

normalizedTasks.forEach((task, index) => {
  const number = String(index + 1).padStart(2, "0");
  fs.writeFileSync(
    path.join(runDir, "tasks", `task-${number}.md`),
    `# Worker ${index + 1}

## Mission

${mission}

## Assigned task

${task}

## Rules

- Own only your assigned scope.
- Leave notes about decisions and blockers.
- Do not revert edits made by others.
`,
    "utf8",
  );

  fs.writeFileSync(
    path.join(runDir, "status", `worker-${number}.json`),
    JSON.stringify(
      {
        worker: index + 1,
        task,
        status: "pending",
        lastUpdatedAt: now.toISOString(),
        notes: "",
      },
      null,
      2,
    ) + "\n",
    "utf8",
  );
});

console.log(`Dispatch bundle created: ${runDir}`);

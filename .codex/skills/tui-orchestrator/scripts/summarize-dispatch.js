#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const runPath = process.argv[2];
if (!runPath) {
  console.error("Usage: node summarize-dispatch.js <run-path>");
  process.exit(1);
}

const absoluteRunPath = path.resolve(runPath);
const statusDir = path.join(absoluteRunPath, "status");

if (!fs.existsSync(statusDir)) {
  console.error(`Status directory not found: ${statusDir}`);
  process.exit(1);
}

const files = fs
  .readdirSync(statusDir)
  .filter((file) => file.endsWith(".json"))
  .sort();

const summary = files.map((file) => {
  const data = JSON.parse(fs.readFileSync(path.join(statusDir, file), "utf8"));
  return `Worker ${data.worker}: ${data.status} - ${data.task}`;
});

console.log(summary.join("\n"));

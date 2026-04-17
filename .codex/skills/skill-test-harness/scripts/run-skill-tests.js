#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

function parseFrontmatter(raw) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) return { metadata: {}, body: raw };
  const metadata = {};
  for (const line of match[1].split("\n")) {
    const pair = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (pair) metadata[pair[1]] = pair[2].trim();
  }
  return { metadata, body: raw.slice(match[0].length) };
}

function walk(dir, patternPrefix, results) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, patternPrefix, results);
    } else if (fullPath.includes(patternPrefix)) {
      results.push(fullPath);
    }
  }
}

function runCase(testCase, context) {
  switch (testCase.type) {
    case "frontmatter-field":
      return Boolean(context.metadata[testCase.field]);
    case "body-non-empty":
      return context.body.trim().length > 0;
    case "relative-file-exists":
      return fs.existsSync(path.join(context.skillPath, testCase.path));
    case "glob-min-matches": {
      const prefix = path.join(context.skillPath, testCase.pattern.replace("*", ""));
      const results = [];
      if (fs.existsSync(context.skillPath)) {
        walk(context.skillPath, prefix, results);
      }
      return results.length >= Number(testCase.minMatches || 1);
    }
    default:
      return false;
  }
}

const skillPath = process.argv[2];
if (!skillPath) {
  console.error("Usage: node run-skill-tests.js <skill-path> [manifest-file]");
  process.exit(1);
}

const absoluteSkillPath = path.resolve(skillPath);
const skillFile = path.join(absoluteSkillPath, "SKILL.md");
if (!fs.existsSync(skillFile)) {
  console.error(`Skill file not found: ${skillFile}`);
  process.exit(1);
}

const raw = fs.readFileSync(skillFile, "utf8");
const { metadata, body } = parseFrontmatter(raw);
const manifestFile =
  process.argv[3] ||
  path.join(
    process.cwd(),
    ".codex-runtime",
    "skill-tests",
    metadata.name || path.basename(absoluteSkillPath),
    "cases.json",
  );

if (!fs.existsSync(manifestFile)) {
  console.error(`Manifest file not found: ${manifestFile}`);
  console.error("Generate it first with generate-skill-tests.js");
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(manifestFile, "utf8"));
const context = { skillPath: absoluteSkillPath, metadata, body };
let failures = 0;

for (const testCase of manifest.cases) {
  const pass = runCase(testCase, context);
  if (pass) {
    console.log(`PASS ${testCase.id}`);
  } else {
    failures += 1;
    console.log(`FAIL ${testCase.id}`);
  }
}

if (failures > 0) {
  console.error(`Skill tests failed: ${failures}`);
  process.exit(1);
}

console.log(`Skill tests passed: ${manifest.cases.length}`);

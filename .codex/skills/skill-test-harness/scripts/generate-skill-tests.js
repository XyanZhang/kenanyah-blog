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

function collectLinks(body) {
  return Array.from(body.matchAll(/\[[^\]]*\]\(([^)]+)\)/g))
    .map((match) => match[1])
    .filter((target) => !target.startsWith("http"));
}

function collectScriptPaths(body) {
  return Array.from(body.matchAll(/(?:^|\s)(scripts\/[A-Za-z0-9._/-]+)/g))
    .map((match) => match[1]);
}

const skillPath = process.argv[2];
if (!skillPath) {
  console.error("Usage: node generate-skill-tests.js <skill-path>");
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
const skillName =
  metadata.name ||
  path.basename(absoluteSkillPath).replace(/[^a-z0-9]+/gi, "-").toLowerCase();

const cases = [
  { id: "frontmatter-name", type: "frontmatter-field", field: "name" },
  { id: "frontmatter-description", type: "frontmatter-field", field: "description" },
  { id: "body-non-empty", type: "body-non-empty" },
];

for (const link of collectLinks(body)) {
  cases.push({
    id: `linked-file:${link}`,
    type: "relative-file-exists",
    path: link,
  });
}

const scriptPaths = new Set(collectScriptPaths(body));
if (fs.existsSync(path.join(absoluteSkillPath, "scripts"))) {
  cases.push({
    id: "scripts-folder-has-files",
    type: "glob-min-matches",
    pattern: "scripts/*",
    minMatches: 1,
  });
}

for (const scriptPath of scriptPaths) {
  cases.push({
    id: `script-ref:${scriptPath}`,
    type: "relative-file-exists",
    path: scriptPath,
  });
}

const manifest = {
  skillPath: absoluteSkillPath,
  generatedAt: new Date().toISOString(),
  cases,
  samplePrompts: [
    `Use ${skillName} for a normal task in this repo.`,
    `Use ${skillName} for an edge case and explain how validation should work.`,
  ],
};

const outDir = path.join(process.cwd(), ".codex-runtime", "skill-tests", skillName);
fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, "cases.json");
fs.writeFileSync(outFile, JSON.stringify(manifest, null, 2) + "\n", "utf8");

console.log(`Skill test manifest written to ${outFile}`);

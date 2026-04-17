#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const IGNORE_DIRS = new Set([
  ".git",
  "node_modules",
  ".next",
  "dist",
  "build",
  "coverage",
  ".turbo",
]);

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const part = argv[i];
    if (!part.startsWith("--")) {
      args._.push(part);
      continue;
    }
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

function parseFrontmatter(raw) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) return {};
  const metadata = {};
  for (const line of match[1].split("\n")) {
    const pair = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (pair) metadata[pair[1]] = pair[2].trim();
  }
  return metadata;
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function hasCodexMarkers(dirPath) {
  return [".codex", ".agents", "AGENTS.md"].some((name) =>
    fs.existsSync(path.join(dirPath, name)),
  );
}

function listSkills(projectPath) {
  const skillsRoot = path.join(projectPath, ".codex", "skills");
  if (!fs.existsSync(skillsRoot)) return [];
  return fs
    .readdirSync(skillsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const skillFile = path.join(skillsRoot, entry.name, "SKILL.md");
      const raw = fs.existsSync(skillFile) ? fs.readFileSync(skillFile, "utf8") : "";
      const meta = raw ? parseFrontmatter(raw) : {};
      return {
        name: meta.name || entry.name,
        description: meta.description || "",
        path: path.join(skillsRoot, entry.name),
      };
    });
}

function inspectProject(projectPath) {
  const packageJson = readJson(path.join(projectPath, "package.json"));
  const agentsPath = path.join(projectPath, "AGENTS.md");
  const agentsSnippet = fs.existsSync(agentsPath)
    ? fs.readFileSync(agentsPath, "utf8").split("\n").slice(0, 20).join("\n")
    : "";

  return {
    name: (packageJson && packageJson.name) || path.basename(projectPath),
    description: (packageJson && packageJson.description) || "",
    path: projectPath,
    hasAgentsMd: fs.existsSync(agentsPath),
    skills: listSkills(projectPath),
    scripts: packageJson ? Object.keys(packageJson.scripts || {}) : [],
    agentsSnippet,
  };
}

function scanForProjects(rootPath, depth = 0, results = []) {
  if (!fs.existsSync(rootPath)) return results;
  if (depth > 3) return results;

  if (hasCodexMarkers(rootPath)) {
    results.push(rootPath);
  }

  const entries = fs.readdirSync(rootPath, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (IGNORE_DIRS.has(entry.name)) continue;
    scanForProjects(path.join(rootPath, entry.name), depth + 1, results);
  }

  return results;
}

function unique(values) {
  return Array.from(new Set(values));
}

function getIndexPath(baseDir) {
  return path.join(baseDir, ".codex-runtime", "observability", "index.json");
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function buildIndex(args) {
  const initCwd = process.env.INIT_CWD || process.cwd();
  const defaultRoot = path.dirname(initCwd);
  const roots = (args.roots || defaultRoot)
    .split(",")
    .map((item) => path.resolve(initCwd, item.trim()))
    .filter(Boolean);

  const projectPaths = unique(
    roots.flatMap((rootPath) => scanForProjects(rootPath)).filter(Boolean),
  ).sort();

  const projects = projectPaths.map(inspectProject);
  const outPath = getIndexPath(initCwd);
  ensureDir(path.dirname(outPath));
  fs.writeFileSync(
    outPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        roots,
        projects,
      },
      null,
      2,
    ) + "\n",
    "utf8",
  );
  console.log(`Indexed ${projects.length} project(s) into ${outPath}`);
}

function queryIndex(args) {
  const initCwd = process.env.INIT_CWD || process.cwd();
  const keyword = (args.keyword || args._[1] || "").toLowerCase().trim();
  if (!keyword) {
    console.error("Missing search keyword. Use --keyword <text>.");
    process.exit(1);
  }

  const indexPath = getIndexPath(initCwd);
  if (!fs.existsSync(indexPath)) {
    console.error(`Index not found: ${indexPath}`);
    console.error("Run the index command first.");
    process.exit(1);
  }

  const index = readJson(indexPath);
  const matches = [];

  for (const project of index.projects || []) {
    const projectBlob = [
      project.name,
      project.description,
      project.path,
      project.agentsSnippet,
      ...(project.scripts || []),
    ]
      .join("\n")
      .toLowerCase();

    if (projectBlob.includes(keyword)) {
      matches.push({
        type: "project",
        name: project.name,
        path: project.path,
        description: project.description,
      });
    }

    for (const skill of project.skills || []) {
      const skillBlob = [skill.name, skill.description, skill.path].join("\n").toLowerCase();
      if (skillBlob.includes(keyword)) {
        matches.push({
          type: "skill",
          name: skill.name,
          path: skill.path,
          description: skill.description,
        });
      }
    }
  }

  if (matches.length === 0) {
    console.log(`No matches for "${keyword}"`);
    return;
  }

  for (const match of matches) {
    console.log(`[${match.type}] ${match.name}`);
    console.log(`  path: ${match.path}`);
    if (match.description) console.log(`  description: ${match.description}`);
  }
}

const args = parseArgs(process.argv.slice(2));
const command = args._[0];

if (command === "index") {
  buildIndex(args);
} else if (command === "query") {
  queryIndex(args);
} else {
  console.error("Usage: node src/index.js <index|query> [options]");
  process.exit(1);
}

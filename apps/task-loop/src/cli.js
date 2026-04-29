#!/usr/bin/env node

const fs = require('node:fs')
const path = require('node:path')

const VALID_STATUSES = new Set(['active', 'blocked', 'done'])

function parseArgs(argv) {
  const normalizedArgv = argv[0] === '--' ? argv.slice(1) : argv
  const command = normalizedArgv[0]
  const args = { _: [] }

  for (let index = 1; index < normalizedArgv.length; index += 1) {
    const part = normalizedArgv[index]
    if (!part.startsWith('--')) {
      args._.push(part)
      continue
    }

    const key = part.slice(2)
    const next = normalizedArgv[index + 1]
    if (!next || next.startsWith('--')) {
      args[key] = true
      continue
    }

    args[key] = next
    index += 1
  }

  return { command, args }
}

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function resolveRoot(args) {
  const rawRoot = args.root || process.env.INIT_CWD || process.cwd()
  return path.resolve(String(rawRoot))
}

function getLoopRoot(root) {
  return path.join(root, '.codex-runtime', 'loop-env')
}

function getLoopDir(root, name) {
  const slug = slugify(name)
  if (!slug) {
    throw new Error('Loop name must contain at least one letter or number.')
  }
  return {
    slug,
    loopDir: path.join(getLoopRoot(root), slug),
  }
}

function writeFileIfMissing(filePath, content, force) {
  if (!force && fs.existsSync(filePath)) return false
  fs.writeFileSync(filePath, content, 'utf8')
  return true
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

function requireArg(args, key) {
  const value = args[key]
  if (!value || value === true) {
    throw new Error(`Missing required argument: --${key}`)
  }
  return String(value)
}

function statePath(loopDir) {
  return path.join(loopDir, 'state.json')
}

function ensureLoopExists(loopDir) {
  if (!fs.existsSync(statePath(loopDir))) {
    throw new Error(`Loop environment not found: ${loopDir}`)
  }
}

function findFirstBacklogItem(backlogPath) {
  if (!fs.existsSync(backlogPath)) return null
  const content = fs.readFileSync(backlogPath, 'utf8')
  const line = content
    .split(/\r?\n/)
    .find((item) => /^\s*-\s+\[\s\]\s+/.test(item))
  return line ? line.replace(/^\s*-\s+\[\s\]\s+/, '').trim() : null
}

function getLoopSummaries(root) {
  const loopRoot = getLoopRoot(root)
  if (!fs.existsSync(loopRoot)) return []

  return fs
    .readdirSync(loopRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const loopDir = path.join(loopRoot, entry.name)
      const stateFile = statePath(loopDir)
      if (!fs.existsSync(stateFile)) return null
      try {
        return {
          ...readJson(stateFile),
          path: loopDir,
        }
      } catch {
        return null
      }
    })
    .filter(Boolean)
    .sort((left, right) => String(right.lastUpdatedAt).localeCompare(String(left.lastUpdatedAt)))
}

function printLoopSummary(loop) {
  console.log(`Name: ${loop.name}`)
  console.log(`Slug: ${loop.slug}`)
  console.log(`Status: ${loop.status}`)
  console.log(`Next: ${loop.nextStep}`)
  console.log(`Path: ${loop.path}`)
}

function commandInit(args) {
  const name = requireArg(args, 'name')
  const goal = String(args.goal || '')
  const owner = String(args.owner || 'codex')
  const force = Boolean(args.force)
  const root = resolveRoot(args)
  const { slug, loopDir } = getLoopDir(root, name)
  const now = new Date().toISOString()

  fs.mkdirSync(loopDir, { recursive: true })
  fs.mkdirSync(path.join(loopDir, 'artifacts'), { recursive: true })

  writeFileIfMissing(
    path.join(loopDir, 'mission.md'),
    `# ${name}

## Goal

${goal || 'Describe the mission here.'}

## Constraints

- Keep changes aligned with the repo conventions.
- Record decisions in the journal.
- Update handoff before stopping.
`,
    force
  )

  writeFileIfMissing(
    path.join(loopDir, 'backlog.md'),
    `# Backlog

- [ ] Confirm scope
- [ ] Inspect current code and constraints
- [ ] Implement the next smallest useful step
- [ ] Verify with tests or checks
- [ ] Prepare handoff
`,
    force
  )

  writeFileIfMissing(
    path.join(loopDir, 'journal.md'),
    `# Journal

## ${now}

- Loop created by ${owner}
- Initial goal: ${goal || 'Not provided'}
`,
    force
  )

  writeFileIfMissing(
    path.join(loopDir, 'handoff.md'),
    `# Handoff

## Current status

Not started.

## Next step

Inspect the codebase and update backlog priorities.

## Risks

- Unknown until first inspection pass
`,
    force
  )

  writeFileIfMissing(
    statePath(loopDir),
    `${JSON.stringify(
      {
        name,
        slug,
        owner,
        goal,
        status: 'active',
        lastUpdatedAt: now,
        nextStep: 'Inspect the codebase and update backlog priorities.',
      },
      null,
      2
    )}\n`,
    force
  )

  console.log(`Loop environment ready: ${loopDir}`)
}

function commandTick(args) {
  const name = requireArg(args, 'name')
  const summary = String(args.summary || 'Progress recorded.')
  const nextStep = String(args.next || 'Decide the next concrete step.')
  const status = String(args.status || 'active')
  if (!VALID_STATUSES.has(status)) {
    throw new Error(`Invalid --status "${status}". Use active, blocked, or done.`)
  }

  const root = resolveRoot(args)
  const { loopDir } = getLoopDir(root, name)
  ensureLoopExists(loopDir)

  const now = new Date().toISOString()
  const currentState = readJson(statePath(loopDir))
  currentState.status = status
  currentState.lastUpdatedAt = now
  currentState.nextStep = nextStep
  writeJson(statePath(loopDir), currentState)

  fs.appendFileSync(
    path.join(loopDir, 'journal.md'),
    `
## ${now}

- Status: ${status}
- Summary: ${summary}
- Next: ${nextStep}
`,
    'utf8'
  )

  fs.writeFileSync(
    path.join(loopDir, 'handoff.md'),
    `# Handoff

## Current status

${summary}

## Next step

${nextStep}

## Risks

- Update this section if something is blocked or uncertain.
`,
    'utf8'
  )

  console.log(`Loop tick recorded: ${loopDir}`)
}

function commandList(args) {
  const root = resolveRoot(args)
  const loops = getLoopSummaries(root)
  if (loops.length === 0) {
    console.log('No loop environments found.')
    return
  }

  loops.forEach((loop) => {
    console.log(`${loop.slug}\t${loop.status}\t${loop.nextStep}`)
  })
}

function commandStatus(args) {
  const root = resolveRoot(args)
  if (!args.name) {
    commandList(args)
    return
  }

  const { loopDir } = getLoopDir(root, String(args.name))
  ensureLoopExists(loopDir)
  printLoopSummary({
    ...readJson(statePath(loopDir)),
    path: loopDir,
  })
}

function commandNext(args) {
  const name = requireArg(args, 'name')
  const root = resolveRoot(args)
  const { loopDir } = getLoopDir(root, name)
  ensureLoopExists(loopDir)

  const currentState = readJson(statePath(loopDir))
  const backlogItem = findFirstBacklogItem(path.join(loopDir, 'backlog.md'))
  console.log(`Next: ${currentState.nextStep}`)
  if (backlogItem) {
    console.log(`Backlog: ${backlogItem}`)
  }
}

function commandHandoff(args) {
  const name = requireArg(args, 'name')
  const root = resolveRoot(args)
  const { loopDir } = getLoopDir(root, name)
  ensureLoopExists(loopDir)

  const handoffPath = path.join(loopDir, 'handoff.md')
  if (!fs.existsSync(handoffPath)) {
    throw new Error(`Handoff not found: ${handoffPath}`)
  }
  process.stdout.write(fs.readFileSync(handoffPath, 'utf8'))
}

function printHelp() {
  console.log(`task-loop

Usage:
  task-loop init --name <name> --goal <goal> [--owner codex] [--force] [--root <path>]
  task-loop tick --name <name> --summary <text> --next <text> [--status active|blocked|done] [--root <path>]
  task-loop status [--name <name>] [--root <path>]
  task-loop next --name <name> [--root <path>]
  task-loop handoff --name <name> [--root <path>]
  task-loop list [--root <path>]
`)
}

function main(argv = process.argv.slice(2)) {
  const { command, args } = parseArgs(argv)

  switch (command) {
    case 'init':
      commandInit(args)
      break
    case 'tick':
      commandTick(args)
      break
    case 'status':
      commandStatus(args)
      break
    case 'next':
      commandNext(args)
      break
    case 'handoff':
      commandHandoff(args)
      break
    case 'list':
      commandList(args)
      break
    case 'help':
    case '--help':
    case '-h':
    case undefined:
      printHelp()
      break
    default:
      throw new Error(`Unknown command: ${command}`)
  }
}

if (require.main === module) {
  try {
    main()
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}

module.exports = {
  findFirstBacklogItem,
  main,
  parseArgs,
  slugify,
}

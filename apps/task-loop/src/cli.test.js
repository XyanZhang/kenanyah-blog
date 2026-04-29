const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { spawnSync } = require('node:child_process')
const test = require('node:test')

const cliPath = path.resolve(__dirname, 'cli.js')

function makeTempRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'task-loop-'))
}

function runCli(args, root) {
  return spawnSync(process.execPath, [cliPath, ...args, '--root', root], {
    encoding: 'utf8',
  })
}

function loopDir(root, slug = 'project-optimization') {
  return path.join(root, '.codex-runtime', 'loop-env', slug)
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

test('init creates the complete loop structure', () => {
  const root = makeTempRoot()
  const result = runCli(
    ['init', '--name', 'Project Optimization', '--goal', 'Optimize project step by step'],
    root
  )

  assert.equal(result.status, 0, result.stderr)
  const dir = loopDir(root)
  assert.ok(fs.existsSync(path.join(dir, 'mission.md')))
  assert.ok(fs.existsSync(path.join(dir, 'backlog.md')))
  assert.ok(fs.existsSync(path.join(dir, 'journal.md')))
  assert.ok(fs.existsSync(path.join(dir, 'handoff.md')))
  assert.ok(fs.existsSync(path.join(dir, 'state.json')))
  assert.ok(fs.existsSync(path.join(dir, 'artifacts')))

  const state = readJson(path.join(dir, 'state.json'))
  assert.equal(state.name, 'Project Optimization')
  assert.equal(state.slug, 'project-optimization')
  assert.equal(state.status, 'active')
})

test('init does not overwrite existing files without force', () => {
  const root = makeTempRoot()
  const first = runCli(['init', '--name', 'Project Optimization', '--goal', 'First goal'], root)
  assert.equal(first.status, 0, first.stderr)

  const missionPath = path.join(loopDir(root), 'mission.md')
  fs.writeFileSync(missionPath, 'custom mission\n', 'utf8')

  const second = runCli(['init', '--name', 'Project Optimization', '--goal', 'Second goal'], root)
  assert.equal(second.status, 0, second.stderr)
  assert.equal(fs.readFileSync(missionPath, 'utf8'), 'custom mission\n')
})

test('tick updates state, appends journal, and rewrites handoff', () => {
  const root = makeTempRoot()
  runCli(['init', '--name', 'Project Optimization', '--goal', 'Optimize'], root)

  const result = runCli(
    [
      'tick',
      '--name',
      'Project Optimization',
      '--summary',
      'Created CLI',
      '--next',
      'Wire Codex skill',
      '--status',
      'blocked',
    ],
    root
  )

  assert.equal(result.status, 0, result.stderr)
  const dir = loopDir(root)
  const state = readJson(path.join(dir, 'state.json'))
  assert.equal(state.status, 'blocked')
  assert.equal(state.nextStep, 'Wire Codex skill')

  const journal = fs.readFileSync(path.join(dir, 'journal.md'), 'utf8')
  assert.match(journal, /Summary: Created CLI/)
  assert.match(journal, /Next: Wire Codex skill/)

  const handoff = fs.readFileSync(path.join(dir, 'handoff.md'), 'utf8')
  assert.match(handoff, /Created CLI/)
  assert.match(handoff, /Wire Codex skill/)
})

test('done marks a matching backlog item complete and appends journal', () => {
  const root = makeTempRoot()
  runCli(['init', '--name', 'Project Optimization', '--goal', 'Optimize'], root)

  const result = runCli(
    ['done', '--name', 'Project Optimization', '--item', 'Inspect current code'],
    root
  )

  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /Marked backlog item done: Inspect current code and constraints/)

  const dir = loopDir(root)
  const backlog = fs.readFileSync(path.join(dir, 'backlog.md'), 'utf8')
  assert.match(backlog, /- \[ \] Confirm scope/)
  assert.match(backlog, /- \[x\] Inspect current code and constraints/)

  const journal = fs.readFileSync(path.join(dir, 'journal.md'), 'utf8')
  assert.match(journal, /Backlog done: Inspect current code and constraints/)
})

test('done can mark the nth unchecked backlog item complete', () => {
  const root = makeTempRoot()
  runCli(['init', '--name', 'Project Optimization', '--goal', 'Optimize'], root)

  const result = runCli(['done', '--name', 'Project Optimization', '--index', '2'], root)

  assert.equal(result.status, 0, result.stderr)
  const backlog = fs.readFileSync(path.join(loopDir(root), 'backlog.md'), 'utf8')
  assert.match(backlog, /- \[ \] Confirm scope/)
  assert.match(backlog, /- \[x\] Inspect current code and constraints/)
})

test('done reports a useful error when the target is missing', () => {
  const root = makeTempRoot()
  runCli(['init', '--name', 'Project Optimization', '--goal', 'Optimize'], root)

  const result = runCli(['done', '--name', 'Project Optimization', '--item', 'Missing item'], root)

  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /Could not find unchecked backlog item matching "Missing item"/)
})

test('status, list, next, and handoff report existing loops', () => {
  const root = makeTempRoot()
  runCli(['init', '--name', 'Project Optimization', '--goal', 'Optimize'], root)

  const status = runCli(['status', '--name', 'Project Optimization'], root)
  assert.equal(status.status, 0, status.stderr)
  assert.match(status.stdout, /Name: Project Optimization/)
  assert.match(status.stdout, /Next: Inspect the codebase/)

  const list = runCli(['list'], root)
  assert.equal(list.status, 0, list.stderr)
  assert.match(list.stdout, /project-optimization\s+active/)

  const next = runCli(['next', '--name', 'Project Optimization'], root)
  assert.equal(next.status, 0, next.stderr)
  assert.match(next.stdout, /Next: Inspect the codebase/)
  assert.match(next.stdout, /Backlog: Confirm scope/)

  const handoff = runCli(['handoff', '--name', 'Project Optimization'], root)
  assert.equal(handoff.status, 0, handoff.stderr)
  assert.match(handoff.stdout, /# Handoff/)
})

test('missing loop commands fail with a useful error', () => {
  const root = makeTempRoot()
  const result = runCli(['status', '--name', 'Missing Loop'], root)

  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /Loop environment not found/)
})

test('list in an empty root succeeds with an empty message', () => {
  const root = makeTempRoot()
  const result = runCli(['list'], root)

  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /No loop environments found/)
})

test('commands tolerate a pnpm script argument separator', () => {
  const root = makeTempRoot()
  const result = runCli(
    ['--', 'init', '--name', 'Project Optimization', '--goal', 'Optimize'],
    root
  )

  assert.equal(result.status, 0, result.stderr)
  assert.ok(fs.existsSync(path.join(loopDir(root), 'state.json')))
})

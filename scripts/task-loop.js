#!/usr/bin/env node

const { spawnSync } = require('node:child_process')
const path = require('node:path')

const repoRoot = path.resolve(__dirname, '..')
const cliPath = path.join(repoRoot, 'apps', 'task-loop', 'src', 'cli.js')
const args = process.argv.slice(2)

const result = spawnSync(process.execPath, [cliPath, ...args], {
  cwd: repoRoot,
  stdio: 'inherit',
  env: {
    ...process.env,
    INIT_CWD: process.env.INIT_CWD || repoRoot,
  },
})

if (result.error) {
  console.error(result.error.message)
  process.exit(1)
}

process.exit(result.status ?? 0)

import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const rootDir = path.resolve(import.meta.dirname, '..', '..', '..')
const appDir = path.join(rootDir, 'apps', 'collab-editor')
const devEnvPath = path.join(rootDir, '.env.development')
const localEnvPath = path.join(appDir, '.env')

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {}

  return fs
    .readFileSync(filePath, 'utf-8')
    .split('\n')
    .reduce((acc, line) => {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) return acc
      const [key, ...valueParts] = trimmed.split('=')
      if (key) acc[key.trim()] = valueParts.join('=').trim()
      return acc
    }, {})
}

const env = {
  ...loadEnvFile(devEnvPath),
  ...loadEnvFile(localEnvPath),
}

const COLLAB_PORT = env.COLLAB_PORT || '3012'
const COLLAB_EDITOR_PORT = env.COLLAB_EDITOR_PORT || '3013'

const runtimeEnv = {
  ...process.env,
  ...env,
  NODE_ENV: env.NODE_ENV || 'development',
  COLLAB_PORT,
  COLLAB_EDITOR_PORT,
  VITE_COLLAB_API_URL: env.VITE_COLLAB_API_URL || `http://localhost:${COLLAB_PORT}`,
  VITE_COLLAB_WS_URL: env.VITE_COLLAB_WS_URL || `ws://localhost:${COLLAB_PORT}`,
}

const children = [
  spawn('pnpm', ['exec', 'tsx', 'watch', 'server/index.ts'], {
    cwd: appDir,
    stdio: 'inherit',
    shell: true,
    env: runtimeEnv,
  }),
  spawn('pnpm', ['exec', 'vite', '--host', '0.0.0.0', '--port', COLLAB_EDITOR_PORT], {
    cwd: appDir,
    stdio: 'inherit',
    shell: true,
    env: runtimeEnv,
  }),
]

function shutdown(code = 0) {
  for (const child of children) {
    if (!child.killed) child.kill('SIGTERM')
  }
  process.exit(code)
}

for (const child of children) {
  child.on('close', (code) => {
    if (code && code !== 0) shutdown(code)
  })
}

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))

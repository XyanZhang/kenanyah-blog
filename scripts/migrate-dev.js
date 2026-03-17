#!/usr/bin/env node
/**
 * 使用与 dev 相同的环境（.env.development）对开发库执行 Prisma 迁移。
 * 这样 pnpm run dev 时 API 连的库会有 chat_conversations 等表。
 */
const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')

const rootDir = path.resolve(__dirname, '..')
const devEnvPath = path.join(rootDir, '.env.development')
const apiEnvPath = path.join(rootDir, 'apps', 'api', '.env')

function loadEnvFile(filePath) {
  const out = {}
  if (!fs.existsSync(filePath)) return out
  const content = fs.readFileSync(filePath, 'utf-8')
  content.split('\n').forEach((line) => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) return
    const eq = trimmed.indexOf('=')
    if (eq === -1) return
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")))
      value = value.slice(1, -1)
    out[key] = value
  })
  return out
}

if (!fs.existsSync(devEnvPath)) {
  console.error('[migrate-dev] 缺少 .env.development，请先创建并配置 DATABASE_URL')
  process.exit(1)
}

let env = { ...process.env, ...loadEnvFile(devEnvPath) }
if (fs.existsSync(apiEnvPath)) {
  env = { ...env, ...loadEnvFile(apiEnvPath) }
}

console.log('[migrate-dev] 使用 .env.development 的 DATABASE_URL 执行迁移…')
const child = spawn('pnpm', ['exec', 'prisma', 'migrate', 'dev', ...process.argv.slice(2)], {
  cwd: path.join(rootDir, 'apps', 'api'),
  stdio: 'inherit',
  shell: true,
  env,
})
child.on('close', (code) => process.exit(code ?? 0))

#!/usr/bin/env node
/**
 * 对测试环境数据库执行 Prisma 迁移（仅 apply，不创建新 migration）。
 * 使用 prisma migrate deploy，适合 docker-compose.test.yml（5434）或 CI。
 *
 * 环境变量来源（后者覆盖前者）：process.env → .env.test → apps/api/.env
 */
const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')

const rootDir = path.resolve(__dirname, '..')
const testEnvPath = path.join(rootDir, '.env.test')
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
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    )
      value = value.slice(1, -1)
    out[key] = value
  })
  return out
}

let env = { ...process.env }
if (fs.existsSync(testEnvPath)) {
  env = { ...env, ...loadEnvFile(testEnvPath) }
}
if (fs.existsSync(apiEnvPath)) {
  env = { ...env, ...loadEnvFile(apiEnvPath) }
}

if (!env.DATABASE_URL) {
  console.error(
    '[migrate-test] 未找到 DATABASE_URL。请在项目根目录创建 .env.test（或导出 DATABASE_URL），' +
      '内容需指向测试库，例如 docker-compose.test.yml 映射的 5434 端口。'
  )
  process.exit(1)
}

console.log('[migrate-test] 使用当前 DATABASE_URL 执行 prisma migrate deploy…')
const child = spawn(
  'pnpm',
  ['exec', 'prisma', 'migrate', 'deploy', ...process.argv.slice(2)],
  {
    cwd: path.join(rootDir, 'apps', 'api'),
    stdio: 'inherit',
    shell: true,
    env,
  }
)
child.on('close', (code) => process.exit(code ?? 0))

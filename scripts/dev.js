#!/usr/bin/env node
/**
 * 开发服务器启动脚本（仅用于本地 dev，不读 .env.test）
 * 环境变量来源：根目录 .env.development（必选），apps/api/.env（可选覆盖）
 * .env.test 仅用于 Docker 测试：docker-compose -f docker-compose.test.yml --env-file .env.test
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
  content.split('\n').forEach(line => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) return
    const [key, ...valueParts] = trimmed.split('=')
    if (key) out[key.trim()] = valueParts.join('=').trim()
  })
  return out
}

if (!fs.existsSync(devEnvPath)) {
  console.error('[dev] 缺少开发环境配置: .env.development')
  console.error('[dev] 请执行: cp .env.development.example .env.development  并按需修改')
  process.exit(1)
}

// 仅从 .env.development 加载，再用 apps/api/.env 覆盖（可选）
let env = loadEnvFile(devEnvPath)
if (fs.existsSync(apiEnvPath)) {
  env = { ...env, ...loadEnvFile(apiEnvPath) }
}

const WEB_PORT = env.WEB_PORT || '3000'
const API_PORT = env.API_PORT || '3001'

const DEV_ENV = {
  ...env,
  NODE_ENV: env.NODE_ENV || 'development',
  WEB_PORT,
  API_PORT,
  PORT: API_PORT,
  NEXT_PUBLIC_API_URL: env.NEXT_PUBLIC_API_URL || `http://localhost:${API_PORT}/api`,
  NEXT_PUBLIC_APP_URL: env.NEXT_PUBLIC_APP_URL || `http://localhost:${WEB_PORT}`,
  CORS_ORIGIN: env.CORS_ORIGIN || `http://localhost:${WEB_PORT}`,
  UPLOAD_BASE_URL: env.UPLOAD_BASE_URL || `http://localhost:${API_PORT}`,
}

const service = process.argv[2] || 'all'

if (service === 'api') {
  const required = ['DATABASE_URL', 'JWT_SECRET', 'JWT_REFRESH_SECRET']
  const missing = required.filter((k) => !DEV_ENV[k] || (k.startsWith('JWT_') && DEV_ENV[k].length < 32))
  if (missing.length) {
    console.error('[dev] API 缺少环境变量: ' + missing.join(', '))
    console.error('[dev] 请在 .env.development 中填写 DATABASE_URL、JWT_SECRET、JWT_REFRESH_SECRET（JWT 至少 32 字符）')
    process.exit(1)
  }
  const child = spawn('pnpm', ['exec', 'tsx', 'watch', 'src/index.ts'], {
    cwd: path.join(rootDir, 'apps', 'api'),
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, ...DEV_ENV },
  })
  child.on('close', (code) => process.exit(code))
} else if (service === 'web') {
  const child = spawn('pnpm', ['exec', 'next', 'dev', '-p', WEB_PORT], {
    cwd: path.join(rootDir, 'apps', 'web'),
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, ...DEV_ENV },
  })
  child.on('close', (code) => process.exit(code))
} else {
  console.log('Usage: node dev.js [api|web]')
  console.log('  dev 环境仅读取 .env.development，与 .env.test（Docker 测试）无关')
  process.exit(1)
}
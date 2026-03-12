#!/usr/bin/env node
/**
 * 开发服务器启动脚本
 * 从 .env.test 读取端口配置，自动生成 URL 相关环境变量
 */
const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')

// 读取 .env.test
const envPath = path.resolve(__dirname, '..', '.env.test')
const envContent = fs.readFileSync(envPath, 'utf-8')

// 解析环境变量
const env = {}
envContent.split('\n').forEach(line => {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) return
  const [key, ...valueParts] = trimmed.split('=')
  if (key) {
    env[key.trim()] = valueParts.join('=').trim()
  }
})

// 端口配置
const WEB_PORT = env.WEB_PORT || '3000'
const API_PORT = env.API_PORT || '3001'

// 自动生成 URL
const URL_ENV = {
  ...env,
  WEB_PORT,
  API_PORT,
  PORT: API_PORT, // API 用 PORT 变量
  NEXT_PUBLIC_API_URL: `http://localhost:${API_PORT}`,
  NEXT_PUBLIC_APP_URL: `http://localhost:${WEB_PORT}`,
  CORS_ORIGIN: `http://localhost:${WEB_PORT}`,
  UPLOAD_BASE_URL: `http://localhost:${API_PORT}`,
}

// 判断启动哪个服务
const service = process.argv[2] || 'all'

if (service === 'api') {
  // 启动 API
  const child = spawn('pnpm', ['exec', 'tsx', 'watch', 'src/index.ts'], {
    cwd: path.resolve(__dirname, '..', 'apps', 'api'),
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, ...URL_ENV }
  })
  child.on('close', (code) => process.exit(code))
} else if (service === 'web') {
  // 启动 Web
  const child = spawn('pnpm', ['exec', 'next', 'dev', '-p', WEB_PORT], {
    cwd: path.resolve(__dirname, '..', 'apps', 'web'),
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, ...URL_ENV }
  })
  child.on('close', (code) => process.exit(code))
} else {
  console.log('Usage: node dev.js [api|web]')
  process.exit(1)
}
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

export function loadLocalEnv() {
  const rootDir = path.resolve(import.meta.dirname, '..', '..', '..')
  const files = [
    path.join(rootDir, '.env.development'),
    path.join(rootDir, 'apps', 'collab-editor', '.env'),
  ]

  for (const filePath of files) {
    const values = loadEnvFile(filePath)
    for (const [key, value] of Object.entries(values)) {
      process.env[key] ??= value
    }
  }
}

function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return {}

  return fs
    .readFileSync(filePath, 'utf-8')
    .split('\n')
    .reduce<Record<string, string>>((acc, line) => {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) return acc
      const [key, ...valueParts] = trimmed.split('=')
      if (key) acc[key.trim()] = valueParts.join('=').trim()
      return acc
    }, {})
}

import process from 'node:process'
import { loadLocalEnv } from './load-env'

loadLocalEnv()

const port = Number(process.env.COLLAB_PORT || 3012)
const databaseUrl = process.env.COLLAB_DATABASE_URL || process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error('Missing DATABASE_URL or COLLAB_DATABASE_URL for collab editor persistence.')
}

export const env = {
  port,
  databaseUrl,
  corsOrigin: process.env.COLLAB_CORS_ORIGIN || process.env.VITE_COLLAB_APP_ORIGIN || `http://localhost:${port + 1}`,
  accessTokenSecret:
    process.env.COLLAB_ACCESS_TOKEN_SECRET ||
    process.env.AUTH_SECRET ||
    process.env.JWT_SECRET ||
    'collab-editor-local-access-secret',
}

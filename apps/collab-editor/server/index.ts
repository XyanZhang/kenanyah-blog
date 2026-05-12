import { env } from './env'
import { createCollaborationServer } from './collaboration'
import { ensureSchema, pool, seedSampleDocuments } from './db'

async function main() {
  await ensureSchema()
  await seedSampleDocuments()

  const server = createCollaborationServer(env.port)
  await server.listen()

  console.log(`[collab] HTTP and WebSocket server listening on http://localhost:${env.port}`)
}

main().catch(async (error) => {
  console.error('[collab] failed to start', error)
  await pool.end()
  process.exit(1)
})

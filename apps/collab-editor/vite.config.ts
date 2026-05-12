import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const port = Number(env.COLLAB_EDITOR_PORT || 3013)

  return {
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      port,
    },
  }
})

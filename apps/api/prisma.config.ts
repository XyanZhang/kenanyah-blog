import 'dotenv/config'
import { defineConfig } from 'prisma/config'

// 注意：Prisma CLI 在 Docker 构建阶段不会自动有 DATABASE_URL，
// 这里给一个“占位”URL，真正运行时会被容器里的环境变量覆盖。
const databaseUrl =
  process.env.DATABASE_URL ??
  'postgresql://blog_user:blog_password@postgres:5432/blog_prod?schema=public'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: databaseUrl,
  },
})

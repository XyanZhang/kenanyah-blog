// 生产环境用此文件，无需 TypeScript 或 prisma/config 模块
// DATABASE_URL 由 docker-compose 注入
const databaseUrl =
  process.env.DATABASE_URL ||
  'postgresql://blog_user:blog_password@postgres:5432/blog_prod?schema=public'

module.exports = {
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: databaseUrl,
  },
}

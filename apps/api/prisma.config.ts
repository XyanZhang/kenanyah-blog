// 注意：这里只给 Prisma CLI 使用的数据库 URL，
// 不再使用 dotenv，避免在 Docker 中缺少 dotenv/config 模块。
// 运行时真正的 DATABASE_URL 由 docker-compose 注入到容器环境中。
const databaseUrl =
  process.env.DATABASE_URL ??
  'postgresql://blog_user:blog_password@postgres:5432/blog_prod?schema=public'

// 这里直接导出普通配置对象，避免在运行时依赖 `prisma/config` 模块，
// 这样即使容器里没有安装全局 prisma/config 也能正常工作。
export default {
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: databaseUrl,
  },
}

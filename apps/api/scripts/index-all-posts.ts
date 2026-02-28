/**
 * 为所有已发布文章建立语义搜索向量索引。
 * 首次启用语义搜索或数据迁移后执行一次即可。
 *
 * 使用：pnpm --filter api exec tsx --env-file=.env scripts/index-all-posts.ts
 * 或在 apps/api 目录：tsx --env-file=.env scripts/index-all-posts.ts
 */
import { prisma } from '../src/lib/db'
import { indexPost } from '../src/lib/semantic-search'

async function main() {
  const posts = await prisma.post.findMany({
    where: { published: true },
    select: { id: true, title: true },
  })
  console.log(`Found ${posts.length} published posts to index.`)
  for (const post of posts) {
    try {
      await indexPost(post.id)
      console.log(`Indexed: ${post.title}`)
    } catch (err) {
      console.error(`Failed to index ${post.id}:`, err)
    }
  }
  console.log('Done.')
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())

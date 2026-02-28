/**
 * 检查语义搜索向量索引状态：post_embeddings 表行数、已发布文章数、是否一致。
 *
 * 使用：pnpm --filter api exec tsx --env-file=.env scripts/check-embeddings.ts
 * 或在 apps/api 目录：tsx --env-file=.env scripts/check-embeddings.ts
 */
import { prisma } from '../src/lib/db'
import { getEmbeddingsModel } from '../src/lib/embeddings'

async function main() {
  const model = getEmbeddingsModel()
  if (!model) {
    console.log('Embedding 未配置（未设置 EMBEDDINGS_API_KEY），跳过表检查。')
    process.exit(0)
  }

  type CountRow = { count: bigint }
  const [embeddingCount] = (await (prisma as any).$queryRawUnsafe(
    'SELECT count(*) AS count FROM post_embeddings'
  )) as CountRow[]
  const indexedCount = Number(embeddingCount?.count ?? 0)

  const publishedCount = await prisma.post.count({
    where: { published: true },
  })

  console.log('语义搜索索引状态：')
  console.log(`  已发布文章数: ${publishedCount}`)
  console.log(`  已建向量索引数: ${indexedCount}`)
  if (indexedCount === publishedCount && publishedCount > 0) {
    console.log('  结论: embedding 已全部就绪，可正常使用全局搜索（Cmd+K）。')
  } else if (indexedCount === 0 && publishedCount > 0) {
    console.log('  结论: 尚未建索引，请执行: pnpm --filter api index-posts')
  } else if (indexedCount < publishedCount) {
    console.log('  结论: 部分文章未建索引，可重新执行: pnpm --filter api index-posts')
  } else {
    console.log('  结论: 无已发布文章或索引与发布数一致。')
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())

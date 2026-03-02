import { prisma } from './db'
import { embedQuery, embedDocuments, getEmbeddingsModel } from './embeddings'
import { randomBytes } from 'node:crypto'

const CHUNK_MAX_LEN = 2000

export type PostForIndex = {
  id: string
  title: string
  excerpt: string | null
  content: string
  tags: { tag: { name: string } }[]
}

/** 构建用于向量化的检索文本 */
export function buildPostIndexText(post: PostForIndex): string {
  const tagNames = post.tags.map((t) => t.tag.name).join(' ')
  const contentSnippet = post.content.slice(0, CHUNK_MAX_LEN)
  return `标题：${post.title}\n标签：${tagNames}\n正文：${contentSnippet}`
}

/** 将向量转为 pgvector 插入用字符串 */
function vectorToPgString(vec: number[]): string {
  return `[${vec.join(',')}]`
}

/** 为单篇文章建立/更新向量索引（先删后插） */
export async function indexPost(postId: string): Promise<void> {
  const model = getEmbeddingsModel()
  if (!model) {
    console.warn(
      '[semantic-search] EMBEDDINGS_API_KEY / OPENAI_API_KEY 未配置，跳过向量索引。请在 apps/api/.env 中配置其一。'
    )
    return
  }

  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: { tags: { include: { tag: true } } },
  })
  if (!post) return

  await (prisma as any).$executeRawUnsafe(
    'DELETE FROM post_embeddings WHERE post_id = $1',
    postId
  )

  const text = buildPostIndexText(post)
  const vectors = await embedDocuments([text])
  const embedding = vectors[0]
  if (!embedding || !Array.isArray(embedding)) {
    throw new Error('Embedding API 返回格式异常，无法写入索引')
  }

  const id = `pe_${randomBytes(12).toString('hex')}`

  try {
    await (prisma as any).$executeRawUnsafe(
      `INSERT INTO post_embeddings (id, post_id, chunk_index, content, embedding)
       VALUES ($1, $2, 0, $3, $4::vector)`,
      id,
      postId,
      text,
      vectorToPgString(embedding)
    )
  } catch (dbErr: any) {
    const msg = dbErr?.message ?? String(dbErr)
    if (msg.includes('post_embeddings') && (msg.includes('does not exist') || msg.includes('relation'))) {
      throw new Error(
        '表 post_embeddings 不存在，请先执行迁移: pnpm --filter api prisma:migrate'
      )
    }
    throw dbErr
  }
}

/** 删除文章在向量表中的记录 */
export async function removePostFromIndex(postId: string): Promise<void> {
  await (prisma as any).$executeRawUnsafe(
    'DELETE FROM post_embeddings WHERE post_id = $1',
    postId
  )
}

export type SemanticSearchHit = {
  postId: string
  title: string
  slug: string
  snippet: string
  score: number
}

/** 语义搜索：返回带标题、slug、摘要、相关度的列表 */
export async function searchSemantic(
  query: string,
  limit: number = 10
): Promise<SemanticSearchHit[]> {
  const model = getEmbeddingsModel()
  if (!model) {
    throw new Error('OPENAI_API_KEY is not configured for semantic search')
  }

  const queryVector = await embedQuery(query)
  const vectorStr = vectorToPgString(queryVector)

  type Row = { post_id: string; content: string; score: number }
  const rows = (await (prisma as any).$queryRawUnsafe(
    `SELECT pe.post_id, pe.content,
            1 - (pe.embedding <=> $1::vector) AS score
     FROM post_embeddings pe
     ORDER BY pe.embedding <=> $1::vector
     LIMIT $2`,
    vectorStr,
    limit
  )) as Row[]

  if (rows.length === 0) return []

  const postIds: string[] = [...new Set(rows.map((r: Row) => r.post_id))]
  const posts = await prisma.post.findMany({
    where: { id: { in: postIds }, published: true },
    select: { id: true, title: true, slug: true, excerpt: true },
  })
  type PostMeta = { id: string; title: string; slug: string; excerpt: string | null }
  const postMap = new Map<string, PostMeta>(
    (posts as PostMeta[]).map((p) => [p.id, p])
  )

  return rows
    .filter((r: Row) => postMap.has(r.post_id))
    .map((r: Row) => {
      const post = postMap.get(r.post_id)!
      const snippet =
        post.excerpt ?? r.content.slice(0, 160).replace(/\s+/g, ' ')
      return {
        postId: r.post_id,
        title: post.title,
        slug: post.slug,
        snippet,
        score: Number(r.score),
      }
    })
}

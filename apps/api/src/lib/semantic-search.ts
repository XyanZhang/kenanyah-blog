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

export type ConversationForIndex = {
  id: string
  title: string | null
  messages: { role: string; content: string }[]
}

/** 构建用于向量化的检索文本 */
export function buildPostIndexText(post: PostForIndex): string {
  const tagNames = post.tags.map((t) => t.tag.name).join(' ')
  const contentSnippet = post.content.slice(0, CHUNK_MAX_LEN)
  return `标题：${post.title}\n标签：${tagNames}\n正文：${contentSnippet}`
}

export function buildConversationIndexText(conv: ConversationForIndex): string {
  const title = conv.title ?? 'AI 对话'
  const recentMessages = conv.messages.filter((message) => message.role !== 'system').slice(-10)
  const body = recentMessages
    .map((m) => (m.role === 'user' ? `用户：${m.content}` : `助手：${m.content}`))
    .join('\n')
  return `对话标题：${title}\n最近消息：\n${body.slice(0, CHUNK_MAX_LEN)}`
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

export async function indexConversation(conversationId: string): Promise<void> {
  const model = getEmbeddingsModel()
  if (!model) {
    console.warn(
      '[semantic-search] EMBEDDINGS_API_KEY / OPENAI_API_KEY 未配置，跳过对话向量索引。'
    )
    return
  }

  const conversation = await prisma.chatConversation.findUnique({
    where: { id: conversationId },
    include: {
      messages: {
        select: {
          role: true,
          content: true,
        },
        orderBy: { createdAt: 'asc' },
        take: 50,
      },
    },
  })

  if (!conversation) return

  const convWithMessages = conversation as typeof conversation & {
    messages: { role: string; content: string }[]
  }

  await (prisma as any).$executeRawUnsafe(
    'DELETE FROM conversation_embeddings WHERE conversation_id = $1',
    conversationId
  )

  const text = buildConversationIndexText({
    id: convWithMessages.id,
    title: convWithMessages.title,
    messages: convWithMessages.messages,
  })

  const vectors = await embedDocuments([text])
  const embedding = vectors[0]
  if (!embedding || !Array.isArray(embedding)) {
    throw new Error('Embedding API 返回格式异常，无法写入对话索引')
  }

  const id = `ce_${randomBytes(12).toString('hex')}`

  try {
    await (prisma as any).$executeRawUnsafe(
      `INSERT INTO conversation_embeddings (id, conversation_id, content, embedding)
       VALUES ($1, $2, $3, $4::vector)
       ON CONFLICT (id) DO NOTHING`,
      id,
      conversationId,
      text,
      vectorToPgString(embedding)
    )
  } catch (dbErr: any) {
    const msg = dbErr?.message ?? String(dbErr)
    if (msg.includes('conversation_embeddings') && (msg.includes('does not exist') || msg.includes('relation'))) {
      throw new Error(
        '表 conversation_embeddings 不存在，请先执行迁移: pnpm --filter api prisma:migrate'
      )
    }
    throw dbErr
  }
}

export async function removeConversationFromIndex(conversationId: string): Promise<void> {
  await (prisma as any).$executeRawUnsafe(
    'DELETE FROM conversation_embeddings WHERE conversation_id = $1',
    conversationId
  )
}

export type SemanticSearchHit = {
  type: 'post' | 'conversation'
  postId?: string
  slug?: string
  conversationId?: string
  href?: string
  title: string
  snippet: string
  score: number
}

export type PdfSemanticHit = {
  type: 'pdf'
  documentId: string
  chunkId: string
  chunkIndex: number
  href: string
  title: string
  snippet: string
  score: number
}

export type ThoughtSemanticHit = {
  type: 'thought'
  thoughtId: string
  href: string
  title: string
  snippet: string
  score: number
}

export type BookmarkTextHit = {
  type: 'bookmark'
  bookmarkId: string
  href: string
  title: string
  snippet: string
  score: number
}

export type ProjectTextHit = {
  type: 'project'
  projectId: string
  href: string
  title: string
  snippet: string
  score: number
}

export type UnifiedSearchHit =
  | SemanticSearchHit
  | PdfSemanticHit
  | ThoughtSemanticHit
  | BookmarkTextHit
  | ProjectTextHit

function toSnippet(text: string | null | undefined, maxLen: number = 180): string {
  return (text ?? '').slice(0, maxLen).replace(/\s+/g, ' ').trim()
}

function stringifyTags(tags: unknown): string {
  return Array.isArray(tags) ? tags.filter((tag) => typeof tag === 'string').join(' ') : ''
}

function textMatchScore(query: string, fields: Array<string | null | undefined>): number {
  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedQuery) return 0

  const haystack = fields.filter(Boolean).join(' ').toLowerCase()
  if (!haystack) return 0
  if (haystack === normalizedQuery) return 0.95
  if (fields.some((field) => field?.toLowerCase() === normalizedQuery)) return 0.9
  if (fields.some((field) => field?.toLowerCase().includes(normalizedQuery))) return 0.72
  return 0.45
}

async function searchSemanticByVector(
  vectorStr: string,
  limit: number
): Promise<SemanticSearchHit[]> {
  type PostRow = { post_id: string; content: string; score: number }
  const postRows = (await (prisma as any).$queryRawUnsafe(
    `SELECT pe.post_id, pe.content,
            1 - (pe.embedding <=> $1::vector) AS score
     FROM post_embeddings pe
     ORDER BY pe.embedding <=> $1::vector
     LIMIT $2`,
    vectorStr,
    limit
  )) as PostRow[]

  type ConvRow = { conversation_id: string; content: string; score: number }
  const convRows = (await (prisma as any).$queryRawUnsafe(
    `SELECT ce.conversation_id, ce.content,
            1 - (ce.embedding <=> $1::vector) AS score
     FROM conversation_embeddings ce
     ORDER BY ce.embedding <=> $1::vector
     LIMIT $2`,
    vectorStr,
    limit
  ).catch(() => [])) as ConvRow[]

  if (postRows.length === 0 && convRows.length === 0) return []

  const postIds: string[] = [...new Set(postRows.map((r: PostRow) => r.post_id))]
  const posts = await prisma.post.findMany({
    where: { id: { in: postIds }, published: true },
    select: { id: true, title: true, slug: true, excerpt: true },
  })
  type PostMeta = { id: string; title: string; slug: string; excerpt: string | null }
  const postMap = new Map<string, PostMeta>(
    (posts as PostMeta[]).map((p) => [p.id, p])
  )

  const postHits: SemanticSearchHit[] = postRows
    .filter((r: PostRow) => postMap.has(r.post_id))
    .map((r: PostRow) => {
      const post = postMap.get(r.post_id)!
      const snippet =
        post.excerpt ?? r.content.slice(0, 160).replace(/\s+/g, ' ')
      return {
        type: 'post' as const,
        postId: r.post_id,
        slug: post.slug,
        href: `/posts/${post.slug}`,
        title: post.title,
        snippet,
        score: Number(r.score),
      }
    })

  const convIds: string[] = [...new Set(convRows.map((r: ConvRow) => r.conversation_id))]
  const conversations = await prisma.chatConversation.findMany({
    where: { id: { in: convIds } },
    select: { id: true, title: true },
  })
  type ConvMeta = { id: string; title: string | null }
  const convMap = new Map<string, ConvMeta>(
    (conversations as ConvMeta[]).map((c) => [c.id, c])
  )

  const convHits: SemanticSearchHit[] = convRows
    .filter((r: ConvRow) => convMap.has(r.conversation_id))
    .map((r: ConvRow) => {
      const conv = convMap.get(r.conversation_id)!
      const snippet = r.content.slice(0, 160).replace(/\s+/g, ' ')
      return {
        type: 'conversation' as const,
        conversationId: r.conversation_id,
        href: `/ai-chat/${r.conversation_id}`,
        title: conv.title ?? 'AI 对话',
        snippet,
        score: Number(r.score),
      }
    })

  return [...postHits, ...convHits].sort((a, b) => b.score - a.score).slice(0, limit)
}

async function searchPdfSemanticByVector(
  vectorStr: string,
  limit: number
): Promise<PdfSemanticHit[]> {
  type Row = { document_id: string; chunk_id: string; chunk_index: number; content: string; score: number }
  const rows = (await (prisma as any).$queryRawUnsafe(
    `SELECT pce.document_id, pce.chunk_id, pce.chunk_index, pce.content,
            1 - (pce.embedding <=> $1::vector) AS score
     FROM pdf_chunk_embeddings pce
     ORDER BY pce.embedding <=> $1::vector
     LIMIT $2`,
    vectorStr,
    limit
  ).catch(() => [])) as Row[]

  if (rows.length === 0) return []

  const docIds = [...new Set(rows.map((r) => r.document_id))]
  const docs = await prisma.pdfDocument.findMany({
    where: { id: { in: docIds } },
    select: { id: true, filename: true },
  })
  const docMap = new Map<string, { id: string; filename: string }>(docs.map((d) => [d.id, d]))

  return rows
    .filter((r) => docMap.has(r.document_id))
    .map((r) => {
      const d = docMap.get(r.document_id)!
      return {
        type: 'pdf' as const,
        documentId: r.document_id,
        chunkId: r.chunk_id,
        chunkIndex: r.chunk_index,
        href: '/pdf-agent',
        title: d.filename,
        snippet: toSnippet(r.content),
        score: Number(r.score),
      }
    })
}

async function searchThoughtSemanticByVector(
  vectorStr: string,
  limit: number
): Promise<ThoughtSemanticHit[]> {
  type Row = { thought_id: string; content: string; score: number }
  const rows = (await (prisma as any).$queryRawUnsafe(
    `SELECT te.thought_id, te.content,
            1 - (te.embedding <=> $1::vector) AS score
     FROM thought_embeddings te
     ORDER BY te.embedding <=> $1::vector
     LIMIT $2`,
    vectorStr,
    limit
  ).catch(() => [])) as Row[]

  if (rows.length === 0) return []

  const thoughtIds = [...new Set(rows.map((r) => r.thought_id))]
  const thoughts = await prisma.thought.findMany({
    where: { id: { in: thoughtIds } },
    select: { id: true, content: true, createdAt: true },
  })
  const thoughtMap = new Map(thoughts.map((thought) => [thought.id, thought]))

  return rows
    .filter((r) => thoughtMap.has(r.thought_id))
    .map((r) => {
      const thought = thoughtMap.get(r.thought_id)!
      const date = thought.createdAt.toISOString().slice(0, 10)
      return {
        type: 'thought' as const,
        thoughtId: r.thought_id,
        href: '/thoughts',
        title: `思考 · ${date}`,
        snippet: toSnippet(thought.content),
        score: Number(r.score),
      }
    })
}

async function searchBookmarkText(query: string, limit: number): Promise<BookmarkTextHit[]> {
  const rows = await prisma.bookmark.findMany({
    where: {
      OR: [
        { title: { contains: query, mode: 'insensitive' } },
        { url: { contains: query, mode: 'insensitive' } },
        { notes: { contains: query, mode: 'insensitive' } },
        { category: { contains: query, mode: 'insensitive' } },
      ],
    },
    orderBy: { updatedAt: 'desc' },
    take: limit,
    select: {
      id: true,
      title: true,
      url: true,
      notes: true,
      category: true,
      tags: true,
    },
  })

  return rows
    .map((bookmark) => {
      const tags = stringifyTags(bookmark.tags)
      const snippet = toSnippet(bookmark.notes || [bookmark.url, bookmark.category, tags].filter(Boolean).join(' · '))
      return {
        type: 'bookmark' as const,
        bookmarkId: bookmark.id,
        href: bookmark.url,
        title: bookmark.title,
        snippet,
        score: textMatchScore(query, [bookmark.title, bookmark.url, bookmark.notes, bookmark.category, tags]),
      }
    })
    .sort((a, b) => b.score - a.score)
}

async function searchProjectText(query: string, limit: number): Promise<ProjectTextHit[]> {
  const rows = await prisma.projectEntry.findMany({
    where: {
      OR: [
        { title: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { href: { contains: query, mode: 'insensitive' } },
        { category: { contains: query, mode: 'insensitive' } },
        { status: { contains: query, mode: 'insensitive' } },
      ],
    },
    orderBy: { updatedAt: 'desc' },
    take: limit,
    select: {
      id: true,
      title: true,
      description: true,
      href: true,
      category: true,
      tags: true,
      status: true,
    },
  })

  return rows
    .map((project) => {
      const tags = stringifyTags(project.tags)
      const snippet = toSnippet(project.description || [project.category, project.status, tags].filter(Boolean).join(' · '))
      return {
        type: 'project' as const,
        projectId: project.id,
        href: project.href || '/projects',
        title: project.title,
        snippet,
        score: textMatchScore(query, [
          project.title,
          project.description,
          project.href,
          project.category,
          project.status,
          tags,
        ]),
      }
    })
    .sort((a, b) => b.score - a.score)
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
  return searchSemanticByVector(vectorStr, limit)
}

export async function searchPdfSemantic(
  query: string,
  limit: number = 10
): Promise<PdfSemanticHit[]> {
  const model = getEmbeddingsModel()
  if (!model) {
    throw new Error('OPENAI_API_KEY is not configured for semantic search')
  }

  const queryVector = await embedQuery(query)
  const vectorStr = vectorToPgString(queryVector)
  return searchPdfSemanticByVector(vectorStr, limit)
}

export async function searchSemanticAll(
  query: string,
  limit: number = 10
): Promise<UnifiedSearchHit[]> {
  const model = getEmbeddingsModel()
  if (!model) {
    throw new Error('OPENAI_API_KEY is not configured for semantic search')
  }

  // 关键优化：同一个 query 只做一次 embedding，然后复用 queryVector 查询 post/conv/pdf
  const queryVector = await embedQuery(query)
  const vectorStr = vectorToPgString(queryVector)

  const [contentHits, pdfHits, thoughtHits, bookmarkHits, projectHits] = await Promise.all([
    searchSemanticByVector(vectorStr, limit).catch(() => []),
    searchPdfSemanticByVector(vectorStr, limit).catch(() => []),
    searchThoughtSemanticByVector(vectorStr, limit).catch(() => []),
    searchBookmarkText(query, limit).catch(() => []),
    searchProjectText(query, limit).catch(() => []),
  ])

  return [...contentHits, ...pdfHits, ...thoughtHits, ...bookmarkHits, ...projectHits]
    .sort((x, y) => y.score - x.score)
    .slice(0, limit)
}

import { Hono } from 'hono'
import { Prisma } from '../generated/prisma/client/client'
import { prisma } from '../lib/db'
import { adminAuthMiddleware, requireAdminRole } from '../middleware/admin-auth'
import { BadRequestError, NotFoundError } from '../middleware/error'
import { validateBody, validateQuery } from '../middleware/validation'
import { indexPost } from '../lib/semantic-search'
import { generateSlug } from '@blog/utils'
import { invokeChat } from '../lib/llm'
import { fetchBookmarkArticle } from '../lib/bookmark-workflow'
import {
  adminDraftIdeaCreateSchema,
  adminDraftIdeaConversionSchema,
  adminDraftIdeaQuerySchema,
  adminDraftIdeaSourceSchema,
  adminDraftIdeaUpdateSchema,
  type AdminDraftIdeaCreateInput,
  type AdminDraftIdeaConversionInput,
  type AdminDraftIdeaQueryInput,
  type AdminDraftIdeaSourceInput,
  type AdminDraftIdeaUpdateInput,
} from '@blog/validation'

type AdminDraftIdeaVariables = {
  validatedQuery: unknown
  validatedBody: unknown
}

const adminDraftIdeas = new Hono<{ Variables: AdminDraftIdeaVariables }>()

function normalizeTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) return []
  return tags.filter((tag): tag is string => typeof tag === 'string')
}

function extractJsonObject(text: string) {
  const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fencedMatch?.[1]) return fencedMatch[1].trim()
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  return start >= 0 && end > start ? text.slice(start, end + 1) : text.trim()
}

function asString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function asStringArray(value: unknown) {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean)
    .slice(0, 8)
}

function nullableText(value: string | null | undefined) {
  const trimmed = value?.trim()
  return trimmed || null
}

function ideaToResponse(idea: {
  id: string
  title: string
  summary: string | null
  angle: string | null
  notes: string | null
  status: string
  sourceType: string
  sourceId: string | null
  sourceUrl: string | null
  tags: unknown
  priority: number
  postId: string | null
  createdAt: Date
  updatedAt: Date
  user: { id: string; username: string; name: string | null } | null
}) {
  return {
    ...idea,
    tags: normalizeTags(idea.tags),
  }
}

async function findDraftAuthorId() {
  const author = await prisma.user.findFirst({
    where: { role: 'ADMIN' },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  })
  if (author) return author.id

  const fallback = await prisma.user.findFirst({
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  })
  return fallback?.id ?? null
}

async function makeUniqueSlug(title: string) {
  const base = generateSlug(title) || `draft-idea-${Date.now()}`
  const existing = await prisma.post.findUnique({ where: { slug: base } })
  return existing ? `${base}-${Date.now()}` : base
}

function draftContentFromIdea(idea: {
  title: string
  summary: string | null
  angle: string | null
  notes: string | null
  sourceUrl: string | null
  tags: unknown
}) {
  const tags = normalizeTags(idea.tags)
  return [
    `# ${idea.title}`,
    idea.sourceUrl ? `> 文章来源：本文由原文内容整理生成，原文地址：${idea.sourceUrl}` : null,
    idea.summary ? `## Summary\n\n${idea.summary}` : null,
    idea.angle ? `## Angle\n\n${idea.angle}` : null,
    idea.notes ? `## Notes\n\n${idea.notes}` : null,
    tags.length ? `## Tags\n\n${tags.map((tag) => `- ${tag}`).join('\n')}` : null,
    idea.sourceUrl ? `## 文章来源\n\n- 原文地址：${idea.sourceUrl}` : null,
  ]
    .filter(Boolean)
    .join('\n\n')
}

function ideaGenerationSystemPrompt() {
  return [
    '你是一个中文个人博客选题编辑。',
    '请根据网页内容，生成一个适合写成个人博客的草稿灵感。',
    '必须输出严格 JSON，不要 Markdown，不要解释。',
    'JSON 格式：',
    '{"title":"选题标题","summary":"网页核心内容摘要","angle":"适合作者写作的切入角度","notes":"可用于写作的要点列表，使用 Markdown 列表","tags":["标签1","标签2"]}',
    '要求：标题具体，angle 要有个人写作价值，不要只是复述网页。',
  ].join('\n')
}

function articleDraftSystemPrompt() {
  return [
    '你是一名中文博客作者。',
    '请根据草稿灵感和来源材料，生成一篇可继续编辑的 Markdown 草稿。',
    '要求：',
    '1. 结构完整，包含标题、引言、多个二级标题、总结。',
    '2. 用自然中文表达，避免营销腔。',
    '3. 如果来源材料不足，请明确保留“待补充”的小节。',
    '4. 如果提供了来源 URL，文章开头必须包含一行引用说明："> 文章来源：本文由原文内容整理生成，原文地址：URL"。',
    '5. 如果提供了来源 URL，文章末尾必须包含“## 文章来源”小节，并列出原文地址。',
    '6. 只输出 Markdown 正文，不要解释。',
  ].join('\n')
}

function ensureSourceAttribution(content: string, sourceUrl: string | null) {
  if (!sourceUrl) return content
  const hasSourceUrl = content.includes(sourceUrl)
  const sourceIntro = `> 文章来源：本文由原文内容整理生成，原文地址：${sourceUrl}`
  const sourceSection = `## 文章来源\n\n- 原文地址：${sourceUrl}`

  const withIntro = content.includes('文章来源') && hasSourceUrl ? content : `${sourceIntro}\n\n${content}`
  return withIntro.includes('## 文章来源') && withIntro.includes(sourceUrl)
    ? withIntro
    : `${withIntro.trim()}\n\n${sourceSection}`
}

async function generateIdeaFromArticle(input: {
  bookmarkTitle: string
  bookmarkNotes: string | null
  url: string
  pageTitle: string | null
  description: string | null
  text: string | null
  fallbackTags: string[]
}) {
  const sourceText = input.text || input.description || input.bookmarkNotes || input.bookmarkTitle
  const fallback = {
    title: input.pageTitle || input.bookmarkTitle,
    summary: input.description || input.bookmarkNotes || sourceText.slice(0, 800),
    angle: '从这篇网页中提炼一个值得展开的个人观察。',
    notes: [
      input.bookmarkNotes,
      input.text ? input.text.slice(0, 1600) : null,
      `Source: ${input.url}`,
    ].filter(Boolean).join('\n\n'),
    tags: input.fallbackTags,
  }

  if (!sourceText || sourceText.length < 80) return fallback

  try {
    const raw = await invokeChat(
      [
        `网页标题：${input.pageTitle || input.bookmarkTitle}`,
        input.description ? `网页描述：${input.description}` : null,
        input.bookmarkNotes ? `收藏备注：${input.bookmarkNotes}` : null,
        `URL：${input.url}`,
        `正文：\n${sourceText.slice(0, 12_000)}`,
      ].filter(Boolean).join('\n\n'),
      ideaGenerationSystemPrompt(),
      { model: 'reasoning', temperature: 0.7, maxTokens: 1800 }
    )
    const parsed = JSON.parse(extractJsonObject(raw)) as Record<string, unknown>
    return {
      title: asString(parsed.title) || fallback.title,
      summary: asString(parsed.summary) || fallback.summary,
      angle: asString(parsed.angle) || fallback.angle,
      notes: asString(parsed.notes) || fallback.notes,
      tags: asStringArray(parsed.tags).length ? asStringArray(parsed.tags) : fallback.tags,
    }
  } catch (err) {
    console.error('[admin-draft-ideas] AI idea generation failed:', err)
    return fallback
  }
}

async function generateDraftContentFromIdea(idea: {
  title: string
  summary: string | null
  angle: string | null
  notes: string | null
  sourceUrl: string | null
  tags: unknown
}) {
  const fallback = draftContentFromIdea(idea)
  try {
    const generated = await invokeChat(
      [
        `标题：${idea.title}`,
        idea.summary ? `摘要：${idea.summary}` : null,
        idea.angle ? `写作角度：${idea.angle}` : null,
        idea.notes ? `材料和笔记：\n${idea.notes}` : null,
        idea.sourceUrl ? `来源 URL：${idea.sourceUrl}` : null,
        normalizeTags(idea.tags).length ? `标签：${normalizeTags(idea.tags).join(', ')}` : null,
      ].filter(Boolean).join('\n\n'),
      articleDraftSystemPrompt(),
      { model: 'reasoning', temperature: 0.8, maxTokens: 4500 }
    )
    return ensureSourceAttribution(generated, idea.sourceUrl)
  } catch (err) {
    console.error('[admin-draft-ideas] AI draft generation failed:', err)
    return ensureSourceAttribution(fallback, idea.sourceUrl)
  }
}

function draftExcerptFromIdea(idea: { summary: string | null; angle: string | null }) {
  return idea.summary?.slice(0, 500) ?? idea.angle?.slice(0, 500) ?? null
}

adminDraftIdeas.use('*', adminAuthMiddleware, requireAdminRole('ADMIN'))

adminDraftIdeas.get('/', validateQuery(adminDraftIdeaQuerySchema), async (c) => {
  const query = c.get('validatedQuery') as AdminDraftIdeaQueryInput
  const page = query.page || 1
  const limit = query.limit || 20
  const skip = (page - 1) * limit

  const where: Prisma.DraftIdeaWhereInput = {}
  if (query.search) {
    where.OR = [
      { title: { contains: query.search, mode: 'insensitive' } },
      { summary: { contains: query.search, mode: 'insensitive' } },
      { angle: { contains: query.search, mode: 'insensitive' } },
      { notes: { contains: query.search, mode: 'insensitive' } },
    ]
  }
  if (query.status !== 'all') {
    where.status = query.status
  }
  if (query.sourceType !== 'all') {
    where.sourceType = query.sourceType
  }

  const [total, list] = await Promise.all([
    prisma.draftIdea.count({ where }),
    prisma.draftIdea.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ priority: 'asc' }, { updatedAt: 'desc' }],
      include: { user: { select: { id: true, username: true, name: true } } },
    }),
  ])

  return c.json({
    success: true,
    data: list.map(ideaToResponse),
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  })
})

adminDraftIdeas.post('/', validateBody(adminDraftIdeaCreateSchema), async (c) => {
  const body = c.get('validatedBody') as AdminDraftIdeaCreateInput
  const created = await prisma.draftIdea.create({
    data: {
      title: body.title.trim(),
      summary: nullableText(body.summary),
      angle: nullableText(body.angle),
      notes: nullableText(body.notes),
      status: body.status,
      sourceType: body.sourceType,
      sourceId: nullableText(body.sourceId),
      sourceUrl: nullableText(body.sourceUrl),
      tags: body.tags ?? Prisma.JsonNull,
      priority: body.priority,
    },
    include: { user: { select: { id: true, username: true, name: true } } },
  })

  return c.json({ success: true, data: ideaToResponse(created) }, 201)
})

adminDraftIdeas.post('/from-source', validateBody(adminDraftIdeaSourceSchema), async (c) => {
  const body = c.get('validatedBody') as AdminDraftIdeaSourceInput

  if (body.sourceType === 'thought') {
    const thought = await prisma.thought.findUnique({ where: { id: body.sourceId } })
    if (!thought) throw new NotFoundError('Essay not found')

    const title = thought.content.trim().split('\n').find(Boolean)?.slice(0, 80) || 'Untitled essay idea'
    const created = await prisma.draftIdea.create({
      data: {
        title,
        summary: thought.content.slice(0, 1000),
        notes: thought.content,
        sourceType: 'thought',
        sourceId: thought.id,
        priority: 2,
      },
      include: { user: { select: { id: true, username: true, name: true } } },
    })
    return c.json({ success: true, data: ideaToResponse(created) }, 201)
  }

  const bookmark = await prisma.bookmark.findUnique({ where: { id: body.sourceId } })
  if (!bookmark) throw new NotFoundError('Bookmark not found')
  const article = await fetchBookmarkArticle(bookmark.url)
  const generated = await generateIdeaFromArticle({
    bookmarkTitle: bookmark.title,
    bookmarkNotes: bookmark.notes,
    url: article.url || bookmark.url,
    pageTitle: article.title,
    description: article.description,
    text: article.text,
    fallbackTags: normalizeTags(bookmark.tags),
  })

  const created = await prisma.draftIdea.create({
    data: {
      title: generated.title,
      summary: generated.summary,
      angle: generated.angle,
      notes: generated.notes,
      sourceType: 'bookmark',
      sourceId: bookmark.id,
      sourceUrl: article.url || bookmark.url,
      tags: generated.tags.length ? generated.tags : Prisma.JsonNull,
      priority: 2,
    },
    include: { user: { select: { id: true, username: true, name: true } } },
  })
  return c.json({ success: true, data: ideaToResponse(created) }, 201)
})

adminDraftIdeas.patch('/:id', validateBody(adminDraftIdeaUpdateSchema), async (c) => {
  const { id } = c.req.param()
  const body = c.get('validatedBody') as AdminDraftIdeaUpdateInput
  const existing = await prisma.draftIdea.findUnique({ where: { id } })
  if (!existing) throw new NotFoundError('Draft idea not found')

  const updated = await prisma.draftIdea.update({
    where: { id },
    data: {
      title: body.title === undefined ? undefined : body.title.trim(),
      summary: body.summary === undefined ? undefined : nullableText(body.summary),
      angle: body.angle === undefined ? undefined : nullableText(body.angle),
      notes: body.notes === undefined ? undefined : nullableText(body.notes),
      status: body.status,
      sourceType: body.sourceType,
      sourceId: body.sourceId === undefined ? undefined : nullableText(body.sourceId),
      sourceUrl: body.sourceUrl === undefined ? undefined : nullableText(body.sourceUrl),
      tags: body.tags === undefined ? undefined : body.tags,
      priority: body.priority,
    },
    include: { user: { select: { id: true, username: true, name: true } } },
  })

  return c.json({ success: true, data: ideaToResponse(updated) })
})

adminDraftIdeas.post('/:id/convert-to-draft', async (c) => {
  const { id } = c.req.param()
  const body = adminDraftIdeaConversionSchema.parse(await c.req.json().catch(() => ({}))) as AdminDraftIdeaConversionInput
  const idea = await prisma.draftIdea.findUnique({ where: { id } })
  if (!idea) throw new NotFoundError('Draft idea not found')
  if (idea.postId) throw new BadRequestError('Draft idea is already linked to a post.')

  const authorId = await findDraftAuthorId()
  if (!authorId) throw new BadRequestError('Cannot create draft post because no user exists.')

  const post = await prisma.post.create({
    data: {
      title: idea.title,
      slug: await makeUniqueSlug(idea.title),
      excerpt: draftExcerptFromIdea(idea),
      content: body.content ? ensureSourceAttribution(body.content, idea.sourceUrl) : await generateDraftContentFromIdea(idea),
      published: false,
      isFeatured: false,
      authorId,
    },
  })

  await prisma.draftIdea.update({
    where: { id },
    data: { postId: post.id, status: 'writing' },
  })
  indexPost(post.id).catch((err) => console.error('[admin-draft-ideas] index draft failed:', err))

  return c.json({ success: true, data: { id, postId: post.id, slug: post.slug } }, 201)
})

adminDraftIdeas.post('/:id/preview-draft', async (c) => {
  const { id } = c.req.param()
  const idea = await prisma.draftIdea.findUnique({ where: { id } })
  if (!idea) throw new NotFoundError('Draft idea not found')
  if (idea.postId) throw new BadRequestError('Draft idea is already linked to a post.')

  const content = await generateDraftContentFromIdea(idea)
  return c.json({
    success: true,
    data: {
      id,
      title: idea.title,
      excerpt: draftExcerptFromIdea(idea),
      content,
      sourceUrl: idea.sourceUrl,
    },
  })
})

adminDraftIdeas.delete('/:id', async (c) => {
  const { id } = c.req.param()
  const existing = await prisma.draftIdea.findUnique({ where: { id } })
  if (!existing) throw new NotFoundError('Draft idea not found')

  await prisma.draftIdea.delete({ where: { id } })
  return c.json({ success: true, data: { message: 'Draft idea deleted' } })
})

export default adminDraftIdeas

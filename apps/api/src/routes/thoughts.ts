import { Hono } from 'hono'
import { z } from 'zod'
import path from 'node:path'
import { prisma } from '../lib/db'
import { authMiddleware } from '../middleware/auth'
import { rateLimit } from '../middleware/rate-limit'
import { ThoughtsRagAgent } from '../agents/thoughts-rag-agent'
import { saveThoughtImageBuffer } from '../lib/storage'
import { assistThoughtWithQwen } from '../lib/qwen-thought-assist'
import type { JwtPayload } from '../lib/jwt'

type ThoughtVariables = { user: JwtPayload }

const thoughts = new Hono<{ Variables: ThoughtVariables }>()

const MAX_THOUGHT_IMAGE_BYTES = 8 * 1024 * 1024

const ALLOWED_IMAGE_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
])

function extFromMime(mime: string): string {
  if (mime === 'image/jpeg') return '.jpg'
  if (mime === 'image/png') return '.png'
  if (mime === 'image/webp') return '.webp'
  if (mime === 'image/gif') return '.gif'
  return ''
}

function extFromFilename(name: string): string {
  const e = path.extname(name).toLowerCase()
  if (['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(e)) {
    return e === '.jpeg' ? '.jpg' : e
  }
  return ''
}
const rag = new ThoughtsRagAgent()

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
})

// GET /thoughts?page=1&limit=10
thoughts.get('/', async (c) => {
  const parsed = listQuerySchema.safeParse({
    page: c.req.query('page'),
    limit: c.req.query('limit'),
  })
  if (!parsed.success) {
    return c.json(
      { success: false, error: parsed.error.flatten().fieldErrors },
      400
    )
  }

  const { page, limit } = parsed.data
  const skip = (page - 1) * limit

  const [total, list] = await Promise.all([
    prisma.thought.count(),
    prisma.thought.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: { id: true, name: true, username: true, avatar: true } },
      },
    }),
  ])

  const data = list.map((t) => {
    const authorName = t.author?.name || t.author?.username || '我'
    const avatar = t.author?.avatar || '/images/avatar/avatar-pink.png'
    const images = Array.isArray(t.images) ? (t.images as unknown as string[]) : []
    return {
      id: t.id,
      authorId: t.authorId,
      avatar,
      authorName,
      date: t.createdAt.toISOString().slice(0, 10),
      content: t.content,
      images,
      likeCount: t.likeCount,
      commentCount: t.commentCount,
    }
  })

  return c.json({
    success: true,
    data,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  })
})

const createSchema = z.object({
  content: z.string().min(1).max(20000),
  images: z.array(z.string().min(1)).max(20).optional(),
})

// POST /thoughts
thoughts.post('/', authMiddleware, async (c) => {
  const json = await c.req.json().catch(() => null)
  const parsed = createSchema.safeParse(json)
  if (!parsed.success) {
    return c.json(
      { success: false, error: parsed.error.flatten().fieldErrors },
      400
    )
  }

  const { content, images } = parsed.data
  const { userId } = c.get('user')

  const thought = await prisma.thought.create({
    data: {
      authorId: userId,
      content,
      images: images ?? [],
    },
    include: {
      author: { select: { id: true, name: true, username: true, avatar: true } },
    },
  })

  rag.indexThought(thought.id).catch((err) =>
    console.error('[thoughts] indexThought failed:', err)
  )

  return c.json({ success: true, data: thought }, 201)
})

const semanticQuerySchema = z.object({
  q: z.string().min(1, '搜索关键词不能为空').max(500),
  limit: z.coerce.number().int().min(1).max(20).default(10),
})

// GET /thoughts/semantic?q=...&limit=10
thoughts.get('/semantic', async (c) => {
  const parsed = semanticQuerySchema.safeParse({
    q: c.req.query('q'),
    limit: c.req.query('limit'),
  })
  if (!parsed.success) {
    return c.json(
      { success: false, error: parsed.error.flatten().fieldErrors },
      400
    )
  }

  const { q, limit } = parsed.data
  try {
    const hits = await rag.search(q, limit)
    return c.json({ success: true, data: hits })
  } catch (err) {
    const message = err instanceof Error ? err.message : '语义搜索失败'
    return c.json({ success: false, error: message }, 500)
  }
})

const ragAnswerSchema = z.object({
  query: z.string().min(1).max(500),
  limit: z.number().int().min(1).max(20).optional(),
})

// POST /thoughts/rag
thoughts.post('/rag', async (c) => {
  const json = await c.req.json().catch(() => null)
  const parsed = ragAnswerSchema.safeParse(json)
  if (!parsed.success) {
    return c.json(
      { success: false, error: parsed.error.flatten().fieldErrors },
      400
    )
  }

  try {
    const res = await rag.answer(parsed.data.query, parsed.data.limit ?? 6)
    return c.json({ success: true, data: res })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'RAG 失败'
    return c.json({ success: false, error: message }, 500)
  }
})

// POST /thoughts/images — 思考配图，存 uploads/thoughts/
thoughts.post(
  '/images',
  rateLimit({ windowMs: 60_000, max: 30, message: '上传过于频繁，请稍后再试' }),
  authMiddleware,
  async (c) => {
    const form = await c.req.formData()
    const file = form.get('file')
    if (!(file instanceof File)) {
      return c.json({ success: false, error: '缺少文件：file' }, 400)
    }
    const mime = (file.type || '').toLowerCase()
    if (mime && !ALLOWED_IMAGE_MIME.has(mime)) {
      return c.json({ success: false, error: '仅支持 JPEG / PNG / WebP / GIF' }, 400)
    }
    if (file.size <= 0 || file.size > MAX_THOUGHT_IMAGE_BYTES) {
      return c.json(
        { success: false, error: `图片大小需在 1B～${MAX_THOUGHT_IMAGE_BYTES / 1024 / 1024}MB 之间` },
        400
      )
    }
    let ext = mime ? extFromMime(mime) : ''
    if (!ext) ext = extFromFilename(file.name || '')
    if (!ext) ext = '.jpg'

    const buf = Buffer.from(await file.arrayBuffer())
    try {
      const url = await saveThoughtImageBuffer(buf, ext)
      return c.json({ success: true, data: { url } })
    } catch (e) {
      const message = e instanceof Error ? e.message : '上传失败'
      return c.json({ success: false, error: message }, 500)
    }
  }
)

const assistSchema = z.object({
  mode: z.enum(['generate', 'polish']),
  keywords: z.string().max(500).default(''),
  draft: z.string().max(20000).optional(),
})

// POST /thoughts/ai/assist — 千问辅助生成或润色正文
thoughts.post(
  '/ai/assist',
  rateLimit({ windowMs: 60_000, max: 20, message: 'AI 请求过于频繁，请稍后再试' }),
  authMiddleware,
  async (c) => {
    const json = await c.req.json().catch(() => null)
    const parsed = assistSchema.safeParse(json)
    if (!parsed.success) {
      return c.json(
        { success: false, error: parsed.error.flatten().fieldErrors },
        400
      )
    }
    try {
      const text = await assistThoughtWithQwen({
        mode: parsed.data.mode,
        keywords: parsed.data.keywords,
        draft: parsed.data.draft,
      })
      return c.json({ success: true, data: { text } })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'AI 生成失败'
      return c.json({ success: false, error: message }, 500)
    }
  }
)

// GET /thoughts/:id
thoughts.get('/:id', async (c) => {
  const { id } = c.req.param()
  const thought = await prisma.thought.findUnique({
    where: { id },
    include: { author: { select: { id: true, name: true, username: true, avatar: true } } },
  })
  if (!thought) return c.json({ success: false, error: 'Thought not found' }, 404)
  return c.json({ success: true, data: thought })
})

const updateSchema = z.object({
  content: z.string().min(1).max(20000).optional(),
  images: z.array(z.string().min(1)).max(20).optional(),
  likeCount: z.number().int().min(0).optional(),
  commentCount: z.number().int().min(0).optional(),
})

// PATCH /thoughts/:id
thoughts.patch('/:id', authMiddleware, async (c) => {
  const { id } = c.req.param()
  const json = await c.req.json().catch(() => null)
  const parsed = updateSchema.safeParse(json)
  if (!parsed.success) {
    return c.json(
      { success: false, error: parsed.error.flatten().fieldErrors },
      400
    )
  }

  const existing = await prisma.thought.findUnique({
    where: { id },
    select: { id: true, authorId: true },
  })
  if (!existing) return c.json({ success: false, error: 'Thought not found' }, 404)

  const { userId, role } = c.get('user')
  if (existing.authorId && existing.authorId !== userId && role !== 'ADMIN') {
    return c.json({ success: false, error: 'You can only edit your own thoughts' }, 403)
  }

  const updated = await prisma.thought.update({
    where: { id },
    data: {
      ...(parsed.data.content !== undefined ? { content: parsed.data.content } : {}),
      ...(parsed.data.images !== undefined ? { images: parsed.data.images } : {}),
      ...(parsed.data.likeCount !== undefined ? { likeCount: parsed.data.likeCount } : {}),
      ...(parsed.data.commentCount !== undefined ? { commentCount: parsed.data.commentCount } : {}),
    },
  })

  if (parsed.data.content !== undefined) {
    rag.indexThought(id).catch((err) =>
      console.error('[thoughts] indexThought failed:', err)
    )
  }

  return c.json({ success: true, data: updated })
})

// DELETE /thoughts/:id
thoughts.delete('/:id', authMiddleware, async (c) => {
  const { id } = c.req.param()
  const existing = await prisma.thought.findUnique({
    where: { id },
    select: { id: true, authorId: true },
  })
  if (!existing) return c.json({ success: false, error: 'Thought not found' }, 404)

  const { userId, role } = c.get('user')
  if (existing.authorId && existing.authorId !== userId && role !== 'ADMIN') {
    return c.json({ success: false, error: 'You can only delete your own thoughts' }, 403)
  }

  await rag.removeThoughtFromIndex(id).catch((err) =>
    console.error('[thoughts] removeThoughtFromIndex failed:', err)
  )
  await prisma.thought.delete({ where: { id } })

  return c.json({ success: true, data: { message: 'Thought deleted successfully' } })
})

export default thoughts


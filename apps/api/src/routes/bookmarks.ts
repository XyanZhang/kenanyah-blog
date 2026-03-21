import { Hono } from 'hono'
import { Prisma } from '../generated/prisma/client/client'
import { prisma } from '../lib/db'
import { validateBody } from '../middleware/validation'
import {
  createBookmarkSchema,
  updateBookmarkSchema,
  bookmarkSyncSchema,
  type CreateBookmarkInput,
  type UpdateBookmarkInput,
  type BookmarkSyncInput,
} from '@blog/validation'
import { NotFoundError } from '../middleware/error'

type BookmarkVariables = {
  validatedBody?: unknown
}

const bookmarks = new Hono<{ Variables: BookmarkVariables }>()

function bookmarkToResponse(b: {
  id: string
  title: string
  url: string
  notes: string | null
  category: string | null
  tags: unknown
  source: string
  favicon: string | null
  createdAt: Date
  updatedAt: Date
}) {
  return {
    id: b.id,
    title: b.title,
    url: b.url,
    notes: b.notes,
    category: b.category,
    tags: b.tags,
    source: b.source,
    favicon: b.favicon,
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
  }
}

// GET /bookmarks — 列表，支持 category、limit、offset
bookmarks.get('/', async (c) => {
  const category = c.req.query('category')
  const limit = c.req.query('limit')
  const offset = c.req.query('offset')
  const limitNum = limit ? Math.min(Math.max(1, parseInt(limit, 10)), 100) : 50
  const offsetNum = offset ? Math.max(0, parseInt(offset, 10)) : 0

  const where = category ? { category } : {}

  const [items, total] = await Promise.all([
    prisma.bookmark.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limitNum,
      skip: offsetNum,
    }),
    prisma.bookmark.count({ where }),
  ])

  return c.json({
    success: true,
    data: items.map(bookmarkToResponse),
    meta: { total, limit: limitNum, offset: offsetNum },
  })
})

// POST /bookmarks/sync — 插件批量同步（upsert by url），需在 /:id 之前
bookmarks.post('/sync', validateBody(bookmarkSyncSchema), async (c) => {
  const body = c.get('validatedBody') as BookmarkSyncInput
  const results: { url: string; created: boolean; id: string }[] = []

  for (const item of body.items) {
    const existing = await prisma.bookmark.findUnique({
      where: { url: item.url },
    })

    const data = {
      title: item.title.trim(),
      url: item.url,
      notes: item.notes?.trim() || null,
      category: item.category?.trim() || null,
      tags: item.tags ?? Prisma.JsonNull,
      favicon: item.favicon?.trim() || null,
      source: 'browser_extension' as const,
    }

    if (existing) {
      const updated = await prisma.bookmark.update({
        where: { id: existing.id },
        data,
      })
      results.push({ url: item.url, created: false, id: updated.id })
    } else {
      const created = await prisma.bookmark.create({
        data,
      })
      results.push({ url: item.url, created: true, id: created.id })
    }
  }

  return c.json({
    success: true,
    data: { results },
  })
})

// POST /bookmarks — 创建
bookmarks.post('/', validateBody(createBookmarkSchema), async (c) => {
  const body = c.get('validatedBody') as CreateBookmarkInput

  const created = await prisma.bookmark.create({
    data: {
      title: body.title.trim(),
      url: body.url,
      notes: body.notes?.trim() || null,
      category: body.category?.trim() || null,
      tags: body.tags ?? Prisma.JsonNull,
      source: body.source ?? 'manual',
      favicon: body.favicon?.trim() || null,
    },
  })

  return c.json({
    success: true,
    data: bookmarkToResponse(created),
  })
})

// PATCH /bookmarks/:id — 更新
bookmarks.patch('/:id', validateBody(updateBookmarkSchema), async (c) => {
  const id = c.req.param('id')
  const body = c.get('validatedBody') as UpdateBookmarkInput

  const existing = await prisma.bookmark.findUnique({ where: { id } })
  if (!existing) throw new NotFoundError('收藏不存在')

  const updateData: {
    title?: string
    url?: string
    notes?: string | null
    category?: string | null
    tags?: string[] | typeof Prisma.JsonNull
    favicon?: string | null
  } = {}
  if (body.title !== undefined) updateData.title = body.title.trim()
  if (body.url !== undefined) updateData.url = body.url
  if (body.notes !== undefined) updateData.notes = body.notes?.trim() || null
  if (body.category !== undefined) updateData.category = body.category?.trim() || null
  if (body.tags !== undefined) updateData.tags = body.tags ?? Prisma.JsonNull
  if (body.favicon !== undefined) updateData.favicon = body.favicon?.trim() || null

  const updated = await prisma.bookmark.update({
    where: { id },
    data: updateData,
  })

  return c.json({
    success: true,
    data: bookmarkToResponse(updated),
  })
})

// DELETE /bookmarks/:id
bookmarks.delete('/:id', async (c) => {
  const id = c.req.param('id')
  const existing = await prisma.bookmark.findUnique({ where: { id } })
  if (!existing) throw new NotFoundError('收藏不存在')

  await prisma.bookmark.delete({ where: { id } })
  return c.json({ success: true })
})

export default bookmarks

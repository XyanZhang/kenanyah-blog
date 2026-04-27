import { Hono } from 'hono'
import { Prisma } from '../generated/prisma/client/client'
import { prisma } from '../lib/db'
import { adminAuthMiddleware, requireAdminRole } from '../middleware/admin-auth'
import { ConflictError, NotFoundError } from '../middleware/error'
import { validateBody, validateQuery } from '../middleware/validation'
import {
  adminBookmarkQuerySchema,
  createBookmarkSchema,
  updateBookmarkSchema,
  type AdminBookmarkQueryInput,
  type CreateBookmarkInput,
  type UpdateBookmarkInput,
} from '@blog/validation'

type AdminBookmarkVariables = {
  validatedQuery: unknown
  validatedBody: unknown
}

const adminBookmarks = new Hono<{ Variables: AdminBookmarkVariables }>()

function normalizeTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) return []
  return tags.filter((tag): tag is string => typeof tag === 'string')
}

function bookmarkToResponse(bookmark: {
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
    ...bookmark,
    tags: normalizeTags(bookmark.tags),
  }
}

adminBookmarks.use('*', adminAuthMiddleware, requireAdminRole('ADMIN'))

adminBookmarks.get('/', validateQuery(adminBookmarkQuerySchema), async (c) => {
  const query = c.get('validatedQuery') as AdminBookmarkQueryInput
  const page = query.page || 1
  const limit = query.limit || 20
  const skip = (page - 1) * limit

  const where: Prisma.BookmarkWhereInput = {}
  if (query.search) {
    where.OR = [
      { title: { contains: query.search, mode: 'insensitive' } },
      { url: { contains: query.search, mode: 'insensitive' } },
      { notes: { contains: query.search, mode: 'insensitive' } },
      { category: { contains: query.search, mode: 'insensitive' } },
    ]
  }
  if (query.category) {
    where.category = query.category
  }
  if (query.source !== 'all') {
    where.source = query.source
  }

  const [total, list] = await Promise.all([
    prisma.bookmark.count({ where }),
    prisma.bookmark.findMany({
      where,
      skip,
      take: limit,
      orderBy: { updatedAt: 'desc' },
    }),
  ])

  return c.json({
    success: true,
    data: list.map(bookmarkToResponse),
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  })
})

adminBookmarks.post('/', validateBody(createBookmarkSchema), async (c) => {
  const body = c.get('validatedBody') as CreateBookmarkInput
  const existing = await prisma.bookmark.findUnique({ where: { url: body.url } })
  if (existing) {
    throw new ConflictError('Bookmark URL already exists')
  }

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

adminBookmarks.patch('/:id', validateBody(updateBookmarkSchema), async (c) => {
  const { id } = c.req.param()
  const body = c.get('validatedBody') as UpdateBookmarkInput

  const existing = await prisma.bookmark.findUnique({ where: { id } })
  if (!existing) {
    throw new NotFoundError('Bookmark not found')
  }

  if (body.url && body.url !== existing.url) {
    const urlOwner = await prisma.bookmark.findUnique({ where: { url: body.url } })
    if (urlOwner) {
      throw new ConflictError('Bookmark URL already exists')
    }
  }

  const updated = await prisma.bookmark.update({
    where: { id },
    data: {
      title: body.title === undefined ? undefined : body.title.trim(),
      url: body.url,
      notes: body.notes === undefined ? undefined : body.notes?.trim() || null,
      category: body.category === undefined ? undefined : body.category?.trim() || null,
      tags: body.tags === undefined ? undefined : body.tags ?? Prisma.JsonNull,
      favicon: body.favicon === undefined ? undefined : body.favicon?.trim() || null,
    },
  })

  return c.json({
    success: true,
    data: bookmarkToResponse(updated),
  })
})

adminBookmarks.delete('/:id', async (c) => {
  const { id } = c.req.param()
  const existing = await prisma.bookmark.findUnique({ where: { id } })
  if (!existing) {
    throw new NotFoundError('Bookmark not found')
  }

  await prisma.bookmark.delete({ where: { id } })
  return c.json({ success: true, data: { message: 'Bookmark deleted' } })
})

export default adminBookmarks

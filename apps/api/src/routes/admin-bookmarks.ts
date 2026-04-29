import { Hono } from 'hono'
import { Prisma } from '../generated/prisma/client/client'
import { prisma } from '../lib/db'
import { adminAuthMiddleware, requireAdminRole } from '../middleware/admin-auth'
import { BadRequestError, ConflictError, NotFoundError } from '../middleware/error'
import { validateBody, validateQuery } from '../middleware/validation'
import {
  bookmarkConversionSchema,
  bookmarkMetadataSchema,
  adminBookmarkQuerySchema,
  createBookmarkSchema,
  updateBookmarkSchema,
  type BookmarkConversionInput,
  type BookmarkMetadataInput,
  type AdminBookmarkQueryInput,
  type CreateBookmarkInput,
  type UpdateBookmarkInput,
} from '@blog/validation'
import { generateSlug } from '@blog/utils'
import { ThoughtsRagAgent } from '../agents/thoughts-rag-agent'
import {
  bookmarkToDraftContent,
  bookmarkToThoughtContent,
  checkBookmarkLink,
  fetchBookmarkMetadata,
} from '../lib/bookmark-workflow'
import { indexPost } from '../lib/semantic-search'

type AdminBookmarkVariables = {
  validatedQuery: unknown
  validatedBody: unknown
}

const adminBookmarks = new Hono<{ Variables: AdminBookmarkVariables }>()
const rag = new ThoughtsRagAgent()

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

async function makeUniqueSlug(title: string) {
  const base = generateSlug(title) || `bookmark-draft-${Date.now()}`
  const existing = await prisma.post.findUnique({ where: { slug: base } })
  return existing ? `${base}-${Date.now()}` : base
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
  const existing = await prisma.bookmark.findUnique({
    where: { url: body.url },
  })
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

adminBookmarks.get('/metadata', async (c) => {
  const parsed = bookmarkMetadataSchema.safeParse({ url: c.req.query('url') })
  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.flatten().fieldErrors }, 400)
  }

  const { url } = parsed.data as BookmarkMetadataInput
  const [metadata, existing] = await Promise.all([
    fetchBookmarkMetadata(url),
    prisma.bookmark.findUnique({ where: { url } }),
  ])

  return c.json({
    success: true,
    data: {
      ...metadata,
      duplicate: existing ? bookmarkToResponse(existing) : null,
    },
  })
})

adminBookmarks.post('/:id/enrich', async (c) => {
  const { id } = c.req.param()
  const existing = await prisma.bookmark.findUnique({ where: { id } })
  if (!existing) {
    throw new NotFoundError('Bookmark not found')
  }

  const metadata = await fetchBookmarkMetadata(existing.url)
  const updated = await prisma.bookmark.update({
    where: { id },
    data: {
      title: metadata.title || existing.title,
      notes: existing.notes || metadata.description,
      favicon: metadata.favicon || existing.favicon,
    },
  })

  return c.json({ success: true, data: bookmarkToResponse(updated) })
})

adminBookmarks.get('/:id/check', async (c) => {
  const { id } = c.req.param()
  const existing = await prisma.bookmark.findUnique({ where: { id } })
  if (!existing) {
    throw new NotFoundError('Bookmark not found')
  }

  return c.json({
    success: true,
    data: await checkBookmarkLink(existing.url),
  })
})

adminBookmarks.post('/:id/convert', validateBody(bookmarkConversionSchema), async (c) => {
  const { id } = c.req.param()
  const body = c.get('validatedBody') as BookmarkConversionInput
  const existing = await prisma.bookmark.findUnique({ where: { id } })
  if (!existing) {
    throw new NotFoundError('Bookmark not found')
  }

  if (body.target === 'thought') {
    const thought = await prisma.thought.create({
      data: {
        content: bookmarkToThoughtContent(existing),
        images: [],
      },
    })
    rag.indexThought(thought.id).catch((err) => {
      console.error('[admin-bookmarks] index converted thought failed:', err)
    })
    return c.json({ success: true, data: { target: body.target, id: thought.id } }, 201)
  }

  const authorId = await findDraftAuthorId()
  if (!authorId) {
    throw new BadRequestError('Cannot create draft post because no user exists.')
  }

  const post = await prisma.post.create({
    data: {
      title: existing.title,
      slug: await makeUniqueSlug(existing.title),
      excerpt: existing.notes?.slice(0, 500) ?? `Draft from bookmark: ${existing.url}`,
      content: bookmarkToDraftContent(existing),
      published: false,
      isFeatured: false,
      authorId,
    },
  })
  indexPost(post.id).catch((err) => {
    console.error('[admin-bookmarks] index converted draft failed:', err)
  })

  return c.json(
    {
      success: true,
      data: { target: body.target, id: post.id, slug: post.slug },
    },
    201
  )
})

adminBookmarks.patch('/:id', validateBody(updateBookmarkSchema), async (c) => {
  const { id } = c.req.param()
  const body = c.get('validatedBody') as UpdateBookmarkInput

  const existing = await prisma.bookmark.findUnique({ where: { id } })
  if (!existing) {
    throw new NotFoundError('Bookmark not found')
  }

  if (body.url && body.url !== existing.url) {
    const urlOwner = await prisma.bookmark.findUnique({
      where: { url: body.url },
    })
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
      tags: body.tags === undefined ? undefined : (body.tags ?? Prisma.JsonNull),
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

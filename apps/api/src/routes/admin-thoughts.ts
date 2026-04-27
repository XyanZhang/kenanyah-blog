import { Hono } from 'hono'
import { Prisma } from '../generated/prisma/client/client'
import { ThoughtsRagAgent } from '../agents/thoughts-rag-agent'
import { prisma } from '../lib/db'
import { removeEventsForSource, syncThoughtEvent } from '../lib/calendar-events'
import { adminAuthMiddleware, requireAdminRole } from '../middleware/admin-auth'
import { NotFoundError } from '../middleware/error'
import { validateBody, validateQuery } from '../middleware/validation'
import {
  adminThoughtCreateSchema,
  adminThoughtQuerySchema,
  adminThoughtUpdateSchema,
  type AdminThoughtCreateInput,
  type AdminThoughtQueryInput,
  type AdminThoughtUpdateInput,
} from '@blog/validation'

type AdminThoughtVariables = {
  validatedQuery: unknown
  validatedBody: unknown
}

const adminThoughts = new Hono<{ Variables: AdminThoughtVariables }>()
const rag = new ThoughtsRagAgent()

function normalizeImages(images: unknown): string[] {
  if (!Array.isArray(images)) return []
  return images.filter((image): image is string => typeof image === 'string')
}

function thoughtToResponse(thought: {
  id: string
  authorId: string | null
  content: string
  images: unknown
  likeCount: number
  commentCount: number
  createdAt: Date
  updatedAt: Date
  author: {
    id: string
    username: string
    name: string | null
    avatar: string | null
  } | null
}) {
  return {
    ...thought,
    images: normalizeImages(thought.images),
  }
}

adminThoughts.use('*', adminAuthMiddleware, requireAdminRole('ADMIN'))

adminThoughts.get('/', validateQuery(adminThoughtQuerySchema), async (c) => {
  const query = c.get('validatedQuery') as AdminThoughtQueryInput
  const page = query.page || 1
  const limit = query.limit || 20
  const skip = (page - 1) * limit

  const where: Prisma.ThoughtWhereInput = {}
  if (query.search) {
    where.content = { contains: query.search, mode: 'insensitive' }
  }

  const [total, list] = await Promise.all([
    prisma.thought.count({ where }),
    prisma.thought.findMany({
      where,
      skip,
      take: limit,
      orderBy: { updatedAt: 'desc' },
      include: {
        author: { select: { id: true, username: true, name: true, avatar: true } },
      },
    }),
  ])

  return c.json({
    success: true,
    data: list.map(thoughtToResponse),
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  })
})

adminThoughts.post('/', validateBody(adminThoughtCreateSchema), async (c) => {
  const body = c.get('validatedBody') as AdminThoughtCreateInput
  const created = await prisma.thought.create({
    data: {
      content: body.content.trim(),
      images: body.images ?? [],
      likeCount: body.likeCount ?? 0,
      commentCount: body.commentCount ?? 0,
    },
    include: {
      author: { select: { id: true, username: true, name: true, avatar: true } },
    },
  })

  rag.indexThought(created.id).catch((err) => {
    console.error('[admin-thoughts] index thought failed:', err)
  })

  return c.json({ success: true, data: thoughtToResponse(created) }, 201)
})

adminThoughts.patch('/:id', validateBody(adminThoughtUpdateSchema), async (c) => {
  const { id } = c.req.param()
  const body = c.get('validatedBody') as AdminThoughtUpdateInput
  const existing = await prisma.thought.findUnique({ where: { id } })
  if (!existing) {
    throw new NotFoundError('Thought not found')
  }

  const updated = await prisma.thought.update({
    where: { id },
    data: {
      content: body.content === undefined ? undefined : body.content.trim(),
      images: body.images === undefined ? undefined : body.images,
      likeCount: body.likeCount,
      commentCount: body.commentCount,
    },
    include: {
      author: { select: { id: true, username: true, name: true, avatar: true } },
    },
  })

  if (body.content !== undefined) {
    rag.indexThought(id).catch((err) => {
      console.error('[admin-thoughts] index thought failed:', err)
    })
  }
  syncThoughtEvent(updated).catch((err) => {
    console.error('[admin-thoughts] sync thought event failed:', err)
  })

  return c.json({ success: true, data: thoughtToResponse(updated) })
})

adminThoughts.delete('/:id', async (c) => {
  const { id } = c.req.param()
  const existing = await prisma.thought.findUnique({ where: { id } })
  if (!existing) {
    throw new NotFoundError('Thought not found')
  }

  await rag.removeThoughtFromIndex(id).catch((err) => {
    console.error('[admin-thoughts] remove thought index failed:', err)
  })
  await removeEventsForSource('thought', id).catch((err) => {
    console.error('[admin-thoughts] remove thought events failed:', err)
  })
  await prisma.thought.delete({ where: { id } })

  return c.json({ success: true, data: { message: 'Thought deleted' } })
})

export default adminThoughts

import { Hono } from 'hono'
import { Prisma } from '../generated/prisma/client/client'
import { prisma } from '../lib/db'
import {
  dateStringToUtcDate,
  removeEventsForSource,
  serializeProjectEntry,
  syncProjectEvent,
} from '../lib/calendar-events'
import { adminAuthMiddleware, requireAdminRole } from '../middleware/admin-auth'
import { NotFoundError } from '../middleware/error'
import { validateBody, validateQuery } from '../middleware/validation'
import {
  adminProjectCreateSchema,
  adminProjectQuerySchema,
  adminProjectUpdateSchema,
  type AdminProjectCreateInput,
  type AdminProjectQueryInput,
  type AdminProjectUpdateInput,
} from '@blog/validation'

type AdminProjectVariables = {
  validatedQuery: unknown
  validatedBody: unknown
}

const adminProjects = new Hono<{ Variables: AdminProjectVariables }>()

function normalizeTags(tags: string[] | undefined): string[] {
  return [...new Set((tags ?? []).map((tag) => tag.trim()).filter(Boolean))]
}

function nullableText(value: string | null | undefined): string | null | undefined {
  if (value === undefined) return undefined
  return value?.trim() || null
}

function buildCreateData(body: AdminProjectCreateInput): Prisma.ProjectEntryUncheckedCreateInput {
  return {
    title: body.title.trim(),
    description: nullableText(body.description) ?? null,
    href: nullableText(body.href) ?? null,
    coverImage: nullableText(body.coverImage) ?? null,
    category: nullableText(body.category) ?? null,
    tags: normalizeTags(body.tags),
    status: body.status,
    startedAt: body.date ? dateStringToUtcDate(body.date) : null,
  }
}

function buildUpdateData(body: AdminProjectUpdateInput): Prisma.ProjectEntryUncheckedUpdateInput {
  return {
    title: body.title === undefined ? undefined : body.title.trim(),
    description: nullableText(body.description),
    href: nullableText(body.href),
    coverImage: nullableText(body.coverImage),
    category: nullableText(body.category),
    tags: body.tags === undefined ? undefined : normalizeTags(body.tags),
    status: body.status,
    startedAt: body.date === undefined ? undefined : body.date ? dateStringToUtcDate(body.date) : null,
  }
}

adminProjects.use('*', adminAuthMiddleware, requireAdminRole('ADMIN'))

adminProjects.get('/', validateQuery(adminProjectQuerySchema), async (c) => {
  const query = c.get('validatedQuery') as AdminProjectQueryInput
  const page = query.page || 1
  const limit = query.limit || 20
  const skip = (page - 1) * limit

  const where: Prisma.ProjectEntryWhereInput = {}
  if (query.search) {
    where.OR = [
      { title: { contains: query.search, mode: 'insensitive' } },
      { description: { contains: query.search, mode: 'insensitive' } },
      { href: { contains: query.search, mode: 'insensitive' } },
      { category: { contains: query.search, mode: 'insensitive' } },
    ]
  }
  if (query.status !== 'all') {
    where.status = query.status
  }
  if (query.category) {
    where.category = query.category
  }

  const [total, list] = await Promise.all([
    prisma.projectEntry.count({ where }),
    prisma.projectEntry.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ startedAt: 'desc' }, { updatedAt: 'desc' }],
    }),
  ])

  return c.json({
    success: true,
    data: list.map(serializeProjectEntry),
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  })
})

adminProjects.post('/', validateBody(adminProjectCreateSchema), async (c) => {
  const body = c.get('validatedBody') as AdminProjectCreateInput
  const created = await prisma.projectEntry.create({
    data: buildCreateData(body),
  })

  await syncProjectEvent(created)

  return c.json({ success: true, data: serializeProjectEntry(created) }, 201)
})

adminProjects.patch('/:id', validateBody(adminProjectUpdateSchema), async (c) => {
  const { id } = c.req.param()
  const existing = await prisma.projectEntry.findUnique({ where: { id } })
  if (!existing) {
    throw new NotFoundError('Project not found')
  }

  const body = c.get('validatedBody') as AdminProjectUpdateInput
  const updated = await prisma.projectEntry.update({
    where: { id },
    data: buildUpdateData(body),
  })

  await syncProjectEvent(updated)

  return c.json({ success: true, data: serializeProjectEntry(updated) })
})

adminProjects.delete('/:id', async (c) => {
  const { id } = c.req.param()
  const existing = await prisma.projectEntry.findUnique({ where: { id } })
  if (!existing) {
    throw new NotFoundError('Project not found')
  }

  await removeEventsForSource('project', id)
  await prisma.projectEntry.delete({ where: { id } })

  return c.json({ success: true, data: { message: 'Project deleted' } })
})

export default adminProjects

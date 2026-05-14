import { Hono } from 'hono'
import { z } from 'zod'
import {
  createPlanItemSchema,
  createPlanShareLinkSchema,
  createPlanSpaceSchema,
  planItemQuerySchema,
  planSpaceQuerySchema,
  updatePlanItemSchema,
  updatePlanSpaceSchema,
  type CreatePlanItemInput,
  type CreatePlanShareLinkInput,
  type CreatePlanSpaceInput,
  type PlanItemQueryInput,
  type PlanSpaceQueryInput,
  type UpdatePlanItemInput,
  type UpdatePlanSpaceInput,
} from '@blog/validation'
import { prisma } from '../lib/db'
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth'
import { ForbiddenError, NotFoundError } from '../middleware/error'
import { validateBody, validateParams, validateQuery } from '../middleware/validation'
import { dateStringToUtcDate } from '../lib/calendar-events'
import {
  buildPlanItemWhere,
  createShareToken,
  deleteSyncedMilestone,
  serializePlanItem,
  serializePlanShareLink,
  serializePlanSpace,
  syncPlanItemMilestone,
} from '../lib/plan-spaces'

type PlanVariables = {
  user?: { userId: string }
  validatedQuery?: unknown
  validatedBody?: unknown
  validatedParams?: unknown
}

const idParamsSchema = z.object({
  id: z.string().min(1),
})

const itemParamsSchema = z.object({
  id: z.string().min(1),
  itemId: z.string().min(1),
})

const tokenParamsSchema = z.object({
  token: z.string().min(8),
})

const shareItemParamsSchema = z.object({
  token: z.string().min(8),
  itemId: z.string().min(1),
})

const planSpaces = new Hono<{ Variables: PlanVariables }>()

planSpaces.get('/', authMiddleware, validateQuery(planSpaceQuerySchema), async (c) => {
  const { userId } = c.get('user')!
  const query = (c.get('validatedQuery') ?? {}) as PlanSpaceQueryInput
  const spaces = await prisma.planSpace.findMany({
    where: {
      ownerId: userId,
      ...(query.status ? { status: query.status } : {}),
    },
    include: {
      items: true,
      shareLinks: true,
    },
    orderBy: [{ updatedAt: 'desc' }],
  })

  return c.json({
    success: true,
    data: spaces.map((space) => {
      const serialized = serializePlanSpace(space)
      return { ...serialized, items: undefined, shareLinks: undefined }
    }),
  })
})

planSpaces.post('/', authMiddleware, validateBody(createPlanSpaceSchema), async (c) => {
  const { userId } = c.get('user')!
  const body = c.get('validatedBody') as CreatePlanSpaceInput
  const shareToken = createShareToken()

  const space = await prisma.planSpace.create({
    data: {
      ownerId: userId,
      title: body.title.trim(),
      type: body.type.trim(),
      icon: body.icon.trim(),
      description: body.description?.trim() || null,
      status: body.status,
      startDate: body.startDate ? dateStringToUtcDate(body.startDate) : null,
      endDate: body.endDate ? dateStringToUtcDate(body.endDate) : null,
      collaborationOn: body.collaborationOn,
      shareToken,
      shareLinks: {
        create: {
          token: shareToken,
          permission: 'edit',
        },
      },
    },
    include: {
      items: true,
      shareLinks: true,
    },
  })

  return c.json({ success: true, data: serializePlanSpace(space) }, 201)
})

planSpaces.get('/share/:token', optionalAuthMiddleware, validateParams(tokenParamsSchema), async (c) => {
  const { token } = c.get('validatedParams') as { token: string }
  const access = await getShareAccess(token)
  return c.json({
    success: true,
    data: {
      space: serializePlanSpace(access.space),
      permission: access.permission,
    },
  })
})

planSpaces.post('/share/:token/items', validateParams(tokenParamsSchema), validateBody(createPlanItemSchema), async (c) => {
  const { token } = c.get('validatedParams') as { token: string }
  const body = c.get('validatedBody') as CreatePlanItemInput
  const access = await getShareAccess(token)
  assertCanEditShare(access.permission)

  const item = await createPlanItem(access.space.id, body)
  await syncPlanItemMilestone(item)
  const refreshed = await prisma.planItem.findUniqueOrThrow({ where: { id: item.id } })

  return c.json({ success: true, data: serializePlanItem(refreshed) }, 201)
})

planSpaces.patch('/share/:token/items/:itemId', validateParams(shareItemParamsSchema), validateBody(updatePlanItemSchema), async (c) => {
  const { token, itemId } = c.get('validatedParams') as { token: string; itemId: string }
  const body = c.get('validatedBody') as UpdatePlanItemInput
  const access = await getShareAccess(token)
  assertCanEditShare(access.permission)

  const item = await updatePlanItem(access.space.id, itemId, body)
  await syncPlanItemMilestone(item)
  const refreshed = await prisma.planItem.findUniqueOrThrow({ where: { id: item.id } })

  return c.json({ success: true, data: serializePlanItem(refreshed) })
})

planSpaces.delete('/share/:token/items/:itemId', validateParams(shareItemParamsSchema), async (c) => {
  const { token, itemId } = c.get('validatedParams') as { token: string; itemId: string }
  const access = await getShareAccess(token)
  assertCanEditShare(access.permission)

  const item = await prisma.planItem.findFirst({ where: { id: itemId, spaceId: access.space.id } })
  if (!item) throw new NotFoundError('计划项不存在')
  await deleteSyncedMilestone(item)
  await prisma.planItem.delete({ where: { id: item.id } })

  return c.json({ success: true })
})

planSpaces.get('/:id', authMiddleware, validateParams(idParamsSchema), async (c) => {
  const { userId } = c.get('user')!
  const { id } = c.get('validatedParams') as { id: string }
  const space = await getOwnedSpace(id, userId)
  return c.json({ success: true, data: serializePlanSpace(space) })
})

planSpaces.patch('/:id', authMiddleware, validateParams(idParamsSchema), validateBody(updatePlanSpaceSchema), async (c) => {
  const { userId } = c.get('user')!
  const { id } = c.get('validatedParams') as { id: string }
  const body = c.get('validatedBody') as UpdatePlanSpaceInput
  await assertOwnsSpace(id, userId)

  const updated = await prisma.planSpace.update({
    where: { id },
    data: normalizeSpaceUpdate(body),
    include: {
      items: true,
      shareLinks: true,
    },
  })

  await syncMilestonesForSpace(id)
  return c.json({ success: true, data: serializePlanSpace(updated) })
})

planSpaces.delete('/:id', authMiddleware, validateParams(idParamsSchema), async (c) => {
  const { userId } = c.get('user')!
  const { id } = c.get('validatedParams') as { id: string }
  const space = await getOwnedSpace(id, userId)

  await Promise.all(space.items.map((item) => deleteSyncedMilestone(item)))
  await prisma.planSpace.delete({ where: { id } })

  return c.json({ success: true })
})

planSpaces.get('/:id/items', authMiddleware, validateParams(idParamsSchema), validateQuery(planItemQuerySchema), async (c) => {
  const { userId } = c.get('user')!
  const { id } = c.get('validatedParams') as { id: string }
  const query = (c.get('validatedQuery') ?? {}) as PlanItemQueryInput
  await assertOwnsSpace(id, userId)

  const items = await prisma.planItem.findMany({
    where: buildPlanItemWhere(id, query),
    orderBy: [{ date: 'asc' }, { startTime: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
  })

  return c.json({ success: true, data: items.map(serializePlanItem) })
})

planSpaces.post('/:id/items', authMiddleware, validateParams(idParamsSchema), validateBody(createPlanItemSchema), async (c) => {
  const { userId } = c.get('user')!
  const { id } = c.get('validatedParams') as { id: string }
  const body = c.get('validatedBody') as CreatePlanItemInput
  await assertOwnsSpace(id, userId)

  const item = await createPlanItem(id, body)
  await syncPlanItemMilestone(item)
  const refreshed = await prisma.planItem.findUniqueOrThrow({ where: { id: item.id } })

  return c.json({ success: true, data: serializePlanItem(refreshed) }, 201)
})

planSpaces.patch('/:id/items/:itemId', authMiddleware, validateParams(itemParamsSchema), validateBody(updatePlanItemSchema), async (c) => {
  const { userId } = c.get('user')!
  const { id, itemId } = c.get('validatedParams') as { id: string; itemId: string }
  const body = c.get('validatedBody') as UpdatePlanItemInput
  await assertOwnsSpace(id, userId)

  const item = await updatePlanItem(id, itemId, body)
  await syncPlanItemMilestone(item)
  const refreshed = await prisma.planItem.findUniqueOrThrow({ where: { id: item.id } })

  return c.json({ success: true, data: serializePlanItem(refreshed) })
})

planSpaces.delete('/:id/items/:itemId', authMiddleware, validateParams(itemParamsSchema), async (c) => {
  const { userId } = c.get('user')!
  const { id, itemId } = c.get('validatedParams') as { id: string; itemId: string }
  await assertOwnsSpace(id, userId)

  const item = await prisma.planItem.findFirst({ where: { id: itemId, spaceId: id } })
  if (!item) throw new NotFoundError('计划项不存在')
  await deleteSyncedMilestone(item)
  await prisma.planItem.delete({ where: { id: item.id } })

  return c.json({ success: true })
})

planSpaces.post('/:id/share-links', authMiddleware, validateParams(idParamsSchema), validateBody(createPlanShareLinkSchema), async (c) => {
  const { userId } = c.get('user')!
  const { id } = c.get('validatedParams') as { id: string }
  const body = c.get('validatedBody') as CreatePlanShareLinkInput
  await assertOwnsSpace(id, userId)

  const link = await prisma.planShareLink.create({
    data: {
      spaceId: id,
      token: createShareToken(),
      permission: body.permission,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
    },
  })

  return c.json({ success: true, data: serializePlanShareLink(link) }, 201)
})

async function getOwnedSpace(id: string, userId: string) {
  const space = await prisma.planSpace.findUnique({
    where: { id },
    include: {
      items: true,
      shareLinks: true,
    },
  })
  if (!space) throw new NotFoundError('专项计划不存在')
  if (space.ownerId !== userId) throw new ForbiddenError('无权访问该专项计划')
  return space
}

async function assertOwnsSpace(id: string, userId: string) {
  await getOwnedSpace(id, userId)
}

async function getShareAccess(token: string) {
  const link = await prisma.planShareLink.findUnique({
    where: { token },
    include: {
      space: {
        include: {
          items: true,
          shareLinks: true,
        },
      },
    },
  })

  if (!link || !link.space.collaborationOn) throw new NotFoundError('分享链接不存在或已关闭')
  if (link.expiresAt && link.expiresAt.getTime() < Date.now()) {
    throw new ForbiddenError('分享链接已过期')
  }

  return {
    space: link.space,
    permission: link.permission,
  }
}

function assertCanEditShare(permission: 'read' | 'edit') {
  if (permission !== 'edit') {
    throw new ForbiddenError('该分享链接仅允许查看')
  }
}

function normalizeSpaceUpdate(body: UpdatePlanSpaceInput) {
  return {
    ...(body.title !== undefined ? { title: body.title.trim() } : {}),
    ...(body.type !== undefined ? { type: body.type.trim() } : {}),
    ...(body.icon !== undefined ? { icon: body.icon.trim() } : {}),
    ...(body.description !== undefined ? { description: body.description?.trim() || null } : {}),
    ...(body.status !== undefined ? { status: body.status } : {}),
    ...(body.startDate !== undefined ? { startDate: body.startDate ? dateStringToUtcDate(body.startDate) : null } : {}),
    ...(body.endDate !== undefined ? { endDate: body.endDate ? dateStringToUtcDate(body.endDate) : null } : {}),
    ...(body.collaborationOn !== undefined ? { collaborationOn: body.collaborationOn } : {}),
  }
}

function normalizePlanItemData(body: CreatePlanItemInput | UpdatePlanItemInput) {
  const allDay = body.allDay ?? (!body.startTime && !body.endTime)
  return {
    ...(body.title !== undefined ? { title: body.title.trim() } : {}),
    ...(body.description !== undefined ? { description: body.description?.trim() || null } : {}),
    ...(body.date !== undefined ? { date: dateStringToUtcDate(body.date) } : {}),
    ...(body.startTime !== undefined ? { startTime: body.startTime ?? null } : {}),
    ...(body.endTime !== undefined ? { endTime: body.endTime ?? null } : {}),
    ...(body.allDay !== undefined || body.startTime !== undefined || body.endTime !== undefined ? { allDay } : {}),
    ...(body.status !== undefined ? { status: body.status } : {}),
    ...(body.priority !== undefined ? { priority: body.priority } : {}),
    ...(body.assignee !== undefined ? { assignee: body.assignee?.trim() || null } : {}),
    ...(body.category !== undefined ? { category: body.category?.trim() || null } : {}),
    ...(body.isMilestone !== undefined ? { isMilestone: body.isMilestone } : {}),
    ...(body.sortOrder !== undefined ? { sortOrder: body.sortOrder } : {}),
  }
}

async function createPlanItem(spaceId: string, body: CreatePlanItemInput) {
  return prisma.planItem.create({
    data: {
      spaceId,
      title: body.title.trim(),
      description: body.description?.trim() || null,
      date: dateStringToUtcDate(body.date),
      startTime: body.startTime ?? null,
      endTime: body.endTime ?? null,
      allDay: body.allDay ?? (!body.startTime && !body.endTime),
      status: body.status,
      priority: body.priority,
      assignee: body.assignee?.trim() || null,
      category: body.category?.trim() || null,
      isMilestone: body.isMilestone,
      sortOrder: body.sortOrder,
    },
    include: { space: true },
  })
}

async function updatePlanItem(spaceId: string, itemId: string, body: UpdatePlanItemInput) {
  const existing = await prisma.planItem.findFirst({
    where: { id: itemId, spaceId },
  })
  if (!existing) throw new NotFoundError('计划项不存在')

  return prisma.planItem.update({
    where: { id: itemId },
    data: normalizePlanItemData(body),
    include: { space: true },
  })
}

async function syncMilestonesForSpace(spaceId: string) {
  const items = await prisma.planItem.findMany({
    where: { spaceId, isMilestone: true },
    include: { space: true },
  })
  await Promise.all(items.map(syncPlanItemMilestone))
}

export default planSpaces

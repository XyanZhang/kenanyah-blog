import { Hono } from 'hono'
import { z } from 'zod'
import { prisma } from '../lib/db'
import {
  createManualEvent,
  createQuickCalendarEntry,
  dateStringToUtcDate,
  getCalendarDay,
  getCalendarEventList,
  getCalendarSummary,
  serializeEventItem,
  updateEventItemById,
} from '../lib/calendar-events'
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth'
import { validateBody, validateParams, validateQuery } from '../middleware/validation'
import {
  calendarAnnotationQuerySchema,
  calendarEventQuerySchema,
  createCalendarAnnotationSchema,
  createCalendarEventSchema,
  quickCreateCalendarEventSchema,
  updateCalendarAnnotationSchema,
  updateCalendarEventSchema,
  type CalendarEventQueryInput,
  type CreateCalendarAnnotationInput,
  type CreateCalendarEventInput,
  type QuickCreateCalendarEventInput,
  type UpdateCalendarAnnotationInput,
  type UpdateCalendarEventInput,
} from '@blog/validation'
import { ForbiddenError, NotFoundError } from '../middleware/error'

const dayParamsSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '请填写 YYYY-MM-DD 格式日期'),
})

type CalendarVariables = {
  user?: { userId: string }
  validatedQuery?: unknown
  validatedBody?: unknown
  validatedParams?: unknown
}

const calendar = new Hono<{ Variables: CalendarVariables }>()

function getEventScope(userId?: string) {
  return userId ? ({ mode: 'user', userId } as const) : ({ mode: 'public' } as const)
}

// GET /calendar/annotations — 按日期范围查询当前用户的标注（query: from, to 均为 YYYY-MM-DD）
calendar.get('/annotations', authMiddleware, validateQuery(calendarAnnotationQuerySchema), async (c) => {
  const { userId } = c.get('user')!
  const query = (c.get('validatedQuery') ?? {}) as { from?: string; to?: string }

  const where: { userId: string; date?: { gte?: Date; lte?: Date } } = { userId }
  if (query?.from ?? query?.to) {
    where.date = {}
    if (query.from) where.date.gte = dateStringToUtcDate(query.from)
    if (query.to) where.date.lte = dateStringToUtcDate(query.to)
  }

  const list = await prisma.calendarAnnotation.findMany({
    where,
    orderBy: { date: 'asc' },
  })

  return c.json({
    success: true,
    data: list.map((annotation) => ({
      id: annotation.id,
      date: annotation.date.toISOString().slice(0, 10),
      label: annotation.label,
      createdAt: annotation.createdAt.toISOString(),
      updatedAt: annotation.updatedAt.toISOString(),
    })),
  })
})

// POST /calendar/annotations — 创建或覆盖某日标注（同一用户同一天仅一条）
calendar.post('/annotations', authMiddleware, validateBody(createCalendarAnnotationSchema), async (c) => {
  const body = (c.get('validatedBody') ?? {}) as CreateCalendarAnnotationInput
  const { userId } = c.get('user')!
  const date = dateStringToUtcDate(body.date)

  const upserted = await prisma.calendarAnnotation.upsert({
    where: {
      userId_date: { userId, date },
    },
    create: {
      userId,
      date,
      label: body.label.trim(),
    },
    update: {
      label: body.label.trim(),
      updatedAt: new Date(),
    },
  })

  return c.json({
    success: true,
    data: {
      id: upserted.id,
      date: upserted.date.toISOString().slice(0, 10),
      label: upserted.label,
      createdAt: upserted.createdAt.toISOString(),
      updatedAt: upserted.updatedAt.toISOString(),
    },
  })
})

// PATCH /calendar/annotations/:id
calendar.patch('/annotations/:id', authMiddleware, validateBody(updateCalendarAnnotationSchema), async (c) => {
  const id = c.req.param('id')
  const body = c.get('validatedBody') as UpdateCalendarAnnotationInput
  const { userId } = c.get('user')!

  const existing = await prisma.calendarAnnotation.findUnique({ where: { id } })
  if (!existing) throw new NotFoundError('标注不存在')
  if (existing.userId !== userId) throw new ForbiddenError('无权修改')

  const updated = await prisma.calendarAnnotation.update({
    where: { id },
    data: body.label !== undefined ? { label: body.label.trim() } : {},
  })

  return c.json({
    success: true,
    data: {
      id: updated.id,
      date: updated.date.toISOString().slice(0, 10),
      label: updated.label,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    },
  })
})

// DELETE /calendar/annotations/:id
calendar.delete('/annotations/:id', authMiddleware, async (c) => {
  const id = c.req.param('id')
  const { userId } = c.get('user')!

  const existing = await prisma.calendarAnnotation.findUnique({ where: { id } })
  if (!existing) throw new NotFoundError('标注不存在')
  if (existing.userId !== userId) throw new ForbiddenError('无权删除')

  await prisma.calendarAnnotation.delete({ where: { id } })
  return c.json({ success: true })
})

// GET /calendar/events/summary
calendar.get('/events/summary', optionalAuthMiddleware, validateQuery(calendarEventQuerySchema), async (c) => {
  const query = (c.get('validatedQuery') ?? {}) as CalendarEventQueryInput
  const userId = c.get('user')?.userId
  const data = await getCalendarSummary(getEventScope(userId), query)
  return c.json({ success: true, data })
})

// GET /calendar/events
calendar.get('/events', optionalAuthMiddleware, validateQuery(calendarEventQuerySchema), async (c) => {
  const query = (c.get('validatedQuery') ?? {}) as CalendarEventQueryInput
  const userId = c.get('user')?.userId
  const data = await getCalendarEventList(getEventScope(userId), query)
  return c.json({ success: true, data })
})

// GET /calendar/day/:date
calendar.get('/day/:date', optionalAuthMiddleware, validateParams(dayParamsSchema), async (c) => {
  const { date } = c.get('validatedParams') as { date: string }
  const userId = c.get('user')?.userId
  const data = await getCalendarDay(getEventScope(userId), date)
  return c.json({ success: true, data })
})

// POST /calendar/events
calendar.post('/events', authMiddleware, validateBody(createCalendarEventSchema), async (c) => {
  const body = c.get('validatedBody') as CreateCalendarEventInput
  const { userId } = c.get('user')!

  const event = await createManualEvent({
    userId,
    title: body.title.trim(),
    description: body.description?.trim() || null,
    date: body.date,
    status: body.status,
    allDay: body.allDay,
    sourceType: body.sourceType,
  })

  return c.json({ success: true, data: serializeEventItem(event) }, 201)
})

// PATCH /calendar/events/:id
calendar.patch('/events/:id', authMiddleware, validateBody(updateCalendarEventSchema), async (c) => {
  const id = c.req.param('id')
  const body = c.get('validatedBody') as UpdateCalendarEventInput
  const { userId } = c.get('user')!

  const updated = await updateEventItemById({
    id,
    userId,
    title: body.title?.trim(),
    description: body.description === undefined ? undefined : body.description?.trim() ?? null,
    date: body.date,
    status: body.status,
    allDay: body.allDay,
  })

  if (!updated) throw new NotFoundError('事件不存在')
  if (updated === 'forbidden') throw new ForbiddenError('无权修改该事件')

  return c.json({ success: true, data: serializeEventItem(updated) })
})

// POST /calendar/events/quick-create
calendar.post('/events/quick-create', authMiddleware, validateBody(quickCreateCalendarEventSchema), async (c) => {
  const body = c.get('validatedBody') as QuickCreateCalendarEventInput
  const { userId } = c.get('user')!

  const result = await createQuickCalendarEntry({
    userId,
    rawText: body.rawText,
    defaultDate: body.defaultDate,
    sourceInputType: body.sourceInputType,
  })

  return c.json({ success: true, data: result }, 201)
})

export default calendar

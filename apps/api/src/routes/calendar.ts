import { Hono } from 'hono'
import { prisma } from '../lib/db'
import { authMiddleware } from '../middleware/auth'
import { validateBody, validateQuery } from '../middleware/validation'
import {
  createCalendarAnnotationSchema,
  updateCalendarAnnotationSchema,
  calendarAnnotationQuerySchema,
  type CreateCalendarAnnotationInput,
  type UpdateCalendarAnnotationInput,
} from '@blog/validation'
import { NotFoundError, ForbiddenError } from '../middleware/error'

type CalendarVariables = {
  user: { userId: string }
  validatedQuery?: unknown
  validatedBody?: unknown
}

const calendar = new Hono<{ Variables: CalendarVariables }>()

/** 将 YYYY-MM-DD 转为 Date（当天 0 点 UTC） */
function dateStringToDate(s: string): Date {
  const d = new Date(s + 'T00:00:00.000Z')
  if (Number.isNaN(d.getTime())) throw new Error('无效日期')
  return d
}

// GET /calendar/annotations — 按日期范围查询当前用户的标注（query: from, to 均为 YYYY-MM-DD）
calendar.get('/annotations', authMiddleware, validateQuery(calendarAnnotationQuerySchema), async (c) => {
  const { userId } = c.get('user')
  const query = (c.get('validatedQuery') ?? {}) as { from?: string; to?: string }

  const where: { userId: string; date?: { gte?: Date; lte?: Date } } = { userId }
  if (query?.from ?? query?.to) {
    where.date = {}
    if (query.from) where.date.gte = dateStringToDate(query.from)
    if (query.to) where.date.lte = dateStringToDate(query.to)
  }

  const list = await prisma.calendarAnnotation.findMany({
    where,
    orderBy: { date: 'asc' },
  })

  return c.json({
    success: true,
    data: list.map((a) => ({
      id: a.id,
      date: a.date.toISOString().slice(0, 10),
      label: a.label,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
    })),
  })
})

// POST /calendar/annotations — 创建或覆盖某日标注（同一用户同一天仅一条）
calendar.post('/annotations', authMiddleware, validateBody(createCalendarAnnotationSchema), async (c) => {
  const body = (c.get('validatedBody') ?? {}) as CreateCalendarAnnotationInput
  const { userId } = c.get('user')

  const date = dateStringToDate(body.date)

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
  const { userId } = c.get('user')

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
  const { userId } = c.get('user')

  const existing = await prisma.calendarAnnotation.findUnique({ where: { id } })
  if (!existing) throw new NotFoundError('标注不存在')
  if (existing.userId !== userId) throw new ForbiddenError('无权删除')

  await prisma.calendarAnnotation.delete({ where: { id } })
  return c.json({ success: true })
})

export default calendar

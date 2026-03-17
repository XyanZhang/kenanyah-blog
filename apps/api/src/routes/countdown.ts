import { Hono } from 'hono'
import { prisma } from '../lib/db'
import { authMiddleware } from '../middleware/auth'
import { validateBody } from '../middleware/validation'
import {
  createCountdownEventSchema,
  updateCountdownEventSchema,
  type CreateCountdownEventInput,
  type UpdateCountdownEventInput,
} from '@blog/validation'
import { NotFoundError, ForbiddenError } from '../middleware/error'

type CountdownVariables = {
  user: { userId: string }
  validatedBody?: unknown
}

const countdown = new Hono<{ Variables: CountdownVariables }>()

/** 解析日期字符串为 Date，支持 YYYY-MM-DD 或 ISO */
function parseTargetDate(s: string): Date {
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) throw new Error('无效日期')
  return d
}

// GET /countdown/events — 当前用户的倒计时事件列表（可选 limit，默认返回全部，用于卡片取最近 N 条时由前端排序）
countdown.get('/events', authMiddleware, async (c) => {
  const { userId } = c.get('user')
  const limit = c.req.query('limit')
  const limitNum = limit ? Math.min(Math.max(1, parseInt(limit, 10)), 50) : undefined

  const events = await prisma.countdownEvent.findMany({
    where: { userId },
    orderBy: { targetDate: 'asc' },
    take: limitNum,
  })

  return c.json({
    success: true,
    data: events.map((e) => ({
      id: e.id,
      title: e.title,
      targetDate: e.targetDate.toISOString(),
      type: e.type,
      createdAt: e.createdAt.toISOString(),
      updatedAt: e.updatedAt.toISOString(),
    })),
  })
})

// POST /countdown/events — 创建倒计时事件
countdown.post('/events', authMiddleware, validateBody(createCountdownEventSchema), async (c) => {
  const body = (c.get('validatedBody') ?? {}) as CreateCountdownEventInput
  const { userId } = c.get('user')

  const targetDate = parseTargetDate(body.targetDate)

  const created = await prisma.countdownEvent.create({
    data: {
      userId,
      title: body.title.trim(),
      targetDate,
      type: body.type,
    },
  })

  return c.json({
    success: true,
    data: {
      id: created.id,
      title: created.title,
      targetDate: created.targetDate.toISOString(),
      type: created.type,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    },
  })
})

// PATCH /countdown/events/:id — 更新
countdown.patch('/events/:id', authMiddleware, validateBody(updateCountdownEventSchema), async (c) => {
  const id = c.req.param('id')
  const body = (c.get('validatedBody') ?? {}) as UpdateCountdownEventInput
  const { userId } = c.get('user')

  const existing = await prisma.countdownEvent.findUnique({ where: { id } })
  if (!existing) throw new NotFoundError('倒计时事件不存在')
  if (existing.userId !== userId) throw new ForbiddenError('无权修改')

  const updateData: { title?: string; targetDate?: Date; type?: string } = {}
  if (body.title !== undefined) updateData.title = body.title.trim()
  if (body.targetDate !== undefined) updateData.targetDate = parseTargetDate(body.targetDate)
  if (body.type !== undefined) updateData.type = body.type

  const updated = await prisma.countdownEvent.update({
    where: { id },
    data: updateData,
  })

  return c.json({
    success: true,
    data: {
      id: updated.id,
      title: updated.title,
      targetDate: updated.targetDate.toISOString(),
      type: updated.type,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    },
  })
})

// DELETE /countdown/events/:id
countdown.delete('/events/:id', authMiddleware, async (c) => {
  const id = c.req.param('id')
  const { userId } = c.get('user')

  const existing = await prisma.countdownEvent.findUnique({ where: { id } })
  if (!existing) throw new NotFoundError('倒计时事件不存在')
  if (existing.userId !== userId) throw new ForbiddenError('无权删除')

  await prisma.countdownEvent.delete({ where: { id } })
  return c.json({ success: true })
})

export default countdown

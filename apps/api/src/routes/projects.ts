import { Hono } from 'hono'
import { z } from 'zod'
import { prisma } from '../lib/db'
import { authMiddleware } from '../middleware/auth'
import { syncProjectEvent, serializeProjectEntry, dateStringToUtcDate } from '../lib/calendar-events'

type ProjectVariables = {
  user?: { userId: string }
}

const createProjectSchema = z.object({
  title: z.string().min(1, '标题不能为空').max(120, '标题最多 120 字'),
  description: z.string().max(5000, '描述最多 5000 字').optional(),
  href: z.string().url('项目链接格式无效').optional(),
  coverImage: z.string().url('封面地址格式无效').optional(),
  category: z.string().max(80).optional(),
  tags: z.array(z.string().min(1).max(30)).max(10).optional(),
  status: z.enum(['planned', 'active', 'completed', 'archived']).default('active'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '请填写 YYYY-MM-DD 格式日期').optional(),
})

const projects = new Hono<{ Variables: ProjectVariables }>()

projects.get('/', async (c) => {
  const list = await prisma.projectEntry.findMany({
    orderBy: [{ startedAt: 'desc' }, { createdAt: 'desc' }],
  })

  return c.json({
    success: true,
    data: list.map(serializeProjectEntry),
  })
})

projects.post('/', authMiddleware, async (c) => {
  const json = await c.req.json().catch(() => null)
  const parsed = createProjectSchema.safeParse(json)
  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.flatten().fieldErrors }, 400)
  }

  const { userId } = c.get('user')!
  const body = parsed.data

  const project = await prisma.projectEntry.create({
    data: {
      userId,
      title: body.title.trim(),
      description: body.description?.trim() || null,
      href: body.href?.trim() || null,
      coverImage: body.coverImage?.trim() || null,
      category: body.category?.trim() || null,
      tags: body.tags ?? [],
      status: body.status,
      startedAt: body.date ? dateStringToUtcDate(body.date) : new Date(),
    },
  })

  await syncProjectEvent(project)

  return c.json({ success: true, data: serializeProjectEntry(project) }, 201)
})

export default projects

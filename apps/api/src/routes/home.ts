import { Hono } from 'hono'
import { prisma } from '../lib/db'
import { authMiddleware } from '../middleware/auth'

type HomeVariables = {
  user: { userId: string }
}

/**
 * 首页配置与模板 API（已接入用户系统）。
 * 所有配置均按当前登录用户的 userId 进行隔离存储。
 */
const home = new Hono<{ Variables: HomeVariables }>()

// GET /home/config — 拉取当前登录用户的首页配置
home.get('/config', authMiddleware, async (c) => {
  const { userId } = c.get('user')
  const config = await prisma.homeConfig.findUnique({
    where: { userId },
  })
  if (!config) {
    return c.json({ success: true, data: null })
  }
  return c.json({
    success: true,
    data: {
      layout: JSON.parse(config.layoutJson),
      nav: JSON.parse(config.navJson),
      canvas: config.canvasJson ? JSON.parse(config.canvasJson) : null,
    },
  })
})

// PUT /home/config — 同步当前登录用户的布局与导航到数据库
home.put('/config', authMiddleware, async (c) => {
  try {
    const { userId } = c.get('user')
    const body = await c.req.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return c.json({ success: false, error: 'Invalid body' }, 400)
    }
    const layout = body.layout
    const nav = body.nav
    const canvas = body.canvas ?? null
    if (!layout || !nav) {
      return c.json({ success: false, error: 'layout and nav are required' }, 400)
    }

    let layoutJson: string
    let navJson: string
    let canvasJson: string | null = null
    try {
      layoutJson = JSON.stringify(layout)
      navJson = JSON.stringify(nav)
      if (canvas != null) canvasJson = JSON.stringify(canvas)
    } catch (e) {
      return c.json({ success: false, error: 'Invalid JSON in layout/nav/canvas' }, 400)
    }

    await prisma.homeConfig.upsert({
      where: { userId },
      create: { userId, layoutJson, navJson, canvasJson },
      update: { layoutJson, navJson, canvasJson, updatedAt: new Date() },
    })

    return c.json({ success: true })
  } catch (e) {
    console.error('PUT /home/config error:', e)
    const message = e instanceof Error ? e.message : 'Sync failed'
    return c.json({ success: false, error: message }, 500)
  }
})

// GET /home/templates — 当前登录用户保存的模板列表
home.get('/templates', authMiddleware, async (c) => {
  const { userId } = c.get('user')
  const list = await prisma.homeLayoutTemplate.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      name: true,
      description: true,
      createdAt: true,
      updatedAt: true,
    },
  })
  return c.json({ success: true, data: list })
})

// GET /home/templates/:id — 获取当前登录用户的单个模板（含 layoutJson 用于应用）
home.get('/templates/:id', authMiddleware, async (c) => {
  const { userId } = c.get('user')
  const id = c.req.param('id')
  const template = await prisma.homeLayoutTemplate.findFirst({
    where: { id, userId },
  })
  if (!template) {
    return c.json({ success: false, error: 'Template not found' }, 404)
  }
  const nav = template.navJson ? JSON.parse(template.navJson) : null
  const canvas = template.canvasJson ? JSON.parse(template.canvasJson) : null
  return c.json({
    success: true,
    data: {
      id: template.id,
      name: template.name,
      description: template.description,
      layout: JSON.parse(template.layoutJson),
      nav,
      canvas,
    },
  })
})

// POST /home/templates — 另存为当前登录用户的模板（含 layout + nav 定位与尺寸）
home.post('/templates', authMiddleware, async (c) => {
  const { userId } = c.get('user')
  const body = await c.req.json().catch(() => null)
  if (!body || typeof body !== 'object' || !body.name) {
    return c.json({ success: false, error: 'name is required' }, 400)
  }
  const layout = body.layout
  const nav = body.nav
  if (!layout) {
    return c.json({ success: false, error: 'layout is required' }, 400)
  }
  if (!nav || typeof nav !== 'object') {
    return c.json({ success: false, error: 'nav is required' }, 400)
  }

  const navJson = JSON.stringify(nav)
  const canvasJson = body.canvas != null ? JSON.stringify(body.canvas) : null

  const created = await prisma.homeLayoutTemplate.create({
    data: {
      userId,
      name: String(body.name).trim(),
      description: body.description != null ? String(body.description).trim() : null,
      layoutJson: JSON.stringify(layout),
      navJson,
      canvasJson,
    },
  })

  return c.json({
    success: true,
    data: {
      id: created.id,
      name: created.name,
      description: created.description,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
    },
  })
})

// DELETE /home/templates/:id — 删除当前登录用户的模板
home.delete('/templates/:id', authMiddleware, async (c) => {
  const { userId } = c.get('user')
  const id = c.req.param('id')
  const deleted = await prisma.homeLayoutTemplate.deleteMany({
    where: { id, userId },
  })
  if (deleted.count === 0) {
    return c.json({ success: false, error: 'Template not found' }, 404)
  }
  return c.json({ success: true })
})

export default home

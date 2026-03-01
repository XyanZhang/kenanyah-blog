import { Hono } from 'hono'
import { prisma } from '../lib/db'

/**
 * 首页配置与模板 API。
 * 暂时写死用户：使用 process.env.DEFAULT_HOME_USER_ID，未设置则使用 null（全局单条配置）。
 * 后期可改为从 auth 中间件取当前用户 id。
 */
function getDefaultUserId(): string | null {
  return process.env.DEFAULT_HOME_USER_ID ?? null
}

const home = new Hono()

// GET /home/config — 拉取当前首页配置
// userId 为 null 时不能用 findUnique（唯一约束下 null 行为），改用 findFirst
home.get('/config', async (c) => {
  const userId = getDefaultUserId()
  const config =
    userId === null
      ? await prisma.homeConfig.findFirst({ where: { userId: null } })
      : await prisma.homeConfig.findUnique({ where: { userId } })
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

// PUT /home/config — 同步当前布局与导航到数据库
home.put('/config', async (c) => {
  try {
    const userId = getDefaultUserId()
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

    // userId 为 null 时 Prisma 的 upsert(where: { userId: null }) 会报错，改为 findFirst + update/create
    if (userId === null) {
      const existing = await prisma.homeConfig.findFirst({ where: { userId: null } })
      if (existing) {
        await prisma.homeConfig.update({
          where: { id: existing.id },
          data: { layoutJson, navJson, canvasJson, updatedAt: new Date() },
        })
      } else {
        await prisma.homeConfig.create({
          data: { userId: null, layoutJson, navJson, canvasJson },
        })
      }
    } else {
      await prisma.homeConfig.upsert({
        where: { userId },
        create: { userId, layoutJson, navJson, canvasJson },
        update: { layoutJson, navJson, canvasJson, updatedAt: new Date() },
      })
    }

    return c.json({ success: true })
  } catch (e) {
    console.error('PUT /home/config error:', e)
    const message = e instanceof Error ? e.message : 'Sync failed'
    return c.json({ success: false, error: message }, 500)
  }
})

// GET /home/templates — 用户保存的模板列表
home.get('/templates', async (c) => {
  const userId = getDefaultUserId()
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

// GET /home/templates/:id — 获取单个模板（含 layoutJson 用于应用）
home.get('/templates/:id', async (c) => {
  const userId = getDefaultUserId()
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

// POST /home/templates — 另存为模板（含 layout + nav 定位与尺寸）
home.post('/templates', async (c) => {
  const userId = getDefaultUserId()
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

// DELETE /home/templates/:id
home.delete('/templates/:id', async (c) => {
  const userId = getDefaultUserId()
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

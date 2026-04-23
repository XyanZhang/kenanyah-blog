import { Hono, type Context } from 'hono'
import { getCookie } from 'hono/cookie'
import { prisma } from '../lib/db'
import { verifyAccessToken } from '../lib/jwt'
import { authMiddleware } from '../middleware/auth'

type HomeVariables = {
  user: { userId: string }
}

function parseHomeConfigRow(config: {
  layoutJson: string
  navJson: string
  canvasJson: string | null
  themeJson?: string | null
}) {
  return {
    layout: JSON.parse(config.layoutJson),
    nav: JSON.parse(config.navJson),
    canvas: config.canvasJson ? JSON.parse(config.canvasJson) : null,
    theme: config.themeJson ? JSON.parse(config.themeJson) : null,
  }
}

function readOptionalAccessToken(c: Context): string | null {
  const fromCookie = getCookie(c, 'access_token')
  if (fromCookie) return fromCookie
  const authHeader = c.req.header('Authorization')
  if (authHeader?.startsWith('Bearer ')) return authHeader.slice(7).trim() || null
  return null
}

function optionalSessionUserId(c: Context): string | null {
  const token = readOptionalAccessToken(c)
  if (!token) return null
  try {
    return verifyAccessToken(token).userId
  } catch {
    return null
  }
}

async function getPublicHomeConfigPayload() {
  const admin = await prisma.user.findFirst({
    where: { role: 'ADMIN' },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  })
  if (admin) {
    const config = await prisma.homeConfig.findUnique({
      where: { userId: admin.id },
    })
    if (config) return parseHomeConfigRow(config)
  }
  const anyConfig = await prisma.homeConfig.findFirst({
    orderBy: { updatedAt: 'desc' },
  })
  if (anyConfig) return parseHomeConfigRow(anyConfig)
  return null
}

const home = new Hono<{ Variables: HomeVariables }>()

// GET /home/config — 已登录：当前用户配置；未登录：公开首页配置（无则 data 为 null）
home.get('/config', async (c) => {
  const sessionUserId = optionalSessionUserId(c)
  if (sessionUserId) {
    const config = await prisma.homeConfig.findUnique({
      where: { userId: sessionUserId },
    })
    if (!config) {
      return c.json({ success: true, data: null })
    }
    return c.json({ success: true, data: parseHomeConfigRow(config) })
  }

  const publicData = await getPublicHomeConfigPayload()
  return c.json({ success: true, data: publicData })
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
    const theme = body.theme ?? null
    if (!layout || !nav) {
      return c.json({ success: false, error: 'layout and nav are required' }, 400)
    }

    let layoutJson: string
    let navJson: string
    let canvasJson: string | null = null
    let themeJson: string | null = null
    try {
      layoutJson = JSON.stringify(layout)
      navJson = JSON.stringify(nav)
      if (canvas != null) canvasJson = JSON.stringify(canvas)
      if (theme != null) themeJson = JSON.stringify(theme)
    } catch (e) {
      return c.json({ success: false, error: 'Invalid JSON in layout/nav/canvas/theme' }, 400)
    }

    await prisma.homeConfig.upsert({
      where: { userId },
      create: { userId, layoutJson, navJson, canvasJson, themeJson },
      update: { layoutJson, navJson, canvasJson, themeJson, updatedAt: new Date() },
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

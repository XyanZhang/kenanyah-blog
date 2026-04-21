import { Hono } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import { prisma } from '../lib/db'
import { verifyPassword } from '../lib/password'
import { adminAuthMiddleware } from '../middleware/admin-auth'
import { validateBody } from '../middleware/validation'
import { BadRequestError, UnauthorizedError } from '../middleware/error'
import {
  adminLoginSchema,
  type AdminLoginInput,
} from '@blog/validation'
import {
  generateAdminTokenPair,
  verifyAdminRefreshToken,
} from '../lib/admin-jwt'

type AdminAuthVariables = {
  validatedBody: unknown
  adminUser: { adminUserId: string; email: string; role: string; scope: 'admin' }
}

const ACCESS_TOKEN_MAX_AGE = 7 * 24 * 60 * 60
const adminAuth = new Hono<{ Variables: AdminAuthVariables }>()

function setAdminCookies(c: Parameters<typeof setCookie>[0], tokens: { accessToken: string; refreshToken: string }) {
  setCookie(c, 'admin_access_token', tokens.accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Lax',
    maxAge: ACCESS_TOKEN_MAX_AGE,
  })
  setCookie(c, 'admin_refresh_token', tokens.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Lax',
    maxAge: ACCESS_TOKEN_MAX_AGE,
  })
}

adminAuth.post('/login', validateBody(adminLoginSchema), async (c) => {
  const data = c.get('validatedBody') as AdminLoginInput

  const adminUser = await prisma.adminUser.findUnique({
    where: { email: data.email },
  })
  if (!adminUser || !adminUser.isActive) {
    throw new UnauthorizedError('Invalid admin credentials')
  }

  const isValid = await verifyPassword(data.password, adminUser.passwordHash)
  if (!isValid) {
    throw new UnauthorizedError('Invalid admin credentials')
  }

  const tokens = generateAdminTokenPair({
    adminUserId: adminUser.id,
    email: adminUser.email,
    role: adminUser.role,
    scope: 'admin',
  })

  await prisma.adminUser.update({
    where: { id: adminUser.id },
    data: { lastLoginAt: new Date() },
  })

  setAdminCookies(c, tokens)

  return c.json({
    success: true,
    data: {
      user: {
        id: adminUser.id,
        email: adminUser.email,
        name: adminUser.name,
        role: adminUser.role,
        isActive: adminUser.isActive,
        lastLoginAt: adminUser.lastLoginAt,
        createdAt: adminUser.createdAt,
        updatedAt: adminUser.updatedAt,
      },
    },
  })
})

adminAuth.post('/logout', adminAuthMiddleware, async (c) => {
  deleteCookie(c, 'admin_access_token')
  deleteCookie(c, 'admin_refresh_token')
  return c.json({ success: true, data: { message: 'Admin logged out successfully' } })
})

adminAuth.post('/refresh', async (c) => {
  const refreshToken = getCookie(c, 'admin_refresh_token') ?? c.req.header('x-admin-refresh-token')
  if (!refreshToken) {
    throw new BadRequestError('Admin refresh token required')
  }
  const payload = verifyAdminRefreshToken(refreshToken)
  const adminUser = await prisma.adminUser.findUnique({
    where: { id: payload.adminUserId },
  })
  if (!adminUser || !adminUser.isActive) {
    throw new UnauthorizedError('Admin account not found')
  }

  const tokens = generateAdminTokenPair({
    adminUserId: adminUser.id,
    email: adminUser.email,
    role: adminUser.role,
    scope: 'admin',
  })
  setAdminCookies(c, tokens)

  return c.json({
    success: true,
    data: { accessToken: tokens.accessToken },
  })
})

adminAuth.get('/me', adminAuthMiddleware, async (c) => {
  const { adminUserId } = c.get('adminUser')
  const adminUser = await prisma.adminUser.findUnique({
    where: { id: adminUserId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true,
    },
  })
  if (!adminUser) {
    throw new UnauthorizedError('Admin user not found')
  }
  return c.json({ success: true, data: { user: adminUser } })
})

export default adminAuth

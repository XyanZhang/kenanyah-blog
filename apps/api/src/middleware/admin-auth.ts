import type { Context, Next } from 'hono'
import { getCookie } from 'hono/cookie'
import { prisma } from '../lib/db'
import { verifyAdminAccessToken, type AdminJwtPayload } from '../lib/admin-jwt'
import { UnauthorizedError, ForbiddenError } from './error'

export async function adminAuthMiddleware(c: Context, next: Next) {
  let token = getCookie(c, 'admin_access_token')
  if (!token) {
    const authHeader = c.req.header('Authorization')
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7)
    }
  }

  if (!token) {
    throw new UnauthorizedError('Admin authentication required')
  }

  const payload = verifyAdminAccessToken(token)
  const adminUser = await prisma.adminUser.findUnique({
    where: { id: payload.adminUserId },
  })

  if (!adminUser || !adminUser.isActive) {
    throw new ForbiddenError('Admin account is disabled')
  }

  c.set('adminUser', payload)
  await next()
}

export function requireAdminRole(...roles: string[]) {
  return async (c: Context, next: Next) => {
    const user = c.get('adminUser') as AdminJwtPayload | undefined
    if (!user) {
      throw new UnauthorizedError('Admin authentication required')
    }
    if (!roles.includes(user.role)) {
      throw new ForbiddenError('Insufficient admin permissions')
    }
    await next()
  }
}

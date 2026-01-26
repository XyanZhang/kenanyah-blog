import type { Context, Next } from 'hono'
import { getCookie } from 'hono/cookie'
import { verifyAccessToken, type JwtPayload } from '../lib/jwt'

export interface AuthContext {
  user: JwtPayload
}

export async function authMiddleware(c: Context, next: Next) {
  try {
    // Try to get token from cookie first
    let token = getCookie(c, 'access_token')

    // If not in cookie, try Authorization header
    if (!token) {
      const authHeader = c.req.header('Authorization')
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.substring(7)
      }
    }

    if (!token) {
      return c.json(
        {
          success: false,
          error: 'Authentication required',
        },
        401
      )
    }

    const payload = verifyAccessToken(token)
    c.set('user', payload)

    await next()
  } catch (error) {
    return c.json(
      {
        success: false,
        error: 'Invalid or expired token',
      },
      401
    )
  }
}

export function requireRole(...roles: string[]) {
  return async (c: Context, next: Next) => {
    const user = c.get('user') as JwtPayload | undefined

    if (!user) {
      return c.json(
        {
          success: false,
          error: 'Authentication required',
        },
        401
      )
    }

    if (!roles.includes(user.role)) {
      return c.json(
        {
          success: false,
          error: 'Insufficient permissions',
        },
        403
      )
    }

    await next()
  }
}

import type { Context, Next } from 'hono'
import { getCookie } from 'hono/cookie'
import { verifyAccessToken, type JwtPayload } from '../lib/jwt'
import { prisma } from '../lib/db'

export interface AuthContext {
  user: JwtPayload
}

const DEV_DEFAULT_USER_EMAIL = 'admin@blog.com'
let devDefaultUser: JwtPayload | null = null

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
      // 开发环境写死默认用户，便于本地发布文章等操作（优先 admin@blog.com，否则任意第一个用户）
      if (process.env.NODE_ENV === 'development') {
        if (!devDefaultUser) {
          const user =
            (await prisma.user.findUnique({
              where: { email: DEV_DEFAULT_USER_EMAIL },
            })) ??
            (await prisma.user.findFirst({ orderBy: { createdAt: 'asc' } }))
          if (user) {
            devDefaultUser = {
              userId: user.id,
              email: user.email,
              role: user.role,
            }
          }
        }
        if (devDefaultUser) {
          c.set('user', devDefaultUser)
          await next()
          return
        }
      }
      return c.json(
        {
          success: false,
          error:
            process.env.NODE_ENV === 'development'
              ? 'Authentication required. Run: pnpm db:seed (or create a user in DB) for dev fallback.'
              : 'Authentication required',
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

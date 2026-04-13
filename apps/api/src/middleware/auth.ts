import type { Context, MiddlewareHandler, Next } from 'hono'
import { getCookie } from 'hono/cookie'
import { verifyAccessToken, type JwtPayload } from '../lib/jwt'
import { prisma } from '../lib/db'

export interface AuthContext {
  user: JwtPayload
}

const DEV_DEFAULT_USER_EMAIL = 'admin@blog.com'
let devDefaultUser: JwtPayload | null = null

async function authMiddlewareCore(c: Context, next: Next, allowDevFallback: boolean) {
  try {
    let token = getCookie(c, 'access_token')
    if (!token) {
      const authHeader = c.req.header('Authorization')
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.substring(7)
      }
    }

    if (!token) {
      const isDevOrTest = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test'
      if (allowDevFallback && isDevOrTest) {
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
            isDevOrTest
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

async function resolveAuthenticatedUser(
  c: Context,
  allowDevFallback: boolean
): Promise<JwtPayload | null> {
  let token = getCookie(c, 'access_token')
  if (!token) {
    const authHeader = c.req.header('Authorization')
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7)
    }
  }

  if (!token) {
    const isDevOrTest = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test'
    if (allowDevFallback && isDevOrTest) {
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
      return devDefaultUser
    }

    return null
  }

  try {
    return verifyAccessToken(token)
  } catch {
    return null
  }
}

export async function authMiddleware(c: Context, next: Next) {
  return authMiddlewareCore(c, next, true)
}

export async function authMiddlewareStrict(c: Context, next: Next) {
  return authMiddlewareCore(c, next, false)
}

export const optionalAuthMiddleware: MiddlewareHandler = async (c, next) => {
  const user = await resolveAuthenticatedUser(c, true)
  if (user) {
    c.set('user', user)
  }
  await next()
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

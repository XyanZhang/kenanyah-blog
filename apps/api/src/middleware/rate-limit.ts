import type { Context, Next } from 'hono'

interface RateLimitStore {
  [key: string]: {
    count: number
    resetTime: number
  }
}

const store: RateLimitStore = {}

export interface RateLimitOptions {
  windowMs: number
  max: number
  message?: string
}

export function rateLimit(options: RateLimitOptions) {
  const { windowMs, max, message = 'Too many requests' } = options

  return async (c: Context, next: Next) => {
    const key = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown'
    const now = Date.now()

    if (!store[key] || store[key].resetTime < now) {
      store[key] = {
        count: 1,
        resetTime: now + windowMs,
      }
    } else {
      store[key].count++
    }

    const { count, resetTime } = store[key]

    c.header('X-RateLimit-Limit', max.toString())
    c.header('X-RateLimit-Remaining', Math.max(0, max - count).toString())
    c.header('X-RateLimit-Reset', new Date(resetTime).toISOString())

    if (count > max) {
      return c.json(
        {
          success: false,
          error: message,
        },
        429
      )
    }

    await next()
  }
}

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now()
  for (const key in store) {
    if (store[key].resetTime < now) {
      delete store[key]
    }
  }
}, 60000) // Clean up every minute

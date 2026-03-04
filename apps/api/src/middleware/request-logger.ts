import type { Context, Next } from 'hono'
import { logger } from '../lib/logger'

/**
 * 请求日志中间件：记录 method、path、status、耗时
 * 生产环境输出 JSON，便于日志收集（ELK、Datadog 等）
 */
export async function requestLogger(c: Context, next: Next) {
  const start = Date.now()
  await next()
  const elapsed = Date.now() - start
  const method = c.req.method
  const path = c.req.path
  const status = c.res.status

  logger.info({
    msg: 'request',
    method,
    path,
    status,
    elapsed: `${elapsed}ms`,
    userAgent: c.req.header('user-agent')?.slice(0, 100),
  })
}

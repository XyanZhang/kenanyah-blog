import type { Context, Next } from 'hono'
import { routePath } from 'hono/route'
import { performance } from 'node:perf_hooks'
import { logger } from '../lib/logger'

/**
 * 请求日志中间件：
 * 1. 记录每次请求的 method、path、status、耗时
 * 2. 聚合每个接口的调用次数、平均耗时、最慢耗时、慢请求次数
 * 生产环境输出 JSON，便于日志收集（ELK、Datadog 等）
 */
type RouteTimingStats = {
  count: number
  totalMs: number
  minMs: number
  maxMs: number
  slowCount: number
  errorCount: number
}

const routeTimingStats = new Map<string, RouteTimingStats>()
const SLOW_REQUEST_THRESHOLD_MS = 1000
const SUMMARY_LOG_EVERY = 20

function getRouteKey(c: Context, method: string) {
  const matchedRoute = routePath(c, -1)
  const route = matchedRoute && matchedRoute !== '*' ? matchedRoute : c.req.path

  return `${method} ${route}`
}

function updateRouteTimingStats(routeKey: string, elapsedMs: number, status: number) {
  const stats = routeTimingStats.get(routeKey) ?? {
    count: 0,
    totalMs: 0,
    minMs: Number.POSITIVE_INFINITY,
    maxMs: 0,
    slowCount: 0,
    errorCount: 0,
  }

  stats.count += 1
  stats.totalMs += elapsedMs
  stats.minMs = Math.min(stats.minMs, elapsedMs)
  stats.maxMs = Math.max(stats.maxMs, elapsedMs)

  if (elapsedMs >= SLOW_REQUEST_THRESHOLD_MS) {
    stats.slowCount += 1
  }

  if (status >= 400) {
    stats.errorCount += 1
  }

  routeTimingStats.set(routeKey, stats)

  return stats
}

export async function requestLogger(c: Context, next: Next) {
  const start = performance.now()
  await next()
  const elapsedMs = Number((performance.now() - start).toFixed(2))
  const method = c.req.method
  const path = c.req.path
  const status = c.res.status
  const routeKey = getRouteKey(c, method)
  const stats = updateRouteTimingStats(routeKey, elapsedMs, status)
  const avgMs = Number((stats.totalMs / stats.count).toFixed(2))
  const isSlowRequest = elapsedMs >= SLOW_REQUEST_THRESHOLD_MS

  logger.info({
    msg: 'request',
    method,
    path,
    route: routeKey,
    status,
    elapsedMs,
    isSlowRequest,
    userAgent: c.req.header('user-agent')?.slice(0, 100),
  })

  if (isSlowRequest) {
    logger.warn({
      msg: 'slow_request',
      method,
      path,
      route: routeKey,
      status,
      elapsedMs,
      thresholdMs: SLOW_REQUEST_THRESHOLD_MS,
    })
  }

  if (stats.count % SUMMARY_LOG_EVERY === 0) {
    logger.info({
      msg: 'request_timing_summary',
      route: routeKey,
      count: stats.count,
      avgMs,
      minMs: Number(stats.minMs.toFixed(2)),
      maxMs: Number(stats.maxMs.toFixed(2)),
      slowCount: stats.slowCount,
      errorCount: stats.errorCount,
      slowThresholdMs: SLOW_REQUEST_THRESHOLD_MS,
    })
  }
}

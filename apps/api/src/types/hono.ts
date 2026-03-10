import type { Context, Next } from 'hono'
import type { JwtPayload } from '../lib/jwt'

// 定义 Hono 的变量类型
export type HonoVariables = {
  user: JwtPayload
  validatedBody: unknown
  validatedQuery: unknown
}

// 类型化的 Context
export type AppContext = Context<HonoVariables>

// 辅助函数：获取验证后的 body
export function getValidatedBody<T>(c: AppContext): T {
  return c.get('validatedBody') as T
}

// 辅助函数：获取验证后的 query
export function getValidatedQuery<T>(c: AppContext): T {
  return c.get('validatedQuery') as T
}

// 辅助函数：获取用户信息
export function getUser(c: AppContext): JwtPayload {
  return c.get('user')
}

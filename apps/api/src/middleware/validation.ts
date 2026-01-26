import type { Context, Next } from 'hono'
import type { ZodSchema } from 'zod'

export function validateBody(schema: ZodSchema) {
  return async (c: Context, next: Next) => {
    const body = await c.req.json()
    const validated = schema.parse(body)
    c.set('validatedBody', validated)
    await next()
  }
}

export function validateQuery(schema: ZodSchema) {
  return async (c: Context, next: Next) => {
    const query = c.req.query()
    const validated = schema.parse(query)
    c.set('validatedQuery', validated)
    await next()
  }
}

export function validateParams(schema: ZodSchema) {
  return async (c: Context, next: Next) => {
    const params = c.req.param()
    const validated = schema.parse(params)
    c.set('validatedParams', validated)
    await next()
  }
}

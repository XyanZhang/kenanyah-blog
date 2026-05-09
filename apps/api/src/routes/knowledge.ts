import { Hono } from 'hono'
import { z } from 'zod'
import { listKnowledgeSources, searchKnowledge } from '../lib/knowledge-base'

const knowledge = new Hono()

const sourceQuerySchema = z.object({
  domain: z.string().trim().min(1).max(80).optional(),
})

const searchQuerySchema = z.object({
  q: z.string().trim().min(1, '搜索关键词不能为空').max(500),
  domain: z.string().trim().min(1).max(80).optional(),
  sourceIds: z.string().trim().optional(),
  limit: z.coerce.number().int().min(1).max(10).default(6),
})

knowledge.get('/sources', async (c) => {
  const parsed = sourceQuerySchema.safeParse({
    domain: c.req.query('domain'),
  })
  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.flatten().fieldErrors }, 400)
  }

  return c.json({
    success: true,
    data: await listKnowledgeSources({ domain: parsed.data.domain }),
  })
})

knowledge.get('/search', async (c) => {
  const parsed = searchQuerySchema.safeParse({
    q: c.req.query('q'),
    domain: c.req.query('domain'),
    sourceIds: c.req.query('sourceIds'),
    limit: c.req.query('limit'),
  })
  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.flatten().fieldErrors }, 400)
  }

  const sourceIds = parsed.data.sourceIds
    ?.split(',')
    .map((sourceId) => sourceId.trim())
    .filter(Boolean)

  return c.json({
    success: true,
    data: await searchKnowledge(parsed.data.q, {
      domain: parsed.data.domain,
      sourceIds,
      limit: parsed.data.limit,
    }),
  })
})

export default knowledge

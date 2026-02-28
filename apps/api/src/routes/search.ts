import { Hono } from 'hono'
import { z } from 'zod'
import { searchSemantic } from '../lib/semantic-search'

const search = new Hono()

const semanticQuerySchema = z.object({
  q: z.string().min(1, '搜索关键词不能为空').max(500),
  limit: z.coerce.number().int().min(1).max(20).default(10),
})

// GET /search/semantic?q=...&limit=10
search.get('/semantic', async (c) => {
  const parsed = semanticQuerySchema.safeParse({
    q: c.req.query('q'),
    limit: c.req.query('limit'),
  })
  if (!parsed.success) {
    return c.json(
      { success: false, error: parsed.error.flatten().fieldErrors },
      400
    )
  }
  const { q, limit } = parsed.data
  try {
    const hits = await searchSemantic(q, limit)
    return c.json({
      success: true,
      data: hits,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : '语义搜索失败'
    return c.json({ success: false, error: message }, 500)
  }
})

export default search

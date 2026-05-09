import { Hono } from 'hono'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { z } from 'zod'
import { listKnowledgeSources } from '../lib/knowledge-base'
import {
  indexYijingSource,
  parseYijingText,
  searchYijingKnowledge,
  upsertYijingSourceAndChunks,
  YIJING_DOMAIN,
  YIJING_SOURCE_ID,
} from '../lib/yijing-knowledge'
import { authMiddleware } from '../middleware/auth'

const yijing = new Hono()
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..', '..', '..', '..')
const defaultTextPath = path.join(repoRoot, '易经.txt')

const searchQuerySchema = z.object({
  q: z.string().trim().min(1, '搜索关键词不能为空').max(500),
  limit: z.coerce.number().int().min(1).max(10).default(6),
})

yijing.get('/sources', async (c) => {
  return c.json({
    success: true,
    data: await listKnowledgeSources({ domain: YIJING_DOMAIN }),
  })
})

yijing.post('/import', authMiddleware, async (c) => {
  const body = await c.req.json().catch(() => ({} as any))
  const textPath = typeof body.path === 'string' && body.path.trim()
    ? path.resolve(body.path.trim())
    : defaultTextPath

  const rawText = await fs.readFile(textPath, 'utf8')
  const chunks = await parseYijingText(rawText)
  const source = await upsertYijingSourceAndChunks({
    title: '《易经》全文',
    description: '从项目根目录 易经.txt 导入，用于易经学习 Agent 的原文检索与解释。',
    chunks,
  })
  const indexed = await indexYijingSource(YIJING_SOURCE_ID)

  return c.json({
    success: true,
    data: {
      sourceId: source.sourceId,
      chunkCount: source.chunkCount,
      embeddedCount: indexed.embeddedCount,
      skippedCount: indexed.skippedCount,
      textPath,
    },
  })
})

yijing.get('/search', async (c) => {
  const parsed = searchQuerySchema.safeParse({
    q: c.req.query('q'),
    limit: c.req.query('limit'),
  })
  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.flatten().fieldErrors }, 400)
  }

  const hits = await searchYijingKnowledge(parsed.data.q, { limit: parsed.data.limit })
  return c.json({
    success: true,
    data: hits,
  })
})

export default yijing

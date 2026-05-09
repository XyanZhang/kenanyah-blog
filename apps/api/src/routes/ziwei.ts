import { Hono } from 'hono'
import fs from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { z } from 'zod'
import {
  indexZiweiSource,
  parseZiweiPdfFile,
  searchZiweiKnowledge,
  upsertZiweiSourceAndChunks,
  ZIWEI_DOMAIN,
  ZIWEI_SOURCE_ID,
} from '../lib/ziwei-knowledge'
import { listKnowledgeSources } from '../lib/knowledge-base'
import { authMiddleware } from '../middleware/auth'
import { env } from '../env'

const ziwei = new Hono()
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const apiRoot = path.resolve(__dirname, '..', '..')
const defaultUploadDir = path.join(apiRoot, 'uploads')
const MAX_ZIWEI_PDF_BYTES = 20 * 1024 * 1024

function getUploadDir(): string {
  const dir = env.UPLOAD_DIR || defaultUploadDir
  return path.isAbsolute(dir) ? dir : path.resolve(apiRoot, dir)
}

function getUploadBaseUrl(): string {
  return env.UPLOAD_BASE_URL || `http://localhost:${env.PORT}`
}

function sanitizeFilename(name: string): string {
  const base = path.basename(name)
  return base.replace(/[^\w.\-()\u4e00-\u9fa5]+/g, '_') || 'ziwei.pdf'
}

const importBodySchema = z.object({
  path: z.string().trim().min(1, 'PDF 路径不能为空'),
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(1000).optional(),
})

const searchQuerySchema = z.object({
  q: z.string().trim().min(1, '搜索关键词不能为空').max(500),
  limit: z.coerce.number().int().min(1).max(10).default(6),
})

async function importZiweiPdfFile(input: {
  pdfPath: string
  title?: string
  description?: string
}) {
  const chunks = await parseZiweiPdfFile(input.pdfPath)
  const source = await upsertZiweiSourceAndChunks({
    sourceId: ZIWEI_SOURCE_ID,
    title: input.title ?? '《紫微斗数全书》',
    description:
      input.description ??
      '从《紫微斗数全书》PDF 导入，用于紫微斗数学习、资料检索和后续命理实验室引用。',
    chunks,
  })
  const indexed = await indexZiweiSource(source.sourceId)

  return {
    sourceId: source.sourceId,
    chunkCount: source.chunkCount,
    embeddedCount: indexed.embeddedCount,
    skippedCount: indexed.skippedCount,
  }
}

ziwei.get('/sources', async (c) => {
  return c.json({
    success: true,
    data: await listKnowledgeSources({ domain: ZIWEI_DOMAIN }),
  })
})

ziwei.post('/import', authMiddleware, async (c) => {
  const body = await c.req.json().catch(() => ({} as unknown))
  const parsed = importBodySchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.flatten().fieldErrors }, 400)
  }

  const pdfPath = path.resolve(parsed.data.path)
  const imported = await importZiweiPdfFile({
    pdfPath,
    title: parsed.data.title,
    description: parsed.data.description,
  })

  return c.json({
    success: true,
    data: {
      ...imported,
      pdfPath,
    },
  })
})

ziwei.post('/upload', authMiddleware, async (c) => {
  const form = await c.req.formData()
  const file = form.get('file')
  if (!(file instanceof File)) {
    return c.json({ success: false, error: '缺少文件：file' }, 400)
  }

  const filename = file.name || '紫微斗数全书.pdf'
  const mimeType = file.type || 'application/pdf'
  if (!filename.toLowerCase().endsWith('.pdf')) {
    return c.json({ success: false, error: '仅支持 PDF 文件' }, 400)
  }
  if (mimeType && mimeType !== 'application/pdf') {
    return c.json({ success: false, error: '文件类型必须为 application/pdf' }, 400)
  }
  if (file.size <= 0 || file.size > MAX_ZIWEI_PDF_BYTES) {
    return c.json({ success: false, error: `文件大小需在 0～${MAX_ZIWEI_PDF_BYTES / 1024 / 1024}MB 之间` }, 400)
  }

  const uploadId = `ziwei_${randomUUID()}`
  const safeName = sanitizeFilename(filename)
  const dir = path.join(getUploadDir(), 'ziwei', uploadId)
  await fs.mkdir(dir, { recursive: true })
  const pdfPath = path.join(dir, safeName)
  await fs.writeFile(pdfPath, Buffer.from(await file.arrayBuffer()))

  const imported = await importZiweiPdfFile({
    pdfPath,
    title: typeof form.get('title') === 'string' && String(form.get('title')).trim()
      ? String(form.get('title')).trim()
      : '《紫微斗数全书》',
    description: typeof form.get('description') === 'string' && String(form.get('description')).trim()
      ? String(form.get('description')).trim()
      : undefined,
  })
  const fileUrl = `${getUploadBaseUrl().replace(/\/$/, '')}/uploads/ziwei/${encodeURIComponent(uploadId)}/${encodeURIComponent(safeName)}`

  return c.json({
    success: true,
    data: {
      ...imported,
      filename,
      size: file.size,
      fileUrl,
    },
  })
})

ziwei.get('/search', async (c) => {
  const parsed = searchQuerySchema.safeParse({
    q: c.req.query('q'),
    limit: c.req.query('limit'),
  })
  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.flatten().fieldErrors }, 400)
  }

  const hits = await searchZiweiKnowledge(parsed.data.q, { limit: parsed.data.limit })
  return c.json({
    success: true,
    data: hits,
  })
})

export default ziwei

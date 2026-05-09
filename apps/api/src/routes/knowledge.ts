import { Hono } from 'hono'
import fs from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { z } from 'zod'
import { listKnowledgeSources, searchKnowledge } from '../lib/knowledge-base'
import {
  importKnowledgePdfFile,
  importKnowledgeText,
  KnowledgeTextExtractionError,
} from '../lib/knowledge-pdf-import'
import { authMiddleware } from '../middleware/auth'
import { env } from '../env'

const knowledge = new Hono()
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const apiRoot = path.resolve(__dirname, '..', '..')
const defaultUploadDir = path.join(apiRoot, 'uploads')
const MAX_KNOWLEDGE_PDF_BYTES = 40 * 1024 * 1024
const MAX_KNOWLEDGE_TEXT_BYTES = 20 * 1024 * 1024

function getUploadDir(): string {
  const dir = env.UPLOAD_DIR || defaultUploadDir
  return path.isAbsolute(dir) ? dir : path.resolve(apiRoot, dir)
}

function getUploadBaseUrl(): string {
  return env.UPLOAD_BASE_URL || `http://localhost:${env.PORT}`
}

function sanitizeFilename(name: string): string {
  const base = path.basename(name)
  return base.replace(/[^\w.\-()\u4e00-\u9fa5]+/g, '_') || 'knowledge.pdf'
}

function normalizeOptionalFormText(value: FormDataEntryValue | null): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

const sourceQuerySchema = z.object({
  domain: z.string().trim().min(1).max(80).optional(),
})

const searchQuerySchema = z.object({
  q: z.string().trim().min(1, '搜索关键词不能为空').max(500),
  domain: z.string().trim().min(1).max(80).optional(),
  sourceIds: z.string().trim().optional(),
  limit: z.coerce.number().int().min(1).max(10).default(6),
})

const pdfImportFormSchema = z.object({
  domain: z.string().trim().min(1, 'domain 不能为空').max(80),
  sourceId: z.string().trim().min(1).max(120).optional(),
  title: z.string().trim().min(1, '标题不能为空').max(200),
  description: z.string().trim().max(1000).optional(),
})

const textImportFormSchema = pdfImportFormSchema

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

knowledge.post('/import/pdf', authMiddleware, async (c) => {
  const form = await c.req.formData()
  const file = form.get('file')
  if (!(file instanceof File)) {
    return c.json({ success: false, error: '缺少文件：file' }, 400)
  }

  const parsed = pdfImportFormSchema.safeParse({
    domain: normalizeOptionalFormText(form.get('domain')),
    sourceId: normalizeOptionalFormText(form.get('sourceId')),
    title: normalizeOptionalFormText(form.get('title')) || file.name.replace(/\.pdf$/i, ''),
    description: normalizeOptionalFormText(form.get('description')),
  })
  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.flatten().fieldErrors }, 400)
  }

  const filename = file.name || `${parsed.data.title}.pdf`
  const mimeType = file.type || 'application/pdf'
  if (!filename.toLowerCase().endsWith('.pdf')) {
    return c.json({ success: false, error: '仅支持 PDF 文件' }, 400)
  }
  if (mimeType && mimeType !== 'application/pdf') {
    return c.json({ success: false, error: '文件类型必须为 application/pdf' }, 400)
  }
  if (file.size <= 0 || file.size > MAX_KNOWLEDGE_PDF_BYTES) {
    return c.json({ success: false, error: `文件大小需在 0～${MAX_KNOWLEDGE_PDF_BYTES / 1024 / 1024}MB 之间` }, 400)
  }

  const uploadId = `${parsed.data.domain}_${randomUUID()}`
  const safeName = sanitizeFilename(filename)
  const dir = path.join(getUploadDir(), 'knowledge', parsed.data.domain, uploadId)
  await fs.mkdir(dir, { recursive: true })
  const pdfPath = path.join(dir, safeName)
  await fs.writeFile(pdfPath, Buffer.from(await file.arrayBuffer()))

  let imported: Awaited<ReturnType<typeof importKnowledgePdfFile>>
  try {
    imported = await importKnowledgePdfFile({
      domain: parsed.data.domain,
      sourceId: parsed.data.sourceId,
      title: parsed.data.title,
      description: parsed.data.description,
      pdfPath,
      metadata: {
        originalFilename: filename,
      },
    })
  } catch (err) {
    if (err instanceof KnowledgeTextExtractionError) {
      return c.json({ success: false, error: err.message }, 400)
    }
    throw err
  }
  const fileUrl = `${getUploadBaseUrl().replace(/\/$/, '')}/uploads/knowledge/${encodeURIComponent(parsed.data.domain)}/${encodeURIComponent(uploadId)}/${encodeURIComponent(safeName)}`

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

knowledge.post('/import/text', authMiddleware, async (c) => {
  const form = await c.req.formData()
  const file = form.get('file')
  if (!(file instanceof File)) {
    return c.json({ success: false, error: '缺少文件：file' }, 400)
  }

  const parsed = textImportFormSchema.safeParse({
    domain: normalizeOptionalFormText(form.get('domain')),
    sourceId: normalizeOptionalFormText(form.get('sourceId')),
    title: normalizeOptionalFormText(form.get('title')) || file.name.replace(/\.(txt|md)$/i, ''),
    description: normalizeOptionalFormText(form.get('description')),
  })
  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.flatten().fieldErrors }, 400)
  }

  const filename = file.name || `${parsed.data.title}.txt`
  if (!/\.(txt|md)$/i.test(filename)) {
    return c.json({ success: false, error: '仅支持 .txt 或 .md 文本文件' }, 400)
  }
  if (file.size <= 0 || file.size > MAX_KNOWLEDGE_TEXT_BYTES) {
    return c.json({ success: false, error: `文本大小需在 0～${MAX_KNOWLEDGE_TEXT_BYTES / 1024 / 1024}MB 之间` }, 400)
  }

  const rawText = await file.text()
  let imported: Awaited<ReturnType<typeof importKnowledgeText>>
  try {
    imported = await importKnowledgeText({
      domain: parsed.data.domain,
      sourceId: parsed.data.sourceId,
      title: parsed.data.title,
      description: parsed.data.description,
      rawText,
      metadata: {
        originalFilename: filename,
      },
    })
  } catch (err) {
    if (err instanceof KnowledgeTextExtractionError) {
      return c.json({ success: false, error: err.message }, 400)
    }
    throw err
  }

  return c.json({
    success: true,
    data: {
      ...imported,
      filename,
      size: file.size,
    },
  })
})

export default knowledge

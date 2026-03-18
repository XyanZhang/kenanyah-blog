import { Hono } from 'hono'
import fs from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { z } from 'zod'
import { prisma } from '../lib/db'
import { env } from '../env'
import { extractPdfText } from '../lib/pdf-text'
import { embedDocuments, embedQuery } from '../lib/embeddings'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const apiRoot = path.resolve(__dirname, '..', '..')
const defaultUploadDir = path.join(apiRoot, 'uploads')

function getUploadDir(): string {
  const dir = env.UPLOAD_DIR || defaultUploadDir
  return path.isAbsolute(dir) ? dir : path.resolve(apiRoot, dir)
}

function getUploadBaseUrl(): string {
  return env.UPLOAD_BASE_URL || `http://localhost:${env.PORT}`
}

const pdf = new Hono()

const MAX_PDF_BYTES = 20 * 1024 * 1024

// POST /pdf/documents (multipart/form-data: file)
pdf.post('/documents', async (c) => {
  const form = await c.req.formData()
  const file = form.get('file')
  if (!(file instanceof File)) {
    return c.json({ success: false, error: '缺少文件：file' }, 400)
  }

  const filename = file.name || 'document.pdf'
  const mimeType = file.type || 'application/pdf'
  const size = file.size

  if (!filename.toLowerCase().endsWith('.pdf')) {
    return c.json({ success: false, error: '仅支持 PDF 文件' }, 400)
  }
  if (mimeType && mimeType !== 'application/pdf') {
    // 某些浏览器/系统可能给空 type，这里只在明确非 pdf 时拦
    return c.json({ success: false, error: '文件类型必须为 application/pdf' }, 400)
  }
  if (size <= 0 || size > MAX_PDF_BYTES) {
    return c.json({ success: false, error: `文件大小需在 0～${MAX_PDF_BYTES / 1024 / 1024}MB 之间` }, 400)
  }

  const id = `pdf_${randomUUID()}`
  const subdir = 'pdfs'
  const safeName = `${id}.pdf`
  const dir = path.join(getUploadDir(), subdir)
  await fs.mkdir(dir, { recursive: true })
  const filePath = path.join(dir, safeName)
  const buf = Buffer.from(await file.arrayBuffer())
  await fs.writeFile(filePath, buf)

  const baseUrl = getUploadBaseUrl().replace(/\/$/, '')
  const fileUrl = `${baseUrl}/uploads/${subdir}/${safeName}`

  const doc = await prisma.pdfDocument.create({
    data: {
      id,
      filename,
      mimeType: 'application/pdf',
      size,
      fileUrl,
      status: 'uploaded',
    },
  })

  return c.json({ success: true, data: doc })
})

const parseSchema = z.object({
  documentId: z.string().min(1),
})

// POST /pdf/documents/:id/parse
pdf.post('/documents/:id/parse', async (c) => {
  const { id } = c.req.param()
  const parsed = parseSchema.safeParse({ documentId: id })
  if (!parsed.success) {
    return c.json({ success: false, error: 'Invalid documentId' }, 400)
  }

  const doc = await prisma.pdfDocument.findUnique({ where: { id } })
  if (!doc) return c.json({ success: false, error: 'PDF 文档不存在' }, 404)

  // 根据 fileUrl 推断出本地路径（当前仅支持本地 uploads）
  const url = new URL(doc.fileUrl)
  const parts = url.pathname.split('/').filter(Boolean)
  const subdir = parts[parts.length - 2]
  const filename = parts[parts.length - 1]
  const localPath = path.join(getUploadDir(), subdir, filename)

  const { text } = await extractPdfText(localPath)
  const normalized = text.replace(/\r/g, '').trim()
  if (!normalized) {
    return c.json({ success: false, error: '未能从 PDF 提取到文本（可能是扫描件）' }, 400)
  }

  // 先清空旧 chunks
  await prisma.pdfChunk.deleteMany({ where: { documentId: id } })

  // 简单切分：按空行/段落切，再合并到接近目标长度
  const TARGET = 1000
  const MAX = 1400
  const paras = normalized.split(/\n{2,}/g).map((s) => s.trim()).filter(Boolean)
  const chunks: string[] = []
  let acc = ''
  for (const p of paras) {
    const next = acc ? `${acc}\n\n${p}` : p
    if (next.length <= MAX) {
      acc = next
      if (acc.length >= TARGET) {
        chunks.push(acc)
        acc = ''
      }
    } else {
      if (acc) chunks.push(acc)
      if (p.length <= MAX) {
        chunks.push(p)
        acc = ''
      } else {
        // 超长段落：硬切
        for (let i = 0; i < p.length; i += TARGET) {
          chunks.push(p.slice(i, i + TARGET))
        }
        acc = ''
      }
    }
  }
  if (acc) chunks.push(acc)

  const created = await prisma.$transaction(
    chunks.map((content, idx) =>
      prisma.pdfChunk.create({
        data: { documentId: id, chunkIndex: idx, content },
      })
    )
  )

  await prisma.pdfDocument.update({ where: { id }, data: { status: 'parsed' } })

  return c.json({
    success: true,
    data: {
      documentId: id,
      chunkCount: created.length,
      preview: created.slice(0, 2).map((c) => ({ chunkIndex: c.chunkIndex, content: c.content.slice(0, 300) })),
    },
  })
})

// POST /pdf/documents/:id/index
pdf.post('/documents/:id/index', async (c) => {
  const { id } = c.req.param()
  const doc = await prisma.pdfDocument.findUnique({ where: { id } })
  if (!doc) return c.json({ success: false, error: 'PDF 文档不存在' }, 404)

  const chunks = await prisma.pdfChunk.findMany({
    where: { documentId: id },
    orderBy: { chunkIndex: 'asc' },
  })
  if (chunks.length === 0) {
    return c.json({ success: false, error: '请先解析 PDF（无 chunks）' }, 400)
  }

  // 清理旧 embedding
  await prisma.pdfChunkEmbedding.deleteMany({ where: { documentId: id } })

  const vectors = await embedDocuments(chunks.map((c) => c.content))
  if (vectors.length !== chunks.length) {
    return c.json({ success: false, error: 'Embedding 返回数量异常' }, 500)
  }

  await prisma.$transaction(
    chunks.map((chunk, i) => {
      const embedding = vectors[i]
      const embStr = `[${embedding.join(',')}]`
      const embId = `pce_${randomUUID().replace(/-/g, '')}`
      // Prisma 不支持 vector 类型写入，这里用 raw SQL
      return (prisma as any).$executeRawUnsafe(
        `INSERT INTO pdf_chunk_embeddings (id, document_id, chunk_id, chunk_index, content, embedding)
         VALUES ($1, $2, $3, $4, $5, $6::vector)`,
        embId,
        id,
        chunk.id,
        chunk.chunkIndex,
        chunk.content,
        embStr
      )
    })
  )

  await prisma.pdfDocument.update({ where: { id }, data: { status: 'indexed' } })

  return c.json({ success: true, data: { documentId: id, chunkCount: chunks.length } })
})

// GET /pdf/documents/:id/search?q=...&limit=10
pdf.get('/documents/:id/search', async (c) => {
  const { id } = c.req.param()
  const q = (c.req.query('q') ?? '').trim()
  const limit = Math.min(Math.max(parseInt(c.req.query('limit') ?? '10', 10) || 10, 1), 20)
  if (!q) return c.json({ success: false, error: '搜索关键词不能为空' }, 400)

  const queryVector = await embedQuery(q)
  const vec = `[${queryVector.join(',')}]`

  type Row = { chunk_id: string; chunk_index: number; content: string; score: number }
  const rows = (await (prisma as any).$queryRawUnsafe(
    `SELECT pce.chunk_id, pce.chunk_index, pce.content,
            1 - (pce.embedding <=> $1::vector) AS score
     FROM pdf_chunk_embeddings pce
     WHERE pce.document_id = $2
     ORDER BY pce.embedding <=> $1::vector
     LIMIT $3`,
    vec,
    id,
    limit
  )) as Row[]

  return c.json({
    success: true,
    data: rows.map((r) => ({
      chunkId: r.chunk_id,
      chunkIndex: r.chunk_index,
      snippet: r.content.slice(0, 240).replace(/\s+/g, ' '),
      score: Number(r.score),
    })),
  })
})

// POST /pdf/documents/:id/generate-doc
pdf.post('/documents/:id/generate-doc', async (c) => {
  const { id } = c.req.param()
  const body = await c.req.json().catch(() => ({} as any))
  const style = typeof body.style === 'string' ? body.style.trim() : ''

  const chunks = await prisma.pdfChunk.findMany({
    where: { documentId: id },
    orderBy: { chunkIndex: 'asc' },
    take: 20,
  })
  if (chunks.length === 0) {
    return c.json({ success: false, error: '请先解析 PDF' }, 400)
  }

  const sample = chunks.map((c) => `【Chunk ${c.chunkIndex}】\n${c.content}`).join('\n\n').slice(0, 8000)

  const systemPrompt = [
    '你是一个中文知识整理助手。请根据给定的 PDF 内容片段，生成一份结构清晰的 Markdown 文档。',
    '要求：',
    '1. 输出必须是 Markdown（包含标题、要点、必要时的列表）。',
    '2. 不要编造 PDF 中不存在的信息；不确定就标注“（原文未明确）”。',
    '3. 适合“快速阅读 + 复习”。',
    style ? `4. 风格偏好：${style}` : null,
  ].filter(Boolean).join('\n')

  const userPrompt = `以下为 PDF 内容片段（可能不完整）：\n\n${sample}\n\n请生成 Markdown 文档。`

  // 复用现有 invokeChat（非流式），后续再加 stream 版本
  const { invokeChat } = await import('../lib/llm')
  const markdown = await invokeChat(userPrompt, systemPrompt)

  return c.json({ success: true, data: { markdown } })
})

export default pdf


import { Hono } from 'hono'
import fs from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { z } from 'zod'
import { prisma } from '../lib/db'
import { authMiddleware } from '../middleware/auth'
import { env } from '../env'
import { extractPdfText } from '../lib/pdf-text'
import { embedDocuments, embedQuery } from '../lib/embeddings'
import { cleanPdfText, mergeSoftLineBreaks, removeSpacesKeepNewlines } from '../lib/pdf-clean'
import { splitTextForRag } from '../lib/text-splitter'
import { generateSlug } from '@blog/utils'
import { indexPost } from '../lib/semantic-search'
import { logger } from '../lib/logger'

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

type PdfVariables = {
  user: { userId: string; role: string }
}

const pdf = new Hono<{ Variables: PdfVariables }>()

const MAX_PDF_BYTES = 20 * 1024 * 1024

function sanitizeFilename(name: string): string {
  const base = path.basename(name)
  // 仅保留常见安全字符；其余替换为下划线，避免奇怪的路径/URL 问题
  const cleaned = base.replace(/[^\w.\-()\u4e00-\u9fa5]+/g, '_')
  // 防止空文件名
  return cleaned || 'document.pdf'
}

// POST /pdf/documents (multipart/form-data: file)
pdf.post('/documents', async (c) => {
  const replace = c.req.query('replace') === 'true'
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

  const existingByName = await prisma.pdfDocument.findFirst({
    where: { filename },
    orderBy: { createdAt: 'desc' },
  })
  if (existingByName && !replace) {
    return c.json(
      {
        success: false,
        error: '已存在同名 PDF。若要覆盖旧文件，请勾选“同名覆盖”后重试。',
      },
      409
    )
  }

  const id = existingByName?.id ?? `pdf_${randomUUID()}`
  const subdir = 'pdfs'
  const safeOriginalName = sanitizeFilename(filename)
  const dir = path.join(getUploadDir(), subdir, id)
  await fs.mkdir(dir, { recursive: true })
  const filePath = path.join(dir, safeOriginalName)
  const buf = Buffer.from(await file.arrayBuffer())
  await fs.writeFile(filePath, buf)

  const baseUrl = getUploadBaseUrl().replace(/\/$/, '')
  const fileUrl = `${baseUrl}/uploads/${subdir}/${encodeURIComponent(id)}/${encodeURIComponent(safeOriginalName)}`

  const doc = existingByName
    ? await prisma.$transaction(async (tx) => {
        // 覆盖旧文档时清空旧 chunks（embedding 会级联删除）
        await tx.pdfChunk.deleteMany({ where: { documentId: existingByName.id } })
        return tx.pdfDocument.update({
          where: { id: existingByName.id },
          data: {
            filename,
            mimeType: 'application/pdf',
            size,
            fileUrl,
            status: 'uploaded',
          },
        })
      })
    : await prisma.pdfDocument.create({
        data: {
          id,
          filename,
          mimeType: 'application/pdf',
          size,
          fileUrl,
          status: 'uploaded',
        },
      })

  return c.json({
    success: true,
    data: {
      ...doc,
      replaced: Boolean(existingByName),
    },
  })
})

const parseSchema = z.object({
  documentId: z.string().min(1),
})

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * p)))
  return sorted[idx]
}

function buildChunkPreviewForResponse(chunks: Array<{ chunkIndex: number; content: string }>) {
  const head = chunks.slice(0, 10).map((c) => ({
    chunkIndex: c.chunkIndex,
    content: c.content.slice(0, 300),
  }))
  const tail = chunks.slice(-3).map((c) => ({
    chunkIndex: c.chunkIndex,
    content: c.content.slice(0, 300),
  }))
  return {
    total: chunks.length,
    head,
    tail,
  }
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size))
  }
  return out
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const size = Math.max(1, concurrency)
  const results: R[] = new Array(items.length)
  let cursor = 0

  const runners = Array.from({ length: Math.min(size, items.length) }, async () => {
    while (true) {
      const index = cursor
      cursor += 1
      if (index >= items.length) return
      results[index] = await worker(items[index], index)
    }
  })

  await Promise.all(runners)
  return results
}

// POST /pdf/documents/:id/parse
pdf.post('/documents/:id/parse', async (c) => {
  const startedAt = Date.now()
  const { id } = c.req.param()
  const parsed = parseSchema.safeParse({ documentId: id })
  if (!parsed.success) {
    return c.json({ success: false, error: 'Invalid documentId' }, 400)
  }

  const doc = await prisma.pdfDocument.findUnique({ where: { id } })
  if (!doc) return c.json({ success: false, error: 'PDF 文档不存在' }, 404)

  // 根据 fileUrl 推断出本地路径（当前仅支持本地 uploads）
  // 支持 /uploads/:subdir/:filename 和 /uploads/:subdir/:subsubdir/:filename 两种形式
  const url = new URL(doc.fileUrl)
  const parts = url.pathname.split('/').filter(Boolean) // e.g. ['uploads','pdfs','pdf_xxx','原文件.pdf']
  const uploadsIdx = parts.indexOf('uploads')
  const rel = uploadsIdx >= 0 ? parts.slice(uploadsIdx + 1) : parts
  if (rel.length < 2) {
    return c.json({ success: false, error: 'fileUrl 路径不合法' }, 400)
  }
  const decodedRel = rel.map((seg) => {
    try {
      return decodeURIComponent(seg)
    } catch {
      return seg
    }
  })
  const localPath = path.join(getUploadDir(), ...decodedRel)

  const { text } = await extractPdfText(localPath)
  const normalized = text.replace(/\r/g, '').trim()
  if (!normalized) {
    return c.json({ success: false, error: '未能从 PDF 提取到文本（可能是扫描件）' }, 400)
  }

  // 先合并软换行，再清洗（保留双换行段落）
  const softened = mergeSoftLineBreaks(normalized)
  const noSpaces = removeSpacesKeepNewlines(softened)
  const { text: cleaned, report: cleanReport } = cleanPdfText(noSpaces)
  if (!cleaned) {
    return c.json({ success: false, error: 'PDF 文本清洗后为空（可能是扫描件/噪声过多）' }, 400)
  }

  // 可控切分标准（中文）：目标 800–1200，硬上限 1600，overlap 160
  const chunks = await splitTextForRag(cleaned, {
    targetLen: 1000,
    maxLen: 1600,
    overlap: 160,
    minLen: 200,
  })
  const chunkLens = chunks.map((c) => c.length)
  const sortedLens = [...chunkLens].sort((a, b) => a - b)
  const parseStats = {
    chunkCount: chunks.length,
    min: sortedLens[0] ?? 0,
    p50: percentile(sortedLens, 0.5),
    p90: percentile(sortedLens, 0.9),
    max: sortedLens[sortedLens.length - 1] ?? 0,
    tooShortCount: chunkLens.filter((n) => n < 200).length,
    tooLongCount: chunkLens.filter((n) => n > 1600).length,
  }

  // upsert：保持 chunkId 稳定，便于 embedding 增量与失败续跑
  const created = await prisma.$transaction(
    chunks.map((content, idx) =>
      prisma.pdfChunk.upsert({
        where: { documentId_chunkIndex: { documentId: id, chunkIndex: idx } },
        create: { documentId: id, chunkIndex: idx, content },
        update: { content },
      })
    )
  )

  // 删除多余旧 chunk（当本次 chunk 数减少时）
  await prisma.pdfChunk.deleteMany({
    where: { documentId: id, chunkIndex: { gte: chunks.length } },
  })

  await prisma.pdfDocument.update({ where: { id }, data: { status: 'parsed' } })

  logger.info(
    {
      op: 'pdf.parse',
      documentId: id,
      filename: doc.filename,
      sourceTextLen: normalized.length,
      cleanedTextLen: cleaned.length,
      chunkCount: created.length,
      parseStats,
      cleanReport,
      elapsedMs: Date.now() - startedAt,
    },
    '[pdf] parse finished'
  )
  logger.debug(
    {
      op: 'pdf.parse.preview',
      documentId: id,
      previewHead: created.slice(0, 5).map((c) => ({
        chunkIndex: c.chunkIndex,
        len: c.content.length,
        preview: c.content.slice(0, 160),
      })),
      previewTail: created.slice(-3).map((c) => ({
        chunkIndex: c.chunkIndex,
        len: c.content.length,
        preview: c.content.slice(0, 160),
      })),
      totalChunkCount: created.length,
    },
    '[pdf] parse preview'
  )

  return c.json({
    success: true,
    data: {
      documentId: id,
      chunkCount: created.length,
      chunks: created.map((c) => ({
        chunkIndex: c.chunkIndex,
        content: c.content,
      })),
      preview: buildChunkPreviewForResponse(created),
      cleanReport,
      parseStats,
    },
  })
})

// POST /pdf/documents/:id/index
pdf.post('/documents/:id/index', async (c) => {
  const startedAt = Date.now()
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

  // 增量：已存在且 content 未变化的 chunk 跳过；其余做 upsert
  type ExistingRow = { chunk_id: string; content: string }
  const existing = (await (prisma as any).$queryRawUnsafe(
    `SELECT chunk_id, content FROM pdf_chunk_embeddings WHERE document_id = $1`,
    id
  )) as ExistingRow[]
  const existingMap = new Map<string, string>(existing.map((r) => [r.chunk_id, r.content]))

  const toEmbed = chunks.filter((c) => existingMap.get(c.id) !== c.content)
  if (toEmbed.length > 0) {
    logger.debug(
      {
        op: 'pdf.index.embed',
        documentId: id,
        totalChunkCount: chunks.length,
        changedChunkCount: toEmbed.length,
      },
      '[pdf] indexing changed chunks'
    )
    const vectors = await embedDocuments(toEmbed.map((c) => c.content))
    if (vectors.length !== toEmbed.length) {
      return c.json({ success: false, error: 'Embedding 返回数量异常' }, 500)
    }

    for (let i = 0; i < toEmbed.length; i++) {
      const chunk = toEmbed[i]
      const embedding = vectors[i]
      const embStr = `[${embedding.join(',')}]`
      const existingContent = existingMap.get(chunk.id)
      const embId =
        existingContent === undefined
          ? `pce_${randomUUID().replace(/-/g, '')}`
          : `pce_${randomUUID().replace(/-/g, '')}` // id 仅用于插入；冲突时不会使用

      await (prisma as any).$executeRawUnsafe(
        `INSERT INTO pdf_chunk_embeddings (id, document_id, chunk_id, chunk_index, content, embedding)
         VALUES ($1, $2, $3, $4, $5, $6::vector)
         ON CONFLICT (chunk_id) DO UPDATE SET
           chunk_index = EXCLUDED.chunk_index,
           content = EXCLUDED.content,
           embedding = EXCLUDED.embedding`,
        embId,
        id,
        chunk.id,
        chunk.chunkIndex,
        chunk.content,
        embStr
      )
    }
  }

  // 清理：移除那些对应 chunk 已不存在的 embedding（chunk 删除会 cascade，这里兜底）
  await (prisma as any).$executeRawUnsafe(
    `DELETE FROM pdf_chunk_embeddings pce
     WHERE pce.document_id = $1
       AND NOT EXISTS (SELECT 1 FROM pdf_chunks pc WHERE pc.id = pce.chunk_id)`,
    id
  )

  await prisma.pdfDocument.update({ where: { id }, data: { status: 'indexed' } })

  logger.info(
    {
      op: 'pdf.index',
      documentId: id,
      totalChunkCount: chunks.length,
      embeddedCount: toEmbed.length,
      skippedCount: chunks.length - toEmbed.length,
      elapsedMs: Date.now() - startedAt,
    },
    '[pdf] index finished'
  )

  return c.json({
    success: true,
    data: {
      documentId: id,
      chunkCount: chunks.length,
      embeddedCount: toEmbed.length,
      skippedCount: chunks.length - toEmbed.length,
    },
  })
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
  const startedAt = Date.now()
  const { id } = c.req.param()
  const body = await c.req.json().catch(() => ({} as any))
  const style = typeof body.style === 'string' ? body.style.trim() : ''

  const chunks = await prisma.pdfChunk.findMany({
    where: { documentId: id },
    orderBy: { chunkIndex: 'asc' },
  })
  if (chunks.length === 0) {
    return c.json({ success: false, error: '请先解析 PDF' }, 400)
  }

  // 复用现有 invokeChat（非流式）
  const { invokeChat } = await import('../lib/llm')

  // 两阶段总结参数：并发局部总结 -> 最终统一优化
  const BATCH_SIZE = 8
  const LOCAL_CONCURRENCY = 10
  const localBatches = chunkArray(chunks, BATCH_SIZE)

  const localSystemPrompt = [
    '你是一个中文文档分块总结助手。请对给定批次内容生成“局部总结”Markdown。',
    '要求：',
    '1. 只基于输入内容，不要编造。',
    '2. 保留关键事实、数字、结论、风险点。',
    '3. 对不确定内容标注“（原文未明确）”。',
    '4. 输出结构：本批主题、关键要点、重要细节、可疑/冲突信息（如有）。',
    style ? `5. 风格偏好：${style}` : null,
  ].filter(Boolean).join('\n')

  const localSummaries: string[] = []
  const localStartedAt = Date.now()
  logger.info(
    {
      op: 'pdf.generateDoc.start',
      documentId: id,
      totalChunks: chunks.length,
      localBatchCount: localBatches.length,
      batchSize: BATCH_SIZE,
      localConcurrency: LOCAL_CONCURRENCY,
    },
    '[pdf] generate-doc started'
  )
  const partials = await mapWithConcurrency(localBatches, LOCAL_CONCURRENCY, async (batch, i) => {
    const batchStartedAt = Date.now()
    const batchText = batch.map((c) => `【Chunk ${c.chunkIndex}】\n${c.content}`).join('\n\n')
    const userPrompt = [
      `这是第 ${i + 1}/${localBatches.length} 批内容：`,
      batchText,
      '',
      '请输出该批次的局部总结（Markdown）。',
    ].join('\n')
    const partial = (await invokeChat(userPrompt, localSystemPrompt)).trim()
    logger.info(
      {
        op: 'pdf.generateDoc.localBatch',
        documentId: id,
        batchIndex: i,
        batchNo: i + 1,
        batchTotal: localBatches.length,
        chunkRange: {
          start: batch[0]?.chunkIndex ?? null,
          end: batch[batch.length - 1]?.chunkIndex ?? null,
        },
        elapsedMs: Date.now() - batchStartedAt,
      },
      '[pdf] generate-doc local batch done'
    )
    return partial
  })
  localSummaries.push(...partials)

  const finalSystemPrompt = [
    '你是一个中文知识整理助手。请根据给定的全部局部总结结果，生成一份结构清晰、覆盖完整的 Markdown 文档。',
    '要求：',
    '1. 输出必须是 Markdown（包含标题、要点、必要时的列表）。',
    '2. 不要编造原文中不存在的信息；不确定就标注“（原文未明确）”。',
    '3. 适合“快速阅读 + 复习”。',
    '4. 优先保证覆盖完整性：尽量覆盖所有批次提到的关键要点与事实。',
    style ? `4. 风格偏好：${style}` : null,
  ].filter(Boolean).join('\n')

  const finalInput = localSummaries.map((s, i) => `【Local Summary ${i + 1}】\n${s}`).join('\n\n')
  logger.info(
    {
      op: 'pdf.generateDoc.finalStart',
      documentId: id,
      mergedSummaryCount: localSummaries.length,
      finalInputLen: finalInput.length,
    },
    '[pdf] generate-doc final composing start'
  )
  const llmStartedAt = Date.now()
  const markdown = await invokeChat(
    `以下是由完整 PDF 分批总结并归并后的结果，请基于它生成最终 Markdown 文档：\n\n${finalInput}`,
    finalSystemPrompt
  )
  logger.info(
    {
      op: 'pdf.generateDoc.output',
      documentId: id,
      totalChunks: chunks.length,
      localBatchCount: localBatches.length,
      reduceLevels: 0,
      localElapsedMs: Date.now() - localStartedAt,
      markdownLen: markdown.length,
      llmElapsedMs: Date.now() - llmStartedAt,
      elapsedMs: Date.now() - startedAt,
    },
    '[pdf] generate-doc finished'
  )

  return c.json({ success: true, data: { markdown } })
})

const savePostSchema = z.object({
  markdown: z.string().min(1),
  title: z.string().max(200).optional(),
  excerpt: z.string().max(500).optional(),
})

function stripMarkdownForExcerpt(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!\[[^\]]*]\([^)]+\)/g, ' ')
    .replace(/\[[^\]]*]\([^)]+\)/g, ' ')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^>\s+/gm, '')
    .replace(/[*_~]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// POST /pdf/documents/:id/save-post (默认不触发 embedding，避免重复成本)
pdf.post('/documents/:id/save-post', authMiddleware, async (c) => {
  const startedAt = Date.now()
  const { id } = c.req.param()
  const doc = await prisma.pdfDocument.findUnique({ where: { id } })
  if (!doc) return c.json({ success: false, error: 'PDF 文档不存在' }, 404)

  const shouldIndex = c.req.query('index') === 'true'
  const body = await c.req.json().catch(() => ({} as unknown))
  const parsed = savePostSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ success: false, error: '参数不合法' }, 400)
  }

  const { userId } = c.get('user')
  const markdown = parsed.data.markdown.trim()

  const defaultTitle = doc.filename.replace(/\.pdf$/i, '') || 'PDF 笔记'
  const title = (parsed.data.title?.trim() || defaultTitle).slice(0, 200)
  const excerpt =
    (parsed.data.excerpt?.trim() || stripMarkdownForExcerpt(markdown).slice(0, 120)).trim() ||
    undefined

  // 生成唯一 slug（复用 posts.ts 的逻辑风格）
  let slugToUse = generateSlug(title)
  if (!slugToUse) slugToUse = `post-${Date.now()}`
  const existing = await prisma.post.findUnique({ where: { slug: slugToUse } })
  if (existing) slugToUse = `${slugToUse}-${Date.now()}`

  const post = await prisma.post.create({
    data: {
      slug: slugToUse,
      title,
      excerpt,
      content: markdown,
      published: false,
      publishedAt: null,
      isFeatured: false,
      authorId: userId,
    },
    select: { id: true, slug: true, title: true },
  })

  if (shouldIndex) {
    indexPost(post.id).catch((err) =>
      console.error('[semantic-search] index post failed:', err)
    )
  }

  logger.info(
    {
      op: 'pdf.savePost',
      documentId: id,
      postId: post.id,
      slug: post.slug,
      indexed: shouldIndex,
      elapsedMs: Date.now() - startedAt,
    },
    '[pdf] save-post finished'
  )

  return c.json({ success: true, data: { ...post, indexed: shouldIndex } }, 201)
})

export default pdf


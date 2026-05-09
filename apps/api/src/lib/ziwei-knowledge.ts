import { randomUUID } from 'node:crypto'
import { embedDocuments, embedQuery, getEmbeddingsModel } from './embeddings'
import { prisma } from './db'
import { cleanPdfText, mergeSoftLineBreaks, removeSpacesKeepNewlines } from './pdf-clean'
import { extractPdfText } from './pdf-text'
import { splitTextForRag } from './text-splitter'

export const ZIWEI_SOURCE_ID = 'ziwei-doushu-quanshu'

export type ZiweiParsedChunk = {
  chunkIndex: number
  title: string
  sectionTitle: string | null
  content: string
}

export type ZiweiSearchHit = {
  sourceId: string
  chunkId: string
  chunkIndex: number
  title: string
  sectionTitle: string | null
  snippet: string
  score: number
}

type ZiweiSection = {
  heading: string
  sectionTitle: string | null
  body: string
}

function vectorToPgString(vec: number[]): string {
  return `[${vec.join(',')}]`
}

function normalizeZiweiText(text: string): string {
  return text.replace(/\r/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim()
}

function normalizePdfExtractedText(rawText: string): string {
  const normalized = rawText.replace(/\r/g, '').trim()
  const softened = mergeSoftLineBreaks(normalized)
  const noSpaces = removeSpacesKeepNewlines(softened)
  return cleanPdfText(noSpaces).text
}

function isZiweiHeading(line: string): boolean {
  const text = line.trim()
  if (!text || text.length > 42) return false
  if (/[，,。！？；;]/.test(text)) return false
  if (/^[一二三四五六七八九十百零〇两]+[、.．]\S+/.test(text)) return true
  if (/^第[一二三四五六七八九十百零〇两\d]+[章节卷篇部]\s*\S*/.test(text)) return true
  if (/^(?:命宫|身宫|兄弟宫|夫妻宫|子女宫|财帛宫|疾厄宫|迁移宫|交友宫|奴仆宫|官禄宫|田宅宫|福德宫|父母宫)/.test(text)) return true
  if (/^(?:紫微|天机|太阳|武曲|天同|廉贞|天府|太阴|贪狼|巨门|天相|天梁|七杀|破军)[星曜]?.{0,12}$/.test(text)) return true
  if (/^(?:四化|化禄|化权|化科|化忌|大限|流年|格局|庙旺|陷地|十二宫|十四主星).{0,18}$/.test(text)) return true
  return false
}

export function splitZiweiSections(rawText: string): ZiweiSection[] {
  const text = normalizeZiweiText(rawText)
  const lines = text.split('\n')
  const headingIndexes: Array<{ index: number; heading: string }> = []

  for (const [index, line] of lines.entries()) {
    if (isZiweiHeading(line)) {
      headingIndexes.push({ index, heading: line.trim() })
    }
  }

  if (headingIndexes.length === 0) {
    return [
      {
        heading: '《紫微斗数全书》全文',
        sectionTitle: null,
        body: text,
      },
    ]
  }

  return headingIndexes.map((entry, index) => {
    const next = headingIndexes[index + 1]
    const sectionLines = lines.slice(entry.index, next ? next.index : lines.length)
    return {
      heading: entry.heading,
      sectionTitle: entry.heading,
      body: sectionLines.join('\n').trim(),
    }
  })
}

export async function parseZiweiText(rawText: string): Promise<ZiweiParsedChunk[]> {
  const sections = splitZiweiSections(rawText)
  const chunks: ZiweiParsedChunk[] = []

  for (const section of sections) {
    const parts = await splitTextForRag(section.body, {
      targetLen: 1000,
      maxLen: 1600,
      overlap: 140,
      minLen: 120,
    })

    const safeParts = parts.length > 0 ? parts : [section.body]
    for (const [partIndex, part] of safeParts.entries()) {
      chunks.push({
        chunkIndex: chunks.length,
        title: safeParts.length > 1 ? `${section.heading} · ${partIndex + 1}` : section.heading,
        sectionTitle: section.sectionTitle,
        content: part.trim(),
      })
    }
  }

  return chunks
}

export async function parseZiweiPdfFile(filePath: string): Promise<ZiweiParsedChunk[]> {
  const { text } = await extractPdfText(filePath)
  const cleaned = normalizePdfExtractedText(text)
  if (!cleaned) {
    throw new Error('未能从 PDF 提取到有效文本（可能是扫描件或文本噪声过多）')
  }
  return parseZiweiText(cleaned)
}

export async function upsertZiweiSourceAndChunks(input: {
  sourceId?: string
  title: string
  description?: string
  chunks: ZiweiParsedChunk[]
}): Promise<{ sourceId: string; chunkCount: number }> {
  const sourceId = input.sourceId ?? ZIWEI_SOURCE_ID

  await (prisma as any).$executeRawUnsafe(
    `INSERT INTO ziwei_sources (id, title, description, status, chunk_count)
     VALUES ($1, $2, $3, 'ready', $4)
     ON CONFLICT (id) DO UPDATE SET
       title = EXCLUDED.title,
       description = EXCLUDED.description,
       status = EXCLUDED.status,
       chunk_count = EXCLUDED.chunk_count,
       updated_at = now()`,
    sourceId,
    input.title,
    input.description ?? null,
    input.chunks.length
  )

  for (const chunk of input.chunks) {
    await (prisma as any).$executeRawUnsafe(
      `INSERT INTO ziwei_chunks (id, source_id, chunk_index, title, section_title, content)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (source_id, chunk_index) DO UPDATE SET
         title = EXCLUDED.title,
         section_title = EXCLUDED.section_title,
         content = EXCLUDED.content,
         updated_at = now()`,
      `zc_${sourceId}_${chunk.chunkIndex}`,
      sourceId,
      chunk.chunkIndex,
      chunk.title,
      chunk.sectionTitle,
      chunk.content
    )
  }

  await (prisma as any).$executeRawUnsafe(
    `DELETE FROM ziwei_chunks WHERE source_id = $1 AND chunk_index >= $2`,
    sourceId,
    input.chunks.length
  )

  return {
    sourceId,
    chunkCount: input.chunks.length,
  }
}

export async function indexZiweiSource(sourceId: string = ZIWEI_SOURCE_ID): Promise<{
  sourceId: string
  chunkCount: number
  embeddedCount: number
  skippedCount: number
}> {
  const model = getEmbeddingsModel()
  if (!model) {
    throw new Error('Embedding 未配置：请设置 EMBEDDINGS_API_KEY 或 OPENAI_API_KEY')
  }

  const chunks = (await (prisma as any).$queryRawUnsafe(
    `SELECT id, source_id AS "sourceId", chunk_index AS "chunkIndex", title,
            section_title AS "sectionTitle", content
     FROM ziwei_chunks
     WHERE source_id = $1
     ORDER BY chunk_index ASC`,
    sourceId
  )) as Array<{
    id: string
    sourceId: string
    chunkIndex: number
    title: string
    sectionTitle: string | null
    content: string
  }>

  type ExistingRow = { chunk_id: string; content: string; title: string }
  const existing = (await (prisma as any).$queryRawUnsafe(
    `SELECT chunk_id, content, title FROM ziwei_chunk_embeddings WHERE source_id = $1`,
    sourceId
  )) as ExistingRow[]
  const existingMap = new Map(existing.map((row) => [row.chunk_id, `${row.title}\n${row.content}`]))
  const toEmbed = chunks.filter((chunk) => existingMap.get(chunk.id) !== `${chunk.title}\n${chunk.content}`)

  if (toEmbed.length > 0) {
    const vectors = await embedDocuments(toEmbed.map((chunk) => `${chunk.title}\n${chunk.content}`))
    if (vectors.length !== toEmbed.length) {
      throw new Error('Embedding 返回数量异常')
    }

    for (let i = 0; i < toEmbed.length; i++) {
      const chunk = toEmbed[i]
      const embedding = vectors[i]
      await (prisma as any).$executeRawUnsafe(
        `INSERT INTO ziwei_chunk_embeddings (id, source_id, chunk_id, chunk_index, title, section_title, content, embedding)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8::vector)
         ON CONFLICT (chunk_id) DO UPDATE SET
           chunk_index = EXCLUDED.chunk_index,
           title = EXCLUDED.title,
           section_title = EXCLUDED.section_title,
           content = EXCLUDED.content,
           embedding = EXCLUDED.embedding`,
        `zwe_${randomUUID().replace(/-/g, '')}`,
        sourceId,
        chunk.id,
        chunk.chunkIndex,
        chunk.title,
        chunk.sectionTitle,
        chunk.content,
        vectorToPgString(embedding)
      )
    }
  }

  await (prisma as any).$executeRawUnsafe(
    `DELETE FROM ziwei_chunk_embeddings zwe
     WHERE zwe.source_id = $1
       AND NOT EXISTS (SELECT 1 FROM ziwei_chunks zc WHERE zc.id = zwe.chunk_id)`,
    sourceId
  )

  return {
    sourceId,
    chunkCount: chunks.length,
    embeddedCount: toEmbed.length,
    skippedCount: chunks.length - toEmbed.length,
  }
}

function toSnippet(text: string, maxLen = 240): string {
  return text.replace(/\s+/g, ' ').trim().slice(0, maxLen)
}

export async function searchZiweiKnowledge(
  query: string,
  options: {
    sourceIds?: string[]
    limit?: number
  } = {}
): Promise<ZiweiSearchHit[]> {
  const model = getEmbeddingsModel()
  if (!model) {
    throw new Error('Embedding 未配置：请设置 EMBEDDINGS_API_KEY 或 OPENAI_API_KEY')
  }

  const limit = Math.min(Math.max(options.limit ?? 6, 1), 10)
  const sourceIds = options.sourceIds?.filter(Boolean)
  const queryVector = await embedQuery(query)
  const vectorStr = vectorToPgString(queryVector)

  type Row = {
    source_id: string
    chunk_id: string
    chunk_index: number
    title: string
    section_title: string | null
    content: string
    score: number
  }

  const rows = sourceIds && sourceIds.length > 0
    ? (await (prisma as any).$queryRawUnsafe(
        `SELECT source_id, chunk_id, chunk_index, title, section_title, content,
                1 - (embedding <=> $1::vector) AS score
         FROM ziwei_chunk_embeddings
         WHERE source_id = ANY($2::text[])
         ORDER BY embedding <=> $1::vector
         LIMIT $3`,
        vectorStr,
        sourceIds,
        limit
      )) as Row[]
    : (await (prisma as any).$queryRawUnsafe(
        `SELECT source_id, chunk_id, chunk_index, title, section_title, content,
                1 - (embedding <=> $1::vector) AS score
         FROM ziwei_chunk_embeddings
         ORDER BY embedding <=> $1::vector
         LIMIT $2`,
        vectorStr,
        limit
      )) as Row[]

  return rows.map((row) => ({
    sourceId: row.source_id,
    chunkId: row.chunk_id,
    chunkIndex: row.chunk_index,
    title: row.title,
    sectionTitle: row.section_title,
    snippet: toSnippet(row.content),
    score: Number(row.score),
  }))
}

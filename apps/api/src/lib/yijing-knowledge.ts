import { randomUUID } from 'node:crypto'
import { embedDocuments, embedQuery, getEmbeddingsModel } from './embeddings'
import { prisma } from './db'
import { splitTextForRag } from './text-splitter'

export const YIJING_SOURCE_ID = 'yijing-text'

export type YijingParsedChunk = {
  chunkIndex: number
  title: string
  hexagramName: string | null
  content: string
}

export type YijingSearchHit = {
  sourceId: string
  chunkId: string
  chunkIndex: number
  title: string
  snippet: string
  score: number
}

type HexagramSection = {
  heading: string
  hexagramName: string | null
  body: string
}

function vectorToPgString(vec: number[]): string {
  return `[${vec.join(',')}]`
}

function normalizeYijingText(text: string): string {
  return text.replace(/\r/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim()
}

function parseHexagramName(heading: string): string | null {
  const match = heading.match(/^第[一二三四五六七八九十百零〇两]+卦\s+([^\s]+)/)
  return match?.[1] ?? null
}

export function splitYijingSections(rawText: string): HexagramSection[] {
  const text = normalizeYijingText(rawText)
  const headingRegex = /^第[一二三四五六七八九十百零〇两]+卦[^\n]*$/gm
  const matches = [...text.matchAll(headingRegex)]

  if (matches.length === 0) {
    return [
      {
        heading: '《易经》全文',
        hexagramName: null,
        body: text,
      },
    ]
  }

  return matches.map((match, index) => {
    const start = match.index ?? 0
    const end = index + 1 < matches.length ? matches[index + 1].index ?? text.length : text.length
    const section = text.slice(start, end).trim()
    const heading = match[0].trim()
    return {
      heading,
      hexagramName: parseHexagramName(heading),
      body: section,
    }
  })
}

export async function parseYijingText(rawText: string): Promise<YijingParsedChunk[]> {
  const sections = splitYijingSections(rawText)
  const chunks: YijingParsedChunk[] = []

  for (const section of sections) {
    const parts = await splitTextForRag(section.body, {
      targetLen: 1000,
      maxLen: 1600,
      overlap: 120,
      minLen: 80,
    })

    const safeParts = parts.length > 0 ? parts : [section.body]
    for (const [partIndex, part] of safeParts.entries()) {
      chunks.push({
        chunkIndex: chunks.length,
        title: safeParts.length > 1 ? `${section.heading} · ${partIndex + 1}` : section.heading,
        hexagramName: section.hexagramName,
        content: part.trim(),
      })
    }
  }

  return chunks
}

export async function upsertYijingSourceAndChunks(input: {
  title: string
  description?: string
  chunks: YijingParsedChunk[]
}): Promise<{ sourceId: string; chunkCount: number }> {
  await (prisma as any).$executeRawUnsafe(
    `INSERT INTO yijing_sources (id, title, description, status, chunk_count)
     VALUES ($1, $2, $3, 'ready', $4)
     ON CONFLICT (id) DO UPDATE SET
       title = EXCLUDED.title,
       description = EXCLUDED.description,
       status = EXCLUDED.status,
       chunk_count = EXCLUDED.chunk_count,
       updated_at = now()`,
    YIJING_SOURCE_ID,
    input.title,
    input.description ?? null,
    input.chunks.length
  )

  for (const chunk of input.chunks) {
    await (prisma as any).$executeRawUnsafe(
      `INSERT INTO yijing_chunks (id, source_id, chunk_index, title, hexagram_name, content)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (source_id, chunk_index) DO UPDATE SET
         title = EXCLUDED.title,
         hexagram_name = EXCLUDED.hexagram_name,
         content = EXCLUDED.content,
         updated_at = now()`,
      `yc_${YIJING_SOURCE_ID}_${chunk.chunkIndex}`,
      YIJING_SOURCE_ID,
      chunk.chunkIndex,
      chunk.title,
      chunk.hexagramName,
      chunk.content
    )
  }

  await (prisma as any).$executeRawUnsafe(
    `DELETE FROM yijing_chunks WHERE source_id = $1 AND chunk_index >= $2`,
    YIJING_SOURCE_ID,
    input.chunks.length
  )

  return {
    sourceId: YIJING_SOURCE_ID,
    chunkCount: input.chunks.length,
  }
}

export async function indexYijingSource(sourceId: string = YIJING_SOURCE_ID): Promise<{
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
            hexagram_name AS "hexagramName", content
     FROM yijing_chunks
     WHERE source_id = $1
     ORDER BY chunk_index ASC`,
    sourceId
  )) as Array<{
    id: string
    sourceId: string
    chunkIndex: number
    title: string
    hexagramName: string | null
    content: string
  }>

  type ExistingRow = { chunk_id: string; content: string; title: string }
  const existing = (await (prisma as any).$queryRawUnsafe(
    `SELECT chunk_id, content, title FROM yijing_chunk_embeddings WHERE source_id = $1`,
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
        `INSERT INTO yijing_chunk_embeddings (id, source_id, chunk_id, chunk_index, title, content, embedding)
         VALUES ($1, $2, $3, $4, $5, $6, $7::vector)
         ON CONFLICT (chunk_id) DO UPDATE SET
           chunk_index = EXCLUDED.chunk_index,
           title = EXCLUDED.title,
           content = EXCLUDED.content,
           embedding = EXCLUDED.embedding`,
        `yce_${randomUUID().replace(/-/g, '')}`,
        sourceId,
        chunk.id,
        chunk.chunkIndex,
        chunk.title,
        chunk.content,
        vectorToPgString(embedding)
      )
    }
  }

  await (prisma as any).$executeRawUnsafe(
    `DELETE FROM yijing_chunk_embeddings yce
     WHERE yce.source_id = $1
       AND NOT EXISTS (SELECT 1 FROM yijing_chunks yc WHERE yc.id = yce.chunk_id)`,
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

export async function searchYijingKnowledge(
  query: string,
  options: {
    sourceIds?: string[]
    limit?: number
  } = {}
): Promise<YijingSearchHit[]> {
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
    content: string
    score: number
  }

  const rows = sourceIds && sourceIds.length > 0
    ? (await (prisma as any).$queryRawUnsafe(
        `SELECT source_id, chunk_id, chunk_index, title, content,
                1 - (embedding <=> $1::vector) AS score
         FROM yijing_chunk_embeddings
         WHERE source_id = ANY($2::text[])
         ORDER BY embedding <=> $1::vector
         LIMIT $3`,
        vectorStr,
        sourceIds,
        limit
      )) as Row[]
    : (await (prisma as any).$queryRawUnsafe(
        `SELECT source_id, chunk_id, chunk_index, title, content,
                1 - (embedding <=> $1::vector) AS score
         FROM yijing_chunk_embeddings
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
    snippet: toSnippet(row.content),
    score: Number(row.score),
  }))
}

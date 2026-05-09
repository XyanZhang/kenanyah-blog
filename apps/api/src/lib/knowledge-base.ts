import { randomUUID } from 'node:crypto'
import { embedDocuments, embedQuery, getEmbeddingsModel } from './embeddings'
import { prisma } from './db'

export type KnowledgeDomain = 'yijing' | 'ziwei' | 'bazi' | 'qimen' | 'liuren' | 'tongshu' | string

export type KnowledgeParsedChunk = {
  id?: string
  chunkIndex: number
  title: string
  content: string
  metadata?: Record<string, unknown> | null
}

export type KnowledgeSourceSummary = {
  id: string
  domain: string
  title: string
  description: string | null
  sourceType: string
  status: string
  metadata: Record<string, unknown> | null
  chunkCount: number
  updatedAt: string
}

export type KnowledgeSearchHit = {
  domain: string
  sourceId: string
  chunkId: string
  chunkIndex: number
  title: string
  snippet: string
  score: number
  metadata: Record<string, unknown> | null
}

function vectorToPgString(vec: number[]): string {
  return `[${vec.join(',')}]`
}

function metadataToJson(metadata: Record<string, unknown> | null | undefined): string | null {
  return metadata ? JSON.stringify(metadata) : null
}

function toSnippet(text: string, maxLen = 240): string {
  return text.replace(/\s+/g, ' ').trim().slice(0, maxLen)
}

function normalizeLimit(limit: number | undefined, max = 10): number {
  return Math.min(Math.max(limit ?? 6, 1), max)
}

export async function listKnowledgeSources(options: {
  domain?: KnowledgeDomain
} = {}): Promise<KnowledgeSourceSummary[]> {
  type Row = {
    id: string
    domain: string
    title: string
    description: string | null
    sourceType: string
    status: string
    metadata: Record<string, unknown> | null
    chunkCount: number
    updatedAt: Date
  }

  const rows = options.domain
    ? (await (prisma as any).$queryRawUnsafe(
        `SELECT id, domain, title, description, source_type AS "sourceType", status, metadata,
                chunk_count AS "chunkCount", updated_at AS "updatedAt"
         FROM knowledge_sources
         WHERE domain = $1
         ORDER BY updated_at DESC`,
        options.domain
      )) as Row[]
    : (await (prisma as any).$queryRawUnsafe(
        `SELECT id, domain, title, description, source_type AS "sourceType", status, metadata,
                chunk_count AS "chunkCount", updated_at AS "updatedAt"
         FROM knowledge_sources
         ORDER BY updated_at DESC`
      )) as Row[]

  return rows.map((source) => ({
    ...source,
    updatedAt: source.updatedAt.toISOString(),
  }))
}

export async function upsertKnowledgeSourceAndChunks(input: {
  domain: KnowledgeDomain
  sourceId: string
  title: string
  description?: string
  sourceType?: string
  metadata?: Record<string, unknown> | null
  chunks: KnowledgeParsedChunk[]
}): Promise<{ sourceId: string; chunkCount: number }> {
  await (prisma as any).$executeRawUnsafe(
    `INSERT INTO knowledge_sources (id, domain, title, description, source_type, status, metadata, chunk_count)
     VALUES ($1, $2, $3, $4, $5, 'ready', $6::jsonb, $7)
     ON CONFLICT (id) DO UPDATE SET
       domain = EXCLUDED.domain,
       title = EXCLUDED.title,
       description = EXCLUDED.description,
       source_type = EXCLUDED.source_type,
       status = EXCLUDED.status,
       metadata = EXCLUDED.metadata,
       chunk_count = EXCLUDED.chunk_count,
       updated_at = now()`,
    input.sourceId,
    input.domain,
    input.title,
    input.description ?? null,
    input.sourceType ?? 'text',
    metadataToJson(input.metadata),
    input.chunks.length
  )

  for (const chunk of input.chunks) {
    await (prisma as any).$executeRawUnsafe(
      `INSERT INTO knowledge_chunks (id, source_id, domain, chunk_index, title, content, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
       ON CONFLICT (source_id, chunk_index) DO UPDATE SET
         id = EXCLUDED.id,
         domain = EXCLUDED.domain,
         title = EXCLUDED.title,
         content = EXCLUDED.content,
         metadata = EXCLUDED.metadata,
         updated_at = now()`,
      chunk.id ?? `kc_${input.domain}_${input.sourceId}_${chunk.chunkIndex}`,
      input.sourceId,
      input.domain,
      chunk.chunkIndex,
      chunk.title,
      chunk.content,
      metadataToJson(chunk.metadata)
    )
  }

  await (prisma as any).$executeRawUnsafe(
    `DELETE FROM knowledge_chunks WHERE source_id = $1 AND chunk_index >= $2`,
    input.sourceId,
    input.chunks.length
  )

  return {
    sourceId: input.sourceId,
    chunkCount: input.chunks.length,
  }
}

export async function indexKnowledgeSource(input: {
  domain: KnowledgeDomain
  sourceId: string
}): Promise<{
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
    `SELECT id, source_id AS "sourceId", domain, chunk_index AS "chunkIndex", title, content, metadata
     FROM knowledge_chunks
     WHERE domain = $1 AND source_id = $2
     ORDER BY chunk_index ASC`,
    input.domain,
    input.sourceId
  )) as Array<{
    id: string
    sourceId: string
    domain: string
    chunkIndex: number
    title: string
    content: string
    metadata: Record<string, unknown> | null
  }>

  type ExistingRow = { chunk_id: string; content: string; title: string }
  const existing = (await (prisma as any).$queryRawUnsafe(
    `SELECT chunk_id, content, title
     FROM knowledge_chunk_embeddings
     WHERE domain = $1 AND source_id = $2`,
    input.domain,
    input.sourceId
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
        `INSERT INTO knowledge_chunk_embeddings (id, source_id, domain, chunk_id, chunk_index, title, content, metadata, embedding)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::vector)
         ON CONFLICT (chunk_id) DO UPDATE SET
           source_id = EXCLUDED.source_id,
           domain = EXCLUDED.domain,
           chunk_index = EXCLUDED.chunk_index,
           title = EXCLUDED.title,
           content = EXCLUDED.content,
           metadata = EXCLUDED.metadata,
           embedding = EXCLUDED.embedding`,
        `kce_${randomUUID().replace(/-/g, '')}`,
        chunk.sourceId,
        chunk.domain,
        chunk.id,
        chunk.chunkIndex,
        chunk.title,
        chunk.content,
        metadataToJson(chunk.metadata),
        vectorToPgString(embedding)
      )
    }
  }

  await (prisma as any).$executeRawUnsafe(
    `DELETE FROM knowledge_chunk_embeddings kce
     WHERE kce.domain = $1
       AND kce.source_id = $2
       AND NOT EXISTS (SELECT 1 FROM knowledge_chunks kc WHERE kc.id = kce.chunk_id)`,
    input.domain,
    input.sourceId
  )

  return {
    sourceId: input.sourceId,
    chunkCount: chunks.length,
    embeddedCount: toEmbed.length,
    skippedCount: chunks.length - toEmbed.length,
  }
}

export async function searchKnowledge(
  query: string,
  options: {
    domain?: KnowledgeDomain
    sourceIds?: string[]
    limit?: number
  } = {}
): Promise<KnowledgeSearchHit[]> {
  const model = getEmbeddingsModel()
  if (!model) {
    throw new Error('Embedding 未配置：请设置 EMBEDDINGS_API_KEY 或 OPENAI_API_KEY')
  }

  const limit = normalizeLimit(options.limit)
  const sourceIds = options.sourceIds?.filter(Boolean)
  const queryVector = await embedQuery(query)
  const vectorStr = vectorToPgString(queryVector)

  type Row = {
    domain: string
    source_id: string
    chunk_id: string
    chunk_index: number
    title: string
    content: string
    metadata: Record<string, unknown> | null
    score: number
  }

  const whereSql = [
    options.domain ? 'domain = $2' : null,
    sourceIds && sourceIds.length > 0 ? `source_id = ANY($${options.domain ? 3 : 2}::text[])` : null,
  ].filter(Boolean).join(' AND ')
  const sql = `SELECT domain, source_id, chunk_id, chunk_index, title, content, metadata,
                      1 - (embedding <=> $1::vector) AS score
               FROM knowledge_chunk_embeddings
               ${whereSql ? `WHERE ${whereSql}` : ''}
               ORDER BY embedding <=> $1::vector
               LIMIT $${1 + (options.domain ? 1 : 0) + (sourceIds && sourceIds.length > 0 ? 1 : 0) + 1}`
  const params: unknown[] = [vectorStr]
  if (options.domain) params.push(options.domain)
  if (sourceIds && sourceIds.length > 0) params.push(sourceIds)
  params.push(limit)

  const rows = (await (prisma as any).$queryRawUnsafe(sql, ...params)) as Row[]

  return rows.map((row) => ({
    domain: row.domain,
    sourceId: row.source_id,
    chunkId: row.chunk_id,
    chunkIndex: row.chunk_index,
    title: row.title,
    snippet: toSnippet(row.content),
    score: Number(row.score),
    metadata: row.metadata,
  }))
}

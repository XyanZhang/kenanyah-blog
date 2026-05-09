import { splitTextForRag } from './text-splitter'
import {
  indexKnowledgeSource,
  searchKnowledge,
  upsertKnowledgeSourceAndChunks,
  type KnowledgeSearchHit,
} from './knowledge-base'

export const YIJING_SOURCE_ID = 'yijing-text'
export const YIJING_DOMAIN = 'yijing'

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
  return upsertKnowledgeSourceAndChunks({
    domain: YIJING_DOMAIN,
    sourceId: YIJING_SOURCE_ID,
    title: input.title,
    description: input.description,
    sourceType: 'text',
    metadata: { canonicalText: '易经.txt' },
    chunks: input.chunks.map((chunk) => ({
      id: `yc_${YIJING_SOURCE_ID}_${chunk.chunkIndex}`,
      chunkIndex: chunk.chunkIndex,
      title: chunk.title,
      content: chunk.content,
      metadata: {
        hexagramName: chunk.hexagramName,
      },
    })),
  })
}

export async function indexYijingSource(sourceId: string = YIJING_SOURCE_ID): Promise<{
  sourceId: string
  chunkCount: number
  embeddedCount: number
  skippedCount: number
}> {
  return indexKnowledgeSource({
    domain: YIJING_DOMAIN,
    sourceId
  })
}

export async function searchYijingKnowledge(
  query: string,
  options: {
    sourceIds?: string[]
    limit?: number
  } = {}
): Promise<YijingSearchHit[]> {
  const hits = await searchKnowledge(query, {
    domain: YIJING_DOMAIN,
    sourceIds: options.sourceIds,
    limit: options.limit,
  })
  return hits.map(toYijingSearchHit)
}

function toYijingSearchHit(hit: KnowledgeSearchHit): YijingSearchHit {
  return {
    sourceId: hit.sourceId,
    chunkId: hit.chunkId,
    chunkIndex: hit.chunkIndex,
    title: hit.title,
    snippet: hit.snippet,
    score: hit.score,
  }
}

import { cleanPdfText, mergeSoftLineBreaks, removeSpacesKeepNewlines } from './pdf-clean'
import { extractPdfText } from './pdf-text'
import { splitTextForRag } from './text-splitter'
import {
  indexKnowledgeSource,
  searchKnowledge,
  upsertKnowledgeSourceAndChunks,
  type KnowledgeSearchHit,
} from './knowledge-base'

export const ZIWEI_SOURCE_ID = 'ziwei-doushu-quanshu'
export const ZIWEI_DOMAIN = 'ziwei'

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
  return upsertKnowledgeSourceAndChunks({
    domain: ZIWEI_DOMAIN,
    sourceId,
    title: input.title,
    description: input.description,
    sourceType: 'pdf',
    metadata: { canonicalWork: '紫微斗数全书' },
    chunks: input.chunks.map((chunk) => ({
      id: `zc_${sourceId}_${chunk.chunkIndex}`,
      chunkIndex: chunk.chunkIndex,
      title: chunk.title,
      content: chunk.content,
      metadata: {
        sectionTitle: chunk.sectionTitle,
      },
    })),
  })
}

export async function indexZiweiSource(sourceId: string = ZIWEI_SOURCE_ID): Promise<{
  sourceId: string
  chunkCount: number
  embeddedCount: number
  skippedCount: number
}> {
  return indexKnowledgeSource({
    domain: ZIWEI_DOMAIN,
    sourceId
  })
}

export async function searchZiweiKnowledge(
  query: string,
  options: {
    sourceIds?: string[]
    limit?: number
  } = {}
): Promise<ZiweiSearchHit[]> {
  const hits = await searchKnowledge(query, {
    domain: ZIWEI_DOMAIN,
    sourceIds: options.sourceIds,
    limit: options.limit,
  })
  return hits.map(toZiweiSearchHit)
}

function toZiweiSearchHit(hit: KnowledgeSearchHit): ZiweiSearchHit {
  return {
    sourceId: hit.sourceId,
    chunkId: hit.chunkId,
    chunkIndex: hit.chunkIndex,
    title: hit.title,
    sectionTitle: typeof hit.metadata?.sectionTitle === 'string' ? hit.metadata.sectionTitle : null,
    snippet: hit.snippet,
    score: hit.score,
  }
}

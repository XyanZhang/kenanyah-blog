import { cleanPdfText, mergeSoftLineBreaks, removeSpacesKeepNewlines } from './pdf-clean'
import { extractPdfText } from './pdf-text'
import { splitTextForRag } from './text-splitter'
import {
  indexKnowledgeSource,
  upsertKnowledgeSourceAndChunks,
  type KnowledgeDomain,
  type KnowledgeParsedChunk,
} from './knowledge-base'

export type KnowledgePdfParsedChunk = {
  chunkIndex: number
  title: string
  sectionTitle: string | null
  content: string
}

export class KnowledgeTextExtractionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'KnowledgeTextExtractionError'
  }
}

type KnowledgePdfSection = {
  heading: string
  sectionTitle: string | null
  body: string
}

function normalizePdfExtractedText(rawText: string): string {
  const normalized = rawText.replace(/\r/g, '').trim()
  const softened = mergeSoftLineBreaks(normalized)
  const noSpaces = removeSpacesKeepNewlines(softened)
  return cleanPdfText(noSpaces).text
}

function normalizeKnowledgeText(text: string): string {
  return text.replace(/\r/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim()
}

function looksLikeCommonHeading(line: string): boolean {
  const text = line.trim()
  if (!text || text.length > 48) return false
  if (/[，,。！？；;]/.test(text)) return false
  if (/^第[一二三四五六七八九十百零〇两\d]+[章节卷篇部]\s*\S*/.test(text)) return true
  if (/^[一二三四五六七八九十百零〇两\d]+[、.．]\S+/.test(text)) return true
  if (/^卷[一二三四五六七八九十百零〇两\d]+\s*\S*/.test(text)) return true
  return /^[\u4e00-\u9fa5]{2,16}$/.test(text)
}

export function splitKnowledgePdfSections(rawText: string, fallbackTitle: string): KnowledgePdfSection[] {
  const text = normalizeKnowledgeText(rawText)
  const lines = text.split('\n')
  const headingIndexes: Array<{ index: number; heading: string }> = []

  for (const [index, line] of lines.entries()) {
    if (looksLikeCommonHeading(line)) {
      headingIndexes.push({ index, heading: line.trim() })
    }
  }

  if (headingIndexes.length === 0) {
    return [
      {
        heading: fallbackTitle,
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

export async function parseKnowledgePdfFile(input: {
  filePath: string
  title: string
}): Promise<KnowledgePdfParsedChunk[]> {
  const { text } = await extractPdfText(input.filePath)
  const cleaned = normalizePdfExtractedText(text)
  if (!cleaned) {
    throw new KnowledgeTextExtractionError(
      '未能从 PDF 提取到有效文本：这通常是扫描版 PDF 或文本层损坏。请先用 OCR 工具识别成 .txt，再通过“导入 OCR 文本”入库。'
    )
  }

  return parseKnowledgeText({
    rawText: cleaned,
    title: input.title,
  })
}

export async function parseKnowledgeText(input: {
  rawText: string
  title: string
}): Promise<KnowledgePdfParsedChunk[]> {
  const cleaned = normalizeKnowledgeText(input.rawText)
  if (!cleaned) {
    throw new KnowledgeTextExtractionError('文本内容为空，请检查 OCR 结果或上传的文本文件。')
  }

  const sections = splitKnowledgePdfSections(cleaned, input.title)
  const chunks: KnowledgePdfParsedChunk[] = []

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

function toSourceIdPart(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/《|》/g, '')
    .replace(/[^\w\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

export function createKnowledgePdfSourceId(input: {
  domain: KnowledgeDomain
  title: string
}): string {
  const titlePart = toSourceIdPart(input.title) || 'pdf'
  return `${input.domain}-${titlePart}`
}

export async function importKnowledgePdfFile(input: {
  domain: KnowledgeDomain
  sourceId?: string
  title: string
  description?: string
  pdfPath: string
  metadata?: Record<string, unknown>
}): Promise<{
  sourceId: string
  chunkCount: number
  embeddedCount: number
  skippedCount: number
}> {
  const sourceId = input.sourceId?.trim() || createKnowledgePdfSourceId(input)
  const chunks = await parseKnowledgePdfFile({
    filePath: input.pdfPath,
    title: input.title,
  })
  return importKnowledgeChunks({
    ...input,
    sourceId,
    sourceType: 'pdf',
    chunks,
  })
}

export async function importKnowledgeText(input: {
  domain: KnowledgeDomain
  sourceId?: string
  title: string
  description?: string
  rawText: string
  metadata?: Record<string, unknown>
}): Promise<{
  sourceId: string
  chunkCount: number
  embeddedCount: number
  skippedCount: number
}> {
  const sourceId = input.sourceId?.trim() || createKnowledgePdfSourceId(input)
  const chunks = await parseKnowledgeText({
    rawText: input.rawText,
    title: input.title,
  })
  return importKnowledgeChunks({
    ...input,
    sourceId,
    sourceType: 'text',
    chunks,
  })
}

async function importKnowledgeChunks(input: {
  domain: KnowledgeDomain
  sourceId: string
  title: string
  description?: string
  sourceType: 'pdf' | 'text'
  chunks: KnowledgePdfParsedChunk[]
  metadata?: Record<string, unknown>
}): Promise<{
  sourceId: string
  chunkCount: number
  embeddedCount: number
  skippedCount: number
}> {
  const parsedChunks: KnowledgeParsedChunk[] = input.chunks.map((chunk) => ({
    id: `kc_${input.domain}_${input.sourceId}_${chunk.chunkIndex}`,
    chunkIndex: chunk.chunkIndex,
    title: chunk.title,
    content: chunk.content,
    metadata: {
      sectionTitle: chunk.sectionTitle,
    },
  }))

  const source = await upsertKnowledgeSourceAndChunks({
    domain: input.domain,
    sourceId: input.sourceId,
    title: input.title,
    description: input.description,
    sourceType: input.sourceType,
    metadata: input.metadata,
    chunks: parsedChunks,
  })
  const indexed = await indexKnowledgeSource({
    domain: input.domain,
    sourceId: source.sourceId,
  })

  return {
    sourceId: source.sourceId,
    chunkCount: source.chunkCount,
    embeddedCount: indexed.embeddedCount,
    skippedCount: indexed.skippedCount,
  }
}

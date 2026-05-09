import { getApiBaseUrl } from './api-client'

const API_BASE_URL = getApiBaseUrl()

type ApiResponse<T> = {
  success: boolean
  data?: T
  error?: string
}

export type KnowledgeDomain = 'all' | 'yijing' | 'ziwei' | 'bazi' | 'qimen' | 'liuren' | 'tongshu'

export type KnowledgeSource = {
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

export type KnowledgePdfImportResult = {
  sourceId: string
  chunkCount: number
  embeddedCount: number
  skippedCount: number
  filename: string
  size: number
  fileUrl?: string
}

async function readApiResponse<T>(response: Response, fallback: string): Promise<T> {
  const json = (await response.json().catch(() => ({}))) as ApiResponse<T>
  if (!response.ok || !json.success || !json.data) {
    const message = typeof json.error === 'string' ? json.error : fallback
    throw new Error(message)
  }
  return json.data
}

export async function getKnowledgeSources(domain: KnowledgeDomain = 'all'): Promise<KnowledgeSource[]> {
  const params = new URLSearchParams()
  if (domain !== 'all') params.set('domain', domain)
  const query = params.toString()
  const response = await fetch(`${API_BASE_URL}/knowledge/sources${query ? `?${query}` : ''}`, {
    credentials: 'include',
  })
  return readApiResponse<KnowledgeSource[]>(response, '加载知识库资料源失败')
}

export async function searchKnowledge(input: {
  query: string
  domain?: KnowledgeDomain
  sourceIds?: string[]
  limit?: number
}): Promise<KnowledgeSearchHit[]> {
  const params = new URLSearchParams({
    q: input.query,
    limit: String(input.limit ?? 8),
  })
  if (input.domain && input.domain !== 'all') params.set('domain', input.domain)
  if (input.sourceIds?.length) params.set('sourceIds', input.sourceIds.join(','))

  const response = await fetch(`${API_BASE_URL}/knowledge/search?${params.toString()}`, {
    credentials: 'include',
  })
  return readApiResponse<KnowledgeSearchHit[]>(response, '检索知识库失败')
}

export async function importKnowledgePdf(input: {
  file: File
  domain: Exclude<KnowledgeDomain, 'all'>
  title: string
  sourceId?: string
  description?: string
}): Promise<KnowledgePdfImportResult> {
  const form = new FormData()
  form.set('file', input.file)
  form.set('domain', input.domain)
  form.set('title', input.title)
  if (input.sourceId) form.set('sourceId', input.sourceId)
  if (input.description) form.set('description', input.description)

  const response = await fetch(`${API_BASE_URL}/knowledge/import/pdf`, {
    method: 'POST',
    credentials: 'include',
    body: form,
  })
  return readApiResponse<KnowledgePdfImportResult>(response, '导入 PDF 到知识库失败')
}

export async function importKnowledgeTextFile(input: {
  file: File
  domain: Exclude<KnowledgeDomain, 'all'>
  title: string
  sourceId?: string
  description?: string
}): Promise<KnowledgePdfImportResult> {
  const form = new FormData()
  form.set('file', input.file)
  form.set('domain', input.domain)
  form.set('title', input.title)
  if (input.sourceId) form.set('sourceId', input.sourceId)
  if (input.description) form.set('description', input.description)

  const response = await fetch(`${API_BASE_URL}/knowledge/import/text`, {
    method: 'POST',
    credentials: 'include',
    body: form,
  })
  return readApiResponse<KnowledgePdfImportResult>(response, '导入 OCR 文本到知识库失败')
}

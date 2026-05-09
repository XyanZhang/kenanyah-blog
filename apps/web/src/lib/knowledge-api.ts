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

async function readApiResponse<T>(response: Response, fallback: string): Promise<T> {
  const json = (await response.json().catch(() => ({}))) as ApiResponse<T>
  if (!response.ok || !json.success || !json.data) {
    throw new Error(json.error || fallback)
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

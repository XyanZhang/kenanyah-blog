import { getApiBaseUrl } from './api-client'

const API_BASE_URL = getApiBaseUrl()

type ApiResponse<T> = {
  success: boolean
  data?: T
  error?: string
}

export type YijingSource = {
  id: string
  title: string
  description: string | null
  status: string
  chunkCount: number
  updatedAt: string
}

export type YijingSearchHit = {
  sourceId: string
  chunkId: string
  chunkIndex: number
  title: string
  snippet: string
  score: number
}

export type YijingImportResult = {
  sourceId: string
  chunkCount: number
  embeddedCount: number
  skippedCount: number
  textPath: string
}

async function readApiResponse<T>(response: Response, fallback: string): Promise<T> {
  const json = (await response.json().catch(() => ({}))) as ApiResponse<T>
  if (!response.ok || !json.success || !json.data) {
    throw new Error(json.error || fallback)
  }
  return json.data
}

export async function getYijingSources(): Promise<YijingSource[]> {
  const response = await fetch(`${API_BASE_URL}/yijing/sources`, {
    credentials: 'include',
  })
  return readApiResponse<YijingSource[]>(response, '加载易经资料源失败')
}

export async function importYijingText(): Promise<YijingImportResult> {
  const response = await fetch(`${API_BASE_URL}/yijing/import`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  })
  return readApiResponse<YijingImportResult>(response, '导入易经文本失败')
}

export async function searchYijingText(query: string, limit: number = 6): Promise<YijingSearchHit[]> {
  const params = new URLSearchParams({ q: query, limit: String(limit) })
  const response = await fetch(`${API_BASE_URL}/yijing/search?${params.toString()}`, {
    credentials: 'include',
  })
  return readApiResponse<YijingSearchHit[]>(response, '检索易经文本失败')
}

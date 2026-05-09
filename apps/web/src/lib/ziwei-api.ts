import { getApiBaseUrl } from './api-client'

const API_BASE_URL = getApiBaseUrl()

type ApiResponse<T> = {
  success: boolean
  data?: T
  error?: string
}

export type ZiweiSource = {
  id: string
  title: string
  description: string | null
  status: string
  chunkCount: number
  updatedAt: string
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

export type ZiweiImportResult = {
  sourceId: string
  chunkCount: number
  embeddedCount: number
  skippedCount: number
  pdfPath?: string
  filename?: string
  size?: number
  fileUrl?: string
}

async function readApiResponse<T>(response: Response, fallback: string): Promise<T> {
  const json = (await response.json().catch(() => ({}))) as ApiResponse<T>
  if (!response.ok || !json.success || !json.data) {
    throw new Error(json.error || fallback)
  }
  return json.data
}

export async function getZiweiSources(): Promise<ZiweiSource[]> {
  const response = await fetch(`${API_BASE_URL}/ziwei/sources`, {
    credentials: 'include',
  })
  return readApiResponse<ZiweiSource[]>(response, '加载紫微斗数资料源失败')
}

export async function uploadZiweiPdf(
  file: File,
  options?: { title?: string; description?: string }
): Promise<ZiweiImportResult> {
  const form = new FormData()
  form.set('file', file)
  if (options?.title) form.set('title', options.title)
  if (options?.description) form.set('description', options.description)

  const response = await fetch(`${API_BASE_URL}/ziwei/upload`, {
    method: 'POST',
    credentials: 'include',
    body: form,
  })
  return readApiResponse<ZiweiImportResult>(response, '上传并索引紫微斗数 PDF 失败')
}

export async function searchZiweiText(query: string, limit: number = 6): Promise<ZiweiSearchHit[]> {
  const params = new URLSearchParams({ q: query, limit: String(limit) })
  const response = await fetch(`${API_BASE_URL}/ziwei/search?${params.toString()}`, {
    credentials: 'include',
  })
  return readApiResponse<ZiweiSearchHit[]>(response, '检索紫微斗数资料失败')
}

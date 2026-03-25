import { apiClient, getApiBaseUrl, type ApiResponse } from './api-client'
import type { ThoughtPost } from '@/components/thoughts'

/** GET /thoughts/:id 返回的完整记录（节选） */
export type ThoughtRecord = {
  id: string
  authorId: string | null
  content: string
  images: unknown
  likeCount: number
  commentCount: number
  createdAt: string
  updatedAt: string
}

export async function fetchThoughtsPage(
  page: number,
  pageSize: number
): Promise<ThoughtPost[]> {
  const res = await apiClient
    .get('thoughts', { searchParams: { page, limit: pageSize } })
    .json<ApiResponse<ThoughtPost[]>>()

  if (!res.success || !res.data) {
    throw new Error(res.error || '加载思考失败')
  }
  return res.data
}

export async function fetchThoughtById(id: string): Promise<ThoughtRecord> {
  const res = await apiClient
    .get(`thoughts/${id}`)
    .json<ApiResponse<ThoughtRecord>>()
  if (!res.success || !res.data) {
    throw new Error(res.error || '加载思考失败')
  }
  return res.data
}

export async function createThought(input: {
  content: string
  images?: string[]
}): Promise<ThoughtRecord> {
  const res = await apiClient
    .post('thoughts', { json: input })
    .json<ApiResponse<ThoughtRecord>>()
  if (!res.success || !res.data) {
    throw new Error(res.error || '发布失败')
  }
  return res.data
}

export async function updateThought(
  id: string,
  input: { content: string; images?: string[] }
): Promise<ThoughtRecord> {
  const res = await apiClient
    .patch(`thoughts/${id}`, { json: input })
    .json<ApiResponse<ThoughtRecord>>()
  if (!res.success || !res.data) {
    throw new Error(res.error || '保存失败')
  }
  return res.data
}

/** multipart 上传：须走 fetch，避免 ky 默认 JSON Content-Type */
export async function uploadThoughtImage(file: File): Promise<string> {
  const base = getApiBaseUrl().replace(/\/$/, '')
  const uploadUrl = `${base}/thoughts/images`
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(uploadUrl, {
    method: 'POST',
    body: form,
    credentials: 'include',
  })
  let json: ApiResponse<{ url: string }> | null = null
  try {
    json = (await res.json()) as ApiResponse<{ url: string }>
  } catch {
    // ignore
  }
  if (res.status === 401) {
    throw new Error('请先登录后再上传图片')
  }
  if (!json?.success || !json.data?.url) {
    throw new Error(json?.error || `上传失败 (${res.status})`)
  }
  return json.data.url
}

export async function assistThoughtAi(input: {
  mode: 'generate' | 'polish'
  keywords: string
  draft?: string
}): Promise<string> {
  const res = await apiClient
    .post('thoughts/ai/assist', { json: input })
    .json<ApiResponse<{ text: string }>>()
  if (!res.success || !res.data?.text) {
    throw new Error(res.error || 'AI 生成失败')
  }
  return res.data.text
}

export type ThoughtSemanticHit = {
  thoughtId: string
  title: string
  snippet: string
  score: number
}

export async function searchThoughtsSemantic(
  q: string,
  limit: number = 10
): Promise<ThoughtSemanticHit[]> {
  const res = await apiClient
    .get('thoughts/semantic', { searchParams: { q, limit } })
    .json<ApiResponse<ThoughtSemanticHit[]>>()
  if (!res.success || !res.data) {
    throw new Error(res.error || '思考语义搜索失败')
  }
  return res.data
}


import type { ApiResponse, PhotoEntryDto } from '@blog/types'
import { apiClient, getApiBaseUrl } from './api-client'

export async function getPhotoEntries(): Promise<PhotoEntryDto[]> {
  const res = await apiClient.get('pictures/entries').json<ApiResponse<PhotoEntryDto[]>>()
  if (!res.success || !res.data) return []
  return res.data
}

export async function createPhotoEntry(body: {
  title?: string
  description?: string
  imageUrl?: string
  date?: string
}): Promise<PhotoEntryDto> {
  const res = await apiClient
    .post('pictures/entries', { json: body })
    .json<ApiResponse<PhotoEntryDto>>()
  if (!res.success || !res.data) throw new Error(res.error ?? '创建照片记录失败')
  return res.data
}

export async function uploadPictureFile(file: File): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)

  const base = getApiBaseUrl().replace(/\/$/, '')
  const res = await fetch(`${base}/pictures/upload`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  })
  const json = (await res.json()) as ApiResponse<{ url: string }>
  if (!json.success || !json.data?.url) {
    throw new Error(json.error ?? '图片上传失败')
  }
  return json.data.url
}

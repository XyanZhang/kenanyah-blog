import { getApiBaseUrl } from './api-client'

const API_BASE_URL = getApiBaseUrl()

type ApiResponse<T> = {
  success: boolean
  data?: T
  error?: string
}

export type PdfDocument = {
  id: string
  filename: string
  mimeType: string
  size: number
  fileUrl: string
  status: string
  createdAt: string
  updatedAt: string
}

export async function uploadPdf(file: File): Promise<PdfDocument> {
  const fd = new FormData()
  fd.set('file', file)
  const res = await fetch(`${API_BASE_URL}/pdf/documents`, {
    method: 'POST',
    credentials: 'include',
    body: fd,
  })
  const json = (await res.json().catch(() => ({}))) as ApiResponse<PdfDocument>
  if (!json.success || !json.data) {
    throw new Error(json.error || '上传失败')
  }
  return json.data
}

export async function parsePdf(documentId: string): Promise<{
  documentId: string
  chunkCount: number
  preview: Array<{ chunkIndex: number; content: string }>
}> {
  const res = await fetch(`${API_BASE_URL}/pdf/documents/${encodeURIComponent(documentId)}/parse`, {
    method: 'POST',
    credentials: 'include',
  })
  const json = (await res.json().catch(() => ({}))) as ApiResponse<{
    documentId: string
    chunkCount: number
    preview: Array<{ chunkIndex: number; content: string }>
  }>
  if (!json.success || !json.data) {
    throw new Error(json.error || '解析失败')
  }
  return json.data
}

export async function indexPdf(documentId: string): Promise<{ documentId: string; chunkCount: number }> {
  const res = await fetch(`${API_BASE_URL}/pdf/documents/${encodeURIComponent(documentId)}/index`, {
    method: 'POST',
    credentials: 'include',
  })
  const json = (await res.json().catch(() => ({}))) as ApiResponse<{ documentId: string; chunkCount: number }>
  if (!json.success || !json.data) {
    throw new Error(json.error || '向量化失败')
  }
  return json.data
}

export async function generatePdfDoc(
  documentId: string,
  payload?: { style?: string }
): Promise<{ markdown: string }> {
  const res = await fetch(`${API_BASE_URL}/pdf/documents/${encodeURIComponent(documentId)}/generate-doc`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload ?? {}),
  })
  const json = (await res.json().catch(() => ({}))) as ApiResponse<{ markdown: string }>
  if (!json.success || !json.data) {
    throw new Error(json.error || '生成文档失败')
  }
  return json.data
}


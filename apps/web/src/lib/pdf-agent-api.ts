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
  chunkCount?: number
  embeddingCount?: number
  mediaAsset?: {
    id: string
    url: string
    storageKey: string
    filename: string
    mimeType: string
    size: number
    source: string
    status: string
    createdAt: string
    updatedAt: string
  } | null
  createdAt: string
  updatedAt: string
  replaced?: boolean
}

export type PdfSearchHit = {
  chunkId: string
  chunkIndex: number
  snippet: string
  score: number
}

export async function getPdfDocuments(): Promise<PdfDocument[]> {
  const res = await fetch(`${API_BASE_URL}/pdf/documents`, {
    credentials: 'include',
  })
  const json = (await res.json().catch(() => ({}))) as ApiResponse<PdfDocument[]>
  if (!json.success || !json.data) {
    throw new Error(json.error || '加载 PDF 文档失败')
  }
  return json.data
}

export async function uploadPdf(file: File, opts?: { replace?: boolean }): Promise<PdfDocument> {
  const fd = new FormData()
  fd.set('file', file)
  const url = `${API_BASE_URL}/pdf/documents${opts?.replace ? '?replace=true' : ''}`
  const res = await fetch(url, {
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
  chunks: Array<{ chunkIndex: number; content: string }>
  preview: {
    total: number
    head: Array<{ chunkIndex: number; content: string }>
    tail: Array<{ chunkIndex: number; content: string }>
  }
  cleanReport?: {
    originalLength: number
    cleanedLength: number
    removedLineCount: number
    removedByReason: {
      repeatedLine: number
      dotLeaders: number
      pageNumber: number
      empty: number
    }
  }
  parseStats?: {
    chunkCount: number
    min: number
    p50: number
    p90: number
    max: number
    tooShortCount: number
    tooLongCount: number
  }
}> {
  const res = await fetch(`${API_BASE_URL}/pdf/documents/${encodeURIComponent(documentId)}/parse`, {
    method: 'POST',
    credentials: 'include',
  })
  const json = (await res.json().catch(() => ({}))) as ApiResponse<{
    documentId: string
    chunkCount: number
    chunks: Array<{ chunkIndex: number; content: string }>
    preview: {
      total: number
      head: Array<{ chunkIndex: number; content: string }>
      tail: Array<{ chunkIndex: number; content: string }>
    }
    cleanReport?: {
      originalLength: number
      cleanedLength: number
      removedLineCount: number
      removedByReason: {
        repeatedLine: number
        dotLeaders: number
        pageNumber: number
        empty: number
      }
    }
    parseStats?: {
      chunkCount: number
      min: number
      p50: number
      p90: number
      max: number
      tooShortCount: number
      tooLongCount: number
    }
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

export async function deletePdfDocument(documentId: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/pdf/documents/${encodeURIComponent(documentId)}`, {
    method: 'DELETE',
    credentials: 'include',
  })
  const json = (await res.json().catch(() => ({}))) as ApiResponse<{ message: string }>
  if (!json.success) {
    throw new Error(json.error || '删除 PDF 文档失败')
  }
}

export async function searchPdfDocument(
  documentId: string,
  query: string,
  limit: number = 8
): Promise<PdfSearchHit[]> {
  const params = new URLSearchParams({ q: query, limit: String(limit) })
  const res = await fetch(
    `${API_BASE_URL}/pdf/documents/${encodeURIComponent(documentId)}/search?${params.toString()}`,
    { credentials: 'include' }
  )
  const json = (await res.json().catch(() => ({}))) as ApiResponse<PdfSearchHit[]>
  if (!json.success || !json.data) {
    throw new Error(json.error || '搜索 PDF 文档失败')
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

export async function savePdfAsPost(
  documentId: string,
  payload: { markdown: string; title?: string; excerpt?: string },
  opts?: { index?: boolean }
): Promise<{
  id: string
  slug: string
  title: string
}> {
  const url = `${API_BASE_URL}/pdf/documents/${encodeURIComponent(documentId)}/save-post${
    opts?.index ? '?index=true' : ''
  }`
  const res = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const json = (await res.json().catch(() => ({}))) as ApiResponse<{ id: string; slug: string; title: string; indexed?: boolean }>
  if (!json.success || !json.data) {
    throw new Error(json.error || '保存为文章失败')
  }
  return json.data
}

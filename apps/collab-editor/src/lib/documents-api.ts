import { collabApiUrl } from './env'
import type { ApiResponse, CollaborativeDocumentSummary } from '../types'

export async function fetchDocuments() {
  return request<CollaborativeDocumentSummary[]>('/documents')
}

export async function createDocument(title: string) {
  return request<CollaborativeDocumentSummary>('/documents', {
    method: 'POST',
    body: JSON.stringify({ title }),
  })
}

export async function renameDocument(documentId: string, title: string) {
  return request<CollaborativeDocumentSummary>(`/documents/${encodeURIComponent(documentId)}`, {
    method: 'PATCH',
    body: JSON.stringify({ title }),
  })
}

async function request<T>(path: string, init?: RequestInit) {
  const response = await fetch(`${collabApiUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })

  const payload = (await response.json()) as ApiResponse<T>
  if (!response.ok || !payload.success || !payload.data) {
    throw new Error(payload.error || '协同文档服务暂时不可用')
  }

  return payload.data
}

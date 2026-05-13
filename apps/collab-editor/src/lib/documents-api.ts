import { collabApiUrl } from './env'
import type {
  ApiResponse,
  CollaborativeDocumentFolder,
  CollaborativeDocumentSummary,
  CollaborativeEditorUser,
} from '../types'

export async function fetchDocuments() {
  return request<CollaborativeDocumentSummary[]>('/documents')
}

export async function fetchFolders() {
  return request<CollaborativeDocumentFolder[]>('/folders')
}

export async function fetchEditorUser(pixelId: string) {
  return request<CollaborativeEditorUser>(`/users/${encodeURIComponent(pixelId)}`)
}

export async function saveEditorUser(pixelId: string, nickname: string, color?: string) {
  return request<CollaborativeEditorUser>(`/users/${encodeURIComponent(pixelId)}`, {
    method: 'PATCH',
    body: JSON.stringify({ nickname, color }),
  })
}

export async function createDocument(title: string, folderPath = '') {
  return request<CollaborativeDocumentSummary>('/documents', {
    method: 'POST',
    body: JSON.stringify({ title, folderPath }),
  })
}

export async function renameDocument(documentId: string, title: string) {
  return request<CollaborativeDocumentSummary>(`/documents/${encodeURIComponent(documentId)}`, {
    method: 'PATCH',
    body: JSON.stringify({ title }),
  })
}

export async function moveDocument(documentId: string, folderPath: string) {
  return request<CollaborativeDocumentSummary>(`/documents/${encodeURIComponent(documentId)}`, {
    method: 'PATCH',
    body: JSON.stringify({ folderPath }),
  })
}

export async function createFolder(path: string) {
  return request<CollaborativeDocumentFolder>('/folders', {
    method: 'POST',
    body: JSON.stringify({ path }),
  })
}

export async function deleteFolder(path: string) {
  return request<{ message: string }>(`/folders?path=${encodeURIComponent(path)}`, {
    method: 'DELETE',
  })
}

export async function renameFolder(path: string, name: string) {
  return request<CollaborativeDocumentFolder>(`/folders?path=${encodeURIComponent(path)}`, {
    method: 'PATCH',
    body: JSON.stringify({ name }),
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

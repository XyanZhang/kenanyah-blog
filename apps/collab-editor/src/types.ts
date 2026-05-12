export type CollaborativeDocumentSummary = {
  id: string
  slug: string
  title: string
  folderPath: string
  summary: string | null
  lastEditedAt: string | null
  createdAt: string
  updatedAt: string
}

export type CollaborativeDocumentFolder = {
  id: string
  path: string
  name: string
  parentPath: string
  createdAt: string
  updatedAt: string
}

export type ApiResponse<T> = {
  success: boolean
  data?: T
  error?: string
}

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected'

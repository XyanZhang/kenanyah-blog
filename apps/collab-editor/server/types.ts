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

export type CreateDocumentInput = {
  title?: string
  folderPath?: string
}

export type UpdateDocumentInput = {
  title?: string
  folderPath?: string
}

export type CreateFolderInput = {
  path?: string
}

export type UpdateFolderInput = {
  name?: string
}

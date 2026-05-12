export type CollaborativeDocumentSummary = {
  id: string
  slug: string
  title: string
  summary: string | null
  lastEditedAt: string | null
  createdAt: string
  updatedAt: string
}

export type CreateDocumentInput = {
  title?: string
}

export type UpdateDocumentInput = {
  title?: string
}

export type CollaborativeDocumentSummary = {
  id: string
  slug: string
  title: string
  folderPath: string
  summary: string | null
  isPasswordProtected: boolean
  isShareable: boolean
  shareId: string | null
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

export type CollaborativeEditorUser = {
  pixelId: string
  nickname: string | null
  color: string
  createdAt: string
  updatedAt: string
}

export type CreateDocumentInput = {
  title?: string
  folderPath?: string
  ownerId?: string
}

export type UpdateDocumentInput = {
  title?: string
  folderPath?: string
  password?: string | null
  currentPassword?: string
  accessToken?: string
  isShareable?: boolean
}

export type CreateFolderInput = {
  path?: string
  ownerId?: string
}

export type UpdateFolderInput = {
  name?: string
}

export type UpdateUserInput = {
  nickname?: string
  color?: string
}

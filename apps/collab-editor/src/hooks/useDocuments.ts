import { useCallback, useEffect, useState } from 'react'
import {
  createFolder as createFolderRequest,
  createDocument as createDocumentRequest,
  deleteFolder as deleteFolderRequest,
  fetchDocuments,
  fetchSharedDocument,
  fetchFolders,
  moveDocument as moveDocumentRequest,
  renameFolder as renameFolderRequest,
  renameDocument as renameDocumentRequest,
  updateDocumentAccess as updateDocumentAccessRequest,
} from '../lib/documents-api'
import type { CollaborativeDocumentFolder, CollaborativeDocumentSummary } from '../types'

export function useDocuments(shareId?: string | null) {
  const [documents, setDocuments] = useState<CollaborativeDocumentSummary[]>([])
  const [folders, setFolders] = useState<CollaborativeDocumentFolder[]>([])
  const [activeDocumentId, setActiveDocumentId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadDocuments = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      if (shareId) {
        const document = await fetchSharedDocument(shareId)
        setDocuments([document])
        setFolders([])
        setActiveDocumentId(document.id)
        return
      }

      const [nextDocuments, nextFolders] = await Promise.all([fetchDocuments(), fetchFolders()])
      setDocuments(nextDocuments)
      setFolders(nextFolders)
      setActiveDocumentId((current) => {
        if (current && nextDocuments.some((document) => document.id === current)) return current
        return nextDocuments[0]?.id ?? null
      })
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : '加载文档失败')
    } finally {
      setIsLoading(false)
    }
  }, [shareId])

  useEffect(() => {
    void loadDocuments()
  }, [loadDocuments])

  const createDocument = useCallback(async (title: string, folderPath = '') => {
    if (shareId) throw new Error('分享视图不能新建文档')
    const document = await createDocumentRequest(title, folderPath)
    setDocuments((current) => [document, ...current])
    setActiveDocumentId(document.id)
  }, [shareId])

  const renameDocument = useCallback(async (documentId: string, title: string) => {
    const document = await renameDocumentRequest(documentId, title)
    setDocuments((current) =>
      current.map((item) => (item.id === document.id ? document : item))
    )
  }, [])

  const moveDocument = useCallback(async (documentId: string, folderPath: string) => {
    if (shareId) throw new Error('分享视图不能移动文档')
    const document = await moveDocumentRequest(documentId, folderPath)
    setDocuments((current) =>
      current.map((item) => (item.id === document.id ? document : item))
    )
  }, [shareId])

  const createFolder = useCallback(async (path: string) => {
    if (shareId) throw new Error('分享视图不能新建文件夹')
    const folder = await createFolderRequest(path)
    setFolders((current) => {
      const exists = current.some((item) => item.path === folder.path)
      return exists
        ? current.map((item) => (item.path === folder.path ? folder : item))
        : [...current, folder]
    })
    return folder
  }, [shareId])

  const deleteFolder = useCallback(async (path: string) => {
    if (shareId) throw new Error('分享视图不能删除文件夹')
    await deleteFolderRequest(path)
    setFolders((current) => current.filter((folder) => folder.path !== path))
  }, [shareId])

  const renameFolder = useCallback(async (path: string, name: string) => {
    if (shareId) throw new Error('分享视图不能重命名文件夹')
    const folder = await renameFolderRequest(path, name)
    await loadDocuments()
    return folder
  }, [loadDocuments, shareId])

  const updateDocumentAccess = useCallback(async (
    documentId: string,
    input: {
      password?: string | null
      currentPassword?: string
      accessToken?: string | null
      isShareable?: boolean
    }
  ) => {
    const document = await updateDocumentAccessRequest(documentId, input)
    setDocuments((current) =>
      current.map((item) => (item.id === document.id ? document : item))
    )
    return document
  }, [])

  return {
    documents,
    folders,
    activeDocumentId,
    activeDocument: documents.find((document) => document.id === activeDocumentId) ?? null,
    isLoading,
    error,
    setActiveDocumentId,
    createDocument,
    renameDocument,
    moveDocument,
    createFolder,
    deleteFolder,
    renameFolder,
    updateDocumentAccess,
    reloadDocuments: loadDocuments,
  }
}

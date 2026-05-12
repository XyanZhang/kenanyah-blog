import { useCallback, useEffect, useState } from 'react'
import {
  createFolder as createFolderRequest,
  createDocument as createDocumentRequest,
  deleteFolder as deleteFolderRequest,
  fetchDocuments,
  fetchFolders,
  moveDocument as moveDocumentRequest,
  renameFolder as renameFolderRequest,
  renameDocument as renameDocumentRequest,
} from '../lib/documents-api'
import type { CollaborativeDocumentFolder, CollaborativeDocumentSummary } from '../types'

export function useDocuments() {
  const [documents, setDocuments] = useState<CollaborativeDocumentSummary[]>([])
  const [folders, setFolders] = useState<CollaborativeDocumentFolder[]>([])
  const [activeDocumentId, setActiveDocumentId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadDocuments = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
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
  }, [])

  useEffect(() => {
    void loadDocuments()
  }, [loadDocuments])

  const createDocument = useCallback(async (title: string, folderPath = '') => {
    const document = await createDocumentRequest(title, folderPath)
    setDocuments((current) => [document, ...current])
    setActiveDocumentId(document.id)
  }, [])

  const renameDocument = useCallback(async (documentId: string, title: string) => {
    const document = await renameDocumentRequest(documentId, title)
    setDocuments((current) =>
      current.map((item) => (item.id === document.id ? document : item))
    )
  }, [])

  const moveDocument = useCallback(async (documentId: string, folderPath: string) => {
    const document = await moveDocumentRequest(documentId, folderPath)
    setDocuments((current) =>
      current.map((item) => (item.id === document.id ? document : item))
    )
  }, [])

  const createFolder = useCallback(async (path: string) => {
    const folder = await createFolderRequest(path)
    setFolders((current) => {
      const exists = current.some((item) => item.path === folder.path)
      return exists
        ? current.map((item) => (item.path === folder.path ? folder : item))
        : [...current, folder]
    })
    return folder
  }, [])

  const deleteFolder = useCallback(async (path: string) => {
    await deleteFolderRequest(path)
    setFolders((current) => current.filter((folder) => folder.path !== path))
  }, [])

  const renameFolder = useCallback(async (path: string, name: string) => {
    const folder = await renameFolderRequest(path, name)
    await loadDocuments()
    return folder
  }, [loadDocuments])

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
    reloadDocuments: loadDocuments,
  }
}

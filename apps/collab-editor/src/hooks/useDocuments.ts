import { useCallback, useEffect, useState } from 'react'
import {
  createDocument as createDocumentRequest,
  fetchDocuments,
  renameDocument as renameDocumentRequest,
} from '../lib/documents-api'
import type { CollaborativeDocumentSummary } from '../types'

export function useDocuments() {
  const [documents, setDocuments] = useState<CollaborativeDocumentSummary[]>([])
  const [activeDocumentId, setActiveDocumentId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadDocuments = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const nextDocuments = await fetchDocuments()
      setDocuments(nextDocuments)
      setActiveDocumentId((current) => current ?? nextDocuments[0]?.id ?? null)
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : '加载文档失败')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadDocuments()
  }, [loadDocuments])

  const createDocument = useCallback(async (title: string) => {
    const document = await createDocumentRequest(title)
    setDocuments((current) => [document, ...current])
    setActiveDocumentId(document.id)
  }, [])

  const renameDocument = useCallback(async (documentId: string, title: string) => {
    const document = await renameDocumentRequest(documentId, title)
    setDocuments((current) =>
      current.map((item) => (item.id === document.id ? document : item))
    )
  }, [])

  return {
    documents,
    activeDocumentId,
    activeDocument: documents.find((document) => document.id === activeDocumentId) ?? null,
    isLoading,
    error,
    setActiveDocumentId,
    createDocument,
    renameDocument,
    reloadDocuments: loadDocuments,
  }
}

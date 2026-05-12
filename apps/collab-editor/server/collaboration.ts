import { Server } from '@hocuspocus/server'
import { encodeStateAsUpdate, applyUpdate } from 'yjs'
import { loadDocumentState, storeDocumentState } from './db'
import { handleHttpRequest } from './http'

const roomPrefix = 'doc:'

export function createCollaborationServer(port: number) {
  return new Server({
    port,
    name: 'collab-editor',
    async onLoadDocument({ documentName, document }) {
      const documentId = getDocumentId(documentName)
      if (!documentId) return

      const persistedState = await loadDocumentState(documentId)
      if (persistedState) {
        applyUpdate(document, new Uint8Array(persistedState))
      }
    },
    async onStoreDocument({ documentName, document }) {
      const documentId = getDocumentId(documentName)
      if (!documentId) return

      await storeDocumentState(documentId, encodeStateAsUpdate(document))
    },
    async onRequest({ request, response }) {
      const handled = await handleHttpRequest(request, response)
      if (handled) {
        return Promise.reject()
      }
    },
  })
}

export function getDocumentId(documentName: string) {
  return documentName.startsWith(roomPrefix) ? documentName.slice(roomPrefix.length) : null
}

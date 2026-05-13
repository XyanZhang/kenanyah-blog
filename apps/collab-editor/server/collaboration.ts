import { Server } from '@hocuspocus/server'
import { encodeStateAsUpdate, applyUpdate } from 'yjs'
import { getDocumentAccessRecord, loadDocumentState, storeDocumentState } from './db'
import { handleHttpRequest } from './http'
import { canOpenDocument, parseCollaborationToken, verifyDocumentAccessToken } from './document-access'

const roomPrefix = 'doc:'

export function createCollaborationServer(port: number) {
  return new Server({
    port,
    name: 'collab-editor',
    async onAuthenticate({ documentName, token }) {
      const documentId = getDocumentId(documentName)
      if (!documentId) throw new Error('Document not found')

      const document = await getDocumentAccessRecord(documentId)
      if (!document) throw new Error('Document not found')
      const parsedToken = parseCollaborationToken(token)
      if (!canOpenDocument(document, parsedToken.pixelId)) {
        throw new Error('Document is not shared')
      }
      if (!verifyDocumentAccessToken(document, parsedToken.accessToken)) {
        throw new Error('Document password required')
      }
    },
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

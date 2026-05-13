const storagePrefix = 'collab-document-access:'

export function getStoredDocumentAccessToken(documentId: string) {
  return window.localStorage.getItem(storageKey(documentId))
}

export function storeDocumentAccessToken(documentId: string, token: string) {
  window.localStorage.setItem(storageKey(documentId), token)
}

export function clearDocumentAccessToken(documentId: string) {
  window.localStorage.removeItem(storageKey(documentId))
}

function storageKey(documentId: string) {
  return `${storagePrefix}${documentId}`
}

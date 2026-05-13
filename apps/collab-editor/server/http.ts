import type { IncomingMessage, ServerResponse } from 'node:http'
import {
  createFolder,
  createDocument,
  deleteFolder,
  getDocument,
  getOrCreateEditorUser,
  listFolders,
  listDocuments,
  renameFolder,
  updateEditorUser,
  updateDocument,
} from './db'
import { env } from './env'

export async function handleHttpRequest(request: IncomingMessage, response: ServerResponse) {
  if (request.method === 'OPTIONS') {
    writeCors(response)
    response.writeHead(204)
    response.end()
    return true
  }

  const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`)

  if (request.method === 'GET' && url.pathname === '/health') {
    sendJson(response, 200, { success: true, data: { status: 'healthy' } })
    return true
  }

  if (request.method === 'GET' && url.pathname === '/documents') {
    sendJson(response, 200, { success: true, data: await listDocuments() })
    return true
  }

  if (request.method === 'POST' && url.pathname === '/documents') {
    const body = await readJsonBody(request)
    await sendDbResult(response, 201, () => createDocument(body))
    return true
  }

  const userMatch = url.pathname.match(/^\/users\/([^/]+)$/)
  if (userMatch && request.method === 'GET') {
    await sendDbResult(response, 200, () => getOrCreateEditorUser(userMatch[1]))
    return true
  }

  if (userMatch && request.method === 'PATCH') {
    const body = await readJsonBody(request)
    await sendDbResult(response, 200, () => updateEditorUser(userMatch[1], body))
    return true
  }

  if (request.method === 'GET' && url.pathname === '/folders') {
    sendJson(response, 200, { success: true, data: await listFolders() })
    return true
  }

  if (request.method === 'POST' && url.pathname === '/folders') {
    const body = await readJsonBody(request)
    await sendDbResult(response, 201, () => createFolder(body))
    return true
  }

  if (request.method === 'DELETE' && url.pathname === '/folders') {
    await sendDbResult(response, 200, async () => {
      const deleted = await deleteFolder(url.searchParams.get('path') ?? '')
      if (!deleted) throw new Error('Folder not found')
      return { message: 'Folder deleted' }
    })
    return true
  }

  if (request.method === 'PATCH' && url.pathname === '/folders') {
    const body = await readJsonBody(request)
    await sendDbResult(response, 200, () => renameFolder(url.searchParams.get('path') ?? '', body))
    return true
  }

  const documentMatch = url.pathname.match(/^\/documents\/([^/]+)$/)
  if (documentMatch && request.method === 'GET') {
    const document = await getDocument(documentMatch[1])
    if (!document) {
      sendJson(response, 404, { success: false, error: 'Document not found' })
      return true
    }
    sendJson(response, 200, { success: true, data: document })
    return true
  }

  if (documentMatch && request.method === 'PATCH') {
    const body = await readJsonBody(request)
    const document = await sendDbResult(response, 200, () => updateDocument(documentMatch[1], body))
    if (response.headersSent) return true
    if (!document) {
      sendJson(response, 404, { success: false, error: 'Document not found' })
      return true
    }
    sendJson(response, 200, { success: true, data: document })
    return true
  }

  return false
}

async function sendDbResult<T>(
  response: ServerResponse,
  status: number,
  task: () => Promise<T>
): Promise<T | null> {
  try {
    const data = await task()
    if (data) sendJson(response, status, { success: true, data })
    return data
  } catch (error) {
    sendJson(response, 400, {
      success: false,
      error: error instanceof Error ? error.message : '请求处理失败',
    })
    return null
  }
}

async function readJsonBody(request: IncomingMessage) {
  const chunks: Buffer[] = []

  for await (const chunk of request) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  }

  const raw = Buffer.concat(chunks).toString('utf-8').trim()
  return raw ? JSON.parse(raw) : {}
}

function sendJson(response: ServerResponse, status: number, payload: unknown) {
  writeCors(response)
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' })
  response.end(JSON.stringify(payload))
}

function writeCors(response: ServerResponse) {
  response.setHeader('Access-Control-Allow-Origin', env.corsOrigin)
  response.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS')
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

import type { IncomingMessage, ServerResponse } from 'node:http'
import {
  createDocument,
  getDocument,
  listDocuments,
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
    sendJson(response, 201, { success: true, data: await createDocument(body) })
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
    const document = await updateDocument(documentMatch[1], body)
    if (!document) {
      sendJson(response, 404, { success: false, error: 'Document not found' })
      return true
    }
    sendJson(response, 200, { success: true, data: document })
    return true
  }

  return false
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
  response.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,OPTIONS')
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

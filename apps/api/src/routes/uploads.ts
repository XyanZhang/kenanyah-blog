import { Hono } from 'hono'
import { Readable } from 'node:stream'
import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { env } from '../env'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const apiRoot = path.resolve(__dirname, '..', '..')
const defaultUploadDir = path.join(apiRoot, 'uploads')

function getUploadDir(): string {
  const dir = env.UPLOAD_DIR || defaultUploadDir
  return path.isAbsolute(dir) ? dir : path.resolve(apiRoot, dir)
}

function getMimeType(filename: string): string {
  const ext = path.extname(filename).toLowerCase()
  if (ext === '.png') return 'image/png'
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg'
  if (ext === '.gif') return 'image/gif'
  if (ext === '.webp') return 'image/webp'
  if (ext === '.avif') return 'image/avif'
  if (ext === '.pdf') return 'application/pdf'
  return 'application/octet-stream'
}

function parseSafeUploadPath(rawPath: string): string[] | null {
  const segments = rawPath
    .split('/')
    .map((segment) => decodeURIComponent(segment).trim())
    .filter(Boolean)

  if (segments[0] === 'uploads') {
    segments.shift()
  }
  if (segments.length < 2) return null
  if (segments.some((segment) => segment === '.' || segment === '..' || segment.includes('\\'))) {
    return null
  }

  return segments
}

const uploads = new Hono()

uploads.get('*', async (c) => {
  const segments = parseSafeUploadPath(c.req.path)
  if (!segments) {
    return c.json({ success: false, error: 'Invalid path' }, 400)
  }

  const root = path.resolve(getUploadDir())
  const resolved = path.resolve(root, ...segments)
  if (!resolved.startsWith(root)) {
    return c.json({ success: false, error: 'Invalid path' }, 400)
  }

  try {
    const st = await stat(resolved)
    if (!st.isFile()) {
      return c.json({ success: false, error: 'Not found' }, 404)
    }
  } catch {
    return c.json({ success: false, error: 'Not found' }, 404)
  }

  const stream = createReadStream(resolved)
  const webStream = Readable.toWeb(stream) as ReadableStream
  return new Response(webStream, {
    headers: {
      'Content-Type': getMimeType(segments.at(-1) ?? ''),
      'Cache-Control': 'public, max-age=86400',
    },
  })
})

export default uploads

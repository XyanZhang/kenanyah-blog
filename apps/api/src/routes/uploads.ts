import { Hono } from 'hono'
import { Readable } from 'node:stream'
import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import path from 'node:path'
import { env } from '../env'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const apiRoot = path.resolve(__dirname, '..', '..')
const defaultUploadDir = path.join(apiRoot, 'uploads')

function getUploadDir(): string {
  const dir = env.UPLOAD_DIR || defaultUploadDir
  return path.isAbsolute(dir) ? dir : path.resolve(apiRoot, dir)
}

const uploads = new Hono()

/** GET /uploads/:subdir/:filename — 提供已上传文件的访问 */
uploads.get('/:subdir/:filename', async (c) => {
  const subdir = c.req.param('subdir')
  const filename = c.req.param('filename')
  if (!subdir || !filename) {
    return c.json({ success: false, error: 'Invalid path' }, 400)
  }
  // 防止路径穿越
  if (subdir.includes('..') || filename.includes('..')) {
    return c.json({ success: false, error: 'Invalid path' }, 400)
  }
  const root = getUploadDir()
  const filePath = path.join(root, subdir, filename)
  const resolved = path.resolve(filePath)
  if (!resolved.startsWith(path.resolve(root))) {
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
  const ext = path.extname(filename).toLowerCase()
  const mime =
    ext === '.png'
      ? 'image/png'
      : ext === '.jpg' || ext === '.jpeg'
        ? 'image/jpeg'
        : ext === '.gif'
          ? 'image/gif'
          : ext === '.webp'
            ? 'image/webp'
            : ext === '.pdf'
              ? 'application/pdf'
            : 'application/octet-stream'
  const stream = createReadStream(resolved)
  const webStream = Readable.toWeb(stream) as ReadableStream
  return new Response(webStream, {
    headers: {
      'Content-Type': mime,
      'Cache-Control': 'public, max-age=86400',
    },
  })
})

export default uploads

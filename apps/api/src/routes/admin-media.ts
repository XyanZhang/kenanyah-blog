import { readdir, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Hono } from 'hono'
import { adminAuthMiddleware, requireAdminRole } from '../middleware/admin-auth'
import { validateQuery } from '../middleware/validation'
import { env } from '../env'
import { savePictureImageBuffer } from '../lib/storage'
import { adminMediaQuerySchema, type AdminMediaQueryInput } from '@blog/validation'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const apiRoot = path.resolve(__dirname, '..', '..')
const defaultUploadDir = path.join(apiRoot, 'uploads')

function getUploadDir(): string {
  const dir = env.UPLOAD_DIR || defaultUploadDir
  return path.isAbsolute(dir) ? dir : path.resolve(apiRoot, dir)
}

function getMimeType(name: string): string {
  const ext = path.extname(name).toLowerCase()
  if (ext === '.png') return 'image/png'
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg'
  if (ext === '.webp') return 'image/webp'
  if (ext === '.gif') return 'image/gif'
  if (ext === '.avif') return 'image/avif'
  if (ext === '.pdf') return 'application/pdf'
  return 'application/octet-stream'
}

type AdminMediaVariables = {
  validatedQuery: unknown
}

const adminMedia = new Hono<{ Variables: AdminMediaVariables }>()

adminMedia.use('*', adminAuthMiddleware, requireAdminRole('ADMIN'))

adminMedia.get('/', validateQuery(adminMediaQuerySchema), async (c) => {
  const query = c.get('validatedQuery') as AdminMediaQueryInput
  const root = getUploadDir()
  const subdirFilter = query.subdir?.trim()
  const subdirs = subdirFilter ? [subdirFilter] : await readdir(root).catch(() => [])
  const items: Array<{
    id: string
    name: string
    url: string
    size: number
    mimeType: string
    updatedAt: string
    subdir: string
  }> = []

  for (const subdir of subdirs) {
    const dirPath = path.join(root, subdir)
    const dirStat = await stat(dirPath).catch(() => null)
    if (!dirStat?.isDirectory()) continue
    const names = await readdir(dirPath).catch(() => [])
    for (const name of names) {
      const filePath = path.join(dirPath, name)
      const fileStat = await stat(filePath).catch(() => null)
      if (!fileStat?.isFile()) continue
      items.push({
        id: `${subdir}/${name}`,
        name,
        url: `/uploads/${subdir}/${encodeURIComponent(name)}`,
        size: fileStat.size,
        mimeType: getMimeType(name),
        updatedAt: fileStat.mtime.toISOString(),
        subdir,
      })
    }
  }

  items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  return c.json({ success: true, data: items })
})

adminMedia.post('/upload', async (c) => {
  const form = await c.req.formData()
  const file = form.get('file')
  if (!(file instanceof File)) {
    return c.json({ success: false, error: 'Missing file' }, 400)
  }
  const ext = path.extname(file.name || '').toLowerCase() || '.jpg'
  const buffer = Buffer.from(await file.arrayBuffer())
  const url = await savePictureImageBuffer(buffer, ext)
  return c.json({ success: true, data: { url } }, 201)
})

export default adminMedia

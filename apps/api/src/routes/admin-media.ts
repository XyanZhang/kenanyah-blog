import { mkdir, readdir, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { Hono } from 'hono'
import { Prisma } from '../generated/prisma/client/client'
import { adminAuthMiddleware, requireAdminRole } from '../middleware/admin-auth'
import { validateQuery } from '../middleware/validation'
import { env } from '../env'
import { prisma } from '../lib/db'
import { serializeMediaAsset } from '../lib/calendar-events'
import { saveMediaImageSet } from '../lib/storage'
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

function getMediaCategory(mimeType: string): 'image' | 'pdf' | 'other' {
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType === 'application/pdf') return 'pdf'
  return 'other'
}

function getTypeWhere(type: AdminMediaQueryInput['type']): Prisma.MediaAssetWhereInput | undefined {
  if (type === 'image') return { mimeType: { startsWith: 'image/' } }
  if (type === 'pdf') return { mimeType: 'application/pdf' }
  if (type === 'other') {
    return {
      NOT: [
        { mimeType: { startsWith: 'image/' } },
        { mimeType: 'application/pdf' },
      ],
    }
  }
  return undefined
}

function serializeAdminMediaItem(asset: Awaited<ReturnType<typeof prisma.mediaAsset.findMany>>[number]) {
  const storageParts = asset.storageKey.split('/')
  return {
    ...serializeMediaAsset(asset),
    name: asset.filename,
    subdir: storageParts[0] ?? 'media',
    category: getMediaCategory(asset.mimeType),
  }
}

function storageKeyFromFileUrl(fileUrl: string): string | null {
  try {
    const url = new URL(fileUrl, 'http://localhost')
    const parts = url.pathname.split('/').filter(Boolean)
    const uploadsIdx = parts.indexOf('uploads')
    const rel = uploadsIdx >= 0 ? parts.slice(uploadsIdx + 1) : parts
    if (rel.length < 2) return null
    return rel
      .map((seg) => {
        try {
          return decodeURIComponent(seg)
        } catch {
          return seg
        }
      })
      .join('/')
  } catch {
    return null
  }
}

async function syncPdfDocumentsIntoMediaAssets() {
  const docs = await prisma.pdfDocument.findMany({
    select: { filename: true, fileUrl: true, size: true },
  })

  await Promise.all(
    docs.map((doc) => {
      const storageKey = storageKeyFromFileUrl(doc.fileUrl)
      if (!storageKey) return Promise.resolve(null)
      const localPath = path.join(getUploadDir(), ...storageKey.split('/'))
      const url = `/uploads/${storageKey.split('/').map(encodeURIComponent).join('/')}`
      return stat(localPath)
        .then((fileStat) => ({ exists: fileStat.isFile(), size: fileStat.size }))
        .catch(() => ({ exists: false, size: doc.size }))
        .then(({ exists, size }) =>
          prisma.mediaAsset.upsert({
            where: { storageKey },
            create: {
              url,
              storageKey,
              filename: doc.filename,
              mimeType: 'application/pdf',
              size,
              variants: Prisma.JsonNull,
              source: 'pdf_agent',
              status: exists ? 'ready' : 'missing',
            },
            update: {
              url,
              filename: doc.filename,
              mimeType: 'application/pdf',
              size,
              source: 'pdf_agent',
              status: exists ? 'ready' : 'missing',
            },
          })
        )
    })
  )
}

type AdminMediaVariables = {
  validatedQuery: unknown
}

const adminMedia = new Hono<{ Variables: AdminMediaVariables }>()

adminMedia.use('*', adminAuthMiddleware, requireAdminRole('ADMIN'))

adminMedia.get('/', validateQuery(adminMediaQuerySchema), async (c) => {
  const query = c.get('validatedQuery') as AdminMediaQueryInput
  await syncPdfDocumentsIntoMediaAssets()
  const search = query.search?.trim()
  const subdir = query.subdir?.trim()
  const source = query.source?.trim()
  const status = query.status?.trim()
  const whereParts: Prisma.MediaAssetWhereInput[] = []

  if (subdir) {
    whereParts.push({ storageKey: { startsWith: `${subdir}/` } })
  }
  if (search) {
    whereParts.push({
      OR: [
        { filename: { contains: search, mode: 'insensitive' } },
        { storageKey: { contains: search, mode: 'insensitive' } },
        { mimeType: { contains: search, mode: 'insensitive' } },
        { source: { contains: search, mode: 'insensitive' } },
        { status: { contains: search, mode: 'insensitive' } },
      ],
    })
  }
  if (source && source !== 'all') {
    whereParts.push({ source })
  }
  if (status && status !== 'all') {
    whereParts.push({ status })
  }
  const typeWhere = getTypeWhere(query.type)
  if (typeWhere) {
    whereParts.push(typeWhere)
  }

  const dbAssets = await prisma.mediaAsset.findMany({
    where: whereParts.length ? { AND: whereParts } : undefined,
    orderBy: { updatedAt: 'desc' },
  })

  if (dbAssets.length > 0) {
    return c.json({
      success: true,
      data: dbAssets.map(serializeAdminMediaItem),
    })
  }

  const root = getUploadDir()
  const subdirFilter = subdir
  const subdirs = subdirFilter ? [subdirFilter] : await readdir(root).catch(() => [])
  const items: Array<{
    id: string
    name: string
    url: string
    size: number
    mimeType: string
    updatedAt: string
    subdir: string
    category: 'image' | 'pdf' | 'other'
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
      const mimeType = getMimeType(name)
      items.push({
        id: `${subdir}/${name}`,
        name,
        url: `/uploads/${subdir}/${encodeURIComponent(name)}`,
        size: fileStat.size,
        mimeType,
        updatedAt: fileStat.mtime.toISOString(),
        subdir,
        category: getMediaCategory(mimeType),
      })
    }
  }

  const filteredItems = items.filter((item) => {
    if (query.type !== 'all' && item.category !== query.type) return false
    if (search) {
      const haystack = [item.name, item.url, item.mimeType, item.subdir].join(' ').toLowerCase()
      if (!haystack.includes(search.toLowerCase())) return false
    }
    return true
  })

  filteredItems.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  return c.json({ success: true, data: filteredItems })
})

adminMedia.post('/upload', async (c) => {
  const form = await c.req.formData()
  const file = form.get('file')
  if (!(file instanceof File)) {
    return c.json({ success: false, error: 'Missing file' }, 400)
  }
  const ext = path.extname(file.name || '').toLowerCase() || '.jpg'
  const buffer = Buffer.from(await file.arrayBuffer())
  if (ext === '.pdf' || file.type === 'application/pdf') {
    const safeName = path.basename(file.name || 'document.pdf').replace(/[^\w.\-()\u4e00-\u9fa5]+/g, '_')
    const filename = `${Date.now()}-${randomUUID().slice(0, 8)}-${safeName || 'document.pdf'}`
    const storageKey = `media/${filename}`
    await mkdir(path.join(getUploadDir(), 'media'), { recursive: true })
    await writeFile(path.join(getUploadDir(), storageKey), buffer)
    const asset = await prisma.mediaAsset.create({
      data: {
        url: `/uploads/${storageKey.split('/').map(encodeURIComponent).join('/')}`,
        storageKey,
        filename,
        mimeType: 'application/pdf',
        size: buffer.byteLength,
        variants: Prisma.JsonNull,
        source: 'admin',
        status: 'ready',
      },
    })
    return c.json({ success: true, data: serializeMediaAsset(asset) }, 201)
  }

  const saved = await saveMediaImageSet(buffer, ext)
  const asset = await prisma.mediaAsset.create({
    data: {
      url: saved.url,
      storageKey: saved.storageKey,
      filename: saved.filename,
      mimeType: saved.mimeType,
      size: saved.size,
      width: saved.width,
      height: saved.height,
      variants: saved.variants as Prisma.InputJsonValue,
      source: 'admin',
      status: 'ready',
    },
  })
  return c.json({ success: true, data: serializeMediaAsset(asset) }, 201)
})

export default adminMedia

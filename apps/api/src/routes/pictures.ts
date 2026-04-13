import { readdir, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Hono } from 'hono'
import { z } from 'zod'
import { env } from '../env'
import { prisma } from '../lib/db'
import { authMiddleware } from '../middleware/auth'
import {
  dateStringToUtcDate,
  serializePhotoEntry,
  syncPhotoEvent,
} from '../lib/calendar-events'
import { savePictureImageBuffer } from '../lib/storage'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const apiRoot = path.resolve(__dirname, '..', '..')
const defaultStaticsDir = path.join(apiRoot, 'statics')

function getStaticsDir(): string {
  const dir = env.STATICS_DIR || defaultStaticsDir
  return path.isAbsolute(dir) ? dir : path.resolve(apiRoot, dir)
}

/** 仅允许单层子目录名，防止路径穿越 */
function parsePicturesSubdir(raw: string | undefined): string | null {
  const s = (raw ?? 'seed').trim()
  if (!s || s.includes('..') || s.includes('/') || s.includes('\\')) return null
  if (!/^[a-zA-Z0-9_-]+$/.test(s)) return null
  return s
}

type PictureListItem = {
  id: string
  /** 前端约定路径，经 image-service 映射为 /statics/pictures/... */
  src: string
  date: string
}

type PictureVariables = {
  user?: { userId: string }
}
const pictures = new Hono<{ Variables: PictureVariables }>()

const MAX_PICTURE_IMAGE_BYTES = 12 * 1024 * 1024

const ALLOWED_IMAGE_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
])

const createPictureEntrySchema = z.object({
  title: z.string().max(120).optional(),
  description: z.string().max(5000).optional(),
  imageUrl: z.string().url('图片地址格式无效').optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '请填写 YYYY-MM-DD 格式日期').optional(),
})

function extFromMime(mime: string): string {
  if (mime === 'image/jpeg') return '.jpg'
  if (mime === 'image/png') return '.png'
  if (mime === 'image/webp') return '.webp'
  if (mime === 'image/gif') return '.gif'
  if (mime === 'image/avif') return '.avif'
  return ''
}

function extFromFilename(name: string): string {
  const ext = path.extname(name).toLowerCase()
  if (['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif'].includes(ext)) {
    return ext === '.jpeg' ? '.jpg' : ext
  }
  return ''
}

// GET /pictures/entries — 列出数据库中的照片记录
pictures.get('/entries', async (c) => {
  const list = await prisma.photoEntry.findMany({
    orderBy: [{ takenAt: 'desc' }, { createdAt: 'desc' }],
  })

  return c.json({
    success: true,
    data: list.map(serializePhotoEntry),
  })
})

// POST /pictures/entries — 创建数据库照片记录
pictures.post('/entries', authMiddleware, async (c) => {
  const json = await c.req.json().catch(() => null)
  const parsed = createPictureEntrySchema.safeParse(json)
  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.flatten().fieldErrors }, 400)
  }

  const { userId } = c.get('user')!
  const body = parsed.data

  const entry = await prisma.photoEntry.create({
    data: {
      userId,
      title: body.title?.trim() || null,
      description: body.description?.trim() || null,
      imageUrl: body.imageUrl?.trim() || null,
      takenAt: body.date ? dateStringToUtcDate(body.date) : new Date(),
    },
  })

  await syncPhotoEvent(entry)

  return c.json({ success: true, data: serializePhotoEntry(entry) }, 201)
})

// POST /pictures/upload — 上传照片到 uploads/pictures/
pictures.post('/upload', authMiddleware, async (c) => {
  const form = await c.req.formData()
  const file = form.get('file')
  if (!(file instanceof File)) {
    return c.json({ success: false, error: '缺少文件：file' }, 400)
  }

  const mime = (file.type || '').toLowerCase()
  if (mime && !ALLOWED_IMAGE_MIME.has(mime)) {
    return c.json({ success: false, error: '仅支持 JPEG / PNG / WebP / GIF / AVIF' }, 400)
  }

  if (file.size <= 0 || file.size > MAX_PICTURE_IMAGE_BYTES) {
    return c.json(
      {
        success: false,
        error: `图片大小需在 1B～${MAX_PICTURE_IMAGE_BYTES / 1024 / 1024}MB 之间`,
      },
      400
    )
  }

  let ext = mime ? extFromMime(mime) : ''
  if (!ext) ext = extFromFilename(file.name || '')
  if (!ext) ext = '.jpg'

  const buf = Buffer.from(await file.arrayBuffer())
  try {
    const url = await savePictureImageBuffer(buf, ext)
    return c.json({ success: true, data: { url } })
  } catch (error) {
    const message = error instanceof Error ? error.message : '上传失败'
    return c.json({ success: false, error: message }, 500)
  }
})

/** GET /pictures?subdir=seed — 列出 statics/pictures/<subdir> 下的图片元数据 */
pictures.get('/', async (c) => {
  const subdir = parsePicturesSubdir(c.req.query('subdir'))
  if (!subdir) {
    return c.json({ success: false, error: 'Invalid subdir' }, 400)
  }

  const staticsRoot = path.resolve(getStaticsDir())
  const picturesRoot = path.resolve(staticsRoot, 'pictures')
  const targetDir = path.resolve(picturesRoot, subdir)
  if (!targetDir.startsWith(picturesRoot)) {
    return c.json({ success: false, error: 'Invalid path' }, 400)
  }

  try {
    const names = await readdir(targetDir)
    const imageNames = names
      .filter((name) => /\.(jpe?g|png|webp|avif)$/i.test(name))
      .sort((a, b) => a.localeCompare(b))

    const data: PictureListItem[] = []
    for (let i = 0; i < imageNames.length; i += 1) {
      const name = imageNames[i]
      const filePath = path.join(targetDir, name)
      const st = await stat(filePath)
      if (!st.isFile()) continue
      data.push({
        id: `${subdir}-${i + 1}`,
        src: `/pictures/${subdir}/${name}`,
        date: st.mtime.toISOString().slice(0, 10),
      })
    }

    return c.json({ success: true, data })
  } catch {
    return c.json({ success: true, data: [] as PictureListItem[] })
  }
})

export default pictures

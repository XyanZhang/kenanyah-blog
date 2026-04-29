import { Hono } from 'hono'
import { Prisma } from '../generated/prisma/client/client'
import { prisma } from '../lib/db'
import {
  dateStringToUtcDate,
  removeEventsForSource,
  serializeMediaAsset,
  serializePhotoEntry,
  syncPhotoEvent,
} from '../lib/calendar-events'
import { saveMediaImageSet } from '../lib/storage'
import { adminAuthMiddleware, requireAdminRole } from '../middleware/admin-auth'
import { NotFoundError } from '../middleware/error'
import { validateBody, validateQuery } from '../middleware/validation'
import {
  adminPhotoCreateSchema,
  adminPhotoQuerySchema,
  adminPhotoUpdateSchema,
  type AdminPhotoCreateInput,
  type AdminPhotoQueryInput,
  type AdminPhotoUpdateInput,
} from '@blog/validation'

type AdminPhotoVariables = {
  validatedQuery: unknown
  validatedBody: unknown
}

const adminPhotos = new Hono<{ Variables: AdminPhotoVariables }>()
const MAX_PHOTO_IMAGE_BYTES = 12 * 1024 * 1024
const ALLOWED_IMAGE_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
])

function nullableText(value: string | null | undefined): string | null | undefined {
  if (value === undefined) return undefined
  return value?.trim() || null
}

async function getDefaultPhotoOwnerId(): Promise<string | null> {
  const user = await prisma.user.findFirst({
    where: { role: 'ADMIN' },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  })
  if (user) return user.id

  const fallback = await prisma.user.findFirst({
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  })
  return fallback?.id ?? null
}

async function buildCreateData(body: AdminPhotoCreateInput): Promise<Prisma.PhotoEntryUncheckedCreateInput> {
  const mediaAssetId = nullableText(body.mediaAssetId) ?? null
  return {
    userId: await getDefaultPhotoOwnerId(),
    mediaAssetId,
    title: nullableText(body.title) ?? null,
    description: nullableText(body.description) ?? null,
    imageUrl: nullableText(body.imageUrl) ?? null,
    takenAt: body.date ? dateStringToUtcDate(body.date) : null,
  }
}

function buildUpdateData(body: AdminPhotoUpdateInput): Prisma.PhotoEntryUncheckedUpdateInput {
  return {
    title: body.title === undefined ? undefined : nullableText(body.title),
    description: nullableText(body.description),
    imageUrl: nullableText(body.imageUrl),
    mediaAssetId: body.mediaAssetId === undefined ? undefined : nullableText(body.mediaAssetId),
    takenAt: body.date === undefined ? undefined : body.date ? dateStringToUtcDate(body.date) : null,
  }
}

function extFromFilename(name: string): string {
  const ext = name.includes('.') ? name.slice(name.lastIndexOf('.')).toLowerCase() : ''
  if (['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif'].includes(ext)) {
    return ext
  }
  return '.jpg'
}

async function createMediaAssetFromFile(file: File, userId: string | null) {
  const mime = (file.type || '').toLowerCase()
  if (mime && !ALLOWED_IMAGE_MIME.has(mime)) {
    throw new Error('Only JPEG, PNG, WebP, GIF, and AVIF images are supported')
  }
  if (file.size <= 0 || file.size > MAX_PHOTO_IMAGE_BYTES) {
    throw new Error(`Image size must be between 1B and ${MAX_PHOTO_IMAGE_BYTES / 1024 / 1024}MB`)
  }

  const saved = await saveMediaImageSet(Buffer.from(await file.arrayBuffer()), extFromFilename(file.name || 'image.jpg'))
  return prisma.mediaAsset.create({
    data: {
      userId,
      url: saved.url,
      storageKey: saved.storageKey,
      filename: saved.filename,
      mimeType: saved.mimeType,
      size: saved.size,
      width: saved.width,
      height: saved.height,
      variants: saved.variants as Prisma.InputJsonValue,
      source: 'photo',
      status: 'ready',
    },
  })
}

adminPhotos.use('*', adminAuthMiddleware, requireAdminRole('ADMIN'))

adminPhotos.get('/', validateQuery(adminPhotoQuerySchema), async (c) => {
  const query = c.get('validatedQuery') as AdminPhotoQueryInput
  const page = query.page || 1
  const limit = query.limit || 20
  const skip = (page - 1) * limit

  const where: Prisma.PhotoEntryWhereInput = {}
  if (query.search) {
    where.OR = [
      { title: { contains: query.search, mode: 'insensitive' } },
      { description: { contains: query.search, mode: 'insensitive' } },
      { imageUrl: { contains: query.search, mode: 'insensitive' } },
    ]
  }
  if (query.hasImage === 'true') {
    where.imageUrl = { not: null }
  }
  if (query.hasImage === 'false') {
    where.imageUrl = null
  }

  const [total, list] = await Promise.all([
    prisma.photoEntry.count({ where }),
    prisma.photoEntry.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ takenAt: 'desc' }, { updatedAt: 'desc' }],
      include: { mediaAsset: true },
    }),
  ])

  return c.json({
    success: true,
    data: list.map(serializePhotoEntry),
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  })
})

adminPhotos.post('/', validateBody(adminPhotoCreateSchema), async (c) => {
  const body = c.get('validatedBody') as AdminPhotoCreateInput
  const mediaAsset = body.mediaAssetId
    ? await prisma.mediaAsset.findUnique({ where: { id: body.mediaAssetId } })
    : null
  const created = await prisma.photoEntry.create({
    data: {
      ...(await buildCreateData(body)),
      imageUrl: nullableText(body.imageUrl) ?? mediaAsset?.url ?? null,
    },
    include: { mediaAsset: true },
  })

  await syncPhotoEvent(created)

  return c.json({ success: true, data: serializePhotoEntry(created) }, 201)
})

adminPhotos.post('/upload', async (c) => {
  const form = await c.req.formData()
  const file = form.get('file')
  if (!(file instanceof File)) {
    return c.json({ success: false, error: 'Missing file' }, 400)
  }

  try {
    const userId = await getDefaultPhotoOwnerId()
    const mediaAsset = await createMediaAssetFromFile(file, userId)
    const date = form.get('date')
    const created = await prisma.photoEntry.create({
      data: {
        userId,
        mediaAssetId: mediaAsset.id,
        title: nullableText(String(form.get('title') ?? '')) ?? null,
        description: nullableText(String(form.get('description') ?? '')) ?? null,
        imageUrl: mediaAsset.url,
        takenAt: typeof date === 'string' && date ? dateStringToUtcDate(date) : null,
      },
      include: { mediaAsset: true },
    })

    await syncPhotoEvent(created)

    return c.json({
      success: true,
      data: {
        photo: serializePhotoEntry(created),
        mediaAsset: serializeMediaAsset(mediaAsset),
      },
    }, 201)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upload failed'
    return c.json({ success: false, error: message }, 400)
  }
})

adminPhotos.patch('/:id', validateBody(adminPhotoUpdateSchema), async (c) => {
  const { id } = c.req.param()
  const existing = await prisma.photoEntry.findUnique({ where: { id } })
  if (!existing) {
    throw new NotFoundError('Photo not found')
  }

  const body = c.get('validatedBody') as AdminPhotoUpdateInput
  const mediaAsset = body.mediaAssetId
    ? await prisma.mediaAsset.findUnique({ where: { id: body.mediaAssetId } })
    : null
  const updated = await prisma.photoEntry.update({
    where: { id },
    data: {
      ...buildUpdateData(body),
      ...(body.mediaAssetId ? { imageUrl: mediaAsset?.url ?? null } : {}),
    },
    include: { mediaAsset: true },
  })

  await syncPhotoEvent(updated)

  return c.json({ success: true, data: serializePhotoEntry(updated) })
})

adminPhotos.delete('/:id', async (c) => {
  const { id } = c.req.param()
  const existing = await prisma.photoEntry.findUnique({ where: { id } })
  if (!existing) {
    throw new NotFoundError('Photo not found')
  }

  await removeEventsForSource('photo', id)
  await prisma.photoEntry.delete({ where: { id } })

  return c.json({ success: true, data: { message: 'Photo deleted' } })
})

export default adminPhotos

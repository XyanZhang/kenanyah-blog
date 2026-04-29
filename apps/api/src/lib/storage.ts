/**
 * 文件存储服务：本地 upload 文件夹
 * 后续可扩展为 OSS 等云存储
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { env } from '../env'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const apiRoot = path.resolve(__dirname, '..', '..')

/** 默认上传目录：apps/api/uploads */
const defaultUploadDir = path.join(apiRoot, 'uploads')

function getUploadDir(): string {
  const dir = env.UPLOAD_DIR || defaultUploadDir
  return path.isAbsolute(dir) ? dir : path.resolve(apiRoot, dir)
}

function getUploadBaseUrl(): string {
  return env.UPLOAD_BASE_URL || `http://localhost:${env.PORT}`
}

/**
 * 从远程 URL 下载图片并保存到 upload 目录
 * @param remoteUrl 远程图片 URL（如 DashScope 返回的临时链接）
 * @param subdir 子目录，如 'covers'
 * @returns 可公开访问的 URL
 */
export async function saveImageFromUrl(
  remoteUrl: string,
  subdir = 'covers'
): Promise<string> {
  const res = await fetch(remoteUrl)
  if (!res.ok) {
    throw new Error(`下载图片失败: ${res.status} ${res.statusText}`)
  }
  const buffer = Buffer.from(await res.arrayBuffer())
  const ext = path.extname(new URL(remoteUrl).pathname) || '.png'
  const filename = `${randomUUID()}${ext}`
  const dir = path.join(getUploadDir(), subdir)
  await fs.mkdir(dir, { recursive: true })
  const filePath = path.join(dir, filename)
  await fs.writeFile(filePath, buffer)
  const baseUrl = getUploadBaseUrl().replace(/\/$/, '')
  return `${baseUrl}/uploads/${subdir}/${filename}`
}

/** 思考流配图：写入 uploads/thoughts/，与其他业务子目录区分 */
const THOUGHT_IMAGES_SUBDIR = 'thoughts'
const PICTURE_IMAGES_SUBDIR = 'pictures'
const MEDIA_IMAGES_SUBDIR = 'images'

export type SavedImageVariant = {
  url: string
  storageKey: string
  width: number | null
  height: number | null
  mimeType: string
  size: number
}

export type SavedImageSet = {
  url: string
  storageKey: string
  filename: string
  mimeType: string
  size: number
  width: number | null
  height: number | null
  variants: {
    original: SavedImageVariant
    medium?: SavedImageVariant
    thumb?: SavedImageVariant
  }
}

function normalizeImageExt(ext: string): string {
  const safeExt = ext && /^\.(jpe?g|png|gif|webp|avif)$/i.test(ext) ? ext.toLowerCase() : '.jpg'
  return safeExt === '.jpeg' ? '.jpg' : safeExt
}

function mimeFromExt(ext: string): string {
  if (ext === '.png') return 'image/png'
  if (ext === '.webp') return 'image/webp'
  if (ext === '.gif') return 'image/gif'
  if (ext === '.avif') return 'image/avif'
  return 'image/jpeg'
}

function datePathParts(now = new Date()): [string, string] {
  return [
    String(now.getUTCFullYear()),
    String(now.getUTCMonth() + 1).padStart(2, '0'),
  ]
}

function uploadUrlForStorageKey(storageKey: string): string {
  return `/uploads/${storageKey.split('/').map(encodeURIComponent).join('/')}`
}

async function writeVariant(
  input: {
    buffer: Buffer
    folder: string
    filename: string
    storageKey: string
    mimeType: string
  }
): Promise<SavedImageVariant> {
  const dir = path.join(getUploadDir(), input.folder)
  await fs.mkdir(dir, { recursive: true })
  const filePath = path.join(dir, input.filename)
  await fs.writeFile(filePath, input.buffer)
  const metadata = await sharp(input.buffer).metadata().catch(() => null)

  return {
    url: uploadUrlForStorageKey(input.storageKey),
    storageKey: input.storageKey,
    width: metadata?.width ?? null,
    height: metadata?.height ?? null,
    mimeType: input.mimeType,
    size: input.buffer.byteLength,
  }
}

async function createWebpVariant(input: {
  buffer: Buffer
  storageKey: string
  folder: string
  filename: string
  width: number
  height?: number
  fit?: keyof sharp.FitEnum
}): Promise<SavedImageVariant> {
  const output = await sharp(input.buffer)
    .rotate()
    .resize({
      width: input.width,
      height: input.height,
      fit: input.fit ?? 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: 82 })
    .toBuffer()

  return writeVariant({
    buffer: output,
    folder: input.folder,
    filename: input.filename,
    storageKey: input.storageKey,
    mimeType: 'image/webp',
  })
}

export async function saveThoughtImageBuffer(
  buffer: Buffer,
  ext: string
): Promise<string> {
  const safeExt =
    ext && /^\.(jpe?g|png|gif|webp)$/i.test(ext) ? ext.toLowerCase() : '.jpg'
  const filename = `${randomUUID()}${safeExt}`
  const dir = path.join(getUploadDir(), THOUGHT_IMAGES_SUBDIR)
  await fs.mkdir(dir, { recursive: true })
  const filePath = path.join(dir, filename)
  await fs.writeFile(filePath, buffer)
  const baseUrl = getUploadBaseUrl().replace(/\/$/, '')
  return `${baseUrl}/uploads/${THOUGHT_IMAGES_SUBDIR}/${filename}`
}

export async function savePictureImageBuffer(
  buffer: Buffer,
  ext: string
): Promise<string> {
  const safeExt =
    ext && /^\.(jpe?g|png|gif|webp|avif)$/i.test(ext) ? ext.toLowerCase() : '.jpg'
  const filename = `${randomUUID()}${safeExt}`
  const dir = path.join(getUploadDir(), PICTURE_IMAGES_SUBDIR)
  await fs.mkdir(dir, { recursive: true })
  const filePath = path.join(dir, filename)
  await fs.writeFile(filePath, buffer)
  const baseUrl = getUploadBaseUrl().replace(/\/$/, '')
  return `${baseUrl}/uploads/${PICTURE_IMAGES_SUBDIR}/${filename}`
}

export async function saveMediaImageSet(buffer: Buffer, ext: string): Promise<SavedImageSet> {
  const safeExt = normalizeImageExt(ext)
  const [year, month] = datePathParts()
  const id = randomUUID()
  const originalFilename = `${id}${safeExt}`
  const originalFolder = path.join(MEDIA_IMAGES_SUBDIR, 'original', year, month)
  const originalStorageKey = path.posix.join(MEDIA_IMAGES_SUBDIR, 'original', year, month, originalFilename)
  const original = await writeVariant({
    buffer,
    folder: originalFolder,
    filename: originalFilename,
    storageKey: originalStorageKey,
    mimeType: mimeFromExt(safeExt),
  })

  const variants: SavedImageSet['variants'] = { original }
  const canTransform = safeExt !== '.gif'
  if (canTransform) {
    const mediumFilename = `${id}.webp`
    const thumbFilename = `${id}.webp`
    variants.medium = await createWebpVariant({
      buffer,
      folder: path.join(MEDIA_IMAGES_SUBDIR, 'medium', year, month),
      filename: mediumFilename,
      storageKey: path.posix.join(MEDIA_IMAGES_SUBDIR, 'medium', year, month, mediumFilename),
      width: 1600,
    })
    variants.thumb = await createWebpVariant({
      buffer,
      folder: path.join(MEDIA_IMAGES_SUBDIR, 'thumb', year, month),
      filename: thumbFilename,
      storageKey: path.posix.join(MEDIA_IMAGES_SUBDIR, 'thumb', year, month, thumbFilename),
      width: 512,
      height: 512,
      fit: 'cover',
    })
  }

  return {
    url: variants.medium?.url ?? original.url,
    storageKey: original.storageKey,
    filename: originalFilename,
    mimeType: original.mimeType,
    size: original.size,
    width: original.width,
    height: original.height,
    variants,
  }
}

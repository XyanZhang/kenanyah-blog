import { Context, Hono } from 'hono'
import { Readable } from 'node:stream'
import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { env } from '../env'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const apiRoot = path.resolve(__dirname, '..', '..')
const defaultStaticsDir = path.join(apiRoot, 'statics')

const MAX_DIMENSION = 4096
const MIN_QUALITY = 30
const MAX_QUALITY = 95

type OutputFormat = 'jpeg' | 'png' | 'webp' | 'avif'
type FitMode = 'cover' | 'contain' | 'fill' | 'inside' | 'outside'

function getStaticsDir(): string {
  const dir = env.STATICS_DIR || defaultStaticsDir
  return path.isAbsolute(dir) ? dir : path.resolve(apiRoot, dir)
}

function parsePositiveInt(value: string | null, max: number): number | undefined {
  if (!value) return undefined
  const n = Number(value)
  if (!Number.isInteger(n) || n <= 0 || n > max) return undefined
  return n
}

function parseQuality(value: string | null): number {
  if (!value) return 80
  const n = Number(value)
  if (!Number.isFinite(n)) return 80
  return Math.min(MAX_QUALITY, Math.max(MIN_QUALITY, Math.round(n)))
}

function parseFit(value: string | null): FitMode {
  if (value === 'cover' || value === 'contain' || value === 'fill' || value === 'inside' || value === 'outside') {
    return value
  }
  return 'cover'
}

function parseOutputFormat(value: string | null, fileExt: string): OutputFormat {
  if (value === 'jpeg' || value === 'png' || value === 'webp' || value === 'avif') {
    return value
  }
  if (fileExt === '.png') return 'png'
  if (fileExt === '.webp') return 'webp'
  if (fileExt === '.avif') return 'avif'
  return 'jpeg'
}

function getMimeTypeByFormat(format: OutputFormat): string {
  if (format === 'png') return 'image/png'
  if (format === 'webp') return 'image/webp'
  if (format === 'avif') return 'image/avif'
  return 'image/jpeg'
}

async function resolveStaticFile(paths: string[]): Promise<{ root: string; resolved: string } | null> {
  if (!paths.length || paths.some((part) => !part || part.includes('..'))) {
    return null
  }

  const root = getStaticsDir()
  const filePath = path.join(root, ...paths)
  const resolved = path.resolve(filePath)
  if (!resolved.startsWith(path.resolve(root))) {
    return null
  }
  try {
    const st = await stat(resolved)
    if (!st.isFile()) return null
  } catch {
    return null
  }
  return { root, resolved }
}

const statics = new Hono()

// GET /statics/** 任意层级路径
// 通过 query 参数动态裁剪：w、h、q、fit、format
statics.get('/*', async (c) => {
  const wildcard = c.req.param('*') ?? ''
  let paths = wildcard.split('/').filter(Boolean)
  if (paths[0] === 'statics') {
    paths = paths.slice(1)
  }
  if (paths.length === 0) {
    const fromPath = c.req.path.replace(/^\/statics\/?/, '')
    paths = fromPath.split('/').filter(Boolean)
  }
  return serveStaticImage(c, paths)
})

async function serveStaticImage(
  c: Context,
  paths: string[]
) {
  const resolved = await resolveStaticFile(paths)
  if (!resolved) {
    return c.json({ success: false, error: 'Not found' }, 404)
  }

  const url = new URL(c.req.url)
  const width = parsePositiveInt(url.searchParams.get('w'), MAX_DIMENSION)
  const height = parsePositiveInt(url.searchParams.get('h'), MAX_DIMENSION)
  const quality = parseQuality(url.searchParams.get('q'))
  const fit = parseFit(url.searchParams.get('fit'))
  const ext = path.extname(resolved.resolved).toLowerCase()
  const format = parseOutputFormat(url.searchParams.get('format'), ext)

  const hasTransform = Boolean(width || height || url.searchParams.get('q') || url.searchParams.get('fit') || url.searchParams.get('format'))

  if (!hasTransform) {
    const stream = createReadStream(resolved.resolved)
    const webStream = Readable.toWeb(stream) as ReadableStream
    return new Response(webStream, {
      headers: {
        'Content-Type':
          ext === '.png'
            ? 'image/png'
            : ext === '.jpg' || ext === '.jpeg'
              ? 'image/jpeg'
              : ext === '.gif'
                ? 'image/gif'
                : ext === '.webp'
                  ? 'image/webp'
                  : ext === '.avif'
                    ? 'image/avif'
                    : 'application/octet-stream',
        'Cache-Control': 'public, max-age=86400',
      },
    })
  }

  try {
    let transformer = sharp(resolved.resolved).rotate()
    if (width || height) {
      transformer = transformer.resize({
        width,
        height,
        fit,
        withoutEnlargement: true,
      })
    }
    if (format === 'png') {
      transformer = transformer.png({ quality })
    } else if (format === 'webp') {
      transformer = transformer.webp({ quality })
    } else if (format === 'avif') {
      transformer = transformer.avif({ quality })
    } else {
      transformer = transformer.jpeg({ quality, mozjpeg: true })
    }

    const buffer = await transformer.toBuffer()
    return new Response(buffer, {
      headers: {
        'Content-Type': getMimeTypeByFormat(format),
        'Cache-Control': 'public, max-age=604800, stale-while-revalidate=86400',
      },
    })
  } catch {
    return c.json({ success: false, error: 'Image transform failed' }, 500)
  }
}

export default statics

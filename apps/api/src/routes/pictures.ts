import { readdir, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Hono } from 'hono'
import { env } from '../env'

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

const pictures = new Hono()

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

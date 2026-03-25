import { access, mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

type PicsumItem = {
  id: string
  author: string
  width: number
  height: number
  url: string
  download_url: string
}

type SavedImageMeta = {
  sourceId: string
  author: string
  sourceUrl: string
  localFile: string
  width: number
  height: number
}

type DownloadTask = {
  sourceId: string
  author: string
  sourceUrl: string
  fileName: string
  fetchUrl: string
}

function parseArg(name: string, fallback: string): string {
  const prefix = `--${name}=`
  const arg = process.argv.find((item) => item.startsWith(prefix))
  if (!arg) return fallback
  return arg.slice(prefix.length)
}

function toPositiveInt(raw: string, fallback: number): number {
  const n = Number(raw)
  if (!Number.isInteger(n) || n <= 0) return fallback
  return n
}

async function fetchWithTimeout(url: string, timeoutMs = 15000): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath)
    return true
  } catch {
    return false
  }
}

async function loadExistingManifest(manifestPath: string): Promise<SavedImageMeta[]> {
  if (!(await fileExists(manifestPath))) return []
  try {
    const raw = await readFile(manifestPath, 'utf-8')
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item): item is SavedImageMeta => {
      return (
        typeof item === 'object' &&
        item !== null &&
        typeof (item as SavedImageMeta).sourceId === 'string' &&
        typeof (item as SavedImageMeta).localFile === 'string'
      )
    })
  } catch {
    return []
  }
}

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const apiRoot = path.resolve(__dirname, '..')

async function buildTasksFromSeedRange(
  seedStart: number,
  seedEnd: number,
  targetWidth: number,
  targetHeight: number
): Promise<DownloadTask[]> {
  const tasks: DownloadTask[] = []
  for (let i = seedStart; i <= seedEnd; i += 1) {
    const seed = `p${i}`
    tasks.push({
      sourceId: `seed-${seed}`,
      author: 'picsum-seed',
      sourceUrl: `https://picsum.photos/seed/${seed}`,
      fileName: `picsum-seed-${seed}-${targetWidth}x${targetHeight}.jpg`,
      fetchUrl: `https://picsum.photos/seed/${seed}/${targetWidth}/${targetHeight}.jpg`,
    })
  }
  return tasks
}

async function buildTasksFromList(
  page: number,
  total: number,
  targetWidth: number,
  targetHeight: number,
  timeoutMs: number
): Promise<DownloadTask[]> {
  const listUrl = `https://picsum.photos/v2/list?page=${page}&limit=${total}`
  console.log(`[1/3] 拉取图片列表: ${listUrl}`)
  const listRes = await fetchWithTimeout(listUrl, timeoutMs)
  if (!listRes.ok) {
    throw new Error(`Failed to fetch image list: ${listRes.status}`)
  }

  const list = (await listRes.json()) as PicsumItem[]
  if (!Array.isArray(list) || list.length === 0) {
    throw new Error('Image list is empty')
  }

  return list.map((item) => ({
    sourceId: item.id,
    author: item.author,
    sourceUrl: item.download_url,
    fileName: `picsum-${item.id}-${targetWidth}x${targetHeight}.jpg`,
    fetchUrl: `https://picsum.photos/id/${item.id}/${targetWidth}/${targetHeight}.jpg`,
  }))
}

async function main() {
  const source = parseArg('source', 'list')
  const total = toPositiveInt(parseArg('count', '12'), 12)
  const targetWidth = toPositiveInt(parseArg('width', '2400'), 2400)
  const targetHeight = toPositiveInt(parseArg('height', '1600'), 1600)
  const page = toPositiveInt(parseArg('page', '1'), 1)
  const outSubdir = parseArg('dir', 'seed')
  const timeoutMs = toPositiveInt(parseArg('timeout', '20000'), 20000)
  const maxRetries = toPositiveInt(parseArg('retries', '2'), 2)
  const staticsDir = path.join(apiRoot, 'statics', outSubdir)

  await mkdir(staticsDir, { recursive: true })
  const manifestPath = path.join(staticsDir, '_manifest.json')
  const existingManifest = await loadExistingManifest(manifestPath)
  const existingIds = new Set(existingManifest.map((item) => item.sourceId))
  const allSaved = [...existingManifest]

  const tasks =
    source === 'seed-range'
      ? await buildTasksFromSeedRange(
          toPositiveInt(parseArg('seedStart', '1'), 1),
          toPositiveInt(parseArg('seedEnd', '30'), 30),
          targetWidth,
          targetHeight
        )
      : await buildTasksFromList(page, total, targetWidth, targetHeight, timeoutMs)

  if (source === 'seed-range') {
    console.log(`[1/3] 使用 seed 区间模式: p${parseArg('seedStart', '1')} ~ p${parseArg('seedEnd', '30')}`)
  }
  console.log(`[2/3] 开始逐张下载，共 ${tasks.length} 张...`)

  const saved: SavedImageMeta[] = []
  for (let i = 0; i < tasks.length; i += 1) {
    const task = tasks[i]
    const prefix = `[${i + 1}/${tasks.length}] id=${task.sourceId}`
    const filename = task.fileName
    const outputPath = path.join(staticsDir, filename)

    if (existingIds.has(task.sourceId) || (await fileExists(outputPath))) {
      console.log(`${prefix} 已存在，跳过 -> ${filename}`)
      continue
    }

    const src = task.fetchUrl
    let done = false
    for (let attempt = 1; attempt <= maxRetries + 1; attempt += 1) {
      try {
        console.log(`${prefix} 下载中（第 ${attempt} 次）...`)
        const imageRes = await fetchWithTimeout(src, timeoutMs)
        if (!imageRes.ok) {
          throw new Error(`HTTP ${imageRes.status}`)
        }
        const arrayBuffer = await imageRes.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        await writeFile(outputPath, buffer)
        const entry: SavedImageMeta = {
          sourceId: task.sourceId,
          author: task.author,
          sourceUrl: task.sourceUrl,
          localFile: path.join('statics', outSubdir, filename),
          width: targetWidth,
          height: targetHeight,
        }
        saved.push(entry)
        allSaved.push(entry)
        existingIds.add(task.sourceId)
        console.log(`${prefix} 完成，已保存 -> ${filename}`)
        done = true
        break
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        console.log(`${prefix} 失败：${message}`)
        if (attempt <= maxRetries) {
          await sleep(300 * attempt)
        }
      }
    }
    if (!done) {
      console.log(`${prefix} 跳过（超过最大重试次数）`)
    }
    // 控制节奏，避免突发请求过高
    await sleep(120)
  }

  console.log('[3/3] 写入 manifest...')
  await writeFile(manifestPath, JSON.stringify(allSaved, null, 2), 'utf-8')

  console.log(
    [
      `Source: ${source}`,
      `Downloaded: ${saved.length}/${tasks.length}`,
      `Skipped(existing): ${tasks.length - saved.length}`,
      `Output: ${staticsDir}`,
      `Manifest: ${manifestPath}`,
      `Size: ${targetWidth}x${targetHeight}`,
      `Timeout(ms): ${timeoutMs}`,
      `Retries: ${maxRetries}`,
    ].join('\n')
  )
}

main().catch((error) => {
  console.error('fetch-statics-images failed:', error)
  process.exitCode = 1
})

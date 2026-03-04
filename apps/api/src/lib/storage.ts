/**
 * 文件存储服务：本地 upload 文件夹
 * 后续可扩展为 OSS 等云存储
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
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

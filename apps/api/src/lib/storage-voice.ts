/**
 * 语音文件存储服务：保存音频文件到 uploads/voice/
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

/** 语音文件子目录 */
const VOICE_SUBDIR = 'voice'

/** 支持的音频格式 */
const ALLOWED_AUDIO_EXTENSIONS = ['.webm', '.mp3', '.wav', '.m4a', '.mp4', '.ogg', '.aac']

/**
 * 保存语音文件到 uploads/voice/
 * @param buffer 音频文件 Buffer
 * @param ext 文件扩展名（带点，如 '.webm'）
 * @returns 文件信息：{ filename, filePath, publicUrl }
 */
export async function saveVoiceFileBuffer(
  buffer: Buffer,
  ext: string
): Promise<{ filename: string; filePath: string; publicUrl: string }> {
  const safeExt =
    ext && ALLOWED_AUDIO_EXTENSIONS.includes(ext.toLowerCase()) ? ext.toLowerCase() : '.webm'

  const filename = `${randomUUID()}${safeExt}`
  const dir = path.join(getUploadDir(), VOICE_SUBDIR)
  await fs.mkdir(dir, { recursive: true })

  const filePath = path.join(dir, filename)
  await fs.writeFile(filePath, buffer)

  const baseUrl = getUploadBaseUrl().replace(/\/$/, '')
  const publicUrl = `${baseUrl}/uploads/${VOICE_SUBDIR}/${filename}`

  return { filename, filePath, publicUrl }
}

/**
 * 删除语音文件
 * @param filename 文件名（不含路径）
 */
export async function deleteVoiceFile(filename: string): Promise<void> {
  const filePath = path.join(getUploadDir(), VOICE_SUBDIR, filename)
  try {
    await fs.unlink(filePath)
  } catch (error) {
    // 文件不存在时忽略错误
    if ((error as any).code !== 'ENOENT') {
      throw error
    }
  }
}

/**
 * 获取语音文件路径
 * @param filename 文件名（不含路径）
 * @returns 文件绝对路径
 */
export function getVoiceFilePath(filename: string): string {
  return path.join(getUploadDir(), VOICE_SUBDIR, filename)
}
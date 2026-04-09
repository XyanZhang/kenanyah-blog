/**
 * 语音上传和识别 API 路由
 */
import { Hono } from 'hono'
import { z } from 'zod'
import path from 'node:path'
import { authMiddleware } from '../middleware/auth'
import { rateLimit } from '../middleware/rate-limit'
import { saveVoiceFileBuffer, getVoiceFilePath } from '../lib/storage-voice'
import { transcribeAudio } from '../lib/whisper-service'
import { logger } from '../lib/logger'
import type { JwtPayload } from '../lib/jwt'

type VoiceVariables = { user: JwtPayload }

const voice = new Hono<{ Variables: VoiceVariables }>()

/** 音频文件大小限制：10MB */
const MAX_VOICE_FILE_BYTES = 10 * 1024 * 1024

/** 支持的音频 MIME 类型前缀 */
const ALLOWED_AUDIO_PREFIXES = [
  'audio/webm',
  'audio/mp3',
  'audio/mpeg',
  'audio/wav',
  'audio/x-wav',
  'audio/m4a',
  'audio/x-m4a',
  'audio/ogg',
  'audio/aac',
  'audio/mp4', // Safari 可能返回 audio/mp4
]

/** 检查 MIME 类型是否被允许 */
function isAllowedMime(mime: string): boolean {
  if (!mime) return false
  const lowerMime = mime.toLowerCase()
  return ALLOWED_AUDIO_PREFIXES.some((prefix) => lowerMime.startsWith(prefix))
}

/** MIME 类型到扩展名的映射 */
function extFromMime(mime: string): string {
  if (mime.includes('webm')) return '.webm'
  if (mime.includes('mp3') || mime.includes('mpeg')) return '.mp3'
  if (mime.includes('wav')) return '.wav'
  if (mime.includes('m4a') || mime.includes('mp4')) return '.m4a' // Safari 使用 audio/mp4
  if (mime.includes('ogg')) return '.ogg'
  if (mime.includes('aac')) return '.aac'
  return ''
}

/** 文件名扩展名提取 */
function extFromFilename(name: string): string {
  const e = path.extname(name).toLowerCase()
  if (['.webm', '.mp3', '.wav', '.m4a', '.mp4', '.ogg', '.aac'].includes(e)) {
    return e === '.mp4' ? '.m4a' : e // 将 .mp4 转换为 .m4a
  }
  return ''
}

// POST /voice/upload — 上传音频文件
voice.post(
  '/upload',
  rateLimit({ windowMs: 60_000, max: 20, message: '上传过于频繁，请稍后再试' }),
  authMiddleware,
  async (c) => {
    const form = await c.req.formData()
    const file = form.get('file')

    if (!(file instanceof File)) {
      return c.json({ success: false, error: '缺少文件：file' }, 400)
    }

    const mime = (file.type || '').toLowerCase()
    if (mime && !isAllowedMime(mime)) {
      return c.json(
        { success: false, error: '仅支持 WebM / MP3 / WAV / M4A / OGG / AAC / MP4 格式' },
        400
      )
    }

    if (file.size <= 0 || file.size > MAX_VOICE_FILE_BYTES) {
      return c.json(
        { success: false, error: `音频大小需在 1B～${MAX_VOICE_FILE_BYTES / 1024 / 1024}MB 之间` },
        400
      )
    }

    // 提取扩展名
    let ext = mime ? extFromMime(mime) : ''
    if (!ext) ext = extFromFilename(file.name || '')
    if (!ext) ext = '.webm' // 默认使用 WebM

    const buf = Buffer.from(await file.arrayBuffer())

    try {
      const { filename, publicUrl } = await saveVoiceFileBuffer(buf, ext)
      logger.info(`[Voice] 上传成功: ${filename}, 大小: ${file.size} bytes`)

      return c.json({
        success: true,
        data: {
          fileId: filename,
          url: publicUrl,
          size: file.size,
          mime: mime || 'audio/webm',
        },
      })
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e)
      logger.error(`[Voice] 上传失败: ${errorMsg}`)
      return c.json({ success: false, error: errorMsg }, 500)
    }
  }
)

// POST /voice/transcribe — 语音转文本
const transcribeSchema = z.object({
  fileId: z.string().min(1, '文件ID不能为空'),
  modelName: z.string().optional(), // 可选：指定 Whisper 模型
})

voice.post(
  '/transcribe',
  rateLimit({ windowMs: 60_000, max: 10, message: '识别请求过于频繁，请稍后再试' }),
  authMiddleware,
  async (c) => {
    const json = await c.req.json().catch(() => null)
    const parsed = transcribeSchema.safeParse(json)

    if (!parsed.success) {
      return c.json(
        { success: false, error: parsed.error.flatten().fieldErrors },
        400
      )
    }

    const { fileId, modelName } = parsed.data

    try {
      const filePath = getVoiceFilePath(fileId)
      logger.info(`[Voice] 开始识别: ${fileId}, 路径: ${filePath}`)

      const text = await transcribeAudio(filePath, { modelName })
      logger.info(`[Voice] 识别成功: ${fileId}, 文本长度: ${text.length}`)

      return c.json({
        success: true,
        data: {
          text,
          fileId,
        },
      })
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e)
      logger.error(`[Voice] 识别失败: ${errorMsg}`)
      return c.json({ success: false, error: errorMsg }, 500)
    }
  }
)

export default voice
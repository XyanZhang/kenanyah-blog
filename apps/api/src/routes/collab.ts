import path from 'node:path'
import { Hono } from 'hono'
import { z } from 'zod'
import { rateLimit } from '../middleware/rate-limit'
import { saveCollabImageBuffer } from '../lib/storage'
import { invokeChat } from '../lib/llm'

const collab = new Hono()

const MAX_COLLAB_IMAGE_BYTES = 10 * 1024 * 1024

const ALLOWED_IMAGE_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
])

const aiBlockSchema = z.object({
  action: z.enum(['continue', 'rewrite', 'summarize']),
  text: z.string().min(1).max(8000),
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

function getAiSystemPrompt(action: z.infer<typeof aiBlockSchema>['action']): string {
  if (action === 'rewrite') {
    return [
      '你是协作文档编辑助手。',
      '请改写用户给出的单个文档块，保持原意，提升表达清晰度。',
      '只输出可插入文档的 Markdown 内容，不要解释。',
    ].join('\n')
  }

  if (action === 'summarize') {
    return [
      '你是协作文档编辑助手。',
      '请总结用户给出的单个文档块，保留关键事实和结论。',
      '只输出一段简洁的 Markdown 内容，不要加“摘要：”前缀，不要解释。',
    ].join('\n')
  }

  return [
    '你是协作文档编辑助手。',
    '请基于用户给出的单个文档块自然续写，保持上下文语气一致。',
    '只输出续写的 Markdown 内容，不要重复原文，不要解释。',
  ].join('\n')
}

collab.post(
  '/ai',
  rateLimit({ windowMs: 60_000, max: 30, message: 'AI 请求过于频繁，请稍后再试' }),
  async (c) => {
    const body = await c.req.json().catch(() => null)
    const parsed = aiBlockSchema.safeParse(body)
    if (!parsed.success) {
      return c.json({ success: false, error: parsed.error.flatten().fieldErrors }, 400)
    }

    try {
      const text = await invokeChat(parsed.data.text, getAiSystemPrompt(parsed.data.action), {
        model: 'fast',
        temperature: 0.7,
      })
      return c.json({ success: true, data: { text } })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'AI 服务暂时不可用'
      return c.json({ success: false, error: message }, 500)
    }
  }
)

collab.post(
  '/images',
  rateLimit({ windowMs: 60_000, max: 30, message: '上传过于频繁，请稍后再试' }),
  async (c) => {
    const form = await c.req.formData()
    const file = form.get('file')
    if (!(file instanceof File)) {
      return c.json({ success: false, error: '缺少文件：file' }, 400)
    }

    const mime = (file.type || '').toLowerCase()
    if (mime && !ALLOWED_IMAGE_MIME.has(mime)) {
      return c.json({ success: false, error: '仅支持 JPEG / PNG / WebP / GIF / AVIF' }, 400)
    }

    if (file.size <= 0 || file.size > MAX_COLLAB_IMAGE_BYTES) {
      return c.json(
        {
          success: false,
          error: `图片大小需在 1B～${MAX_COLLAB_IMAGE_BYTES / 1024 / 1024}MB 之间`,
        },
        400
      )
    }

    let ext = mime ? extFromMime(mime) : ''
    if (!ext) ext = extFromFilename(file.name || '')
    if (!ext) ext = '.jpg'

    const buffer = Buffer.from(await file.arrayBuffer())
    try {
      const url = await saveCollabImageBuffer(buffer, ext)
      return c.json({ success: true, data: { url } })
    } catch (error) {
      const message = error instanceof Error ? error.message : '上传失败'
      return c.json({ success: false, error: message }, 500)
    }
  }
)

export default collab

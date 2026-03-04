import { Hono } from 'hono'
import { streamSSE } from 'hono/streaming'
import { validateBody } from '../middleware/validation'
import { rateLimit } from '../middleware/rate-limit'
import {
  aiRewriteSchema,
  aiExpandSchema,
  aiShrinkSchema,
  aiHeadingsSchema,
  aiSummarySchema,
  aiGenerateArticleSchema,
  aiGenerateCoverSchema,
  type AiRewriteInput,
  type AiExpandInput,
  type AiShrinkInput,
  type AiHeadingsInput,
  type AiSummaryInput,
  type AiGenerateArticleInput,
  type AiGenerateCoverInput,
} from '@blog/validation'
import { streamChat, invokeChat } from '../lib/llm'
import { generateImage } from '../lib/image-gen'
import { saveImageFromUrl } from '../lib/storage'

const ai = new Hono()

ai.use('*', rateLimit({ windowMs: 60_000, max: 30, message: 'AI 请求过于频繁，请稍后再试' }))

function rewriteSystemPrompt(style?: string): string {
  const styleHint = style ? `风格要求：${style}。` : ''
  return `你是一个中文写作助手。请对用户给出的段落进行改写，保持原意不变，优化表达、通顺度和可读性。${styleHint}只输出改写后的正文，不要加解释或标题。并且需要优化成 markdown 格式返回。`
}

function expandSystemPrompt(): string {
  return '你是一个中文写作助手。请对用户给出的简短段落进行扩写，丰富细节和论述，保持逻辑清晰。只输出扩写后的正文，不要加解释或标题。'
}

function shrinkSystemPrompt(maxLength?: number): string {
  const lenHint = maxLength ? `尽量将长度控制在 ${maxLength} 字以内。` : '尽量精简，保留核心信息。'
  return `你是一个中文写作助手。请对用户给出的段落进行缩写/总结。${lenHint}只输出缩写后的正文，不要加解释或标题。`
}

function headingsSystemPrompt(): string {
  return '你是一个中文写作助手。请根据用户给出的文章正文，为文章生成 3～6 个小标题（用于分段），要求简洁、概括每段主旨。只输出小标题列表，每行一个，格式为：1. 标题一\\n2. 标题二\\n...，不要其他解释。'
}

function summarySystemPrompt(): string {
  return '你是一个中文写作助手。请根据用户给出的文章正文，生成一段简短摘要（2～4 句话），概括文章要点。只输出摘要正文，不要加「摘要：」等前缀或其它解释。'
}

function coverPromptSystemPrompt(): string {
  return [
    '你是一个博客封面图提示词专家。根据用户提供的文章标题和正文摘要，生成一段用于 AI 文生图的英文提示词（prompt）。',
    '要求：',
    '1. 提炼文章核心主题，生成一张适合作为博客封面的图片描述。',
    '2. 风格：现代、简洁、偏科技/设计感，适合技术博客或知识分享类文章。',
    '3. 不要包含具体文字、Logo 或复杂排版，重点是视觉氛围和主题意象。',
    '4. 输出纯英文，80-150 词，只输出提示词本身，不要解释或前缀。',
  ].join('\n')
}

function generateArticleSystemPrompt(): string {
  return [
    '你是一名资深中文技术博客作者，请根据用户给出的「关键词」生成一篇完整的 Markdown 文章。',
    '要求：',
    '1. 文章必须是结构清晰的 Markdown：至少包含一级标题、若干小节（二级/三级标题）、段落、必要时可用列表。',
    '2. 语言自然流畅，风格偏实用分享，而不是生硬的说明文。',
    '3. 不要输出多份版本或重复内容，不要在文末再重复整篇文章。',
    '4. 只输出 Markdown 正文，不要任何解释性文字。',
  ].join('\n')
}

// POST /ai/rewrite — 改写（支持流式与非流式）
ai.post('/rewrite', validateBody(aiRewriteSchema), async (c) => {
  const body = (c.get as (k: string) => AiRewriteInput)('validatedBody')
  const stream = c.req.query('stream') === 'true'
  if (!stream) {
    try {
      const text = await invokeChat(
        body.text,
        rewriteSystemPrompt(body.style)
      )
      return c.json({ success: true, data: { text } })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'AI 服务暂时不可用'
      return c.json({ success: false, error: message }, 500)
    }
  }

  return streamSSE(c, async (stream) => {
    try {
      await stream.writeSSE({ data: JSON.stringify({ type: 'start' }) })
      for await (const chunk of streamChat(body.text, rewriteSystemPrompt(body.style))) {
        await stream.writeSSE({ data: JSON.stringify({ content: chunk }) })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'AI 服务暂时不可用'
      await stream.writeSSE({ data: JSON.stringify({ error: message }) })
    } finally {
      stream.close()
    }
  })
})

// POST /ai/expand — 扩写
ai.post('/expand', validateBody(aiExpandSchema), async (c) => {
  const body = (c.get as (k: string) => AiExpandInput)('validatedBody')
  const stream = c.req.query('stream') === 'true'

  if (!stream) {
    try {
      const text = await invokeChat(body.text, expandSystemPrompt())
      return c.json({ success: true, data: { text } })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'AI 服务暂时不可用'
      return c.json({ success: false, error: message }, 500)
    }
  }

  return streamSSE(c, async (stream) => {
    try {
      await stream.writeSSE({ data: JSON.stringify({ type: 'start' }) })
      for await (const chunk of streamChat(body.text, expandSystemPrompt())) {
        await stream.writeSSE({ data: JSON.stringify({ content: chunk }) })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'AI 服务暂时不可用'
      await stream.writeSSE({ data: JSON.stringify({ error: message }) })
    } finally {
      stream.close()
    }
  })
})

// POST /ai/shrink — 缩写
ai.post('/shrink', validateBody(aiShrinkSchema), async (c) => {
  const body = (c.get as (k: string) => AiShrinkInput)('validatedBody')
  const stream = c.req.query('stream') === 'true'

  if (!stream) {
    try {
      const text = await invokeChat(
        body.maxLength ? `${body.text}\n\n请控制在 ${body.maxLength} 字以内。` : body.text,
        shrinkSystemPrompt(body.maxLength)
      )
      return c.json({ success: true, data: { text } })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'AI 服务暂时不可用'
      return c.json({ success: false, error: message }, 500)
    }
  }

  return streamSSE(c, async (stream) => {
    try {
      await stream.writeSSE({ data: JSON.stringify({ type: 'start' }) })
      const userPrompt = body.maxLength
        ? `${body.text}\n\n请控制在 ${body.maxLength} 字以内。`
        : body.text
      for await (const chunk of streamChat(userPrompt, shrinkSystemPrompt(body.maxLength))) {
        await stream.writeSSE({ data: JSON.stringify({ content: chunk }) })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'AI 服务暂时不可用'
      await stream.writeSSE({ data: JSON.stringify({ error: message }) })
    } finally {
      stream.close()
    }
  })
})

// POST /ai/headings — 生成小标题
ai.post('/headings', validateBody(aiHeadingsSchema), async (c) => {
  const body = (c.get as (k: string) => AiHeadingsInput)('validatedBody')
  const stream = c.req.query('stream') === 'true'

  if (!stream) {
    try {
      const text = await invokeChat(body.content, headingsSystemPrompt())
      return c.json({ success: true, data: { text } })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'AI 服务暂时不可用'
      return c.json({ success: false, error: message }, 500)
    }
  }

  return streamSSE(c, async (stream) => {
    try {
      await stream.writeSSE({ data: JSON.stringify({ type: 'start' }) })
      for await (const chunk of streamChat(body.content, headingsSystemPrompt())) {
        await stream.writeSSE({ data: JSON.stringify({ content: chunk }) })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'AI 服务暂时不可用'
      await stream.writeSSE({ data: JSON.stringify({ error: message }) })
    } finally {
      stream.close()
    }
  })
})

// POST /ai/summary — 生成摘要
ai.post('/summary', validateBody(aiSummarySchema), async (c) => {
  const body = (c.get as (k: string) => AiSummaryInput)('validatedBody')
  const stream = c.req.query('stream') === 'true'

  if (!stream) {
    try {
      const text = await invokeChat(body.content, summarySystemPrompt())
      return c.json({ success: true, data: { text } })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'AI 服务暂时不可用'
      return c.json({ success: false, error: message }, 500)
    }
  }

  return streamSSE(c, async (stream) => {
    try {
      await stream.writeSSE({ data: JSON.stringify({ type: 'start' }) })
      for await (const chunk of streamChat(body.content, summarySystemPrompt())) {
        await stream.writeSSE({ data: JSON.stringify({ content: chunk }) })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'AI 服务暂时不可用'
      await stream.writeSSE({ data: JSON.stringify({ error: message }) })
    } finally {
      stream.close()
    }
  })
})

// POST /ai/generate-article — 根据关键词生成整篇 Markdown 文章
ai.post('/generate-article', validateBody(aiGenerateArticleSchema), async (c) => {
  const body = (c.get as (k: string) => AiGenerateArticleInput)('validatedBody')
  const stream = c.req.query('stream') === 'true'

  const userPrompt = `请围绕以下关键词生成一篇完整的文章，要求：1. 文章必须是结构清晰的 Markdown：至少包含一级标题、若干小节（二级/三级标题）、段落、必要时可用列表。2. 语言自然流畅，风格偏实用分享，而不是生硬的说明文。3. 不要输出多份版本或重复内容，不要在文末再重复整篇文章。4. 只输出 Markdown 正文，不要任何解释性文字。关键词：${body.keywords}`

  if (!stream) {
    try {
      const text = await invokeChat(userPrompt, generateArticleSystemPrompt())
      return c.json({ success: true, data: { text } })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'AI 服务暂时不可用'
      return c.json({ success: false, error: message }, 500)
    }
  }

  return streamSSE(c, async (stream) => {
    try {
      console.log('[AI][generate-article][stream] start', {
        keywords: body.keywords.slice(0, 60),
      })
      await stream.writeSSE({ data: JSON.stringify({ type: 'start' }) })
      for await (const chunk of streamChat(userPrompt, generateArticleSystemPrompt())) {
        await stream.writeSSE({ data: JSON.stringify({ content: chunk }) })
      }
    } catch (err) {
      console.error('[AI][generate-article][stream] error', err)
      const message = err instanceof Error ? err.message : 'AI 服务暂时不可用'
      await stream.writeSSE({ data: JSON.stringify({ error: message }) })
    } finally {
      stream.close()
    }
  })
})

// POST /ai/generate-cover — 根据文章内容生成封面图（qwen-image-2.0-pro）
ai.post('/generate-cover', validateBody(aiGenerateCoverSchema), async (c) => {
  const body = (c.get as (k: string) => AiGenerateCoverInput)('validatedBody')
  try {
    const excerpt = body.content.slice(0, 2000).replace(/#+|\*\*|`/g, ' ').trim()
    const userPrompt = `文章标题：${body.title}\n\n正文摘要：\n${excerpt}`
    const imagePrompt = await invokeChat(userPrompt, coverPromptSystemPrompt())
    const trimmed = imagePrompt.trim().slice(0, 800)
    if (!trimmed) {
      return c.json(
        { success: false, error: '未能从文章内容提炼出合适的封面图提示词' },
        400
      )
    }
    const { imageUrl } = await generateImage({ prompt: trimmed })
    const savedUrl = await saveImageFromUrl(imageUrl, 'covers')
    return c.json({ success: true, data: { imageUrl: savedUrl } })
  } catch (err) {
    const message = err instanceof Error ? err.message : '封面图生成失败'
    console.error('[AI][generate-cover] error', err)
    return c.json({ success: false, error: message }, 500)
  }
})

export default ai

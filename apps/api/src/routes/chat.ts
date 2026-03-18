import { Hono } from 'hono'
import { streamSSE } from 'hono/streaming'
import { prisma } from '../lib/db'
import { authMiddleware } from '../middleware/auth'
import { rateLimit } from '../middleware/rate-limit'
import { streamChat } from '../lib/llm'
import { indexConversation, searchSemanticAll } from '../lib/semantic-search'

type ChatVariables = {
  user: { userId: string; role: string }
}

const chat = new Hono<{ Variables: ChatVariables }>()

const MAX_MESSAGE_LEN = 4000

chat.use('*', authMiddleware)
chat.use('*', rateLimit({ windowMs: 60_000, max: 60, message: '聊天请求过于频繁，请稍后再试' }))

// 获取会话列表（按最近消息时间倒序）
chat.get('/conversations', async (c) => {
  const user = c.get('user')

  const conversations = await prisma.chatConversation.findMany({
    where: {
      OR: [{ userId: user.userId }, { userId: null }],
    },
    orderBy: { lastMessageAt: 'desc' },
    take: 50,
  })

  return c.json({
    success: true,
    data: conversations,
  })
})

// 创建新会话
chat.post('/conversations', async (c) => {
  const user = c.get('user')
  const body = await c.req.json().catch(() => ({} as any))
  const initialMessage = typeof body.initialMessage === 'string' ? body.initialMessage.trim() : ''

  if (initialMessage && initialMessage.length > MAX_MESSAGE_LEN) {
    return c.json(
      { success: false, error: `消息过长，请控制在 ${MAX_MESSAGE_LEN} 字以内` },
      400
    )
  }

  const conversation = await prisma.chatConversation.create({
    data: {
      title: initialMessage ? initialMessage.slice(0, 50) : null,
      userId: user.userId,
    },
  })

  if (initialMessage) {
    await prisma.chatMessage.create({
      data: {
        conversationId: conversation.id,
        role: 'user',
        content: initialMessage,
      },
    })
    await prisma.chatConversation.update({
      where: { id: conversation.id },
      data: {
        messageCount: { increment: 1 },
        lastMessageAt: new Date(),
      },
    })
  }

  return c.json({
    success: true,
    data: conversation,
  })
})

const TITLE_MAX_LEN = 100

// 更新会话标题
chat.patch('/conversations/:id', async (c) => {
  const user = c.get('user')
  const { id } = c.req.param()
  const body = await c.req.json().catch(() => ({} as any))
  const title = typeof body.title === 'string' ? body.title.trim().slice(0, TITLE_MAX_LEN) : ''

  const conversation = await prisma.chatConversation.findFirst({
    where: {
      id,
      OR: [{ userId: user.userId }, { userId: null }],
    },
  })

  if (!conversation) {
    return c.json({ success: false, error: '会话不存在' }, 404)
  }

  const updated = await prisma.chatConversation.update({
    where: { id },
    data: { title: title || null },
  })

  return c.json({
    success: true,
    data: updated,
  })
})

// 获取单个会话及消息
chat.get('/conversations/:id', async (c) => {
  const user = c.get('user')
  const { id } = c.req.param()

  const conversation = await prisma.chatConversation.findFirst({
    where: {
      id,
      OR: [{ userId: user.userId }, { userId: null }],
    },
  })

  if (!conversation) {
    return c.json({ success: false, error: '会话不存在' }, 404)
  }

  const messages = await prisma.chatMessage.findMany({
    where: { conversationId: id },
    orderBy: { createdAt: 'asc' },
  })

  return c.json({
    success: true,
    data: {
      conversation,
      messages,
    },
  })
})

// 向会话发送消息并流式返回 AI 回复
chat.post('/conversations/:id/messages/stream', async (c) => {
  const user = c.get('user')
  const { id } = c.req.param()
  const body = await c.req.json().catch(() => ({} as any))
  const content = typeof body.content === 'string' ? body.content.trim() : ''
  const useKnowledgeBase = body.useKnowledgeBase === true

  if (!content) {
    return c.json({ success: false, error: '消息内容不能为空' }, 400)
  }

  if (content.length > MAX_MESSAGE_LEN) {
    return c.json(
      { success: false, error: `消息过长，请控制在 ${MAX_MESSAGE_LEN} 字以内` },
      400
    )
  }

  const conversation = await prisma.chatConversation.findFirst({
    where: {
      id,
      OR: [{ userId: user.userId }, { userId: null }],
    },
  })

  if (!conversation) {
    return c.json({ success: false, error: '会话不存在' }, 404)
  }

  // 先写入用户消息
  await prisma.chatMessage.create({
    data: {
      conversationId: id,
      role: 'user',
      content,
    },
  })

  const history = await prisma.chatMessage.findMany({
    where: { conversationId: id },
    orderBy: { createdAt: 'asc' },
  })

  const MAX_MESSAGES = 20
  const recent = history.slice(-MAX_MESSAGES)
  const historyText = recent
    .map((m) => (m.role === 'user' ? `用户：${m.content}` : `助手：${m.content}`))
    .join('\n')

  let kbContext = ''
  if (useKnowledgeBase) {
    try {
      const hits = await searchSemanticAll(content, 8)
      if (hits.length > 0) {
        const lines = hits.map((h: any, idx: number) => {
          const source =
            h.type === 'post'
              ? `post:${h.slug ?? h.postId ?? ''}`
              : h.type === 'conversation'
                ? `conversation:${h.conversationId ?? ''}`
                : `pdf:${(h as any).documentId ?? ''}#${(h as any).chunkIndex ?? ''}`
          return `【${idx + 1}】【${source}】【score=${h.score.toFixed(3)}】${h.title}\n${h.snippet}`
        })
        kbContext = [
          '以下是本地知识库检索结果（可能包含博客文章、历史对话、PDF 知识库），请优先基于这些内容回答。',
          '若检索内容不足以回答，请明确说明并再进行推理/补充建议；不要编造不存在于检索结果中的“原文”。',
          '',
          lines.join('\n\n'),
        ].join('\n')
      }
    } catch {
      // 忽略检索失败，继续走普通对话
    }
  }

  const userPrompt = kbContext
    ? `${kbContext}\n\n---\n\n对话历史：\n${historyText}\n\n用户最新问题：${content}`
    : `${historyText}\n\n用户最新问题：${content}`

  let fullAssistant = ''

  return streamSSE(c, async (stream) => {
    try {
      await stream.writeSSE({ data: JSON.stringify({ type: 'start' }) })
      for await (const chunk of streamChat(userPrompt)) {
        fullAssistant += chunk
        await stream.writeSSE({ data: JSON.stringify({ content: chunk }) })
      }
      await prisma.chatMessage.create({
        data: {
          conversationId: id,
          role: 'assistant',
          content: fullAssistant,
        },
      })
      await prisma.chatConversation.update({
        where: { id },
        data: {
          messageCount: { increment: 2 },
          lastMessageAt: new Date(),
          title: conversation.title ?? content.slice(0, 50),
        },
      })
      indexConversation(id).catch((err) =>
        console.error('[semantic-search] index conversation failed:', err)
      )
      await stream.writeSSE({ data: '[DONE]' })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'AI 服务暂时不可用'
      await stream.writeSSE({ data: JSON.stringify({ error: message }) })
    } finally {
      stream.close()
    }
  })
})

export default chat


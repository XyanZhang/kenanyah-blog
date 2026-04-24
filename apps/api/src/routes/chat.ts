import { Hono } from 'hono'
import { streamSSE } from 'hono/streaming'
import { env } from '../env'
import { prisma } from '../lib/db'
import { optionalAuthMiddleware } from '../middleware/auth'
import { rateLimit } from '../middleware/rate-limit'
import { isAbortError } from '../lib/abort'
import { indexConversation } from '../lib/semantic-search'
import { runChatMultiAgentOrchestrator } from '../orchestrators/chat-multi-agent-orchestrator'
import { logger } from '../lib/logger'
import { parseIntentContext } from '../agents/chat-intent-state'
import { deriveIntentContextFromMessages } from '../tools/session-tools'

type ChatVariables = {
  user: { userId: string; role: string }
}

const chat = new Hono<{ Variables: ChatVariables }>()

const MAX_MESSAGE_LEN = 4000

chat.use('*', optionalAuthMiddleware)
chat.use('*', rateLimit({ windowMs: 60_000, max: 60, message: '聊天请求过于频繁，请稍后再试' }))

function getAuthenticatedUser(c: { get: (key: 'user') => ChatVariables['user'] | undefined }) {
  const user = c.get('user') as ChatVariables['user'] | undefined
  if (!user) {
    return null
  }
  return user
}

async function getConversationById(id: string) {
  return prisma.chatConversation.findUnique({
    where: { id },
  })
}

function canReadConversation(
  conversation: { userId: string | null; isShared?: boolean | null } | null,
  viewerId?: string
) {
  if (!conversation) {
    return false
  }

  return conversation.userId === viewerId || conversation.isShared === true
}

function canWriteConversation(
  conversation: { userId: string | null } | null,
  viewerId?: string
) {
  if (!conversation || !viewerId) {
    return false
  }

  return conversation.userId === viewerId
}

// 获取会话列表（按最近消息时间倒序）
chat.get('/conversations', async (c) => {
  const user = getAuthenticatedUser(c)

  if (!user) {
    return c.json({ success: false, error: '请先登录后查看会话列表' }, 401)
  }

  const conversations = await prisma.chatConversation.findMany({
    where: {
      userId: user.userId,
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
  const user = getAuthenticatedUser(c)
  if (!user) {
    return c.json({ success: false, error: '请先登录后创建会话' }, 401)
  }
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
  const user = getAuthenticatedUser(c)
  if (!user) {
    return c.json({ success: false, error: '请先登录后更新会话' }, 401)
  }
  const { id } = c.req.param()
  const body = await c.req.json().catch(() => ({} as any))
  const title =
    typeof body.title === 'string' ? body.title.trim().slice(0, TITLE_MAX_LEN) : undefined
  const isShared = typeof body.isShared === 'boolean' ? body.isShared : undefined

  const conversation = await getConversationById(id)

  if (!conversation) {
    return c.json({ success: false, error: '会话不存在' }, 404)
  }

  if (!canWriteConversation(conversation, user.userId)) {
    return c.json({ success: false, error: '你无权修改这个会话' }, 403)
  }

  if (typeof title === 'undefined' && typeof isShared === 'undefined') {
    return c.json({ success: false, error: '没有可更新的内容' }, 400)
  }

  const updated = await prisma.chatConversation.update({
    where: { id },
    data: {
      ...(typeof title !== 'undefined' ? { title: title || null } : {}),
      ...(typeof isShared !== 'undefined' ? { isShared } : {}),
    },
  })

  return c.json({
    success: true,
    data: updated,
  })
})

// 删除会话及其消息
chat.delete('/conversations/:id', async (c) => {
  const user = getAuthenticatedUser(c)
  if (!user) {
    return c.json({ success: false, error: '请先登录后删除会话' }, 401)
  }
  const { id } = c.req.param()

  const conversation = await getConversationById(id)

  if (!conversation) {
    return c.json({ success: false, error: '会话不存在' }, 404)
  }

  if (!canWriteConversation(conversation, user.userId)) {
    return c.json({ success: false, error: '你无权删除这个会话' }, 403)
  }

  await prisma.$transaction([
    prisma.chatMessage.deleteMany({
      where: { conversationId: id },
    }),
    prisma.chatConversation.delete({
      where: { id },
    }),
  ])

  return c.json({ success: true })
})

// 获取单个会话及消息
chat.get('/conversations/:id', async (c) => {
  const user = getAuthenticatedUser(c)
  const { id } = c.req.param()

  const conversation = await getConversationById(id)

  if (!conversation) {
    return c.json({ success: false, error: '会话不存在' }, 404)
  }

  if (!canReadConversation(conversation, user?.userId)) {
    return c.json({ success: false, error: '该会话未分享或你无权查看' }, 403)
  }

  const messages = await prisma.chatMessage.findMany({
    where: {
      conversationId: id,
      role: {
        not: 'system',
      },
    },
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
  const user = getAuthenticatedUser(c)
  if (!user) {
    return c.json({ success: false, error: '请先登录后发送消息' }, 401)
  }
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

  const conversation = await getConversationById(id)

  if (!conversation) {
    return c.json({ success: false, error: '会话不存在' }, 404)
  }

  if (!canWriteConversation(conversation, user.userId)) {
    return c.json({ success: false, error: '你无权在这个会话中继续对话' }, 403)
  }

  // 先写入用户消息
  await prisma.chatMessage.create({
    data: {
      conversationId: id,
      role: 'user',
      content,
    },
  })
  await prisma.chatConversation.update({
    where: { id },
    data: {
      messageCount: { increment: 1 },
      lastMessageAt: new Date(),
      title: conversation.title ?? content.slice(0, 50),
    },
  })

  const history = await prisma.chatMessage.findMany({
    where: { conversationId: id },
    orderBy: { createdAt: 'desc' },
    take: 24,
    select: {
      role: true,
      content: true,
    },
  })
  const recentHistory = history.reverse()
  const historyForOrchestrator =
    recentHistory.length > 0 &&
    recentHistory[recentHistory.length - 1]?.role === 'user' &&
    recentHistory[recentHistory.length - 1]?.content === content
      ? recentHistory.slice(0, -1)
      : recentHistory

  let fullAssistant = ''
  const pendingSystemMessages: string[] = []
  let latestIntentStateJson = conversation.intentStateJson ?? null
  const requestSignal = c.req.raw.signal

  return streamSSE(c, async (stream) => {
    try {
      await stream.writeSSE({ data: JSON.stringify({ type: 'start' }) })

      const intentContext = deriveIntentContextFromMessages(
        historyForOrchestrator.map((message) => ({
          role: message.role,
          content: message.content,
        })),
        parseIntentContext(conversation.intentStateJson)
      )

      for await (const event of runChatMultiAgentOrchestrator({
        conversationId: id,
        userId: user.userId,
        userRole: user.role,
        siteBaseUrl: env.CORS_ORIGIN.split(',')[0]?.trim() || 'http://localhost:3000',
        messages: historyForOrchestrator.map((message) => ({
          role: message.role,
          content: message.content,
        })),
        intentContext,
        latestUserMessage: content,
        useKnowledgeBase,
        signal: requestSignal,
      })) {
        if (event.type === 'state') {
          pendingSystemMessages.push(event.content)
          continue
        }
        if (event.type === 'intent_state') {
          latestIntentStateJson = event.content
          continue
        }
        if (event.type === 'content') {
          fullAssistant += event.content
        }
        await stream.writeSSE({ data: JSON.stringify(event) })
      }

      if (latestIntentStateJson !== conversation.intentStateJson) {
        await prisma.chatConversation.update({
          where: { id },
          data: {
            intentStateJson: latestIntentStateJson,
          },
        })
      }

      if (fullAssistant.trim()) {
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
            messageCount: { increment: 1 },
            lastMessageAt: new Date(),
            intentStateJson: latestIntentStateJson,
          },
        })
        if (pendingSystemMessages.length > 0) {
          await prisma.chatMessage.createMany({
            data: pendingSystemMessages.map((content) => ({
              conversationId: id,
              role: 'system',
              content,
            })),
          })
        }
        indexConversation(id).catch((err) =>
          logger.warn({ err, conversationId: id }, 'chat.semantic_search.index_conversation_failed')
        )
      }

      await stream.writeSSE({ data: '[DONE]' })
    } catch (err) {
      if (isAbortError(err) || requestSignal.aborted) {
        return
      }

      const message = err instanceof Error ? err.message : 'AI 服务暂时不可用'
      logger.error(
        {
          err,
          conversationId: id,
          userId: user.userId,
        },
        'chat.stream.failed'
      )
      await stream.writeSSE({ data: JSON.stringify({ error: message }) })
    } finally {
      try {
        stream.close()
      } catch {
        // ignore double close after disconnect
      }
    }
  })
})

export default chat

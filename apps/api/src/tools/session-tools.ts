import { prisma } from '../lib/db'
import {
  DEFAULT_INTENT_CONTEXT,
  normalizeIntentContext,
  summarizeIntentContext,
  type IntentContext,
} from '../agents/chat-intent-state'
import { OPERATION_CARD_PREFIX } from '../lib/operation-card'

export type ConversationMessage = {
  role: string
  content: string
}

const POST_NAVIGATION_STATE_PREFIX = 'POST_NAVIGATION_STATE:'

export async function loadConversationWithMessages(conversationId: string, userId: string) {
  const conversation = await prisma.chatConversation.findFirst({
    where: {
      id: conversationId,
      userId,
    },
  })

  if (!conversation) {
    return null
  }

  const messages = await prisma.chatMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'asc' },
  })

  return { conversation, messages }
}

export async function appendConversationMessage(
  conversationId: string,
  role: 'user' | 'assistant' | 'system',
  content: string
) {
  await prisma.$transaction(async (tx) => {
    await tx.chatMessage.create({
      data: {
        conversationId,
        role,
        content,
      },
    })

    await tx.chatConversation.update({
      where: { id: conversationId },
      data: {
        messageCount: { increment: 1 },
        lastMessageAt: new Date(),
      },
    })
  })
}

export function formatConversationForPrompt(messages: ConversationMessage[], maxMessages = 20): string {
  const recent = messages.slice(-maxMessages)
  return recent.map((m) => {
    if (m.role === 'user') return `用户：${m.content}`
    if (m.role === 'system') return `系统：${m.content}`
    return `助手：${m.content}`
  }).join('\n')
}

function compactText(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function normalizeNaturalAssistantMessage(content: string): string {
  if (!content.includes(OPERATION_CARD_PREFIX)) {
    return compactText(content)
  }

  const [head] = content.split(OPERATION_CARD_PREFIX)
  return compactText(head)
}

function parseOperationCardScope(content: string): IntentContext['lastOperationCardScope'] {
  if (!content.includes(OPERATION_CARD_PREFIX)) {
    return null
  }

  const jsonText = content.slice(content.indexOf(OPERATION_CARD_PREFIX) + OPERATION_CARD_PREFIX.length).trim()
  try {
    const parsed = JSON.parse(jsonText) as { scope?: IntentContext['lastOperationCardScope']; kind?: string }
    return parsed.scope ?? null
  } catch {
    return null
  }
}

function parseLastShownPostId(content: string): string | null {
  if (!content.startsWith(POST_NAVIGATION_STATE_PREFIX)) {
    return null
  }

  try {
    const parsed = JSON.parse(content.slice(POST_NAVIGATION_STATE_PREFIX.length)) as { lastShownPostId?: string }
    return typeof parsed.lastShownPostId === 'string' && parsed.lastShownPostId.trim()
      ? parsed.lastShownPostId.trim()
      : null
  } catch {
    return null
  }
}

export function deriveIntentContextFromMessages(
  messages: ConversationMessage[],
  baseContext?: IntentContext
): IntentContext {
  let context = normalizeIntentContext(baseContext ?? DEFAULT_INTENT_CONTEXT)

  for (const message of messages.slice(-16)) {
    if (message.role === 'assistant') {
      const scope = parseOperationCardScope(message.content)
      if (scope) {
        context = normalizeIntentContext({
          ...context,
          lastOperationCardScope: scope,
          pendingAction:
            scope === 'workflow'
              ? 'blog_workflow_followup'
              : scope === 'delete_post'
                ? 'confirm_delete_post'
                : scope === 'calendar_schedule'
                  ? 'confirm_calendar_plan'
                  : scope === 'tool'
                    ? 'tool_followup'
                    : context.pendingAction,
        })
      }
    }

    if (message.role === 'system') {
      const lastShownPostId = parseLastShownPostId(message.content)
      if (lastShownPostId) {
        context = normalizeIntentContext({
          ...context,
          lastShownPostId,
          pendingEntityType: 'post',
          pendingEntityId: lastShownPostId,
        })
      }
    }
  }

  return context
}

export function buildIntentConversationDigest(
  messages: ConversationMessage[],
  context: IntentContext,
  maxMessages = 5
): string {
  const naturalMessages = messages
    .filter((message) => message.role !== 'system')
    .map((message) => ({
      role: message.role,
      content:
        message.role === 'assistant'
          ? normalizeNaturalAssistantMessage(message.content)
          : compactText(message.content),
    }))
    .filter((message) => Boolean(message.content))
    .slice(-maxMessages)

  const historyText = naturalMessages
    .map((message) => `${message.role === 'user' ? '用户' : '助手'}：${message.content.slice(0, 280)}`)
    .join('\n')

  const lastAssistantNatural = [...naturalMessages].reverse().find((message) => message.role === 'assistant')

  return [
    `状态摘要：${summarizeIntentContext(context)}`,
    lastAssistantNatural?.content ? `最近助手自然回复：${lastAssistantNatural.content.slice(0, 240)}` : '',
    '最近自然对话：',
    historyText || '无',
  ]
    .filter(Boolean)
    .join('\n')
}

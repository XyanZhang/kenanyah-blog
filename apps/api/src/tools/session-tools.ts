import { prisma } from '../lib/db'

export type ConversationMessage = {
  role: string
  content: string
}

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

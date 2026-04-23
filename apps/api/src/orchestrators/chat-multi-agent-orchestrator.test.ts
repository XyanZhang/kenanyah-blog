import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_INTENT_CONTEXT } from '../agents/chat-intent-state'

process.env.NODE_ENV = 'test'
process.env.DATABASE_URL = process.env.DATABASE_URL || 'https://example.com/db'
process.env.JWT_SECRET = process.env.JWT_SECRET || '12345678901234567890123456789012'
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || '12345678901234567890123456789012'

const { invokeChatMock, streamChatMock, executeChatToolCallsMock, executeBusinessToolMock } = vi.hoisted(() => ({
  invokeChatMock: vi.fn(),
  streamChatMock: vi.fn(),
  executeChatToolCallsMock: vi.fn(),
  executeBusinessToolMock: vi.fn(),
}))

vi.mock('../lib/llm', () => {
  return {
    invokeChat: invokeChatMock,
    streamChat: streamChatMock,
  }
})

vi.mock('../tools/chat-agent-tools', () => ({
  executeChatToolCalls: executeChatToolCallsMock,
}))

vi.mock('../tools/business-agent-tools', () => ({
  executeBusinessTool: executeBusinessToolMock,
  buildPostNavigationStateMessage: (postId: string) => `POST_NAVIGATION_STATE:{"lastShownPostId":"${postId}","ordering":"updatedAt_desc"}`,
}))

async function collectEvents<T>(generator: AsyncGenerator<T, void, undefined>): Promise<T[]> {
  const items: T[] = []
  for await (const item of generator) {
    items.push(item)
  }
  return items
}

function makeStream(chunks: string[]) {
  return (async function* () {
    for (const chunk of chunks) {
      yield chunk
    }
  })()
}

describe('chat multi-agent orchestrator', () => {
  beforeEach(() => {
    invokeChatMock.mockReset()
    streamChatMock.mockReset()
    executeChatToolCallsMock.mockReset()
    executeBusinessToolMock.mockReset()
  })

  it('uses reviewed intent to choose respond route', async () => {
    invokeChatMock.mockResolvedValueOnce(
      JSON.stringify({
        intent: 'general_chat',
        summary: '一般对话',
        confidence: 0.82,
        needsFollowup: false,
        followupQuestions: [],
        needPlanning: false,
        shouldUseKnowledgeBase: false,
        publishDirectly: false,
        reason: '这是普通聊天',
      })
    )
    streamChatMock.mockReturnValue(makeStream(['你好，我来帮你。']))

    const { runChatMultiAgentOrchestrator } = await import('./chat-multi-agent-orchestrator')
    const events = await collectEvents(
      runChatMultiAgentOrchestrator({
        conversationId: 'conv-1',
        userId: 'user-1',
        userRole: 'USER',
        siteBaseUrl: 'http://localhost:3000',
        messages: [],
        intentContext: DEFAULT_INTENT_CONTEXT,
        latestUserMessage: '你好',
        useKnowledgeBase: false,
      })
    )

    expect(events.some((event) => event.type === 'content')).toBe(true)
    expect(streamChatMock).toHaveBeenCalledTimes(1)
    expect(executeBusinessToolMock).not.toHaveBeenCalled()
  })

  it('blocks risky tool route when confirmation is required', async () => {
    invokeChatMock.mockResolvedValueOnce(
      JSON.stringify({
        intent: 'delete_post',
        summary: '删除文章',
        confidence: 0.79,
        needsFollowup: false,
        followupQuestions: [],
        needPlanning: false,
        shouldUseKnowledgeBase: false,
        publishDirectly: false,
        reason: '用户似乎想删文章',
      })
    )

    const { runChatMultiAgentOrchestrator } = await import('./chat-multi-agent-orchestrator')
    const events = await collectEvents(
      runChatMultiAgentOrchestrator({
        conversationId: 'conv-2',
        userId: 'user-1',
        userRole: 'USER',
        siteBaseUrl: 'http://localhost:3000',
        messages: [],
        intentContext: DEFAULT_INTENT_CONTEXT,
        latestUserMessage: '帮我删一下',
        useKnowledgeBase: false,
      })
    )

    expect(events.some((event) => event.type === 'followup')).toBe(true)
    expect(executeBusinessToolMock).not.toHaveBeenCalled()
    expect(streamChatMock).not.toHaveBeenCalled()
  })

  it('runs knowledge retrieval only when reviewed intent allows it', async () => {
    invokeChatMock.mockResolvedValueOnce(
      JSON.stringify({
        intent: 'knowledge_qa',
        summary: '基于本地知识回答',
        confidence: 0.9,
        needsFollowup: false,
        followupQuestions: [],
        needPlanning: true,
        shouldUseKnowledgeBase: true,
        publishDirectly: false,
        reason: '用户明确要求结合本地资料回答',
      })
    )
    invokeChatMock.mockResolvedValueOnce(
      JSON.stringify({
        goal: '回答问题',
        subtasks: ['检索本地资料', '整理答案'],
        answerStrategy: '先检索再回答',
        responseStyle: '简洁',
        constraints: [],
        needsFollowup: false,
        followupQuestions: [],
        toolHint: '本地资料',
      })
    )
    executeChatToolCallsMock.mockResolvedValue([
      {
        tool: 'knowledge_base_search',
        query: '本地资料',
        limit: 6,
        reason: '补充本地知识',
        hitCount: 1,
        hits: [
          {
            source: '博客文章:test',
            title: 'Test',
            snippet: 'hello',
            score: 0.9,
          },
        ],
      },
    ])
    streamChatMock.mockReturnValue(makeStream(['结合资料后的回答']))

    const { runChatMultiAgentOrchestrator } = await import('./chat-multi-agent-orchestrator')
    await collectEvents(
      runChatMultiAgentOrchestrator({
        conversationId: 'conv-3',
        userId: 'user-1',
        userRole: 'USER',
        siteBaseUrl: 'http://localhost:3000',
        messages: [],
        intentContext: DEFAULT_INTENT_CONTEXT,
        latestUserMessage: '请结合本地知识库回答这个问题',
        useKnowledgeBase: true,
      })
    )

    expect(executeChatToolCallsMock).toHaveBeenCalledTimes(1)
    expect(streamChatMock).toHaveBeenCalledTimes(1)
  })
})

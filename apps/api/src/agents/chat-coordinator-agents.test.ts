import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_INTENT_CONTEXT } from './chat-intent-state'

process.env.NODE_ENV = 'test'
process.env.DATABASE_URL = process.env.DATABASE_URL || 'https://example.com/db'
process.env.JWT_SECRET = process.env.JWT_SECRET || '12345678901234567890123456789012'
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || '12345678901234567890123456789012'

const { invokeChatMock } = vi.hoisted(() => ({
  invokeChatMock: vi.fn(),
}))

vi.mock('../lib/llm', () => {
  return {
    invokeChat: invokeChatMock,
  }
})

describe('chat intent recognition', () => {
  beforeEach(() => {
    invokeChatMock.mockReset()
  })

  it('builds rule candidates for travel planning', async () => {
    const module = await import('./chat-coordinator-agents')
    const signals = module.extractIntentSignals({
      latestUserMessage: '帮我规划一下五一去日本玩的 7 天行程，想轻松一点',
      context: DEFAULT_INTENT_CONTEXT,
    })

    const result = module.buildIntentCandidates({
      signals,
      context: DEFAULT_INTENT_CONTEXT,
      useKnowledgeBase: false,
    })

    expect(result.candidates[0]?.intent).toBe('create_calendar_event')
    expect(result.hardGuards.dangerousOperation).toBe(true)
  })

  it('builds rule candidates for pending delete confirmation', async () => {
    const module = await import('./chat-coordinator-agents')
    const signals = module.extractIntentSignals({
      latestUserMessage: '确认删除 cm123456789',
      context: {
        ...DEFAULT_INTENT_CONTEXT,
        activeDomain: 'content_management',
        pendingAction: 'confirm_delete_post',
        pendingEntityType: 'post',
        pendingEntityId: 'cm123456789',
      },
    })

    const result = module.buildIntentCandidates({
      signals,
      context: {
        ...DEFAULT_INTENT_CONTEXT,
        activeDomain: 'content_management',
        pendingAction: 'confirm_delete_post',
      },
      useKnowledgeBase: false,
    })

    expect(result.candidates[0]?.intent).toBe('delete_post')
    expect(result.candidates[0]?.source).toBe('state')
  })

  it('builds rule candidates for generic list requests', async () => {
    const module = await import('./chat-coordinator-agents')

    const draftSignals = module.extractIntentSignals({
      latestUserMessage: '帮我看看我的草稿',
      context: DEFAULT_INTENT_CONTEXT,
    })
    const bookmarkSignals = module.extractIntentSignals({
      latestUserMessage: '帮我看看我的收藏列表',
      context: DEFAULT_INTENT_CONTEXT,
    })

    const drafts = module.buildIntentCandidates({
      signals: draftSignals,
      context: DEFAULT_INTENT_CONTEXT,
      useKnowledgeBase: false,
    })
    const bookmarks = module.buildIntentCandidates({
      signals: bookmarkSignals,
      context: DEFAULT_INTENT_CONTEXT,
      useKnowledgeBase: false,
    })

    expect(drafts.candidates[0]?.intent).toBe('list_drafts')
    expect(bookmarks.candidates[0]?.intent).toBe('list_bookmarks')
  })

  it('detects cross-task switch from workflow followup to travel request', async () => {
    const module = await import('./chat-coordinator-agents')
    const signals = module.extractIntentSignals({
      latestUserMessage: '别写博客了，帮我规划一下成都三天旅行路线',
      context: {
        ...DEFAULT_INTENT_CONTEXT,
        activeDomain: 'blog_workflow',
        pendingAction: 'blog_workflow_followup',
        pendingEntityType: 'workflow',
        lastOperationCardScope: 'workflow',
      },
    })

    expect(signals.hasCrossTaskSwitchSignal).toBe(true)
  })

  it('forces followup for vague risky intents without anchor', async () => {
    invokeChatMock.mockResolvedValue(
      JSON.stringify({
        intent: 'update_post',
        summary: '修改现有文章',
        confidence: 0.88,
        needsFollowup: false,
        followupQuestions: [],
        needPlanning: false,
        shouldUseKnowledgeBase: false,
        publishDirectly: false,
        reason: '用户想改文章',
      })
    )

    const module = await import('./chat-coordinator-agents')
    const result = await module.runIntentRecognitionAgent({
      conversationText: '状态摘要：activeDomain=general',
      latestUserMessage: '帮我改一下',
      useKnowledgeBase: false,
      context: DEFAULT_INTENT_CONTEXT,
    })

    expect(result.intent).toBe('update_post')
    expect(result.confirmationRequired).toBe(true)
    expect(result.needsFollowup).toBe(true)
    expect(result.followupQuestions[0]).toContain('哪篇文章')
  })

  it('keeps travel planning on the new task even after a blog workflow followup card', async () => {
    invokeChatMock.mockResolvedValue(
      JSON.stringify({
        intent: 'create_calendar_event',
        summary: '规划旅行或多日行程',
        confidence: 0.96,
        needsFollowup: false,
        followupQuestions: [],
        needPlanning: false,
        shouldUseKnowledgeBase: false,
        publishDirectly: false,
        reason: '用户已经切换到新的旅行规划请求',
      })
    )

    const module = await import('./chat-coordinator-agents')
    const result = await module.runIntentRecognitionAgent({
      conversationText: '状态摘要：activeDomain=blog_workflow, pendingAction=blog_workflow_followup',
      latestUserMessage: '别写博客了，帮我规划一下成都三天旅行路线',
      useKnowledgeBase: false,
      context: {
        ...DEFAULT_INTENT_CONTEXT,
        activeDomain: 'blog_workflow',
        pendingAction: 'blog_workflow_followup',
        pendingEntityType: 'workflow',
        lastOperationCardScope: 'workflow',
      },
    })

    expect(result.intent).toBe('create_calendar_event')
    expect(result.domain).toBe('calendar_planning')
    expect(result.confirmationRequired).toBe(false)
  })

  it('uses llm review to choose planning mode for calendar requests after intent match', async () => {
    invokeChatMock.mockResolvedValueOnce(
      JSON.stringify({
        tool: 'create_calendar_event',
        rawText: '请你帮我给我一些推荐较为详细的行程',
        planningMode: 'plan',
        reason: '用户要的是推荐和详细行程，不是直接创建单条日程',
      })
    )

    const module = await import('./chat-coordinator-agents')
    const toolCall = await module.runBusinessToolAgent({
      conversationText: '用户：周末想出门',
      latestUserMessage: '请你帮我给我一些推荐较为详细的行程',
      intent: {
        intent: 'create_calendar_event',
        summary: '规划出行安排',
        needsFollowup: false,
        followupQuestions: [],
        needPlanning: false,
        shouldUseKnowledgeBase: false,
        publishDirectly: false,
        confidence: 0.91,
        candidateTrace: [],
        domain: 'calendar_planning',
        confirmationRequired: false,
        statePatch: {},
        forcedFollowupReason: null,
      },
      availableTools: ['create_calendar_event'],
      skillPrompt:
        '当前启用 skill=scenario_planning。把用户请求视为场景规划而不是单条事件记录。',
    })

    expect(toolCall?.tool).toBe('create_calendar_event')
    if (toolCall?.tool === 'create_calendar_event') {
      expect(toolCall.planningMode).toBe('plan')
    }
  })
})

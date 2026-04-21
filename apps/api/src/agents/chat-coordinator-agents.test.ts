import { describe, expect, it } from 'vitest'
import { runIntentRecognitionAgent } from './chat-coordinator-agents'

describe('chat intent recognition', () => {
  it('classifies travel planning as calendar planning instead of blog writing', async () => {
    const result = await runIntentRecognitionAgent({
      conversationText: '',
      latestUserMessage: '帮我规划一下五一去日本玩的 7 天行程，想轻松一点',
      useKnowledgeBase: false,
    })

    expect(result.intent).toBe('create_calendar_event')
    expect(result.summary).toBe('规划旅行或多日行程')
  })

  it('keeps travel planning on the new task even after a blog workflow followup card', async () => {
    const result = await runIntentRecognitionAgent({
      conversationText: `助手：【OPERATION_CARD】
{"version":1,"kind":"followup","scope":"workflow","title":"博客工作流需要补充信息","questions":["你想写给谁看？"],"submitMode":"workflow"}`,
      latestUserMessage: '别写博客了，帮我规划一下成都三天旅行路线',
      useKnowledgeBase: false,
    })

    expect(result.intent).toBe('create_calendar_event')
    expect(result.summary).toBe('规划旅行或多日行程')
  })
})

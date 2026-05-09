import { describe, expect, it } from 'vitest'
import { DEFAULT_INTENT_CONTEXT } from './chat-intent-state'
import { resolveChatAppSkill } from './chat-app-skills'

describe('chat app skills', () => {
  it('keeps the selected Yi Jing role even for general identity questions', () => {
    const skill = resolveChatAppSkill({
      intent: {
        intent: 'general_chat',
        summary: '身份询问',
        needsFollowup: false,
        followupQuestions: [],
        needPlanning: false,
        shouldUseKnowledgeBase: false,
        publishDirectly: false,
      },
      latestUserMessage: '你是谁',
      useKnowledgeBase: true,
      activeRoleId: 'yijing-teacher',
      state: DEFAULT_INTENT_CONTEXT,
    })

    expect(skill.id).toBe('yijing_learning')
    expect(skill.retrievalTools).toContain('yijing_knowledge_search')
  })

  it('keeps the selected Zi Wei role even for general identity questions', () => {
    const skill = resolveChatAppSkill({
      intent: {
        intent: 'general_chat',
        summary: '身份询问',
        needsFollowup: false,
        followupQuestions: [],
        needPlanning: false,
        shouldUseKnowledgeBase: false,
        publishDirectly: false,
      },
      latestUserMessage: '你是谁',
      useKnowledgeBase: true,
      activeRoleId: 'ziwei-teacher',
      state: DEFAULT_INTENT_CONTEXT,
    })

    expect(skill.id).toBe('ziwei_learning')
    expect(skill.retrievalTools).toContain('ziwei_knowledge_search')
  })

  it('routes Zi Wei terminology to the Zi Wei learning skill', () => {
    const skill = resolveChatAppSkill({
      intent: {
        intent: 'general_chat',
        summary: '紫微学习',
        needsFollowup: false,
        followupQuestions: [],
        needPlanning: false,
        shouldUseKnowledgeBase: false,
        publishDirectly: false,
      },
      latestUserMessage: '紫微星在命宫怎么理解？',
      useKnowledgeBase: false,
      activeRoleId: 'general',
      state: DEFAULT_INTENT_CONTEXT,
    })

    expect(skill.id).toBe('ziwei_learning')
    expect(skill.retrievalTools).toContain('ziwei_knowledge_search')
  })
})

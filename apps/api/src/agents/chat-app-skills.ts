import type {
  ChatExecutionRoute,
  ChatIntentName,
  ChatIntentRecognition,
  ChatToolName,
} from './chat-coordinator-agents'
import type { IntentContext } from './chat-intent-state'

export type ChatAppSkillId =
  | 'general_chat'
  | 'knowledge_context'
  | 'implementation_advice'
  | 'scenario_planning'
  | 'calendar_planning'
  | 'content_management'
  | 'thoughts_memory'
  | 'bookmark_management'
  | 'blog_workflow'

export type CalendarPlanningSkillPhase = 'draft' | 'confirm' | 'create' | 'advise'

type ChatAppSkillPromptSet = {
  planner?: string
  toolRouting?: string
  responder?: string
  businessTool?: string
}

type ChatAppSkillToolPolicy =
  | {
      mode: 'none'
    }
  | {
      mode: 'knowledge'
      tools: Array<Extract<ChatToolName, 'knowledge_base_search'>>
      requiresKnowledgeBase: boolean
    }
  | {
      mode: 'business'
      tools: Exclude<ChatToolName, 'knowledge_base_search'>[]
    }

export type ChatAppSkill = {
  id: ChatAppSkillId
  label: string
  description: string
  route: ChatExecutionRoute
  toolPolicy: ChatAppSkillToolPolicy
  prompts: ChatAppSkillPromptSet
}

type SkillMatcherInput = {
  intent: ChatIntentRecognition
  latestUserMessage: string
  useKnowledgeBase: boolean
  state: IntentContext
}

type ChatAppSkillDefinition = ChatAppSkill & {
  matches: (input: SkillMatcherInput) => boolean
}

function normalizeMessageText(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function looksLikeImplementationAdviceRequest(latestUserMessage: string): boolean {
  const text = normalizeMessageText(latestUserMessage)
  return (
    /(?:怎么做|如何做|怎么推进|如何推进|如何实施|怎么实施|执行建议|具体建议|落地建议)/.test(
      text
    ) ||
    /(?:实施|执行|推进).*(?:建议|方案|步骤|细化)/.test(text)
  )
}

function intentIn(intent: ChatIntentName, values: ChatIntentName[]): boolean {
  return values.includes(intent)
}

const APP_SKILL_DEFINITIONS: ChatAppSkillDefinition[] = [
  {
    id: 'blog_workflow',
    label: '博客工作流',
    description: '博客创作与发布流程。',
    route: 'blog_workflow',
    toolPolicy: { mode: 'none' },
    prompts: {},
    matches: ({ intent, state }) => intent.intent === 'write_blog' || state.activeDomain === 'blog_workflow',
  },
  {
    id: 'scenario_planning',
    label: '场景规划',
    description: '针对出行、活动、筹备、多天安排等场景，先做方案决策，再决定是否写入日历。',
    route: 'tool',
    toolPolicy: {
      mode: 'business',
      tools: ['create_calendar_event'],
    },
    prompts: {
      businessTool:
        '当前启用 skill=scenario_planning。把用户请求视为场景规划而不是单条事件记录。优先保留日期范围、已有安排约束、准备事项和分天计划，让下游先给方案，再决定是否写入日历。',
    },
    matches: ({ intent, latestUserMessage }) =>
      intent.intent === 'create_calendar_event' &&
      /(?:出行|旅行|旅游|行程|攻略|安排.*天|几天|到|至|\-|—|~|～)/.test(latestUserMessage),
  },
  {
    id: 'calendar_planning',
    label: '日程规划',
    description: '把事项规划为日程方案，并在确认后写入日历。',
    route: 'tool',
    toolPolicy: {
      mode: 'business',
      tools: ['create_calendar_event'],
    },
    prompts: {
      businessTool:
        '当前启用 skill=calendar_planning。只允许选择 create_calendar_event。优先保留用户原始安排、日期和确认措辞，便于下游执行计划、确认与取消流程。',
    },
    matches: ({ intent, state }) =>
      intent.intent === 'create_calendar_event' || state.activeDomain === 'calendar_planning',
  },
  {
    id: 'content_management',
    label: '内容管理',
    description: '管理现有文章与草稿。',
    route: 'tool',
    toolPolicy: {
      mode: 'business',
      tools: ['publish_post', 'update_post', 'delete_post', 'get_post_detail', 'list_drafts'],
    },
    prompts: {
      businessTool:
        '当前启用 skill=content_management。仅在文章/草稿相关工具里选择最匹配的一项，不要误选其他业务工具。',
    },
    matches: ({ intent, state }) =>
      intentIn(intent.intent, [
        'publish_post',
        'update_post',
        'delete_post',
        'get_post_detail',
        'list_drafts',
      ]) || state.activeDomain === 'content_management',
  },
  {
    id: 'thoughts_memory',
    label: '思考记忆',
    description: '记录、搜索和基于思考库回答。',
    route: 'tool',
    toolPolicy: {
      mode: 'business',
      tools: ['create_thought', 'search_thoughts', 'answer_thoughts'],
    },
    prompts: {
      businessTool:
        '当前启用 skill=thoughts_memory。只允许在 create_thought、search_thoughts、answer_thoughts 之间选择最匹配的工具。',
    },
    matches: ({ intent, state }) =>
      intentIn(intent.intent, ['create_thought', 'search_thoughts', 'answer_thoughts']) ||
      state.activeDomain === 'thoughts_memory',
  },
  {
    id: 'bookmark_management',
    label: '收藏管理',
    description: '保存和查询收藏链接。',
    route: 'tool',
    toolPolicy: {
      mode: 'business',
      tools: ['save_bookmark_from_url', 'list_bookmarks'],
    },
    prompts: {
      businessTool:
        '当前启用 skill=bookmark_management。只允许在 save_bookmark_from_url 和 list_bookmarks 之间选择。',
    },
    matches: ({ intent, state }) =>
      intentIn(intent.intent, ['create_bookmark', 'list_bookmarks']) || state.activeDomain === 'bookmark_management',
  },
  {
    id: 'implementation_advice',
    label: '实施建议',
    description: '当用户需要问题拆解、执行建议和落地步骤时启用。',
    route: 'respond',
    toolPolicy: {
      mode: 'knowledge',
      tools: ['knowledge_base_search'],
      requiresKnowledgeBase: true,
    },
    prompts: {
      planner:
        '当前启用 skill=implementation_advice。拆解任务时优先输出可执行步骤、先后依赖、检查点和需要查证的本地上下文。',
      toolRouting:
        '当前启用 skill=implementation_advice。若本地知识库、历史对话或 PDF 能帮助给出更具体的执行建议，则调用 knowledge_base_search；否则直接回答。',
      responder:
        '当前启用的是实施建议 skill。回答要强调分步执行、前置条件、风险提示和下一步行动，而不是泛泛而谈。',
    },
    matches: ({ intent, latestUserMessage, useKnowledgeBase }) =>
      useKnowledgeBase &&
      (intent.intent === 'advice' ||
        intent.intent === 'analysis' ||
        looksLikeImplementationAdviceRequest(latestUserMessage)),
  },
  {
    id: 'knowledge_context',
    label: '知识上下文',
    description: '在需要本地知识库、历史对话或 PDF 上下文时启用。',
    route: 'respond',
    toolPolicy: {
      mode: 'knowledge',
      tools: ['knowledge_base_search'],
      requiresKnowledgeBase: true,
    },
    prompts: {
      toolRouting:
        '当前启用 skill=knowledge_context。只有在本地知识库、历史对话或 PDF 能明显提升答案准确性时才调用 knowledge_base_search。',
      responder:
        '当前启用的是知识上下文 skill。优先整合本地检索结果，再给出结论；如果是基于结果的推断，要明确说明。',
    },
    matches: ({ intent, useKnowledgeBase }) =>
      useKnowledgeBase && (intent.intent === 'knowledge_qa' || intent.shouldUseKnowledgeBase),
  },
  {
    id: 'general_chat',
    label: '通用对话',
    description: '默认聊天技能，不额外暴露工具。',
    route: 'respond',
    toolPolicy: { mode: 'none' },
    prompts: {
      responder: '当前启用的是通用对话 skill。优先直接回答，避免过度流程化。',
    },
    matches: () => true,
  },
]

export type ResolvedChatAppSkill = ChatAppSkill & {
  businessTools: Exclude<ChatToolName, 'knowledge_base_search'>[]
  retrievalTools: Array<Extract<ChatToolName, 'knowledge_base_search'>>
}

export function resolveChatAppSkill(input: SkillMatcherInput): ResolvedChatAppSkill {
  const skill = APP_SKILL_DEFINITIONS.find((definition) => definition.matches(input))!

  const businessTools =
    skill.toolPolicy.mode === 'business'
      ? skill.toolPolicy.tools
      : []

  const retrievalTools =
    skill.toolPolicy.mode === 'knowledge' &&
    (!skill.toolPolicy.requiresKnowledgeBase || input.useKnowledgeBase)
      ? skill.toolPolicy.tools
      : []

  return {
    id: skill.id,
    label: skill.label,
    description: skill.description,
    route: skill.route,
    toolPolicy: skill.toolPolicy,
    prompts: skill.prompts,
    businessTools,
    retrievalTools,
  }
}

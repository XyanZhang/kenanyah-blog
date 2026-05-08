import type {
  ChatExecutionRoute,
  ChatIntentName,
  ChatIntentRecognition,
  ChatToolName,
} from './chat-coordinator-agents'
import type { IntentContext } from './chat-intent-state'

export type ChatAppSkillId =
  | 'general_chat'
  | 'yijing_learning'
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

type RetrievalToolName = Extract<ChatToolName, 'knowledge_base_search' | 'yijing_knowledge_search'>
type BusinessToolName = Exclude<ChatToolName, RetrievalToolName>

type ChatAppSkillToolPolicy =
  | {
      mode: 'none'
    }
  | {
      mode: 'knowledge'
      tools: RetrievalToolName[]
      requiresKnowledgeBase: boolean
    }
  | {
      mode: 'business'
      tools: BusinessToolName[]
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

function looksLikeYijingLearningRequest(latestUserMessage: string): boolean {
  const text = normalizeMessageText(latestUserMessage)
  return /(?:易经|周易|卦辞|爻辞|彖传|象传|文言|十翼|乾卦|坤卦|屯卦|蒙卦|需卦|讼卦|师卦|比卦|小畜|履卦|泰卦|否卦|同人|大有|谦卦|豫卦|随卦|蛊卦|临卦|观卦|噬嗑|贲卦|剥卦|复卦|无妄|大畜|颐卦|大过|坎卦|离卦|咸卦|恒卦|遁卦|大壮|晋卦|明夷|家人|睽卦|蹇卦|解卦|损卦|益卦|夬卦|姤卦|萃卦|升卦|困卦|井卦|革卦|鼎卦|震卦|艮卦|渐卦|归妹|丰卦|旅卦|巽卦|兑卦|涣卦|节卦|中孚|小过|既济|未济)/.test(text)
}

function intentIn(intent: ChatIntentName, values: ChatIntentName[]): boolean {
  return values.includes(intent)
}

const APP_SKILL_DEFINITIONS: ChatAppSkillDefinition[] = [
  {
    id: 'yijing_learning',
    label: '易经学习',
    description: '围绕《易经》原文进行学习、解释、对话和文化参考式解读。',
    route: 'respond',
    toolPolicy: {
      mode: 'knowledge',
      tools: ['yijing_knowledge_search'],
      requiresKnowledgeBase: false,
    },
    prompts: {
      planner:
        '当前启用 skill=yijing_learning。把任务视为《易经》学习辅导：先明确用户想学的卦、句子、概念或应用场景，再组织解释路径。',
      toolRouting:
        '当前启用 skill=yijing_learning。优先调用 yijing_knowledge_search 检索《易经》原文。query 应包含用户提到的卦名、原文关键词或学习问题。',
      responder: [
        '当前启用的是易经学习 skill。你是一位耐心的《易经》学习伙伴，不做玄虚化、绝对化表达。',
        '回答时优先基于《易经》检索结果解释原文；如果检索结果不足，要明确说明。',
        '适合初学者：先用现代中文解释，再补充关键词、原文脉络和可思考的问题。',
        '如果涉及占卜或人生决策，只给文化参考和反思角度，不做确定预测。',
      ].join('\n'),
    },
    matches: ({ latestUserMessage, state }) =>
      looksLikeYijingLearningRequest(latestUserMessage) || state.activeDomain === 'knowledge',
  },
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
  businessTools: BusinessToolName[]
  retrievalTools: RetrievalToolName[]
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

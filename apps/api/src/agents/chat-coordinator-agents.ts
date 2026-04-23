import { z } from 'zod'
import { throwIfAborted } from '../lib/abort'
import { invokeChat, type LlmModelPurpose } from '../lib/llm'
import {
  summarizeIntentContext,
  type IntentContext,
  type IntentDomain,
  type PendingIntentAction,
  type PendingIntentEntityType,
} from './chat-intent-state'

const chatIntentSchema = z.object({
  intent: z
    .enum([
      'general_chat',
      'knowledge_qa',
      'analysis',
      'creation',
      'advice',
      'write_blog',
      'publish_post',
      'update_post',
      'delete_post',
      'get_post_detail',
      'list_drafts',
      'create_calendar_event',
      'create_thought',
      'create_bookmark',
      'list_bookmarks',
      'search_thoughts',
      'answer_thoughts',
    ])
    .catch('general_chat'),
  summary: z.string().trim().max(120).catch('一般对话'),
  needsFollowup: z.boolean().catch(false),
  followupQuestions: z.array(z.string().trim().min(1).max(100)).max(3).catch([]),
  needPlanning: z.boolean().catch(true),
  shouldUseKnowledgeBase: z.boolean().catch(false),
  publishDirectly: z.boolean().catch(false),
})

const intentReviewSchema = chatIntentSchema.extend({
  confidence: z.number().min(0).max(1).catch(0.55),
  reason: z.string().trim().max(200).catch('基于用户最新输入和候选意图做出的判断'),
})

const chatTaskPlanSchema = z.object({
  goal: z.string().trim().max(200).catch('回答用户问题'),
  subtasks: z.array(z.string().trim().min(1).max(120)).max(5).catch([]),
  answerStrategy: z.string().trim().max(300).catch('结合上下文直接回答'),
  responseStyle: z.string().trim().max(120).catch('简洁、直接、可执行'),
  constraints: z.array(z.string().trim().min(1).max(120)).max(5).catch([]),
  needsFollowup: z.boolean().catch(false),
  followupQuestions: z.array(z.string().trim().min(1).max(100)).max(3).catch([]),
  toolHint: z.string().trim().max(200).catch(''),
})

const knowledgeBaseToolCallSchema = z.object({
  tool: z.enum(['knowledge_base_search']).catch('knowledge_base_search'),
  query: z.string().trim().min(1).max(200).catch(''),
  limit: z.number().int().min(1).max(8).catch(6),
  reason: z.string().trim().max(160).catch(''),
})

const publishPostToolCallSchema = z.object({
  tool: z.literal('publish_post'),
  postQuery: z.string().trim().max(200).catch(''),
  strategy: z.enum(['latest_draft', 'match_query']).catch('latest_draft'),
  reason: z.string().trim().max(160).catch(''),
})

const updatePostToolCallSchema = z.object({
  tool: z.literal('update_post'),
  postQuery: z.string().trim().max(200).catch(''),
  title: z.string().trim().max(200).catch(''),
  excerpt: z.string().trim().max(500).catch(''),
  content: z.string().trim().max(30000).catch(''),
  appendContent: z.string().trim().max(10000).catch(''),
  editInstruction: z.string().trim().max(4000).catch(''),
  publishAction: z.enum(['keep', 'publish', 'unpublish']).catch('keep'),
  reason: z.string().trim().max(160).catch(''),
})

const deletePostToolCallSchema = z.object({
  tool: z.literal('delete_post'),
  postQuery: z.string().trim().max(200).catch(''),
  reason: z.string().trim().max(160).catch(''),
})

const getPostDetailToolCallSchema = z.object({
  tool: z.literal('get_post_detail'),
  postQuery: z.string().trim().max(200).catch(''),
  selectionMode: z.enum(['match_query', 'latest', 'previous', 'next']).catch('match_query'),
  includeContent: z.boolean().catch(true),
  reason: z.string().trim().max(160).catch(''),
})

const listDraftsToolCallSchema = z.object({
  tool: z.literal('list_drafts'),
  query: z.string().trim().max(200).catch(''),
  limit: z.number().int().min(1).max(10).catch(5),
  reason: z.string().trim().max(160).catch(''),
})

const createCalendarEventToolCallSchema = z.object({
  tool: z.literal('create_calendar_event'),
  rawText: z.string().trim().min(1).max(5000).catch(''),
  planningMode: z.enum(['plan', 'quick_create', 'confirm', 'cancel']).catch('quick_create'),
  defaultDate: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .catch(undefined),
  reason: z.string().trim().max(160).catch(''),
})

const createThoughtToolCallSchema = z.object({
  tool: z.literal('create_thought'),
  content: z.string().trim().min(1).max(20000).catch(''),
  reason: z.string().trim().max(160).catch(''),
})

const saveBookmarkFromUrlToolCallSchema = z.object({
  tool: z.literal('save_bookmark_from_url'),
  title: z.string().trim().max(500).catch(''),
  url: z.string().trim().max(2000).catch(''),
  notes: z.string().trim().max(2000).catch(''),
  category: z.string().trim().max(100).catch(''),
  tags: z.array(z.string().trim().min(1).max(50)).max(20).catch([]),
  reason: z.string().trim().max(160).catch(''),
})

const listBookmarksToolCallSchema = z.object({
  tool: z.literal('list_bookmarks'),
  query: z.string().trim().max(200).catch(''),
  category: z.string().trim().max(100).catch(''),
  limit: z.number().int().min(1).max(10).catch(5),
  reason: z.string().trim().max(160).catch(''),
})

const searchThoughtsToolCallSchema = z.object({
  tool: z.literal('search_thoughts'),
  query: z.string().trim().min(1).max(500).catch(''),
  limit: z.number().int().min(1).max(10).catch(5),
  reason: z.string().trim().max(160).catch(''),
})

const answerThoughtsToolCallSchema = z.object({
  tool: z.literal('answer_thoughts'),
  query: z.string().trim().min(1).max(500).catch(''),
  limit: z.number().int().min(1).max(10).catch(5),
  reason: z.string().trim().max(160).catch(''),
})

const toolCallSchema = z.discriminatedUnion('tool', [
  knowledgeBaseToolCallSchema,
  publishPostToolCallSchema,
  updatePostToolCallSchema,
  deletePostToolCallSchema,
  getPostDetailToolCallSchema,
  listDraftsToolCallSchema,
  createCalendarEventToolCallSchema,
  createThoughtToolCallSchema,
  saveBookmarkFromUrlToolCallSchema,
  listBookmarksToolCallSchema,
  searchThoughtsToolCallSchema,
  answerThoughtsToolCallSchema,
])

const toolPlanSchema = z.object({
  shouldUseTools: z.boolean().catch(false),
  toolCalls: z.array(toolCallSchema).max(2).catch([]),
})

export type ChatIntentName = z.infer<typeof chatIntentSchema>['intent']
export type ChatIntentRecognition = z.infer<typeof chatIntentSchema>
export type ChatTaskPlan = z.infer<typeof chatTaskPlanSchema>
export type ChatToolName = z.infer<typeof toolCallSchema>['tool']
export type ChatToolCall = z.infer<typeof toolCallSchema>
export type ChatToolPlan = z.infer<typeof toolPlanSchema>
export type ChatExecutionRoute = 'respond' | 'blog_workflow' | 'tool'
export type IntentSignal = {
  latestUserMessage: string
  hasPendingDeleteConfirmation: boolean
  hasPendingPostUpdateFollowup: boolean
  hasPendingBlogWorkflowFollowup: boolean
  hasPendingCalendarPlanConfirmation: boolean
  hasCrossTaskSwitchSignal: boolean
  matches: {
    deleteConfirmation: boolean
    deleteRequest: boolean
    updatePost: boolean
    genericDraftList: boolean
    genericBookmarkList: boolean
    calendarPlanAction: boolean
    calendarEvent: boolean
    travelPlanning: boolean
    explicitPublish: boolean
    getPostDetail: boolean
    writeBlog: boolean
    createBookmark: boolean
    createThought: boolean
    searchThoughts: boolean
    answerThoughts: boolean
    knowledgeQa: boolean
  }
}
export type IntentCandidate = {
  intent: ChatIntentName
  source: 'rule' | 'state' | 'llm'
  confidence: number
  reason: string
}
export type IntentHardGuards = {
  dangerousOperation: boolean
  crossTaskSwitch: boolean
  requiresConfirmation: boolean
}
export type IntentReviewResult = {
  intent: ChatIntentName
  summary: string
  confidence: number
  needsFollowup: boolean
  followupQuestions: string[]
  needPlanning: boolean
  shouldUseKnowledgeBase: boolean
  publishDirectly: boolean
  reason: string
}
export type IntentDecision = ChatIntentRecognition & {
  confidence: number
  candidateTrace: IntentCandidate[]
  domain: IntentDomain
  confirmationRequired: boolean
  statePatch: Partial<IntentContext>
  forcedFollowupReason: string | null
}

type JsonAgentOptions<T> = {
  systemPrompt: string
  userPrompt: string
  fallback: T
  schema: z.ZodType<T, z.ZodTypeDef, unknown>
  model?: LlmModelPurpose
  signal?: AbortSignal
}

function extractJsonObject(text: string): string | null {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) {
    return null
  }
  return text.slice(start, end + 1)
}

function normalizeQuestions(questions: string[]): string[] {
  return [...new Set(questions.map((item) => item.trim()).filter(Boolean))].slice(0, 3)
}

function normalizeMessageText(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function looksLikeDeleteConfirmation(latestUserMessage: string): boolean {
  const text = normalizeMessageText(latestUserMessage)
  return /^(确认删除|确定删除|确认删掉|确定删掉|确认移除|确定移除)(?:[:：\s].*|$)/.test(text)
}

function looksLikeDeleteRequest(latestUserMessage: string): boolean {
  const text = normalizeMessageText(latestUserMessage)
  return (
    /(?:删除|删掉|移除).*(?:文章|博客|博文|帖子|《|“|"|'|这篇|这个)/.test(text) ||
    /^(?:删除|删掉|移除)\s+\S+/.test(text) ||
    /^把.+(?:删除|删掉|移除)/.test(text)
  )
}

function looksLikeGenericDraftListRequest(latestUserMessage: string): boolean {
  const text = normalizeMessageText(latestUserMessage)
  return /^(?:帮我|请)?(?:列出|看看|查看|展示)?(?:一下)?(?:我的)?草稿(?:列表|文章)?$/.test(text)
}

function looksLikeGenericBookmarkListRequest(latestUserMessage: string): boolean {
  const text = normalizeMessageText(latestUserMessage)
  return /^(?:帮我|请)?(?:列出|看看|查看|展示)?(?:一下)?(?:我的)?(?:收藏|书签)(?:列表)?$/.test(text)
}

function looksLikeUpdatePostRequest(latestUserMessage: string): boolean {
  const text = normalizeMessageText(latestUserMessage)
  return (
    /(?:修改|改一下|改成|改为|调整|润色|优化|补充|追加|扩写|缩写|缩短|重写|精简|完善).*(?:文章|博客|博文|标题|摘要|正文|内容|结尾|开头)/.test(
      text
    ) ||
    /(?:把|将).*(?:标题|摘要|正文|内容|结尾|开头).*(?:改|调整|润色|优化|补充|追加|扩写|缩写|重写)/.test(
      text
    ) ||
    /^(?:标题|摘要|正文|内容|结尾|开头).*(?:改|调整|润色|优化|补充|追加|扩写|缩写|重写)/.test(text)
  )
}

function extractPostQueryFromUpdateRequest(latestUserMessage: string): string {
  const text = normalizeMessageText(latestUserMessage)
  const quotedMatch =
    text.match(/《([^》]+)》/) ||
    text.match(/“([^”]+)”/) ||
    text.match(/"([^"]+)"/) ||
    text.match(/'([^']+)'/)

  if (quotedMatch?.[1]?.trim()) {
    return quotedMatch[1].trim()
  }

  const idMatch = text.match(/\bcm[a-z0-9]{6,}\b/i)
  if (idMatch?.[0]) {
    return idMatch[0]
  }

  return ''
}

function extractStructuredUpdateFields(latestUserMessage: string): {
  title: string
  excerpt: string
  content: string
  appendContent: string
  editInstruction: string
  publishAction: 'keep' | 'publish' | 'unpublish'
} {
  const text = latestUserMessage.trim()
  const normalized = normalizeMessageText(text)

  const titleMatch = normalized.match(/(?:标题)(?:改为|改成|换成|叫做|叫|写成|设为|变成)[:：\s]*(.+)$/)
  const excerptMatch = text.match(/(?:摘要|简介|导语)(?:改为|改成|换成|写成|设为|变成)[:：\s]*([\s\S]+)$/)
  const contentMatch = text.match(/(?:正文|全文|内容)(?:改为|改成|替换为|更新为)[:：\s]*([\s\S]+)$/)
  const appendMatch = text.match(
    /(?:(?:在)?(?:正文末尾|文末|结尾|最后)(?:追加|补充|加上)|追加(?:一段)?|补充(?:一段)?|新增(?:一段)?)(?:[:：\s]*)([\s\S]+)$/
  )

  let publishAction: 'keep' | 'publish' | 'unpublish' = 'keep'
  if (/(?:发布|上线|公开这篇文章)/.test(normalized)) {
    publishAction = 'publish'
  } else if (/(?:下线|取消发布|撤回发布|转为草稿)/.test(normalized)) {
    publishAction = 'unpublish'
  }

  const title = titleMatch?.[1]?.trim() || ''
  const excerpt = excerptMatch?.[1]?.trim() || ''
  const content = contentMatch?.[1]?.trim() || ''
  const appendContent = appendMatch?.[1]?.trim() || ''

  const hasDirectFields =
    Boolean(title) || Boolean(excerpt) || Boolean(content) || Boolean(appendContent)
  const editInstruction =
    hasDirectFields || publishAction !== 'keep' || !normalized
      ? ''
      : latestUserMessage.trim().slice(0, 4000)

  return {
    title,
    excerpt,
    content,
    appendContent,
    editInstruction,
    publishAction,
  }
}

function detectPostDetailSelectionMode(latestUserMessage: string): 'match_query' | 'latest' | 'previous' | 'next' {
  const text = normalizeMessageText(latestUserMessage)

  if (/(?:上一篇|前一篇|上篇|上一条文章|前一条文章)/.test(text)) {
    return 'previous'
  }

  if (/(?:下一篇|后一篇|下篇|下一条文章|后一条文章)/.test(text)) {
    return 'next'
  }

  if (/(?:最新(?:的)?(?:一篇|那篇)?文章|最近(?:的)?(?:一篇|那篇)?文章|最新文章)/.test(text)) {
    return 'latest'
  }

  return 'match_query'
}

function looksLikeCalendarEventRequest(latestUserMessage: string): boolean {
  const text = normalizeMessageText(latestUserMessage)
  return (
    /(?:记到|加入|添加到|安排到|放到).*(?:日历|日程|计划|待办)/.test(text) ||
    /(?:提醒我|帮我提醒|给我提醒|创建日程|新建日程|添加日程|记录日程|安排日程)/.test(text) ||
    /(?:明天|后天|今天|下周|今晚|上午|下午|晚上).*(?:写|发布|记录|开会|提醒|安排|处理|完成)/.test(
      text
    )
  )
}

function looksLikeTravelPlanningRequest(latestUserMessage: string): boolean {
  const text = normalizeMessageText(latestUserMessage)
  const hasTravelKeyword =
    /(?:出行|旅行|旅游|行程|攻略|路线|自驾|自由行|度假|trip|travel)/i.test(text)
  const hasPlanningSignal =
    /(?:规划|计划|安排|推荐|整理|设计|制定|怎么去|怎么玩|怎么安排|路线|攻略|几天|天)/.test(
      text
    ) ||
    /(?:\d+\s*天|\d+\s*晚|周末|假期|假日)/.test(text) ||
    /(?:从|到|至|飞往|去).*(?:玩|旅游|旅行|出行)/.test(text)

  return hasTravelKeyword && hasPlanningSignal
}

function looksLikeCalendarPlanAction(latestUserMessage: string): boolean {
  const text = normalizeMessageText(latestUserMessage)
  return /^(?:确认创建日程计划|取消创建日程计划)(?:\s+.+)?$/.test(text)
}

function looksLikePublishPostRequest(latestUserMessage: string): boolean {
  const text = normalizeMessageText(latestUserMessage)
  return /(?:发布|上线|公开).*(?:文章|博客|博文|草稿|这篇|这一篇|最新)/.test(text)
}

function looksLikePostDetailRequest(latestUserMessage: string): boolean {
  const text = normalizeMessageText(latestUserMessage)
  return (
    /(?:查看|看看|打开|给我|显示).*(?:文章|博客|博文).*(?:详情|内容|正文|状态|链接)/.test(text) ||
    /(?:最新文章|最近一篇文章|上一篇|下一篇)/.test(text)
  )
}

function looksLikeWriteBlogRequest(latestUserMessage: string): boolean {
  const text = normalizeMessageText(latestUserMessage)
  return /(?:写一篇|生成一篇|帮我写|写博客|生成博客|写文章|生成文章|博客草稿)/.test(text)
}

function looksLikeBookmarkCreateRequest(latestUserMessage: string): boolean {
  const text = normalizeMessageText(latestUserMessage)
  return (
    /(?:收藏|保存|记下).*(?:链接|网址|url|网页)/i.test(text) ||
    /https?:\/\/\S+/i.test(text)
  )
}

function looksLikeThoughtCreateRequest(latestUserMessage: string): boolean {
  const text = normalizeMessageText(latestUserMessage)
  return /(?:记一条想法|记录想法|保存想法|记到思考库|写一条思考)/.test(text)
}

function looksLikeThoughtSearchRequest(latestUserMessage: string): boolean {
  const text = normalizeMessageText(latestUserMessage)
  return /(?:搜索|查找|回忆).*(?:思考|想法|灵感|思考库)/.test(text)
}

function looksLikeThoughtAnswerRequest(latestUserMessage: string): boolean {
  const text = normalizeMessageText(latestUserMessage)
  return /(?:根据|基于).*(?:思考库|想法).*(?:回答|总结|分析)/.test(text)
}

function looksLikeKnowledgeQaRequest(latestUserMessage: string): boolean {
  const text = normalizeMessageText(latestUserMessage)
  return /(?:根据文档|根据资料|结合历史对话|结合本地知识库|查一下资料)/.test(text)
}

function inferDomainFromIntent(intent: ChatIntentName): IntentDomain {
  if (intent === 'write_blog') return 'blog_workflow'
  if (
    intent === 'publish_post' ||
    intent === 'update_post' ||
    intent === 'delete_post' ||
    intent === 'get_post_detail' ||
    intent === 'list_drafts'
  ) {
    return 'content_management'
  }
  if (intent === 'create_calendar_event') return 'calendar_planning'
  if (intent === 'create_bookmark' || intent === 'list_bookmarks') return 'bookmark_management'
  if (intent === 'create_thought' || intent === 'search_thoughts' || intent === 'answer_thoughts') {
    return 'thoughts_memory'
  }
  if (intent === 'knowledge_qa') return 'knowledge'
  return 'general'
}

function getIntentSummary(intent: ChatIntentName): string {
  const summaryMap: Record<ChatIntentName, string> = {
    general_chat: '一般对话',
    knowledge_qa: '基于本地知识回答问题',
    analysis: '分析问题并给出判断',
    creation: '生成内容',
    advice: '提供建议',
    write_blog: '写博客或继续博客流程',
    publish_post: '发布现有文章',
    update_post: '修改现有文章',
    delete_post: '删除文章',
    get_post_detail: '查看文章详情',
    list_drafts: '查看草稿列表',
    create_calendar_event: '创建或规划日程安排',
    create_thought: '记录思考',
    create_bookmark: '保存收藏链接',
    list_bookmarks: '查看收藏列表',
    search_thoughts: '搜索思考库',
    answer_thoughts: '基于思考库回答问题',
  }

  return summaryMap[intent]
}

function getFollowupQuestionsForIntent(intent: ChatIntentName): string[] {
  if (intent === 'publish_post') return ['你想发布哪篇文章？可以告诉我标题、slug，或者说“最新草稿”。']
  if (intent === 'update_post') return ['你想改哪篇文章？请告诉我标题、slug、id，或先说明你刚才提到的是哪一篇。']
  if (intent === 'delete_post') return ['你要删除哪篇文章？请告诉我标题、slug 或 id。']
  if (intent === 'create_calendar_event') return ['你想安排什么事？是今天、明天，还是某个具体日期？']
  return ['请再补充一点关键信息，我再继续处理。']
}

function candidateConfidence(base: number): number {
  return Number(Math.max(0.05, Math.min(0.99, base)).toFixed(2))
}

function addCandidate(
  candidates: IntentCandidate[],
  intent: ChatIntentName,
  source: IntentCandidate['source'],
  confidence: number,
  reason: string
): void {
  const existing = candidates.find((item) => item.intent === intent)
  if (existing) {
    if (confidence > existing.confidence) {
      existing.confidence = candidateConfidence(confidence)
      existing.reason = reason
      existing.source = source
    }
    return
  }

  candidates.push({
    intent,
    source,
    confidence: candidateConfidence(confidence),
    reason,
  })
}

export function extractIntentSignals(input: {
  latestUserMessage: string
  context: IntentContext
}): IntentSignal {
  const latestUserMessage = normalizeMessageText(input.latestUserMessage)
  const strongNewDomainSignal =
    looksLikeTravelPlanningRequest(latestUserMessage) ||
    looksLikeCalendarEventRequest(latestUserMessage) ||
    looksLikeBookmarkCreateRequest(latestUserMessage) ||
    looksLikeGenericBookmarkListRequest(latestUserMessage) ||
    looksLikeDeleteRequest(latestUserMessage) ||
    looksLikeWriteBlogRequest(latestUserMessage)

  return {
    latestUserMessage,
    hasPendingDeleteConfirmation: input.context.pendingAction === 'confirm_delete_post',
    hasPendingPostUpdateFollowup: input.context.pendingAction === 'update_post_followup',
    hasPendingBlogWorkflowFollowup: input.context.pendingAction === 'blog_workflow_followup',
    hasPendingCalendarPlanConfirmation: input.context.pendingAction === 'confirm_calendar_plan',
    hasCrossTaskSwitchSignal:
      strongNewDomainSignal &&
      input.context.activeDomain !== 'general' &&
      input.context.activeDomain !== inferDomainFromIntent(
        looksLikeTravelPlanningRequest(latestUserMessage) || looksLikeCalendarEventRequest(latestUserMessage)
          ? 'create_calendar_event'
          : looksLikeBookmarkCreateRequest(latestUserMessage) || looksLikeGenericBookmarkListRequest(latestUserMessage)
            ? 'create_bookmark'
            : looksLikeDeleteRequest(latestUserMessage)
              ? 'delete_post'
              : 'write_blog'
      ),
    matches: {
      deleteConfirmation: looksLikeDeleteConfirmation(latestUserMessage),
      deleteRequest: looksLikeDeleteRequest(latestUserMessage),
      updatePost: looksLikeUpdatePostRequest(latestUserMessage),
      genericDraftList: looksLikeGenericDraftListRequest(latestUserMessage),
      genericBookmarkList: looksLikeGenericBookmarkListRequest(latestUserMessage),
      calendarPlanAction: looksLikeCalendarPlanAction(latestUserMessage),
      calendarEvent: looksLikeCalendarEventRequest(latestUserMessage),
      travelPlanning: looksLikeTravelPlanningRequest(latestUserMessage),
      explicitPublish: looksLikePublishPostRequest(latestUserMessage),
      getPostDetail: looksLikePostDetailRequest(latestUserMessage),
      writeBlog: looksLikeWriteBlogRequest(latestUserMessage),
      createBookmark: looksLikeBookmarkCreateRequest(latestUserMessage),
      createThought: looksLikeThoughtCreateRequest(latestUserMessage),
      searchThoughts: looksLikeThoughtSearchRequest(latestUserMessage),
      answerThoughts: looksLikeThoughtAnswerRequest(latestUserMessage),
      knowledgeQa: looksLikeKnowledgeQaRequest(latestUserMessage),
    },
  }
}

export function buildIntentCandidates(input: {
  signals: IntentSignal
  context: IntentContext
  useKnowledgeBase: boolean
}): { candidates: IntentCandidate[]; hardGuards: IntentHardGuards } {
  const candidates: IntentCandidate[] = []
  const { signals, context } = input

  if (signals.hasPendingDeleteConfirmation && signals.matches.deleteConfirmation) {
    addCandidate(candidates, 'delete_post', 'state', 0.97, '命中待确认删除状态，且用户明确确认删除')
  }

  if (signals.matches.deleteRequest) {
    addCandidate(candidates, 'delete_post', 'rule', 0.93, '命中删除文章请求')
  }

  if (signals.hasPendingPostUpdateFollowup || signals.matches.updatePost) {
    addCandidate(candidates, 'update_post', signals.hasPendingPostUpdateFollowup ? 'state' : 'rule', 0.9, '命中文章修改请求')
  }

  if (signals.matches.genericDraftList) {
    addCandidate(candidates, 'list_drafts', 'rule', 0.95, '命中草稿列表查询')
  }

  if (signals.matches.genericBookmarkList) {
    addCandidate(candidates, 'list_bookmarks', 'rule', 0.95, '命中收藏列表查询')
  }

  if (signals.hasPendingCalendarPlanConfirmation || signals.matches.calendarPlanAction) {
    addCandidate(candidates, 'create_calendar_event', signals.hasPendingCalendarPlanConfirmation ? 'state' : 'rule', 0.94, '命中待确认日程计划')
  }

  if (signals.matches.travelPlanning) {
    addCandidate(candidates, 'create_calendar_event', 'rule', 0.96, '命中旅行或多日行程规划')
  } else if (signals.matches.calendarEvent) {
    addCandidate(candidates, 'create_calendar_event', 'rule', 0.9, '命中日程安排请求')
  }

  if (signals.matches.explicitPublish) {
    addCandidate(candidates, 'publish_post', 'rule', 0.87, '命中发布现有文章请求')
  }

  if (signals.matches.getPostDetail) {
    addCandidate(candidates, 'get_post_detail', 'rule', 0.84, '命中文章详情查看请求')
  }

  if (signals.hasPendingBlogWorkflowFollowup || signals.matches.writeBlog) {
    addCandidate(candidates, 'write_blog', signals.hasPendingBlogWorkflowFollowup ? 'state' : 'rule', 0.88, '命中博客工作流请求')
  }

  if (signals.matches.createBookmark) {
    addCandidate(candidates, 'create_bookmark', 'rule', 0.84, '命中收藏链接请求')
  }

  if (signals.matches.createThought) {
    addCandidate(candidates, 'create_thought', 'rule', 0.82, '命中记录思考请求')
  }

  if (signals.matches.searchThoughts) {
    addCandidate(candidates, 'search_thoughts', 'rule', 0.8, '命中搜索思考库请求')
  }

  if (signals.matches.answerThoughts) {
    addCandidate(candidates, 'answer_thoughts', 'rule', 0.8, '命中基于思考库回答请求')
  }

  if (input.useKnowledgeBase && signals.matches.knowledgeQa) {
    addCandidate(candidates, 'knowledge_qa', 'rule', 0.76, '命中基于本地知识回答请求')
  }

  if (candidates.length === 0 && context.activeDomain !== 'general') {
    const stateIntentMap: Partial<Record<IntentDomain, ChatIntentName>> = {
      blog_workflow: 'write_blog',
      content_management: 'get_post_detail',
      calendar_planning: 'create_calendar_event',
      bookmark_management: 'list_bookmarks',
      thoughts_memory: 'search_thoughts',
      knowledge: 'knowledge_qa',
    }
    const fallbackIntent = stateIntentMap[context.activeDomain]
    if (fallbackIntent) {
      addCandidate(candidates, fallbackIntent, 'state', 0.45, '延续当前会话的活动领域')
    }
  }

  addCandidate(candidates, 'general_chat', 'rule', 0.35, '默认兜底为一般对话')

  candidates.sort((left, right) => right.confidence - left.confidence)

  const topIntent = candidates[0]?.intent ?? 'general_chat'
  const dangerousOperation =
    topIntent === 'publish_post' ||
    topIntent === 'update_post' ||
    topIntent === 'delete_post' ||
    topIntent === 'create_calendar_event'

  const requiresConfirmation =
    dangerousOperation &&
    (candidates[0]?.confidence ?? 0) < 0.9 &&
    !signals.matches.deleteConfirmation &&
    !signals.matches.calendarPlanAction

  return {
    candidates: candidates.slice(0, 5),
    hardGuards: {
      dangerousOperation,
      crossTaskSwitch: signals.hasCrossTaskSwitchSignal,
      requiresConfirmation,
    },
  }
}

function isKnowledgeBaseToolCall(
  toolCall: ChatToolCall
): toolCall is Extract<ChatToolCall, { tool: 'knowledge_base_search' }> {
  return toolCall.tool === 'knowledge_base_search'
}

async function invokeJsonAgent<T>(options: JsonAgentOptions<T>): Promise<T> {
  throwIfAborted(options.signal)
  const raw = await invokeChat(options.userPrompt, options.systemPrompt, {
    model: options.model ?? 'fast',
    temperature: 0.1,
    signal: options.signal,
  })
  throwIfAborted(options.signal)

  const jsonText = extractJsonObject(raw)
  if (!jsonText) {
    return options.fallback
  }

  try {
    const parsed = JSON.parse(jsonText)
    const result = options.schema.safeParse(parsed)
    return result.success ? (result.data as T) : options.fallback
  } catch {
    return options.fallback
  }
}

function isRiskyIntent(intent: ChatIntentName): boolean {
  return (
    intent === 'publish_post' ||
    intent === 'update_post' ||
    intent === 'delete_post' ||
    intent === 'create_calendar_event'
  )
}

function hasPostAnchor(context: IntentContext, latestUserMessage: string): boolean {
  return Boolean(
    context.pendingEntityType === 'post' ||
      context.pendingEntityId ||
      context.lastShownPostId ||
      extractPostQueryFromUpdateRequest(latestUserMessage) ||
      detectPostDetailSelectionMode(latestUserMessage) !== 'match_query' ||
      /(最新草稿|最新文章|这篇|上一篇|下一篇)/.test(normalizeMessageText(latestUserMessage))
  )
}

function hasCalendarAnchor(latestUserMessage: string, context: IntentContext): boolean {
  const text = normalizeMessageText(latestUserMessage)
  return (
    looksLikeTravelPlanningRequest(text) ||
    /(?:今天|明天|后天|下周|周末|今晚|上午|下午|晚上|\d{4}-\d{2}-\d{2}|\d+月\d+日)/.test(text) ||
    context.pendingAction === 'confirm_calendar_plan'
  )
}

function isEntityClaritySufficient(intent: ChatIntentName, latestUserMessage: string, context: IntentContext): boolean {
  if (intent === 'publish_post' || intent === 'update_post' || intent === 'delete_post' || intent === 'get_post_detail') {
    return hasPostAnchor(context, latestUserMessage)
  }

  if (intent === 'create_calendar_event') {
    return hasCalendarAnchor(latestUserMessage, context)
  }

  return true
}

async function reviewIntentWithLLM(input: {
  latestUserMessage: string
  conversationDigest: string
  candidates: IntentCandidate[]
  context: IntentContext
  useKnowledgeBase: boolean
  signal?: AbortSignal
}): Promise<IntentReviewResult> {
  const fallbackIntent = input.candidates[0]?.intent ?? 'general_chat'
  const fallback: IntentReviewResult = {
    intent: fallbackIntent,
    summary: getIntentSummary(fallbackIntent),
    confidence: input.candidates[0]?.confidence ?? 0.35,
    needsFollowup: false,
    followupQuestions: [],
    needPlanning: fallbackIntent !== 'general_chat',
    shouldUseKnowledgeBase:
      input.useKnowledgeBase &&
      (fallbackIntent === 'knowledge_qa' || fallbackIntent === 'analysis' || fallbackIntent === 'advice'),
    publishDirectly: false,
    reason: input.candidates[0]?.reason ?? '回退到最高优先级候选',
  }

  const systemPrompt = [
    '你是多 Agent 协作聊天系统中的 Intent Review Agent。',
    '你的输入包含：用户最新消息、紧凑对话摘要、结构化会话状态、规则候选意图。',
    '职责：复核真正用户意图，但不要被旧流程绑架。',
    '严格输出 JSON，不要输出任何额外解释。',
    '返回字段：intent, summary, confidence, needsFollowup, followupQuestions, needPlanning, shouldUseKnowledgeBase, publishDirectly, reason。',
    'intent 只允许：general_chat, knowledge_qa, analysis, creation, advice, write_blog, publish_post, update_post, delete_post, get_post_detail, list_drafts, create_calendar_event, create_thought, create_bookmark, list_bookmarks, search_thoughts, answer_thoughts。',
    '规则候选是参考，不是最终答案；如果用户明显切换到了新任务，应覆盖旧任务。',
    '只有在最新消息明显是在继续回答工作流补充问题时，才延续 write_blog。',
    '如果用户要执行发布、修改、删除、创建日程等业务操作，但目标不清楚，可以保留该意图，同时 needsFollowup=true。',
    'followupQuestions 用中文，最多 3 个。',
  ].join('\n')

  const userPrompt = JSON.stringify(
    {
      latestUserMessage: input.latestUserMessage,
      conversationDigest: input.conversationDigest,
      intentContext: summarizeIntentContext(input.context),
      candidates: input.candidates,
      useKnowledgeBase: input.useKnowledgeBase,
    },
    null,
    2
  )

  const result = await invokeJsonAgent<IntentReviewResult>({
    systemPrompt,
    userPrompt,
    fallback,
    schema: intentReviewSchema,
    model: 'fast',
    signal: input.signal,
  })

  return {
    ...result,
    followupQuestions: normalizeQuestions(result.followupQuestions),
    confidence: candidateConfidence(result.confidence),
    shouldUseKnowledgeBase: input.useKnowledgeBase && result.shouldUseKnowledgeBase,
  }
}

function finalizeIntentRoute(input: {
  latestUserMessage: string
  review: IntentReviewResult
  candidates: IntentCandidate[]
  hardGuards: IntentHardGuards
  context: IntentContext
  useKnowledgeBase: boolean
}): IntentDecision {
  const reviewedIntent = input.review.intent
  const domain = inferDomainFromIntent(reviewedIntent)
  const topCandidate = input.candidates[0]
  const confidence = candidateConfidence(Math.max(input.review.confidence, topCandidate?.confidence ?? 0.35))
  const entityClear = isEntityClaritySufficient(reviewedIntent, input.latestUserMessage, input.context)

  let confirmationRequired = false
  let forcedFollowupReason: string | null = null
  let needsFollowup = input.review.needsFollowup
  let followupQuestions = input.review.followupQuestions

  if (isRiskyIntent(reviewedIntent) && (!entityClear || input.hardGuards.requiresConfirmation || confidence < 0.72)) {
    confirmationRequired = true
    needsFollowup = true
    followupQuestions =
      followupQuestions.length > 0 ? followupQuestions : getFollowupQuestionsForIntent(reviewedIntent)
    forcedFollowupReason = !entityClear
      ? '高风险操作缺少明确目标锚点'
      : confidence < 0.72
        ? '高风险操作意图置信度不足'
        : '高风险操作需要二次确认'
  }

  if (input.hardGuards.crossTaskSwitch && input.context.activeDomain === 'blog_workflow' && reviewedIntent === 'write_blog') {
    needsFollowup = false
  }

  let pendingAction: PendingIntentAction | null = null
  let pendingEntityType: PendingIntentEntityType | null = null
  let pendingEntityId: string | null = null

  if (confirmationRequired) {
    pendingAction =
      reviewedIntent === 'delete_post'
        ? 'confirm_delete_post'
        : reviewedIntent === 'create_calendar_event'
          ? 'confirm_calendar_plan'
          : reviewedIntent === 'update_post'
            ? 'update_post_followup'
            : 'tool_followup'
  } else if (reviewedIntent === 'write_blog' && needsFollowup) {
    pendingAction = 'blog_workflow_followup'
    pendingEntityType = 'workflow'
  }

  if (
    reviewedIntent === 'get_post_detail' ||
    reviewedIntent === 'update_post' ||
    reviewedIntent === 'delete_post' ||
    reviewedIntent === 'publish_post'
  ) {
    pendingEntityType = 'post'
    pendingEntityId = input.context.pendingEntityId ?? input.context.lastShownPostId
  } else if (reviewedIntent === 'create_calendar_event') {
    pendingEntityType = 'calendar_event'
  } else if (reviewedIntent === 'create_bookmark' || reviewedIntent === 'list_bookmarks') {
    pendingEntityType = 'bookmark'
  } else if (reviewedIntent === 'create_thought' || reviewedIntent === 'search_thoughts' || reviewedIntent === 'answer_thoughts') {
    pendingEntityType = 'thought'
  }

  return {
    intent: reviewedIntent,
    summary: input.review.summary?.trim() || getIntentSummary(reviewedIntent),
    needsFollowup,
    followupQuestions: normalizeQuestions(followupQuestions),
    needPlanning: needsFollowup ? false : input.review.needPlanning,
    shouldUseKnowledgeBase: input.useKnowledgeBase && input.review.shouldUseKnowledgeBase,
    publishDirectly: input.review.publishDirectly,
    confidence,
    candidateTrace: input.candidates,
    domain,
    confirmationRequired,
    forcedFollowupReason,
    statePatch: {
      activeDomain: domain,
      pendingAction,
      pendingEntityType,
      pendingEntityId,
      lastOperationCardScope:
        pendingAction === 'blog_workflow_followup'
          ? 'workflow'
          : pendingAction
            ? 'tool'
            : null,
      lastUserGoalSummary: input.review.summary?.trim() || getIntentSummary(reviewedIntent),
      confidenceMode: confirmationRequired ? 'cautious' : 'normal',
    },
  }
}

export async function runIntentRecognitionAgent(input: {
  conversationText: string
  latestUserMessage: string
  useKnowledgeBase: boolean
  context: IntentContext
  signal?: AbortSignal
}): Promise<IntentDecision> {
  const signals = extractIntentSignals({
    latestUserMessage: input.latestUserMessage,
    context: input.context,
  })

  const { candidates, hardGuards } = buildIntentCandidates({
    signals,
    context: input.context,
    useKnowledgeBase: input.useKnowledgeBase,
  })

  const review = await reviewIntentWithLLM({
    latestUserMessage: input.latestUserMessage,
    conversationDigest: input.conversationText,
    candidates,
    context: input.context,
    useKnowledgeBase: input.useKnowledgeBase,
    signal: input.signal,
  })

  return finalizeIntentRoute({
    latestUserMessage: input.latestUserMessage,
    review,
    candidates,
    hardGuards,
    context: input.context,
    useKnowledgeBase: input.useKnowledgeBase,
  })
}

export async function runTaskPlanningAgent(input: {
  conversationText: string
  latestUserMessage: string
  intent: ChatIntentRecognition
  skillPrompt?: string
  signal?: AbortSignal
}): Promise<ChatTaskPlan> {
  const fallback: ChatTaskPlan = {
    goal: input.intent.summary || '回答用户问题',
    subtasks: ['理解用户诉求', '结合历史上下文回答'],
    answerStrategy: '优先直接回答，信息不足时再说明限制。',
    responseStyle: '简洁、直接、可执行',
    constraints: [],
    needsFollowup: input.intent.needsFollowup,
    followupQuestions: input.intent.followupQuestions,
    toolHint: input.intent.shouldUseKnowledgeBase ? '优先检索本地知识库' : '',
  }

  const systemPrompt = [
    '你是多 Agent 协作聊天系统中的 Planner Agent。',
    '职责：把当前任务拆解成执行步骤，并再次判断是否必须追问用户。',
    '严格输出 JSON，不要输出任何额外解释。',
    '返回字段：goal, subtasks, answerStrategy, responseStyle, constraints, needsFollowup, followupQuestions, toolHint。',
    'subtasks 最多 5 条，每条都是一句简短中文动作。',
    '除非确实缺少关键信息，否则不要追问；已经在历史对话里出现过的信息不要重复追问。',
    '如果可以直接回答，请将 needsFollowup 设为 false。',
    input.skillPrompt?.trim() || '',
  ].join('\n')

  const userPrompt = JSON.stringify(
    {
      latestUserMessage: input.latestUserMessage,
      conversationText: input.conversationText,
      intent: input.intent,
    },
    null,
    2
  )

  const result = await invokeJsonAgent<ChatTaskPlan>({
    systemPrompt,
    userPrompt,
    fallback,
    schema: chatTaskPlanSchema,
    model: 'fast',
    signal: input.signal,
  })

  return {
    ...result,
    followupQuestions: normalizeQuestions(result.followupQuestions),
  }
}

export async function runToolRoutingAgent(input: {
  conversationText: string
  latestUserMessage: string
  intent: ChatIntentRecognition
  plan: ChatTaskPlan
  availableTools: ChatToolName[]
  skillPrompt?: string
  signal?: AbortSignal
}): Promise<ChatToolPlan> {
  if (input.availableTools.length === 0) {
    return {
      shouldUseTools: false,
      toolCalls: [],
    }
  }

  const fallback: ChatToolPlan = {
    shouldUseTools: input.intent.shouldUseKnowledgeBase,
    toolCalls: input.intent.shouldUseKnowledgeBase
      ? [
          {
            tool: 'knowledge_base_search',
            query: input.latestUserMessage.slice(0, 200),
            limit: 6,
            reason: '用户问题可能依赖本地知识库内容',
          },
        ]
      : [],
  }

  const systemPrompt = [
    '你是多 Agent 协作聊天系统中的 Tool Agent。',
    '职责：决定当前是否需要调用工具，以及要调用什么工具。',
    '严格输出 JSON，不要输出任何额外解释。',
    '返回字段：shouldUseTools, toolCalls。',
    '如果返回 knowledge_base_search，则字段必须是 tool, query, limit, reason。',
    '只有在工具能明显提升答案质量时才调用；无必要时返回空数组。',
    '如果当前可用工具只有 knowledge_base_search，则只能返回该工具，它表示检索本地博客、历史对话和 PDF 知识库。',
    'query 要简洁，limit 为 1 到 8 的整数。',
    input.skillPrompt?.trim() || '',
  ].join('\n')

  const userPrompt = JSON.stringify(
    {
      latestUserMessage: input.latestUserMessage,
      conversationText: input.conversationText,
      intent: input.intent,
      plan: input.plan,
      availableTools: input.availableTools,
    },
    null,
    2
  )

  const result = await invokeJsonAgent<ChatToolPlan>({
    systemPrompt,
    userPrompt,
    fallback,
    schema: toolPlanSchema,
    model: 'fast',
    signal: input.signal,
  })

  const toolCalls = result.toolCalls
    .filter((call) => input.availableTools.includes(call.tool))
    .filter(isKnowledgeBaseToolCall)
    .filter((call) => Boolean(call.query.trim()))

  return {
    shouldUseTools: result.shouldUseTools && toolCalls.length > 0,
    toolCalls,
  }
}

export function resolveExecutionRoute(intent: ChatIntentName): ChatExecutionRoute {
  if (intent === 'write_blog') {
    return 'blog_workflow'
  }

  if (
    intent === 'publish_post' ||
    intent === 'update_post' ||
    intent === 'delete_post' ||
    intent === 'get_post_detail' ||
    intent === 'list_drafts' ||
    intent === 'create_calendar_event' ||
    intent === 'create_thought' ||
    intent === 'create_bookmark' ||
    intent === 'list_bookmarks' ||
    intent === 'search_thoughts' ||
    intent === 'answer_thoughts'
  ) {
    return 'tool'
  }

  return 'respond'
}

function getFallbackBusinessToolCall(intent: ChatIntentRecognition, latestUserMessage: string): ChatToolCall | null {
  if (intent.intent === 'publish_post') {
    return {
      tool: 'publish_post',
      postQuery: latestUserMessage.slice(0, 200),
      strategy: 'latest_draft',
      reason: '用户要求发布现有文章或草稿',
    }
  }

  if (intent.intent === 'update_post') {
    const structuredFields = extractStructuredUpdateFields(latestUserMessage)
    return {
      tool: 'update_post',
      postQuery: extractPostQueryFromUpdateRequest(latestUserMessage),
      title: structuredFields.title,
      excerpt: structuredFields.excerpt,
      content: structuredFields.content,
      appendContent: structuredFields.appendContent,
      editInstruction: structuredFields.editInstruction,
      publishAction: structuredFields.publishAction,
      reason: '用户要求修改现有文章',
    }
  }

  if (intent.intent === 'delete_post') {
    return {
      tool: 'delete_post',
      postQuery: latestUserMessage.slice(0, 200),
      reason: '用户要求删除文章',
    }
  }

  if (intent.intent === 'get_post_detail') {
    return {
      tool: 'get_post_detail',
      postQuery: latestUserMessage.slice(0, 200),
      selectionMode: detectPostDetailSelectionMode(latestUserMessage),
      includeContent: true,
      reason: '用户要求查看文章详情',
    }
  }

  if (intent.intent === 'list_drafts') {
    return {
      tool: 'list_drafts',
      query: latestUserMessage.slice(0, 200),
      limit: 5,
      reason: '用户要求查看草稿列表',
    }
  }

  if (intent.intent === 'create_calendar_event') {
    const normalized = normalizeMessageText(latestUserMessage)
    const planningMode = /^确认创建日程计划(?:\s.*)?$/.test(normalized)
      ? 'confirm'
      : /^取消创建日程计划(?:\s.*)?$/.test(normalized)
        ? 'cancel'
        : looksLikeTravelPlanningRequest(normalized) ||
            looksLikeCalendarPlanAction(normalized) ||
            /(?:推荐(?:一下)?|推荐较为详细|详细行程|行程推荐|路线推荐|攻略|怎么玩|怎么逛|怎么安排|安排一下行程|规划一下行程)/.test(
              normalized
            )
          ? 'plan'
          : 'quick_create'
    return {
      tool: 'create_calendar_event',
      rawText: latestUserMessage.trim().slice(0, 5000),
      planningMode,
      reason: '用户要求创建日程、提醒或待办安排',
    }
  }

  if (intent.intent === 'create_thought') {
    return {
      tool: 'create_thought',
      content: latestUserMessage.trim().slice(0, 20000),
      reason: '用户要求记录一条思考',
    }
  }

  if (intent.intent === 'create_bookmark') {
    return {
      tool: 'save_bookmark_from_url',
      title: '',
      url: '',
      notes: '',
      category: '',
      tags: [],
      reason: '用户要求保存一个收藏',
    }
  }

  if (intent.intent === 'list_bookmarks') {
    return {
      tool: 'list_bookmarks',
      query: latestUserMessage.slice(0, 200),
      category: '',
      limit: 5,
      reason: '用户要求查看收藏列表',
    }
  }

  if (intent.intent === 'search_thoughts') {
    return {
      tool: 'search_thoughts',
      query: latestUserMessage.trim().slice(0, 500),
      limit: 5,
      reason: '用户要求搜索思考库',
    }
  }

  if (intent.intent === 'answer_thoughts') {
    return {
      tool: 'answer_thoughts',
      query: latestUserMessage.trim().slice(0, 500),
      limit: 5,
      reason: '用户要求基于思考库回答问题',
    }
  }

  return null
}

export async function runBusinessToolAgent(input: {
  conversationText: string
  latestUserMessage: string
  intent: ChatIntentRecognition
  availableTools: ChatToolName[]
  skillPrompt?: string
  signal?: AbortSignal
}): Promise<ChatToolCall | null> {
  const fallback = getFallbackBusinessToolCall(input.intent, input.latestUserMessage)
  if (!fallback || !input.availableTools.includes(fallback.tool)) {
    return null
  }

  if (input.intent.intent === 'delete_post') {
    return fallback
  }

  if (
    input.intent.intent === 'create_calendar_event' &&
    'planningMode' in fallback &&
    (fallback.planningMode === 'confirm' || fallback.planningMode === 'cancel')
  ) {
    return fallback
  }

  if (input.intent.intent === 'list_drafts' && looksLikeGenericDraftListRequest(input.latestUserMessage)) {
    return {
      tool: 'list_drafts',
      query: '',
      limit: 5,
      reason: '用户要求查看草稿列表',
    }
  }

  if (
    input.intent.intent === 'list_bookmarks' &&
    looksLikeGenericBookmarkListRequest(input.latestUserMessage)
  ) {
    return {
      tool: 'list_bookmarks',
      query: '',
      category: '',
      limit: 5,
      reason: '用户要求查看收藏列表',
    }
  }

  const systemPrompt = [
    '你是多 Agent 协作聊天系统中的 Business Tool Agent。',
    '职责：根据当前意图，把用户请求转换成一个可执行的业务工具调用。',
    '严格输出 JSON，不要输出任何额外解释。',
    '只允许返回一个工具调用对象，不要返回数组。',
    '可用工具如下：',
    '- publish_post: 字段 tool, postQuery, strategy, reason。strategy 只允许 latest_draft 或 match_query。',
    '- update_post: 字段 tool, postQuery, title, excerpt, content, appendContent, editInstruction, publishAction, reason。publishAction 只允许 keep, publish, unpublish。',
    '- delete_post: 字段 tool, postQuery, reason。',
    '- get_post_detail: 字段 tool, postQuery, selectionMode, includeContent, reason。selectionMode 只允许 match_query, latest, previous, next。',
    '- list_drafts: 字段 tool, query, limit, reason。',
    '- create_calendar_event: 字段 tool, rawText, planningMode, defaultDate, reason。planningMode 只允许 plan, quick_create, confirm, cancel。用于区分“先生成规划方案”“直接创建单条日程”“确认待写入的规划”“取消待确认规划”。',
    '- create_thought: 字段 tool, content, reason。',
    '- save_bookmark_from_url: 字段 tool, title, url, notes, category, tags, reason。',
    '- list_bookmarks: 字段 tool, query, category, limit, reason。',
    '- search_thoughts: 字段 tool, query, limit, reason。',
    '- answer_thoughts: 字段 tool, query, limit, reason。',
    '如果信息不全，尽量提取已有内容；无法确定的字段留空字符串或空数组，不要编造。',
    '当用户明确表达“加入日历/添加提醒/安排到某天/记录待办”等意图时，优先使用 create_calendar_event。',
    '如果用户是在要方案、推荐、攻略、详细行程、路线安排、多天规划，而不是要立刻写入一条事件，create_calendar_event 必须返回 planningMode=plan。',
    '如果用户是在点击确认规划卡后的确认消息，create_calendar_event 返回 planningMode=confirm。',
    '如果用户是在取消待确认规划，create_calendar_event 返回 planningMode=cancel。',
    '只有当用户明确是单条事项落日历时，create_calendar_event 才返回 planningMode=quick_create。',
    'create_calendar_event 的 rawText 应尽量保留用户原始表达，方便下游解析日期、类型和标题；如果上下文里已经给了明确日期，也可以写入 defaultDate（YYYY-MM-DD）。',
    'save_bookmark_from_url 的 url 必须来自用户输入或上下文，不要虚构链接。',
    'update_post 至少应提供 postQuery 或让系统可以默认选择最近草稿；同时尽量抽取用户真正要改动的字段。',
    '如果用户给的是自然语言修改要求，例如“把结尾改得更有力量”“润色一下摘要”，而不是直接给出最终文案，请把原话放进 editInstruction。',
    '如果对话刚刚在追问文章修改内容，用户这次补充的短句通常仍然是 update_post，不要误判成普通聊天。',
    'delete_post 是危险操作，应尽量提取明确的文章标识；如果没有足够信息，postQuery 留空，由执行层追问。',
    '当用户说“最新一篇文章/最新文章/最近一篇”时，get_post_detail 应返回 selectionMode=latest。',
    '当用户说“上一篇/前一篇/上篇”时，get_post_detail 应返回 selectionMode=previous。',
    '当用户说“下一篇/后一篇/下篇”时，get_post_detail 应返回 selectionMode=next。',
    '只有当用户给出明确标题、slug、id 或其他明确标识时，get_post_detail 才使用 selectionMode=match_query，并尽量提取到 postQuery。',
    '如果最近助手已经给出待删除文章并要求二次确认，而用户这次是在明确确认删除，仍返回 delete_post；postQuery 尽量提取那篇文章的 id、slug 或标题。',
    `当前允许的工具：${input.availableTools.join(', ') || '无'}`,
    input.skillPrompt?.trim() || '',
  ].join('\n')

  const userPrompt = JSON.stringify(
    {
      latestUserMessage: input.latestUserMessage,
      conversationText: input.conversationText,
      intent: input.intent,
    },
    null,
    2
  )

  const result = await invokeJsonAgent<ChatToolCall>({
    systemPrompt,
    userPrompt,
    fallback,
    schema: toolCallSchema,
    model: 'fast',
    signal: input.signal,
  })

  return input.availableTools.includes(result.tool) ? result : fallback
}

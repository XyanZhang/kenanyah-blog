import { z } from 'zod'
import { throwIfAborted } from '../lib/abort'
import { invokeChat, type LlmModelPurpose } from '../lib/llm'

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

function hasPendingDeleteConfirmation(conversationText: string): boolean {
  return (
    conversationText.includes('删除对象 ID：') &&
    conversationText.includes('如果确认删除，请回复：确认删除')
  )
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

function hasPendingPostUpdateFollowup(conversationText: string): boolean {
  return (
    conversationText.includes('更新文章前还需要补充修改内容') ||
    conversationText.includes('请告诉我这次具体要改哪些字段') ||
    conversationText.includes('你想修改标题、摘要、正文，还是发布状态')
  )
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

function hasPendingBlogWorkflowFollowup(conversationText: string): boolean {
  return (
    conversationText.includes('【OPERATION_CARD】') &&
    conversationText.includes('"scope":"workflow"') &&
    conversationText.includes('"submitMode":"workflow"')
  )
}

function buildFastIntentRecognition(intent: ChatIntentName, summary: string): ChatIntentRecognition {
  return {
    intent,
    summary,
    needsFollowup: false,
    followupQuestions: [],
    needPlanning: false,
    shouldUseKnowledgeBase: false,
    publishDirectly: false,
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

export async function runIntentRecognitionAgent(input: {
  conversationText: string
  latestUserMessage: string
  useKnowledgeBase: boolean
  signal?: AbortSignal
}): Promise<ChatIntentRecognition> {
  const fallback: ChatIntentRecognition = {
    intent: 'general_chat',
    summary: '一般对话',
    needsFollowup: false,
    followupQuestions: [],
    needPlanning: true,
    shouldUseKnowledgeBase: false,
    publishDirectly: false,
  }

  if (
    hasPendingDeleteConfirmation(input.conversationText) &&
    looksLikeDeleteConfirmation(input.latestUserMessage)
  ) {
    return buildFastIntentRecognition('delete_post', '确认删除文章')
  }

  if (looksLikeDeleteRequest(input.latestUserMessage)) {
    return buildFastIntentRecognition('delete_post', '删除文章')
  }

  if (
    hasPendingPostUpdateFollowup(input.conversationText) ||
    looksLikeUpdatePostRequest(input.latestUserMessage)
  ) {
    return buildFastIntentRecognition('update_post', '修改现有文章')
  }

  if (looksLikeGenericDraftListRequest(input.latestUserMessage)) {
    return buildFastIntentRecognition('list_drafts', '查看草稿列表')
  }

  if (looksLikeGenericBookmarkListRequest(input.latestUserMessage)) {
    return buildFastIntentRecognition('list_bookmarks', '查看收藏列表')
  }

  if (looksLikeCalendarPlanAction(input.latestUserMessage)) {
    return buildFastIntentRecognition('create_calendar_event', '处理待确认日程计划')
  }

  if (looksLikeCalendarEventRequest(input.latestUserMessage)) {
    return buildFastIntentRecognition('create_calendar_event', '创建日程安排')
  }

  if (looksLikeTravelPlanningRequest(input.latestUserMessage)) {
    return buildFastIntentRecognition('create_calendar_event', '规划旅行或多日行程')
  }

  const hasBlogWorkflowFollowup = hasPendingBlogWorkflowFollowup(input.conversationText)

  const systemPrompt = [
    '你是多 Agent 协作聊天系统中的 Intent Agent。',
    '职责：识别用户当前意图、总结目标，并判断是否缺少关键上下文。',
    '严格输出 JSON，不要输出任何额外解释。',
    '返回字段：intent, summary, needsFollowup, followupQuestions, needPlanning, shouldUseKnowledgeBase, publishDirectly。',
    'intent 只允许：general_chat, knowledge_qa, analysis, creation, advice, write_blog, publish_post, update_post, delete_post, get_post_detail, list_drafts, create_calendar_event, create_thought, create_bookmark, list_bookmarks, search_thoughts, answer_thoughts。',
    '只有当缺少关键信息且会明显影响回答质量时，needsFollowup 才能为 true。',
    'followupQuestions 用中文，最多 3 个短问题。',
    '如果用户要写博客、生成文章、继续补充博客生成信息、保存博客草稿或发布博客，归类为 write_blog。',
    '如果用户要发布现有草稿/文章，而不是新写一篇，归类为 publish_post。',
    '如果用户要修改、补充、润色、改标题、追加内容到现有文章，归类为 update_post。',
    '如果用户要删除文章，归类为 delete_post。',
    '如果最近助手已经要求用户二次确认删除某篇文章，而用户这次是在明确确认删除，也归类为 delete_post。',
    '如果用户要查看某篇文章详情、状态、内容、链接，归类为 get_post_detail。',
    '如果用户要查看、列出、找出当前草稿列表，归类为 list_drafts。',
    '如果用户要把事项加入日历、创建提醒、安排某天要做什么、记录日程/待办，归类为 create_calendar_event。',
    '如果用户要记录一条想法/动态/思考，归类为 create_thought。',
    '如果用户要保存网址/链接/收藏，归类为 create_bookmark。',
    '如果用户要查看收藏列表，归类为 list_bookmarks。',
    '如果用户要在思考库里查找、搜索、回忆过往想法，归类为 search_thoughts。',
    '如果用户要基于思考库直接回答一个问题，归类为 answer_thoughts。',
    '如果用户在规划旅行、旅游、出行、路线、攻略、多天行程，即使最终结果像一份文案，也优先归类为 create_calendar_event，而不是 write_blog。',
    '如果本轮允许使用本地知识库，且用户问题明显依赖本地博客/历史对话/PDF 资料，shouldUseKnowledgeBase 设为 true。',
    '只有当用户明确表达“直接发布”“立即发布”“上线”这类意图时，publishDirectly 才设为 true。',
    hasBlogWorkflowFollowup
      ? '最近对话里存在博客工作流补充信息卡片。只有当用户这次明显是在继续回答这些补充问题时，才归类为 write_blog；如果用户发起了一个新的独立请求，例如旅行规划、日程安排、收藏管理，就按新请求分类。'
      : '',
  ].join('\n')

  const userPrompt = JSON.stringify(
    {
      latestUserMessage: input.latestUserMessage,
      conversationText: input.conversationText,
      useKnowledgeBase: input.useKnowledgeBase,
    },
    null,
    2
  )

  const result = await invokeJsonAgent<ChatIntentRecognition>({
    systemPrompt,
    userPrompt,
    fallback,
    schema: chatIntentSchema,
    model: 'fast',
    signal: input.signal,
  })

  return {
    ...result,
    followupQuestions: normalizeQuestions(result.followupQuestions),
    shouldUseKnowledgeBase: input.useKnowledgeBase && result.shouldUseKnowledgeBase,
  }
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
    return {
      tool: 'create_calendar_event',
      rawText: latestUserMessage.trim().slice(0, 5000),
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

  if (input.intent.intent === 'create_calendar_event') {
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
    '- create_calendar_event: 字段 tool, rawText, defaultDate, reason。用于把用户的原始安排写入日历/日程系统；它还会自动推断是普通事件、博客草稿、想法、项目或照片事项。',
    '- create_thought: 字段 tool, content, reason。',
    '- save_bookmark_from_url: 字段 tool, title, url, notes, category, tags, reason。',
    '- list_bookmarks: 字段 tool, query, category, limit, reason。',
    '- search_thoughts: 字段 tool, query, limit, reason。',
    '- answer_thoughts: 字段 tool, query, limit, reason。',
    '如果信息不全，尽量提取已有内容；无法确定的字段留空字符串或空数组，不要编造。',
    '当用户明确表达“加入日历/添加提醒/安排到某天/记录待办”等意图时，优先使用 create_calendar_event。',
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

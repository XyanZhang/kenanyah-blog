import { z } from 'zod'
import { generateSlug } from '@blog/utils'
import { Prisma } from '../generated/prisma/client/client'
import { ThoughtsRagAgent } from '../agents/thoughts-rag-agent'
import { type ChatToolCall } from '../agents/chat-coordinator-agents'
import { type CalendarPlanningSkillPhase } from '../agents/chat-app-skills'
import { prisma } from '../lib/db'
import { throwIfAborted } from '../lib/abort'
import { invokeChat } from '../lib/llm'
import { parseExplicitDate, toDateString } from '../lib/calendar-quick-create'
import { indexPost, removePostFromIndex } from '../lib/semantic-search'
import {
  searchSemanticAll,
  type PdfSemanticHit,
  type SemanticSearchHit,
} from '../lib/semantic-search'
import {
  createQuickCalendarEntry,
  createManualEvent,
  getCalendarDay,
  removeEventsForSource,
  syncPostEvent,
  syncThoughtEvent,
} from '../lib/calendar-events'
import {
  buildCalendarScheduleConfirmOperationCardMessage,
  buildDeletePostConfirmOperationCardMessage,
  buildFollowupOperationCardMessage,
} from '../lib/operation-card'

type PublishPostToolCall = Extract<ChatToolCall, { tool: 'publish_post' }>
type UpdatePostToolCall = Extract<ChatToolCall, { tool: 'update_post' }>
type DeletePostToolCall = Extract<ChatToolCall, { tool: 'delete_post' }>
type GetPostDetailToolCall = Extract<ChatToolCall, { tool: 'get_post_detail' }>
type ListDraftsToolCall = Extract<ChatToolCall, { tool: 'list_drafts' }>
type CreateCalendarEventToolCall = Extract<ChatToolCall, { tool: 'create_calendar_event' }>
type CreateThoughtToolCall = Extract<ChatToolCall, { tool: 'create_thought' }>
type SaveBookmarkFromUrlToolCall = Extract<ChatToolCall, { tool: 'save_bookmark_from_url' }>
type ListBookmarksToolCall = Extract<ChatToolCall, { tool: 'list_bookmarks' }>
type SearchThoughtsToolCall = Extract<ChatToolCall, { tool: 'search_thoughts' }>
type AnswerThoughtsToolCall = Extract<ChatToolCall, { tool: 'answer_thoughts' }>

const thoughtsRagAgent = new ThoughtsRagAgent()
const SCHEDULE_PLAN_CONFIRM_PREFIX = '确认创建日程计划'

const calendarSchedulePlanSchema = z.object({
  summary: z.string().trim().min(1).max(120).catch('日程安排方案'),
  rationale: z.string().trim().min(1).max(240).catch('按优先级和执行顺序安排。'),
  items: z
    .array(
      z.object({
        title: z.string().trim().min(1).max(120),
        description: z.string().trim().max(240).catch(''),
        implementationAdvice: z.string().trim().max(320).catch(''),
      })
    )
    .min(1)
    .max(6)
    .catch([]),
})

type CalendarSchedulePlan = z.infer<typeof calendarSchedulePlanSchema>
type PendingCalendarSchedulePlan = {
  version: 1
  date: string
  sourceMessage: string
  rationale: string
  items: Array<{
    title: string
    description?: string
    implementationAdvice?: string
  }>
}

type CalendarPlanningPhaseEvent = {
  phase: CalendarPlanningSkillPhase
  label: string
}

type PlanningReferenceHit = SemanticSearchHit | PdfSemanticHit

export type BusinessToolExecutionResult =
  | {
      tool: 'publish_post'
      status: 'published' | 'already_published' | 'not_found'
      summary: string
      assistantMessage?: string
      followupQuestions?: string[]
      post?: {
        id: string
        slug: string
        title: string
        published: boolean
      }
      postUrl?: string
    }
  | {
      tool: 'update_post'
      status: 'updated' | 'need_more_info' | 'not_found'
      summary: string
      assistantMessage?: string
      followupQuestions?: string[]
      post?: {
        id: string
        slug: string
        title: string
        published: boolean
      }
      postUrl?: string
    }
  | {
      tool: 'delete_post'
      status: 'deleted' | 'need_more_info' | 'not_found'
      summary: string
      assistantMessage?: string
      followupQuestions?: string[]
    }
  | {
      tool: 'get_post_detail'
      status: 'found' | 'not_found'
      summary: string
      assistantMessage?: string
      post?: {
        id: string
        slug: string
        title: string
        excerpt: string | null
        published: boolean
        createdAt: string
        updatedAt: string
        postUrl: string
        editUrl: string
      }
    }
  | {
      tool: 'list_drafts'
      status: 'listed' | 'empty'
      summary: string
      assistantMessage?: string
      drafts?: Array<{
        id: string
        title: string
        updatedAt: string
        editUrl: string
      }>
    }
  | {
      tool: 'create_calendar_event'
      status: 'created' | 'need_more_info' | 'cancelled'
      summary: string
      assistantMessage?: string
      skillPhases?: CalendarPlanningPhaseEvent[]
      followupQuestions?: string[]
      event?: {
        id: string
        title: string
        date: string
        status: string
        jumpUrl: string | null
      }
      createdEvents?: Array<{
        id: string
        title: string
        date: string
        jumpUrl: string | null
      }>
      linkedEntity?: {
        type: 'post' | 'thought' | 'project' | 'photo'
        id: string
        jumpUrl: string | null
      } | null
    }
  | {
      tool: 'create_thought'
      status: 'created' | 'need_more_info'
      summary: string
      assistantMessage?: string
      followupQuestions?: string[]
      thought?: {
        id: string
        content: string
      }
    }
  | {
      tool: 'save_bookmark_from_url'
      status: 'created' | 'updated' | 'need_more_info'
      summary: string
      assistantMessage?: string
      followupQuestions?: string[]
      bookmark?: {
        id: string
        title: string
        url: string
      }
    }
  | {
      tool: 'list_bookmarks'
      status: 'listed' | 'empty'
      summary: string
      assistantMessage?: string
      bookmarks?: Array<{
        id: string
        title: string
        url: string
        category: string | null
        createdAt: string
      }>
    }
  | {
      tool: 'search_thoughts'
      status: 'found' | 'empty' | 'need_more_info'
      summary: string
      assistantMessage?: string
      followupQuestions?: string[]
      hits?: Array<{
        thoughtId: string
        title: string
        snippet: string
        score: number
      }>
    }
  | {
      tool: 'answer_thoughts'
      status: 'answered' | 'need_more_info'
      summary: string
      assistantMessage?: string
      followupQuestions?: string[]
      answer?: string
      hits?: Array<{
        thoughtId: string
        title: string
        snippet: string
        score: number
      }>
    }

function buildPostUrl(siteBaseUrl: string, slugOrId: string): string {
  return `${siteBaseUrl.replace(/\/+$/, '')}/posts/${slugOrId}`
}

function buildPostEditUrl(siteBaseUrl: string, id: string): string {
  return `${siteBaseUrl.replace(/\/+$/, '')}/blog/editor/${id}`
}

function isLikelyHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function normalizeMessageText(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function isExplicitDeleteConfirmation(latestUserMessage: string): boolean {
  const text = normalizeMessageText(latestUserMessage)
  return /^(确认删除|确定删除|确认删掉|确定删掉|确认移除|确定移除)(?:[:：\s].*|$)/.test(text)
}

function extractDeleteTargetFromConfirmation(latestUserMessage: string): string {
  const text = normalizeMessageText(latestUserMessage)
  const match = text.match(
    /^(?:确认删除|确定删除|确认删掉|确定删掉|确认移除|确定移除)(?:[:：\s]+(.+))?$/
  )
  return match?.[1]?.trim() || ''
}

function extractDeleteTargetFromRequest(latestUserMessage: string): string {
  const text = normalizeMessageText(latestUserMessage)
  const quotedMatch =
    text.match(/《([^》]+)》/) ||
    text.match(/“([^”]+)”/) ||
    text.match(/"([^"]+)"/) ||
    text.match(/'([^']+)'/)

  if (quotedMatch?.[1]?.trim()) {
    return quotedMatch[1].trim()
  }

  const match =
    text.match(/(?:删除|删掉|删了|移除)(?:这篇|这个)?(?:文章|博客|博文|帖子)?(?:[:：\s]+)(.+)$/) ||
    text.match(/^把(.+?)(?:删除|删掉|移除)(?:一下)?$/)

  return match?.[1]?.trim() || ''
}

function extractPendingDeletePostQuery(conversationText: string): string {
  const idMatches = [...conversationText.matchAll(/删除对象 ID：([^\n]+)/g)]
  if (idMatches.length > 0) {
    return idMatches[idMatches.length - 1]?.[1]?.trim() || ''
  }

  const confirmMatches = [...conversationText.matchAll(/如果确认删除，请回复：确认删除\s+([^\n]+)/g)]
  if (confirmMatches.length > 0) {
    return confirmMatches[confirmMatches.length - 1]?.[1]?.trim() || ''
  }

  return ''
}

function resolveDeletePostQuery(input: {
  toolPostQuery: string
  latestUserMessage: string
  conversationText: string
}): string {
  const confirmationTarget = extractDeleteTargetFromConfirmation(input.latestUserMessage)
  if (confirmationTarget) {
    return confirmationTarget
  }

  if (isExplicitDeleteConfirmation(input.latestUserMessage)) {
    const pendingTarget = extractPendingDeletePostQuery(input.conversationText)
    if (pendingTarget) {
      return pendingTarget
    }
  }

  const normalizedToolPostQuery = input.toolPostQuery.trim()
  const normalizedMessage = normalizeMessageText(input.latestUserMessage)
  if (normalizedToolPostQuery && normalizedToolPostQuery !== normalizedMessage) {
    return normalizedToolPostQuery
  }

  const requestTarget = extractDeleteTargetFromRequest(input.latestUserMessage)
  if (requestTarget) {
    return requestTarget
  }

  return normalizedToolPostQuery
}

async function findUserPost(input: {
  userId: string
  postQuery: string
  preferDraft?: boolean
  signal?: AbortSignal
}) {
  throwIfAborted(input.signal)
  const postQuery = input.postQuery.trim()

  const buildWhere = (draftOnly: boolean) => ({
    authorId: input.userId,
    ...(draftOnly ? { published: false } : {}),
    ...(postQuery
      ? {
          OR: [
            { id: postQuery },
            { slug: { equals: postQuery, mode: 'insensitive' as const } },
            { title: { contains: postQuery, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  })

  if (postQuery) {
    if (input.preferDraft !== false) {
      const draftMatch = await prisma.post.findFirst({
        where: buildWhere(true),
        orderBy: { updatedAt: 'desc' },
      })
      if (draftMatch) return draftMatch
    }

    return prisma.post.findFirst({
      where: buildWhere(false),
      orderBy: { updatedAt: 'desc' },
    })
  }

  if (input.preferDraft !== false) {
    const latestDraft = await prisma.post.findFirst({
      where: {
        authorId: input.userId,
        published: false,
      },
      orderBy: { updatedAt: 'desc' },
    })
    if (latestDraft) return latestDraft
  }

  return prisma.post.findFirst({
    where: {
      authorId: input.userId,
    },
    orderBy: { updatedAt: 'desc' },
  })
}

async function ensureUniqueSlugForPost(title: string, currentPostId: string): Promise<string> {
  const baseSlug = generateSlug(title) || `post-${Date.now()}`
  let slug = baseSlug
  const existing = await prisma.post.findUnique({
    where: { slug },
    select: { id: true },
  })

  if (existing && existing.id !== currentPostId) {
    slug = `${baseSlug}-${Date.now()}`
  }

  return slug
}

function extractBookmarkTitleFromUrl(url: string): string {
  try {
    const parsed = new URL(url)
    return parsed.hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

function extractJsonObject(text: string): string | null {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) {
    return null
  }
  return text.slice(start, end + 1)
}

function compactText(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function shouldRetrievePlanningContext(input: {
  rawText: string
  conversationText: string
  useKnowledgeBase: boolean
}): boolean {
  if (input.useKnowledgeBase) {
    return true
  }

  const text = compactText(`${input.rawText}\n${input.conversationText}`)
  return /之前|上次|历史|延续|沿用|参考|结合|这个页面|这个方案|这套流程|项目里/.test(text)
}

function formatPlanningReferenceSource(hit: PlanningReferenceHit): string {
  if (hit.type === 'post') {
    return `博客文章:${hit.slug ?? hit.postId ?? ''}`
  }

  if (hit.type === 'conversation') {
    return `历史对话:${hit.conversationId ?? ''}`
  }

  if (hit.type === 'pdf') {
    return `PDF:${hit.documentId}#${hit.chunkIndex}`
  }

  return '未知来源'
}

function formatPlanningReferences(hits: PlanningReferenceHit[]): string {
  if (hits.length === 0) {
    return '未检索到可复用的本地知识或历史记录。'
  }

  return hits
    .map(
      (hit, index) =>
        `[${index + 1}] 来源：${formatPlanningReferenceSource(hit)}\n标题：${hit.title}\n相关度：${Number(hit.score).toFixed(3)}\n片段：${compactText(hit.snippet).slice(0, 220)}`
    )
    .join('\n\n')
}

async function loadPlanningReferences(input: {
  rawText: string
  conversationText: string
  useKnowledgeBase: boolean
  signal?: AbortSignal
}): Promise<PlanningReferenceHit[]> {
  if (!shouldRetrievePlanningContext(input)) {
    return []
  }

  const query = compactText(input.rawText).slice(0, 200)
  if (!query) {
    return []
  }

  throwIfAborted(input.signal)
  try {
    const hits = await searchSemanticAll(query, 4)
    throwIfAborted(input.signal)
    return hits.filter((hit) => Number(hit.score) > 0.2).slice(0, 4)
  } catch (error) {
    console.warn('[chat-tools] load planning references failed:', error)
    return []
  }
}

function looksLikeSchedulePlanningRequest(rawText: string): boolean {
  const text = compactText(rawText)
  return (
    /(?:帮我|请)?(?:安排|规划|梳理|排一下|排个|计划一下|排期|统筹)/.test(text) ||
    /(?:合理安排|怎么安排|如何安排|做事顺序|执行顺序)/.test(text) ||
    (/[，、；;]/.test(text) && /(?:今天|明天|后天|本周|下周|日程|计划|待办)/.test(text))
  )
}

function looksLikeSchedulePlanConfirmation(rawText: string): boolean {
  return new RegExp(`^${SCHEDULE_PLAN_CONFIRM_PREFIX}(?:\\s.*)?$`).test(compactText(rawText))
}

function looksLikeSchedulePlanCancellation(rawText: string): boolean {
  return /^取消创建日程计划(?:\s.*)?$/.test(compactText(rawText))
}

function encodePendingCalendarSchedulePlan(plan: PendingCalendarSchedulePlan): string {
  return Buffer.from(JSON.stringify(plan), 'utf8').toString('base64url')
}

function parsePendingCalendarSchedulePlan(encoded: string): PendingCalendarSchedulePlan | null {
  if (!encoded) {
    return null
  }

  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as PendingCalendarSchedulePlan
    if (
      !parsed ||
      parsed.version !== 1 ||
      typeof parsed.date !== 'string' ||
      !Array.isArray(parsed.items) ||
      parsed.items.length === 0
    ) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

function extractLatestScheduleConfirmPayload(conversationText: string): string {
  const matches = [
    ...conversationText.matchAll(
      /"scope":"calendar_schedule"[\s\S]*?"confirmPayload":"([A-Za-z0-9_-]+)"/g
    ),
  ]

  return matches.at(-1)?.[1] ?? ''
}

function decodePendingCalendarSchedulePlan(
  rawText: string,
  conversationText: string
): PendingCalendarSchedulePlan | null {
  const compact = compactText(rawText)
  const inlineEncoded =
    compact.match(/^确认创建日程计划\s+([A-Za-z0-9_-]+)$/)?.[1] ??
    extractLatestScheduleConfirmPayload(conversationText)
  const encoded = inlineEncoded?.trim()
  if (!encoded) {
    return null
  }

  return parsePendingCalendarSchedulePlan(encoded)
}

function formatExistingCalendarSummary(
  day: Awaited<ReturnType<typeof getCalendarDay>>
): string {
  if (day.events.length === 0) {
    return '当天暂无已记录安排'
  }

  const titles = day.events
    .slice(0, 3)
    .map((event) => event.title)
    .join('；')

  return `已有 ${day.events.length} 项：${titles}${day.events.length > 3 ? ' 等' : ''}`
}

function buildCalendarAdviceRecap(items: PendingCalendarSchedulePlan['items']): string {
  const lines = items
    .map((item, index) => {
      const advice = compactText(item.implementationAdvice || '')
      if (!advice) {
        return ''
      }
      return `${index + 1}. ${item.title}：${advice}`
    })
    .filter(Boolean)
    .slice(0, 6)

  return lines.length > 0 ? `执行建议：\n${lines.join('\n')}` : ''
}

function buildSchedulePlanItemsFallback(rawText: string): Array<{
  title: string
  description: string
  implementationAdvice: string
}> {
  const normalized = rawText
    .replace(/\b\d{4}-\d{2}-\d{2}\b/g, ' ')
    .replace(/\b\d{4}\/\d{2}\/\d{2}\b/g, ' ')
    .replace(/今天|明天|后天|昨天|前天|本周|下周/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  const parts = normalized
    .split(/[，、；;]+/)
    .map((part) => compactText(part))
    .filter(Boolean)
    .slice(0, 5)

  if (parts.length > 1) {
    return parts.map((part) => ({
      title: part,
      description: '按原始需求拆分出的待办事项',
      implementationAdvice: '先明确这一步的产出，再开始执行，完成后补充结果记录。',
    }))
  }

  return [
    {
      title: compactText(rawText).slice(0, 120),
      description: '按当前需求拆成一项待执行安排',
      implementationAdvice: '先把目标和交付物写清楚，再开始处理，完成后回顾是否需要拆分下一步。',
    },
  ]
}

async function buildCalendarSchedulePlan(input: {
  rawText: string
  targetDate: string
  existingDay: Awaited<ReturnType<typeof getCalendarDay>>
  conversationText: string
  useKnowledgeBase: boolean
  signal?: AbortSignal
}): Promise<CalendarSchedulePlan> {
  const fallbackItems = buildSchedulePlanItemsFallback(input.rawText)
  const planningReferences = await loadPlanningReferences({
    rawText: input.rawText,
    conversationText: input.conversationText,
    useKnowledgeBase: input.useKnowledgeBase,
    signal: input.signal,
  })
  throwIfAborted(input.signal)

  const fallback: CalendarSchedulePlan = {
    summary: `${input.targetDate} 日程安排`,
    rationale: '先按需求拆成可执行事项，再逐项推进。',
    items: fallbackItems,
  }

  const systemPrompt = [
    '你是一个日程规划助手。',
    '任务：基于用户需求和当天已有安排，输出一个“按日期粒度”的执行计划。',
    '严格输出 JSON，不要输出任何解释。',
    '字段：summary, rationale, items。',
    'items 是 1 到 6 条任务，每条包含 title, description, implementationAdvice。',
    '注意：当前系统只支持按“天”记录事件，不支持小时分钟，因此不要输出具体时间点。',
    '请尽量避免和当天已有安排重复；如果用户目标很大，请拆成 2 到 5 条更容易执行的步骤。',
    'title 要简洁直接，description 用一句中文说明这一步为什么放在这个顺序或它的产出。',
    'implementationAdvice 需要给出具体、可执行的建议，例如先做什么、重点关注什么、产出物是什么。',
    '如果用户的问题带有明显的实施背景，请结合上下文给出更贴近任务本身的建议，不要只写空泛鸡汤。',
    '如果提供了“本地知识/历史参考”，请在 implementationAdvice 中优先吸收其中可复用的经验、步骤或注意事项，但不要编造成事实。',
    '如果参考信息不足，就明确按通用最佳实践给建议，不要硬凑。',
  ].join('\n')

  const userPrompt = JSON.stringify(
    {
      targetDate: input.targetDate,
      request: input.rawText,
      recentConversation: input.conversationText,
      localReferences: formatPlanningReferences(planningReferences),
      existingEvents: input.existingDay.events.map((event) => ({
        title: event.title,
        status: event.status,
        sourceType: event.sourceType,
      })),
    },
    null,
    2
  )

  throwIfAborted(input.signal)
  const raw = await invokeChat(userPrompt, systemPrompt, {
    model: 'reasoning',
    temperature: 0.2,
    signal: input.signal,
  })
  throwIfAborted(input.signal)

  const jsonText = extractJsonObject(raw)
  if (!jsonText) {
    return fallback
  }

  try {
    const parsed = JSON.parse(jsonText)
    const result = calendarSchedulePlanSchema.safeParse(parsed)
    if (!result.success || result.data.items.length === 0) {
      return fallback
    }
    return result.data
  } catch {
    return fallback
  }
}

async function executePublishPostTool(
  toolCall: PublishPostToolCall,
  input: {
    userId: string
    siteBaseUrl: string
    signal?: AbortSignal
  }
): Promise<BusinessToolExecutionResult> {
  const post = await findUserPost({
    userId: input.userId,
    postQuery: toolCall.strategy === 'match_query' ? toolCall.postQuery : '',
    preferDraft: true,
    signal: input.signal,
  })

  if (!post) {
    const postQuery = toolCall.postQuery.trim()
    const summary = postQuery
      ? `我没有找到可发布的草稿文章。你可以告诉我更明确的标题关键词，或者先生成一篇草稿。`
      : '我没有找到可发布的草稿文章。你可以先生成一篇草稿，或告诉我你想发布的文章标题。'
    return {
      tool: 'publish_post',
      status: 'not_found',
      summary,
      assistantMessage: buildFollowupOperationCardMessage({
        scope: 'tool',
        title: '发布文章前还需要你确认目标草稿',
        description: summary,
        questions: ['请告诉我你要发布的文章标题关键词，或先让我为你生成一篇草稿。'],
        submitMode: 'chat',
        submitLabel: '发送补充信息',
        inputPlaceholder: '例如：发布标题里包含“多 Agent 协同”的那篇草稿',
      }),
    }
  }

  const postUrl = buildPostUrl(input.siteBaseUrl, post.slug || post.id)
  if (post.published) {
    return {
      tool: 'publish_post',
      status: 'already_published',
      summary: `这篇文章已经是发布状态。\n\n标题：${post.title}\n链接：[点击查看](${postUrl})`,
      post: {
        id: post.id,
        slug: post.slug,
        title: post.title,
        published: post.published,
      },
      postUrl,
    }
  }

  const updated = await prisma.post.update({
    where: { id: post.id },
    data: {
      published: true,
      publishedAt: new Date(),
    },
    select: {
      id: true,
      slug: true,
      title: true,
      published: true,
    },
  })

  indexPost(updated.id).catch((err) => {
    console.error('[chat-tools] index post after publish failed:', err)
  })
  syncPostEvent({
    ...post,
    id: updated.id,
    slug: updated.slug,
    title: updated.title,
    published: updated.published,
    publishedAt: new Date(),
  }).catch((err) => {
    console.error('[chat-tools] sync post event after publish failed:', err)
  })

  return {
    tool: 'publish_post',
    status: 'published',
    summary: `已发布文章。\n\n标题：${updated.title}\n链接：[点击查看](${postUrl})`,
    post: updated,
    postUrl,
  }
}

async function executeUpdatePostTool(
  toolCall: UpdatePostToolCall,
  input: {
    userId: string
    siteBaseUrl: string
    signal?: AbortSignal
  }
): Promise<BusinessToolExecutionResult> {
  const post = await findUserPost({
    userId: input.userId,
    postQuery: toolCall.postQuery,
    preferDraft: true,
    signal: input.signal,
  })
  throwIfAborted(input.signal)

  if (!post) {
    const summary = toolCall.postQuery.trim()
      ? '我没有找到你要修改的文章。你可以告诉我更明确的标题关键词，或先列出草稿。'
      : '我没有找到可修改的文章。你可以先告诉我文章标题，或让我先列出你的草稿。'
    return {
      tool: 'update_post',
      status: 'not_found',
      summary,
      assistantMessage: buildFollowupOperationCardMessage({
        scope: 'tool',
        title: '修改文章前还需要你确认目标文章',
        description: summary,
        questions: ['请告诉我文章标题、slug 或 id；如果不确定，也可以先让我列出草稿。'],
        submitMode: 'chat',
        submitLabel: '发送补充信息',
        inputPlaceholder: '例如：修改标题包含“博客工作流”的那篇文章',
      }),
    }
  }

  const nextTitle = toolCall.title.trim()
  const nextExcerpt = toolCall.excerpt.trim()
  const nextContent = toolCall.content.trim()
  const appendContent = toolCall.appendContent.trim()
  const hasFieldChanges =
    Boolean(nextTitle) ||
    Boolean(nextExcerpt) ||
    Boolean(nextContent) ||
    Boolean(appendContent) ||
    toolCall.publishAction !== 'keep'

  if (!hasFieldChanges) {
    return {
      tool: 'update_post',
      status: 'need_more_info',
      summary: '在更新文章之前，我还需要知道你想改哪些内容。',
      followupQuestions: ['你想修改标题、摘要、正文，还是发布状态？'],
      assistantMessage: buildFollowupOperationCardMessage({
        scope: 'tool',
        title: '更新文章前还需要补充修改内容',
        description: '请告诉我这次具体要改哪些字段。',
        questions: ['你想修改标题、摘要、正文，还是发布状态？'],
        submitMode: 'chat',
        submitLabel: '发送修改要求',
        inputPlaceholder: '例如：把标题改为 XXX，并在正文末尾追加一段总结',
      }),
    }
  }

  const updateData: {
    title?: string
    slug?: string
    excerpt?: string
    content?: string
    published?: boolean
    publishedAt?: Date | null
  } = {}
  const changedFields: string[] = []

  if (nextTitle) {
    updateData.title = nextTitle
    updateData.slug = await ensureUniqueSlugForPost(nextTitle, post.id)
    changedFields.push('标题')
  }

  if (nextExcerpt) {
    updateData.excerpt = nextExcerpt
    changedFields.push('摘要')
  }

  if (nextContent || appendContent) {
    let content = nextContent || post.content
    if (appendContent) {
      content = `${content.trim()}\n\n${appendContent}`.trim()
    }
    updateData.content = content
    changedFields.push(nextContent ? '正文' : '追加正文')
  }

  if (toolCall.publishAction === 'publish') {
    updateData.published = true
    updateData.publishedAt = post.publishedAt ?? new Date()
    changedFields.push('发布状态')
  } else if (toolCall.publishAction === 'unpublish') {
    updateData.published = false
    updateData.publishedAt = null
    changedFields.push('下线状态')
  }

  const updated = await prisma.post.update({
    where: { id: post.id },
    data: updateData,
    select: {
      id: true,
      slug: true,
      title: true,
      published: true,
    },
  })
  throwIfAborted(input.signal)

  indexPost(updated.id).catch((err) => {
    console.error('[chat-tools] index post after update failed:', err)
  })
  prisma.post.findUnique({ where: { id: updated.id } }).then((fullPost) => {
    if (!fullPost) return
    return syncPostEvent(fullPost)
  }).catch((err) => {
    console.error('[chat-tools] sync post event after update failed:', err)
  })

  const postUrl = buildPostUrl(input.siteBaseUrl, updated.slug || updated.id)
  return {
    tool: 'update_post',
    status: 'updated',
    summary: `已更新文章（${changedFields.join('、')}）。\n\n标题：${updated.title}\n链接：[点击查看](${postUrl})`,
    post: updated,
    postUrl,
  }
}

async function executeDeletePostTool(
  toolCall: DeletePostToolCall,
  input: {
    userId: string
    siteBaseUrl: string
    latestUserMessage: string
    conversationText: string
    signal?: AbortSignal
  }
): Promise<BusinessToolExecutionResult> {
  const confirmed = isExplicitDeleteConfirmation(input.latestUserMessage)
  const postQuery = resolveDeletePostQuery({
    toolPostQuery: toolCall.postQuery,
    latestUserMessage: input.latestUserMessage,
    conversationText: input.conversationText,
  })

  if (!postQuery) {
    return {
      tool: 'delete_post',
      status: 'need_more_info',
      summary: '删除文章前，我需要你明确指出要删除的文章。',
      followupQuestions: ['请告诉我要删除的文章标题、slug 或 id。'],
      assistantMessage: buildFollowupOperationCardMessage({
        scope: 'tool',
        title: '删除文章前需要先确认目标文章',
        description: '这是危险操作，请先明确要删除哪一篇文章。',
        questions: ['请告诉我要删除的文章标题、slug 或 id。'],
        submitMode: 'chat',
        submitLabel: '发送删除目标',
        inputPlaceholder: '例如：删除 id 为 cm123... 的那篇文章',
      }),
    }
  }

  const post = await findUserPost({
    userId: input.userId,
    postQuery,
    preferDraft: false,
    signal: input.signal,
  })
  throwIfAborted(input.signal)

  if (!post) {
    const summary = `我没有找到和“${postQuery}”匹配的文章，暂时无法删除。`
    return {
      tool: 'delete_post',
      status: 'not_found',
      summary,
      assistantMessage: buildFollowupOperationCardMessage({
        scope: 'tool',
        title: '没有找到可删除的文章',
        description: summary,
        questions: ['请重新提供更准确的文章标题、slug 或 id。'],
        submitMode: 'chat',
        submitLabel: '重新指定文章',
        inputPlaceholder: '例如：确认删除 cm123... 或标题包含 XXX 的文章',
      }),
    }
  }

  const postUrl = buildPostUrl(input.siteBaseUrl, post.slug || post.id)
  const editUrl = buildPostEditUrl(input.siteBaseUrl, post.id)

  if (!confirmed) {
    return {
      tool: 'delete_post',
      status: 'need_more_info',
      summary: '已找到待删除文章，但删除前需要你二次确认。当前还没有执行删除。',
      followupQuestions: [`如果确认删除，请回复“确认删除 ${post.id}”。`],
      assistantMessage: buildDeletePostConfirmOperationCardMessage({
        postId: post.id,
        title: post.title,
        statusLabel: post.published ? '已发布' : '草稿',
        postUrl,
        editUrl,
      }),
    }
  }

  await removePostFromIndex(post.id).catch((err) => {
    console.error('[chat-tools] remove post index failed:', err)
  })
  await removeEventsForSource('post', post.id).catch((err) => {
    console.error('[chat-tools] remove post event failed:', err)
  })
  await prisma.post.delete({
    where: { id: post.id },
  })

  return {
    tool: 'delete_post',
    status: 'deleted',
    summary: `已删除文章：${post.title}`,
  }
}

async function executeGetPostDetailTool(
  toolCall: GetPostDetailToolCall,
  input: {
    userId: string
    siteBaseUrl: string
    signal?: AbortSignal
  }
): Promise<BusinessToolExecutionResult> {
  const post = await findUserPost({
    userId: input.userId,
    postQuery: toolCall.postQuery,
    preferDraft: false,
    signal: input.signal,
  })
  throwIfAborted(input.signal)

  if (!post) {
    const summary = toolCall.postQuery.trim()
      ? '我没有找到这篇文章。你可以提供更明确的标题、slug 或 id。'
      : '我没有找到可查看的文章。'
    return {
      tool: 'get_post_detail',
      status: 'not_found',
      summary,
      assistantMessage: buildFollowupOperationCardMessage({
        scope: 'tool',
        title: '查看文章详情前还需要确认目标文章',
        description: summary,
        questions: ['请告诉我文章标题、slug 或 id。'],
        submitMode: 'chat',
        submitLabel: '发送文章标识',
        inputPlaceholder: '例如：查看 slug 为 multi-agent-chat 的文章',
      }),
    }
  }

  const postUrl = buildPostUrl(input.siteBaseUrl, post.slug || post.id)
  const editUrl = buildPostEditUrl(input.siteBaseUrl, post.id)
  const contentBlock = toolCall.includeContent
    ? `\n\n正文预览：\n${post.content.slice(0, 300)}${post.content.length > 300 ? '…' : ''}`
    : ''

  return {
    tool: 'get_post_detail',
    status: 'found',
    summary: [
      `标题：${post.title}`,
      `状态：${post.published ? '已发布' : '草稿'}`,
      `摘要：${post.excerpt || '无'}`,
      `创建时间：${post.createdAt.toISOString()}`,
      `更新时间：${post.updatedAt.toISOString()}`,
      `文章链接：${postUrl}`,
      `编辑链接：${editUrl}${contentBlock}`,
    ].join('\n'),
    post: {
      id: post.id,
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt,
      published: post.published,
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString(),
      postUrl,
      editUrl,
    },
  }
}

async function executeListDraftsTool(
  toolCall: ListDraftsToolCall,
  input: {
    userId: string
    siteBaseUrl: string
    signal?: AbortSignal
  }
): Promise<BusinessToolExecutionResult> {
  throwIfAborted(input.signal)
  const query = toolCall.query.trim()
  const drafts = await prisma.post.findMany({
    where: {
      authorId: input.userId,
      published: false,
      ...(query
        ? {
            OR: [
              { title: { contains: query, mode: 'insensitive' } },
              { slug: { contains: query, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    orderBy: { updatedAt: 'desc' },
    take: toolCall.limit,
    select: {
      id: true,
      title: true,
      updatedAt: true,
    },
  })
  throwIfAborted(input.signal)

  if (drafts.length === 0) {
    return {
      tool: 'list_drafts',
      status: 'empty',
      summary: query
        ? `没有找到和“${query}”相关的草稿。`
        : '当前没有草稿文章。',
    }
  }

  const lines = drafts.map((draft, index) => {
    const editUrl = buildPostEditUrl(input.siteBaseUrl, draft.id)
    return `${index + 1}. ${draft.title}\n更新时间：${draft.updatedAt.toISOString()}\n编辑链接：${editUrl}`
  })

  return {
    tool: 'list_drafts',
    status: 'listed',
    summary: `已找到 ${drafts.length} 篇草稿：\n\n${lines.join('\n\n')}`,
    drafts: drafts.map((draft) => ({
      id: draft.id,
      title: draft.title,
      updatedAt: draft.updatedAt.toISOString(),
      editUrl: buildPostEditUrl(input.siteBaseUrl, draft.id),
    })),
  }
}

async function executeCreateThoughtTool(
  toolCall: CreateThoughtToolCall,
  input: {
    userId: string
    signal?: AbortSignal
  }
): Promise<BusinessToolExecutionResult> {
  throwIfAborted(input.signal)
  const content = toolCall.content.trim()
  if (!content) {
    return {
      tool: 'create_thought',
      status: 'need_more_info',
      summary: '在记录这条思考之前，我还需要你提供具体内容。',
      followupQuestions: ['你想记录的思考内容是什么？'],
      assistantMessage: buildFollowupOperationCardMessage({
        scope: 'tool',
        title: '记录思考前需要补充内容',
        description: '请把你要保存的想法直接写下来。',
        questions: ['你想记录的思考内容是什么？'],
        submitMode: 'chat',
        submitLabel: '记录这条思考',
        inputPlaceholder: '例如：总控 Agent 应该把工具分流和多轮交互彻底解耦',
      }),
    }
  }

  const thought = await prisma.thought.create({
    data: {
      authorId: input.userId,
      content,
      images: [],
    },
    select: {
      id: true,
      authorId: true,
      content: true,
      images: true,
      likeCount: true,
      commentCount: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  thoughtsRagAgent.indexThought(thought.id).catch((err) => {
    console.error('[chat-tools] index thought failed:', err)
  })
  syncThoughtEvent(thought).catch((err) => {
    console.error('[chat-tools] sync thought event failed:', err)
  })

  return {
    tool: 'create_thought',
    status: 'created',
    summary: `已记录一条思考。\n\n内容：${thought.content.slice(0, 120)}${thought.content.length > 120 ? '…' : ''}`,
    thought,
  }
}

async function executeCreateCalendarEventTool(
  toolCall: CreateCalendarEventToolCall,
  input: {
    userId: string
    siteBaseUrl: string
    conversationText: string
    useKnowledgeBase: boolean
    signal?: AbortSignal
  }
): Promise<BusinessToolExecutionResult> {
  throwIfAborted(input.signal)

  const rawText = toolCall.rawText.trim()
  const now = new Date()
  const targetDate = parseExplicitDate(rawText, now) ?? toolCall.defaultDate ?? toDateString(now)
  const calendarDayUrl = `${input.siteBaseUrl.replace(/\/+$/, '')}/calendar/day/${targetDate}`

  if (looksLikeSchedulePlanCancellation(rawText)) {
    return {
      tool: 'create_calendar_event',
      status: 'cancelled',
      summary: '已取消这次日程创建，本次不会写入日历。',
      skillPhases: [
        {
          phase: 'confirm',
          label: '已取消日程规划确认，本次不会写入日历。',
        },
      ],
    }
  }

  if (looksLikeSchedulePlanConfirmation(rawText)) {
    const pendingPlan = decodePendingCalendarSchedulePlan(rawText, input.conversationText)
    if (!pendingPlan) {
      return {
        tool: 'create_calendar_event',
        status: 'need_more_info',
        summary: '这份待确认的日程计划已经失效或无法识别，请重新让我规划一次。',
        skillPhases: [
          {
            phase: 'confirm',
            label: '未找到可确认的日程草案，需要重新生成规划。',
          },
        ],
      }
    }

    const createdEvents = []
    for (const item of pendingPlan.items.slice(0, 6)) {
      throwIfAborted(input.signal)
      const event = await createManualEvent({
        userId: input.userId,
        title: item.title,
        description:
          [compactText(item.description || ''), compactText(item.implementationAdvice || '')]
            .filter(Boolean)
            .join('\n执行建议：') ||
          `来自 AI 日程规划：${compactText(pendingPlan.sourceMessage).slice(0, 180)}`,
        date: pendingPlan.date,
        status: 'planned',
        allDay: true,
        sourceType: 'manual',
      })

      createdEvents.push({
        id: event.id,
        title: event.title,
        date: pendingPlan.date,
        jumpUrl: `${calendarDayUrl}`,
      })
    }

    return {
      tool: 'create_calendar_event',
      status: 'created',
      summary: [
        `已将 ${createdEvents.length} 项计划写入 ${pendingPlan.date} 的日历。`,
        `规划思路：${pendingPlan.rationale}`,
        ...createdEvents.map((event, index) => `${index + 1}. ${event.title}`),
        `查看当天：${calendarDayUrl}`,
      ].join('\n'),
      assistantMessage: [
        `已确认并创建 ${createdEvents.length} 项日程，已写入 ${pendingPlan.date} 的日历。`,
        buildCalendarAdviceRecap(pendingPlan.items),
        `查看当天：${calendarDayUrl}`,
      ]
        .filter(Boolean)
        .join('\n\n'),
      skillPhases: [
        {
          phase: 'create',
          label: `正在把确认后的 ${createdEvents.length} 项计划写入日历。`,
        },
        {
          phase: 'advise',
          label: '正在整理每项计划的执行建议，方便你直接开始。',
        },
      ],
      createdEvents,
    }
  }

  if (!rawText || /^(帮我|请)?(?:安排|记录|添加|加入|创建)?(?:一个|一下)?(?:日程|待办|提醒|计划)?$/.test(rawText)) {
    return {
      tool: 'create_calendar_event',
      status: 'need_more_info',
      summary: '创建日程之前，我还需要知道具体要安排什么事情，以及大概的时间。',
      followupQuestions: ['你想安排什么事？是今天、明天，还是某个具体日期？'],
      assistantMessage: buildFollowupOperationCardMessage({
        scope: 'tool',
        title: '创建日程前还需要补充内容',
        description: '请直接告诉我要安排的事项和时间，我会帮你写入日历。',
        questions: ['你想安排什么事？是今天、明天，还是某个具体日期？'],
        submitMode: 'chat',
        submitLabel: '发送日程内容',
        inputPlaceholder: '例如：明天下午整理 AI 对话页的日程工具串联方案',
      }),
    }
  }

  if (looksLikeSchedulePlanningRequest(rawText)) {
    const existingDay = await getCalendarDay({ mode: 'user', userId: input.userId }, targetDate)
    throwIfAborted(input.signal)

    const plan = await buildCalendarSchedulePlan({
      rawText,
      targetDate,
      existingDay,
      conversationText: input.conversationText,
      useKnowledgeBase: input.useKnowledgeBase,
      signal: input.signal,
    })
    throwIfAborted(input.signal)

    const payload = encodePendingCalendarSchedulePlan({
      version: 1,
      date: targetDate,
      sourceMessage: rawText,
      rationale: plan.rationale,
      items: plan.items.map((item) => ({
        title: compactText(item.title).slice(0, 120),
        description: compactText(item.description || '').slice(0, 240) || undefined,
        implementationAdvice:
          compactText(item.implementationAdvice || '').slice(0, 320) || undefined,
      })),
    })

    return {
      tool: 'create_calendar_event',
      status: 'need_more_info',
      summary: `已为 ${targetDate} 生成一版日程方案，确认后会写入日历。`,
      skillPhases: [
        {
          phase: 'draft',
          label: `正在为 ${targetDate} 起草日程方案。`,
        },
        {
          phase: 'confirm',
          label: '日程草案已生成，等待你确认后写入日历。',
        },
      ],
      assistantMessage: buildCalendarScheduleConfirmOperationCardMessage({
        date: targetDate,
        description: `${plan.summary}。${plan.rationale} 确认后会把以下计划写入日历。`,
        existingSummary: formatExistingCalendarSummary(existingDay),
        planItems: plan.items.map((item) =>
          compactText(
            [
              item.title,
              item.description ? `安排理由：${item.description}` : '',
              item.implementationAdvice ? `执行建议：${item.implementationAdvice}` : '',
            ]
              .filter(Boolean)
              .join('；')
          ).slice(0, 180)
        ),
        calendarDayUrl,
        confirmMessage: SCHEDULE_PLAN_CONFIRM_PREFIX,
        confirmPayload: payload,
      }),
    }
  }

  const result = await createQuickCalendarEntry({
    userId: input.userId,
    rawText,
    defaultDate: toolCall.defaultDate,
    sourceInputType: 'text',
  })
  throwIfAborted(input.signal)

  const lines = [
    `已创建日程：${result.event.title}`,
    `日期：${result.targetDate}`,
    `状态：${result.inferredStatus === 'planned' ? '计划中' : result.inferredStatus === 'completed' ? '已完成' : '已取消'}`,
    `类型：${result.inferredSourceType}`,
    result.event.jumpUrl ? `跳转：${result.event.jumpUrl}` : null,
    result.note,
  ].filter(Boolean)

  return {
    tool: 'create_calendar_event',
    status: 'created',
    summary: lines.join('\n'),
    skillPhases: [
      {
        phase: 'create',
        label: `正在创建日程并写入 ${result.targetDate}。`,
      },
    ],
    event: {
      id: result.event.id,
      title: result.event.title,
      date: result.targetDate,
      status: result.inferredStatus,
      jumpUrl: result.event.jumpUrl,
    },
    linkedEntity: result.linkedEntity,
    createdEvents: [
      {
        id: result.event.id,
        title: result.event.title,
        date: result.targetDate,
        jumpUrl: result.event.jumpUrl,
      },
    ],
  }
}

async function executeSaveBookmarkFromUrlTool(
  toolCall: SaveBookmarkFromUrlToolCall,
  input: {
    signal?: AbortSignal
  }
): Promise<BusinessToolExecutionResult> {
  throwIfAborted(input.signal)

  const url = toolCall.url.trim()
  if (!url || !isLikelyHttpUrl(url)) {
    return {
      tool: 'save_bookmark_from_url',
      status: 'need_more_info',
      summary: '在保存收藏之前，我还需要一个有效的网址链接。',
      followupQuestions: ['你要收藏的链接 URL 是什么？'],
      assistantMessage: buildFollowupOperationCardMessage({
        scope: 'tool',
        title: '保存收藏前需要一个有效链接',
        description: '请提供完整的 http 或 https 链接。',
        questions: ['你要收藏的链接 URL 是什么？'],
        submitMode: 'chat',
        submitLabel: '发送链接',
        inputPlaceholder: '例如：https://example.com/article',
      }),
    }
  }

  const title = toolCall.title.trim() || extractBookmarkTitleFromUrl(url)
  if (!title) {
    return {
      tool: 'save_bookmark_from_url',
      status: 'need_more_info',
      summary: '在保存收藏之前，我还需要这个收藏的标题。',
      followupQuestions: ['这个收藏的标题想写什么？'],
      assistantMessage: buildFollowupOperationCardMessage({
        scope: 'tool',
        title: '保存收藏前还需要标题',
        description: '请补充一个更易读的收藏标题。',
        questions: ['这个收藏的标题想写什么？'],
        submitMode: 'chat',
        submitLabel: '发送标题',
        inputPlaceholder: '例如：OpenAI Responses API 指南',
      }),
    }
  }

  const data = {
    title,
    url,
    notes: toolCall.notes.trim() || null,
    category: toolCall.category.trim() || null,
    tags: toolCall.tags.length > 0 ? toolCall.tags : Prisma.JsonNull,
    source: 'api',
  }

  const existing = await prisma.bookmark.findUnique({
    where: { url },
    select: { id: true },
  })

  const bookmark = existing
    ? await prisma.bookmark.update({
        where: { id: existing.id },
        data,
        select: {
          id: true,
          title: true,
          url: true,
        },
      })
    : await prisma.bookmark.create({
        data,
        select: {
          id: true,
          title: true,
          url: true,
        },
      })

  return {
    tool: 'save_bookmark_from_url',
    status: existing ? 'updated' : 'created',
    summary: `${existing ? '已更新收藏。' : '已创建收藏。'}\n\n标题：${bookmark.title}\n链接：${bookmark.url}`,
    bookmark,
  }
}

async function executeListBookmarksTool(
  toolCall: ListBookmarksToolCall,
  input: {
    signal?: AbortSignal
  }
): Promise<BusinessToolExecutionResult> {
  throwIfAborted(input.signal)
  const query = toolCall.query.trim()
  const category = toolCall.category.trim()

  const bookmarks = await prisma.bookmark.findMany({
    where: {
      ...(category ? { category } : {}),
      ...(query
        ? {
            OR: [
              { title: { contains: query, mode: 'insensitive' } },
              { url: { contains: query, mode: 'insensitive' } },
              { notes: { contains: query, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: toolCall.limit,
    select: {
      id: true,
      title: true,
      url: true,
      category: true,
      createdAt: true,
    },
  })
  throwIfAborted(input.signal)

  if (bookmarks.length === 0) {
    return {
      tool: 'list_bookmarks',
      status: 'empty',
      summary: query || category
        ? '没有找到符合条件的收藏。'
        : '当前没有收藏记录。',
    }
  }

  return {
    tool: 'list_bookmarks',
    status: 'listed',
    summary: `找到 ${bookmarks.length} 条收藏：\n\n${bookmarks
      .map(
        (bookmark, index) =>
          `${index + 1}. ${bookmark.title}\n链接：${bookmark.url}\n分类：${bookmark.category || '未分类'}`
      )
      .join('\n\n')}`,
    bookmarks: bookmarks.map((bookmark) => ({
      id: bookmark.id,
      title: bookmark.title,
      url: bookmark.url,
      category: bookmark.category,
      createdAt: bookmark.createdAt.toISOString(),
    })),
  }
}

async function executeSearchThoughtsTool(
  toolCall: SearchThoughtsToolCall,
  input: {
    signal?: AbortSignal
  }
): Promise<BusinessToolExecutionResult> {
  throwIfAborted(input.signal)
  const query = toolCall.query.trim()
  if (!query) {
    return {
      tool: 'search_thoughts',
      status: 'need_more_info',
      summary: '在搜索思考库之前，我还需要一个明确的关键词或问题。',
      followupQuestions: ['你想在思考库里搜索什么内容？'],
      assistantMessage: buildFollowupOperationCardMessage({
        scope: 'tool',
        title: '搜索思考库前需要查询内容',
        description: '请告诉我要检索的关键词、主题或问题。',
        questions: ['你想在思考库里搜索什么内容？'],
        submitMode: 'chat',
        submitLabel: '开始搜索',
        inputPlaceholder: '例如：多 Agent 协调、工具分流、对话工作流',
      }),
    }
  }

  const hits = await thoughtsRagAgent.search(query, toolCall.limit)
  throwIfAborted(input.signal)

  if (hits.length === 0) {
    return {
      tool: 'search_thoughts',
      status: 'empty',
      summary: `在思考库里没有找到和“${query}”相关的内容。`,
    }
  }

  const lines = hits.map(
    (hit, index) =>
      `${index + 1}. ${hit.title}\n相关度：${hit.score.toFixed(3)}\n片段：${hit.snippet}`
  )

  return {
    tool: 'search_thoughts',
    status: 'found',
    summary: `在思考库中找到 ${hits.length} 条相关内容：\n\n${lines.join('\n\n')}`,
    hits,
  }
}

async function executeAnswerThoughtsTool(
  toolCall: AnswerThoughtsToolCall,
  input: {
    signal?: AbortSignal
  }
): Promise<BusinessToolExecutionResult> {
  throwIfAborted(input.signal)
  const query = toolCall.query.trim()
  if (!query) {
    return {
      tool: 'answer_thoughts',
      status: 'need_more_info',
      summary: '在基于思考库回答之前，我还需要一个明确的问题。',
      followupQuestions: ['你希望我基于思考库回答什么问题？'],
      assistantMessage: buildFollowupOperationCardMessage({
        scope: 'tool',
        title: '基于思考库回答前需要明确问题',
        description: '请直接写出你想让我回答的问题。',
        questions: ['你希望我基于思考库回答什么问题？'],
        submitMode: 'chat',
        submitLabel: '发送问题',
        inputPlaceholder: '例如：我之前关于总控 Agent 的设计思路是什么？',
      }),
    }
  }

  const result = await thoughtsRagAgent.answer(query, toolCall.limit)
  throwIfAborted(input.signal)

  return {
    tool: 'answer_thoughts',
    status: 'answered',
    summary: [
      result.answer,
      result.hits.length > 0
        ? `\n参考片段：\n${result.hits
            .map(
              (hit, index) =>
                `${index + 1}. ${hit.title}\n相关度：${hit.score.toFixed(3)}\n片段：${hit.snippet}`
            )
            .join('\n\n')}`
        : '',
    ]
      .filter(Boolean)
      .join('\n\n'),
    answer: result.answer,
    hits: result.hits,
  }
}

export async function executeBusinessTool(
  toolCall: ChatToolCall,
  input: {
    userId: string
    siteBaseUrl: string
    latestUserMessage: string
    conversationText: string
    useKnowledgeBase: boolean
    signal?: AbortSignal
  }
): Promise<BusinessToolExecutionResult> {
  if (toolCall.tool === 'publish_post') {
    return executePublishPostTool(toolCall, input)
  }

  if (toolCall.tool === 'update_post') {
    return executeUpdatePostTool(toolCall, input)
  }

  if (toolCall.tool === 'delete_post') {
    return executeDeletePostTool(toolCall, input)
  }

  if (toolCall.tool === 'get_post_detail') {
    return executeGetPostDetailTool(toolCall, input)
  }

  if (toolCall.tool === 'list_drafts') {
    return executeListDraftsTool(toolCall, input)
  }

  if (toolCall.tool === 'create_calendar_event') {
    return executeCreateCalendarEventTool(toolCall, input)
  }

  if (toolCall.tool === 'create_thought') {
    return executeCreateThoughtTool(toolCall, input)
  }

  if (toolCall.tool === 'save_bookmark_from_url') {
    return executeSaveBookmarkFromUrlTool(toolCall, input)
  }

  if (toolCall.tool === 'list_bookmarks') {
    return executeListBookmarksTool(toolCall, input)
  }

  if (toolCall.tool === 'search_thoughts') {
    return executeSearchThoughtsTool(toolCall, input)
  }

  if (toolCall.tool === 'answer_thoughts') {
    return executeAnswerThoughtsTool(toolCall, input)
  }

  throw new Error(`不支持的业务工具: ${toolCall.tool}`)
}

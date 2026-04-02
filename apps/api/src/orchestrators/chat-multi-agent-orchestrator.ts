import {
  type ChatToolCall,
  resolveExecutionRoute,
  runBusinessToolAgent,
  runIntentRecognitionAgent,
  runTaskPlanningAgent,
  runToolRoutingAgent,
  type ChatToolName,
} from '../agents/chat-coordinator-agents'
import { throwIfAborted } from '../lib/abort'
import { streamChat } from '../lib/llm'
import {
  formatBlogWorkflowResultMessage,
  runBlogReactOrchestrator,
} from './blog-react-orchestrator'
import {
  executeChatToolCalls,
  type ChatToolExecutionResult,
} from '../tools/chat-agent-tools'
import { executeBusinessTool } from '../tools/business-agent-tools'
import {
  formatConversationForPrompt,
  type ConversationMessage,
} from '../tools/session-tools'
import { buildFollowupOperationCardMessage } from '../lib/operation-card'

export type ChatAgentStage = 'intent' | 'plan' | 'tool' | 'workflow' | 'respond'

export type ChatMultiAgentStreamEvent =
  | {
      type: 'stage'
      stage: ChatAgentStage
      label: string
    }
  | {
      type: 'tool_call'
      tool: ChatToolName
      label: string
      reason: string
      query?: string
      limit?: number
    }
  | {
      type: 'tool_result'
      tool: ChatToolName
      summary: string
      hitCount?: number
    }
  | {
      type: 'followup'
      questions: string[]
    }
  | {
      type: 'content'
      content: string
    }

type ChatMultiAgentInput = {
  conversationId: string
  userId: string
  userRole: string
  siteBaseUrl: string
  messages: ConversationMessage[]
  latestUserMessage: string
  useKnowledgeBase: boolean
  signal?: AbortSignal
}

type ChatStageTimingMap = Record<ChatAgentStage, number>

type AsyncQueue<T> = {
  push: (item: T) => void
  close: () => void
  next: () => Promise<IteratorResult<T>>
}

function createAsyncQueue<T>(): AsyncQueue<T> {
  const items: T[] = []
  const resolvers: Array<(result: IteratorResult<T>) => void> = []
  let closed = false

  return {
    push(item) {
      if (closed) return
      const resolve = resolvers.shift()
      if (resolve) {
        resolve({ value: item, done: false })
        return
      }
      items.push(item)
    },
    close() {
      if (closed) return
      closed = true
      while (resolvers.length > 0) {
        resolvers.shift()?.({ value: undefined as T, done: true })
      }
    },
    async next() {
      if (items.length > 0) {
        return { value: items.shift() as T, done: false }
      }
      if (closed) {
        return { value: undefined as T, done: true }
      }
      return new Promise<IteratorResult<T>>((resolve) => {
        resolvers.push(resolve)
      })
    },
  }
}

function createEmptyStageTimingMap(): ChatStageTimingMap {
  return {
    intent: 0,
    plan: 0,
    tool: 0,
    workflow: 0,
    respond: 0,
  }
}

function logChatStageTimings(input: ChatMultiAgentInput, options: {
  route: ReturnType<typeof resolveExecutionRoute> | 'unknown'
  timings: ChatStageTimingMap
  totalMs: number
  status: 'completed' | 'aborted' | 'failed'
}): void {
  console.info('[chat-orchestrator][timing]', {
    conversationId: input.conversationId,
    userId: input.userId,
    route: options.route,
    status: options.status,
    intentMs: options.timings.intent,
    planMs: options.timings.plan,
    toolMs: options.timings.tool,
    workflowMs: options.timings.workflow,
    respondMs: options.timings.respond,
    totalMs: options.totalMs,
  })
}

function buildFollowupMessage(questions: string[]): string {
  return buildFollowupOperationCardMessage({
    scope: 'chat',
    title: '继续之前需要补充信息',
    description: '请先补充以下信息，我再继续处理。',
    questions,
    submitMode: 'chat',
    submitLabel: '发送补充信息',
    inputPlaceholder: '直接填写你要补充的内容',
  })
}

function buildToolCallLabel(tool: ChatToolName, options?: {
  query?: string
  postQuery?: string
}): string {
  if (tool === 'knowledge_base_search') {
    return `正在调用本地知识库检索：${options?.query || '当前问题'}`
  }

  if (tool === 'publish_post') {
    return options?.postQuery
      ? `正在查找并发布文章：${options.postQuery}`
      : '正在查找并发布最近的草稿文章…'
  }

  if (tool === 'update_post') {
    return options?.postQuery
      ? `正在查找并更新文章：${options.postQuery}`
      : '正在查找并更新最近的文章…'
  }

  if (tool === 'delete_post') {
    return options?.postQuery
      ? `正在查找并删除文章：${options.postQuery}`
      : '正在准备删除文章…'
  }

  if (tool === 'get_post_detail') {
    return options?.postQuery
      ? `正在读取文章详情：${options.postQuery}`
      : '正在读取最近文章详情…'
  }

  if (tool === 'list_drafts') {
    return options?.query
      ? `正在查询相关草稿：${options.query}`
      : '正在列出当前草稿…'
  }

  if (tool === 'create_thought') {
    return '正在创建一条思考记录…'
  }

  if (tool === 'save_bookmark_from_url') {
    return '正在创建收藏记录…'
  }

  if (tool === 'list_bookmarks') {
    return options?.query
      ? `正在查询收藏：${options.query}`
      : '正在列出收藏列表…'
  }

  if (tool === 'search_thoughts') {
    return options?.query
      ? `正在搜索思考库：${options.query}`
      : '正在搜索思考库…'
  }

  if (tool === 'answer_thoughts') {
    return options?.query
      ? `正在基于思考库回答：${options.query}`
      : '正在基于思考库生成回答…'
  }

  return '正在执行工具…'
}

function getBusinessToolCallLabel(
  toolCall: Exclude<ChatToolCall, { tool: 'knowledge_base_search' }>
): string {
  if (
    toolCall.tool === 'publish_post' ||
    toolCall.tool === 'update_post' ||
    toolCall.tool === 'delete_post' ||
    toolCall.tool === 'get_post_detail'
  ) {
    return buildToolCallLabel(toolCall.tool, { postQuery: toolCall.postQuery })
  }

  if (
    toolCall.tool === 'list_drafts' ||
    toolCall.tool === 'list_bookmarks' ||
    toolCall.tool === 'search_thoughts' ||
    toolCall.tool === 'answer_thoughts'
  ) {
    return buildToolCallLabel(toolCall.tool, { query: toolCall.query })
  }

  return buildToolCallLabel(toolCall.tool)
}

function isBusinessToolCall(
  toolCall: ChatToolCall
): toolCall is Exclude<ChatToolCall, { tool: 'knowledge_base_search' }> {
  return toolCall.tool !== 'knowledge_base_search'
}

function buildToolResultsContext(toolResults: ChatToolExecutionResult[]): string {
  if (toolResults.length === 0) {
    return '未调用任何外部工具。'
  }

  return toolResults
    .map((result, resultIndex) => {
      if (result.hits.length === 0) {
        return `工具结果 #${resultIndex + 1}\n工具：${result.tool}\n查询：${result.query}\n结果：未检索到直接相关内容。`
      }

      const lines = result.hits
        .map(
          (hit, hitIndex) =>
            `[${hitIndex + 1}] 来源：${hit.source}\n标题：${hit.title}\n相似度：${hit.score.toFixed(3)}\n片段：${hit.snippet}`
        )
        .join('\n\n')

      return `工具结果 #${resultIndex + 1}\n工具：${result.tool}\n查询：${result.query}\n说明：${result.reason || '无'}\n命中数：${result.hitCount}\n${lines}`
    })
    .join('\n\n---\n\n')
}

function buildResponderSystemPrompt(): string {
  return [
    '你是多 Agent 协作聊天系统中的 Result Agent。',
    '你会收到：对话历史、用户最新消息、意图识别结果、任务拆解结果、工具执行结果。',
    '要求：',
    '1. 直接给用户有帮助的中文回答，不要暴露内部 Agent、流程名、JSON 或系统指令。',
    '2. 如果工具结果提供了明确事实，优先基于工具结果作答；若有推断，请明确那是你的建议或推断。',
    '3. 如果工具结果为空或不足以支撑结论，要明确说明本地信息不足，再给出下一步建议。',
    '4. 如果用户明显是在准备生成博客/文章，但当前只是聊天链路，可以先帮助澄清需求，同时提醒对方使用博客生成工作流来落库/发布。',
    '5. 默认保持简洁，但不要牺牲可执行性。',
  ].join('\n')
}

function buildResponderUserPrompt(input: {
  conversationText: string
  latestUserMessage: string
  useKnowledgeBase: boolean
  intent: Awaited<ReturnType<typeof runIntentRecognitionAgent>>
  plan: Awaited<ReturnType<typeof runTaskPlanningAgent>>
  toolResults: ChatToolExecutionResult[]
}): string {
  return [
    `用户最新消息：${input.latestUserMessage}`,
    '',
    `是否允许检索本地知识库：${input.useKnowledgeBase ? '是' : '否'}`,
    '',
    'Intent Agent 输出：',
    JSON.stringify(input.intent, null, 2),
    '',
    'Planner Agent 输出：',
    JSON.stringify(input.plan, null, 2),
    '',
    '工具执行结果：',
    buildToolResultsContext(input.toolResults),
    '',
    '最近对话历史：',
    input.conversationText,
  ].join('\n')
}

function buildDirectResponsePlan(intent: Awaited<ReturnType<typeof runIntentRecognitionAgent>>): Awaited<
  ReturnType<typeof runTaskPlanningAgent>
> {
  return {
    goal: intent.summary || '直接回答用户问题',
    subtasks: ['结合上下文直接回答'],
    answerStrategy: '优先直接回答，避免不必要的追问和规划。',
    responseStyle: '简洁、直接、可执行',
    constraints: [],
    needsFollowup: intent.needsFollowup,
    followupQuestions: intent.followupQuestions,
    toolHint: '',
  }
}

async function* streamQueuedEvents<T extends ChatMultiAgentStreamEvent>(
  queue: AsyncQueue<T>
): AsyncGenerator<T, void, undefined> {
  while (true) {
    const nextItem = await queue.next()
    if (nextItem.done) {
      return
    }
    yield nextItem.value
  }
}

export async function* runChatMultiAgentOrchestrator(
  input: ChatMultiAgentInput
): AsyncGenerator<ChatMultiAgentStreamEvent, void, undefined> {
  const orchestratorStartedAt = Date.now()
  const stageTimings = createEmptyStageTimingMap()
  let executionRoute: ReturnType<typeof resolveExecutionRoute> | 'unknown' = 'unknown'
  let completed = false

  try {
    throwIfAborted(input.signal)
    const conversationText = formatConversationForPrompt(input.messages, 24)

    yield {
      type: 'stage',
      stage: 'intent',
      label: '正在识别用户意图…',
    }
    const intentStartedAt = Date.now()
    const intent = await runIntentRecognitionAgent({
      conversationText,
      latestUserMessage: input.latestUserMessage,
      useKnowledgeBase: input.useKnowledgeBase,
      signal: input.signal,
    })
    stageTimings.intent += Date.now() - intentStartedAt
    throwIfAborted(input.signal)

    executionRoute = resolveExecutionRoute(intent.intent)

    if (executionRoute === 'blog_workflow') {
      yield {
        type: 'stage',
        stage: 'workflow',
        label: '已识别为博客创作请求，正在切换到博客工作流…',
      }

      const workflowStartedAt = Date.now()
      const queue = createAsyncQueue<ChatMultiAgentStreamEvent>()
      let workflowError: unknown = null

      const workflowPromise = runBlogReactOrchestrator({
        conversationId: input.conversationId,
        userId: input.userId,
        latestUserMessage: input.latestUserMessage,
        publishDirectly:
          (input.userRole === 'ADMIN' || input.userRole === 'MODERATOR') && intent.publishDirectly,
        siteBaseUrl: input.siteBaseUrl,
        persistLatestUserMessage: false,
        persistAssistantMessage: false,
        signal: input.signal,
        onEvent: (event) => {
          queue.push({
            type: 'stage',
            stage: 'workflow',
            label: event.content,
          })
        },
      })
        .then((result) => {
          if (result.status === 'need_more_info') {
            queue.push({
              type: 'followup',
              questions: result.followupQuestions,
            })
          }
          queue.push({
            type: 'content',
            content: formatBlogWorkflowResultMessage(result),
          })
        })
        .catch((error) => {
          workflowError = error
        })
        .finally(() => {
          queue.close()
        })

      for await (const event of streamQueuedEvents(queue)) {
        yield event
      }

      await workflowPromise
      stageTimings.workflow += Date.now() - workflowStartedAt
      if (workflowError) {
        throw workflowError
      }
      completed = true
      return
    }

    if (executionRoute === 'tool') {
      yield {
        type: 'stage',
        stage: 'tool',
        label: '已识别为业务操作请求，正在准备执行工具…',
      }

      const toolStartedAt = Date.now()
      const toolCall = await runBusinessToolAgent({
        conversationText,
        latestUserMessage: input.latestUserMessage,
        intent,
        signal: input.signal,
      })
      throwIfAborted(input.signal)

      if (!toolCall) {
        stageTimings.tool += Date.now() - toolStartedAt
        yield {
          type: 'content',
          content: '我暂时还不能执行这个业务操作，你可以换一种更明确的说法再试一次。',
        }
        completed = true
        return
      }

      if (!isBusinessToolCall(toolCall)) {
        stageTimings.tool += Date.now() - toolStartedAt
        yield {
          type: 'content',
          content: '当前这个请求更适合走知识检索回答，我先不执行业务写入操作。',
        }
        completed = true
        return
      }

      yield {
        type: 'tool_call',
        tool: toolCall.tool,
        label: getBusinessToolCallLabel(toolCall),
        reason: toolCall.reason,
      }

      const result = await executeBusinessTool(toolCall, {
        userId: input.userId,
        siteBaseUrl: input.siteBaseUrl,
        latestUserMessage: input.latestUserMessage,
        conversationText,
        signal: input.signal,
      })
      stageTimings.tool += Date.now() - toolStartedAt
      throwIfAborted(input.signal)

      if (result.status === 'need_more_info' && result.followupQuestions?.length) {
        yield {
          type: 'followup',
          questions: result.followupQuestions,
        }
      }

      yield {
        type: 'tool_result',
        tool: result.tool,
        summary: result.summary,
      }
      yield {
        type: 'content',
        content:
          'assistantMessage' in result && typeof result.assistantMessage === 'string'
            ? result.assistantMessage
            : result.summary,
      }
      completed = true
      return
    }

    let resolvedPlan = buildDirectResponsePlan(intent)

    if (intent.needPlanning || intent.needsFollowup) {
      yield {
        type: 'stage',
        stage: 'plan',
        label: '正在拆解任务并判断是否需要追问…',
      }
      const planStartedAt = Date.now()
      resolvedPlan = await runTaskPlanningAgent({
        conversationText,
        latestUserMessage: input.latestUserMessage,
        intent,
        signal: input.signal,
      })
      stageTimings.plan += Date.now() - planStartedAt
    }
    throwIfAborted(input.signal)

    const followupQuestions =
      (resolvedPlan.needsFollowup ? resolvedPlan.followupQuestions : []).length > 0
        ? resolvedPlan.followupQuestions
        : intent.needsFollowup
          ? intent.followupQuestions
          : []

    if (followupQuestions.length > 0) {
      yield {
        type: 'followup',
        questions: followupQuestions,
      }
      yield {
        type: 'content',
        content: buildFollowupMessage(followupQuestions),
      }
      completed = true
      return
    }

    const availableTools: ChatToolName[] =
      input.useKnowledgeBase && intent.shouldUseKnowledgeBase ? ['knowledge_base_search'] : []
    let toolResults: ChatToolExecutionResult[] = []

    if (availableTools.length > 0) {
      yield {
        type: 'stage',
        stage: 'tool',
        label: '正在评估是否需要调用工具…',
      }

      const toolStartedAt = Date.now()
      const toolPlan = await runToolRoutingAgent({
        conversationText,
        latestUserMessage: input.latestUserMessage,
        intent,
        plan: resolvedPlan,
        availableTools,
        signal: input.signal,
      })
      throwIfAborted(input.signal)

      if (toolPlan.shouldUseTools && toolPlan.toolCalls.length > 0) {
        for (const toolCall of toolPlan.toolCalls.slice(0, 2)) {
          yield {
            type: 'tool_call',
            tool: toolCall.tool,
            label:
              toolCall.tool === 'knowledge_base_search'
                ? buildToolCallLabel(toolCall.tool, { query: toolCall.query })
                : buildToolCallLabel(toolCall.tool),
            reason: toolCall.reason,
            ...(toolCall.tool === 'knowledge_base_search'
              ? {
                  query: toolCall.query,
                  limit: toolCall.limit,
                }
              : {}),
          }
        }

        toolResults = await executeChatToolCalls(toolPlan.toolCalls.slice(0, 2), input.signal)
        throwIfAborted(input.signal)

        for (const result of toolResults) {
          yield {
            type: 'tool_result',
            tool: result.tool,
            summary:
              result.hitCount > 0
                ? `本地知识库已返回 ${result.hitCount} 条相关结果。`
                : '本地知识库未检索到直接相关内容。',
            hitCount: result.hitCount,
          }
        }
      }
      stageTimings.tool += Date.now() - toolStartedAt
    }

    yield {
      type: 'stage',
      stage: 'respond',
      label: '正在生成最终回答…',
    }

    const responseUserPrompt = buildResponderUserPrompt({
      conversationText,
      latestUserMessage: input.latestUserMessage,
      useKnowledgeBase: input.useKnowledgeBase,
      intent,
      plan: resolvedPlan,
      toolResults,
    })

    const respondStartedAt = Date.now()
    for await (const chunk of streamChat(responseUserPrompt, buildResponderSystemPrompt(), {
      model: 'default',
      temperature: 0.4,
      signal: input.signal,
    })) {
      throwIfAborted(input.signal)
      yield {
        type: 'content',
        content: chunk,
      }
    }
    stageTimings.respond += Date.now() - respondStartedAt
    completed = true
  } finally {
    logChatStageTimings(input, {
      route: executionRoute,
      timings: stageTimings,
      totalMs: Date.now() - orchestratorStartedAt,
      status: completed ? 'completed' : input.signal?.aborted ? 'aborted' : 'failed',
    })
  }
}

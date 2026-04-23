import {
  patchIntentContext,
  type IntentContext,
} from '../agents/chat-intent-state'
import {
  type ChatExecutionRoute,
  type ChatToolCall,
  runBusinessToolAgent,
  runIntentRecognitionAgent,
  runTaskPlanningAgent,
  runToolRoutingAgent,
  type ChatToolName,
} from '../agents/chat-coordinator-agents'
import { resolveChatAppSkill, type ResolvedChatAppSkill } from '../agents/chat-app-skills'
import { throwIfAborted } from '../lib/abort'
import { logger } from '../lib/logger'
import { streamChat } from '../lib/llm'
import {
  formatBlogWorkflowResultMessage,
  runBlogReactOrchestrator,
} from './blog-react-orchestrator'
import {
  executeChatToolCalls,
  type ChatToolExecutionResult,
} from '../tools/chat-agent-tools'
import {
  buildPostNavigationStateMessage,
  executeBusinessTool,
} from '../tools/business-agent-tools'
import {
  formatConversationForPrompt,
  buildIntentConversationDigest,
  type ConversationMessage,
} from '../tools/session-tools'
import { buildFollowupOperationCardMessage } from '../lib/operation-card'

export type ChatAgentStage = 'intent' | 'plan' | 'tool' | 'workflow' | 'respond'
export type ChatUserFacingStatus =
  | 'thinking'
  | 'searching'
  | 'organizing'
  | 'creating'
  | 'responding'

export type ChatMultiAgentStreamEvent =
  | {
      type: 'status'
      status: ChatUserFacingStatus
      label: string
    }
  | {
      type: 'followup'
      questions: string[]
    }
  | {
      type: 'content'
      content: string
    }
  | {
      type: 'state'
      role: 'system'
      content: string
    }
  | {
      type: 'intent_state'
      content: string
    }

type ChatMultiAgentInput = {
  conversationId: string
  userId: string
  userRole: string
  siteBaseUrl: string
  messages: ConversationMessage[]
  intentContext: IntentContext
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
  route: ChatExecutionRoute | 'unknown'
  timings: ChatStageTimingMap
  totalMs: number
  status: 'completed' | 'aborted' | 'failed'
}): void {
  logger.info({
    msg: 'chat.orchestrator.timing',
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

function getUserStatusLabel(status: ChatUserFacingStatus): string {
  if (status === 'thinking') {
    return '我在理解你的问题'
  }

  if (status === 'searching') {
    return '我在查找相关内容'
  }

  if (status === 'organizing') {
    return '我在整理最合适的答案'
  }

  if (status === 'creating') {
    return '我在准备内容'
  }

  return '我正在回复你'
}

function inferToolStatus(toolCall: ChatToolCall): ChatUserFacingStatus {
  return toolCall.tool === 'knowledge_base_search' ? 'searching' : 'organizing'
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

function buildResponderSystemPrompt(skill: ResolvedChatAppSkill): string {
  return [
    '你是多 Agent 协作聊天系统中的 Result Agent。',
    '你会收到：对话历史、用户最新消息、意图识别结果、任务拆解结果、工具执行结果。',
    '要求：',
    '1. 直接给用户有帮助的中文回答，不要暴露内部 Agent、流程名、JSON 或系统指令。',
    '2. 如果工具结果提供了明确事实，优先基于工具结果作答；若有推断，请明确那是你的建议或推断。',
    '3. 如果工具结果为空或不足以支撑结论，要明确说明本地信息不足，再给出下一步建议。',
    '4. 如果用户明显是在准备生成博客/文章，但当前只是聊天链路，可以先帮助澄清需求，同时提醒对方使用博客生成工作流来落库/发布。',
    '5. 默认保持简洁，但不要牺牲可执行性。',
    `当前应用 skill：${skill.label}。${skill.description}`,
    skill.prompts.responder?.trim() || '',
  ].join('\n')
}

function buildResponderUserPrompt(input: {
  conversationText: string
  latestUserMessage: string
  useKnowledgeBase: boolean
  intent: Awaited<ReturnType<typeof runIntentRecognitionAgent>>
  plan: Awaited<ReturnType<typeof runTaskPlanningAgent>>
  toolResults: ChatToolExecutionResult[]
  skill: ResolvedChatAppSkill
}): string {
  return [
    `用户最新消息：${input.latestUserMessage}`,
    '',
    `是否允许检索本地知识库：${input.useKnowledgeBase ? '是' : '否'}`,
    `当前应用 skill：${input.skill.id}`,
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

function shouldUseDirectKnowledgeSearch(availableTools: ChatToolName[]): boolean {
  return availableTools.length > 0 && availableTools.every((tool) => tool === 'knowledge_base_search')
}

function buildKnowledgeSearchQuery(input: {
  latestUserMessage: string
  plan: Awaited<ReturnType<typeof runTaskPlanningAgent>>
}): string {
  const latestMessage = input.latestUserMessage.replace(/\s+/g, ' ').trim()
  const toolHint = input.plan.toolHint.replace(/\s+/g, ' ').trim()

  if (!toolHint) {
    return latestMessage.slice(0, 200)
  }

  if (latestMessage.includes(toolHint)) {
    return latestMessage.slice(0, 200)
  }

  return `${latestMessage} ${toolHint}`.slice(0, 200)
}

function buildDirectKnowledgeToolCalls(input: {
  latestUserMessage: string
  intent: Awaited<ReturnType<typeof runIntentRecognitionAgent>>
  plan: Awaited<ReturnType<typeof runTaskPlanningAgent>>
  skill: ResolvedChatAppSkill
}): ChatToolCall[] {
  const shouldUseKnowledgeBase =
    input.skill.id === 'knowledge_context' ||
    (input.skill.id === 'implementation_advice' && input.intent.shouldUseKnowledgeBase) ||
    input.intent.shouldUseKnowledgeBase

  if (!shouldUseKnowledgeBase) {
    return []
  }

  const query = buildKnowledgeSearchQuery({
    latestUserMessage: input.latestUserMessage,
    plan: input.plan,
  })

  if (!query) {
    return []
  }

  return [
    {
      tool: 'knowledge_base_search',
      query,
      limit: input.skill.id === 'implementation_advice' ? 4 : 6,
      reason:
        input.skill.id === 'implementation_advice'
          ? '补充与当前实施问题相关的本地上下文'
          : '补充与当前问题相关的本地知识上下文',
    },
  ]
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
  let executionRoute: ChatExecutionRoute | 'unknown' = 'unknown'
  let completed = false
  let currentUserStatus: ChatUserFacingStatus | null = null
  let currentIntentContext = input.intentContext
  const diagnosticsLogger = logger.child({
    scope: 'chat-orchestrator',
    conversationId: input.conversationId,
    userId: input.userId,
  })

  const emitStatus = async function* (
    status: ChatUserFacingStatus,
    internalStage: ChatAgentStage,
    extras?: Record<string, unknown>
  ): AsyncGenerator<ChatMultiAgentStreamEvent, void, undefined> {
    diagnosticsLogger.info({
      msg: 'chat.status',
      internalStage,
      userStatus: status,
      route: executionRoute,
      ...extras,
    })

    if (currentUserStatus === status) {
      return
    }

    currentUserStatus = status
    yield {
      type: 'status',
      status,
      label: getUserStatusLabel(status),
    }
  }

  try {
    throwIfAborted(input.signal)
    const conversationDigest = buildIntentConversationDigest(input.messages, currentIntentContext, 5)
    const rawConversationText = formatConversationForPrompt(input.messages, 24)

    const emitIntentState = async function* (
      patch: Partial<IntentContext>,
      extras?: Record<string, unknown>
    ): AsyncGenerator<ChatMultiAgentStreamEvent, void, undefined> {
      currentIntentContext = patchIntentContext(currentIntentContext, patch)
      diagnosticsLogger.info({
        msg: 'chat.intent.state_updated',
        ...extras,
        nextIntentContext: currentIntentContext,
      })
      yield {
        type: 'intent_state',
        content: JSON.stringify(currentIntentContext),
      }
    }

    yield* emitStatus('thinking', 'intent')
    const intentStartedAt = Date.now()
    const intent = await runIntentRecognitionAgent({
      conversationText: conversationDigest,
      latestUserMessage: input.latestUserMessage,
      useKnowledgeBase: input.useKnowledgeBase,
      context: currentIntentContext,
      signal: input.signal,
    })
    stageTimings.intent += Date.now() - intentStartedAt
    throwIfAborted(input.signal)
    yield* emitIntentState(intent.statePatch, {
      internalStage: 'intent',
      finalIntent: intent.intent,
      confidence: intent.confidence,
      confirmationRequired: intent.confirmationRequired,
      forcedFollowupReason: intent.forcedFollowupReason,
    })

    const skill = resolveChatAppSkill({
      intent,
      latestUserMessage: input.latestUserMessage,
      useKnowledgeBase: input.useKnowledgeBase,
      state: currentIntentContext,
    })
    executionRoute = skill.route
    diagnosticsLogger.info({
      msg: 'chat.intent.resolved',
      route: executionRoute,
      intent: intent.intent,
      reviewedIntent: intent.intent,
      candidateIntents: intent.candidateTrace.map((item) => ({
        intent: item.intent,
        source: item.source,
        confidence: item.confidence,
      })),
      activeDomainBefore: input.intentContext.activeDomain,
      activeDomainAfter: currentIntentContext.activeDomain,
      usedState: currentIntentContext,
      finalIntent: intent.intent,
      skillId: skill.id,
      shouldUseKnowledgeBase: intent.shouldUseKnowledgeBase,
      needPlanning: intent.needPlanning,
      needsFollowup: intent.needsFollowup,
      forcedFollowupReason: intent.forcedFollowupReason,
    })

    if (executionRoute === 'blog_workflow') {
      yield* emitStatus('creating', 'workflow', {
        skillId: skill.id,
      })

      const workflowStartedAt = Date.now()
      const queue = createAsyncQueue<ChatMultiAgentStreamEvent>()
      let workflowError: unknown = null
      let workflowResultStatus: 'need_more_info' | 'completed' | 'failed' | null = null

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
          diagnosticsLogger.info({
            msg: 'chat.workflow.status',
            internalStage: 'workflow',
            workflowStage: event.stage,
            userStatus: event.status,
          })
          queue.push(event)
        },
      })
        .then((result) => {
          workflowResultStatus = result.status === 'need_more_info' ? 'need_more_info' : 'completed'
          if (result.status === 'need_more_info') {
            queue.push({
              type: 'intent_state',
              content: JSON.stringify(
                patchIntentContext(currentIntentContext, {
                  activeDomain: 'blog_workflow',
                  pendingAction: 'blog_workflow_followup',
                  pendingEntityType: 'workflow',
                  pendingEntityId: null,
                  lastOperationCardScope: 'workflow',
                  confidenceMode: 'normal',
                })
              ),
            })
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
        if (event.type === 'intent_state') {
          try {
            currentIntentContext = JSON.parse(event.content) as IntentContext
          } catch {
            // ignore malformed state updates from nested workflow
          }
        }
        yield event
      }

      await workflowPromise
      stageTimings.workflow += Date.now() - workflowStartedAt
      if (workflowError) {
        throw workflowError
      }
      yield* emitIntentState(
        {
          activeDomain: 'blog_workflow',
          pendingAction: workflowResultStatus === 'need_more_info' ? 'blog_workflow_followup' : null,
          pendingEntityType: 'workflow',
          pendingEntityId: null,
          lastOperationCardScope: workflowResultStatus === 'need_more_info' ? 'workflow' : null,
          confidenceMode: 'normal',
        },
        {
          internalStage: 'workflow',
          finalIntent: intent.intent,
        }
      )
      completed = true
      return
    }

    if (executionRoute === 'tool') {
      if (intent.confirmationRequired && intent.followupQuestions.length > 0) {
        yield {
          type: 'followup',
          questions: intent.followupQuestions,
        }
        yield {
          type: 'content',
          content: buildFollowupMessage(intent.followupQuestions),
        }
        completed = true
        return
      }

      yield* emitStatus('organizing', 'tool', {
        skillId: skill.id,
      })

      const toolStartedAt = Date.now()
      const toolCall = await runBusinessToolAgent({
        conversationText: rawConversationText,
        latestUserMessage: input.latestUserMessage,
        intent,
        availableTools: skill.businessTools,
        skillPrompt: skill.prompts.businessTool,
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

      diagnosticsLogger.info({
        msg: 'chat.tool.call',
        internalStage: 'tool',
        userStatus: inferToolStatus(toolCall),
        toolName: toolCall.tool,
        toolReason: toolCall.reason,
      })
      yield* emitStatus(inferToolStatus(toolCall), 'tool', {
        skillId: skill.id,
        toolName: toolCall.tool,
      })

      const result = await executeBusinessTool(toolCall, {
        userId: input.userId,
        siteBaseUrl: input.siteBaseUrl,
        latestUserMessage: input.latestUserMessage,
        conversationText: rawConversationText,
        useKnowledgeBase: input.useKnowledgeBase,
        signal: input.signal,
      })
      stageTimings.tool += Date.now() - toolStartedAt
      throwIfAborted(input.signal)

      if (
        skill.id === 'calendar_planning' &&
        result.tool === 'create_calendar_event' &&
        Array.isArray(result.skillPhases)
      ) {
        diagnosticsLogger.info({
          msg: 'chat.tool.skill_phases',
          internalStage: 'tool',
          skillId: skill.id,
          phaseCount: result.skillPhases.length,
        })
      }

      if (result.status === 'need_more_info' && result.followupQuestions?.length) {
        yield {
          type: 'followup',
          questions: result.followupQuestions,
        }
      }

      diagnosticsLogger.info({
        msg: 'chat.tool.result',
        internalStage: 'tool',
        skillId: skill.id,
        toolName: result.tool,
        summary: result.summary,
        resultStatus: 'status' in result ? result.status : undefined,
      })
      if (result.tool === 'get_post_detail' && result.status === 'found' && result.post?.id) {
        yield* emitIntentState(
          {
            activeDomain: 'content_management',
            pendingAction: null,
            pendingEntityType: 'post',
            pendingEntityId: result.post.id,
            lastShownPostId: result.post.id,
            lastOperationCardScope: null,
            confidenceMode: 'normal',
          },
          {
            internalStage: 'tool',
            toolName: result.tool,
          }
        )
        yield {
          type: 'state',
          role: 'system',
          content: buildPostNavigationStateMessage(result.post.id),
        }
      } else if (result.tool === 'delete_post' && result.status === 'need_more_info') {
        yield* emitIntentState(
          {
            activeDomain: 'content_management',
            pendingAction: 'confirm_delete_post',
            pendingEntityType: 'post',
            lastOperationCardScope: 'tool',
            confidenceMode: 'cautious',
          },
          {
            internalStage: 'tool',
            toolName: result.tool,
          }
        )
      } else if (result.tool === 'update_post' && result.status === 'need_more_info') {
        yield* emitIntentState(
          {
            activeDomain: 'content_management',
            pendingAction: 'update_post_followup',
            pendingEntityType: 'post',
            lastOperationCardScope: 'tool',
            confidenceMode: 'cautious',
          },
          {
            internalStage: 'tool',
            toolName: result.tool,
          }
        )
      } else if (result.tool === 'create_calendar_event' && result.status === 'need_more_info') {
        yield* emitIntentState(
          {
            activeDomain: 'calendar_planning',
            pendingAction: 'confirm_calendar_plan',
            pendingEntityType: 'calendar_event',
            lastOperationCardScope: 'tool',
            confidenceMode: 'cautious',
          },
          {
            internalStage: 'tool',
            toolName: result.tool,
          }
        )
      } else if (
        (result.tool === 'publish_post' || result.tool === 'update_post' || result.tool === 'delete_post') &&
        result.status !== 'need_more_info'
      ) {
        yield* emitIntentState(
          {
            activeDomain: 'content_management',
            pendingAction: null,
            pendingEntityType: result.tool === 'delete_post' ? null : 'post',
            pendingEntityId: 'post' in result && result.post?.id ? result.post.id : null,
            lastOperationCardScope: null,
            confidenceMode: 'normal',
          },
          {
            internalStage: 'tool',
            toolName: result.tool,
          }
        )
      } else if (result.tool === 'create_calendar_event' && result.status === 'created') {
        yield* emitIntentState(
          {
            activeDomain: 'calendar_planning',
            pendingAction: null,
            pendingEntityType: 'calendar_event',
            pendingEntityId: result.event?.id ?? null,
            lastOperationCardScope: null,
            confidenceMode: 'normal',
          },
          {
            internalStage: 'tool',
            toolName: result.tool,
          }
        )
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
      yield* emitStatus('thinking', 'plan', {
        skillId: skill.id,
      })
      const planStartedAt = Date.now()
      resolvedPlan = await runTaskPlanningAgent({
        conversationText: conversationDigest,
        latestUserMessage: input.latestUserMessage,
        intent,
        skillPrompt: skill.prompts.planner,
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

    const availableTools: ChatToolName[] = skill.retrievalTools
    let toolResults: ChatToolExecutionResult[] = []

    if (availableTools.length > 0) {
      yield* emitStatus('thinking', 'tool', {
        skillId: skill.id,
      })

      const toolStartedAt = Date.now()
      const toolPlan = shouldUseDirectKnowledgeSearch(availableTools)
        ? (() => {
            const directToolCalls = buildDirectKnowledgeToolCalls({
              latestUserMessage: input.latestUserMessage,
              intent,
              plan: resolvedPlan,
              skill,
            })

            return {
              shouldUseTools: directToolCalls.length > 0,
              toolCalls: directToolCalls,
            }
          })()
        : await runToolRoutingAgent({
            conversationText: conversationDigest,
            latestUserMessage: input.latestUserMessage,
            intent,
            plan: resolvedPlan,
            availableTools,
            skillPrompt: skill.prompts.toolRouting,
            signal: input.signal,
          })
      throwIfAborted(input.signal)

      if (toolPlan.shouldUseTools && toolPlan.toolCalls.length > 0) {
        const toolCalls = toolPlan.toolCalls.slice(0, 2)
        for (const toolCall of toolCalls) {
          diagnosticsLogger.info({
            msg: 'chat.tool.call',
            internalStage: 'tool',
            skillId: skill.id,
            userStatus: inferToolStatus(toolCall),
            toolName: toolCall.tool,
            toolReason: toolCall.reason,
            query: 'query' in toolCall ? toolCall.query : undefined,
            limit: 'limit' in toolCall ? toolCall.limit : undefined,
          })
        }

        yield* emitStatus('searching', 'tool', {
          skillId: skill.id,
          toolCount: toolCalls.length,
        })

        toolResults = await executeChatToolCalls(toolCalls, input.signal)
        throwIfAborted(input.signal)

        for (const result of toolResults) {
          diagnosticsLogger.info({
            msg: 'chat.tool.result',
            internalStage: 'tool',
            skillId: skill.id,
            userStatus: 'searching',
            toolName: result.tool,
            query: result.query,
            hitCount: result.hitCount,
            limit: result.limit,
          })
        }

        yield* emitStatus('organizing', 'tool', {
          skillId: skill.id,
          resultCount: toolResults.length,
        })
      }
      stageTimings.tool += Date.now() - toolStartedAt
    }

    yield* emitStatus('responding', 'respond', {
      skillId: skill.id,
    })

    const responseUserPrompt = buildResponderUserPrompt({
      conversationText: conversationDigest,
      latestUserMessage: input.latestUserMessage,
      useKnowledgeBase: input.useKnowledgeBase,
      intent,
      plan: resolvedPlan,
      toolResults,
      skill,
    })

    const respondStartedAt = Date.now()
    for await (const chunk of streamChat(responseUserPrompt, buildResponderSystemPrompt(skill), {
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

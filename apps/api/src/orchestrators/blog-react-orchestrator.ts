import {
  runEditorAgent,
  runPlannerAgent,
  runWriterAgent,
  type DraftResult,
} from '../agents/blog-writer-agents'
import { throwIfAborted } from '../lib/abort'
import {
  appendConversationMessage,
  formatConversationForPrompt,
  loadConversationWithMessages,
} from '../tools/session-tools'
import { createAndMaybePublishPost } from '../tools/post-tools'
import { buildWorkflowFollowupOperationCardMessage } from '../lib/operation-card'
import { logger } from '../lib/logger'

type BlogWorkflowInput = {
  conversationId: string
  userId: string
  latestUserMessage: string
  publishDirectly: boolean
  siteBaseUrl: string
  persistLatestUserMessage?: boolean
  persistAssistantMessage?: boolean
  signal?: AbortSignal
  onEvent?: (event: BlogWorkflowStreamEvent) => Promise<void> | void
}

export type BlogWorkflowStage = 'plan' | 'ask_followup' | 'write' | 'edit' | 'save'
export type BlogWorkflowUserFacingStatus =
  | 'thinking'
  | 'organizing'
  | 'creating'
  | 'responding'

type WorkflowAction = BlogWorkflowStage

export type BlogWorkflowStreamEvent = {
  type: 'status'
  stage: BlogWorkflowStage
  status: BlogWorkflowUserFacingStatus
  label: string
}

export type BlogWorkflowResult =
  | {
      status: 'need_more_info'
      followupQuestions: string[]
    }
  | {
      status: 'published' | 'draft_saved'
      post: {
        id: string
        slug: string
        title: string
        published: boolean
      }
      postUrl: string
    }

function formatPublishedPostMessage(post: {
  title: string
  published: boolean
}, postUrl: string): string {
  if (post.published) {
    return `文章已生成并发布。\n\n标题：${post.title}\n链接：[点击查看](${postUrl})`
  }

  return `文章已生成并保存为草稿。\n\n标题：${post.title}\n链接：[点击查看](${postUrl})`
}

export function formatBlogWorkflowFollowupMessage(
  followupQuestions: string[],
  options?: { phase?: 'start' | 'continue' }
): string {
  return buildWorkflowFollowupOperationCardMessage(followupQuestions, options)
}

export function formatBlogWorkflowResultMessage(result: BlogWorkflowResult): string {
  if (result.status === 'need_more_info') {
    return formatBlogWorkflowFollowupMessage(result.followupQuestions, { phase: 'continue' })
  }

  return formatPublishedPostMessage(result.post, result.postUrl)
}

async function emitWorkflowStage(
  input: BlogWorkflowInput,
  stage: BlogWorkflowStage,
  status: BlogWorkflowUserFacingStatus,
  label: string
) {
  await input.onEvent?.({
    type: 'status',
    stage,
    status,
    label,
  })
}

export async function runBlogReactOrchestrator(input: BlogWorkflowInput): Promise<BlogWorkflowResult> {
  throwIfAborted(input.signal)
  const conversationData = await loadConversationWithMessages(input.conversationId, input.userId)
  if (!conversationData) {
    throw new Error('会话不存在或无权限访问')
  }

  const shouldPersistLatestUserMessage = input.persistLatestUserMessage !== false
  const shouldPersistAssistantMessage = input.persistAssistantMessage !== false

  throwIfAborted(input.signal)
  if (shouldPersistLatestUserMessage) {
    await appendConversationMessage(input.conversationId, 'user', input.latestUserMessage)
  }

  const withLatestMessages = shouldPersistLatestUserMessage
    ? [
        ...conversationData.messages.map((m) => ({ role: m.role, content: m.content })),
        { role: 'user', content: input.latestUserMessage },
      ]
    : conversationData.messages.map((m) => ({ role: m.role, content: m.content }))
  const conversationText = formatConversationForPrompt(withLatestMessages, 24)

  let action: WorkflowAction = 'plan'
  let draft: DraftResult | null = null
  let loop = 0
  const maxLoop = 5
  let planResult: Awaited<ReturnType<typeof runPlannerAgent>> | null = null
  const diagnosticsLogger = logger.child({
    scope: 'blog-workflow',
    conversationId: input.conversationId,
    userId: input.userId,
  })

  while (loop < maxLoop) {
    loop += 1

    if (action === 'plan') {
      diagnosticsLogger.info({
        msg: 'blog.workflow.status',
        internalStage: 'plan',
        userStatus: 'thinking',
      })
      await emitWorkflowStage(input, 'plan', 'thinking', '我在理解你的需求')
      throwIfAborted(input.signal)
      planResult = await runPlannerAgent(conversationText, input.signal)
      throwIfAborted(input.signal)
      action = planResult.missingFields.length > 0 ? 'ask_followup' : 'write'
      continue
    }

    if (action === 'ask_followup') {
      diagnosticsLogger.info({
        msg: 'blog.workflow.status',
        internalStage: 'ask_followup',
        userStatus: 'organizing',
      })
      await emitWorkflowStage(input, 'ask_followup', 'organizing', '我在整理还需要你补充的信息')
      throwIfAborted(input.signal)
      const followupQuestions =
        planResult?.followupQuestions?.filter(Boolean).slice(0, 3) ?? ['你希望文章聚焦什么主题？']

      if (shouldPersistAssistantMessage) {
        await appendConversationMessage(
          input.conversationId,
          'assistant',
          formatBlogWorkflowFollowupMessage(followupQuestions, { phase: 'start' })
        )
      }

      return {
        status: 'need_more_info',
        followupQuestions,
      }
    }

    if (action === 'write') {
      diagnosticsLogger.info({
        msg: 'blog.workflow.status',
        internalStage: 'write',
        userStatus: 'creating',
      })
      await emitWorkflowStage(input, 'write', 'creating', '我在生成内容草稿')
      throwIfAborted(input.signal)
      draft = await runWriterAgent(conversationText, planResult!, input.signal)
      throwIfAborted(input.signal)
      action = 'edit'
      continue
    }

    if (action === 'edit') {
      diagnosticsLogger.info({
        msg: 'blog.workflow.status',
        internalStage: 'edit',
        userStatus: 'organizing',
      })
      await emitWorkflowStage(input, 'edit', 'organizing', '我在整理结构和表达')
      throwIfAborted(input.signal)
      draft = await runEditorAgent(draft!, input.signal)
      throwIfAborted(input.signal)
      action = 'save'
      continue
    }

    if (action === 'save') {
      diagnosticsLogger.info({
        msg: 'blog.workflow.status',
        internalStage: 'save',
        userStatus: 'responding',
        publishDirectly: input.publishDirectly,
      })
      await emitWorkflowStage(input, 'save', 'responding', '我在准备最终结果')
      throwIfAborted(input.signal)
      const post = await createAndMaybePublishPost({
        authorId: input.userId,
        title: draft!.title,
        content: draft!.content,
        excerpt: draft!.excerpt,
        published: input.publishDirectly,
      })
      const postUrl = `${input.siteBaseUrl.replace(/\/+$/, '')}/posts/${post.slug || post.id}`
      const assistantMessage = formatPublishedPostMessage(post, postUrl)
      if (shouldPersistAssistantMessage) {
        await appendConversationMessage(input.conversationId, 'assistant', assistantMessage)
      }

      return {
        status: post.published ? 'published' : 'draft_saved',
        post: {
          id: post.id,
          slug: post.slug,
          title: post.title,
          published: post.published,
        },
        postUrl,
      }
    }
  }

  throw new Error('工作流执行超时，请重试')
}

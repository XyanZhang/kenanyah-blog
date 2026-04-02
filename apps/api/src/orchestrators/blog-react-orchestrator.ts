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

type BlogWorkflowInput = {
  conversationId: string
  userId: string
  latestUserMessage: string
  publishDirectly: boolean
  siteBaseUrl: string
  signal?: AbortSignal
  onEvent?: (event: BlogWorkflowStreamEvent) => Promise<void> | void
}

export type BlogWorkflowStage = 'plan' | 'ask_followup' | 'write' | 'edit' | 'save'

type WorkflowAction = BlogWorkflowStage

export type BlogWorkflowStreamEvent = {
  type: 'stage'
  stage: BlogWorkflowStage
  content: string
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

async function emitWorkflowStage(
  input: BlogWorkflowInput,
  stage: BlogWorkflowStage,
  content: string
) {
  await input.onEvent?.({
    type: 'stage',
    stage,
    content,
  })
}

export async function runBlogReactOrchestrator(input: BlogWorkflowInput): Promise<BlogWorkflowResult> {
  throwIfAborted(input.signal)
  const conversationData = await loadConversationWithMessages(input.conversationId, input.userId)
  if (!conversationData) {
    throw new Error('会话不存在或无权限访问')
  }

  throwIfAborted(input.signal)
  await appendConversationMessage(input.conversationId, 'user', input.latestUserMessage)
  const withLatestMessages = [
    ...conversationData.messages.map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: input.latestUserMessage },
  ]
  const conversationText = formatConversationForPrompt(withLatestMessages, 24)

  let action: WorkflowAction = 'plan'
  let draft: DraftResult | null = null
  let loop = 0
  const maxLoop = 5
  let planResult: Awaited<ReturnType<typeof runPlannerAgent>> | null = null

  while (loop < maxLoop) {
    loop += 1

    if (action === 'plan') {
      await emitWorkflowStage(input, 'plan', '正在分析需求并规划文章方向…')
      throwIfAborted(input.signal)
      planResult = await runPlannerAgent(conversationText, input.signal)
      throwIfAborted(input.signal)
      action = planResult.missingFields.length > 0 ? 'ask_followup' : 'write'
      continue
    }

    if (action === 'ask_followup') {
      await emitWorkflowStage(input, 'ask_followup', '缺少关键信息，正在整理补充问题…')
      throwIfAborted(input.signal)
      const followupQuestions =
        planResult?.followupQuestions?.filter(Boolean).slice(0, 3) ?? ['你希望文章聚焦什么主题？']

      const message = `【BLOG_WORKFLOW_FOLLOWUP】\n在开始生成前，我还需要补充一些信息：\n${followupQuestions
        .map((q, idx) => `${idx + 1}. ${q}`)
        .join('\n')}`
      await appendConversationMessage(input.conversationId, 'assistant', message)

      return {
        status: 'need_more_info',
        followupQuestions,
      }
    }

    if (action === 'write') {
      await emitWorkflowStage(input, 'write', '正在撰写博客草稿…')
      throwIfAborted(input.signal)
      draft = await runWriterAgent(conversationText, planResult!, input.signal)
      throwIfAborted(input.signal)
      action = 'edit'
      continue
    }

    if (action === 'edit') {
      await emitWorkflowStage(input, 'edit', '正在润色文章结构与表达…')
      throwIfAborted(input.signal)
      draft = await runEditorAgent(draft!, input.signal)
      throwIfAborted(input.signal)
      action = 'save'
      continue
    }

    if (action === 'save') {
      await emitWorkflowStage(
        input,
        'save',
        input.publishDirectly ? '正在保存并发布文章…' : '正在保存文章草稿…'
      )
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
      await appendConversationMessage(input.conversationId, 'assistant', assistantMessage)

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

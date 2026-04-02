import {
  runEditorAgent,
  runPlannerAgent,
  runWriterAgent,
  type DraftResult,
} from '../agents/blog-writer-agents'
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
}

type WorkflowAction = 'plan' | 'ask_followup' | 'write' | 'edit' | 'save'

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

export async function runBlogReactOrchestrator(input: BlogWorkflowInput): Promise<BlogWorkflowResult> {
  const conversationData = await loadConversationWithMessages(input.conversationId, input.userId)
  if (!conversationData) {
    throw new Error('会话不存在或无权限访问')
  }

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
      planResult = await runPlannerAgent(conversationText)
      action = planResult.missingFields.length > 0 ? 'ask_followup' : 'write'
      continue
    }

    if (action === 'ask_followup') {
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
      draft = await runWriterAgent(conversationText, planResult!)
      action = 'edit'
      continue
    }

    if (action === 'edit') {
      draft = await runEditorAgent(draft!)
      action = 'save'
      continue
    }

    if (action === 'save') {
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

import Link from 'next/link'
import type { Route } from 'next'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ArrowRight, MessageSquareQuote } from 'lucide-react'
import { getApiFetchUrl } from '@/lib/api-client'
import type { ApiResponse } from '@/lib/api-client'
import type { ChatMessageSharePreview } from '@/lib/ai-chat-api'

async function getSharePreview(
  conversationId: string,
  messageId: string
): Promise<ChatMessageSharePreview | null> {
  const res = await fetch(
    getApiFetchUrl(
      `/chat/conversations/${encodeURIComponent(conversationId)}/messages/${encodeURIComponent(messageId)}/share-preview`
    ),
    {
      cache: 'no-store',
    }
  )

  const json = (await res.json().catch(() => ({}))) as ApiResponse<ChatMessageSharePreview>
  if (!res.ok || !json.success || !json.data) {
    return null
  }

  return json.data
}

function formatDateLabel(value: string): string {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export default async function AiChatSharePreviewPage({
  params,
}: {
  params: Promise<{ conversationId: string; messageId: string }>
}) {
  const { conversationId, messageId } = await params
  const preview = await getSharePreview(conversationId, messageId)

  if (!preview) {
    return (
      <main className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-4xl items-center justify-center px-4 py-10">
        <div className="w-full max-w-xl rounded-[2rem] border border-line-glass bg-surface-glass/88 p-8 text-center shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl">
          <div className="text-lg font-semibold text-content-primary">分享预览不可用</div>
          <p className="mt-3 text-sm leading-7 text-content-secondary">
            这条消息可能未开放分享，或者链接已经失效。
          </p>
          <Link
            href={'/ai-chat' as Route}
            className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-accent-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-primary/90"
          >
            返回 AI 对话
          </Link>
        </div>
      </main>
    )
  }

  const fullConversationHref = `/ai-chat/${encodeURIComponent(preview.conversation.id)}?message=${encodeURIComponent(preview.message.id)}`

  return (
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-5xl px-4 py-8 md:py-10">
      <div className="relative flex w-full flex-col overflow-hidden rounded-[2rem] border border-line-glass bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.98),rgba(246,248,252,0.92))] shadow-[0_28px_80px_rgba(15,23,42,0.10)]">
        <div className="border-b border-line-glass/70 px-6 py-5 md:px-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-accent-primary/20 bg-accent-primary/8 px-3 py-1 text-[11px] font-medium tracking-[0.18em] text-accent-primary">
            <MessageSquareQuote className="h-3.5 w-3.5" />
            MESSAGE SHARE
          </div>
          <h1 className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-content-primary md:text-3xl">
            {preview.conversation.title?.trim() || 'AI 对话分享'}
          </h1>
          <p className="mt-2 text-sm leading-7 text-content-secondary">
            这是一条单独分享出来的消息预览，你可以先快速浏览重点内容，再决定是否打开完整对话。
          </p>
        </div>

        <div className="grid gap-6 px-6 py-6 md:grid-cols-[minmax(0,0.85fr)_minmax(280px,0.55fr)] md:px-8">
          <section className="rounded-[1.6rem] border border-line-glass/70 bg-white/78 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
            {preview.contextMessage && (
              <div className="mb-4 rounded-2xl border border-line-glass/70 bg-surface-glass/60 p-4">
                <div className="text-[11px] font-semibold tracking-[0.16em] text-content-tertiary">
                  用户提问
                </div>
                <div className="mt-2 whitespace-pre-wrap text-sm leading-7 text-content-primary">
                  {preview.contextMessage.content}
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-accent-primary/12 bg-accent-primary/6 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-[11px] font-semibold tracking-[0.16em] text-accent-primary">
                  {preview.message.role === 'assistant' ? 'AI 回复' : '分享消息'}
                </div>
                <div className="text-[11px] text-content-tertiary">
                  {formatDateLabel(preview.message.createdAt)}
                </div>
              </div>
              <div className="md-content mt-3 max-w-none break-words text-sm text-content-primary">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    table: ({ children, ...props }) => (
                      <div className="md-table-wrapper">
                        <table {...props}>{children}</table>
                      </div>
                    ),
                    a: ({ children, ...props }) => (
                      <a {...props} target="_blank" rel="noopener noreferrer">
                        {children}
                      </a>
                    ),
                  }}
                >
                  {preview.message.content || ''}
                </ReactMarkdown>
              </div>
            </div>
          </section>

          <aside className="flex flex-col gap-4">
            <div className="rounded-[1.6rem] border border-line-glass/70 bg-white/72 p-5">
              <div className="text-sm font-semibold text-content-primary">继续查看完整上下文</div>
              <p className="mt-2 text-sm leading-7 text-content-secondary">
                如果你想看这条消息前后的完整对话，可以打开原会话并自动定位到当前消息。
              </p>
              <Link
                href={fullConversationHref as Route}
                className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-accent-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-primary/90"
              >
                打开完整对话
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="rounded-[1.6rem] border border-line-glass/70 bg-surface-glass/72 p-5">
              <div className="text-sm font-semibold text-content-primary">分享说明</div>
              <p className="mt-2 text-sm leading-7 text-content-secondary">
                只有被开启分享的会话，才可以生成这类消息预览链接。
              </p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  )
}

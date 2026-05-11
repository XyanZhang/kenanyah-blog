import { redirect } from 'next/navigation'
import type { Route } from 'next'

export default async function LegacyAiChatOptionalConversationPage({
  params,
  searchParams,
}: {
  params: Promise<{ conversationId?: string[] }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { conversationId } = await params
  const query = await searchParams
  const suffix = conversationId?.length ? `/${conversationId.map(encodeURIComponent).join('/')}` : ''
  const nextSearchParams = new URLSearchParams()

  Object.entries(query).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => nextSearchParams.append(key, item))
      return
    }
    if (value !== undefined) {
      nextSearchParams.set(key, value)
    }
  })

  const search = nextSearchParams.toString()
  redirect(`/workspace/ai-chat${suffix}${search ? `?${search}` : ''}` as Route)
}

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Bot, ArrowRight } from 'lucide-react'
import type { DashboardCard as DashboardCardType, AiChatCardConfig } from '@blog/types'

interface AiChatCardProps {
  card: DashboardCardType
  onOpenConfig?: () => void
}

export function AiChatCard({ card }: AiChatCardProps) {
  const router = useRouter()
  const config = (card.config || {}) as AiChatCardConfig & {
    navigateTo?: string
  }

  const title = config.title ?? 'AI 小助手'
  const subtitle = config.subtitle ?? '和智能助手聊聊想法、写作灵感或技术问题。'

  const handleClick = useCallback(() => {
    router.push('/ai-chat')
  }, [router])

  return (
    <button
      type="button"
      onClick={handleClick}
      className="group relative flex h-full w-full flex-col items-start justify-between overflow-hidden rounded-2xl bg-linear-to-br from-accent-primary/10 via-surface-glass to-accent-primary/5 p-4 text-left transition-all hover:from-accent-primary/20 hover:to-accent-primary/10 hover:shadow-[0_18px_45px_rgba(0,0,0,0.18)]"
    >
      <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-accent-primary/15 blur-2xl transition-opacity group-hover:opacity-80" />

      <div className="relative mb-3 flex items-center gap-3">
        <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-linear-to-br from-accent-primary to-accent-secondary text-white shadow-lg shadow-accent-primary/40">
          <Bot className="h-6 w-6 animate-[float_3s_ease-in-out_infinite]" />
          <div className="absolute -right-1 -bottom-1 h-3 w-3 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.9)]" />
        </div>
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-accent-primary/80">
            AI Assistant
          </div>
          <h3 className="text-base font-semibold text-content-primary">{title}</h3>
        </div>
      </div>

      <p className="relative mb-4 line-clamp-2 text-xs text-content-secondary">
        {subtitle}
      </p>

      <div className="relative mt-auto flex items-center justify-between w-full text-xs">
        <span className="inline-flex items-center rounded-full bg-surface-glass/80 px-2 py-1 text-[11px] text-content-tertiary backdrop-blur">
          ⌘ + K 搜索 · 支持多轮对话
        </span>
        <span className="inline-flex items-center gap-1 text-accent-primary text-xs font-medium">
          开始聊天
          <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </button>
  )
}


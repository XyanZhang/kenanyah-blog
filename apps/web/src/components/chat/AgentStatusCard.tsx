import type { ChatStatusMode, ChatUserFacingStatus } from '@/lib/ai-chat-api'

type AgentStatusCardProps = {
  mode: ChatStatusMode
  status: ChatUserFacingStatus
  label: string
}

type StatusStep = {
  id: ChatUserFacingStatus
  label: string
}

function getStatusSteps(mode: ChatStatusMode): StatusStep[] {
  if (mode === 'workflow') {
    return [
      { id: 'thinking', label: '理解需求' },
      { id: 'organizing', label: '补全素材' },
      { id: 'creating', label: '生成内容' },
      { id: 'responding', label: '准备结果' },
    ]
  }

  return [
    { id: 'thinking', label: '理解中' },
    { id: 'searching', label: '查找中' },
    { id: 'organizing', label: '整理中' },
    { id: 'responding', label: '回复中' },
  ]
}

function getStatusOrder(status: ChatUserFacingStatus, mode: ChatStatusMode): number {
  const steps = getStatusSteps(mode)
  const exactIndex = steps.findIndex((step) => step.id === status)
  if (exactIndex >= 0) {
    return exactIndex
  }

  if (status === 'creating') {
    return Math.max(steps.length - 2, 0)
  }

  return 0
}

export function AgentStatusCard(props: AgentStatusCardProps) {
  const steps = getStatusSteps(props.mode)
  const activeIndex = getStatusOrder(props.status, props.mode)

  return (
    <div className="mb-3 overflow-hidden rounded-[1.35rem] border border-line-glass/75 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.92),rgba(246,252,250,0.9)_42%,rgba(233,245,242,0.94))] shadow-[0_14px_38px_rgba(15,23,42,0.08)]">
      <div className="relative overflow-hidden px-3.5 py-3">
        <div className="pointer-events-none absolute inset-0 opacity-70">
          <div className="absolute inset-y-0 left-0 w-full animate-pulse bg-[linear-gradient(110deg,rgba(255,255,255,0.02),rgba(255,255,255,0.3),rgba(255,255,255,0.02))]" />
        </div>
        <div className="relative">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.26em] text-content-tertiary">
                正在处理中
              </div>
              <div className="mt-1 text-sm font-medium text-content-primary">{props.label}</div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-accent-primary shadow-[0_0_0_4px_rgba(13,148,136,0.14)]" />
              <span className="h-2 w-2 rounded-full bg-accent-primary/45" />
              <span className="h-2 w-2 rounded-full bg-accent-primary/25" />
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {steps.map((step, index) => {
              const isActive = index === activeIndex
              const isCompleted = index < activeIndex
              return (
                <div
                  key={`${props.mode}-${step.label}`}
                  className={`rounded-2xl border px-2.5 py-2 text-center transition-all ${
                    isActive
                      ? 'border-accent-primary/28 bg-accent-primary/12 text-accent-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.78)]'
                      : isCompleted
                        ? 'border-line-glass/80 bg-white/72 text-content-secondary'
                        : 'border-line-glass/65 bg-white/45 text-content-tertiary'
                  }`}
                >
                  <div className="text-[11px] font-medium">{step.label}</div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

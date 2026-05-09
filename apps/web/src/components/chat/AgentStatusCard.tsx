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

type StatusStepIndicatorProps = {
  step: StatusStep
  isActive: boolean
  isCompleted: boolean
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

function StatusStepIndicator({ step, isActive, isCompleted }: StatusStepIndicatorProps) {
  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <span
        className={`h-1.5 w-1.5 shrink-0 rounded-full transition-colors ${
          isActive
            ? 'bg-accent-primary'
            : isCompleted
              ? 'bg-accent-primary/55'
              : 'bg-content-dim/45'
        }`}
      />
      <span
        className={`truncate text-[11px] leading-4 transition-colors ${
          isActive
            ? 'font-medium text-accent-primary'
            : isCompleted
              ? 'text-content-secondary'
              : 'text-content-tertiary/70'
        }`}
      >
        {step.label}
      </span>
    </div>
  )
}

export function AgentStatusCard(props: AgentStatusCardProps) {
  const steps = getStatusSteps(props.mode)
  const activeIndex = getStatusOrder(props.status, props.mode)

  return (
    <div className="mb-2.5 w-full max-w-full rounded-xl border border-line-glass/45 bg-surface-primary/35 px-3 py-2.5 text-content-primary sm:w-[30rem]">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-primary/35" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-accent-primary/80" />
            </span>
            <span className="text-[11px] font-medium leading-4 text-content-tertiary">正在思考</span>
          </div>
          <div className="mt-1 truncate text-sm leading-5 text-content-primary">{props.label}</div>
        </div>
        <div className="hidden shrink-0 items-center gap-1.5 pt-1 sm:flex">
          {steps.map((step, index) => {
            const isActive = index === activeIndex
            const isCompleted = index < activeIndex
            return (
              <StatusStepIndicator
                key={`${props.mode}-${step.label}`}
                step={step}
                isActive={isActive}
                isCompleted={isCompleted}
              />
            )
          })}
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1.5 sm:hidden">
        {steps.map((step, index) => {
          const isActive = index === activeIndex
          const isCompleted = index < activeIndex
          return (
            <StatusStepIndicator
              key={`${props.mode}-mobile-${step.label}`}
              step={step}
              isActive={isActive}
              isCompleted={isCompleted}
            />
          )
        })}
      </div>
    </div>
  )
}

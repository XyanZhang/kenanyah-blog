import type { ReactNode } from 'react'
import { Card } from '@/components/ui'
import { cn } from '@/lib/cn'

export function ChartCard({
  eyebrow,
  title,
  description,
  children,
  className,
  contentClassName,
}: {
  eyebrow: string
  title: string
  description: string
  children: ReactNode
  className?: string
  contentClassName?: string
}) {
  return (
    <Card className={cn('flex h-full flex-col overflow-hidden rounded-[28px] p-0', className)}>
      <div className="border-b border-[var(--border)] px-5 py-4">
        <p className="font-['IBM_Plex_Mono'] text-[11px] uppercase tracking-[0.12em] text-[var(--text-muted)]">{eyebrow}</p>
        <div className="mt-2 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-[var(--text)]">{title}</h2>
            <p className="mt-1 text-sm leading-6 text-[var(--text-soft)]">{description}</p>
          </div>
        </div>
      </div>
      <div className={cn('flex-1 px-4 py-4', contentClassName)}>{children}</div>
    </Card>
  )
}

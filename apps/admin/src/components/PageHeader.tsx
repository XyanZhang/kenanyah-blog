import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow: string
  title: string
  description: string
  actions?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('admin-panel flex flex-col gap-3 rounded-2xl p-4 lg:flex-row lg:items-end lg:justify-between', className)}>
      <div>
        <p className="font-['IBM_Plex_Mono'] text-[11px] uppercase tracking-[0.12em] text-[var(--text-muted)]">{eyebrow}</p>
        <h1 className="mt-2 text-[28px] font-semibold leading-tight text-[var(--text)]">{title}</h1>
        <p className="mt-1 max-w-[72ch] text-sm leading-6 text-[var(--text-soft)]">{description}</p>
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  )
}

import type { ReactNode } from 'react'
import { Card } from './ui'

export function SectionTable({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b border-[var(--border)] px-4 py-3">
        <h2 className="font-['IBM_Plex_Mono'] text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">{title}</h2>
      </div>
      <div className="overflow-x-auto">{children}</div>
    </Card>
  )
}

import type { AdminDashboardActionItem } from '@blog/types'
import { Badge } from '@/components/ui'
import { ChartCard } from './ChartCard'

export function ActionItemsPanel({
  items,
  contentHealthScore,
}: {
  items: AdminDashboardActionItem[]
  contentHealthScore: number
}) {
  return (
    <ChartCard
      eyebrow="Action Queue"
      title="Need attention"
      description="Fast checks for the next publishing and moderation actions."
      className="min-h-[360px]"
      contentClassName="space-y-4 px-5 py-4"
    >
      <div className="rounded-[24px] border border-[var(--border)] bg-[linear-gradient(140deg,color-mix(in_srgb,var(--accent-soft)_68%,white_8%),color-mix(in_srgb,var(--success-soft)_74%,transparent))] p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-['IBM_Plex_Mono'] text-[11px] uppercase tracking-[0.1em] text-[var(--text-muted)]">Visual Score</p>
            <h3 className="mt-2 text-lg font-semibold text-[var(--text)]">Content Health Score</h3>
            <p className="mt-1 text-sm text-[var(--text-soft)]">A simple visual placeholder for publishing rhythm and moderation balance.</p>
          </div>
          <div className="rounded-full border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-3 text-center">
            <p className="text-3xl font-semibold text-[var(--text)]">{contentHealthScore}</p>
            <p className="text-[10px] uppercase tracking-[0.08em] text-[var(--text-muted)]">Score</p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="rounded-[22px] border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-[var(--text)]">{item.label}</p>
              <Badge tone={item.tone}>{item.value}</Badge>
            </div>
            <p className="mt-2 text-sm text-[var(--text-soft)]">{item.description}</p>
          </div>
        ))}
      </div>
    </ChartCard>
  )
}

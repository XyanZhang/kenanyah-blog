import type { AdminDashboardActivityItem } from '@blog/types'
import { EmptyState } from '@/components/EmptyState'
import { ChartCard } from './ChartCard'

const activityTone: Record<AdminDashboardActivityItem['type'], string> = {
  post_updated: 'var(--accent)',
  comment_pending: 'var(--warning)',
  comment_approved: 'var(--success)',
}

const activityLabel: Record<AdminDashboardActivityItem['type'], string> = {
  post_updated: 'Post update',
  comment_pending: 'Pending comment',
  comment_approved: 'Approved comment',
}

function formatDate(value: Date) {
  return new Date(value).toLocaleString()
}

export function RecentActivityPanel({ items }: { items: AdminDashboardActivityItem[] }) {
  return (
    <ChartCard
      eyebrow="Timeline"
      title="Recent activity"
      description="Latest content edits and moderation actions from the admin workflow."
      className="min-h-[360px]"
      contentClassName="px-5 py-4"
    >
      {!items.length ? (
        <EmptyState message="No activity has been recorded yet." />
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span className="mt-1 h-2.5 w-2.5 rounded-full" style={{ background: activityTone[item.type] }} />
                <span className="mt-2 h-full w-px bg-[var(--border)]" />
              </div>
              <div className="min-w-0 flex-1 pb-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-[var(--text)]">{item.title}</p>
                  <span className="rounded-full bg-[var(--bg-muted)] px-2 py-0.5 text-[10px] uppercase tracking-[0.08em] text-[var(--text-muted)]">
                    {activityLabel[item.type]}
                  </span>
                </div>
                <p className="mt-1 text-sm text-[var(--text-soft)]">{item.description}</p>
                <p className="mt-2 text-xs text-[var(--text-muted)]">{formatDate(item.timestamp)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </ChartCard>
  )
}

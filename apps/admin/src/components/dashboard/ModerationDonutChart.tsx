import type { AdminDashboardModerationSummary } from '@blog/types'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { EmptyState } from '@/components/EmptyState'
import { ChartCard } from './ChartCard'
import { chartTheme } from './chart-theme'

export function ModerationDonutChart({ data }: { data: AdminDashboardModerationSummary }) {
  const chartData = [
    { name: 'Pending', value: data.pending, color: chartTheme.warning },
    { name: 'Approved', value: data.approved, color: chartTheme.success },
  ].filter((item) => item.value > 0)

  const total = data.pending + data.approved

  return (
    <ChartCard
      eyebrow="Moderation"
      title="Comment review status"
      description="Pending comments vs approved comments in the current dataset."
      className="min-h-[320px]"
      contentClassName="flex h-[260px] items-center gap-2 px-3 py-3"
    >
      {!total ? (
        <EmptyState message="No moderation records to visualize yet." />
      ) : (
        <>
          <div className="h-full flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={58} outerRadius={86} paddingAngle={4}>
                  {chartData.map((item) => (
                    <Cell key={item.name} fill={item.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: 16,
                    border: `1px solid ${chartTheme.border}`,
                    background: 'var(--surface-strong)',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="w-[140px] space-y-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.08em] text-[var(--text-muted)]">Total</p>
              <p className="mt-1 text-3xl font-semibold text-[var(--text)]">{total}</p>
            </div>
            {[
              { label: 'Pending', value: data.pending, color: 'var(--warning)' },
              { label: 'Approved', value: data.approved, color: 'var(--success)' },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: item.color }} />
                  <p className="text-xs text-[var(--text-soft)]">{item.label}</p>
                </div>
                <p className="mt-2 text-xl font-semibold text-[var(--text)]">{item.value}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </ChartCard>
  )
}

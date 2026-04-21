import type { AdminDashboardTrendPoint } from '@blog/types'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { EmptyState } from '@/components/EmptyState'
import { ChartCard } from './ChartCard'
import { chartTheme } from './chart-theme'

export function PublishingBreakdownChart({ data }: { data: AdminDashboardTrendPoint[] }) {
  return (
    <ChartCard
      eyebrow="Structure"
      title="Draft vs published mix"
      description="Stacked view of draft creation and published output by day."
      className="min-h-[320px]"
      contentClassName="h-[260px] px-3 py-3"
    >
      {!data.length ? (
        <EmptyState message="No post distribution data available." />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 12, right: 18, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={chartTheme.grid} vertical={false} />
            <XAxis dataKey="label" tick={{ fill: chartTheme.textMuted, fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={18} />
            <YAxis tick={{ fill: chartTheme.textMuted, fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} width={28} />
            <Tooltip
              cursor={{ fill: 'color-mix(in srgb, var(--accent-soft) 40%, transparent)' }}
              contentStyle={{
                borderRadius: 16,
                border: `1px solid ${chartTheme.border}`,
                background: 'var(--surface-strong)',
              }}
            />
            <Bar dataKey="draftPosts" stackId="publishing" fill={chartTheme.warning} radius={[6, 6, 0, 0]} />
            <Bar dataKey="publishedPosts" stackId="publishing" fill={chartTheme.success} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  )
}

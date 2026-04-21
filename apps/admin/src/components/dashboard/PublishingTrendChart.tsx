import type { AdminDashboardTrendPoint } from '@blog/types'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { EmptyState } from '@/components/EmptyState'
import { ChartCard } from './ChartCard'
import { chartTheme } from './chart-theme'

export function PublishingTrendChart({ data }: { data: AdminDashboardTrendPoint[] }) {
  return (
    <ChartCard
      eyebrow="Publishing Trend"
      title="30-day publishing pulse"
      description="Daily created and published volume across the last 30 days."
      className="min-h-[360px]"
      contentClassName="h-[300px] px-3 py-3"
    >
      {!data.length ? (
        <EmptyState message="No publishing activity in the selected window." />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 16, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={chartTheme.grid} vertical={false} />
            <XAxis dataKey="label" tick={{ fill: chartTheme.textMuted, fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={18} />
            <YAxis tick={{ fill: chartTheme.textMuted, fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} width={30} />
            <Tooltip
              cursor={{ stroke: chartTheme.border }}
              contentStyle={{
                borderRadius: 16,
                border: `1px solid ${chartTheme.border}`,
                background: 'var(--surface-strong)',
                color: chartTheme.text,
              }}
            />
            <Line type="monotone" dataKey="createdPosts" stroke={chartTheme.accent} strokeWidth={3} dot={false} activeDot={{ r: 4 }} />
            <Line type="monotone" dataKey="publishedPosts" stroke={chartTheme.success} strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  )
}

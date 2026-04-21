import type { AdminDashboardDistributionItem } from '@blog/types'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { EmptyState } from '@/components/EmptyState'
import { ChartCard } from './ChartCard'
import { chartTheme } from './chart-theme'

export function CategoryDistributionChart({ data }: { data: AdminDashboardDistributionItem[] }) {
  return (
    <ChartCard
      eyebrow="Categories"
      title="Top category coverage"
      description="Leading categories ranked by related post count."
      className="min-h-[320px]"
      contentClassName="h-[260px] px-3 py-3"
    >
      {!data.length ? (
        <EmptyState message="No categories are ready for comparison." />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 8, right: 18, left: 18, bottom: 0 }}>
            <CartesianGrid stroke={chartTheme.grid} horizontal={false} />
            <XAxis type="number" tick={{ fill: chartTheme.textMuted, fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
            <YAxis type="category" dataKey="label" tick={{ fill: chartTheme.textSoft, fontSize: 12 }} axisLine={false} tickLine={false} width={88} />
            <Tooltip
              cursor={{ fill: 'color-mix(in srgb, var(--accent-soft) 35%, transparent)' }}
              contentStyle={{
                borderRadius: 16,
                border: `1px solid ${chartTheme.border}`,
                background: 'var(--surface-strong)',
              }}
            />
            <Bar dataKey="value" fill={chartTheme.accent} radius={[0, 8, 8, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  )
}

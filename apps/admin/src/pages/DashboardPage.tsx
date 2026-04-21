import { useEffect, useState } from 'react'
import type { AdminDashboardData } from '@blog/types'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import {
  ActionItemsPanel,
  CategoryDistributionChart,
  KpiStrip,
  ModerationDonutChart,
  PublishingBreakdownChart,
  PublishingTrendChart,
  RecentActivityPanel,
} from '@/components/dashboard'
import { getDashboardData } from '@/lib/api'

function calculateContentHealthScore(data: AdminDashboardData) {
  const totalPostsBase = Math.max(data.kpis.totalPosts, 1)
  const moderationBase = Math.max(data.commentModeration.pending + data.commentModeration.approved, 1)
  const publishMomentum = data.publishingTrend.reduce((sum, item) => sum + item.publishedPosts, 0)

  const draftPenalty = Math.min(35, Math.round((data.kpis.draftPosts / totalPostsBase) * 35))
  const moderationPenalty = Math.min(30, Math.round((data.commentModeration.pending / moderationBase) * 30))
  const momentumBoost = Math.min(20, publishMomentum)
  const categoryBoost = Math.min(10, data.categoryDistribution.length * 2)

  return Math.max(32, Math.min(98, 70 - draftPenalty - moderationPenalty + momentumBoost + categoryBoost))
}

export function DashboardPage() {
  const [data, setData] = useState<AdminDashboardData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getDashboardData()
      .then((result) => setData(result.data))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load dashboard'))
  }, [])

  const contentHealthScore = data ? calculateContentHealthScore(data) : 72

  return (
    <>
      <div className="admin-sticky space-y-3">
        {/* <PageHeader
          eyebrow="BI Dashboard"
          title="Content operations command center"
          description="Track publishing rhythm, moderation pressure, and category coverage from one high-density workspace."
          className="rounded-[28px]"
        /> */}
        {data ? (
          <KpiStrip kpis={data.kpis} />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {Array.from({ length: 5 }, (_, index) => (
              <div key={index} className="h-[112px] rounded-[22px] border border-[var(--border)] bg-[var(--surface)]" />
            ))}
          </div>
        )}
      </div>

      {error ? <p className="mb-4 rounded-xl border border-[var(--danger)]/20 bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger)]">{error}</p> : null}

      {!data && !error ? (
        <EmptyState message="Loading dashboard analytics..." />
      ) : data ? (
        <div className="space-y-4 pb-6">
          <section className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(340px,0.9fr)]">
            <PublishingTrendChart data={data.publishingTrend} />
            <ModerationDonutChart data={data.commentModeration} />
          </section>

          <section className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
            <PublishingBreakdownChart data={data.publishingBreakdown} />
            <CategoryDistributionChart data={data.categoryDistribution} />
          </section>

          <section className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
            <RecentActivityPanel items={data.recentActivity} />
            <ActionItemsPanel items={data.actionItems} contentHealthScore={contentHealthScore} />
          </section>
        </div>
      ) : null}
    </>
  )
}

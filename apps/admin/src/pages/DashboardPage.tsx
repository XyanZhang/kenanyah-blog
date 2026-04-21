import { useEffect, useState } from 'react'
import type { AdminDashboardData } from '@blog/types'
import { PageHeader } from '@/components/PageHeader'
import { Card, Badge } from '@/components/ui'
import { getDashboardData } from '@/lib/api'
import { EmptyState } from '@/components/EmptyState'

export function DashboardPage() {
  const [data, setData] = useState<AdminDashboardData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getDashboardData()
      .then((result) => setData(result.data))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load dashboard'))
  }, [])

  const statCards = data
    ? [
        { label: 'Total Posts', value: data.stats.totalPosts },
        { label: 'Draft Posts', value: data.stats.draftPosts },
        { label: 'Pending Comments', value: data.stats.pendingComments },
        { label: 'Categories', value: data.stats.categoryCount },
        { label: 'Tags', value: data.stats.tagCount },
      ]
    : []

  return (
    <>
      <div className="admin-sticky">
        <PageHeader
          eyebrow="Overview"
          title="Publishing operations at a glance"
          description="A quick snapshot of content health, moderation load, and the latest work happening across the site."
        />
      </div>

      {error ? <p className="mb-4 rounded-xl border border-[var(--danger)]/20 bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger)]">{error}</p> : null}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {statCards.map((item) => (
          <Card key={item.label} className="min-h-[112px]">
            <p className="font-['IBM_Plex_Mono'] text-[11px] uppercase tracking-[0.08em] text-[var(--text-muted)]">{item.label}</p>
            <p className="mt-3 text-[34px] font-semibold text-[var(--text)]">{item.value}</p>
          </Card>
        ))}
      </div>

      <div className="mt-4">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="font-['IBM_Plex_Mono'] text-[11px] uppercase tracking-[0.12em] text-[var(--text-muted)]">Recent Updates</p>
              <h2 className="mt-1 text-lg font-semibold text-[var(--text)]">Latest post activity</h2>
            </div>
          </div>
          {!data?.recentPosts.length ? (
            <EmptyState message="No recent post activity yet." />
          ) : (
            <div className="space-y-3">
              {data.recentPosts.map((post) => (
                <div key={post.id} className="flex flex-col gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-medium text-[var(--text)]">{post.title}</p>
                    <p className="mt-1 text-sm text-[var(--text-soft)]">
                      {post.author.name ?? post.author.username} · {new Date(post.updatedAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Badge tone={post.published ? 'success' : 'warning'}>{post.published ? 'Published' : 'Draft'}</Badge>
                    {post.isFeatured ? <Badge>Featured</Badge> : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </>
  )
}

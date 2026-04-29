'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { DashboardCard, RecentPostsCardConfig } from '@blog/types'
import { Calendar } from 'lucide-react'
import { getApiErrorMessage } from '@/lib/api-error'
import { getRecentDashboardPosts, type DashboardPostSummary } from '@/lib/dashboard-content-api'
import { CardLoadingState } from './CardLoadingState'

interface RecentPostsCardProps {
  card: DashboardCard
}

export function RecentPostsCard({ card }: RecentPostsCardProps) {
  const config = card.config as RecentPostsCardConfig
  const [posts, setPosts] = useState<DashboardPostSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    getRecentDashboardPosts(config.limit)
      .then((items) => {
        if (!cancelled) setPosts(items)
      })
      .catch((err) => {
        if (cancelled) return
        setError(getApiErrorMessage(err))
        setPosts([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [config.limit])

  const displayPosts = posts.slice(0, config.limit)

  if (loading) {
    return (
      <div className="flex h-full flex-col">
        <h3 className="mb-4 text-lg font-semibold text-content-primary">Recent Posts</h3>
        <CardLoadingState />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full flex-col">
        <h3 className="mb-4 text-lg font-semibold text-content-primary">Recent Posts</h3>
        <p className="text-sm text-red-500">{error}</p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <h3 className="mb-4 text-lg font-semibold text-content-primary">Recent Posts</h3>

      <div className="flex-1 space-y-3 overflow-auto">
        {displayPosts.length === 0 ? (
          <p className="text-sm text-content-tertiary">暂无文章</p>
        ) : displayPosts.map((post) => (
          <Link
            key={post.id}
            href={`/posts/${post.slug}` as any}
            className="block rounded-xl border border-line-glass/50 bg-surface-glass/40 p-3 backdrop-blur-sm transition-all hover:border-line-hover hover:bg-surface-glass/60 hover:shadow-md"
          >
            <h4 className="mb-1 font-medium text-content-primary line-clamp-2">
              {post.title}
            </h4>

            {config.showExcerpt && (
              <p className="mb-2 text-sm text-content-tertiary line-clamp-2">
                {post.excerpt}
              </p>
            )}

            {config.showDate && (
              <div className="flex items-center gap-1 text-xs text-content-muted">
                <Calendar className="h-3 w-3" />
                <span>{formatDistanceToNow(post.publishedAt, { addSuffix: true })}</span>
              </div>
            )}
          </Link>
        ))}
      </div>
    </div>
  )
}

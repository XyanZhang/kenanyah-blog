'use client'

import { useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { DashboardCard, RandomPostsCardConfig } from '@blog/types'
import { Calendar, Shuffle } from 'lucide-react'
import { getApiErrorMessage } from '@/lib/api-error'
import { getRecentDashboardPosts, type DashboardPostSummary } from '@/lib/dashboard-content-api'
import { buildDynamicImageUrl, isStaticsSource } from '@/lib/image-service'
import { CardLoadingState } from './CardLoadingState'

interface RandomPostsCardProps {
  card: DashboardCard
}

function shufflePosts(posts: DashboardPostSummary[]): DashboardPostSummary[] {
  return [...posts].sort(() => Math.random() - 0.5)
}

function resolveCardImage(src: string): string {
  if (!src) return src
  if (!isStaticsSource(src)) return src
  return buildDynamicImageUrl(src, {
    width: 160,
    height: 160,
    quality: 70,
    fit: 'cover',
    format: 'webp',
  })
}

export function RandomPostsCard({ card }: RandomPostsCardProps) {
  const config = card.config as RandomPostsCardConfig
  const [sourcePosts, setSourcePosts] = useState<DashboardPostSummary[]>([])
  const [displayPosts, setDisplayPosts] = useState<DashboardPostSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refreshRandomPosts = useCallback(() => {
    setDisplayPosts(shufflePosts(sourcePosts).slice(0, config.limit))
  }, [config.limit, sourcePosts])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    getRecentDashboardPosts(Math.max(config.limit * 4, 12))
      .then((posts) => {
        if (cancelled) return
        setSourcePosts(posts)
        setDisplayPosts(shufflePosts(posts).slice(0, config.limit))
      })
      .catch((err) => {
        if (cancelled) return
        setError(getApiErrorMessage(err))
        setSourcePosts([])
        setDisplayPosts([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [config.limit])

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-content-primary">随机推荐</h3>
        <button
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-content-muted backdrop-blur-sm transition-colors hover:bg-surface-glass/60 hover:text-accent-primary"
          onClick={(e) => {
            e.preventDefault()
            refreshRandomPosts()
          }}
        >
          <Shuffle className="h-3 w-3" />
          换一批
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-auto">
        {loading ? (
          <CardLoadingState />
        ) : error ? (
          <p className="text-sm text-red-500">{error}</p>
        ) : displayPosts.length === 0 ? (
          <p className="text-sm text-content-tertiary">暂无文章</p>
        ) : displayPosts.map((post) => (
          <Link
            key={post.id}
            href={`/posts/${post.slug}` as any}
            className="group flex gap-3 rounded-xl border border-line-glass/50 bg-surface-glass/40 p-2 backdrop-blur-sm transition-all hover:border-line-hover hover:bg-surface-glass/60 hover:shadow-md"
          >
            {config.showImage && (
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-accent-tertiary-light to-accent-primary-light">
                {post.coverImage ? (
                  <Image
                    src={resolveCardImage(post.coverImage)}
                    alt={post.title}
                    fill
                    className="object-cover transition-transform group-hover:scale-105"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                ) : null}
              </div>
            )}

            <div className="flex min-w-0 flex-1 flex-col justify-between py-1">
              <div>
                <h4 className="mb-1 font-medium text-content-primary line-clamp-1 group-hover:text-accent-tertiary">
                  {post.title}
                </h4>
                {config.showExcerpt && (
                  <p className="text-xs text-content-tertiary line-clamp-2">{post.excerpt}</p>
                )}
              </div>

              {config.showDate && (
                <div className="flex items-center gap-1 text-xs text-content-muted">
                  <Calendar className="h-3 w-3" />
                  <span>{format(post.publishedAt, 'yyyy年MM月dd日', { locale: zhCN })}</span>
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

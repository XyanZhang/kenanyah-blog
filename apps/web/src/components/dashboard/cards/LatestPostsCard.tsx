'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { DashboardCard, LatestPostsCardConfig } from '@blog/types'
import { Calendar } from 'lucide-react'
import { apiClient } from '@/lib/api-client'
import type { ApiResponse } from '@/lib/api-client'
import { getApiErrorMessage } from '@/lib/api-error'
import { buildDynamicImageUrl, isStaticsSource } from '@/lib/image-service'
import { CardLoadingState } from './CardLoadingState'

interface LatestPostsCardProps {
  card: DashboardCard
}

interface PostItem {
  id: string
  title: string
  slug: string
  excerpt: string
  coverImage: string
  publishedAt: Date
}

type PostFromApi = {
  id: string
  slug: string
  title: string
  excerpt: string | null
  coverImage: string | null
  publishedAt: string | null
  createdAt: string
}

function mapPostToItem(post: PostFromApi): PostItem {
  const dateStr = post.publishedAt ?? post.createdAt
  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt ?? '',
    coverImage: post.coverImage ?? '',
    publishedAt: new Date(dateStr),
  }
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

export function LatestPostsCard({ card }: LatestPostsCardProps) {
  const config = card.config as LatestPostsCardConfig
  const [posts, setPosts] = useState<PostItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    const limit = config?.limit ?? 5
    apiClient
      .get('posts', { searchParams: { published: true, limit } })
      .json<ApiResponse<PostFromApi[]>>()
      .then((res) => {
        if (cancelled) return
        if (res.success && res.data && Array.isArray(res.data)) {
          setPosts(res.data.map(mapPostToItem))
        } else {
          setError(res.error ?? '加载失败')
          setPosts([])
        }
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
  }, [config?.limit])

  const displayPosts = posts.slice(0, config?.limit ?? 5)

  if (loading) {
    return (
      <div className="flex h-full flex-col">
        <h3 className="mb-4 text-lg font-semibold text-content-primary">最新文章</h3>
        <div className="flex-1">
          <CardLoadingState label="文章载入中 / Loading Posts" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full flex-col">
        <h3 className="mb-4 text-lg font-semibold text-content-primary">最新文章</h3>
        <p className="text-sm text-red-500">{error}</p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <h3 className="mb-4 text-lg font-semibold text-content-primary">最新文章</h3>

      <div className="flex-1 space-y-3 overflow-auto">
        {displayPosts.length === 0 ? (
          <p className="text-sm text-content-tertiary">暂无文章</p>
        ) : (
          <>
            {displayPosts.map((post) => (
              <Link
              key={post.id}
              href={`/posts/${post.slug}` as any}
              className="group flex gap-3 rounded-xl border border-line-glass/50 bg-surface-glass/40 p-2 backdrop-blur-sm transition-all hover:border-line-hover hover:bg-surface-glass/60 hover:shadow-md"
            >
              {config.showImage && (
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-linear-to-br from-accent-primary-light to-accent-secondary-light">
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
                <h4 className="mb-1 font-medium text-content-primary line-clamp-1 group-hover:text-accent-primary">
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
          </>
        )}
      </div>
    </div>
  )
}

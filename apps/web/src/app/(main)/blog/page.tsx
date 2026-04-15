'use client'

import { useEffect, useState } from 'react'
import { BlogTimeline, type BlogTimelineItem } from '@/components/blog/BlogTimeline'
import { Skeleton } from '@/components/ui/skeleton'
import { apiClient } from '@/lib/api-client'
import type { ApiResponse } from '@/lib/api-client'
import { getApiErrorMessage } from '@/lib/api-error'

type PostFromApi = {
  id: string
  slug: string
  title: string
  excerpt: string | null
  coverImage: string | null
  publishedAt: string | null
  createdAt: string
}

function mapPostToTimelineItem(post: PostFromApi): BlogTimelineItem {
  const date = post.publishedAt ?? post.createdAt
  return {
    id: post.id,
    title: post.title,
    excerpt: post.excerpt ?? '',
    date: date.slice(0, 10),
    slug: post.slug,
    coverImage: post.coverImage ?? undefined,
  }
}

/** 今年第几天、今年已过百分比、今天已过百分比（用于时间线页头） */
function useTodayStats() {
  const [stats, setStats] = useState({
    dayOfYear: 0,
    yearProgress: 0,
    dayProgress: 0,
    year: new Date().getFullYear(),
  })
  useEffect(() => {
    const now = new Date()
    const startOfYear = new Date(now.getFullYear(), 0, 0)
    const dayOfYear = Math.floor((now.getTime() - startOfYear.getTime()) / 86400000)
    const isLeap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0
    const daysInYear = isLeap(now.getFullYear()) ? 366 : 365
    const yearProgress = (dayOfYear / daysInYear) * 100
    const dayProgress = ((now.getHours() * 60 + now.getMinutes()) / (24 * 60)) * 100
    setStats({
      dayOfYear,
      yearProgress: Math.round(yearProgress * 10) / 10,
      dayProgress: Math.round(dayProgress * 10) / 10,
      year: now.getFullYear(),
    })
  }, [])
  return stats
}

function BlogPageSkeleton() {
  return (
    <main className="min-h-[calc(100vh-80px)] w-full flex flex-col" aria-busy="true">
      <header className="flex shrink-0 justify-center px-4 pb-6 pt-24 sm:px-6 sm:pt-28 md:pt-8">
        <div className="w-full max-w-2xl text-left">
          <Skeleton className="h-8 w-28 rounded-2xl sm:h-9 sm:w-32" />
          <Skeleton className="mt-3 h-4 w-40 rounded-full" />
          <div className="mt-4 flex flex-wrap gap-3">
            <Skeleton className="h-4 w-36 rounded-full" />
            <Skeleton className="h-4 w-28 rounded-full" />
            <Skeleton className="h-4 w-28 rounded-full" />
          </div>
        </div>
      </header>

      <div className="flex-1 px-4 pb-12 sm:px-6">
        <div className="mx-auto w-full max-w-2xl">
          {[
            { yearWidth: 'w-10', itemCount: 4 },
            { yearWidth: 'w-10', itemCount: 3 },
          ].map((group, groupIndex) => (
            <div key={groupIndex} className="relative mb-6 last:mb-0">
              <div className="absolute left-[4px] top-[2.125rem] bottom-0 w-0.5 bg-line-primary/35" />
              <div className="grid items-center min-h-8 mb-3" style={{ gridTemplateColumns: '10px 1fr' }}>
                <div className="flex items-center justify-center">
                  <Skeleton className={`h-5 ${group.yearWidth} rounded-full`} />
                </div>
                <div />
              </div>
              <div className="space-y-3">
                {Array.from({ length: group.itemCount }).map((_, itemIndex) => (
                  <div
                    key={itemIndex}
                    className="grid items-center min-h-8"
                    style={{ gridTemplateColumns: '10px 1fr' }}
                  >
                    <div className="relative h-full">
                      <span className="absolute left-[1px] top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-accent-primary/30 bg-bg-base" />
                    </div>
                    <div className="pl-5 py-1.5">
                      <div className="flex items-center gap-4 min-w-0">
                        <Skeleton className="h-4 w-14 shrink-0 rounded-full" />
                        <Skeleton
                          className={`h-4 rounded-full ${
                            itemIndex % 3 === 0 ? 'w-40 sm:w-56' : itemIndex % 3 === 1 ? 'w-48 sm:w-72' : 'w-36 sm:w-64'
                          }`}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}

export default function BlogPage() {
  const [items, setItems] = useState<BlogTimelineItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const todayStats = useTodayStats()

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    apiClient
      .get('posts', { searchParams: { published: true, limit: 50 } })
      .json<ApiResponse<PostFromApi[]>>()
      .then((res) => {
        if (cancelled) return
        if (res.success && res.data) {
          setItems(res.data.map(mapPostToTimelineItem))
        } else {
          setError(res.error ?? '加载失败')
        }
      })
      .catch((err) => {
        if (cancelled) return
        setError(getApiErrorMessage(err))
        setItems([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return <BlogPageSkeleton />
  }

  if (error) {
    return (
      <main className="h-[calc(100vh-80px)] w-full flex flex-col items-center justify-center">
        <p className="text-ui-destructive" role="alert">
          {error}
        </p>
      </main>
    )
  }

  const { dayOfYear, yearProgress, dayProgress, year } = todayStats

  return (
    <main className="min-h-[calc(100vh-80px)] w-full flex flex-col">
      {/* 标题 + 统计 + 当日状态：与时间线同宽居中，内容左对齐 */}
      <header className="flex shrink-0 justify-center px-4 pb-6 pt-24 sm:px-6 sm:pt-28 md:pt-8">
        <div className="w-full max-w-2xl text-left">
          <h1 className="text-2xl font-semibold text-content-primary">时间线</h1>
          <p className="mt-1 text-sm text-content-muted">
            共有 {items.length} 篇，欢迎浏览
          </p>
          <div className="mt-4 flex flex-col gap-1 text-sm text-content-tertiary sm:flex-row sm:flex-wrap sm:gap-x-6 sm:gap-y-1">
            <span>今天是 {year} 年的第 {dayOfYear} 天</span>
            <span>今年已过 {yearProgress}%</span>
            <span>今天已过 {dayProgress}%</span>
          </div>
        </div>
      </header>
      <div className="flex-1 px-4 pb-12 sm:px-6">
        <BlogTimeline items={items} />
      </div>
    </main>
  )
}

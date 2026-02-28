'use client'

import { useEffect, useState } from 'react'
import { BlogTimeline, type BlogTimelineItem } from '@/components/blog/BlogTimeline'
import { PageLoading } from '@/components/layout/PageLoading'
import { apiClient } from '@/lib/api-client'
import type { ApiResponse } from '@/lib/api-client'

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
        setError(err?.message ?? '加载失败')
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
    return (
      <main className="min-h-[calc(100vh-80px)] w-full">
        <PageLoading />
      </main>
    )
  }

  if (error) {
    return (
      <main className="h-[calc(100vh-80px)] w-full flex flex-col items-center justify-center">
        <p className="text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      </main>
    )
  }

  const { dayOfYear, yearProgress, dayProgress, year } = todayStats

  return (
    <main className="min-h-[calc(100vh-80px)] w-full flex flex-col">
      {/* 标题 + 统计 + 当日状态：与时间线同宽居中，内容左对齐 */}
      <header className="shrink-0 px-6 pt-8 pb-6 flex justify-center">
        <div className="w-full max-w-2xl text-left">
          <h1 className="text-2xl font-semibold text-content-primary">时间线</h1>
          <p className="mt-1 text-sm text-content-muted">
            共有 {items.length} 篇，欢迎浏览
          </p>
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm text-content-tertiary">
            <span>今天是 {year} 年的第 {dayOfYear} 天</span>
            <span>今年已过 {yearProgress}%</span>
            <span>今天已过 {dayProgress}%</span>
          </div>
        </div>
      </header>
      <div className="flex-1 px-6 pb-12">
        <BlogTimeline items={items} />
      </div>
    </main>
  )
}

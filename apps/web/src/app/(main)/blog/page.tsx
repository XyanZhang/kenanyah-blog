'use client'

import { useEffect, useState } from 'react'
import { BlogTimeline, type BlogTimelineItem } from '@/components/blog/BlogTimeline'
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

export default function BlogPage() {
  const [items, setItems] = useState<BlogTimelineItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
      <main className="h-[calc(100vh-80px)] w-full flex flex-col items-center justify-center">
        <p className="text-content-secondary">加载中…</p>
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

  return (
    <main className="h-[calc(100vh-80px)] w-full flex flex-col">
      <div className="flex-1 flex flex-col min-h-0 w-full">
        <div className="flex-1 min-h-0 min-w-0">
          <BlogTimeline items={items} className="h-full" />
        </div>
      </div>
    </main>
  )
}

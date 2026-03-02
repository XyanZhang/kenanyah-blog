'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { ThoughtCard } from './ThoughtCard'
import { fetchThoughtsPage } from './mock-data'
import type { ThoughtPostWithInteraction } from './types'

const PAGE_SIZE = 5

export function ThoughtsFeed() {
  const [posts, setPosts] = useState<ThoughtPostWithInteraction[]>([])
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const nextPageRef = useRef(1)
  const loadingRef = useRef(false)

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMore) return
    const pageToLoad = nextPageRef.current
    loadingRef.current = true
    setLoading(true)
    try {
      const next = fetchThoughtsPage(pageToLoad, PAGE_SIZE)
      setPosts((prev) => [...prev, ...next.map((p) => ({ ...p, liked: false, disliked: false, questioned: false }))])
      nextPageRef.current = pageToLoad + 1
      if (next.length < PAGE_SIZE) setHasMore(false)
    } finally {
      loadingRef.current = false
      setLoading(false)
    }
  }, [hasMore])

  useEffect(() => {
    loadMore()
  }, [])

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !loadingRef.current) {
          loadMore()
        }
      },
      { rootMargin: '200px', threshold: 0 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [loadMore, hasMore])

  const handleLike = useCallback((id: string, liked: boolean) => {
    setPosts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, liked } : p))
    )
  }, [])

  const handleDislike = useCallback((id: string, disliked: boolean) => {
    setPosts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, disliked } : p))
    )
  }, [])

  const handleQuestion = useCallback((id: string, questioned: boolean) => {
    setPosts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, questioned } : p))
    )
  }, [])

  const handleComment = useCallback((id: string) => {
    // 可后续接评论弹窗或跳转
    console.log('comment', id)
  }, [])

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <ThoughtCard
          key={post.id}
          post={post}
          onLike={handleLike}
          onDislike={handleDislike}
          onQuestion={handleQuestion}
          onComment={handleComment}
        />
      ))}
      <div ref={sentinelRef} className="h-4 flex items-center justify-center">
        {loading && (
          <span className="text-sm text-content-tertiary">加载中...</span>
        )}
        {!hasMore && posts.length > 0 && (
          <span className="text-sm text-content-tertiary">没有更多了</span>
        )}
      </div>
    </div>
  )
}

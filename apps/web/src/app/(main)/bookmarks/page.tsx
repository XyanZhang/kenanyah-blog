'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { BookmarkCard, type BookmarkItem } from '@/components/bookmarks/BookmarkCard'
import { AddBookmarkDialog } from '@/components/bookmarks/AddBookmarkDialog'
import { apiClient } from '@/lib/api-client'
import { getApiErrorMessage } from '@/lib/api-error'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Bookmark, Plus, Search, ArrowDown, ArrowUp } from 'lucide-react'
import { cn } from '@/lib/utils'

type BookmarkFromApi = {
  id: string
  title: string
  url: string
  notes: string | null
  category: string | null
  tags: string[] | null
  favicon: string | null
  createdAt: string
}

type ApiResponse = {
  success: boolean
  data?: BookmarkFromApi[]
  meta?: { total: number }
  error?: string
}

type SortOrder = 'newest' | 'oldest'

function BookmarksPageSkeleton() {
  return (
    <main className="min-h-[calc(100vh-80px)] w-full flex flex-col" aria-busy="true">
      <div className="mx-auto w-full max-w-3xl px-6 py-8">
        <header className="mb-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Skeleton className="h-8 w-20 rounded-2xl sm:h-9 sm:w-24" />
              <Skeleton className="mt-3 h-4 w-52 rounded-full" />
            </div>
            <Skeleton className="h-9 w-28 rounded-xl" />
          </div>

          <div className="mt-6 space-y-4">
            <Skeleton className="h-11 w-full rounded-xl" />
            <div className="flex flex-wrap items-center gap-2">
              <Skeleton className="h-4 w-10 rounded-full" />
              <Skeleton className="h-8 w-12 rounded-lg" />
              <Skeleton className="h-8 w-16 rounded-lg" />
              <Skeleton className="h-8 w-20 rounded-lg" />
              <Skeleton className="ml-auto h-8 w-14 rounded-lg" />
            </div>
          </div>
        </header>

        <div className="space-y-3">
          {Array.from({ length: 7 }).map((_, index) => (
            <div
              key={index}
              className="flex items-center gap-3 rounded-xl border border-line-glass/40 bg-surface-glass/25 px-3 py-2 backdrop-blur-sm"
            >
              <Skeleton className="h-8 w-8 shrink-0 rounded-md" />
              <div className="min-w-0 flex flex-1 items-center gap-2">
                <Skeleton
                  className={`h-4 rounded-full ${
                    index % 3 === 0 ? 'w-32 sm:w-44' : index % 3 === 1 ? 'w-40 sm:w-56' : 'w-28 sm:w-36'
                  }`}
                />
                <Skeleton className="hidden sm:block h-3 w-20 rounded-full" />
                <Skeleton className="hidden md:block h-5 w-14 rounded-md" />
                <Skeleton className="ml-auto h-3 w-10 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}

export default function BookmarksPage() {
  const [items, setItems] = useState<BookmarkItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest')

  const fetchBookmarks = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true)
    setError(null)
    try {
      const res = await apiClient
        .get('bookmarks', { searchParams: { limit: 200 } })
        .json<ApiResponse>()
      if (res.success && res.data) {
        setItems(
          res.data.map((b) => ({
            id: b.id,
            title: b.title,
            url: b.url,
            notes: b.notes,
            category: b.category,
            tags: Array.isArray(b.tags) ? b.tags : null,
            favicon: b.favicon,
            createdAt: b.createdAt,
          }))
        )
      } else {
        setError(res.error ?? '加载失败')
        setItems([])
      }
    } catch (err) {
      setError(getApiErrorMessage(err))
      setItems([])
    } finally {
      if (showLoading) setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchBookmarks()
  }, [fetchBookmarks])

  const categories = useMemo(() => {
    const set = new Set<string>()
    items.forEach((b) => b.category && set.add(b.category))
    return Array.from(set).sort()
  }, [items])

  const filteredAndSortedItems = useMemo(() => {
    let result = [...items]

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      result = result.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          b.url.toLowerCase().includes(q) ||
          (b.notes?.toLowerCase().includes(q) ?? false) ||
          (b.category?.toLowerCase().includes(q) ?? false) ||
          (b.tags?.some((t) => t.toLowerCase().includes(q)) ?? false)
      )
    }

    if (categoryFilter) {
      result = result.filter((b) => b.category === categoryFilter)
    }

    result.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime()
      const dateB = new Date(b.createdAt).getTime()
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB
    })

    return result
  }, [items, searchQuery, categoryFilter, sortOrder])

  if (loading) {
    return <BookmarksPageSkeleton />
  }

  if (error) {
    return (
      <main className="h-[calc(100vh-80px)] w-full flex flex-col items-center justify-center px-6">
        <p className="text-ui-destructive" role="alert">
          {error}
        </p>
        <Button variant="outline" className="mt-4" onClick={() => fetchBookmarks()}>
          重试
        </Button>
      </main>
    )
  }

  return (
    <main className="min-h-[calc(100vh-80px)] w-full flex flex-col">
      <div className="mx-auto w-full max-w-3xl px-6 py-8">
        {/* Header */}
        <header className="mb-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-content-primary">收藏</h1>
              <p className="mt-1 text-sm text-content-muted">
                {searchQuery || categoryFilter
                  ? `显示 ${filteredAndSortedItems.length} / 共 ${items.length} 条`
                  : `共 ${items.length} 条 · 支持搜索、分类筛选与手动添加`}
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => setAddDialogOpen(true)}
              className="shrink-0 self-start sm:self-auto"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              添加收藏
            </Button>
          </div>

          {/* Search + Filters */}
          {items.length > 0 && (
            <div className="mt-6 space-y-4">
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-content-tertiary"
                  aria-hidden
                />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜索标题、链接、备注、分类…"
                  className="w-full rounded-xl border border-line-glass bg-surface-glass/40 py-2.5 pl-10 pr-4 text-sm text-content-primary placeholder:text-content-tertiary focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
                  aria-label="搜索收藏"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-content-tertiary">分类：</span>
                <button
                  type="button"
                  onClick={() => setCategoryFilter(null)}
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                    categoryFilter === null
                      ? 'bg-accent-primary text-white'
                      : 'bg-surface-glass/40 text-content-secondary hover:bg-surface-glass/60'
                  )}
                >
                  全部
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategoryFilter(cat)}
                    className={cn(
                      'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                      categoryFilter === cat
                        ? 'bg-accent-primary text-white'
                        : 'bg-surface-glass/40 text-content-secondary hover:bg-surface-glass/60'
                    )}
                  >
                    {cat}
                  </button>
                ))}
                <div className="ml-auto flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      setSortOrder((s) => (s === 'newest' ? 'oldest' : 'newest'))
                    }
                    className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-content-tertiary hover:bg-surface-glass/40 hover:text-content-secondary transition-colors"
                    title={sortOrder === 'newest' ? '切换为最旧优先' : '切换为最新优先'}
                  >
                    {sortOrder === 'newest' ? (
                      <>
                        <ArrowDown className="h-3.5 w-3.5" />
                        最新
                      </>
                    ) : (
                      <>
                        <ArrowUp className="h-3.5 w-3.5" />
                        最旧
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </header>

        <AddBookmarkDialog
          open={addDialogOpen}
          onOpenChange={setAddDialogOpen}
          onSuccess={() => fetchBookmarks(false)}
        />

        {/* Content */}
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line-glass bg-surface-glass/20 py-20 text-center">
            <div className="rounded-2xl bg-accent-primary-light p-4">
              <Bookmark className="h-12 w-12 text-accent-primary" />
            </div>
            <p className="mt-4 font-medium text-content-secondary">暂无收藏</p>
            <p className="mt-1 text-sm text-content-tertiary">
              添加第一条收藏，或使用浏览器插件同步
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-6"
              onClick={() => setAddDialogOpen(true)}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              添加收藏
            </Button>
          </div>
        ) : filteredAndSortedItems.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line-glass bg-surface-glass/20 py-16 text-center">
            <p className="text-content-secondary">未找到匹配的收藏</p>
            <p className="mt-1 text-sm text-content-tertiary">
              尝试调整搜索关键词或分类筛选
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredAndSortedItems.map((item) => (
              <BookmarkCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}

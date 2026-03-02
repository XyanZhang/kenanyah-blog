'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Search as SearchIcon, FileText, Loader2 } from 'lucide-react'
import { apiClient } from '@/lib/api-client'
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog'

export interface SemanticSearchHit {
  postId: string
  title: string
  slug: string
  snippet: string
  score: number
}

const SEARCH_DEBOUNCE_MS = 300

export function GlobalSearch() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<SemanticSearchHit[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searched, setSearched] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const doSearch = useCallback(async (q: string) => {
    const trimmed = q.trim()
    if (!trimmed) {
      setHits([])
      setSearched(false)
      return
    }
    setLoading(true)
    setError(null)
    setSearched(true)
    try {
      const res = await apiClient
        .get('search/semantic', { searchParams: { q: trimmed, limit: 10 } })
        .json<{ success: boolean; data?: SemanticSearchHit[]; error?: string }>()
      if (res.success && res.data) {
        setHits(res.data)
      } else {
        setHits([])
        setError(res.error ?? '搜索失败')
      }
    } catch (err) {
      setHits([])
      setError(err instanceof Error ? err.message : '请求失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => {
      inputRef.current?.focus()
    }, 0)
    return () => clearTimeout(t)
  }, [open])

  useEffect(() => {
    if (!query.trim()) {
      setHits([])
      setSearched(false)
      setLoading(false)
      return
    }
    const t = setTimeout(() => doSearch(query), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [query, doSearch])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(true)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  const closeAndClear = useCallback(() => {
    setOpen(false)
    setQuery('')
    setHits([])
    setSearched(false)
    setError(null)
  }, [])

  const handleOpenChange = useCallback((next: boolean) => {
    setOpen(next)
    if (!next) {
      setQuery('')
      setHits([])
      setSearched(false)
      setError(null)
    }
  }, [])

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-xl max-h-[85vh] flex flex-col">
        <div
          className="flex flex-col min-h-0 -m-2"
          onKeyDown={(e) => {
            if (e.key === 'Escape') handleOpenChange(false)
          }}
        >
          <div className="relative mb-4">
            <SearchIcon
              className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-content-tertiary"
              aria-hidden
            />
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="输入关键词搜索文章…"
              className="w-full pl-10 pr-10 py-3 rounded-xl border border-line-glass bg-surface-glass text-content-primary placeholder:text-content-tertiary focus:outline-none focus:ring-2 focus:ring-accent-primary/50"
              aria-label="全局搜索"
            />
            {loading && (
              <Loader2
                className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-accent-primary animate-spin"
                aria-hidden
              />
            )}
          </div>

          {error && (
            <p className="text-red-500 text-sm mb-4" role="alert">
              {error}
            </p>
          )}

          <section
            className="flex-1 min-h-0 overflow-y-auto"
            aria-label="搜索结果"
          >
            {searched && !loading && (
              <>
                {hits.length === 0 ? (
                  <p className="text-content-secondary text-sm">
                    未找到相关文章。
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {hits.map((hit) => (
                      <li key={hit.postId}>
                        <Link
                          href={`/posts/${hit.slug}`}
                          onClick={closeAndClear}
                          className="w-full text-left block p-4 rounded-xl border border-line-glass bg-surface-glass hover:border-accent-primary/30 hover:bg-accent-primary/5 transition-colors"
                        >
                          <div className="flex items-start gap-3">
                            <FileText className="h-5 w-5 text-accent-primary shrink-0 mt-0.5" />
                            <div className="min-w-0 flex-1">
                              <h2 className="font-medium text-content-primary truncate">
                                {hit.title}
                              </h2>
                              <p className="text-sm text-content-secondary line-clamp-2 mt-1">
                                {hit.snippet}
                              </p>
                              <span className="text-xs text-content-tertiary mt-2 inline-block">
                                相关度 {(hit.score * 100).toFixed(0)}%
                              </span>
                            </div>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  )
}

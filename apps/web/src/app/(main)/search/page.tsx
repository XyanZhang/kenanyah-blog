'use client'

import { useState, useCallback, useEffect } from 'react'
import Link from 'next/link'
import type { Route } from 'next'
import { Search as SearchIcon, FileText, Loader2, Bot } from 'lucide-react'
import { apiClient } from '@/lib/api-client'
import { getApiErrorMessage } from '@/lib/api-error'

export type SemanticSearchHit =
  | {
      type: 'post'
      postId: string
      title: string
      slug: string
      snippet: string
      score: number
    }
  | {
      type: 'conversation'
      conversationId: string
      title: string
      snippet: string
      score: number
    }

const SEARCH_DEBOUNCE_MS = 300

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<SemanticSearchHit[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searched, setSearched] = useState(false)

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
      setError(getApiErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [])

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

  return (
    <main className="min-h-[60vh] w-full max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold text-content-primary mb-6">
        语义搜索
      </h1>
      <p className="text-content-secondary text-sm mb-6">
        输入关键词，按语义匹配博客文章并跳转到对应内容。
      </p>

      <div className="relative mb-8">
        <SearchIcon
          className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-content-tertiary"
          aria-hidden
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="输入关键词搜索文章…"
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-line-glass bg-surface-glass text-content-primary placeholder:text-content-tertiary focus:outline-none focus:ring-2 focus:ring-accent-primary/50"
          autoFocus
          aria-label="搜索博客"
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

      {searched && !loading && (
        <section aria-label="搜索结果">
          {hits.length === 0 ? (
            <p className="text-content-secondary">未找到相关文章。</p>
          ) : (
            <ul className="space-y-4">
              {hits.map((hit, index) => {
                const key = hit.type === 'post' ? hit.postId : hit.conversationId
                const href =
                  hit.type === 'post'
                    ? `/posts/${(hit as Extract<SemanticSearchHit, { type: 'post' }>).slug}`
                    : `/ai-chat?conversationId=${
                        (hit as Extract<SemanticSearchHit, { type: 'conversation' }>).conversationId
                      }`
                const Icon = hit.type === 'post' ? FileText : Bot
                const badgeText = hit.type === 'post' ? '文章' : '对话'

                return (
                  <li key={`${key}-${index}`}>
                    <Link
                      href={href as Route}
                      className="block p-4 rounded-xl border border-line-glass bg-surface-glass hover:border-accent-primary/30 hover:bg-accent-primary/5 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <Icon className="h-5 w-5 text-accent-primary shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h2 className="font-medium text-content-primary truncate">
                              {hit.title}
                            </h2>
                            <span className="inline-flex items-center rounded-full bg-surface-tertiary px-2 py-0.5 text-[11px] text-content-tertiary">
                              {badgeText}
                            </span>
                          </div>
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
                )
              })}
            </ul>
          )}
        </section>
      )}
    </main>
  )
}

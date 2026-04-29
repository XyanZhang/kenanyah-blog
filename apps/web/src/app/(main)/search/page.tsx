'use client'

import { useState, useCallback, useEffect } from 'react'
import Link from 'next/link'
import type { Route } from 'next'
import {
  Search as SearchIcon,
  FileText,
  Loader2,
  Bot,
  Bookmark,
  FolderOpen,
  FileSearch,
  Lightbulb,
} from 'lucide-react'
import { apiClient } from '@/lib/api-client'
import { getApiErrorMessage } from '@/lib/api-error'

export type SemanticSearchHit =
  | {
      type: 'post'
      postId: string
      title: string
      slug: string
      href?: string
      snippet: string
      score: number
    }
  | {
      type: 'conversation'
      conversationId: string
      title: string
      href?: string
      snippet: string
      score: number
    }
  | {
      type: 'pdf'
      documentId: string
      chunkId: string
      chunkIndex: number
      title: string
      href: string
      snippet: string
      score: number
    }
  | {
      type: 'thought'
      thoughtId: string
      title: string
      href: string
      snippet: string
      score: number
    }
  | {
      type: 'bookmark'
      bookmarkId: string
      title: string
      href: string
      snippet: string
      score: number
    }
  | {
      type: 'project'
      projectId: string
      title: string
      href: string
      snippet: string
      score: number
    }

const SEARCH_DEBOUNCE_MS = 300

function getHitKey(hit: SemanticSearchHit): string {
  if (hit.type === 'post') return hit.postId
  if (hit.type === 'conversation') return hit.conversationId
  if (hit.type === 'pdf') return `${hit.documentId}-${hit.chunkId}`
  if (hit.type === 'thought') return hit.thoughtId
  if (hit.type === 'bookmark') return hit.bookmarkId
  return hit.projectId
}

function getHitHref(hit: SemanticSearchHit): string {
  if (hit.href) return hit.href
  if (hit.type === 'post') return `/posts/${hit.slug}`
  if (hit.type === 'conversation') return `/ai-chat/${hit.conversationId}`
  return '/'
}

function getHitMeta(hit: SemanticSearchHit) {
  if (hit.type === 'post') return { Icon: FileText, badgeText: '文章' }
  if (hit.type === 'conversation') return { Icon: Bot, badgeText: '对话' }
  if (hit.type === 'pdf') return { Icon: FileSearch, badgeText: 'PDF' }
  if (hit.type === 'thought') return { Icon: Lightbulb, badgeText: '思考' }
  if (hit.type === 'bookmark') return { Icon: Bookmark, badgeText: '收藏' }
  return { Icon: FolderOpen, badgeText: '项目' }
}

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
    <main className="min-h-[60vh] w-full px-4 pb-12 sm:px-6 md:pb-16">
      <div className="mx-auto max-w-2xl">
        <section className="rounded-[28px] border border-line-glass bg-surface-glass p-5 backdrop-blur-sm sm:p-6">
          <h1 className="mb-4 text-2xl font-semibold text-content-primary">语义搜索</h1>
          <p className="mb-6 text-sm leading-7 text-content-secondary">
            输入关键词，同时搜索文章、思考、收藏、PDF、项目和 AI 对话。
          </p>

          <div className="relative mb-8">
            <SearchIcon
              className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-content-tertiary"
              aria-hidden
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="输入关键词搜索全部内容…"
              className="w-full rounded-xl border border-line-glass bg-surface-glass py-3 pl-10 pr-10 text-content-primary placeholder:text-content-tertiary focus:outline-none focus:ring-2 focus:ring-accent-primary/50"
              autoFocus
              aria-label="搜索博客"
            />
            {loading && (
              <Loader2
                className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 animate-spin text-accent-primary"
                aria-hidden
              />
            )}
          </div>

          {error && (
            <p className="mb-4 text-sm text-red-500" role="alert">
              {error}
            </p>
          )}

          {searched && !loading && (
            <section aria-label="搜索结果">
              {hits.length === 0 ? (
                <p className="text-content-secondary">未找到相关内容。</p>
              ) : (
                <ul className="space-y-4">
                  {hits.map((hit, index) => {
                    const key = getHitKey(hit)
                    const href = getHitHref(hit)
                    const { Icon, badgeText } = getHitMeta(hit)

                    return (
                      <li key={`${key}-${index}`}>
                        <Link
                          href={href as Route}
                          className="block rounded-2xl border border-line-glass bg-surface-glass p-4 transition-colors hover:border-accent-primary/30 hover:bg-accent-primary/5 sm:p-5"
                        >
                          <div className="flex items-start gap-3">
                            <Icon className="mt-0.5 h-5 w-5 shrink-0 text-accent-primary" />
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center">
                                <h2 className="w-full text-base font-medium leading-6 text-content-primary sm:truncate">
                                  {hit.title}
                                </h2>
                                <span className="inline-flex items-center rounded-full bg-surface-tertiary px-2 py-0.5 text-[11px] text-content-tertiary">
                                  {badgeText}
                                </span>
                              </div>
                              <p className="mt-2 line-clamp-3 text-sm leading-7 text-content-secondary sm:line-clamp-2">
                                {hit.snippet}
                              </p>
                              <span className="mt-3 inline-block text-xs text-content-tertiary">
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
        </section>
      </div>
    </main>
  )
}

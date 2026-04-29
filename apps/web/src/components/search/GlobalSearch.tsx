'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import Link from 'next/link'
import type { Route } from 'next'
import { Search as SearchIcon, FileText, Loader2, Bot } from 'lucide-react'
import { apiClient } from '@/lib/api-client'
import { getApiErrorMessage } from '@/lib/api-error'
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog'
import { LiquidGlassFilter } from '@/components/music/LiquidGlassFilter'

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
      setError(getApiErrorMessage(err))
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
      <DialogContent
        className="h-[min(42rem,85vh)] w-[calc(100vw-1.5rem)] max-w-2xl border-0 bg-transparent p-0 shadow-none sm:w-full"
        overlayClassName="bg-black/20 backdrop-blur-[1px]"
      >
        <LiquidGlassFilter
          width={672}
          height={672}
          radius={28}
          bezelWidth={36}
          glassThickness={132}
          refractiveIndex={1.42}
          blur={0.65}
          scaleRatio={1.35}
          specularOpacity={0.78}
          specularSaturation={1}
          backdropSaturation={1}
          className="flex h-full w-full rounded-[1.75rem] border border-white/30 bg-surface-primary/36 text-content-primary shadow-[0_24px_80px_rgba(15,23,42,0.24)]"
        >
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/18 via-white/6 to-white/2"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-white/52 via-white/16 to-transparent"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0_1px_1px_rgba(255,255,255,0.68),inset_0_-16px_26px_rgba(255,255,255,0.08),inset_16px_0_24px_rgba(255,255,255,0.08),inset_-16px_0_24px_rgba(15,23,42,0.06)]"
            aria-hidden
          />
          <div
            className="relative flex h-full min-h-0 w-full flex-col"
            onKeyDown={(e) => {
              if (e.key === 'Escape') handleOpenChange(false)
            }}
          >
            <div className="shrink-0 border-b border-white/18 px-5 pb-5 pt-6 sm:px-6">
              <div className="mb-3 flex items-center justify-between gap-4 pr-8">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-content-muted">
                    Semantic Search
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-content-primary">
                    全局搜索 / Global Search
                  </h2>
                </div>
                <span className="hidden rounded-full border border-white/20 bg-white/16 px-3 py-1 text-[11px] text-content-tertiary shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] sm:inline-flex">
                  Ctrl K
                </span>
              </div>

              <div className="group relative">
                <div className="pointer-events-none absolute inset-0 rounded-2xl bg-white/18 opacity-70 blur-xl transition-opacity duration-300 group-focus-within:opacity-100" />
                <SearchIcon
                  className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-content-tertiary transition-colors duration-200 group-focus-within:text-accent-primary"
                  aria-hidden
                />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="搜索文章或对话 / Search posts or chats"
                  className="relative w-full rounded-2xl border border-white/28 bg-white/18 py-4 pl-12 pr-12 text-[15px] text-content-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.52),0_14px_34px_rgba(15,23,42,0.08)] outline-none backdrop-blur-xl transition-[border-color,background-color,box-shadow] duration-300 placeholder:text-content-tertiary focus:border-white/48 focus:bg-white/26 focus:shadow-[inset_0_1px_0_rgba(255,255,255,0.62),0_18px_44px_rgba(15,23,42,0.12)]"
                  aria-label="全局搜索 / Global Search"
                />
                {loading ? (
                  <Loader2
                    className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 animate-spin text-accent-primary"
                    aria-hidden
                  />
                ) : null}
              </div>
            </div>

            {error && (
              <p
                className="mx-5 mt-4 shrink-0 rounded-xl border border-red-500/10 bg-red-500/8 px-4 py-3 text-sm text-red-500 sm:mx-6"
                role="alert"
              >
                {error}
              </p>
            )}

            <section
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6"
              aria-label="搜索结果"
            >
              {!searched && !loading ? (
                <div className="rounded-2xl border border-dashed border-white/24 bg-white/14 p-5 text-sm leading-7 text-content-secondary shadow-[inset_0_1px_0_rgba(255,255,255,0.28)]">
                  输入关键词后，会同时搜索文章和 AI 对话。
                  <br />
                  Type a keyword to search posts and AI chats together.
                </div>
              ) : null}

              {searched && !loading && (
                <>
                  {hits.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-white/24 bg-white/14 p-5 text-sm leading-7 text-content-secondary shadow-[inset_0_1px_0_rgba(255,255,255,0.28)]">
                      未找到相关文章或对话。
                      <br />
                      No matching posts or chats found.
                    </div>
                  ) : (
                    <ul className="space-y-3">
                      {hits.map((hit, index) => {
                        const key = hit.type === 'post' ? hit.postId : hit.conversationId
                        const href =
                          hit.type === 'post'
                            ? `/posts/${
                                (hit as Extract<SemanticSearchHit, { type: 'post' }>).slug
                              }`
                            : `/ai-chat/${
                                (hit as Extract<SemanticSearchHit, { type: 'conversation' }>).conversationId
                              }`
                        const Icon = hit.type === 'post' ? FileText : Bot
                        const badgeText = hit.type === 'post' ? '文章' : '对话'

                        return (
                          <li key={`${key}-${index}`}>
                            <Link
                              href={href as Route}
                              onClick={closeAndClear}
                              className="group/result block w-full rounded-2xl border border-white/24 bg-white/18 p-4 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.24),0_14px_34px_rgba(15,23,42,0.055)] transition-[transform,border-color,background-color,box-shadow] duration-300 ease-out hover:-translate-y-0.5 hover:border-white/40 hover:bg-white/28 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.34),0_18px_46px_rgba(15,23,42,0.09)] focus:outline-none focus:ring-2 focus:ring-accent-primary/35"
                            >
                              <div className="flex items-start gap-3">
                                <div className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/22 text-accent-primary transition-transform duration-300 group-hover/result:scale-105">
                                  <Icon className="h-4 w-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center">
                                    <h2 className="truncate font-medium text-content-primary">
                                      {hit.title}
                                    </h2>
                                    <span className="inline-flex shrink-0 items-center rounded-full bg-white/18 px-2.5 py-1 text-[11px] text-content-tertiary transition-colors duration-300 group-hover/result:bg-accent-primary/10 group-hover/result:text-accent-primary-dark">
                                      {badgeText}
                                    </span>
                                  </div>
                                  <p className="mt-2 line-clamp-2 text-sm leading-7 text-content-secondary">
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
                </>
              )}
            </section>
          </div>
        </LiquidGlassFilter>
      </DialogContent>
    </Dialog>
  )
}

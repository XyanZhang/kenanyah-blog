'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Route } from 'next'
import {
  BookOpenText,
  Database,
  Loader2,
  MessageCircle,
  RefreshCcw,
  Search,
  Sparkles,
} from 'lucide-react'
import {
  getYijingSources,
  importYijingText,
  searchYijingText,
  type YijingImportResult,
  type YijingSearchHit,
  type YijingSource,
} from '@/lib/yijing-api'

const examples = ['乾卦 自强不息', '坤卦 厚德载物', '蒙卦 学习', '需卦 等待']

function formatScore(score: number): string {
  return `${Math.round(score * 100)}%`
}

export function YijingWorkbench() {
  const [sources, setSources] = useState<YijingSource[]>([])
  const [loadingSources, setLoadingSources] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<YijingImportResult | null>(null)
  const [query, setQuery] = useState('乾卦 自强不息')
  const [hits, setHits] = useState<YijingSearchHit[]>([])
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const primarySource = sources[0] ?? null
  const indexedCount = primarySource?.chunkCount ?? importResult?.chunkCount ?? 0
  const ready = indexedCount > 0

  const loadSources = useCallback(async () => {
    setLoadingSources(true)
    setError(null)
    try {
      setSources(await getYijingSources())
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoadingSources(false)
    }
  }, [])

  useEffect(() => {
    void loadSources()
  }, [loadSources])

  const handleImport = async () => {
    setImporting(true)
    setError(null)
    try {
      const result = await importYijingText()
      setImportResult(result)
      await loadSources()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setImporting(false)
    }
  }

  const handleSearch = async (nextQuery = query) => {
    const trimmed = nextQuery.trim()
    if (!trimmed) return
    setSearching(true)
    setError(null)
    setQuery(trimmed)
    try {
      setHits(await searchYijingText(trimmed, 6))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSearching(false)
    }
  }

  const chatHref = useMemo(() => {
    const prompt = query.trim()
      ? `请用适合初学者的方式解释《易经》中和「${query.trim()}」相关的内容，并结合原文说明。`
      : '请带我学习《易经》的基础知识。'
    return `/ai-chat?prompt=${encodeURIComponent(prompt)}` as Route
  }, [query])

  return (
    <main className="mx-auto w-full max-w-7xl px-4 pb-10 sm:px-6 sm:pb-12 md:py-10">
      <header className="mb-6 rounded-3xl border border-line-glass bg-surface-glass/70 p-5 backdrop-blur-sm md:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-accent-primary/10 px-3 py-1 text-xs font-medium text-accent-primary">
              <BookOpenText className="h-4 w-4" />
              I Ching Learning Agent
            </div>
            <h1 className="mt-3 text-2xl font-semibold tracking-[0] text-content-primary md:text-3xl">
              易经学习工作台
            </h1>
            <p className="mt-2 max-w-[68ch] text-sm leading-7 text-content-secondary">
              把根目录的《易经》文本导入知识库，完成切分和向量化后，就可以检索原文，并跳转到专门的易经学习 Agent 继续交流。
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void loadSources()}
              disabled={loadingSources}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-line-glass bg-surface-glass/40 px-3 text-sm font-medium text-content-secondary transition hover:border-line-hover hover:text-content-primary disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCcw className={['h-4 w-4', loadingSources ? 'animate-spin' : ''].join(' ')} />
              刷新状态
            </button>
            <button
              type="button"
              onClick={() => void handleImport()}
              disabled={importing}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-accent-primary px-4 text-sm font-semibold text-content-inverse transition hover:bg-accent-primary-hover disabled:cursor-not-allowed disabled:opacity-70"
            >
              {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
              导入并索引
            </button>
          </div>
        </div>

        {error ? (
          <div className="mt-5 rounded-2xl border border-ui-danger/30 bg-ui-danger-light px-4 py-3 text-sm leading-6 text-ui-danger-text">
            {error}
          </div>
        ) : null}
      </header>

      <section className="grid gap-5 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <aside className="rounded-3xl border border-line-glass bg-surface-glass/60 p-4 backdrop-blur-sm md:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-content-primary">资料源</h2>
              <p className="mt-1 text-xs text-content-secondary">
                当前专用于易经学习 Agent。
              </p>
            </div>
            <span
              className={[
                'rounded-full px-3 py-1 text-xs font-medium',
                ready
                  ? 'bg-ui-success text-ui-success-text'
                  : 'bg-ui-warning-light text-ui-warning-text',
              ].join(' ')}
            >
              {ready ? 'Ready' : 'Not indexed'}
            </span>
          </div>

          <div className="mt-5 grid gap-3">
            <div className="rounded-2xl border border-line-glass bg-surface-primary/55 p-4">
              <div className="text-xs text-content-muted">Source</div>
              <div className="mt-1 text-lg font-semibold text-content-primary">
                {primarySource?.title ?? '《易经》全文'}
              </div>
              <p className="mt-2 text-sm leading-6 text-content-secondary">
                {primarySource?.description ?? '还没有导入。点击“导入并索引”读取项目根目录的 易经.txt。'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-line-glass bg-surface-primary/55 p-4">
                <div className="text-xs text-content-muted">Chunks</div>
                <div className="mt-2 text-2xl font-semibold text-content-primary">{indexedCount}</div>
              </div>
              <div className="rounded-2xl border border-line-glass bg-surface-primary/55 p-4">
                <div className="text-xs text-content-muted">Updated</div>
                <div className="mt-2 text-sm font-semibold leading-6 text-content-primary">
                  {primarySource?.updatedAt ? primarySource.updatedAt.slice(0, 10) : '等待导入'}
                </div>
              </div>
            </div>

            {importResult ? (
              <div className="rounded-2xl border border-line-glass bg-accent-primary/8 p-4 text-sm leading-6 text-content-secondary">
                本次导入 {importResult.chunkCount} 个 chunks，新增/更新向量 {importResult.embeddedCount} 个，跳过 {importResult.skippedCount} 个。
              </div>
            ) : null}
          </div>
        </aside>

        <section className="rounded-3xl border border-line-glass bg-surface-glass/60 p-4 backdrop-blur-sm md:p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-base font-semibold text-content-primary">原文检索</h2>
              <p className="mt-1 text-sm leading-6 text-content-secondary">
                先试搜一句话或一个卦名，确认知识库能找到相关原文。
              </p>
            </div>
            <Link
              href={chatHref}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-line-glass bg-surface-primary/70 px-3 text-sm font-medium text-content-primary transition hover:border-accent-primary/30 hover:text-accent-primary"
            >
              <MessageCircle className="h-4 w-4" />
              去聊天学习
            </Link>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-2xl border border-line-glass bg-surface-primary/70 px-3">
              <Search className="h-4 w-4 shrink-0 text-content-muted" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') void handleSearch()
                }}
                placeholder="例如：乾卦 自强不息"
                className="h-11 min-w-0 flex-1 bg-transparent text-sm text-content-primary outline-none placeholder:text-content-tertiary"
              />
            </div>
            <button
              type="button"
              onClick={() => void handleSearch()}
              disabled={searching || !query.trim()}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-content-primary px-4 text-sm font-semibold text-content-inverse transition hover:bg-content-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              检索
            </button>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {examples.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => void handleSearch(item)}
                className="rounded-full border border-line-glass bg-surface-primary/50 px-3 py-1 text-xs text-content-secondary transition hover:border-line-hover hover:text-content-primary"
              >
                {item}
              </button>
            ))}
          </div>

          <div className="mt-6 grid gap-3">
            {hits.map((hit) => (
              <article
                key={hit.chunkId}
                className="rounded-2xl border border-line-glass bg-surface-primary/60 p-4"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-content-primary">{hit.title}</h3>
                    <p className="mt-1 text-xs text-content-muted">Chunk #{hit.chunkIndex}</p>
                  </div>
                  <span className="rounded-full bg-black/[0.04] px-3 py-1 text-xs font-medium text-content-secondary">
                    {formatScore(hit.score)}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-7 text-content-secondary">{hit.snippet}</p>
              </article>
            ))}

            {!hits.length && !searching ? (
              <div className="rounded-2xl border border-dashed border-line-glass bg-surface-primary/40 px-4 py-8 text-center text-sm text-content-secondary">
                {ready ? '输入关键词后开始检索。' : '请先导入并索引 易经.txt。'}
              </div>
            ) : null}
          </div>
        </section>
      </section>
    </main>
  )
}

'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Route } from 'next'
import {
  ArrowUpRight,
  BookOpenText,
  Database,
  FileUp,
  Layers3,
  Loader2,
  RefreshCcw,
  Search,
  Sparkles,
} from 'lucide-react'
import {
  getKnowledgeSources,
  importKnowledgePdf,
  importKnowledgeTextFile,
  searchKnowledge,
  type KnowledgeDomain,
  type KnowledgePdfImportResult,
  type KnowledgeSearchHit,
  type KnowledgeSource,
} from '@/lib/knowledge-api'

const domains: Array<{
  id: KnowledgeDomain
  label: string
  shortLabel: string
  description: string
  href?: Route
}> = [
  { id: 'all', label: '全部资料', shortLabel: '全部', description: '跨门类查看与检索' },
  { id: 'yijing', label: '易经', shortLabel: '易经', description: '卦辞、爻辞、经传', href: '/workspace/yijing' },
  { id: 'ziwei', label: '紫微斗数', shortLabel: '紫微', description: '星曜、宫位、四化', href: '/workspace/ziwei' },
  { id: 'bazi', label: '八字', shortLabel: '八字', description: '预留门类' },
  { id: 'qimen', label: '奇门', shortLabel: '奇门', description: '预留门类' },
  { id: 'liuren', label: '六壬', shortLabel: '六壬', description: '预留门类' },
  { id: 'tongshu', label: '通书', shortLabel: '通书', description: '预留门类' },
]

const examples = ['乾卦 自强不息', '紫微星 命宫', '四化 化忌', '学习 入门']

function formatScore(score: number): string {
  return `${Math.round(score * 100)}%`
}

function formatDate(value: string): string {
  return value ? value.slice(0, 10) : '未更新'
}

function getDomainLabel(domain: string): string {
  return domains.find((item) => item.id === domain)?.shortLabel ?? domain
}

function getTotalChunks(sources: KnowledgeSource[]): number {
  return sources.reduce((sum, source) => sum + source.chunkCount, 0)
}

function getReadyDomains(sources: KnowledgeSource[]): string[] {
  return Array.from(new Set(sources.filter((source) => source.chunkCount > 0).map((source) => source.domain))).sort()
}

function formatSize(size?: number): string {
  if (!size) return '未知'
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

export function KnowledgeWorkbench() {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [activeDomain, setActiveDomain] = useState<KnowledgeDomain>('all')
  const [sources, setSources] = useState<KnowledgeSource[]>([])
  const [loadingSources, setLoadingSources] = useState(false)
  const [importDomain, setImportDomain] = useState<Exclude<KnowledgeDomain, 'all'>>('bazi')
  const [importMode, setImportMode] = useState<'pdf' | 'text'>('text')
  const [importTitle, setImportTitle] = useState('《三命通会》')
  const [importSourceId, setImportSourceId] = useState('bazi-sanming-tonghui')
  const [importDescription, setImportDescription] = useState('《三命通会》PDF 导入，用于八字学习、资料检索和后续命理 Agent 引用。')
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<KnowledgePdfImportResult | null>(null)
  const [query, setQuery] = useState('乾卦 自强不息')
  const [hits, setHits] = useState<KnowledgeSearchHit[]>([])
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const activeDomainInfo = domains.find((domain) => domain.id === activeDomain) ?? domains[0]
  const readyDomains = useMemo(() => getReadyDomains(sources), [sources])
  const totalChunks = useMemo(() => getTotalChunks(sources), [sources])
  const visibleSources = sources
  const sourceCountByDomain = useMemo(() => {
    return sources.reduce<Record<string, number>>((acc, source) => {
      acc[source.domain] = (acc[source.domain] ?? 0) + 1
      return acc
    }, {})
  }, [sources])

  const loadSources = useCallback(async (domain = activeDomain) => {
    setLoadingSources(true)
    setError(null)
    try {
      setSources(await getKnowledgeSources(domain))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoadingSources(false)
    }
  }, [activeDomain])

  useEffect(() => {
    void loadSources(activeDomain)
  }, [activeDomain, loadSources])

  const handleSearch = async (nextQuery = query) => {
    const trimmed = nextQuery.trim()
    if (!trimmed) return
    setSearching(true)
    setError(null)
    setQuery(trimmed)
    try {
      setHits(await searchKnowledge({ query: trimmed, domain: activeDomain, limit: 8 }))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSearching(false)
    }
  }

  const handleImportFile = async (file: File | null | undefined) => {
    if (!file) return
    const title = importTitle.trim()
    if (!title) {
      setError('请先填写资料标题')
      return
    }

    setImporting(true)
    setError(null)
    try {
      const payload = {
        file,
        domain: importDomain,
        title,
        sourceId: importSourceId.trim() || undefined,
        description: importDescription.trim() || undefined,
      }
      const result = importMode === 'pdf'
        ? await importKnowledgePdf(payload)
        : await importKnowledgeTextFile(payload)
      setImportResult(result)
      setActiveDomain(importDomain)
      await loadSources(importDomain)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 pb-10 sm:px-6 sm:pb-12 md:py-10">
      <header className="mb-6 rounded-3xl border border-line-glass bg-surface-glass/70 p-5 backdrop-blur-sm md:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-accent-primary/10 px-3 py-1 text-xs font-medium text-accent-primary">
              <Layers3 className="h-4 w-4" />
              Unified Knowledge Base
            </div>
            <h1 className="mt-3 text-2xl font-semibold tracking-[0] text-content-primary md:text-3xl">
              知识库管理
            </h1>
            <p className="mt-2 max-w-[68ch] text-sm leading-7 text-content-secondary">
              易经、紫微和后续八字、奇门、六壬、通书都会进入同一套知识库表。这里负责查看资料源、按门类检索，并保留各自学习入口。
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void loadSources(activeDomain)}
              disabled={loadingSources}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-line-glass bg-surface-glass/40 px-3 text-sm font-medium text-content-secondary transition hover:border-line-hover hover:text-content-primary disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCcw className={['h-4 w-4', loadingSources ? 'animate-spin' : ''].join(' ')} />
              刷新
            </button>
            {activeDomainInfo.href ? (
              <Link
                href={activeDomainInfo.href}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-accent-primary px-4 text-sm font-semibold text-content-inverse transition hover:bg-accent-primary-hover"
              >
                <BookOpenText className="h-4 w-4" />
                打开{activeDomainInfo.shortLabel}入口
              </Link>
            ) : null}
          </div>
        </div>

        {error ? (
          <div className="mt-5 rounded-2xl border border-ui-danger/30 bg-ui-danger-light px-4 py-3 text-sm leading-6 text-ui-danger-text">
            {error}
          </div>
        ) : null}
      </header>

      <section className="grid gap-5 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <aside className="grid gap-5">
          <section className="rounded-3xl border border-line-glass bg-surface-glass/60 p-4 backdrop-blur-sm md:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-content-primary">导入资料</h2>
                <p className="mt-1 text-xs text-content-secondary">PDF 或 OCR 文本入库。</p>
              </div>
              <FileUp className="h-5 w-5 text-content-muted" />
            </div>

            <div className="mt-4 grid gap-3">
              <div className="grid grid-cols-2 gap-2 rounded-2xl border border-line-glass bg-surface-primary/45 p-1">
                {[
                  { id: 'text' as const, label: 'OCR 文本' },
                  { id: 'pdf' as const, label: 'PDF' },
                ].map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setImportMode(mode.id)}
                    className={[
                      'h-9 rounded-xl text-sm font-medium transition',
                      importMode === mode.id
                        ? 'bg-content-primary text-content-inverse'
                        : 'text-content-secondary hover:bg-black/[0.04] hover:text-content-primary',
                    ].join(' ')}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>

              <p className="rounded-2xl bg-black/[0.03] px-3 py-2 text-xs leading-5 text-content-secondary">
                {importMode === 'text'
                  ? '扫描版古籍建议先用 OCR 识别为 .txt 或 .md，再从这里导入。'
                  : '只适合带可复制文本层的 PDF；扫描版 PDF 会提示改用 OCR 文本。'}
              </p>

              <label className="grid gap-1.5">
                <span className="text-xs font-medium text-content-secondary">门类</span>
                <select
                  value={importDomain}
                  onChange={(event) => {
                    const value = event.target.value as Exclude<KnowledgeDomain, 'all'>
                    setImportDomain(value)
                    setActiveDomain(value)
                  }}
                  className="h-10 rounded-2xl border border-line-glass bg-surface-primary/70 px-3 text-sm text-content-primary outline-none transition focus:border-accent-primary/40"
                >
                  {domains.filter((domain) => domain.id !== 'all').map((domain) => (
                    <option key={domain.id} value={domain.id}>
                      {domain.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-1.5">
                <span className="text-xs font-medium text-content-secondary">标题</span>
                <input
                  value={importTitle}
                  onChange={(event) => setImportTitle(event.target.value)}
                  className="h-10 rounded-2xl border border-line-glass bg-surface-primary/70 px-3 text-sm text-content-primary outline-none transition placeholder:text-content-tertiary focus:border-accent-primary/40"
                  placeholder="例如：《三命通会》"
                />
              </label>

              <label className="grid gap-1.5">
                <span className="text-xs font-medium text-content-secondary">Source ID</span>
                <input
                  value={importSourceId}
                  onChange={(event) => setImportSourceId(event.target.value)}
                  className="h-10 rounded-2xl border border-line-glass bg-surface-primary/70 px-3 text-sm text-content-primary outline-none transition placeholder:text-content-tertiary focus:border-accent-primary/40"
                  placeholder="bazi-sanming-tonghui"
                />
              </label>

              <label className="grid gap-1.5">
                <span className="text-xs font-medium text-content-secondary">描述</span>
                <textarea
                  value={importDescription}
                  onChange={(event) => setImportDescription(event.target.value)}
                  rows={3}
                  className="resize-none rounded-2xl border border-line-glass bg-surface-primary/70 px-3 py-2 text-sm leading-6 text-content-primary outline-none transition placeholder:text-content-tertiary focus:border-accent-primary/40"
                  placeholder="这份资料用于哪个门类、哪个老师或哪个实验室。"
                />
              </label>

              <input
                ref={fileInputRef}
                type="file"
                accept={importMode === 'pdf' ? 'application/pdf,.pdf' : 'text/plain,text/markdown,.txt,.md'}
                className="hidden"
                onChange={(event) => void handleImportFile(event.target.files?.[0])}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={importing || !importTitle.trim()}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-accent-primary px-4 text-sm font-semibold text-content-inverse transition hover:bg-accent-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
              >
                {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
                {importMode === 'pdf' ? '上传 PDF 并索引' : '上传文本并索引'}
              </button>

              {importResult ? (
                <div className="rounded-2xl border border-line-glass bg-accent-primary/8 p-4 text-sm leading-6 text-content-secondary">
                  已导入 {importResult.chunkCount} 个 chunks，新增/更新向量 {importResult.embeddedCount} 个，跳过 {importResult.skippedCount} 个。
                  {importResult.filename ? ` 文件：${importResult.filename}（${formatSize(importResult.size)}）。` : ''}
                </div>
              ) : null}
            </div>
          </section>

          <section className="rounded-3xl border border-line-glass bg-surface-glass/60 p-4 backdrop-blur-sm md:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-content-primary">门类</h2>
                <p className="mt-1 text-xs text-content-secondary">用 domain 控制同表隔离。</p>
              </div>
              <Database className="h-5 w-5 text-content-muted" />
            </div>

            <div className="mt-4 grid gap-2">
              {domains.map((domain) => {
                const selected = domain.id === activeDomain
                const count = domain.id === 'all' ? sources.length : sourceCountByDomain[domain.id] ?? 0
                return (
                  <button
                    key={domain.id}
                    type="button"
                    onClick={() => setActiveDomain(domain.id)}
                    className={[
                      'flex min-h-14 items-center justify-between gap-3 rounded-2xl border px-3 text-left transition',
                      selected
                        ? 'border-accent-primary/35 bg-accent-primary/10 text-content-primary'
                        : 'border-line-glass bg-surface-primary/45 text-content-secondary hover:border-line-hover hover:text-content-primary',
                    ].join(' ')}
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">{domain.label}</span>
                      <span className="mt-0.5 block text-xs text-content-muted">{domain.description}</span>
                    </span>
                    <span className="shrink-0 rounded-full bg-black/[0.04] px-2.5 py-1 text-xs font-medium">
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>
          </section>

          <section className="rounded-3xl border border-line-glass bg-surface-glass/60 p-4 backdrop-blur-sm md:p-5">
            <h2 className="text-base font-semibold text-content-primary">状态</h2>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-line-glass bg-surface-primary/55 p-4">
                <div className="text-xs text-content-muted">Sources</div>
                <div className="mt-2 text-2xl font-semibold text-content-primary">{sources.length}</div>
              </div>
              <div className="rounded-2xl border border-line-glass bg-surface-primary/55 p-4">
                <div className="text-xs text-content-muted">Chunks</div>
                <div className="mt-2 text-2xl font-semibold text-content-primary">{totalChunks}</div>
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-content-secondary">
              已有资料：{readyDomains.length ? readyDomains.map(getDomainLabel).join('、') : '暂无'}。
            </p>
          </section>
        </aside>

        <section className="grid gap-5">
          <section className="rounded-3xl border border-line-glass bg-surface-glass/60 p-4 backdrop-blur-sm md:p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-base font-semibold text-content-primary">统一检索</h2>
                <p className="mt-1 text-sm leading-6 text-content-secondary">
                  当前范围：{activeDomainInfo.label}。跨门类检索时会同时查所有通用 embedding。
                </p>
              </div>
              <span className="inline-flex h-9 items-center rounded-full bg-black/[0.04] px-3 text-xs font-medium text-content-secondary">
                domain={activeDomain}
              </span>
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
                  placeholder="输入原文、术语或学习问题"
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
                <article key={hit.chunkId} className="rounded-2xl border border-line-glass bg-surface-primary/60 p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="mb-2 inline-flex rounded-full bg-accent-primary/10 px-2.5 py-1 text-xs font-medium text-accent-primary">
                        {getDomainLabel(hit.domain)}
                      </div>
                      <h3 className="text-sm font-semibold text-content-primary">{hit.title}</h3>
                      <p className="mt-1 text-xs text-content-muted">
                        {hit.sourceId} · Chunk #{hit.chunkIndex}
                      </p>
                    </div>
                    <span className="rounded-full bg-black/[0.04] px-3 py-1 text-xs font-medium text-content-secondary">
                      {formatScore(hit.score)}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-content-secondary">{hit.snippet}</p>
                </article>
              ))}

              {!hits.length && !searching ? (
                <div className="rounded-2xl border border-dashed border-line-glass bg-surface-primary/35 p-8 text-center text-sm leading-6 text-content-secondary">
                  选择门类后输入关键词，可以验证通用知识库是否命中正确资料。
                </div>
              ) : null}
            </div>
          </section>

          <section className="rounded-3xl border border-line-glass bg-surface-glass/60 p-4 backdrop-blur-sm md:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-content-primary">资料源</h2>
                <p className="mt-1 text-sm leading-6 text-content-secondary">
                  这些记录来自统一的 knowledge_sources 表。
                </p>
              </div>
              {loadingSources ? <Loader2 className="h-5 w-5 animate-spin text-content-muted" /> : null}
            </div>

            <div className="mt-5 grid gap-3">
              {visibleSources.map((source) => (
                <article key={source.id} className="rounded-2xl border border-line-glass bg-surface-primary/60 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-black/[0.04] px-2.5 py-1 text-xs font-medium text-content-secondary">
                          {getDomainLabel(source.domain)}
                        </span>
                        <span className="rounded-full bg-black/[0.04] px-2.5 py-1 text-xs font-medium text-content-secondary">
                          {source.sourceType}
                        </span>
                        <span className="rounded-full bg-ui-success px-2.5 py-1 text-xs font-medium text-ui-success-text">
                          {source.status}
                        </span>
                      </div>
                      <h3 className="mt-3 text-base font-semibold text-content-primary">{source.title}</h3>
                      <p className="mt-2 max-w-[72ch] text-sm leading-7 text-content-secondary">
                        {source.description ?? '暂无描述'}
                      </p>
                    </div>

                    <div className="grid min-w-40 grid-cols-2 gap-3 text-sm md:text-right">
                      <div>
                        <div className="text-xs text-content-muted">Chunks</div>
                        <div className="mt-1 font-semibold text-content-primary">{source.chunkCount}</div>
                      </div>
                      <div>
                        <div className="text-xs text-content-muted">Updated</div>
                        <div className="mt-1 font-semibold text-content-primary">{formatDate(source.updatedAt)}</div>
                      </div>
                    </div>
                  </div>

                  {domains.find((domain) => domain.id === source.domain)?.href ? (
                    <Link
                      href={domains.find((domain) => domain.id === source.domain)!.href!}
                      className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-accent-primary transition hover:text-accent-primary-hover"
                    >
                      打开学习入口
                      <ArrowUpRight className="h-4 w-4" />
                    </Link>
                  ) : null}
                </article>
              ))}

              {!visibleSources.length && !loadingSources ? (
                <div className="rounded-2xl border border-dashed border-line-glass bg-surface-primary/35 p-8 text-center text-sm leading-6 text-content-secondary">
                  这个门类还没有资料源。后续导入八字、奇门、六壬或通书时，会出现在这里。
                </div>
              ) : null}
            </div>
          </section>
        </section>
      </section>
    </main>
  )
}

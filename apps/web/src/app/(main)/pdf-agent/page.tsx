'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Bot,
  FileUp,
  Sparkles,
  Database,
  FileText,
  Download,
  Loader2,
  Trash2,
  RefreshCcw,
  Search,
  ExternalLink,
} from 'lucide-react'
import {
  deletePdfDocument,
  generatePdfDoc,
  getPdfDocuments,
  indexPdf,
  parsePdf,
  savePdfAsPost,
  searchPdfDocument,
  uploadPdf,
  type PdfDocument,
  type PdfSearchHit,
} from '@/lib/pdf-agent-api'

type StepKey = 'upload' | 'parse' | 'index' | 'generate'

export default function PdfAgentPage() {
  const fileRef = useRef<HTMLInputElement | null>(null)
  const router = useRouter()
  const [step, setStep] = useState<StepKey>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [doc, setDoc] = useState<PdfDocument | null>(null)
  const [documents, setDocuments] = useState<PdfDocument[]>([])
  const [loadingDocuments, setLoadingDocuments] = useState(false)
  const [chunkCount, setChunkCount] = useState<number | null>(null)
  const [parseDetail, setParseDetail] = useState<{
    chunks: Array<{ chunkIndex: number; content: string }>
    preview: {
      total: number
      head: Array<{ chunkIndex: number; content: string }>
      tail: Array<{ chunkIndex: number; content: string }>
    }
    cleanReport?: {
      originalLength: number
      cleanedLength: number
      removedLineCount: number
      removedByReason: {
        repeatedLine: number
        dotLeaders: number
        pageNumber: number
        empty: number
      }
    }
    parseStats?: {
      chunkCount: number
      min: number
      p50: number
      p90: number
      max: number
      tooShortCount: number
      tooLongCount: number
    }
  } | null>(null)
  const [markdown, setMarkdown] = useState<string>('')
  const [busy, setBusy] = useState(false)
  const [savingPost, setSavingPost] = useState(false)
  const [indexPost, setIndexPost] = useState(false)
  const [replaceOnUpload, setReplaceOnUpload] = useState(true)
  const [chunkFilter, setChunkFilter] = useState('')
  const [docSearchQuery, setDocSearchQuery] = useState('')
  const [docSearchHits, setDocSearchHits] = useState<PdfSearchHit[]>([])
  const [searchingDoc, setSearchingDoc] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadDocuments = useCallback(async () => {
    setLoadingDocuments(true)
    try {
      const list = await getPdfDocuments()
      setDocuments(list)
      setDoc((current) => {
        if (!current) return list[0] ?? null
        return list.find((item) => item.id === current.id) ?? current
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoadingDocuments(false)
    }
  }, [])

  useEffect(() => {
    void loadDocuments()
  }, [loadDocuments])

  const selectDocument = useCallback((nextDoc: PdfDocument) => {
    setDoc(nextDoc)
    setFile(null)
    setChunkCount(nextDoc.chunkCount ?? null)
    setParseDetail(null)
    setMarkdown('')
    setDocSearchHits([])
    setDocSearchQuery('')
    setError(null)
    if ((nextDoc.embeddingCount ?? 0) > 0) setStep('generate')
    else if ((nextDoc.chunkCount ?? 0) > 0) setStep('index')
    else setStep('parse')
  }, [])

  const stepMeta = useMemo(() => {
    const items: Array<{ key: StepKey; label: string; icon: React.ReactNode }> = [
      { key: 'upload', label: '上传 PDF', icon: <FileUp className="h-4 w-4" /> },
      { key: 'parse', label: '解析', icon: <FileText className="h-4 w-4" /> },
      { key: 'index', label: '向量化', icon: <Database className="h-4 w-4" /> },
      { key: 'generate', label: '生成文档', icon: <Sparkles className="h-4 w-4" /> },
    ]
    const index = items.findIndex((i) => i.key === step)
    return { items, index }
  }, [step])

  const chunkRows = useMemo(() => {
    if (!parseDetail) return []
    const rows = [...parseDetail.chunks].sort((a, b) => a.chunkIndex - b.chunkIndex)
    const q = chunkFilter.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) => String(r.chunkIndex).includes(q) || r.content.toLowerCase().includes(q))
  }, [parseDetail, chunkFilter])

  return (
    <main className="mx-auto w-full max-w-7xl px-4 pb-10 sm:px-6 sm:pb-12 md:py-10">
      <header className="mb-6 rounded-3xl border border-line-glass bg-surface-glass/70 backdrop-blur-sm p-5 md:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-accent-primary/10 px-3 py-1 text-xs font-medium text-accent-primary">
              <Bot className="h-4 w-4" />
              PDF Reading Agent
            </div>
            <h1 className="mt-3 text-2xl md:text-3xl font-semibold text-content-primary">
              PDF 解读（流程化）
            </h1>
            <p className="mt-2 text-sm text-content-secondary">
              上传 PDF → 解析 → 向量化索引 → 让 AI 帮你生成 Markdown 文档（可下载）。
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setFile(null)
              setDoc(null)
              setChunkCount(null)
              setParseDetail(null)
              setMarkdown('')
              setError(null)
              setStep('upload')
            }}
            className="shrink-0 rounded-xl border border-line-primary bg-surface-glass px-3 py-2 text-xs font-medium text-content-primary hover:border-line-hover"
          >
            重置
          </button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2 md:grid-cols-4">
          {stepMeta.items.map((it, idx) => {
            const active = idx === stepMeta.index
            const done = idx < stepMeta.index
            return (
              <button
                key={it.key}
                type="button"
                onClick={() => setStep(it.key)}
                className={[
                  'flex items-center gap-2 rounded-2xl border px-3 py-2 text-left text-xs transition-colors',
                  active
                    ? 'border-accent-primary/50 bg-accent-primary/10 text-content-primary'
                    : done
                      ? 'border-line-glass bg-surface-glass/40 text-content-secondary hover:border-line-hover'
                      : 'border-line-glass bg-surface-glass/20 text-content-muted hover:border-line-hover',
                ].join(' ')}
              >
                <span className="text-accent-primary/90">{it.icon}</span>
                <span className="font-medium">{it.label}</span>
              </button>
            )
          })}
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <aside className="rounded-3xl border border-line-glass bg-surface-glass/60 p-4 backdrop-blur-sm md:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-content-primary">PDF 知识库</h2>
              <p className="mt-1 text-xs text-content-secondary">
                {documents.length} 个文档，上传后也会进入后台资源管理。
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadDocuments()}
              disabled={loadingDocuments}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-line-glass bg-surface-glass/30 text-content-secondary hover:border-line-hover hover:text-content-primary disabled:cursor-not-allowed disabled:opacity-60"
              aria-label="刷新 PDF 文档列表"
            >
              <RefreshCcw className={['h-4 w-4', loadingDocuments ? 'animate-spin' : ''].join(' ')} />
            </button>
          </div>

          <div className="space-y-2">
            {documents.map((item) => {
              const active = item.id === doc?.id
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => selectDocument(item)}
                  className={[
                    'w-full rounded-2xl border p-3 text-left transition-colors',
                    active
                      ? 'border-accent-primary/50 bg-accent-primary/10'
                      : 'border-line-glass bg-surface-glass/20 hover:border-line-hover',
                  ].join(' ')}
                >
                  <div className="flex items-start gap-3">
                    <FileText className="mt-0.5 h-4 w-4 shrink-0 text-accent-primary" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-content-primary">{item.filename}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] text-content-muted">
                        <span className="rounded-full bg-surface-glass/40 px-2 py-0.5">{item.status}</span>
                        <span className="rounded-full bg-surface-glass/40 px-2 py-0.5">
                          chunks {item.chunkCount ?? 0}
                        </span>
                        <span className="rounded-full bg-surface-glass/40 px-2 py-0.5">
                          vectors {item.embeddingCount ?? 0}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-content-muted">
                        {(item.size / 1024 / 1024).toFixed(2)} MB · {new Date(item.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </button>
              )
            })}
            {!documents.length && !loadingDocuments ? (
              <div className="rounded-2xl border border-dashed border-line-glass bg-surface-glass/20 p-4 text-sm text-content-secondary">
                还没有 PDF 文档。先上传一份，知识库列表会自动出现。
              </div>
            ) : null}
          </div>
        </aside>

        <section className="rounded-3xl border border-line-glass bg-surface-glass/60 backdrop-blur-sm p-5 md:p-6">
        {error ? (
          <div className="mb-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        {step === 'upload' ? (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-semibold text-content-primary">Step 1：上传 PDF</h2>
              <p className="mt-1 text-sm text-content-secondary">
                先把 PDF 上传到后端，后续步骤会基于同一份文件进行解析与索引。
              </p>
            </div>

            <input
              ref={fileRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.currentTarget.files?.[0] ?? null
                setFile(f)
              }}
            />

            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-accent-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-primary/90"
              >
                <FileUp className="h-4 w-4" />
                选择 PDF
              </button>
              <div className="flex-1 rounded-2xl border border-line-glass bg-surface-glass/40 px-4 py-2.5 text-sm text-content-secondary">
                {file ? (
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate">{file.name}</span>
                    <span className="shrink-0 text-xs text-content-muted">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                  </div>
                ) : (
                  <span className="text-content-muted">未选择文件</span>
                )}
              </div>
              <button
                type="button"
                disabled={!file || busy}
                onClick={async () => {
                  if (!file) return
                  setError(null)
                  setBusy(true)
                  try {
                    const uploaded = await uploadPdf(file, { replace: replaceOnUpload })
                    setDoc(uploaded)
                    await loadDocuments()
                    setParseDetail(null)
                    setChunkCount(null)
                    setMarkdown('')
                    setStep('parse')
                  } catch (e) {
                    setError(e instanceof Error ? e.message : String(e))
                  } finally {
                    setBusy(false)
                  }
                }}
                className={[
                  'inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-semibold transition-colors',
                  file && !busy
                    ? 'border-line-primary bg-surface-glass text-content-primary hover:border-line-hover'
                    : 'border-line-glass bg-surface-glass/20 text-content-muted cursor-not-allowed',
                ].join(' ')}
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                上传并继续
              </button>
            </div>
            <label className="flex items-center gap-2 text-xs text-content-secondary">
              <input
                type="checkbox"
                checked={replaceOnUpload}
                onChange={(e) => setReplaceOnUpload(e.currentTarget.checked)}
                className="h-4 w-4 accent-accent-primary"
              />
              同名覆盖旧文件（覆盖后会清空旧 chunks/embeddings）
            </label>
          </div>
        ) : (
          <div className="space-y-3">
            <h2 className="text-base font-semibold text-content-primary">
              {step === 'parse'
                ? 'Step 2：解析'
                : step === 'index'
                  ? 'Step 3：向量化索引'
                  : 'Step 4：生成文档'}
            </h2>
            <p className="text-sm text-content-secondary">
              {doc ? (
                <>
                  当前文档：<span className="font-medium text-content-primary">{doc.filename}</span>
                  <span className="text-content-muted">（{(doc.size / 1024 / 1024).toFixed(2)}MB）</span>
                </>
              ) : (
                '请先上传 PDF。'
              )}
              {typeof chunkCount === 'number' ? (
                <>
                  {' '}
                  <span className="text-content-muted">已解析 chunks：{chunkCount}</span>
                </>
              ) : null}
            </p>

            {doc ? (
              <div className="grid gap-3 rounded-2xl border border-line-glass bg-surface-glass/30 p-3 text-xs text-content-secondary md:grid-cols-[1fr_auto] md:items-center">
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-surface-glass/40 px-2.5 py-1">状态：{doc.status}</span>
                  <span className="rounded-full bg-surface-glass/40 px-2.5 py-1">
                    chunks：{doc.chunkCount ?? chunkCount ?? 0}
                  </span>
                  <span className="rounded-full bg-surface-glass/40 px-2.5 py-1">
                    vectors：{doc.embeddingCount ?? 0}
                  </span>
                  {doc.mediaAsset ? (
                    <span className="rounded-full bg-surface-glass/40 px-2.5 py-1">
                      已接入资源库
                    </span>
                  ) : null}
                </div>
                <div className="flex gap-2">
                  <a
                    href={doc.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-line-glass px-3 py-2 text-content-secondary hover:border-line-hover hover:text-content-primary"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    查看原 PDF
                  </a>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!doc) return
                      const ok = window.confirm(`确认删除「${doc.filename}」及其 chunks/embeddings？`)
                      if (!ok) return
                      setBusy(true)
                      setError(null)
                      try {
                        await deletePdfDocument(doc.id)
                        setDoc(null)
                        setParseDetail(null)
                        setChunkCount(null)
                        setMarkdown('')
                        await loadDocuments()
                        setStep('upload')
                      } catch (e) {
                        setError(e instanceof Error ? e.message : String(e))
                      } finally {
                        setBusy(false)
                      }
                    }}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-red-500/20 px-3 py-2 text-red-300 hover:border-red-500/40 hover:bg-red-500/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    删除
                  </button>
                </div>
              </div>
            ) : null}

            <div className="flex flex-col gap-3 pt-2 md:flex-row md:items-center">
              <button
                type="button"
                onClick={() => {
                  if (step === 'parse') setStep('upload')
                  if (step === 'index') setStep('parse')
                  if (step === 'generate') setStep('index')
                }}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-line-primary bg-surface-glass px-4 py-2.5 text-sm font-semibold text-content-primary hover:border-line-hover"
              >
                上一步
              </button>
              <button
                type="button"
                disabled={!doc || busy}
                onClick={async () => {
                  if (!doc) return
                  setError(null)
                  setBusy(true)
                  try {
                    if (step === 'parse') {
                      const res = await parsePdf(doc.id)
                      setChunkCount(res.chunkCount)
                      await loadDocuments()
                      setParseDetail({
                        chunks: res.chunks,
                        preview: res.preview,
                        cleanReport: res.cleanReport,
                        parseStats: res.parseStats,
                      })
                      // 先留在解析步骤展示详情，再由用户手动进入下一步
                      setStep('parse')
                      return
                    }
                    if (step === 'index') {
                      const res = await indexPdf(doc.id)
                      setChunkCount(res.chunkCount)
                      await loadDocuments()
                      setStep('generate')
                      return
                    }
                    if (step === 'generate') {
                      const res = await generatePdfDoc(doc.id)
                      setMarkdown(res.markdown ?? '')
                    }
                  } catch (e) {
                    setError(e instanceof Error ? e.message : String(e))
                  } finally {
                    setBusy(false)
                  }
                }}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-accent-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-primary/90"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {step === 'parse'
                  ? '解析并查看结果'
                  : step === 'index'
                    ? '向量化并继续'
                    : '生成文档'}
              </button>
              {step === 'parse' ? (
                <button
                  type="button"
                  disabled={!parseDetail || busy}
                  onClick={() => setStep('index')}
                  className={[
                    'inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-semibold transition-colors',
                    parseDetail && !busy
                      ? 'border-line-primary bg-surface-glass text-content-primary hover:border-line-hover'
                      : 'border-line-glass bg-surface-glass/20 text-content-muted cursor-not-allowed',
                  ].join(' ')}
                >
                  继续到向量化
                </button>
              ) : null}
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-line-glass bg-surface-glass/30 px-4 py-2.5 text-sm font-semibold text-content-muted cursor-not-allowed"
                disabled={!markdown}
                onClick={() => {
                  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = `${doc?.filename?.replace(/\.pdf$/i, '') || 'document'}.md`
                  a.click()
                  URL.revokeObjectURL(url)
                }}
              >
                <Download className="h-4 w-4" />
                下载 Markdown
              </button>
              <button
                type="button"
                disabled={!doc || !markdown || savingPost}
                onClick={async () => {
                  if (!doc || !markdown) return
                  setError(null)
                  setSavingPost(true)
                  try {
                    const res = await savePdfAsPost(doc.id, { markdown }, { index: indexPost })
                    router.push(`/blog/editor/${res.id}` as import('next').Route)
                  } catch (e) {
                    setError(e instanceof Error ? e.message : String(e))
                  } finally {
                    setSavingPost(false)
                  }
                }}
                className={[
                  'inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-semibold transition-colors',
                  doc && markdown && !savingPost
                    ? 'border-line-primary bg-surface-glass text-content-primary hover:border-line-hover'
                    : 'border-line-glass bg-surface-glass/20 text-content-muted cursor-not-allowed',
                ].join(' ')}
              >
                {savingPost ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                存为草稿文章
              </button>
            </div>

            {step === 'generate' ? (
              <div className="mt-4 space-y-4">
                <div className="rounded-2xl border border-line-glass bg-surface-glass/40 p-4">
                  <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center">
                    <div className="relative flex-1">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-content-muted" />
                      <input
                        value={docSearchQuery}
                        onChange={(e) => setDocSearchQuery(e.currentTarget.value)}
                        placeholder="在当前 PDF chunks 中搜索"
                        className="w-full rounded-xl border border-line-glass bg-surface-glass/20 py-2 pl-9 pr-3 text-sm text-content-primary placeholder:text-content-muted focus:outline-hidden focus:ring-2 focus:ring-accent-primary/30"
                      />
                    </div>
                    <button
                      type="button"
                      disabled={!doc || !docSearchQuery.trim() || searchingDoc}
                      onClick={async () => {
                        if (!doc || !docSearchQuery.trim()) return
                        setSearchingDoc(true)
                        setError(null)
                        try {
                          const hits = await searchPdfDocument(doc.id, docSearchQuery.trim())
                          setDocSearchHits(hits)
                        } catch (e) {
                          setError(e instanceof Error ? e.message : String(e))
                        } finally {
                          setSearchingDoc(false)
                        }
                      }}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-line-primary bg-surface-glass px-3 py-2 text-sm font-medium text-content-primary hover:border-line-hover disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {searchingDoc ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                      搜索
                    </button>
                  </div>
                  {docSearchHits.length ? (
                    <div className="space-y-2">
                      {docSearchHits.map((hit) => (
                        <div key={hit.chunkId} className="rounded-xl border border-line-glass bg-surface-glass/20 p-3">
                          <div className="mb-1 flex items-center justify-between gap-3 text-xs text-content-muted">
                            <span>chunk {hit.chunkIndex}</span>
                            <span>相关度 {(hit.score * 100).toFixed(0)}%</span>
                          </div>
                          <p className="text-sm leading-6 text-content-secondary">{hit.snippet}</p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
                <div className="rounded-2xl border border-line-glass bg-surface-glass/40 p-4">
                <label className="mb-3 flex items-center gap-2 text-xs text-content-secondary">
                  <input
                    type="checkbox"
                    checked={indexPost}
                    onChange={(e) => setIndexPost(e.currentTarget.checked)}
                    className="h-4 w-4 accent-accent-primary"
                  />
                  同时加入文章语义索引（会额外执行一次 embedding）
                </label>
                <div className="mb-2 text-xs font-medium text-content-muted">生成结果预览</div>
                <textarea
                  value={markdown}
                  onChange={(e) => setMarkdown(e.currentTarget.value)}
                  placeholder="点击“生成文档”后，这里会出现 Markdown。"
                  className="h-72 w-full resize-y rounded-xl border border-line-glass bg-surface-glass/30 px-3 py-2 text-sm text-content-primary placeholder:text-content-muted focus:outline-hidden focus:ring-2 focus:ring-accent-primary/40"
                />
              </div>
              </div>
            ) : null}
            {step === 'parse' && parseDetail ? (
              <div className="mt-4 rounded-2xl border border-line-glass bg-surface-glass/40 p-4">
                <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div className="text-xs font-medium text-content-muted">
                    解析详情（总 chunks: {parseDetail.chunks.length}，当前展示: {chunkRows.length}）
                  </div>
                  <input
                    value={chunkFilter}
                    onChange={(e) => setChunkFilter(e.currentTarget.value)}
                    placeholder="按 chunkIndex 或内容过滤"
                    className="w-full md:w-64 rounded-lg border border-line-glass bg-surface-glass/20 px-3 py-1.5 text-xs text-content-primary placeholder:text-content-muted focus:outline-hidden focus:ring-2 focus:ring-accent-primary/30"
                  />
                </div>
                <div className="mb-3 grid grid-cols-1 gap-2 text-xs text-content-secondary sm:grid-cols-2 md:grid-cols-4">
                  <div className="rounded-lg border border-line-glass bg-surface-glass/20 px-2 py-1">
                    min / p50 / p90 / max:
                    {` ${parseDetail.parseStats?.min ?? 0}/${parseDetail.parseStats?.p50 ?? 0}/${parseDetail.parseStats?.p90 ?? 0}/${parseDetail.parseStats?.max ?? 0}`}
                  </div>
                  <div className="rounded-lg border border-line-glass bg-surface-glass/20 px-2 py-1">
                    tooShort / tooLong:
                    {` ${parseDetail.parseStats?.tooShortCount ?? 0}/${parseDetail.parseStats?.tooLongCount ?? 0}`}
                  </div>
                  <div className="rounded-lg border border-line-glass bg-surface-glass/20 px-2 py-1">
                    原始长度: {parseDetail.cleanReport?.originalLength ?? 0}
                  </div>
                  <div className="rounded-lg border border-line-glass bg-surface-glass/20 px-2 py-1">
                    清洗后长度: {parseDetail.cleanReport?.cleanedLength ?? 0}
                  </div>
                </div>
                <div className="max-h-80 overflow-auto rounded-xl border border-line-glass bg-surface-glass/20">
                  <table className="w-full border-collapse text-xs text-content-primary">
                    <thead className="sticky top-0 bg-surface-glass/70 text-content-secondary">
                      <tr className="border-b border-line-glass">
                        <th className="px-3 py-2 text-left font-medium">chunkIndex</th>
                        <th className="px-3 py-2 text-left font-medium">长度</th>
                        <th className="px-3 py-2 text-left font-medium">内容预览</th>
                      </tr>
                    </thead>
                    <tbody>
                      {chunkRows.map((row) => (
                        <tr key={row.chunkIndex} className="border-b border-line-glass/60 align-top">
                          <td className="px-3 py-2 font-medium">{row.chunkIndex}</td>
                          <td className="px-3 py-2">{row.content.length}</td>
                          <td className="px-3 py-2 whitespace-pre-wrap">{row.content}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {chunkRows.length === 0 ? <div className="px-3 py-4 text-xs text-content-muted">没有匹配到任何分段。</div> : null}
                </div>
              </div>
            ) : null}
          </div>
        )}
        </section>
      </div>
    </main>
  )
}

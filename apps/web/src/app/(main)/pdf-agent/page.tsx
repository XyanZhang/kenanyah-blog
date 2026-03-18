'use client'

import { useMemo, useRef, useState } from 'react'
import { Bot, FileUp, Sparkles, Database, FileText, Download, Loader2 } from 'lucide-react'
import { generatePdfDoc, indexPdf, parsePdf, uploadPdf, type PdfDocument } from '@/lib/pdf-agent-api'

type StepKey = 'upload' | 'parse' | 'index' | 'generate'

export default function PdfAgentPage() {
  const fileRef = useRef<HTMLInputElement | null>(null)
  const [step, setStep] = useState<StepKey>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [doc, setDoc] = useState<PdfDocument | null>(null)
  const [chunkCount, setChunkCount] = useState<number | null>(null)
  const [markdown, setMarkdown] = useState<string>('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  return (
    <main className="w-full max-w-5xl mx-auto px-4 py-6 md:py-10">
      <header className="mb-6 rounded-3xl border border-line-glass bg-surface-glass/70 backdrop-blur-sm p-5 md:p-6">
        <div className="flex items-start justify-between gap-4">
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
              setMarkdown('')
              setError(null)
              setStep('upload')
            }}
            className="shrink-0 rounded-xl border border-line-primary bg-surface-glass px-3 py-2 text-xs font-medium text-content-primary hover:border-line-hover"
          >
            重置
          </button>
        </div>

        <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-2">
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

            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
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
                    const uploaded = await uploadPdf(file)
                    setDoc(uploaded)
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

            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 pt-2">
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
                      setStep('index')
                      return
                    }
                    if (step === 'index') {
                      const res = await indexPdf(doc.id)
                      setChunkCount(res.chunkCount)
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
                  ? '解析并继续'
                  : step === 'index'
                    ? '向量化并继续'
                    : '生成文档'}
              </button>
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
            </div>

            {step === 'generate' ? (
              <div className="mt-4 rounded-2xl border border-line-glass bg-surface-glass/40 p-4">
                <div className="mb-2 text-xs font-medium text-content-muted">生成结果预览</div>
                <textarea
                  value={markdown}
                  onChange={(e) => setMarkdown(e.currentTarget.value)}
                  placeholder="点击“生成文档”后，这里会出现 Markdown。"
                  className="h-72 w-full resize-y rounded-xl border border-line-glass bg-surface-glass/30 px-3 py-2 text-sm text-content-primary placeholder:text-content-muted focus:outline-hidden focus:ring-2 focus:ring-accent-primary/40"
                />
              </div>
            ) : null}
          </div>
        )}
      </section>
    </main>
  )
}


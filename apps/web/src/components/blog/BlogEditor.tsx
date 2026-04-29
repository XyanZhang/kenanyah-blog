'use client'

import { useState, useRef, useCallback, useEffect, ChangeEvent, FormEvent } from 'react'
import Image from 'next/image'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  Wand2,
  Expand,
  Shrink,
  Heading,
  FileText,
  Loader2,
  Sparkles,
  Type,
  ImageIcon,
  Calendar,
  Send,
  Eye,
  BookOpen,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  streamAiRewrite,
  streamAiExpand,
  streamAiShrink,
  streamAiHeadings,
  streamAiSummary,
  streamAiGenerateArticle,
  aiGenerateCover,
} from '@/lib/ai-api'

export type BlogEditorInitialData = {
  title: string
  content: string
  coverImage?: string
  images?: string[]
  published: boolean
  publishedAt?: string
  isFeatured: boolean
}

interface BlogEditorProps {
  initialData?: BlogEditorInitialData
  onSubmit?: (data: {
    title: string
    content: string
    coverImage?: string
    images: string[]
    published: boolean
    publishedAt?: string
    isFeatured: boolean
  }) => void | Promise<void>
}

type AiAction = 'rewrite' | 'expand' | 'shrink' | 'headings' | 'summary' | 'generateArticle' | null

export function BlogEditor({ initialData, onSubmit }: BlogEditorProps) {
  const [title, setTitle] = useState(initialData?.title ?? '')
  const [content, setContent] = useState(initialData?.content ?? '')
  const [coverImage, setCoverImage] = useState<string | undefined>(
    initialData?.coverImage ?? undefined
  )
  const [images, setImages] = useState<string[]>(initialData?.images ?? [])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [published, setPublished] = useState(initialData?.published ?? true)
  const [publishedAt, setPublishedAt] = useState(() => {
    if (initialData?.publishedAt) {
      const d = new Date(initialData.publishedAt)
      return d.toISOString().slice(0, 16)
    }
    return new Date().toISOString().slice(0, 16)
  })
  const [isFeatured, setIsFeatured] = useState(initialData?.isFeatured ?? false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResult, setAiResult] = useState('')
  const [aiError, setAiError] = useState<string | null>(null)
  const [aiAction, setAiAction] = useState<AiAction>(null)
  const [generateKeywords, setGenerateKeywords] = useState('')
  const [coverGenLoading, setCoverGenLoading] = useState(false)
  const [coverGenError, setCoverGenError] = useState<string | null>(null)

  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    if (!initialData) return
    setTitle(initialData.title ?? '')
    setContent(initialData.content ?? '')
    setCoverImage(initialData.coverImage ?? undefined)
    setImages(initialData.images ?? [])
    setPublished(initialData.published ?? true)
    setIsFeatured(initialData.isFeatured ?? false)
    if (initialData.publishedAt) {
      setPublishedAt(new Date(initialData.publishedAt).toISOString().slice(0, 16))
    }
  }, [initialData])

  const getSelectedOrFull = useCallback(() => {
    const el = textareaRef.current
    if (!el) return { text: content, start: 0, end: content.length }
    const start = el.selectionStart
    const end = el.selectionEnd
    const text = start < end ? content.slice(start, end) : content
    return { text: text || content, start, end }
  }, [content])

  const runStreamAi = useCallback(
    async (
      action: AiAction,
      payload: { text?: string; content?: string; maxLength?: number; keywords?: string }
    ) => {
      if (!action) return
      setAiAction(action)
      setAiLoading(true)
      setAiResult('')
      setAiError(null)
      const onChunk = (chunk: string) => setAiResult((prev) => prev + chunk)
      const onError = (err: string) => {
        setAiError(err)
        setAiLoading(false)
      }
      try {
        if (action === 'rewrite' && payload.text) {
          await streamAiRewrite({ text: payload.text }, onChunk, onError)
        } else if (action === 'expand' && payload.text) {
          await streamAiExpand({ text: payload.text }, onChunk, onError)
        } else if (action === 'shrink' && payload.text) {
          await streamAiShrink(
            { text: payload.text, maxLength: payload.maxLength },
            onChunk,
            onError
          )
        } else if (action === 'headings' && payload.content) {
          await streamAiHeadings({ content: payload.content }, onChunk, onError)
        } else if (action === 'summary' && payload.content) {
          await streamAiSummary({ content: payload.content }, onChunk, onError)
        } else if (action === 'generateArticle' && payload.keywords) {
          await streamAiGenerateArticle({ keywords: payload.keywords }, onChunk, onError)
        }
      } finally {
        setAiLoading(false)
      }
    },
    []
  )

  const handleAiRewrite = () => {
    const { text } = getSelectedOrFull()
    if (!text.trim()) {
      setAiError('请先选中要改写的段落，或输入内容')
      return
    }
    runStreamAi('rewrite', { text })
  }
  const handleAiExpand = () => {
    const { text } = getSelectedOrFull()
    if (!text.trim()) {
      setAiError('请先选中要扩写的段落，或输入内容')
      return
    }
    runStreamAi('expand', { text })
  }
  const handleAiShrink = () => {
    const { text } = getSelectedOrFull()
    if (!text.trim()) {
      setAiError('请先选中要缩写的段落，或输入内容')
      return
    }
    runStreamAi('shrink', { text })
  }
  const handleAiHeadings = () => {
    if (!content.trim()) {
      setAiError('请先输入正文')
      return
    }
    runStreamAi('headings', { content })
  }
  const handleAiSummary = () => {
    if (!content.trim()) {
      setAiError('请先输入正文')
      return
    }
    runStreamAi('summary', { content })
  }

  const handleAiGenerateArticle = () => {
    const kw = generateKeywords.trim()
    if (!kw) {
      setAiError('请输入生成文章的关键词')
      return
    }
    runStreamAi('generateArticle' as AiAction, { keywords: kw })
  }

  const applyAiResult = () => {
    if (!aiResult.trim() || !textareaRef.current) return
    const { start, end } = getSelectedOrFull()
    const before = content.slice(0, start)
    const after = content.slice(end)
    const newContent = `${before}${aiResult.trim()}${after}`
    setContent(newContent)
    setAiResult('')
    setAiAction(null)
    setAiError(null)
  }

  const handleImagesChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    const fileUrls: string[] = []
    Array.from(files).forEach((file) => {
      const url = URL.createObjectURL(file)
      fileUrls.push(url)
    })

    setImages((prev) => [...prev, ...fileUrls])

    // 将图片以 markdown 语法插入到当前光标位置，方便后续排版
    if (textareaRef.current) {
      const textarea = textareaRef.current
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const before = content.slice(0, start)
      const after = content.slice(end)
      const markdownImages = fileUrls
        .map((url) => `![图片](${url})`)
        .join('\n')
      const nextContent = `${before}${before ? '\n\n' : ''}${markdownImages}${
        after ? `\n\n${after}` : ''
      }`
      setContent(nextContent)
    }
  }

  const handleCoverChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    setCoverImage(url)
    setCoverGenError(null)
  }

  const handleAiGenerateCover = async () => {
    if (!title.trim() || !content.trim()) {
      setCoverGenError('请先填写标题和正文')
      return
    }
    setCoverGenLoading(true)
    setCoverGenError(null)
    try {
      const imageUrl = await aiGenerateCover({ title: title.trim(), content })
      setCoverImage(imageUrl)
    } catch (err) {
      setCoverGenError(err instanceof Error ? err.message : '封面图生成失败')
    } finally {
      setCoverGenLoading(false)
    }
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!title.trim() || !content.trim()) return

    setIsSubmitting(true)
    try {
      const result = onSubmit?.({
        title: title.trim(),
        content: content,
        coverImage,
        images,
        published,
        publishedAt: published ? new Date(publishedAt).toISOString() : undefined,
        isFeatured,
      })
      if (result && typeof (result as Promise<unknown>)?.then === 'function') {
        await (result as Promise<unknown>)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex h-full flex-col gap-6 sm:gap-8">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-6 rounded-2xl border border-line-glass bg-surface-glass/60 p-4 shadow-lg backdrop-blur-sm sm:gap-8 sm:p-8"
      >
        {/* 标题 */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Type className="h-4 w-4 text-accent-primary" aria-hidden />
            <label className="text-sm font-medium text-content-secondary">
              标题
            </label>
          </div>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="输入文章标题"
            className="rounded-xl border-line-primary bg-surface-primary/90 text-content-primary placeholder:text-content-dim"
          />
        </section>

        {/* 正文 + 预览 */}
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <div className="flex min-h-[360px] flex-col gap-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-accent-primary" aria-hidden />
                <span className="text-sm font-medium text-content-secondary">
                  正文（Markdown）
                </span>
              </div>
              <span className="text-xs text-content-tertiary">
                右侧实时预览
              </span>
            </div>
            <div className="flex flex-wrap items-start gap-2 rounded-xl border border-line-primary/50 bg-surface-secondary/50 px-3 py-3 sm:items-center">
              <span className="mr-1 flex items-center gap-1 text-xs text-content-tertiary">
                <Wand2 className="h-3.5 w-3.5 text-accent-primary" />
                AI
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 w-full text-xs sm:w-auto"
                onClick={handleAiRewrite}
                disabled={aiLoading}
              >
                {aiLoading && aiAction === 'rewrite' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                ) : (
                  <Wand2 className="h-3.5 w-3.5 mr-1" />
                )}
                改写
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 w-full text-xs sm:w-auto"
                onClick={handleAiExpand}
                disabled={aiLoading}
              >
                {aiLoading && aiAction === 'expand' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                ) : (
                  <Expand className="h-3.5 w-3.5 mr-1" />
                )}
                扩写
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 w-full text-xs sm:w-auto"
                onClick={handleAiShrink}
                disabled={aiLoading}
              >
                {aiLoading && aiAction === 'shrink' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                ) : (
                  <Shrink className="h-3.5 w-3.5 mr-1" />
                )}
                缩写
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 w-full text-xs sm:w-auto"
                onClick={handleAiHeadings}
                disabled={aiLoading}
              >
                {aiLoading && aiAction === 'headings' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                ) : (
                  <Heading className="h-3.5 w-3.5 mr-1" />
                )}
                小标题
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 w-full text-xs sm:w-auto"
                onClick={handleAiSummary}
                disabled={aiLoading}
              >
                {aiLoading && aiAction === 'summary' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                ) : (
                  <FileText className="h-3.5 w-3.5 mr-1" />
                )}
                摘要
              </Button>
              <div className="flex w-full flex-col gap-2 pt-1 sm:ml-auto sm:w-auto sm:flex-row sm:items-center sm:pt-0">
                <Input
                  className="h-8 w-full text-xs sm:w-44"
                  placeholder="输入关键词自动生成文章"
                  value={generateKeywords}
                  onChange={(e) => setGenerateKeywords(e.target.value)}
                  disabled={aiLoading}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 w-full text-xs sm:w-auto"
                  onClick={handleAiGenerateArticle}
                  disabled={aiLoading}
                >
                  {aiLoading && aiAction === 'generateArticle' ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5 mr-1" />
                  )}
                  生成文章
                </Button>
              </div>
            </div>
            {(aiError || aiResult || aiLoading) && (
              <div className="rounded-xl border border-line-primary/50 bg-accent-primary-subtle/40 px-4 py-3 min-h-[60px]">
                {aiError && (
                  <p className="text-sm text-ui-destructive mb-2">{aiError}</p>
                )}
                {(aiResult || aiLoading) && (
                  <>
                    <div className="text-sm text-content-secondary whitespace-pre-wrap mb-3 max-h-40 overflow-auto rounded-lg bg-surface-primary/60 px-3 py-2">
                      {aiResult || (aiLoading ? '生成中…' : '')}
                    </div>
                    {aiResult && !aiLoading && (
                      <Button
                        type="button"
                        variant="default"
                        size="sm"
                        className="h-8 w-full rounded-lg sm:w-auto"
                        onClick={applyAiResult}
                      >
                        应用到正文
                      </Button>
                    )}
                  </>
                )}
              </div>
            )}
            <div className="flex-1 min-h-[320px] rounded-xl border border-line-primary/60 bg-surface-primary/80 px-4 py-4 shadow-inner transition-colors focus-within:border-accent-primary/40 focus-within:ring-2 focus-within:ring-accent-primary/20 sm:min-h-[360px]">
              <textarea
                ref={textareaRef}
                className="h-full min-h-[320px] w-full resize-none border-0 bg-transparent text-sm text-content-primary placeholder:text-content-dim focus-visible:outline-none focus-visible:ring-0 sm:min-h-[360px]"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="在这里编写文章内容，支持 Markdown 语法…"
              />
            </div>
          </div>

          <div className="flex min-h-[360px] flex-col gap-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-accent-primary" aria-hidden />
                <span className="text-sm font-medium text-content-secondary">
                  预览
                </span>
              </div>
              <span className="text-xs text-content-tertiary">
                实时渲染
              </span>
            </div>
            <div className="md-content-wrapper flex-1 overflow-auto rounded-xl border border-line-primary/60 bg-surface-secondary/80 px-4 py-4 sm:px-5 sm:py-5">
              <article className="md-content max-w-none">
                {content.trim() ? (
                  <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    table: ({ children, ...props }) => (
                      <div className="md-table-wrapper">
                        <table {...props}>{children}</table>
                      </div>
                    ),
                  }}
                >
                  {content}
                </ReactMarkdown>
                ) : (
                  <p className="text-content-tertiary text-sm">
                    开始输入内容以查看预览…
                  </p>
                )}
              </article>
            </div>
          </div>
        </section>

        {/* 图片 */}
        <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-accent-primary" aria-hidden />
              <label className="text-sm font-medium text-content-secondary">
                封面图片
              </label>
            </div>
            <div className="flex flex-col gap-3 rounded-xl border border-line-primary/50 bg-surface-secondary/50 px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
              <Input
                type="file"
                accept="image/*"
                onChange={handleCoverChange}
                className="rounded-lg border-line-primary bg-surface-primary text-content-primary file:mr-2 file:rounded-lg file:border-0 file:bg-accent-primary/10 file:px-3 file:py-1.5 file:text-sm file:text-accent-primary file:hover:bg-accent-primary/20"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 w-full shrink-0 text-xs sm:w-auto"
                onClick={handleAiGenerateCover}
                disabled={coverGenLoading || aiLoading}
              >
                {coverGenLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                )}
                AI 生成封面
              </Button>
              {coverImage && (
                <div className="relative h-20 w-full overflow-hidden rounded-lg border border-line-primary/60 bg-surface-tertiary shadow-sm sm:h-16 sm:w-24 sm:shrink-0">
                  <Image
                    src={coverImage}
                    alt="封面预览"
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, 96px"
                    unoptimized
                  />
                </div>
              )}
            </div>
            {coverGenError && (
              <p className="text-sm text-ui-destructive">{coverGenError}</p>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-accent-primary" aria-hidden />
              <label className="text-sm font-medium text-content-secondary">
                插图上传
              </label>
            </div>
            <Input
              type="file"
              accept="image/*"
              multiple
              onChange={handleImagesChange}
              className="rounded-xl border-line-primary bg-surface-primary text-content-primary file:mr-2 file:rounded-lg file:border-0 file:bg-accent-primary/10 file:px-3 file:py-1.5 file:text-sm file:text-accent-primary file:hover:bg-accent-primary/20"
            />
            {images.length > 0 && (
              <div className="grid grid-cols-2 gap-2 rounded-xl border border-line-primary/50 bg-surface-secondary/50 p-3 sm:grid-cols-4">
                {images.map((src, index) => (
                  <div
                    key={index}
                    className={cn(
                      'relative aspect-square rounded-lg overflow-hidden border border-line-primary/50 bg-surface-tertiary',
                    )}
                  >
                    <Image
                      src={src}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="96px"
                      unoptimized
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* 发布设置 */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col gap-3 rounded-xl border border-line-primary/50 bg-surface-secondary/50 p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-accent-primary" aria-hidden />
              <Label className="text-sm font-medium text-content-secondary">
                发表时间
              </Label>
            </div>
            <Input
              type="datetime-local"
              value={publishedAt}
              onChange={(e) => setPublishedAt(e.target.value)}
              disabled={!published}
              className="rounded-lg border-line-primary bg-surface-primary text-content-primary"
            />
            <p className="text-xs text-content-tertiary leading-relaxed">
              默认当前时间，可调整为过去或未来（仅发布时生效）。
            </p>
          </div>

          <div className="flex flex-col gap-4 rounded-xl border border-line-primary/50 bg-surface-secondary/50 p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium text-content-secondary">
                  立即发布
                </span>
                <span className="text-xs text-content-tertiary">
                  关闭后作为草稿保存
                </span>
              </div>
              <Switch checked={published} onCheckedChange={setPublished} />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium text-content-secondary">
                  推荐位
                </span>
                <span className="text-xs text-content-tertiary">
                  精选文章用于首页推荐
                </span>
              </div>
              <Switch checked={isFeatured} onCheckedChange={setIsFeatured} />
            </div>
          </div>
        </section>

        <div className="flex flex-col gap-3 border-t border-line-primary/50 pt-3 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full rounded-lg sm:w-auto"
          >
            保存草稿
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={isSubmitting}
            className="w-full gap-2 rounded-lg sm:w-auto"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {isSubmitting
              ? initialData
                ? '保存中…'
                : '发布中…'
              : initialData
                ? '保存修改'
                : '发布文章'}
          </Button>
        </div>
      </form>
    </div>
  )
}

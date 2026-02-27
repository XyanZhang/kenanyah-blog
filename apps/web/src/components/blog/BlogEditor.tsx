'use client'

import { useState, useRef, useCallback, ChangeEvent, FormEvent } from 'react'
import Image from 'next/image'
import ReactMarkdown from 'react-markdown'
import { Wand2, Expand, Shrink, Heading, FileText, Loader2, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  streamAiRewrite,
  streamAiExpand,
  streamAiShrink,
  streamAiHeadings,
  streamAiSummary,
  streamAiGenerateArticle,
} from '@/lib/ai-api'

interface BlogEditorProps {
  onSubmit?: (data: {
    title: string
    content: string
    coverImage?: string
    images: string[]
  }) => void
}

type AiAction = 'rewrite' | 'expand' | 'shrink' | 'headings' | 'summary' | 'generateArticle' | null

export function BlogEditor({ onSubmit }: BlogEditorProps) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [coverImage, setCoverImage] = useState<string | undefined>(undefined)
  const [images, setImages] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResult, setAiResult] = useState('')
  const [aiError, setAiError] = useState<string | null>(null)
  const [aiAction, setAiAction] = useState<AiAction>(null)
  const [generateKeywords, setGenerateKeywords] = useState('')

  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

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
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!title.trim() || !content.trim()) return

    setIsSubmitting(true)
    onSubmit?.({
      title: title.trim(),
      content: content,
      coverImage,
      images,
    })
    // 先保持简单：提交后不清空内容，方便继续编辑
    setIsSubmitting(false)
  }

  return (
    <div className="flex flex-col gap-6 h-full">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-5 bg-card/80 rounded-2xl p-5 shadow-md"
      >
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-content-secondary">
            标题
          </label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="输入文章标题"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] gap-4">
          <div className="flex flex-col gap-3 min-h-[320px]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-content-secondary">
                正文（Markdown）
              </span>
              <span className="text-xs text-content-tertiary">
                支持基础 Markdown 语法，右侧实时预览
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-content-tertiary mr-1">AI：</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs"
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
                className="h-8 text-xs"
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
                className="h-8 text-xs"
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
                className="h-8 text-xs"
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
                className="h-8 text-xs"
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
              <div className="flex items-center gap-2 ml-auto">
                <Input
                  className="h-8 text-xs w-44"
                  placeholder="输入关键词自动生成文章"
                  value={generateKeywords}
                  onChange={(e) => setGenerateKeywords(e.target.value)}
                  disabled={aiLoading}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
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
              <div className="rounded-xl bg-muted/50 px-3 py-2 min-h-[60px]">
                {aiError && (
                  <p className="text-sm text-red-600 dark:text-red-400 mb-2">{aiError}</p>
                )}
                {(aiResult || aiLoading) && (
                  <>
                    <div className="text-sm text-content-secondary whitespace-pre-wrap mb-2 max-h-40 overflow-auto">
                      {aiResult || (aiLoading ? '生成中…' : '')}
                    </div>
                    {aiResult && !aiLoading && (
                      <Button
                        type="button"
                        variant="default"
                        size="sm"
                        className="h-8"
                        onClick={applyAiResult}
                      >
                        应用到正文
                      </Button>
                    )}
                  </>
                )}
              </div>
            )}
            <div className="flex-1 min-h-[260px] rounded-xl bg-background/70 px-3 py-2 shadow-inner">
              <textarea
                ref={textareaRef}
                className="h-full w-full border-0 bg-transparent text-sm text-content-primary resize-none focus-visible:outline-none focus-visible:ring-0"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="在这里编写文章内容，支持 Markdown 语法..."
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 min-h-[320px]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-content-secondary">
                预览
              </span>
              <span className="text-xs text-content-tertiary">
                自动根据当前内容渲染
              </span>
            </div>
            <div className="flex-1 min-h-[260px] rounded-xl bg-surface-glass/80 px-4 py-3 overflow-auto">
              <article className="md-content max-w-none">
                {content.trim() ? (
                  <ReactMarkdown>{content}</ReactMarkdown>
                ) : (
                  <p className="text-content-tertiary">
                    开始输入内容以查看预览…
                  </p>
                )}
              </article>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-content-secondary">
              封面图片
            </label>
            <div className="flex items-center gap-3 rounded-xl bg-muted/40 px-3 py-2">
              <Input type="file" accept="image/*" onChange={handleCoverChange} />
              {coverImage && (
                <div className="relative h-16 w-24 rounded-md overflow-hidden bg-muted shadow-sm">
                  <Image
                    src={coverImage}
                    alt="封面预览"
                    fill
                    className="object-cover"
                    sizes="96px"
                    unoptimized
                  />
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-content-secondary">
              插图上传
            </label>
            <Input
              type="file"
              accept="image/*"
              multiple
              onChange={handleImagesChange}
            />
            {images.length > 0 && (
              <div className="mt-2 grid grid-cols-3 gap-1 rounded-xl bg-muted/40 p-1">
                {images.map((src, index) => (
                  <div
                    key={index}
                    className={cn(
                      'relative aspect-4/3 bg-muted rounded-md overflow-hidden',
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
        </div>

        <div className="flex justify-end gap-3 pt-2 mt-2">
          <Button type="button" variant="outline" size="sm">
            保存草稿
          </Button>
          <Button type="submit" size="sm" disabled={isSubmitting}>
            {isSubmitting ? '发布中…' : '发布文章'}
          </Button>
        </div>
      </form>
    </div>
  )
}


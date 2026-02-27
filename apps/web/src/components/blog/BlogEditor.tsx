'use client'

import { useState, useRef, ChangeEvent, FormEvent } from 'react'
import Image from 'next/image'
import ReactMarkdown from 'react-markdown'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface BlogEditorProps {
  onSubmit?: (data: {
    title: string
    content: string
    coverImage?: string
    images: string[]
  }) => void
}

export function BlogEditor({ onSubmit }: BlogEditorProps) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [coverImage, setCoverImage] = useState<string | undefined>(undefined)
  const [images, setImages] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

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


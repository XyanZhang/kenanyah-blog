'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { PenLine, Sparkles } from 'lucide-react'
import { BlogEditor } from '@/components/blog/BlogEditor'
import { apiClient } from '@/lib/api-client'

export default function BlogEditorPage() {
  const router = useRouter()
  const [submitError, setSubmitError] = useState<string | null>(null)

  const handleSubmit = async (data: {
    title: string
    content: string
    coverImage?: string
    published: boolean
    publishedAt?: string
    isFeatured: boolean
  }) => {
    setSubmitError(null)
    try {
      const body = {
        title: data.title,
        content: data.content,
        excerpt: data.content.slice(0, 500).trim() || undefined,
        published: data.published,
        publishedAt: data.published ? data.publishedAt : undefined,
        isFeatured: data.isFeatured,
        coverImage:
          data.coverImage?.startsWith('http') ? data.coverImage : undefined,
      }
      const res = await apiClient
        .post('posts', { json: body })
        .json<{ success: boolean; data?: { slug: string }; error?: string }>()
      if (res.success && res.data?.slug) {
        router.push(`/posts/${res.data.slug}` as import('next').Route)
        return
      }
      setSubmitError(res.error ?? '发布失败')
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: string }).message)
          : '发布失败，请检查登录状态或稍后重试'
      setSubmitError(message)
    }
  }

  return (
    <main className="min-h-[calc(100vh-80px)] w-full flex flex-col">
      <div className="flex-1 flex flex-col min-h-0 w-full">
        <div className="max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-10 flex flex-col gap-8">
          <header className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-line-glass bg-surface-glass/80 text-accent-primary shadow-sm backdrop-blur-sm"
                aria-hidden
              >
                <PenLine className="h-5 w-5" />
              </div>
              <div className="flex flex-col gap-0.5">
                <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-content-primary">
                  写文章
                </h1>
                <p className="text-sm text-content-tertiary">
                  支持 Markdown 编辑、实时预览与图片上传
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-line-primary/60 bg-accent-primary-subtle/50 px-4 py-3 text-sm text-content-secondary">
              <Sparkles className="h-4 w-4 shrink-0 text-accent-primary" />
              <span>右侧提供 AI 改写、扩写、缩写、小标题、摘要与一键生成文章，后续会持续增强写作助手能力。</span>
            </div>
          </header>
          {submitError && (
            <div
              className="rounded-xl border border-ui-destructive/40 bg-ui-destructive-light px-4 py-3 text-sm text-ui-destructive"
              role="alert"
            >
              {submitError}
            </div>
          )}
          <BlogEditor onSubmit={handleSubmit} />
        </div>
      </div>
    </main>
  )
}


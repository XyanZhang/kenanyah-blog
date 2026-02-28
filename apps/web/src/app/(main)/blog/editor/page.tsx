'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
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
        <div className="max-w-5xl w-full mx-auto px-4 py-6 flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold text-content-primary">
              写文章
            </h1>
            <p className="text-sm text-content-tertiary">
              支持 Markdown 编辑、实时预览和图片上传，后续会在此接入 AI
              写作助手能力。
            </p>
          </div>
          {submitError && (
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">
              {submitError}
            </p>
          )}
          <BlogEditor onSubmit={handleSubmit} />
        </div>
      </div>
    </main>
  )
}


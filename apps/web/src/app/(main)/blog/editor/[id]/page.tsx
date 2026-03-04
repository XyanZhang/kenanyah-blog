'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { PenLine, Loader2 } from 'lucide-react'
import { BlogEditor, type BlogEditorInitialData } from '@/components/blog/BlogEditor'
import { HTTPError } from 'ky'
import { apiClient } from '@/lib/api-client'
import type { ApiResponse } from '@/lib/api-client'

type PostDetail = {
  id: string
  slug: string
  title: string
  excerpt: string | null
  content: string
  coverImage: string | null
  published: boolean
  publishedAt: string | null
  isFeatured: boolean
}

export default function BlogEditPage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string | undefined
  const [post, setPost] = useState<PostDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    setError(null)
    apiClient
      .get(`posts/by-id/${encodeURIComponent(id)}`)
      .json<ApiResponse<PostDetail>>()
      .then((res) => {
        if (cancelled) return
        if (res.success && res.data) {
          setPost(res.data)
        } else {
          setError(res.error ?? '文章不存在')
        }
      })
      .catch((err) => {
        if (cancelled) return
        setError(err?.message ?? '加载失败')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id])

  const handleSubmit = async (data: {
    title: string
    content: string
    coverImage?: string
    published: boolean
    publishedAt?: string
    isFeatured: boolean
  }) => {
    if (!id) return
    setSubmitError(null)
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
    let coverValue: string | undefined
    if (data.coverImage) {
      if (data.coverImage.startsWith('http')) {
        coverValue = data.coverImage
      } else if (data.coverImage.startsWith('/')) {
        coverValue = `${API_BASE.replace(/\/$/, '')}${data.coverImage}`
      } else {
        coverValue = undefined
      }
    } else {
      coverValue = undefined
    }
    try {
      const body = {
        title: data.title,
        content: data.content,
        excerpt: data.content.slice(0, 500).trim() || undefined,
        published: data.published,
        publishedAt: data.published ? data.publishedAt : undefined,
        isFeatured: data.isFeatured,
        coverImage: coverValue,
      }
      const res = await apiClient
        .patch(`posts/${id}`, { json: body })
        .json<{
          success: boolean
          data?: { slug: string }
          error?: string
          details?: Array<{ path: string; message: string }>
        }>()
      if (res.success && res.data?.slug) {
        router.push(`/posts/${res.data.slug}` as import('next').Route)
        return
      }
      const detailMsg =
        res.details?.map((d) => `${d.path}: ${d.message}`).join('; ') ?? ''
      setSubmitError(
        [res.error, detailMsg].filter(Boolean).join(detailMsg ? ' ' : '') ||
          '保存失败'
      )
    } catch (err: unknown) {
      let message = '保存失败，请检查登录状态或权限后重试'
      if (err instanceof HTTPError) {
        try {
          const body = (await err.response.json()) as {
            error?: string
            details?: Array<{ path: string; message: string }>
          }
          const parts = [body.error]
          if (body.details?.length) {
            parts.push(body.details.map((d) => `${d.path}: ${d.message}`).join('；'))
          }
          message = parts.filter(Boolean).join(' ') || message
        } catch {
          message = err.message || message
        }
      } else if (err && typeof err === 'object' && 'message' in err) {
        message = String((err as { message: string }).message) || message
      }
      setSubmitError(message)
    }
  }

  if (loading) {
    return (
      <main className="min-h-[calc(100vh-80px)] w-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-accent-primary" />
          <p className="text-sm text-content-tertiary">加载文章中…</p>
        </div>
      </main>
    )
  }

  if (error || !post) {
    return (
      <main className="min-h-[calc(100vh-80px)] w-full flex items-center justify-center">
        <div className="rounded-2xl border border-line-glass bg-surface-glass/80 p-8 text-center shadow-lg backdrop-blur-sm max-w-md">
          <p className="mb-6 text-ui-destructive" role="alert">
            {error ?? '文章不存在'}
          </p>
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-xl border border-line-primary bg-surface-glass px-4 py-2.5 text-sm font-medium text-content-primary transition-colors hover:border-accent-primary/50 hover:bg-accent-primary/10"
          >
            返回
          </button>
        </div>
      </main>
    )
  }

  const initialData: BlogEditorInitialData = {
    title: post.title,
    content: post.content,
    coverImage: post.coverImage ?? undefined,
    published: post.published,
    publishedAt: post.publishedAt ?? undefined,
    isFeatured: post.isFeatured,
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
                  编辑文章
                </h1>
                <p className="text-sm text-content-tertiary">
                  修改文章内容后保存
                </p>
              </div>
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
          <BlogEditor initialData={initialData} onSubmit={handleSubmit} />
        </div>
      </div>
    </main>
  )
}

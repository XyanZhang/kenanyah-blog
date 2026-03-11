'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import Image from 'next/image'
import { ArrowLeft, Pencil } from 'lucide-react'
import { apiClient } from '@/lib/api-client'
import type { ApiResponse } from '@/lib/api-client'

type PostDetail = {
  id: string
  slug: string
  title: string
  excerpt: string | null
  content: string
  coverImage: string | null
  publishedAt: string | null
  createdAt: string
  author: { username: string; name: string | null; avatar: string | null }
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

function normalizeImageUrl(url: string | null): string | null {
  if (!url) return null
  // 已经是完整 URL 或 blob URL，直接返回
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:')) {
    return url
  }
  // 相对路径，拼接 API 基础 URL
  if (url.startsWith('/')) {
    return `${API_BASE_URL.replace(/\/$/, '')}${url}`
  }
  return url
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export default function PostPage() {
  const params = useParams()
  const slug = params?.slug as string | undefined
  const [post, setPost] = useState<PostDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!slug) return
    let cancelled = false
    setLoading(true)
    setError(null)
    apiClient
      .get(`posts/${encodeURIComponent(slug)}`)
      .json<ApiResponse<PostDetail>>()
      .then((res) => {
        if (cancelled) return
        if (res.success && res.data) {
          setPost(res.data)
          if (typeof document !== 'undefined') {
            document.title = `${res.data.title} | 博客`
          }
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
  }, [slug])

  if (loading) {
    return (
      <main className="min-h-[60vh] w-full max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="animate-pulse flex flex-col gap-6">
          <div className="h-4 w-24 rounded bg-surface-tertiary/60" />
          <div className="h-10 w-3/4 rounded bg-surface-tertiary/60" />
          <div className="h-4 w-full max-w-md rounded bg-surface-tertiary/40" />
          <div className="h-4 w-full rounded bg-surface-tertiary/40" />
          <div className="h-4 w-5/6 rounded bg-surface-tertiary/40" />
        </div>
      </main>
    )
  }

  if (error || !post) {
    return (
      <main className="min-h-[60vh] w-full max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="rounded-2xl border border-line-glass bg-surface-glass/80 p-8 text-center shadow-lg backdrop-blur-sm">
          <p className="mb-6 text-red-600 dark:text-red-400" role="alert">
            {error ?? '文章不存在'}
          </p>
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 rounded-xl border border-line-primary bg-surface-glass px-4 py-2.5 text-sm font-medium text-content-primary transition-colors hover:border-accent-primary/50 hover:bg-accent-primary/10"
          >
            <ArrowLeft className="h-4 w-4" />
            返回博客列表
          </Link>
        </div>
      </main>
    )
  }

  const date = post.publishedAt ?? post.createdAt

  return (
    <main className="min-h-[60vh] w-full max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <div className="flex items-center justify-between mb-8">
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 text-sm text-content-tertiary transition-colors hover:text-accent-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          返回博客
        </Link>
        <Link
          href={`/blog/editor/${post.id}` as import('next').Route}
          className="inline-flex items-center gap-2 rounded-xl border border-line-primary bg-surface-glass px-4 py-2.5 text-sm font-medium text-content-primary transition-colors hover:border-accent-primary/50 hover:bg-accent-primary/10"
        >
          <Pencil className="h-4 w-4" />
          编辑
        </Link>
      </div>

      <article className="font-blog overflow-hidden rounded-2xl border border-line-glass bg-surface-glass/60 shadow-lg backdrop-blur-sm">
        <header className="p-6 sm:p-8 pb-4">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-semibold leading-tight text-content-primary tracking-tight">
            {post.title}
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-content-tertiary">
            <span className="font-medium text-content-secondary">
              {post.author?.name ?? post.author?.username}
            </span>
            <span className="text-content-muted" aria-hidden>
              ·
            </span>
            <time dateTime={date} className="text-content-muted">
              {formatDate(date)}
            </time>
          </div>
          {post.excerpt && (
            <p className="mt-4 text-content-secondary leading-relaxed">
              {post.excerpt}
            </p>
          )}
        </header>

        {normalizeImageUrl(post.coverImage) && (
          <div className="relative w-full aspect-video bg-surface-tertiary">
            <Image
              src={normalizeImageUrl(post.coverImage)!}
              alt=""
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 672px"
              unoptimized
              priority
            />
          </div>
        )}

        <div className="p-6 sm:p-8 pt-6">
          <div className="md-content max-w-none">
            <ReactMarkdown>{post.content}</ReactMarkdown>
          </div>
        </div>
      </article>

      <div className="mt-8 flex justify-center">
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 rounded-xl border border-line-primary bg-surface-glass px-4 py-2.5 text-sm font-medium text-content-primary transition-colors hover:border-accent-primary/50 hover:bg-accent-primary/10"
        >
          <ArrowLeft className="h-4 w-4" />
          返回博客列表
        </Link>
      </div>
    </main>
  )
}

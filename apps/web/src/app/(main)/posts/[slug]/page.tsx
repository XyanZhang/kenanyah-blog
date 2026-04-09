'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import Image from 'next/image'
import { ArrowLeft, Pencil } from 'lucide-react'
import { apiClient, getApiBaseUrl } from '@/lib/api-client'
import type { ApiResponse } from '@/lib/api-client'
import { getApiErrorMessage } from '@/lib/api-error'
import { useAuthSession } from '@/hooks/useAuthSession'
import { cn } from '@/lib/utils'
import { buildDynamicImageUrl, isStaticsSource } from '@/lib/image-service'
import { collectTocFromMarkdown, slugifyHeading } from '@/lib/heading'
import { PostAside } from '@/components/posts/PostAside'

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

const POST_LAYOUT_MAX_WIDTH = 1140
const POST_ASIDE_WIDTH = 208
const POST_LAYOUT_GAP = 32
const POST_CONTENT_MAX_WIDTH = POST_LAYOUT_MAX_WIDTH - POST_ASIDE_WIDTH - POST_LAYOUT_GAP
const POST_ASIDE_LEFT = `calc(50% + ${POST_LAYOUT_MAX_WIDTH / 2 - POST_ASIDE_WIDTH}px)`

function normalizeImageUrl(url: string | null): string | null {
  if (!url) return null
  // 已经是完整 URL 或 blob URL，直接返回
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:')) {
    return url
  }
  // 相对路径：/uploads 由站点根路径提供（nginx 转发到 API），不要拼成 /api/uploads
  if (url.startsWith('/uploads')) {
    const origin =
      typeof window !== 'undefined'
        ? window.location.origin
        : (process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/\/$/, '')
    return origin ? `${origin}${url}` : url
  }
  // 其他相对路径（若有）按 API 基础 URL 拼接
  if (url.startsWith('/')) {
    const apiBase = getApiBaseUrl()
    return `${apiBase.replace(/\/$/, '')}${url}`
  }
  return url
}

function resolvePostCover(url: string | null): string | null {
  const normalized = normalizeImageUrl(url)
  if (!normalized) return null
  if (!isStaticsSource(normalized)) return normalized
  return buildDynamicImageUrl(normalized, {
    width: 1344,
    height: 756,
    quality: 82,
    fit: 'cover',
    format: 'webp',
  })
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function toPlainText(node: unknown): string {
  if (node == null) return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(toPlainText).join('')
  // react-markdown children may include ReactElements; we only need their text content.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const maybeProps = (node as any)?.props
  if (maybeProps && 'children' in maybeProps) return toPlainText(maybeProps.children)
  return ''
}

export default function PostPage() {
  const params = useParams()
  const slug = params?.slug as string | undefined
  const { isAuthenticated, authChecked } = useAuthSession()
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
        setError(getApiErrorMessage(err))
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
      <main className="min-h-[60vh] w-full max-w-[1140px] mx-auto px-4 sm:px-6 xl:px-0 py-8 sm:py-12">
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
      <main className="min-h-[60vh] w-full max-w-[1140px] mx-auto px-4 sm:px-6 xl:px-0 py-8 sm:py-12">
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
  const tocHeadings = collectTocFromMarkdown(post.content)
  let tocCursor = 0

  return (
    <main className="min-h-[60vh] py-8 sm:py-12">
      {/* 让正文列 + 右侧目录作为一个 1140px 布局整体居中，目录仍保持 fixed。 */}
      <div className="relative mx-auto w-full max-w-[1140px] px-4 sm:px-6 xl:px-0">
        <div
          className="hidden xl:block fixed top-28 z-40 w-[208px]"
          style={{ left: POST_ASIDE_LEFT }}
        >
          <PostAside headings={tocHeadings} />
        </div>

        <div className="w-full xl:max-w-[900px]">
          <div
            className={cn(
              'mb-8 flex items-center',
              authChecked && isAuthenticated ? 'justify-between' : ''
            )}
          >
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 text-sm text-content-tertiary transition-colors hover:text-accent-primary"
            >
              <ArrowLeft className="h-4 w-4" />
              返回博客
            </Link>
            {authChecked && isAuthenticated ? (
              <Link
                href={`/blog/editor/${post.id}` as import('next').Route}
                className="inline-flex items-center gap-2 rounded-xl border border-line-primary bg-surface-glass px-4 py-2.5 text-sm font-medium text-content-primary transition-colors hover:border-accent-primary/50 hover:bg-accent-primary/10"
              >
                <Pencil className="h-4 w-4" />
                编辑
              </Link>
            ) : null}
          </div>

          <article className="font-blog w-full overflow-hidden rounded-2xl border border-line-glass bg-surface-glass/60 shadow-lg backdrop-blur-sm">
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

            {resolvePostCover(post.coverImage) && (
              <div className="relative w-full aspect-video bg-surface-tertiary">
                <Image
                  src={resolvePostCover(post.coverImage)!}
                  alt=""
                  fill
                  className="object-cover"
                  sizes={`(max-width: 1279px) 100vw, ${POST_CONTENT_MAX_WIDTH}px`}
                  unoptimized
                  priority
                />
              </div>
            )}

            <div className="p-6 sm:p-8 pt-6">
              <div className="md-content max-w-none">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h1: ({ node: _node, children, ...props }) => {
                      // h1 通常是文章标题（已在 header 渲染），正文内出现时不做 TOC
                      return <h1 {...props}>{children}</h1>
                    },
                    h2: ({ node: _node, children, ...props }) => {
                      const heading = tocHeadings[tocCursor]
                      const text = toPlainText(children).trim()
                      const fallback = slugifyHeading(text) || 'section'
                      const id = heading?.depth === 2 ? heading.id : fallback
                      tocCursor += 1
                      return (
                        <h2 {...props} id={id}>
                          {children}
                        </h2>
                      )
                    },
                    h3: ({ node: _node, children, ...props }) => {
                      const heading = tocHeadings[tocCursor]
                      const text = toPlainText(children).trim()
                      const fallback = slugifyHeading(text) || 'section'
                      const id = heading?.depth === 3 ? heading.id : fallback
                      tocCursor += 1
                      return (
                        <h3 {...props} id={id}>
                          {children}
                        </h3>
                      )
                    },
                    table: ({ children, ...props }) => (
                      <div className="md-table-wrapper">
                        <table {...props}>{children}</table>
                      </div>
                    ),
                  }}
                >
                  {post.content}
                </ReactMarkdown>
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
        </div>
      </div>
    </main>
  )
}

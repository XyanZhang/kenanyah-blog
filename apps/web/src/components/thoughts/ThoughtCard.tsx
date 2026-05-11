'use client'

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import Link from 'next/link'
import {
  ChevronDown,
  HelpCircle,
  MessageCircle,
  Pencil,
  ThumbsDown,
  ThumbsUp,
  X,
} from 'lucide-react'
import Lightbox from 'yet-another-react-lightbox'
import Zoom from 'yet-another-react-lightbox/plugins/zoom'
import 'yet-another-react-lightbox/styles.css'
import { cn } from '@/lib/utils'
import type { ThoughtPostWithInteraction } from './types'

const LONG_CONTENT_CHAR_LIMIT = 220
const LONG_CONTENT_LINE_LIMIT = 6
const COLLAPSED_CONTENT_HEIGHT = '6.6rem'

interface ThoughtCardProps {
  post: ThoughtPostWithInteraction
  /** 当前登录用户是否为作者（用于展示编辑入口） */
  canEdit?: boolean
  onLike: (id: string, liked: boolean) => void
  onDislike: (id: string, disliked: boolean) => void
  onQuestion: (id: string, questioned: boolean) => void
  onComment: (id: string) => void
}

export function ThoughtCard({
  post,
  canEdit = false,
  onLike,
  onDislike,
  onQuestion,
  onComment,
}: ThoughtCardProps) {
  const [liked, setLiked] = useState(!!post.liked)
  const [disliked, setDisliked] = useState(!!post.disliked)
  const [questioned, setQuestioned] = useState(!!post.questioned)
  const [likeCount, setLikeCount] = useState(post.likeCount)
  const [previewIndex, setPreviewIndex] = useState(-1)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const slides = useMemo(() => post.images.map((src) => ({ src })), [post.images])
  const contentLineCount = useMemo(
    () => post.content.split(/\r\n|\r|\n/).length,
    [post.content]
  )
  const isLongContent =
    post.content.length > LONG_CONTENT_CHAR_LIMIT ||
    contentLineCount > LONG_CONTENT_LINE_LIMIT
  const contentId = `thought-preview-${post.id}`

  const handleLike = () => {
    const next = !liked
    setLiked(next)
    if (disliked) {
      setDisliked(false)
      onDislike(post.id, false)
    }
    setLikeCount((c) => (next ? c + 1 : c - 1))
    onLike(post.id, next)
  }

  const handleDislike = () => {
    const next = !disliked
    setDisliked(next)
    if (liked) {
      setLiked(false)
      setLikeCount((c) => c - 1)
      onLike(post.id, false)
    }
    onDislike(post.id, next)
  }

  const handleQuestion = () => {
    const next = !questioned
    setQuestioned(next)
    onQuestion(post.id, next)
  }

  const imageCount = post.images.length
  const gridClass =
    imageCount === 1
      ? 'grid-cols-1'
      : imageCount === 2
        ? 'grid-cols-2'
        : imageCount === 3
          ? 'grid-cols-3'
          : 'grid-cols-3'

  return (
    <>
      <article className="rounded-2xl border border-line-glass/40 bg-card p-4 shadow-sm sm:p-5">
        <div className="flex gap-3">
          <div className="shrink-0">
            <Image
              src={post.avatar}
              alt={post.authorName}
              width={44}
              height={44}
              className="rounded-full object-cover h-11 w-11"
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-col gap-2 text-content-secondary sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                <span className="font-medium text-content-primary truncate">{post.authorName}</span>
                <span className="text-sm text-content-tertiary shrink-0">{post.date}</span>
              </div>
              {canEdit && (
                <Link
                  href={`/thoughts/${post.id}/edit`}
                  className="inline-flex shrink-0 items-center gap-1 self-start text-sm text-content-tertiary transition-colors hover:text-accent-primary sm:self-auto"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  编辑
                </Link>
              )}
            </div>
            {post.content && (
              <div className="mt-1">
                <div
                  id={contentId}
                  className={cn(
                    'relative overflow-hidden',
                    isLongContent && 'after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-10 after:bg-gradient-to-b after:from-transparent after:to-card'
                  )}
                  style={{
                    maxHeight:
                      isLongContent ? COLLAPSED_CONTENT_HEIGHT : undefined,
                  }}
                >
                  <p className="font-blog text-content-primary text-[15px] leading-[1.75] tracking-[0.01em] whitespace-pre-wrap wrap-break-word">
                    {post.content}
                  </p>
                </div>
                {isLongContent && (
                  <button
                    type="button"
                    onClick={() => setDrawerOpen(true)}
                    className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-accent-primary transition-colors hover:text-accent-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2"
                    aria-haspopup="dialog"
                  >
                    <ChevronDown className="h-4 w-4" />
                    查看详情
                  </button>
                )}
              </div>
            )}
            {post.images.length > 0 && (
              <div className={cn('grid gap-1 mt-3 rounded-lg overflow-hidden', gridClass)}>
                {post.images.map((src, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setPreviewIndex(i)}
                    className={cn(
                      'relative block bg-muted text-left transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary',
                      imageCount === 1 ? 'h-[min(37vh,16rem)]' : 'aspect-4/3'
                    )}
                  >
                    <Image
                      src={src}
                      alt=""
                      fill
                      className="object-contain object-left"
                      sizes="(max-width: 640px) 100vw, 240px"
                      unoptimized
                    />
                  </button>
                ))}
              </div>
            )}
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3 border-border pt-3">
              <button
                type="button"
                onClick={() => onComment(post.id)}
                className="flex items-center gap-1.5 text-content-tertiary hover:text-accent-primary transition-colors"
                aria-label="评论"
              >
                <MessageCircle className="h-4 w-4" />
                <span className="text-sm">
                  {post.commentCount > 0 ? post.commentCount : '评论'}
                </span>
              </button>
              <button
                type="button"
                onClick={handleLike}
                className={cn(
                  'flex items-center gap-1.5 transition-colors',
                  liked ? 'text-accent-primary' : 'text-content-tertiary hover:text-accent-primary'
                )}
                aria-label="点赞"
              >
                <ThumbsUp className={cn('h-4 w-4', liked && 'fill-current')} />
                <span className="text-sm">{likeCount > 0 ? likeCount : '点赞'}</span>
              </button>
              <button
                type="button"
                onClick={handleDislike}
                className={cn(
                  'flex items-center gap-1.5 transition-colors',
                  disliked ? 'text-red-500' : 'text-content-tertiary hover:text-red-500'
                )}
                aria-label="不喜欢"
              >
                <ThumbsDown className={cn('h-4 w-4', disliked && 'fill-current')} />
                <span className="text-sm">不喜欢</span>
              </button>
              <button
                type="button"
                onClick={handleQuestion}
                className={cn(
                  'flex items-center gap-1.5 transition-colors',
                  questioned ? 'text-amber-500' : 'text-content-tertiary hover:text-amber-500'
                )}
                aria-label="疑问"
              >
                <HelpCircle className={cn('h-4 w-4', questioned && 'fill-current')} />
                <span className="text-sm">疑问</span>
              </button>
            </div>
          </div>
        </div>
      </article>
      <Lightbox
        open={previewIndex >= 0}
        close={() => setPreviewIndex(-1)}
        slides={slides}
        index={previewIndex >= 0 ? previewIndex : 0}
        plugins={[Zoom]}
        controller={{ closeOnBackdropClick: true }}
        styles={{
          container: {
            backgroundColor: 'rgba(10, 8, 6, 0.88)',
            backdropFilter: 'blur(10px)',
          },
        }}
      />
      <ThoughtDetailDrawer
        post={post}
        open={isLongContent && drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </>
  )
}

interface ThoughtDetailDrawerProps {
  post: ThoughtPostWithInteraction
  open: boolean
  onOpenChange: (open: boolean) => void
}

function ThoughtDetailDrawer({
  post,
  open,
  onOpenChange,
}: ThoughtDetailDrawerProps) {
  const [shouldRender, setShouldRender] = useState(open)
  const [isVisible, setIsVisible] = useState(false)
  const titleId = `thought-detail-title-${post.id}`

  useEffect(() => {
    if (open) {
      setShouldRender(true)
      let secondFrame = 0
      const firstFrame = requestAnimationFrame(() => {
        secondFrame = requestAnimationFrame(() => setIsVisible(true))
      })
      return () => {
        cancelAnimationFrame(firstFrame)
        cancelAnimationFrame(secondFrame)
      }
    }

    setIsVisible(false)
    const timeout = window.setTimeout(() => setShouldRender(false), 220)
    return () => window.clearTimeout(timeout)
  }, [open])

  if (!shouldRender || typeof document === 'undefined') return null

  const stopPropagation = (
    event: React.MouseEvent | React.PointerEvent | React.KeyboardEvent
  ) => {
    event.stopPropagation()
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onKeyDown={(event) => {
        if (event.key === 'Escape') onOpenChange(false)
      }}
    >
      <button
        type="button"
        className={cn(
          'absolute inset-0 cursor-default bg-black/35 backdrop-blur-[2px] transition-opacity duration-200 ease-out',
          isVisible ? 'opacity-100' : 'opacity-0'
        )}
        onClick={() => onOpenChange(false)}
        aria-label="关闭随笔详情"
      />
      <aside
        className={cn(
          'relative z-[121] flex h-full w-full max-w-[min(92vw,34rem)] flex-col border-l border-line-glass/50 bg-surface-primary shadow-2xl transition-transform duration-300 ease-out will-change-transform',
          isVisible ? 'translate-x-0' : 'translate-x-full'
        )}
        onClick={stopPropagation}
        onPointerDown={stopPropagation}
        onPointerMove={stopPropagation}
        onPointerUp={stopPropagation}
        onKeyDown={stopPropagation}
        onKeyUp={stopPropagation}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-line-glass/40 px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 id={titleId} className="text-base font-semibold text-content-primary">
              随笔详情
            </h2>
            <div className="mt-2 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm text-content-tertiary">
              <Image
                src={post.avatar}
                alt={post.authorName}
                width={24}
                height={24}
                className="h-6 w-6 rounded-full object-cover"
              />
              <span className="font-medium text-content-secondary">{post.authorName}</span>
              <span>{post.date}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-content-tertiary transition-colors hover:bg-surface-hover hover:text-content-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
            aria-label="关闭"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          <p className="font-blog text-[15px] leading-[1.8] tracking-[0.01em] text-content-primary whitespace-pre-wrap wrap-break-word">
            {post.content}
          </p>
        </div>
      </aside>
    </div>,
    document.body
  )
}

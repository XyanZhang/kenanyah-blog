'use client'

import { useState } from 'react'
import Image from 'next/image'
import {
  MessageCircle,
  ThumbsUp,
  ThumbsDown,
  HelpCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ThoughtPostWithInteraction } from './types'

interface ThoughtCardProps {
  post: ThoughtPostWithInteraction
  onLike: (id: string, liked: boolean) => void
  onDislike: (id: string, disliked: boolean) => void
  onQuestion: (id: string, questioned: boolean) => void
  onComment: (id: string) => void
}

export function ThoughtCard({
  post,
  onLike,
  onDislike,
  onQuestion,
  onComment,
}: ThoughtCardProps) {
  const [liked, setLiked] = useState(!!post.liked)
  const [disliked, setDisliked] = useState(!!post.disliked)
  const [questioned, setQuestioned] = useState(!!post.questioned)
  const [likeCount, setLikeCount] = useState(post.likeCount)

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
    <article className="bg-card border-border rounded-xl p-4 shadow-sm">
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
          <div className="flex items-center gap-2 text-content-secondary">
            <span className="font-medium text-content-primary">
              {post.authorName}
            </span>
            <span className="text-sm text-content-tertiary">{post.date}</span>
          </div>
          {post.content && (
            <p className="mt-1 text-content-primary text-[15px] leading-relaxed whitespace-pre-wrap wrap-break-word">
              {post.content}
            </p>
          )}
          {post.images.length > 0 && (
            <div
              className={cn(
                'grid gap-1 mt-3 rounded-lg overflow-hidden',
                gridClass
              )}
            >
              {post.images.map((src, i) => (
                <div
                  key={i}
                  className={cn(
                    'relative aspect-4/3 bg-muted',
                    imageCount === 1 ? 'max-h-64' : ''
                  )}
                >
                  <Image
                    src={src}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, 240px"
                    unoptimized
                  />
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center gap-6 mt-4 pt-3 border-border">
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
                liked
                  ? 'text-accent-primary'
                  : 'text-content-tertiary hover:text-accent-primary'
              )}
              aria-label="点赞"
            >
              <ThumbsUp
                className={cn('h-4 w-4', liked && 'fill-current')}
              />
              <span className="text-sm">
                {likeCount > 0 ? likeCount : '点赞'}
              </span>
            </button>
            <button
              type="button"
              onClick={handleDislike}
              className={cn(
                'flex items-center gap-1.5 transition-colors',
                disliked
                  ? 'text-red-500'
                  : 'text-content-tertiary hover:text-red-500'
              )}
              aria-label="不喜欢"
            >
              <ThumbsDown
                className={cn('h-4 w-4', disliked && 'fill-current')}
              />
              <span className="text-sm">不喜欢</span>
            </button>
            <button
              type="button"
              onClick={handleQuestion}
              className={cn(
                'flex items-center gap-1.5 transition-colors',
                questioned
                  ? 'text-amber-500'
                  : 'text-content-tertiary hover:text-amber-500'
              )}
              aria-label="疑问"
            >
              <HelpCircle
                className={cn('h-4 w-4', questioned && 'fill-current')}
              />
              <span className="text-sm">疑问</span>
            </button>
          </div>
        </div>
      </div>
    </article>
  )
}

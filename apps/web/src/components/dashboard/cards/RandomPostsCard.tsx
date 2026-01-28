'use client'

import Image from 'next/image'
import Link from 'next/link'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { DashboardCard, RandomPostsCardConfig } from '@blog/types'
import { Calendar, Shuffle } from 'lucide-react'

interface RandomPostsCardProps {
  card: DashboardCard
}

interface PostItem {
  id: string
  title: string
  slug: string
  excerpt: string
  coverImage: string
  publishedAt: Date
}

export function RandomPostsCard({ card }: RandomPostsCardProps) {
  const config = card.config as RandomPostsCardConfig

  const posts: PostItem[] = [
    {
      id: '1',
      title: '构建可扩展的前端架构',
      slug: 'scalable-frontend-architecture',
      excerpt: '从项目结构到状态管理，分享构建大型前端应用的实战经验和最佳实践。',
      coverImage: '/images/posts/architecture.jpg',
      publishedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    },
    {
      id: '2',
      title: 'CSS Container Queries 实战',
      slug: 'css-container-queries',
      excerpt: '了解 CSS Container Queries 如何改变响应式设计的方式，让组件真正实现自适应。',
      coverImage: '/images/posts/css.jpg',
      publishedAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
    },
    {
      id: '3',
      title: 'Node.js 性能优化指南',
      slug: 'nodejs-performance',
      excerpt: '从内存管理到异步优化，全面提升 Node.js 应用的性能表现。',
      coverImage: '/images/posts/nodejs.jpg',
      publishedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
    },
  ]

  const displayPosts = posts.slice(0, config.limit)

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-content-primary">随机推荐</h3>
        <button
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-content-muted transition-colors hover:bg-surface-hover hover:text-accent-primary"
          onClick={(e) => {
            e.preventDefault()
          }}
        >
          <Shuffle className="h-3 w-3" />
          换一批
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-auto">
        {displayPosts.map((post) => (
          <Link
            key={post.id}
            href={`/posts/${post.slug}` as any}
            className="group flex gap-3 rounded-xl border border-line-primary p-2 transition-all hover:border-line-hover hover:shadow-md"
          >
            {config.showImage && (
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-accent-tertiary-light to-accent-primary-light">
                <Image
                  src={post.coverImage}
                  alt={post.title}
                  fill
                  className="object-cover transition-transform group-hover:scale-105"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
              </div>
            )}

            <div className="flex min-w-0 flex-1 flex-col justify-between py-1">
              <div>
                <h4 className="mb-1 font-medium text-content-primary line-clamp-1 group-hover:text-accent-tertiary">
                  {post.title}
                </h4>
                {config.showExcerpt && (
                  <p className="text-xs text-content-tertiary line-clamp-2">{post.excerpt}</p>
                )}
              </div>

              {config.showDate && (
                <div className="flex items-center gap-1 text-xs text-content-muted">
                  <Calendar className="h-3 w-3" />
                  <span>{format(post.publishedAt, 'yyyy年MM月dd日', { locale: zhCN })}</span>
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

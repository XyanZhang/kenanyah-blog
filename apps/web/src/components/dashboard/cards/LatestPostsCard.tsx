'use client'

import Image from 'next/image'
import Link from 'next/link'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { DashboardCard, LatestPostsCardConfig } from '@blog/types'
import { Calendar } from 'lucide-react'

interface LatestPostsCardProps {
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

export function LatestPostsCard({ card }: LatestPostsCardProps) {
  const config = card.config as LatestPostsCardConfig

  const posts: PostItem[] = [
    {
      id: '1',
      title: 'Next.js 15 App Router 深度解析',
      slug: 'nextjs-15-app-router',
      excerpt: '探索 Next.js 15 中 App Router 的新特性和最佳实践，包括并行路由、拦截路由等高级用法。',
      coverImage: '/images/posts/nextjs.jpg',
      publishedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    },
    {
      id: '2',
      title: 'React 19 新特性一览',
      slug: 'react-19-features',
      excerpt: '深入了解 React 19 带来的革命性变化，包括 Server Components、Actions 等核心特性。',
      coverImage: '/images/posts/react.jpg',
      publishedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    },
    {
      id: '3',
      title: 'TypeScript 高级类型技巧',
      slug: 'typescript-advanced-types',
      excerpt: '掌握 TypeScript 中的条件类型、映射类型、模板字面量类型等高级特性。',
      coverImage: '/images/posts/typescript.jpg',
      publishedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    },
  ]

  const displayPosts = posts.slice(0, config.limit)

  return (
    <div className="flex h-full flex-col">
      <h3 className="mb-4 text-lg font-semibold text-content-primary">最新文章</h3>

      <div className="flex-1 space-y-3 overflow-auto">
        {displayPosts.map((post) => (
          <Link
            key={post.id}
            href={`/posts/${post.slug}` as any}
            className="group flex gap-3 rounded-xl border border-line-primary p-2 transition-all hover:border-line-hover hover:shadow-md"
          >
            {config.showImage && (
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-accent-primary-light to-accent-secondary-light">
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
                <h4 className="mb-1 font-medium text-content-primary line-clamp-1 group-hover:text-accent-primary">
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

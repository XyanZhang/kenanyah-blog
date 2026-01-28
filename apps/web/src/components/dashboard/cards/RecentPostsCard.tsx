'use client'

import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { DashboardCard, RecentPostsCardConfig } from '@blog/types'
import { Calendar } from 'lucide-react'

interface RecentPostsCardProps {
  card: DashboardCard
}

export function RecentPostsCard({ card }: RecentPostsCardProps) {
  const config = card.config as RecentPostsCardConfig

  // Mock data - replace with actual API data
  const posts = [
    {
      id: '1',
      title: 'Getting Started with Next.js 15',
      slug: 'getting-started-nextjs-15',
      excerpt: 'Learn how to build modern web applications with the latest version of Next.js.',
      publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
    {
      id: '2',
      title: 'TypeScript Best Practices',
      slug: 'typescript-best-practices',
      excerpt: 'Discover essential TypeScript patterns and practices for better code quality.',
      publishedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    },
    {
      id: '3',
      title: 'Building a Dashboard with React',
      slug: 'building-dashboard-react',
      excerpt: 'Step-by-step guide to creating an interactive dashboard component.',
      publishedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    },
    {
      id: '4',
      title: 'Understanding Zustand State Management',
      slug: 'understanding-zustand',
      excerpt: 'A comprehensive guide to using Zustand for state management in React.',
      publishedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    },
    {
      id: '5',
      title: 'Framer Motion Animation Guide',
      slug: 'framer-motion-guide',
      excerpt: 'Create beautiful animations in React with Framer Motion.',
      publishedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    },
  ]

  const displayPosts = posts.slice(0, config.limit)

  return (
    <div className="flex h-full flex-col">
      <h3 className="mb-4 text-lg font-semibold text-content-primary">Recent Posts</h3>

      <div className="flex-1 space-y-3 overflow-auto">
        {displayPosts.map((post) => (
          <Link
            key={post.id}
            href={`/posts/${post.slug}` as any}
            className="block rounded-xl border border-line-glass/50 bg-surface-glass/40 p-3 backdrop-blur-sm transition-all hover:border-line-hover hover:bg-surface-glass/60 hover:shadow-md"
          >
            <h4 className="mb-1 font-medium text-content-primary line-clamp-2">
              {post.title}
            </h4>

            {config.showExcerpt && (
              <p className="mb-2 text-sm text-content-tertiary line-clamp-2">
                {post.excerpt}
              </p>
            )}

            {config.showDate && (
              <div className="flex items-center gap-1 text-xs text-content-muted">
                <Calendar className="h-3 w-3" />
                <span>{formatDistanceToNow(post.publishedAt, { addSuffix: true })}</span>
              </div>
            )}
          </Link>
        ))}
      </div>
    </div>
  )
}

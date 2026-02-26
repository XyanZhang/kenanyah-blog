import type { Metadata } from 'next'
import { BlogTimeline, type BlogTimelineItem } from '@/components/blog/BlogTimeline'

export const metadata: Metadata = {
  title: '博客',
}

const mockPosts: BlogTimelineItem[] = [
  {
    id: '1',
    title: '文章标题 1',
    excerpt:
      '这是一篇示例文章的摘要内容，用于展示博客列表的布局效果。时间线让文章按时间顺序更清晰呈现。',
    date: '2026-02-20',
    readTimeMinutes: 5,
    coverImage: 'https://picsum.photos/seed/blog1/760/475',
  },
  {
    id: '2',
    title: '文章标题 2',
    excerpt:
      '这是一篇示例文章的摘要内容，用于展示博客列表的布局效果。',
    date: '2026-02-15',
    readTimeMinutes: 8,
    coverImage: 'https://picsum.photos/seed/blog2/760/475',
  },
  {
    id: '3',
    title: '文章标题 3',
    excerpt:
      '这是一篇示例文章的摘要内容，用于展示博客列表的布局效果。时间线组件与主题色完美融合。',
    date: '2026-02-08',
    readTimeMinutes: 12,
    coverImage: 'https://picsum.photos/seed/blog3/760/475',
  },
  {
    id: '4',
    title: '文章标题 4',
    excerpt:
      '这是一篇示例文章的摘要内容，用于展示博客列表的布局效果。',
    date: '2026-01-28',
    readTimeMinutes: 5,
    coverImage: 'https://picsum.photos/seed/blog4/760/475',
  },
  {
    id: '5',
    title: '文章标题 5',
    excerpt:
      '这是一篇示例文章的摘要内容，用于展示博客列表的布局效果。',
    date: '2026-01-20',
    readTimeMinutes: 6,
    coverImage: 'https://picsum.photos/seed/blog5/760/475',
  },
]

export default function BlogPage() {
  return (
    <main className="h-[calc(100vh-80px)] w-full flex flex-col">
      <div className="flex-1 flex flex-col min-h-0 w-full">
        <div className="flex-1 min-h-0 min-w-0">
          <BlogTimeline items={mockPosts} className="h-full" />
        </div>
      </div>
    </main>
  )
}

import type { Metadata } from 'next'
import { ThoughtsFeed } from '@/components/thoughts'

export const metadata: Metadata = {
  title: '思考',
  description: '记录想法与灵感，类似朋友圈的思考流',
}

export default function ThoughtsPage() {
  return (
    <main className="min-h-screen pl-24 pr-8 py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-semibold text-content-primary mb-6">
          思考
        </h1>
        <p className="text-content-tertiary text-sm mb-8">
          记录当下的想法、读书笔记与灵感，支持触底加载更多。
        </p>
        <ThoughtsFeed />
      </div>
    </main>
  )
}

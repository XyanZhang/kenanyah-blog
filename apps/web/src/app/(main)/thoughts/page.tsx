import type { Metadata } from 'next'
import Link from 'next/link'
import { PenLine } from 'lucide-react'
import { ThoughtsFeed } from '@/components/thoughts'
import { cn } from '@/lib/utils'

export const metadata: Metadata = {
  title: '思考',
  description: '记录想法与灵感，类似朋友圈的思考流',
}

export default function ThoughtsPage() {
  return (
    <main className="min-h-screen px-4 pb-10 sm:px-6 sm:pb-12 md:px-8 md:py-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8 rounded-[28px] border border-line-primary bg-surface-glass p-5 backdrop-blur-sm sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-2xl font-semibold text-content-primary">
              思考
            </h1>
            <Link
              href="/thoughts/new"
              className={cn(
                'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
                'bg-ui-primary text-content-inverse hover:bg-ui-primary-hover h-10 px-4 py-2 text-sm self-start sm:self-auto'
              )}
            >
              <PenLine className="h-4 w-4" />
              写一条
            </Link>
          </div>
        </div>
        <ThoughtsFeed />
      </div>
    </main>
  )
}

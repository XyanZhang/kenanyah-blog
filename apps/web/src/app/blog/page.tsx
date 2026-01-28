import type { Metadata } from 'next'
import { FileText } from 'lucide-react'

export const metadata: Metadata = {
  title: '博客',
}

export default function BlogPage() {
  return (
    <main className="min-h-screen pl-24 pr-8 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-accent-primary-light to-accent-secondary-light">
            <FileText className="h-6 w-6 text-accent-primary" />
          </div>
          <h1 className="text-3xl font-bold text-content-primary">博客</h1>
        </div>

        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <article
              key={i}
              className="rounded-2xl border border-line-primary bg-surface-glass p-6 backdrop-blur-sm transition-all hover:border-line-hover hover:shadow-lg"
            >
              <h2 className="text-xl font-semibold text-content-primary mb-2">
                文章标题 {i}
              </h2>
              <p className="text-content-tertiary mb-4">
                这是一篇示例文章的摘要内容，用于展示博客列表的布局效果。
              </p>
              <div className="flex items-center gap-4 text-sm text-content-muted">
                <span>2026-01-28</span>
                <span>·</span>
                <span>5 min read</span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  )
}

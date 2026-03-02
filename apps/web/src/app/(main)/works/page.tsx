import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '作品',
}

export default function WorksPage() {
  return (
    <main className="min-h-screen pl-24 pr-8 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-semibold text-content-primary mb-8">
          作品
        </h1>
        <p className="text-content-tertiary">
          这里将展示你的作品集合，可以按分类或时间浏览。
        </p>
      </div>
    </main>
  )
}

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '作品',
}

export default function WorksPage() {
  return (
    <main className="min-h-screen px-4 pb-10 pt-24 sm:px-6 sm:pb-12 sm:pt-28 md:pl-24 md:pr-8 md:py-8">
      <div className="max-w-4xl mx-auto">
        <section className="rounded-[28px] border border-line-primary bg-surface-glass p-5 backdrop-blur-sm sm:p-8">
          <h1 className="mb-4 text-2xl font-semibold text-content-primary sm:mb-6">作品</h1>
          <p className="text-sm leading-7 text-content-tertiary sm:text-base">
            这里将展示你的作品集合，可以按分类或时间浏览。
          </p>
        </section>
      </div>
    </main>
  )
}

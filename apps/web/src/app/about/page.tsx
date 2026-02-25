import type { Metadata } from 'next'
import { User } from 'lucide-react'

export const metadata: Metadata = {
  title: '关于',
}

export default function AboutPage() {
  return (
    <main className="min-h-screen pl-24 pr-8 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-br from-accent-primary-light to-accent-secondary-light">
            <User className="h-6 w-6 text-accent-primary" />
          </div>
          <h1 className="text-3xl font-bold text-content-primary">关于</h1>
        </div>
        <div className="rounded-2xl border border-line-primary bg-surface-glass p-8 backdrop-blur-sm">
          <div className="prose prose-gray max-w-none">
            <p className="text-lg text-content-secondary leading-relaxed">
              欢迎来到我的个人博客！这是一个使用 Next.js 15 和 React 19 构建的现代化博客应用。
            </p>
            <p className="text-content-tertiary mt-4">
              我专注于前端开发技术，喜欢探索新技术并分享学习心得。这个博客记录了我的技术成长之路。
            </p>

            <h2 className="text-xl font-semibold text-content-primary mt-8 mb-4">技术栈</h2>
            <div className="flex flex-wrap gap-2">
              {['Next.js', 'React', 'TypeScript', 'Tailwind CSS', 'Prisma'].map((tech) => (
                <span
                  key={tech}
                  className="rounded-full bg-accent-primary-light px-3 py-1 text-sm text-accent-primary-dark"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

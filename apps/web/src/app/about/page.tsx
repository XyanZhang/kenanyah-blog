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
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-100 to-blue-100">
            <User className="h-6 w-6 text-purple-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">关于</h1>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white/80 p-8 backdrop-blur-sm">
          <div className="prose prose-gray max-w-none">
            <p className="text-lg text-gray-700 leading-relaxed">
              欢迎来到我的个人博客！这是一个使用 Next.js 15 和 React 19 构建的现代化博客应用。
            </p>
            <p className="text-gray-600 mt-4">
              我专注于前端开发技术，喜欢探索新技术并分享学习心得。这个博客记录了我的技术成长之路。
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">技术栈</h2>
            <div className="flex flex-wrap gap-2">
              {['Next.js', 'React', 'TypeScript', 'Tailwind CSS', 'Prisma'].map((tech) => (
                <span
                  key={tech}
                  className="rounded-full bg-purple-100 px-3 py-1 text-sm text-purple-700"
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

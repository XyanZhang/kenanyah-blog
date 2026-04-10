import type { Metadata, Route } from 'next'
import Link from 'next/link'
import { ExternalLink } from 'lucide-react'

export const metadata: Metadata = {
  title: '项目',
}

const projects: Array<{
  name: string
  description: string
  tags: string[]
  href: Route
}> = [
  {
    name: '图片格式转换',
    description: '上传图片后，在浏览器里完成 PNG / JPEG / WebP 格式转换，并支持裁剪与圆角处理。',
    tags: ['Image', 'Canvas', 'Crop'],
    href: '/projects/image-converter',
  },
  {
    name: 'PDF 解读',
    description: '上传 PDF，解析与向量化构建阅读 Agent，并生成可下载的 Markdown 文档。',
    tags: ['PDF', 'RAG', 'pgvector'],
    href: '/pdf-agent',
  },
]

export default function ProjectsPage() {
  return (
    <main className="min-h-screen pl-24 pr-8 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 rounded-2xl border border-line-primary bg-surface-glass p-6 backdrop-blur-sm">
          <h1 className="text-2xl font-semibold text-content-primary">项目</h1>
          <p className="mt-2 text-sm leading-6 text-content-secondary">
            这里收集站内的实验性小工具与工作流页面，点击卡片即可进入具体功能。
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {projects.map((project) => (
            <Link
              key={project.name}
              href={project.href}
              className="group rounded-2xl border border-line-primary bg-surface-glass p-6 backdrop-blur-sm transition-all hover:border-line-hover hover:shadow-lg focus:outline-hidden focus:ring-2 focus:ring-accent-primary/50"
            >
              <div className="flex items-start justify-between mb-3">
                <h2 className="text-xl font-semibold text-content-primary">
                  {project.name}
                </h2>
                <ExternalLink className="h-5 w-5 text-content-dim group-hover:text-accent-primary transition-colors" />
              </div>
              <p className="text-content-tertiary mb-4">{project.description}</p>
              <div className="flex flex-wrap gap-2">
                {project.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-surface-tertiary px-2.5 py-0.5 text-xs text-content-tertiary"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  )
}

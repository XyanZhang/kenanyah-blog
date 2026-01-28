import type { Metadata } from 'next'
import { FolderOpen, ExternalLink } from 'lucide-react'

export const metadata: Metadata = {
  title: '项目',
}

const projects = [
  {
    name: 'Blog System',
    description: '基于 Next.js 15 的现代化博客系统',
    tags: ['Next.js', 'React', 'TypeScript'],
  },
  {
    name: 'CLI Tool',
    description: '高效的命令行工具集',
    tags: ['Node.js', 'TypeScript'],
  },
  {
    name: 'Component Library',
    description: 'React UI 组件库',
    tags: ['React', 'Storybook', 'CSS'],
  },
  {
    name: 'API Gateway',
    description: '微服务 API 网关',
    tags: ['Hono', 'TypeScript', 'Docker'],
  },
]

export default function ProjectsPage() {
  return (
    <main className="min-h-screen pl-24 pr-8 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-accent-primary-light to-accent-secondary-light">
            <FolderOpen className="h-6 w-6 text-accent-primary" />
          </div>
          <h1 className="text-3xl font-bold text-content-primary">项目</h1>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {projects.map((project) => (
            <article
              key={project.name}
              className="group rounded-2xl border border-line-primary bg-surface-glass p-6 backdrop-blur-sm transition-all hover:border-line-hover hover:shadow-lg"
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
            </article>
          ))}
        </div>
      </div>
    </main>
  )
}

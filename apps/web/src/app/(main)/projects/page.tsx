import type { Metadata, Route } from 'next'
import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import type { ProjectEntryDto } from '@blog/types'
import { getApiFetchUrl } from '@/lib/api-client'

export const metadata: Metadata = {
  title: '项目',
}

export const revalidate = 60

const projects: Array<{
  name: string
  description: string
  tags: string[]
  href: Route
  note: string
  category: string
  year: string
  coverPalette: string
  coverTexture: string
  textTone: string
  size: 'portrait' | 'landscape'
}> = [
  {
    name: '图片格式转换',
    description:
      '在浏览器中完成 PNG / JPEG / WebP 格式转换，支持裁剪、圆角和导出前预览。',
    tags: ['Image', 'Canvas', 'Crop'],
    href: '/projects/image-converter',
    note: '偏轻量、直接，适合快速处理图片。',
    category: 'Utility',
    year: '2026',
    coverPalette: 'from-[#efe3d2] via-[#d6d7d1] to-[#8caec7]',
    coverTexture:
      'bg-[radial-gradient(circle_at_22%_18%,rgba(255,255,255,0.86),transparent_24%),radial-gradient(circle_at_74%_72%,rgba(112,154,183,0.36),transparent_20%),linear-gradient(145deg,rgba(255,255,255,0.16),rgba(33,71,106,0.12))]',
    textTone: 'text-[#1f2933]',
    size: 'portrait',
  },
  {
    name: 'PDF 解读',
    description:
      '上传 PDF 后进行解析、向量化和问答，最后生成可继续整理的 Markdown 结果。',
    tags: ['PDF', 'RAG', 'pgvector'],
    href: '/pdf-agent',
    note: '偏阅读与理解，适合长文档处理场景。',
    category: 'Reading Workflow',
    year: '2026',
    coverPalette: 'from-[#25283b] via-[#59607a] to-[#d2b7a7]',
    coverTexture:
      'bg-[radial-gradient(circle_at_68%_22%,rgba(255,255,255,0.22),transparent_18%),radial-gradient(circle_at_30%_80%,rgba(255,218,188,0.2),transparent_20%),linear-gradient(140deg,rgba(16,18,28,0.14),rgba(255,255,255,0.04))]',
    textTone: 'text-white',
    size: 'landscape',
  },
]

const archiveNotes = [
  '每个项目都作为独立页面维护，适合继续扩展。',
  '版式统一由数据驱动，新增项目时不需要重排主次结构。',
  '封面更接近画册而不是功能卡片，便于后续继续增加视觉层次。',
]

function coverShape(index: number) {
  const shapes = [
    <>
      <div className="absolute left-6 top-6 h-24 w-[4.5rem] rounded-[1.75rem] border border-black/10 bg-white/38 backdrop-blur-md" />
      <div className="absolute right-7 top-12 h-28 w-28 rounded-full border border-white/28 bg-white/18 blur-[1px]" />
      <div className="absolute bottom-8 left-14 h-12 w-32 rounded-full border border-black/8 bg-white/24" />
    </>,
    <>
      <div className="absolute left-8 top-8 h-32 w-24 rounded-[2rem] border border-white/18 bg-white/10 backdrop-blur-sm" />
      <div className="absolute bottom-8 right-8 h-20 w-20 rounded-[1.5rem] border border-white/20 bg-black/10" />
      <div className="absolute right-16 top-16 h-10 w-28 rounded-full border border-white/20 bg-white/10" />
    </>,
    <>
      <div className="absolute left-8 top-10 h-20 w-20 rounded-full border border-white/24 bg-white/12" />
      <div className="absolute bottom-10 left-20 h-28 w-[5.5rem] rounded-[1.8rem] border border-black/10 bg-white/30 backdrop-blur-md" />
      <div className="absolute right-8 bottom-8 h-14 w-36 rounded-full border border-white/18 bg-black/8" />
    </>,
  ]

  return shapes[index % shapes.length]
}

type ProjectsApiResponse = {
  success?: boolean
  data?: ProjectEntryDto[]
}

async function loadDatabaseProjects(): Promise<ProjectEntryDto[]> {
  try {
    const res = await fetch(getApiFetchUrl('/projects'), { next: { revalidate: 60 } })
    if (!res.ok) return []
    const json = (await res.json()) as ProjectsApiResponse
    if (!json.success || !Array.isArray(json.data)) return []
    return json.data
  } catch {
    return []
  }
}

export default async function ProjectsPage() {
  const databaseProjects = await loadDatabaseProjects()

  return (
    <main className="min-h-screen px-4 pb-16 pt-6 sm:px-6 lg:pl-24 lg:pr-8 lg:pt-8">
      <div className="mx-auto max-w-7xl">
        <section className="grid gap-8 border-b border-black/8 pb-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-end">
          <div className="max-w-3xl">
            <p className="text-[11px] uppercase tracking-[0.34em] text-content-muted">Works Index</p>
            <h1 className="mt-4 font-serif text-4xl font-medium tracking-[-0.04em] text-content-primary sm:text-5xl">
              作品
            </h1>
            <p className="mt-5 max-w-3xl text-sm leading-7 text-content-secondary sm:text-[15px]">
              这些页面像是一些慢慢积累下来的片段。它们各自处理不同的问题，也保留了各自该有的节奏和表情。
            </p>
          </div>

          <div className="rounded-[2rem] border border-black/8 bg-white/68 p-5 backdrop-blur-sm">
            <div className="flex items-end justify-between gap-4 border-b border-black/8 pb-4">
              <div>
                <div className="text-[11px] uppercase tracking-[0.28em] text-content-muted">Archive Size</div>
                <div className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-content-primary">
                  {String(projects.length).padStart(2, '0')}
                </div>
              </div>
              <div className="text-right text-xs leading-6 text-content-muted">
                按目录扩展
                <br />
                不依赖固定主卡
              </div>
            </div>
            <div className="mt-4 space-y-3 text-sm leading-7 text-content-secondary">
              {archiveNotes.map((note) => (
                <p key={note}>{note}</p>
              ))}
            </div>
          </div>
        </section>

        {databaseProjects.length > 0 && (
          <section className="mt-8 rounded-[2rem] border border-black/8 bg-white/68 p-5 backdrop-blur-sm">
            <div className="flex flex-col gap-2 border-b border-black/8 pb-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.34em] text-content-muted">Database Feed</p>
                <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-content-primary">
                  当下正在推进
                </h2>
              </div>
              <p className="max-w-xl text-sm leading-7 text-content-secondary">
                这部分来自数据库，会和日历事件流联动，适合承接 AI 快速创建和日常补记。
              </p>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {databaseProjects.map((project) => (
                <article
                  key={project.id}
                  className="rounded-[1.4rem] border border-black/8 bg-white/78 p-4 shadow-[0_16px_40px_rgba(15,23,42,0.05)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.26em] text-content-muted">
                        {project.status}
                      </div>
                      <h3 className="mt-3 text-xl font-semibold tracking-[-0.04em] text-content-primary">
                        {project.title}
                      </h3>
                    </div>
                    {project.href && (
                      <a
                        href={project.href}
                        className="inline-flex rounded-full border border-black/8 p-2 text-content-secondary transition-colors hover:bg-black/[0.04] hover:text-content-primary"
                      >
                        <ArrowUpRight className="h-4 w-4" />
                      </a>
                    )}
                  </div>

                  {project.description && (
                    <p className="mt-4 text-sm leading-7 text-content-secondary">{project.description}</p>
                  )}

                  <div className="mt-5 flex flex-wrap gap-2">
                    {project.category && (
                      <span className="rounded-full bg-black/[0.04] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-content-secondary">
                        {project.category}
                      </span>
                    )}
                    {project.tags.map((tag) => (
                      <span
                        key={`${project.id}-${tag}`}
                        className="rounded-full bg-black/[0.04] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-content-secondary"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        <section className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((project, index) => {
            const isPortrait = project.size === 'portrait'

            return (
              <Link
                key={project.name}
                href={project.href}
                className="group block cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-accent-primary/40"
              >
                <article className="h-full overflow-hidden rounded-[2rem] bg-white/62 p-3 shadow-[0_16px_38px_rgba(15,23,42,0.05)] backdrop-blur-sm transition-[box-shadow,background-color] duration-500 ease-out group-hover:bg-white/72 group-hover:shadow-[0_24px_52px_rgba(15,23,42,0.08)]">
                  <div
                    className={`relative overflow-hidden rounded-[1.6rem] bg-gradient-to-br transition-transform duration-500 ease-out group-hover:scale-[1.015] ${project.coverPalette} ${
                      isPortrait ? 'min-h-[30rem]' : 'min-h-[22rem]'
                    }`}
                  >
                    <div className={`absolute inset-0 transition-transform duration-700 ease-out group-hover:scale-[1.04] ${project.coverTexture}`} />
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0.08))] opacity-70 transition-opacity duration-500 group-hover:opacity-100" />
                    {coverShape(index)}

                    <div
                      className={`relative flex h-full flex-col justify-between p-6 ${
                        isPortrait ? 'min-h-[30rem]' : 'min-h-[22rem]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="rounded-full bg-white/42 px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-content-secondary transition-colors duration-500 group-hover:bg-white/56">
                          {project.category}
                        </div>
                        <div className={`rounded-full bg-white/30 p-3 ${project.textTone} transition-[transform,background-color] duration-500 ease-out group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:bg-white/42`}>
                          <ArrowUpRight className="h-4 w-4" />
                        </div>
                      </div>

                      <div className={project.textTone}>
                        <div className="text-[11px] uppercase tracking-[0.26em] opacity-65">
                          {project.year}
                        </div>
                        <h2 className="mt-4 max-w-[14rem] font-serif text-3xl font-medium tracking-[-0.05em] sm:text-[2rem]">
                          {project.name}
                        </h2>
                        <p className="mt-4 max-w-[20rem] text-sm leading-7 opacity-80">
                          {project.description}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 px-2 pb-2 pt-5">
                    <div className="flex flex-wrap gap-2">
                      {project.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-black/[0.03] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-content-secondary transition-colors duration-500 group-hover:bg-black/[0.05]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <p className="text-sm leading-7 text-content-secondary">{project.note}</p>
                  </div>
                </article>
              </Link>
            )
          })}
        </section>
      </div>
    </main>
  )
}

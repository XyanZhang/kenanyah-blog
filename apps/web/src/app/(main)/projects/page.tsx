import type { Metadata, Route } from 'next'
import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'

export const metadata: Metadata = {
  title: '项目',
}

const websiteProjects: Array<{
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
    name: 'Personal Blog',
    description:
      '一个用于写作、整理想法和展示生活内容的个人网站，包含文章、摄影、搜索和日历式记录。',
    tags: ['Next.js', 'React', 'Content'],
    href: '/about',
    note: '更像一个持续生长的个人空间，而不是一次性上线的展示页。',
    category: 'Website',
    year: '2026',
    coverPalette: 'from-[#f2e4d8] via-[#d8d9d5] to-[#91b0bf]',
    coverTexture:
      'bg-[radial-gradient(circle_at_18%_22%,rgba(255,255,255,0.88),transparent_22%),radial-gradient(circle_at_76%_70%,rgba(116,154,176,0.32),transparent_22%),linear-gradient(150deg,rgba(255,255,255,0.14),rgba(38,70,93,0.14))]',
    textTone: 'text-[#22313c]',
    size: 'portrait',
  },
  {
    name: 'Writing & Archive',
    description:
      '围绕博客、thoughts、bookmarks 和搜索建立的内容型网站结构，让记录和检索放在同一个系统里。',
    tags: ['Archive', 'Search', 'CMS'],
    href: '/blog',
    note: '重点不是单篇页面，而是长期积累后的可阅读性和可查找性。',
    category: 'Publishing',
    year: '2026',
    coverPalette: 'from-[#2d3144] via-[#59637b] to-[#d3b29f]',
    coverTexture:
      'bg-[radial-gradient(circle_at_66%_24%,rgba(255,255,255,0.2),transparent_18%),radial-gradient(circle_at_28%_78%,rgba(255,222,199,0.22),transparent_24%),linear-gradient(140deg,rgba(17,20,31,0.18),rgba(255,255,255,0.04))]',
    textTone: 'text-white',
    size: 'landscape',
  },
  {
    name: 'Visual Dashboard',
    description:
      '可视化首页与导航系统，让网站既像博客，也像一个带有个人节奏的数字桌面。',
    tags: ['Dashboard', 'Motion', 'UI System'],
    href: '/',
    note: '它负责网站第一眼的气质，也把不同内容页串成一个整体。',
    category: 'Experience',
    year: '2026',
    coverPalette: 'from-[#d8cab9] via-[#d5d6cf] to-[#6f8791]',
    coverTexture:
      'bg-[radial-gradient(circle_at_22%_20%,rgba(255,255,255,0.7),transparent_20%),radial-gradient(circle_at_74%_76%,rgba(88,118,127,0.28),transparent_24%),linear-gradient(145deg,rgba(255,255,255,0.18),rgba(24,46,55,0.1))]',
    textTone: 'text-[#22313c]',
    size: 'portrait',
  },
]

const projectNotes = [
  '这里放的是网站型项目，重点是信息结构、内容体验和整体气质。',
  '工具型页面会单独归档到 Tools，避免项目展示和功能入口混在一起。',
  '后续新增网站时，只需要补充数据，不需要改页面骨架。',
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

export default function ProjectsPage() {
  return (
    <main className="min-h-screen px-4 pb-16 pt-6 sm:px-6 lg:pl-24 lg:pr-8 lg:pt-8">
      <div className="mx-auto max-w-7xl">
        <section className="grid gap-8 border-b border-black/8 pb-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-end">
          <div className="max-w-3xl">
            <p className="text-[11px] uppercase tracking-[0.34em] text-content-muted">Website Showcase</p>
            <h1 className="mt-4 font-serif text-4xl font-medium tracking-[-0.04em] text-content-primary sm:text-5xl">
              项目
            </h1>
            <p className="mt-5 max-w-3xl text-sm leading-7 text-content-secondary sm:text-[15px]">
              这里现在专门用来展示网站项目。它们更关注内容、结构和体验，而不是单一的小功能。
            </p>
          </div>

          <div className="rounded-[2rem] border border-black/8 bg-white/68 p-5 backdrop-blur-sm">
            <div className="flex items-end justify-between gap-4 border-b border-black/8 pb-4">
              <div>
                <div className="text-[11px] uppercase tracking-[0.28em] text-content-muted">Website Count</div>
                <div className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-content-primary">
                  {String(websiteProjects.length).padStart(2, '0')}
                </div>
              </div>
              <div className="text-right text-xs leading-6 text-content-muted">
                网站项目单独展示
                <br />
                工具页面已拆分
              </div>
            </div>
            <div className="mt-4 space-y-3 text-sm leading-7 text-content-secondary">
              {projectNotes.map((note) => (
                <p key={note}>{note}</p>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {websiteProjects.map((project, index) => {
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
                        <div
                          className={`rounded-full bg-white/30 p-3 ${project.textTone} transition-[transform,background-color] duration-500 ease-out group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:bg-white/42`}
                        >
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

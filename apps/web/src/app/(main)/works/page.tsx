import type { Metadata, Route } from 'next'
import Link from 'next/link'
import { ArrowUpRight, GalleryHorizontal, Layers3 } from 'lucide-react'

export const metadata: Metadata = {
  title: '作品',
}

const works: Array<{
  name: string
  descriptionZh: string
  descriptionEn: string
  href: Route
  tags: string[]
  noteZh: string
  noteEn: string
  mode: string
}> = [
  {
    name: '3D 图片画廊',
    descriptionZh: '用 3D 空间展示图片，支持环绕查看、单图预览和沉浸式浏览。',
    descriptionEn: 'Show images in a 3D space with orbit viewing, single-image preview, and immersive browsing.',
    href: '/works/pictures-3d',
    tags: ['Three.js', '3D Viewer', 'Gallery'],
    noteZh: '适合展示图片型作品，而不是普通列表。',
    noteEn: 'Best for image-based work instead of a normal list page.',
    mode: 'Interactive Showcase',
  },
]

export default function WorksPage() {
  return (
    <main className="min-h-screen px-4 pb-16 sm:px-6 lg:pr-8">
      <div className="mx-auto max-w-5xl">
        <section className="grid gap-6 border-b border-black/6 pb-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-end">
          <div className="max-w-3xl">
            <p className="text-[11px] uppercase tracking-[0.3em] text-content-muted">Works</p>
            <h1 className="mt-4 text-[2.5rem] font-semibold tracking-[-0.06em] text-content-primary sm:text-5xl">
              作品展示
            </h1>
            <p className="mt-4 max-w-full text-[15px] leading-7 text-content-secondary">
              这里放的是更偏展示型的作品页面。重点不是功能操作，而是把已经完成的可视化结果单独整理出来。
              <br />
              This page collects work pages that are more about presentation than tools or daily functions.
            </p>
          </div>

          <div className="rounded-[1.8rem] border border-black/8 bg-white/68 p-5 backdrop-blur-sm sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[11px] uppercase tracking-[0.26em] text-content-muted">Entries</div>
                <div className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-content-primary">
                  {String(works.length).padStart(2, '0')}
                </div>
              </div>
              <div className="rounded-full bg-black/[0.04] p-3 text-content-secondary">
                <Layers3 className="h-4 w-4" />
              </div>
            </div>

            <div className="mt-4 border-t border-black/6 pt-4 text-sm leading-7 text-content-secondary">
              当前这里主要放视觉型作品入口，避免和 Tools、Projects 混在一起。
              <br />
              This page is mainly for visual showcase entries, so it stays separate from Tools and Projects.
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-5">
          {works.map((work) => (
            <Link
              key={work.name}
              href={work.href}
              className="group block cursor-pointer outline-none"
            >
              <article className="rounded-[2rem] border border-white/70 bg-white/66 p-5 shadow-[0_20px_45px_rgba(15,23,42,0.06)] backdrop-blur-[18px] transition-[transform,box-shadow,background-color] duration-300 ease-out group-hover:-translate-y-0.5 group-hover:bg-white/76 group-hover:shadow-[0_28px_60px_rgba(15,23,42,0.08)] sm:p-7">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-start gap-4">
                    <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-[1.2rem] bg-accent-primary-light text-accent-primary-dark">
                      <GalleryHorizontal className="h-5 w-5" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-col items-start gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                        <h2 className="text-[1.35rem] font-semibold tracking-[-0.05em] text-content-primary">
                          {work.name}
                        </h2>
                        <span className="rounded-full bg-black/[0.04] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-content-secondary">
                          {work.mode}
                        </span>
                      </div>

                      <p className="mt-3 max-w-[58ch] text-sm leading-7 text-content-secondary">
                        {work.descriptionZh}
                        <br />
                        {work.descriptionEn}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-full bg-black/[0.04] p-3 text-content-secondary transition-[transform,background-color,color] duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:bg-black/[0.06] group-hover:text-content-primary">
                    <ArrowUpRight className="h-4 w-4" />
                  </div>
                </div>

                <div className="mt-6 flex flex-col gap-4 border-t border-black/6 pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap gap-2">
                    {work.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-black/[0.035] px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-content-secondary"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  <p className="max-w-[24rem] text-sm leading-6 text-content-muted sm:text-right">
                    {work.noteZh}
                    <br />
                    {work.noteEn}
                  </p>
                </div>
              </article>
            </Link>
          ))}
        </section>
      </div>
    </main>
  )
}

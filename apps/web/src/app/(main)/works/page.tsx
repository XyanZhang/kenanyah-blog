import type { Metadata } from 'next'
import { Layers3 } from 'lucide-react'
import { WorksCards, type WorkEntry } from './WorksCards'

export const metadata: Metadata = {
  title: '作品',
}

const works: WorkEntry[] = [
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

        <WorksCards works={works} />
      </div>
    </main>
  )
}

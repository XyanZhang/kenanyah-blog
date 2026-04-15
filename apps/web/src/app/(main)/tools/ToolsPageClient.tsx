'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowUpRight, FileText, Image as ImageIcon } from 'lucide-react'

const tools: Array<{
  name: string
  description: string
  href: Route
  tags: string[]
  note: string
  icon: React.ReactNode
  mode: string
}> = [
  {
    name: 'PDF Agent',
    description: '上传 PDF，完成解析、向量化和问答，并导出整理后的 Markdown。',
    href: '/pdf-agent',
    tags: ['PDF', 'RAG', 'Markdown'],
    note: '适合长文档阅读、整理和提炼。',
    icon: <FileText className="h-5 w-5" />,
    mode: 'Document Parsing',
  },
  {
    name: 'Image Converter',
    description: '在浏览器中完成图片格式转换、裁剪、圆角处理和导出预览。',
    href: '/projects/image-converter',
    tags: ['Image', 'Canvas', 'Crop'],
    note: '适合快速处理常见图片任务。',
    icon: <ImageIcon className="h-5 w-5" />,
    mode: 'Image Pipeline',
  },
]

export function ToolsPageClient() {
  return (
    <main className="min-h-screen px-4 pb-20 pt-24 sm:px-6 sm:pt-28 lg:pl-24 lg:pr-8 lg:pt-10">
      <div className="mx-auto max-w-5xl">
        <section className="border-b border-black/6 pb-8">
          <div className="max-w-3xl">
            <p className="text-[11px] uppercase tracking-[0.3em] text-content-muted">Tools</p>
            <h1 className="mt-4 text-[2.5rem] font-semibold tracking-[-0.06em] text-content-primary sm:text-5xl">
              在线处理工具
            </h1>
            <p className="mt-4 max-w-full text-[15px] leading-7 text-content-secondary">
              这里放的是我常用的小工具。页面尽量保持简单，重点放在功能本身，让人一眼就能知道每个工具是做什么的。
            </p>
          </div>
        </section>

        <section className="mt-8 grid gap-5 sm:grid-cols-2">
          {tools.map((tool, index) => {
            const isPrimary = index % 2 === 0

            return (
              <Link
                key={tool.name}
                href={tool.href}
                className="group block cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-accent-primary/35"
              >
                <motion.article
                  initial={{ opacity: 0, scale: 0.9, y: 18 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{
                    duration: 0.55,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="rounded-[2rem] border border-white/70 bg-white/66 p-5 shadow-[0_20px_45px_rgba(15,23,42,0.06)] backdrop-blur-[18px] transition-[transform,box-shadow,background-color] duration-300 ease-out group-hover:-translate-y-0.5 group-hover:bg-white/76 group-hover:shadow-[0_28px_60px_rgba(15,23,42,0.08)] sm:p-7"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-start gap-4">
                      <div
                        className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-[1.2rem] ${
                          isPrimary
                            ? 'bg-accent-primary-light text-accent-primary-dark'
                            : 'bg-accent-secondary-light text-accent-secondary'
                        }`}
                      >
                        {tool.icon}
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-col items-start gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                          <h2 className="text-[1.35rem] font-semibold tracking-[-0.05em] text-content-primary">
                            {tool.name}
                          </h2>
                          <span className="rounded-full bg-black/[0.04] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-content-secondary">
                            {tool.mode}
                          </span>
                        </div>

                        <p className="mt-3 max-w-[56ch] text-sm leading-7 text-content-secondary">
                          {tool.description}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-full bg-black/[0.04] p-3 text-content-secondary transition-[transform,background-color,color] duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:bg-black/[0.06] group-hover:text-content-primary">
                      <ArrowUpRight className="h-4 w-4" />
                    </div>
                  </div>

                  <div className="mt-6 flex flex-col gap-4 border-t border-black/6 pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap gap-2">
                      {tool.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-black/[0.035] px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-content-secondary"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    <p className="max-w-[22rem] text-sm leading-6 text-content-muted sm:text-right">
                      {tool.note}
                    </p>
                  </div>
                </motion.article>
              </Link>
            )
          })}
        </section>
      </div>
    </main>
  )
}

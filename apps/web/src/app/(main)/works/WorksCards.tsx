'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowUpRight, GalleryHorizontal } from 'lucide-react'

export interface WorkEntry {
  name: string
  descriptionZh: string
  descriptionEn: string
  href: Route
  tags: string[]
  noteZh: string
  noteEn: string
  mode: string
}

interface WorksCardsProps {
  works: WorkEntry[]
}

export function WorksCards({ works }: WorksCardsProps) {
  return (
    <section className="mt-8 grid gap-5">
      {works.map((work) => (
        <Link
          key={work.name}
          href={work.href}
          className="group block cursor-pointer rounded-[2rem] outline-none focus:ring-2 focus:ring-accent-primary/35"
        >
          <motion.article
            initial={{ opacity: 0, scale: 0.9, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            whileHover={{
              y: -8,
              scale: 1.01,
              transition: {
                duration: 0.42,
                ease: [0.16, 1, 0.3, 1],
              },
            }}
            whileTap={{
              y: -2,
              scale: 0.995,
              transition: {
                duration: 0.16,
                ease: [0.25, 0.1, 0.25, 1],
              },
            }}
            transition={{
              duration: 0.55,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-white/66 p-5 shadow-[0_20px_45px_rgba(15,23,42,0.06)] backdrop-blur-[18px] transition-[border-color,box-shadow,background-color] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:border-accent-primary/25 group-hover:bg-white/82 group-hover:shadow-[0_30px_70px_rgba(15,23,42,0.11)] sm:p-7"
          >
            <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-accent-primary/0 transition-colors duration-300 group-hover:bg-accent-primary/35" />
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-start gap-4">
                <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-[1.2rem] bg-accent-primary-light text-accent-primary-dark transition-[transform,box-shadow] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:-rotate-2 group-hover:scale-[1.04] group-hover:shadow-[0_12px_26px_rgba(15,23,42,0.10)]">
                  <GalleryHorizontal className="h-5 w-5" />
                </div>

                <div className="min-w-0">
                  <div className="flex flex-col items-start gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                    <h2 className="text-[1.35rem] font-semibold tracking-[-0.05em] text-content-primary">
                      {work.name}
                    </h2>
                    <span className="rounded-full bg-black/[0.04] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-content-secondary transition-colors duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:bg-accent-primary/10 group-hover:text-accent-primary-dark">
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

              <div className="rounded-full bg-black/[0.04] p-3 text-content-secondary transition-[transform,background-color,color] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:bg-accent-primary/10 group-hover:text-accent-primary-dark">
                <ArrowUpRight className="h-4 w-4" />
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-4 border-t border-black/6 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-2">
                {work.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-black/[0.035] px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-content-secondary transition-[background-color,color,transform] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:-translate-y-px group-hover:bg-black/[0.055] group-hover:text-content-primary"
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
          </motion.article>
        </Link>
      ))}
    </section>
  )
}

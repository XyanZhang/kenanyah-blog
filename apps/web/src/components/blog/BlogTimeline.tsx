'use client'

import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import Link from 'next/link'
import type { ReactNode } from 'react'

export interface BlogTimelineItem {
  id: string
  title: string
  excerpt: string
  date: string
  readTimeMinutes?: number
  slug?: string
  /** 封面图 URL，可选 */
  coverImage?: string | null
}

interface BlogTimelineProps {
  items: BlogTimelineItem[]
  className?: string
  renderItem?: (item: BlogTimelineItem, index: number) => ReactNode
}

/** 日期 YYYY-MM-DD -> MM/DD */
function formatShortDate(iso: string): string {
  return iso.slice(5, 10).replace('-', '/')
}

function DefaultTimelineRow({ item }: { item: BlogTimelineItem }) {
  const meta = (
    <>
      <span className="text-content-muted text-sm tabular-nums shrink-0 w-14">
        {formatShortDate(item.date)}
      </span>
      {item.readTimeMinutes != null && (
        <span className="text-content-tertiary text-sm">
          · {item.readTimeMinutes} 分钟阅读
        </span>
      )}
    </>
  )
  const title = (
    <span className="font-medium text-content-primary group-hover:text-accent-primary transition-colors duration-200 relative inline-block">
      {item.title}
      {/* 悬停时的主题色下划线 */}
      <span
        className="absolute left-0 bottom-0 h-0.5 bg-accent-primary origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-200"
        style={{ width: '100%' }}
        aria-hidden
      />
    </span>
  )

  const href = (item.slug ? `/posts/${item.slug}` : `/posts/${item.id}`) as import('next').Route
  if (item.slug || item.id) {
    return (
      <Link
        href={href}
        className="group flex items-center gap-4 min-w-0"
      >
        {meta}
        {title}
      </Link>
    )
  }
  return (
    <div className="flex items-center gap-4 min-w-0 text-content-primary">
      {meta}
      {title}
    </div>
  )
}

/** 竖线 + 节点统一左对齐：用固定宽度列画线，节点在列内居中于线 */
const LINE_WIDTH_PX = 10
const LINE_CENTER_PX = 1

/** 按年份分组，返回 [year, items][]，按年份倒序 */
function groupByYear(items: BlogTimelineItem[]): [string, BlogTimelineItem[]][] {
  const map = new Map<string, BlogTimelineItem[]>()
  for (const item of items) {
    const year = item.date.slice(0, 4)
    const list = map.get(year) ?? []
    list.push(item)
    map.set(year, list)
  }
  return Array.from(map.entries()).sort(([a], [b]) => Number(b) - Number(a))
}

export function BlogTimeline({
  items,
  className,
  renderItem,
}: BlogTimelineProps) {
  const yearGroups = groupByYear(items)
  let globalIndex = 0

  return (
    <div className={cn('relative', className)}>
      <div className="max-w-2xl mx-auto">
        <div>
          {yearGroups.map(([year, groupItems]) => (
            <div key={year} className="mb-4 last:mb-0 relative">
              {/* 竖线：从年份行下方开始，不与年份文字重叠 */}
              <div
                className="absolute bg-line-primary/60"
                  style={{
                  left: LINE_CENTER_PX - 1,
                  width: 2,
                  top: '2.125rem',
                  bottom: 0,
                }}
                aria-hidden
              />
              {/* 年份：和时间线对齐，居中于线所在列，背景遮盖避免与线重叠 */}
              <div
                className="grid items-center min-h-8 mb-0.5"
                style={{ gridTemplateColumns: `${LINE_WIDTH_PX}px 1fr` }}
              >
                <div
                  className="flex items-center justify-center"
                  style={{ width: LINE_WIDTH_PX }}
                >
                  <span className="text-sm font-semibold text-accent-primary tabular-nums">
                    {year}
                  </span>
                </div>
                <div />
              </div>
              {/* 该年下的文章 */}
              {groupItems.map((entry) => {
                const idx = globalIndex++
                return (
                  <motion.div
                    key={entry.id}
                    className="grid items-center min-h-8"
                    style={{ gridTemplateColumns: `${LINE_WIDTH_PX}px 1fr` }}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.3,
                      delay: idx * 0.03,
                      ease: [0.25, 0.46, 0.45, 0.94],
                    }}
                  >
                    {/* 节点列：与文本共享同一行高度，节点用 50% 垂直居中 */}
                    <div className="relative h-full">
                      <div
                        className="absolute rounded-full border-2 border-accent-primary/60 bg-bg-base shadow-sm flex items-center justify-center"
                        style={{
                          left: LINE_CENTER_PX,
                          top: '50%',
                          transform: 'translate(-50%, -50%)',
                          width: 16,
                          height: 16,
                        }}
                        aria-hidden
                      >
                        <span
                          className="rounded-full bg-accent-primary/80"
                          style={{ width: 6, height: 6 }}
                        />
                      </div>
                    </div>

                    {/* 文案列 */}
                    <div className="pl-5 py-1.5 min-w-0">
                      {renderItem
                        ? renderItem(entry, idx)
                        : <DefaultTimelineRow item={entry} />}
                    </div>
                  </motion.div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

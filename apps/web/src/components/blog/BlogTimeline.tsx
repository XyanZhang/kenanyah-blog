'use client'

import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import Image from 'next/image'
import {
  useRef,
  type ReactNode,
  useEffect,
  useState,
} from 'react'

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

/** 卡通圆弧风格：横向轨道用 SVG 圆角线，略带弧度 */
function CartoonTrack({ width, height }: { width: number; height: number }) {
  const pad = 24
  const y = height / 2
  // 轻微向下弯的弧线（二次贝塞尔）
  const cpY = y + 8
  const pathD = `M ${pad} ${y} Q ${width / 2} ${cpY} ${width - pad} ${y}`
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      preserveAspectRatio="none"
      viewBox={`0 0 ${width} ${height}`}
    >
      <defs>
        <linearGradient id="timeline-track-fill" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="var(--theme-accent-primary)" stopOpacity={0.35} />
          <stop offset="100%" stopColor="var(--theme-accent-primary)" stopOpacity={0.85} />
        </linearGradient>
        <filter id="timeline-soft-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx={0} dy={2} stdDeviation={4} floodOpacity={0.2} />
        </filter>
      </defs>
      <path
        d={pathD}
        fill="none"
        stroke="url(#timeline-track-fill)"
        strokeWidth="14"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter="url(#timeline-soft-shadow)"
      />
    </svg>
  )
}

function DefaultTimelineCard({ item }: { item: BlogTimelineItem }) {
  const Wrapper = item.slug ? 'a' : 'div'
  const wrapperProps = item.slug ? { href: `/posts/${item.slug}` } : {}

  return (
    <Wrapper
      {...wrapperProps}
      className={cn(
        'block overflow-hidden rounded-[1.75rem] border-2 border-line-primary bg-surface-glass p-0 backdrop-blur-sm transition-all shadow-lg',
        'hover:border-line-hover hover:shadow-xl hover:shadow-accent-primary/10 hover:-translate-y-0.5',
        item.slug && 'cursor-pointer'
      )}
    >
      {/* 封面图：较小比例 */}
      {item.coverImage && (
        <div className="relative w-full aspect-2/1 max-h-32 bg-surface-tertiary overflow-hidden">
          <Image
            src={item.coverImage}
            alt=""
            fill
            className="object-cover"
            sizes="320px"
            onError={(e) => {
              e.currentTarget.style.display = 'none'
            }}
          />
        </div>
      )}
      <div className="p-4">
        <h2 className="text-base font-semibold text-content-primary mb-1.5 line-clamp-2">
          {item.title}
        </h2>
        <p className="text-content-tertiary text-sm mb-4 line-clamp-2">{item.excerpt}</p>
        <div className="flex items-center gap-3 text-xs text-content-muted">
          <time dateTime={item.date}>{item.date}</time>
          {item.readTimeMinutes != null && (
            <>
              <span aria-hidden>·</span>
              <span>{item.readTimeMinutes} min read</span>
            </>
          )}
        </div>
      </div>
    </Wrapper>
  )
}

export function BlogTimeline({
  items,
  className,
  renderItem,
}: BlogTimelineProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [trackWidth, setTrackWidth] = useState(400)
  const targetScrollLeft = useRef(0)
  const rafId = useRef<number | null>(null)

  // 丝滑横向滚动：滚轮只更新目标位置，用 rAF 插值逼近
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    const SMOOTH = 0.18 // 越大跟随越快，0.1~0.25 较丝滑
    const SENSITIVITY = 1.1 // 滚轮灵敏度

    const tick = () => {
      const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth)
      targetScrollLeft.current = Math.max(0, Math.min(maxScroll, targetScrollLeft.current))
      const current = el.scrollLeft
      const target = targetScrollLeft.current
      const diff = target - current
      if (Math.abs(diff) < 0.5) {
        el.scrollLeft = target
        rafId.current = null
        return
      }
      el.scrollLeft = current + diff * SMOOTH
      rafId.current = requestAnimationFrame(tick)
    }

    const onWheel = (e: WheelEvent) => {
      const maxScroll = el.scrollWidth - el.clientWidth
      if (maxScroll <= 0) return
      if (e.deltaY !== 0) {
        e.preventDefault()
        targetScrollLeft.current = el.scrollLeft + e.deltaY * SENSITIVITY
        targetScrollLeft.current = Math.max(0, Math.min(maxScroll, targetScrollLeft.current))
        if (rafId.current == null) rafId.current = requestAnimationFrame(tick)
      }
    }

    const onScroll = () => {
      targetScrollLeft.current = el.scrollLeft
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('scroll', onScroll)
      if (rafId.current != null) cancelAnimationFrame(rafId.current)
    }
  }, [])

  useEffect(() => {
    const el = contentRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      if (el) setTrackWidth(el.offsetWidth)
    })
    ro.observe(el)
    setTrackWidth(el.offsetWidth)
    return () => ro.disconnect()
  }, [items.length])

  const cardWidth = 300

  return (
    <div className={cn('relative', className)}>
      {/* 顶部提示：滚动以查看更多 */}
      <p className="text-center text-sm text-content-muted mb-4">
        向下滚动或左右滑动，时间线向左移动展示更多
      </p>

      <div
        ref={scrollRef}
        className="overflow-x-auto overflow-y-hidden pb-6 snap-x snap-mandatory hide-scrollbar"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        <div
          ref={contentRef}
          className="relative flex items-start gap-6 pl-6 pr-6 min-h-[420px] pb-2"
          style={{
            width: 'max-content',
            minWidth: '100%',
          }}
        >
          {/* 轨道与节点同一高度：距底约 72px，使弧线穿过节点中心 */}
          <div
            className="absolute left-0 h-10 pointer-events-none"
            style={{ width: trackWidth, bottom: '72px' }}
          >
            <CartoonTrack width={trackWidth} height={40} />
          </div>

          {items.map((entry, index) => (
            <motion.div
              key={entry.id}
              className="relative flex flex-col items-center shrink-0 snap-center pt-0"
              style={{ width: cardWidth }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.05, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              {/* 卡片区：与下方时间线留足间距，避免重叠 */}
              <div className="w-full mb-10">
                {renderItem
                  ? renderItem(entry, index)
                  : <DefaultTimelineCard item={entry} />}
              </div>

              {/* 节点与日期：在轨道上方，不压住卡片 */}
              <div className="flex flex-col items-center mt-0">
                <div
                  className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border-2 border-accent-primary/40 bg-surface-glass shadow-md backdrop-blur-sm"
                  style={{
                    boxShadow: '0 2px 10px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.5)',
                  }}
                  aria-hidden
                >
                  <span
                    className="h-2 w-2 rounded-full bg-accent-primary"
                    style={{ boxShadow: '0 0 0 2px var(--theme-surface-glass)' }}
                  />
                </div>
                <time
                  dateTime={entry.date}
                  className="mt-1.5 text-xs font-medium text-content-muted"
                >
                  {entry.date}
                </time>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}

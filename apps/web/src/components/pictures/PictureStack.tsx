'use client'

import { useMemo, useState, useCallback, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { useDrag } from '@/hooks/useDrag'
import { cn } from '@/lib/utils'

export interface PictureStackItem {
  id: string
  src: string
  date: string
}

interface PictureStackProps {
  items: PictureStackItem[]
  className?: string
}

const PAD = 32
/** Polaroid 桌面：白边相纸比例，略高以留出底部白边 */
const CARD_WIDTH = 200
const CARD_HEIGHT = 250

/** Polaroid 桌面布局：模拟相片随意散落桌面的感觉，允许重叠与随机倾斜 */
function getStackStyle(
  index: number,
  id: string,
  containerWidth: number,
  containerHeight: number,
  totalCount: number
) {
  const idSeed = id.split('').reduce((s, c) => s + c.charCodeAt(0), 0)
  const s1 = (idSeed * 17 + index * 31) % 997

  const availW = Math.max(0, containerWidth - 2 * PAD - CARD_WIDTH)
  const availH = Math.max(0, containerHeight - 2 * PAD - CARD_HEIGHT)

  if (totalCount <= 1) {
    return {
      left: Math.max(PAD, (containerWidth - CARD_WIDTH) / 2),
      top: Math.max(PAD, (containerHeight - CARD_HEIGHT) / 2),
      rotate: 0,
    }
  }

  // 松散网格 + 大范围抖动，刻意制造重叠，营造随手散落感
  const aspect = availW / Math.max(1, availH)
  const cols = Math.max(1, Math.round(Math.sqrt(totalCount * aspect)))
  const rows = Math.max(1, Math.ceil(totalCount / cols))

  const cellW = availW / cols
  const cellH = availH / rows

  const col = index % cols
  const row = Math.floor(index / cols)

  // 抖动范围约 70% 格子，使相邻相片明显重叠
  const jitterRangeX = cellW * 0.7
  const jitterRangeY = cellH * 0.7
  const jitterX = ((idSeed * 47 + index * 73) % 201 - 100) / 100 * jitterRangeX
  const jitterY = ((idSeed * 61 + index * 89) % 201 - 100) / 100 * jitterRangeY

  const left = PAD + col * cellW + (cellW - CARD_WIDTH) / 2 + jitterX
  const top = PAD + row * cellH + (cellH - CARD_HEIGHT) / 2 + jitterY

  const maxLeft = Math.max(0, containerWidth - CARD_WIDTH - PAD)
  const maxTop = Math.max(0, containerHeight - CARD_HEIGHT - PAD)

  // Polaroid 倾斜角更柔和，-12° ~ 12°
  const rotate = -12 + (s1 % 25)

  return {
    left: Math.max(PAD, Math.min(maxLeft, left)),
    top: Math.max(PAD, Math.min(maxTop, top)),
    rotate,
  }
}

/** 每张卡片入场动画错开时间（秒） */
const STAGGER_DELAY = 0.1
const ENTRANCE_DURATION = 0.4

function DraggableCard({
  item,
  index,
  totalCount,
  offset,
  onOffsetChange,
  onSelect,
  zIndex,
  containerWidth,
  containerHeight,
}: {
  item: PictureStackItem
  index: number
  totalCount: number
  offset: { x: number; y: number }
  onOffsetChange: (delta: { x: number; y: number }) => void
  onSelect?: (item: PictureStackItem, rect: DOMRect) => void
  zIndex: number
  containerWidth: number
  containerHeight: number
}) {
  const cardRef = useRef<HTMLDivElement>(null)
  const { left, top, rotate } = useMemo(
    () => getStackStyle(index, item.id, containerWidth, containerHeight, totalCount),
    [index, item.id, containerWidth, containerHeight, totalCount]
  )

  const minTx = PAD - left
  const maxTx = containerWidth - PAD - CARD_WIDTH - left
  const minTy = PAD - top
  const maxTy = containerHeight - PAD - CARD_HEIGHT - top

  const clampDelta = useCallback(
    (delta: { x: number; y: number }) => {
      const clampedX = Math.max(minTx, Math.min(maxTx, offset.x + delta.x))
      const clampedY = Math.max(minTy, Math.min(maxTy, offset.y + delta.y))
      return { x: clampedX - offset.x, y: clampedY - offset.y }
    },
    [left, top, offset, containerWidth, containerHeight, minTx, maxTx, minTy, maxTy]
  )

  const { dragDelta, dragHandlers } = useDrag({
    onDragEnd: (delta) => onOffsetChange(clampDelta(delta)),
    onTap: () => {
      const rect = cardRef.current?.getBoundingClientRect()
      if (rect) onSelect?.(item, rect)
    },
  })

  const translateX = Math.max(minTx, Math.min(maxTx, offset.x + dragDelta.x))
  const translateY = Math.max(minTy, Math.min(maxTy, offset.y + dragDelta.y))

  return (
    <div
      ref={cardRef}
      className="absolute cursor-grab active:cursor-grabbing select-none touch-none"
      style={{
        left: `${left}px`,
        top: `${top}px`,
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        zIndex,
        transform: `translate(${translateX}px, ${translateY}px) rotate(${rotate}deg)`,
        transition: 'box-shadow 0.2s ease',
      }}
      {...dragHandlers}
    >
      <motion.div
        className="w-full h-full flex flex-col bg-white rounded-sm overflow-hidden transition-shadow duration-200"
        style={{
          boxShadow: '0 4px 20px rgba(0,0,0,0.1), 0 1px 3px rgba(0,0,0,0.08)',
        }}
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{
          boxShadow: '0 12px 40px rgba(0,0,0,0.15), 0 4px 12px rgba(0,0,0,0.1)',
          transition: { duration: 0.2 },
        }}
        transition={{
          duration: ENTRANCE_DURATION,
          delay: index * STAGGER_DELAY,
          ease: [0.32, 0.72, 0, 1],
        }}
      >
        <div className="flex-1 min-h-0 p-2.5 pb-1">
          <div className="relative w-full h-full min-h-[160px]">
            <Image
              src={item.src}
              alt=""
              fill
              sizes={`${CARD_WIDTH}px`}
              className="pointer-events-none object-cover"
              unoptimized={item.src.startsWith('http')}
            />
          </div>
        </div>
        <div className="h-10 flex items-center justify-center text-xs text-neutral-400 font-mono">
          {item.date}
        </div>
      </motion.div>
    </div>
  )
}

/** 预览相框最大宽高（px），限制在视口内 */
const PREVIEW_MAX_W = 680
const PREVIEW_MAX_H = 560

const springTransition = { type: 'spring' as const, damping: 26, stiffness: 300 }
const durationTransition = { duration: 0.35, ease: [0.32, 0.72, 0, 1] as const }

function PicturePreviewOverlay({
  item,
  fromRect,
  onClose,
}: {
  item: PictureStackItem
  fromRect: DOMRect
  onClose: () => void
}) {
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onClose()
    },
    [onClose]
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)

    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
    const prevOverflow = document.body.style.overflow
    const prevPaddingRight = document.body.style.paddingRight
    document.body.style.overflow = 'hidden'
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`
    }
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
      document.body.style.paddingRight = prevPaddingRight
    }
  }, [onClose])

  return (
    <motion.div
      role="dialog"
      aria-modal
      aria-label="图片预览"
      className="fixed inset-0 z-9999 flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={durationTransition}
    >
        {/* 背景遮罩 */}
        <div
          className="absolute inset-0 bg-black/65 backdrop-blur-sm"
          onClick={handleBackdropClick}
          aria-hidden
        />
        {/* 黑色外框 + 白色卡纸 + 图片：现代画框风格 */}
        <motion.div
          className="absolute z-10 flex overflow-visible bg-black"
          style={{
            boxShadow: '0 12px 40px rgba(0,0,0,0.2), 0 4px 12px rgba(0,0,0,0.12)',
            padding: 12,
          }}
          initial={{
            position: 'fixed' as const,
            left: fromRect.left,
            top: fromRect.top,
            width: fromRect.width,
            height: fromRect.height,
            x: 0,
            y: 0,
            opacity: 1,
          }}
          animate={(() => {
            const scale = Math.min(
              PREVIEW_MAX_W / fromRect.width,
              PREVIEW_MAX_H / fromRect.height
            )
            return {
              left: '50%',
              top: '50%',
              x: '-50%',
              y: '-50%',
              width: fromRect.width * scale,
              height: fromRect.height * scale,
              opacity: 1,
            }
          })()}
          exit={{
            left: fromRect.left,
            top: fromRect.top,
            width: fromRect.width,
            height: fromRect.height,
            x: 0,
            y: 0,
            opacity: 0,
            transition: durationTransition,
          }}
          transition={springTransition}
          onClick={(e) => e.stopPropagation()}
        >
          {/* 白色卡纸（passe-partout） */}
          <div className="relative flex-1 min-h-0 min-w-0 bg-white p-6 sm:p-8 md:p-10">
            <div className="relative h-full w-full overflow-hidden bg-neutral-100">
              <Image
                src={item.src}
                alt=""
                fill
                className="object-contain"
                unoptimized={item.src.startsWith('http')}
                sizes={`${PREVIEW_MAX_W}px`}
              />
            </div>
          </div>
        </motion.div>
    </motion.div>
  )
}

export function PictureStack({ items, className }: PictureStackProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  /** 未测量前为 null，避免用 fallback 尺寸导致首次布局闪烁 */
  const [size, setSize] = useState<{ width: number; height: number } | null>(null)
  const [preview, setPreview] = useState<{
    item: PictureStackItem
    fromRect: DOMRect
  } | null>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0]?.contentRect ?? { width: 0, height: 0 }
      if (width > 0 && height > 0) {
        setSize({ width, height })
      }
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // 照片墙单屏展示：禁止页面滚动，不显示滚动条
  useEffect(() => {
    const prevHtmlOverflow = document.documentElement.style.overflow
    const prevBodyOverflow = document.body.style.overflow
    document.documentElement.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
    return () => {
      document.documentElement.style.overflow = prevHtmlOverflow
      document.body.style.overflow = prevBodyOverflow
    }
  }, [])

  const sorted = useMemo(
    () => [...items].sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0)),
    [items]
  )

  const [offsets, setOffsets] = useState<Record<string, { x: number; y: number }>>({})

  const handleOffsetChange = useCallback((id: string, delta: { x: number; y: number }) => {
    setOffsets((prev) => ({
      ...prev,
      [id]: {
        x: (prev[id]?.x ?? 0) + delta.x,
        y: (prev[id]?.y ?? 0) + delta.y,
      },
    }))
  }, [])

  const handleSelect = useCallback((item: PictureStackItem, rect: DOMRect) => {
    setPreview({ item, fromRect: rect })
  }, [])

  return (
    <>
      <div ref={containerRef} className={cn('relative h-full min-h-0 w-full overflow-hidden', className)}>
        {size &&
          sorted.map((item, index) => (
            <DraggableCard
              key={item.id}
              item={item}
              index={index}
              totalCount={sorted.length}
              offset={offsets[item.id] ?? { x: 0, y: 0 }}
              onOffsetChange={(delta) => handleOffsetChange(item.id, delta)}
              onSelect={handleSelect}
              zIndex={sorted.length - 1 - index}
              containerWidth={size.width}
              containerHeight={size.height}
            />
          ))}
      </div>
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {preview && (
              <PicturePreviewOverlay
                key={preview.item.id}
                item={preview.item}
                fromRect={preview.fromRect}
                onClose={() => setPreview(null)}
              />
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  )
}

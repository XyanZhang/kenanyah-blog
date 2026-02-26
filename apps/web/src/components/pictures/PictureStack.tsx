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

const PAD = 24

// 图片较少时（≤4 张）均匀分布在圆周上不堆叠；较多时从中心向外层排列
const FEW_ITEMS_THRESHOLD = 4

function getStackStyle(
  index: number,
  id: string,
  containerWidth: number,
  containerHeight: number,
  totalCount: number
) {
  const idSeed = id.split('').reduce((s, c) => s + c.charCodeAt(0), 0)
  const s1 = (idSeed * 17 + index * 31) % 997

  const centerLeft = (containerWidth - CARD_WIDTH) / 2
  const centerTop = (containerHeight - CARD_HEIGHT) / 2
  const maxRadiusX = Math.max(0, (containerWidth - CARD_WIDTH) / 2 - PAD)
  const maxRadiusY = Math.max(0, (containerHeight - CARD_HEIGHT) / 2 - PAD)
  const maxRadius = Math.min(maxRadiusX, maxRadiusY)

  let radius: number
  let angleDeg: number

  if (totalCount <= 1) {
    radius = 0
    angleDeg = 0
  } else if (totalCount <= FEW_ITEMS_THRESHOLD) {
    // 少量图片：均匀分布在圆周上，不堆叠
    radius = maxRadius * 0.65
    angleDeg = (360 / totalCount) * index
  } else {
    // 多张图片：从中心向外，黄金角分布
    radius = (index / Math.max(1, totalCount - 1)) * maxRadius
    angleDeg = (idSeed * 37 + index * 137.5) % 360
  }

  const angleRad = (angleDeg * Math.PI) / 180
  const dx = radius * Math.cos(angleRad)
  const dy = radius * Math.sin(angleRad)

  const left = centerLeft + dx
  const top = centerTop + dy
  // 每张卡片倾斜角在 [-45, 45] 度内，用 id 种子保证同张图不变
  const rotate = -45 + (s1 % 91)

  const maxLeft = Math.max(0, containerWidth - CARD_WIDTH - PAD)
  const maxTop = Math.max(0, containerHeight - CARD_HEIGHT - PAD)
  return {
    left: Math.max(PAD, Math.min(maxLeft, left)),
    top: Math.max(PAD, Math.min(maxTop, top)),
    rotate,
  }
}

const CARD_WIDTH = 220
const CARD_HEIGHT = 180

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
        className="w-full h-full rounded-xl overflow-hidden bg-content-inverse shadow-lg border border-line-primary hover:shadow-xl transition-shadow"
        initial={{ opacity: 0, scale: 0.88 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{
          duration: ENTRANCE_DURATION,
          delay: index * STAGGER_DELAY,
          ease: [0.32, 0.72, 0, 1],
        }}
      >
        <Image
          src={item.src}
          alt=""
          width={CARD_WIDTH}
          height={CARD_HEIGHT}
          className="pointer-events-none object-cover w-full h-full"
          unoptimized={item.src.startsWith('http')}
        />
      </motion.div>
    </div>
  )
}

/** 预览相框最大宽高（px），限制在视口内 */
const PREVIEW_MAX_W = 1000
const PREVIEW_MAX_H = 800

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
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
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
        {/* 明信片/宝丽来风格：上方图钉 + 白框 + 图片 + 下方文案区 */}
        <motion.div
          className="absolute z-10 flex flex-col overflow-visible rounded-lg bg-white"
          style={{
            boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)',
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
          {/* 顶部图钉 */}
          <div
            className="absolute left-1/2 -top-1.5 z-10 h-4 w-4 -translate-x-1/2 rounded-full shadow-md"
            style={{
              background: 'linear-gradient(160deg, #7dd3fc 0%, #38bdf8 50%, #0ea5e9 100%)',
              boxShadow: '0 2px 6px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.5)',
            }}
            aria-hidden
          />
          {/* 上方留白（图钉区域） */}
          <div className="h-5 shrink-0" aria-hidden />
          {/* 图片区 */}
          <div className="relative min-h-0 flex-1 px-3 pt-0.5">
            <div className="relative h-full w-full overflow-hidden rounded-sm bg-neutral-100">
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
          {/* 下方文案区（明信片签名/日期） */}
          <div
            className="shrink-0 border-t border-neutral-200/80 px-4 py-3 text-center text-sm text-neutral-600"
            style={{ fontFamily: 'ui-rounded, "Hiragino Maru Gothic ProN", "Comic Sans MS", cursive' }}
          >
            {item.date}
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
      <div ref={containerRef} className={cn('relative min-h-screen w-full', className)}>
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

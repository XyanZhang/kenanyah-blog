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

// Deterministic random stacking, constrained so the whole card stays inside the container
function getStackStyle(
  index: number,
  id: string,
  containerWidth: number,
  containerHeight: number
) {
  const idSeed = id.split('').reduce((s, c) => s + c.charCodeAt(0), 0)
  const s1 = (idSeed * 17 + index * 31) % 997
  const s2 = (idSeed * 23 + index * 41) % 991
  const s3 = (idSeed * 13 + index * 19) % 983
  const s4 = (idSeed * 29 + index * 7) % 977

  const maxLeft = Math.max(0, containerWidth - CARD_WIDTH - PAD)
  const maxTop = Math.max(0, containerHeight - CARD_HEIGHT - PAD)
  const rangeW = maxLeft - PAD
  const rangeH = maxTop - PAD

  const left = rangeW > 0 ? PAD + (s1 % rangeW) + ((s3 % 5) - 2) * 20 : PAD
  const top = rangeH > 0 ? PAD + (s2 % rangeH) + ((s4 % 5) - 2) * 15 : PAD
  const rotate = -18 + (s1 * 37 % 36)

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
  offset,
  onOffsetChange,
  onSelect,
  zIndex,
  containerWidth,
  containerHeight,
}: {
  item: PictureStackItem
  index: number
  offset: { x: number; y: number }
  onOffsetChange: (delta: { x: number; y: number }) => void
  onSelect?: (item: PictureStackItem, rect: DOMRect) => void
  zIndex: number
  containerWidth: number
  containerHeight: number
}) {
  const cardRef = useRef<HTMLDivElement>(null)
  const { left, top, rotate } = useMemo(
    () => getStackStyle(index, item.id, containerWidth, containerHeight),
    [index, item.id, containerWidth, containerHeight]
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

const FALLBACK_WIDTH = 800
const FALLBACK_HEIGHT = 600

/** 预览相框最大宽高（px），限制在视口内 */
const PREVIEW_MAX_W = 720
const PREVIEW_MAX_H = 540

const springTransition = { type: 'spring' as const, damping: 26, stiffness: 300 }
const durationTransition = { duration: 0.35, ease: [0.32, 0.72, 0, 1] }

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
        {/* 相框 + 图片：从卡片位置动画到居中 */}
        <motion.div
          className="absolute z-10 flex items-center justify-center rounded-xl border-10 border-white/95 bg-white/90 p-3 shadow-2xl"
          style={{ boxShadow: '0 25px 80px -12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.8)' }}
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
          animate={{
            left: '50%',
            top: '50%',
            x: '-50%',
            y: '-50%',
            width: Math.min(PREVIEW_MAX_W, fromRect.width * 2.2),
            height: Math.min(PREVIEW_MAX_H, fromRect.height * 2.2),
            opacity: 1,
          }}
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
          <div className="relative h-full w-full overflow-hidden rounded-lg bg-neutral-100">
            <Image
              src={item.src}
              alt=""
              fill
              className="object-contain"
              unoptimized={item.src.startsWith('http')}
              sizes={`${PREVIEW_MAX_W}px`}
            />
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
              offset={offsets[item.id] ?? { x: 0, y: 0 }}
              onOffsetChange={(delta) => handleOffsetChange(item.id, delta)}
              onSelect={handleSelect}
              zIndex={index}
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

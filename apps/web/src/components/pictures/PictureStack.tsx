'use client'

import { memo, useMemo, useState, useCallback, useRef, useEffect } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { useDrag } from '@/hooks/useDrag'
import { cn } from '@/lib/utils'
import { buildPicturesImageUrl, isPicturesSource } from '@/lib/image-service'
import Lightbox from 'yet-another-react-lightbox'
import Zoom from 'yet-another-react-lightbox/plugins/zoom'
import 'yet-another-react-lightbox/styles.css'

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
const ZERO_OFFSET = { x: 0, y: 0 }

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

function resolvePictureListSrc(src: string): string {
  if (!isPicturesSource(src)) return src
  return buildPicturesImageUrl(src, {
    width: 440,
    height: 360,
    quality: 70,
    fit: 'cover',
    format: 'webp',
  })
}

function resolvePictureDetailSrc(src: string): string {
  if (!isPicturesSource(src)) return src
  return buildPicturesImageUrl(src)
}

const PictureCardFace = memo(function PictureCardFace({
  item,
  index,
}: {
  item: PictureStackItem
  index: number
}) {
  return (
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
            src={resolvePictureListSrc(item.src)}
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
  )
})

const DraggableCard = memo(function DraggableCard({
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
  onOffsetChange: (id: string, nextOffset: { x: number; y: number }) => void
  onSelect?: (item: PictureStackItem) => void
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

  const clampOffset = useCallback(
    (nextOffset: { x: number; y: number }) => {
      const clampedX = Math.max(minTx, Math.min(maxTx, nextOffset.x))
      const clampedY = Math.max(minTy, Math.min(maxTy, nextOffset.y))
      return { x: clampedX, y: clampedY }
    },
    [minTx, maxTx, minTy, maxTy]
  )

  const [visualOffset, setVisualOffset] = useState(() => clampOffset(offset))
  const visualOffsetRef = useRef(visualOffset)

  const setCardTransform = useCallback(
    (nextOffset: { x: number; y: number }) => {
      if (!cardRef.current) return
      cardRef.current.style.transform = `translate3d(${nextOffset.x}px, ${nextOffset.y}px, 0) rotate(${rotate}deg)`
    },
    [rotate]
  )

  const { isDragging, dragHandlers } = useDrag({
    syncDragDelta: false,
    onDragMove: (delta) => {
      const nextOffset = clampOffset({
        x: visualOffsetRef.current.x + delta.x,
        y: visualOffsetRef.current.y + delta.y,
      })
      setCardTransform(nextOffset)
    },
    onDragEnd: (delta) => {
      const nextOffset = clampOffset({
        x: visualOffsetRef.current.x + delta.x,
        y: visualOffsetRef.current.y + delta.y,
      })

      visualOffsetRef.current = nextOffset
      setVisualOffset((prev) =>
        prev.x === nextOffset.x && prev.y === nextOffset.y ? prev : nextOffset
      )
      onOffsetChange(item.id, nextOffset)
    },
    onTap: () => {
      onSelect?.(item)
    },
  })

  useEffect(() => {
    if (isDragging) return

    const nextOffset = clampOffset(offset)
    visualOffsetRef.current = nextOffset
    setVisualOffset((prev) => (prev.x === nextOffset.x && prev.y === nextOffset.y ? prev : nextOffset))
  }, [clampOffset, isDragging, offset])

  const clampedVisualOffset = clampOffset(visualOffset)
  visualOffsetRef.current = clampedVisualOffset

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
        transform: `translate3d(${clampedVisualOffset.x}px, ${clampedVisualOffset.y}px, 0) rotate(${rotate}deg)`,
        transition: 'box-shadow 0.2s ease',
        willChange: isDragging ? 'transform' : undefined,
        backfaceVisibility: 'hidden',
      }}
      {...dragHandlers}
    >
      <PictureCardFace item={item} index={index} />
    </div>
  )
})

export function PictureStack({ items, className }: PictureStackProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  /** 未测量前为 null，避免用 fallback 尺寸导致首次布局闪烁 */
  const [size, setSize] = useState<{ width: number; height: number } | null>(null)
  const [previewIndex, setPreviewIndex] = useState<number>(-1)

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

  const handleOffsetChange = useCallback((id: string, nextOffset: { x: number; y: number }) => {
    setOffsets((prev) => {
      const current = prev[id]
      if (current?.x === nextOffset.x && current?.y === nextOffset.y) {
        return prev
      }

      return {
        ...prev,
        [id]: nextOffset,
      }
    })
  }, [])

  const slides = useMemo(
    () =>
      sorted.map((item) => ({
        src: resolvePictureDetailSrc(item.src),
      })),
    [sorted]
  )

  const handleSelect = useCallback(
    (item: PictureStackItem) => {
      const idx = sorted.findIndex((it) => it.id === item.id)
      if (idx >= 0) setPreviewIndex(idx)
    },
    [sorted]
  )

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
              offset={offsets[item.id] ?? ZERO_OFFSET}
              onOffsetChange={handleOffsetChange}
              onSelect={handleSelect}
              zIndex={sorted.length - 1 - index}
              containerWidth={size.width}
              containerHeight={size.height}
            />
          ))}
      </div>
      <Lightbox
        open={previewIndex >= 0}
        close={() => setPreviewIndex(-1)}
        slides={slides}
        index={previewIndex >= 0 ? previewIndex : 0}
        plugins={[Zoom]}
        controller={{ closeOnBackdropClick: true }}
      />
    </>
  )
}

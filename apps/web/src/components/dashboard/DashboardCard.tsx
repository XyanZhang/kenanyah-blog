'use client'

import { useCallback } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { motion } from 'framer-motion'
import { DashboardCard as DashboardCardType, CardType, CardDimensions, CardSize } from '@blog/types'
import { useDashboard } from '@/hooks/useDashboard'
import { useCardResize } from '@/hooks/useCardResize'
import { cardVariants } from '@/hooks/useCardAnimation'
import { getCardDimensions, DEFAULT_BORDER_RADIUS } from '@/lib/constants/dashboard'
import { CardToolbar } from './CardToolbar'
import { ResizeHandles } from './ResizeHandles'
import { ProfileCard } from './cards/ProfileCard'
import { StatsCard } from './cards/StatsCard'
import { CategoriesCard } from './cards/CategoriesCard'
import { RecentPostsCard } from './cards/RecentPostsCard'
import { TabbarCard } from './cards/TabbarCard'
import { LatestPostsCard } from './cards/LatestPostsCard'
import { RandomPostsCard } from './cards/RandomPostsCard'
import { CalendarCard } from './cards/CalendarCard'
import { ClockCard } from './cards/ClockCard'

interface DashboardCardProps {
  card: DashboardCardType
  index: number
}

function getCardComponent(type: CardType) {
  const registry = {
    [CardType.PROFILE]: ProfileCard,
    [CardType.STATS]: StatsCard,
    [CardType.CATEGORIES]: CategoriesCard,
    [CardType.RECENT_POSTS]: RecentPostsCard,
    [CardType.TABBAR]: TabbarCard,
    [CardType.LATEST_POSTS]: LatestPostsCard,
    [CardType.RANDOM_POSTS]: RandomPostsCard,
    [CardType.CALENDAR]: CalendarCard,
    [CardType.CLOCK]: ClockCard,
  }
  return registry[type]
}

export function DashboardCard({ card, index }: DashboardCardProps) {
  const { isEditMode, selectedCardId, selectCard, updateCardSize } = useDashboard()
  const baseDimensions = getCardDimensions(card.size, card.customDimensions)
  const isAutoSize = card.size === CardSize.AUTO
  const isSelected = selectedCardId === card.id

  const handleResizeEnd = useCallback(
    (dimensions: CardDimensions, positionDelta: { x: number; y: number }) => {
      updateCardSize(card.id, dimensions, positionDelta)
    },
    [card.id, updateCardSize]
  )

  const { isResizing, currentDimensions, positionDelta, handleResizeStart } = useCardResize({
    initialDimensions: baseDimensions ?? { width: 200, height: 200 },
    onResizeEnd: handleResizeEnd,
  })

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: card.id,
    disabled: !isEditMode || isResizing,
  })

  const CardContent = getCardComponent(card.type)
  const borderRadius = card.borderRadius ?? DEFAULT_BORDER_RADIUS

  // Calculate final position including drag transform and resize position delta
  const x = card.position.x + (transform?.x || 0) + positionDelta.x
  const y = card.position.y + (transform?.y || 0) + positionDelta.y

  return (
    <motion.div
      ref={setNodeRef}
      style={{
        position: 'absolute',
        width: isAutoSize ? 'fit-content' : currentDimensions.width,
        height: isAutoSize ? 'fit-content' : currentDimensions.height,
        zIndex: isDragging || isResizing ? 1000 : card.position.z,
        borderRadius: `${borderRadius}px`,
      }}
      variants={cardVariants}
      initial="hidden"
      animate={{
        x,
        y,
        scale: 1,
        opacity: isDragging ? 0.8 : 1,
      }}
      whileHover={!isEditMode ? { scale: 1.02 } : undefined}
      custom={index}
      transition={{
        type: 'spring',
        stiffness: isDragging || isResizing ? 500 : 260,
        damping: isDragging || isResizing ? 30 : 20,
      }}
      className={`
        group relative
        border border-line-glass p-6 backdrop-blur-xs
        [box-shadow:0_40px_50px_-32px_rgba(0,0,0,0.05),inset_0_0_20px_rgba(255,255,255,0.25)]
        ${isEditMode ? 'cursor-grab active:cursor-grabbing' : ''}
        ${isSelected ? 'ring-2 ring-line-focus' : ''}
        ${isDragging ? '[box-shadow:0_50px_60px_-30px_rgba(0,0,0,0.1),inset_0_0_20px_rgba(255,255,255,0.25)]' : ''}
      `}
      onClick={() => isEditMode && selectCard(card.id)}
      {...(isEditMode && !isResizing ? { ...attributes, ...listeners } : {})}
    >
      {isEditMode && <CardToolbar cardId={card.id} />}
      <div
        className="h-full w-full overflow-hidden"
        style={{ borderRadius: `${Math.max(0, borderRadius - 24)}px` }}
      >
        <CardContent card={card} />
      </div>
      {isEditMode && !isAutoSize && <ResizeHandles onResizeStart={handleResizeStart} />}
    </motion.div>
  )
}

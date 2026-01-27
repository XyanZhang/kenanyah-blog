'use client'

import { useDraggable } from '@dnd-kit/core'
import { motion } from 'framer-motion'
import { DashboardCard as DashboardCardType, CardType } from '@blog/types'
import { useDashboard } from '@/hooks/useDashboard'
import { cardVariants } from '@/hooks/useCardAnimation'
import { getCardDimensions } from '@/lib/constants/dashboard'
import { CardToolbar } from './CardToolbar'
import { ProfileCard } from './cards/ProfileCard'
import { StatsCard } from './cards/StatsCard'
import { CategoriesCard } from './cards/CategoriesCard'
import { RecentPostsCard } from './cards/RecentPostsCard'

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
  }
  return registry[type]
}

export function DashboardCard({ card, index }: DashboardCardProps) {
  const { isEditMode, selectedCardId, selectCard } = useDashboard()
  const dimensions = getCardDimensions(card.size)
  const isSelected = selectedCardId === card.id

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: card.id,
    disabled: !isEditMode,
  })

  const CardContent = getCardComponent(card.type)

  // Calculate final position including drag transform
  const x = card.position.x + (transform?.x || 0)
  const y = card.position.y + (transform?.y || 0)

  return (
    <motion.div
      ref={setNodeRef}
      style={{
        position: 'absolute',
        width: dimensions.width,
        height: dimensions.height,
        zIndex: isDragging ? 1000 : card.position.z,
      }}
      variants={cardVariants}
      initial="hidden"
      animate={{
        x,
        y,
        scale: isDragging ? 1.05 : 1,
        opacity: isDragging ? 0.8 : 1,
      }}
      whileHover={isEditMode && !isDragging ? { scale: 1.02 } : undefined}
      custom={index}
      transition={{
        type: 'spring',
        stiffness: isDragging ? 500 : 260,
        damping: isDragging ? 30 : 20,
      }}
      className={`
        rounded-xl bg-white shadow-lg
        ${isEditMode ? 'cursor-grab active:cursor-grabbing' : ''}
        ${isSelected ? 'ring-2 ring-blue-500' : ''}
        ${isDragging ? 'shadow-2xl' : ''}
      `}
      onClick={() => isEditMode && selectCard(card.id)}
      {...(isEditMode ? { ...attributes, ...listeners } : {})}
    >
      {isEditMode && <CardToolbar cardId={card.id} />}
      <div className="h-full w-full overflow-hidden rounded-xl p-4">
        <CardContent card={card} />
      </div>
    </motion.div>
  )
}

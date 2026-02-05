import { CardPosition, DashboardCard } from '@blog/types'
import { CARD_DIMENSIONS, getCardDimensions } from '../constants/dashboard'

interface LayoutConfig {
  radius: number
  startAngle: number
}

/**
 * Generate circular layout positions for cards
 */
export function generateCircularLayout(
  cards: DashboardCard[],
  config: LayoutConfig = { radius: 300, startAngle: 0 }
): CardPosition[] {
  const { radius, startAngle } = config
  const angleStep = (2 * Math.PI) / cards.length

  return cards.map((_, index) => {
    const angle = startAngle + angleStep * index
    return {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
      z: index,
    }
  })
}

/**
 * Generate spiral layout positions for cards
 */
export function generateSpiralLayout(
  cards: DashboardCard[],
  config: { spacing: number; growth: number } = { spacing: 50, growth: 1.2 }
): CardPosition[] {
  const { spacing, growth } = config
  const angleStep = Math.PI / 4

  return cards.map((_, index) => {
    const angle = angleStep * index
    const radius = spacing * Math.pow(growth, index / 4)
    return {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
      z: index,
    }
  })
}

/**
 * Generate grid layout positions for cards (used in edit mode)
 */
export function generateGridLayout(
  cards: DashboardCard[],
  config: { columns: number; gap: number } = { columns: 3, gap: 20 }
): CardPosition[] {
  const { columns, gap } = config

  return cards.map((card, index) => {
    const row = Math.floor(index / columns)
    const col = index % columns
    const dimensions = getCardDimensions(card.size) ?? CARD_DIMENSIONS.medium

    return {
      x: col * (dimensions.width + gap),
      y: row * (dimensions.height + gap),
      z: index,
    }
  })
}

/**
 * Check if two cards collide
 */
function cardsCollide(
  card1: DashboardCard,
  pos1: CardPosition,
  card2: DashboardCard,
  pos2: CardPosition
): boolean {
  const dim1 = getCardDimensions(card1.size) ?? CARD_DIMENSIONS.medium
  const dim2 = getCardDimensions(card2.size) ?? CARD_DIMENSIONS.medium

  return !(
    pos1.x + dim1.width < pos2.x ||
    pos1.x > pos2.x + dim2.width ||
    pos1.y + dim1.height < pos2.y ||
    pos1.y > pos2.y + dim2.height
  )
}

/**
 * Resolve collisions between cards by adjusting positions
 */
export function resolveCollisions(
  cards: DashboardCard[]
): DashboardCard[] {
  const result = [...cards]
  const maxIterations = 10
  let iteration = 0

  while (iteration < maxIterations) {
    let hasCollision = false

    for (let i = 0; i < result.length; i++) {
      for (let j = i + 1; j < result.length; j++) {
        if (cardsCollide(result[i], result[i].position, result[j], result[j].position)) {
          hasCollision = true
          // Move card j slightly away from card i
          const dx = result[j].position.x - result[i].position.x
          const dy = result[j].position.y - result[i].position.y
          const distance = Math.sqrt(dx * dx + dy * dy) || 1
          const moveDistance = 10

          result[j] = {
            ...result[j],
            position: {
              ...result[j].position,
              x: result[j].position.x + (dx / distance) * moveDistance,
              y: result[j].position.y + (dy / distance) * moveDistance,
            },
          }
        }
      }
    }

    if (!hasCollision) break
    iteration++
  }

  return result
}

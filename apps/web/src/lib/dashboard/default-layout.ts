import { DashboardCard, DashboardLayout, CardType, CardSize } from '@blog/types'
import { generateCircularLayout } from './layout-algorithms'
import { DEFAULT_LAYOUT_CONFIG, LAYOUT_VERSION } from '../constants/dashboard'

/**
 * Create a default dashboard card
 */
export function createDefaultCard(
  type: CardType,
  size: CardSize = CardSize.MEDIUM,
  config: Record<string, any> = {}
): Omit<DashboardCard, 'position'> {
  const now = new Date()

  const defaultConfigs = {
    [CardType.PROFILE]: {
      showAvatar: true,
      showBio: true,
      showSocialLinks: true,
    },
    [CardType.STATS]: {
      metrics: ['posts', 'views', 'comments'],
    },
    [CardType.CATEGORIES]: {
      type: 'categories',
      limit: 10,
      showCount: true,
    },
    [CardType.RECENT_POSTS]: {
      limit: 5,
      showExcerpt: true,
      showDate: true,
    },
  }

  return {
    id: `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type,
    size,
    config: { ...defaultConfigs[type], ...config },
    visible: true,
    createdAt: now,
    updatedAt: now,
  }
}

/**
 * Create a default dashboard layout with all card types
 */
export function createDefaultLayout(): DashboardLayout {
  const now = new Date()

  const cardsWithoutPosition = [
    createDefaultCard(CardType.PROFILE, CardSize.MEDIUM),
    createDefaultCard(CardType.STATS, CardSize.WIDE),
    createDefaultCard(CardType.CATEGORIES, CardSize.MEDIUM),
    createDefaultCard(CardType.RECENT_POSTS, CardSize.TALL),
  ]

  const positions = generateCircularLayout(
    cardsWithoutPosition as DashboardCard[],
    DEFAULT_LAYOUT_CONFIG
  )

  const cards: DashboardCard[] = cardsWithoutPosition.map((card, index) => ({
    ...card,
    position: positions[index],
  }))

  return {
    id: `layout-${Date.now()}`,
    cards,
    version: LAYOUT_VERSION,
    createdAt: now,
    updatedAt: now,
  }
}

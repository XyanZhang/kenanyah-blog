import { DashboardCard, DashboardLayout, CardType, CardSize } from '@blog/types'
import { generateCircularLayout } from './layout-algorithms'
import { DEFAULT_LAYOUT_CONFIG, LAYOUT_VERSION, DEFAULT_BORDER_RADIUS } from '../constants/dashboard'

/**
 * Create a default dashboard card
 */
export function createDefaultCard(
  type: CardType,
  size: CardSize = CardSize.MEDIUM,
  config: Record<string, any> = {}
): Omit<DashboardCard, 'position'> {
  const now = new Date()

  const defaultConfigs: Record<CardType, Record<string, any>> = {
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
    [CardType.TABBAR]: {
      defaultTab: 'recent',
    },
    [CardType.LATEST_POSTS]: {
      limit: 3,
      showImage: true,
      showExcerpt: true,
      showDate: true,
    },
    [CardType.RANDOM_POSTS]: {
      limit: 3,
      showImage: true,
      showExcerpt: true,
      showDate: true,
    },
    [CardType.CALENDAR]: {
      showPostDots: true,
      highlightToday: true,
    },
    [CardType.CLOCK]: {
      format24h: true,
      showSeconds: true,
      showDate: true,
      fontStyle: 'mono',
    },
    [CardType.IMAGE]: {
      src: '/images/avatar/avatar-pink.png',
      alt: 'Cover Image',
      objectFit: 'cover',
      showOverlay: false,
    },
  }

  return {
    id: `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type,
    size,
    borderRadius: DEFAULT_BORDER_RADIUS,
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
    { ...createDefaultCard(CardType.PROFILE, CardSize.MEDIUM), animationPriority: 1 },
    { ...createDefaultCard(CardType.STATS, CardSize.WIDE), animationPriority: 2 },
    { ...createDefaultCard(CardType.CATEGORIES, CardSize.MEDIUM), animationPriority: 3 },
    { ...createDefaultCard(CardType.RECENT_POSTS, CardSize.TALL), animationPriority: 4 },
    { ...createDefaultCard(CardType.TABBAR, CardSize.WIDE), animationPriority: 5 },
    { ...createDefaultCard(CardType.LATEST_POSTS, CardSize.TALL), animationPriority: 6 },
    { ...createDefaultCard(CardType.RANDOM_POSTS, CardSize.TALL), animationPriority: 7 },
    { ...createDefaultCard(CardType.CALENDAR, CardSize.MEDIUM), animationPriority: 8 },
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

export enum CardSize {
  SMALL = 'small',    // 200x200
  MEDIUM = 'medium',  // 300x300
  LARGE = 'large',    // 400x400
  WIDE = 'wide',      // 600x300
  TALL = 'tall',      // 300x600
}

export enum CardType {
  PROFILE = 'profile',
  STATS = 'stats',
  CATEGORIES = 'categories',
  RECENT_POSTS = 'recent_posts',
}

export interface CardPosition {
  x: number
  y: number
  z: number
}

export interface DashboardCard {
  id: string
  type: CardType
  size: CardSize
  position: CardPosition
  config: Record<string, any>
  visible: boolean
  createdAt: Date
  updatedAt: Date
}

export interface DashboardLayout {
  id: string
  userId?: string
  cards: DashboardCard[]
  version: number
  createdAt: Date
  updatedAt: Date
}

// Card-specific config types
export interface ProfileCardConfig {
  showAvatar: boolean
  showBio: boolean
  showSocialLinks: boolean
}

export interface StatsCardConfig {
  metrics: ('posts' | 'views' | 'comments')[]
}

export interface CategoriesCardConfig {
  type: 'categories' | 'tags'
  limit: number
  showCount: boolean
}

export interface RecentPostsCardConfig {
  limit: number
  showExcerpt: boolean
  showDate: boolean
}

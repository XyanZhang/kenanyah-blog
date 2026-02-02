export enum CardSize {
  SMALL = 'small',    // 200x200
  MEDIUM = 'medium',  // 300x300
  LARGE = 'large',    // 400x400
  WIDE = 'wide',      // 600x300
  TALL = 'tall',      // 300x600
  CUSTOM = 'custom',  // user-defined dimensions
  AUTO = 'auto',      // content-driven size
}

export interface CardDimensions {
  width: number
  height: number
}

export enum CardType {
  PROFILE = 'profile',
  STATS = 'stats',
  CATEGORIES = 'categories',
  RECENT_POSTS = 'recent_posts',
  TABBAR = 'tabbar',
  LATEST_POSTS = 'latest_posts',
  RANDOM_POSTS = 'random_posts',
  CALENDAR = 'calendar',
  CLOCK = 'clock',
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
  customDimensions?: CardDimensions
  position: CardPosition
  borderRadius: number
  config: Record<string, any>
  visible: boolean
  animationPriority?: number
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

export interface TabbarCardConfig {
  defaultTab: 'recent' | 'about' | 'photography' | 'projects'
}

export interface LatestPostsCardConfig {
  limit: number
  showImage: boolean
  showExcerpt: boolean
  showDate: boolean
}

export interface RandomPostsCardConfig {
  limit: number
  showImage: boolean
  showExcerpt: boolean
  showDate: boolean
}

export interface CalendarCardConfig {
  showPostDots: boolean
  highlightToday: boolean
}

export interface ClockCardConfig {
  format24h: boolean
  showSeconds: boolean
  showDate: boolean
  fontStyle: 'mono' | 'sans' | 'serif'
}

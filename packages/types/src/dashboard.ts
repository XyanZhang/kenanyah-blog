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
  IMAGE = 'image',
  SOCIAL = 'social',
  MOTTO = 'motto',
  WEATHER = 'weather',
  MUSIC = 'music',
  READING = 'reading',
  WOODEN_FISH = 'wooden_fish',
  AI_CHAT = 'ai_chat',
  COUNTDOWN = 'countdown',
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
  padding: number
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
  /** 自定义头像 URL，留空则使用默认头像 */
  avatar?: string
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
  /** 是否显示用户标注（点击日期可添加/编辑标注，与用户绑定） */
  showAnnotations?: boolean
}

export interface ClockCardConfig {
  format24h: boolean
  showSeconds: boolean
  showDate: boolean
  fontStyle: 'mono' | 'sans' | 'serif'
}

export interface ImageCardConfig {
  src: string
  alt: string
  objectFit: 'cover' | 'contain' | 'fill'
  showOverlay: boolean
  overlayText?: string
  linkUrl?: string
}

export interface SocialLink {
  id: string
  platform: 'github' | 'twitter' | 'wechat' | 'weibo' | 'instagram' | 'linkedin' | 'email' | 'website' | 'custom'
  label: string
  url: string
  showLabel: boolean
}

export interface SocialCardConfig {
  layout: 'icons' | 'list' | 'compact'
  links: SocialLink[]
  iconSize: 'small' | 'medium' | 'large'
  showBackground: boolean
  columns: number
}

export interface MottoCardConfig {
  motto: string
  author?: string
  fontStyle: 'serif' | 'sans' | 'mono'
  textAlign: 'left' | 'center' | 'right'
  showDivider: boolean
  dividerStyle: 'line' | 'dots' | 'bracket'
  textSize: 'small' | 'medium' | 'large'
}

export interface WeatherCardConfig {
  city: string
  latitude?: number
  longitude?: number
  showHumidity: boolean
  showWind: boolean
}

export interface MusicTrack {
  audioUrl: string
  title: string
  artist?: string
  coverUrl?: string
}

export interface MusicCardConfig {
  title: string
  artist?: string
  coverUrl?: string
  audioUrl?: string
  autoPlay: boolean
  showProgress: boolean
  showVolume: boolean
  playlist?: MusicTrack[]
  simplifiedMode?: boolean
  /** 开启后切换页面时继续播放，使用全局单例播放器 */
  persistAcrossPages?: boolean
}

export interface ReadingCardConfig {
  bookTitle: string
  author: string
  coverUrl?: string
  totalPages: number
  currentPage: number
  status: 'reading' | 'completed' | 'paused'
  startDate?: string
  finishDate?: string
  streak: number
  dailyGoal: number
  showStreak: boolean
  showProgress: boolean
  showAuthor: boolean
}

export interface AiChatCardConfig {
  title?: string
  subtitle?: string
}

export type CountdownEventType = 'birthday' | 'anniversary' | 'exam' | 'activity'

export interface CountdownCardConfig {
  /** 卡片展示的最近事件条数，默认 3 */
  limit?: number
  /** 是否只显示未过期的目标日（默认 true） */
  futureOnly?: boolean
}

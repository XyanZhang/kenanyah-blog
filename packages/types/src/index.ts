// User types
export type {
  User,
  UserRole,
  AuthProvider,
  CreateUserDto,
  UpdateUserDto,
  UserPublic,
} from './user'

// Post types
export type {
  Post,
  CreatePostDto,
  UpdatePostDto,
  PostWithRelations,
} from './post'

// Comment types
export type {
  Comment,
  CreateCommentDto,
  UpdateCommentDto,
  CommentWithRelations,
} from './comment'

// Category types
export type {
  Category,
  CreateCategoryDto,
  UpdateCategoryDto,
  CategoryWithCount,
} from './category'

// Tag types
export type {
  Tag,
  CreateTagDto,
  UpdateTagDto,
  TagWithCount,
} from './tag'

// API types
export type {
  ApiResponse,
  PaginationMeta,
  PaginationParams,
  PostFilters,
} from './api'

export type {
  ThemeId,
  ColorModePreference,
  CustomThemeColors,
  ThemeConfig,
} from './theme'

// Calendar types
export type {
  CalendarEventSourceType,
  CalendarEventStatus,
  CalendarAnnotationSummary,
  CalendarEventDto,
  CalendarDaySummaryDto,
  CalendarDayResponse,
  CalendarQuickCreateResult,
  ProjectEntryDto,
  PhotoEntryDto,
} from './calendar'

// Auth types
export type {
  LoginDto,
  RegisterDto,
  AuthResponse,
  JwtPayload,
  TokenPair,
} from './auth'

export { AdminRole } from './admin'
export type {
  AdminUser,
  AdminDashboardStats,
  AdminDashboardKpis,
  AdminDashboardTrendPoint,
  AdminDashboardModerationSummary,
  AdminDashboardDistributionItem,
  AdminDashboardActivityType,
  AdminDashboardActivityItem,
  AdminDashboardActionItem,
  AdminDashboardData,
  AdminPostListItem,
  AdminCommentItem,
  AdminTaxonomyItem,
  AdminMediaItem,
  AdminBookmarkItem,
} from './admin'

// Dashboard types
export { CardSize, CardType } from './dashboard'
export type {
  CardDimensions,
  CardPosition,
  DashboardCard,
  DashboardLayout,
  ProfileCardConfig,
  StatsCardConfig,
  CategoriesCardConfig,
  RecentPostsCardConfig,
  TabbarCardConfig,
  LatestPostsCardConfig,
  RandomPostsCardConfig,
  CalendarCardConfig,
  ClockCardConfig,
  MusicTrack,
  ImageCardConfig,
  SocialCardConfig,
  SocialLink,
  MottoCardConfig,
  WeatherCardConfig,
  MusicCardConfig,
  ReadingCardConfig,
  AiChatCardConfig,
  CountdownCardConfig,
  CountdownEventType,
} from './dashboard'

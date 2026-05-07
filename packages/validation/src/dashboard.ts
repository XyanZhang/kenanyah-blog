import { z } from 'zod'
import { CardSize, CardType } from '@blog/types'

export const cardSizeSchema = z.nativeEnum(CardSize)

export const cardTypeSchema = z.nativeEnum(CardType)

const dateLikeSchema = z.coerce.date()

export const cardDimensionsSchema = z.object({
  width: z.number().nonnegative(),
  height: z.number().nonnegative(),
})

export const cardPositionSchema = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number(),
})

export const dashboardCardSchema = z.object({
  id: z.string(),
  type: cardTypeSchema,
  size: cardSizeSchema,
  customDimensions: cardDimensionsSchema.optional(),
  position: cardPositionSchema,
  borderRadius: z.number().nonnegative().optional(),
  padding: z.number().nonnegative().optional(),
  config: z.record(z.any()),
  visible: z.boolean(),
  mobileVisible: z.boolean().optional(),
  animationPriority: z.number().optional(),
  createdAt: dateLikeSchema,
  updatedAt: dateLikeSchema,
})

export const dashboardLayoutSchema = z.object({
  id: z.string(),
  userId: z.string().optional(),
  cards: z.array(dashboardCardSchema),
  version: z.number(),
  createdAt: dateLikeSchema,
  updatedAt: dateLikeSchema,
})

// Card-specific config schemas
export const profileCardConfigSchema = z.object({
  showAvatar: z.boolean(),
  avatar: z.string().optional(),
  showBio: z.boolean(),
  showSocialLinks: z.boolean(),
})

export const statsCardConfigSchema = z.object({
  metrics: z.array(z.enum(['posts', 'views', 'comments'])),
})

export const categoriesCardConfigSchema = z.object({
  type: z.enum(['categories', 'tags']),
  limit: z.number().min(1).max(50),
  showCount: z.boolean(),
})

export const recentPostsCardConfigSchema = z.object({
  limit: z.number().min(1).max(20),
  showExcerpt: z.boolean(),
  showDate: z.boolean(),
})

export const tabbarCardConfigSchema = z.object({
  defaultTab: z.enum(['recent', 'about', 'photography', 'projects']),
})

export const latestPostsCardConfigSchema = recentPostsCardConfigSchema.extend({
  showImage: z.boolean(),
})

export const randomPostsCardConfigSchema = latestPostsCardConfigSchema

export const calendarCardConfigSchema = z.object({
  showPostDots: z.boolean(),
  highlightToday: z.boolean(),
  showAnnotations: z.boolean().optional(),
})

export const clockCardConfigSchema = z.object({
  format24h: z.boolean(),
  showSeconds: z.boolean(),
  showDate: z.boolean(),
  fontStyle: z.enum(['mono', 'sans', 'serif']),
})

export const imageCardConfigSchema = z.object({
  src: z.string(),
  alt: z.string(),
  objectFit: z.enum(['cover', 'contain', 'fill']),
  showOverlay: z.boolean(),
  overlayText: z.string().optional(),
  linkUrl: z.string().optional(),
})

export const socialLinkSchema = z.object({
  id: z.string(),
  platform: z.enum([
    'github',
    'twitter',
    'wechat',
    'weibo',
    'instagram',
    'linkedin',
    'email',
    'website',
    'custom',
  ]),
  label: z.string(),
  url: z.string(),
  showLabel: z.boolean(),
})

export const socialCardConfigSchema = z.object({
  layout: z.enum(['icons', 'list', 'compact']),
  links: z.array(socialLinkSchema),
  iconSize: z.enum(['small', 'medium', 'large']),
  showBackground: z.boolean(),
  columns: z.number().int().min(1).max(12),
})

export const mottoCardConfigSchema = z.object({
  motto: z.string(),
  author: z.string().optional(),
  fontStyle: z.enum(['serif', 'sans', 'mono']),
  textAlign: z.enum(['left', 'center', 'right']),
  showDivider: z.boolean(),
  dividerStyle: z.enum(['line', 'dots', 'bracket']),
  textSize: z.enum(['small', 'medium', 'large']),
})

export const weatherCardConfigSchema = z.object({
  city: z.string(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  showHumidity: z.boolean(),
  showWind: z.boolean(),
})

export const musicTrackSchema = z.object({
  audioUrl: z.string(),
  title: z.string(),
  artist: z.string().optional(),
  coverUrl: z.string().optional(),
})

export const musicCardConfigSchema = z.object({
  title: z.string(),
  artist: z.string().optional(),
  coverUrl: z.string().optional(),
  audioUrl: z.string().optional(),
  autoPlay: z.boolean(),
  showProgress: z.boolean(),
  showVolume: z.boolean(),
  playlist: z.array(musicTrackSchema).optional(),
  simplifiedMode: z.boolean().optional(),
  persistAcrossPages: z.boolean().optional(),
})

export const readingCardConfigSchema = z.object({
  bookTitle: z.string(),
  author: z.string(),
  coverUrl: z.string().optional(),
  totalPages: z.number().int().positive(),
  currentPage: z.number().int().nonnegative(),
  status: z.enum(['reading', 'completed', 'paused']),
  startDate: z.string().optional(),
  finishDate: z.string().optional(),
  streak: z.number().int().nonnegative(),
  dailyGoal: z.number().int().positive(),
  showStreak: z.boolean(),
  showProgress: z.boolean(),
  showAuthor: z.boolean(),
})

export const aiChatCardConfigSchema = z.object({
  title: z.string().optional(),
  subtitle: z.string().optional(),
})

export const countdownCardConfigSchema = z.object({
  limit: z.number().int().positive().optional(),
  futureOnly: z.boolean().optional(),
})

// Validation functions
export function validateDashboardCard(data: unknown) {
  return dashboardCardSchema.parse(data)
}

export function validateDashboardLayout(data: unknown) {
  return dashboardLayoutSchema.parse(data)
}

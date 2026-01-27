import { z } from 'zod'

export const cardSizeSchema = z.enum(['small', 'medium', 'large', 'wide', 'tall'])

export const cardTypeSchema = z.enum(['profile', 'stats', 'categories', 'recent_posts'])

export const cardPositionSchema = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number(),
})

export const dashboardCardSchema = z.object({
  id: z.string(),
  type: cardTypeSchema,
  size: cardSizeSchema,
  position: cardPositionSchema,
  config: z.record(z.any()),
  visible: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export const dashboardLayoutSchema = z.object({
  id: z.string(),
  userId: z.string().optional(),
  cards: z.array(dashboardCardSchema),
  version: z.number(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

// Card-specific config schemas
export const profileCardConfigSchema = z.object({
  showAvatar: z.boolean(),
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

// Validation functions
export function validateDashboardCard(data: unknown) {
  return dashboardCardSchema.parse(data)
}

export function validateDashboardLayout(data: unknown) {
  return dashboardLayoutSchema.parse(data)
}

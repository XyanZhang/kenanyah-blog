import { z } from 'zod'

export const brandSchema = z.enum(['luckin', 'cotti', 'starbucks'])

export const moodSchema = z.enum([
  'happy', 'sad', 'angry', 'tired',
  'excited', 'calm', 'romantic', 'energetic',
])

export const mbtiSchema = z.enum([
  'INTJ', 'INTP', 'ENTJ', 'ENTP',
  'INFJ', 'INFP', 'ENFJ', 'ENFP',
  'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ',
  'ISTP', 'ISFP', 'ESTP', 'ESFP',
])

export const drinkSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  brand: brandSchema,
  category: z.enum(['coffee', 'milk_tea', 'fruit_tea', 'specialty', 'cold_brew']),
  taste: z.object({
    sweet: z.number().min(0).max(5),
    bitter: z.number().min(0).max(5),
    sour: z.number().min(0).max(5),
    rich: z.number().min(0).max(5),
    refreshing: z.number().min(0).max(5),
  }),
  moodMatch: z.array(moodSchema).min(1),
  mbtiMatch: z.array(mbtiSchema).min(1),
  season: z.array(z.enum(['spring', 'summer', 'autumn', 'winter'])).min(1),
  description: z.string().min(1),
  emoji: z.string().min(1),
  isAvailable: z.boolean().optional(),
  priceRange: z.string().optional(),
  caffeineLevel: z.enum(['none', 'low', 'medium', 'high']).optional(),
  temperatureOptions: z.array(z.enum(['hot', 'iced'])).optional(),
  source: z.enum(['manual', 'official_page', 'partner_api', 'ai_agent']).optional(),
  sourceUrl: z.string().url().optional(),
  updatedAt: z.string().optional(),
})

export const drinkPatchSchema = drinkSchema.partial().omit({ id: true })

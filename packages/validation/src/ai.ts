import { z } from 'zod'

const textMax = 8000
const contentMax = 30000

export const aiRewriteSchema = z.object({
  text: z.string().min(1).max(textMax),
  style: z.string().max(100).optional(),
})

export const aiExpandSchema = z.object({
  text: z.string().min(1).max(textMax),
})

export const aiShrinkSchema = z.object({
  text: z.string().min(1).max(textMax),
  maxLength: z.number().int().positive().max(2000).optional(),
})

export const aiHeadingsSchema = z.object({
  content: z.string().min(1).max(contentMax),
})

export const aiSummarySchema = z.object({
  content: z.string().min(1).max(contentMax),
})

export const aiGenerateArticleSchema = z.object({
  keywords: z.string().min(1).max(200),
})

export const aiGenerateCoverSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(contentMax),
})

export const aiRecommendThemeSchema = z.object({
  prompt: z.string().min(1).max(300),
  currentThemeId: z.string().min(1).max(60),
  currentThemeName: z.string().min(1).max(60),
  currentThemeDescription: z.string().max(200).optional(),
  siteStyleSummary: z.string().min(1).max(1200),
  currentCustomTheme: z.object({
    name: z.string().min(1).max(60),
    backgroundBase: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    primary: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    secondary: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    tertiary: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  }),
  presetThemes: z.array(
    z.object({
      id: z.string().min(1).max(60),
      name: z.string().min(1).max(60),
      description: z.string().max(200),
      previewColors: z.array(z.string().regex(/^#[0-9a-fA-F]{6}$/)).length(3),
    })
  ).min(1).max(12),
})

export type AiRewriteInput = z.infer<typeof aiRewriteSchema>
export type AiExpandInput = z.infer<typeof aiExpandSchema>
export type AiShrinkInput = z.infer<typeof aiShrinkSchema>
export type AiHeadingsInput = z.infer<typeof aiHeadingsSchema>
export type AiSummaryInput = z.infer<typeof aiSummarySchema>
export type AiGenerateArticleInput = z.infer<typeof aiGenerateArticleSchema>
export type AiGenerateCoverInput = z.infer<typeof aiGenerateCoverSchema>
export type AiRecommendThemeInput = z.infer<typeof aiRecommendThemeSchema>

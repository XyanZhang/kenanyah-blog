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

export type AiRewriteInput = z.infer<typeof aiRewriteSchema>
export type AiExpandInput = z.infer<typeof aiExpandSchema>
export type AiShrinkInput = z.infer<typeof aiShrinkSchema>
export type AiHeadingsInput = z.infer<typeof aiHeadingsSchema>
export type AiSummaryInput = z.infer<typeof aiSummarySchema>
export type AiGenerateArticleInput = z.infer<typeof aiGenerateArticleSchema>

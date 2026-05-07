import { z } from 'zod'

const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, '请填写 YYYY-MM-DD 格式日期')

export const divinationConsultationModeSchema = z.enum(['daily', 'bazi', 'name', 'event'])

export const divinationQuestionTypeSchema = z.enum([
  'career',
  'relationship',
  'wealth',
  'health',
  'travel',
  'general',
])

export const createDivinationConsultationSchema = z.object({
  mode: divinationConsultationModeSchema,
  questionType: divinationQuestionTypeSchema,
  question: z.string().trim().min(1, '问题不能为空').max(2000, '问题最多 2000 字'),
  birthInfo: z.string().trim().max(500, '出生或背景信息最多 500 字').optional(),
  targetDate: dateStringSchema.optional(),
  sourceIds: z.array(z.string().trim().min(1)).max(12, '最多选择 12 个资料源').default([]),
})

export type DivinationConsultationModeInput = z.infer<typeof divinationConsultationModeSchema>
export type DivinationQuestionTypeInput = z.infer<typeof divinationQuestionTypeSchema>
export type CreateDivinationConsultationInput = z.infer<typeof createDivinationConsultationSchema>

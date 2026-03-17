import { z } from 'zod'

const countdownEventTypeSchema = z.enum(['birthday', 'anniversary', 'exam', 'activity'])

export const createCountdownEventSchema = z.object({
  title: z.string().min(1, '标题不能为空').max(100, '标题最多 100 字'),
  targetDate: z.string().refine((s) => !Number.isNaN(Date.parse(s)), { message: '请填写有效日期' }),
  type: countdownEventTypeSchema,
})

export const updateCountdownEventSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  targetDate: z.string().optional(),
  type: countdownEventTypeSchema.optional(),
})

export type CreateCountdownEventInput = z.infer<typeof createCountdownEventSchema>
export type UpdateCountdownEventInput = z.infer<typeof updateCountdownEventSchema>

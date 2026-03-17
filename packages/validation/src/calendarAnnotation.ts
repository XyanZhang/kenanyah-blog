import { z } from 'zod'

// 日期格式 YYYY-MM-DD
const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '请填写 YYYY-MM-DD 格式日期')

export const createCalendarAnnotationSchema = z.object({
  date: dateStringSchema,
  label: z.string().min(1, '标注不能为空').max(200, '标注最多 200 字'),
})

export const updateCalendarAnnotationSchema = z.object({
  label: z.string().min(1).max(200).optional(),
})

export const calendarAnnotationQuerySchema = z.object({
  from: dateStringSchema.optional(),
  to: dateStringSchema.optional(),
})

export type CreateCalendarAnnotationInput = z.infer<typeof createCalendarAnnotationSchema>
export type UpdateCalendarAnnotationInput = z.infer<typeof updateCalendarAnnotationSchema>
export type CalendarAnnotationQueryInput = z.infer<typeof calendarAnnotationQuerySchema>

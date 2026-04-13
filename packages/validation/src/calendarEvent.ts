import { z } from 'zod'

const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '请填写 YYYY-MM-DD 格式日期')

export const calendarEventSourceTypeSchema = z.enum([
  'manual',
  'post',
  'thought',
  'project',
  'photo',
  'system',
])

export const calendarEventStatusSchema = z.enum(['planned', 'completed', 'canceled'])

export const calendarEventQuerySchema = z.object({
  from: dateStringSchema.optional(),
  to: dateStringSchema.optional(),
})

export const createCalendarEventSchema = z.object({
  title: z.string().min(1, '标题不能为空').max(120, '标题最多 120 字'),
  description: z.string().max(5000, '描述最多 5000 字').optional(),
  date: dateStringSchema,
  status: calendarEventStatusSchema.default('planned'),
  allDay: z.boolean().default(true),
  sourceType: calendarEventSourceTypeSchema.default('manual'),
})

export const updateCalendarEventSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  description: z.string().max(5000).nullable().optional(),
  date: dateStringSchema.optional(),
  status: calendarEventStatusSchema.optional(),
  allDay: z.boolean().optional(),
})

export const quickCreateCalendarEventSchema = z.object({
  rawText: z.string().min(1, '请输入事件内容').max(5000, '内容最多 5000 字'),
  defaultDate: dateStringSchema.optional(),
  sourceInputType: z.enum(['text', 'voice']).default('text'),
})

export type CalendarEventSourceTypeInput = z.infer<typeof calendarEventSourceTypeSchema>
export type CalendarEventStatusInput = z.infer<typeof calendarEventStatusSchema>
export type CalendarEventQueryInput = z.infer<typeof calendarEventQuerySchema>
export type CreateCalendarEventInput = z.infer<typeof createCalendarEventSchema>
export type UpdateCalendarEventInput = z.infer<typeof updateCalendarEventSchema>
export type QuickCreateCalendarEventInput = z.infer<typeof quickCreateCalendarEventSchema>

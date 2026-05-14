import { z } from 'zod'

const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '请填写 YYYY-MM-DD 格式日期')
const timeStringSchema = z.string().regex(/^\d{2}:\d{2}$/, '请填写 HH:mm 格式时间')

export const planSpaceStatusSchema = z.enum(['active', 'archived', 'completed'])
export const planItemStatusSchema = z.enum(['planned', 'in_progress', 'done', 'blocked', 'canceled'])
export const planItemPrioritySchema = z.enum(['low', 'medium', 'high', 'urgent'])
export const planSharePermissionSchema = z.enum(['read', 'edit'])

export const planSpaceQuerySchema = z.object({
  status: planSpaceStatusSchema.optional(),
})

export const createPlanSpaceSchema = z.object({
  title: z.string().min(1, '标题不能为空').max(120, '标题最多 120 字'),
  type: z.string().min(1).max(40).default('general'),
  icon: z.string().min(1).max(60).default('CalendarCheck'),
  description: z.string().max(5000, '描述最多 5000 字').optional(),
  status: planSpaceStatusSchema.default('active'),
  startDate: dateStringSchema.optional(),
  endDate: dateStringSchema.optional(),
  collaborationOn: z.boolean().default(true),
})

export const updatePlanSpaceSchema = createPlanSpaceSchema.partial()

export const planItemQuerySchema = z.object({
  status: planItemStatusSchema.optional(),
  from: dateStringSchema.optional(),
  to: dateStringSchema.optional(),
  milestone: z.enum(['true', 'false']).optional(),
})

export const createPlanItemSchema = z.object({
  title: z.string().min(1, '标题不能为空').max(160, '标题最多 160 字'),
  description: z.string().max(5000, '描述最多 5000 字').optional(),
  date: dateStringSchema,
  startTime: timeStringSchema.optional(),
  endTime: timeStringSchema.optional(),
  allDay: z.boolean().default(true),
  status: planItemStatusSchema.default('planned'),
  priority: planItemPrioritySchema.default('medium'),
  assignee: z.string().max(80).optional(),
  category: z.string().max(80).optional(),
  isMilestone: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
})

export const updatePlanItemSchema = createPlanItemSchema.partial()

export const createPlanShareLinkSchema = z.object({
  permission: planSharePermissionSchema.default('edit'),
  expiresAt: z.string().datetime().nullable().optional(),
})

export type PlanSpaceStatusInput = z.infer<typeof planSpaceStatusSchema>
export type PlanItemStatusInput = z.infer<typeof planItemStatusSchema>
export type PlanItemPriorityInput = z.infer<typeof planItemPrioritySchema>
export type PlanSharePermissionInput = z.infer<typeof planSharePermissionSchema>
export type PlanSpaceQueryInput = z.infer<typeof planSpaceQuerySchema>
export type CreatePlanSpaceInput = z.infer<typeof createPlanSpaceSchema>
export type UpdatePlanSpaceInput = z.infer<typeof updatePlanSpaceSchema>
export type PlanItemQueryInput = z.infer<typeof planItemQuerySchema>
export type CreatePlanItemInput = z.infer<typeof createPlanItemSchema>
export type UpdatePlanItemInput = z.infer<typeof updatePlanItemSchema>
export type CreatePlanShareLinkInput = z.infer<typeof createPlanShareLinkSchema>

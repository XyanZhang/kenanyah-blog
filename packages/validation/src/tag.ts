import { z } from 'zod'

export const createTagSchema = z.object({
  name: z
    .string()
    .min(1, 'Tag name is required')
    .max(30, 'Tag name must be at most 30 characters')
    .regex(/^[a-zA-Z0-9-]+$/, 'Tag name can only contain letters, numbers, and hyphens'),
})

export const updateTagSchema = createTagSchema.partial()

export type CreateTagInput = z.infer<typeof createTagSchema>
export type UpdateTagInput = z.infer<typeof updateTagSchema>

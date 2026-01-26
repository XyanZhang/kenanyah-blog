import { z } from 'zod'

export const createCommentSchema = z.object({
  content: z
    .string()
    .min(1, 'Comment content is required')
    .max(2000, 'Comment must be at most 2000 characters'),
  parentId: z.string().cuid().optional(),
})

export const updateCommentSchema = z.object({
  content: z
    .string()
    .min(1, 'Comment content is required')
    .max(2000, 'Comment must be at most 2000 characters'),
})

export type CreateCommentInput = z.infer<typeof createCommentSchema>
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>

import { z } from 'zod'

export const createPostSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(200, 'Title must be at most 200 characters'),
  content: z.string().min(1, 'Content is required'),
  excerpt: z.string().max(500, 'Excerpt must be at most 500 characters').optional(),
  coverImage: z.string().url('Invalid cover image URL').optional(),
  published: z.boolean().default(false),
  publishedAt: z.string().datetime().optional(),
  isFeatured: z.boolean().default(false),
  categoryIds: z.array(z.string().cuid()).optional(),
  tagIds: z.array(z.string().cuid()).optional(),
})

export const updatePostSchema = createPostSchema.partial()

export const postFiltersSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  category: z.string().optional(),
  tag: z.string().optional(),
  published: z.coerce.boolean().optional(),
  authorId: z.string().cuid().optional(),
  search: z.string().max(100).optional(),
})

export const postQuerySchema = postFiltersSchema

export type CreatePostInput = z.infer<typeof createPostSchema>
export type UpdatePostInput = z.infer<typeof updatePostSchema>
export type PostFiltersInput = z.infer<typeof postFiltersSchema>
export type PostQueryInput = z.infer<typeof postQuerySchema>
